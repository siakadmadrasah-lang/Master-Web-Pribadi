import React, { useState } from 'react';
import { Sparkles, Camera, Video, Play, X, ExternalLink, Share2, Check, Film, ChevronDown, ChevronUp, Smartphone } from 'lucide-react';
import { galleryList } from '../data/personalData';
import { GalleryItem } from '../types';
import { parseVideoUrl, getPlatformBadgeStyle } from '../utils/videoHelpers';
import { UniversalMediaPlayer } from './UniversalMediaPlayer';

interface GallerySectionProps {
  gallery?: GalleryItem[];
}

export const GallerySection: React.FC<GallerySectionProps> = ({
  gallery = galleryList,
}) => {
  const [activeGalleryItem, setActiveGalleryItem] = useState<GalleryItem | null>(null);
  const [activeVideoItem, setActiveVideoItem] = useState<GalleryItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'video' | 'photo'>('all');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyVideoUrl = (url: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const videoCount = gallery.filter((item) => item.videoUrl && item.videoUrl.trim()).length;
  const photoCount = gallery.filter((item) => !item.videoUrl || !item.videoUrl.trim()).length;

  const filteredGallery = gallery.filter((item) => {
    const isVideo = Boolean(item.videoUrl && item.videoUrl.trim());
    if (activeFilter === 'video') return isVideo;
    if (activeFilter === 'photo') return !isVideo;
    return true;
  });

  const INITIAL_GALLERY_LIMIT = 6;
  const displayedGallery = isExpanded
    ? filteredGallery
    : filteredGallery.slice(0, INITIAL_GALLERY_LIMIT);

  return (
    <section id="galeri" className="py-16 md:py-24 bg-[#faf8f5] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <Camera className="w-3.5 h-3.5 text-emerald-700" />
            <span>Dokumentasi Kegiatan & Pengabdian</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#064e3b] tracking-tight font-serif">
            Potret Aktivitas, Pembelajaran & Momen Madrasah
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-600 font-light">
            Kumpulan potret kilas balik pembelajaran santri, kegiatan ekstrakurikuler, pembinaan adab, dan dokumentasi pengabdian di lingkungan madrasah.
          </p>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-emerald-50'
              }`}
            >
              Semua Foto & Video ({gallery.length})
            </button>

            <button
              onClick={() => setActiveFilter('photo')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeFilter === 'photo'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-emerald-50'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              <span>Foto Kegiatan ({photoCount})</span>
            </button>

            {videoCount > 0 && (
              <button
                onClick={() => setActiveFilter('video')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeFilter === 'video'
                    ? 'bg-emerald-900 text-amber-300 shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-emerald-50'
                }`}
              >
                <Video className="w-3.5 h-3.5 text-emerald-700" />
                <span>Liputan Video ({videoCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Gallery Grid */}
        {filteredGallery.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-gray-200 max-w-md mx-auto shadow-xs">
            <Camera className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 font-medium text-sm">Belum ada item foto atau video pada kategori ini.</p>
          </div>
        ) : (
          <>
            <div className={`grid gap-6 ${isExpanded ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto'}`}>
              {displayedGallery.map((item) => {
                const isVideo = Boolean(item.videoUrl && item.videoUrl.trim());
                const parsedVideo = isVideo ? parseVideoUrl(item.videoUrl) : null;
                const platformBadgeStyle = parsedVideo ? getPlatformBadgeStyle(parsedVideo.type) : null;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isVideo) {
                        setActiveVideoItem(item);
                      } else {
                        setActiveGalleryItem(item);
                      }
                    }}
                    className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col cursor-pointer"
                  >
                    {/* Media Thumbnail Container */}
                    <div className="relative aspect-4/3 overflow-hidden bg-gray-100">
                      {(() => {
                        const fallbackMediaImage = isVideo
                          ? (parsedVideo?.thumbnailUrl || 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=800')
                          : 'https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&q=80&w=800';
                        return (
                          <img
                            src={item.image || fallbackMediaImage}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = fallbackMediaImage;
                            }}
                          />
                        );
                      })()}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                        <p className="text-white text-xs line-clamp-2 leading-tight">
                          {item.description}
                        </p>
                      </div>

                      {/* Video Play Overlay Button */}
                      {isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/40 transition-colors">
                          <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-red-600 transition-all duration-300">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="bg-[#064e3b]/90 backdrop-blur-xs text-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                          {item.category}
                        </span>

                        {isVideo && parsedVideo && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 ${
                              platformBadgeStyle?.badgeBg || 'bg-red-700'
                            } text-white`}
                          >
                            <Film className="w-2.5 h-2.5" />
                            <span>{parsedVideo.platformName || parsedVideo.type}</span>
                          </span>
                        )}

                        {isVideo && parsedVideo?.type === 'direct_video' && (
                          <span className="bg-teal-950/90 text-teal-200 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 border border-teal-500/30">
                            <Smartphone className="w-2.5 h-2.5 text-teal-300" />
                            <span>Kapsul Ajaib HP</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <h3 className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-emerald-800 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {item.description}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-emerald-800 font-semibold">
                        <span>{isVideo ? 'Putar Video' : 'Lihat Foto'}</span>
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tombol Expand / Collapse Gallery */}
            {filteredGallery.length > INITIAL_GALLERY_LIMIT && (
              <div className="mt-12 text-center">
                <button
                  type="button"
                  id="btn-toggle-expand-gallery"
                  onClick={() => {
                    setIsExpanded(!isExpanded);
                    if (isExpanded) {
                      const el = document.getElementById('galeri');
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }
                  }}
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-white hover:bg-emerald-900 text-emerald-900 hover:text-amber-300 border-2 border-emerald-900/20 hover:border-emerald-900 font-bold text-xs sm:text-sm shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer active:scale-95 group"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4 text-emerald-700 group-hover:text-amber-300 transition-transform" />
                      <span>Tampilkan Lebih Ringkas (Sembunyikan Galeri Lainnya)</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 text-emerald-700 group-hover:text-amber-300 animate-bounce" />
                      <span>Buka Seluruh Dokumentasi & Foto ({filteredGallery.length} Item)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 group-hover:bg-emerald-950 text-emerald-900 group-hover:text-amber-300 font-bold">
                        +{filteredGallery.length - INITIAL_GALLERY_LIMIT} Lainnya
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 🎬 MODAL PEMUTAR MULTIMEDIA (YouTube, TikTok, Instagram, FB, Drive, MP4) */}
      {/* ========================================================================= */}
      {activeVideoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl relative flex flex-col border border-emerald-900/20 max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-[#064e3b] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-600 text-white">
                  <Play className="w-4 h-4 fill-current" />
                </span>
                <div>
                  <span className="text-xs uppercase tracking-wider text-amber-300 font-semibold">
                    Pemutar Media & Liputan Madrasah
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1">
                    {activeVideoItem.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setActiveVideoItem(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Tutup Pemutar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Universal Media Player */}
            <div className="w-full bg-black overflow-y-auto max-h-[60vh]">
              <UniversalMediaPlayer
                url={activeVideoItem.videoUrl}
                title={activeVideoItem.title}
                autoPlay={true}
                showShareControls={true}
              />
            </div>

            {/* Modal Body & Action Bar */}
            <div className="p-4 sm:p-6 bg-white flex-1 overflow-y-auto border-t border-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  {activeVideoItem.category}
                </span>

                <div className="flex items-center gap-2">
                  {activeVideoItem.videoUrl && (
                    <>
                      <button
                        onClick={() => handleCopyVideoUrl(activeVideoItem.videoUrl!)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Salin Tautan"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-gray-500" />}
                        <span>{copiedLink ? 'Tersalin!' : 'Bagikan Link'}</span>
                      </button>

                      <a
                        href={activeVideoItem.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka Sumber Asli</span>
                      </a>
                    </>
                  )}
                </div>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-1">
                {activeVideoItem.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
                {activeVideoItem.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📷 MODAL ZOOM FOTO */}
      {/* ========================================================================= */}
      {activeGalleryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl relative border border-emerald-900/20">
            <button
              onClick={() => setActiveGalleryItem(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/85 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={activeGalleryItem.image}
              alt={activeGalleryItem.title}
              referrerPolicy="no-referrer"
              className="w-full max-h-[60vh] object-cover"
            />

            <div className="p-6">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded">
                {activeGalleryItem.category}
              </span>
              <h3 className="text-lg font-bold text-gray-900 mt-2">
                {activeGalleryItem.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {activeGalleryItem.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
