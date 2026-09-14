import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Video,
  Play,
  X,
  ExternalLink,
  Share2,
  Check,
  RefreshCw,
  Search,
  Clock,
  Eye,
  Youtube,
  Tv,
  Radio,
  SlidersHorizontal,
  Compass,
  ArrowUpRight,
  Film,
  ListVideo,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Layers,
  Volume2,
  Smartphone
} from 'lucide-react';
import { defaultYouTubeVideos, defaultYouTubeChannelConfig, defaultMediaChannels } from '../data/personalData';
import { YouTubeChannelVideo, YouTubeChannelConfig, ProfileInfo, MediaChannelAccount } from '../types';
import { parseVideoUrl, getPlatformBadgeStyle, fetchYouTubeVideosUniversal, generateChannelPoster, VideoPlatform } from '../utils/videoHelpers';
import { UniversalMediaPlayer } from './UniversalMediaPlayer';
import { backgroundMedia } from '../utils/backgroundMediaManager';

interface MediaChannelSectionProps {
  youtubeVideos?: YouTubeChannelVideo[];
  youtubeConfig?: YouTubeChannelConfig;
  mediaChannels?: MediaChannelAccount[];
  profile?: ProfileInfo;
  channelHandle?: string;
  channelTitle?: string;
}

export const MediaChannelSection: React.FC<MediaChannelSectionProps> = ({
  youtubeVideos: initialYoutubeVideos,
  youtubeConfig,
  mediaChannels: propMediaChannels,
  profile,
  channelHandle: propChannelHandle,
  channelTitle: propChannelTitle,
}) => {
  // Active Video Modal
  const [activeVideo, setActiveVideo] = useState<{
    id: string;
    title: string;
    description?: string;
    videoUrl: string;
    platform: string;
    publishedAt?: string;
  } | null>(null);

  // View Mode: 'playlist' (Compact Studio Theater) or 'grid' (Paginated Mini Grid)
  const [viewMode, setViewMode] = useState<'playlist' | 'grid'>('playlist');
  
  // Selected spotlight index for the compact playlist theater
  const [selectedSpotlightIndex, setSelectedSpotlightIndex] = useState<number>(0);
  const [isInlinePlaying, setIsInlinePlaying] = useState<boolean>(false);

  // Pagination for grid view
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 6;

  // Platform Filter Tab: 'all' | 'youtube' | 'tiktok' | 'instagram' | 'facebook'
  const [activePlatform, setActivePlatform] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const channelsList = Array.isArray(propMediaChannels)
    ? propMediaChannels
    : (Array.isArray(youtubeConfig?.channels) ? youtubeConfig.channels : defaultMediaChannels);

  // Video data state
  const [videos, setVideos] = useState<YouTubeChannelVideo[]>(() => {
    if (Array.isArray(initialYoutubeVideos) && initialYoutubeVideos.length > 0) {
      return initialYoutubeVideos;
    }
    if (Array.isArray(youtubeConfig?.videos) && youtubeConfig.videos.length > 0) {
      return youtubeConfig.videos;
    }
    return defaultYouTubeVideos;
  });

  // Sync state on prop changes
  useEffect(() => {
    if (Array.isArray(initialYoutubeVideos) && initialYoutubeVideos.length > 0) {
      setVideos(initialYoutubeVideos);
    } else if (Array.isArray(youtubeConfig?.videos) && youtubeConfig.videos.length > 0) {
      setVideos(youtubeConfig.videos);
    }
  }, [initialYoutubeVideos, youtubeConfig?.videos]);

  // Connect Magic Capsule play event
  useEffect(() => {
    const handlePlayRequest = () => {
      setIsInlinePlaying(true);
      backgroundMedia.warmupAudio();
      backgroundMedia.setVolume(100);
      backgroundMedia.play();
    };

    window.addEventListener('play-media-channel', handlePlayRequest);
    return () => window.removeEventListener('play-media-channel', handlePlayRequest);
  }, []);

  // Register initial track metadata without autoplaying or opening capsule prematurely
  useEffect(() => {
    if (videos.length > 0) {
      const topVid = videos[0];
      const parsedVid = parseVideoUrl(topVid.videoUrl || (topVid.videoId ? `https://www.youtube.com/watch?v=${topVid.videoId}` : ''));
      backgroundMedia.registerActiveTrack(
        {
          id: topVid.id || topVid.videoId || 'default-track',
          title: topVid.title || 'Siaran Media Digital Madrasah',
          artist: topVid.channelName || 'Ust. Jaenal Maskun, S.Pd.I.',
          album: 'Kanal Media & Kajian Digital Madrasah',
          artworkUrl: topVid.thumbnail || (topVid.videoId ? `https://img.youtube.com/vi/${topVid.videoId}/hqdefault.jpg` : undefined),
          videoUrl: topVid.videoUrl || (topVid.videoId ? `https://www.youtube.com/watch?v=${topVid.videoId}` : ''),
          platform: parsedVid?.platformName || 'YouTube',
        },
        'youtube',
        undefined,
        false
      );
    }
  }, [videos]);

  // Auto-fetch latest live channel videos on mount ONLY if no custom/persisted videos exist
  useEffect(() => {
    // If the site already has configured videos, do not auto-overwrite them on every refresh
    if ((Array.isArray(initialYoutubeVideos) && initialYoutubeVideos.length > 0) ||
        (Array.isArray(youtubeConfig?.videos) && youtubeConfig.videos.length > 0)) {
      return;
    }

    const autoFetch = async () => {
      try {
        const channelQuery = youtubeConfig?.channelId || youtubeConfig?.playlistId || propChannelHandle || profile?.socials?.youtube || '@jaenalmaskunofficial3977';
        const result = await fetchYouTubeVideosUniversal(channelQuery);
        if (result.success && Array.isArray(result.videos) && result.videos.length > 0) {
          setVideos((current) => {
            if (current && current.length > 0) return current;
            return result.videos;
          });
        }
      } catch (e) {
        console.warn('Auto fetch channel videos error:', e);
      }
    };

    autoFetch();
  }, [youtubeConfig?.channelId, propChannelHandle, profile?.socials?.youtube]);

  // Sync latest channel video list with multi-tier fallback
  const handleSyncVideos = async () => {
    setIsSyncing(true);
    try {
      const channelQuery = youtubeConfig?.channelId || youtubeConfig?.playlistId || propChannelHandle || profile?.socials?.youtube || '@jaenalmaskunofficial3977';
      const result = await fetchYouTubeVideosUniversal(channelQuery);
      if (result.success && Array.isArray(result.videos) && result.videos.length > 0) {
        setVideos(result.videos);
        setSelectedSpotlightIndex(0);
        setIsInlinePlaying(false);
      }
    } catch (err) {
      console.warn('Could not refresh YouTube videos:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyVideoUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Social Links configuration
  const socials = profile?.socials || {};
  const effectiveChannelTitle = youtubeConfig?.channelTitle || propChannelTitle || `Saluran Resmi ${profile?.name || 'Ust. Jaenal Maskun'}`;
  const effectiveChannelUrl = youtubeConfig?.channelUrl || (socials.youtube ? (socials.youtube.startsWith('http') ? socials.youtube : `https://youtube.com/${socials.youtube.replace(/^@/, '@')}`) : 'https://youtube.com/@jaenalmaskunofficial3977');

  // Filter video list based on platform & search query
  const filteredVideos = useMemo(() => {
    let allMediaItems: YouTubeChannelVideo[] = [...videos];

    // Check if channelsList has platforms and add them if not present
    if (Array.isArray(channelsList)) {
      channelsList.forEach((ch) => {
        if (ch.channelUrl) {
          const isPresent = allMediaItems.some(
            (v) => v.videoUrl === ch.channelUrl || v.id === ch.id
          );
          if (!isPresent) {
            const parsedCh = parseVideoUrl(ch.channelUrl);
            allMediaItems.push({
              id: ch.id || `channel-${ch.platform}`,
              title: ch.channelName,
              description: ch.description || `Kanal siaran resmi ${ch.channelName}`,
              videoUrl: ch.channelUrl,
              platform: ch.platform as any,
              channelName: ch.channelName,
              publishedAt: ch.subscribersOrFollowers || 'Akun Resmi',
              thumbnailUrl: parsedCh?.thumbnailUrl || generateChannelPoster(ch.platform, ch.channelHandle || ch.channelName)
            });
          }
        }
      });
    }

    return allMediaItems.filter((vid) => {
      const effectiveUrl = vid.videoUrl || (vid.videoId ? `https://www.youtube.com/watch?v=${vid.videoId}` : '');
      const parsed = parseVideoUrl(effectiveUrl);
      const videoPlatform = parsed ? parsed.type.toLowerCase() : (vid.platform ? vid.platform.toLowerCase() : 'youtube');
      const matchesPlatform = activePlatform === 'all' || videoPlatform === activePlatform.toLowerCase();
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        vid.title.toLowerCase().includes(query) || 
        (vid.description && vid.description.toLowerCase().includes(query));
      return matchesPlatform && matchesSearch;
    });
  }, [videos, activePlatform, searchQuery, channelsList]);

  // Ensure spotlight index is within bounds
  const currentSpotlightVideo = filteredVideos[selectedSpotlightIndex] || filteredVideos[0] || null;
  const currentSpotlightUrl = currentSpotlightVideo 
    ? (currentSpotlightVideo.videoUrl || (currentSpotlightVideo.videoId ? `https://www.youtube.com/watch?v=${currentSpotlightVideo.videoId}` : ''))
    : '';
  const parsedCurrentSpotlight = useMemo(() => parseVideoUrl(currentSpotlightUrl), [currentSpotlightUrl]);
  const spotlightBadge = getPlatformBadgeStyle(parsedCurrentSpotlight?.type || 'youtube');

  // Pagination calculations for Grid Mode
  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage) || 1;
  const paginatedGridVideos = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVideos.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVideos, currentPage, itemsPerPage]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedSpotlightIndex(0);
    setIsInlinePlaying(false);
  }, [activePlatform, searchQuery]);

  return (
    <section id="media-channel" className="py-16 sm:py-20 bg-gradient-to-b from-[#022c22] via-[#064e3b] to-[#022c22] text-white relative overflow-hidden">
      {/* Background Decorative Accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold uppercase tracking-wider mb-3">
            <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span>Kanal Media & Siaran Digital Madrasah</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-serif">
            Pusat Media, Kajian & Video Edukasi
          </h2>
          <p className="mt-2.5 text-xs sm:text-base text-emerald-100/90 leading-relaxed">
            Koleksi video pembelajaran interaktif, rekaman kajian kitab kuning, khazanah madrasah, dan liputan santri dalam format daftar putar yang ringkas dan hemat ruang.
          </p>
        </div>

        {/* Channel Highlights & Quick Stats */}
        <div className="mb-8 p-4 sm:p-6 rounded-3xl bg-slate-900/80 border border-red-500/30 shadow-2xl backdrop-blur-md space-y-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30 shrink-0">
                <Youtube className="w-7 h-7 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {effectiveChannelTitle}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-red-600/30 text-red-300 text-[10px] font-bold border border-red-500/40">
                    Official Channel
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800">
                    {filteredVideos.length} Video
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 line-clamp-1 sm:line-clamp-none">
                  Kajian fikih, modul kurikulum merdeka madrasah, dan dokumentasi kegiatan santri.
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <button
                type="button"
                onClick={handleSyncVideos}
                disabled={isSyncing}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                title="Muat Ulang Video Terbaru"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-red-400' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
              </button>

              <a
                href={effectiveChannelUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition-all hover:scale-102 cursor-pointer"
              >
                <Youtube className="w-4 h-4 fill-current" />
                <span>Buka di YouTube</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Filter, Search & View Switcher Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3.5 mb-6">
          {/* Platform Tab Filters */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-emerald-900/60 overflow-x-auto w-full md:w-auto scrollbar-none">
            {[
              { id: 'all', label: 'Semua', icon: Tv },
              { id: 'youtube', label: 'YouTube', icon: Youtube },
              { id: 'tiktok', label: 'TikTok', icon: Video },
              { id: 'instagram', label: 'Instagram', icon: Video },
              { id: 'facebook', label: 'Facebook', icon: Video },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activePlatform === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActivePlatform(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-emerald-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            {/* Search Box */}
            <div className="relative flex-1 md:w-60">
              <Search className="w-3.5 h-3.5 text-emerald-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari materi video..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-black/40 border border-emerald-800/80 text-xs text-white placeholder:text-emerald-300/60 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* View Mode Toggle: Playlist Studio vs Grid Paginasi */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-700/80 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('playlist')}
                title="Tampilan Playlist Studio (Hemat Ruang)"
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'playlist'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ListVideo className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Playlist Studio</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Tampilan Grid Paginasi (Hemat Ruang)"
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid Mini</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: STUDIO PLAYLIST THEATER (HEMAT RUANGAN & PRAKTIS) */}
        {/* ========================================================================= */}
        {filteredVideos.length > 0 ? (
          viewMode === 'playlist' ? (
            <div className="bg-slate-950/90 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-md">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
                {/* Spotlight Main Screen (7 Columns on Large Screens) */}
                <div className="lg:col-span-7 p-4 sm:p-6 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Active Video Screen */}
                    <div className={`relative w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-xl group transition-all duration-300 ${
                      isInlinePlaying && (parsedCurrentSpotlight?.isVertical || parsedCurrentSpotlight?.type === 'tiktok' || parsedCurrentSpotlight?.type === 'instagram')
                        ? 'min-h-[480px] sm:min-h-[540px] flex items-center justify-center'
                        : isInlinePlaying
                        ? 'w-full'
                        : 'aspect-video'
                    }`}>
                      {isInlinePlaying && currentSpotlightVideo ? (
                        <div className="w-full bg-black">
                          <UniversalMediaPlayer
                            key={currentSpotlightUrl}
                            url={currentSpotlightUrl}
                            title={currentSpotlightVideo.title}
                            autoPlay={true}
                            showShareControls={true}
                          />
                        </div>
                      ) : (
                        currentSpotlightVideo && (
                          <div className="relative w-full h-full">
                            <img
                              src={currentSpotlightVideo.thumbnail || currentSpotlightVideo.thumbnailUrl || (currentSpotlightVideo.videoId ? `https://img.youtube.com/vi/${currentSpotlightVideo.videoId}/hqdefault.jpg` : '') || 'https://images.unsplash.com/photo-1584697964190-71c4c3b28b7e?auto=format&fit=crop&w=800&q=80'}
                              alt={currentSpotlightVideo.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                              onError={(e: any) => {
                                e.target.src = 'https://images.unsplash.com/photo-1584697964190-71c4c3b28b7e?auto=format&fit=crop&w=800&q=80';
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-between p-4 sm:p-6">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`px-2.5 py-1 rounded-md ${spotlightBadge.badgeBg} ${spotlightBadge.badgeText} border ${spotlightBadge.badgeBorder} text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-md`}>
                                  {parsedCurrentSpotlight?.type === 'youtube' ? (
                                    <Youtube className="w-3 h-3 fill-current" />
                                  ) : (
                                    <Video className="w-3 h-3" />
                                  )}
                                  <span>{parsedCurrentSpotlight?.platformName || 'Sedang Dipilih'}</span>
                                </span>
                                <span className="px-2.5 py-1 rounded-md bg-black/70 text-slate-300 text-[10px] font-mono">
                                  Video #{selectedSpotlightIndex + 1} dari {filteredVideos.length}
                                </span>
                              </div>

                              <div className="text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsInlinePlaying(true);
                                    backgroundMedia.registerActiveTrack(
                                      {
                                        id: currentSpotlightVideo.id || currentSpotlightVideo.videoId || String(selectedSpotlightIndex),
                                        title: currentSpotlightVideo.title,
                                        artist: currentSpotlightVideo.channelName || 'Ust. Jaenal Maskun, S.Pd.I.',
                                        album: 'Kanal Media Digital Madrasah',
                                        artworkUrl: currentSpotlightVideo.thumbnail || currentSpotlightVideo.thumbnailUrl || (currentSpotlightVideo.videoId ? `https://img.youtube.com/vi/${currentSpotlightVideo.videoId}/hqdefault.jpg` : undefined),
                                        videoUrl: currentSpotlightUrl,
                                        platform: parsedCurrentSpotlight?.platformName || currentSpotlightVideo.platform || 'YouTube',
                                      },
                                      (parsedCurrentSpotlight?.type as any) || 'youtube'
                                    );
                                    backgroundMedia.warmupAudio();
                                    backgroundMedia.setVolume(100);
                                    backgroundMedia.setCapsuleVisible(true);
                                    backgroundMedia.play();
                                  }}
                                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full inline-flex items-center justify-center shadow-2xl hover:scale-110 transition-all cursor-pointer group-hover:ring-4 ${
                                    parsedCurrentSpotlight?.type === 'tiktok'
                                      ? 'bg-gradient-to-r from-cyan-400 to-pink-500 text-slate-950 shadow-cyan-500/40 group-hover:ring-cyan-400/40'
                                      : parsedCurrentSpotlight?.type === 'instagram'
                                      ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-pink-600/40 group-hover:ring-pink-400/40'
                                      : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/50 group-hover:ring-red-400/40'
                                  }`}
                                  title={`Putar ${currentSpotlightVideo.title}`}
                                >
                                  <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
                                </button>
                                <p className="text-xs text-white/90 font-bold mt-2 drop-shadow">
                                  Klik untuk Putar Siaran
                                </p>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-300">
                                <span>{currentSpotlightVideo.publishedAt || 'Terbaru'}</span>
                                <span>{currentSpotlightVideo.views || 'Official'}</span>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    {/* Spotlight Video Title & Info */}
                    {currentSpotlightVideo && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-bold mb-1">
                          <span>{currentSpotlightVideo.channelName || parsedCurrentSpotlight?.platformName || 'JAENAL MASKUN OFFICIAL'}</span>
                          <span>•</span>
                          <span>{currentSpotlightVideo.publishedAt || 'Terbaru'}</span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                          {currentSpotlightVideo.title}
                        </h3>
                        {currentSpotlightVideo.description && (
                          <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                            {currentSpotlightVideo.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Spotlight Action Controls */}
                  {currentSpotlightVideo && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveVideo({
                              id: currentSpotlightVideo.id || currentSpotlightVideo.videoId,
                              title: currentSpotlightVideo.title,
                              description: currentSpotlightVideo.description,
                              videoUrl: currentSpotlightUrl,
                              platform: parsedCurrentSpotlight?.platformName || parsedCurrentSpotlight?.type || currentSpotlightVideo.platform || 'Media',
                              publishedAt: currentSpotlightVideo.publishedAt
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Layar Penuh</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyVideoUrl(currentSpotlightUrl)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? 'Tersalin' : 'Bagikan'}</span>
                        </button>
                      </div>

                      {parsedCurrentSpotlight?.type === 'tiktok' ? (
                        <a
                          href={currentSpotlightUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-pink-500 hover:opacity-90 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Buka di TikTok</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      ) : parsedCurrentSpotlight?.type === 'instagram' ? (
                        <a
                          href={currentSpotlightUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Buka di Instagram</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      ) : parsedCurrentSpotlight?.type === 'facebook' ? (
                        <a
                          href={currentSpotlightUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Buka di Facebook</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      ) : (
                        <a
                          href={currentSpotlightUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-1.5 rounded-xl bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <Youtube className="w-3.5 h-3.5 fill-current" />
                          <span>Buka di YouTube</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Compact Scrollable Playlist Column (5 Columns on Large Screens) */}
                <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col bg-slate-900/40">
                  <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <ListVideo className="w-4 h-4 text-red-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Daftar Putar Saluran
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                      {filteredVideos.length} Video
                    </span>
                  </div>

                  {/* Scrollable Playlist Queue */}
                  <div className="space-y-2 overflow-y-auto max-h-[460px] pr-1.5 custom-scrollbar">
                    {filteredVideos.map((vid, idx) => {
                      const isSelected = selectedSpotlightIndex === idx;
                      const effectiveUrl = vid.videoUrl || (vid.videoId ? `https://www.youtube.com/watch?v=${vid.videoId}` : '');
                      const parsed = parseVideoUrl(effectiveUrl);
                      const thumb = vid.thumbnail || vid.thumbnailUrl || parsed?.thumbnailUrl || (vid.videoId ? `https://img.youtube.com/vi/${vid.videoId}/hqdefault.jpg` : '') || 'https://images.unsplash.com/photo-1584697964190-71c4c3b28b7e?auto=format&fit=crop&w=400&q=80';
                      const badge = getPlatformBadgeStyle(parsed?.type || vid.platform || 'youtube');
                      
                      return (
                        <div
                          key={vid.id || vid.videoId || idx}
                          onClick={() => {
                            setSelectedSpotlightIndex(idx);
                            setIsInlinePlaying(true);
                            backgroundMedia.registerActiveTrack(
                              {
                                id: vid.id || vid.videoId || String(idx),
                                title: vid.title,
                                artist: vid.channelName || 'Ust. Jaenal Maskun, S.Pd.I.',
                                album: 'Kanal Media Digital Madrasah',
                                artworkUrl: thumb,
                                videoUrl: effectiveUrl,
                                platform: parsed?.platformName || vid.platform || 'YouTube',
                              },
                              (parsed?.type as any) || 'youtube'
                            );
                            backgroundMedia.warmupAudio();
                            backgroundMedia.setVolume(100);
                            backgroundMedia.setCapsuleVisible(true);
                            backgroundMedia.play();
                          }}
                          className={`group p-2 rounded-2xl flex items-center gap-3 cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-red-950/70 border-red-500/70 shadow-md ring-1 ring-red-500/40'
                              : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          {/* Playlist Index & Thumbnail */}
                          <div className="relative w-24 h-14 sm:w-28 sm:h-16 rounded-xl overflow-hidden bg-black shrink-0 border border-slate-700 group-hover:border-red-500/60">
                            <img
                              src={thumb}
                              alt={vid.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e: any) => {
                                e.target.src = 'https://images.unsplash.com/photo-1584697964190-71c4c3b28b7e?auto=format&fit=crop&w=400&q=80';
                              }}
                            />
                            <div className={`absolute inset-0 flex items-center justify-center transition-all ${
                              isSelected ? 'bg-red-950/60' : 'bg-black/40 group-hover:bg-red-950/40'
                            }`}>
                              {isSelected ? (
                                <div className="p-1 rounded-full bg-red-600 text-white animate-pulse">
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                </div>
                              ) : (
                                <Play className="w-4 h-4 text-white/90 group-hover:scale-110 transition-transform fill-current drop-shadow" />
                              )}
                            </div>
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/80 text-[9px] font-mono text-white">
                              #{idx + 1}
                            </span>
                            {parsed?.type && parsed.type !== 'youtube' && (
                              <span className={`absolute top-1 right-1 px-1 py-0.2 rounded text-[8px] font-extrabold ${badge.badgeBg} ${badge.badgeText}`}>
                                {parsed.platformName}
                              </span>
                            )}
                          </div>

                          {/* Video Details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {isSelected && (
                                <span className="text-[9px] font-extrabold uppercase text-red-400 bg-red-950 px-1.5 py-0.2 rounded border border-red-800/60">
                                  Memutar
                                </span>
                              )}
                              <span className="text-[9px] text-slate-400 truncate">
                                {vid.publishedAt || 'Terbaru'}
                              </span>
                            </div>
                            <h5 className={`text-xs font-bold line-clamp-2 mt-0.5 leading-snug transition-colors ${
                              isSelected ? 'text-white font-extrabold' : 'text-slate-200 group-hover:text-red-300'
                            }`}>
                              {vid.title}
                            </h5>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* VIEW 2: COMPACT PAGINATED GRID (HEMAT RUANGAN 6 VIDEO PER HALAMAN) */
            /* ========================================================================= */
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginatedGridVideos.map((vid, idx) => {
                  const effectiveVideoUrl = vid.videoUrl || (vid.videoId ? `https://www.youtube.com/watch?v=${vid.videoId}` : '');
                  const parsed = parseVideoUrl(effectiveVideoUrl);
                  const badgeStyle = getPlatformBadgeStyle(parsed?.type || vid.platform || 'youtube');
                  const thumbnailSrc = vid.thumbnailUrl || vid.thumbnail || parsed?.thumbnailUrl || (vid.videoId ? `https://img.youtube.com/vi/${vid.videoId}/hqdefault.jpg` : '') || 'https://images.unsplash.com/photo-1584697964190-71c4c3b28b7e?auto=format&fit=crop&w=600&q=80';
                  const globalIdx = (currentPage - 1) * itemsPerPage + idx;

                  return (
                    <div
                      key={vid.id || vid.videoId || idx}
                      onClick={() =>
                        setActiveVideo({
                          id: vid.id || vid.videoId,
                          title: vid.title,
                          description: vid.description,
                          videoUrl: effectiveVideoUrl,
                          platform: parsed?.platformName || parsed?.type || vid.platform || 'youtube',
                          publishedAt: vid.publishedAt || vid.publishedDate,
                        })
                      }
                      className="group bg-slate-900/90 rounded-2xl overflow-hidden border border-emerald-900/40 hover:border-red-500/60 shadow-lg hover:shadow-xl hover:shadow-red-600/10 transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-0.5"
                    >
                      {/* Video Thumbnail */}
                      <div className="aspect-video relative overflow-hidden bg-black/80">
                        <img
                          src={thumbnailSrc}
                          alt={vid.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e: any) => {
                            e.target.src = 'https://images.unsplash.com/photo-1584697964190-71c4c3b28b7e?auto=format&fit=crop&w=600&q=80';
                          }}
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                          <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform ${
                            parsed?.type === 'tiktok'
                              ? 'bg-gradient-to-r from-cyan-400 to-pink-500 text-slate-950 font-bold'
                              : parsed?.type === 'instagram'
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                              : 'bg-red-600/90 group-hover:bg-red-600'
                          }`}>
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </div>

                        {/* Video Index Badge */}
                        <div className="absolute top-2.5 left-2.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-black/80 text-white shadow-md">
                            #{globalIdx + 1}
                          </span>
                        </div>

                        {/* Platform Badge */}
                        <div className="absolute top-2.5 right-2.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badgeStyle.badgeBg} ${badgeStyle.badgeText} shadow-md`}>
                            {parsed?.platformName || 'Media'}
                          </span>
                        </div>

                        {/* Duration / Stats Badge */}
                        {(vid.duration || vid.views) && (
                          <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                            {vid.views && (
                              <span className="px-1.5 py-0.5 rounded bg-black/80 text-[9px] text-gray-300 font-medium">
                                {vid.views}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Video Content Metadata */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 group-hover:text-red-400 transition-colors leading-snug">
                            {vid.title}
                          </h4>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            <span>{vid.publishedAt || 'Materi Pilihan'}</span>
                          </span>
                          <span className="text-red-400 font-bold group-hover:underline flex items-center gap-0.5">
                            <span>Putar</span>
                            <Play className="w-2.5 h-2.5 fill-current" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls for Compact Grid */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs">
                  <span className="text-slate-400 text-[11px]">
                    Menampilkan <strong className="text-white">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredVideos.length)}</strong> dari <strong className="text-white">{filteredVideos.length}</strong> total video
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-white font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Sebelumnya</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                            currentPage === pageNum
                              ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-white font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      <span>Selanjutnya</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="text-center py-16 px-4 bg-black/30 rounded-3xl border border-emerald-900/40">
            <Tv className="w-12 h-12 text-emerald-400/50 mx-auto mb-3" />
            <h4 className="text-base font-bold text-white">
              {videos.length === 0 ? 'Belum Ada Video Siaran Ditambahkan' : 'Tidak ada video yang sesuai kriteria'}
            </h4>
            <p className="text-xs text-emerald-200/70 mt-1 max-w-md mx-auto">
              {videos.length === 0
                ? 'Daftar video siaran telah dibersihkan. Anda dapat menambahkan video siaran baru kapan saja melalui Portal Admin.'
                : 'Silakan sesuaikan kata kunci pencarian atau pilih filter platform lain untuk menemukan video siaran.'}
            </p>
          </div>
        )}

        {/* Multi-Platform Social Accounts Row */}
        {channelsList && channelsList.length > 0 && (
          <div className="mt-10 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>Saluran & Akun Media Sosial Resmi Terverifikasi:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {channelsList.map((ch, idx) => {
                const getChBadge = (p: string) => {
                  switch (p) {
                    case 'youtube': return { bg: 'bg-red-950/60 border-red-800/60 text-red-300', btn: 'bg-red-600 hover:bg-red-500 text-white', icon: Youtube, label: 'YouTube' };
                    case 'tiktok': return { bg: 'bg-cyan-950/60 border-cyan-800/60 text-cyan-300', btn: 'bg-cyan-600 hover:bg-cyan-500 text-white', icon: Video, label: 'TikTok' };
                    case 'instagram': return { bg: 'bg-pink-950/60 border-pink-800/60 text-pink-300', btn: 'bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white', icon: Video, label: 'Instagram' };
                    case 'facebook': return { bg: 'bg-blue-950/60 border-blue-800/60 text-blue-300', btn: 'bg-blue-600 hover:bg-blue-500 text-white', icon: Video, label: 'Facebook' };
                    default: return { bg: 'bg-slate-950/60 border-slate-800 text-slate-300', btn: 'bg-slate-700 hover:bg-slate-600 text-white', icon: Film, label: 'Channel' };
                  }
                };
                const b = getChBadge(ch.platform);
                const Icon = b.icon;

                return (
                  <div
                    key={ch.id || idx}
                    className={`p-2.5 rounded-xl border ${b.bg} flex items-center justify-between gap-3 backdrop-blur-xs`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-black/40 shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-white truncate">
                            {ch.channelName}
                          </h4>
                          {ch.isPrimary && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-400 text-[9px] font-extrabold text-slate-950">
                              Utama
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          {ch.channelHandle || b.label} {ch.subscribersOrFollowers ? `• ${ch.subscribersOrFollowers}` : ''}
                        </p>
                      </div>
                    </div>

                    {ch.channelUrl && (
                      <a
                        href={ch.channelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 shadow-sm transition-all ${b.btn}`}
                      >
                        <span>Kunjungi</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 🎬 MODAL PEMUTAR UNIVERSAL RESMI KHUSUS MEDIA CHANNEL */}
      {/* ========================================================================= */}
      {activeVideo && (() => {
        const parsedActive = parseVideoUrl(activeVideo.videoUrl);
        const activeBadge = getPlatformBadgeStyle((parsedActive?.type || activeVideo.platform || 'youtube') as VideoPlatform);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fadeIn">
            <div className="bg-slate-900 text-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl relative flex flex-col border border-red-500/30 max-h-[94vh]">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span className={`p-2 rounded-xl shadow-lg ${
                    parsedActive?.type === 'tiktok'
                      ? 'bg-gradient-to-r from-cyan-400 to-pink-500 text-slate-950 font-bold'
                      : parsedActive?.type === 'instagram'
                      ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white'
                      : 'bg-red-600 text-white'
                  }`}>
                    {parsedActive?.type === 'youtube' ? <Youtube className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  </span>
                  <div>
                    <span className={`text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5 ${activeBadge.badgeText}`}>
                      <span>{parsedActive?.platformName || activeVideo.platform} • Siaran Media Digital</span>
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1">
                      {activeVideo.title}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setActiveVideo(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Tutup Pemutar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Universal Media Player Screen */}
              <div className="w-full bg-black overflow-y-auto max-h-[62vh]">
                <UniversalMediaPlayer
                  url={activeVideo.videoUrl}
                  title={activeVideo.title}
                  autoPlay={true}
                  showShareControls={true}
                />
              </div>

              {/* Modal Body & Action Bar */}
              <div className="p-5 sm:p-6 bg-slate-900/95 flex-1 overflow-y-auto border-t border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <span className="text-xs font-bold text-red-300 bg-red-950/80 border border-red-800 px-3 py-1 rounded-full">
                    {activeVideo.publishedAt || 'Materi Siaran Madrasah'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyVideoUrl(activeVideo.videoUrl)}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Salin Tautan Video"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{copiedLink ? 'Tersalin!' : 'Bagikan Link'}</span>
                    </button>

                    <a
                      href={activeVideo.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                        parsedActive?.type === 'tiktok'
                          ? 'bg-gradient-to-r from-cyan-400 to-pink-500 text-slate-950 hover:opacity-90'
                          : parsedActive?.type === 'instagram'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka di {parsedActive?.platformName || 'Sumber Asli'}</span>
                    </a>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                  {activeVideo.title}
                </h3>
                {activeVideo.description && (
                  <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed whitespace-pre-line">
                    {activeVideo.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
};
