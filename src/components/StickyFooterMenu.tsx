import React, { useState, useEffect } from 'react';
import {
  User,
  LogOut,
  ChevronUp,
  ChevronDown,
  Camera,
  Sparkles,
  Volume2
} from 'lucide-react';
import { StickyFooterConfig } from '../types';
import { AVAILABLE_ICONS, FOOTER_THEMES } from '../constants/footerThemes';

interface StickyFooterMenuProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  onOpenAdmin: () => void;
  isAdminLoggedIn: boolean;
  onLogout?: () => void;
  onOpenLogoModal?: () => void;
  config: StickyFooterConfig;
  onOpenStickyFooterEditor?: () => void;
  onToggleAudio?: () => void;
  isAudioPlaying?: boolean;
}

export const StickyFooterMenu: React.FC<StickyFooterMenuProps> = ({
  activeSection,
  onNavigate,
  onOpenAdmin,
  isAdminLoggedIn,
  onLogout,
  onOpenLogoModal,
  config,
  onOpenStickyFooterEditor,
  onToggleAudio,
  isAudioPlaying,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(config.collapseDefault || false);

  const isDesktopEnabled = config.showOnDesktop !== false;
  const isMobileEnabled = config.showOnMobile !== false;

  // If disabled by master switch or disabled on all devices
  if (!config.enabled || (!isDesktopEnabled && !isMobileEnabled)) {
    return null;
  }

  // Responsive device visibility class
  let deviceVisibilityClass = '';
  if (!isDesktopEnabled && isMobileEnabled) {
    deviceVisibilityClass = 'md:hidden'; // Hidden on desktop/computer screens (>= 768px)
  } else if (isDesktopEnabled && !isMobileEnabled) {
    deviceVisibilityClass = 'hidden md:block'; // Hidden on mobile screens (< 768px)
  }

  // Find theme
  const currentTheme = FOOTER_THEMES.find((t) => t.id === config.theme) || FOOTER_THEMES[0];
  const isFloating = config.position === 'floating';

  const visibleItems = config.items.filter((item) => item.visible);

  return (
    <div
      id="sticky-footer-container"
      className={`fixed ${
        isFloating ? 'bottom-0 left-0 right-0 px-2 sm:px-4 pb-2 sm:pb-3 pt-1' : 'bottom-0 left-0 right-0 pb-0'
      } z-40 pointer-events-none transition-all duration-300 ${deviceVisibilityClass}`}
    >
      <div className={`w-full ${config.maxWidth} mx-auto pointer-events-auto`}>
        {/* Toggle Collapse Pill */}
        {config.allowCollapse && (
          <div className="flex justify-center -mb-2 relative z-10">
            <button
              id="toggle-sticky-menu-btn"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="px-3 py-0.5 rounded-t-lg bg-[#064e3b] hover:bg-[#065f46] text-amber-300 border-t border-x border-amber-500/40 text-[10px] font-semibold flex items-center gap-1 shadow-md transition-colors"
              title={isCollapsed ? "Buka Menu Cepat" : "Sembunyikan Menu Cepat"}
            >
              <span>{isCollapsed ? `Tampilkan ${config.collapseText || 'Menu'}` : config.collapseText || "Menu Pintas Madrasah"}</span>
              {isCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        )}

        {/* Main Sticky Bar */}
        {!isCollapsed && (
          <div
            id="sticky-footer-bar"
            className={`${currentTheme.bgClass} backdrop-blur-md ${
              isFloating ? 'rounded-2xl border-2' : 'rounded-t-2xl border-t-2 border-x-0 border-b-0'
            } shadow-2xl p-1.5 sm:p-2.5 flex items-center justify-between gap-1 sm:gap-2`}
          >
            {/* Quick Links */}
            <div className="flex items-center justify-around flex-1 gap-1 overflow-x-auto py-0.5">
              {visibleItems.map((item) => {
                const Icon = AVAILABLE_ICONS[item.icon] || Sparkles;
                const isActive = activeSection === item.sectionId;

                return (
                  <button
                    key={item.id}
                    id={`sticky-nav-${item.id}`}
                    onClick={() => {
                      const targetUrl = item.url || item.externalUrl;
                      if (targetUrl && (item.linkType === 'url' || item.isExternal || targetUrl.startsWith('http') || targetUrl.startsWith('mailto:') || targetUrl.startsWith('tel:') || targetUrl.startsWith('/'))) {
                        if (item.openInNewTab || item.isExternal || targetUrl.startsWith('http')) {
                          window.open(targetUrl, '_blank', 'noopener,noreferrer');
                        } else if (targetUrl.startsWith('#')) {
                          onNavigate(targetUrl.replace('#', ''));
                        } else {
                          window.location.href = targetUrl;
                        }
                      } else {
                        onNavigate(item.sectionId || 'beranda');
                      }
                    }}
                    className={`relative flex flex-col items-center justify-center py-1 px-2 sm:px-3 rounded-xl transition-all ${
                      isActive
                        ? `${currentTheme.activeClass} font-bold scale-105 shadow-inner`
                        : 'text-emerald-100/85 hover:text-white hover:bg-emerald-800/40'
                    }`}
                  >
                    {/* Badge if enabled */}
                    {config.showBadges && item.badgeText && (
                      <span
                        className={`absolute -top-1 -right-1 text-[8px] font-bold px-1.5 py-0.2 rounded-full border shadow-2xs ${
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

                    <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isActive ? 'text-amber-300' : 'text-emerald-200'}`} />
                    {config.showLabels && (
                      <span className="text-[10px] sm:text-xs tracking-tight mt-0.5 whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Extension Buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 pl-1 border-l border-emerald-700/60">
              {/* Optional Quick Audio Toggle */}
              {config.showAudioButton && (
                <button
                  type="button"
                  onClick={onToggleAudio}
                  title="Nuansa Audio / Murottal"
                  className="p-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-amber-300 border border-emerald-700 transition-colors"
                >
                  <Volume2 className={`w-3.5 h-3.5 ${isAudioPlaying ? 'animate-bounce text-amber-300' : 'text-emerald-300'}`} />
                </button>
              )}

              {/* Admin Login / Panel / Profil Button */}
              {config.showAdminButton && (
                <button
                  type="button"
                  id="sticky-admin-login-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenAdmin();
                  }}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 shadow-sm cursor-pointer ${
                    isAdminLoggedIn
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-amber-200 border border-amber-400/60'
                      : 'bg-gradient-to-r from-emerald-900 to-emerald-950 hover:bg-emerald-850 text-amber-300 border border-amber-400/50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold ${
                    isAdminLoggedIn ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-800 border border-amber-400/60 text-amber-300'
                  }`}>
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="hidden sm:inline">{isAdminLoggedIn ? (config.adminButtonText || 'Akun Admin') : 'Profil & Login'}</span>
                  <span className="sm:hidden">{isAdminLoggedIn ? 'Admin' : 'Profil'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
