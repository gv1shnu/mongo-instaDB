// Phone simulator: shows what the student's query does to the app's screens.
// It renders from the actual run result (right or wrong), so mistakes show up too.
(function (root) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const isPost = (d) => d && typeof d === "object" && "caption" in d;
  const isUser = (d) => d && typeof d === "object" && "followers" in d && !("caption" in d);
  const kfmt = (n) => (typeof n !== "number" ? "—" : n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K" : String(n));
  const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const EMOJI = { "#coding": "💻", "#webdev": "🧑‍💻", "#photography": "📷", "#mumbai": "🌇", "#travel": "🏔️", "#food": "🍜", "#bengaluru": "🥞", "#fitness": "💪", "#books": "📚", "#memes": "😂", "#art": "🎨", "#inktober": "🖋️", "#dance": "💃", "#pune": "🌆" };
  // a wrong answer can turn a list into text or a number, so treat list fields defensively
  const listOf = (v) => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]);
  const emojiOf = (p) => { for (const h of listOf(p.hashtags)) if (EMOJI[h]) return EMOJI[h]; return "✨"; };
  const tileStyle = (key) => { const h = hash(key) % 360; return `background:linear-gradient(135deg,hsl(${h} 70% 62%),hsl(${(h + 50) % 360} 72% 48%))`; };
  const typeIcon = (t) => (t === "reel" ? '<span class="ph-type">▶</span>' : t === "carousel" ? '<span class="ph-type">❐</span>' : "");
  const initials = (u) => esc(String(u || "?").replace(/[._].*/, "").slice(0, 2).toUpperCase());
  const avatar = (u, size = "") => `<span class="ph-av ${size}" style="${tileStyle(u + "av")}">${initials(u)}</span>`;
  const tick = (v) => (v ? '<span class="ph-tick" title="verified">✓</span>' : "");
  const dateStr = (d) => (d instanceof Date ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }) : "");
  const userOf = (state, name) => state.users.find((u) => u.username === name);
  const fullName = (u) => u.name || u.fullName || "";
  const short = (v) => v instanceof Date ? v.toISOString().slice(0, 16).replace("T", " ") + " UTC"
    : Array.isArray(v) ? "[" + v.map((x) => (Array.isArray(x) ? "[" + x.join(", ") + "]" : String(x))).join(", ") + "]" : String(v);
  // Field-by-field changes between two versions of a document: added, removed, changed.
  function diffChips(o, n, skip = []) {
    if (!o || !n) return "";
    const keys = [...new Set(Object.keys(o).concat(Object.keys(n)))].filter((k) => k !== "_id" && !skip.includes(k));
    const chips = keys.map((k) => {
      const a = o[k], b = n[k];
      if (b === undefined) return `<span class="ph-diff del">− ${esc(k)}</span>`;
      if (a === undefined) return `<span class="ph-diff add">+ ${esc(k)}: ${esc(short(b))}</span>`;
      if (short(a) !== short(b)) return `<span class="ph-diff">${esc(k)}: ${esc(short(a))} → ${esc(short(b))}</span>`;
      return "";
    }).join("");
    return chips ? `<div class="ph-diffs">${chips}</div>` : "";
  }

  // ---------- building blocks ----------
  function tile(p, extra = "") {
    return `<div class="ph-tile ${extra}" style="${tileStyle(p.caption)}">
      <span class="ph-emoji">${emojiOf(p)}</span>${typeIcon(p.type)}
      <span class="ph-likes">♥ ${kfmt(p.likes)}</span></div>`;
  }
  function feedCard(p, state, opts = {}) {
    const u = userOf(state, p.username) || {};
    return `<article class="ph-card ${opts.cls || ""}">
      <header>${avatar(p.username)}<b>${esc(p.username)}</b>${tick(u.verified)}${opts.rank ? `<span class="ph-rank">#${opts.rank}</span>` : ""}${opts.badge || ""}</header>
      <div class="ph-media" style="${tileStyle(p.caption)}"><span class="ph-emoji big">${emojiOf(p)}</span>${typeIcon(p.type)}</div>
      <div class="ph-actions"><span>♡ <b>${kfmt(p.likes)}</b>${opts.delta || ""}</span><span>💬 ${kfmt(p.comments)}</span><span class="ph-date">${dateStr(p.createdAt)}</span></div>
      <p class="ph-cap"><b>${esc(p.username)}</b> ${esc(p.caption)} <span class="ph-tags">${listOf(p.hashtags).map((h) => esc(Array.isArray(h) ? "[" + h.join(", ") + "]" : h)).join(" ")}</span></p>
      ${opts.diff || ""}
    </article>`;
  }
  function personRow(u, field, diff = "") {
    let chip = "";
    if (field) {
      const v = u[field];
      chip = v === undefined ? `<span class="ph-chip missing">no ${esc(field)}</span>` : `<span class="ph-chip">${esc(field)}: ${esc(v)}</span>`;
    }
    return `<li class="ph-person">${avatar(u.username)}<div class="ph-who"><span><b>${esc(u.username)}</b>${tick(u.verified)}</span><small>${esc(fullName(u))} · ${esc(u.city || "")}</small>${diff}</div>
      <div class="ph-right"><b>${kfmt(u.followers)}</b><small>followers</small>${chip}</div></li>`;
  }
  function profile(u, state, before) {
    const posts = state.posts.filter((p) => p.username === u.username);
    const old = before ? userOf(before, u.username) : null;
    const oldInterests = old ? listOf(old.interests).map((x) => JSON.stringify(x)) : [];
    const chips = listOf(u.interests).map((x, i) => {
      const nested = Array.isArray(x);
      const isNew = old && (i >= oldInterests.length || oldInterests[i] !== JSON.stringify(x));
      return `<span class="ph-int ${isNew ? "new" : ""} ${nested ? "nested" : ""}">${esc(nested ? "[" + x.join(", ") + "]" : x)}</span>`;
    }).join("") + (old ? listOf(old.interests).filter((x) => !listOf(u.interests).some((y) => JSON.stringify(y) === JSON.stringify(x)))
      .map((x) => `<span class="ph-int gone">${esc(Array.isArray(x) ? "[" + x.join(", ") + "]" : x)}</span>`).join("") : "");
    const nowVerified = old && !old.verified && u.verified;
    return `<div class="ph-profile">
      <div class="ph-prof-top">${avatar(u.username, "lg")}
        <div class="ph-stats"><div><b>${posts.length}</b><small>posts</small></div><div><b>${kfmt(u.followers)}</b><small>followers</small></div></div></div>
      <p class="ph-prof-name"><b>${esc(u.username)}</b>${tick(u.verified)}${nowVerified ? '<span class="ph-new-badge">just verified</span>' : ""}</p>
      <p class="ph-prof-sub">${esc(fullName(u))} · ${esc(u.city || "")}${u.accountType ? " · " + esc(u.accountType) : ""}</p>
      <div class="ph-ints">${chips}</div>
      ${old ? diffChips(old, u, Array.isArray(u.interests) && Array.isArray(old.interests) ? ["interests"] : []) : ""}
      <div class="ph-grid">${posts.map((p) => tile(p)).join("") || '<p class="ph-empty-sm">No posts yet</p>'}</div>
    </div>`;
  }
  const empty = (icon, title, sub) => `<div class="ph-emptystate"><div class="ph-empty-icon">${icon}</div><b>${title}</b><small>${sub || ""}</small></div>`;

  // ---------- screen chooser ----------
  function screenFor(ctx) {
    const { spec = {}, res, before, after, idle } = ctx;
    const state = after || before;
    if (idle) {
      const feed = state.posts.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);
      return { tab: "home", title: "instaDB", body: `<div class="ph-banner">Waiting for your answer… then watch this screen</div>` + feed.map((p) => feedCard(p, state)).join("") };
    }
    if (ctx.finale) {
      const feed = state.posts.slice().sort((a, b) => b.createdAt - a.createdAt);
      return { tab: "home", title: "instaDB", body: `<div class="ph-banner ok">Good night 🌙 ${state.posts.length} posts left</div>` + feed.map((p) => feedCard(p, state)).join("") };
    }
    if (!res.ok) return { tab: spec.tab || "home", title: spec.title || "instaDB", body: `<div class="ph-toast">⚠️ Couldn't load<br><small>${esc(res.error.split(":")[0])}</small></div>` + empty("😵", "Something went wrong", "Check the error in the terminal") };

    const v = res.value;
    // ---- writes ----
    if (v && typeof v === "object" && "acknowledged" in v) {
      if (!("matchedCount" in v) && !("deletedCount" in v)) {
        const newUsers = state.users.slice(before.users.length), newPosts = state.posts.slice(before.posts.length);
        if (newUsers.length === 1 && !newPosts.length)
          return { tab: "profile", title: newUsers[0].username || "New account", body: `<div class="ph-banner ok">🎉 New account created</div>` + profile(newUsers[0], state) };
        let body = "";
        const authors = [...new Set(newPosts.map((p) => p.username))];
        if (authors.length === 1 && userOf(state, authors[0])) { const u = userOf(state, authors[0]); body += `<div class="ph-mini-prof">${avatar(u.username, "md")}<div><b>${esc(u.username)}</b>${tick(u.verified)}<small>${state.posts.filter((p) => p.username === u.username).length} posts</small></div></div>`; }
        if (newPosts.length) body += `<div class="ph-banner ok">${newPosts.length} new post${newPosts.length === 1 ? "" : "s"} published</div>` + newPosts.map((p) => feedCard(p, state, { cls: "changed", badge: '<span class="ph-newpost">new</span>' })).join("");
        if (newUsers.length) body += `<div class="ph-banner ok">${newUsers.length} new account${newUsers.length === 1 ? "" : "s"}</div><ul class="ph-people">${newUsers.map((u) => personRow(u)).join("")}</ul>`;
        return { tab: "home", title: authors.length === 1 ? authors[0] : "New", body };
      }
      if ("deletedCount" in v) {
        const left = new Set(state.posts.map((p) => p.caption));
        const all = before.posts.slice().sort((a, b) => b.createdAt - a.createdAt);
        const gone = all.filter((p) => !left.has(p.caption));
        return { tab: "home", title: "Feed after cleanup", body:
          `<div class="ph-banner ${gone.length ? "warn" : ""}">${gone.length} post${gone.length === 1 ? "" : "s"} removed · ${state.posts.length} left</div>` +
          all.map((p) => left.has(p.caption) ? feedCard(p, state) : feedCard(p, before, { cls: "removed", badge: '<span class="ph-gone">removed</span>' })).join("") };
      }
      const changedUsers = state.users.filter((u, i) => JSON.stringify(u) !== JSON.stringify(before.users[i]));
      const changedPosts = state.posts.filter((p, i) => JSON.stringify(p) !== JSON.stringify(before.posts[i]));
      if (!changedUsers.length && !changedPosts.length)
        return { tab: "home", title: spec.title || "instaDB", body: `<div class="ph-banner warn">matched ${v.matchedCount}, changed 0</div>` + empty("🤷", "Nothing changed on screen", "Your update didn't modify any document") };
      if (changedUsers.length === 1 && !changedPosts.length)
        return { tab: "profile", title: changedUsers[0].username, body: profile(changedUsers[0], state, before) };
      let body = "";
      if (changedPosts.length) {
        body += `<div class="ph-banner ok">${changedPosts.length} post${changedPosts.length === 1 ? "" : "s"} updated</div>`;
        body += changedPosts.map((p) => {
          const o = before.posts.find((x) => x.caption === p.caption) || {};
          const d = typeof p.likes === "number" && typeof o.likes === "number" ? p.likes - o.likes : 0;
          return feedCard(p, state, { cls: "changed", delta: d ? `<span class="ph-delta">${d > 0 ? "+" : ""}${d}</span>` : "", diff: diffChips(o, p, ["likes"]) });
        }).join("");
      }
      if (changedUsers.length) body += `<div class="ph-banner ok">${changedUsers.length} account${changedUsers.length === 1 ? "" : "s"} updated</div><ul class="ph-people">${changedUsers.map((u) => personRow(u, null, diffChips(userOf(before, u.username), u))).join("")}</ul>`;
      return { tab: "home", title: spec.title || "Updated", body };
    }
    // ---- reads ----
    if (v === null) return { tab: spec.tab || "explore", title: spec.title || "instaDB", body: empty("🔍", "No results", "findOne() found nothing (null)") };
    if (isPost(v)) return { tab: "home", title: "Post", body: `<div class="ph-banner">findOne → a single post</div>` + feedCard(v, state) };
    if (isUser(v)) return { tab: "profile", title: v.username, body: profile(v, state) };
    if (Array.isArray(v)) {
      if (!v.length) return { tab: spec.tab || "explore", title: spec.title || "instaDB", body: empty("🔍", "No results", "Your filter matched 0 documents") };
      if (v.every(isUser)) return { tab: "explore", title: spec.title || "People", body: `<div class="ph-banner">${v.length} account${v.length === 1 ? "" : "s"}</div><ul class="ph-people">${v.map((u) => personRow(u, spec.field)).join("")}</ul>` };
      if (v.every(isPost)) {
        const head = spec.profile && userOf(state, spec.profile) ? (() => { const u = userOf(state, spec.profile); return `<div class="ph-mini-prof">${avatar(u.username, "md")}<div><b>${esc(u.username)}</b>${tick(u.verified)}<small>${kfmt(u.followers)} followers</small></div></div>`; })() : "";
        const count = `<div class="ph-banner">${v.length} post${v.length === 1 ? "" : "s"}</div>`;
        if (spec.view === "feed") {
          const ranked = state.posts.slice().sort((a, b) => b.likes - a.likes).map((p) => p.caption);
          return { tab: "reels", title: spec.title || "Feed", body: count + v.map((p) => feedCard(p, state, { rank: spec.ranked ? ranked.indexOf(p.caption) + 1 : 0 })).join("") };
        }
        return { tab: spec.profile ? "profile" : "explore", title: spec.title || "Explore", body: head + count + `<div class="ph-grid">${v.map((p) => tile(p)).join("")}</div>` };
      }
    }
    return { tab: "home", title: "Result", body: empty("🧾", "Mixed result", "Open the terminal to read it") };
  }

  const TABS = [["home", "⌂"], ["explore", "⌕"], ["reels", "▷"], ["profile", "◯"]];
  function render(el, ctx) {
    const s = screenFor(ctx);
    el.innerHTML = `<div class="ph-frame" role="img" aria-label="Phone preview: ${esc(s.title)}">
      <div class="ph-screen">
        <div class="ph-status"><span>${esc(ctx.spec && ctx.spec.time || "9:41")}</span><span class="ph-island"></span><span class="ph-sig">▮▮▮ ▰</span></div>
        <div class="ph-appbar"><b>${esc(s.title)}</b><span class="ph-appicons">♡ ✉</span></div>
        <div class="ph-body">${s.body}</div>
        <nav class="ph-tabs">${TABS.map(([k, i]) => `<span class="${k === s.tab ? "on" : ""}">${i}</span>`).join("")}</nav>
      </div></div>`;
    const body = el.querySelector(".ph-body");
    if (body) body.scrollTop = 0;
    el.classList.remove("pulse"); void el.offsetWidth; if (!ctx.idle) el.classList.add("pulse");
  }

  root.Phone = { render, screenFor };
})(typeof window !== "undefined" ? window : globalThis);
