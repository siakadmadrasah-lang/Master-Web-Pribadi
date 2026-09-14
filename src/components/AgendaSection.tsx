import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Share2,
  Check,
  Bell,
  Sparkles,
  Download,
  FileText,
  Paperclip,
  ExternalLink,
  Tag,
  BookOpen,
  GraduationCap,
  Award,
  Users,
  Eye,
  X,
  Image as ImageIcon,
  Layers,
  ArrowRight,
  FileCode,
  FileArchive,
  FileSpreadsheet,
  FileVolume,
  FileVideo,
  FileCheck,
  Maximize2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { agendaList, defaultAgendaCategories } from '../data/personalData';
import { AgendaItem } from '../types';

interface AgendaSectionProps {
  agenda?: AgendaItem[];
  categories?: string[];
  authorName?: string;
}

interface CategoryMeta {
  image: string;
  tagline: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

export const CATEGORY_META_MAP: Record<string, CategoryMeta> = {
  'kajian kitab': {
    image: 'https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Dirasah Kitab Klasik (Turats) & Pendalaman Khazanah Keilmuan Islam',
    badge: 'Dirasah Turats',
    icon: BookOpen,
    accentColor: 'from-amber-700 to-emerald-900',
  },
  'pelatihan guru': {
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Peningkatan Kompetensi Pedagogik & Inovasi Perangkat Ajar Madrasah',
    badge: 'Kapasitas Pendidik',
    icon: GraduationCap,
    accentColor: 'from-emerald-800 to-teal-900',
  },
  'seminar nasional': {
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Konferensi Pendidikan Islam, Parenting Era Digital & Keteladanan Ummat',
    badge: 'Seminar & Konferensi',
    icon: Award,
    accentColor: 'from-blue-900 to-emerald-950',
  },
  'bimbingan santri': {
    image: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Kaderisasi Santri Unggul, Tahfidzul Qur\'an & Pembinaan Karakter Adab',
    badge: 'Kaderisasi Santri',
    icon: Users,
    accentColor: 'from-emerald-900 to-teal-950',
  },
  'workshop kurikulum': {
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Penyusunan Modul Ajar Digital & Implementasi Kurikulum Madrasah',
    badge: 'Manajemen Kurikulum',
    icon: FileText,
    accentColor: 'from-amber-800 to-emerald-900',
  },
  'kajian rutin': {
    image: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Majelis Ta\'lim & Penguatan Spiritualitas Mingguan / Bulanan',
    badge: 'Majelis Ta\'lim',
    icon: Calendar,
    accentColor: 'from-teal-900 to-emerald-900',
  },
  'tabligh akbar': {
    image: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Syiar Dakwah Akbar Kebangsaan & Ukhuwah Islamiyah',
    badge: 'Dakwah Akbar',
    icon: Sparkles,
    accentColor: 'from-amber-900 to-emerald-950',
  },
  'halaqah ilmiah': {
    image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Forum Diskusi Tematik, Bedah Riset & Naskah Akademik Keagamaan',
    badge: 'Halaqah Akademik',
    icon: Layers,
    accentColor: 'from-emerald-950 to-emerald-800',
  },
  'bedah kitab kuning': {
    image: 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Kajian Mendalam Teks Turats & Kontekstualisasi Fiqh Kontemporer',
    badge: 'Turats Pesantren',
    icon: BookOpen,
    accentColor: 'from-amber-800 to-stone-900',
  },
  'fgd guru': {
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
    tagline: 'Focus Group Discussion & Kolaborasi Antar Pendidik Madrasah',
    badge: 'Forum Guru',
    icon: Users,
    accentColor: 'from-teal-800 to-emerald-950',
  }
};

const DEFAULT_CATEGORY_META: CategoryMeta = {
  image: 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?auto=format&fit=crop&w=1200&q=80',
  tagline: 'Jadwal Lengkap Majelis Dakwah, Pelatihan Guru, dan Bimbingan Santri',
  badge: 'Agenda & Dakwah',
  icon: Calendar,
  accentColor: 'from-emerald-900 to-[#022c22]',
};

export const getCategoryMeta = (catName: string): CategoryMeta => {
  const normalized = (catName || '').trim().toLowerCase();
  if (CATEGORY_META_MAP[normalized]) {
    return CATEGORY_META_MAP[normalized];
  }

  // Keyword-based fallback matching
  for (const [key, meta] of Object.entries(CATEGORY_META_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return meta;
    }
  }

  return DEFAULT_CATEGORY_META;
};

export const isImageFile = (url?: string, fileName?: string, fileType?: string): boolean => {
  if (!url && !fileName && !fileType) return false;
  const target = `${url || ''} ${fileName || ''} ${fileType || ''}`.toLowerCase();
  return (
    target.includes('.jpg') ||
    target.includes('.jpeg') ||
    target.includes('.png') ||
    target.includes('.webp') ||
    target.includes('.gif') ||
    target.includes('.svg') ||
    target.startsWith('data:image/') ||
    target.includes('image')
  );
};

export const isPdfFile = (url?: string, fileName?: string, fileType?: string): boolean => {
  const target = `${url || ''} ${fileName || ''} ${fileType || ''}`.toLowerCase();
  return target.includes('.pdf') || target.includes('pdf');
};

export const isPresentationFile = (url?: string, fileName?: string, fileType?: string): boolean => {
  const target = `${url || ''} ${fileName || ''} ${fileType || ''}`.toLowerCase();
  return target.includes('.ppt') || target.includes('.pptx') || target.includes('presentation') || target.includes('powerpoint');
};

export const isDocumentFile = (url?: string, fileName?: string, fileType?: string): boolean => {
  const target = `${url || ''} ${fileName || ''} ${fileType || ''}`.toLowerCase();
  return target.includes('.doc') || target.includes('.docx') || target.includes('word') || target.includes('document');
};

export const isSpreadsheetFile = (url?: string, fileName?: string, fileType?: string): boolean => {
  const target = `${url || ''} ${fileName || ''} ${fileType || ''}`.toLowerCase();
  return target.includes('.xls') || target.includes('.xlsx') || target.includes('.csv') || target.includes('sheet') || target.includes('excel');
};

export const isArchiveFile = (url?: string, fileName?: string, fileType?: string): boolean => {
  const target = `${url || ''} ${fileName || ''} ${fileType || ''}`.toLowerCase();
  return target.includes('.zip') || target.includes('.rar') || target.includes('.7z') || target.includes('.tar') || target.includes('archive');
};

export const isAudioFile = (url?: string, fileName?: string, fileType?: string): boolean => {
  const target = `${url || ''} ${fileName || ''} ${fileType || ''}`.toLowerCase();
  return target.includes('.mp3') || target.includes('.wav') || target.includes('.m4a') || target.includes('.ogg') || target.includes('audio');
};

export const isVideoFile = (url?: string, fileName?: string, fileType?: string): boolean => {
  const target = `${url || ''} ${fileName || ''} ${fileType || ''}`.toLowerCase();
  return target.includes('.mp4') || target.includes('.mkv') || target.includes('.mov') || target.includes('.webm') || target.includes('video');
};

export const AgendaSection: React.FC<AgendaSectionProps> = ({
  agenda = agendaList,
  categories = defaultAgendaCategories,
  authorName = 'Ust. Jaenal Maskun, S.Pd.I., M.Pd.'
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [remindedItem, setRemindedItem] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [previewImageModal, setPreviewImageModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    title: string;
    caption?: string;
    fileUrl?: string;
    fileName?: string;
    category?: string;
  }>({
    isOpen: false,
    imageUrl: '',
    title: '',
  });

  // Compute all available categories from props and actual agenda items, prioritizing active categories with agenda items
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    (categories || []).forEach((c) => c && set.add(c.trim()));
    (agenda || []).forEach((item) => item.type && set.add(item.type.trim()));
    const list = Array.from(set).filter(Boolean);

    return list.sort((a, b) => {
      const countA = (agenda || []).filter((item) => (item.type || '').trim().toLowerCase() === a.trim().toLowerCase()).length;
      const countB = (agenda || []).filter((item) => (item.type || '').trim().toLowerCase() === b.trim().toLowerCase()).length;
      if (countA > 0 && countB === 0) return -1;
      if (countA === 0 && countB > 0) return 1;
      return 0;
    });
  }, [categories, agenda]);

