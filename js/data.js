// instaDB seed data: identical to the lab's insta_seed.js
(function (root) {
  const D = (s) => new Date(s + "T00:00:00Z");
  root.SEED = {
    users: [
      { username: "riya_codes",    name: "Riya Sharma", age: 21, city: "Delhi",     followers: 12500,  verified: true,  accountType: "creator",  interests: ["coding", "music"] },
      { username: "arjun.clicks",  name: "Arjun Mehta", age: 24, city: "Mumbai",    followers: 48200,  verified: true,  accountType: "creator",  interests: ["photography", "travel"] },
      { username: "neha_eats",     name: "Neha Kapoor", age: 19, city: "Bengaluru", followers: 3100,   verified: false, accountType: "personal", interests: ["food", "travel"] },
      { username: "kabir.fit",     name: "Kabir Singh", age: 27, city: "Delhi",     followers: 89000,  verified: true,  accountType: "business", interests: ["fitness"] },
      { username: "ananya.reads",  name: "Ananya Iyer", age: 17, city: "Chennai",   followers: 640,    verified: false, accountType: "personal", interests: ["books", "art"] },
      { username: "dev_memes",     name: "Dev Patel",   age: 22, city: "Ahmedabad", followers: 152000, verified: true,  accountType: "creator",  interests: ["memes", "gaming"] },
      { username: "sara.draws",    name: "Sara Khan",   age: 26, city: "Hyderabad", followers: 2300,   verified: false, interests: ["art"] },
      { username: "rohan_travels", name: "Rohan Das",   city: "Kolkata",            followers: 7800,   verified: false, interests: ["travel", "photography"] }
    ],
    posts: [
      { username: "riya_codes",    caption: "Shipped my first full-stack app!", type: "reel",     likes: 1450,  comments: 88,  hashtags: ["#coding", "#webdev"],      createdAt: D("2026-09-02") },
      { username: "riya_codes",    caption: "Late night debugging sessions",    type: "photo",    likes: 320,   comments: 21,  hashtags: ["#coding"],                 createdAt: D("2026-09-15") },
      { username: "arjun.clicks",  caption: "Golden hour at Marine Drive",      type: "photo",    likes: 2100,  comments: 64,  hashtags: ["#photography", "#mumbai"], createdAt: D("2026-08-20") },
      { username: "arjun.clicks",  caption: "Spiti valley in 10 frames",        type: "carousel", likes: 3400,  comments: 142, hashtags: ["#travel", "#photography"], createdAt: D("2026-09-28") },
      { username: "neha_eats",     caption: "Best dosa in Bengaluru?",          type: "reel",     likes: 780,   comments: 95,  hashtags: ["#food", "#bengaluru"],     createdAt: D("2026-09-10") },
      { username: "neha_eats",     caption: "Homemade pasta attempt",           type: "photo",    likes: 45,    comments: 3,   hashtags: ["#food"],                   createdAt: D("2026-10-01") },
      { username: "kabir.fit",     caption: "5 min morning mobility routine",   type: "reel",     likes: 5600,  comments: 210, hashtags: ["#fitness"],                createdAt: D("2026-08-05") },
      { username: "ananya.reads",  caption: "October reading list",             type: "carousel", likes: 90,    comments: 12,  hashtags: ["#books"],                  createdAt: D("2026-10-05") },
      { username: "dev_memes",     caption: "When the code works on first try", type: "reel",     likes: 12000, comments: 640, hashtags: ["#memes", "#coding"],       createdAt: D("2026-09-30") },
      { username: "dev_memes",     caption: "Exam week be like",                type: "photo",    likes: 8700,  comments: 305, hashtags: ["#memes"],                  createdAt: D("2026-10-12") },
      { username: "sara.draws",    caption: "Inktober day 3",                   type: "photo",    likes: 210,   comments: 18,  hashtags: ["#art", "#inktober"],       createdAt: D("2026-10-03") },
      { username: "rohan_travels", caption: "Sunrise at Tiger Hill",            type: "photo",    likes: 30,    comments: 2,   hashtags: ["#travel"],                 createdAt: D("2026-10-08") }
    ]
  };
})(typeof window !== "undefined" ? window : globalThis);
