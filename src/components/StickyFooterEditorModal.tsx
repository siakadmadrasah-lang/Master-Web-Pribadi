import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  RotateCcw,
  Sliders,
  Palette,
  Layers,
  Sparkles,
  Home,
  BookOpen,
  Calendar,
  MessageSquare,
  User,
  Award,
  Heart,
  Phone,
  Mail,
  FileText,
  Camera,
  Compass,
  Bookmark,
  ShieldCheck,
  Share2,
  HelpCircle,
  Star,
  Video,
  Download,
  Globe,
  Moon,
  Sun,
  Clock,
  GraduationCap,
  Lock,
  UserCheck,
  Volume2,
  Settings,
  Link,
  ExternalLink,
  Server,
  Database,
  Monitor,
  Smartphone,
  Laptop
} from 'lucide-react';
import { StickyFooterConfig, StickyFooterItem } from '../types';
import { defaultStickyFooterConfig } from '../data/personalData';
import { AVAILABLE_ICONS, AVAILABLE_ICON_NAMES, AVAILABLE_SECTIONS, FOOTER_THEMES } from '../constants/footerThemes';
export { AVAILABLE_ICONS, AVAILABLE_ICON_NAMES, AVAILABLE_SECTIONS, FOOTER_THEMES };

interface StickyFooterEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: StickyFooterConfig;
  onSaveConfig: (config: StickyFooterConfig) => void;
}