  // Filter agenda by selected category
  const filteredAgenda = useMemo(() => {
    if (selectedCategory === 'Semua') return agenda;
    return agenda.filter((item) => (item.type || '').trim().toLowerCase() === selectedCategory.trim().toLowerCase());
  }, [agenda, selectedCategory]);

  // Limit items shown initially on Beranda to 2 items (latest) so page is clean & compact
  const INITIAL_LIMIT = 2;
  const displayedAgenda = useMemo(() => {
    if (isExpanded || filteredAgenda.length <= INITIAL_LIMIT) {
      return filteredAgenda;
    }
    return filteredAgenda.slice(0, INITIAL_LIMIT);
  }, [filteredAgenda, isExpanded]);

  // Count how many items have files/flyers in current filtered list
  const attachmentsCount = useMemo(() => {
    return filteredAgenda.filter((item) => item.fileUrl || item.imageUrl).length;
  }, [filteredAgenda]);

  // Active Category Meta for the Category Spotlight Banner
  const activeCategoryMeta = useMemo(() => {
    if (selectedCategory === 'Semua') {
      return {
        ...DEFAULT_CATEGORY_META,
        title: 'Semua Kategori Agenda',
        tagline: 'Jelajahi seluruh jadwal kajian, seminar, pelatihan guru, dan lampiran berkas materi madrasah.',
        badge: 'Jadwal Keseluruhan',
        count: agenda.length,
      };
    }
    const meta = getCategoryMeta(selectedCategory);
    return {
      ...meta,
      title: selectedCategory,
      count: filteredAgenda.length,
    };
  }, [selectedCategory, agenda.length, filteredAgenda.length]);

