import React, { useState } from 'react';
import {
  Save,
  RotateCcw,
  CheckCircle2,
  User,
  BookOpen,
  Sparkles,
  Award,
  Calendar,
  Camera,
  HeartHandshake,
  Layers,
  Plus,
  Trash2,
  Edit2,
  Image as ImageIcon,
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  Quote as QuoteIcon,
  GraduationCap,
  Eye,
  EyeOff,
  Download,
  Upload,
  Phone,
  Mail,
  MapPin,
  Share2,
  Sliders,
  Send,
  Star,
  FileText,
  ShieldCheck,
  Tag,
  FolderPlus,
  Paperclip,
  Clock,
  Video,
  Play,
  Film,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Tv,
  Radio,
  Share,
  Youtube,
  Link as LinkIcon,
  HelpCircle,
  SlidersHorizontal,
  Smartphone,
  Loader2,
  X
} from 'lucide-react';
import {
  parseVideoUrl,
  extractYouTubeId,
  isYouTubeChannelUrl,
  getYouTubeChannelHandle,
  getYouTubeThumbnailUrl,
  getPlatformBadgeStyle,
  fetchYouTubeVideosUniversal
} from '../utils/videoHelpers';
import { uploadVideoToServer } from '../utils/videoCompressor';
import { UniversalMediaPlayer } from './UniversalMediaPlayer';
import {
  SiteContentConfig,
  ProfileInfo,
  PillarItem,
  ExperienceItem,
  GalleryItem,
  EducationItem,
  QuoteItem,
  HeroSettings,
  Publication,
  AgendaItem,
  SectionVisibilityConfig,
  YouTubeChannelVideo,
  YouTubeChannelConfig,
  MediaChannelAccount
} from '../types';
import { defaultSiteContent, defaultAgendaCategories, defaultYouTubeChannelConfig, defaultYouTubeVideos, sampleYouTubeVideos, defaultMediaChannels } from '../data/personalData';

interface SiteContentEditorProps {
  content: SiteContentConfig;
  onSaveContent: (newContent: SiteContentConfig) => void;
  onToast: (msg: string) => void;
  initialTab?: string;
  onClose?: () => void;
}

