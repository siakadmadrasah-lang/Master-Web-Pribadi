import React, { useState, useEffect } from 'react';
import { Download, BookOpen, MessageSquare, ArrowUpRight, Award, Calendar, Sparkles, CheckCircle2, ShieldCheck, Camera, User } from 'lucide-react';
import { profileData } from '../data/personalData';
import { ProfileInfo, HeroSettings } from '../types';
import { triggerBerandaEntranceGreeting } from '../utils/audioEffects';

interface HeroSectionProps {
  onNavigate: (sectionId: string) => void;
  profile?: ProfileInfo;
  heroSettings?: HeroSettings;
  onOpenPhotoEditor?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onNavigate,
  profile = profileData,
  heroSettings = {
    badgeText: 'Guru',
    greetingTitle: 'Assalamu’alaikum Warahmatullahi Wabarakatuh',
    greetingSub: 'Khidmat untuk Pendidikan Islam & Literasi Madrasah',
    showStats: true,
    showDownloadCV: true,
    heroImage: '/uploads/hero_1787051686043_doq56m.jpg',
    photoBadgeText: 'Pejuang MI',
  },
  onOpenPhotoEditor,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Trigger Ahlan Wa Sahlan greeting when visitor enters Beranda
  useEffect(() => {
    triggerBerandaEntranceGreeting();
  }, []);

  // Candidate images in priority order
  const candidateImages = React.useMemo(() => {
    const list: string[] = [];
    if (heroSettings?.heroImage && heroSettings.heroImage.trim()) {
      list.push(heroSettings.heroImage.trim());
    }
    if (profile?.avatarUrl && profile.avatarUrl.trim() && !list.includes(profile.avatarUrl.trim())) {
      list.push(profile.avatarUrl.trim());
    }
    if (!list.includes('/uploads/hero_1787051686043_doq56m.jpg')) {
      list.push('/uploads/hero_1787051686043_doq56m.jpg');
    }
    if (!list.includes('/avatar-jaenal.jpg')) {
      list.push('/avatar-jaenal.jpg');
    }
    return list;
  }, [heroSettings?.heroImage, profile?.avatarUrl]);

  // Reset index when candidates change
  React.useEffect(() => {
    setCurrentImageIndex(0);
  }, [heroSettings?.heroImage, profile?.avatarUrl]);

  const displayImage = currentImageIndex < candidateImages.length ? candidateImages[currentImageIndex] : null;

  const handleImageError = () => {
    // Try the next candidate image
    setCurrentImageIndex((prev) => prev + 1);
  };

  const handleDownloadCV = () => {
    // Generate a simple simulated printable CV / Profil Ringkas Pendidik
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);

    const cvText = `
PROFIL RINGKAS PENDIDIK & PENGGERAK MADRASAH
=============================================
Nama Lengkap : ${profile.title || profile.name}
Gelar        : ${profile.degrees}
Peran        : ${profile.role}
Email Kontak : ${profile.email}
Lokasi       : ${profile.location}

VISI & MOTTO:
"${profile.motto}"
"${profile.tagline}"

RINGKASAN BIO:
${profile.bio}

PENGALAMAN & STATISTIK:
${profile.stats.map(s => `- ${s.value} ${s.label} (${s.subtext})`).join('\n')}
=============================================
Dokumen Resmi Profil ${profile.name}.
    `.trim();