  const handleSetReminder = (item: AgendaItem) => {
    setRemindedItem(item.id);
    setTimeout(() => setRemindedItem(null), 3000);

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Personal Site//ID
BEGIN:VEVENT
SUMMARY:${item.title} - Bersama ${authorName}
DESCRIPTION:Jadwal kegiatan: ${item.type} di ${item.location}${item.fileUrl ? ` (Lampiran: ${item.fileName || 'Berkas Acara'})` : ''}
LOCATION:${item.location}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Agenda-${item.title.slice(0, 20)}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShareWA = (item: AgendaItem) => {
    let fileInfo = '';
    if (item.fileUrl) {
      const fullUrl = item.fileUrl.startsWith('http')
        ? item.fileUrl
        : `${typeof window !== 'undefined' ? window.location.origin : 'https://jaenalmaskun.biz.id'}${item.fileUrl.startsWith('/') ? '' : '/'}${item.fileUrl}`;
      fileInfo = `\n📥 Unduh Berkas/Materi: ${fullUrl}`;
    }

    const text = `*Informasi Agenda & Kajian Madrasah*\n\n📌 *${item.title}*\n🏷 Kategori: ${item.type}\n🗓 Waktu: ${item.date} (${item.time})\n📍 Tempat: ${item.location}\n👤 Narasumber: ${authorName}${fileInfo}\n\nMari hadir dan raih keberkahan ilmu.`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const renderFileCategoryIcon = (url?: string, fileName?: string, fileType?: string) => {
    if (isImageFile(url, fileName, fileType)) {
      return <ImageIcon className="w-4 h-4 text-indigo-400" />;
    }
    if (isPdfFile(url, fileName, fileType)) {
      return <FileText className="w-4 h-4 text-red-400" />;
    }
    if (isPresentationFile(url, fileName, fileType)) {
      return <Layers className="w-4 h-4 text-amber-400" />;
    }
    if (isDocumentFile(url, fileName, fileType)) {
      return <FileCheck className="w-4 h-4 text-blue-400" />;
    }
    if (isSpreadsheetFile(url, fileName, fileType)) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    }
    if (isArchiveFile(url, fileName, fileType)) {
      return <FileArchive className="w-4 h-4 text-purple-400" />;
    }
    if (isAudioFile(url, fileName, fileType)) {
      return <FileVolume className="w-4 h-4 text-teal-400" />;
    }
    if (isVideoFile(url, fileName, fileType)) {
      return <FileVideo className="w-4 h-4 text-rose-400" />;
    }
    return <Paperclip className="w-4 h-4 text-gray-300" />;
  };

  const getFileBadgeStyle = (url?: string, fileName?: string, fileType?: string) => {
    if (isImageFile(url, fileName, fileType)) {
      return {
        bg: 'bg-indigo-50 border-indigo-200 text-indigo-800',
        badge: 'bg-indigo-600 text-white',
        btn: 'bg-indigo-700 hover:bg-indigo-800 text-white',
        label: 'GAMBAR / FLYER'
      };
    }
    if (isPdfFile(url, fileName, fileType)) {
      return {
        bg: 'bg-red-50/80 border-red-200 text-red-900',
        badge: 'bg-red-600 text-white',
        btn: 'bg-red-700 hover:bg-red-800 text-white',
        label: 'DOKUMEN PDF'
      };
    }
    if (isPresentationFile(url, fileName, fileType)) {
      return {
        bg: 'bg-amber-50/80 border-amber-200 text-amber-900',
        badge: 'bg-amber-600 text-white',
        btn: 'bg-amber-700 hover:bg-amber-800 text-white',
        label: 'PRESENTASI PPT'
      };
    }
    if (isDocumentFile(url, fileName, fileType)) {
      return {
        bg: 'bg-blue-50/80 border-blue-200 text-blue-900',
        badge: 'bg-blue-600 text-white',
        btn: 'bg-blue-700 hover:bg-blue-800 text-white',
        label: 'DOKUMEN WORD'
      };
    }
    if (isSpreadsheetFile(url, fileName, fileType)) {
      return {
        bg: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
        badge: 'bg-emerald-600 text-white',
        btn: 'bg-emerald-700 hover:bg-emerald-800 text-white',
        label: 'SPREADSHEET EXCEL'
      };
    }
    if (isArchiveFile(url, fileName, fileType)) {
      return {
        bg: 'bg-purple-50/80 border-purple-200 text-purple-900',
        badge: 'bg-purple-600 text-white',
        btn: 'bg-purple-700 hover:bg-purple-800 text-white',
        label: 'BERKAS ZIP / RAR'
      };
    }
    return {
      bg: 'bg-emerald-50/70 border-emerald-200 text-emerald-950',
      badge: 'bg-emerald-800 text-white',
      btn: 'bg-emerald-800 hover:bg-emerald-700 text-white',
      label: fileType || 'BERKAS'
    };
  };

  return (
    <section id="agenda" className="py-16 md:py-24 bg-[#faf8f5] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span>Majelis & Pelatihan Madrasah</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#064e3b] tracking-tight">
            Jadwal Kajian, Seminar & Pelatihan Terkini
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-600 font-light">
            Silakan simak agenda halaqah ilmiah, pelatihan guru madrasah, dan kajian keagamaan lengkap dengan brosur flyer serta berkas modul materi.
          </p>
        </div>

        {/* Dynamic Category Filter Bar */}
        {availableCategories.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 px-1 sm:px-0 sm:flex-wrap sm:justify-center no-scrollbar -mx-4 sm:mx-0 snap-x">
              <button
                id="filter-agenda-semua"
                onClick={() => setSelectedCategory('Semua')}
                className={`shrink-0 snap-start whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer active:scale-95 ${
                  selectedCategory === 'Semua'
                    ? 'bg-emerald-900 text-amber-300 ring-2 ring-emerald-600 shadow-md font-extrabold scale-[1.02]'
                    : 'bg-white text-gray-700 hover:bg-emerald-50 hover:text-emerald-950 border border-emerald-900/10 hover:border-emerald-700/30'
                }`}
              >
                <span>Semua Kategori</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedCategory === 'Semua'
                      ? 'bg-emerald-950 text-amber-300 ring-1 ring-amber-400/40'
                      : 'bg-emerald-100/90 text-emerald-800'
                  }`}
                >
                  {agenda.length}
                </span>
              </button>

              {availableCategories.map((category) => {
                const count = agenda.filter(
                  (item) => (item.type || '').trim().toLowerCase() === category.trim().toLowerCase()
                ).length;
                const isSelected = selectedCategory === category;
                return (
                  <button
                    key={category}
                    id={`filter-agenda-${category.replace(/\s+/g, '-').toLowerCase()}`}
                    onClick={() => setSelectedCategory(category)}
                    className={`shrink-0 snap-start whitespace-nowrap px-3.5 py-2.5 rounded-xl text-xs transition-all shadow-2xs flex items-center gap-2 cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-emerald-900 text-amber-300 ring-2 ring-emerald-600 shadow-md font-bold scale-[1.02]'
                        : count > 0
                        ? 'bg-white text-gray-800 hover:bg-emerald-50 hover:text-emerald-950 border border-emerald-900/15 font-semibold hover:border-emerald-700/30'
                        : 'bg-white/90 text-gray-600 hover:bg-emerald-50/70 hover:text-emerald-900 border border-gray-200 font-medium'
                    }`}
                  >
                    <Tag className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : count > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
                    <span>{category}</span>
                    {count > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSelected
                            ? 'bg-emerald-950 text-amber-300 ring-1 ring-amber-400/40'
                            : 'bg-emerald-100/90 text-emerald-800'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic Category Spotlight Banner (Gambar & Banner Sesuai Kategori yang Dipilih) */}
        <div
          id="category-spotlight-banner"
          className="mb-10 relative overflow-hidden rounded-3xl border border-emerald-900/15 shadow-md bg-gradient-to-r from-[#022c22] via-[#064e3b] to-emerald-900 text-white animate-fadeIn"
        >
          {/* Background Category Image with Vignette & Gradient */}
          <div className="absolute inset-0 z-0">
            <img
              src={activeCategoryMeta.image}
              alt={activeCategoryMeta.title || selectedCategory}
              className="w-full h-full object-cover object-center filter brightness-45 contrast-110 transition-all duration-700 transform scale-102"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#022c22]/95 via-[#064e3b]/80 to-transparent" />
            <div className="absolute inset-0 bg-radial-at-c from-transparent via-black/20 to-black/60" />
          </div>

          {/* Banner Content */}
          <div className="relative z-10 p-6 sm:p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/90 text-emerald-950 font-bold text-xs shadow-xs border border-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-950" />
                  <span>{activeCategoryMeta.badge}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-[11px] font-semibold text-emerald-200">
                  {activeCategoryMeta.count} Jadwal Kegiatan
                </span>
                {attachmentsCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-[11px] font-semibold text-amber-200 flex items-center gap-1">
                    <Paperclip className="w-3 h-3 text-amber-300" />
                    <span>{attachmentsCount} Dilengkapi Berkas / Flyer</span>
                  </span>
                )}
              </div>

              <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {activeCategoryMeta.title || selectedCategory}
              </h3>

              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-light">
                {activeCategoryMeta.tagline}
              </p>
            </div>

            {/* Quick Filter Info / Preview Badge */}
            <div className="shrink-0 flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2 bg-emerald-950/60 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/30">
              <div className="text-left md:text-right">
                <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">
                  Kategori Terpilih
                </span>
                <span className="text-sm font-bold text-white block">
                  {selectedCategory === 'Semua' ? 'Seluruh Agenda' : selectedCategory}
                </span>
              </div>
              {selectedCategory !== 'Semua' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('Semua')}
                  className="mt-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95"
                >
                  <span>Reset Filter</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Agenda Cards Grid */}
        {displayedAgenda.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-7">
              {displayedAgenda.map((item) => {
                const itemCatMeta = getCategoryMeta(item.type);
                
                // Determine flyer image vs document
                const hasExplicitFlyer = Boolean(item.imageUrl);
                const isFileAnImage = isImageFile(item.fileUrl, item.fileName, item.fileType);
                const flyerImage = item.imageUrl || (isFileAnImage ? item.fileUrl : null);
                const heroCardCover = flyerImage || itemCatMeta.image;

                const hasFileAttachment = Boolean(item.fileUrl);
                const fileBadgeStyle = getFileBadgeStyle(item.fileUrl, item.fileName, item.fileType);

                return (
                  <div
                    key={item.id}
                    id={`agenda-card-${item.id}`}
                    className="bg-white rounded-3xl border border-emerald-900/10 shadow-xs hover:shadow-xl transition-all duration-300 hover:border-amber-400 overflow-hidden flex flex-col justify-between group"
                  >
                    {/* Card Visual Header / Cover Image */}
                    <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-emerald-950">
                      <img
                        src={heroCardCover}
                        alt={item.title}
                        className="w-full h-full object-cover object-center filter brightness-90 group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

                      {/* Category & Status Badges */}
                      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 z-10">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-900/90 backdrop-blur-md border border-emerald-400/40 text-amber-300 text-[11px] font-bold shadow-md">
                          <Tag className="w-3 h-3 text-amber-300" />
                          <span>{item.type}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {hasExplicitFlyer && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.8 rounded-xl bg-indigo-950/80 backdrop-blur-md border border-indigo-400/40 text-indigo-200 text-[10px] font-bold shadow-xs">
                              <ImageIcon className="w-3 h-3 text-indigo-300" />
                              <span>Flyer</span>
                            </span>
                          )}
                          <span
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-md border ${
                              item.status === 'Rutin'
                                ? 'bg-emerald-500/90 text-white border-emerald-300'
                                : item.status === 'Selesai'
                                ? 'bg-gray-700/90 text-gray-200 border-gray-500'
                                : 'bg-amber-500/90 text-emerald-950 border-amber-300'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>

                      {/* Clickable Image Preview Trigger if there is a flyer / poster */}
                      {flyerImage && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImageModal({
                              isOpen: true,
                              imageUrl: flyerImage,
                              title: item.title,
                              caption: `${item.type} • ${item.date} • ${item.location}`,
                              fileUrl: item.fileUrl,
                              fileName: item.fileName,
                              category: item.type
                            })
                          }
                          className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md border border-white/30 transition-all shadow-md active:scale-95"
                          title="Klik untuk memperbesar gambar flyer"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                          <span>Lihat Brosur</span>
                        </button>
                      )}

                      {/* Date Tag over Cover */}
                      <div className="absolute bottom-3 left-3 text-white z-10">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 drop-shadow-sm">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>{item.date}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Main Body */}
                    <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-3.5">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug group-hover:text-emerald-900 transition-colors">
                          {item.title}
                        </h3>

                        {item.description && (
                          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-light">
                            {item.description}
                          </p>
                        )}

                        {/* Time and Location Specs */}
                        <div className="pt-2 space-y-2 text-xs sm:text-sm text-gray-700 border-t border-gray-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                              <Clock className="w-3.5 h-3.5 text-emerald-700" />
                            </div>
                            <span className="font-medium">{item.time}</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                            </div>
                            <span className="text-gray-600">{item.location}</span>
                          </div>
                        </div>

                        {/* Visual Flyer Preview Box (Jika ada Image Flyer khusus yang diunggah) */}
                        {item.imageUrl && (
                          <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-indigo-950 border border-indigo-300 shadow-2xs shrink-0 relative">
                                <img
                                  src={item.imageUrl}
                                  alt="Flyer Kegiatan"
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide block">
                                  Brosur Resmi
                                </span>
                                <p className="text-xs font-bold text-gray-900 truncate">
                                  Flyer Poster Kegiatan ({item.type})
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImageModal({
                                  isOpen: true,
                                  imageUrl: item.imageUrl!,
                                  title: item.title,
                                  caption: `Brosur Kegiatan ${item.type} - ${item.date}`,
                                  fileUrl: item.imageUrl,
                                  fileName: `Flyer-${item.title.slice(0, 20)}.jpg`,
                                  category: item.type
                                })
                              }
                              className="px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1 shadow-2xs shrink-0 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Buka</span>
                            </button>
                          </div>
                        )}

                        {/* Uploaded File Attachment Box (Tampil Jelas di Publik Sesuai Kategori & Tipe Berkas) */}
                        {hasFileAttachment && (
                          <div className={`p-3.5 rounded-2xl border shadow-2xs space-y-2.5 ${fileBadgeStyle.bg}`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 rounded-xl bg-emerald-900 text-white shadow-2xs shrink-0 flex items-center justify-center">
                                  {renderFileCategoryIcon(item.fileUrl, item.fileName, item.fileType)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md uppercase tracking-wider ${fileBadgeStyle.badge}`}>
                                      {item.fileType || fileBadgeStyle.label}
                                    </span>
                                    {item.fileSize && (
                                      <span className="text-[10px] text-gray-600 font-mono">
                                        {item.fileSize}
                                      </span>
                                    )}
                                  </div>
                                  <p
                                    className="text-xs font-bold text-gray-900 truncate"
                                    title={item.fileName || 'Berkas Lampiran Agenda'}
                                  >
                                    {item.fileName || 'Lampiran Berkas / Modul Acara'}
                                  </p>
                                </div>
                              </div>

