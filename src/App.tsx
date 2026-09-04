import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { AboutSection } from './components/AboutSection';
import { PillarsSection } from './components/PillarsSection';
import { PublicationsSection } from './components/PublicationsSection';
import { MediaChannelSection } from './components/MediaChannelSection';
import { ExperienceTimeline } from './components/ExperienceTimeline';
import { AgendaSection } from './components/AgendaSection';
import { GallerySection } from './components/GallerySection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { StickyFooterMenu } from './components/StickyFooterMenu';
import { ArrowUp, Sparkles, RefreshCw, CheckCircle, Cloud } from 'lucide-react';
import { HeaderLogoConfig, StickyFooterConfig, SiteContentConfig } from './types';
import {
  defaultHeaderLogo,
  defaultStickyFooterConfig,
  defaultSiteContent,
  defaultYouTubeChannelConfig,
  defaultYouTubeVideos,
  defaultMediaChannels,
  defaultAgendaCategories
} from './data/personalData';

import { IslamicToolsWidget } from './components/IslamicToolsWidget';
import { InitialPageLoader } from './components/InitialPageLoader';
import { PopoutPlayer } from './components/PopoutPlayer';
import { triggerBerandaEntranceGreeting } from './utils/audioEffects';
import { safeFetchJson } from './utils/fetchHelper';

const AdminPortal = lazy(() => import('./components/AdminPortal').then(m => ({ default: m.AdminPortal })));
const LogoUploaderModal = lazy(() => import('./components/LogoUploaderModal').then(m => ({ default: m.LogoUploaderModal })));
const StickyFooterEditorModal = lazy(() => import('./components/StickyFooterEditorModal').then(m => ({ default: m.StickyFooterEditorModal })));

function mergeSiteContent(saved?: any): SiteContentConfig {
  if (!saved || typeof saved !== 'object') {
    return defaultSiteContent;
  }
  return {
    profile: { ...defaultSiteContent.profile, ...(saved.profile || {}) },
    education: Array.isArray(saved.education) ? saved.education : defaultSiteContent.education,
    pillars: Array.isArray(saved.pillars) ? saved.pillars : defaultSiteContent.pillars,
    quotes: Array.isArray(saved.quotes) ? saved.quotes : defaultSiteContent.quotes,
    publications: Array.isArray(saved.publications) ? saved.publications : defaultSiteContent.publications,
    experience: Array.isArray(saved.experience)
      ? saved.experience
      : Array.isArray(saved.experiences)
      ? saved.experiences
      : defaultSiteContent.experience,
    agenda: Array.isArray(saved.agenda) ? saved.agenda : defaultSiteContent.agenda,
    agendaCategories: Array.isArray(saved.agendaCategories)
      ? saved.agendaCategories
      : (defaultSiteContent.agendaCategories || defaultAgendaCategories),
    gallery: Array.isArray(saved.gallery) ? saved.gallery : defaultSiteContent.gallery,
    youtubeChannel: saved.youtubeChannel
      ? { ...(defaultSiteContent.youtubeChannel || defaultYouTubeChannelConfig), ...saved.youtubeChannel }
      : (defaultSiteContent.youtubeChannel || defaultYouTubeChannelConfig),
    youtubeVideos: Array.isArray(saved.youtubeVideos)
      ? saved.youtubeVideos
      : (Array.isArray(saved.youtubeChannel?.videos)
          ? saved.youtubeChannel.videos
          : (defaultSiteContent.youtubeVideos || defaultYouTubeVideos)),
    mediaChannels: Array.isArray(saved.mediaChannels)
      ? saved.mediaChannels
      : (Array.isArray(saved.youtubeChannel?.channels)
          ? saved.youtubeChannel.channels
          : ((defaultSiteContent as any).mediaChannels || defaultMediaChannels)),
    visibility: { ...defaultSiteContent.visibility, ...(saved.visibility || {}) },
    heroSettings: { ...defaultSiteContent.heroSettings, ...(saved.heroSettings || {}) },
    shareSettings: { ...defaultSiteContent.shareSettings, ...(saved.shareSettings || {}) }
  };
}

