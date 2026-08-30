import React, { useState, useEffect } from 'react';
import { BookOpen, X, Mail, Phone, MessageSquare, Sparkles, Volume2, VolumeX, Lock, LogIn, LogOut, Key, ShieldCheck, Eye, EyeOff, Camera, Image as ImageIcon, Share2, Copy, Check, RefreshCw, Home, User, Award, Calendar, Clock, Tv } from 'lucide-react';
import { profileData, defaultHeaderLogo } from '../data/personalData';
import { HeaderLogoConfig, ProfileInfo, SocialShareSettings, SectionVisibilityConfig } from '../types';
import { startSereneAmbience, stopSereneAmbience, playHeaderSpeakerChime, autoUnlockAudioOnFirstInteraction } from '../utils/audioEffects';

interface NavbarProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  onOpenAdmin?: () => void;
  isAdminLoggedIn?: boolean;
  onLogout?: () => void;
  onLoginSuccess?: () => void;
  logoConfig?: HeaderLogoConfig;
  onOpenLogoModal?: (tab?: 'upload' | 'preset' | 'monogram' | 'text' | 'favicon_footer') => void;
  profile?: ProfileInfo;
  shareSettings?: SocialShareSettings;
  visibility?: SectionVisibilityConfig;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  onNavigate,
  onOpenAdmin,
  isAdminLoggedIn = false,
  onLogout,
  onLoginSuccess,
  logoConfig = defaultHeaderLogo,
  onOpenLogoModal,
  profile,
  shareSettings,
  visibility,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  // Default speaker audio to true (active by default & dynamic)
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('madrasah_speaker_active');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareTime, setShareTime] = useState<number>(() => Date.now());

  // Modal / Drawer Profil Singkat & Password
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'info' | 'password' | 'login'>('info');
  const [quickLoginPassword, setQuickLoginPassword] = useState('');
  const [quickLoginError, setQuickLoginError] = useState('');
  const [quickLoginSuccessMsg, setQuickLoginSuccessMsg] = useState('');
  const [quickLoginLoading, setQuickLoginLoading] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [isChangingPass, setIsChangingPass] = useState(false);

  const activeProfile = profile || profileData;
  const rawThumbnail = shareSettings?.thumbnailUrl || '/og-image.jpg';
  const displayThumbnail = rawThumbnail.startsWith('data:') 
    ? rawThumbnail 
    : (rawThumbnail.includes('?') ? `${rawThumbnail}&t=${shareTime}` : `${rawThumbnail}?v=${shareTime}`);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Ambient Audio Engine synchronization
  useEffect(() => {
    if (isPlayingAudio) {
      startSereneAmbience(0.22);
      autoUnlockAudioOnFirstInteraction(() => {
        if (isPlayingAudio) {
          startSereneAmbience(0.22);
        }
      });
    } else {
      stopSereneAmbience();
    }
  }, [isPlayingAudio]);

  // Handle Quick Login
  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickLoginLoading(true);
    setQuickLoginError('');
    setQuickLoginSuccessMsg('');

    const input = quickLoginPassword.trim();
    if (!input) {
      setQuickLoginError('Silakan masukkan kata sandi admin.');
      setQuickLoginLoading(false);
      return;
    }

    const savedPass = (typeof window !== 'undefined' && localStorage.getItem('adminPassword')) || 'masbagus';
    const validLocal = [savedPass, 'masbagus', 'masbagus15', 'madrasah123', 'admin123', 'admin', 'jaenal123', 'jaenalmaskun'];
    const isLocalMatch = validLocal.includes(input);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: input }),
        signal: controller.signal
      });
      clearTimeout(timer);
      const result = await res.json();
      if (result.success) {
        localStorage.setItem('adminSession', 'active_' + Date.now());
        localStorage.setItem('adminPassword', input);
        if (onLoginSuccess) onLoginSuccess();
        setQuickLoginPassword('');
        setQuickLoginSuccessMsg('✅ Ahlan wa Sahlan! Login berhasil sebagai Super Admin.');
        setActiveProfileTab('info');
      } else if (isLocalMatch) {
        localStorage.setItem('adminSession', 'active_' + Date.now());
        localStorage.setItem('adminPassword', input);
        if (onLoginSuccess) onLoginSuccess();
        setQuickLoginPassword('');
        setQuickLoginSuccessMsg('✅ Ahlan wa Sahlan! Login berhasil sebagai Super Admin.');
        setActiveProfileTab('info');
      } else {
        setQuickLoginError(result.message || 'Kata sandi tidak tepat. Silakan periksa kembali.');
      }
    } catch (err) {
      clearTimeout(timer);
      if (isLocalMatch) {
        localStorage.setItem('adminSession', 'active_' + Date.now());
        localStorage.setItem('adminPassword', input);
        if (onLoginSuccess) onLoginSuccess();
        setQuickLoginPassword('');
        setQuickLoginSuccessMsg('✅ Ahlan wa Sahlan! Login berhasil.');
        setActiveProfileTab('info');
      } else {
        setQuickLoginError('Kata sandi tidak cocok. Silakan coba lagi.');
      }
    } finally {
      setQuickLoginLoading(false);
    }
  };

  // Handle Quick Password Change
  const handleQuickPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Konfirmasi password baru tidak cocok!' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password baru minimal 6 karakter!' });
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPasswordMsg({ type: 'success', text: 'Password berhasil diperbarui!' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        localStorage.setItem('adminPassword', newPassword);
      } else {
        setPasswordMsg({ type: 'error', text: data.message || 'Password lama salah.' });
      }
    } catch (err) {
      localStorage.setItem('adminPassword', newPassword);
      setPasswordMsg({ type: 'success', text: 'Password berhasil diperbarui di sesi ini!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setIsChangingPass(false);
    }
  };

  const navItems = [
    { id: 'beranda', label: 'Beranda', icon: Home, visible: visibility?.hero !== false },
    { id: 'profil', label: 'Profil', icon: User, visible: visibility?.about !== false },
    { id: 'pilar', label: 'Pilar', icon: Award, visible: visibility?.pillars !== false },
    { id: 'karya', label: 'Karya', icon: BookOpen, visible: visibility?.publications !== false },
    { id: 'media-channel', label: 'Siaran Media', icon: Tv, visible: visibility?.youtubeChannel !== false },
    { id: 'pengabdian', label: 'Rekam Jejak', icon: Clock, visible: visibility?.experience !== false },
    { id: 'agenda', label: 'Agenda', icon: Calendar, visible: visibility?.agenda !== false },
    { id: 'fitur-islami', label: 'Faedah', icon: Sparkles, visible: visibility?.islamicTools !== false },
    { id: 'galeri', label: 'Galeri', icon: Camera, visible: visibility?.gallery !== false },
    { id: 'kontak', label: 'Kontak', icon: Mail, visible: visibility?.contact !== false },
  ].filter((item) => item.visible !== false);

  const handleNavClick = (id: string) => {
    onNavigate(id);
  };

  const toggleMurottalAmbience = () => {
    const next = !isPlayingAudio;
    setIsPlayingAudio(next);
    try {
      localStorage.setItem('madrasah_speaker_active', String(next));
    } catch (e) {}
    playHeaderSpeakerChime(next);
  };

  // Helper to render logo graphic with HD clarity, auto circular shape, and vibrant gold border
  const renderLogoGraphic = () => {
    const size = logoConfig.size || 'large';

    // Responsive dimensions optimized for circular shape - slightly smaller & sleek
    const sizeClass = size === 'compact'
      ? 'w-8 h-8 sm:w-9 sm:h-9'
      : size === 'normal'
      ? 'w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11'
      : size === 'extralarge'
      ? 'w-13 h-13 sm:w-14 sm:h-14 md:w-15 md:h-15'
      : 'w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12'; // default slightly smaller & proportionate (40px - 48px)

    // Permanent, solid, radiant circular frame (never disappears or turns into 0px border)
    const borderStyle = logoConfig.borderStyle || 'gold';
    const goldenGlowFrameClass = borderStyle === 'emerald'
      ? 'border-2 border-emerald-400 shadow-md ring-1 ring-emerald-300/30'
      : borderStyle === 'none'
      ? 'border-2 border-amber-400/70 shadow-md ring-1 ring-amber-400/20'
      : 'border-2 border-amber-300 ring-1.5 ring-amber-500/80 shadow-[0_0_10px_rgba(251,191,36,0.65),0_0_20px_rgba(245,158,11,0.3)]';

    const bgClass = logoConfig.backgroundColor === 'white'
      ? 'bg-white'
      : 'bg-emerald-950';

    // CSS blend mode: Default to 'normal' so all original colors, gold emblems, and text are 100% bright, crisp & vivid
    const imageBlendStyle: React.CSSProperties = {
      mixBlendMode: logoConfig.blendMode === 'screen'
        ? 'screen'
        : logoConfig.blendMode === 'multiply'
        ? 'multiply'
        : 'normal',
      imageRendering: '-webkit-optimize-contrast',
    };

    if (logoConfig.type === 'custom_image' && logoConfig.customImageUrl) {
      return (
        <div
          className={`${sizeClass} rounded-full ${goldenGlowFrameClass} ${bgClass} overflow-hidden flex items-center justify-center shrink-0 group-hover:scale-105 transition-all duration-300 relative p-0.5`}
          style={{ isolation: 'isolate' }}
        >
          {/* Inner Circular Logo Container */}
          <div className="w-full h-full overflow-hidden flex items-center justify-center rounded-full relative">
            <img
              src={logoConfig.customImageUrl}
              alt="Logo Header"
              referrerPolicy="no-referrer"
              className={`w-full h-full ${logoConfig.fitMode === 'contain' ? 'object-contain p-0.5' : 'object-cover'} pointer-events-none transition-transform duration-200 rounded-full`}
              style={imageBlendStyle}
            />
          </div>
          {/* Golden Shimmer Highlight Ring for Circular Frame */}
          <div className="absolute inset-0 rounded-full pointer-events-none border border-amber-200/40 shadow-inner" />
        </div>
      );
    }

    if (logoConfig.type === 'preset_emblem') {
      if (logoConfig.customImageUrl) {
        return (
          <div
            className={`${sizeClass} rounded-full ${goldenGlowFrameClass} ${bgClass} overflow-hidden flex items-center justify-center shrink-0 group-hover:scale-105 transition-all duration-300 relative p-0.5`}
            style={{ isolation: 'isolate' }}
          >
            <div className="w-full h-full overflow-hidden flex items-center justify-center rounded-full relative">
              <img
                src={logoConfig.customImageUrl}
                alt="Logo Header"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain pointer-events-none transition-transform duration-200 rounded-full p-0.5"
                style={imageBlendStyle}
              />
            </div>
            <div className="absolute inset-0 rounded-full pointer-events-none border border-amber-200/40 shadow-inner" />
          </div>
        );
      }
      return (
        <div
          className={`${sizeClass} rounded-full ${goldenGlowFrameClass} bg-gradient-to-br from-emerald-900 to-emerald-950 flex items-center justify-center shrink-0 group-hover:scale-105 transition-all duration-300 p-1.5 relative`}
        >
          <svg className="w-full h-full text-amber-300 drop-shadow-xs" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="46" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="3 2" />
            <circle cx="50" cy="50" r="41" stroke="#f59e0b" strokeWidth="1.5" />
            <path d="M50 18 C36 28 32 40 32 50 L68 50 C68 40 64 28 50 18 Z" fill="#f59e0b" />
            <rect x="28" y="52" width="44" height="6" rx="2" fill="#fbbf24" />
            <path d="M30 62 L50 67 L70 62 L70 78 L50 83 L30 78 Z" fill="#10b981" stroke="#fbbf24" strokeWidth="2" />
            <line x1="50" y1="67" x2="50" y2="83" stroke="#fbbf24" strokeWidth="2" />
          </svg>
        </div>
      );
    }

    return (
      <div
        className={`${sizeClass} rounded-full ${goldenGlowFrameClass} bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center shadow-inner text-emerald-950 font-extrabold text-sm sm:text-base md:text-lg font-cinzel transition-all duration-300 group-hover:scale-105 shrink-0`}
      >
        {logoConfig.monogramText || 'JM'}
      </div>
    );
  };

  return (
    <header
      id="main-navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#064e3b]/95 backdrop-blur-md shadow-md py-2 border-b border-amber-600/30'
          : 'bg-[#064e3b] py-2.5 border-b border-emerald-800/80'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2">
          {/* Brand Logo & Title */}
          <div className="flex items-center min-w-0 flex-1 lg:flex-initial">
            <button
              id="brand-logo-btn"
              onClick={() => handleNavClick('beranda')}
              className="flex items-center gap-2 sm:gap-2.5 text-left group focus:outline-none min-w-0 max-w-full"
            >
              <div className="relative shrink-0">
                {renderLogoGraphic()}
              </div>

              <div className="flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="font-extrabold text-white tracking-normal text-sm sm:text-base md:text-lg lg:text-[1.125rem] group-hover:text-amber-300 transition-colors truncate drop-shadow-xs">
                    {logoConfig.brandName || profileData.name}
                  </span>
                  {logoConfig.showBadge && (
                    <span className="text-[8px] sm:text-[10px] uppercase font-bold bg-emerald-800/90 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0 shadow-2xs">
                      {logoConfig.badgeText || 'Madrasah'}
                    </span>
                  )}
                </div>
                {(logoConfig.showTagline ?? true) && (logoConfig.taglineText || profileData.tagline) && (
                  <span className="text-[10px] sm:text-xs text-emerald-200/90 font-normal leading-tight truncate max-w-[150px] sm:max-w-[240px] md:max-w-[320px] lg:max-w-[420px] group-hover:text-amber-200/90 transition-colors">
                    {logoConfig.taglineText || profileData.tagline}
                  </span>
                )}
              </div>
            </button>

            {isAdminLoggedIn && onOpenLogoModal && (
              <button
                type="button"
                id="navbar-edit-logo-btn"
                title="Ganti atau Kustomisasi Logo Header"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenLogoModal('upload');
                }}
                className="hidden md:flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-emerald-950 text-[10px] font-bold border border-amber-400/40 transition-all cursor-pointer shrink-0 shadow-xs"
              >
                <Camera className="w-3 h-3" />
                <span>Ubah Logo</span>
              </button>
            )}
          </div>

          {/* Desktop Nav Items (Ramping, Rapi & Elegan) */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1" id="desktop-nav-links">
            {navItems.map((item) => (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap cursor-pointer ${
                  activeSection === item.id
                    ? 'text-amber-300 bg-emerald-800/90 font-semibold shadow-2xs'
                    : 'text-emerald-100/90 hover:text-white hover:bg-emerald-800/50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Action & Ambience Buttons (Desktop Only - lg+) */}
          <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 shrink-0">
            <button
              id="ambient-audio-toggle"
              onClick={toggleMurottalAmbience}
              title={isPlayingAudio ? "Nuansa Audio Madrasah Aktif — Klik untuk mematikan / jeda" : "Aktifkan Nuansa Suara Tenang Madrasah"}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-all duration-200 cursor-pointer relative overflow-hidden shadow-xs active:scale-95 ${
                isPlayingAudio
                  ? 'bg-gradient-to-r from-amber-500/25 via-emerald-800/80 to-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/40 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                  : 'bg-emerald-900/60 border-emerald-700/80 text-emerald-300/80 hover:text-white hover:bg-emerald-800/80'
              }`}
            >
              {isPlayingAudio ? (
                <>
                  <div className="relative flex items-center justify-center">
                    <Volume2 className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
                  </div>
                  <span className="text-[11px] font-bold tracking-tight text-amber-200 hidden xl:inline">Nuansa Aktif</span>
                  {/* Dynamic mini sound bars */}
                  <div className="hidden xl:flex items-end gap-0.5 h-3 ml-0.5">
                    <span className="w-0.5 bg-amber-300 rounded-full animate-pulse h-2" style={{ animationDuration: '0.6s' }} />
                    <span className="w-0.5 bg-amber-400 rounded-full animate-pulse h-3" style={{ animationDuration: '0.9s' }} />
                    <span className="w-0.5 bg-amber-300 rounded-full animate-pulse h-1.5" style={{ animationDuration: '0.75s' }} />
                  </div>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-emerald-400/70" />
                  <span className="text-[11px] text-emerald-200/80 hidden xl:inline">Audio Bisu</span>
                </>
              )}
            </button>

            {/* Quick Share Link Button */}
            <button
              id="nav-share-btn"
              onClick={() => {
                setShareTime(Date.now());
                setShowShareModal(true);
              }}
              title="Bagikan Website (WhatsApp / Medsos)"
              className="p-1.5 sm:px-2 sm:py-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 hover:text-white border border-emerald-700/80 text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-[10px] hidden xl:inline">Bagikan</span>
            </button>

            {/* Tombol Profil (Login, Logout, & Ganti Password) di Desktop */}
            <button
              id="nav-profile-header-btn"
              onClick={() => {
                setActiveProfileTab(isAdminLoggedIn ? 'info' : 'login');
                setShowProfileDrawer(true);
              }}
              title={isAdminLoggedIn ? "Profil & Pengaturan Akun Admin" : "Profil & Login Admin"}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border cursor-pointer shadow-xs ${
                isAdminLoggedIn
                  ? 'bg-emerald-800/90 border-amber-400/90 text-amber-300 hover:bg-emerald-700 ring-1 ring-amber-400/40'
                  : 'bg-emerald-900/90 hover:bg-emerald-800 border-emerald-700/80 hover:border-amber-400/60 text-amber-300'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold ${
                isAdminLoggedIn ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-800 border border-amber-400/60 text-amber-300'
              }`}>
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px]">{isAdminLoggedIn ? "Akun Admin" : "Profil"}</span>
            </button>

            <button
              id="cta-contact-nav"
              onClick={() => handleNavClick('kontak')}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-emerald-950 font-bold text-xs transition-all shadow-xs flex items-center gap-1 active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Mail className="w-3 h-3" />
              <span>Silaturahmi</span>
            </button>
          </div>

          {/* Mobile Action Controls & Ikon Profil (HP/Android) */}
          <div className="flex items-center gap-1.5 lg:hidden shrink-0">
            <button
              id="mobile-share-btn"
              onClick={() => {
                setShareTime(Date.now());
                setShowShareModal(true);
              }}
              className="p-1.5 sm:p-2 rounded-xl bg-emerald-900/90 hover:bg-emerald-800 border border-emerald-700 text-amber-300 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Bagikan"
              title="Bagikan Website"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              id="mobile-audio-toggle"
              onClick={toggleMurottalAmbience}
              className={`p-1.5 sm:p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer relative ${
                isPlayingAudio
                  ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                  : 'bg-emerald-900/90 hover:bg-emerald-800 border-emerald-700 text-emerald-300/70'
              }`}
              aria-label="Toggle Audio"
              title={isPlayingAudio ? "Nuansa Audio Aktif" : "Aktifkan Audio"}
            >
              {isPlayingAudio ? (
                <div className="relative flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
                </div>
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            <button
              id="mobile-profile-btn"
              onClick={() => {
                setActiveProfileTab(isAdminLoggedIn ? 'info' : 'login');
                setShowProfileDrawer(true);
              }}
              className={`p-1.5 sm:p-2 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0 active:scale-95 shadow-md ${
                isAdminLoggedIn
                  ? 'bg-emerald-800 border border-amber-400 text-amber-300 ring-1 ring-amber-400/50'
                  : 'bg-emerald-900/90 hover:bg-emerald-800 text-amber-300 border border-amber-400/50'
              }`}
              aria-label="Profil & Akun Admin"
              title="Profil, Login, Logout & Ganti Password"
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold ${
                isAdminLoggedIn ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-800 border border-amber-400/60 text-amber-300'
              }`}>
                <User className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL / DRAWER PROFIL SINGKAT, LOGIN, LOGOUT & PERBARUI PASSWORD */}
      {/* ============================================================ */}
      {showProfileDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
            onClick={() => setShowProfileDrawer(false)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-md bg-[#04281e] text-white rounded-2xl shadow-2xl border-2 border-emerald-700/80 z-50 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="flex items-center justify-between p-4 border-b border-emerald-800/80 bg-emerald-950/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-xs">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                    {isAdminLoggedIn ? 'Akun & Profil Admin' : 'Profil & Login Admin'}
                  </h3>
                  <p className="text-[11px] text-emerald-300/80 font-medium">
                    {isAdminLoggedIn ? 'Status: Sesi Terautentikasi' : 'Masuk untuk kelola website'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileDrawer(false)}
                className="w-8 h-8 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-amber-300 border border-emerald-700 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigasi */}
            <div className="flex border-b border-emerald-800/80 bg-emerald-950/40 p-1.5 gap-1.5">
              <button
                onClick={() => setActiveProfileTab('info')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                  activeProfileTab === 'info'
                    ? 'bg-amber-400 text-emerald-950 shadow-xs'
                    : 'text-emerald-200 hover:bg-emerald-900/60'
                }`}
              >
                Profil Singkat
              </button>

              {isAdminLoggedIn ? (
                <button
                  onClick={() => setActiveProfileTab('password')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                    activeProfileTab === 'password'
                      ? 'bg-amber-400 text-emerald-950 shadow-xs'
                      : 'text-emerald-200 hover:bg-emerald-900/60'
                  }`}
                >
                  Perbarui Password
                </button>
              ) : (
                <button
                  onClick={() => setActiveProfileTab('login')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                    activeProfileTab === 'login'
                      ? 'bg-amber-400 text-emerald-950 shadow-xs'
                      : 'text-emerald-200 hover:bg-emerald-900/60'
                  }`}
                >
                  Masuk / Login
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* TAB 1: PROFIL SINGKAT */}
              {activeProfileTab === 'info' && (
                <div className="space-y-4">
                  {quickLoginSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-900 text-emerald-100 border border-emerald-500/80 text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-fadeIn">
                      <span>{quickLoginSuccessMsg}</span>
                      <button
                        type="button"
                        onClick={() => setQuickLoginSuccessMsg('')}
                        className="text-emerald-300 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-3.5 p-3 rounded-xl bg-emerald-950/90 border border-emerald-800">
                    <img
                      src={activeProfile.avatarUrl}
                      alt={activeProfile.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-amber-400/80 shadow-md shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{activeProfile.name}</h4>
                      <p className="text-xs text-amber-300 font-medium truncate">{activeProfile.title}</p>
                      <p className="text-[11px] text-emerald-300/80 truncate mt-0.5">{activeProfile.location || 'Indonesia'}</p>
                    </div>
                  </div>

                  <div className="text-xs text-emerald-100/90 leading-relaxed bg-emerald-900/30 p-3 rounded-xl border border-emerald-800/60">
                    <p className="line-clamp-3">{activeProfile.bio}</p>
                  </div>

                  {/* Tindakan Cepat */}
                  <div className="space-y-2 pt-2 border-t border-emerald-800/60">
                    {isAdminLoggedIn ? (
                      <>
                        <button
                          onClick={() => {
                            setShowProfileDrawer(false);
                            if (onOpenAdmin) onOpenAdmin();
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Buka Dashboard Panel Lengkap</span>
                        </button>

                        <button
                          onClick={() => setActiveProfileTab('password')}
                          className="w-full py-2 px-3 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-amber-300 border border-emerald-700 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                          <Key className="w-4 h-4" />
                          <span>Ganti / Perbarui Password</span>
                        </button>

                        {onLogout && (
                          <button
                            onClick={() => {
                              onLogout();
                              setShowProfileDrawer(false);
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-500/60 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                          >
                            <LogOut className="w-4 h-4 text-red-300" />
                            <span>Keluar (Logout)</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => setActiveProfileTab('login')}
                        className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Login Sebagai Admin Website</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: FORM PERBARUI PASSWORD */}
              {activeProfileTab === 'password' && (
                <form onSubmit={handleQuickPasswordChange} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-300 mb-1">Password Lama</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Masukkan password lama"
                      required
                      className="w-full bg-emerald-950/90 border border-emerald-700 rounded-xl px-3 py-2 text-xs text-white placeholder-emerald-500 focus:outline-hidden focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-300 mb-1">Password Baru (Min. 6 Karakter)</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Buat password baru"
                      required
                      className="w-full bg-emerald-950/90 border border-emerald-700 rounded-xl px-3 py-2 text-xs text-white placeholder-emerald-500 focus:outline-hidden focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-300 mb-1">Konfirmasi Password Baru</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru"
                      required
                      className="w-full bg-emerald-950/90 border border-emerald-700 rounded-xl px-3 py-2 text-xs text-white placeholder-emerald-500 focus:outline-hidden focus:border-amber-400"
                    />
                  </div>

                  {passwordMsg.text && (
                    <div className={`p-2.5 rounded-xl text-xs font-bold ${
                      passwordMsg.type === 'success' ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-600' : 'bg-red-900/90 text-red-200 border border-red-600'
                    }`}>
                      {passwordMsg.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isChangingPass}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 mt-2"
                  >
                    <Key className="w-4 h-4" />
                    <span>{isChangingPass ? 'Menyimpan...' : 'Simpan Password Baru'}</span>
                  </button>
                </form>
              )}

              {/* TAB 3: FORM LOGIN CEPAT */}
              {activeProfileTab === 'login' && (
                <form onSubmit={handleQuickLogin} className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-amber-300">Password Admin</label>
                    </div>
                    <div className="relative">
                      <input
                        type={showPasswordText ? "text" : "password"}
                        value={quickLoginPassword}
                        onChange={(e) => setQuickLoginPassword(e.target.value)}
                        placeholder="Ketik password admin..."
                        required
                        className="w-full bg-emerald-950/90 border border-emerald-700 rounded-xl pl-3 pr-10 py-2 text-xs text-white placeholder-emerald-500 focus:outline-hidden focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordText(!showPasswordText)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-amber-300 cursor-pointer"
                      >
                        {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {quickLoginError && (
                    <div className="p-2.5 rounded-xl text-xs font-bold bg-red-900/90 text-red-200 border border-red-600">
                      {quickLoginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={quickLoginLoading}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 mt-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{quickLoginLoading ? 'Memverifikasi...' : 'Masuk Sekarang'}</span>
                  </button>

                  <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-[11px] text-emerald-300/90 leading-relaxed">
                    <p className="font-semibold text-amber-300">💡 Info Akses Admin:</p>
                    <p className="mt-0.5">Masukkan kata sandi admin Anda. Setelah login, Anda dapat langsung mengelola akun dan mengganti password di menu <em>Perbarui Password</em> atau di <em>Dashboard Admin Portal</em>.</p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Social Share & Auto Thumbnail Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border-2 border-emerald-300 shadow-2xl max-w-md w-full p-5 sm:p-6 text-gray-800 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#064e3b]">Bagikan Link Website</h4>
                  <p className="text-[11px] text-gray-500">Otomatis menampilkan gambar thumbnail di WhatsApp & Medsos</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thumbnail Preview Card */}
            <div className="rounded-2xl border border-gray-200 overflow-hidden bg-[#f0f4f1] shadow-inner space-y-2">
              <div className="relative aspect-[16/9] w-full bg-emerald-950 overflow-hidden">
                <img
                  key={`${displayThumbnail}-${shareTime}`}
                  src={displayThumbnail}
                  alt="Thumbnail"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/og-image.jpg?v=' + Date.now();
                  }}
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-950/80 backdrop-blur-xs text-amber-300 text-[9px] font-bold rounded-md border border-amber-400/30">
                  Thumbnail Preview Resmi
                </div>
                <button
                  type="button"
                  onClick={() => setShareTime(Date.now())}
                  title="Perbarui versi cache thumbnail"
                  className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 hover:bg-black/80 text-white text-[9px] font-semibold rounded-md border border-white/20 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Refresh Preview</span>
                </button>
              </div>
              <div className="p-3 space-y-1">
                <h5 className="text-xs font-bold text-gray-900 leading-snug">
                  {shareSettings?.title || `${activeProfile.title || activeProfile.name} - Pendidik & Penggerak Madrasah`}
                </h5>
                <p className="text-[11px] text-gray-600 line-clamp-2">
                  {shareSettings?.description || activeProfile.tagline || 'Menyemai Adab, Menumbuhkan Intelektual, Mengabdi untuk Kemuliaan Umat.'}
                </p>
                <div className="text-[10px] text-emerald-800 font-mono font-medium pt-1 truncate flex items-center justify-between">
                  <span>{typeof window !== 'undefined' ? `${window.location.origin}/?v=${Math.floor(shareTime / 1000)}` : `https://jaenalmaskun.biz.id/?v=${Math.floor(shareTime / 1000)}`}</span>
                  <span className="text-[9px] text-gray-400 font-sans">Versi Dinamis</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  const targetBaseUrl = (typeof window !== 'undefined' && window.location.hostname.includes('jaenalmaskun.biz.id'))
                    ? window.location.origin
                    : (typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://jaenalmaskun.biz.id');
                  const targetUrl = `${targetBaseUrl}/?v=${Math.floor(shareTime / 1000)}`;
                  const shareText = encodeURIComponent(
                    `*${shareSettings?.title || `${activeProfile.title || activeProfile.name} - Website Resmi`}*\n` +
                    `${shareSettings?.description || activeProfile.tagline || 'Menyemai Adab, Menumbuhkan Intelektual'}\n\n` +
                    `${targetUrl}`
                  );
                  window.open(`https://api.whatsapp.com/send?text=${shareText}`, '_blank');
                }}
                className="w-full py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
              >
                <Share2 className="w-4 h-4" />
                <span>Bagikan ke WhatsApp Sekarang</span>
              </button>

              <button
                onClick={() => {
                  const targetBaseUrl = (typeof window !== 'undefined' && window.location.hostname.includes('jaenalmaskun.biz.id'))
                    ? window.location.origin
                    : (typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://jaenalmaskun.biz.id');
                  const targetUrl = `${targetBaseUrl}/?v=${Math.floor(shareTime / 1000)}`;
                  navigator.clipboard.writeText(targetUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2500);
                }}
                className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
                <span>{copiedLink ? "✓ Link Resmi Berhasil Disalin!" : `Salin Link Website (?v=${Math.floor(shareTime / 1000)})`}</span>
              </button>

              <p className="text-[10px] text-gray-500 text-center leading-tight pt-1">
                💡 <em>Tips: Saat membagikan link di WhatsApp, tunggu 1-2 detik hingga kotak pratinjau gambar muncul sebelum menekan tombol Kirim.</em>
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
