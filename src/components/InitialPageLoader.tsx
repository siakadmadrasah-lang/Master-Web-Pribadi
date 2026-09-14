import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BookOpen, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { HeaderLogoConfig, ProfileInfo } from '../types';
import { defaultHeaderLogo, profileData } from '../data/personalData';

interface InitialPageLoaderProps {
  logoConfig?: HeaderLogoConfig;
  profile?: ProfileInfo;
  minDurationMs?: number;
  onFinish?: () => void;
}

export const InitialPageLoader: React.FC<InitialPageLoaderProps> = ({
  logoConfig = defaultHeaderLogo,
  profile = profileData,
  minDurationMs = 1100,
  onFinish,
}) => {
  const [progress, setProgress] = useState(15);
  const [statusMessage, setStatusMessage] = useState('Bismillahirrohmanirrohim...');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const totalDuration = minDurationMs;
    const intervalMs = 20;
    const totalSteps = totalDuration / intervalMs;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const currentProgress = Math.min(100, Math.round((step / totalSteps) * 100));
      setProgress(currentProgress);

      if (currentProgress < 25) {
        setStatusMessage('Bismillahirrohmanirrohim...');
      } else if (currentProgress < 60) {
        setStatusMessage('Menyiapkan Ekosistem Madrasah & Khazanah...');
      } else if (currentProgress < 85) {
        setStatusMessage('Menyinkronkan Data & Layanan Portal...');
      } else {
        setStatusMessage('Selamat Datang di Portal Madrasah...');
      }

      if (step >= totalSteps) {
        clearInterval(timer);
        setProgress(100);
        setTimeout(() => {
          setIsVisible(false);
        }, 250);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [minDurationMs]);

  const handleUserInteraction = () => {
    // Allows instant skip on tap or click
    setIsVisible(false);
  };

  const handleExitComplete = () => {
    if (onFinish) {
      onFinish();
    }
  };

  const brandName = logoConfig.brandName || 'GARDA MADRASAH';
  const tagline = logoConfig.taglineText || profile.role || 'Pendidik, Akademisi & Dev APP Madrasah';
  const personName = profile.title || profile.name || 'Jaenal Maskun, S.Pd.I.';
  const badgeText = logoConfig.badgeText || 'MADRASAH';

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isVisible && (
        <motion.div
          id="initial-page-loader"
          key="initial-loader"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.04,
            filter: 'blur(8px)',
            transition: { duration: 0.5, ease: 'easeInOut' }
          }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#05110c] text-white select-none overflow-hidden cursor-pointer"
          onClick={handleUserInteraction}
        >
          {/* Ambient Lighting & Luxury Emerald-Gold Gradient Backdrops */}
          <div className="absolute inset-0 bg-radial from-emerald-900/40 via-[#06140e]/95 to-[#030906] pointer-events-none" />
          
          {/* Radial Glow Halo Behind Centered Logo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[450px] md:w-[600px] h-[300px] sm:h-[450px] md:h-[600px] bg-gradient-to-tr from-amber-500/20 via-emerald-500/25 to-teal-400/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '3s' }} />

          {/* Subtle Islamic Geometric Grid Backdrop */}
          <div 
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at 25px 25px, rgba(251, 191, 36, 0.6) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(52, 211, 153, 0.6) 2%, transparent 0%)`,
              backgroundSize: '100px 100px',
            }}
          />

          {/* Centered Main Card Container */}
          <div className="relative z-10 flex flex-col items-center justify-center px-6 max-w-lg w-full text-center">
            
            {/* Arabic Bismillah Blessing */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="mb-5 sm:mb-7"
            >
              <span className="font-serif text-amber-200/90 text-sm sm:text-base md:text-lg tracking-widest block drop-shadow-[0_2px_8px_rgba(245,158,11,0.3)]">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </span>
              <div className="flex items-center justify-center gap-2 mt-1.5 opacity-70">
                <span className="h-[1px] w-8 sm:w-12 bg-gradient-to-r from-transparent to-amber-400" />
                <Sparkles className="w-3 h-3 text-amber-300 animate-spin" style={{ animationDuration: '8s' }} />
                <span className="h-[1px] w-8 sm:w-12 bg-gradient-to-l from-transparent to-amber-400" />
              </div>
            </motion.div>

            {/* Centered Logo Stage with Animated Orbit Rings */}
            <div className="relative mb-5 sm:mb-7 flex items-center justify-center">
              
              {/* Outer Golden Rotating Dashed Celestial Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                className="absolute w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full border border-dashed border-amber-400/35 pointer-events-none"
              />

              {/* Middle Emerald Glowing Counter-Rotating Ring */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
                className="absolute w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 rounded-full border border-emerald-400/30 border-t-amber-400/85 pointer-events-none"
              />

              {/* Pulsing Light Waves */}
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-amber-400/15 blur-md pointer-events-none"
              />

              {/* Main Logo Sphere */}
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-emerald-500 to-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.4),0_0_70px_rgba(16,185,129,0.25)] flex items-center justify-center"
              >
                {/* Inner Bezel Frame */}
                <div className="w-full h-full rounded-full bg-[#071911] p-1 flex items-center justify-center overflow-hidden relative shadow-inner">
                  {logoConfig.type === 'custom_image' && logoConfig.customImageUrl ? (
                    <img
                      src={logoConfig.customImageUrl}
                      alt={brandName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-full pointer-events-none drop-shadow-md"
                    />
                  ) : logoConfig.type === 'preset_emblem' && logoConfig.customImageUrl ? (
                    <img
                      src={logoConfig.customImageUrl}
                      alt={brandName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-full pointer-events-none drop-shadow-md"
                    />
                  ) : logoConfig.type === 'monogram' ? (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-800 to-[#05160e] flex items-center justify-center">
                      <span className="text-2xl sm:text-3xl font-serif font-black tracking-wider text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        {logoConfig.monogramText || 'JM'}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-800 to-[#05160e] flex items-center justify-center">
                      <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-amber-300" />
                    </div>
                  )}

                  {/* Golden Surface Shimmer Reflection */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/15 via-transparent to-black/30 pointer-events-none" />
                </div>

                {/* Floating Micro Badge */}
                {badgeText && (
                  <div className="absolute -bottom-2 bg-gradient-to-r from-amber-500 to-amber-600 text-emerald-950 font-black text-[9px] sm:text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-lg border border-amber-200">
                    {badgeText}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Typography Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-1 sm:space-y-1.5"
            >
              <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 drop-shadow-sm">
                {brandName}
              </h1>

              <p className="text-xs sm:text-sm font-medium text-emerald-300/90 tracking-wide">
                {personName}
              </p>

              <p className="text-[11px] sm:text-xs text-emerald-400/70 max-w-sm mx-auto font-light line-clamp-1">
                {tagline}
              </p>
            </motion.div>

            {/* Elegant Progress Bar and Status */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full max-w-xs mt-6 space-y-2.5"
            >
              {/* Progress Track */}
              <div className="h-1.5 w-full bg-emerald-950/80 rounded-full overflow-hidden p-0.5 border border-emerald-800/40 shadow-inner relative">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-300 rounded-full shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.05 }}
                />
              </div>

              {/* Progress Info Details */}
              <div className="flex items-center justify-between text-[11px] sm:text-xs">
                <span className="text-emerald-300/90 font-medium tracking-wide flex items-center gap-1.5">
                  {progress === 100 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                  )}
                  {statusMessage}
                </span>
                <span className="text-amber-300 font-mono font-bold tracking-wider">
                  {progress}%
                </span>
              </div>
            </motion.div>

            {/* Bottom Footer Note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-6 text-[10px] sm:text-[11px] text-emerald-500/80 tracking-widest uppercase flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Portal Resmi Madrasah & Literasi Pendidikan Islam</span>
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