export const SiteContentEditor: React.FC<SiteContentEditorProps> = ({
  content,
  onSaveContent,
  onToast,
  initialTab = 'profile',
  onClose
}) => {
  const [draft, setDraft] = useState<SiteContentConfig>(() => {
    // Ensure all arrays and nested objects are properly populated
    return {
      profile: { ...defaultSiteContent.profile, ...(content?.profile || {}) },
      education: Array.isArray(content?.education) ? content.education : defaultSiteContent.education,
      pillars: Array.isArray(content?.pillars) ? content.pillars : defaultSiteContent.pillars,
      quotes: Array.isArray(content?.quotes) ? content.quotes : defaultSiteContent.quotes,
      publications: Array.isArray(content?.publications) ? content.publications : defaultSiteContent.publications,
      experience: Array.isArray(content?.experience)
        ? content.experience
        : Array.isArray((content as any)?.experiences)
        ? (content as any).experiences
        : defaultSiteContent.experience,
      agenda: Array.isArray(content?.agenda) ? content.agenda : defaultSiteContent.agenda,
      agendaCategories: Array.isArray(content?.agendaCategories)
        ? content.agendaCategories
        : (defaultSiteContent.agendaCategories || defaultAgendaCategories),
      gallery: Array.isArray(content?.gallery) ? content.gallery : defaultSiteContent.gallery,
      youtubeChannel: content?.youtubeChannel || defaultSiteContent.youtubeChannel || defaultYouTubeChannelConfig,
      youtubeVideos: Array.isArray(content?.youtubeVideos)
        ? content.youtubeVideos
        : (Array.isArray(content?.youtubeChannel?.videos) ? content.youtubeChannel.videos : defaultSiteContent.youtubeVideos),
      mediaChannels: Array.isArray(content?.mediaChannels)
        ? content.mediaChannels
        : (Array.isArray(content?.youtubeChannel?.channels) ? content.youtubeChannel.channels : ((defaultSiteContent as any).mediaChannels || defaultMediaChannels)),
      visibility: { ...defaultSiteContent.visibility, ...(content?.visibility || {}) },
      heroSettings: { ...defaultSiteContent.heroSettings, ...(content?.heroSettings || {}) },
      shareSettings: { ...defaultSiteContent.shareSettings, ...(content?.shareSettings || {}) }
    };
  });

  const [activeSubTab, setActiveSubTab] = useState<
    'profile' | 'hero' | 'about' | 'pillars' | 'karya' | 'mediachannel' | 'experiences' | 'agenda' | 'gallery' | 'kontak' | 'visibility' | 'backup'
  >(
    (initialTab as any) || 'profile'
  );

  const [isSaved, setIsSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');

  // Media preview modal state in editor
  const [previewVideoModal, setPreviewVideoModal] = useState<{
    title: string;
    url: string;
    platform?: string;
  } | null>(null);

  // Expanded video card in editor
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);

  // Manual video upload tracking state for gallery items
  const [uploadingVideoId, setUploadingVideoId] = useState<string | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<{ percent: number; status: string }>({
    percent: 0,
    status: ''
  });

  // Keep refs to avoid re-triggering effects on every render or function recreation
  const draftRef = React.useRef(draft);
  draftRef.current = draft;
  const onSaveContentRef = React.useRef(onSaveContent);
  onSaveContentRef.current = onSaveContent;
  const hasUnsavedChangesRef = React.useRef(hasUnsavedChanges);
  hasUnsavedChangesRef.current = hasUnsavedChanges;

  // Real-time Debounced Auto-Save to Server (1.2s debounce)
  React.useEffect(() => {
    if (!hasUnsavedChanges) return;
    const timer = setTimeout(() => {
      onSaveContentRef.current(draftRef.current);
      setHasUnsavedChanges(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }, 1200);

    return () => clearTimeout(timer);
  }, [draft, hasUnsavedChanges]);

  // Guaranteed save on component unmount / modal close
  React.useEffect(() => {
    return () => {
      if (hasUnsavedChangesRef.current) {
        onSaveContentRef.current(draftRef.current);
      }
    };
  }, []);

  // Sync draft when parent content updates (e.g. from server hydration)
  React.useEffect(() => {
    if (content && !hasUnsavedChangesRef.current) {
      setDraft({
        profile: { ...defaultSiteContent.profile, ...(content.profile || {}) },
        education: Array.isArray(content.education) ? content.education : defaultSiteContent.education,
        pillars: Array.isArray(content.pillars) ? content.pillars : defaultSiteContent.pillars,
        quotes: Array.isArray(content.quotes) ? content.quotes : defaultSiteContent.quotes,
        publications: Array.isArray(content.publications) ? content.publications : defaultSiteContent.publications,
        experience: Array.isArray(content.experience) ? content.experience : Array.isArray((content as any).experiences) ? (content as any).experiences : defaultSiteContent.experience,
        agenda: Array.isArray(content.agenda) ? content.agenda : defaultSiteContent.agenda,
        gallery: Array.isArray(content.gallery) ? content.gallery : defaultSiteContent.gallery,
        youtubeChannel: content.youtubeChannel || defaultSiteContent.youtubeChannel,
        youtubeVideos: Array.isArray(content.youtubeVideos) ? content.youtubeVideos : defaultSiteContent.youtubeVideos,
        mediaChannels: Array.isArray(content.mediaChannels) ? content.mediaChannels : (content.youtubeChannel?.channels || defaultMediaChannels),
        visibility: { ...defaultSiteContent.visibility, ...(content.visibility || {}) },
        heroSettings: { ...defaultSiteContent.heroSettings, ...(content.heroSettings || {}) },
        shareSettings: { ...defaultSiteContent.shareSettings, ...(content.shareSettings || {}) }
      });
    }
  }, [content]);

  // YouTube Channel Sync State
  const [isSyncingYoutube, setIsSyncingYoutube] = useState(false);
  const [channelSyncInput, setChannelSyncInput] = useState(
    draft.youtubeChannel?.channelId || draft.youtubeChannel?.channelUrl || draft.profile?.socials?.youtube || '@jaenalmaskunofficial3977'
  );

  const handleSyncYoutube = async (customChannel?: string) => {
    let channelId = (customChannel || channelSyncInput || draft.youtubeChannel?.channelId || draft.profile.socials?.youtube || '@jaenalmaskunofficial3977').trim();
    if (channelId.includes('@jaenalmaskun') && !channelId.includes('@jaenalmaskunofficial3977')) {
      channelId = '@jaenalmaskunofficial3977';
      setChannelSyncInput('@jaenalmaskunofficial3977');
    }

    setIsSyncingYoutube(true);
    onToast('🔄 Mengambil 15 video terbaru langsung dari saluran YouTube...');
    try {
      const data = await fetchYouTubeVideosUniversal(channelId);
      if (data.success && Array.isArray(data.videos) && data.videos.length > 0) {
        setDraft((prev) => ({
          ...prev,
          youtubeChannel: {
            ...prev.youtubeChannel,
            channelId: data.channelId || prev.youtubeChannel?.channelId || channelId,
            channelTitle: data.channelTitle || prev.youtubeChannel?.channelTitle || 'JAENAL MASKUN OFFICIAL',
            channelUrl: (channelId.startsWith('http') ? channelId : `https://youtube.com/${channelId}`),
            lastFetchedAt: new Date().toISOString(),
            videos: data.videos
          },
          youtubeVideos: data.videos
        }));
        setHasUnsavedChanges(true);
        onToast(`✅ Berhasil mengambil ${data.videos.length} video dari channel ${data.channelTitle || 'YouTube'}!`);
      } else {
        onToast(`⚠️ ${data.message || 'Gagal menyinkronkan video dari YouTube. Menggunakan daftar video bawaan.'}`);
      }
    } catch (err: any) {
      console.error('Error syncing YouTube in editor:', err);
      onToast('⚠️ Tidak dapat terhubung ke feed YouTube. Silakan coba kembali.');
    } finally {
      setIsSyncingYoutube(false);
    }
  };

  // Image upload helper
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>, targetField: 'avatar' | 'hero') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      onToast('Ukuran foto maksimal 15MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        if (targetField === 'avatar') {
          updateProfile('avatarUrl', base64);
          updateHero('heroImage', base64);
        } else {
          updateHero('heroImage', base64);
          updateProfile('avatarUrl', base64);
        }
        setHasUnsavedChanges(true);
        onToast('Foto dimuat. Mengunggah ke server...');

        try {
          const res = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64, type: targetField, filename: file.name })
          });
          const data = await res.json();
          if (res.ok && data.url) {
            if (targetField === 'avatar') {
              updateProfile('avatarUrl', data.url);
              updateHero('heroImage', data.url);
            } else {
              updateHero('heroImage', data.url);
              updateProfile('avatarUrl', data.url);
            }
            onToast('✅ Foto berhasil tersimpan permanen di server! Klik "Simpan Perubahan Publik".');
          }
        } catch (err) {
          console.warn('Direct upload fallback:', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Video thumbnail upload helper
  const handleVideoThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>, videoIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      onToast('Ukuran gambar thumbnail maksimal 15MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setDraft((prev) => {
          const cur = [...(prev.youtubeVideos || prev.youtubeChannel?.videos || [])];
          if (cur[videoIndex]) {
            cur[videoIndex] = {
              ...cur[videoIndex],
              thumbnailUrl: base64,
              thumbnail: base64
            };
          }
          return {
            ...prev,
            youtubeVideos: cur,
            youtubeChannel: { ...(prev.youtubeChannel || defaultYouTubeChannelConfig), videos: cur }
          };
        });
        setHasUnsavedChanges(true);
        onToast('Foto thumbnail dimuat. Mengunggah ke server...');

        try {
          const res = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64, type: 'video_thumb', filename: file.name })
          });
          const data = await res.json();
          if (res.ok && data.url) {
            setDraft((prev) => {
              const cur = [...(prev.youtubeVideos || prev.youtubeChannel?.videos || [])];
              if (cur[videoIndex]) {
                cur[videoIndex] = {
                  ...cur[videoIndex],
                  thumbnailUrl: data.url,
                  thumbnail: data.url
                };
              }
              return {
                ...prev,
                youtubeVideos: cur,
                youtubeChannel: { ...(prev.youtubeChannel || defaultYouTubeChannelConfig), videos: cur }
              };
            });
            onToast('✅ Thumbnail video berhasil diunggah & tersimpan di server!');
          }
        } catch (err) {
          console.warn('Direct upload thumbnail fallback:', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const videoThumbnailPresets = [
    { name: 'Kajian Madrasah', url: 'https://images.unsplash.com/photo-1584697964190-71c4c3b28b7e?auto=format&fit=crop&w=800&q=80' },
    { name: 'Mushaf Al-Qur\'an', url: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=800&q=80' },
    { name: 'Kelas & Diskusi', url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80' },
    { name: 'Inovasi Digital', url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80' },
    { name: 'Kubah Masjid', url: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=800&q=80' }
  ];

  const presetPhotos = [
    {
      name: 'Formal Pendidik',
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Akademisi Peci',
      url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Instruktur Inspiratif',
      url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Ustadz Khidmat',
      url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=800'
    }
  ];

  const handleSave = () => {
    onSaveContent(draft);
    setHasUnsavedChanges(false);
    setIsSaved(true);
    onToast('Alhamdulillah! Seluruh perubahan konten website berhasil disimpan dan aktif di halaman publik.');
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleReset = () => {
    if (confirm('Kembalikan semua teks & data konten website ke format bawaan awal?')) {
      setDraft(defaultSiteContent);
      onSaveContent(defaultSiteContent);
      setHasUnsavedChanges(false);
      onToast('Konten website telah direset ke bawaan default.');
    }
  };

  // Profile Updates
  const updateProfile = (key: keyof ProfileInfo, value: any) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        [key]: value
      }
    }));
  };

  const updateProfileSocial = (network: string, val: string) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        socials: {
          ...prev.profile.socials,
          [network]: val
        }
      }
    }));
  };

  const updateProfileStat = (index: number, key: 'label' | 'value' | 'subtext', val: string) => {
    setHasUnsavedChanges(true);
    const updated = [...draft.profile.stats];
    updated[index] = { ...updated[index], [key]: val };
    setDraft((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        stats: updated
      }
    }));
  };

  // Hero Updates
  const updateHero = (key: keyof HeroSettings, value: any) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => ({
      ...prev,
      heroSettings: {
        ...prev.heroSettings,
        [key]: value
      }
    }));
  };

  // Visibility Updates
  const updateVisibility = (key: keyof SectionVisibilityConfig, value: boolean) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => ({
      ...prev,
      visibility: {
        ...prev.visibility,
        [key]: value
      }
    }));
  };

  // Pillar Updates
  const updatePillar = (index: number, updates: Partial<PillarItem>) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => {
      const updated = [...prev.pillars];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, pillars: updated };
    });
  };

  // Experience Updates
  const updateExperience = (id: string, updates: Partial<ExperienceItem>) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => ({
      ...prev,
      experience: prev.experience.map((exp) => (exp.id === id ? { ...exp, ...updates } : exp))
    }));
  };

  const addExperience = () => {
    setHasUnsavedChanges(true);
    const newExp: ExperienceItem = {
      id: `exp-${Date.now()}`,
      period: '2026 - Sekarang',
      role: 'Jabatan / Peran Baru',
      organization: 'Nama Madrasah / Lembaga',
      description: 'Deskripsi dedikasi dan kontribusi pengabdian...',
      achievements: ['Capaian 1', 'Capaian 2'],
      type: 'Kepemimpinan'
    };
    setDraft((prev) => ({ ...prev, experience: [newExp, ...prev.experience] }));
    onToast('Item rekam jejak baru ditambahkan');
  };

  const deleteExperience = (id: string) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => ({ ...prev, experience: prev.experience.filter((e) => e.id !== id) }));
    onToast('Item rekam jejak dihapus');
  };

  // Publication Updates
  const updatePublication = (id: string, updates: Partial<Publication>) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => ({
      ...prev,
      publications: prev.publications.map((p) => (p.id === id ? { ...p, ...updates } : p))
    }));
  };

  const addPublication = () => {
    setHasUnsavedChanges(true);
    const newPub: Publication = {
      id: `pub-${Date.now()}`,
      title: 'Judul Modul / Karya Baru',
      category: 'Modul Pembelajaran',
      year: '2026',
      publisher: 'Madrasah Press & Kemenag',
      description: 'Deskripsi ringkas fokus keilmuan dan materi modul ajar...',
      tags: ['Kurikulum Merdeka', 'Madrasah', 'Inovasi'],
      featured: true,
      downloadCount: 0,
      isActive: true
    };
    setDraft((prev) => ({ ...prev, publications: [newPub, ...prev.publications] }));
    onToast('Karya/Modul baru ditambahkan');
  };

  const deletePublication = (id: string) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => ({ ...prev, publications: prev.publications.filter((p) => p.id !== id) }));
    onToast('Karya dihapus');
  };

  // Agenda Updates
  const updateAgenda = (id: string, updates: Partial<AgendaItem>) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => ({
      ...prev,
      agenda: prev.agenda.map((a) => (a.id === id ? { ...a, ...updates } : a))
    }));
  };

  const handleAgendaFileUpload = async (agendaId: string, file: File) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      alert('Ukuran berkas maksimal 25 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
        const bytes = file.size;
        let formattedSize = `${bytes} B`;
        if (bytes >= 1024 * 1024) formattedSize = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        else if (bytes >= 1024) formattedSize = `${(bytes / 1024).toFixed(0)} KB`;

        updateAgenda(agendaId, {
          fileUrl: base64,
          fileName: file.name,
          fileSize: formattedSize,
          fileType: ext
        });

        onToast(`Mengunggah "${file.name}" ke server...`);

        try {
          const res = await fetch('/api/upload-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: base64, filename: file.name, type: 'agenda' })
          });
          const data = await res.json();
          if (res.ok && data.url) {
            updateAgenda(agendaId, {
              fileUrl: data.url,
              fileName: data.filename || file.name,
              fileSize: data.fileSize || formattedSize,
              fileType: data.fileType || ext
            });
            onToast(`✅ Berkas "${file.name}" berhasil tersimpan di server.`);
          }
        } catch (err) {
          console.warn('Direct upload fallback:', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAgendaFlyerUpload = async (agendaId: string, file: File) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert('Ukuran gambar flyer maksimal 15 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        updateAgenda(agendaId, { imageUrl: base64 });
        onToast('Mengunggah flyer poster ke server...');

        try {
          const res = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64, type: 'agenda_flyer', filename: file.name })
          });
          const data = await res.json();
          if (res.ok && data.url) {
            updateAgenda(agendaId, { imageUrl: data.url });
            onToast(`✅ Poster flyer berhasil tersimpan di server.`);
          }
        } catch (err) {
          console.warn('Direct upload fallback:', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const addAgenda = () => {
    setHasUnsavedChanges(true);
    const newAg: AgendaItem = {
      id: `ag-${Date.now()}`,
      title: 'Kajian / Pelatihan Guru Baru',
      date: '25 Agustus 2026',
      time: '08:30 - 11:30 WIB',
      location: 'Aula Madrasah Aliyah Negeri',
      type: 'Kajian Kitab',
      status: 'Akan Datang'
    };
    setDraft((prev) => ({ ...prev, agenda: [newAg, ...prev.agenda] }));
    onToast('Agenda baru ditambahkan');
  };

  const deleteAgenda = (id: string) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => ({ ...prev, agenda: prev.agenda.filter((a) => a.id !== id) }));
    onToast('Agenda dihapus');
  };

  const [newCategoryInput, setNewCategoryInput] = useState('');

  const handleAddCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = draft.agendaCategories || defaultAgendaCategories;
    if (current.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      onToast(`Kategori "${trimmed}" sudah ada`);
      return;
    }
    setHasUnsavedChanges(true);
    setDraft((prev) => ({
      ...prev,
      agendaCategories: [...(prev.agendaCategories || defaultAgendaCategories), trimmed]
    }));
    setNewCategoryInput('');
    onToast(`✅ Kategori "${trimmed}" berhasil ditambahkan`);
  };

  const handleDeleteCategory = (catToDelete: string) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => ({
      ...prev,
      agendaCategories: (prev.agendaCategories || defaultAgendaCategories).filter(
        (c) => c.toLowerCase() !== catToDelete.toLowerCase()
      )
    }));
    onToast(`Kategori "${catToDelete}" dihapus`);
  };

  // Gallery Updates
  const updateGallery = (id: string, updates: Partial<GalleryItem>) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => {
      let found = false;
      const updated = prev.gallery.map((g) => {
        if (g.id === id) {
          found = true;
          return { ...g, ...updates };
        }
        return g;
      });
      if (!found) {
        return {
          ...prev,
          gallery: [
            {
              id,
              title: 'Dokumentasi Aktivitas Santri',
              category: 'Kegiatan Belajar',
              image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=800',
              videoUrl: '',
              description: 'Deskripsi kegiatan madrasah.',
              ...updates
            },
            ...prev.gallery
          ]
        };
      }
      return { ...prev, gallery: updated };
    });
  };

  const handleManualVideoUpload = async (targetId: string, file: File) => {
    if (!file) return;

    setUploadingVideoId(targetId);
    setVideoUploadProgress({ percent: 5, status: `Mempersiapkan "${file.name}"...` });

    try {
      const currentTitle = draftRef.current.gallery.find((g) => g.id === targetId)?.title || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const result = await uploadVideoToServer(file, {
        title: currentTitle,
        onProgress: (percent, status) => {
          setVideoUploadProgress({ percent, status });
        }
      });

      const fallbackThumb = 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=800';
      const resolvedThumb = result.thumbnailUrl || fallbackThumb;

      // 1. Update draft in state and trigger immediate server persistence
      setDraft((prev) => {
        let exists = false;
        const newGallery = prev.gallery.map((g) => {
          if (g.id === targetId) {
            exists = true;
            return {
              ...g,
              videoUrl: result.url,
              image: resolvedThumb || g.image || fallbackThumb
            };
          }
          return g;
        });

        if (!exists) {
          newGallery.unshift({
            id: targetId,
            title: currentTitle,
            category: 'Kegiatan Belajar',
            videoUrl: result.url,
            image: resolvedThumb,
            description: 'Dokumentasi video kegiatan madrasah yang dapat diputar langsung di galeri dan Kapsul Ajaib smartphone.'
          });
        }

        const updatedFullDraft: SiteContentConfig = {
          ...prev,
          gallery: newGallery
        };

        // 2. Guaranteed immediate save to server & localStorage
        if (onSaveContentRef.current) {
          onSaveContentRef.current(updatedFullDraft);
        }

        return updatedFullDraft;
      });

      setHasUnsavedChanges(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);

      onToast(`✅ Video "${file.name}" (${result.fileSize}) berhasil diunggah & otomatis tersimpan di Modul Galeri!`);
    } catch (err: any) {
      console.error('Error uploading video:', err);
      onToast(`❌ Gagal mengunggah video: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setUploadingVideoId(null);
      setVideoUploadProgress({ percent: 0, status: '' });
    }
  };

  const addGallery = () => {
    setHasUnsavedChanges(true);
    const newG: GalleryItem = {
      id: `gal-${Date.now()}`,
      title: 'Dokumentasi Aktivitas Santri',
      category: 'Kegiatan Belajar',
      image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=800',
      videoUrl: '',
      description: 'Deskripsi singkat suasana dan momentum kegiatan.'
    };
    setDraft((prev) => ({ ...prev, gallery: [newG, ...prev.gallery] }));
    onToast('Item galeri baru ditambahkan (bisa foto atau link video)');
  };

  const deleteGallery = (id: string) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => {
      const updatedGallery = prev.gallery.filter((g) => g.id !== id);
      const updatedDraft = { ...prev, gallery: updatedGallery };
      if (onSaveContentRef.current) {
        onSaveContentRef.current(updatedDraft);
      }
      return updatedDraft;
    });
    onToast('Foto/Video galeri dihapus');
  };

  // Education Updates
  const updateEducation = (index: number, updates: Partial<EducationItem>) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => {
      const updated = [...prev.education];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, education: updated };
    });
  };

  const addEducation = () => {
    setHasUnsavedChanges(true);
    const newEdu: EducationItem = {
      degree: 'Gelar / Jenjang Baru',
      institution: "Nama Universitas / Ma'had",
      field: 'Bidang Studi',
      year: 'Tahun Kelulusan'
    };
    setDraft((prev) => ({ ...prev, education: [...prev.education, newEdu] }));
  };

  const deleteEducation = (index: number) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => ({ ...prev, education: prev.education.filter((_, i) => i !== index) }));
  };

  // Quote Updates
  const updateQuote = (index: number, updates: Partial<QuoteItem>) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => {
      const updated = [...prev.quotes];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, quotes: updated };
    });
  };

  const addQuote = () => {
    setHasUnsavedChanges(true);
    const newQ: QuoteItem = {
      id: `q-${Date.now()}`,
      arabicText: 'طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ',
      translation: 'Menuntut ilmu itu wajib atas setiap muslim.',
      source: 'HR. Ibnu Majah',
      theme: 'Kewajiban Menuntut Ilmu'
    };
    setDraft((prev) => ({ ...prev, quotes: [...prev.quotes, newQ] }));
  };

  const deleteQuote = (index: number) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => ({ ...prev, quotes: prev.quotes.filter((_, i) => i !== index) }));
  };

  // JSON Export / Import
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(draft, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `madrasah-site-content-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onToast('Berkas JSON cadangan konten website berhasil diunduh!');
  };

  const handleImportJson = () => {
    try {
      setJsonError('');
      const parsed = JSON.parse(jsonInput);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Format JSON tidak valid');
      }
      setDraft({
        profile: { ...defaultSiteContent.profile, ...(parsed.profile || {}) },
        education: parsed.education || defaultSiteContent.education,
        pillars: parsed.pillars || defaultSiteContent.pillars,
        quotes: parsed.quotes || defaultSiteContent.quotes,
        publications: parsed.publications || defaultSiteContent.publications,
        experience: parsed.experience || parsed.experiences || defaultSiteContent.experience,
        agenda: parsed.agenda || defaultSiteContent.agenda,
        gallery: parsed.gallery || defaultSiteContent.gallery,
        visibility: { ...defaultSiteContent.visibility, ...(parsed.visibility || {}) },
        heroSettings: { ...defaultSiteContent.heroSettings, ...(parsed.heroSettings || {}) }
      });
      onToast('Data JSON berhasil dimuat ke editor! Klik "Simpan Perubahan Publik" untuk mengaktifkannya.');
    } catch (e: any) {
      setJsonError('Gagal memproses JSON: ' + e.message);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header Banner & Save Action Bar */}
      <div className="bg-gradient-to-r from-[#064e3b] via-[#043327] to-[#064e3b] rounded-3xl p-6 sm:p-8 text-white border-2 border-amber-500/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-bold uppercase tracking-wider mb-2">
            <Edit2 className="w-3.5 h-3.5 text-amber-300" />
            <span>Full Edit Konten Halaman Publik</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
            Kelola & Ubah Seluruh Halaman Website
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-2xl font-light">
            Sesuaikan identitas, salam hero, biografi, riwayat pendidikan, 4 pilar madrasah, karya & modul ajar, agenda pengajian, linimasa pengabdian, galeri foto, kontak WhatsApp, dan visibilitas seksi.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-100 text-xs font-bold transition-colors cursor-pointer border border-white/20"
            >
              Lihat Halaman Publik
            </button>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Bawaan</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-emerald-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-900/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan Publik</span>
          </button>
        </div>
      </div>

      {isSaved && (
        <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>Perubahan telah tersimpan dan langsung aktif di seluruh halaman website publik!</span>
        </div>
      )}

      {/* Sub-tabs Navigation - Grid Dua Kolom Kiri Kanan */}
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-700" />
            <span>Pilih Bagian Konten Website yang Ingin Diubah (Grid 2 Kolom)</span>
          </span>
          <span className="text-[11px] text-gray-500 font-medium hidden sm:inline">11 Bagian Tersedia</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {[
            { id: 'profile', label: '1. Profil & Identitas', sub: 'Nama, Gelar & Foto', icon: User },
            { id: 'hero', label: '2. Banner (Hero)', sub: 'Slogan & CTA Web', icon: Sparkles },
            { id: 'about', label: '3. Bio & Riwayat', sub: 'Pendidikan & Quotes', icon: GraduationCap },
            { id: 'pillars', label: '4. Pilar Madrasah', sub: '4 Pilar Nilai', icon: Layers },
            { id: 'karya', label: `5. Karya & Modul`, sub: `${draft.publications.length} Item Karya`, icon: BookOpen },
            { id: 'mediachannel', label: `6. Siaran Media & Kanal`, sub: `${(draft.youtubeVideos || draft.youtubeChannel?.videos || []).length} Video Siaran`, icon: Video },
            { 
              id: 'experiences', 
              label: `7. Rekam Jejak`, 
              sub: `${draft.experience.filter(e => e.isActive !== false).length}/${draft.experience.length} Periode Aktif`, 
              icon: Award 
            },
            { id: 'agenda', label: `8. Agenda & Jadwal`, sub: `${draft.agenda.length} Jadwal Kajian`, icon: Calendar },
            { id: 'gallery', label: `9. Galeri Foto & Liputan`, sub: `${draft.gallery.length} Foto & Media`, icon: Camera },
            { id: 'kontak', label: '10. Kontak & WA', sub: 'Nomor WhatsApp', icon: Phone },
            { id: 'visibility', label: '11. Visibilitas', sub: 'Sakelar Seksi', icon: Eye },
            { id: 'backup', label: '12. Cadangan JSON', sub: 'Impor & Ekspor', icon: Download }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`p-2.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer text-left border ${
                  isActive
                    ? 'bg-[#064e3b] text-amber-300 shadow-md border-amber-400/60 ring-1 ring-amber-400/40'
                    : 'bg-white text-gray-700 hover:bg-emerald-50 hover:text-emerald-900 border-gray-200 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-emerald-950/80 text-amber-300' : 'bg-emerald-50 text-emerald-800'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate font-bold text-xs">{tab.label}</span>
                    <span className={`block text-[10px] truncate font-medium ${
                      isActive ? 'text-emerald-200' : 'text-gray-400'
                    }`}>{tab.sub}</span>
                  </div>
                </div>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: PROFIL & IDENTITAS UTAMA */}
      {/* ========================================================================= */}
      {activeSubTab === 'profile' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-900/10 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-lg font-bold text-[#064e3b]">Identitas Pribadi & Gelar Keilmuan</h3>
              <p className="text-xs text-gray-500">
                Data ini akan muncul di Header, Hero Section, Tentang Penulis, dan Footer.
              </p>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full uppercase">
              Tampil Utama
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Nama Lengkap & Gelar Resmi
              </label>
              <input
                type="text"
                value={draft.profile.title}
                onChange={(e) => updateProfile('title', e.target.value)}
                placeholder="Contoh: Ust. Jaenal Maskun, S.Pd.I., M.Pd."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Nama Panggilan Singkat
              </label>
              <input
                type="text"
                value={draft.profile.name}
                onChange={(e) => updateProfile('name', e.target.value)}
                placeholder="Contoh: Jaenal Maskun"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Nama Arab (Kaligrafi / Tulisan Arab)
              </label>
              <input
                type="text"
                dir="rtl"
                value={draft.profile.arabicName}
                onChange={(e) => updateProfile('arabicName', e.target.value)}
                placeholder="جَيْنَال مَسْكُون"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-base font-arabic focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Gelar Akademik
              </label>
              <input
                type="text"
                value={draft.profile.degrees}
                onChange={(e) => updateProfile('degrees', e.target.value)}
                placeholder="S.Pd.I. (UIN Sunan Kalijaga), M.Pd. (UPI)"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Peran / Jabatan Utama
              </label>
              <input
                type="text"
                value={draft.profile.role}
                onChange={(e) => updateProfile('role', e.target.value)}
                placeholder="Pendidik, Pengembang Kurikulum & Instruktur Guru Madrasah"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Institusi / Lembaga Induk
                </label>
                <span className="text-[10px] text-emerald-700 bg-emerald-100 font-semibold px-2 py-0.5 rounded-full">
                  Tampil di Foto Hero & Profil
                </span>
              </div>
              <input
                type="text"
                value={draft.profile.institution}
                onChange={(e) => updateProfile('institution', e.target.value)}
                placeholder="Kementerian Agama RI & Komunitas Pendidik Madrasah"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Teks ini yang menjadi label lembaga di bawah bingkai foto hero utama dan kartu identitas pendidik.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Lokasi Domisili
              </label>
              <input
                type="text"
                value={draft.profile.location}
                onChange={(e) => updateProfile('location', e.target.value)}
                placeholder="Jawa Barat, Indonesia"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-700" />
                  <span>Foto Utama Pendidik (Hero & Profil)</span>
                </label>
                {draft.profile.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      updateProfile('avatarUrl', '');
                      updateHero('heroImage', '');
                      onToast('Foto profil dikosongkan.');
                    }}
                    className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Foto</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                {/* Photo Preview */}
                <div className="sm:col-span-3 flex justify-center">
                  <div className="w-24 h-32 rounded-xl overflow-hidden bg-emerald-900 border-2 border-amber-400 shadow-md relative group flex items-center justify-center">
                    {draft.profile.avatarUrl ? (
                      <img
                        src={draft.profile.avatarUrl}
                        alt="Preview Foto"
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="text-center p-2">
                        <User className="w-8 h-8 text-amber-300 mx-auto mb-1 opacity-80" />
                        <span className="text-[10px] text-emerald-200">Belum ada foto</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Actions & URL input */}
                <div className="sm:col-span-9 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-4 py-2 rounded-xl bg-[#064e3b] hover:bg-[#043327] text-amber-300 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all">
                      <Upload className="w-4 h-4" />
                      <span>Upload dari Galeri / Kamera</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageFileUpload(e, 'avatar')}
                      />
                    </label>

                    <span className="text-xs text-gray-500 font-medium">atau gunakan tautan URL:</span>
                  </div>

                  <input
                    type="text"
                    value={draft.profile.avatarUrl || ''}
                    onChange={(e) => {
                      updateProfile('avatarUrl', e.target.value);
                      updateHero('heroImage', e.target.value);
                    }}
                    placeholder="https://images.unsplash.com/... atau tautan foto langsung"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-emerald-700 bg-white"
                  />

                  {/* Preset Photos Selection */}
                  <div>
                    <span className="text-[11px] font-semibold text-gray-600 block mb-1.5">
                      Pilihan Cepat Foto Pendidik Islami:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {presetPhotos.map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => {
                            updateProfile('avatarUrl', preset.url);
                            updateHero('heroImage', preset.url);
                            onToast(`Foto preset "${preset.name}" dipilih`);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                            draft.profile.avatarUrl === preset.url
                              ? 'bg-emerald-800 text-amber-300 border-amber-400 shadow-xs'
                              : 'bg-white text-gray-700 hover:bg-emerald-100/60 border-gray-300'
                          }`}
                        >
                          <img src={preset.url} alt={preset.name} className="w-4 h-4 rounded-full object-cover" />
                          <span>{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Tagline Singkat Keilmuan
              </label>
              <input
                type="text"
                value={draft.profile.tagline}
                onChange={(e) => updateProfile('tagline', e.target.value)}
                placeholder="Menghubungkan mata rantai tradisi keilmuan Islam nusantara dengan kecakapan abad ke-21..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Motto Hidup & Dakwah
              </label>
              <input
                type="text"
                value={draft.profile.motto}
                onChange={(e) => updateProfile('motto', e.target.value)}
                placeholder="Ilmu yang Amaliyah, Amal yang Ilmiah, Berakhlakul Karimah."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none font-serif italic"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Biografi Ringkas & Visi Pendidikan
              </label>
              <textarea
                rows={4}
                value={draft.profile.bio}
                onChange={(e) => updateProfile('bio', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* 4 Capaian Statistik */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <h4 className="text-sm font-bold text-[#064e3b] uppercase tracking-wider">
              4 Angka Statistik & Rekam Jejak (Hero Section)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {draft.profile.stats.map((st, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                  <span className="text-[10px] font-bold text-emerald-900 uppercase">Statistik #{idx + 1}</span>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600">Nilai / Angka</label>
                    <input
                      type="text"
                      value={st.value}
                      onChange={(e) => updateProfileStat(idx, 'value', e.target.value)}
                      className="w-full px-2 py-1 rounded-lg border border-gray-300 text-sm font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600">Label Judul</label>
                    <input
                      type="text"
                      value={st.label}
                      onChange={(e) => updateProfileStat(idx, 'label', e.target.value)}
                      className="w-full px-2 py-1 rounded-lg border border-gray-300 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600">Keterangan Singkat</label>
                    <input
                      type="text"
                      value={st.subtext}
                      onChange={(e) => updateProfileStat(idx, 'subtext', e.target.value)}
                      className="w-full px-2 py-1 rounded-lg border border-gray-300 text-[11px] bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Save Bar for Subtab 1 */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Perubahan pada nama, gelar, dan bio akan langsung tersinkronisasi ke server & perangkat lain.
            </p>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-[#064e3b] text-amber-300 hover:bg-[#043327] font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>Simpan Identitas & Bio</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: TEKS BANNER (HERO) */}
      {/* ========================================================================= */}
      {activeSubTab === 'hero' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-900/10 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#064e3b]">Pengaturan Banner Utama (Hero Section)</h3>
            <p className="text-xs text-gray-500">
              Kustomisasi salam pembuka, teks lencana, dan tombol aksi di bagian paling atas website.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Salam Pembuka Utama
              </label>
              <input
                type="text"
                value={draft.heroSettings.greetingTitle}
                onChange={(e) => updateHero('greetingTitle', e.target.value)}
                placeholder="Assalamu’alaikum Warahmatullahi Wabarakatuh"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Sub-salam / Kalimat Sambutan
              </label>
              <input
                type="text"
                value={draft.heroSettings.greetingSub}
                onChange={(e) => updateHero('greetingSub', e.target.value)}
                placeholder="Selamat datang di ruang silaturahmi & khazanah keilmuan madrasah"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-800 text-white space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Teks Lencana (Hero Badge)
                </label>
                <span className="text-[10px] text-emerald-300 bg-emerald-900/80 px-2 py-0.5 rounded-full border border-emerald-700">
                  Tampil di Banner Atas
                </span>
              </div>
              <input
                type="text"
                value={draft.heroSettings.badgeText}
                onChange={(e) => updateHero('badgeText', e.target.value)}
                placeholder="Contoh: Pendidik Madrasah / Guru Teladan / Akademisi"
                className="w-full px-4 py-2.5 rounded-xl border border-emerald-700 bg-emerald-900/60 text-white text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none placeholder:text-emerald-400/60 font-medium"
              />
              {/* Live Preview Box */}
              <div className="pt-2 border-t border-emerald-800/80">
                <p className="text-[10px] text-emerald-300 font-semibold mb-1.5">
                  Pratinjau Langsung Lencana di Halaman Publik:
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800/80 border border-amber-400/40 text-amber-300 text-xs font-medium shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{draft.heroSettings.badgeText || 'Pendidik Madrasah'}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-900 border border-amber-400/30 text-amber-300 text-[11px] font-bold">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    <span>{draft.heroSettings.badgeText || 'Pendidik Madrasah'}</span>
                  </div>
                </div>
                <p className="text-[10px] text-emerald-400/80 mt-1.5 leading-relaxed">
                  💡 <strong>Catatan:</strong> Teks ini akan tampil sebagai lencana berkilau di atas nama Ustadz pada Hero Section dan di kartu profil kanan. Pastikan klik <strong>"Simpan Perubahan Publik"</strong> di pojok kanan atas setelah selesai mengedit.
                </p>
              </div>
            </div>

            {/* Hero Portrait Photo Customizer */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-700" />
                  <span>Foto Gambar di Hero Utama</span>
                </label>
                {draft.heroSettings.heroImage && (
                  <button
                    type="button"
                    onClick={() => {
                      updateHero('heroImage', '');
                      updateProfile('avatarUrl', '');
                      onToast('Foto hero dikosongkan.');
                    }}
                    className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Foto Hero</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                {/* Photo Preview */}
                <div className="sm:col-span-3 flex justify-center">
                  <div className="w-28 h-36 rounded-xl overflow-hidden bg-emerald-900 border-2 border-amber-400 shadow-md relative group flex flex-col items-center justify-center">
                    {draft.heroSettings.heroImage || draft.profile.avatarUrl ? (
                      <>
                        <img
                          src={draft.heroSettings.heroImage || draft.profile.avatarUrl}
                          alt="Preview Foto Hero"
                          className="w-full h-full object-cover object-top"
                        />
                        {/* Floating Emblem Tag Live Preview */}
                        <div className="absolute bottom-1 inset-x-1 text-center">
                          <span className="inline-block text-[8px] uppercase font-bold tracking-wider text-amber-200 bg-emerald-950/95 px-1.5 py-0.5 rounded-full border border-amber-400/40 shadow-xs max-w-full truncate">
                            {draft.heroSettings.photoBadgeText || draft.profile.institution || 'Penggerak Madrasah'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-2">
                        <User className="w-8 h-8 text-amber-300 mx-auto mb-1 opacity-80" />
                        <span className="text-[10px] text-emerald-200">Belum ada foto</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Actions & URL input */}
                <div className="sm:col-span-9 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-4 py-2 rounded-xl bg-[#064e3b] hover:bg-[#043327] text-amber-300 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all">
                      <Upload className="w-4 h-4" />
                      <span>Upload dari File / Galeri</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageFileUpload(e, 'hero')}
                      />
                    </label>

                    <span className="text-xs text-gray-500 font-medium">atau URL gambar:</span>
                  </div>

                  <input
                    type="text"
                    value={draft.heroSettings.heroImage || draft.profile.avatarUrl || ''}
                    onChange={(e) => {
                      updateHero('heroImage', e.target.value);
                      updateProfile('avatarUrl', e.target.value);
                    }}
                    placeholder="https://images.unsplash.com/... atau tautan gambar langsung"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-emerald-700 bg-white"
                  />

                  {/* Tag Lembaga pada Foto Customizer */}
                  <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                        Teks Label Lembaga pada Foto Hero
                      </label>
                      <span className="text-[10px] text-amber-700 bg-amber-50 font-bold px-2 py-0.5 rounded border border-amber-200">
                        Tag Bingkai Foto
                      </span>
                    </div>
                    <input
                      type="text"
                      value={draft.heroSettings.photoBadgeText || ''}
                      onChange={(e) => updateHero('photoBadgeText', e.target.value)}
                      placeholder={draft.profile.institution || 'Contoh: Penggerak Madrasah / Yayasan Pendidikan'}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                    />
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      💡 Mengubah tulisan label yang melayang di bagian bawah bingkai foto Ustadz. Jika dikosongkan, otomatis menggunakan nama <em>Institusi / Lembaga Induk</em> ({draft.profile.institution || 'Pendidikan Islam'}).
                    </p>
                  </div>

                  {/* Preset Selection */}
                  <div>
                    <span className="text-[11px] font-semibold text-gray-600 block mb-1.5">
                      Pilihan Gambar Rekomendasi Hero:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {presetPhotos.map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => {
                            updateHero('heroImage', preset.url);
                            updateProfile('avatarUrl', preset.url);
                            onToast(`Foto Hero "${preset.name}" dipilih`);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                            (draft.heroSettings.heroImage || draft.profile.avatarUrl) === preset.url
                              ? 'bg-emerald-800 text-amber-300 border-amber-400 shadow-xs'
                              : 'bg-white text-gray-700 hover:bg-emerald-100/60 border-gray-300'
                          }`}
                        >
                          <img src={preset.url} alt={preset.name} className="w-4 h-4 rounded-full object-cover" />
                          <span>{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <label className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-gray-50 cursor-pointer hover:bg-emerald-50">
                <input
                  type="checkbox"
                  checked={draft.heroSettings.showStats}
                  onChange={(e) => updateHero('showStats', e.target.checked)}
                  className="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-600"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Tampilkan 4 Kotak Statistik</span>
                  <span className="text-[11px] text-gray-500">Menampilkan angka pengalaman, modul, dan santri binaan.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-gray-50 cursor-pointer hover:bg-emerald-50">
                <input
                  type="checkbox"
                  checked={draft.heroSettings.showDownloadCV}
                  onChange={(e) => updateHero('showDownloadCV', e.target.checked)}
                  className="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-600"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Tampilkan Tombol Unduh Profil/CV</span>
                  <span className="text-[11px] text-gray-500">Memungkinkan pengunjung mengunduh ringkasan portofolio.</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: BIO, PENDIDIKAN & QUOTES */}
      {/* ========================================================================= */}
      {activeSubTab === 'about' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-900/10 shadow-sm space-y-8">
          {/* Biografi Ringkas & Visi Pendidikan Section */}
          <div className="space-y-4 bg-emerald-50/50 p-5 sm:p-6 rounded-2xl border border-emerald-200">
            <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#064e3b] flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-700" />
                  <span>Biografi Ringkas & Visi Pendidikan (Bio)</span>
                </h3>
                <p className="text-xs text-gray-600">
                  Teks narasi profil utama yang tampil di beranda dan seksi 'Tentang Penulis' (Biografi & Visi Keilmuan).
                </p>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-2.5 py-1 rounded-full uppercase">
                Tampil Utama Publik
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Teks Biografi & Komitmen Pendidikan
              </label>
              <textarea
                rows={5}
                value={draft.profile.bio}
                onChange={(e) => updateProfile('bio', e.target.value)}
                placeholder="Tuliskan biografi ringkas, kiprah pendidikan, dan komitmen visi madrasah..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none leading-relaxed bg-white shadow-xs"
              />
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <span>Tips: Anda dapat menekan Enter dua kali untuk memisahkan paragraf.</span>
                <span className="font-semibold text-emerald-800">{draft.profile.bio?.length || 0} Karakter</span>
              </div>
            </div>

            {/* Live Preview */}
            <div className="bg-white p-4 rounded-xl border border-emerald-200 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Pratinjau Teks Bio di Halaman Publik:</span>
              </div>
              <div className="text-xs text-gray-700 leading-relaxed italic whitespace-pre-line bg-gray-50 p-3 rounded-lg border border-gray-100">
                {draft.profile.bio || "Belum ada teks biografi. Silakan ketik di kotak di atas."}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-[#064e3b] text-amber-300 hover:bg-[#043327] font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Save className="w-4 h-4 text-amber-400" />
                <span>Simpan Perubahan Bio</span>
              </button>
            </div>
          </div>

          {/* Riwayat Pendidikan */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div>
                <h3 className="text-lg font-bold text-[#064e3b] flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-emerald-700" />
                  <span>Riwayat Pendidikan & Sanad Keilmuan</span>
                </h3>
                <p className="text-xs text-gray-500">Daftar jenjang sarjana, magister, pesantren, atau ma'had aly.</p>
              </div>
              <button
                type="button"
                onClick={addEducation}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-800 text-amber-200 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Pendidikan</span>
              </button>
            </div>

            <div className="space-y-3">
              {draft.education.map((edu, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 relative group">
                  <button
                    type="button"
                    onClick={() => deleteEducation(idx)}
                    className="absolute top-3 right-3 text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pr-8">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Gelar / Jenjang</label>
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => updateEducation(idx, { degree: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Lembaga / Kampus / Pesantren</label>
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) => updateEducation(idx, { institution: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Tahun / Periode</label>
                      <input
                        type="text"
                        value={edu.year}
                        onChange={(e) => updateEducation(idx, { year: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="mt-2.5 pr-8">
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Konsentrasi / Fokus Keilmuan / Predikat</label>
                    <input
                      type="text"
                      placeholder="Contoh: Konsentrasi Manajemen Pendidikan Islam & Kurikulum (Cum Laude)"
                      value={edu.focus || edu.field || ''}
                      onChange={(e) => updateEducation(idx, { focus: e.target.value, field: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white text-gray-800 focus:ring-2 focus:ring-emerald-700 font-medium"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quotes Mutiara Hikmah */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div>
                <h3 className="text-lg font-bold text-[#064e3b] flex items-center gap-2">
                  <QuoteIcon className="w-5 h-5 text-amber-600" />
                  <span>Kutipan Mutiara Hikmah Al-Qur'an & Hadis</span>
                </h3>
                <p className="text-xs text-gray-500">Mutiara hikmah bergilir yang tampil di bagian profil & fitur Islami.</p>
              </div>
              <button
                type="button"
                onClick={addQuote}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-emerald-950 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-400"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Quote</span>
              </button>
            </div>

            <div className="space-y-4">
              {draft.quotes.map((q, idx) => (
                <div key={q.id || idx} className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 relative">
                  <button
                    type="button"
                    onClick={() => deleteQuote(idx)}
                    className="absolute top-3 right-3 text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="space-y-2.5 pr-8">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Teks Bahasa Arab</label>
                      <input
                        type="text"
                        dir="rtl"
                        value={q.arabicText}
                        onChange={(e) => updateQuote(idx, { arabicText: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-amber-300 text-base font-arabic bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Terjemahan Arti</label>
                        <input
                          type="text"
                          value={q.translation}
                          onChange={(e) => updateQuote(idx, { translation: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-amber-300 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Sumber Perawi / Kitab</label>
                        <input
                          type="text"
                          value={q.source}
                          onChange={(e) => updateQuote(idx, { source: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-amber-300 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Save Bar for Subtab 3 */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Perubahan pada bio, riwayat pendidikan, dan mutiara hikmah akan langsung disimpan.
            </p>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-[#064e3b] text-amber-300 hover:bg-[#043327] font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>Simpan Bio, Pendidikan & Quotes</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: EMPAT PILAR MADRASAH */}
      {/* ========================================================================= */}
      {activeSubTab === 'pillars' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-900/10 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#064e3b]">Empat Pilar Transformasi Madrasah</h3>
            <p className="text-xs text-gray-500">
              Konsep holistik nilai-nilai luhur pendidikan Islam yang menjadi ciri khas madrasah.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {draft.pillars.map((pillar, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 uppercase">Pilar #{idx + 1}</span>
                  <span className="text-[11px] font-mono text-gray-400">0{idx + 1}</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Pilar</label>
                  <input
                    type="text"
                    value={pillar.title}
                    onChange={(e) => updatePillar(idx, { title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Istilah Arab</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={pillar.arabic}
                    onChange={(e) => updatePillar(idx, { arabic: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-gray-300 text-sm font-arabic bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Deskripsi Pilar</label>
                  <textarea
                    rows={3}
                    value={pillar.desc}
                    onChange={(e) => updatePillar(idx, { desc: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white leading-relaxed"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 5: KARYA & PUBLIKASI */}
      {/* ========================================================================= */}
      {activeSubTab === 'karya' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-900/10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-[#064e3b] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-700" />
                <span>Karya Tulis, Modul Ajar & Publikasi</span>
              </h3>
              <p className="text-xs text-gray-500">
                Kelola buku, modul pembelajaran kurikulum, artikel, dan jurnal riset pendidikan. Anda dapat mengaktifkan atau menonaktifkan penayangan masing-masing karya secara terpisah di bawah ini.
              </p>
            </div>
            <button
              type="button"
              onClick={addPublication}
              className="px-4 py-2.5 rounded-xl bg-emerald-800 text-amber-200 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-700 shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Karya Baru</span>
            </button>
          </div>

          {/* Master Module Visibility Card */}
          <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            draft.visibility?.publications !== false
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
              : 'bg-amber-50/70 border-amber-300 text-amber-950'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                draft.visibility?.publications !== false
                  ? 'bg-emerald-800 text-amber-300'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold block">
                  Status Seksi Modul Karya di Website Publik: {draft.visibility?.publications !== false ? 'AKTIF (DITAMPILKAN)' : 'NONAKTIF (DISEMBUNYIKAN)'}
                </span>
                <span className="text-[11px] text-gray-600">
                  {draft.visibility?.publications !== false
                    ? 'Bagian Karya & Modul Pembelajaran sedang tayang di halaman utama website.'
                    : 'Seluruh bagian Karya & Modul Pembelajaran disembunyikan dari halaman utama.'}
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={draft.visibility?.publications !== false}
                onChange={(e) => updateVisibility('publications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-800"></div>
            </label>
          </div>

          <div className="space-y-4">
            {draft.publications.map((pub, idx) => {
              const isItemActive = pub.isActive !== false;
              return (
                <div 
                  key={pub.id} 
                  className={`p-5 rounded-2xl border-2 transition-all space-y-4 relative ${
                    isItemActive
                      ? 'bg-white border-emerald-900/15 shadow-xs'
                      : 'bg-gray-50/80 border-dashed border-gray-300 opacity-80'
                  }`}
                >
                  {/* Top Bar for Each Publication Item: Index, Title, Status Badge, Toggle Button & Delete Button */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-extrabold text-gray-900 line-clamp-1 max-w-[280px] sm:max-w-md">
                        {pub.title || 'Karya Baru'}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                        isItemActive
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {isItemActive ? '✅ Aktif (Tampil di Web)' : '⛔ Nonaktif (Disembunyikan)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Tombol Sakelar Aktifkan / Nonaktifkan Per Item */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextStatus = !isItemActive;
                          updatePublication(pub.id, { isActive: nextStatus });
                          onToast(
                            nextStatus 
                              ? `✅ Karya "${pub.title || 'Modul'}" DIAKTIFKAN di halaman publik` 
                              : `⛔ Karya "${pub.title || 'Modul'}" DINONAKTIFKAN dari halaman publik`
                          );
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                          isItemActive
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}
                      >
                        {isItemActive ? 'Sembunyikan' : 'Aktifkan'}
                      </button>

                      <button
                        type="button"
                        onClick={() => deletePublication(pub.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                        title="Hapus karya ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Karya / Modul *</label>
                      <input
                        type="text"
                        value={pub.title}
                        onChange={(e) => updatePublication(pub.id, { title: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Kategori</label>
                      <select
                        value={pub.category}
                        onChange={(e) => updatePublication(pub.id, { category: e.target.value as any })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                      >
                        <option value="Modul Pembelajaran">Modul Pembelajaran</option>
                        <option value="Buku">Buku & Referensi</option>
                        <option value="Jurnal & Riset">Jurnal & Riset</option>
                        <option value="Opini & Artikel">Opini & Artikel</option>
                        <option value="Panduan Guru">Panduan Guru</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Tahun Terbit</label>
                      <input
                        type="text"
                        value={pub.year}
                        onChange={(e) => updatePublication(pub.id, { year: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Penerbit / Lembaga</label>
                      <input
                        type="text"
                        value={pub.publisher}
                        onChange={(e) => updatePublication(pub.id, { publisher: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Tag (Pisahkan koma)</label>
                      <input
                        type="text"
                        value={(pub.tags || []).join(', ')}
                        onChange={(e) =>
                          updatePublication(pub.id, {
                            tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                      />
                    </div>
                  </div>

                  {/* Video / Multimedia URL for Publication / Modul */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Link Media Pembelajaran / Video Bedah Modul (Opsional)</span>
                      </label>
                      {pub.videoUrl && parseVideoUrl(pub.videoUrl) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-800 text-amber-300">
                          {parseVideoUrl(pub.videoUrl)?.platformName} Terhubung
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Contoh: Link Channel YouTube, Video YouTube, TikTok, Instagram Reel, FB Video, Drive, MP4"
                      value={pub.videoUrl || ''}
                      onChange={(e) => {
                        updatePublication(pub.id, { videoUrl: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-xs bg-white text-gray-900 placeholder:text-gray-400 font-mono shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />

                    {parseVideoUrl(pub.videoUrl)?.isChannel && (
                      <div className="p-2 rounded-lg bg-emerald-100/90 border border-emerald-300 text-emerald-950 text-xs">
                        <p className="text-[11px] leading-relaxed">
                          ✅ Channel resmi terdeteksi (<strong>{parseVideoUrl(pub.videoUrl)?.channelName || pub.videoUrl}</strong>). 
                          Pengunjung modul dapat memutar playlist unggahan &amp; mengakses video materi ajar resmi langsung.
                        </p>
                      </div>
                    )}

                    <p className="text-[10px] text-gray-500">
                      Mendukung pemutaran langsung YouTube, TikTok, Instagram Reels, Facebook Video, Google Drive Video, dan berkas MP4.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Deskripsi Karya</label>
                    <textarea
                      rows={2}
                      value={pub.description}
                      onChange={(e) => updatePublication(pub.id, { description: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 6: LINIMASA PENGABDIAN */}
      {/* ========================================================================= */}
      {activeSubTab === 'experiences' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-900/10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-[#064e3b] flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-700" />
                <span>Linimasa Rekam Jejak Pengabdian</span>
              </h3>
              <p className="text-xs text-gray-500">
                Kelola riwayat kepemimpinan madrasah, instruktur guru, dan kiprah organisasi. Anda dapat mengaktifkan atau menonaktifkan penayangan masing-masing periode secara terpisah di bawah ini.
              </p>
            </div>
            <button
              type="button"
              onClick={addExperience}
              className="px-4 py-2.5 rounded-xl bg-emerald-800 text-amber-200 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-700 shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Periode Baru</span>
            </button>
          </div>

          <div className="space-y-4">
            {draft.experience.map((exp, idx) => {
              const isItemActive = exp.isActive !== false;
              return (
                <div 
                  key={exp.id} 
                  className={`p-5 rounded-2xl border-2 transition-all space-y-4 relative ${
                    isItemActive
                      ? 'bg-white border-emerald-900/15 shadow-xs'
                      : 'bg-gray-50/80 border-dashed border-gray-300 opacity-80'
                  }`}
                >
                  {/* Top Bar for Each Period Item: Index, Title/Period, Status Badge, Toggle Button & Delete Button */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-extrabold text-gray-900">
                        {exp.period || 'Periode Baru'} — {exp.role || 'Jabatan'}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                        isItemActive
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {isItemActive ? '✅ Aktif (Tampil di Web)' : '⛔ Nonaktif (Disembunyikan)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Tombol Sakelar Aktifkan / Nonaktifkan Per Periode */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextStatus = !isItemActive;
                          updateExperience(exp.id, { isActive: nextStatus });
                          onToast(
                            nextStatus 
                              ? `✅ Periode "${exp.period || 'Pengabdian'}" DIAKTIFKAN di halaman publik` 
                              : `⛔ Periode "${exp.period || 'Pengabdian'}" DINONAKTIFKAN dari halaman publik`
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                          isItemActive
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-emerald-800 hover:bg-emerald-700 text-amber-200 shadow-xs'
                        }`}
                        title={isItemActive ? 'Sembunyikan periode ini dari publik' : 'Tampilkan periode ini di publik'}
                      >
                        {isItemActive ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                            <span>Nonaktifkan Periode</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5 text-amber-200" />
                            <span>Aktifkan Periode</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteExperience(exp.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="Hapus periode pengabdian ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Periode Tahun</label>
                      <input
                        type="text"
                        placeholder="Contoh: 2021 — Sekarang"
                        value={exp.period}
                        onChange={(e) => updateExperience(exp.id, { period: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Jabatan / Peran</label>
                      <input
                        type="text"
                        placeholder="Contoh: Kepala Madrasah / Instruktur"
                        value={exp.role}
                        onChange={(e) => updateExperience(exp.id, { role: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-bold bg-white focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Institusi / Lembaga</label>
                      <input
                        type="text"
                        placeholder="Contoh: Yayasan Pendidikan Islam..."
                        value={exp.organization}
                        onChange={(e) => updateExperience(exp.id, { organization: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Deskripsi Pengabdian</label>
                    <textarea
                      rows={2}
                      placeholder="Jelaskan peran, tanggung jawab, dan kontribusi pada periode ini..."
                      value={exp.description}
                      onChange={(e) => updateExperience(exp.id, { description: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Capaian & Prestasi (Pisahkan tiap baris dengan Enter)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Contoh:&#10;Meningkatkan akreditasi madrasah menjadi Unggul (A)&#10;Digitalisasi rapor madrasah"
                      value={(exp.achievements || []).join('\n')}
                      onChange={(e) => {
                        const achs = e.target.value.split('\n').filter((s) => s.trim() !== '');
                        updateExperience(exp.id, { achievements: achs });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white font-mono focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 7: AGENDA & JADWAL */}
      {/* ========================================================================= */}
      {activeSubTab === 'agenda' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-900/10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-[#064e3b] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-700" />
                <span>Jadwal Kajian, Seminar & Pelatihan</span>
              </h3>
              <p className="text-xs text-gray-500">Kelola jadwal kegiatan dakwah, kategori agenda kustom, dan lampiran berkas materi.</p>
            </div>
            <button
              type="button"
              onClick={addAgenda}
              className="px-4 py-2 rounded-xl bg-emerald-800 text-amber-200 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-700 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jadwal Agenda</span>
            </button>
          </div>

          {/* Category Management Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-700" />
                <span>Daftar Kategori Agenda (Bisa Ditambah/Dihapus)</span>
              </label>
              <span className="text-[10px] text-amber-800 font-semibold bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300/50">
                {(draft.agendaCategories || defaultAgendaCategories).length} Kategori
              </span>
            </div>

            {/* Chips of existing categories */}
            <div className="flex flex-wrap items-center gap-2">
              {(draft.agendaCategories || defaultAgendaCategories).map((cat) => {
                const count = draft.agenda.filter((a) => (a.type || '').trim().toLowerCase() === cat.trim().toLowerCase()).length;
                return (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-amber-300/80 text-xs font-semibold text-emerald-950 shadow-2xs group"
                  >
                    <span>{cat}</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      className="text-gray-400 hover:text-red-600 ml-0.5 opacity-60 group-hover:opacity-100"
                      title={`Hapus kategori "${cat}"`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>

            {/* Form to add a new category */}
            <div className="pt-2 flex items-center gap-2">
              <input
                type="text"
                placeholder="Ketik nama kategori baru (contoh: Bedah Buku, Diskusi Ilmiah, Daurah Fiqih)..."
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCategory(newCategoryInput);
                  }
                }}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-amber-300 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => handleAddCategory(newCategoryInput)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kategori</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {draft.agenda.map((ag) => {
              const allCategories = Array.from(
                new Set([...(draft.agendaCategories || defaultAgendaCategories), ag.type].filter(Boolean))
              );
              return (
                <div key={ag.id} className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3 relative group">
                  <button
                    type="button"
                    onClick={() => deleteAgenda(ag.id)}
                    className="absolute top-3 right-3 text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50"
                    title="Hapus Jadwal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pr-8">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Acara / Kegiatan *</label>
                      <input
                        type="text"
                        value={ag.title}
                        onChange={(e) => updateAgenda(ag.id, { title: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1 flex items-center justify-between">
                        <span>Kategori Acara</span>
                        <span className="text-[9px] text-amber-700 font-normal">Pilih / Ketik Kustom</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <select
                          value={ag.type}
                          onChange={(e) => updateAgenda(ag.id, { type: e.target.value })}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white font-medium text-emerald-950"
                        >
                          {allCategories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Status</label>
                      <select
                        value={ag.status || 'Akan Datang'}
                        onChange={(e) => updateAgenda(ag.id, { status: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                      >
                        <option value="Akan Datang">Akan Datang</option>
                        <option value="Rutin">Rutin</option>
                        <option value="Selesai">Selesai</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Tanggal</label>
                      <input
                        type="text"
                        value={ag.date}
                        onChange={(e) => updateAgenda(ag.id, { date: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Waktu / Jam</label>
                      <input
                        type="text"
                        value={ag.time}
                        onChange={(e) => updateAgenda(ag.id, { time: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Lokasi / Tempat</label>
                      <input
                        type="text"
                        value={ag.location}
                        onChange={(e) => updateAgenda(ag.id, { location: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Deskripsi / Catatan Acara</label>
                    <textarea
                      rows={2}
                      value={ag.description || ''}
                      onChange={(e) => updateAgenda(ag.id, { description: e.target.value })}
                      placeholder="Materi pokok, kitab rujukan, atau info pendaftaran..."
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                    />
                  </div>

                  {/* Media & Attachment Section: Flyer Image & Document Attachments */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs">
                    {/* 1. Flyer / Poster Kegiatan (Gambar) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Foto Flyer / Poster Acara</span>
                        </label>
                        {ag.imageUrl && (
                          <button
                            type="button"
                            onClick={() => updateAgenda(ag.id, { imageUrl: '' })}
                            className="text-[10px] text-red-600 hover:underline font-semibold"
                          >
                            Hapus Flyer
                          </button>
                        )}
                      </div>

                      {ag.imageUrl ? (
                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200">
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-indigo-950 border border-indigo-300 shrink-0">
                            <img
                              src={ag.imageUrl}
                              alt="Flyer Preview"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-indigo-900 block truncate">
                              Flyer Aktif
                            </span>
                            <p className="text-[10px] text-gray-500 truncate font-mono">
                              {ag.imageUrl.startsWith('data:') ? 'Foto Base64' : ag.imageUrl}
                            </p>
                            <label className="mt-1 inline-block text-[10px] font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer underline">
                              Ganti Foto Flyer
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleAgendaFlyerUpload(ag.id, e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-indigo-300 rounded-xl p-3 text-center bg-indigo-50/30 hover:bg-indigo-50/60 transition-colors">
                          <label className="cursor-pointer flex flex-col items-center gap-1">
                            <Upload className="w-4 h-4 text-indigo-600" />
                            <span className="text-[11px] font-bold text-indigo-900">
                              Unggah Gambar Flyer (JPG/PNG)
                            </span>
                            <span className="text-[9px] text-gray-500">
                              Tampil sebagai cover & brosur yang bisa diperbesar
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handleAgendaFlyerUpload(ag.id, e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* 2. Berkas Lampiran / Materi Acara (PDF, PPT, Word, Excel, ZIP, dll) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Berkas Materi / Modul Acara</span>
                        </label>
                        {ag.fileUrl && (
                          <button
                            type="button"
                            onClick={() => updateAgenda(ag.id, { fileUrl: '', fileName: '', fileSize: '', fileType: '' })}
                            className="text-[10px] text-red-600 hover:underline font-semibold"
                          >
                            Hapus Berkas
                          </button>
                        )}
                      </div>

                      {ag.fileUrl ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-800 text-white rounded">
                                  {ag.fileType || 'FILE'}
                                </span>
                                {ag.fileSize && (
                                  <span className="text-[10px] text-gray-500 font-mono">
                                    {ag.fileSize}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-emerald-950 truncate mt-0.5" title={ag.fileName}>
                                {ag.fileName || 'Lampiran Berkas Agenda'}
                              </p>
                            </div>
                            <label className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold rounded-lg cursor-pointer shrink-0">
                              Ganti
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleAgendaFileUpload(ag.id, e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-emerald-300 rounded-xl p-3 text-center bg-emerald-50/30 hover:bg-emerald-50/60 transition-colors">
                          <label className="cursor-pointer flex flex-col items-center gap-1">
                            <Upload className="w-4 h-4 text-emerald-700" />
                            <span className="text-[11px] font-bold text-emerald-950">
                              Unggah Berkas (PDF / PPT / DOC / ZIP)
                            </span>
                            <span className="text-[9px] text-gray-500">
                              Bisa diunduh publik sesuai kategori acara
                            </span>
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handleAgendaFileUpload(ag.id, e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}

                      {/* Manual URL Input Fallback */}
                      <input
                        type="text"
                        value={ag.fileUrl || ''}
                        onChange={(e) => {
                          const url = e.target.value;
                          const fn = url.split('/').pop()?.split('?')[0] || 'Berkas Acara';
                          updateAgenda(ag.id, {
                            fileUrl: url,
                            fileName: ag.fileName || fn
                          });
                        }}
                        placeholder="Atau tautan URL langsung: https://... / Drive"
                        className="w-full px-2.5 py-1 rounded-lg border border-gray-300 text-[11px] bg-white font-mono placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 6: KANAL MEDIA & SIARAN DIGITAL (YOUTUBE, TIKTOK, IG, FB) */}
      {/* ========================================================================= */}
      {activeSubTab === 'mediachannel' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-900/10 shadow-sm space-y-8">
          {/* Header Banner */}
          <div className="p-6 rounded-3xl bg-slate-900 text-white border-2 border-red-900/40 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-red-600 text-white shadow-md">
                    <Video className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>Kanal Media & Siaran Digital Madrasah</span>
                      <span className="text-[10px] font-bold bg-red-600/30 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Multi-Platform
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Kelola saluran akun medsos resmi (<strong>YouTube, TikTok, Instagram Reels, Facebook</strong>) dan koleksi video materi pembelajaran digital.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isSyncingYoutube}
                  onClick={() => handleSyncYoutube()}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg hover:shadow-red-600/30 transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingYoutube ? 'animate-spin' : ''}`} />
                  <span>{isSyncingYoutube ? 'Menyinkronkan...' : 'Sinkronkan YouTube'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-300">
              <span className="font-semibold text-slate-400">Platform yang Didukung:</span>
              <span className="px-2.5 py-1 rounded-lg bg-red-950 text-red-300 border border-red-800/80 flex items-center gap-1 font-semibold">
                <Youtube className="w-3.5 h-3.5" /> YouTube
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800/80 flex items-center gap-1 font-semibold">
                <Video className="w-3.5 h-3.5" /> TikTok
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-pink-950 text-pink-300 border border-pink-800/80 flex items-center gap-1 font-semibold">
                <Video className="w-3.5 h-3.5" /> IG Reels
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-950 text-blue-300 border border-blue-800/80 flex items-center gap-1 font-semibold">
                <Video className="w-3.5 h-3.5" /> Facebook
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800/80 flex items-center gap-1 font-semibold">
                <Film className="w-3.5 h-3.5" /> File MP4 / Drive
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SEKSI 1: MANAJEMEN DAFTAR SALURAN / AKUN CHANNEL (TAMBAH CHANNEL) */}
          {/* ========================================================================= */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>Daftar Saluran & Akun Media Sosial Resmi</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                    {(draft.mediaChannels || []).length} Akun Terdaftar
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Saluran ini akan ditampilkan di bar profil media dan bisa dijadikan sumber video siaran.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const newChan: MediaChannelAccount = {
                    id: `chan-${Date.now()}`,
                    platform: 'tiktok',
                    channelName: 'Saluran Baru',
                    channelHandle: '@username',
                    channelUrl: 'https://tiktok.com/@username',
                    subscribersOrFollowers: '1.0K Pengikut',
                    description: 'Konten dakwah dan edukasi santri madrasah.',
                    isPrimary: false
                  };
                  setDraft((prev) => {
                    const current = prev.mediaChannels || defaultMediaChannels;
                    return {
                      ...prev,
                      mediaChannels: [newChan, ...current]
                    };
                  });
                  setHasUnsavedChanges(true);
                  onToast('Saluran akun media baru ditambahkan.');
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Akun Channel Baru</span>
              </button>
            </div>

            {/* List of Channels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(draft.mediaChannels || defaultMediaChannels).map((channel, cIdx) => {
                const getPlatformColor = (p: string) => {
                  switch (p) {
                    case 'youtube': return 'border-red-600/40 bg-red-950/20';
                    case 'tiktok': return 'border-cyan-600/40 bg-cyan-950/20';
                    case 'instagram': return 'border-pink-600/40 bg-pink-950/20';
                    case 'facebook': return 'border-blue-600/40 bg-blue-950/20';
                    default: return 'border-slate-700 bg-slate-950/40';
                  }
                };

                return (
                  <div
                    key={channel.id || cIdx}
                    className={`p-4 rounded-2xl border ${getPlatformColor(channel.platform)} bg-slate-950/60 space-y-3 relative group`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={channel.platform}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setDraft((prev) => {
                              const list = [...(prev.mediaChannels || defaultMediaChannels)];
                              list[cIdx] = { ...list[cIdx], platform: val };
                              return { ...prev, mediaChannels: list };
                            });
                            setHasUnsavedChanges(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer uppercase"
                        >
                          <option value="youtube">YouTube</option>
                          <option value="tiktok">TikTok</option>
                          <option value="instagram">Instagram</option>
                          <option value="facebook">Facebook</option>
                          <option value="other">Lainnya</option>
                        </select>

                        {channel.isPrimary && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                            Utama
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {channel.channelUrl && (
                          <a
                            href={channel.channelUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Buka URL Akun"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setDraft((prev) => {
                              const list = (prev.mediaChannels || defaultMediaChannels).filter((_, i) => i !== cIdx);
                              return { ...prev, mediaChannels: list };
                            });
                            setHasUnsavedChanges(true);
                            onToast('Saluran dihapus.');
                          }}
                          className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-400 hover:text-red-200 transition-colors cursor-pointer"
                          title="Hapus Saluran"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Nama Channel / Akun</label>
                        <input
                          type="text"
                          value={channel.channelName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((prev) => {
                              const list = [...(prev.mediaChannels || defaultMediaChannels)];
                              list[cIdx] = { ...list[cIdx], channelName: val };
                              return { ...prev, mediaChannels: list };
                            });
                            setHasUnsavedChanges(true);
                          }}
                          placeholder="Nama Channel"
                          className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Handle / Username</label>
                        <input
                          type="text"
                          value={channel.channelHandle || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((prev) => {
                              const list = [...(prev.mediaChannels || defaultMediaChannels)];
                              list[cIdx] = { ...list[cIdx], channelHandle: val };
                              return { ...prev, mediaChannels: list };
                            });
                            setHasUnsavedChanges(true);
                          }}
                          placeholder="@username"
                          className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">URL Akun / Channel Publik</label>
                        <input
                          type="text"
                          value={channel.channelUrl}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((prev) => {
                              const list = [...(prev.mediaChannels || defaultMediaChannels)];
                              list[cIdx] = { ...list[cIdx], channelUrl: val };
                              return { ...prev, mediaChannels: list };
                            });
                            setHasUnsavedChanges(true);
                          }}
                          placeholder="https://..."
                          className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Jumlah Pengikut / Subscriber</label>
                        <input
                          type="text"
                          value={channel.subscribersOrFollowers || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((prev) => {
                              const list = [...(prev.mediaChannels || defaultMediaChannels)];
                              list[cIdx] = { ...list[cIdx], subscribersOrFollowers: val };
                              return { ...prev, mediaChannels: list };
                            });
                            setHasUnsavedChanges(true);
                          }}
                          placeholder="Contoh: 12.5K Pengikut"
                          className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Deskripsi Singkat</label>
                      <input
                        type="text"
                        value={channel.description || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft((prev) => {
                            const list = [...(prev.mediaChannels || defaultMediaChannels)];
                            list[cIdx] = { ...list[cIdx], description: val };
                            return { ...prev, mediaChannels: list };
                          });
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Ringkasan topik atau fokus konten saluran..."
                        className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SEKSI 2: SINKRONISASI OTOMATIS CHANNEL YOUTUBE & IMPORT 15 VIDEO TERBARU */}
          {/* ========================================================================= */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-red-950/60 via-slate-900 to-slate-900 border border-red-800/40 text-white space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shrink-0">
                  <Youtube className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Impor Otomatis Daftar Video dari Channel YouTube</span>
                    <span className="px-2 py-0.5 rounded-full bg-red-600/30 text-red-300 text-[10px] font-bold border border-red-500/40">
                      Live RSS Feed
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Masukkan nama handle saluran (misal: <code>@jaenalmaskunofficial3977</code>) untuk mengambil 15 video terbaru sekaligus dan menampilkannya di website.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSyncingYoutube}
                  onClick={() => handleSyncYoutube(channelSyncInput)}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingYoutube ? 'animate-spin' : ''}`} />
                  <span>{isSyncingYoutube ? 'Menyinkronkan...' : 'Tarik 15 Video Channel Ini'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Handle / Username / URL Channel YouTube:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={channelSyncInput}
                    onChange={(e) => setChannelSyncInput(e.target.value)}
                    placeholder="Contoh: @jaenalmaskunofficial3977 atau https://youtube.com/@jaenalmaskunofficial3977"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400">Pilihan Cepat Saluran Resmi:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setChannelSyncInput('@jaenalmaskunofficial3977');
                      handleSyncYoutube('@jaenalmaskunofficial3977');
                    }}
                    className="px-2 py-0.5 rounded-lg bg-red-950/80 hover:bg-red-800 text-red-200 border border-red-800 text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    ⚡ @jaenalmaskunofficial3977
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChannelSyncInput('UC45A9VF3hameYBW1reLO3BQ');
                      handleSyncYoutube('UC45A9VF3hameYBW1reLO3BQ');
                    }}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-mono cursor-pointer transition-colors"
                  >
                    ID: UC45A9VF3hameYBW1reLO3BQ
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Status Saluran Terhubung:
                </label>
                <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-300 flex items-center justify-between">
                  <span className="font-semibold truncate">
                    {draft.youtubeChannel?.channelTitle || 'JAENAL MASKUN OFFICIAL'}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 shrink-0">
                    {(draft.youtubeVideos || []).length} Video
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SEKSI 3: FORM TAMBAH & KELOLA VIDEO SIARAN DENGAN URL & THUMBNAIL LENGKAP */}
          {/* ========================================================================= */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-red-400" />
                  <span>Koleksi Video Siaran & Pembelajaran</span>
                  <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-300 text-[10px] font-bold border border-red-800">
                    {(draft.youtubeVideos || draft.youtubeChannel?.videos || []).length} Video
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Setiap video mendukung <strong>input URL video, thumbnail kustom, durasi, platform, dan pratinjau tes putar</strong>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const newId = `vid-${Date.now()}`;
                  const newVid: YouTubeChannelVideo = {
                    id: newId,
                    videoId: 'dQw4w9WgXcQ',
                    title: 'Judul Video Pembelajaran Baru',
                    description: 'Penjelasan materi dan ringkasan isi video kajian.',
                    publishedAt: 'Terbaru',
                    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    platform: 'youtube',
                    channelName: 'Ust. Jaenal Maskun Official',
                    duration: '10:00',
                    views: '1K tayangan'
                  };
                  setDraft((prev) => {
                    const cur = prev.youtubeVideos || prev.youtubeChannel?.videos || [];
                    return {
                      ...prev,
                      youtubeVideos: [newVid, ...cur],
                      youtubeChannel: {
                        ...(prev.youtubeChannel || defaultYouTubeChannelConfig),
                        videos: [newVid, ...cur]
                      }
                    };
                  });
                  setExpandedVideoId(newId);
                  setHasUnsavedChanges(true);
                  onToast('Item video siaran baru ditambahkan. Silakan lengkapi URL dan thumbnail.');
                }}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Video Siaran Manual</span>
              </button>
            </div>

            {/* List of Detailed Video Cards */}
            <div className="space-y-4">
              {(draft.youtubeVideos || draft.youtubeChannel?.videos || []).map((video, idx) => {
                const effectiveVideoUrl = video.videoUrl || `https://www.youtube.com/watch?v=${video.videoId || ''}`;
                const parsedVideo = parseVideoUrl(effectiveVideoUrl);
                const detectedPlatform = video.platform || (parsedVideo ? parsedVideo.type : 'youtube');
                const badgeStyle = getPlatformBadgeStyle(detectedPlatform);
                const isExpanded = expandedVideoId === (video.id || `idx-${idx}`);

                return (
                  <div
                    key={video.id || idx}
                    className="rounded-2xl border border-slate-800 bg-slate-950/90 overflow-hidden shadow-md transition-all hover:border-slate-700"
                  >
                    {/* Header Bar */}
                    <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950">
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Thumbnail preview */}
                        <div className="w-20 h-12 rounded-xl overflow-hidden bg-slate-900 relative shrink-0 border border-slate-700 shadow-sm">
                          <img
                            src={video.thumbnailUrl || video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
                            alt={video.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e: any) => {
                              e.target.src = 'https://images.unsplash.com/photo-1584697964190-71c4c3b28b7e?auto=format&fit=crop&w=600&q=80';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <Play className="w-4 h-4 text-white fill-current opacity-90" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white shadow-xs ${badgeStyle.badgeBg}`}>
                              {detectedPlatform}
                            </span>
                            {video.duration && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                                {video.duration}
                              </span>
                            )}
                            {video.channelName && (
                              <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                • {video.channelName}
                              </span>
                            )}
                          </div>
                          <h5 className="text-xs font-bold text-white truncate">
                            {video.title || 'Video Tanpa Judul'}
                          </h5>
                          <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                            {effectiveVideoUrl}
                          </p>
                        </div>
                      </div>

                      {/* Top Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewVideoModal({
                              title: video.title,
                              url: effectiveVideoUrl,
                              platform: detectedPlatform
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Tes Putar Video"
                        >
                          <Play className="w-3.5 h-3.5 text-red-400 fill-current" />
                          <span>Tes Putar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedVideoId(isExpanded ? null : (video.id || `idx-${idx}`))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                            isExpanded ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{isExpanded ? 'Tutup Form' : 'Edit Detail'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDraft((prev) => {
                              const cur = prev.youtubeVideos || prev.youtubeChannel?.videos || [];
                              const filtered = cur.filter((_, i) => i !== idx);
                              return {
                                ...prev,
                                youtubeVideos: filtered,
                                youtubeChannel: {
                                  ...(prev.youtubeChannel || defaultYouTubeChannelConfig),
                                  videos: filtered
                                }
                              };
                            });
                            setHasUnsavedChanges(true);
                            onToast('Video dihapus dari daftar.');
                          }}
                          className="p-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-400 hover:text-red-200 transition-colors cursor-pointer"
                          title="Hapus Video"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Detailed Input Form (Always or Expanded) */}
                    {isExpanded && (
                      <div className="p-5 border-t border-slate-800/80 bg-slate-900/60 space-y-4">
                        {/* Judul Video */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Judul Video Siaran / Materi Pembelajaran *
                          </label>
                          <input
                            type="text"
                            value={video.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraft((prev) => {
                                const cur = [...(prev.youtubeVideos || prev.youtubeChannel?.videos || [])];
                                cur[idx] = { ...cur[idx], title: val };
                                return {
                                  ...prev,
                                  youtubeVideos: cur,
                                  youtubeChannel: { ...(prev.youtubeChannel || defaultYouTubeChannelConfig), videos: cur }
                                };
                              });
                              setHasUnsavedChanges(true);
                            }}
                            placeholder="Contoh: Tutorial Modul Ajar Kurikulum Merdeka Madrasah"
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>

                        {/* URL Video & Platform Selector */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-bold text-slate-300">
                                URL Video Media (YouTube, TikTok, IG, FB, Drive, MP4) *
                              </label>
                              {extractYouTubeId(video.videoUrl || '') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const ytid = extractYouTubeId(video.videoUrl || '');
                                    if (ytid) {
                                      const autoThumb = `https://img.youtube.com/vi/${ytid}/hqdefault.jpg`;
                                      setDraft((prev) => {
                                        const cur = [...(prev.youtubeVideos || prev.youtubeChannel?.videos || [])];
                                        cur[idx] = {
                                          ...cur[idx],
                                          videoId: ytid,
                                          thumbnailUrl: autoThumb,
                                          thumbnail: autoThumb,
                                          platform: 'youtube'
                                        };
                                        return {
                                          ...prev,
                                          youtubeVideos: cur,
                                          youtubeChannel: { ...(prev.youtubeChannel || defaultYouTubeChannelConfig), videos: cur }
                                        };
                                      });
                                      setHasUnsavedChanges(true);
                                      onToast('Thumbnail & Video ID YouTube otomatis disinkronkan!');
                                    }
                                  }}
                                  className="text-[10px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>Ambil Thumbnail YouTube Otomatis</span>
                                </button>
                              )}
                            </div>
                            <div className="relative">
                              <input
                                type="text"
                                value={video.videoUrl || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const parsed = parseVideoUrl(val);
                                  const ytid = extractYouTubeId(val);
                                  const autoThumb = ytid ? `https://img.youtube.com/vi/${ytid}/hqdefault.jpg` : video.thumbnailUrl;

                                  setDraft((prev) => {
                                    const cur = [...(prev.youtubeVideos || prev.youtubeChannel?.videos || [])];
                                    cur[idx] = {
                                      ...cur[idx],
                                      videoUrl: val,
                                      videoId: ytid || cur[idx].videoId,
                                      platform: (parsed ? (parsed.type as any) : cur[idx].platform) || 'youtube',
                                      thumbnailUrl: cur[idx].thumbnailUrl || autoThumb,
                                      thumbnail: cur[idx].thumbnail || autoThumb
                                    };
                                    return {
                                      ...prev,
                                      youtubeVideos: cur,
                                      youtubeChannel: { ...(prev.youtubeChannel || defaultYouTubeChannelConfig), videos: cur }
                                    };
                                  });
                                  setHasUnsavedChanges(true);
                                }}
                                placeholder="https://www.youtube.com/watch?v=... / https://www.tiktok.com/... / https://instagram.com/reel/..."
                                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                              />
                            </div>
                            {parsedVideo && parsedVideo.isChannel && parsedVideo.type === 'youtube' && (
                              <div className="mt-2 p-2.5 rounded-xl bg-red-950/40 border border-red-800/60 flex items-center justify-between gap-2">
                                <div className="text-[10px] text-red-200">
                                  <span className="font-bold">⚠️ Tautan ini adalah Saluran Channel YouTube.</span> Ingin mengimpor semua video dari saluran ini?
                                </div>
                                <button
                                  type="button"
                                  disabled={isSyncingYoutube}
                                  onClick={() => handleSyncYoutube(video.videoUrl)}
                                  className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded-lg shrink-0 cursor-pointer"
                                >
                                  Impor 15 Video
                                </button>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">
                              Platform Video
                            </label>
                            <select
                              value={video.platform || detectedPlatform}
                              onChange={(e) => {
                                const val = e.target.value as any;
                                setDraft((prev) => {
                                  const cur = [...(prev.youtubeVideos || prev.youtubeChannel?.videos || [])];
                                  cur[idx] = { ...cur[idx], platform: val };
                                  return {
                                    ...prev,
                                    youtubeVideos: cur,
                                    youtubeChannel: { ...(prev.youtubeChannel || defaultYouTubeChannelConfig), videos: cur }
                                  };
                                });
                                setHasUnsavedChanges(true);
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                            >
                              <option value="youtube">YouTube</option>
                              <option value="tiktok">TikTok</option>
                              <option value="instagram">Instagram Reels</option>
                              <option value="facebook">Facebook Video</option>
                              <option value="drive">Google Drive</option>
                              <option value="mp4">Berkas Video (MP4/WebM)</option>
                              <option value="other">Lainnya</option>
                            </select>
                          </div>
                        </div>

                        {/* URL Thumbnail / Gambar Sampul dengan Upload Manual & Pratinjau Langsung */}
                        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-amber-400" />
                                <label className="text-xs font-bold text-white">
                                  Thumbnail & Gambar Sampul Video
                                </label>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Dukungan upload foto dari perangkat, input URL manual, atau sinkronisasi otomatis dari platform.
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Upload Manual File Input */}
                              <label className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Upload Foto / Galeri</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleVideoThumbnailUpload(e, idx)}
                                  className="hidden"
                                />
                              </label>

                              {/* Auto Fetch / Default Button */}
                              {extractYouTubeId(video.videoUrl || '') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const ytid = extractYouTubeId(video.videoUrl || '');
                                    if (ytid) {
                                      const autoThumb = `https://img.youtube.com/vi/${ytid}/hqdefault.jpg`;
                                      setDraft((prev) => {
                                        const cur = [...(prev.youtubeVideos || prev.youtubeChannel?.videos || [])];
                                        cur[idx] = {
                                          ...cur[idx],
                                          thumbnailUrl: autoThumb,
                                          thumbnail: autoThumb,
                                          videoId: ytid
                                        };
                                        return {
                                          ...prev,
                                          youtubeVideos: cur,
                                          youtubeChannel: { ...(prev.youtubeChannel || defaultYouTubeChannelConfig), videos: cur }
                                        };
                                      });
                                      setHasUnsavedChanges(true);
                                      onToast('Thumbnail YouTube otomatis diambil & disinkronkan!');
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800/60 text-red-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                                >
                                  <Sparkles className="w-3 h-3 text-red-400" />
                                  <span>Ambil dari YouTube</span>
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                            <div className="sm:col-span-2 space-y-3">
                              {/* Input URL Manual */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">
                                  Tautan / URL Gambar Sampul Thumbnail:
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={video.thumbnailUrl || video.thumbnail || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setDraft((prev) => {
                                        const cur = [...(prev.youtubeVideos || prev.youtubeChannel?.videos || [])];
                                        cur[idx] = { ...cur[idx], thumbnailUrl: val, thumbnail: val };
                                        return {
                                          ...prev,
                                          youtubeVideos: cur,
                                          youtubeChannel: { ...(prev.youtubeChannel || defaultYouTubeChannelConfig), videos: cur }
                                        };
                                      });
                                      setHasUnsavedChanges(true);
                                    }}
                                    placeholder="https://... (URL gambar jpg, png, webp) atau unggah lewat tombol di atas"
                                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  />
                                  {(video.thumbnailUrl || video.thumbnail) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDraft((prev) => {
                                          const cur = [...(prev.youtubeVideos || prev.youtubeChannel?.videos || [])];
                                          cur[idx] = { ...cur[idx], thumbnailUrl: '', thumbnail: '' };
                                          return {
                                            ...prev,
                                            youtubeVideos: cur,
                                            youtubeChannel: { ...(prev.youtubeChannel || defaultYouTubeChannelConfig), videos: cur }
                                          };
                                        });
                                        setHasUnsavedChanges(true);
                                        onToast('Thumbnail dikosongkan.');
                                      }}
                                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs cursor-pointer"
                                      title="Hapus / Kosongkan Thumbnail"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Pilihan Cepat Sampul Madrasah */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1.5">
                                  Pilihan Cepat Sampul Tematik Madrasah & Kajian:
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                                  {videoThumbnailPresets.map((preset, pIdx) => {
                                    const isSelected = (video.thumbnailUrl === preset.url) || (video.thumbnail === preset.url);
                                    return (
                                      <button
                                        key={pIdx}
                                        type="button"
                                        onClick={() => {
                                          setDraft((prev) => {
                                            const cur = [...(prev.youtubeVideos || prev.youtubeChannel?.videos || [])];
                                            cur[idx] = { ...cur[idx], thumbnailUrl: preset.url, thumbnail: preset.url };
                                            return {
                                              ...prev,
                                              youtubeVideos: cur,
                                              youtubeChannel: { ...(prev.youtubeChannel || defaultYouTubeChannelConfig), videos: cur }
                                            };
                                          });
                                          setHasUnsavedChanges(true);
                                          onToast(`Sampul "${preset.name}" dipilih.`);
                                        }}
                                        className={`p-1 rounded-xl border text-left flex flex-col items-center gap-1 transition-all cursor-pointer ${
                                          isSelected
                                            ? 'border-amber-400 bg-amber-950/40 ring-1 ring-amber-400'
                                            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                                        }`}
                                      >
                                        <div className="w-full aspect-video rounded-lg overflow-hidden bg-slate-950">
                                          <img
                                            src={preset.url}
                                            alt={preset.name}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        <span className="text-[9px] font-medium text-slate-300 truncate w-full text-center">
                                          {preset.name}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Live Thumbnail Preview Box */}
                            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                              <span className="text-[10px] font-bold text-slate-400 mb-1.5 block">Pratinjau Sampul Aktif:</span>
                              <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-950 relative border border-slate-700 shadow-inner">
                                <img
                                  src={video.thumbnailUrl || video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
                                  alt="Pratinjau"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                  onError={(e: any) => {
                                    e.target.src = 'https://images.unsplash.com/photo-1584697964190-71c4c3b28b7e?auto=format&fit=crop&w=600&q=80';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <Play className="w-6 h-6 text-white fill-current opacity-90 shadow-md" />
                                </div>
                                {video.duration && (
                                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-white">
                                    {video.duration}
                                  </div>
                                )}
                              </div>
                              <span className="text-[9px] text-slate-500 mt-1.5 font-mono truncate max-w-full">
                                {video.thumbnailUrl?.startsWith('data:') ? 'Foto Lokal (Base64)' : (video.thumbnailUrl || 'Thumbnail Default')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Info Pelengkap: Channel Name, Durasi, Views, Tanggal */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Nama Saluran / Creator</label>
                            <input
                              type="text"
                              value={video.channelName || video.channelTitle || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDraft((prev) => {
                                  const cur = [...(prev.youtubeVideos || prev.youtubeChannel?.videos || [])];
                                  cur[idx] = { ...cur[idx], channelName: val, channelTitle: val };
                                  return {
                                    ...prev,
                                    youtubeVideos: cur,
                                    youtubeChannel: { ...(prev.youtubeChannel || defaultYouTubeChannelConfig), videos: cur }
                                  };
                                });
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Ust. Jaenal Maskun"
                              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Durasi Video</label>
                            <input
                              type="text"
                              value={video.duration || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDraft((prev) => {
                                  const cur = [...(prev.youtubeVideos || prev.youtubeChannel?.videos || [])];
                                  cur[idx] = { ...cur[idx], duration: val };
                                  return {
                                    ...prev,
                                    youtubeVideos: cur,
                                    youtubeChannel: { ...(prev.youtubeChannel || defaultYouTubeChannelConfig), videos: cur }
                                  };
                                });
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Contoh: 14:20"
                              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Jumlah Tayangan / Views</label>
                            <input
                              type="text"
                              value={video.views || video.viewsCount || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDraft((prev) => {
                                  const cur = [...(prev.youtubeVideos || prev.youtubeChannel?.videos || [])];
                                  cur[idx] = { ...cur[idx], views: val, viewsCount: val };
                                  return {
                                    ...prev,
                                    youtubeVideos: cur,
                                    youtubeChannel: { ...(prev.youtubeChannel || defaultYouTubeChannelConfig), videos: cur }
                                  };
                                });
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Contoh: 2.8K tayangan"
                              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">Waktu Publikasi</label>
                            <input
                              type="text"
                              value={video.publishedAt || video.publishedDate || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDraft((prev) => {
                                  const cur = [...(prev.youtubeVideos || prev.youtubeChannel?.videos || [])];
                                  cur[idx] = { ...cur[idx], publishedAt: val, publishedDate: val };
                                  return {
                                    ...prev,
                                    youtubeVideos: cur,
                                    youtubeChannel: { ...(prev.youtubeChannel || defaultYouTubeChannelConfig), videos: cur }
                                  };
                                });
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Contoh: 2 hari lalu"
                              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        {/* Deskripsi Materi Video */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">
                            Ringkasan Materi & Deskripsi Video
                          </label>
                          <textarea
                            rows={2}
                            value={video.description || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraft((prev) => {
                                const cur = [...(prev.youtubeVideos || prev.youtubeChannel?.videos || [])];
                                cur[idx] = { ...cur[idx], description: val };
                                return {
                                  ...prev,
                                  youtubeVideos: cur,
                                  youtubeChannel: { ...(prev.youtubeChannel || defaultYouTubeChannelConfig), videos: cur }
                                };
                              });
                              setHasUnsavedChanges(true);
                            }}
                            placeholder="Deskripsi singkat isi bahasan materi dalam video..."
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {(!draft.youtubeVideos || draft.youtubeVideos.length === 0) && (!draft.youtubeChannel?.videos || draft.youtubeChannel.videos.length === 0) && (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-950/40 rounded-3xl border border-slate-800 space-y-3">
                  <p>Belum ada video siaran yang dimuat.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft((prev) => ({
                        ...prev,
                        youtubeVideos: sampleYouTubeVideos,
                        youtubeChannel: {
                          ...(prev.youtubeChannel || defaultYouTubeChannelConfig),
                          videos: sampleYouTubeVideos
                        }
                      }));
                      setHasUnsavedChanges(true);
                      onToast('Contoh daftar video siaran dimuat.');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
                  >
                    Muat Contoh Koleksi Video Multi-Platform
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB: GALERI FOTO & DOKUMENTASI KEGIATAN */}
      {/* ========================================================================= */}
      {activeSubTab === 'gallery' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-900/10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#064e3b] flex items-center gap-2">
                <span>Dokumentasi Foto & Liputan Kegiatan Madrasah</span>
                <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-emerald-700" />
                  <span>Kapsul Ajaib HP Siap</span>
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                Unggah foto dokumentasi atau upload video manual (MP4/WebM/MOV) bebas batasan ukuran file dengan streaming kompresi otomatis dan integrasi Kapsul Ajaib HP bawaan.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Tombol Upload Video Manual Baru */}
              <label className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-900 hover:to-teal-800 text-amber-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all">
                <Upload className="w-4 h-4 text-amber-300" />
                <span>+ Upload Video Manual</span>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const newId = `gal-vid-${Date.now()}`;
                    const newVideoItem: GalleryItem = {
                      id: newId,
                      title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
                      category: 'Kegiatan Belajar',
                      videoUrl: '',
                      image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=800',
                      description: 'Dokumentasi video kegiatan madrasah yang dapat diputar di Kapsul Ajaib smartphone.'
                    };
                    setDraft((prev) => ({ ...prev, gallery: [newVideoItem, ...prev.gallery] }));
                    setHasUnsavedChanges(true);
                    handleManualVideoUpload(newId, file);
                    e.target.value = '';
                  }}
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  setHasUnsavedChanges(true);
                  const newVideo: GalleryItem = {
                    id: `gal-vid-${Date.now()}`,
                    title: 'Video Liputan Pembelajaran Madrasah',
                    category: 'Kegiatan Belajar',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    image: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                    description: 'Dokumentasi video pembelajaran dan aktivitas santri yang dapat diputar langsung.'
                  };
                  setDraft((prev) => ({ ...prev, gallery: [newVideo, ...prev.gallery] }));
                  onToast('Item Video Galeri baru ditambahkan! Silakan masukkan URL YouTube, TikTok, atau Instagram.');
                }}
                className="px-3.5 py-2 rounded-xl bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-red-800 cursor-pointer shadow-xs"
              >
                <Video className="w-4 h-4" />
                <span>+ Link Video Web</span>
              </button>

              <button
                type="button"
                onClick={addGallery}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-amber-200 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-900 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Foto</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {draft.gallery.map((item) => {
              const isVideo = Boolean(item.videoUrl && item.videoUrl.trim());
              const parsed = isVideo ? parseVideoUrl(item.videoUrl) : null;
              const isDirectUpload = parsed?.type === 'direct_video';
              const isUploadingThis = uploadingVideoId === item.id;

              return (
                <div key={item.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3 relative group">
                  <button
                    type="button"
                    onClick={() => deleteGallery(item.id)}
                    className="absolute top-3 right-3 text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer z-10"
                    title="Hapus Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="aspect-16/9 rounded-xl overflow-hidden bg-gray-900 border border-gray-300 relative">
                    <img
                      src={item.image || parsed?.thumbnailUrl || 'https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&w=800&q=80'}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    {isVideo && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewVideoModal({
                              title: item.title,
                              url: item.videoUrl!,
                              platform: parsed?.platformName
                            });
                          }}
                          className="w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
                          title="Putar Cuplikan Video"
                        >
                          <Play className="w-5 h-5 fill-current translate-x-0.5" />
                        </button>
                      </div>
                    )}
                    {isVideo && (
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className="bg-emerald-800 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1">
                          <Film className="w-3 h-3" />
                          <span>{parsed?.platformName || 'Video Terhubung'}</span>
                        </span>
                        {isDirectUpload && (
                          <span className="bg-teal-900/90 text-teal-200 text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1 border border-teal-500/40">
                            <Smartphone className="w-3 h-3 text-teal-300" />
                            <span>Kapsul Ajaib HP</span>
                          </span>
                        )}
                      </div>
                    )}

                    {isUploadingThis && (
                      <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-white space-y-2 z-20">
                        <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
                        <span className="text-xs font-bold text-amber-300">
                          {videoUploadProgress.status || 'Memproses video...'}
                        </span>
                        <div className="w-full max-w-[200px] bg-white/20 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-amber-400 h-full transition-all duration-300"
                            style={{ width: `${Math.max(5, videoUploadProgress.percent)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-300">
                          {videoUploadProgress.percent}% Selesai
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Section Upload Video Manual & URL Media */}
                  <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/60 p-3.5 rounded-2xl border border-emerald-200/90 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <label className="block text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Sumber Video (Upload Manual / URL Media)</span>
                      </label>

                      {/* Tombol Upload Manual Video */}
                      <label className="text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 border border-emerald-800 px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors">
                        <Upload className="w-3 h-3 text-amber-200" />
                        <span>Upload Berkas Video</span>
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleManualVideoUpload(item.id, file);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* Progress Bar jika sedang upload video item ini */}
                    {isUploadingThis && (
                      <div className="p-3 bg-white rounded-xl border border-amber-300 shadow-xs space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                            <span>{videoUploadProgress.status}</span>
                          </span>
                          <span className="font-bold text-emerald-800 font-mono">
                            {videoUploadProgress.percent}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full transition-all duration-300"
                            style={{ width: `${videoUploadProgress.percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Banner Status Terhubung Kapsul Ajaib HP jika Direct Upload */}
                    {isDirectUpload && !isUploadingThis && (
                      <div className="p-2.5 rounded-xl bg-teal-100/90 border border-teal-300 text-teal-950 text-xs space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-teal-950">
                          <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                          <span>Video Manual Tersimpan &amp; Kapsul Ajaib HP Aktif</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-teal-900">
                          Video ini terkompresi optimal dan terhubung ke <strong>MediaSession / Dynamic Island HP</strong>. Pengguna dapat memutar di latar belakang saat beralih aplikasi.
                        </p>
                      </div>
                    )}

                    {/* URL Input */}
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="Unggah berkas video di atas atau tempel URL (YouTube/TikTok/IG/MP4)..."
                        value={item.videoUrl || ''}
                        onChange={(e) => {
                          const newUrl = e.target.value;
                          const p = parseVideoUrl(newUrl);
                          const updates: Partial<GalleryItem> = { videoUrl: newUrl };
                          if (p?.thumbnailUrl && (!item.image || item.image.includes('unsplash'))) {
                            updates.image = p.thumbnailUrl;
                          }
                          updateGallery(item.id, updates);
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-xs bg-white text-gray-900 placeholder:text-gray-400 font-mono shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Platform Status */}
                    {parsed?.videoId && parsed.type === 'youtube' && (
                      <div className="flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-300">
                        <span className="font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>YouTube Terverifikasi (ID: <code className="font-mono">{parsed.videoId}</code>)</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const ytThumb = getYouTubeThumbnailUrl(parsed.videoId, 'hq') || `https://img.youtube.com/vi/${parsed.videoId}/hqdefault.jpg`;
                              updateGallery(item.id, { image: ytThumb });
                              setHasUnsavedChanges(true);
                              onToast('✅ Thumbnail YouTube berhasil diterapkan!');
                            }}
                            className="px-2 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-bold hover:bg-emerald-800 cursor-pointer"
                          >
                            Set Thumbnail
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-gray-500">
                      Mendukung Upload Video Manual (MP4/WebM/MOV), YouTube, TikTok, Instagram Reels, Facebook, Drive, atau tautan video langsung.
                    </p>
                  </div>

                  {/* Field URL Gambar / Sampul Thumbnail */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                      <label className="block text-[11px] font-bold text-gray-800">
                        URL Gambar / Sampul Thumbnail Poster
                      </label>
                      <div className="flex items-center gap-2">
                        {/* Tombol Upload Berkas Foto */}
                        <label className="text-[11px] font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md cursor-pointer flex items-center gap-1 transition-colors">
                          <Upload className="w-3 h-3 text-emerald-700" />
                          <span>Upload Sampul Foto</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = async (evt) => {
                                const b64 = evt.target?.result as string;
                                if (b64) {
                                  updateGallery(item.id, { image: b64 });
                                  setHasUnsavedChanges(true);
                                  try {
                                    const res = await fetch('/api/upload-image', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ image: b64, type: 'gallery', filename: file.name })
                                    });
                                    const data = await res.json();
                                    if (res.ok && data.url) {
                                      updateGallery(item.id, { image: data.url });
                                      onToast('✅ Foto sampul berhasil diunggah ke server!');
                                    }
                                  } catch (err) {}
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={item.image}
                      onChange={(e) => updateGallery(item.id, { image: e.target.value })}
                      placeholder="https://... atau otomatis terisi saat upload video"
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Judul Dokumentasi</label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateGallery(item.id, { title: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Kategori</label>
                      <input
                        type="text"
                        value={item.category}
                        onChange={(e) => updateGallery(item.id, { category: e.target.value as any })}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Keterangan Singkat</label>
                    <textarea
                      rows={2}
                      value={item.description}
                      onChange={(e) => updateGallery(item.id, { description: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 9: KONTAK & WHATSAPP */}
      {/* ========================================================================= */}
      {activeSubTab === 'kontak' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-900/10 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#064e3b]">Informasi Kontak & Media Silaturahmi</h3>
            <p className="text-xs text-gray-500">
              Pengaturan nomor WhatsApp, email, dan akun media sosial yang langsung terhubung ke publik.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Nomor WhatsApp Resmi (Contoh: +62 812-3456-7890)
              </label>
              <input
                type="text"
                value={draft.profile.phone}
                onChange={(e) => updateProfile('phone', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Alamat Email Kontak
              </label>
              <input
                type="email"
                value={draft.profile.email}
                onChange={(e) => updateProfile('email', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Link WhatsApp Web (wa.me)
              </label>
              <input
                type="text"
                value={draft.profile.socials.whatsapp || ''}
                onChange={(e) => updateProfileSocial('whatsapp', e.target.value)}
                placeholder="https://wa.me/6281234567890"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Kanal YouTube Dakwah
              </label>
              <input
                type="text"
                value={draft.profile.socials.youtube || ''}
                onChange={(e) => updateProfileSocial('youtube', e.target.value)}
                placeholder="https://youtube.com/@..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Instagram
              </label>
              <input
                type="text"
                value={draft.profile.socials.instagram || ''}
                onChange={(e) => updateProfileSocial('instagram', e.target.value)}
                placeholder="https://instagram.com/..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Facebook / Halaman Madrasah
              </label>
              <input
                type="text"
                value={draft.profile.socials.facebook || ''}
                onChange={(e) => updateProfileSocial('facebook', e.target.value)}
                placeholder="https://facebook.com/..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 10: VISIBILITAS SEKSI */}
      {/* ========================================================================= */}
      {activeSubTab === 'visibility' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-900/10 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#064e3b]">Pengaturan Visibilitas Bagian Website</h3>
            <p className="text-xs text-gray-500">
              Tentukan seksi mana saja yang ingin ditampilkan atau disembunyikan di halaman utama publik.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { key: 'hero', label: '1. Banner Hero Utama', desc: 'Foto, salam pembuka, dan statistik' },
              { key: 'about', label: '2. Profil & Biografi', desc: 'Narasi kiprah, pendidikan, quote mutiara' },
              { key: 'pillars', label: '3. Empat Pilar Madrasah', desc: 'Nilai luhur adab, sains, dan spiritualitas' },
              { key: 'publications', label: '4. Karya & Modul Pembelajaran', desc: 'Buku, jurnal, dan modul ajar' },
              { key: 'youtubeChannel', label: '5. Siaran Media & Kanal Digital', desc: 'Feed video YouTube, TikTok, IG, FB' },
              { key: 'experience', label: '6. Linimasa Pengabdian', desc: 'Rekam jejak karir & organisasi' },
              { key: 'agenda', label: '7. Agenda & Jadwal Kajian', desc: 'Jadwal seminar dan pelatihan PKB' },
              { key: 'islamicTools', label: '8. Fitur Islami (Tasbih & Sholat)', desc: 'Tasbih digital & waktu sholat' },
              { key: 'gallery', label: '9. Galeri Foto Dokumentasi', desc: 'Dokumentasi kegiatan dan momentum' },
              { key: 'contact', label: '10. Formulir Kontak & Silaturahmi', desc: 'WhatsApp langsung & form pesan' }
            ].map((sec) => {
              const isVisible = draft.visibility[sec.key as keyof SectionVisibilityConfig] ?? true;
              return (
                <div
                  key={sec.key}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    isVisible
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                      : 'bg-gray-50 border-gray-200 text-gray-400'
                  }`}
                >
                  <div className="pr-3">
                    <span className="text-xs font-bold block">{sec.label}</span>
                    <span className="text-[10px] text-gray-500">{sec.desc}</span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={(e) => updateVisibility(sec.key as keyof SectionVisibilityConfig, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-800"></div>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 11: CADANGAN JSON (BACKUP & RESTORE) */}
      {/* ========================================================================= */}
      {activeSubTab === 'backup' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-900/10 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#064e3b]">Cadangan & Pemulihan Data Konten (JSON)</h3>
            <p className="text-xs text-gray-500">
              Ekspor seluruh konfigurasi situs ke berkas JSON untuk disimpan secara lokal, atau impor kembali sewaktu-waktu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ekspor JSON */}
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <Download className="w-4 h-4 text-emerald-700" />
                  <span>Ekspor Cadangan Konten Website</span>
                </div>
                <p className="text-xs text-emerald-800/80 leading-relaxed">
                  Unduh seluruh teks, profil, riwayat pendidikan, pilar, karya, jadwal, galeri, dan pengaturan visibilitas dalam 1 berkas JSON.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportJson}
                className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Download className="w-4 h-4 text-amber-300" />
                <span>Unduh Berkas JSON Backup</span>
              </button>
            </div>

            {/* Impor JSON */}
            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <Upload className="w-4 h-4 text-amber-700" />
                  <span>Impor / Pulihkan dari JSON</span>
                </div>
                <p className="text-xs text-amber-800/80">
                  Tempelkan teks JSON cadangan di bawah untuk memulihkan konten situs.
                </p>
              </div>

              <textarea
                rows={4}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='Tempel kode JSON di sini (misal: {"profile": {...}})...'
                className="w-full p-2.5 rounded-xl border border-amber-300 text-xs font-mono bg-white"
              />

              {jsonError && (
                <p className="text-xs text-red-600 font-semibold">{jsonError}</p>
              )}

              <button
                type="button"
                onClick={handleImportJson}
                disabled={!jsonInput.trim()}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Muat Data JSON ke Editor</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Quick Save Bar */}
      <div className={`sticky bottom-4 z-30 ${hasUnsavedChanges ? 'bg-gradient-to-r from-amber-950 via-[#064e3b] to-amber-950 border-amber-400 animate-pulse-slow' : 'bg-[#064e3b]/95 border-amber-400/80'} backdrop-blur-md rounded-2xl p-4 border-2 shadow-2xl flex items-center justify-between text-white transition-all`}>
        <div className="flex items-center gap-2.5">
          {hasUnsavedChanges ? (
            <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-semibold text-emerald-100">
            {hasUnsavedChanges
              ? 'Ada perubahan belum disimpan! Klik tombol untuk menyimpan ke database & mempublikasikan.'
              : 'Seluruh konten tersimpan & tersinkronisasi.'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Perubahan Publik</span>
        </button>
      </div>

      {/* Modal Pratinjau Video Universal */}
      {previewVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Play className="w-4 h-4 text-red-500 fill-current" />
                <h4 className="text-sm font-bold text-white truncate">
                  Tes Pemutar: {previewVideoModal.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewVideoModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <UniversalMediaPlayer
                url={previewVideoModal.url}
                title={previewVideoModal.title}
                autoPlay={true}
              />
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <span className="truncate max-w-[300px] font-mono text-[11px] text-slate-500">
                  {previewVideoModal.url}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewVideoModal(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                >
                  Tutup Pratinjau
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