                              {/* Download Action Button */}
                              <a
                                href={item.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={item.fileName || undefined}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-xs active:scale-95 border border-white/20 ${fileBadgeStyle.btn}`}
                                title="Unduh Berkas Lampiran Materi"
                              >
                                <Download className="w-3.5 h-3.5 text-amber-300" />
                                <span className="hidden sm:inline">Unduh Berkas</span>
                              </a>
                            </div>

                            {/* Quick Preview Action Bar */}
                            <div className="pt-1.5 flex items-center justify-between border-t border-black/5 text-[11px]">
                              <span className="text-gray-500 font-medium flex items-center gap-1">
                                <Paperclip className="w-3 h-3 text-emerald-700" />
                                <span>Materi Kategori {item.type}</span>
                              </span>
                              
                              <div className="flex items-center gap-2">
                                {isFileAnImage ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewImageModal({
                                        isOpen: true,
                                        imageUrl: item.fileUrl!,
                                        title: item.title,
                                        caption: `${item.fileName || 'Lampiran'} (${item.fileSize || 'Gambar'})`,
                                        fileUrl: item.fileUrl,
                                        fileName: item.fileName,
                                        category: item.type
                                      })
                                    }
                                    className="text-emerald-900 hover:text-emerald-950 font-bold flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3 text-amber-600" />
                                    <span>Perbesar Gambar</span>
                                  </button>
                                ) : (
                                  <a
                                    href={item.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-900 hover:text-emerald-950 font-bold flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3 h-3 text-amber-600" />
                                    <span>Buka Langsung</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Actions: Calendar & WhatsApp Share */}
                      <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                        <button
                          id={`btn-remind-${item.id}`}
                          onClick={() => handleSetReminder(item)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                        >
                          {remindedItem === item.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-amber-300" />
                              <span>Tersimpan di Kalender</span>
                            </>
                          ) : (
                            <>
                              <Bell className="w-3.5 h-3.5" />
                              <span>Simpan ke Kalender</span>
                            </>
                          )}
                        </button>

                        <button
                          id={`btn-share-wa-${item.id}`}
                          onClick={() => handleShareWA(item)}
                          className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
                          title="Bagikan ke WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Bagikan</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expand / Collapse Button when items exceed INITIAL_LIMIT */}
            {filteredAgenda.length > INITIAL_LIMIT && (
              <div className="mt-10 flex flex-col items-center justify-center space-y-3">
                <div className="text-xs text-gray-500 font-medium">
                  Menampilkan <span className="font-bold text-emerald-900">{displayedAgenda.length}</span> dari{' '}
                  <span className="font-bold text-emerald-900">{filteredAgenda.length}</span> jadwal kegiatan{' '}
                  {selectedCategory !== 'Semua' ? `kategori ${selectedCategory}` : ''}
                </div>
                <button
                  type="button"
                  id="btn-toggle-expand-agenda"
                  onClick={() => {
                    setIsExpanded(!isExpanded);
                    if (isExpanded) {
                      const el = document.getElementById('agenda');
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
                      <span>Tampilkan Lebih Ringkas (Sembunyikan Agenda Lainnya)</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 text-emerald-700 group-hover:text-amber-300 animate-bounce" />
                      <span>Buka Seluruh Jadwal & Pelatihan ({filteredAgenda.length} Agenda)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 group-hover:bg-emerald-950 text-emerald-900 group-hover:text-amber-300 font-bold">
                        +{filteredAgenda.length - INITIAL_LIMIT} Lainnya
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300 p-8 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-7 h-7" />
            </div>
            <h4 className="text-base sm:text-lg font-bold text-gray-800">
              Belum Ada Jadwal untuk Kategori "{selectedCategory}"
            </h4>
            <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
              Silakan pilih kategori lainnya atau kembali ke seluruh kategori untuk melihat jadwal kegiatan lainnya.
            </p>
            <button
              onClick={() => setSelectedCategory('Semua')}
              className="mt-2 px-5 py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm transition-all"
            >
              Tampilkan Semua Agenda
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Modal for Flyer / Image Preview */}
      {previewImageModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setPreviewImageModal({ ...previewImageModal, isOpen: false })}
        >
          <div
            className="relative bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#064e3b] to-emerald-900 text-white flex items-center justify-between">
              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] bg-amber-400 text-emerald-950 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {previewImageModal.category || 'Flyer Agenda'}
                  </span>
                  <span className="text-xs text-emerald-200">Pratinjau Brosur Resmi</span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white truncate">
                  {previewImageModal.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImageModal({ ...previewImageModal, isOpen: false })}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image Body */}
            <div className="p-4 sm:p-6 bg-stone-950 flex items-center justify-center overflow-auto max-h-[60vh]">
              <img
                src={previewImageModal.imageUrl}
                alt={previewImageModal.title}
                className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-gray-600 text-center sm:text-left">
                {previewImageModal.caption || 'Flyer materi kegiatan madrasah'}
              </p>
              <div className="flex items-center gap-2">
                {previewImageModal.fileUrl && (
                  <a
                    href={previewImageModal.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={previewImageModal.fileName || 'Flyer-Agenda.jpg'}
                    className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-300" />
                    <span>Unduh Gambar Asli</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewImageModal({ ...previewImageModal, isOpen: false })}
                  className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
