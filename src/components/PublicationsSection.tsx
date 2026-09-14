import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  FileText,
  Search,
  Download,
  ExternalLink,
  Tag,
  Sparkles,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  Share2,
  Check,
  Copy,
  Video,
  Play,
  Film,
  MessageCircle,
  Send,
  Globe
} from 'lucide-react';
import { publicationsList } from '../data/personalData';
import { Publication } from '../types';
import { UniversalMediaPlayer } from './UniversalMediaPlayer';
import { parseVideoUrl, getPlatformBadgeStyle } from '../utils/videoHelpers';

interface PublicationsSectionProps {
  publications?: Publication[];
  authorName?: string;
}

export const PublicationsSection: React.FC<PublicationsSectionProps> = ({
  publications = publicationsList,
  authorName = 'Ust. Jaenal Maskun, S.Pd.I., M.Pd.'
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalPub, setActiveModalPub] = useState<Publication | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const categories = ['Semua', 'Buku', 'Jurnal & Riset', 'Modul Pembelajaran', 'Opini & Artikel'];

  // Only show active publications on public section
  const activePublications = publications.filter((item) => item.isActive !== false);

  const filteredPublications = activePublications.filter((item) => {
    const matchesCategory = selectedCategory === 'Semua' || item.category === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tags && item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  // Limit items shown initially on Beranda to 2 items so page is concise and compact
  const INITIAL_LIMIT = 2;
  const displayedPublications = isExpanded || filteredPublications.length <= INITIAL_LIMIT
    ? filteredPublications
    : filteredPublications.slice(0, INITIAL_LIMIT);

  // Helper to generate absolute shareable link for a specific module
  const getModuleShareUrl = useCallback((pubId: string) => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?modul=${encodeURIComponent(pubId)}#karya`;
  }, []);

  // Open publication modal and sync URL query parameter
  const handleOpenPub = useCallback((pub: Publication) => {
    setActiveModalPub(pub);
    if (typeof window !== 'undefined' && window.history) {
      const newUrl = `${window.location.pathname}?modul=${encodeURIComponent(pub.id)}#karya`;
      window.history.pushState({ pubId: pub.id }, '', newUrl);
    }
  }, []);

  // Close publication modal and restore clean URL
  const handleClosePub = useCallback(() => {
    setActiveModalPub(null);
    if (typeof window !== 'undefined' && window.history) {
      const cleanUrl = `${window.location.pathname}#karya`;
      window.history.pushState({}, '', cleanUrl);
    }
  }, []);

  // Handle URL deep-linking on initial load or popstate
  useEffect(() => {
    const handleUrlCheck = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const modulParam = params.get('modul') || params.get('karya') || params.get('module') || params.get('pub');
      const hash = window.location.hash;

      let targetId = modulParam;
      if (!targetId && hash.startsWith('#karya-')) {
        targetId = hash.replace('#karya-', '');
      } else if (!targetId && hash.startsWith('#modul-')) {
        targetId = hash.replace('#modul-', '');
      }

      if (targetId) {
        const found = activePublications.find(
          (p) => p.id.toLowerCase() === targetId!.toLowerCase() || p.title.toLowerCase().includes(targetId!.toLowerCase())
        );
        if (found) {
          setIsExpanded(true);
          setActiveModalPub(found);
          // Scroll to #karya gently
          setTimeout(() => {
            const el = document.getElementById('karya');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 300);
        }
      }
    };

    handleUrlCheck();
    window.addEventListener('popstate', handleUrlCheck);
    return () => window.removeEventListener('popstate', handleUrlCheck);
  }, [activePublications]);

  // Copy link to clipboard with feedback
  const handleCopyLink = (pub: Publication) => {
    const url = getModuleShareUrl(pub.id);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(pub.id);
      setShareToast(`Tautan modul "${pub.title.slice(0, 24)}..." berhasil disalin!`);
      setTimeout(() => {
        setCopiedId(null);
        setShareToast(null);
      }, 3000);
    }
  };

  // WhatsApp Share with comprehensive formatted text
  const handleShareWhatsApp = (pub: Publication) => {
    const url = getModuleShareUrl(pub.id);
    const message = 
`📚 *MODUL & KARYA TULIS MADRASAH*
━━━━━━━━━━━━━━━━━━━━
*Judul:* ${pub.title}
*Penulis:* ${authorName}
*Kategori:* ${pub.category} (${pub.year})
*Penerbit/Afiliasi:* ${pub.publisher}

📖 *Ikhtisar Singkat:*
"${pub.description.slice(0, 200)}..."

🔗 *Buka & Pelajari Modul Lengkap di tautan resmi:*
${url}`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Telegram Share
  const handleShareTelegram = (pub: Publication) => {
    const url = getModuleShareUrl(pub.id);
    const text = `📚 Modul Pembelajaran: ${pub.title} oleh ${authorName}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  // Facebook Share
  const handleShareFacebook = (pub: Publication) => {
    const url = getModuleShareUrl(pub.id);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  // Twitter / X Share
  const handleShareTwitter = (pub: Publication) => {
    const url = getModuleShareUrl(pub.id);
    const text = `Karya & Modul Ajar: ${pub.title} oleh ${authorName}`;
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  // Native Web Share API
  const handleNativeShare = async (pub: Publication) => {
    const url = getModuleShareUrl(pub.id);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: pub.title,
          text: `Karya & Modul Pembelajaran oleh ${authorName}: ${pub.title}`,
          url: url
        });
      } catch {
        // Fallback to copy link if user canceled or rejected
        handleCopyLink(pub);
      }
    } else {
      handleCopyLink(pub);
    }
  };

  const handleDownloadSample = (pub: Publication) => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);

    const shareUrl = getModuleShareUrl(pub.id);
    const sampleContent = `
SAMPEL MATERI & SILABUS KARYA
=====================================================
Judul     : ${pub.title}
Kategori  : ${pub.category}
Penerbit  : ${pub.publisher} (${pub.year})
Penulis   : ${authorName}
Tautan Modul: ${shareUrl}

DESKRIPSI KARYA:
${pub.description}

KATA KUNCI:
${(pub.tags || []).join(', ')}

=====================================================
Hak Cipta Dilindungi Undang-Undang.
Untuk akses modul lengkap, silakan hubungi jaenalmaskun.ai@gmail.com
    `.trim();

    const blob = new Blob([sampleContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sampel-${pub.title.slice(0, 30)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="karya" className="py-16 md:py-24 bg-[#faf8f5] relative">
      {/* Toast Notification */}
      {shareToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#064e3b] text-amber-300 px-5 py-3 rounded-2xl shadow-2xl border border-amber-400/40 flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-white">{shareToast}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-3">
              <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
              <span>Khazanah Keilmuan & Literasi</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#064e3b] tracking-tight">
              Karya Tulis, Buku & Modul Ajar Madrasah
            </h2>
            <p className="mt-2 text-sm sm:text-base text-gray-600 font-light">
              Kumpulan referensi pedagogi, buku ajar karakter santri, jurnal riset, dan panduan kurikulum terpadu yang dapat dibaca, dibagikan per modul, dan dipelajari.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              id="search-publication-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul, topik, materi..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent shadow-2xs"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 px-1 sm:px-0 sm:flex-wrap mb-8 no-scrollbar -mx-4 sm:mx-0 snap-x" id="category-tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              id={`cat-filter-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 snap-start whitespace-nowrap px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer active:scale-95 ${
                selectedCategory === cat
                  ? 'bg-emerald-900 text-amber-300 ring-2 ring-emerald-600 shadow-md font-bold scale-[1.02]'
                  : 'bg-white text-gray-700 border border-emerald-900/10 hover:border-emerald-700/30 hover:bg-emerald-50 hover:text-emerald-950'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Publications Grid */}
        {filteredPublications.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700">Karya tidak ditemukan</h3>
            <p className="text-xs text-gray-500 mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
          </div>
        ) : (
          <>
            <div className={`grid grid-cols-1 md:grid-cols-2 ${displayedPublications.length > 2 ? 'lg:grid-cols-3 max-w-7xl' : 'max-w-4xl'} gap-6 mx-auto`}>
              {displayedPublications.map((pub) => {
                const isVideo = Boolean(pub.videoUrl);
                const parsedVideo = isVideo ? parseVideoUrl(pub.videoUrl) : null;
                const badgeStyle = parsedVideo ? getPlatformBadgeStyle(parsedVideo.type) : null;

                return (
                  <div
                    key={pub.id}
                    id={`pub-card-${pub.id}`}
                    className="bg-white rounded-2xl border border-emerald-900/10 p-6 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all duration-300 group hover:border-amber-400/60 relative"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                          {pub.category}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isVideo && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md text-white flex items-center gap-1 shadow-xs ${badgeStyle?.badgeBg || 'bg-red-600'}`}>
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>{parsedVideo?.platformName || 'Media'}</span>
                            </span>
                          )}
                          <span className="text-xs text-gray-400 font-mono">
                            {pub.year}
                          </span>
                        </div>
                      </div>

                      <h3
                        onClick={() => handleOpenPub(pub)}
                        className="text-base sm:text-lg font-bold text-gray-900 leading-snug group-hover:text-emerald-800 transition-colors cursor-pointer"
                      >
                        {pub.title}
                      </h3>

                      <p className="text-xs text-emerald-700 font-medium mt-1">
                        {pub.publisher}
                      </p>

                      <p className="text-xs sm:text-sm text-gray-600 mt-3 line-clamp-3 font-light leading-relaxed">
                        {pub.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {pub.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-50">
                        <div className="flex items-center gap-2">
                          <button
                            id={`btn-detail-${pub.id}`}
                            onClick={() => handleOpenPub(pub)}
                            className="text-xs font-bold text-emerald-900 hover:text-emerald-700 flex items-center gap-1.5 py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                            title="Buka detail modul & putar media"
                          >
                            <span>Buka Modul</span>
                            <ExternalLink className="w-3 h-3 text-emerald-700" />
                          </button>

                          <button
                            type="button"
                            id={`btn-share-${pub.id}`}
                            onClick={() => handleCopyLink(pub)}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Salin tautan modul langsung untuk dikirim"
                          >
                            {copiedId === pub.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Share2 className="w-3.5 h-3.5 text-gray-500" />
                            )}
                          </button>
                        </div>

                        <button
                          id={`btn-download-${pub.id}`}
                          onClick={() => handleDownloadSample(pub)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Sampel</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expand / Collapse Button when more than 2 items exist */}
            {filteredPublications.length > INITIAL_LIMIT && (
              <div className="mt-10 text-center">
                <button
                  id="btn-toggle-publications"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-emerald-800/20 text-emerald-900 font-bold text-xs sm:text-sm hover:bg-emerald-50 hover:border-emerald-800/40 shadow-2xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  {isExpanded ? (
                    <>
                      <span>Tampilkan Lebih Ringkas</span>
                      <ChevronUp className="w-4 h-4 text-emerald-700" />
                    </>
                  ) : (
                    <>
                      <span>Lihat Semua Karya Tulis ({filteredPublications.length})</span>
                      <ChevronDown className="w-4 h-4 text-emerald-700" />
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 📖 MODAL DETAIL MODAL & BAGIKAN LINK MODAL LANGSUNG */}
      {/* ========================================================================= */}
      {activeModalPub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-emerald-900/20 shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#064e3b] via-[#043327] to-[#022c22] text-white px-5 sm:px-7 py-4 flex items-center justify-between border-b border-emerald-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-2 rounded-xl bg-amber-400 text-emerald-950 shadow-sm shrink-0">
                  <BookOpen className="w-4 h-4 font-bold" />
                </span>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-amber-300 font-bold">
                    Khazanah Karya & Modul Madrasah
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1">
                    {activeModalPub.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={handleClosePub}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0 ml-2"
                title="Tutup Jendela Modul"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1 bg-white">
              {/* Category & Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-300">
                    {activeModalPub.category}
                  </span>
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full">
                    Tahun {activeModalPub.year}
                  </span>
                </div>
                <span className="text-xs font-mono text-gray-400">
                  ID: #{activeModalPub.id}
                </span>
              </div>

              {/* Title & Publisher */}
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#064e3b] leading-snug">
                  {activeModalPub.title}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-emerald-700 mt-1">
                  Penerbit / Afiliasi: <span className="text-gray-800 font-medium">{activeModalPub.publisher}</span> • Penulis: <span className="text-gray-800 font-medium">{authorName}</span>
                </p>
              </div>

              {/* Universal Media Player (YouTube, TikTok, Instagram Reels, FB, Drive, MP4) if attached */}
              {activeModalPub.videoUrl && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    <Film className="w-3.5 h-3.5 text-red-600" />
                    <span>Media Pendukung / Video Bedah Modul:</span>
                  </div>
                  <UniversalMediaPlayer
                    url={activeModalPub.videoUrl}
                    title={activeModalPub.title}
                    autoPlay={false}
                    showShareControls={true}
                  />
                </div>
              )}

              {/* Synopsis & Material Scope */}
              <div className="p-4 sm:p-5 bg-[#faf8f5] rounded-2xl border border-emerald-900/10 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#064e3b] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Ikhtisar Materi & Ruang Lingkup:</span>
                </h4>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-light whitespace-pre-line">
                  {activeModalPub.description}
                </p>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Topik & Kata Kunci:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {activeModalPub.tags.map((t, idx) => (
                    <span key={idx} className="text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 px-3 py-1 rounded-full font-medium">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* ========================================================= */}
              {/* 🔗 DEDICATED SHAREABLE URL & SEND MODULE CONTROLS */}
              {/* ========================================================= */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950 via-[#064e3b] to-emerald-900 text-white space-y-4 border border-emerald-700/60 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-amber-300" />
                    <h5 className="text-xs sm:text-sm font-bold text-amber-300 uppercase tracking-wider">
                      Bagikan & Kirim Link Modul Ini
                    </h5>
                  </div>
                  <span className="text-[10px] bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-700 font-mono">
                    URL Unik Modul
                  </span>
                </div>

                {/* Direct Permalink Box with One-Click Copy */}
                <div className="flex items-center gap-2 bg-emerald-950/80 p-1.5 sm:p-2 rounded-xl border border-emerald-700/80">
                  <Globe className="w-4 h-4 text-amber-300 shrink-0 ml-2" />
                  <input
                    type="text"
                    readOnly
                    value={getModuleShareUrl(activeModalPub.id)}
                    className="w-full bg-transparent text-[11px] sm:text-xs text-emerald-100 font-mono focus:outline-none select-all truncate px-1"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyLink(activeModalPub)}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
                  >
                    {copiedId === activeModalPub.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-900" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Link</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Social & Messaging Direct Send Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {/* WhatsApp */}
                  <button
                    type="button"
                    onClick={() => handleShareWhatsApp(activeModalPub)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold shadow-sm transition-all cursor-pointer hover:scale-[1.02]"
                    title="Kirim Modul via WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-current" />
                    <span>WhatsApp</span>
                  </button>

                  {/* Telegram */}
                  <button
                    type="button"
                    onClick={() => handleShareTelegram(activeModalPub)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold shadow-sm transition-all cursor-pointer hover:scale-[1.02]"
                    title="Kirim Modul via Telegram"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Telegram</span>
                  </button>

                  {/* Facebook */}
                  <button
                    type="button"
                    onClick={() => handleShareFacebook(activeModalPub)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold shadow-sm transition-all cursor-pointer hover:scale-[1.02]"
                    title="Bagikan ke Facebook"
                  >
                    <span>Facebook</span>
                  </button>

                  {/* Mobile Native Share */}
                  <button
                    type="button"
                    onClick={() => handleNativeShare(activeModalPub)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold shadow-sm transition-all cursor-pointer hover:scale-[1.02]"
                    title="Bagikan ke Aplikasi Lain"
                  >
                    <Share2 className="w-3.5 h-3.5 text-amber-300" />
                    <span>Lainnya...</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 sm:px-7 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleClosePub}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Tutup Jendela
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyLink(activeModalPub)}
                  className="px-3.5 py-2 rounded-xl border border-emerald-800/30 text-emerald-900 bg-white hover:bg-emerald-50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{copiedId === activeModalPub.id ? 'Tersalin' : 'Salin URL Modul'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadSample(activeModalPub)}
                  className="px-5 py-2 rounded-xl bg-[#064e3b] hover:bg-[#043327] text-amber-300 text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  {downloadSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-amber-300" />
                      <span>Sampel Tersimpan!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-amber-300" />
                      <span>Unduh Ringkasan Silabus</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
