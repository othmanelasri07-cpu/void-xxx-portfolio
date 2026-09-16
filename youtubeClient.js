/* ========================================================
   VOID XXX — YouTube Data API v3 Client
   ======================================================== */

const YT_BASE = 'https://www.googleapis.com/youtube/v3';

function ytCfg() {
  return window.VOID_CONFIG?.youtube || {};
}

export function isYouTubeConfigured() {
  return !!ytCfg().apiKey;
}

/* ---------- helpers ---------- */

async function ytFetch(endpoint, params = {}) {
  const cfg = ytCfg();
  if (!cfg.apiKey) throw new Error('YouTube API key not configured');
  const qs = new URLSearchParams({ key: cfg.apiKey, ...params });
  const res = await fetch(`${YT_BASE}${endpoint}?${qs}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `YouTube API ${res.status}`);
  }
  return res.json();
}

function relativeDate(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatDuration(iso) {
  if (!iso) return '';
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return '';
  const h = parseInt(m[1] || '0');
  const min = parseInt(m[2] || '0');
  const s = parseInt(m[3] || '0');
  if (h > 0) return `${h}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${min}:${String(s).padStart(2, '0')}`;
}

function parseCount(str) {
  const n = parseInt(str);
  if (isNaN(n)) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

/* ---------- public API ---------- */

export async function fetchChannelStats(channelId) {
  const data = await ytFetch('/channels', {
    part: 'statistics,snippet,brandingSettings',
    id: channelId,
  });
  const ch = data.items?.[0];
  if (!ch) throw new Error('Channel not found');
  const s = ch.statistics;
  return {
    subscribers: s.subscriberCount || '0',
    subscribersFormatted: parseCount(s.subscriberCount),
    views: s.viewCount || '0',
    viewsFormatted: parseCount(s.viewCount),
    videos: s.videoCount || '0',
    title: ch.snippet?.title || 'VOID XXX',
    description: ch.snippet?.description || '',
    banner: ch.brandingSettings?.image?.bannerExternalUrl || '',
    avatar: ch.snippet?.thumbnails?.high?.url || '',
  };
}

export async function fetchLatestVideos(maxResults = 12) {
  const cfg = ytCfg();
  const playlistId = cfg.uploadsPlaylistId || cfg.channelId;

  // Step 1: list playlist items
  const listData = await ytFetch('/playlistItems', {
    part: 'snippet,contentDetails',
    playlistId,
    maxResults: String(maxResults),
    order: 'date',
  });

  const ids = (listData.items || [])
    .map((i) => i.contentDetails?.videoId)
    .filter(Boolean);

  if (ids.length === 0) return [];

  // Step 2: enrich with statistics + contentDetails (duration)
  const detailData = await ytFetch('/videos', {
    part: 'statistics,contentDetails,snippet',
    id: ids.join(','),
  });

  const detailMap = {};
  for (const v of detailData.items || []) {
    detailMap[v.id] = v;
  }

  return (listData.items || []).map((item) => {
    const vid = item.contentDetails?.videoId;
    const snip = item.snippet || {};
    const det = detailMap[vid] || {};
    const stats = det.statistics || {};
    const dur = det.contentDetails?.duration;

    return {
      id: vid,
      title: snip.title || 'Untitled',
      description: snip.description || '',
      thumbnail: snip.thumbnails?.high?.url || snip.thumbnails?.medium?.url || `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${vid}`,
      channelTitle: snip.channelTitle || 'VOID XXX',
      publishedAt: snip.publishedAt,
      publishedLabel: relativeDate(snip.publishedAt),
      views: parseCount(stats.viewCount),
      viewsRaw: parseInt(stats.viewCount) || 0,
      likes: parseCount(stats.likeCount),
      duration: formatDuration(dur),
      durationRaw: dur || '',
    };
  });
}

export async function fetchVideoStats(videoIds) {
  if (!videoIds || videoIds.length === 0) return {};
  const data = await ytFetch('/videos', {
    part: 'statistics',
    id: videoIds.join(','),
  });
  const map = {};
  for (const v of data.items || []) {
    map[v.id] = {
      views: parseCount(v.statistics?.viewCount),
      likes: parseCount(v.statistics?.likeCount),
      comments: parseCount(v.statistics?.commentCount),
    };
  }
  return map;
}

export function buildEmbedUrl(videoId) {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
}