    const blob = new Blob([cvText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Profil-${profile.name.replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="beranda" className="relative pt-20 pb-8 sm:pt-24 sm:pb-10 md:pt-28 md:pb-12 lg:pt-30 lg:pb-14 overflow-hidden bg-gradient-to-b from-[#064e3b] via-[#065f46] to-[#044332] text-white scroll-mt-20">
      {/* Decorative Islamic Background Elements */}
      <div className="absolute inset-0 bg-emerald-pattern opacity-25 pointer-events-none" />
      <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative Islamic Geometry Border Top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-300 to-amber-600" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Basmalah Header (Elegan, Dekat ke Atas & Bebas dari Tabrakan Header) */}
        <div className="text-center mb-4 sm:mb-6 pt-0">
          <p className="font-arabic text-2xl sm:text-3xl lg:text-4xl text-amber-300 tracking-wide select-none drop-shadow-md">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <div className="flex items-center justify-center gap-2.5 mt-2">
            <span className="h-[1px] w-8 sm:w-16 bg-amber-400/40"></span>
            <span className="text-[11px] sm:text-xs uppercase tracking-widest text-amber-200/90 font-medium">
              {heroSettings.greetingSub || 'Khidmat untuk Pendidikan Islam & Literasi Madrasah'}
            </span>
            <span className="h-[1px] w-8 sm:w-16 bg-amber-400/40"></span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left Column: Typography & Bio */}
          <div className="lg:col-span-7 space-y-3.5 text-center lg:text-left">
            {/* Main Name & Title (Huruf Latin yang Cantik, Elegan & Berwibawa) */}
            <div className="space-y-1.5">
              <h1 className="font-latin-elegant text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-bold tracking-normal text-white leading-tight break-words drop-shadow-sm">
                <span className="bg-gradient-to-r from-amber-100 via-white to-amber-200 bg-clip-text text-transparent">
                  {profile.title || profile.name}
                </span>
              </h1>
              {profile.arabicName && (
                <p className="font-arabic text-base sm:text-lg md:text-xl text-amber-300/90 font-medium tracking-wide">
                  {profile.arabicName}
                </p>
              )}
              <p className="text-amber-300 text-xs sm:text-sm md:text-base font-semibold tracking-wide flex items-center justify-center lg:justify-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>{profile.role}</span>
              </p>
            </div>

            {/* Tagline & Bio Description */}
            <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed max-w-2xl font-light">
              {profile.bio}
            </p>

            {/* Motto Card (Ramping) */}
            {profile.motto && (
              <div className="p-3 rounded-lg bg-emerald-900/60 border-l-3 border-amber-400 bg-opacity-70 border-t border-r border-b border-emerald-700/50 backdrop-blur-xs text-left">
                <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wider mb-0.5">
                  Falsafah & Motto Pengabdian
                </p>
                <p className="text-xs sm:text-sm text-emerald-50 italic font-serif leading-relaxed">
                  "{profile.motto}"
                </p>
              </div>
            )}

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1">
              <button
                id="hero-explore-works-btn"
                onClick={() => onNavigate('karya')}
                className="px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-lg bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-emerald-950 font-bold text-xs sm:text-sm shadow-md flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5"
              >
                <BookOpen className="w-4 h-4" />
                <span>Karya & Modul</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              {heroSettings.showDownloadCV && (
                <button
                  id="hero-download-cv-btn"
                  onClick={handleDownloadCV}
                  className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 border border-amber-400/40 text-emerald-100 hover:text-white font-medium text-xs sm:text-sm transition-all flex items-center gap-1.5"
                >
                  {downloadSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tersimpan!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-amber-300" />
                      <span>Profil Singkat</span>
                    </>
                  )}
                </button>
              )}

              <button
                id="hero-consult-btn"
                onClick={() => onNavigate('kontak')}
                className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg bg-emerald-800/40 hover:bg-emerald-800/70 border border-emerald-600 text-emerald-200 hover:text-white text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Undang Narasumber</span>
              </button>
            </div>
          </div>

          {/* Right Column: Iconic Portrait Card (Ramping & Proporsional) */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-xs sm:max-w-sm">
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-emerald-800 to-emerald-950 border border-amber-400/40 p-4 sm:p-5 shadow-xl">
                {/* Header Tag */}
                <div className="flex items-center justify-between border-b border-emerald-700/60 pb-2.5 mb-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                    </div>
                    <span className="text-xs font-bold text-amber-300">
                      {heroSettings.badgeText || 'Pendidik Madrasah'}
                    </span>
                  </div>
                  <span className="text-[10px] bg-emerald-700/60 text-emerald-100 px-2 py-0.5 rounded-full border border-emerald-600">
                    Aktif Mengabdi
                  </span>
                </div>

                {/* Portrait Avatar Centerpiece */}
                <div className="relative my-2 flex flex-col items-center">
                  <div className="relative group">
                    {/* Outer Glow & Islamic Gold Ring */}
                    <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 rounded-3xl blur-xs opacity-75 group-hover:opacity-100 transition duration-500" />
                    
                    <div className="relative w-36 h-48 sm:w-44 sm:h-56 md:w-48 md:h-60 lg:w-52 lg:h-64 rounded-2xl overflow-hidden bg-[#053d2e] border-2 border-amber-300 shadow-2xl flex flex-col items-center justify-center">
                      {displayImage ? (
                        <>
                          <img
                            src={displayImage}
                            alt={profile.title || profile.name}
                            className="w-full h-full object-cover object-top filter brightness-105 contrast-105 group-hover:scale-105 transition-transform duration-500"
                            onError={handleImageError}
                            referrerPolicy="no-referrer"
                            loading="eager"
                          />
                          {/* Inner subtle gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#04281e]/80 via-transparent to-transparent pointer-events-none" />
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-emerald-800 to-emerald-950">
                          <div className="w-16 h-16 rounded-full bg-emerald-900 border border-amber-400/50 flex items-center justify-center text-amber-300 font-serif font-bold text-2xl shadow-inner mb-2">
                            {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2) || 'JM'}
                          </div>
                          <span className="text-[10px] text-amber-200 font-medium">Ust. {profile.name}</span>
                        </div>
                      )}

                      {/* Floating Emblem Tag at Bottom of Portrait */}
                      <div className="absolute bottom-1.5 inset-x-2 text-center">
                        <span className="inline-block text-[9px] uppercase font-bold tracking-wider text-amber-200 bg-emerald-950/90 px-2.5 py-0.5 rounded-full border border-amber-400/40 shadow-sm backdrop-blur-xs max-w-full truncate">
                          {heroSettings.photoBadgeText || profile.institution || 'Penggerak Madrasah'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <h3 className="mt-3 font-latin-elegant text-base sm:text-lg font-bold text-white text-center tracking-normal">
                    {profile.title || profile.name}
                  </h3>
                  <p className="text-[11px] text-amber-300/90 text-center font-medium line-clamp-1 max-w-[260px]">
                    {profile.institution}
                  </p>
                  <p className="text-[10px] text-emerald-300/80 mt-0.5 font-mono">
                    {profile.location}
                  </p>
                </div>

                {/* Key Badges Inside Card */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-emerald-700/60 text-xs">
                  <div className="p-2 rounded-lg bg-emerald-900/60 border border-emerald-700/40 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div className="overflow-hidden">
                      <p className="text-[9px] text-emerald-300">Gelar</p>
                      <p className="font-semibold text-white truncate text-[11px]">{profile.degrees || '-'}</p>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-900/60 border border-emerald-700/40 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-[9px] text-emerald-300">Status</p>
                      <p className="font-semibold text-white text-[11px]">Pendidik Aktif</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid (Ramping & Kompak) */}
        {heroSettings.showStats && profile.stats && profile.stats.length > 0 && (
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-emerald-700/40 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {profile.stats.map((stat, idx) => (
              <div
                key={idx}
                id={`stat-card-${idx}`}
                className="p-2.5 sm:p-3.5 rounded-lg bg-emerald-800/35 border border-emerald-700/40 backdrop-blur-xs text-center sm:text-left transition-all hover:bg-emerald-800/60 hover:border-amber-400/40 group"
              >
                <p className="text-xl sm:text-2xl font-bold text-amber-300 group-hover:scale-102 transition-transform">
                  {stat.value}
                </p>
                <h4 className="text-[11px] sm:text-xs font-semibold text-white mt-0.5">
                  {stat.label}
                </h4>
                <p className="text-[10px] text-emerald-300/80 mt-0.2">
                  {stat.subtext}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