export default function App() {
  const isPopoutMode = typeof window !== 'undefined' && window.location.search.includes('popout=true');

  if (isPopoutMode) {
    return <PopoutPlayer />;
  }

  const [activeSection, setActiveSection] = useState<string>('beranda');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const initialWindowData = typeof window !== 'undefined' ? (window as any).__INITIAL_SITE_DATA__ : null;

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return Boolean(localStorage.getItem('adminSession'));
    }
    return false;
  });
  const [lastServerTimestamp, setLastServerTimestamp] = useState<number>(() => {
    return initialWindowData?.lastUpdated || 0;
  });
  const lastServerTimestampRef = useRef<number>(initialWindowData?.lastUpdated || 0);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  useEffect(() => {
    lastServerTimestampRef.current = lastServerTimestamp;
  }, [lastServerTimestamp]);

  // Site Content config state: instant server hydration with timestamp arbitration
  const [siteContent, setSiteContent] = useState<SiteContentConfig>(() => {
    let localSaved: SiteContentConfig | null = null;
    let localTs = 0;
    try {
      const saved = localStorage.getItem('madrasah_site_content_config');
      if (saved) {
        localSaved = mergeSiteContent(JSON.parse(saved));
        const ts = localStorage.getItem('madrasah_last_updated');
        if (ts) localTs = parseInt(ts, 10) || 0;
      }
    } catch (e) {
      console.warn('Error reading saved site content from storage', e);
    }

    // Timestamp arbitration: gunakan yang paling baru antara localStorage vs window injection
    const initialTs = initialWindowData?.lastUpdated || 0;
    if (initialWindowData?.siteContent && (!localSaved || initialTs >= localTs)) {
      return mergeSiteContent(initialWindowData.siteContent);
    }

    if (localSaved) {
      return localSaved;
    }

    return defaultSiteContent;
  });

  // Dynamically update document title and Open Graph meta tags in browser head
  useEffect(() => {
    if (siteContent?.shareSettings) {
      const share = siteContent.shareSettings;
      if (share.title) {
        document.title = share.title;
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', share.title);
        const twTitle = document.querySelector('meta[name="twitter:title"]');
        if (twTitle) twTitle.setAttribute('content', share.title);
      }
      if (share.description) {
        const descEl = document.querySelector('meta[name="description"]');
        if (descEl) descEl.setAttribute('content', share.description);
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', share.description);
        const twDesc = document.querySelector('meta[name="twitter:description"]');
        if (twDesc) twDesc.setAttribute('content', share.description);
      }
      if (share.thumbnailUrl) {
        const fullImg = share.thumbnailUrl.startsWith('http')
          ? share.thumbnailUrl
          : `${window.location.origin}${share.thumbnailUrl.startsWith('/') ? '' : '/'}${share.thumbnailUrl}`;
        const ogImg = document.querySelector('meta[property="og:image"]');
        if (ogImg) ogImg.setAttribute('content', fullImg);
        const ogImgSec = document.querySelector('meta[property="og:image:secure_url"]');
        if (ogImgSec) ogImgSec.setAttribute('content', fullImg);
        const twImg = document.querySelector('meta[name="twitter:image"]');
        if (twImg) twImg.setAttribute('content', fullImg);
        const itemImg = document.querySelector('meta[itemprop="image"]');
        if (itemImg) itemImg.setAttribute('content', fullImg);
        const linkImg = document.querySelector('link[rel="image_src"]');
        if (linkImg) linkImg.setAttribute('href', fullImg);
      }
    }
  }, [siteContent?.shareSettings]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Logo config state with instant server hydration + localStorage persistence
  const [logoConfig, setLogoConfig] = useState<HeaderLogoConfig>(() => {
    let resolved = defaultHeaderLogo;
    let localSaved: HeaderLogoConfig | null = null;
    let localTs = 0;

    try {
      const saved = localStorage.getItem('madrasah_custom_header_logo');
      if (saved) {
        localSaved = { ...defaultHeaderLogo, ...JSON.parse(saved) };
        const ts = localStorage.getItem('madrasah_last_updated');
        if (ts) localTs = parseInt(ts, 10) || 0;
      }
    } catch (e) {
      console.warn('Error reading saved logo from storage', e);
    }

    if (initialWindowData?.logoConfig) {
      resolved = { ...defaultHeaderLogo, ...initialWindowData.logoConfig };
    } else if (localSaved) {
      resolved = localSaved;
    }

    // Auto-fix: Ensure blendMode is not forced to dark multiply
    if (resolved.blendMode === 'multiply' || resolved.blendMode === 'transparent_blend' || resolved.blendMode === 'darken') {
      resolved.blendMode = 'normal';
    }
    if (resolved.footerBlendMode === 'multiply' || resolved.footerBlendMode === 'transparent_blend' || resolved.footerBlendMode === 'darken') {
      resolved.footerBlendMode = 'normal';
    }
    // Auto-maximize circular logo and clip out outer checkerboard/white corners
    resolved.shape = 'circle';
    resolved.borderStyle = resolved.borderStyle || 'gold';
    if (!resolved.zoomLevel) {
      resolved.zoomLevel = 115;
    }
    resolved.fitMode = 'cover';
    return resolved;
  });

  // Dynamically update Favicon link tags in browser document head
  useEffect(() => {
    const faviconUrl = logoConfig?.faviconUrl || (logoConfig?.type === 'custom_image' ? logoConfig.customImageUrl : undefined) || '/favicon.ico';
    if (faviconUrl && typeof document !== 'undefined') {
      const links = document.querySelectorAll("link[rel*='icon']");
      if (links.length > 0) {
        links.forEach((l) => {
          (l as HTMLLinkElement).href = faviconUrl;
        });
      } else {
        const iconLink = document.createElement('link');
        iconLink.rel = 'icon';
        iconLink.href = faviconUrl;
        document.head.appendChild(iconLink);
      }

      // Also ensure apple-touch-icon exists and is updated
      const appleIcons = document.querySelectorAll("link[rel*='apple-touch-icon']");
      if (appleIcons.length > 0) {
        appleIcons.forEach((l) => {
          (l as HTMLLinkElement).href = faviconUrl;
        });
      } else {
        const appleIconLink = document.createElement('link');
        appleIconLink.rel = 'apple-touch-icon';
        appleIconLink.href = faviconUrl;
        document.head.appendChild(appleIconLink);
      }
    }
  }, [logoConfig?.faviconUrl, logoConfig?.customImageUrl, logoConfig?.type]);

  // Sticky Footer config state with instant server hydration + localStorage persistence
  const [stickyFooterConfig, setStickyFooterConfig] = useState<StickyFooterConfig>(() => {
    let localSaved: StickyFooterConfig | null = null;
    let localTs = 0;

    try {
      const saved = localStorage.getItem('madrasah_sticky_footer_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        localSaved = {
          ...defaultStickyFooterConfig,
          ...parsed,
          items: Array.isArray(parsed.items) ? parsed.items : defaultStickyFooterConfig.items
        };
        const ts = localStorage.getItem('madrasah_last_updated');
        if (ts) localTs = parseInt(ts, 10) || 0;
      }
    } catch (e) {
      console.warn('Error reading saved sticky footer from storage', e);
    }

    if (initialWindowData?.stickyFooterConfig) {
      const f = initialWindowData.stickyFooterConfig;
      return {
        ...defaultStickyFooterConfig,
        ...f,
        items: Array.isArray(f.items) ? f.items : defaultStickyFooterConfig.items
      };
    }

    if (localSaved) {
      return localSaved;
    }

    return defaultStickyFooterConfig;
  });

  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [logoModalInitialTab, setLogoModalInitialTab] = useState<'upload' | 'preset' | 'monogram' | 'text' | 'favicon_footer'>('upload');
  const [isStickyFooterModalOpen, setIsStickyFooterModalOpen] = useState(false);

  const logoConfigRef = useRef(logoConfig);
  logoConfigRef.current = logoConfig;
  const siteContentRef = useRef(siteContent);
  siteContentRef.current = siteContent;
  const stickyFooterConfigRef = useRef(stickyFooterConfig);
  stickyFooterConfigRef.current = stickyFooterConfig;

  const handleOpenLogoModal = (tab: 'upload' | 'preset' | 'monogram' | 'text' | 'favicon_footer' = 'upload') => {
    setLogoModalInitialTab(tab);
    setIsLogoModalOpen(true);
  };

  const prevMysqlConnectedRef = useRef<boolean | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // -------------------------------------------------------------
  // CROSS-DEVICE REAL-TIME AUTO-SYNC ENGINE & MYSQL NOTIFIER
  // -------------------------------------------------------------
  const fetchServerData = async (silent = false) => {
    try {
      if (!silent) setSyncStatus('syncing');
      const res = await safeFetchJson<{
        success: boolean;
        data?: {
          siteContent?: any;
          logoConfig?: any;
          stickyFooterConfig?: any;
        };
        lastUpdated?: number;
        storageEngine?: string;
        isMySQLConnected?: boolean;
      }>(`/api/site-data?_t=${Date.now()}`);

      if (res.ok && res.data) {
        const json = res.data;

        // Anti-Clobber Safeguard:
        // Jika data di browser lokal memiliki timestamp lebih baru dibanding server (misal baru saja pulihkan backup),
        // jangan biarkan server menimpa kembali browser!
        // Sebaliknya, dorong data lokal terbaru ini ke server/MySQL agar server sinkron!
        const localTsStr = localStorage.getItem('madrasah_last_updated');
        const localTs = localTsStr ? parseInt(localTsStr, 10) : 0;
        const serverTs = json.lastUpdated || 0;

        if (localTs > serverTs + 1000 && siteContentRef.current) {
          safeFetchJson('/api/sync-to-mysql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              siteContent: siteContentRef.current,
              logoConfig: logoConfigRef.current,
              stickyFooterConfig: stickyFooterConfigRef.current,
              lastUpdated: localTs
            })
          }).catch(() => {});
          setSyncStatus('synced');
          return;
        }

        if (json.success && json.data) {
          const { siteContent: sContent, logoConfig: lConfig, stickyFooterConfig: fConfig } = json.data;
          
          if (sContent) {
            const mergedContent: SiteContentConfig = mergeSiteContent(sContent);
            if (JSON.stringify(mergedContent) !== JSON.stringify(siteContentRef.current)) {
              setSiteContent(mergedContent);
              siteContentRef.current = mergedContent;
            }
            try {
              localStorage.setItem('madrasah_site_content_config', JSON.stringify(mergedContent));
            } catch (e) {}
          }
          if (lConfig) {
            const mergedLogo: HeaderLogoConfig = { ...defaultHeaderLogo, ...lConfig };
            if (JSON.stringify(mergedLogo) !== JSON.stringify(logoConfigRef.current)) {
              setLogoConfig(mergedLogo);
              logoConfigRef.current = mergedLogo;
            }
            try {
              localStorage.setItem('madrasah_custom_header_logo', JSON.stringify(mergedLogo));
            } catch (e) {}
          }
          if (fConfig) {
            const mergedFooter: StickyFooterConfig = {
              ...defaultStickyFooterConfig,
              ...fConfig,
              items: Array.isArray(fConfig.items) ? fConfig.items : defaultStickyFooterConfig.items
            };
            if (JSON.stringify(mergedFooter) !== JSON.stringify(stickyFooterConfigRef.current)) {
              setStickyFooterConfig(mergedFooter);
              stickyFooterConfigRef.current = mergedFooter;
            }
            try {
              localStorage.setItem('madrasah_sticky_footer_config', JSON.stringify(mergedFooter));
            } catch (e) {}
          }
        }
        if (json.lastUpdated) {
          setLastServerTimestamp(json.lastUpdated);
          lastServerTimestampRef.current = json.lastUpdated;
          try {
            localStorage.setItem('madrasah_last_updated', String(json.lastUpdated));
          } catch (e) {}
        }
        setSyncStatus('synced');
      }
    } catch (err) {
      console.warn('Server sync not reachable, using local data', err);
      setSyncStatus('offline');
    }
  };

  // Initial load from server: Hydrate immediately and verify latest from MySQL/server
  useEffect(() => {
    // If we had initial data from HTML, mark synced first, then verify with live server/DB in background
    if (initialWindowData) {
      setSyncStatus('synced');
    }
    // Always fetch latest data from server/MySQL to guarantee 100% freshness across deployments
    fetchServerData(true);
  }, []);

  // Background poller: automatically detects if changes were made on another device & monitors MySQL status
  useEffect(() => {
    const checkSync = async () => {
      if (typeof document !== 'undefined' && document.hidden) {
        return; // Don't make network requests when tab is inactive/hidden
      }
      try {
        const res = await safeFetchJson<{
          lastUpdated?: number;
          hasData?: boolean;
          mysqlActive?: boolean;
          mysqlError?: string | null;
        }>(`/api/sync-status?_t=${Date.now()}`);

        if (res.ok && res.data) {
          const status = res.data;

          if (status.lastUpdated && status.lastUpdated > lastServerTimestampRef.current) {
            // New changes made from another device, fetch fresh data silently!
            await fetchServerData(true);
          }
        }
      } catch (err) {
        // network issue, keep quiet
      }
    };

    // Poller every 30s (lightweight check for multi-device live sync)
    const interval = setInterval(checkSync, 30000);

    const onFocus = () => {
      checkSync();
    };
    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        checkSync();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Helper to instantly persist the complete bundle to MySQL
  const persistFullBundleToMySQL = async (
    sContent?: SiteContentConfig,
    lConfig?: HeaderLogoConfig,
    fConfig?: StickyFooterConfig
  ) => {
    try {
      const payload = {
        siteContent: sContent || siteContent,
        logoConfig: lConfig || logoConfig,
        stickyFooterConfig: fConfig || stickyFooterConfig,
        lastUpdated: Date.now()
      };
      await safeFetchJson('/api/sync-to-mysql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('Silent MySQL sync warning:', e);
    }
  };

  // Persist handlers that write to both state, localStorage, server and MySQL automatically
  const handleSaveSiteContent = async (newContent: SiteContentConfig) => {
    const videosList = Array.isArray(newContent.youtubeVideos)
      ? newContent.youtubeVideos
      : (Array.isArray(newContent.youtubeChannel?.videos)
          ? newContent.youtubeChannel.videos
          : (siteContent.youtubeVideos || defaultYouTubeVideos));

    const channelsList = Array.isArray(newContent.mediaChannels)
      ? newContent.mediaChannels
      : (Array.isArray(newContent.youtubeChannel?.channels)
          ? newContent.youtubeChannel.channels
          : (siteContent.mediaChannels || defaultMediaChannels));

    const normalizedContent: SiteContentConfig = {
      ...newContent,
      youtubeVideos: videosList,
      mediaChannels: channelsList,
      youtubeChannel: {
        ...(newContent.youtubeChannel || defaultYouTubeChannelConfig),
        videos: videosList,
        channels: channelsList
      }
    };

    setSiteContent(normalizedContent);
    const now = Date.now();
    try {
      localStorage.setItem('madrasah_site_content_config', JSON.stringify(normalizedContent));
      localStorage.setItem('madrasah_last_updated', String(now));
    } catch (e) {
      console.warn('Error persisting site content config locally', e);
    }

    try {
      setSyncStatus('syncing');
      const res = await safeFetchJson<{
        success: boolean;
        lastUpdated?: number;
        isMySQLConnected?: boolean;
        message?: string;
      }>('/api/site-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedContent)
      });

      if (res.ok && res.data) {
        const json = res.data;
        const updatedTs = json.lastUpdated || Date.now();
        setLastServerTimestamp(updatedTs);
        lastServerTimestampRef.current = updatedTs;
        setSyncStatus('synced');
        showToast('✅ Data & Siaran Media tersimpan & otomatis tersinkronisasi ke server & MySQL.');
      }
      // Always guarantee MySQL gets the full unified bundle
      await persistFullBundleToMySQL(normalizedContent, logoConfig, stickyFooterConfig);
    } catch (err) {
      console.error('Failed to sync site content to server', err);
      setSyncStatus('offline');
    }
  };

  const handleSaveLogoConfig = async (newConfig: HeaderLogoConfig) => {
    setLogoConfig(newConfig);
    const now = Date.now();
    try {
      localStorage.setItem('madrasah_custom_header_logo', JSON.stringify(newConfig));
      localStorage.setItem('madrasah_last_updated', String(now));
    } catch (e) {
      console.warn('Error persisting logo config locally', e);
    }

    try {
      setSyncStatus('syncing');
      const res = await safeFetchJson<{
        success: boolean;
        lastUpdated?: number;
        logoConfig?: HeaderLogoConfig;
        message?: string;
      }>('/api/logo-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (res.ok && res.data) {
        const json = res.data;
        const finalLogo = json.logoConfig || newConfig;
        setLogoConfig(finalLogo);
        try {
          localStorage.setItem('madrasah_custom_header_logo', JSON.stringify(finalLogo));
        } catch (e) {}
        const updatedTs = json.lastUpdated || Date.now();
        setLastServerTimestamp(updatedTs);
        lastServerTimestampRef.current = updatedTs;
        setSyncStatus('synced');
        persistFullBundleToMySQL(siteContent, finalLogo, stickyFooterConfig).catch(() => {});
      } else {
        persistFullBundleToMySQL(siteContent, newConfig, stickyFooterConfig).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to sync logo config to server', err);
    }
  };

  const handleSaveStickyFooterConfig = async (newConfig: StickyFooterConfig) => {
    setStickyFooterConfig(newConfig);
    const now = Date.now();
    try {
      localStorage.setItem('madrasah_sticky_footer_config', JSON.stringify(newConfig));
      localStorage.setItem('madrasah_last_updated', String(now));
    } catch (e) {
      console.warn('Error persisting sticky footer config locally', e);
    }

    try {
      setSyncStatus('syncing');
      const res = await safeFetchJson<{
        success: boolean;
        lastUpdated?: number;
      }>('/api/sticky-footer-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (res.ok && res.data) {
        const json = res.data;
        const updatedTs = json.lastUpdated || Date.now();
        setLastServerTimestamp(updatedTs);
        lastServerTimestampRef.current = updatedTs;
        setSyncStatus('synced');
      }
      await persistFullBundleToMySQL(siteContent, logoConfig, newConfig);
    } catch (err) {
      console.error('Failed to sync sticky footer config to server', err);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }

      // Detect active section based on scroll position
      const sections = ['beranda', 'profil', 'pilar', 'karya', 'pengabdian', 'agenda', 'fitur-islami', 'galeri', 'kontak'];
      const scrollPosition = window.scrollY + 200;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigate = (sectionId: string) => {
    setActiveSection(sectionId);
    if (sectionId === 'beranda') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-[#faf8f5] text-[#1c2e24] pb-16 sm:pb-20 md:pb-0 relative">
      {/* Elegant Initial Page Loader */}
      {isInitialLoading && (
        <InitialPageLoader
          logoConfig={logoConfig}
          profile={siteContent.profile}
          minDurationMs={1200}
          onFinish={() => {
            setIsInitialLoading(false);
            triggerBerandaEntranceGreeting();
          }}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-900 text-amber-300 px-4 py-3 rounded-2xl shadow-2xl border-2 border-amber-400 text-xs font-bold animate-fadeIn flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Fixed Navbar */}
      <Navbar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isAdminLoggedIn={isAdminLoggedIn}
        onLogout={() => {
          localStorage.removeItem('adminSession');
          setIsAdminLoggedIn(false);
        }}
        onLoginSuccess={() => setIsAdminLoggedIn(true)}
        logoConfig={logoConfig}
        onOpenLogoModal={handleOpenLogoModal}
        profile={siteContent.profile}
        shareSettings={siteContent.shareSettings}
        visibility={siteContent.visibility}
      />

      {/* Main Sections Content with Site Content State */}
      <main className="flex-1">
        {siteContent.visibility?.hero !== false && (
          <HeroSection
            onNavigate={handleNavigate}
            profile={siteContent.profile}
            heroSettings={siteContent.heroSettings}
          />
        )}

        {siteContent.visibility?.about !== false && (
          <AboutSection
            profile={siteContent.profile}
            education={siteContent.education}
            quotes={siteContent.quotes}
          />
        )}

        {siteContent.visibility?.pillars !== false && (
          <PillarsSection
            pillars={siteContent.pillars}
          />
        )}

        {siteContent.visibility?.publications !== false && (
          <PublicationsSection
            publications={siteContent.publications}
            authorName={siteContent.profile.title || siteContent.profile.name}
          />
        )}

        {siteContent.visibility?.youtubeChannel !== false && (
          <MediaChannelSection
            youtubeVideos={siteContent.youtubeVideos || siteContent.youtubeChannel?.videos}
            youtubeConfig={siteContent.youtubeChannel}
            mediaChannels={siteContent.mediaChannels || siteContent.youtubeChannel?.channels}
            profile={siteContent.profile}
            channelHandle={siteContent.profile.socials?.youtube}
            channelTitle={siteContent.youtubeChannel?.channelTitle || siteContent.profile.name}
          />
        )}

        {siteContent.visibility?.experience !== false && (
          <ExperienceTimeline
            experiences={siteContent.experience}
          />
        )}

        {siteContent.visibility?.agenda !== false && (
          <AgendaSection
            agenda={siteContent.agenda}
            categories={siteContent.agendaCategories}
            authorName={siteContent.profile.title || siteContent.profile.name}
          />
        )}

        {siteContent.visibility?.islamicTools !== false && (
          <IslamicToolsWidget />
        )}

        {siteContent.visibility?.gallery !== false && (
          <GallerySection
            gallery={siteContent.gallery}
          />
        )}

        {siteContent.visibility?.contact !== false && (
          <ContactSection
            profile={siteContent.profile}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        onNavigate={handleNavigate}
        onOpenAdmin={() => setIsAdminOpen(true)}
        profile={siteContent.profile}
        logoConfig={logoConfig}
      />

      {/* Sticky Bottom Footer Menu */}
      <StickyFooterMenu
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isAdminLoggedIn={isAdminLoggedIn}
        config={stickyFooterConfig}
      />

      {/* Admin Login & Full-Page Management Portal */}
      <Suspense fallback={
        isAdminOpen ? (
          <div className="fixed inset-0 z-50 bg-emerald-950/80 backdrop-blur-sm flex items-center justify-center text-amber-300">
            <div className="flex flex-col items-center gap-3 bg-emerald-900/90 p-6 rounded-2xl border border-amber-400/50 shadow-2xl">
              <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-semibold">Membuka Portal Admin...</span>
            </div>
          </div>
        ) : null
      }>
        {isAdminOpen && (
          <AdminPortal
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
            isLoggedIn={isAdminLoggedIn}
            setIsLoggedIn={setIsAdminLoggedIn}
            logoConfig={logoConfig}
            onSaveLogoConfig={handleSaveLogoConfig}
            stickyFooterConfig={stickyFooterConfig}
            onSaveStickyFooterConfig={handleSaveStickyFooterConfig}
            siteContent={siteContent}
            onSaveSiteContent={handleSaveSiteContent}
          />
        )}

        {/* Header Logo Uploader Modal */}
        {isLogoModalOpen && (
          <LogoUploaderModal
            isOpen={isLogoModalOpen}
            onClose={() => setIsLogoModalOpen(false)}
            currentConfig={logoConfig}
            onSaveConfig={handleSaveLogoConfig}
            initialTab={logoModalInitialTab}
          />
        )}

        {/* Sticky Footer Editor Modal */}
        {isStickyFooterModalOpen && (
          <StickyFooterEditorModal
            isOpen={isStickyFooterModalOpen}
            onClose={() => setIsStickyFooterModalOpen(false)}
            currentConfig={stickyFooterConfig}
            onSaveConfig={handleSaveStickyFooterConfig}
          />
        )}
      </Suspense>

      {/* Floating Scroll to Top Button */}
      {showBackToTop && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-30">
          <button
            id="floating-scroll-top-btn"
            onClick={scrollToTop}
            className="p-2.5 sm:p-3 rounded-full bg-emerald-900/90 hover:bg-emerald-800 text-amber-300 shadow-xl border border-amber-400/40 transition-all transform hover:scale-110 active:scale-95 backdrop-blur-xs cursor-pointer"
            aria-label="Kembali ke atas"
            title="Kembali ke Atas"
          >
            <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
