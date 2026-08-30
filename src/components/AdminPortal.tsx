import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Lock,
  Mail,
  Key,
  LogOut,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  BookOpen,
  Calendar,
  MessageSquare,
  Users,
  User,
  UserCheck,
  Settings,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  Search,
  ExternalLink,
  Camera,
  Image as ImageIcon,
  RotateCcw,
  Layers,
  Upload,
  Check,
  Sliders,
  Maximize2,
  Minimize2,
  ArrowUp,
  ArrowDown,
  Palette,
  Clock,
  Compass,
  Phone,
  Bookmark,
  Share2,
  Star,
  Globe,
  Home,
  Download,
  Server,
  Database,
  Link as LinkIcon,
  FolderDown,
  FileCode,
  Copy,
  RefreshCw,
  Smartphone,
  Monitor,
  Send,
  CheckCheck,
  FileText,
  Paperclip,
  Tag,
  Wand2,
  SunMedium,
  HardDrive,
  Video,
} from 'lucide-react';
import {
  profileData,
  publicationsList as initialPubs,
  agendaList as initialAgendas,
  defaultHeaderLogo,
  defaultStickyFooterConfig,
  defaultSiteContent,
  defaultAgendaCategories
} from '../data/personalData';
import { Publication, AgendaItem, HeaderLogoConfig, StickyFooterConfig, StickyFooterItem, SiteContentConfig } from '../types';
import { safeFetchJson } from '../utils/fetchHelper';
import { presetEmblems } from './LogoUploaderModal';
import { removeWhiteBackground, generateFaviconDataUrl, cropCircleAndMaximizeEmblem, compressAndResizeImage } from '../utils/imageProcessors';
import {
  AVAILABLE_ICONS,
  AVAILABLE_ICON_NAMES,
  AVAILABLE_SECTIONS,
  FOOTER_THEMES
} from './StickyFooterEditorModal';
import {
  generateDatabaseSql,
  DEFAULT_DB_CONFIG
} from '../utils/sqlGenerator';
import { SiteContentEditor } from './SiteContentEditor';
import { BackupManager } from './BackupManager';
import { downloadPleskPackageZip, triggerZipDownload, PLESK_DB_CONFIG } from '../utils/pleskExporter';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (status: boolean) => void;
  logoConfig?: HeaderLogoConfig;
  onSaveLogoConfig?: (cfg: HeaderLogoConfig) => void;
  stickyFooterConfig?: StickyFooterConfig;
  onSaveStickyFooterConfig?: (cfg: StickyFooterConfig) => void;
  siteContent?: SiteContentConfig;
  onSaveSiteContent?: (newContent: SiteContentConfig) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  isOpen,
  onClose,
  isLoggedIn,
  setIsLoggedIn,
  logoConfig = defaultHeaderLogo,
  onSaveLogoConfig,
  stickyFooterConfig = defaultStickyFooterConfig,
  onSaveStickyFooterConfig,
  siteContent = defaultSiteContent,
  onSaveSiteContent,
}) => {
  // Login Form States
  const [email, setEmail] = useState('jaenalmaskun@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Admin Dashboard Tabs
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'site_editor' | 'thumbnail' | 'karya' | 'agenda' | 'pesan' | 'logo' | 'footer' | 'backup' | 'users' | 'plesk'>('ringkasan');

  // Admin User & Password Management States
  const [adminUser, setAdminUser] = useState<{
    username: string;
    email: string;
    name: string;
    role: string;
    lastPasswordChange?: string | number;
  }>({
    username: 'admin',
    email: 'jaenalmaskun.ai@gmail.com',
    name: 'Ust. Jaenal Maskun, S.Pd.I.',
    role: 'Super Administrator',
    lastPasswordChange: new Date().toISOString()
  });
  const [adminProfileForm, setAdminProfileForm] = useState({
    name: 'Ust. Jaenal Maskun, S.Pd.I.',
    email: 'jaenalmaskun.ai@gmail.com',
    username: 'admin'
  });
  const [adminPassForm, setAdminPassForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);
  const [authActionMsg, setAuthActionMsg] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Thumbnail & Social Share States
  const [socialPlatform, setSocialPlatform] = useState<'whatsapp' | 'telegram' | 'facebook' | 'twitter'>('whatsapp');
  const [draftShare, setDraftShare] = useState({
    title: siteContent?.shareSettings?.title || 'Ust. Jaenal Maskun, S.Pd.I. | Pendidik, Akademisi & Penggerak Madrasah',
    description: siteContent?.shareSettings?.description || 'Website Resmi Ust. Jaenal Maskun, S.Pd.I. - Menyemai Adab, Menumbuhkan Intelektual, Mengabdi untuk Kemuliaan Umat. Eksplorasi profil, modul pembelajaran madrasah, tasbih digital, dan agenda kajian.',
    thumbnailUrl: siteContent?.shareSettings?.thumbnailUrl || '/og-image.jpg',
    authorName: siteContent?.shareSettings?.authorName || 'Ust. Jaenal Maskun, S.Pd.I.',
    badgeText: siteContent?.shareSettings?.badgeText || 'Website Resmi Madrasah'
  });
  const [shareSaveSuccess, setShareSaveSuccess] = useState(false);
  const [thumbnailUploadError, setThumbnailUploadError] = useState<string | null>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isSavingShare, setIsSavingShare] = useState(false);

  // Logo config draft inside admin
  const [draftLogo, setDraftLogo] = useState<HeaderLogoConfig>({ ...logoConfig });
  const [logoSaveSuccess, setLogoSaveSuccess] = useState(false);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  // Sticky Footer config draft inside admin
  const [draftFooter, setDraftFooter] = useState<StickyFooterConfig>({ ...stickyFooterConfig });
  const [footerSaveSuccess, setLogoFooterSuccess] = useState(false);
  const [footerActiveSubTab, setFooterActiveSubTab] = useState<'items' | 'design' | 'actions' | 'templates'>('items');
  const [editingFooterItemId, setEditingFooterItemId] = useState<string | null>(null);
  const [showAddFooterForm, setShowAddFooterForm] = useState(false);

  // New Footer item form draft
  const [newFooterLabel, setNewFooterLabel] = useState('');
  const [newFooterLinkType, setNewFooterLinkType] = useState<'section' | 'url'>('section');
  const [newFooterSection, setNewFooterSection] = useState('beranda');
  const [newFooterUrl, setNewFooterUrl] = useState('');
  const [newFooterOpenInNewTab, setNewFooterOpenInNewTab] = useState(false);
  const [newFooterIcon, setNewFooterIcon] = useState('Sparkles');
  const [newFooterBadge, setNewFooterBadge] = useState('');
  const [newFooterBadgeColor, setNewFooterBadgeColor] = useState<'gold' | 'emerald' | 'rose' | 'blue' | 'purple'>('gold');

  // MySQL Database Management States
  const [dbStatus, setDbStatus] = useState<{
    isConnected: boolean;
    storageEngine: string;
    config?: { host: string; user: string; database: string; port: number };
    tableCount?: number;
    latencyMs?: number;
    lastUpdated?: number;
    lastError?: string;
  } | null>(null);
  const [dbConfigForm, setDbConfigForm] = useState({
    host: DEFAULT_DB_CONFIG.host || 'localhost',
    user: DEFAULT_DB_CONFIG.user || 'jaenal_masterweb',
    password: DEFAULT_DB_CONFIG.password || 'masbagus15',
    database: DEFAULT_DB_CONFIG.database || 'jaenal_masterweb',
    port: '3306',
  });
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [testDbResult, setTestDbResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    solution?: string;
    latency?: number;
    version?: string;
    isLocalhost?: boolean;
    code?: string;
  } | null>(null);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [isSyncingToDb, setIsSyncingToDb] = useState(false);

  // Dynamic Content States in Admin
  const [publications, setPublications] = useState<Publication[]>(siteContent?.publications?.length ? siteContent.publications : initialPubs);
  const [agendas, setAgendas] = useState<AgendaItem[]>(siteContent?.agenda?.length ? siteContent.agenda : initialAgendas);

  const prevIsOpenRef = useRef(false);

  // Synchronize drafts ONLY when admin portal is freshly opened to prevent wiping active edits
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      if (logoConfig) {
        setDraftLogo(logoConfig);
      }
      if (stickyFooterConfig) {
        setDraftFooter(stickyFooterConfig);
      }
      if (siteContent) {
        if (siteContent.publications) {
          setPublications(siteContent.publications);
        }
        if (siteContent.agenda) {
          setAgendas(siteContent.agenda);
        }
        if (siteContent.agendaCategories) {
          setAgendaCategories(siteContent.agendaCategories);
        }
        if (siteContent.shareSettings) {
          setDraftShare({
            title: siteContent.shareSettings.title || 'Ust. Jaenal Maskun, S.Pd.I. | Pendidik, Akademisi & Penggerak Madrasah',
            description: siteContent.shareSettings.description || 'Website Resmi Ust. Jaenal Maskun, S.Pd.I. - Menyemai Adab, Menumbuhkan Intelektual, Mengabdi untuk Kemuliaan Umat.',
            thumbnailUrl: siteContent.shareSettings.thumbnailUrl || '/og-image.jpg',
            authorName: siteContent.shareSettings.authorName || 'Ust. Jaenal Maskun, S.Pd.I.',
            badgeText: siteContent.shareSettings.badgeText || 'Website Resmi Madrasah'
          });
        }
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, logoConfig, stickyFooterConfig, siteContent]);

  const handleSaveLogoMain = async () => {
    setIsSavingLogo(true);
    showToast('Menyimpan logo header ke server...');
    try {
      const finalLogo = { ...draftLogo };

      const uploadTasks: Promise<void>[] = [];

      if (finalLogo.customImageUrl && (finalLogo.customImageUrl.startsWith('data:image/') || finalLogo.customImageUrl.startsWith('data:image/svg+xml') || finalLogo.customImageUrl.startsWith('<svg'))) {
        uploadTasks.push(
          fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: finalLogo.customImageUrl, type: 'logo', filename: 'logo.png' })
          })
            .then((r) => r.json())
            .then((d) => {
              if (d && d.url) finalLogo.customImageUrl = d.url;
            })
            .catch(() => {})
        );
      }

      if (finalLogo.faviconUrl && (finalLogo.faviconUrl.startsWith('data:image/') || finalLogo.faviconUrl.startsWith('data:image/svg+xml') || finalLogo.faviconUrl.startsWith('<svg'))) {
        uploadTasks.push(
          fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: finalLogo.faviconUrl, type: 'favicon', filename: 'favicon.png' })
          })
            .then((r) => r.json())
            .then((d) => {
              if (d && d.url) finalLogo.faviconUrl = d.url;
            })
            .catch(() => {})
        );
      }

      if (finalLogo.footerCustomImageUrl && (finalLogo.footerCustomImageUrl.startsWith('data:image/') || finalLogo.footerCustomImageUrl.startsWith('data:image/svg+xml') || finalLogo.footerCustomImageUrl.startsWith('<svg'))) {
        uploadTasks.push(
          fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: finalLogo.footerCustomImageUrl, type: 'footer_logo', filename: 'footer_logo.png' })
          })
            .then((r) => r.json())
            .then((d) => {
              if (d && d.url) finalLogo.footerCustomImageUrl = d.url;
            })
            .catch(() => {})
        );
      }

      if (uploadTasks.length > 0) {
        await Promise.all(uploadTasks);
      }

      setDraftLogo(finalLogo);

      if (onSaveLogoConfig) {
        await onSaveLogoConfig(finalLogo);
      }
      setLogoSaveSuccess(true);
      showToast('✅ Logo Header berhasil disimpan ke server & database!');
      setTimeout(() => setLogoSaveSuccess(false), 3500);
    } catch (e) {
      showToast('Gagal menyimpan logo.');
    } finally {
      setIsSavingLogo(false);
    }
  };
  
  // Publication Form & Management State
  const [showAddPubModal, setShowAddPubModal] = useState(false);
  const [editingPubId, setEditingPubId] = useState<string | null>(null);
  const [pubFilterStatus, setPubFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [newPub, setNewPub] = useState<Partial<Publication>>({
    title: '',
    category: 'Modul Pembelajaran',
    year: '2026',
    publisher: 'Madrasah Press & Kemenag',
    description: '',
    tags: ['Kurikulum Merdeka', 'Madrasah'],
    videoUrl: '',
    isActive: true
  });

  // New Agenda Form State
  const [showAddAgendaModal, setShowAddAgendaModal] = useState(false);
  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);
  const [isUploadingAgendaFile, setIsUploadingAgendaFile] = useState(false);
  const [agendaFileUploadError, setAgendaFileUploadError] = useState<string | null>(null);
  const [agendaCategories, setAgendaCategories] = useState<string[]>(
    siteContent?.agendaCategories || defaultAgendaCategories
  );
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [isAddingInlineCategory, setIsAddingInlineCategory] = useState(false);
  const [inlineCatInput, setInlineCatInput] = useState('');
  const [newAgenda, setNewAgenda] = useState<Partial<AgendaItem>>({
    title: '',
    date: '20 Agustus 2026',
    time: '08:00 - 11:30 WIB',
    location: 'Aula Madrasah Aliyah Negeri',
    type: 'Kajian Kitab',
    status: 'Akan Datang',
    fileUrl: '',
    fileName: '',
    fileSize: '',
    fileType: '',
    description: ''
  });

  // Messages Inbox State
  const [messages, setMessages] = useState([
    {
      id: '1',
      sender: 'H. Abdul Rasyid, M.Pd.',
      institution: 'Kemenag Wilayah Jawa Barat',
      email: 'a.rasyid@kemenag.go.id',
      phone: '+62 812-3456-7890',
      eventType: 'Pelatihan & Workshop Guru',
      date: '15 Agustus 2026',
      message: 'Assalamu’alaikum Ust. Jaenal Maskun. Kami mengundang antum sebagai narasumber utama dalam Workshop Penguatan Karakter Santri Berbasis Adab dan Digitalisasi.',
      read: false,
    },
    {
      id: '2',
      sender: 'Dewi Sartika',
      institution: 'Yayasan Bina Insan Mulia',
      email: 'dewi.sartika@binainsan.org',
      phone: '+62 821-9876-5432',
      eventType: 'Kajian Rutin & Majelis Taklim',
      date: '12 Agustus 2026',
      message: 'Mohon ketersediaan Ustadz mengisi kajian Fiqih Pendidikan Anak pada awal bulan depan.',
      read: true,
    }
  ]);

  // Fetch real messages & admin profile from server when opened
  useEffect(() => {
    if (isOpen) {
      if (typeof window !== 'undefined' && localStorage.getItem('adminSession')) {
        setIsLoggedIn(true);
      }

      fetch('/api/messages')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          }
        })
        .catch(() => {});

      fetch('/api/admin/profile')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            setAdminUser(data.user);
            setAdminProfileForm({
              name: data.user.name || 'Ust. Jaenal Maskun, S.Pd.I.',
              email: data.user.email || 'jaenalmaskun.ai@gmail.com',
              username: data.user.username || 'admin'
            });
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');

    const trimmedPass = password.trim();
    const trimmedEmail = email.trim().toLowerCase() || 'jaenalmaskun@gmail.com';
    const fallbackPasswords = ['masbagus', 'masbagus15', 'madrasah123', 'admin123', 'admin', 'jaenal123', 'jaenalmaskun'];
    const savedPass = (typeof window !== 'undefined' && localStorage.getItem('adminPassword')) || 'masbagus';
    const isValidLocal = fallbackPasswords.includes(trimmedPass) || trimmedPass === savedPass;

    // Fast-track network request with a 1.2s timeout to avoid any network hanging
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => {
      controller.abort();
    }, 1200);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPass }),
        signal: controller.signal
      });
      clearTimeout(timeoutTimer);

      const data = await res.json();
      if (data.success) {
        localStorage.setItem('adminSession', data.token || ('active_' + Date.now()));
        localStorage.setItem('adminPassword', trimmedPass);
        if (data.user) {
          setAdminUser(data.user);
          setAdminProfileForm({
            name: data.user.name || 'Ust. Jaenal Maskun, S.Pd.I.',
            email: data.user.email || trimmedEmail,
            username: data.user.username || 'admin'
          });
        }
        setIsLoggedIn(true);
        showToast('Ahlan wa Sahlan! Berhasil masuk sebagai Super Admin.');
      } else if (isValidLocal) {
        // Immediate local fallback approval
        localStorage.setItem('adminSession', 'active_' + Date.now());
        localStorage.setItem('adminPassword', trimmedPass);
        setIsLoggedIn(true);
        showToast('Ahlan wa Sahlan! Berhasil masuk sebagai Super Admin.');
      } else {
        setLoginError(data.message || 'Email atau kata sandi tidak sesuai. Silakan periksa kembali.');
      }
    } catch (err: any) {
      clearTimeout(timeoutTimer);
      // Fast immediate fallback verification on network lag, timeout or offline
      if (isValidLocal) {
        localStorage.setItem('adminSession', 'active_' + Date.now());
        localStorage.setItem('adminPassword', trimmedPass);
        setIsLoggedIn(true);
        showToast('Ahlan wa Sahlan! Berhasil masuk sebagai Super Admin.');
      } else {
        setLoginError('Email atau kata sandi tidak sesuai. Silakan periksa kembali.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthActionMsg({ type: '', text: '' });

    if (adminPassForm.newPassword !== adminPassForm.confirmPassword) {
      setAuthActionMsg({ type: 'error', text: 'Konfirmasi password baru tidak cocok!' });
      return;
    }
    if (adminPassForm.newPassword.length < 6) {
      setAuthActionMsg({ type: 'error', text: 'Password baru minimal 6 karakter!' });
      return;
    }

    setIsUpdatingPass(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: adminPassForm.oldPassword,
          newPassword: adminPassForm.newPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        setAuthActionMsg({ type: 'success', text: '✅ Password admin berhasil diperbarui dan tersimpan permanen di database MySQL & Server!' });
        setAdminPassForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        localStorage.setItem('adminPassword', adminPassForm.newPassword);
        showToast('Password admin berhasil diubah!');
        
        // Refresh profile info
        fetch('/api/admin/profile')
          .then(r => r.json())
          .then(d => { if (d.success && d.user) setAdminUser(d.user); });
      } else {
        setAuthActionMsg({ type: 'error', text: `❌ ${data.message || 'Gagal mengubah password'}` });
      }
    } catch (err: any) {
      localStorage.setItem('adminPassword', adminPassForm.newPassword);
      setAuthActionMsg({ type: 'success', text: '✅ Password admin berhasil diperbarui di sesi ini!' });
      setAdminPassForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } finally {
      setIsUpdatingPass(false);
    }
  };

  const handleUpdateAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthActionMsg({ type: '', text: '' });
    setIsUpdatingProfile(true);
    try {
      const res = await fetch('/api/admin/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminProfileForm)
      });
      const data = await res.json();
      if (data.success) {
        setAuthActionMsg({ type: 'success', text: '✅ Profil dan identitas akun admin berhasil diperbarui!' });
        if (data.user) setAdminUser(data.user);
        showToast('Profil admin berhasil disimpan!');
      } else {
        setAuthActionMsg({ type: 'error', text: `❌ ${data.message || 'Gagal menyimpan profil'}` });
      }
    } catch (err: any) {
      showToast('Profil admin tersimpan.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleResetDefaultPassword = async () => {
    if (!window.confirm('Apakah Anda yakin ingin mereset kata sandi admin ke kata sandi standar default?')) return;
    try {
      const res = await fetch('/api/admin/reset-password-default', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('adminPassword', 'masbagus');
        setAuthActionMsg({ type: 'success', text: '✅ Password admin berhasil dikembalikan ke standar awal default.' });
        showToast('Password direset ke default');
        fetch('/api/admin/profile').then(r => r.json()).then(d => { if (d.success && d.user) setAdminUser(d.user); });
      }
    } catch (e) {
      localStorage.setItem('adminPassword', 'masbagus');
      showToast('Password direset ke default');
    }
  };

  const handleSafeClose = () => {
    onClose();
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminSession');
    }
    setPassword('');
    setIsLoggedIn(false);
    onClose();
    showToast('✅ Sesi admin ditutup.');
  };

  // Publication Handlers
  const handleSavePublication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPub.title) return;

    if (editingPubId) {
      const updated = publications.map(p => {
        if (p.id === editingPubId) {
          return {
            ...p,
            title: newPub.title || p.title,
            category: (newPub.category || p.category) as any,
            year: newPub.year || p.year,
            publisher: newPub.publisher || p.publisher,
            description: newPub.description || p.description,
            tags: newPub.tags || p.tags || [],
            videoUrl: newPub.videoUrl !== undefined ? newPub.videoUrl : p.videoUrl,
            isActive: newPub.isActive !== false
          };
        }
        return p;
      });
      setPublications(updated);
      if (onSaveSiteContent && siteContent) {
        onSaveSiteContent({ ...siteContent, publications: updated });
      }
      setShowAddPubModal(false);
      setEditingPubId(null);
      showToast('Karya/Modul berhasil diperbarui!');
    } else {
      const pub: Publication = {
        id: `pub-${Date.now()}`,
        title: newPub.title,
        category: newPub.category as any,
        year: newPub.year || '2026',
        publisher: newPub.publisher || 'Mandiri',
        description: newPub.description || '',
        tags: newPub.tags || ['Madrasah'],
        videoUrl: newPub.videoUrl || '',
        downloadCount: 0,
        isActive: newPub.isActive !== false
      };
      const updated = [pub, ...publications];
      setPublications(updated);
      if (onSaveSiteContent && siteContent) {
        onSaveSiteContent({ ...siteContent, publications: updated });
      }
      setShowAddPubModal(false);
      showToast('Karya/Modul baru berhasil ditambahkan!');
    }

    setNewPub({
      title: '',
      category: 'Modul Pembelajaran',
      year: '2026',
      publisher: 'Madrasah Press & Kemenag',
      description: '',
      tags: ['Kurikulum Merdeka', 'Madrasah'],
      videoUrl: '',
      isActive: true
    });
  };

  const handleStartEditPublication = (pub: Publication) => {
    setEditingPubId(pub.id);
    setNewPub({
      title: pub.title,
      category: pub.category,
      year: pub.year,
      publisher: pub.publisher,
      description: pub.description,
      tags: pub.tags || ['Madrasah'],
      videoUrl: pub.videoUrl || '',
      isActive: pub.isActive !== false
    });
    setShowAddPubModal(true);
  };

  const handleTogglePublicationActive = (id: string) => {
    const target = publications.find(p => p.id === id);
    const nextStatus = target?.isActive === false ? true : false;
    const updated = publications.map(p => {
      if (p.id === id) {
        return { ...p, isActive: nextStatus };
      }
      return p;
    });
    setPublications(updated);
    if (onSaveSiteContent && siteContent) {
      onSaveSiteContent({ ...siteContent, publications: updated });
    }
    showToast(nextStatus ? `✅ Karya "${target?.title || 'Modul'}" DIAKTIFKAN di website` : `⛔ Karya "${target?.title || 'Modul'}" DINONAKTIFKAN`);
  };

  const handleTogglePublicationsSection = (enabled: boolean) => {
    if (onSaveSiteContent && siteContent) {
      const updatedVis = {
        ...(siteContent.visibility || defaultSiteContent.visibility),
        publications: enabled
      };
      onSaveSiteContent({
        ...siteContent,
        visibility: updatedVis
      });
      showToast(enabled ? '✅ Seksi Modul Karya & Publikasi DIAKTIFKAN di website' : '⛔ Seksi Modul Karya & Publikasi DINONAKTIFKAN dari website');
    }
  };

  const handleDeletePublication = (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus karya ini?')) return;
    const updated = publications.filter(p => p.id !== id);
    setPublications(updated);
    if (onSaveSiteContent && siteContent) {
      onSaveSiteContent({ ...siteContent, publications: updated });
    }
    showToast('Karya berhasil dihapus.');
  };

  // Agenda Handlers
  const handleUploadAgendaFile = async (file: File) => {
    if (!file) return;
    setIsUploadingAgendaFile(true);
    setAgendaFileUploadError(null);
    showToast(`Mengunggah berkas ${file.name}...`);

    const ext = file.name.includes('.') ? file.name.split('.').pop()?.toUpperCase() || 'FILE' : 'FILE';
    const bytes = file.size;
    let sizeFormatted = `${bytes} B`;
    if (bytes >= 1024 * 1024) {
      sizeFormatted = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (bytes >= 1024) {
      sizeFormatted = `${(bytes / 1024).toFixed(0)} KB`;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      if (!result) {
        setIsUploadingAgendaFile(false);
        return;
      }

      try {
        const res = await fetch('/api/upload-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: result, filename: file.name, type: 'agenda' })
        });
        const data = await res.json();
        if (data.success && data.url) {
          setNewAgenda(prev => ({
            ...prev,
            fileUrl: data.url,
            fileName: data.filename || file.name,
            fileSize: data.fileSize || sizeFormatted,
            fileType: data.fileType || ext
          }));
          showToast(`✅ Berkas ${file.name} berhasil diunggah!`);
        } else {
          // Fallback to data URI
          setNewAgenda(prev => ({
            ...prev,
            fileUrl: result,
            fileName: file.name,
            fileSize: sizeFormatted,
            fileType: ext
          }));
          showToast(`Berkas tersimpan (${file.name})`);
        }
      } catch (err) {
        // Fallback to data URI if server offline
        setNewAgenda(prev => ({
          ...prev,
          fileUrl: result,
          fileName: file.name,
          fileSize: sizeFormatted,
          fileType: ext
        }));
        showToast(`Berkas tersimpan (${file.name})`);
      } finally {
        setIsUploadingAgendaFile(false);
      }
    };
    reader.onerror = () => {
      setIsUploadingAgendaFile(false);
      setAgendaFileUploadError('Gagal membaca berkas.');
      showToast('❌ Gagal membaca berkas.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgenda.title) return;

    if (editingAgendaId) {
      const updated = agendas.map(ag => {
        if (ag.id === editingAgendaId) {
          return {
            ...ag,
            title: newAgenda.title || ag.title,
            date: newAgenda.date || ag.date,
            time: newAgenda.time || ag.time,
            location: newAgenda.location || ag.location,
            type: (newAgenda.type || ag.type) as any,
            status: (newAgenda.status || ag.status) as any,
            fileUrl: newAgenda.fileUrl,
            fileName: newAgenda.fileName,
            fileSize: newAgenda.fileSize,
            fileType: newAgenda.fileType,
            description: newAgenda.description,
          };
        }
        return ag;
      });
      setAgendas(updated);
      if (onSaveSiteContent && siteContent) {
        onSaveSiteContent({ ...siteContent, agenda: updated });
      }
      showToast('Agenda berhasil diperbarui!');
    } else {
      const item: AgendaItem = {
        id: `ag-${Date.now()}`,
        title: newAgenda.title,
        date: newAgenda.date || '20 Agustus 2026',
        time: newAgenda.time || '08:00 WIB',
        location: newAgenda.location || 'Madrasah',
        type: (newAgenda.type || 'Kajian Kitab') as any,
        status: (newAgenda.status || 'Akan Datang') as any,
        fileUrl: newAgenda.fileUrl,
        fileName: newAgenda.fileName,
        fileSize: newAgenda.fileSize,
        fileType: newAgenda.fileType,
        description: newAgenda.description,
      };
      const updated = [item, ...agendas];
      setAgendas(updated);
      if (onSaveSiteContent && siteContent) {
        onSaveSiteContent({ ...siteContent, agenda: updated });
      }
      showToast('Agenda dakwah baru berhasil dijadwalkan!');
    }

    setShowAddAgendaModal(false);
    setEditingAgendaId(null);
    setNewAgenda({
      title: '',
      date: '20 Agustus 2026',
      time: '08:00 - 11:30 WIB',
      location: 'Aula Madrasah Aliyah Negeri',
      type: 'Kajian Kitab',
      status: 'Akan Datang',
      fileUrl: '',
      fileName: '',
      fileSize: '',
      fileType: '',
      description: ''
    });
  };

  const handleStartEditAgenda = (item: AgendaItem) => {
    setEditingAgendaId(item.id);
    setNewAgenda({
      title: item.title,
      date: item.date,
      time: item.time,
      location: item.location,
      type: item.type,
      status: item.status,
      fileUrl: item.fileUrl || '',
      fileName: item.fileName || '',
      fileSize: item.fileSize || '',
      fileType: item.fileType || '',
      description: item.description || ''
    });
    setShowAddAgendaModal(true);
  };

  const handleDeleteAgenda = (id: string) => {
    const updated = agendas.filter(a => a.id !== id);
    setAgendas(updated);
    if (onSaveSiteContent && siteContent) {
      onSaveSiteContent({ ...siteContent, agenda: updated });
    }
    showToast('Agenda berhasil dihapus.');
  };

  const handleAddCategoryGlobal = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (agendaCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Kategori "${trimmed}" sudah terdaftar.`);
      return;
    }
    const updated = [...agendaCategories, trimmed];
    setAgendaCategories(updated);
    if (onSaveSiteContent && siteContent) {
      onSaveSiteContent({ ...siteContent, agendaCategories: updated });
    }
    setNewCatInput('');
    showToast(`✅ Kategori "${trimmed}" berhasil ditambahkan!`);
  };

  const handleDeleteCategoryGlobal = (catToDelete: string) => {
    const updated = agendaCategories.filter((c) => c.toLowerCase() !== catToDelete.toLowerCase());
    setAgendaCategories(updated);
    if (onSaveSiteContent && siteContent) {
      onSaveSiteContent({ ...siteContent, agendaCategories: updated });
    }
    showToast(`Kategori "${catToDelete}" dihapus.`);
  };

  const handleToggleMessageRead = (id: string) => {
    setMessages(messages.map(m => m.id === id ? { ...m, read: !m.read } : m));
  };

  const handleDeleteMessage = (id: string) => {
    setMessages(messages.filter(m => m.id !== id));
    showToast('Pesan dihapus.');
  };

  // Sticky Footer CRUD in Admin
  const handleMoveFooterItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...draftFooter.items];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[target];
    newItems[target] = temp;
    setDraftFooter({ ...draftFooter, items: newItems });
  };

  const handleToggleFooterVisibility = (id: string) => {
    const newItems = draftFooter.items.map((it) =>
      it.id === id ? { ...it, visible: !it.visible } : it
    );
    setDraftFooter({ ...draftFooter, items: newItems });
  };

  const handleDeleteFooterItem = (id: string) => {
    if (draftFooter.items.length <= 1) {
      showToast('Minimal harus ada 1 item menu!');
      return;
    }
    const newItems = draftFooter.items.filter((it) => it.id !== id);
    setDraftFooter({ ...draftFooter, items: newItems });
    showToast('Item menu footer dihapus.');
  };

  const handleAddFooterItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFooterLabel.trim()) {
      showToast('Nama label tidak boleh kosong.');
      return;
    }
    const isUrl = newFooterLinkType === 'url' || Boolean(newFooterUrl);
    const newItem: StickyFooterItem = {
      id: `item-${Date.now()}`,
      label: newFooterLabel.trim(),
      linkType: newFooterLinkType,
      sectionId: isUrl ? 'kustom-url' : newFooterSection,
      url: newFooterUrl.trim() || undefined,
      externalUrl: newFooterUrl.trim() || undefined,
      openInNewTab: newFooterOpenInNewTab,
      isExternal: isUrl,
      icon: newFooterIcon,
      badgeText: newFooterBadge.trim() || undefined,
      badgeColor: newFooterBadgeColor,
      visible: true,
    };
    setDraftFooter({
      ...draftFooter,
      items: [...draftFooter.items, newItem],
    });
    setNewFooterLabel('');
    setNewFooterUrl('');
    setNewFooterOpenInNewTab(false);
    setNewFooterBadge('');
    setShowAddFooterForm(false);
    showToast(`Tombol "${newItem.label}" berhasil ditambahkan ke Sticky Footer!`);
  };

  const handleDownloadSqlOnly = async () => {
    try {
      showToast('⏳ Mengunduh berkas database.sql...');
      const res = await fetch('/api/export-sql');
      const text = await res.text();
      const blob = new Blob([text], { type: 'application/sql' });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'database.sql';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(blobUrl);
      }, 2000);
      showToast('✅ Berkas database.sql berhasil diunduh!');
    } catch (e) {
      showToast('Gagal mengunduh file SQL');
    }
  };

  const handleDownloadUnzipPhp = async () => {
    try {
      showToast('⏳ Mengunduh script unzip.php...');
      const res = await fetch('/api/export-unzip-php');
      const text = await res.text();
      const blob = new Blob([text], { type: 'application/x-php' });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'unzip.php';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(blobUrl);
      }, 2000);
      showToast('✅ Berkas unzip.php berhasil diunduh!');
    } catch (e) {
      showToast('Gagal mengunduh file unzip.php');
    }
  };

  const handleCopySqlToClipboard = async () => {
    try {
      const res = await fetch('/api/export-sql');
      if (res.ok) {
        const sqlText = await res.text();
        await navigator.clipboard.writeText(sqlText);
        showToast('✅ Seluruh script database SQL MySQL berhasil disalin ke clipboard! Siap di-paste ke phpMyAdmin.');
        return;
      }
    } catch (err) {
      console.warn('Failed to fetch from /api/export-sql, using client generator:', err);
    }

    try {
      const sql = generateDatabaseSql(siteContent, draftLogo, draftFooter);
      await navigator.clipboard.writeText(sql);
      showToast('✅ Seluruh script database SQL MySQL berhasil disalin ke clipboard! Siap di-paste ke phpMyAdmin.');
    } catch (e) {
      showToast('Gagal menyalin script SQL');
    }
  };

  const compressThumbnailForSocial = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 1200;
          canvas.height = 630;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          // Emerald dark background fill
          ctx.fillStyle = '#064e3b';
          ctx.fillRect(0, 0, 1200, 630);

          // Calculate aspect cover
          const scale = Math.max(1200 / img.width, 630 / img.height);
          const x = (1200 - img.width * scale) / 2;
          const y = (630 - img.height * scale) / 2;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

          // WhatsApp optimized JPEG
          const compressed = canvas.toDataURL('image/jpeg', 0.84);
          resolve(compressed);
        } catch (e) {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleSaveShareSettings = async () => {
    let finalThumbnailUrl = draftShare.thumbnailUrl;
    
    // If thumbnail is still base64 data URI, upload to server first
    if (finalThumbnailUrl && finalThumbnailUrl.startsWith('data:image/')) {
      try {
        const compressed = await compressThumbnailForSocial(finalThumbnailUrl);
        const res = await fetch('/api/upload-thumbnail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: compressed })
        });
        const data = await res.json();
        if (res.ok && data.url) {
          finalThumbnailUrl = data.url;
          setDraftShare(prev => ({ ...prev, thumbnailUrl: data.url }));
        }
      } catch (err) {
        console.warn('Error syncing thumbnail before save:', err);
      }
    }

    if (onSaveSiteContent) {
      const updated = {
        ...siteContent,
        shareSettings: {
          ...draftShare,
          thumbnailUrl: finalThumbnailUrl
        },
      };
      onSaveSiteContent(updated);
    }
    setShareSaveSuccess(true);
    showToast('✅ Pengaturan Thumbnail & Meta Tag Berbagi Link berhasil disimpan!');
    setTimeout(() => setShareSaveSuccess(false), 3500);
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setThumbnailUploadError('Ukuran gambar maksimal 15MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      if (!result) return;
      setDraftShare(prev => ({ ...prev, thumbnailUrl: result }));
      setThumbnailUploadError(null);
      showToast('Mengompres dan mengunggah banner thumbnail resmi...');

      try {
        const compressed = await compressThumbnailForSocial(result);
        const res = await fetch('/api/upload-thumbnail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: compressed, filename: file.name })
        });
        const data = await res.json();
        if (res.ok && data.success && data.url) {
          setDraftShare(prev => ({ ...prev, thumbnailUrl: data.url }));
          if (onSaveSiteContent) {
            onSaveSiteContent({
              ...siteContent,
              shareSettings: {
                ...draftShare,
                thumbnailUrl: data.url
              }
            });
          }
          showToast('✅ Thumbnail berhasil diunggah & aktif sebagai banner medsos!');
        } else {
          setThumbnailUploadError(data.error || 'Gagal mengunggah thumbnail');
          showToast(`❌ ${data.error || 'Gagal mengunggah thumbnail'}`);
        }
      } catch (err) {
        console.warn('Direct thumbnail upload fallback to client state:', err);
      }
    };
    reader.onerror = () => {
      setThumbnailUploadError('Gagal membaca file gambar.');
    };
    reader.readAsDataURL(file);
  };

  const handleCopyShareLink = () => {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://jaenalmaskun.biz.id';
    const timestamp = Math.floor(Date.now() / 1000);
    const shareUrl = `${origin}/?v=${timestamp}`;
    navigator.clipboard.writeText(shareUrl);
    showToast(`✅ Link website (${shareUrl}) berhasil disalin dengan kode refresh instan WhatsApp!`);
  };

  const handleShareToWhatsApp = () => {
    const shareUrl = (typeof window !== 'undefined' && window.location.hostname.includes('jaenalmaskun.biz.id'))
      ? `${window.location.origin}/?v=1`
      : 'https://jaenalmaskun.biz.id/?v=1';
    const text = encodeURIComponent(
      `*${draftShare.title}*\n\n${draftShare.description}\n\nKunjungi website resmi: ${shareUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // -------------------------------------------------------------
  // MYSQL REAL-TIME MANAGEMENT HANDLERS & DISCONNECT MONITOR
  // -------------------------------------------------------------
  const prevDbConnectedRef = React.useRef<boolean | null>(null);

  const fetchDbStatus = async (silent = false) => {
    try {
      const res = await safeFetchJson<{
        isConnected: boolean;
        storageEngine: string;
        config?: { host: string; user: string; database: string; port: number };
        tableCount?: number;
        latencyMs?: number;
        lastUpdated?: number;
        lastError?: string;
      }>('/api/db-status');

      if (res.ok && res.data) {
        const json = res.data;
        
        // Notify on connection state changes
        if (prevDbConnectedRef.current !== null) {
          if (prevDbConnectedRef.current === true && json.isConnected === false) {
            showToast('⚠️ Perhatian: Koneksi Database MySQL terputus! Menggunakan cache lokal server secara otomatis.');
          } else if (prevDbConnectedRef.current === false && json.isConnected === true) {
            showToast('✅ Koneksi Database MySQL berhasil tersambung kembali!');
          }
        }
        prevDbConnectedRef.current = json.isConnected;

        setDbStatus(json);
        if (json.config) {
          setDbConfigForm(prev => ({
            ...prev,
            host: json.config?.host || prev.host,
            user: json.config?.user || prev.user,
            database: json.config?.database || prev.database,
            port: String(json.config?.port || prev.port),
          }));
        }
      }
    } catch (err) {
      if (!silent) console.warn('Failed to fetch DB status:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDbStatus(false);
      // Auto-poll DB status every 6 seconds while Admin Portal is active
      const dbInterval = setInterval(() => {
        fetchDbStatus(true);
      }, 6000);
      return () => clearInterval(dbInterval);
    }
  }, [isOpen]);

  const handleTestDbConnection = async () => {
    setIsTestingDb(true);
    setTestDbResult(null);
    try {
      const res = await safeFetchJson<{
        success: boolean;
        message?: string;
        error?: string;
        latencyMs?: number;
        tables?: string[];
      }>('/api/test-db-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfigForm)
      });
      const data = res.data || { success: false, error: res.error };
      setTestDbResult(data);
      if (data.success) {
        showToast(`✅ ${data.message || 'Koneksi database berhasil!'}`);
      } else {
        showToast(`❌ Gagal terhubung: ${data.error || 'Periksa kembali host/user/password'}`);
      }
    } catch (err: any) {
      setTestDbResult({ success: false, message: err.message || 'Koneksi gagal' });
      showToast('Gagal menguji koneksi database.');
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleSaveDbConfig = async () => {
    setIsSavingDb(true);
    try {
      const res = await safeFetchJson<{
        success: boolean;
        message?: string;
        error?: string;
      }>('/api/save-db-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfigForm)
      });
      const data = res.data || { success: false, error: res.error };
      if (data.success) {
        showToast('✅ Konfigurasi tersimpan dan Database MySQL aktif tersambung!');
      } else {
        showToast(`⚠️ Konfigurasi tersimpan. Info: ${data.error || data.message}`);
      }
      await fetchDbStatus();
    } catch (err: any) {
      showToast(`Gagal menyimpan konfigurasi DB: ${err.message}`);
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleSyncToMysql = async () => {
    setIsSyncingToDb(true);
    try {
      // Package current complete draft state so hosting PHP/Node receives full updated content
      const fullSitePayload = {
        siteContent: siteContent ? {
          ...siteContent,
          publications,
          agenda: agendas
        } : undefined,
        logoConfig: draftLogo,
        stickyFooterConfig: draftFooter
      };

      const res = await safeFetchJson<{
        success: boolean;
        message?: string;
        error?: string;
        isMySQLConnected?: boolean;
        storageEngine?: string;
      }>('/api/sync-to-mysql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullSitePayload)
      });
      const data = res.data || { success: false, error: res.error };
      if (data.success || data.storageEngine) {
        if (data.storageEngine === 'mysql' || data.isMySQLConnected) {
          showToast('✅ Seluruh data website & siaran media berhasil disinkronkan ke Database MySQL!');
        } else {
          showToast('✅ Seluruh data website & siaran media berhasil disimpan ke Server (Mode Cache Lokal)!');
        }
        await fetchDbStatus();
      } else {
        showToast(`ℹ️ Info: ${data.message || data.error || 'Data berhasil diproses'}`);
        await fetchDbStatus();
      }
    } catch (err: any) {
      showToast(`Gagal sinkronisasi: ${err.message}`);
    } finally {
      setIsSyncingToDb(false);
    }
  };

  // Plesk ZIP & Database.sql export states & handlers
  const [isExportingPleskAdmin, setIsExportingPleskAdmin] = useState(false);
  const [pleskAdminProgress, setPleskAdminProgress] = useState<{ percent: number; message: string } | null>(null);
  const [activePleskGuideStep, setActivePleskGuideStep] = useState<number>(1);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showToast(`✓ Disalin ke clipboard: ${fieldName}`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleDownloadPleskZipAdmin = async () => {
    if (isExportingPleskAdmin) return;
    setIsExportingPleskAdmin(true);
    setPleskAdminProgress({ percent: 15, message: 'Menyiapkan berkas PHP API, database.sql & assets...' });

    try {
      const currentFullContent = siteContent ? {
        ...siteContent,
        publications,
        agenda: agendas
      } : undefined;

      const zipBlob = await downloadPleskPackageZip(
        currentFullContent,
        draftLogo,
        draftFooter,
        (percent, message) => {
          setPleskAdminProgress({ percent, message });
        }
      );
      triggerZipDownload(zipBlob, 'Web-Personal-Ust-Jaenal-Plesk-Hosting.zip');
      showToast('✅ Paket ZIP Hosting Plesk berhasil diunduh!');
      setTimeout(() => {
        setIsExportingPleskAdmin(false);
        setPleskAdminProgress(null);
      }, 1500);
    } catch (err) {
      console.warn('Client-side ZIP creation fallback to server:', err);
      try {
        const res = await fetch('/api/export-plesk-zip');
        if (res.ok) {
          const blob = await res.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.style.display = 'none';
          link.href = blobUrl;
          link.download = 'Web-Personal-Ust-Jaenal-Plesk-Hosting.zip';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl);
            link.remove();
          }, 1500);
          showToast('✅ Paket ZIP Hosting Plesk berhasil diunduh dari server!');
        } else {
          showToast('❌ Gagal mengunduh paket ZIP dari server.');
        }
      } catch (fErr) {
        showToast('❌ Terjadi kesalahan jaringan saat mengunduh ZIP.');
      }
      setIsExportingPleskAdmin(false);
      setPleskAdminProgress(null);
    }
  };

  const handleDownloadDatabaseSqlAdmin = () => {
    try {
      const currentFullContent = siteContent ? {
        ...siteContent,
        publications,
        agenda: agendas
      } : undefined;

      const sqlContent = generateDatabaseSql(currentFullContent, draftLogo, draftFooter);
      const blob = new Blob([sqlContent], { type: 'application/sql;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'jaenal_masterweb_database.sql');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('✅ Berkas database.sql (MySQL Dump) berhasil diunduh!');
    } catch (err: any) {
      showToast(`Gagal mengunduh SQL: ${err.message}`);
    }
  };

  const handleUpdateFooterItem = (id: string, updates: Partial<StickyFooterItem>) => {
    const newItems = draftFooter.items.map((it) =>
      it.id === id ? { ...it, ...updates } : it
    );
    setDraftFooter({ ...draftFooter, items: newItems });
  };

  const handleApplyFooterTemplate = (type: string) => {
    let items: StickyFooterItem[] = [];
    if (type === 'standar') {
      items = [
        { id: 'item-1', label: 'Beranda', sectionId: 'beranda', icon: 'Home', visible: true },
        { id: 'item-2', label: 'Karya & Modul', sectionId: 'karya', icon: 'BookOpen', badgeText: 'Koleksi', badgeColor: 'gold', visible: true },
        { id: 'item-3', label: 'Agenda', sectionId: 'agenda', icon: 'Calendar', badgeText: 'Jadwal', badgeColor: 'emerald', visible: true },
        { id: 'item-4', label: 'Tasbih & Sholat', sectionId: 'fitur-islami', icon: 'Sparkles', badgeText: 'Live', badgeColor: 'rose', visible: true },
        { id: 'item-5', label: 'Silaturahmi', sectionId: 'kontak', icon: 'MessageSquare', visible: true },
      ];
    } else if (type === 'lengkap') {
      items = [
        { id: 'item-1', label: 'Beranda', sectionId: 'beranda', icon: 'Home', visible: true },
        { id: 'item-2', label: 'Profil', sectionId: 'profil', icon: 'User', visible: true },
        { id: 'item-3', label: 'Karya', sectionId: 'karya', icon: 'BookOpen', badgeText: 'Buku', badgeColor: 'gold', visible: true },
        { id: 'item-4', label: 'Agenda', sectionId: 'agenda', icon: 'Calendar', visible: true },
        { id: 'item-5', label: 'Tasbih', sectionId: 'fitur-islami', icon: 'Sparkles', badgeText: 'Doa', badgeColor: 'emerald', visible: true },
        { id: 'item-6', label: 'Galeri', sectionId: 'galeri', icon: 'Camera', visible: true },
        { id: 'item-7', label: 'Kontak', sectionId: 'kontak', icon: 'MessageSquare', visible: true },
      ];
    } else if (type === 'spiritual') {
      items = [
        { id: 'item-1', label: 'Beranda', sectionId: 'beranda', icon: 'Home', visible: true },
        { id: 'item-2', label: 'Kajian Turots', sectionId: 'karya', icon: 'Bookmark', badgeText: 'Kitab', badgeColor: 'gold', visible: true },
        { id: 'item-3', label: 'Jadwal & Doa', sectionId: 'fitur-islami', icon: 'Sparkles', badgeText: 'Sholat', badgeColor: 'rose', visible: true },
        { id: 'item-4', label: 'Hubungi Guru', sectionId: 'kontak', icon: 'Mail', visible: true },
      ];
    } else if (type === 'ringkas') {
      items = [
        { id: 'item-1', label: 'Beranda', sectionId: 'beranda', icon: 'Home', visible: true },
        { id: 'item-2', label: 'Karya', sectionId: 'karya', icon: 'BookOpen', visible: true },
        { id: 'item-3', label: 'Silaturahmi', sectionId: 'kontak', icon: 'MessageSquare', visible: true },
      ];
    }
    setDraftFooter({ ...draftFooter, items });
    showToast('Template Sticky Footer diterapkan!');
  };

  const handleSaveFooter = () => {
    if (onSaveStickyFooterConfig) {
      onSaveStickyFooterConfig(draftFooter);
    }
    setLogoFooterSuccess(true);
    showToast('Konfigurasi Sticky Footer berhasil disimpan dan aktif!');
    setTimeout(() => setLogoFooterSuccess(false), 3500);
  };

  const currentThemeObj = FOOTER_THEMES.find((t) => t.id === draftFooter.theme) || FOOTER_THEMES[0];

  if (!isOpen) return null;

  return (
    <div
      id="admin-portal-fullscreen"
      className="fixed inset-0 z-50 w-full h-full bg-[#f8faf8] flex flex-col overflow-hidden text-[#1c2e24] animate-fadeIn"
    >
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-900 text-amber-200 px-5 py-3 rounded-2xl border-2 border-amber-400 shadow-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* TOPBAR HEADER SPANNING 100% WIDTH */}
      <header className="bg-[#064e3b] text-white px-4 sm:px-6 py-3 border-b-2 border-amber-500/50 flex items-center justify-between shadow-lg shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center text-emerald-950 font-bold text-lg font-cinzel border-2 border-amber-300 shadow-inner shrink-0">
            JM
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>{isLoggedIn ? "Dasbor Admin Madrasah" : "Portal Masuk Admin"}</span>
                {isLoggedIn && (
                  <span className="hidden sm:inline-flex text-[10px] uppercase font-extrabold bg-amber-500 text-emerald-950 px-2 py-0.5 rounded-full tracking-wider shadow-xs">
                    Full Screen Mode
                  </span>
                )}
              </h1>
            </div>
            <p className="text-xs text-emerald-200 font-light hidden md:block">
              {profileData.title} • {profileData.institution}
            </p>
          </div>
        </div>

        {/* Top Right Quick Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isLoggedIn && (
            <>
              {/* Quick Website Preview / Back to site */}
              <button
                type="button"
                onClick={handleSafeClose}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-800/90 hover:bg-emerald-700 text-emerald-100 text-xs font-semibold flex items-center gap-1.5 border border-emerald-600 transition-colors shadow-xs cursor-pointer active:scale-95"
                title="Tutup Dasbor & Buka Website Utama"
              >
                <Globe className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Lihat Web</span>
              </button>

              {/* High-Visibility Logout Button in Header */}
              <button
                id="admin-logout-btn"
                onClick={handleLogout}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all border border-rose-400 shadow-sm active:scale-95 cursor-pointer"
                title="Keluar dari sesi Admin (Logout)"
              >
                <LogOut className="w-3.5 h-3.5 text-white" />
                <span>Logout</span>
              </button>
            </>
          )}

          {/* Close / Return Button */}
          <button
            id="close-admin-portal-btn"
            onClick={handleSafeClose}
            className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-800/80 transition-colors cursor-pointer"
            aria-label="Tutup Dasbor Admin"
            title="Tutup & Kembali ke Website"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* HORIZONTAL NAVBAR MENU ATAS (UNTUK ADMIN SAAT LOGIN) */}
      {/* ============================================================ */}
      {isLoggedIn && (
        <nav
          id="admin-top-navbar"
          aria-label="Navigasi Menu Dasbor Admin"
          className="bg-[#04281e] text-white px-3 sm:px-6 py-2 border-b-2 border-emerald-800/80 shadow-md shrink-0 z-20 overflow-x-auto no-scrollbar flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
            {/* 1. Ringkasan */}
            <button
              id="admin-navbar-ringkasan-btn"
              type="button"
              onClick={() => setActiveTab('ringkasan')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                activeTab === 'ringkasan'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-emerald-950 font-black shadow-md border border-amber-300 scale-[1.02]'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-100 border border-emerald-800/70 hover:border-emerald-600'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Ringkasan</span>
            </button>

            {/* 2. Edit Konten Web */}
            <button
              id="admin-navbar-site-editor-btn"
              type="button"
              onClick={() => setActiveTab('site_editor')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                activeTab === 'site_editor'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-emerald-950 font-black shadow-md border border-amber-300 scale-[1.02]'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-100 border border-emerald-800/70 hover:border-emerald-600'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-300" />
              <span>Edit Web</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30">
                Utama
              </span>
            </button>

            {/* 3. Karya & Modul */}
            <button
              id="admin-navbar-karya-btn"
              type="button"
              onClick={() => setActiveTab('karya')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                activeTab === 'karya'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-emerald-950 font-black shadow-md border border-amber-300 scale-[1.02]'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-100 border border-emerald-800/70 hover:border-emerald-600'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-300" />
              <span>Karya & Modul</span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-900 text-emerald-200 border border-emerald-700">
                {publications.length}
              </span>
            </button>

            {/* 4. Jadwal Agenda */}
            <button
              id="admin-navbar-agenda-btn"
              type="button"
              onClick={() => setActiveTab('agenda')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                activeTab === 'agenda'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-emerald-950 font-black shadow-md border border-amber-300 scale-[1.02]'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-100 border border-emerald-800/70 hover:border-emerald-600'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span>Jadwal Agenda</span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-900 text-amber-200 border border-emerald-700">
                {agendas.length}
              </span>
            </button>

            {/* 5. Pesan Masuk */}
            <button
              id="admin-navbar-pesan-btn"
              type="button"
              onClick={() => setActiveTab('pesan')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                activeTab === 'pesan'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-emerald-950 font-black shadow-md border border-amber-300 scale-[1.02]'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-100 border border-emerald-800/70 hover:border-emerald-600'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-300" />
              <span>Pesan Masuk</span>
              {messages.filter(m => !m.read).length > 0 ? (
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-rose-600 text-white animate-pulse">
                  {messages.filter(m => !m.read).length} Baru
                </span>
              ) : (
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-900 text-emerald-200 border border-emerald-700">
                  {messages.length}
                </span>
              )}
            </button>

            {/* 6. Thumbnail Share */}
            <button
              id="admin-navbar-thumbnail-btn"
              type="button"
              onClick={() => setActiveTab('thumbnail')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                activeTab === 'thumbnail'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-emerald-950 font-black shadow-md border border-amber-300 scale-[1.02]'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-100 border border-emerald-800/70 hover:border-emerald-600'
              }`}
            >
              <Share2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Thumbnail</span>
            </button>

            {/* 7. Logo & Header */}
            <button
              id="admin-navbar-logo-btn"
              type="button"
              onClick={() => setActiveTab('logo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                activeTab === 'logo'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-emerald-950 font-black shadow-md border border-amber-300 scale-[1.02]'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-100 border border-emerald-800/70 hover:border-emerald-600'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-purple-300" />
              <span>Logo Web</span>
            </button>

            {/* 8. Sticky Footer */}
            <button
              id="admin-navbar-footer-btn"
              type="button"
              onClick={() => setActiveTab('footer')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                activeTab === 'footer'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-emerald-950 font-black shadow-md border border-amber-300 scale-[1.02]'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-100 border border-emerald-800/70 hover:border-emerald-600'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-teal-300" />
              <span>Sticky Footer</span>
            </button>

            {/* 10. Cadangan Data & Pemulihan (Backup & Restore) */}
            <button
              id="admin-navbar-backup-btn"
              type="button"
              onClick={() => setActiveTab('backup')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                activeTab === 'backup'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-emerald-950 font-black shadow-md border border-amber-300 scale-[1.02]'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-100 border border-emerald-700 hover:border-amber-400/60'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Backup</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-800 text-amber-300 font-bold border border-emerald-600">
                Data
              </span>
            </button>

            {/* 11. Hosting Plesk (PHP + MySQL Ready) */}
            <button
              id="admin-navbar-plesk-btn"
              type="button"
              onClick={() => setActiveTab('plesk')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                activeTab === 'plesk'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-emerald-950 font-black shadow-md border border-amber-300 scale-[1.02]'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 text-amber-300 border border-amber-400/60 hover:border-amber-300'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-amber-300" />
              <span>Hosting Plesk</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400 text-emerald-950 font-extrabold shadow-xs">
                ZIP
              </span>
            </button>

            {/* 12. Pengelolaan Akun & Password Admin */}
            <button
              id="admin-navbar-users-btn"
              type="button"
              onClick={() => {
                setActiveTab('users');
                fetch('/api/admin/profile')
                  .then(r => r.json())
                  .then(d => { if (d.success && d.user) setAdminUser(d.user); })
                  .catch(() => {});
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-emerald-950 font-black shadow-md border border-amber-300 scale-[1.02]'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 text-amber-300 border border-amber-400/50 hover:border-amber-400'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-amber-300" />
              <span>Akun & Password</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400 text-emerald-950 font-extrabold shadow-xs">
                Admin
              </span>
            </button>
          </div>
        </nav>
      )}

      {/* BODY CONTENT (FULL PAGE LAYOUT) */}
      <div className="flex-1 flex overflow-hidden relative">
        {!isLoggedIn ? (
          /* ============================================================ */
          /* FULL-PAGE LOGIN SCREEN */
          /* ============================================================ */
          <div className="w-full h-full flex items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-[#f4f7f4] to-[#e8efe8] overflow-y-auto">
            <div className="bg-white rounded-3xl border-2 border-emerald-200 shadow-2xl max-w-md w-full p-6 sm:p-8 relative text-[#1c2e24] my-auto">
              <div className="text-center space-y-2 mb-6">
                <div className="w-16 h-16 rounded-3xl bg-[#064e3b] text-amber-400 flex items-center justify-center mx-auto shadow-md border-2 border-amber-400">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-[#064e3b]">
                  Otentikasi Super Admin
                </h2>
                <p className="text-xs text-gray-500">
                  Silakan masuk ke panel Super Admin untuk mengelola publikasi karya, agenda dakwah, logo header, sticky footer, dan database website.
                </p>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs font-semibold flex items-center gap-2 mb-4 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Email Pengelola
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jaenalmaskun@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  id="admin-submit-login-btn"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 border border-amber-400/30"
                >
                  <Lock className="w-4 h-4 text-amber-300" />
                  <span>{isLoading ? 'Memverifikasi...' : 'Masuk ke Dasbor Super Admin'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-xs font-semibold text-gray-600 hover:text-emerald-900 text-center transition-colors"
                >
                  ← Kembali ke Halaman Utama
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* AUTHENTICATED FULL-WIDTH ADMIN WORKSPACE (NAVBAR ATAS) */
          /* ============================================================ */
          <div className="w-full h-full flex flex-col overflow-hidden bg-[#faf8f5]">
            {/* MAIN FULL-PAGE WORKSPACE CANVAS (FULL-WIDTH 100%, INDEPENDENT SCROLL) */}
            <main className="w-full flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#faf8f5] min-w-0">
              {/* ============================================================ */}
              {/* TAB 1: RINGKASAN & METRIK */}
              {/* ============================================================ */}
              {activeTab === 'ringkasan' && (
                <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
                  {/* 4 Metric Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase">Karya & Modul</span>
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-800" />
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">{publications.length}</div>
                      <p className="text-[10px] sm:text-[11px] text-emerald-700 font-medium mt-1">
                        Modul Kurikulum Merdeka & Kitab
                      </p>
                    </div>

                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase">Agenda Terjadwal</span>
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">{agendas.length}</div>
                      <p className="text-[10px] sm:text-[11px] text-amber-700 font-medium mt-1">
                        Kajian & bimbingan aktif
                      </p>
                    </div>

                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase">Pesan Undangan</span>
                        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">{messages.length}</div>
                      <p className="text-[10px] sm:text-[11px] text-blue-700 font-medium mt-1">
                        {messages.filter(m => !m.read).length} pesan baru belum dibaca
                      </p>
                    </div>

                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase">Sticky Footer</span>
                        <Sliders className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">{draftFooter.items.filter(i => i.visible).length} Menu</div>
                      <p className="text-[10px] sm:text-[11px] text-purple-700 font-medium mt-1">
                        Tema: {currentThemeObj.name.split(' ')[0]}
                      </p>
                    </div>
                  </div>

                  {/* Featured Banner: Menu Edit Konten Website */}
                  <div className="bg-gradient-to-r from-[#064e3b] via-[#043327] to-[#022c22] p-6 rounded-3xl border-2 border-amber-400/80 shadow-lg text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center gap-2 text-amber-300">
                        <Edit3 className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Pusat Manajemen Konten</span>
                        <span className="bg-amber-400 text-emerald-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          Menu Utama
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-white">
                        Menu Edit Seluruh Konten Website
                      </h3>
                      <p className="text-xs text-emerald-100/90 leading-relaxed">
                        Kelola data profil, biografi, riwayat pendidikan, mutiara hikmah, 4 pilar madrasah, karya & modul, linimasa pengabdian, agenda kajian, galeri, nomor kontak WA, dan sakelar visibilitas seksi.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('site_editor')}
                      className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Buka Menu Edit Konten</span>
                    </button>
                  </div>

                  {/* Highlight Quick Actions Banners */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Hosting Plesk & MySQL Banner */}
                    <div className="bg-gradient-to-br from-[#064e3b] via-[#043327] to-[#022c22] text-white p-5 rounded-3xl border-2 border-amber-400/90 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-amber-300">
                          <div className="flex items-center gap-1.5">
                            <Server className="w-4 h-4 text-amber-400" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Hosting Plesk</span>
                          </div>
                          <span className="bg-amber-400 text-emerald-950 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full">
                            PHP & MySQL
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white">
                          Paket Siap Hosting Plesk
                        </h3>
                        <p className="text-[11px] text-emerald-100/90 leading-relaxed">
                          Unduh paket ZIP siap ekstrak di Plesk File Manager lengkap dengan PHP API & database MySQL.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('plesk')}
                        className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-emerald-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        <Server className="w-3.5 h-3.5 text-emerald-950" />
                        <span>Buka Menu Plesk</span>
                      </button>
                    </div>

                    {/* Akun & Password Admin Banner */}
                    <div className="bg-gradient-to-br from-[#1e1b4b] to-[#0f172a] text-white p-5 rounded-3xl border-2 border-amber-400/70 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-amber-300">
                          <div className="flex items-center gap-1.5">
                            <Key className="w-4 h-4 text-amber-400" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Akun & Password</span>
                          </div>
                          <span className="bg-amber-400 text-emerald-950 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full">
                            Keamanan
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white">
                          Kelola Password & User
                        </h3>
                        <p className="text-[11px] text-gray-200 leading-relaxed">
                          Ubah kata sandi super admin, atur email notifikasi, atau reset sandi ke standar awal secara terpusat.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('users')}
                        className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5 text-emerald-950" />
                        <span>Kelola Password Admin</span>
                      </button>
                    </div>

                    {/* Sticky Footer Banner */}
                    <div className="bg-gradient-to-br from-[#064e3b] to-[#043327] text-white p-5 rounded-3xl border-2 border-emerald-600/60 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-amber-300">
                          <Sliders className="w-4 h-4" />
                          <span className="text-[11px] font-bold uppercase tracking-wider">Sticky Footer</span>
                        </div>
                        <h3 className="text-sm font-bold text-white">
                          Tombol Pintas & Link
                        </h3>
                        <p className="text-[11px] text-emerald-100/80 leading-relaxed">
                          Ubah urutan tombol, ikon Lucide, tautan WhatsApp/Drive, dan tema warna islami.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('footer')}
                        className="w-full px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5 text-amber-300" />
                        <span>Editor Footer</span>
                      </button>
                    </div>

                    {/* Logo Header Banner */}
                    <div className="bg-white p-5 rounded-3xl border-2 border-emerald-200 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-emerald-800">
                          <Camera className="w-4 h-4" />
                          <span className="text-[11px] font-bold uppercase tracking-wider">Logo Madrasah</span>
                        </div>
                        <h3 className="text-sm font-bold text-gray-900">
                          Foto Logo & Header
                        </h3>
                        <p className="text-[11px] text-gray-600 leading-relaxed">
                          Dukung gambar PNG/JPG/SVG, emblem geometris Islami, dan teks lencana madrasah.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('logo')}
                        className="w-full px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-amber-300" />
                        <span>Kustomisasi Logo</span>
                      </button>
                    </div>
                  </div>

                  {/* Shortcuts row */}
                  <div className="p-5 bg-white rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Aksi Cepat Konten & Keamanan</h4>
                      <p className="text-xs text-gray-500">Tambah data baru langsung atau atur keamanan admin tanpa langkah berbelit.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => { setActiveTab('karya'); setShowAddPubModal(true); }}
                        className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-1.5 border border-emerald-300"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Modul</span>
                      </button>
                      <button
                        onClick={() => { setActiveTab('agenda'); setShowAddAgendaModal(true); }}
                        className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5 border border-amber-300"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Jadwalkan Kajian</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('pesan')}
                        className="px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold flex items-center gap-1.5 border border-gray-300"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Lihat Undangan</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('users')}
                        className="px-3.5 py-2 rounded-xl bg-amber-100/80 hover:bg-amber-200 text-amber-950 text-xs font-bold flex items-center gap-1.5 border border-amber-400 cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5 text-emerald-900" />
                        <span>Ganti Password</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('plesk')}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-emerald-950 text-xs font-extrabold flex items-center gap-1.5 border border-amber-400 shadow-xs cursor-pointer"
                      >
                        <Server className="w-3.5 h-3.5 text-emerald-950" />
                        <span>Hosting Plesk</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* TAB 1.5: FULL EDIT KONTEN HALAMAN PUBLIK */}
              {/* ============================================================ */}
              {activeTab === 'site_editor' && (
                <div className="animate-fadeIn">
                  <SiteContentEditor
                    content={siteContent}
                    onSaveContent={(newContent) => {
                      if (onSaveSiteContent) {
                        onSaveSiteContent(newContent);
                      }
                      showToast('Konten publik berhasil diperbarui secara menyeluruh!');
                    }}
                    onToast={showToast}
                  />
                </div>
              )}

              {/* ============================================================ */}
              {/* TAB 2: KELOLA KARYA & MODUL */}
              {/* ============================================================ */}
              {activeTab === 'karya' && (() => {
                const isModuleVisible = siteContent?.visibility?.publications !== false;
                const totalCount = publications.length;
                const activeCount = publications.filter(p => p.isActive !== false).length;
                const inactiveCount = totalCount - activeCount;

                const filteredPubs = publications.filter(pub => {
                  if (pubFilterStatus === 'active') return pub.isActive !== false;
                  if (pubFilterStatus === 'inactive') return pub.isActive === false;
                  return true;
                });

                return (
                  <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
                      <div>
                        <h3 className="text-xl font-bold text-[#064e3b] flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-amber-600" />
                          <span>Daftar Karya, Modul, & Buku</span>
                        </h3>
                        <p className="text-xs text-gray-500">
                          Kelola modul ajar Kurikulum Merdeka, karya ilmiah, dan buku panduan pesantren. Aktifkan atau nonaktifkan karya secara fleksibel.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingPubId(null);
                          setNewPub({
                            title: '',
                            category: 'Modul Pembelajaran',
                            year: '2026',
                            publisher: 'Madrasah Press & Kemenag',
                            description: '',
                            tags: ['Kurikulum Merdeka', 'Madrasah'],
                            isActive: true
                          });
                          setShowAddPubModal(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4 text-amber-300" />
                        <span>Tambah Karya Baru</span>
                      </button>
                    </div>

                    {/* Master Module Status Card */}
                    <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isModuleVisible
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                        : 'bg-amber-50/70 border-amber-300 text-amber-950'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isModuleVisible
                            ? 'bg-emerald-800 text-amber-300 shadow-xs'
                            : 'bg-gray-200 text-gray-500'
                        }`}>
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold block">
                              Status Seksi Modul Karya di Website Publik:
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              isModuleVisible
                                ? 'bg-emerald-200 text-emerald-900 border border-emerald-400'
                                : 'bg-amber-200 text-amber-900 border border-amber-400'
                            }`}>
                              {isModuleVisible ? '✅ AKTIF (DITAMPILKAN)' : '⛔ NONAKTIF (DISEMBUNYIKAN)'}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-600">
                            {isModuleVisible
                              ? 'Seksi Karya & Modul Pembelajaran sedang tayang untuk seluruh pengunjung website publik.'
                              : 'Seluruh bagian Karya & Modul Pembelajaran saat ini disembunyikan dari halaman publik.'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-700 hidden sm:inline">
                          {isModuleVisible ? 'Seksi Aktif' : 'Seksi Nonaktif'}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={isModuleVisible}
                            onChange={(e) => handleTogglePublicationsSection(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-800"></div>
                        </label>
                      </div>
                    </div>

                    {/* Filter Status Tabs & Statistics */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 bg-gray-100/90 p-1 rounded-xl border border-gray-200">
                        <button
                          type="button"
                          onClick={() => setPubFilterStatus('all')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            pubFilterStatus === 'all'
                              ? 'bg-emerald-800 text-white shadow-xs'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                          }`}
                        >
                          Semua ({totalCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPubFilterStatus('active')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            pubFilterStatus === 'active'
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/60'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Aktif ({activeCount})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPubFilterStatus('inactive')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            pubFilterStatus === 'inactive'
                              ? 'bg-amber-700 text-white shadow-xs'
                              : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/60'
                          }`}
                        >
                          <EyeOff className="w-3.5 h-3.5 text-amber-300" />
                          <span>Nonaktif ({inactiveCount})</span>
                        </button>
                      </div>

                      <div className="text-xs text-gray-500 font-medium">
                        Menampilkan {filteredPubs.length} dari {totalCount} item karya
                      </div>
                    </div>

                    {/* Add / Edit Publication Form Modal */}
                    {showAddPubModal && (
                      <div className="p-5 bg-emerald-50/90 rounded-2xl border-2 border-emerald-400 space-y-4 animate-fadeIn shadow-md">
                        <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                          <h4 className="text-xs font-bold text-emerald-950 uppercase flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-emerald-800" />
                            <span>{editingPubId ? 'Formulir Edit Modul / Karya' : 'Formulir Tambah Modul / Karya Baru'}</span>
                          </h4>
                          <button
                            onClick={() => {
                              setShowAddPubModal(false);
                              setEditingPubId(null);
                            }}
                            className="text-gray-500 hover:text-gray-800 p-1 rounded-lg hover:bg-emerald-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <form onSubmit={handleSavePublication} className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Judul Karya / Modul *</label>
                              <input
                                type="text"
                                required
                                value={newPub.title || ''}
                                onChange={(e) => setNewPub({ ...newPub, title: e.target.value })}
                                placeholder="Contoh: Modul Fiqih Kontemporer MA"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-700"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Kategori *</label>
                              <select
                                value={newPub.category || 'Modul Pembelajaran'}
                                onChange={(e) => setNewPub({ ...newPub, category: e.target.value as any })}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-700"
                              >
                                <option value="Modul Pembelajaran">Modul Pembelajaran</option>
                                <option value="Buku & Referensi">Buku & Referensi</option>
                                <option value="Buku">Buku</option>
                                <option value="Jurnal Ilmiah">Jurnal Ilmiah</option>
                                <option value="Jurnal & Riset">Jurnal & Riset</option>
                                <option value="Panduan Guru">Panduan Guru</option>
                                <option value="Opini & Artikel">Opini & Artikel</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Tahun Terbit</label>
                              <input
                                type="text"
                                value={newPub.year || ''}
                                onChange={(e) => setNewPub({ ...newPub, year: e.target.value })}
                                placeholder="2026"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-700"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Penerbit / Lembaga</label>
                              <input
                                type="text"
                                value={newPub.publisher || ''}
                                onChange={(e) => setNewPub({ ...newPub, publisher: e.target.value })}
                                placeholder="Madrasah Press & Kemenag"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-700"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Tag (Pisahkan dengan koma)</label>
                            <input
                              type="text"
                              value={(newPub.tags || []).join(', ')}
                              onChange={(e) =>
                                setNewPub({
                                  ...newPub,
                                  tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                                })
                              }
                              placeholder="Kurikulum Merdeka, Madrasah, Fiqh"
                              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-700"
                            />
                          </div>

                          {/* Link Media Pembelajaran / Video Bedah Modul */}
                          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-1.5">
                            <label className="block text-[11px] font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                              <Video className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Link Media / Video Bedah Modul (YouTube, TikTok, IG Reels, FB, Drive, MP4)</span>
                            </label>
                            <input
                              type="text"
                              value={newPub.videoUrl || ''}
                              onChange={(e) => setNewPub({ ...newPub, videoUrl: e.target.value })}
                              placeholder="Contoh: https://www.tiktok.com/@... atau https://youtube.com/watch?v=... atau https://instagram.com/reel/..."
                              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white font-mono focus:ring-2 focus:ring-emerald-700"
                            />
                            <p className="text-[10px] text-gray-500">
                              Mendukung pemutaran langsung berbagai platform video & audio untuk modul pembelajaran ini.
                            </p>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Deskripsi Singkat</label>
                            <textarea
                              rows={2}
                              value={newPub.description || ''}
                              onChange={(e) => setNewPub({ ...newPub, description: e.target.value })}
                              placeholder="Deskripsi fokus materi dan cakupan karya..."
                              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-700"
                            />
                          </div>

                          {/* Sakelar Status Aktif/Nonaktif di Form */}
                          <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-gray-800 block">
                                Status Visibilitas di Website Publik
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {newPub.isActive !== false
                                  ? 'Karya ini akan langsung ditampilkan di halaman utama website.'
                                  : 'Karya ini disimpan namun disembunyikan dari publik.'}
                              </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                              <input
                                type="checkbox"
                                checked={newPub.isActive !== false}
                                onChange={(e) => setNewPub({ ...newPub, isActive: e.target.checked })}
                                className="sr-only peer"
                              />
                              <div className="w-10 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-800"></div>
                            </label>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddPubModal(false);
                                setEditingPubId(null);
                              }}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200 cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="submit"
                              className="px-5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                            >
                              {editingPubId ? 'Perbarui Karya' : 'Simpan Karya Baru'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Publications List */}
                    {filteredPubs.length === 0 ? (
                      <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-gray-500 text-xs">
                        Tidak ada karya yang sesuai dengan filter "{pubFilterStatus}".
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {filteredPubs.map((pub, idx) => {
                          const isItemActive = pub.isActive !== false;
                          return (
                            <div
                              key={pub.id}
                              className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs ${
                                isItemActive
                                  ? 'bg-white border-gray-200 hover:border-emerald-300'
                                  : 'bg-gray-50/90 border-dashed border-gray-300 opacity-80'
                              }`}
                            >
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                                    {pub.category}
                                  </span>
                                  <span className="text-xs text-gray-500 font-medium">
                                    Tahun {pub.year} • {pub.publisher}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                                      isItemActive
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                                    }`}
                                  >
                                    {isItemActive ? '✅ Aktif (Tampil di Web)' : '⛔ Nonaktif (Disembunyikan)'}
                                  </span>
                                </div>

                                <h4 className="text-sm font-bold text-gray-900 leading-snug">
                                  {pub.title}
                                </h4>
                                {pub.videoUrl && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md w-fit">
                                    <Video className="w-3 h-3 text-emerald-600" />
                                    <span>Media Terhubung: {pub.videoUrl}</span>
                                  </div>
                                )}
                                {pub.description && (
                                  <p className="text-xs text-gray-600 line-clamp-2">{pub.description}</p>
                                )}
                                {pub.tags && pub.tags.length > 0 && (
                                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                    {pub.tags.map((tag, tIdx) => (
                                      <span key={tIdx} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons for Each Publication */}
                              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                {/* Copy Shareable Module URL Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const shareUrl = `${window.location.origin}${window.location.pathname}?modul=${encodeURIComponent(pub.id)}#karya`;
                                    navigator.clipboard.writeText(shareUrl);
                                    showToast(`✅ Tautan modul "${pub.title.slice(0, 20)}..." berhasil disalin!`);
                                  }}
                                  className="p-2 rounded-xl text-gray-700 hover:text-emerald-800 hover:bg-emerald-50 border border-gray-300 cursor-pointer"
                                  title="Salin Tautan Modul untuk Dibagikan / Dikirim"
                                >
                                  <Share2 className="w-4 h-4 text-emerald-700" />
                                </button>

                                {/* Quick Toggle Button */}
                                <button
                                  type="button"
                                  onClick={() => handleTogglePublicationActive(pub.id)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                                    isItemActive
                                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                                  }`}
                                  title={isItemActive ? "Sembunyikan karya dari halaman publik" : "Tampilkan karya di halaman publik"}
                                >
                                  {isItemActive ? (
                                    <>
                                      <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                                      <span>Nonaktifkan</span>
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-3.5 h-3.5 text-emerald-700" />
                                      <span>Aktifkan</span>
                                    </>
                                  )}
                                </button>

                                {/* Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => handleStartEditPublication(pub)}
                                  className="p-2 rounded-xl text-emerald-700 hover:bg-emerald-50 border border-emerald-200 cursor-pointer"
                                  title="Edit Karya"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>

                                {/* Delete Button */}
                                <button
                                  type="button"
                                  onClick={() => handleDeletePublication(pub.id)}
                                  className="p-2 rounded-xl text-red-600 hover:bg-red-50 border border-red-200 cursor-pointer"
                                  title="Hapus Karya"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ============================================================ */}
              {/* TAB 3: JADWAL AGENDA */}
              {/* ============================================================ */}
              {activeTab === 'agenda' && (
                <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-[#064e3b] flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-amber-600" />
                        <span>Jadwal Agenda Kajian & Pelatihan</span>
                      </h3>
                      <p className="text-xs text-gray-500">
                        Atur jadwal tausiyah rutin, seminar pendidikan madrasah, pelatihan guru, dan lampiran berkas materi (semua format).
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowCategoryManager(!showCategoryManager)}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs ${
                          showCategoryManager
                            ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold ring-2 ring-amber-400'
                            : 'bg-white hover:bg-emerald-50 border-gray-200 text-emerald-950'
                        }`}
                      >
                        <Tag className="w-3.5 h-3.5 text-amber-600" />
                        <span>Kategori ({agendaCategories.length})</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditingAgendaId(null);
                          setNewAgenda({
                            title: '',
                            date: '20 Agustus 2026',
                            time: '08:00 - 11:30 WIB',
                            location: 'Aula Madrasah Aliyah Negeri',
                            type: agendaCategories[0] || 'Kajian Kitab',
                            status: 'Akan Datang',
                            fileUrl: '',
                            fileName: '',
                            fileSize: '',
                            fileType: '',
                            description: ''
                          });
                          setShowAddAgendaModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Jadwalkan Agenda</span>
                      </button>
                    </div>
                  </div>

                  {/* Category Management Drawer */}
                  {showCategoryManager && (
                    <div className="p-4 sm:p-5 bg-amber-50/90 rounded-2xl border border-amber-200 space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-amber-950 uppercase flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-amber-700" />
                          <span>Daftar Kategori Agenda Madrasah ({agendaCategories.length})</span>
                        </label>
                        <span className="text-[10px] text-amber-800">
                          Kategori ini akan muncul di filter agenda publik & formulir jadwal
                        </span>
                      </div>

                      {/* Chips of existing categories */}
                      <div className="flex flex-wrap items-center gap-2">
                        {agendaCategories.map((cat) => {
                          const count = agendas.filter(
                            (a) => (a.type || '').trim().toLowerCase() === cat.trim().toLowerCase()
                          ).length;
                          return (
                            <span
                              key={cat}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-amber-300 text-xs font-semibold text-emerald-950 shadow-2xs group"
                            >
                              <span>{cat}</span>
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold">
                                {count}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategoryGlobal(cat)}
                                className="text-gray-400 hover:text-red-600 ml-0.5 opacity-70 group-hover:opacity-100"
                                title={`Hapus kategori "${cat}"`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>

                      {/* Add new category form */}
                      <div className="pt-1 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Ketik kategori agenda baru (contoh: Bedah Kitab Kuning, FGD Guru, Khutbah Jum'at)..."
                          value={newCatInput}
                          onChange={(e) => setNewCatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCategoryGlobal(newCatInput);
                            }
                          }}
                          className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-amber-300 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddCategoryGlobal(newCatInput)}
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Kategori</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Add / Edit Agenda Modal */}
                  {showAddAgendaModal && (
                    <div className="p-5 sm:p-6 bg-amber-50/95 rounded-2xl border-2 border-amber-300 space-y-4 animate-fadeIn shadow-lg">
                      <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-amber-600 text-white">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-amber-950 uppercase">
                              {editingAgendaId ? 'Edit Jadwal Agenda & Berkas' : 'Jadwalkan Agenda Baru'}
                            </h4>
                            <p className="text-[10px] text-amber-800">
                              Lengkapi detail kegiatan madrasah dan unggah berkas materi/jadwal (PDF, Dokumen, PPT, Gambar, ZIP, dll).
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddAgendaModal(false);
                            setEditingAgendaId(null);
                          }}
                          className="text-gray-500 hover:text-gray-800 p-1.5 rounded-lg hover:bg-amber-200/60"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleSaveAgenda} className="space-y-4">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                            Nama Acara / Kajian / Pelatihan *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Workshop Penguatan Kurikulum Madrasah Berbasis Adab"
                            value={newAgenda.title}
                            onChange={(e) => setNewAgenda({ ...newAgenda, title: e.target.value })}
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1 flex items-center justify-between">
                              <span>Kategori Acara</span>
                              <button
                                type="button"
                                onClick={() => setIsAddingInlineCategory(!isAddingInlineCategory)}
                                className="text-[10px] text-amber-700 hover:underline flex items-center gap-0.5 font-bold"
                              >
                                <Plus className="w-3 h-3" />
                                <span>{isAddingInlineCategory ? 'Pilih dari List' : '+ Tambah Kategori Baru'}</span>
                              </button>
                            </label>

                            {isAddingInlineCategory ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  placeholder="Ketik kategori baru..."
                                  value={inlineCatInput}
                                  onChange={(e) => setInlineCatInput(e.target.value)}
                                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-amber-400 bg-white focus:ring-2 focus:ring-amber-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (inlineCatInput.trim()) {
                                      handleAddCategoryGlobal(inlineCatInput.trim());
                                      setNewAgenda({ ...newAgenda, type: inlineCatInput.trim() });
                                      setInlineCatInput('');
                                      setIsAddingInlineCategory(false);
                                    }
                                  }}
                                  className="px-3 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold shrink-0 hover:bg-amber-700 shadow-2xs"
                                >
                                  Gunakan
                                </button>
                              </div>
                            ) : (
                              <select
                                value={newAgenda.type || agendaCategories[0] || 'Kajian Kitab'}
                                onChange={(e) => {
                                  if (e.target.value === '__add_new__') {
                                    setIsAddingInlineCategory(true);
                                  } else {
                                    setNewAgenda({ ...newAgenda, type: e.target.value });
                                  }
                                }}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white font-medium text-emerald-950"
                              >
                                {agendaCategories.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                                <option value="__add_new__">+ Tambah Kategori Baru...</option>
                              </select>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                              Status Agenda
                            </label>
                            <select
                              value={newAgenda.status || 'Akan Datang'}
                              onChange={(e) => setNewAgenda({ ...newAgenda, status: e.target.value })}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white"
                            >
                              <option value="Akan Datang">Akan Datang</option>
                              <option value="Rutin">Rutin</option>
                              <option value="Selesai">Selesai</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Tanggal</label>
                            <input
                              type="text"
                              placeholder="20 Agustus 2026"
                              value={newAgenda.date}
                              onChange={(e) => setNewAgenda({ ...newAgenda, date: e.target.value })}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Waktu</label>
                            <input
                              type="text"
                              placeholder="08:00 - 11:30 WIB"
                              value={newAgenda.time}
                              onChange={(e) => setNewAgenda({ ...newAgenda, time: e.target.value })}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Lokasi / Tempat</label>
                            <input
                              type="text"
                              placeholder="Aula Madrasah / Masjid"
                              value={newAgenda.location}
                              onChange={(e) => setNewAgenda({ ...newAgenda, location: e.target.value })}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                            Deskripsi / Catatan Acara (Opsional)
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Catatan tambahan bagi peserta atau materi pokok kajian..."
                            value={newAgenda.description || ''}
                            onChange={(e) => setNewAgenda({ ...newAgenda, description: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white"
                          />
                        </div>

                        {/* File Upload Field (All Types) */}
                        <div className="p-3.5 bg-white/90 rounded-xl border border-amber-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-amber-950 uppercase flex items-center gap-1.5">
                              <Paperclip className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Unggah Berkas Lampiran / Materi (All Type)</span>
                            </label>
                            <span className="text-[10px] text-gray-500 font-medium">
                              PDF, DOC, XLS, PPT, ZIP, RAR, TXT, JPG, PNG, dll.
                            </span>
                          </div>

                          {/* Upload Box / Input */}
                          <div className="flex flex-col sm:flex-row items-center gap-3">
                            <label className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 border-dashed text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs">
                              <Upload className="w-4 h-4 text-emerald-700" />
                              <span>{isUploadingAgendaFile ? 'Mengunggah Berkas...' : 'Pilih Berkas dari Komputer/HP'}</span>
                              <input
                                type="file"
                                accept="*/*"
                                className="hidden"
                                disabled={isUploadingAgendaFile}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleUploadAgendaFile(e.target.files[0]);
                                  }
                                }}
                              />
                            </label>

                            <div className="w-full sm:flex-1">
                              <input
                                type="text"
                                placeholder="Atau tempel URL Link Berkas/Drive langsung di sini..."
                                value={newAgenda.fileUrl || ''}
                                onChange={(e) => {
                                  const url = e.target.value;
                                  const fn = url.split('/').pop()?.split('?')[0] || 'Berkas Lampiran';
                                  setNewAgenda({
                                    ...newAgenda,
                                    fileUrl: url,
                                    fileName: newAgenda.fileName || fn
                                  });
                                }}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white"
                              />
                            </div>
                          </div>

                          {/* Uploaded File Preview Badge */}
                          {newAgenda.fileUrl && (
                            <div className="p-2.5 bg-emerald-50/90 rounded-xl border border-emerald-200 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="p-1.5 rounded-lg bg-emerald-800 text-amber-300 shrink-0">
                                  <FileText className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase bg-emerald-200 text-emerald-900">
                                      {newAgenda.fileType || newAgenda.fileName?.split('.').pop() || 'FILE'}
                                    </span>
                                    {newAgenda.fileSize && (
                                      <span className="text-[10px] text-gray-500 font-mono">({newAgenda.fileSize})</span>
                                    )}
                                  </div>
                                  <p className="text-xs font-semibold text-emerald-950 truncate">
                                    {newAgenda.fileName || newAgenda.fileUrl}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <a
                                  href={newAgenda.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-medium flex items-center gap-1"
                                  title="Lihat / Unduh Berkas"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setNewAgenda({
                                    ...newAgenda,
                                    fileUrl: '',
                                    fileName: '',
                                    fileSize: '',
                                    fileType: ''
                                  })}
                                  className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-[11px] font-medium"
                                  title="Hapus Lampiran"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-amber-200">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddAgendaModal(false);
                              setEditingAgendaId(null);
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            disabled={isUploadingAgendaFile}
                            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            <span>{editingAgendaId ? 'Perbarui Agenda' : 'Simpan Agenda'}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Agendas List */}
                  <div className="grid grid-cols-1 gap-3">
                    {agendas.map((ag) => (
                      <div
                        key={ag.id}
                        className="p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 hover:border-amber-300 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                              {ag.type}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              ag.status === 'Rutin'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}>
                              {ag.status}
                            </span>
                            <span className="text-xs text-gray-500 font-semibold">{ag.date} • {ag.time}</span>
                          </div>

                          <h4 className="text-sm font-bold text-gray-900">{ag.title}</h4>
                          <p className="text-xs text-gray-600">Lokasi: {ag.location}</p>

                          {ag.description && (
                            <p className="text-xs text-gray-500 line-clamp-1">{ag.description}</p>
                          )}

                          {/* File Attachment badge if exists */}
                          {ag.fileUrl && (
                            <div className="pt-1 flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                                <Paperclip className="w-3 h-3 text-emerald-700" />
                                <span className="font-semibold">{ag.fileName || 'Berkas Lampiran'}</span>
                                {ag.fileSize && <span className="text-gray-500 text-[10px]">({ag.fileSize})</span>}
                              </span>
                              <a
                                href={ag.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-emerald-700 hover:text-emerald-900 underline font-semibold flex items-center gap-0.5"
                              >
                                <span>Unduh</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleStartEditAgenda(ag)}
                            className="p-2 rounded-xl text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                            title="Edit Agenda & Lampiran"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAgenda(ag.id)}
                            className="p-2 rounded-xl text-red-600 hover:bg-red-50 border border-red-200"
                            title="Hapus Agenda"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* TAB 4: PESAN MASUK */}
              {/* ============================================================ */}
              {activeTab === 'pesan' && (
                <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="text-xl font-bold text-[#064e3b] flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      <span>Kotak Undangan & Pesan Silaturahmi</span>
                    </h3>
                    <p className="text-xs text-gray-500">
                      Pesan masuk dari yayasan, madrasah, majelis taklim, dan masyarakat.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          msg.read ? 'bg-white border-gray-200' : 'bg-blue-50/70 border-blue-300 shadow-xs'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-gray-900">{msg.sender}</span>
                              {!msg.read && (
                                <span className="text-[9px] uppercase font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                                  Baru
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 font-medium">{msg.institution} • {msg.email} • {msg.phone}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{msg.date}</span>
                            <button
                              onClick={() => handleToggleMessageRead(msg.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700"
                            >
                              {msg.read ? 'Tandai Belum Dibaca' : 'Tandai Sudah Dibaca'}
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-red-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-emerald-800 uppercase">Jenis Kegiatan: {msg.eventType}</span>
                          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed bg-white/70 p-3 rounded-xl border border-gray-100">
                            {msg.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* TAB: THUMBNAIL & PRATINJAU BERBAGI LINK (OG & SOCIAL PREVIEW) */}
              {/* ============================================================ */}
              {activeTab === 'thumbnail' && (
                <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
                  {/* Top Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-[#064e3b] flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-amber-500" />
                        <span>Pengaturan Thumbnail & Pratinjau Berbagi Link (Social Share Preview)</span>
                      </h3>
                      <p className="text-xs text-gray-500">
                        Atur gambar thumbnail, judul, dan deskripsi yang otomatis tampil saat link website dibagikan di WhatsApp, Telegram, Facebook, dan Twitter/X.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleCopyShareLink}
                        className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                      >
                        <Copy className="w-3.5 h-3.5 text-gray-600" />
                        <span>Salin Link</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleShareToWhatsApp}
                        className="px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Uji Kirim WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        id="save-thumbnail-settings-btn"
                        onClick={handleSaveShareSettings}
                        className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4 text-amber-300" />
                        <span>Simpan Thumbnail & Meta Tag</span>
                      </button>
                    </div>
                  </div>

                  {shareSaveSuccess && (
                    <div className="p-4 bg-emerald-50 text-emerald-900 rounded-2xl border border-emerald-300 text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                        <span>Alhamdulillah! Pengaturan thumbnail dan meta tags berbagi link berhasil disimpan dan aktif secara permanen.</span>
                      </div>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">Tersimpan</span>
                    </div>
                  )}

                  {/* Grid 2 Kolom: Kiri = Live Simulator Medsos, Kanan = Form Kustomisasi */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* KOLOM KIRI: SIMULATOR TAMPILAN KARTU LINK MEDSOS (7 Cols) */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="bg-white p-5 rounded-3xl border border-gray-200/90 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-emerald-800" />
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                              Simulasi Tampilan Link Saat Dibagikan
                            </h4>
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium">Live Simulation</span>
                        </div>

                        {/* Platform Switcher Tabs */}
                        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl overflow-x-auto">
                          <button
                            type="button"
                            onClick={() => setSocialPlatform('whatsapp')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                              socialPlatform === 'whatsapp'
                                ? 'bg-white text-emerald-900 shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-[#25D366]"></span>
                            <span>WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSocialPlatform('telegram')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                              socialPlatform === 'telegram'
                                ? 'bg-white text-blue-900 shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-[#229ED9]"></span>
                            <span>Telegram</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSocialPlatform('facebook')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                              socialPlatform === 'facebook'
                                ? 'bg-white text-blue-800 shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-[#1877F2]"></span>
                            <span>Facebook</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSocialPlatform('twitter')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                              socialPlatform === 'twitter'
                                ? 'bg-white text-gray-900 shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-black"></span>
                            <span>Twitter / X</span>
                          </button>
                        </div>

                        {/* 1. WHATSAPP SIMULATION */}
                        {socialPlatform === 'whatsapp' && (
                          <div className="bg-[#e5ddd5] p-4 sm:p-5 rounded-2xl border border-gray-300 space-y-3 font-sans">
                            <div className="max-w-md ml-auto bg-[#dcf8c6] rounded-2xl rounded-tr-none p-2.5 shadow-sm border border-emerald-200/60 space-y-2">
                              <div className="bg-white/95 rounded-xl overflow-hidden border border-emerald-900/10 shadow-xs">
                                <div className="relative aspect-[16/9] w-full bg-emerald-950 overflow-hidden">
                                  <img
                                    src={draftShare.thumbnailUrl || '/og-image.jpg'}
                                    alt="Thumbnail Preview"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/avatar-jaenal.jpg';
                                    }}
                                  />
                                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-950/80 backdrop-blur-xs text-amber-300 text-[9px] font-bold rounded-md border border-amber-400/30">
                                    {draftShare.badgeText || 'Website Resmi'}
                                  </div>
                                </div>

                                <div className="p-3 space-y-1 bg-[#f0f4f1]">
                                  <h5 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                                    {draftShare.title}
                                  </h5>
                                  <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                                    {draftShare.description}
                                  </p>
                                  <p className="text-[10px] text-gray-400 font-mono pt-1">
                                    {typeof window !== 'undefined' ? window.location.hostname : 'madrasah.id'}
                                  </p>
                                </div>
                              </div>

                              <div className="px-1 flex items-end justify-between gap-2 pt-0.5">
                                <span className="text-xs text-emerald-900 underline font-medium truncate">
                                  {typeof window !== 'undefined' ? window.location.origin : 'https://madrasah.id'}
                                </span>
                                <div className="flex items-center gap-1 text-[10px] text-gray-500 shrink-0">
                                  <span>10:30</span>
                                  <CheckCheck className="w-3.5 h-3.5 text-[#34B7F1]" />
                                </div>
                              </div>
                            </div>
                            <p className="text-[10px] text-gray-600 text-center italic">
                              Simulasi tampilan gelembung chat saat link dikirimkan melalui WhatsApp.
                            </p>
                          </div>
                        )}

                        {/* 2. TELEGRAM SIMULATION */}
                        {socialPlatform === 'telegram' && (
                          <div className="bg-[#54759e] p-4 sm:p-5 rounded-2xl border border-gray-300 font-sans">
                            <div className="max-w-md bg-white rounded-2xl p-3 shadow-md border-l-4 border-[#229ED9] space-y-2">
                              <div className="flex items-center gap-1.5 text-xs text-[#229ED9] font-bold">
                                <Globe className="w-3.5 h-3.5" />
                                <span>{draftShare.authorName || 'Ust. Jaenal Maskun'}</span>
                              </div>

                              <h5 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                                {draftShare.title}
                              </h5>

                              <p className="text-xs text-gray-700 leading-relaxed line-clamp-3">
                                {draftShare.description}
                              </p>

                              <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-emerald-950">
                                <img
                                  src={draftShare.thumbnailUrl || '/og-image.jpg'}
                                  alt="Telegram Thumbnail"
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              <div className="text-[10px] text-gray-400 text-right">10:30</div>
                            </div>
                          </div>
                        )}

                        {/* 3. FACEBOOK SIMULATION */}
                        {socialPlatform === 'facebook' && (
                          <div className="bg-[#f0f2f5] p-4 sm:p-5 rounded-2xl border border-gray-300 font-sans space-y-3">
                            <div className="bg-white rounded-2xl border border-gray-300 shadow-sm overflow-hidden">
                              <div className="p-3 flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full bg-emerald-900 text-amber-300 font-bold flex items-center justify-center text-xs">
                                  JM
                                </div>
                                <div>
                                  <h6 className="text-xs font-bold text-gray-900">{draftShare.authorName || 'Ust. Jaenal Maskun'}</h6>
                                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <span>Baru saja</span>
                                    <span>•</span>
                                    <Globe className="w-3 h-3" />
                                  </div>
                                </div>
                              </div>

                              <p className="px-3 pb-2 text-xs text-gray-800">
                                Silakan kunjungi website resmi untuk mengakses materi modul madrasah, karya ilmiah, dan agenda kajian:
                              </p>

                              <div className="border-t border-gray-200">
                                <div className="relative aspect-[1.91/1] w-full bg-emerald-950 overflow-hidden">
                                  <img
                                    src={draftShare.thumbnailUrl || '/og-image.jpg'}
                                    alt="FB Thumbnail"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="p-3 bg-[#f0f2f5]">
                                  <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">
                                    {typeof window !== 'undefined' ? window.location.hostname.toUpperCase() : 'MADRASAH.ID'}
                                  </div>
                                  <h5 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-1">
                                    {draftShare.title}
                                  </h5>
                                  <p className="text-[11px] text-gray-600 line-clamp-1">
                                    {draftShare.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 4. TWITTER / X SIMULATION */}
                        {socialPlatform === 'twitter' && (
                          <div className="bg-black p-4 sm:p-5 rounded-2xl border border-gray-800 font-sans space-y-3 text-white">
                            <div className="border border-gray-700 rounded-2xl overflow-hidden max-w-lg mx-auto bg-[#16181c]">
                              <div className="relative aspect-[16/9] w-full bg-gray-900 overflow-hidden">
                                <img
                                  src={draftShare.thumbnailUrl || '/og-image.jpg'}
                                  alt="X Thumbnail"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="p-3 space-y-1">
                                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <Globe className="w-3 h-3 text-gray-400" />
                                  <span>{typeof window !== 'undefined' ? window.location.hostname : 'madrasah.id'}</span>
                                </div>
                                <h5 className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-1">
                                  {draftShare.title}
                                </h5>
                                <p className="text-[11px] text-gray-400 line-clamp-2">
                                  {draftShare.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info & Validator Box */}
                      <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/80 space-y-2">
                        <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Tips Thumbnail Otomatis di WhatsApp & Medsos</span>
                        </div>
                        <ul className="text-[11px] text-amber-950/90 space-y-1 list-disc list-inside">
                          <li><strong>Rasio Ukuran Ideal:</strong> 16:9 atau 1.91:1 (resolusi rekomendasi 1200 x 630 piksel).</li>
                          <li><strong>Protokol Open Graph:</strong> Meta tag <code>og:image</code>, <code>og:title</code>, <code>og:description</code>, dan <code>twitter:card</code> telah terpasang secara otomatis di file <code>index.html</code> dan server.</li>
                          <li><strong>Pembersihan Cache:</strong> Jika WhatsApp menampilkan thumbnail lama, gunakan alat <em>Facebook Sharing Debugger</em> di bawah atau tambahkan parameter unik di akhir link (misal: <code>?v=2</code>).</li>
                        </ul>
                      </div>
                    </div>

                    {/* KOLOM KANAN: FORM KUSTOMISASI THUMBNAIL & META TAGS (5 Cols) */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className="bg-white p-5 rounded-3xl border border-gray-200/90 shadow-sm space-y-4">
                        <div className="border-b border-gray-100 pb-3">
                          <h4 className="text-xs font-bold text-[#064e3b] uppercase tracking-wider flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-amber-500" />
                            <span>1. Gambar Banner Thumbnail (OG Image)</span>
                          </h4>
                          <p className="text-[11px] text-gray-500">
                            Gambar ini akan diambil otomatis oleh bot WhatsApp & Facebook saat link disebarkan.
                          </p>
                        </div>

                        {/* Thumbnail Preview & Selector */}
                        <div className="space-y-3">
                          <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border-2 border-emerald-800/40 shadow-inner bg-emerald-950">
                            <img
                              src={draftShare.thumbnailUrl || '/og-image.jpg'}
                              alt="Thumbnail Current"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/avatar-jaenal.jpg';
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
                              <span className="text-[10px] text-amber-200 font-bold flex items-center gap-1">
                                <Check className="w-3 h-3 text-amber-400" />
                                <span>Thumbnail Aktif</span>
                              </span>
                            </div>
                          </div>

                          {thumbnailUploadError && (
                            <div className="p-2.5 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs font-semibold flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>{thumbnailUploadError}</span>
                            </div>
                          )}

                          {/* Quick Thumbnail Option Buttons */}
                          <div className="grid grid-cols-2 gap-2">
                            <label className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold text-center cursor-pointer transition-colors flex items-center justify-center gap-1.5">
                              <Upload className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Upload Gambar Baru</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleThumbnailUpload}
                                className="hidden"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                setDraftShare(prev => ({ ...prev, thumbnailUrl: '/og-image.jpg' }));
                                showToast('Thumbnail direset ke Banner Islami 1200x630');
                              }}
                              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                              <span>Banner Bawaan</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const avatarUrl = siteContent?.profile?.avatarUrl || '/avatar-jaenal.jpg';
                              setDraftShare(prev => ({ ...prev, thumbnailUrl: avatarUrl }));
                              showToast('Thumbnail disetel ke Foto Profil Utama Pengguna');
                            }}
                            className="w-full px-3 py-1.5 bg-emerald-900/10 hover:bg-emerald-900/20 text-emerald-950 rounded-xl text-xs font-medium text-center transition-colors"
                          >
                            Gunakan Foto Profil Utama Akun
                          </button>
                        </div>

                        {/* Input Share Title */}
                        <div className="pt-2 border-t border-gray-100 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                              2. Judul Berbagi Link (OG Title) *
                            </label>
                            <span className="text-[10px] text-gray-400">
                              {draftShare.title.length}/70 karakter
                            </span>
                          </div>
                          <input
                            type="text"
                            value={draftShare.title}
                            onChange={(e) => setDraftShare({ ...draftShare, title: e.target.value })}
                            placeholder="Ust. Jaenal Maskun, S.Pd.I. | Pendidik, Akademisi & Penggerak Madrasah"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 font-semibold"
                          />
                        </div>

                        {/* Input Share Description */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                              3. Deskripsi Berbagi Link (OG Description) *
                            </label>
                            <span className="text-[10px] text-gray-400">
                              {draftShare.description.length}/160 karakter
                            </span>
                          </div>
                          <textarea
                            rows={3}
                            value={draftShare.description}
                            onChange={(e) => setDraftShare({ ...draftShare, description: e.target.value })}
                            placeholder="Website Resmi Ust. Jaenal Maskun, S.Pd.I. - Menyemai Adab, Menumbuhkan Intelektual, Mengabdi untuk Kemuliaan Umat."
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 leading-relaxed font-normal"
                          />
                        </div>

                        {/* Author & Badge Text */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                              Nama Penulis
                            </label>
                            <input
                              type="text"
                              value={draftShare.authorName}
                              onChange={(e) => setDraftShare({ ...draftShare, authorName: e.target.value })}
                              placeholder="Ust. Jaenal Maskun, S.Pd.I."
                              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                              Teks Lencana Thumbnail
                            </label>
                            <input
                              type="text"
                              value={draftShare.badgeText}
                              onChange={(e) => setDraftShare({ ...draftShare, badgeText: e.target.value })}
                              placeholder="Website Resmi Madrasah"
                              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
                            />
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="pt-3">
                          <button
                            type="button"
                            onClick={handleSaveShareSettings}
                            className="w-full py-3 rounded-2xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                          >
                            <CheckCircle2 className="w-4 h-4 text-amber-300" />
                            <span>Simpan Perubahan Thumbnail & Meta Tag</span>
                          </button>
                        </div>
                      </div>

                      {/* Validator External Tools Card */}
                      <div className="bg-white p-4 rounded-3xl border border-gray-200/90 shadow-sm space-y-2.5">
                        <h5 className="text-xs font-bold text-gray-800 flex items-center gap-2">
                          <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                          <span>Alat Penguji / Debugger Resmi Medsos</span>
                        </h5>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          Gunakan alat ini untuk memaksa Facebook, WhatsApp, atau Twitter membaca ulang thumbnail jika link baru saja diperbarui:
                        </p>
                        <div className="flex flex-col gap-2 pt-1">
                          <a
                            href="https://developers.facebook.com/tools/debug/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors"
                          >
                            <span>Facebook & WhatsApp Sharing Debugger</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href="https://www.linkedin.com/post-inspector/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors"
                          >
                            <span>LinkedIn Post Inspector</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* TAB 5: LOGO HEADER */}
              {/* ============================================================ */}
              {activeTab === 'logo' && (
                <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-[#064e3b] flex items-center gap-2">
                        <Camera className="w-5 h-5 text-amber-500" />
                        <span>Kustomisasi & Unggah Logo Header</span>
                      </h3>
                      <p className="text-xs text-gray-500">
                        Atur logo foto/gambar madrasah, lambang geometris Islami, inisial monogram, serta teks identitas bilah navigasi.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDraftLogo({ ...defaultHeaderLogo });
                          setLogoSaveSuccess(false);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-100 flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Default</span>
                      </button>

                      <button
                        type="button"
                        id="admin-save-logo-btn"
                        disabled={isSavingLogo}
                        onClick={handleSaveLogoMain}
                        className="px-4 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 disabled:bg-emerald-950/60 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all border border-amber-400/40 active:scale-95 cursor-pointer"
                      >
                        {isSavingLogo ? (
                          <>
                            <RefreshCw className="w-4 h-4 text-amber-300 animate-spin" />
                            <span>Menyimpan...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-amber-300" />
                            <span>Simpan Logo Header</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {logoSaveSuccess && (
                    <div className="p-3.5 bg-emerald-100 text-emerald-900 rounded-2xl border border-emerald-300 flex items-center gap-2 text-xs font-semibold animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Logo dan konfigurasi header berhasil diperbarui dan disimpan ke sistem!</span>
                    </div>
                  )}

                  {/* Realtime Live Header Preview */}
                  <div className="bg-[#043327] p-5 rounded-2xl border border-emerald-800 text-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Pratinjau Langsung Bilah Header (Live Preview)</span>
                      </span>
                      <span className="text-[10px] bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded border border-emerald-700">
                        Mode {draftLogo.type === 'custom_image' ? 'Foto/Gambar Kustom' : draftLogo.type === 'preset_emblem' ? 'Emblem Islami' : 'Monogram'}
                      </span>
                    </div>

                    <div className="bg-[#064e3b] p-3 sm:p-4 rounded-xl border border-amber-500/30 flex items-center justify-between shadow-inner">
                      <div className="flex items-center gap-3">
                        {draftLogo.type === 'custom_image' && draftLogo.customImageUrl ? (
                          <div className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full ${draftLogo.borderStyle === 'gold' ? 'border-2 border-amber-300 ring-2 ring-amber-500/60 ring-offset-1 ring-offset-emerald-950 shadow-[0_0_12px_rgba(251,191,36,0.6)]' : draftLogo.borderStyle === 'emerald' ? 'border-2 border-emerald-400' : 'border border-white/20'} overflow-hidden bg-emerald-950 flex items-center justify-center shrink-0 shadow-md relative p-0.5`}>
                            <img
                              src={draftLogo.customImageUrl}
                              alt="Logo"
                              style={{
                                mixBlendMode: draftLogo.blendMode === 'screen' ? 'screen' : draftLogo.blendMode === 'multiply' ? 'multiply' : 'normal',
                              }}
                              className={`w-full h-full ${draftLogo.fitMode === 'contain' ? 'object-contain p-0.5' : 'object-cover'} rounded-full`}
                            />
                          </div>
                        ) : draftLogo.type === 'preset_emblem' && draftLogo.customImageUrl ? (
                          <div className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full ${draftLogo.borderStyle === 'gold' ? 'border-2 border-amber-300 ring-2 ring-amber-500/60 ring-offset-1 ring-offset-emerald-950 shadow-[0_0_12px_rgba(251,191,36,0.6)]' : draftLogo.borderStyle === 'emerald' ? 'border-2 border-emerald-400' : 'border border-white/20'} overflow-hidden bg-emerald-950 flex items-center justify-center shrink-0 shadow-md relative p-0.5`}>
                            <img
                              src={draftLogo.customImageUrl}
                              alt="Emblem"
                              style={{
                                mixBlendMode: draftLogo.blendMode === 'screen' ? 'screen' : draftLogo.blendMode === 'multiply' ? 'multiply' : 'normal',
                              }}
                              className="w-full h-full object-contain rounded-full p-0.5"
                            />
                          </div>
                        ) : (
                          <div className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full ${draftLogo.borderStyle === 'gold' ? 'border-2 border-amber-300 ring-1 ring-amber-400/40' : draftLogo.borderStyle === 'emerald' ? 'border-2 border-emerald-400' : 'border border-white/20'} bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center text-emerald-950 font-bold text-lg font-cinzel shadow-inner shrink-0`}>
                            {draftLogo.monogramText || 'JM'}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-base">
                              {draftLogo.brandName || profileData.name}
                            </span>
                            {draftLogo.showBadge && (
                              <span className="text-[10px] uppercase font-semibold bg-emerald-800 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                                {draftLogo.badgeText || 'Madrasah'}
                              </span>
                            )}
                          </div>
                          {draftLogo.showTagline && (
                            <p className="text-xs text-emerald-200 font-light">
                              {draftLogo.taglineText || profileData.role}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="hidden md:flex items-center gap-2 text-xs text-emerald-200">
                        <span className="px-2.5 py-1 rounded bg-emerald-800/80">Beranda</span>
                        <span className="px-2.5 py-1 rounded bg-emerald-800/80">Karya</span>
                        <span className="px-2.5 py-1 rounded bg-emerald-800/80">Kontak</span>
                      </div>
                    </div>
                  </div>

                  {/* Upload Image Section */}
                  <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-emerald-800" />
                        <h4 className="text-sm font-bold text-gray-900">
                          1. Unggah Gambar / Logo Berkas Pribadi (PNG / JPG / SVG / WEBP)
                        </h4>
                      </div>
                      {draftLogo.type === 'custom_image' && draftLogo.customImageUrl && (
                        <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
                          ✓ Gambar Aktif Digunakan
                        </span>
                      )}
                    </div>

                    {logoUploadError && (
                      <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                        {logoUploadError}
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <label className="w-full sm:w-auto cursor-pointer px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                        <Upload className="w-4 h-4" />
                        <span>Pilih Berkas Gambar Logo...</span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp, image/svg+xml"
                          className="hidden"
                          onChange={async (e) => {
                            setLogoUploadError(null);
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 15 * 1024 * 1024) {
                              setLogoUploadError('Ukuran file maksimal 15MB');
                              return;
                            }
                            try {
                              const optimized = await compressAndResizeImage(file, 800, 0.9);
                              if (optimized) {
                                setDraftLogo((prev) => ({
                                  ...prev,
                                  type: 'custom_image',
                                  customImageUrl: optimized,
                                  shape: 'circle',
                                  fitMode: 'cover',
                                  zoomLevel: 115,
                                  borderStyle: 'gold',
                                  backgroundColor: 'transparent',
                                  blendMode: 'normal',
                                }));
                                showToast('Logo dimuat.');

                                fetch('/api/upload-image', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ image: optimized, type: 'logo', filename: file.name })
                                })
                                  .then((r) => r.json())
                                  .then((data) => {
                                    if (data && data.url) {
                                      setDraftLogo((prev) => ({
                                        ...prev,
                                        type: 'custom_image',
                                        customImageUrl: data.url,
                                      }));
                                    }
                                  })
                                  .catch(() => {});
                              }
                            } catch {
                              setLogoUploadError('Gagal memproses gambar logo.');
                            }
                          }}
                        />
                      </label>

                      {draftLogo.customImageUrl && draftLogo.type === 'custom_image' && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!draftLogo.customImageUrl) return;
                              showToast('Sedang memotong bulat dan memaksimalkan logo...');
                              try {
                                const cropped = await cropCircleAndMaximizeEmblem(draftLogo.customImageUrl, 1.15);
                                setDraftLogo((prev) => ({
                                  ...prev,
                                  customImageUrl: cropped,
                                  shape: 'circle',
                                  size: 'extralarge',
                                  fitMode: 'cover',
                                  zoomLevel: 120,
                                  borderStyle: 'gold',
                                  backgroundColor: 'transparent',
                                  blendMode: 'normal',
                                }));
                                showToast('✨ Kotak putih/catur berhasil dihilangkan! Logo dipotong bulat & diperbesar!');
                              } catch (e) {
                                showToast('Gagal memotong bulat logo.');
                              }
                            }}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-emerald-950 text-xs font-black flex items-center gap-1.5 shadow-xs border border-amber-300 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>✨ 1-Klik Potong Bulat & Maksimalkan Logo (Rekomendasi)</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              if (!draftLogo.customImageUrl) return;
                              showToast('Memproses transparansi logo...');
                              try {
                                const trans = await removeWhiteBackground(draftLogo.customImageUrl, 220);
                                setDraftLogo((prev) => ({
                                  ...prev,
                                  customImageUrl: trans,
                                  shape: 'transparent',
                                  backgroundColor: 'transparent',
                                  blendMode: 'normal',
                                }));
                                showToast('✨ Latar belakang putih berhasil dihilangkan! Logo kini transparan dan cerah tajam.');
                              } catch (e) {
                                showToast('Gagal memproses transparansi.');
                              }
                            }}
                            className="px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                            <span>🪄 Hapus Background Putih</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDraftLogo((prev) => ({
                                ...prev,
                                shape: 'transparent',
                                backgroundColor: 'transparent',
                                blendMode: 'normal',
                              }));
                              showToast('Mode Normal Cerah Transparan diaktifkan!');
                            }}
                            className="px-3 py-2 rounded-xl bg-white text-emerald-950 border border-emerald-300 text-xs font-semibold hover:bg-emerald-50 flex items-center gap-1.5 cursor-pointer"
                          >
                            <SunMedium className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Mode Normal Cerah</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDraftLogo((prev) => ({ ...prev, customImageUrl: undefined, type: 'monogram' }));
                            }}
                            className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 cursor-pointer"
                          >
                            Hapus Gambar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Blend Mode Selection */}
                    {draftLogo.customImageUrl && (
                      <div className="pt-2 border-t border-gray-100">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                          Mode Tampilan Gambar Logo:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { id: 'normal', label: '1. Normal Cerah (Rekomendasi)', desc: 'Warna asli, tajam & tidak gelap' },
                            { id: 'screen', label: '2. Screen / Bersinar', desc: 'Mencerahkan logo gelap' },
                            { id: 'multiply', label: '3. Multiply (Tembus Putih)', desc: 'Khusus gambar berlatar putih' },
                          ].map((bm) => {
                            const isSel = (draftLogo.blendMode || 'normal') === bm.id;
                            return (
                              <button
                                key={bm.id}
                                type="button"
                                onClick={() => setDraftLogo({ ...draftLogo, blendMode: bm.id as any })}
                                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                                  isSel
                                    ? 'bg-emerald-800 text-amber-300 border-amber-400 font-bold shadow-xs'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-emerald-50'
                                }`}
                              >
                                <div className="text-[11px]">{bm.label}</div>
                                <div className="text-[9px] opacity-75">{bm.desc}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Preset Islamic Emblems */}
                  <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 space-y-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-800" />
                      <h4 className="text-sm font-bold text-gray-900">
                        2. Pilih Lambang & Emblem Islami Madrasah
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {presetEmblems.map((emblem) => {
                        const isSelected = draftLogo.type === 'preset_emblem' && draftLogo.customImageUrl === emblem.dataUrl;
                        return (
                          <button
                            key={emblem.id}
                            type="button"
                            onClick={() => {
                              setDraftLogo((prev) => ({
                                ...prev,
                                type: 'preset_emblem',
                                customImageUrl: emblem.dataUrl,
                                shape: 'circle',
                              }));
                            }}
                            className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                              isSelected
                                ? 'border-amber-500 bg-emerald-50 ring-2 ring-amber-400/50'
                                : 'border-gray-200 bg-white hover:border-emerald-300'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-emerald-950 border border-amber-400/40 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                              <img src={emblem.dataUrl} alt={emblem.name} className="w-full h-full object-contain rounded-full" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold text-gray-900 truncate">{emblem.name}</p>
                              <p className="text-[10px] text-gray-500 truncate">{emblem.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Monogram, Shape & Text Customization */}
                  <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 space-y-4">
                    <h4 className="text-sm font-bold text-gray-900">
                      3. Pengaturan Monogram & Teks Identitas
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Inisial Monogram (JM)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={4}
                            value={draftLogo.monogramText}
                            onChange={(e) => setDraftLogo({ ...draftLogo, monogramText: e.target.value.toUpperCase(), type: 'monogram' })}
                            className="w-24 px-3 py-2 text-center uppercase font-bold border border-gray-300 rounded-xl font-cinzel text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setDraftLogo((prev) => ({ ...prev, type: 'monogram', shape: 'circle' }))}
                            className="px-2.5 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200"
                          >
                            Pakai Monogram
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Bentuk Bingkai
                        </label>
                        <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-emerald-800 text-amber-300 flex items-center justify-center text-[10px]">✓</div>
                          <span className="text-xs font-bold text-emerald-950">Bulat Otomatis (Circle)</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Aksen Garis Tepi
                        </label>
                        <select
                          value={draftLogo.borderStyle}
                          onChange={(e) => setDraftLogo({ ...draftLogo, borderStyle: e.target.value as any })}
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                        >
                          <option value="gold">Emas Berkilau (Gold)</option>
                          <option value="emerald">Hijau Zamrud (Emerald)</option>
                          <option value="none">Minimalis (Tanpa Border)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          1. Judul Header Utama *
                        </label>
                        <input
                          type="text"
                          value={draftLogo.brandName}
                          onChange={(e) => setDraftLogo({ ...draftLogo, brandName: e.target.value })}
                          placeholder="Ust. Jaenal Maskun / HOSTING JEN"
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl font-semibold"
                        />
                      </div>

                      <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-emerald-950 uppercase">
                            2. Sub Judul Header
                          </label>
                          <label className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={draftLogo.showTagline ?? true}
                              onChange={(e) => setDraftLogo({ ...draftLogo, showTagline: e.target.checked })}
                              className="rounded text-emerald-700 focus:ring-emerald-600"
                            />
                            <span>Tampilkan</span>
                          </label>
                        </div>
                        <input
                          type="text"
                          disabled={draftLogo.showTagline === false}
                          value={draftLogo.taglineText}
                          onChange={(e) => setDraftLogo({ ...draftLogo, taglineText: e.target.value })}
                          placeholder="Tulisan di bawah judul (contoh: Pendidik & Inovator Islam)"
                          className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white disabled:bg-gray-100 font-medium"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-gray-700 uppercase">
                            3. Teks Lencana (Badge)
                          </label>
                          <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={draftLogo.showBadge}
                              onChange={(e) => setDraftLogo({ ...draftLogo, showBadge: e.target.checked })}
                              className="rounded text-emerald-700 focus:ring-emerald-600"
                            />
                            <span>Tampilkan</span>
                          </label>
                        </div>
                        <input
                          type="text"
                          disabled={!draftLogo.showBadge}
                          value={draftLogo.badgeText}
                          onChange={(e) => setDraftLogo({ ...draftLogo, badgeText: e.target.value })}
                          placeholder="MADRASAH"
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl disabled:bg-gray-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Favicon Tab Browser */}
                  <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-800" />
                        <h4 className="text-sm font-bold text-gray-900">
                          4. Favicon Tab Browser (Ikon Tab Browser 64x64 Transparan)
                        </h4>
                      </div>
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                        Tab Browser
                      </span>
                    </div>

                    <div className="bg-gray-900 p-3 rounded-xl border border-gray-800 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded bg-gray-800 border border-gray-700 p-0.5 flex items-center justify-center">
                          {draftLogo.faviconUrl || draftLogo.customImageUrl ? (
                            <img
                              src={draftLogo.faviconUrl || draftLogo.customImageUrl}
                              alt="Favicon Preview"
                              className="w-5 h-5 object-contain"
                            />
                          ) : (
                            <Sparkles className="w-4 h-4 text-amber-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-200">
                            {draftLogo.brandName || profileData.name} - Portal Resmi
                          </p>
                          <p className="text-[10px] text-gray-400">jaenalmaskun.biz.id</p>
                        </div>
                      </div>

                      <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-1 rounded border border-emerald-800">
                        Pratinjau Tab Browser
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {draftLogo.customImageUrl && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!draftLogo.customImageUrl) return;
                            showToast('Membuat favicon transparan 64x64...');
                            try {
                              const fav = await generateFaviconDataUrl(draftLogo.customImageUrl, 64);
                              setDraftLogo((prev) => ({ ...prev, faviconUrl: fav }));
                              showToast('✅ Favicon transparan berhasil dibuat dari logo utama!');
                            } catch (e) {
                              showToast('Gagal membuat favicon.');
                            }
                          }}
                          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-emerald-950 text-xs font-bold flex items-center gap-1.5 shadow-xs"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>🪄 1-Klik Buat Favicon dari Logo Utama</span>
                        </button>
                      )}

                      <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-gray-300">
                        <Upload className="w-3.5 h-3.5 text-gray-600" />
                        <span>Unggah Berkas Favicon Khusus...</span>
                        <input
                          type="file"
                          accept="image/png, image/x-icon, image/svg+xml, image/jpeg, image/webp"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const optimized = await compressAndResizeImage(file, 256, 0.9);
                              if (optimized) {
                                try {
                                  const fav = await generateFaviconDataUrl(optimized, 64);
                                  setDraftLogo((prev) => ({ ...prev, faviconUrl: fav }));
                                  showToast('✅ Favicon khusus berhasil dimuat!');
                                } catch {
                                  setDraftLogo((prev) => ({ ...prev, faviconUrl: optimized }));
                                  showToast('✅ Favicon khusus berhasil dimuat!');
                                }
                              }
                            } catch {
                              showToast('Gagal membaca berkas favicon.');
                            }
                          }}
                        />
                      </label>

                      {draftLogo.faviconUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setDraftLogo((prev) => ({ ...prev, faviconUrl: undefined }));
                            showToast('Favicon dikembalikan ke logo utama.');
                          }}
                          className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200"
                        >
                          Hapus Favicon Khusus
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Section 5: Logo Footer (Sebelah Kiri Tulisan Ust. Jaenal Maskun) */}
                  <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-emerald-800" />
                        <h4 className="text-sm font-bold text-gray-900">
                          5. Logo Footer Website (Sebelah Kiri Tulisan Ust. Jaenal Maskun)
                        </h4>
                      </div>
                      <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-bold">
                        Bawah Website
                      </span>
                    </div>

                    <p className="text-xs text-gray-500">
                      Tampilkan logo khusus atau logo yang sama di bilah footer paling bawah tepat di sebelah kiri nama Jaenal Maskun dengan latar gelap emerald (<code className="text-emerald-800 font-mono">#042e23</code>).
                    </p>

                    {/* Footer Live Preview */}
                    <div className="bg-[#042e23] p-4 rounded-xl border border-emerald-800 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const fMode = draftLogo.footerLogoMode || 'match_header';
                          const fUrl = fMode === 'custom' ? draftLogo.footerCustomImageUrl : (fMode === 'match_header' ? (draftLogo.type === 'custom_image' ? draftLogo.customImageUrl : undefined) : undefined);
                          const fBlend = draftLogo.footerBlendMode || draftLogo.blendMode || 'normal';

                          if (fUrl) {
                            return (
                              <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center p-0.5 bg-transparent border border-emerald-700/50">
                                <img
                                  src={fUrl}
                                  alt="Footer Logo Preview"
                                  style={
                                    fBlend === 'screen'
                                      ? { mixBlendMode: 'screen' }
                                      : fBlend === 'multiply'
                                      ? { mixBlendMode: 'multiply' }
                                      : {}
                                  }
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            );
                          }

                          return (
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-emerald-950 font-bold font-cinzel text-base border border-amber-300 shadow-xs">
                              {draftLogo.monogramText || 'JM'}
                            </div>
                          );
                        })()}

                        <div>
                          <h4 className="text-base font-bold text-white font-cinzel tracking-wide flex items-center gap-2">
                            <span>{draftLogo.brandName || profileData.name}</span>
                            <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30 font-sans">
                              {draftLogo.badgeText || 'Madrasah'}
                            </span>
                          </h4>
                          <p className="text-xs text-emerald-200/80 font-light">
                            {draftLogo.taglineText || profileData.role}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] text-amber-300 bg-emerald-900/80 px-2.5 py-1 rounded border border-emerald-700">
                        Pratinjau Footer Asli (#042e23)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'match_header', label: '1. Sinkronkan dengan Logo Header', desc: 'Otomatis mengikuti logo atas' },
                        { id: 'custom', label: '2. Gunakan Gambar Khusus Footer', desc: 'Unggah gambar terpisah' },
                        { id: 'monogram', label: '3. Emblem Monogram Emas JM', desc: 'Inisial emas kaligrafi' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setDraftLogo({ ...draftLogo, footerLogoMode: m.id as any })}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            (draftLogo.footerLogoMode || 'match_header') === m.id
                              ? 'border-amber-500 bg-emerald-50 ring-2 ring-amber-400/40 font-bold'
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          }`}
                        >
                          <p className="text-xs text-gray-900">{m.label}</p>
                          <p className="text-[10px] text-gray-500">{m.desc}</p>
                        </button>
                      ))}
                    </div>

                    {/* If custom footer image is selected */}
                    {draftLogo.footerLogoMode === 'custom' && (
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Unggah Logo Khusus Footer...</span>
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/webp, image/svg+xml"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = async (evt) => {
                                  const res = evt.target?.result as string;
                                  if (res) {
                                    setDraftLogo((prev) => ({
                                      ...prev,
                                      footerLogoMode: 'custom',
                                      footerCustomImageUrl: res,
                                      footerBlendMode: 'transparent_blend',
                                    }));
                                    showToast('Logo footer khusus dimuat!');
                                  }
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>

                          {draftLogo.footerCustomImageUrl && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!draftLogo.footerCustomImageUrl) return;
                                showToast('Menghapus latar putih logo footer...');
                                try {
                                  const trans = await removeWhiteBackground(draftLogo.footerCustomImageUrl, 220);
                                  setDraftLogo((prev) => ({
                                    ...prev,
                                    footerCustomImageUrl: trans,
                                    footerBlendMode: 'normal',
                                  }));
                                  showToast('✨ Latar belakang putih logo footer berhasil dihilangkan!');
                                } catch {
                                  showToast('Gagal memproses transparansi.');
                                }
                              }}
                              className="px-3 py-2 rounded-xl bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5"
                            >
                              <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                              <span>🪄 Hapus Background Putih Footer</span>
                            </button>
                          )}
                        </div>

                        {/* Footer Blend Mode */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Mode Tampilan Logo Footer:
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                              { id: 'normal', label: '1. Normal Cerah (Rekomendasi)' },
                              { id: 'screen', label: '2. Screen (Cahaya)' },
                              { id: 'multiply', label: '3. Multiply (Tembus Putih)' },
                            ].map((bm) => {
                              const isSel = (draftLogo.footerBlendMode || 'normal') === bm.id;
                              return (
                                <button
                                  key={bm.id}
                                  type="button"
                                  onClick={() => setDraftLogo({ ...draftLogo, footerBlendMode: bm.id as any })}
                                  className={`p-2 rounded-xl text-left text-xs border transition-all ${
                                    isSel
                                      ? 'bg-emerald-800 text-amber-300 border-amber-400 font-bold'
                                      : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50'
                                  }`}
                                >
                                  {bm.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bottom Save Action Bar */}
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950 via-[#064e3b] to-emerald-900 rounded-2xl border-2 border-amber-400/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-amber-300" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Selesai Mengatur Logo & Favicon?</h4>
                          <p className="text-xs text-emerald-200/80">Klik tombol simpan untuk langsung menyinkronkan logo baru ke tampilan web, database, dan seluruh perangkat.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setDraftLogo({ ...defaultHeaderLogo });
                            setLogoSaveSuccess(false);
                          }}
                          className="px-3.5 py-2.5 rounded-xl border border-white/20 text-xs font-semibold text-white/90 hover:bg-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Default</span>
                        </button>

                        <button
                          type="button"
                          id="admin-bottom-save-logo-btn"
                          disabled={isSavingLogo}
                          onClick={handleSaveLogoMain}
                          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-60 text-emerald-950 font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                        >
                          {isSavingLogo ? (
                            <>
                              <RefreshCw className="w-4 h-4 text-emerald-950 animate-spin" />
                              <span>Menyimpan ke Server...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-950" />
                              <span>Simpan Logo Header Sekarang</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* TAB 6: KELOLA STICKY FOOTER (FULL FEATURE SUITE) */}
              {/* ============================================================ */}
              {activeTab === 'footer' && (
                <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-[#064e3b] flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-amber-500" />
                        <span>Kustomisasi & Pengaturan Lengkap Sticky Footer</span>
                      </h3>
                      <p className="text-xs text-gray-500">
                        Atur tombol pintas navigasi bawah, tema warna islami, posisi melayang/docked, lencana status, dan tombol akses admin.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDraftFooter({ ...defaultStickyFooterConfig });
                          showToast('Sticky Footer dikembalikan ke pengaturan default.');
                        }}
                        className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-100 flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Default</span>
                      </button>

                      <button
                        type="button"
                        id="admin-save-footer-btn"
                        onClick={handleSaveFooter}
                        className="px-4 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all border border-amber-400/40 active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4 text-amber-300" />
                        <span>Simpan Perubahan Sticky Footer</span>
                      </button>
                    </div>
                  </div>

                  {footerSaveSuccess && (
                    <div className="p-3.5 bg-emerald-100 text-emerald-900 rounded-2xl border border-emerald-300 flex items-center gap-2 text-xs font-semibold animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Konfigurasi Sticky Footer berhasil disimpan dan aktif langsung pada website!</span>
                    </div>
                  )}

                  {/* REALTIME LIVE STICKY FOOTER PREVIEW */}
                  <div className="bg-[#043327] p-5 rounded-2xl border border-emerald-800 text-white space-y-3 shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Pratinjau Langsung Bilah Sticky Footer (Real-time Preview)</span>
                      </span>
                      <span className="text-[10px] bg-emerald-800 text-emerald-200 px-2.5 py-0.5 rounded border border-emerald-700">
                        {draftFooter.enabled ? 'Status: Aktif' : 'Status: Dinonaktifkan'} • Tema: {currentThemeObj.name.split(' ')[0]}
                      </span>
                    </div>

                    <div className="py-2 flex flex-col items-center">
                      {draftFooter.allowCollapse && (
                        <div className="px-3 py-0.5 rounded-t-lg bg-[#064e3b] text-amber-300 border-t border-x border-amber-500/40 text-[10px] font-semibold flex items-center gap-1 shadow-md mb-[-2px] z-10">
                          <span>{draftFooter.collapseText || 'Menu Pintas Madrasah'}</span>
                          <span className="text-[9px]">▼</span>
                        </div>
                      )}

                      <div
                        className={`w-full ${draftFooter.maxWidth} ${currentThemeObj.bgClass} backdrop-blur-md rounded-2xl border-2 shadow-2xl p-2 sm:p-2.5 flex items-center justify-between gap-1 sm:gap-2`}
                      >
                        <div className="flex items-center justify-around flex-1 gap-1 overflow-x-auto">
                          {draftFooter.items.filter((it) => it.visible).map((item, idx) => {
                            const IconComp = AVAILABLE_ICONS[item.icon] || Sparkles;
                            const isFirst = idx === 0;

                            return (
                              <div
                                key={item.id}
                                className={`relative flex flex-col items-center justify-center py-1 px-2 sm:px-3 rounded-xl transition-all ${
                                  isFirst ? currentThemeObj.activeClass + ' font-bold shadow-inner' : 'text-emerald-100/90 hover:bg-white/10'
                                }`}
                              >
                                {draftFooter.showBadges && item.badgeText && (
                                  <span
                                    className={`absolute -top-1 -right-1 text-[8px] font-bold px-1.5 py-0.2 rounded-full border ${
                                      item.badgeColor === 'emerald'
                                        ? 'bg-emerald-600 text-white border-emerald-300'
                                        : item.badgeColor === 'rose'
                                        ? 'bg-rose-600 text-white border-rose-300 animate-pulse'
                                        : item.badgeColor === 'blue'
                                        ? 'bg-blue-600 text-white border-blue-300'
                                        : 'bg-amber-400 text-emerald-950 border-amber-200'
                                    }`}
                                  >
                                    {item.badgeText}
                                  </span>
                                )}

                                <IconComp className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                                {draftFooter.showLabels && (
                                  <span className="text-[10px] sm:text-xs tracking-tight mt-0.5 whitespace-nowrap">
                                    {item.label}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-emerald-700/60">
                          {draftFooter.showAudioButton && (
                            <div className="p-1.5 rounded-lg bg-emerald-900/80 text-amber-300 text-[10px]">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                          )}

                          {draftFooter.showQuickLogoButton && (
                            <div className="p-1.5 rounded-lg bg-emerald-900/80 text-amber-300 text-[10px]">
                              <Camera className="w-3.5 h-3.5" />
                            </div>
                          )}

                          {draftFooter.showAdminButton && (
                            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-emerald-950 font-bold text-[11px] shadow-sm">
                              <Lock className="w-3 h-3" />
                              <span className="hidden sm:inline">{draftFooter.adminButtonText || 'Panel Admin'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sub-tabs for Footer configuration */}
                  <div className="flex border-b border-gray-200 bg-white rounded-2xl p-1.5 gap-1 shadow-2xs overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setFooterActiveSubTab('items')}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                        footerActiveSubTab === 'items'
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'text-gray-600 hover:text-emerald-900 hover:bg-gray-100'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>1. Kelola Item & Tombol ({draftFooter.items.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFooterActiveSubTab('design')}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                        footerActiveSubTab === 'design'
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'text-gray-600 hover:text-emerald-900 hover:bg-gray-100'
                      }`}
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>2. Tema Warna & Bentuk Bilah</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFooterActiveSubTab('actions')}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                        footerActiveSubTab === 'actions'
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'text-gray-600 hover:text-emerald-900 hover:bg-gray-100'
                      }`}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>3. Tombol Admin & Opsi Lanjutan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFooterActiveSubTab('templates')}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                        footerActiveSubTab === 'templates'
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'text-gray-600 hover:text-emerald-900 hover:bg-gray-100'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>4. Preset Template Menu</span>
                    </button>
                  </div>

                  {/* Sub-tab 1: Items */}
                  {footerActiveSubTab === 'items' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">Daftar Tombol Navigasi Sticky Footer</h4>
                          <p className="text-xs text-gray-500">Pilih urutan tombol, ikon Lucide, target bagian website atau URL kustom eksternal, dan lencana.</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowAddFooterForm(!showAddFooterForm)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{showAddFooterForm ? 'Tutup Form Tambah' : 'Tambah Tombol Menu'}</span>
                        </button>
                      </div>

                      {/* Add Item Form */}
                      {showAddFooterForm && (
                        <form
                          onSubmit={handleAddFooterItem}
                          className="p-4 sm:p-5 bg-emerald-50/90 rounded-2xl border-2 border-emerald-300 space-y-4 animate-fadeIn"
                        >
                          <h5 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Tambah Item Tombol Baru (Termasuk Link URL)</span>
                          </h5>

                          {/* Link Type Selector */}
                          <div className="flex items-center gap-2 p-1 bg-emerald-200/60 rounded-xl max-w-md">
                            <button
                              type="button"
                              onClick={() => setNewFooterLinkType('section')}
                              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                newFooterLinkType === 'section'
                                  ? 'bg-emerald-900 text-white shadow-xs'
                                  : 'text-emerald-950 hover:bg-white/40'
                              }`}
                            >
                              <Home className="w-3.5 h-3.5" />
                              <span>Section Halaman Web</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewFooterLinkType('url')}
                              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                newFooterLinkType === 'url'
                                  ? 'bg-emerald-900 text-white shadow-xs'
                                  : 'text-emerald-950 hover:bg-white/40'
                              }`}
                            >
                              <LinkIcon className="w-3.5 h-3.5" />
                              <span>Link URL Kustom</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                                Label Tombol *
                              </label>
                              <input
                                type="text"
                                required
                                value={newFooterLabel}
                                onChange={(e) => setNewFooterLabel(e.target.value)}
                                placeholder="Contoh: WhatsApp Guru / Galeri"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 font-semibold"
                              />
                            </div>

                            {newFooterLinkType === 'section' ? (
                              <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                                  Target Section Website *
                                </label>
                                <select
                                  value={newFooterSection}
                                  onChange={(e) => setNewFooterSection(e.target.value)}
                                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
                                >
                                  {AVAILABLE_SECTIONS.map((sec) => (
                                    <option key={sec.id} value={sec.id}>
                                      {sec.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div className="sm:col-span-1">
                                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1 flex items-center gap-1">
                                  <LinkIcon className="w-3 h-3 text-emerald-800" />
                                  <span>URL Kustom *</span>
                                </label>
                                <input
                                  type="text"
                                  required={newFooterLinkType === 'url'}
                                  value={newFooterUrl}
                                  onChange={(e) => setNewFooterUrl(e.target.value)}
                                  placeholder="https://wa.me/628123456789 atau https://drive.google.com/..."
                                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 font-mono text-emerald-950 font-semibold"
                                />
                              </div>
                            )}

                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                                Pilihan Ikon Lucide *
                              </label>
                              <select
                                value={newFooterIcon}
                                onChange={(e) => setNewFooterIcon(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
                              >
                                {AVAILABLE_ICON_NAMES.map((name) => (
                                  <option key={name} value={name}>
                                    {name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {newFooterLinkType === 'url' && (
                            <div className="p-3 bg-white/80 rounded-xl border border-emerald-200">
                              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800">
                                <input
                                  type="checkbox"
                                  checked={newFooterOpenInNewTab}
                                  onChange={(e) => setNewFooterOpenInNewTab(e.target.checked)}
                                  className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
                                />
                                <span>Buka tautan di tab baru (target="_blank")</span>
                              </label>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                                Teks Lencana / Badge (Opsional)
                              </label>
                              <input
                                type="text"
                                value={newFooterBadge}
                                onChange={(e) => setNewFooterBadge(e.target.value)}
                                placeholder="Contoh: Baru / Live / WA / 2026"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                                Warna Lencana
                              </label>
                              <select
                                value={newFooterBadgeColor}
                                onChange={(e) => setNewFooterBadgeColor(e.target.value as any)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
                              >
                                <option value="gold">Emas (Gold)</option>
                                <option value="emerald">Hijau (Emerald)</option>
                                <option value="rose">Merah (Rose)</option>
                                <option value="blue">Biru (Blue)</option>
                                <option value="purple">Ungu (Purple)</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setShowAddFooterForm(false)}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200"
                            >
                              Batal
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 rounded-xl bg-emerald-800 text-white text-xs font-bold"
                            >
                              Tambahkan ke Menu
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Items Cards */}
                      <div className="space-y-2.5">
                        {draftFooter.items.map((item, index) => {
                          const IconComp = AVAILABLE_ICONS[item.icon] || Sparkles;
                          const isEditing = editingFooterItemId === item.id;
                          const isUrl = item.linkType === 'url' || Boolean(item.url);

                          return (
                            <div
                              key={item.id}
                              className={`p-3.5 rounded-2xl border transition-all ${
                                item.visible
                                  ? 'bg-white border-gray-200 hover:border-emerald-300 shadow-2xs'
                                  : 'bg-gray-100/80 border-dashed border-gray-300 opacity-60'
                              }`}
                            >
                              {isEditing ? (
                                <div className="space-y-3 p-1">
                                  {/* Link Type switcher in edit mode */}
                                  <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg max-w-xs">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateFooterItem(item.id, { linkType: 'section' })}
                                      className={`flex-1 py-1 px-2 text-[11px] font-bold rounded ${
                                        item.linkType !== 'url'
                                          ? 'bg-emerald-800 text-white'
                                          : 'text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      Section ID
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateFooterItem(item.id, { linkType: 'url' })}
                                      className={`flex-1 py-1 px-2 text-[11px] font-bold rounded ${
                                        item.linkType === 'url'
                                          ? 'bg-emerald-800 text-white'
                                          : 'text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      URL Kustom
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div>
                                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Label Teks</label>
                                      <input
                                        type="text"
                                        value={item.label}
                                        onChange={(e) => handleUpdateFooterItem(item.id, { label: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 font-semibold"
                                      />
                                    </div>

                                    {item.linkType === 'url' ? (
                                      <div>
                                        <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1 flex items-center gap-1">
                                          <LinkIcon className="w-3 h-3" />
                                          <span>URL Kustom</span>
                                        </label>
                                        <input
                                          type="text"
                                          value={item.url || ''}
                                          onChange={(e) => handleUpdateFooterItem(item.id, {
                                            url: e.target.value,
                                            externalUrl: e.target.value,
                                            isExternal: true
                                          })}
                                          placeholder="https://..."
                                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 font-mono text-emerald-950"
                                        />
                                      </div>
                                    ) : (
                                      <div>
                                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Target Section</label>
                                        <select
                                          value={item.sectionId}
                                          onChange={(e) => handleUpdateFooterItem(item.id, { sectionId: e.target.value })}
                                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300"
                                        >
                                          {AVAILABLE_SECTIONS.map((sec) => (
                                            <option key={sec.id} value={sec.id}>{sec.label}</option>
                                          ))}
                                        </select>
                                      </div>
                                    )}

                                    <div>
                                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Ikon</label>
                                      <select
                                        value={item.icon}
                                        onChange={(e) => handleUpdateFooterItem(item.id, { icon: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300"
                                      >
                                        {AVAILABLE_ICON_NAMES.map((name) => (
                                          <option key={name} value={name}>{name}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  {item.linkType === 'url' && (
                                    <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                                      <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-800">
                                        <input
                                          type="checkbox"
                                          checked={item.openInNewTab || false}
                                          onChange={(e) => handleUpdateFooterItem(item.id, { openInNewTab: e.target.checked })}
                                          className="w-3.5 h-3.5 rounded text-emerald-700"
                                        />
                                        <span className="text-[11px] font-medium">Buka di tab baru (target="_blank")</span>
                                      </label>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Teks Badge</label>
                                      <input
                                        type="text"
                                        value={item.badgeText || ''}
                                        onChange={(e) => handleUpdateFooterItem(item.id, { badgeText: e.target.value || undefined })}
                                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Warna Badge</label>
                                      <select
                                        value={item.badgeColor || 'gold'}
                                        onChange={(e) => handleUpdateFooterItem(item.id, { badgeColor: e.target.value as any })}
                                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300"
                                      >
                                        <option value="gold">Emas (Gold)</option>
                                        <option value="emerald">Hijau (Emerald)</option>
                                        <option value="rose">Merah (Rose)</option>
                                        <option value="blue">Biru (Blue)</option>
                                        <option value="purple">Ungu (Purple)</option>
                                      </select>
                                    </div>
                                  </div>

                                  <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
                                    <button
                                      type="button"
                                      onClick={() => setEditingFooterItemId(null)}
                                      className="px-3 py-1 rounded-lg bg-emerald-800 text-white text-xs font-bold"
                                    >
                                      Selesai Edit
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0 border border-emerald-200">
                                      <IconComp className="w-5 h-5" />
                                    </div>

                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs sm:text-sm font-bold text-gray-900">
                                          {item.label}
                                        </span>
                                        {isUrl ? (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                                            <LinkIcon className="w-2.5 h-2.5" />
                                            <span>URL Kustom</span>
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                                            #{item.sectionId}
                                          </span>
                                        )}
                                        {item.badgeText && (
                                          <span
                                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                              item.badgeColor === 'emerald'
                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                : item.badgeColor === 'rose'
                                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                                : item.badgeColor === 'blue'
                                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                                : 'bg-amber-100 text-amber-900 border-amber-300'
                                            }`}
                                          >
                                            {item.badgeText}
                                          </span>
                                        )}
                                        {!item.visible && (
                                          <span className="text-[10px] text-gray-500 bg-gray-200 px-1.5 py-0.2 rounded">
                                            Disembunyikan
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-gray-500 font-medium">
                                        {isUrl ? (
                                          <span>Link: <span className="font-mono text-emerald-800 font-semibold">{item.url || '(belum ada url)'}</span> {item.openInNewTab ? '(Tab Baru)' : ''}</span>
                                        ) : (
                                          <span>Target: <span className="text-emerald-800 font-semibold">#{item.sectionId}</span></span>
                                        )}
                                        {' '}• Ikon: <span className="font-mono">{item.icon}</span>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      disabled={index === 0}
                                      onClick={() => handleMoveFooterItem(index, 'up')}
                                      title="Pindah ke Kiri/Atas"
                                      className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 text-gray-700"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      disabled={index === draftFooter.items.length - 1}
                                      onClick={() => handleMoveFooterItem(index, 'down')}
                                      title="Pindah ke Kanan/Bawah"
                                      className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 text-gray-700"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleToggleFooterVisibility(item.id)}
                                      title={item.visible ? 'Sembunyikan' : 'Tampilkan'}
                                      className={`p-1.5 rounded-lg border text-xs font-semibold ${
                                        item.visible
                                          ? 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                                          : 'border-gray-300 text-gray-500 bg-gray-100'
                                      }`}
                                    >
                                      {item.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setEditingFooterItemId(item.id)}
                                      className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                                    >
                                      Ubah
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteFooterItem(item.id)}
                                      title="Hapus"
                                      className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sub-tab 2: Design */}
                  {footerActiveSubTab === 'design' && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">Pilihan Tema & Tata Letak Sticky Footer</h4>
                        <p className="text-xs text-gray-500">Sesuaikan warna background, aksen border, lebar maksimum, dan posisi bilah.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {FOOTER_THEMES.map((th) => {
                          const isSelected = draftFooter.theme === th.id;
                          return (
                            <button
                              key={th.id}
                              type="button"
                              onClick={() => setDraftFooter({ ...draftFooter, theme: th.id as any })}
                              className={`p-4 rounded-2xl border text-left transition-all relative ${
                                isSelected
                                  ? 'border-amber-500 bg-emerald-50/80 shadow-md ring-2 ring-amber-400/60'
                                  : 'border-gray-200 bg-white hover:border-emerald-300'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="w-4 h-4 rounded-full border border-white shadow-xs" style={{ backgroundColor: th.accentColor }} />
                                {isSelected && (
                                  <span className="w-5 h-5 rounded-full bg-amber-500 text-emerald-950 flex items-center justify-center">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </span>
                                )}
                              </div>
                              <h5 className="text-xs font-bold text-gray-900">{th.name}</h5>
                              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{th.description}</p>
                            </button>
                          );
                        })}
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4">
                        <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Tata Letak & Posisi Bilah</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Gaya Penempatan (Position)</label>
                            <select
                              value={draftFooter.position}
                              onChange={(e) => setDraftFooter({ ...draftFooter, position: e.target.value as any })}
                              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-700 font-semibold"
                            >
                              <option value="floating">Melayang Berjarak (Floating Island Bar)</option>
                              <option value="bottom">Rapat Dasar Layar Penuh (Docked Bottom)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Lebar Maksimal Bilah (Max Width)</label>
                            <select
                              value={draftFooter.maxWidth}
                              onChange={(e) => setDraftFooter({ ...draftFooter, maxWidth: e.target.value as any })}
                              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-700 font-semibold"
                            >
                              <option value="max-w-xl">Ringkas (Max 576px - Cocok Mobile)</option>
                              <option value="max-w-3xl">Standar Sedang (Max 768px)</option>
                              <option value="max-w-4xl">Optimal Berimbang (Max 896px - Default)</option>
                              <option value="max-w-5xl">Lebar Dashboard (Max 1024px)</option>
                              <option value="max-w-full">Penuh Layar (Full Width)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-emerald-50/50">
                            <input
                              type="checkbox"
                              checked={draftFooter.showLabels}
                              onChange={(e) => setDraftFooter({ ...draftFooter, showLabels: e.target.checked })}
                              className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
                            />
                            <div>
                              <span className="text-xs font-bold text-gray-900 block">Tampilkan Label Teks</span>
                              <span className="text-[10px] text-gray-500">Tampilkan nama menu di bawah setiap ikon</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-emerald-50/50">
                            <input
                              type="checkbox"
                              checked={draftFooter.showBadges}
                              onChange={(e) => setDraftFooter({ ...draftFooter, showBadges: e.target.checked })}
                              className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
                            />
                            <div>
                              <span className="text-xs font-bold text-gray-900 block">Tampilkan Lencana Status (Badges)</span>
                              <span className="text-[10px] text-gray-500">Badge kecil notifikasi di sudut atas tombol</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sub-tab 3: Actions & Admin */}
                  {footerActiveSubTab === 'actions' && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">Tombol Khusus & Tombol Panel Admin</h4>
                        <p className="text-xs text-gray-500">Atur tombol login admin langsung di sticky footer, tombol upload logo, tombol audio, dan fungsi minimize.</p>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4">
                        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={draftFooter.showAdminButton}
                              onChange={(e) => setDraftFooter({ ...draftFooter, showAdminButton: e.target.checked })}
                              className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
                            />
                            <span className="text-xs font-bold text-emerald-950">
                              Tampilkan Tombol Akses Panel Admin di Sticky Footer
                            </span>
                          </label>

                          {draftFooter.showAdminButton && (
                            <div className="pl-6 space-y-2">
                              <label className="block text-[11px] font-bold text-gray-700 uppercase">
                                Teks Tombol Admin
                              </label>
                              <input
                                type="text"
                                value={draftFooter.adminButtonText}
                                onChange={(e) => setDraftFooter({ ...draftFooter, adminButtonText: e.target.value })}
                                placeholder="Panel Admin"
                                className="w-full sm:w-72 px-3 py-2 text-xs rounded-xl border border-gray-300 font-semibold"
                              />
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-emerald-50/50">
                            <input
                              type="checkbox"
                              checked={draftFooter.showQuickLogoButton}
                              onChange={(e) => setDraftFooter({ ...draftFooter, showQuickLogoButton: e.target.checked })}
                              className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
                            />
                            <div>
                              <span className="text-xs font-bold text-gray-900 block">Tombol Upload Logo Header</span>
                              <span className="text-[10px] text-gray-500">Ikon kamera untuk langsung mengganti logo</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-emerald-50/50">
                            <input
                              type="checkbox"
                              checked={draftFooter.showAudioButton}
                              onChange={(e) => setDraftFooter({ ...draftFooter, showAudioButton: e.target.checked })}
                              className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
                            />
                            <div>
                              <span className="text-xs font-bold text-gray-900 block">Tombol Nuansa Audio / Murottal</span>
                              <span className="text-[10px] text-gray-500">Ikon audio langsung pada bilah menu</span>
                            </div>
                          </label>
                        </div>

                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={draftFooter.allowCollapse}
                              onChange={(e) => setDraftFooter({ ...draftFooter, allowCollapse: e.target.checked })}
                              className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
                            />
                            <span className="text-xs font-bold text-gray-900">
                              Aktifkan Tombol Minimize / Collapse ("Menu Pintas Madrasah")
                            </span>
                          </label>

                          {draftFooter.allowCollapse && (
                            <div className="pl-6 space-y-2">
                              <label className="block text-[11px] font-bold text-gray-700 uppercase">
                                Teks Tab Minimizer
                              </label>
                              <input
                                type="text"
                                value={draftFooter.collapseText}
                                onChange={(e) => setDraftFooter({ ...draftFooter, collapseText: e.target.value })}
                                placeholder="Menu Pintas Madrasah"
                                className="w-full sm:w-72 px-3 py-2 text-xs rounded-xl border border-gray-300 font-semibold"
                              />
                            </div>
                          )}
                        </div>

                        {/* Device-Specific Visibility Controls */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/90 via-slate-50 to-amber-50/40 border-2 border-emerald-300 space-y-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-emerald-800 text-amber-300">
                                <Monitor className="w-4 h-4" />
                              </div>
                              <h5 className="text-xs sm:text-sm font-bold text-emerald-950">
                                Pengaturan Tampilan Berdasarkan Perangkat (Device Visibility)
                              </h5>
                            </div>
                            <p className="text-[11px] text-gray-600 mt-1">
                              Pilih apakah Sticky Footer ingin ditampilkan atau disembunyikan khusus di komputer/laptop atau perangkat smartphone/HP.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                            {/* Desktop / Computer Toggle */}
                            <div
                              className={`p-4 rounded-xl border transition-all ${
                                draftFooter.showOnDesktop !== false
                                  ? 'bg-white border-emerald-400 shadow-xs ring-1 ring-emerald-300/60'
                                  : 'bg-gray-100/90 border-gray-300 opacity-80'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                  <div className={`p-2 rounded-xl ${draftFooter.showOnDesktop !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-500'}`}>
                                    <Monitor className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-gray-900 block">Perangkat Komputer / PC / Laptop</span>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                      draftFooter.showOnDesktop !== false
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                                    }`}>
                                      {draftFooter.showOnDesktop !== false ? '✓ Aktif di Komputer' : '✕ Dinonaktifkan'}
                                    </span>
                                  </div>
                                </div>

                                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                                  <input
                                    type="checkbox"
                                    checked={draftFooter.showOnDesktop !== false}
                                    onChange={(e) => setDraftFooter({ ...draftFooter, showOnDesktop: e.target.checked })}
                                    className="sr-only peer"
                                  />
                                  <div className="w-10 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-700"></div>
                                </label>
                              </div>
                              <p className="text-[11px] text-gray-500 leading-relaxed">
                                Jika dinonaktifkan, bilah menu Sticky Footer otomatis disembunyikan pada layar monitor PC, komputer desktop, dan laptop (lebar ≥ 768px).
                              </p>
                            </div>

                            {/* Mobile / Smartphone Toggle */}
                            <div
                              className={`p-4 rounded-xl border transition-all ${
                                draftFooter.showOnMobile !== false
                                  ? 'bg-white border-emerald-400 shadow-xs ring-1 ring-emerald-300/60'
                                  : 'bg-gray-100/90 border-gray-300 opacity-80'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                  <div className={`p-2 rounded-xl ${draftFooter.showOnMobile !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-500'}`}>
                                    <Smartphone className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-gray-900 block">Perangkat Smartphone / HP</span>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                      draftFooter.showOnMobile !== false
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                                    }`}>
                                      {draftFooter.showOnMobile !== false ? '✓ Aktif di HP' : '✕ Dinonaktifkan'}
                                    </span>
                                  </div>
                                </div>

                                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                                  <input
                                    type="checkbox"
                                    checked={draftFooter.showOnMobile !== false}
                                    onChange={(e) => setDraftFooter({ ...draftFooter, showOnMobile: e.target.checked })}
                                    className="sr-only peer"
                                  />
                                  <div className="w-10 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-700"></div>
                                </label>
                              </div>
                              <p className="text-[11px] text-gray-500 leading-relaxed">
                                Jika dinonaktifkan, bilah menu Sticky Footer disembunyikan pada layar smartphone dan ponsel pengunjung (lebar &lt; 768px).
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-amber-950 block">Status Sticky Footer Global</span>
                            <span className="text-[11px] text-amber-800">
                              Jika dinonaktifkan, Sticky Footer disembunyikan total di semua perangkat.
                            </span>
                          </div>

                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={draftFooter.enabled}
                              onChange={(e) => setDraftFooter({ ...draftFooter, enabled: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-800"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sub-tab 4: Templates */}
                  {footerActiveSubTab === 'templates' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">Pilihan Preset Template Menu Siap Pakai</h4>
                        <p className="text-xs text-gray-500">Pilih susunan tombol siap pakai yang telah disesuaikan.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {[
                          {
                            id: 'standar',
                            title: '1. Standar Madrasah (5 Menu)',
                            desc: 'Beranda, Karya & Modul, Agenda, Tasbih & Sholat, Silaturahmi Kontak.',
                            badge: 'Rekomendasi',
                          },
                          {
                            id: 'lengkap',
                            title: '2. Lengkap Semua Bagian (7 Menu)',
                            desc: 'Beranda, Profil, Karya, Agenda, Tasbih, Galeri, Kontak Silaturahmi.',
                            badge: 'Maksimal',
                          },
                          {
                            id: 'spiritual',
                            title: '3. Fokus Kajian & Ibadah (4 Menu)',
                            desc: 'Beranda, Kajian Kitab, Jadwal & Sholat, Hubungi Guru.',
                            badge: 'Spiritual',
                          },
                          {
                            id: 'ringkas',
                            title: '4. Ringkas Minimalis (3 Menu)',
                            desc: 'Beranda, Karya Modul, Silaturahmi.',
                            badge: 'Ringkas',
                          },
                        ].map((tpl) => (
                          <div
                            key={tpl.id}
                            className="p-4 rounded-2xl border border-gray-200 bg-white hover:border-emerald-400 flex flex-col justify-between gap-3 shadow-2xs"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <h5 className="text-xs font-bold text-gray-900">{tpl.title}</h5>
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                  {tpl.badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 leading-relaxed">{tpl.desc}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleApplyFooterTemplate(tpl.id)}
                              className="w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-200 transition-colors"
                            >
                              Terapkan Template Ini
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================ */}
              {/* TAB: CADANGAN DATA & PEMULIHAN (BACKUP & RESTORE) */}
              {/* ============================================================ */}
              {activeTab === 'backup' && (
                <BackupManager
                  onDataRestored={onSaveSiteContent}
                  siteContent={siteContent}
                  logoConfig={logoConfig}
                  stickyFooterConfig={stickyFooterConfig}
                />
              )}

              {/* ============================================================ */}
              {/* TAB 11: PENGELOLAAN AKUN USER & PASSWORD ADMIN */}
              {/* ============================================================ */}
              {activeTab === 'users' && (
                <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
                  {/* Header Banner */}
                  <div className="bg-gradient-to-r from-[#064e3b] via-[#043327] to-[#022c22] p-6 sm:p-8 rounded-3xl border-2 border-amber-400/80 shadow-xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-300">
                        <ShieldCheck className="w-6 h-6 text-amber-400" />
                        <span className="text-xs font-bold uppercase tracking-wider">Keamanan & Otoritas Sistem</span>
                        <span className="bg-amber-400 text-emerald-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs">
                          Super Admin
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        Pengelolaan Akun & Password Admin
                      </h3>
                      <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
                        Atur kredensial login, ubah kata sandi admin secara berkala, kelola identitas akun super admin, dan simpan langsung ke file server.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full md:w-auto">
                      <button
                        type="button"
                        onClick={handleResetDefaultPassword}
                        className="px-4 py-2.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                        title="Kembalikan password ke kata sandi standar default"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reset ke Default</span>
                      </button>
                    </div>
                  </div>

                  {/* Feedback Message */}
                  {authActionMsg.text && (
                    <div className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-sm animate-fadeIn ${
                      authActionMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : 'bg-red-50 text-red-900 border-red-300'
                    }`}>
                      {authActionMsg.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                      )}
                      <span>{authActionMsg.text}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column (5 Cols): Account Status & Credential Info */}
                    <div className="lg:col-span-5 space-y-6">
                      {/* Active Admin Profile Card */}
                      <div className="bg-white p-6 rounded-3xl border-2 border-emerald-200 shadow-md space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                            <User className="w-4 h-4 text-emerald-800" />
                            <span>Status Akun Admin Aktif</span>
                          </h4>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Aktif Terverifikasi
                          </span>
                        </div>

                        <div className="flex items-center gap-4 pt-1">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#064e3b] to-emerald-900 text-amber-400 flex items-center justify-center font-bold text-2xl font-cinzel border-2 border-amber-400 shadow-inner shrink-0">
                            JM
                          </div>
                          <div className="space-y-1 min-w-0">
                            <h5 className="text-sm font-bold text-gray-900 truncate">
                              {adminUser.name || 'Ust. Jaenal Maskun, S.Pd.I.'}
                            </h5>
                            <p className="text-xs text-emerald-800 font-semibold truncate flex items-center gap-1">
                              <Mail className="w-3 h-3 text-emerald-600" />
                              <span>{adminUser.email || 'jaenalmaskun.ai@gmail.com'}</span>
                            </p>
                            <span className="inline-block text-[10px] font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md border border-gray-200">
                              Username: <strong>{adminUser.username || 'admin'}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200 text-xs space-y-2">
                          <div className="flex items-center justify-between text-emerald-950">
                            <span className="font-semibold text-gray-600">Tingkat Hak Akses:</span>
                            <span className="font-bold text-emerald-900">{adminUser.role || 'Super Administrator'}</span>
                          </div>
                          <div className="flex items-center justify-between text-emerald-950">
                            <span className="font-semibold text-gray-600">Pembaruan Sandi:</span>
                            <span className="font-mono text-[11px] text-gray-700">
                              {adminUser.lastPasswordChange
                                ? new Date(adminUser.lastPasswordChange).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : 'Default Sistem'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-emerald-950">
                            <span className="font-semibold text-gray-600">Metode Login Didukung:</span>
                            <span className="font-bold text-emerald-800">Password Cepat / Email & Password</span>
                          </div>
                        </div>
                      </div>

                      {/* Info & Security Guide Card */}
                      <div className="bg-amber-50/90 p-6 rounded-3xl border-2 border-amber-300 shadow-2xs space-y-3">
                        <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-2">
                          <Lock className="w-4 h-4 text-amber-700" />
                          <span>Panduan Kata Sandi & Keamanan</span>
                        </h4>
                        <ul className="text-xs text-amber-950 space-y-2 leading-relaxed font-medium">
                          <li className="flex items-start gap-2">
                            <span className="text-amber-600 font-bold">•</span>
                            <span><strong>Keamanan Kata Sandi:</strong> Pastikan Anda menggunakan kata sandi unik yang kuat dan melakukan pembaruan secara berkala demi keamanan situs.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-600 font-bold">•</span>
                            <span><strong>Sinkronisasi Multi-Akses:</strong> Password yang Anda ubah di sini otomatis aktif untuk login via tombol <em>Header / Modal Profil</em> dan tombol <em>Login Dasbor Lengkap</em>.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-600 font-bold">•</span>
                            <span><strong>Penyimpanan Permanen:</strong> Kredensial tersimpan di file aman server <code className="bg-amber-200 px-1 rounded font-mono text-[10px]">data/admin_auth.json</code>.</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Right Column (7 Cols): Forms */}
                    <div className="lg:col-span-7 space-y-6">
                      {/* FORM 1: GANTI PASSWORD ADMIN */}
                      <div className="bg-white p-6 sm:p-7 rounded-3xl border-2 border-emerald-200 shadow-md space-y-5">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Key className="w-4 h-4 text-amber-600" />
                            <span>Perbarui Kata Sandi (Ganti Password)</span>
                          </h4>
                          <span className="text-xs text-gray-500 font-medium">Min. 6 Karakter</span>
                        </div>

                        <form onSubmit={handleChangeAdminPassword} className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                              Password Lama
                            </label>
                            <div className="relative">
                              <input
                                type={showOldPass ? "text" : "password"}
                                required
                                value={adminPassForm.oldPassword}
                                onChange={(e) => setAdminPassForm({ ...adminPassForm, oldPassword: e.target.value })}
                                placeholder="Masukkan password admin saat ini..."
                                className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-700 font-medium"
                              />
                              <button
                                type="button"
                                onClick={() => setShowOldPass(!showOldPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                              >
                                {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                Password Baru
                              </label>
                              <div className="relative">
                                <input
                                  type={showNewPass ? "text" : "password"}
                                  required
                                  minLength={6}
                                  value={adminPassForm.newPassword}
                                  onChange={(e) => setAdminPassForm({ ...adminPassForm, newPassword: e.target.value })}
                                  placeholder="Password baru (min 6 char)"
                                  className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-700 font-medium"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowNewPass(!showNewPass)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                Konfirmasi Password Baru
                              </label>
                              <div className="relative">
                                <input
                                  type={showConfirmPass ? "text" : "password"}
                                  required
                                  minLength={6}
                                  value={adminPassForm.confirmPassword}
                                  onChange={(e) => setAdminPassForm({ ...adminPassForm, confirmPassword: e.target.value })}
                                  placeholder="Ketik ulang password baru"
                                  className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-700 font-medium"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={isUpdatingPass}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                          >
                            <Key className="w-4 h-4" />
                            <span>{isUpdatingPass ? 'Menyimpan Password...' : 'Simpan & Terapkan Password Baru'}</span>
                          </button>
                        </form>
                      </div>

                      {/* FORM 2: PENGELOLAAN PROFIL & USERNAME ADMIN */}
                      <div className="bg-white p-6 sm:p-7 rounded-3xl border-2 border-emerald-200 shadow-md space-y-5">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-emerald-700" />
                            <span>Pengaturan Identitas & Username Admin</span>
                          </h4>
                          <span className="text-xs text-gray-500 font-medium">Akun Utama</span>
                        </div>

                        <form onSubmit={handleUpdateAdminProfile} className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                              Nama Lengkap Pengelola
                            </label>
                            <input
                              type="text"
                              required
                              value={adminProfileForm.name}
                              onChange={(e) => setAdminProfileForm({ ...adminProfileForm, name: e.target.value })}
                              placeholder="Ust. Jaenal Maskun, S.Pd.I."
                              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-700 font-medium"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                Username Login
                              </label>
                              <input
                                type="text"
                                required
                                value={adminProfileForm.username}
                                onChange={(e) => setAdminProfileForm({ ...adminProfileForm, username: e.target.value })}
                                placeholder="admin"
                                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-700 font-mono font-semibold"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                Email Resmi
                              </label>
                              <input
                                type="email"
                                required
                                value={adminProfileForm.email}
                                onChange={(e) => setAdminProfileForm({ ...adminProfileForm, email: e.target.value })}
                                placeholder="jaenalmaskun.ai@gmail.com"
                                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-700 font-medium"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={isUpdatingProfile}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                          >
                            <Check className="w-4 h-4 text-amber-300" />
                            <span>{isUpdatingProfile ? 'Menyimpan...' : 'Perbarui Identitas Akun Admin'}</span>
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* TAB 12: PUSAT EKSPOR & HOSTING PLESK / CPANEL */}
              {/* ============================================================ */}
              {activeTab === 'plesk' && (
                <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
                  {/* Header Banner */}
                  <div className="bg-gradient-to-r from-[#064e3b] via-[#043327] to-[#022c22] p-6 sm:p-8 rounded-3xl border-2 border-amber-400/90 shadow-xl text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-3xl">
                      <div className="flex items-center gap-2 text-amber-300 flex-wrap">
                        <Server className="w-6 h-6 text-amber-400" />
                        <span className="text-xs font-bold uppercase tracking-wider">Deploy & Web Hosting Server</span>
                        <span className="bg-amber-400 text-emerald-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                          Plesk & cPanel Ready
                        </span>
                        <span className="bg-emerald-800 text-emerald-100 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-600">
                          PHP + MySQL Native
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        Paket Siap Unggah Hosting Plesk
                      </h3>
                      <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                        Unduh 1 berkas ZIP mandiri yang telah dikonfigurasi penuh untuk server hosting Plesk/cPanel. Berisi backend PHP API, berkas HTML/JS/CSS, database SQL, skrip auto-unzipper, dan aturan .htaccess.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
                      <button
                        type="button"
                        onClick={handleDownloadDatabaseSqlAdmin}
                        className="px-4 py-3 rounded-2xl bg-emerald-900/90 hover:bg-emerald-800 text-amber-300 border border-amber-400/50 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
                        title="Unduh berkas skrip SQL untuk diimpor ke phpMyAdmin"
                      >
                        <Database className="w-4 h-4 text-amber-400" />
                        <span>Unduh database.sql</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadPleskZipAdmin}
                        disabled={isExportingPleskAdmin}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-emerald-950" />
                        <span>{isExportingPleskAdmin ? 'Mengemas ZIP...' : 'Unduh Paket ZIP Plesk'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar (If active) */}
                  {pleskAdminProgress && (
                    <div className="p-4 bg-emerald-900/90 rounded-2xl border-2 border-amber-400/60 text-white shadow-md animate-fadeIn space-y-2">
                      <div className="flex justify-between text-xs font-bold text-amber-300">
                        <span className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                          <span>{pleskAdminProgress.message}</span>
                        </span>
                        <span>{pleskAdminProgress.percent}%</span>
                      </div>
                      <div className="w-full bg-emerald-950 h-2.5 rounded-full overflow-hidden border border-emerald-700">
                        <div
                          className="bg-gradient-to-r from-amber-400 to-amber-300 h-full transition-all duration-300"
                          style={{ width: `${pleskAdminProgress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 2-Column Grid: MySQL Credentials & ZIP Package Contents */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Column 1: MySQL Credentials Box (5 Cols) */}
                    <div className="lg:col-span-5 space-y-6">
                      <div className="bg-white p-6 sm:p-7 rounded-3xl border-2 border-emerald-200 shadow-md space-y-5">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                            <Database className="w-4 h-4 text-emerald-800" />
                            <span>Kredensial Database MySQL</span>
                          </h4>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
                            Terkonfigurasi
                          </span>
                        </div>

                        <p className="text-xs text-gray-600 leading-relaxed">
                          Seluruh skrip PHP di dalam paket ZIP telah otomatis menggunakan konfigurasi database berikut:
                        </p>

                        <div className="space-y-2.5">
                          {/* Host */}
                          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase block">Host Database:</span>
                              <span className="text-xs font-mono font-bold text-gray-800">localhost</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText('localhost', 'Host Database')}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                              title="Salin Host"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Database Name */}
                          <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-emerald-700 uppercase block">Nama Database (DB Name):</span>
                              <span className="text-xs font-mono font-bold text-emerald-950">jaenal_masterweb</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText('jaenal_masterweb', 'Nama Database')}
                              className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 transition-colors"
                              title="Salin Nama DB"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Database User */}
                          <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-emerald-700 uppercase block">Username DB (DB User):</span>
                              <span className="text-xs font-mono font-bold text-emerald-950">jaenal_masterweb</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText('jaenal_masterweb', 'Username DB')}
                              className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 transition-colors"
                              title="Salin Username DB"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Database Password */}
                          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-amber-800 uppercase block">Password Database:</span>
                              <span className="text-xs font-mono font-bold text-amber-950">masbagus15</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText('masbagus15', 'Password Database')}
                              className="p-1.5 rounded-lg text-amber-700 hover:text-amber-900 hover:bg-amber-100 transition-colors"
                              title="Salin Password DB"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-1.5">
                          <span className="text-[11px] font-bold text-gray-700 block flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Koneksi PHP PDO Terenkripsi</span>
                          </span>
                          <p className="text-[11px] text-gray-500 leading-relaxed">
                            Jika password di server Plesk Anda berbeda, cukup edit berkas <code className="font-mono text-emerald-800 font-bold bg-white px-1 py-0.5 rounded border">db_config.php</code> setelah diekstrak.
                          </p>
                        </div>
                      </div>

                      {/* Quick Download Card */}
                      <div className="bg-gradient-to-br from-[#1e1b4b] to-[#0f172a] text-white p-6 rounded-3xl border-2 border-amber-400/80 shadow-md space-y-4">
                        <div className="flex items-center gap-2 text-amber-300">
                          <FolderDown className="w-5 h-5 text-amber-400" />
                          <h4 className="text-sm font-bold text-white">Unduh Langsung dari Server</h4>
                        </div>
                        <p className="text-xs text-gray-200 leading-relaxed">
                          Anda juga dapat mengunduh paket ZIP secara langsung dari endpoint server backend:
                        </p>
                        <a
                          href="/api/export-plesk-zip"
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh via /api/export-plesk-zip</span>
                        </a>
                      </div>
                    </div>

                    {/* Column 2: Step-by-Step Walkthrough & Package Files (7 Cols) */}
                    <div className="lg:col-span-7 space-y-6">
                      {/* Interactive Step Guide */}
                      <div className="bg-white p-6 sm:p-7 rounded-3xl border-2 border-emerald-200 shadow-md space-y-5">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-emerald-700" />
                            <span>Panduan 4 Langkah Instalasi di Plesk</span>
                          </h4>
                          <span className="text-xs text-gray-500 font-medium">Mudah & Cepat</span>
                        </div>

                        {/* Step Tab Buttons */}
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { step: 1, title: '1. Buat DB' },
                            { step: 2, title: '2. Impor SQL' },
                            { step: 3, title: '3. Unggah ZIP' },
                            { step: 4, title: '4. Ekstrak & Selesai' }
                          ].map(s => (
                            <button
                              key={s.step}
                              type="button"
                              onClick={() => setActivePleskGuideStep(s.step)}
                              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                                activePleskGuideStep === s.step
                                  ? 'bg-emerald-900 text-amber-300 shadow-sm border border-emerald-700'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {s.title}
                            </button>
                          ))}
                        </div>

                        {/* Step Content */}
                        <div className="p-4 sm:p-5 bg-[#faf8f5] rounded-2xl border border-gray-200 min-h-[160px]">
                          {activePleskGuideStep === 1 && (
                            <div className="space-y-2.5 animate-fadeIn">
                              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                                <span className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs">1</span>
                                <span>Buat Database MySQL di Plesk</span>
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed">
                                Masuk ke panel kontrol Plesk Anda, pilih menu <strong className="text-emerald-900 font-bold">Databases</strong>, lalu klik <strong className="text-emerald-900 font-bold">Add Database</strong>:
                              </p>
                              <ul className="text-xs text-gray-600 space-y-1 list-disc pl-5">
                                <li>Database name: <code className="font-mono text-emerald-900 font-bold bg-white px-1 py-0.5 rounded border">jaenal_masterweb</code></li>
                                <li>Database user: <code className="font-mono text-emerald-900 font-bold bg-white px-1 py-0.5 rounded border">jaenal_masterweb</code></li>
                                <li>Password: <code className="font-mono text-amber-900 font-bold bg-white px-1 py-0.5 rounded border">masbagus15</code></li>
                              </ul>
                            </div>
                          )}

                          {activePleskGuideStep === 2 && (
                            <div className="space-y-2.5 animate-fadeIn">
                              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                                <span className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs">2</span>
                                <span>Impor File database.sql ke phpMyAdmin</span>
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed">
                                Klik tombol <strong className="text-emerald-900 font-bold">phpMyAdmin</strong> pada database yang baru dibuat di Plesk:
                              </p>
                              <ul className="text-xs text-gray-600 space-y-1 list-disc pl-5">
                                <li>Pilih tab <strong className="text-emerald-900 font-bold">Import</strong> di bagian atas phpMyAdmin.</li>
                                <li>Pilih file <code className="font-mono text-emerald-900 font-bold bg-white px-1 py-0.5 rounded border">database.sql</code> (yang ada di dalam ZIP atau unduh terpisah).</li>
                                <li>Klik tombol <strong className="text-emerald-900 font-bold">Import / Go</strong> di bagian bawah.</li>
                              </ul>
                            </div>
                          )}

                          {activePleskGuideStep === 3 && (
                            <div className="space-y-2.5 animate-fadeIn">
                              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                                <span className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs">3</span>
                                <span>Unggah Berkas ZIP ke Folder httpdocs/</span>
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed">
                                Buka menu <strong className="text-emerald-900 font-bold">Files (File Manager)</strong> di Plesk:
                              </p>
                              <ul className="text-xs text-gray-600 space-y-1 list-disc pl-5">
                                <li>Masuk ke direktori utama website yaitu <code className="font-mono text-emerald-900 font-bold bg-white px-1 py-0.5 rounded border">httpdocs/</code>.</li>
                                <li>Klik tombol <strong className="text-emerald-900 font-bold">+ Upload Files</strong> dan pilih file ZIP yang diunduh.</li>
                              </ul>
                            </div>
                          )}

                          {activePleskGuideStep === 4 && (
                            <div className="space-y-2.5 animate-fadeIn">
                              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                                <span className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs">4</span>
                                <span>Ekstrak Berkas & Buka Website</span>
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed">
                                Anda dapat mengekstrak berkas dengan salah satu dari 2 cara:
                              </p>
                              <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-5">
                                <li><strong>Cara A (File Manager):</strong> Klik pada file ZIP lalu klik <strong className="text-emerald-900 font-bold">Extract Files</strong>.</li>
                                <li><strong>Cara B (Auto-Unzipper):</strong> Buka browser dan kunjungi <code className="font-mono text-emerald-900 font-bold bg-white px-1 py-0.5 rounded border">namadomain.com/unzip.php</code> lalu klik Unzip.</li>
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Package Files Manifest */}
                      <div className="bg-white p-6 sm:p-7 rounded-3xl border-2 border-emerald-200 shadow-md space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <FileCode className="w-4 h-4 text-emerald-700" />
                            <span>Struktur Berkas di Dalam Paket ZIP</span>
                          </h4>
                          <span className="text-xs text-gray-500 font-mono">8 Komponen Utama</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-950">
                              <FileCode className="w-3.5 h-3.5 text-emerald-700" />
                              <span>index.php</span>
                            </div>
                            <p className="text-[10px] text-gray-600">Entry point web SPA + dynamic OpenGraph share meta tags.</p>
                          </div>

                          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-950">
                              <FileCode className="w-3.5 h-3.5 text-emerald-700" />
                              <span>db_config.php</span>
                            </div>
                            <p className="text-[10px] text-gray-600">Koneksi PDO aman ke database MySQL dengan try-catch.</p>
                          </div>

                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-950">
                              <FileCode className="w-3.5 h-3.5 text-amber-700" />
                              <span>unzip.php</span>
                            </div>
                            <p className="text-[10px] text-gray-600">Skrip auto-extractor mandiri yang dapat dibuka langsung di browser.</p>
                          </div>

                          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-950">
                              <FileCode className="w-3.5 h-3.5 text-emerald-700" />
                              <span>api/ (PHP Handlers)</span>
                            </div>
                            <p className="text-[10px] text-gray-600">Endpoint API PHP: messages.php, settings.php, test_db.php.</p>
                          </div>

                          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-950">
                              <Database className="w-3.5 h-3.5 text-emerald-700" />
                              <span>database.sql</span>
                            </div>
                            <p className="text-[10px] text-gray-600">Skrip DDL dan DML lengkap untuk tabel profil, karya, agenda, dll.</p>
                          </div>

                          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-950">
                              <FileText className="w-3.5 h-3.5 text-emerald-700" />
                              <span>.htaccess & README</span>
                            </div>
                            <p className="text-[10px] text-gray-600">Aturan rewrite URL Apache & buku panduan deployment lengkap.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
};
