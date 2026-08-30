import React from 'react';
import { BookOpen, Heart, ArrowUp, Mail, ShieldCheck, Lock } from 'lucide-react';
import { profileData, defaultHeaderLogo } from '../data/personalData';
import { ProfileInfo, HeaderLogoConfig } from '../types';

interface FooterProps {
  onNavigate: (sectionId: string) => void;
  onOpenAdmin?: () => void;
  profile?: ProfileInfo;
  logoConfig?: HeaderLogoConfig;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onOpenAdmin,
  profile = profileData,
  logoConfig = defaultHeaderLogo,
}) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const initials = logoConfig?.monogramText || (profile.name ? profile.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'JM');
  
  // Resolve footer logo image based on configuration
  const footerLogoImage = logoConfig?.footerLogoType === 'custom' && logoConfig.footerLogoUrl
    ? logoConfig.footerLogoUrl
    : logoConfig?.footerLogoType === 'monogram'
    ? undefined
    : (logoConfig?.footerLogoUrl || (logoConfig?.type === 'custom_image' || logoConfig?.type === 'preset_emblem' ? logoConfig.customImageUrl : undefined));

  // Blend mode styling for footer logo - default to normal for bright, crisp rendering
  const footerBlendStyle: React.CSSProperties = {
    mixBlendMode: (logoConfig?.footerBlendMode || logoConfig?.blendMode) === 'screen'
      ? 'screen'
      : (logoConfig?.footerBlendMode || logoConfig?.blendMode) === 'multiply'
      ? 'multiply'
      : 'normal',
    imageRendering: '-webkit-optimize-contrast',
  };

  return (
    <footer className="bg-[#042e23] text-emerald-100 border-t-2 border-amber-600/40 relative overflow-hidden">
      {/* Decorative Geometry */}
      <div className="absolute inset-0 bg-emerald-pattern opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-28 sm:pb-24 md:pb-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-emerald-800">
          {/* Col 1: Profile & Motto */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3.5">
              {/* Logo / Emblem on the Left of Jaenal Maskun */}
              <div className="relative shrink-0">
                {footerLogoImage ? (
                  <div
                    className="w-12 h-12 rounded-full bg-emerald-950/90 border-2 border-amber-400/80 p-0.5 overflow-hidden flex items-center justify-center shadow-lg"
                  >
                    <img
                      src={footerLogoImage}
                      alt="Logo Footer"
                      className="w-full h-full object-contain p-0.5 rounded-full"
                      style={footerBlendStyle}
                    />
                  </div>
                ) : (
                  <div
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center font-cinzel font-bold text-emerald-950 text-lg border-2 border-amber-300/80 shadow-lg"
                  >
                    <span>{initials}</span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-bold text-white text-base sm:text-lg tracking-tight">
                  {profile.title || profile.name}
                </h3>
                <p className="text-xs text-amber-300 font-medium mt-0.5">
                  {profile.role}
                </p>
              </div>
            </div>

            <p className="text-xs text-emerald-200/80 leading-relaxed font-light">
              {profile.bio ? profile.bio.slice(0, 180) + '...' : 'Mendedikasikan ilmu dan keteladanan untuk membangun peradaban madrasah yang berakar kuat pada nilai-nilai keislaman, akhlaqul karimah, dan kemajuan ilmu pengetahuan.'}
            </p>

            <div className="p-3.5 rounded-xl bg-emerald-900/60 border border-emerald-800 text-xs">
              <p className="font-arabic text-sm text-amber-200 dir-rtl mb-1">
                سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ ، أَشْهَدُ أَنْ لا إِلهَ إِلَّا أَنْتَ ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ
              </p>
              <p className="text-[10px] text-emerald-300/80 italic">
                Doa Kaffaratul Majelis — Pembersih dari kekhilafan.
              </p>
            </div>
          </div>

          {/* Col 2: Nav Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Navigasi Halaman
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('beranda')}
                  className="hover:text-amber-300 transition-colors text-left cursor-pointer"
                >
                  Beranda
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('profil')}
                  className="hover:text-amber-300 transition-colors text-left cursor-pointer"
                >
                  Profil & Visi Keilmuan
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('pilar')}
                  className="hover:text-amber-300 transition-colors text-left cursor-pointer"
                >
                  Pilar Madrasah
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('karya')}
                  className="hover:text-amber-300 transition-colors text-left cursor-pointer"
                >
                  Karya Tulis & Modul Ajar
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('agenda')}
                  className="hover:text-amber-300 transition-colors text-left cursor-pointer"
                >
                  Agenda Kajian & Seminar
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('fitur-islami')}
                  className="hover:text-amber-300 transition-colors text-left cursor-pointer"
                >
                  Tasbih & Waktu Sholat
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact Summary */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Kontak & Komunikasi
            </h4>
            <p className="text-xs text-emerald-200/80">
              Silaturahmi resmi melalui surat elektronik dan pesan WhatsApp:
            </p>
            <div className="space-y-1.5 text-xs text-emerald-100">
              <p className="font-semibold text-white">{profile.email}</p>
              <p>{profile.phone}</p>
              <p className="text-emerald-300/80">{profile.location}</p>
            </div>
            <button
              onClick={() => onNavigate('kontak')}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-xs font-semibold text-amber-200 border border-emerald-600 transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Kirim Undangan / Pesan</span>
            </button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-300/80">
          <p>
            © {new Date().getFullYear()} <strong>{profile.title || profile.name}</strong>. Seluruh Hak Cipta Dilindungi.
          </p>
          <div className="flex items-center gap-4">
            {onOpenAdmin && (
              <button
                type="button"
                id="footer-admin-link-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenAdmin();
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-amber-300 border border-amber-500/40 hover:border-amber-400 flex items-center gap-1.5 text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
                title="Buka Portal Masuk Admin"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Akses Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                scrollToTop();
              }}
              className="px-3 py-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-amber-300 border border-emerald-700 flex items-center gap-1.5 text-xs transition-all active:scale-95 cursor-pointer"
            >
              <span>Kembali ke Atas</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

