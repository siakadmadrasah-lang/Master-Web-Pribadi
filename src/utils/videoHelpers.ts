/**
 * Universal Video & Media Helper Utilities for Madrasah Website
 * Supports YouTube, TikTok, Instagram Reels/Posts, Facebook Videos,
 * Google Drive Videos, Vimeo, Direct MP4/WebM videos, and Direct Audio/MP3.
 */

export type VideoPlatform = 
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'google_drive'
  | 'drive'
  | 'vimeo'
  | 'direct_video'
  | 'mp4'
  | 'direct_audio'
  | 'other'
  | 'unknown';

export interface ParsedVideo {
  type: VideoPlatform;
  videoId?: string;
  embedUrl: string;
  thumbnailUrl?: string;
  originalUrl: string;
  platformName: string;
  isVertical?: boolean;
  isChannel?: boolean;
  isLive?: boolean;
  channelName?: string;
  channelHandle?: string;
}

/**
 * Robustly extracts YouTube 11-character video ID from any format
 */
export function extractYouTubeId(url?: string): string | null {
  if (!url || typeof url !== 'string' || !url.trim()) return null;
  const cleanUrl = url.trim();
  // Standard watch, youtu.be, shorts, embed, live, v, e
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = cleanUrl.match(ytRegex);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

/**
 * Checks if a given YouTube URL is a profile/channel/handle link instead of a specific video
 */
export function isYouTubeChannelUrl(url?: string): boolean {
  if (!url || typeof url !== 'string' || !url.trim()) return false;
  const cleanUrl = url.trim();
  const hasChannelPattern = /youtube\.com\/(?:@([a-zA-Z0-9_.-]+)|channel\/([a-zA-Z0-9_-]+)|c\/([a-zA-Z0-9_-]+)|user\/([a-zA-Z0-9_-]+))/i.test(cleanUrl);
  return hasChannelPattern && !extractYouTubeId(cleanUrl);
}

/**
 * Extracts channel handle or name if present
 */
export function getYouTubeChannelHandle(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const match = url.trim().match(/youtube\.com\/@([a-zA-Z0-9_.-]+)/i);
  if (match && match[1]) return `@${match[1]}`;
  const cMatch = url.trim().match(/youtube\.com\/(?:c|user|channel)\/([a-zA-Z0-9_.-]+)/i);
  if (cMatch && cMatch[1]) return cMatch[1];
  return null;
}

/**
 * Generates YouTube thumbnail URL with HQ or MaxRes fallback
 */
export function getYouTubeThumbnailUrl(urlOrId?: string, quality: 'hq' | 'max' = 'hq'): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const clean = urlOrId.trim();
  const videoId = clean.length === 11 && !clean.includes('/') && !clean.includes('.')
    ? clean
    : extractYouTubeId(clean);
  if (!videoId) return null;
  return quality === 'max'
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Generates a beautiful SVG data URI thumbnail for social channels/profiles
 */
export function generateChannelPoster(platform: string, handle: string, title?: string): string {
  const cleanHandle = handle.replace(/</g, '').replace(/>/g, '');
  const cleanTitle = (title || 'Official Media Hub').replace(/</g, '').replace(/>/g, '');
  
  let bgGradient1 = '#1e293b';
  let bgGradient2 = '#0f172a';
  let accentColor = '#3b82f6';
  
  if (platform.toLowerCase().includes('youtube')) {
    bgGradient1 = '#881337';
    bgGradient2 = '#0f172a';
    accentColor = '#ef4444';
  } else if (platform.toLowerCase().includes('tiktok')) {
    bgGradient1 = '#042f2e';
    bgGradient2 = '#020617';
    accentColor = '#06b6d4';
  } else if (platform.toLowerCase().includes('instagram')) {
    bgGradient1 = '#701a75';
    bgGradient2 = '#3b0764';
    accentColor = '#ec4899';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGradient1}" />
        <stop offset="100%" stop-color="${bgGradient2}" />
      </linearGradient>
    </defs>
    <rect width="800" height="450" fill="url(#grad)" />
    <circle cx="400" cy="180" r="64" fill="${accentColor}" fill-opacity="0.2" stroke="${accentColor}" stroke-width="4" />
    <polygon points="390,155 425,180 390,205" fill="#ffffff" />
    <text x="400" y="290" fill="#ffffff" font-size="28" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" text-anchor="middle">${cleanHandle}</text>
    <text x="400" y="325" fill="#94a3b8" font-size="18" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle">${cleanTitle}</text>
    <rect x="300" y="360" width="200" height="36" rx="18" fill="${accentColor}" />
    <text x="400" y="384" fill="#ffffff" font-size="14" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" text-anchor="middle">CHANNEL &amp; MEDIA HUB</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Parses any multimedia / video / social link and returns structured embed configuration
 */
export function parseVideoUrl(url?: string): ParsedVideo | null {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return null;
  }

  const cleanUrl = url.trim();

  // 1. YouTube (standard, youtu.be, shorts, live, embed)
  const ytVideoId = extractYouTubeId(cleanUrl);
  if (ytVideoId) {
    const isShorts = cleanUrl.includes('/shorts/');
    const originParam = typeof window !== 'undefined' && window.location?.origin ? `&origin=${encodeURIComponent(window.location.origin)}` : '';
    return {
      type: 'youtube',
      videoId: ytVideoId,
      embedUrl: `https://www.youtube.com/embed/${ytVideoId}?autoplay=1&playsinline=1&enablejsapi=1&rel=0&modestbranding=1&controls=1${originParam}`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg`,
      originalUrl: cleanUrl,
      platformName: isShorts ? 'YouTube Shorts' : 'YouTube Video',
      isVertical: isShorts,
      isChannel: false
    };
  }

  // 1b. YouTube Channel / Profile URL
  if (isYouTubeChannelUrl(cleanUrl)) {
    const handle = getYouTubeChannelHandle(cleanUrl);
    const rawUsername = handle ? handle.replace(/^@/, '') : 'channel';
    const originParam = typeof window !== 'undefined' && window.location?.origin ? `&origin=${encodeURIComponent(window.location.origin)}` : '';
    // User uploads playlist embed works seamlessly in iframe:
    const embedPlaylist = `https://www.youtube-nocookie.com/embed?listType=user_uploads&list=${rawUsername}&enablejsapi=1&playsinline=1${originParam}`;
    return {
      type: 'youtube',
      embedUrl: embedPlaylist,
      originalUrl: cleanUrl,
      platformName: handle ? `Channel YouTube (${handle})` : 'Channel YouTube',
      isChannel: true,
      channelName: handle || 'Channel',
      channelHandle: handle || '@channel',
      thumbnailUrl: generateChannelPoster('YouTube', handle || 'Channel YouTube')
    };
  }

  // 2. TikTok (standard video URL, Live streams, shortlinks vt.tiktok.com or tiktok.com/t/, and embed links)
  // 2a. TikTok Live / Siaran Langsung (tiktok.com/@username/live or tiktok.com/live)
  const tiktokLiveMatch = cleanUrl.match(/tiktok\.com\/(?:@([a-zA-Z0-9_.-]+)\/live|live)/i);
  if (tiktokLiveMatch || cleanUrl.includes('/live')) {
    const handle = tiktokLiveMatch && tiktokLiveMatch[1] ? `@${tiktokLiveMatch[1]}` : '@jaenalmaskun';
    return {
      type: 'tiktok',
      videoId: 'live',
      embedUrl: `https://www.tiktok.com/embed/v2/${handle}/live`,
      originalUrl: cleanUrl,
      platformName: `Siaran Langsung TikTok (${handle})`,
      isVertical: true,
      isChannel: true,
      isLive: true,
      channelName: handle,
      channelHandle: handle,
      thumbnailUrl: generateChannelPoster('TikTok', handle, 'SIARAN LANGSUNG TIKTOK')
    };
  }

  // 2b. Standard TikTok Video URL with numeric ID (e.g., https://www.tiktok.com/@username/video/7123456789012345678 or /v/123 or embed/v2/123)
  const tiktokIdRegex = /tiktok\.com\/(?:@[^/]+\/video\/|v\/|embed\/(?:v2\/)?|player\/(?:v1\/)?|video\/)(\d+)/i;
  const tiktokIdMatch = cleanUrl.match(tiktokIdRegex);
  if (tiktokIdMatch && tiktokIdMatch[1]) {
    const videoId = tiktokIdMatch[1];
    return {
      type: 'tiktok',
      videoId,
      embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
      originalUrl: cleanUrl,
      platformName: 'Video TikTok',
      isVertical: true,
      isChannel: false,
      thumbnailUrl: `https://images.unsplash.com/photo-1584697964190-71c4c3b28b7e?auto=format&fit=crop&w=600&q=80`
    };
  }

  // 2c. TikTok Shortlinks (vt.tiktok.com, vm.tiktok.com, tiktok.com/t/...)
  const tiktokShortMatch = cleanUrl.match(/(?:vt|vm)\.tiktok\.com\/([a-zA-Z0-9_-]+)|tiktok\.com\/t\/([a-zA-Z0-9_-]+)/i);
  if (tiktokShortMatch) {
    const shortCode = tiktokShortMatch[1] || tiktokShortMatch[2] || 'video';
    return {
      type: 'tiktok',
      videoId: shortCode,
      embedUrl: cleanUrl,
      originalUrl: cleanUrl,
      platformName: 'Video Siaran TikTok',
      isVertical: true,
      isChannel: false,
      thumbnailUrl: generateChannelPoster('TikTok', 'TikTok Siaran', 'VIDEO DAKWAH & EDUKASI')
    };
  }

  // 2d. TikTok Profile / Channel (@username)
  const tiktokProfileMatch = cleanUrl.match(/tiktok\.com\/@([a-zA-Z0-9_.-]+)/i);
  if (tiktokProfileMatch && tiktokProfileMatch[1] && !cleanUrl.includes('/video/')) {
    const handle = `@${tiktokProfileMatch[1]}`;
    return {
      type: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/${handle}`,
      originalUrl: cleanUrl,
      platformName: `Profil Siaran TikTok (${handle})`,
      isVertical: true,
      isChannel: true,
      channelName: handle,
      channelHandle: handle,
      thumbnailUrl: generateChannelPoster('TikTok', handle, 'AKUN SIARAN RESMI')
    };
  }

  // 2e. General TikTok link
  if (/tiktok\.com/i.test(cleanUrl)) {
    const embedMatch = cleanUrl.match(/(\d{15,22})/);
    const videoId = embedMatch ? embedMatch[1] : undefined;
    return {
      type: 'tiktok',
      videoId,
      embedUrl: videoId ? `https://www.tiktok.com/embed/v2/${videoId}` : cleanUrl,
      originalUrl: cleanUrl,
      platformName: 'Siaran TikTok',
      isVertical: true,
      isChannel: false
    };
  }

  // 3. Instagram (Reels, Posts, IGTV, short links)
  const igRegex = /(?:instagram\.com|instagr\.am)\/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/i;
  const igMatch = cleanUrl.match(igRegex);
  if (igMatch && igMatch[1]) {
    const shortcode = igMatch[1];
    const isReel = cleanUrl.includes('/reel/');
    return {
      type: 'instagram',
      videoId: shortcode,
      embedUrl: `https://www.instagram.com/p/${shortcode}/embed/captioned/`,
      originalUrl: cleanUrl,
      platformName: isReel ? 'Instagram Reel' : 'Instagram Post',
      isVertical: isReel,
      isChannel: false
    };
  }

  // 3b. Instagram Profile (@username)
  const igProfileMatch = cleanUrl.match(/(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9_.-]+)\/?$/i);
  if (igProfileMatch && igProfileMatch[1] && !['p', 'reel', 'tv', 'stories', 'explore', 'direct'].includes(igProfileMatch[1].toLowerCase())) {
    const handle = `@${igProfileMatch[1]}`;
    return {
      type: 'instagram',
      embedUrl: cleanUrl,
      originalUrl: cleanUrl,
      platformName: `Profil Instagram (${handle})`,
      isVertical: true,
      isChannel: true,
      channelName: handle,
      channelHandle: handle,
      thumbnailUrl: generateChannelPoster('Instagram', handle)
    };
  }

  // 4. Facebook Video & Reels (fb.watch, facebook.com/watch, facebook.com/.../videos/, facebook.com/reel/)
  if (/facebook\.com|fb\.watch/i.test(cleanUrl)) {
    const isReel = /facebook\.com\/reel\//i.test(cleanUrl);
    const isPage = !cleanUrl.includes('/videos/') && !cleanUrl.includes('/reel/') && !cleanUrl.includes('watch');
    return {
      type: 'facebook',
      embedUrl: isPage 
        ? `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(cleanUrl)}&tabs=timeline&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true`
        : `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(cleanUrl)}&show_text=0&autoplay=1`,
      originalUrl: cleanUrl,
      platformName: isReel ? 'Facebook Reel' : isPage ? 'Halaman Facebook' : 'Facebook Video',
      isVertical: isReel,
      isChannel: isPage,
      channelName: 'Halaman Facebook',
      thumbnailUrl: isPage ? generateChannelPoster('Facebook', 'Facebook Page') : undefined
    };
  }

  // 5. Google Drive Video
  // Matches: drive.google.com/file/d/FILE_ID/view or drive.google.com/open?id=FILE_ID
  const gdriveRegex = /drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/i;
  const gdriveMatch = cleanUrl.match(gdriveRegex);
  if (gdriveMatch && gdriveMatch[1]) {
    const fileId = gdriveMatch[1];
    return {
      type: 'google_drive',
      videoId: fileId,
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      originalUrl: cleanUrl,
      platformName: 'Google Drive Video',
      isVertical: false
    };
  }

  // 6. Vimeo
  // Matches: vimeo.com/ID
  const vimeoRegex = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/i;
  const vimeoMatch = cleanUrl.match(vimeoRegex);
  if (vimeoMatch && vimeoMatch[3]) {
    const videoId = vimeoMatch[3];
    return {
      type: 'vimeo',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1`,
      originalUrl: cleanUrl,
      platformName: 'Vimeo',
      isVertical: false
    };
  }

  // 7. Direct Audio File (.mp3, .wav, .m4a, .aac, .ogg, .flac, .opus, data:audio/)
  if (
    /\.(mp3|wav|m4a|aac|ogg|flac|opus|wma)(\?.*)?$/i.test(cleanUrl) ||
    cleanUrl.startsWith('data:audio/') ||
    cleanUrl.includes('/uploads/audio_')
  ) {
    const formattedUrl = cleanUrl.startsWith('uploads/') ? `/${cleanUrl}` : cleanUrl;
    return {
      type: 'direct_audio',
      embedUrl: formattedUrl,
      originalUrl: cleanUrl,
      platformName: 'Audio MP3 / Podcast',
      isVertical: false
    };
  }

  // 8. Direct Video File (.mp4, .webm, .ogg, .mov, .m4v, .mkv, .avi, .3gp, .flv, .wmv, .ts, .mpg, blob:, /uploads/...)
  if (
    cleanUrl.startsWith('/uploads/') ||
    cleanUrl.startsWith('uploads/') ||
    cleanUrl.startsWith('blob:') ||
    cleanUrl.startsWith('data:video/') ||
    cleanUrl.includes('/uploads/video_') ||
    /\.(mp4|webm|ogg|mov|m4v|mkv|avi|3gp|flv|wmv|ts|mpg|mpeg|m4p|qt)(\?.*)?$/i.test(cleanUrl)
  ) {
    const formattedUrl = cleanUrl.startsWith('uploads/') ? `/${cleanUrl}` : cleanUrl;
    return {
      type: 'direct_video',
      embedUrl: formattedUrl,
      originalUrl: cleanUrl,
      platformName: 'Berkas Video Langsung',
      isVertical: false
    };
  }

  // 8b. Relative file path in web app (e.g. /video.mp4 or /uploads/my_file)
  if (cleanUrl.startsWith('/') || cleanUrl.startsWith('./')) {
    return {
      type: 'direct_video',
      embedUrl: cleanUrl,
      originalUrl: cleanUrl,
      platformName: 'Berkas Video Lokal',
      isVertical: false
    };
  }

  // 9. Generic Fallback for valid HTTP/HTTPS URLs
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    // If it points to an uploaded /uploads/ path on another domain or same origin
    if (cleanUrl.includes('/uploads/') || cleanUrl.includes('.mp4') || cleanUrl.includes('.webm')) {
      return {
        type: 'direct_video',
        embedUrl: cleanUrl,
        originalUrl: cleanUrl,
        platformName: 'Berkas Video Langsung',
        isVertical: false
      };
    }

    return {
      type: 'unknown',
      embedUrl: cleanUrl,
      originalUrl: cleanUrl,
      platformName: 'Tautan Media Web',
      isVertical: false
    };
  }

  // 10. Fallback for any non-empty input that might be a video source
  if (cleanUrl.length > 2) {
    return {
      type: 'direct_video',
      embedUrl: cleanUrl,
      originalUrl: cleanUrl,
      platformName: 'Berkas Video Langsung',
      isVertical: false
    };
  }

  return null;
}

/**
 * Returns true if the given string is a valid video / media link
 */
export function isVideoLink(url?: string): boolean {
  return parseVideoUrl(url) !== null;
}

/**
 * Get visual badge colors and platform branding
 */
export function getPlatformBadgeStyle(type: VideoPlatform): {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconName: string;
} {
  switch (type) {
    case 'youtube':
      return {
        badgeBg: 'bg-red-600',
        badgeText: 'text-white',
        badgeBorder: 'border-red-500',
        iconName: 'youtube'
      };
    case 'tiktok':
      return {
        badgeBg: 'bg-black',
        badgeText: 'text-cyan-300',
        badgeBorder: 'border-cyan-400/40',
        iconName: 'tiktok'
      };
    case 'instagram':
      return {
        badgeBg: 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500',
        badgeText: 'text-white',
        badgeBorder: 'border-pink-400/40',
        iconName: 'instagram'
      };
    case 'facebook':
      return {
        badgeBg: 'bg-blue-600',
        badgeText: 'text-white',
        badgeBorder: 'border-blue-500',
        iconName: 'facebook'
      };
    case 'google_drive':
      return {
        badgeBg: 'bg-emerald-700',
        badgeText: 'text-amber-300',
        badgeBorder: 'border-emerald-600',
        iconName: 'gdrive'
      };
    case 'vimeo':
      return {
        badgeBg: 'bg-sky-600',
        badgeText: 'text-white',
        badgeBorder: 'border-sky-500',
        iconName: 'vimeo'
      };
    case 'direct_audio':
      return {
        badgeBg: 'bg-purple-700',
        badgeText: 'text-amber-200',
        badgeBorder: 'border-purple-600',
        iconName: 'audio'
      };
    case 'direct_video':
    default:
      return {
        badgeBg: 'bg-emerald-800',
        badgeText: 'text-white',
        badgeBorder: 'border-emerald-700',
        iconName: 'video'
      };
  }
}

/**
 * Universal XML parser for YouTube RSS feed in browser / client-side
 */
export function parseYouTubeRssXmlClient(xmlText: string): any[] {
  const videos: any[] = [];
  try {
    const entryMatches = xmlText.match(/<entry>[\s\S]*?<\/entry>/g);
    if (!entryMatches) return videos;

    for (const entry of entryMatches) {
      const idMatch = entry.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/) || entry.match(/<id>.*?video:([a-zA-Z0-9_-]+)<\/id>/);
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const descMatch = entry.match(/<media:description>([\s\S]*?)<\/media:description>/);
      const pubMatch = entry.match(/<published>([\s\S]*?)<\/published>/);
      const viewsMatch = entry.match(/<media:statistics views="(\d+)"/);
      const authorMatch = entry.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/);

      const videoId = idMatch ? idMatch[1].trim() : '';
      if (!videoId) continue;

      let cleanTitle = titleMatch ? titleMatch[1].trim() : 'Video Pembelajaran Madrasah';
      cleanTitle = cleanTitle.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

      let cleanDesc = descMatch ? descMatch[1].trim() : '';
      cleanDesc = cleanDesc.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&');

      let formattedDate = 'Terbaru';
      if (pubMatch && pubMatch[1]) {
        try {
          const d = new Date(pubMatch[1].trim());
          if (!isNaN(d.getTime())) {
            formattedDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
          }
        } catch (e) {}
      }

      videos.push({
        id: `yt-vid-${videoId}`,
        videoId,
        title: cleanTitle,
        description: cleanDesc,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt: formattedDate,
        views: viewsMatch ? `${viewsMatch[1]} tayangan` : 'Resmi',
        channelName: authorMatch ? authorMatch[1].trim() : 'JAENAL MASKUN OFFICIAL',
        platform: 'youtube'
      });
    }
  } catch (e) {
    console.warn('Error parsing YouTube RSS XML in browser:', e);
  }
  return videos;
}

/**
 * Universal multi-tier YouTube video fetcher
 * Works across local Node server, Plesk static hosting, cPanel, and direct client browser!
 */
export async function fetchYouTubeVideosUniversal(channelInput?: string): Promise<{
  success: boolean;
  videos: any[];
  source: string;
  channelTitle?: string;
  channelId?: string;
  message?: string;
}> {
  let clean = (channelInput || '').trim();
  if (!clean || clean.includes('@jaenalmaskun') || clean === '@jaenalmaskun') {
    clean = '@jaenalmaskunofficial3977';
  }

  const knownChannelId = 'UC45A9VF3hameYBW1reLO3BQ';
  let targetChannelId = clean.startsWith('UC') && clean.length === 24 ? clean : '';

  if (!targetChannelId && (clean.includes('jaenalmaskunofficial') || clean.includes('jaenalmaskun'))) {
    targetChannelId = knownChannelId;
  }

  // 1. Try local server API first
  try {
    const res = await fetch(`/api/youtube/channel-videos?channel=${encodeURIComponent(clean)}`, {
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.videos) && data.videos.length > 0) {
        return {
          ...data,
          source: 'local_api'
        };
      }
    }
  } catch (e) {
    // Local API failed or not present (e.g. static site)
  }

  // 2. Fallback to client-side CORS Proxies
  const resolvedId = targetChannelId || knownChannelId;
  const directRssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${resolvedId}`;

  // Proxy A: AllOrigins Raw
  try {
    const proxyUrlA = `https://api.allorigins.win/raw?url=${encodeURIComponent(directRssUrl)}`;
    const resA = await fetch(proxyUrlA, { signal: AbortSignal.timeout(7000) });
    if (resA.ok) {
      const xml = await resA.text();
      const parsed = parseYouTubeRssXmlClient(xml);
      if (parsed.length > 0) {
        return {
          success: true,
          videos: parsed,
          source: 'proxy_allorigins',
          channelTitle: parsed[0]?.channelName || 'JAENAL MASKUN OFFICIAL',
          channelId: resolvedId
        };
      }
    }
  } catch (e) {}

  // Proxy B: RSS2JSON API
  try {
    const rss2JsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(directRssUrl)}`;
    const resB = await fetch(rss2JsonUrl, { signal: AbortSignal.timeout(7000) });
    if (resB.ok) {
      const jsonB = await resB.json();
      if (jsonB.status === 'ok' && Array.isArray(jsonB.items) && jsonB.items.length > 0) {
        const parsed = jsonB.items.map((item: any) => {
          const vId = extractYouTubeId(item.link || item.guid) || '';
          return {
            id: `yt-vid-${vId || item.guid}`,
            videoId: vId,
            title: item.title || 'Video Pembelajaran',
            description: item.description?.replace(/<[^>]+>/g, '') || '',
            thumbnail: item.thumbnail || `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
            videoUrl: item.link || `https://www.youtube.com/watch?v=${vId}`,
            publishedAt: item.pubDate ? new Date(item.pubDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Terbaru',
            views: 'Resmi',
            channelName: jsonB.feed?.title || 'JAENAL MASKUN OFFICIAL',
            platform: 'youtube'
          };
        });

        if (parsed.length > 0) {
          return {
            success: true,
            videos: parsed,
            source: 'proxy_rss2json',
            channelTitle: jsonB.feed?.title || 'JAENAL MASKUN OFFICIAL',
            channelId: resolvedId
          };
        }
      }
    }
  } catch (e) {}

  // Proxy C: corsproxy.io
  try {
    const proxyUrlC = `https://corsproxy.io/?url=${encodeURIComponent(directRssUrl)}`;
    const resC = await fetch(proxyUrlC, { signal: AbortSignal.timeout(7000) });
    if (resC.ok) {
      const xml = await resC.text();
      const parsed = parseYouTubeRssXmlClient(xml);
      if (parsed.length > 0) {
        return {
          success: true,
          videos: parsed,
          source: 'proxy_corsproxy',
          channelTitle: parsed[0]?.channelName || 'JAENAL MASKUN OFFICIAL',
          channelId: resolvedId
        };
      }
    }
  } catch (e) {}

  return {
    success: false,
    videos: [],
    source: 'failed',
    channelId: resolvedId,
    message: 'Tidak dapat mengambil RSS saluran. Pastikan koneksi internet stabil.'
  };
}

