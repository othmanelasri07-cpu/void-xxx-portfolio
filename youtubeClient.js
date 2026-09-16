/*  VOID XXX — YouTube Data API v3 Client
    Fetches real channel stats + videos for the Drop Feed.
    Reads config from window.VOID_CONFIG.youtube
    Tier: YouTube API → Supabase → demo data
    --------------------------------------------------------- */

const YT_BASE = 'https://www.googleapis.com/youtube/v3';

function ytCfg() {
  return (window.VOID_CONFIG && window.VOID_CONFIG.youtube) || {};
}

function ytKey() {
  return ytCfg().apiKey || '';
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

async function ytFetch(endpoint, params) {
  const key = ytKey();
  if (!key) return null;
  const qs = new URLSearchParams({ part: 'snippet', ...params, key }).toString();
  try {
    const r = await fetch(`${YT_BASE}${endpoint}?${qs}`);
    if (!r.ok) throw new Error(`YouTube API ${r.status}`);
    return await r.json();
  } catch (e) {
    console.warn('[VOID YT]', endpoint, e.message);
    return null;
  }
}

function fmtCount(n) {
  if (n == null) return '—';
  const num = Number(n);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
}

function timeAgo(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + 'd ago';
  const wks = Math.floor(days / 7);
  if (wks < 4) return wks + 'w ago';
  return Math.floor(days / 30) + 'mo ago';
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Fetch channel statistics (sub count, total views, video count).
 * Returns { subs, views, videoCount } or null if API key missing.
 */
export async function fetchChannelStats() {
  const chId = ytCfg().channelId;
  if (!chId || !ytKey()) return null;

  const data = await ytFetch('/channels', {
    id: chId,
    part: 'statistics'
  });

  if (!data || !data.items || !data.items.length) return null;

  const s = data.items[0].statistics;
  return {
    subs: Number(s.subscriberCount) || 0,
    subsFormatted: fmtCount(s.subscriberCount),
    views: Number(s.viewCount) || 0,
    viewsFormatted: fmtCount(s.viewCount),
    videoCount: Number(s.videoCount) || 0
  };
}

/**
 * Fetch latest videos from the channel's uploads playlist.
 * Returns array of { id, title, thumbnail, publishedAt, views, viewCount, url }.
 */
export async function fetchLatestVideos(maxResults = 12) {
  const chId = ytCfg().channelId;
  if (!chId || !ytKey()) return null;

  // Step 1: Get the uploads playlist ID
  const chData = await ytFetch('/channels', {
    id: chId,
    part: 'contentDetails'
  });

  const uploadsId =
    chData?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ||
    ytCfg().uploadsPlaylistId;

  if (!uploadsId) return null;

  // Step 2: Fetch playlist items
  const plData = await ytFetch('/playlistItems', {
    playlistId: uploadsId,
    part: 'snippet',
    maxResults: Math.min(maxResults, 50)
  });

  if (!plData || !plData.items || !plData.items.length) return null;

  const videoIds = plData.items
    .map(i => i.snippet?.resourceId?.videoId)
    .filter(Boolean);

  if (!videoIds.length) return null;

  // Step 3: Fetch video details (statistics + contentDetails) in batch
  const detailData = await ytFetch('/videos', {
    id: videoIds.join(','),
    part: 'statistics,contentDetails'
  });

  const detailsMap = {};
  if (detailData && detailData.items) {
    for (const v of detailData.items) {
      detailsMap[v.id] = v;
    }
  }

  // Step 4: Merge and return
  return plData.items
    .map(item => {
      const sn = item.snippet;
      const vid = sn?.resourceId?.videoId;
      const det = detailsMap[vid];
      return {
        id: vid,
        title: sn.title,
        description: sn.description || '',
        thumbnail: sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url,
        publishedAt: sn.publishedAt,
        publishedLabel: timeAgo(sn.publishedAt),
        viewCount: det?.statistics ? Number(det.statistics.viewCount) : 0,
        views: det?.statistics ? fmtCount(det.statistics.viewCount) : '—',
        likeCount: det?.statistics ? Number(det.statistics.likeCount) : 0,
        duration: det?.contentDetails?.duration || '',
        url: `https://www.youtube.com/watch?v=${vid}`
      };
    })
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

/**
 * Check if YouTube API is configured (has an API key).
 */
export function isYouTubeConfigured() {
  return !!(ytKey() && ytCfg().channelId);
}