export const StickyFooterEditorModal: React.FC<StickyFooterEditorModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSaveConfig,
}) => {
  const [config, setConfig] = useState<StickyFooterConfig>({ ...currentConfig });
  const [activeTab, setActiveTab] = useState<'items' | 'design' | 'actions' | 'templates'>('items');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // New item draft state
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemLinkType, setNewItemLinkType] = useState<'section' | 'url'>('section');
  const [newItemSection, setNewItemSection] = useState('beranda');
  const [newItemUrl, setNewItemUrl] = useState('');
  const [newItemOpenInNewTab, setNewItemOpenInNewTab] = useState(false);
  const [newItemIcon, setNewItemIcon] = useState('Sparkles');
  const [newItemBadge, setNewItemBadge] = useState('');
  const [newItemBadgeColor, setNewItemBadgeColor] = useState<'gold' | 'emerald' | 'rose' | 'blue' | 'purple'>('gold');

  if (!isOpen) return null;

  const notify = (msg: string) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...config.items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    setConfig({ ...config, items: newItems });
  };

  const handleToggleItemVisibility = (id: string) => {
    const newItems = config.items.map((item) =>
      item.id === id ? { ...item, visible: !item.visible } : item
    );
    setConfig({ ...config, items: newItems });
  };

  const handleDeleteItem = (id: string) => {
    if (config.items.length <= 1) {
      notify('Minimal harus ada 1 item menu!');
      return;
    }
    const newItems = config.items.filter((item) => item.id !== id);
    setConfig({ ...config, items: newItems });
    notify('Item menu berhasil dihapus.');
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemLabel.trim()) {
      notify('Nama label menu tidak boleh kosong.');
      return;
    }

    const newItem: StickyFooterItem = {
      id: `item-${Date.now()}`,
      label: newItemLabel.trim(),
      linkType: newItemLinkType,
      sectionId: newItemLinkType === 'section' ? newItemSection : 'kustom-url',
      url: newItemLinkType === 'url' ? newItemUrl.trim() : undefined,
      externalUrl: newItemLinkType === 'url' ? newItemUrl.trim() : undefined,
      isExternal: newItemLinkType === 'url' && (newItemUrl.startsWith('http') || newItemOpenInNewTab),
      openInNewTab: newItemOpenInNewTab,
      icon: newItemIcon,
      badgeText: newItemBadge.trim() || undefined,
      badgeColor: newItemBadgeColor,
      visible: true,
    };

    setConfig({
      ...config,
      items: [...config.items, newItem],
    });

    setNewItemLabel('');
    setNewItemUrl('');
    setNewItemBadge('');
    setShowAddForm(false);
    notify(`Item menu "${newItem.label}" berhasil ditambahkan!`);
  };

  const handleUpdateItem = (id: string, updates: Partial<StickyFooterItem>) => {
    const newItems = config.items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    setConfig({ ...config, items: newItems });
  };

  const handleApplyPresetTemplate = (templateName: string) => {
    let newItems: StickyFooterItem[] = [];
    if (templateName === 'standar') {
      newItems = [
        { id: 'item-1', label: 'Beranda', sectionId: 'beranda', icon: 'Home', visible: true },
        { id: 'item-2', label: 'Karya & Modul', sectionId: 'karya', icon: 'BookOpen', badgeText: 'Koleksi', badgeColor: 'gold', visible: true },
        { id: 'item-3', label: 'Agenda', sectionId: 'agenda', icon: 'Calendar', badgeText: 'Jadwal', badgeColor: 'emerald', visible: true },
        { id: 'item-4', label: 'Tasbih & Sholat', sectionId: 'fitur-islami', icon: 'Sparkles', badgeText: 'Live', badgeColor: 'rose', visible: true },
        { id: 'item-5', label: 'Silaturahmi', sectionId: 'kontak', icon: 'MessageSquare', visible: true },
      ];
    } else if (templateName === 'lengkap') {
      newItems = [
        { id: 'item-1', label: 'Beranda', sectionId: 'beranda', icon: 'Home', visible: true },
        { id: 'item-2', label: 'Profil', sectionId: 'profil', icon: 'User', visible: true },
        { id: 'item-3', label: 'Karya', sectionId: 'karya', icon: 'BookOpen', badgeText: 'Buku', badgeColor: 'gold', visible: true },
        { id: 'item-4', label: 'Agenda', sectionId: 'agenda', icon: 'Calendar', visible: true },
        { id: 'item-5', label: 'Tasbih', sectionId: 'fitur-islami', icon: 'Sparkles', badgeText: 'Doa', badgeColor: 'emerald', visible: true },
        { id: 'item-6', label: 'Galeri', sectionId: 'galeri', icon: 'Camera', visible: true },
        { id: 'item-7', label: 'Kontak', sectionId: 'kontak', icon: 'MessageSquare', visible: true },
      ];
    } else if (templateName === 'spiritual') {
      newItems = [
        { id: 'item-1', label: 'Beranda', sectionId: 'beranda', icon: 'Home', visible: true },
        { id: 'item-2', label: 'Kajian Turots', sectionId: 'karya', icon: 'Bookmark', badgeText: 'Kitab', badgeColor: 'gold', visible: true },
        { id: 'item-3', label: 'Jadwal & Doa', sectionId: 'fitur-islami', icon: 'Sparkles', badgeText: 'Sholat', badgeColor: 'rose', visible: true },
        { id: 'item-4', label: 'Hubungi Guru', sectionId: 'kontak', icon: 'Mail', visible: true },
      ];
    } else if (templateName === 'ringkas') {
      newItems = [
        { id: 'item-1', label: 'Beranda', sectionId: 'beranda', icon: 'Home', visible: true },
        { id: 'item-2', label: 'Karya', sectionId: 'karya', icon: 'BookOpen', visible: true },
        { id: 'item-3', label: 'Silaturahmi', sectionId: 'kontak', icon: 'MessageSquare', visible: true },
      ];
    }

    setConfig({ ...config, items: newItems });
    notify(`Template menu diterapkan!`);
  };

  const handleSave = () => {
    onSaveConfig(config);
    notify('Konfigurasi Sticky Footer berhasil disimpan!');
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleResetToDefault = () => {
    setConfig({ ...defaultStickyFooterConfig });
    notify('Pengaturan Sticky Footer dikembalikan ke default.');
  };

  // Find active theme object
  const currentThemeObj = FOOTER_THEMES.find((t) => t.id === config.theme) || FOOTER_THEMES[0];

  return (
    <div
      id="sticky-footer-editor-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-emerald-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
    >
      <div className="bg-[#faf8f5] rounded-3xl border-2 border-amber-500/50 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-[#1c2e24]">
        {/* Header Bar */}
        <div className="bg-[#064e3b] text-white px-6 py-4 border-b border-amber-500/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-amber-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Pengaturan & Kustomisasi Sticky Footer</span>
                <span className="text-[10px] bg-amber-500 text-emerald-950 font-extrabold px-2 py-0.5 rounded uppercase">
                  Full Editor
                </span>
              </h3>
              <p className="text-xs text-emerald-200 font-light">
                Kelola menu pintas bawah, tema warna islami, ikon, lencana, urutan tombol, dan fungsi panel admin.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-800/80 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Alert */}
        {successNotice && (
          <div className="bg-emerald-700 text-amber-200 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 border-b border-amber-400/40 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-amber-300" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Live Real-time Sticky Footer Preview Box */}
        <div className="bg-[#043327] p-4 sm:p-5 border-b border-emerald-800/80 text-white shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>Pratinjau Langsung Bilah Sticky Footer (Real-time Preview)</span>
            </span>
            <div className="flex items-center gap-2 flex-wrap text-[10px]">
              <span className="bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded border border-emerald-700 font-semibold">
                {config.enabled ? 'Global: Aktif' : 'Global: Nonaktif'}
              </span>
              <span
                className={`px-2 py-0.5 rounded border flex items-center gap-1 font-semibold ${
                  config.showOnDesktop !== false
                    ? 'bg-emerald-900/90 text-emerald-200 border-emerald-600'
                    : 'bg-rose-950/80 text-rose-300 border-rose-600'
                }`}
                title={config.showOnDesktop !== false ? 'Aktif di Komputer/Desktop' : 'Dinonaktifkan di Komputer/Desktop'}
              >
                <Monitor className="w-3 h-3" />
                <span>PC/Komputer: {config.showOnDesktop !== false ? 'Aktif' : 'Nonaktif'}</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded border flex items-center gap-1 font-semibold ${
                  config.showOnMobile !== false
                    ? 'bg-emerald-900/90 text-emerald-200 border-emerald-600'
                    : 'bg-rose-950/80 text-rose-300 border-rose-600'
                }`}
                title={config.showOnMobile !== false ? 'Aktif di Smartphone/HP' : 'Dinonaktifkan di Smartphone/HP'}
              >
                <Smartphone className="w-3 h-3" />
                <span>HP/Mobile: {config.showOnMobile !== false ? 'Aktif' : 'Nonaktif'}</span>
              </span>
            </div>
          </div>

          {/* Actual Footer Visual Simulation */}
          <div className="py-2 flex flex-col items-center">
            {config.allowCollapse && (
              <div className="px-3 py-0.5 rounded-t-lg bg-[#064e3b] text-amber-300 border-t border-x border-amber-500/40 text-[10px] font-semibold flex items-center gap-1 shadow-md mb-[-2px] z-10">
                <span>{config.collapseText || 'Menu Pintas Madrasah'}</span>
                <span className="text-[9px]">▼</span>
              </div>
            )}

            <div
              className={`w-full ${config.maxWidth} ${currentThemeObj.bgClass} backdrop-blur-md rounded-2xl border-2 shadow-2xl p-2 sm:p-2.5 flex items-center justify-between gap-1 sm:gap-2`}
            >
              {/* Visible Shortcuts */}
              <div className="flex items-center justify-around flex-1 gap-1 overflow-x-auto">
                {config.items.filter((it) => it.visible).map((item, idx) => {
                  const IconComp = AVAILABLE_ICONS[item.icon] || Sparkles;
                  const isFirst = idx === 0;

                  return (
                    <div
                      key={item.id}
                      className={`relative flex flex-col items-center justify-center py-1 px-2 sm:px-3 rounded-xl transition-all ${
                        isFirst ? currentThemeObj.activeClass + ' font-bold shadow-inner' : 'text-emerald-100/90 hover:bg-white/10'
                      }`}
                    >
                      {/* Badge if present */}
                      {config.showBadges && item.badgeText && (
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
                      {config.showLabels && (
                        <span className="text-[10px] sm:text-xs tracking-tight mt-0.5 whitespace-nowrap">
                          {item.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Optional Quick Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-emerald-700/60">
                {config.showAudioButton && (
                  <div className="p-1.5 rounded-lg bg-emerald-900/80 text-amber-300 text-[10px] flex items-center">
                    <Volume2 className="w-3.5 h-3.5" />
                  </div>
                )}

                {config.showQuickLogoButton && (
                  <div className="p-1.5 rounded-lg bg-emerald-900/80 text-amber-300 text-[10px] flex items-center">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                )}

                {config.showAdminButton && (
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-emerald-950 font-bold text-[11px] shadow-sm">
                    <Lock className="w-3 h-3" />
                    <span className="hidden sm:inline">{config.adminButtonText || 'Panel Admin'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-emerald-50/60 px-4 pt-2 shrink-0 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('items')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'items'
                ? 'bg-white text-emerald-900 border-t-2 border-x border-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-emerald-900 hover:bg-white/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Kelola Item & Tombol Menu ({config.items.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('design')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'design'
                ? 'bg-white text-emerald-900 border-t-2 border-x border-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-emerald-900 hover:bg-white/60'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>2. Tema Warna & Bentuk Bilah</span>
          </button>

          <button
            onClick={() => setActiveTab('actions')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'actions'
                ? 'bg-white text-emerald-900 border-t-2 border-x border-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-emerald-900 hover:bg-white/60'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>3. Tombol Admin & Opsi Lanjutan</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'templates'
                ? 'bg-white text-emerald-900 border-t-2 border-x border-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-emerald-900 hover:bg-white/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>4. Preset Template</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* ============================================================ */}
          {/* TAB 1: KELOLA ITEM MENU */}
          {/* ============================================================ */}
          {activeTab === 'items' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-[#064e3b]">
                    Daftar Tombol & Menu Pintas Sticky Footer
                  </h4>
                  <p className="text-xs text-gray-500">
                    Atur nama label, ikon, bagian tujuan website, lencana status, urutan posisi, dan visibilitas tombol.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddForm ? 'Tutup Form Tambah' : 'Tambah Tombol Menu'}</span>
                </button>
              </div>

              {/* Add New Item Form */}
              {showAddForm && (
                <form
                  onSubmit={handleAddItem}
                  className="p-4 sm:p-5 bg-emerald-50/80 rounded-2xl border-2 border-emerald-300 space-y-4 animate-fadeIn"
                >
                  <h5 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Tambah Item Tombol Menu Baru</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                        Nama Label Tombol *
                      </label>
                      <input
                        type="text"
                        required
                        value={newItemLabel}
                        onChange={(e) => setNewItemLabel(e.target.value)}
                        placeholder="Contoh: Galeri Santri / WhatsApp"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-700 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                        Jenis Tautan (Target) *
                      </label>
                      <select
                        value={newItemLinkType}
                        onChange={(e) => setNewItemLinkType(e.target.value as 'section' | 'url')}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-700 font-semibold text-emerald-950"
                      >
                        <option value="section">Bagian Halaman Website (#section)</option>
                        <option value="url">Kustom URL / Tautan Luar (https://...)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                        Pilihan Ikon Lucide *
                      </label>
                      <select
                        value={newItemIcon}
                        onChange={(e) => setNewItemIcon(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-700"
                      >
                        {AVAILABLE_ICON_NAMES.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Conditional Target Input */}
                  {newItemLinkType === 'section' ? (
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                        Pilih Bagian Halaman Tujuan Website *
                      </label>
                      <select
                        value={newItemSection}
                        onChange={(e) => setNewItemSection(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-700"
                      >
                        {AVAILABLE_SECTIONS.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.label} (#{sec.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-900 uppercase mb-1 flex items-center gap-1.5">
                          <Link className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Field URL / Tautan Kustom *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={newItemUrl}
                          onChange={(e) => setNewItemUrl(e.target.value)}
                          placeholder="https://wa.me/628123456789 atau https://kemenag.go.id atau /download"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-emerald-400 bg-white focus:ring-2 focus:ring-emerald-700 font-mono text-emerald-950"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">
                          Bisa berupa URL lengkap (https://...), tautan WhatsApp (https://wa.me/...), link email (mailto:...), nomor telepon (tel:...), atau URL relatif.
                        </p>
                      </div>

                      <label className="inline-flex items-center gap-2 text-xs text-gray-700 font-medium cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={newItemOpenInNewTab}
                          onChange={(e) => setNewItemOpenInNewTab(e.target.checked)}
                          className="rounded text-emerald-800 focus:ring-emerald-700"
                        />
                        <span className="flex items-center gap-1">
                          <ExternalLink className="w-3 h-3 text-emerald-700" />
                          <span>Buka tautan di tab baru (target="_blank")</span>
                        </span>
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
                        value={newItemBadge}
                        onChange={(e) => setNewItemBadge(e.target.value)}
                        placeholder="Contoh: Baru / 2026 / Live / WA"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                        Warna Lencana
                      </label>
                      <select
                        value={newItemBadgeColor}
                        onChange={(e) => setNewItemBadgeColor(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-700"
                      >
                        <option value="gold">Emas (Gold)</option>
                        <option value="emerald">Hijau (Emerald)</option>
                        <option value="rose">Merah/Mawar (Rose Alert)</option>
                        <option value="blue">Biru (Blue)</option>
                        <option value="purple">Ungu (Purple)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambahkan ke Menu</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Items List Table / Cards */}
              <div className="space-y-2.5">
                {config.items.map((item, index) => {
                  const IconComp = AVAILABLE_ICONS[item.icon] || Sparkles;
                  const isEditing = editingItemId === item.id;
                  const hasCustomUrl = item.linkType === 'url' || Boolean(item.url || item.externalUrl);
                  const displayUrl = item.url || item.externalUrl || '';

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
                        /* Inline Edit Form */
                        <div className="space-y-3 p-1">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                                Label Teks
                              </label>
                              <input
                                type="text"
                                value={item.label}
                                onChange={(e) => handleUpdateItem(item.id, { label: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 font-semibold"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                                Jenis Tautan
                              </label>
                              <select
                                value={item.linkType || (item.isExternal || item.externalUrl ? 'url' : 'section')}
                                onChange={(e) => {
                                  const val = e.target.value as 'section' | 'url';
                                  handleUpdateItem(item.id, {
                                    linkType: val,
                                    isExternal: val === 'url',
                                    sectionId: val === 'section' ? (item.sectionId !== 'kustom-url' ? item.sectionId : 'beranda') : 'kustom-url'
                                  });
                                }}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 font-medium"
                              >
                                <option value="section">Bagian Halaman (#section)</option>
                                <option value="url">Kustom URL (https://...)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                                Ikon
                              </label>
                              <select
                                value={item.icon}
                                onChange={(e) => handleUpdateItem(item.id, { icon: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300"
                              >
                                {AVAILABLE_ICON_NAMES.map((name) => (
                                  <option key={name} value={name}>
                                    {name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Link Specific Target / URL Field */}
                          {(item.linkType === 'url' || item.isExternal || Boolean(item.url || item.externalUrl)) ? (
                            <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2">
                              <div>
                                <label className="block text-[10px] font-bold text-emerald-950 uppercase mb-1 flex items-center gap-1">
                                  <Link className="w-3 h-3 text-emerald-700" />
                                  <span>Field URL / Tautan Kustom</span>
                                </label>
                                <input
                                  type="text"
                                  value={item.url || item.externalUrl || ''}
                                  onChange={(e) => handleUpdateItem(item.id, {
                                    url: e.target.value,
                                    externalUrl: e.target.value,
                                    isExternal: e.target.value.startsWith('http') || Boolean(item.openInNewTab)
                                  })}
                                  placeholder="https://wa.me/... atau https://... atau /download"
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-emerald-300 bg-white font-mono text-emerald-900"
                                />
                              </div>

                              <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.openInNewTab || item.isExternal)}
                                  onChange={(e) => handleUpdateItem(item.id, {
                                    openInNewTab: e.target.checked,
                                    isExternal: e.target.checked
                                  })}
                                  className="rounded text-emerald-800 focus:ring-emerald-700"
                                />
                                <span>Buka tautan URL ini di tab baru (_blank)</span>
                              </label>
                            </div>
                          ) : (
                            <div>
                              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                                Target Section
                              </label>
                              <select
                                value={item.sectionId}
                                onChange={(e) => handleUpdateItem(item.id, { sectionId: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300"
                              >
                                {AVAILABLE_SECTIONS.map((sec) => (
                                  <option key={sec.id} value={sec.id}>
                                    {sec.label} (#{sec.id})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                                Teks Badge
                              </label>
                              <input
                                type="text"
                                value={item.badgeText || ''}
                                onChange={(e) => handleUpdateItem(item.id, { badgeText: e.target.value || undefined })}
                                placeholder="Kosongkan jika tanpa badge"
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                                Warna Badge
                              </label>
                              <select
                                value={item.badgeColor || 'gold'}
                                onChange={(e) => handleUpdateItem(item.id, { badgeColor: e.target.value as any })}
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
                              onClick={() => setEditingItemId(null)}
                              className="px-3 py-1 rounded-lg bg-emerald-800 text-white text-xs font-bold"
                            >
                              Selesai Edit
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Normal View */
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
                              <div className="text-[11px] text-gray-500 font-medium flex items-center flex-wrap gap-1 mt-0.5">
                                {hasCustomUrl && displayUrl ? (
                                  <span className="flex items-center gap-1 text-emerald-800 font-mono bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    <Link className="w-2.5 h-2.5" />
                                    <span>URL: {displayUrl}</span>
                                    {(item.openInNewTab || item.isExternal) && (
                                      <ExternalLink className="w-2.5 h-2.5 text-emerald-600" />
                                    )}
                                  </span>
                                ) : (
                                  <span>
                                    Target: <span className="text-emerald-800 font-semibold">#{item.sectionId}</span>
                                  </span>
                                )}
                                <span>• Ikon: <span className="font-mono">{item.icon}</span></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Move Up */}
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveItem(index, 'up')}
                              title="Pindah ke Kiri/Atas"
                              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 text-gray-700"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>

                            {/* Move Down */}
                            <button
                              type="button"
                              disabled={index === config.items.length - 1}
                              onClick={() => handleMoveItem(index, 'down')}
                              title="Pindah ke Kanan/Bawah"
                              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 text-gray-700"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Toggle Visibility */}
                            <button
                              type="button"
                              onClick={() => handleToggleItemVisibility(item.id)}
                              title={item.visible ? 'Sembunyikan' : 'Tampilkan'}
                              className={`p-1.5 rounded-lg border text-xs font-semibold ${
                                item.visible
                                  ? 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                                  : 'border-gray-300 text-gray-500 bg-gray-100'
                              }`}
                            >
                              {item.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => setEditingItemId(item.id)}
                              className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                            >
                              Ubah
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
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

          {/* ============================================================ */}
          {/* TAB 2: TEMA WARNA & BENTUK BILAH */}
          {/* ============================================================ */}
          {activeTab === 'design' && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h4 className="text-sm font-bold text-[#064e3b]">
                  Pilihan Tema & Tata Letak Sticky Footer
                </h4>
                <p className="text-xs text-gray-500">
                  Sesuaikan warna background, aksen border, lebar maksimum, dan posisi bar navigasi bawah.
                </p>
              </div>

              {/* Theme Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {FOOTER_THEMES.map((th) => {
                  const isSelected = config.theme === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setConfig({ ...config, theme: th.id as any })}
                      className={`p-4 rounded-2xl border text-left transition-all relative ${
                        isSelected
                          ? 'border-amber-500 bg-emerald-50/80 shadow-md ring-2 ring-amber-400/60'
                          : 'border-gray-200 bg-white hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="w-4 h-4 rounded-full border border-white shadow-xs"
                          style={{ backgroundColor: th.accentColor }}
                        />
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

              {/* Layout Options */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4">
                <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Tata Letak & Posisi Bilah
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                      Gaya Penempatan (Position)
                    </label>
                    <select
                      value={config.position}
                      onChange={(e) => setConfig({ ...config, position: e.target.value as any })}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-700 font-semibold"
                    >
                      <option value="floating">Melayang Berjarak (Floating Island Bar)</option>
                      <option value="bottom">Rapat Dasar Layar Penuh (Docked Bottom)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                      Lebar Maksimal Bilah (Max Width)
                    </label>
                    <select
                      value={config.maxWidth}
                      onChange={(e) => setConfig({ ...config, maxWidth: e.target.value as any })}
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

                {/* Display Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-emerald-50/50">
                    <input
                      type="checkbox"
                      checked={config.showLabels}
                      onChange={(e) => setConfig({ ...config, showLabels: e.target.checked })}
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
                      checked={config.showBadges}
                      onChange={(e) => setConfig({ ...config, showBadges: e.target.checked })}
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

          {/* ============================================================ */}
          {/* TAB 3: TOMBOL ADMIN & OPSI LANJUTAN */}
          {/* ============================================================ */}
          {activeTab === 'actions' && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h4 className="text-sm font-bold text-[#064e3b]">
                  Konfigurasi Tombol Khusus & Tombol Panel Admin
                </h4>
                <p className="text-xs text-gray-500">
                  Atur tombol login admin langsung di sticky footer, tombol upload logo, tombol murottal audio, dan fungsi ciut/buka (*collapse*).
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4">
                {/* Admin Button Config */}
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.showAdminButton}
                        onChange={(e) => setConfig({ ...config, showAdminButton: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
                      />
                      <span className="text-xs font-bold text-emerald-950">
                        Tampilkan Tombol Akses Panel Admin di Sticky Footer
                      </span>
                    </label>
                  </div>

                  {config.showAdminButton && (
                    <div className="pl-6 space-y-2">
                      <label className="block text-[11px] font-bold text-gray-700 uppercase">
                        Teks Tombol Admin
                      </label>
                      <input
                        type="text"
                        value={config.adminButtonText}
                        onChange={(e) => setConfig({ ...config, adminButtonText: e.target.value })}
                        placeholder="Panel Admin"
                        className="w-full sm:w-72 px-3 py-2 text-xs rounded-xl border border-gray-300 font-semibold"
                      />
                    </div>
                  )}
                </div>

                {/* Additional Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-emerald-50/50">
                    <input
                      type="checkbox"
                      checked={config.showQuickLogoButton}
                      onChange={(e) => setConfig({ ...config, showQuickLogoButton: e.target.checked })}
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
                      checked={config.showAudioButton}
                      onChange={(e) => setConfig({ ...config, showAudioButton: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">Tombol Nuansa Murottal / Audio</span>
                      <span className="text-[10px] text-gray-500">Ikon audio langsung pada bilah menu</span>
                    </div>
                  </label>
                </div>

                {/* Collapse Pill Options */}
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.allowCollapse}
                      onChange={(e) => setConfig({ ...config, allowCollapse: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
                    />
                    <span className="text-xs font-bold text-gray-900">
                      Aktifkan Tombol Minimize / Collapse ("Menu Pintas Madrasah")
                    </span>
                  </label>

                  {config.allowCollapse && (
                    <div className="pl-6 space-y-2">
                      <label className="block text-[11px] font-bold text-gray-700 uppercase">
                        Teks Tab Minimizer
                      </label>
                      <input
                        type="text"
                        value={config.collapseText}
                        onChange={(e) => setConfig({ ...config, collapseText: e.target.value })}
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
                        config.showOnDesktop !== false
                          ? 'bg-white border-emerald-400 shadow-xs ring-1 ring-emerald-300/60'
                          : 'bg-gray-100/90 border-gray-300 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-xl ${config.showOnDesktop !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-500'}`}>
                            <Monitor className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-gray-900 block">Perangkat Komputer / PC / Laptop</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                              config.showOnDesktop !== false
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {config.showOnDesktop !== false ? '✓ Aktif di Komputer' : '✕ Dinonaktifkan'}
                            </span>
                          </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                          <input
                            type="checkbox"
                            checked={config.showOnDesktop !== false}
                            onChange={(e) => setConfig({ ...config, showOnDesktop: e.target.checked })}
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
                        config.showOnMobile !== false
                          ? 'bg-white border-emerald-400 shadow-xs ring-1 ring-emerald-300/60'
                          : 'bg-gray-100/90 border-gray-300 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-xl ${config.showOnMobile !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-500'}`}>
                            <Smartphone className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-gray-900 block">Perangkat Smartphone / HP</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                              config.showOnMobile !== false
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {config.showOnMobile !== false ? '✓ Aktif di HP' : '✕ Dinonaktifkan'}
                            </span>
                          </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                          <input
                            type="checkbox"
                            checked={config.showOnMobile !== false}
                            onChange={(e) => setConfig({ ...config, showOnMobile: e.target.checked })}
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

                {/* Master Enable/Disable */}
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">Status Bilah Sticky Footer Global</span>
                    <span className="text-[11px] text-amber-800">
                      Jika dinonaktifkan, Sticky Footer disembunyikan total di semua perangkat.
                    </span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-800"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: PRESET TEMPLATES */}
          {/* ============================================================ */}
          {activeTab === 'templates' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h4 className="text-sm font-bold text-[#064e3b]">
                  Pilihan Preset Template Susunan Menu
                </h4>
                <p className="text-xs text-gray-500">
                  Gunakan susunan menu siap pakai yang telah disesuaikan untuk berbagai kebutuhan madrasah dan portofolio akademis.
                </p>
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
                      onClick={() => handleApplyPresetTemplate(tpl.id)}
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

        {/* Footer Actions */}
        <div className="bg-gray-100 px-6 py-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kembalikan Default</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              id="apply-save-sticky-footer-btn"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-800 hover:bg-emerald-700 shadow-md flex items-center gap-2 transition-all active:scale-95 border border-amber-400/40"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-300" />
              <span>Simpan & Terapkan Sticky Footer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
