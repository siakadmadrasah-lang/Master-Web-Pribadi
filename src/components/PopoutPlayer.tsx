import React, { useEffect, useState, useRef } from 'react';
import { Volume2, ExternalLink, X, Smartphone, Sparkles, Tv, Play } from 'lucide-react';
import { parseVideoUrl } from '../utils/videoHelpers';

export const PopoutPlayer: React.FC = () => {
  const [params, setParams] = useState<{
    videoId: string;
    videoUrl: string;
    title: string;
    platform: string;
  }>({
    videoId: '',
    videoUrl: '',
    title: 'Media Digital Madrasah',
    platform: 'YouTube'
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const v = searchParams.get('v') || '';
      const url = searchParams.get('url') || (v ? `https://www.youtube.com/watch?v=${v}` : '');
      const t = searchParams.get('title') || 'Media Pembelajaran & Dokumentasi';
      const p = searchParams.get('platform') || 'YouTube';

      setParams({
        videoId: v,
        videoUrl: url,
        title: t,
        platform: p
      });

      document.title = `▶ ${t} | Mini Player`;
    }
  }, []);

  const parsed = parseVideoUrl(params.videoUrl || (params.videoId ? `https://www.youtube.com/watch?v=${params.videoId}` : ''));
  const embedUrl = parsed?.embedUrl || (params.videoId ? `https://www.youtube-nocookie.com/embed/${params.videoId}?autoplay=1&playsinline=1&enablejsapi=1` : '');

  return (
    <div className="w-screen h-screen bg-slate-950 text-white flex flex-col overflow-hidden font-sans select-none">
      {/* Header Bar */}
      <div className="h-10 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <h1 className="text-xs font-bold text-slate-100 truncate max-w-[280px]">
            {params.title}
          </h1>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={params.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Buka di Tab Baru"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={() => window.close()}
            className="p-1 rounded-md bg-red-950/60 hover:bg-red-600 text-red-300 hover:text-white transition-colors"
            title="Tutup Jendela Melayang"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Video Viewport */}
      <div className="flex-1 w-full bg-black relative flex items-center justify-center min-h-0">
        {embedUrl ? (
          <iframe
            src={embedUrl.includes('?') ? `${embedUrl}&autoplay=1&playsinline=1` : `${embedUrl}?autoplay=1&playsinline=1`}
            title={params.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
          />
        ) : (
          <div className="p-4 text-center">
            <p className="text-xs text-slate-400">Tidak ada media yang dipilih.</p>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="h-7 bg-slate-900/90 border-t border-slate-800 px-3 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
        <span className="text-emerald-400 font-semibold flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Jendela Melayang Aktif (Suara Terus Menyala)
        </span>
        <span>Ust. Jaenal Maskun</span>
      </div>
    </div>
  );
};
