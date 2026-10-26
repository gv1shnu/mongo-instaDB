// A tiny in-browser MongoDB look-alike covering Lecture 2's operators.
// Semantics follow MongoDB for the cases students meet in the lab:
//  - missing fields: $ne / $nin / $not / $nor match them; comparisons don't
//  - array fields: equality, comparisons and $in match if ANY element matches
//  - cursor: sort -> skip -> limit, whatever order they are chained in
(function (root) {
  class QueryError extends Error {
    constructor(msg) { super(msg); this.name = "MongoServerError"; }
  }

  class ObjectId {
    constructor(hex) { this.hex = hex; }
    toJSON() { return "ObjectId:" + this.hex; }
    toString() { return this.hex; }
  }
  const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof ObjectId);
  const clone = (v) => {
    if (v instanceof Date) return new Date(v.getTime());
    if (v instanceof ObjectId) return new ObjectId(v.hex);
    if (Array.isArray(v)) return v.map(clone);
    if (isPlainObject(v)) { const o = {}; for (const k of Object.keys(v)) o[k] = clone(v[k]); return o; }
    return v;
  };

  function deepEqual(a, b) {
    if (a instanceof ObjectId || b instanceof ObjectId) return a instanceof ObjectId && b instanceof ObjectId && a.hex === b.hex;
    if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
      return a.every((x, i) => deepEqual(x, b[i]));
    }
    if (isPlainObject(a) || isPlainObject(b)) {
      if (!isPlainObject(a) || !isPlainObject(b)) return false;
      const ka = Object.keys(a), kb = Object.keys(b);
      return ka.length === kb.length && ka.every((k, i) => k === kb[i] && deepEqual(a[k], b[k]));
    }
    return a === b;
  }

  function getPath(doc, path) {
    let cur = doc;
    for (const p of path.split(".")) {
      if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
      cur = cur[p];
    }
    return cur;
  }
  function setPath(doc, path, value) {
    const parts = path.split(".");
    let cur = doc;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!isPlainObject(cur[parts[i]])) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  // ---- comparison helpers ----
  const typeRank = (v) => {
    if (v === undefined || v === null) return 1;
    if (typeof v === "number") return 2;
    if (typeof v === "string") return 3;
    if (isPlainObject(v)) return 4;
    if (Array.isArray(v)) return 5;
    if (typeof v === "boolean") return 8;
    if (v instanceof Date) return 9;
    return 10;
  };
  function compareValues(a, b) {
    const ra = typeRank(a), rb = typeRank(b);
    if (ra !== rb) return ra - rb;
    if (a instanceof Date) return a.getTime() - b.getTime();
    if (typeof a === "number" || typeof a === "string" || typeof a === "boolean") return a < b ? -1 : a > b ? 1 : 0;
    return 0;
  }
  const sameKind = (a, b) => typeRank(a) === typeRank(b) && typeRank(a) !== 1;

  // equality as MongoDB does it: array fields match if any element is equal
  function eqMatch(val, target) {
    if (target === null) return val === null || val === undefined;
    if (Array.isArray(val) && !Array.isArray(target)) return val.some((e) => deepEqual(e, target)) ;
    if (Array.isArray(val) && Array.isArray(target)) return deepEqual(val, target) || val.some((e) => deepEqual(e, target));
    return deepEqual(val, target);
  }
  function cmpMatch(val, target, test) {
    const one = (v) => sameKind(v, target) && test(compareValues(v, target));
    if (Array.isArray(val)) return val.some(one);
    return one(val);
  }

  const FIELD_OPS = {
    $eq: (v, a) => eqMatch(v, a),
    $ne: (v, a) => !eqMatch(v, a),
    $gt: (v, a) => cmpMatch(v, a, (c) => c > 0),
    $gte: (v, a) => cmpMatch(v, a, (c) => c >= 0),
    $lt: (v, a) => cmpMatch(v, a, (c) => c < 0),
    $lte: (v, a) => cmpMatch(v, a, (c) => c <= 0),
    $in: (v, a, op) => { if (!Array.isArray(a)) throw new QueryError(`${op} needs an array`); return a.some((x) => eqMatch(v, x)); },
    $nin: (v, a, op) => { if (!Array.isArray(a)) throw new QueryError(`${op} needs an array`); return !a.some((x) => eqMatch(v, x)); },
    $not: (v, a) => {
      if (!isPlainObject(a) || !Object.keys(a).length || !Object.keys(a).every((k) => k.startsWith("$")))
        throw new QueryError("$not needs an operator expression, e.g. { $not: { $gt: 25 } }");
      return !fieldMatch(v, a);
    },
  };
  const LOGIC_OPS = ["$and", "$or", "$nor"];

  function fieldMatch(val, cond) {
    if (isPlainObject(cond)) {
      const keys = Object.keys(cond);
      const ops = keys.filter((k) => k.startsWith("$"));
      if (ops.length && ops.length === keys.length) {
        return keys.every((op) => {
          if (LOGIC_OPS.includes(op)) throw new QueryError(`${op} goes at the top level of the filter, not inside a field`);
          const fn = FIELD_OPS[op];
          if (!fn) throw new QueryError(`unknown operator: ${op}`);
          return fn(val, cond[op], op);
        });
      }
      if (ops.length) throw new QueryError(`unknown operator: ${ops[0]} (operators can't be mixed with plain fields)`);
    }
    return eqMatch(val, cond);
  }

  function matches(doc, filter) {
    if (filter === undefined || filter === null) return true;
    if (!isPlainObject(filter)) throw new QueryError("filter must be an object, e.g. { likes: { $gt: 100 } }");
    return Object.keys(filter).every((key) => {
      const cond = filter[key];
      if (LOGIC_OPS.includes(key)) {
        if (!Array.isArray(cond) || !cond.length) throw new QueryError(`${key} needs a non-empty array of conditions`);
        const res = cond.map((c) => matches(doc, c));
        if (key === "$and") return res.every(Boolean);
        if (key === "$or") return res.some(Boolean);
        return !res.some(Boolean);
      }
      if (key.startsWith("$")) {
        if (FIELD_OPS[key]) throw new QueryError(`${key} goes inside a field, e.g. { likes: { ${key}: ... } }`);
        throw new QueryError(`unknown top level operator: ${key}`);
      }
      return fieldMatch(getPath(doc, key), cond);
    });
  }

  // ---- updates ----
  function applyUpdate(doc, update) {
    if (!isPlainObject(update) || !Object.keys(update).length)
      throw new QueryError("update must be an object of update operators, e.g. { $set: { ... } }");
    const before = clone(doc);
    for (const op of Object.keys(update)) {
      const spec = update[op];
      if (!op.startsWith("$")) throw new QueryError("Update document requires atomic operators (like $set, $inc, $push)");
      if (!isPlainObject(spec)) throw new QueryError(`${op} needs an object, e.g. { ${op}: { field: value } }`);
      for (const path of Object.keys(spec)) {
        const arg = spec[path];
        const cur = getPath(doc, path);
        if (op === "$set") setPath(doc, path, clone(arg));
        else if (op === "$inc") {
          if (typeof arg !== "number") throw new QueryError("Cannot increment with non-numeric argument");
          if (cur !== undefined && typeof cur !== "number") throw new QueryError(`Cannot apply $inc to a non-numeric value (${path})`);
          setPath(doc, path, (cur || 0) + arg);
        } else if (op === "$push") {
          if (cur !== undefined && !Array.isArray(cur)) throw new QueryError(`The field '${path}' must be an array to use $push`);
          const arr = cur ? cur : [];
          if (isPlainObject(arg) && Object.keys(arg).some((k) => k.startsWith("$"))) {
            const bad = Object.keys(arg).find((k) => k !== "$each");
            if (bad) throw new QueryError(`unknown modifier inside $push: ${bad}`);
            if (!Array.isArray(arg.$each)) throw new QueryError("$each needs an array");
            arg.$each.forEach((x) => arr.push(clone(x)));
          } else arr.push(clone(arg));
          setPath(doc, path, arr);
        } else throw new QueryError(`Unknown modifier: ${op}`);
      }
    }
    return !deepEqual(before, doc);
  }

  // ---- cursor & collection ----
  class Cursor {
    constructor(docs, filter) { this._docs = docs; this._filter = filter; this._sort = null; this._skip = 0; this._limit = 0; this.__cursor = true; }
    sort(spec) {
      if (!isPlainObject(spec) || !Object.keys(spec).length) throw new QueryError("sort needs an object, e.g. .sort({ likes: -1 })");
      for (const k of Object.keys(spec)) if (spec[k] !== 1 && spec[k] !== -1) throw new QueryError(`sort direction for '${k}' must be 1 or -1`);
      this._sort = spec; return this;
    }
    skip(n) { if (!Number.isInteger(n) || n < 0) throw new QueryError("skip needs a whole number ≥ 0"); this._skip = n; return this; }
    limit(n) { if (!Number.isInteger(n) || n < 0) throw new QueryError("limit needs a whole number ≥ 0"); this._limit = n; return this; }
    pretty() { return this; }
    toArray() {
      let out = this._docs.filter((d) => matches(d, this._filter));
      if (this._sort) {
        const keys = Object.keys(this._sort);
        out = out.map((d, i) => [d, i]).sort((a, b) => {
          for (const k of keys) { const c = compareValues(getPath(a[0], k), getPath(b[0], k)); if (c) return c * this._sort[k]; }
          return a[1] - b[1];
        }).map((x) => x[0]);
      }
      out = out.slice(this._skip, this._limit ? this._skip + this._limit : undefined);
      return out.map(clone);
    }
  }

  class Collection {
    constructor(name, docs) { this._name = name; this._docs = docs; }
    find(filter) { matches({}, filter || {}); return new Cursor(this._docs, filter || {}); }
    findOne(filter) { const d = this._docs.find((x) => matches(x, filter || {})); return d ? clone(d) : null; }
    countDocuments(filter) { return this._docs.filter((x) => matches(x, filter || {})).length; }
    _update(filter, update, many) {
      if (update === undefined) throw new QueryError("update needs two arguments: a filter and an update");
      const hits = this._docs.filter((x) => matches(x, filter || {}));
      const targets = many ? hits : hits.slice(0, 1);
      let modified = 0;
      for (const d of targets) if (applyUpdate(d, update)) modified++;
      return { acknowledged: true, insertedId: null, matchedCount: targets.length, modifiedCount: modified, upsertedCount: 0 };
    }
    updateOne(f, u) { return this._update(f, u, false); }
    updateMany(f, u) { return this._update(f, u, true); }
    _delete(filter, many) {
      if (filter === undefined) throw new QueryError("delete needs a filter, e.g. deleteMany({ likes: { $lt: 100 } })");
      let n = 0;
      for (let i = 0; i < this._docs.length; ) {
        if ((many || n === 0) && matches(this._docs[i], filter)) { this._docs.splice(i, 1); n++; } else i++;
      }
      return { acknowledged: true, deletedCount: n };
    }
    _prep(doc) {
      if (!isPlainObject(doc)) throw new QueryError("insert needs a document object, e.g. insertOne({ username: \"...\" })");
      for (const k of Object.keys(doc)) if (k.startsWith("$")) throw new QueryError(`field names can't start with $ in an inserted document (${k})`);
      const d = clone(doc);
      if (d._id === undefined) { this._db.__ids++; const out = { _id: new ObjectId("6720" + String(this._db.__ids).padStart(20, "0")) }; Object.assign(out, d); return out; }
      return d;
    }
    insertOne(doc, extra) {
      if (Array.isArray(doc)) throw new QueryError("insertOne takes ONE document. For a list of documents, use insertMany([...])");
      if (extra !== undefined) throw new QueryError("insertOne takes one document. For several, use insertMany([ {...}, {...} ])");
      const d = this._prep(doc); this._docs.push(d);
      return { acknowledged: true, insertedId: d._id };
    }
    insertMany(docs) {
      if (!Array.isArray(docs)) throw new QueryError("insertMany needs an array of documents: insertMany([ {...}, {...} ])");
      if (!docs.length) throw new QueryError("insertMany needs at least one document");
      const ds = docs.map((x) => this._prep(x)); ds.forEach((d) => this._docs.push(d));
      const ids = {}; ds.forEach((d, i) => (ids[i] = d._id));
      return { acknowledged: true, insertedIds: ids };
    }
    deleteOne(f) { return this._delete(f, false); }
    deleteMany(f) { return this._delete(f, true); }
  }

  function freshDb(seed) {
    const db = {};
    const meta = { __ids: Object.keys(seed).reduce((n, k) => n + seed[k].length, 0) };
    for (const name of Object.keys(seed)) { db[name] = new Collection(name, clone(seed[name])); db[name]._db = meta; }
    return new Proxy(db, {
      get(t, p) {
        if (p in t) return t[p];
        if (typeof p === "string" && !p.startsWith("_")) throw new QueryError(`there is no '${p}' collection in instaDB (try users or posts)`);
        return undefined;
      },
    });
  }

  // Run one query string against a fresh copy of the seed.
  function run(code, seed) {
    const db = freshDb(seed);
    const ISODate = (s) => new Date(s);
    const ObjectIdFn = (h) => new ObjectId(String(h));
    let src = String(code).split("\n").filter((l) => !/^\s*use\s+\w+\s*;?\s*$/.test(l) && !/^\s*\/\//.test(l)).join("\n").trim().replace(/;+\s*$/, "");
    if (!src) return { ok: false, error: "Nothing to run: type a query first." };
    if (/;\s*\S/.test(src.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""'))) return { ok: false, error: "Run one query at a time: remove the extra statement after the semicolon." };
    let value;
    try {
      value = new Function("db", "ISODate", "ObjectId", `"use strict"; return (${src});`)(db, ISODate, ObjectIdFn);
      if (value && value.__cursor) value = value.toArray();
    } catch (e) {
      return { ok: false, error: friendlyError(e) };
    }
    return { ok: true, value, state: { users: db.users._docs, posts: db.posts._docs } };
  }

  function friendlyError(e) {
    if (e instanceof QueryError) return e.name + ": " + e.message;
    const m = String(e && e.message || e);
    let r;
    if ((r = m.match(/(\S+) is not a function/))) return `TypeError: ${r[1]} is not a function. Check the method name (spelling and capitals matter).`;
    if ((r = m.match(/(\S+) is not defined/))) return `ReferenceError: ${r[1]} is not defined. Did you forget quotes around a text value, or the $ in front of an operator?`;
    if (e instanceof SyntaxError) return "SyntaxError: the query isn't valid JavaScript. Check brackets, commas and quotes.";
    return (e && e.name ? e.name + ": " : "") + m;
  }

  // Canonical form of a run result for comparing two queries.
  function stable(v) {
    if (v instanceof Date) return "D:" + v.toISOString();
    if (v instanceof ObjectId) return "OID:" + v.hex;
    if (Array.isArray(v)) return v.map(stable);
    if (isPlainObject(v)) { const o = {}; Object.keys(v).sort().forEach((k) => (o[k] = stable(v[k]))); return o; }
    return v;
  }
  function fingerprint(res, ordered) {
    const ser = (v) => JSON.stringify(stable(v));
    let v = res.value;
    if (Array.isArray(v) && !ordered) v = v.map(ser).sort();
    else v = ser(v);
    return JSON.stringify({ v, users: stable(res.state.users), posts: stable(res.state.posts) });
  }

  // Pretty printer in mongosh style
  function show(v, indent = 0) {
    const pad = "  ".repeat(indent), pad1 = "  ".repeat(indent + 1);
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    if (v instanceof Date) return `ISODate('${v.toISOString()}')`;
    if (v instanceof ObjectId) return `ObjectId('${v.hex}')`;
    if (typeof v === "string") return `'${v}'`;
    if (Array.isArray(v)) {
      if (!v.length) return "[]";
      const flat = v.every((x) => !isPlainObject(x) && !Array.isArray(x));
      if (flat) return "[ " + v.map((x) => show(x)).join(", ") + " ]";
      return "[\n" + v.map((x) => pad1 + show(x, indent + 1)).join(",\n") + "\n" + pad + "]";
    }
    if (isPlainObject(v)) {
      const ks = Object.keys(v);
      if (!ks.length) return "{}";
      return "{\n" + ks.map((k) => pad1 + (/^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`) + ": " + show(v[k], indent + 1)).join(",\n") + "\n" + pad + "}";
    }
    return String(v);
  }

  root.InstaEngine = { run, fingerprint, show, matches, QueryError, ObjectId };
})(typeof window !== "undefined" ? window : globalThis);
