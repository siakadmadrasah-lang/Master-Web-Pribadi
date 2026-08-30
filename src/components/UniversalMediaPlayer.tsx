import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Volume2,
  ExternalLink,
  Share2,
  Check,
  Film,
  Music,
  Video as VideoIcon,
  Maximize2,
  Minimize2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  Tv,
  Radio,
  X,
  SlidersHorizontal,
  Headphones,
  Smartphone
} from 'lucide-react';
import { parseVideoUrl, getPlatformBadgeStyle, ParsedVideo } from '../utils/videoHelpers';
import { backgroundMedia } from '../utils/backgroundMediaManager';

interface UniversalMediaPlayerProps {
  url?: string;
  title?: string;
  autoPlay?: boolean;
  className?: string;
  showShareControls?: boolean;
  enableAutoFloating?: boolean;
}

export const UniversalMediaPlayer: React.FC<UniversalMediaPlayerProps> = ({
  url,
  title = 'Media Pembelajaran & Dokumentasi',
  autoPlay = true,
  className = '',
  showShareControls = true,
  enableAutoFloating = true
}) => {
  const [currentUrl, setCurrentUrl] = useState(url || '');
  const [currentTitle, setCurrentTitle] = useState(title);
  const [copied, setCopied] = useState(false);
  const [channelVideos, setChannelVideos] = useState<any[]>([]);
  const [isLoadingChannel, setIsLoadingChannel] = useState(false);
  const [tiktokViewMode, setTiktokViewMode] = useState<'embed' | 'app'>('embed');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissedByUser, setIsDismissedByUser] = useState(false);
  const [autoMinimizeOnScroll, setAutoMinimizeOnScroll] = useState<boolean>(() => {
    try {
      return localStorage.getItem('madrasah_auto_pip') !== 'false';
    } catch (e) {
      return true;
    }
  });
  const [isTabHidden, setIsTabHidden] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const originalDocTitleRef = useRef<string>(typeof document !== 'undefined' ? document.title : '');
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);

  // Trigger System Picture-in-Picture (Layar Melayang OS Android / Desktop)
  const handleSystemPiP = async () => {
    backgroundMedia.warmupAudio();
    backgroundMedia.play();
    backgroundMedia.setVolume(100);

    // 1. If direct HTML5 video is present
    const nativeVid = containerRef.current?.querySelector('video');
    if (nativeVid && typeof (nativeVid as any).requestPictureInPicture === 'function') {
      try {
        await (nativeVid as any).requestPictureInPicture();
        return;
      } catch (e) {
        console.warn('Native video PiP error:', e);
      }
    }

    // 2. Universal Canvas Stream PiP for YouTube & All Media
    try {
      if (typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled) {
        if (!pipVideoRef.current) {
          const v = document.createElement('video');
          v.muted = true;
          v.playsInline = true;
          v.style.position = 'fixed';
          v.style.top = '-9999px';
          v.style.left = '-9999px';
          v.style.width = '1px';
          v.style.height = '1px';
          v.style.opacity = '0';
          v.style.pointerEvents = 'none';
          document.body.appendChild(v);
          pipVideoRef.current = v;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw video poster / info card onto canvas
          ctx.fillStyle = '#064e3b';
          ctx.fillRect(0, 0, 640, 360);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(currentTitle || 'Media Digital Madrasah', 320, 160);
          ctx.fillStyle = '#6ee7b7';
          ctx.font = '18px sans-serif';
          ctx.fillText('Ust. Jaenal Maskun, S.Pd.I.', 320, 200);
          ctx.fillStyle = '#fbbf24';
          ctx.font = '14px sans-serif';
          ctx.fillText('▶ Pemutaran Suara & Latar Belakang Aktif', 320, 240);

          const stream = (canvas as any).captureStream ? (canvas as any).captureStream(10) : null;
          if (stream && pipVideoRef.current) {
            pipVideoRef.current.srcObject = stream;
            await pipVideoRef.current.play().catch(() => {});
            if (typeof (pipVideoRef.current as any).requestPictureInPicture === 'function') {
              await (pipVideoRef.current as any).requestPictureInPicture();
              return;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Canvas PiP fallback error:', err);
    }

    // Fallback: Use In-App Minimize floating window
    setIsMinimized(true);
    setIsDismissedByUser(false);
  };

  const [resolvedTikTok, setResolvedTikTok] = useState<{
    videoId?: string;
    embedUrl?: string;
    title?: string;
    authorName?: string;
  } | null>(null);

  useEffect(() => {
    setCurrentUrl(url || '');
    setCurrentTitle(title);
    setIsDismissedByUser(false);
  }, [url, title]);

  const [directVideoError, setDirectVideoError] = useState(false);
  const [directVideoKey, setDirectVideoKey] = useState(0);
  const [isDirectVideoPlaying, setIsDirectVideoPlaying] = useState(false);
  const [isDirectVideoLoading, setIsDirectVideoLoading] = useState(false);

  const parsed: ParsedVideo | null = parseVideoUrl(currentUrl);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const directVideoRef = useRef<HTMLVideoElement | null>(null);
  const directAudioRef = useRef<HTMLAudioElement | null>(null);
  const iframePlayerId = useRef<string>(`yt-player-${Math.random().toString(36).substring(2, 9)}`);

  // Direct video play attempt on URL change
  useEffect(() => {
    if (parsed?.type === 'direct_video') {
      setDirectVideoError(false);
      setIsDirectVideoPlaying(false);
      if (autoPlay && directVideoRef.current) {
        const p = directVideoRef.current.play();
        if (p !== undefined) {
          p.then(() => {
            setIsDirectVideoPlaying(true);
            setDirectVideoError(false);
          }).catch((err) => {
            console.warn('Autoplay prevented by mobile policy (tap to play):', err);
            setIsDirectVideoPlaying(false);
          });
        }
      }
    }
  }, [currentUrl, directVideoKey]);

  // Register track to background media manager & sync with OS Magic Capsule / Dynamic Island
  useEffect(() => {
    if (parsed && !parsed.isChannel) {
      backgroundMedia.registerActiveTrack(
        {
          id: parsed.videoId || currentUrl,
          title: currentTitle,
          artist: parsed.channelName || 'Ust. Jaenal Maskun, S.Pd.I.',
          album: 'Kanal Media & Kajian Digital Madrasah',
          artworkUrl: parsed.thumbnailUrl || (parsed.videoId ? `https://img.youtube.com/vi/${parsed.videoId}/hqdefault.jpg` : undefined),
          videoUrl: currentUrl,
          platform: parsed.platformName || (parsed.type === 'direct_video' ? 'Video Berkas' : 'Media Madrasah'),
        },
        parsed.type as any,
        iframePlayerId.current
      );

      if (parsed.type === 'youtube' && parsed.videoId) {
        const timer1 = setTimeout(() => {
          backgroundMedia.attachToYouTubeIframe(iframePlayerId.current);
        }, 150);
        const timer2 = setTimeout(() => {
          backgroundMedia.attachToYouTubeIframe(iframePlayerId.current);
          backgroundMedia.play();
        }, 600);
        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
        };
      }

      if (parsed.type === 'direct_video' && directVideoRef.current) {
        backgroundMedia.attachMediaElement(directVideoRef.current);
      } else if (parsed.type === 'direct_audio' && directAudioRef.current) {
        backgroundMedia.attachMediaElement(directAudioRef.current);
      }
    }
  }, [currentUrl, currentTitle, parsed?.type, parsed?.videoId, parsed?.isChannel]);

  // Direct video and audio element hookup
  useEffect(() => {
    if (parsed?.type === 'direct_video' && directVideoRef.current) {
      backgroundMedia.attachMediaElement(directVideoRef.current);
      return () => {
        backgroundMedia.attachMediaElement(null);
      };
    } else if (parsed?.type === 'direct_audio' && directAudioRef.current) {
      backgroundMedia.attachMediaElement(directAudioRef.current);
      return () => {
        backgroundMedia.attachMediaElement(null);
      };
    }
  }, [parsed?.type, parsed?.embedUrl]);

  // Ensure full audio & unmuted sound when minimized
  useEffect(() => {
    if (isMinimized) {
      backgroundMedia.warmupAudio();
      backgroundMedia.setVolume(100);
      backgroundMedia.play();
      const t1 = setTimeout(() => {
        backgroundMedia.warmupAudio();
        backgroundMedia.setVolume(100);
        backgroundMedia.play();
      }, 150);
      const t2 = setTimeout(() => {
        backgroundMedia.setVolume(100);
        backgroundMedia.play();
      }, 450);
      const t3 = setTimeout(() => {
        backgroundMedia.setVolume(100);
        backgroundMedia.play();
      }, 900);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isMinimized]);

  // Tab Visibility Title Update
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (!originalDocTitleRef.current) {
      originalDocTitleRef.current = document.title;
    }

    const handleVisibilityChange = () => {
      const hidden = document.hidden;
      setIsTabHidden(hidden);

      if (hidden) {
        if (currentTitle) {
          document.title = `▶ Sedang Memutar: ${currentTitle}`;
        }
      } else if (!hidden && originalDocTitleRef.current) {
        document.title = originalDocTitleRef.current;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (typeof document !== 'undefined' && originalDocTitleRef.current) {
        document.title = originalDocTitleRef.current;
      }
    };
  }, [currentTitle]);

  // Auto-Minimize when player scrolls out of viewport (IntersectionObserver)
  useEffect(() => {
    if (!enableAutoFloating || !autoMinimizeOnScroll || isDismissedByUser) return;
    if (typeof window === 'undefined' || !window.IntersectionObserver) return;

    const targetEl = isMinimized ? placeholderRef.current : containerRef.current;
    if (!targetEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // If main player is less than 15% visible on screen, auto float to corner
        if (!entry.isIntersecting || entry.intersectionRatio < 0.15) {
          if (!isDismissedByUser) {
            setIsMinimized(true);
          }
        } else {
          // If scrolled back into view, restore inline view
          setIsMinimized(false);
          setIsDismissedByUser(false);
        }
      },
      {
        threshold: [0, 0.15, 0.5, 1.0],
        rootMargin: '-60px 0px 0px 0px'
      }
    );

    observer.observe(targetEl);
    return () => observer.disconnect();
  }, [enableAutoFloating, autoMinimizeOnScroll, isDismissedByUser, isMinimized]);

  // Toggle Auto Minimize On Scroll preference
  const toggleAutoMinimizeOnScroll = () => {
    setAutoMinimizeOnScroll((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('madrasah_auto_pip', String(next));
      } catch (e) {}
      return next;
    });
  };

  // Auto-resolve TikTok shortlinks / videos for optimal playback
  useEffect(() => {
    if (parsed && parsed.type === 'tiktok' && !parsed.isLive && !parsed.isChannel) {
      const resolveTikTok = async () => {
        try {
          const res = await fetch(`/api/tiktok/resolve?url=${encodeURIComponent(currentUrl)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              setResolvedTikTok({
                videoId: data.videoId,
                embedUrl: data.embedUrl,
                title: data.title,
                authorName: data.authorName
              });
              if (data.title && currentTitle === 'Media Pembelajaran & Dokumentasi') {
                setCurrentTitle(data.title);
              }
            }
          }
        } catch (e) {
          console.warn('Could not auto-resolve TikTok video:', e);
        }
      };
      resolveTikTok();
    } else {
      setResolvedTikTok(null);
    }
  }, [currentUrl, parsed?.type, parsed?.isLive, parsed?.isChannel]);

  // If the parsed URL is a YouTube channel, automatically fetch its video list
  useEffect(() => {
    if (parsed && parsed.isChannel && parsed.type === 'youtube') {
      const fetchChannelVideos = async () => {
        setIsLoadingChannel(true);
        try {
          const res = await fetch(`/api/youtube/channel-videos?channel=${encodeURIComponent(currentUrl)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.videos) && data.videos.length > 0) {
              setChannelVideos(data.videos);
            }
          }
        } catch (e) {
          console.warn('Could not fetch channel videos in player:', e);
        } finally {
          setIsLoadingChannel(false);
        }
      };
      fetchChannelVideos();
    }
  }, [currentUrl, parsed?.isChannel, parsed?.type]);

  if (!currentUrl || !parsed) {
    return (
      <div className={`w-full bg-gray-900 rounded-2xl p-8 flex flex-col items-center justify-center text-center text-gray-300 ${className}`}>
        <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
        <p className="text-sm font-semibold">Tautan video atau media tidak valid</p>
        <p className="text-xs text-gray-400 mt-1 max-w-md">
          Pastikan format tautan berasal dari YouTube, TikTok, Instagram, Facebook, Google Drive, atau berkas video MP4.
        </p>
      </div>
    );
  }

  const badgeStyle = getPlatformBadgeStyle(parsed.type);

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenPopout = () => {
    if (typeof window === 'undefined') return;
    const baseUrl = window.location.origin + window.location.pathname;
    const targetV = parsed?.videoId || '';
    const targetUrl = currentUrl || '';
    const targetTitle = currentTitle || '';
    const popoutUrl = `${baseUrl}?popout=true&v=${encodeURIComponent(targetV)}&url=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(targetTitle)}`;
    
    window.open(
      popoutUrl,
      'MadrasahPopoutPlayer',
      'width=480,height=340,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
    );
  };

  const scrollToPlayer = () => {
    setIsMinimized(false);
    setIsDismissedByUser(false);
    if (placeholderRef.current) {
      placeholderRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const isPlayingSubVideo = url !== currentUrl;

  return (
    <>
      {/* Inline Ghost Placeholder when player is in Floating / Minimize Mode */}
      {isMinimized && (
        <div
          ref={placeholderRef}
          className="w-full rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/80 border-2 border-dashed border-emerald-500/50 p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-xl mb-4 transition-all animate-fadeIn"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 mb-3 shadow-lg">
            <Minimize2 className="w-6 h-6 animate-pulse" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-2 border border-emerald-500/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Mode Melayang &amp; Latar Belakang Aktif (PiP)</span>
          </div>
          <h4 className="text-sm sm:text-base font-bold text-white max-w-md line-clamp-1">
            {currentTitle}
          </h4>
          <p className="text-xs text-slate-300 mt-1 max-w-lg">
            Video sedang berjalan di jendela mini di sudut kanan bawah layar. Video akan tetap berputar ketika Anda menjelajahi website ini atau berganti tab di peramban Chrome.
          </p>
          <button
            type="button"
            onClick={scrollToPlayer}
            className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-transform hover:scale-105 cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Kembalikan Tampilan Penuh ke Posisi Ini</span>
          </button>
        </div>
      )}

      {/* Main & Persistent Player Container (DOM stays alive for 100% continuous audio/video playback) */}
      <div
        ref={containerRef}
        className={`transition-all duration-300 ${
          isMinimized
            ? 'fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-50 w-[310px] sm:w-[390px] rounded-2xl overflow-hidden bg-slate-950 border-2 border-emerald-500 shadow-2xl shadow-emerald-950/80 backdrop-blur-xl ring-4 ring-emerald-500/20'
            : `w-full rounded-2xl overflow-hidden bg-gray-950 border border-emerald-900/30 shadow-2xl flex flex-col ${className}`
        }`}
      >
        {/* Player Top Bar */}
        <div className={`bg-gradient-to-r from-[#064e3b] via-[#043327] to-[#022c22] px-3.5 sm:px-4 py-2 flex items-center justify-between border-b border-emerald-800/60 text-white ${isMinimized ? 'py-2' : 'py-2.5'}`}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isPlayingSubVideo && !isMinimized && (
              <button
                type="button"
                onClick={() => {
                  setCurrentUrl(url || '');
                  setCurrentTitle(title);
                }}
                className="p-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-amber-300 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                title="Kembali ke Daftar Video Channel"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Daftar Channel</span>
              </button>
            )}

            {isMinimized ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <h4 className="text-xs font-bold text-emerald-100 truncate">
                  {currentTitle}
                </h4>
              </div>
            ) : (
              <>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeStyle.badgeBg} ${badgeStyle.badgeText} shadow-xs border ${badgeStyle.badgeBorder} shrink-0`}>
                  {parsed.type === 'direct_audio' ? (
                    <Music className="w-3 h-3" />
                  ) : parsed.type === 'youtube' ? (
                    <Play className="w-3 h-3 fill-current" />
                  ) : (
                    <VideoIcon className="w-3 h-3" />
                  )}
                  <span>{parsed.platformName}</span>
                </span>
                <h4 className="text-xs font-bold text-emerald-100 truncate max-w-xs sm:max-w-md">
                  {currentTitle}
                </h4>
              </>
            )}
          </div>

          {/* Quick Player Actions (Minimize, Maximize, Share, External) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {isMinimized ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    backgroundMedia.warmupAudio();
                    backgroundMedia.setVolume(100);
                    backgroundMedia.play();
                  }}
                  className="p-1.5 rounded-lg bg-emerald-500/30 hover:bg-emerald-500 text-emerald-200 hover:text-slate-950 text-xs font-bold flex items-center gap-1 border border-emerald-400/40 transition-all cursor-pointer"
                  title="Nyalakan Suara 100%"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span className="text-[10px]">100%</span>
                </button>
                <button
                  type="button"
                  onClick={scrollToPlayer}
                  className="p-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Perbesar ke Layar Penuh"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="text-[11px] hidden sm:inline">Perbesar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMinimized(false);
                    setIsDismissedByUser(true);
                  }}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-red-600/80 text-white transition-colors cursor-pointer"
                  title="Tutup Mode Melayang"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                {/* Picture-in-Picture / OS Floating Button */}
                <button
                  type="button"
                  onClick={handleSystemPiP}
                  title="Putar Melayang (PiP) di Luar Browser / Di Atas Home Screen & Aplikasi Lain dengan Suara 100%"
                  className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400 text-[11px] font-black flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">PiP (Melayang OS)</span>
                </button>

                {/* Pop-out Separate Window Button (Continuous audio across tabs) */}
                <button
                  type="button"
                  onClick={handleOpenPopout}
                  title="Buka Jendela Pop-Out: Suara & Video Terus Berjalan 100% Saat Anda Berganti Tab!"
                  className="p-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-300 text-[11px] font-black flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Jendela Pop-Out</span>
                </button>

                {/* Minimize to Mini Floating Box */}
                <button
                  type="button"
                  onClick={() => {
                    backgroundMedia.warmupAudio();
                    backgroundMedia.play();
                    backgroundMedia.setVolume(100);
                    setIsMinimized(true);
                    setIsDismissedByUser(false);
                  }}
                  title="Minimize ke Jendela Mini Melayang di Pojok Layar Web"
                  className="p-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Minimize</span>
                </button>

                {showShareControls && (
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    title="Salin Tautan Media"
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-100 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{copied ? 'Tersalin' : 'Bagikan'}</span>
                  </button>
                )}

                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Buka di Sumber Asli"
                  className="p-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-emerald-950 text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Buka Sumber</span>
                </a>
              </>
            )}
          </div>
        </div>

        {/* Main Player Display Area */}
        <div className={`relative w-full bg-black flex items-center justify-center min-h-0`}>
          {/* 1. YOUTUBE & SHORTS */}
          {parsed.type === 'youtube' && (
            <div className="relative w-full">
              {parsed.isChannel && !isMinimized ? (
                <div className="w-full flex flex-col bg-gradient-to-b from-red-950/90 via-black to-zinc-950 p-4 sm:p-6 text-white relative overflow-hidden">
                  <div className="relative z-10 max-w-2xl mx-auto w-full space-y-4">
                    {/* Channel Header Banner */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-slate-900/90 border border-red-900/40 shadow-xl text-center sm:text-left">
                      <div className="w-14 h-14 rounded-2xl bg-red-600/30 border-2 border-red-500 flex items-center justify-center text-red-400 shadow-xl shrink-0">
                        <Tv className="w-7 h-7" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-600/30 border border-red-500/50 text-red-300 text-[11px] font-bold mb-1">
                          <span>🔴 Saluran Resmi YouTube</span>
                        </div>
                        <h3 className="text-base font-bold text-white tracking-wide truncate">
                          {parsed.channelName || title}
                        </h3>
                        <p className="text-xs text-gray-300 mt-0.5">
                          Kumpulan video materi pembelajaran &amp; liputan resmi madrasah.
                        </p>
                      </div>

                      <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                        <a
                          href={parsed.originalUrl.includes('?') ? `${parsed.originalUrl}&sub_confirmation=1` : `${parsed.originalUrl}?sub_confirmation=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>🔔 Subscribe</span>
                        </a>
                        <a
                          href={parsed.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold flex items-center justify-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Buka Channel</span>
                        </a>
                      </div>
                    </div>

                    {/* Channel Videos Interactive Grid / List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Film className="w-3.5 h-3.5 text-red-400" />
                          <span>Pilih Video untuk Diputar Langsung di Web:</span>
                        </h4>
                        {isLoadingChannel && (
                          <span className="text-[10px] text-red-300 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Memuat video...
                          </span>
                        )}
                      </div>

                      {channelVideos.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto p-1 pr-2 custom-scrollbar">
                          {channelVideos.map((vid, idx) => (
                            <div
                              key={vid.id || vid.videoId || idx}
                              onClick={() => {
                                const watchUrl = vid.videoUrl || `https://www.youtube.com/watch?v=${vid.videoId}`;
                                setCurrentUrl(watchUrl);
                                setCurrentTitle(vid.title);
                              }}
                              className="group p-2.5 rounded-xl bg-slate-900/90 hover:bg-red-950/60 border border-slate-800 hover:border-red-500/50 flex items-center gap-3 cursor-pointer transition-all hover:scale-[1.01]"
                            >
                              <div className="w-20 h-13 rounded-lg overflow-hidden bg-slate-950 relative shrink-0 border border-slate-700 group-hover:border-red-500/60">
                                <img
                                  src={vid.thumbnail || vid.thumbnailUrl || `https://img.youtube.com/vi/${vid.videoId}/hqdefault.jpg`}
                                  alt={vid.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  onError={(e: any) => {
                                    e.target.src = 'https://images.unsplash.com/photo-1584697964190-71c4c3b28b7e?auto=format&fit=crop&w=600&q=80';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:bg-red-900/30 transition-all">
                                  <Play className="w-4 h-4 text-white fill-current drop-shadow-md group-hover:scale-110 transition-transform" />
                                </div>
                              </div>

                              <div className="min-w-0 flex-1">
                                <h5 className="text-[11px] font-bold text-white group-hover:text-red-200 line-clamp-2 leading-tight">
                                  {vid.title}
                                </h5>
                                <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400">
                                  {vid.publishedAt && <span>{vid.publishedAt}</span>}
                                  {vid.views && <span>• {vid.views}</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        !isLoadingChannel && (
                          <div className="p-6 text-center bg-slate-900/60 rounded-xl border border-slate-800">
                            <p className="text-xs text-slate-400">
                              Sedang menghubungkan ke server untuk memuat video channel. Klik tombol "Buka Channel" di atas atau muat ulang.
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col">
                  <div className={`w-full ${isMinimized ? 'aspect-video' : 'aspect-16/9'} bg-black`}>
                    <iframe
                      id={iframePlayerId.current}
                      ref={iframeRef}
                      src={(() => {
                        const originParam = typeof window !== 'undefined' && window.location?.origin ? `&origin=${encodeURIComponent(window.location.origin)}` : '';
                        if (parsed.embedUrl.includes('enablejsapi=1')) {
                          return parsed.embedUrl.includes('origin=') ? parsed.embedUrl : `${parsed.embedUrl}${originParam}`;
                        }
                        return `${parsed.embedUrl}${parsed.embedUrl.includes('?') ? '&' : '?'}enablejsapi=1&playsinline=1${originParam}`;
                      })()}
                      title={currentTitle}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                      allowFullScreen
                    />
                  </div>
                  {/* YouTube Action Bar */}
                  {!isMinimized && showShareControls && (
                    <div className="bg-slate-900 px-3 sm:px-4 py-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-white">
                      <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                        {/* Minimize to Mini Floating Box */}
                        <button
                          type="button"
                          onClick={() => {
                            backgroundMedia.warmupAudio();
                            backgroundMedia.play();
                            backgroundMedia.setVolume(100);
                            setIsMinimized(true);
                            setIsDismissedByUser(false);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          title="Minimize video ke pojok layar agar tetap bersuara sambil membaca website"
                        >
                          <Minimize2 className="w-3.5 h-3.5" />
                          <span>Minimize (Melayang)</span>
                        </button>

                        {/* System PiP Button */}
                        <button
                          type="button"
                          onClick={handleSystemPiP}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold text-xs flex items-center gap-1.5 border border-emerald-500/40 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          title="Putar Melayang (PiP) di luar browser / di atas Home Screen"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>PiP (Home Screen)</span>
                        </button>

                        {/* Pop-out Separate Window Button */}
                        <button
                          type="button"
                          onClick={handleOpenPopout}
                          className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-400/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          title="Buka Jendela Melayang Mandiri (Pop-Out) agar suara tetap menyala 100% saat Anda berpindah ke tab lain!"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Jendela Pop-Out</span>
                        </button>

                        {/* Speaker Sound Unmute Action */}
                        <button
                          type="button"
                          onClick={() => {
                            backgroundMedia.setVolume(100);
                            backgroundMedia.play();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          title="Nyalakan Suara Speaker & Maksimalkan Volume 100%"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Suara 100%</span>
                        </button>

                        <a
                          href={parsed.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-transform hover:scale-105 active:scale-95"
                          title="Beri Like & Komentar di YouTube"
                        >
                          <span>👍 Suka</span>
                        </a>
                        <a
                          href={parsed.channelHandle ? `https://www.youtube.com/${parsed.channelHandle}?sub_confirmation=1` : 'https://www.youtube.com/@jaenalmaskunofficial3977?sub_confirmation=1'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 border border-white/20 transition-all hover:scale-105 active:scale-95"
                          title="Berlangganan / Subscribe Channel Resmi"
                        >
                          <span>🔔 Subscribe</span>
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Yuk tonton video materi "${currentTitle}": ${currentUrl}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
                          title="Bagikan ke WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. TIKTOK VIDEO & SIARAN LANGSUNG */}
          {parsed.type === 'tiktok' && (
            <div className={`w-full ${isMinimized ? 'py-0' : 'py-4'} flex flex-col items-center justify-center bg-black/95 ${isMinimized ? 'px-0' : 'px-3 sm:px-4'}`}>
              {parsed.isLive && !isMinimized ? (
                <div className="w-full max-w-[440px] p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-black to-zinc-950 border border-cyan-500/50 shadow-2xl flex flex-col items-center text-center space-y-4 text-white">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 shadow-xl">
                      <Radio className="w-8 h-8 text-cyan-400 animate-pulse" />
                    </div>
                    <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-wider animate-bounce shadow">
                      LIVE
                    </span>
                  </div>
                  <div>
                    <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-extrabold flex items-center justify-center gap-1.5 mx-auto w-fit">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      Siaran Langsung TikTok
                    </span>
                    <h4 className="text-lg font-bold text-white mt-2">
                      {parsed.channelName || title || 'Siaran Langsung Ust. Jaenal Maskun'}
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Tonton siaran langsung dakwah, tanya jawab fikih, dan inspirasi santri di TikTok
                    </p>
                  </div>
                  <div className="w-full space-y-2 pt-2">
                    <a
                      href={parsed.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-pink-500 hover:opacity-95 text-slate-950 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 transition-all hover:scale-[1.02]"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-950" />
                      <span>Buka Siaran Langsung di TikTok</span>
                    </a>
                  </div>
                </div>
              ) : parsed.isChannel && !isMinimized ? (
                <div className="w-full max-w-[420px] p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-black to-zinc-950 border border-cyan-500/40 shadow-2xl flex flex-col items-center text-center space-y-3.5 text-white">
                  <div className="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 shadow-xl">
                    <VideoIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold">
                      🎵 Akun Siaran Resmi TikTok
                    </span>
                    <h4 className="text-lg font-bold text-white mt-2">
                      {parsed.channelName || title}
                    </h4>
                  </div>
                  <div className="w-full space-y-2 pt-1">
                    <a
                      href={parsed.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-pink-500 hover:opacity-95 text-slate-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02]"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Buka &amp; Follow di TikTok</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className={`w-full ${isMinimized ? 'w-full' : 'max-w-[380px] sm:max-w-[420px]'} rounded-2xl overflow-hidden bg-slate-950 border border-cyan-500/40 shadow-2xl flex flex-col text-white mx-auto`}>
                  <div className={`relative w-full ${isMinimized ? 'aspect-video' : 'aspect-[9/16] min-h-[480px] sm:min-h-[540px]'} bg-black overflow-hidden flex items-center justify-center`}>
                    {tiktokViewMode === 'embed' && (resolvedTikTok?.embedUrl || (parsed.videoId && parsed.videoId !== 'video')) ? (
                      <iframe
                        src={resolvedTikTok?.embedUrl || (parsed.videoId ? `https://www.tiktok.com/embed/v2/${parsed.videoId}` : parsed.embedUrl)}
                        title={currentTitle}
                        className="w-full h-full border-0 rounded-2xl bg-black"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        scrolling="no"
                      />
                    ) : (
                      <div className="relative w-full h-full bg-black overflow-hidden group flex flex-col justify-between p-6 text-center">
                        <img
                          src={parsed.thumbnailUrl || 'https://images.unsplash.com/photo-1584697964190-71c4c3b28b7e?auto=format&fit=crop&w=600&q=80'}
                          alt={title}
                          referrerPolicy="no-referrer"
                          className="absolute inset-0 w-full h-full object-cover opacity-40 blur-xs"
                        />
                        <div className="relative z-10 my-auto space-y-4">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 to-pink-500 p-1 mx-auto shadow-2xl animate-bounce">
                            <a
                              href={parsed.originalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-cyan-300 hover:scale-105 transition-transform"
                            >
                              <Play className="w-8 h-8 fill-current ml-0.5 text-white" />
                            </a>
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-white line-clamp-2">
                            {currentTitle}
                          </h4>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. INSTAGRAM REELS & POSTS */}
          {parsed.type === 'instagram' && (
            <div className={`w-full ${isMinimized ? 'py-0 px-0' : 'py-4 px-4'} flex flex-col items-center justify-center bg-black/90`}>
              <div className={`w-full ${isMinimized ? 'aspect-video' : 'max-w-[440px] aspect-[4/5] sm:aspect-[9/16] min-h-[440px] sm:min-h-[500px]'} bg-black rounded-2xl overflow-hidden border border-pink-500/30 shadow-2xl relative`}>
                <iframe
                  src={parsed.embedUrl}
                  title={title}
                  className="w-full h-full border-0"
                  allow="encrypted-media"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* 4. FACEBOOK VIDEO */}
          {parsed.type === 'facebook' && (
            <div className={`relative w-full ${isMinimized ? 'aspect-video' : 'aspect-16/9 max-h-[550px]'}`}>
              <iframe
                src={parsed.embedUrl}
                title={title}
                className="w-full h-full border-0"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          )}

          {/* 5. GOOGLE DRIVE VIDEO */}
          {parsed.type === 'google_drive' && (
            <div className={`relative w-full ${isMinimized ? 'aspect-video' : 'aspect-16/9 max-h-[550px]'}`}>
              <iframe
                src={parsed.embedUrl}
                title={title}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            </div>
          )}

          {/* 6. VIMEO */}
          {parsed.type === 'vimeo' && (
            <div className={`relative w-full ${isMinimized ? 'aspect-video' : 'aspect-16/9'}`}>
              <iframe
                src={parsed.embedUrl}
                title={title}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* 7. DIRECT VIDEO (.MP4, .WEBM, .MOV, .MKV, .AVI, ETC.) */}
          {parsed.type === 'direct_video' && (
            <div className={`relative w-full ${isMinimized ? 'aspect-video' : 'max-h-[560px] min-h-[240px]'} flex items-center justify-center bg-black overflow-hidden group`}>
              <video
                key={`${parsed.embedUrl}-${directVideoKey}`}
                ref={directVideoRef}
                src={parsed.embedUrl}
                controls
                playsInline
                preload="metadata"
                poster={parsed.thumbnailUrl || undefined}
                className="w-full max-h-[560px] object-contain"
                onLoadedMetadata={() => {
                  setIsDirectVideoLoading(false);
                  setDirectVideoError(false);
                }}
                onPlay={() => {
                  setIsDirectVideoPlaying(true);
                  setDirectVideoError(false);
                  backgroundMedia.play();
                }}
                onPause={() => {
                  setIsDirectVideoPlaying(false);
                  backgroundMedia.pause();
                }}
                onWaiting={() => setIsDirectVideoLoading(true)}
                onPlaying={() => {
                  setIsDirectVideoLoading(false);
                  setIsDirectVideoPlaying(true);
                  setDirectVideoError(false);
                }}
                onCanPlay={() => {
                  setIsDirectVideoLoading(false);
                  setDirectVideoError(false);
                }}
                onError={(e) => {
                  console.warn('Video element playback error:', e);
                  setDirectVideoError(true);
                  setIsDirectVideoLoading(false);
                }}
              >
                Browser Anda tidak mendukung pemutaran video secara langsung.
              </video>

              {/* Big Tap to Play Overlay if paused or autoplay was blocked */}
              {!isDirectVideoPlaying && !directVideoError && (
                <div
                  onClick={() => {
                    if (directVideoRef.current) {
                      directVideoRef.current.play().then(() => {
                        setIsDirectVideoPlaying(true);
                        setDirectVideoError(false);
                      }).catch((err) => {
                        console.warn('Playback error on click:', err);
                      });
                    }
                  }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 hover:bg-black/30 transition-colors cursor-pointer z-10"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-600/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-emerald-500 transition-transform mb-3">
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
                  </div>
                  <span className="bg-black/75 backdrop-blur-xs text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md">
                    Ketuk untuk Memutar Video
                  </span>
                </div>
              )}

              {/* Error / Autoplay Block Recovery Banner */}
              {directVideoError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/95 text-white p-4 text-center z-20 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400">
                    <AlertCircle className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="max-w-xs space-y-1">
                    <p className="text-sm font-bold text-white">Berkas Video Belum Tersedia di Server</p>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Berkas fisik video di server hosting belum terunggah sempurna (404) atau tautan video belum aktif.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        setDirectVideoError(false);
                        setDirectVideoKey((k) => k + 1);
                        setTimeout(() => {
                          directVideoRef.current?.play().then(() => {
                            setIsDirectVideoPlaying(true);
                            setDirectVideoError(false);
                          }).catch(() => {});
                        }, 150);
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Coba Putar Lagi</span>
                    </button>
                    <a
                      href={parsed.embedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-amber-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Buka URL Berkas</span>
                    </a>
                    <button
                      onClick={() => {
                        setIsMinimized(false);
                        setIsDismissedByUser(true);
                      }}
                      className="px-3 py-2 bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>Tutup</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 8. DIRECT AUDIO (.MP3, .WAV, PODCAST) */}
          {parsed.type === 'direct_audio' && (
            <div className="w-full p-6 sm:p-8 flex flex-col items-center justify-center bg-gradient-to-br from-purple-950 via-slate-950 to-emerald-950 text-white space-y-3">
              <div className="w-14 h-14 rounded-full bg-purple-600/30 border-2 border-purple-400 flex items-center justify-center text-purple-300 animate-pulse shadow-lg">
                <Music className="w-7 h-7" />
              </div>
              <div className="text-center">
                <h5 className="text-xs sm:text-sm font-bold text-white tracking-wide">{title}</h5>
                <span className="text-[11px] text-purple-200/80 font-medium">Pemutar Audio Kajian / Podcast Madrasah</span>
              </div>
              <div className="w-full max-w-md">
                <audio
                  ref={directAudioRef}
                  src={parsed.embedUrl}
                  controls
                  autoPlay={autoPlay}
                  className="w-full rounded-xl shadow-md"
                >
                  Browser Anda tidak mendukung pemutar audio.
                </audio>
              </div>
            </div>
          )}

          {/* 9. FALLBACK UNKNOWN WEB URL */}
          {parsed.type === 'unknown' && (
            <div className="w-full p-8 flex flex-col items-center justify-center bg-gray-900 text-white text-center space-y-3">
              <VideoIcon className="w-12 h-12 text-emerald-400" />
              <h5 className="text-sm font-bold text-white">{title}</h5>
              <div className="relative w-full aspect-16/9 max-w-2xl bg-black rounded-xl overflow-hidden border border-gray-800">
                <iframe
                  src={parsed.embedUrl}
                  title={title}
                  className="w-full h-full border-0"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </div>

        {/* Media Player Footer Info & Background Mode Controls */}
        <div className={`px-3 sm:px-4 py-2 bg-gray-900/95 border-t border-gray-800 text-[11px] text-gray-400 flex flex-wrap items-center justify-between gap-2`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
              <Headphones className="w-3.5 h-3.5" />
              <span>Putar Latar Belakang Aktif</span>
            </span>
            <span className="hidden sm:inline text-gray-500">•</span>
            <button
              type="button"
              onClick={toggleAutoMinimizeOnScroll}
              className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700 hover:border-emerald-500 transition-colors cursor-pointer"
              title="Otomatis minimize video ke sudut layar saat halaman digulir"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoMinimizeOnScroll ? 'bg-emerald-400' : 'bg-gray-500'}`} />
              <span>Auto-Minimize saat Scroll: <strong>{autoMinimizeOnScroll ? 'ON' : 'OFF'}</strong></span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isMinimized && (
              <button
                type="button"
                onClick={() => {
                  setIsMinimized(true);
                  setIsDismissedByUser(false);
                }}
                className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer flex items-center gap-1 text-[11px]"
              >
                <Minimize2 className="w-3 h-3" />
                <span>Mode Melayang</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyLink}
              className="text-slate-400 hover:text-slate-200 font-semibold cursor-pointer flex items-center gap-1 text-[11px]"
            >
              {copied ? '✓ Tersalin!' : 'Salin URL'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

