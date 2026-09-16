/* ============================================================
   VOID XXX — Supabase client & data layer
   ------------------------------------------------------------
   Strategy:
   1. If SUPABASE_URL + SUPABASE_ANON_KEY are configured in
      window.VOID_CONFIG, use the real Supabase backend
      (tables: subs, videos, fan_messages).
   2. If the client fails to load or requests error, fall back
      to a localStorage "demo" store so the site always works.
   ============================================================ */
"use strict";

const CFG = (window.VOID_CONFIG && window.VOID_CONFIG.supabase) || { url: "", anonKey: "" };

/* ---------------- Local fallback store ---------------- */
const LS_KEYS = {
  videos: "voidxxx_videos_v1",
  messages: "voidxxx_messages_v1",
  subs: "voidxxx_sub_count_v1"
};

const DEMO_VIDEOS = [
  {
    id: "demo-1",
    title: "OBERON IS BROKEN — Roblox Anime Edit",
    thumbnail: "",
    url: "https://www.youtube.com/@Void-XXX-1",
    views: "12.4K",
    duration: "0:58",
    date: "2 days ago"
  },
  {
    id: "demo-2",
    title: "DOORS 100% — Speedrun Chaos Edit",
    thumbnail: "",
    url: "https://www.youtube.com/@Void-XXX-1",
    views: "8.1K",
    duration: "1:12",
    date: "5 days ago"
  },
  {
    id: "demo-3",
    title: "ANIME X ROBLOX — Fighting Game Montage",
    thumbnail: "",
    url: "https://www.youtube.com/@Void-XXX-1",
    views: "5.7K",
    duration: "0:47",
    date: "1 week ago"
  },
  {
    id: "demo-4",
    title: "VOID MODE — Aesthetic Edit Compilation",
    thumbnail: "",
    url: "https://www.youtube.com/@Void-XXX-1",
    views: "3.9K",
    duration: "1:34",
    date: "2 weeks ago"
  },
  {
    id: "demo-5",
    title: "PIGGY HUNT — Horror Edit",
    thumbnail: "",
    url: "https://www.youtube.com/@Void-XXX-1",
    views: "2.2K",
    duration: "0:41",
    date: "3 weeks ago"
  },
  {
    id: "demo-6",
    title: "ADOPT ME GONE WRONG — Funny Edit",
    thumbnail: "",
    url: "https://www.youtube.com/@Void-XXX-1",
    views: "1.8K",
    duration: "0:53",
    date: "1 month ago"
  }
];

const DEMO_MESSAGES = [
  { name: "NEON_KID", message: "Yooo your edits are straight fire 🔥 subscribe target 25 let's go", created_at: "3 hours ago" },
  { name: "voidwalker", message: "the anime x roblox montage lives rent free in my head", created_at: "8 hours ago" },
  { name: "OBERON_FAN", message: "OBERON IS BROKEN is the best edit on the platform no cap", created_at: "1 day ago" },
  { name: "silentghost", message: "found this channel through the algorithm and stayed for the vibes", created_at: "2 days ago" }
];

const lsGet = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const lsSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — ignore */
  }
};

const DEMO_SUBS = (window.VOID_CONFIG && window.VOID_CONFIG.youtube && window.VOID_CONFIG.youtube.subs) || 24;

/* ---------------- Supabase bootstrap (lazy) ---------------- */
let supabasePromise = null;

function initSupabase() {
  if (!CFG.url || !CFG.anonKey) return null;
  if (!supabasePromise) {
    supabasePromise = import("@supabase/supabase-js")
      .then((mod) => mod.createClient(CFG.url, CFG.anonKey))
      .catch((err) => {
        console.warn("[VOID] Supabase client failed to load:", err);
        return null;
      });
  }
  return supabasePromise;
}

/* ---------------- Public API ---------------- */
export const db = {
  /** @returns {Promise<{ enabled:boolean, online:boolean }>} */
  async status() {
    const client = await initSupabase();
    if (!client) return { enabled: false, online: false };
    try {
      const { error } = await client.from("subs").select("id").limit(1);
      return { enabled: true, online: !error };
    } catch {
      return { enabled: true, online: false };
    }
  },

  /* ----- Subscriber count ----- */
  async getSubCount() {
    const client = await initSupabase();
    if (client) {
      try {
        const { data, error } = await client
          .from("subs")
          .select("count")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!error && data && typeof data.count === "number") return data.count;
      } catch { /* fall through to local */ }
    }
    return lsGet(LS_KEYS.subs, DEMO_SUBS);
  },

  async setSubCount(count) {
    const next = Math.max(0, Math.round(count));
    const client = await initSupabase();
    if (client) {
      try {
        const { error } = await client
          .from("subs")
          .upsert({ id: 1, count: next, updated_at: new Date().toISOString() });
        if (!error) return { ok: true };
      } catch { /* fall through */ }
    }
    lsSet(LS_KEYS.subs, next);
    return { ok: true, offline: true };
  },

  /* ----- Videos ----- */
  async getVideos() {
    const client = await initSupabase();
    if (client) {
      try {
        const { data, error } = await client
          .from("videos")
          .select("id,title,thumbnail,url,views,duration,date,created_at")
          .order("created_at", { ascending: false })
          .limit(12);
        if (!error && Array.isArray(data) && data.length) return data;
      } catch { /* fall through */ }
    }
    return lsGet(LS_KEYS.videos, DEMO_VIDEOS);
  },

  /* ----- Fan messages ----- */
  async getMessages() {
    const client = await initSupabase();
    if (client) {
      try {
        const { data, error } = await client
          .from("fan_messages")
          .select("id,name,message,created_at")
          .order("created_at", { ascending: false })
          .limit(50);
        if (!error && Array.isArray(data)) return data;
      } catch { /* fall through */ }
    }
    return lsGet(LS_KEYS.messages, DEMO_MESSAGES);
  },

  async addMessage(name, message) {
    const cleanName = (name || "anon").trim().slice(0, 24) || "anon";
    const cleanMsg = (message || "").trim().slice(0, 140);
    if (!cleanMsg) return { ok: false, error: "Message is empty." };

    const client = await initSupabase();
    if (client) {
      try {
        const { error } = await client
          .from("fan_messages")
          .insert({ name: cleanName, message: cleanMsg });
        if (!error) return { ok: true };
      } catch { /* fall through */ }
    }

    /* Offline mode: persist locally, keep newest first */
    const list = lsGet(LS_KEYS.messages, DEMO_MESSAGES);
    list.unshift({ id: `local-${Date.now()}`, name: cleanName, message: cleanMsg, created_at: "just now" });
    lsSet(LS_KEYS.messages, list.slice(0, 60));
    return { ok: true, offline: true };
  }
};

/* Expose for debugging */
window.__VOID_DB = db;