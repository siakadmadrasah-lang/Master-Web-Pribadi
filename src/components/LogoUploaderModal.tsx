import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Layers,
  Sliders,
  Eye,
  Trash2,
  FileCheck,
  Shield,
  Circle,
  Square,
  Bookmark,
  Check,
  Globe,
  LayoutTemplate,
  Wand2,
  SunMedium,
  RefreshCw
} from 'lucide-react';
import { HeaderLogoConfig } from '../types';
import { defaultHeaderLogo } from '../data/personalData';
import { removeWhiteBackground, generateFaviconDataUrl, cropCircleAndMaximizeEmblem, compressAndResizeImage } from '../utils/imageProcessors';

interface LogoUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: HeaderLogoConfig;
  onSaveConfig: (newConfig: HeaderLogoConfig) => void;
  initialTab?: 'upload' | 'preset' | 'monogram' | 'text' | 'favicon_footer';
}

export const presetEmblems = [
  {
    id: 'emblem-crescent-quill',
    name: 'Bulan Bintang & Qalam Emas',
    description: 'Simbol pencerahan ilmu syar\'i dan tradisi literasi Islam.',
    iconSvg: (
      <svg className="w-6 h-6 text-amber-300" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.85 0 3.58-.5 5.08-1.38-4.14-.94-7.08-4.7-7.08-9.12 0-3.32 1.67-6.26 4.2-7.98C13.43 2.5 12.73 2 12 2zm6 1l1.24 2.51 2.76.4-2 1.95.47 2.75L18 9.31l-2.47 1.3.47-2.75-2-1.95 2.76-.4L18 3z" />
      </svg>
    ),
    previewGradient: 'from-emerald-900 to-emerald-950',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="20" fill="%23064e3b"/><circle cx="50" cy="50" r="38" fill="none" stroke="%23f59e0b" stroke-width="2.5"/><path d="M48 24 C34 28 25 40 25 54 C25 68 36 80 50 80 C58 80 66 75 70 68 C56 68 45 57 45 44 C45 35 49 28 56 24 C53 23 50 24 48 24 Z" fill="%23fbbf24"/><polygon points="68,26 71,33 78,34 73,39 74,46 68,42 62,46 63,39 58,34 65,33" fill="%23f59e0b"/></svg>'
  },
  {
    id: 'emblem-holy-book-dome',
    name: 'Al-Qur\'an & Kubah Keilmuan',
    description: 'Lambang komitmen mendalami wahyu dan tradisi madrasah.',
    iconSvg: (
      <svg className="w-6 h-6 text-amber-300" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3c-4.42 0-8 3.58-8 8v1h16v-1c0-4.42-3.58-8-8-8zm-7 11v6c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-6H5zm3 3h8v2H8v-2z" />
      </svg>
    ),
    previewGradient: 'from-amber-700 to-emerald-900',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="20" fill="%23043327"/><path d="M50 18 C36 28 32 40 32 50 L68 50 C68 40 64 28 50 18 Z" fill="%23f59e0b"/><rect x="28" y="52" width="44" height="6" rx="2" fill="%23fbbf24"/><path d="M30 62 L50 67 L70 62 L70 78 L50 83 L30 78 Z" fill="%2310b981" stroke="%23fbbf24" stroke-width="2"/><line x1="50" y1="67" x2="50" y2="83" stroke="%23fbbf24" stroke-width="2"/></svg>'
  },
  {
    id: 'emblem-octagram-andalusia',
    name: 'Bintang Segi Delapan Andalusia',
    description: 'Motif geometris khas kejayaan peradaban sains dan filsafat Islam.',
    iconSvg: (
      <svg className="w-6 h-6 text-amber-300" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l2.6 4.4L19.4 5l-1.4 4.8 4.4 2.6-4.4 2.6 1.4 4.8-4.8-1.4L12 22l-2.6-4.4L4.6 19l1.4-4.8L1.6 12l4.4-2.6L4.6 5l4.8 1.4L12 2z" />
      </svg>
    ),
    previewGradient: 'from-emerald-800 to-teal-950',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="20" fill="%23064e3b"/><rect x="25" y="25" width="50" height="50" fill="none" stroke="%23f59e0b" stroke-width="3"/><rect x="25" y="25" width="50" height="50" transform="rotate(45 50 50)" fill="none" stroke="%23fbbf24" stroke-width="3"/><circle cx="50" cy="50" r="14" fill="%23d97706"/><circle cx="50" cy="50" r="8" fill="%23064e3b"/></svg>'
  },
  {
    id: 'emblem-madrasah-crest',
    name: 'Sayap Pena & Buku Madrasah',
    description: 'Lambang pendidikan dan pembinaan generasi santri unggul.',
    iconSvg: (
      <svg className="w-6 h-6 text-amber-300" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 4.5c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 13c-2.33 0-4.32-1.2-5.46-3 .03-1.82 3.64-2.82 5.46-2.82s5.43 1 5.46 2.82c-1.14 1.8-3.13 3-5.46 3z" />
      </svg>
    ),
    previewGradient: 'from-amber-600 to-amber-900',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="20" fill="%23043327"/><path d="M50 16 L78 28 L78 52 C78 70 66 83 50 88 C34 83 22 70 22 52 L22 28 Z" fill="none" stroke="%23fbbf24" stroke-width="3"/><path d="M34 46 Q50 40 66 46 L66 64 Q50 58 34 64 Z" fill="%23f59e0b"/><line x1="50" y1="41" x2="50" y2="62" stroke="%23064e3b" stroke-width="2.5"/><circle cx="50" cy="33" r="4" fill="%23fbbf24"/></svg>'
  }
];

export const LogoUploaderModal: React.FC<LogoUploaderModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSaveConfig,
  initialTab = 'upload',
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'preset' | 'monogram' | 'text' | 'favicon_footer'>(initialTab);
  const [config, setConfig] = useState<HeaderLogoConfig>({ ...currentConfig });
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessingTransparency, setIsProcessingTransparency] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const footerLogoInputRef = useRef<HTMLInputElement>(null);
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setConfig({ ...currentConfig });
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Format berkas tidak didukung. Silakan gunakan format PNG, JPG, WEBP, atau SVG.');
      return;
    }

    // Validate file size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Ukuran berkas terlalu besar. Maksimal 15 MB.');
      return;
    }

    try {
      // Compress and resize client-side down to max 800px for instant preview & sub-second upload
      const optimizedDataUrl = await compressAndResizeImage(file, 800, 0.9);
      if (!optimizedDataUrl) {
        setUploadError('Gagal memproses gambar.');
        return;
      }

      setConfig((prev) => ({
        ...prev,
        type: 'custom_image',
        customImageUrl: optimizedDataUrl,
      }));
      showNotification('Foto/Logo dimuat.');

      // Upload in background to persist as static file
      fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: optimizedDataUrl, type: 'logo', filename: file.name })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.url) {
            setConfig((prev) => ({
              ...prev,
              type: 'custom_image',
              customImageUrl: data.url,
            }));
          }
        })
        .catch((err) => {
          console.warn('Background upload notice:', err);
        });
    } catch {
      setUploadError('Gagal membaca berkas gambar. Silakan coba berkas lain.');
    }
  };

  // Upload Favicon Handler
  const handleFaviconUpload = async (file: File) => {
    setUploadError(null);
    const validTypes = ['image/x-icon', 'image/vnd.microsoft.icon', 'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.ico')) {
      setUploadError('Format favicon tidak didukung. Silakan gunakan file .ico, .png, .svg, atau .webp.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Ukuran berkas favicon terlalu besar. Maksimal 10 MB.');
      return;
    }

    try {
      const optimized = await compressAndResizeImage(file, 256, 0.9);
      if (optimized) {
        setConfig((prev) => ({
          ...prev,
          faviconUrl: optimized,
        }));
        showNotification('Favicon berhasil dimuat.');

        fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: optimized, type: 'favicon', filename: file.name })
        })
          .then((res) => res.json())
          .then((data) => {
            if (data && data.url) {
              setConfig((prev) => ({
                ...prev,
                faviconUrl: data.url,
              }));
            }
          })
          .catch((e) => console.warn('Favicon upload fallback:', e));
      }
    } catch {
      setUploadError('Gagal membaca berkas favicon.');
    }
  };

  // Upload Footer Logo Handler
  const handleFooterLogoUpload = async (file: File) => {
    setUploadError(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Format berkas tidak didukung. Gunakan PNG, JPG, WEBP, atau SVG.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Ukuran berkas terlalu besar. Maksimal 15 MB.');
      return;
    }

    try {
      const optimized = await compressAndResizeImage(file, 800, 0.9);
      if (optimized) {
        setConfig((prev) => ({
          ...prev,
          footerLogoType: 'custom',
          footerLogoUrl: optimized,
          footerCustomImageUrl: optimized,
        }));
        showNotification('Logo footer dimuat.');

        fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: optimized, type: 'footer_logo', filename: file.name })
        })
          .then((res) => res.json())
          .then((data) => {
            if (data && data.url) {
              setConfig((prev) => ({
                ...prev,
                footerLogoType: 'custom',
                footerLogoUrl: data.url,
                footerCustomImageUrl: data.url,
              }));
            }
          })
          .catch((e) => console.warn('Footer logo upload notice:', e));
      }
    } catch {
      setUploadError('Gagal membaca berkas logo footer.');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleSelectPreset = (preset: typeof presetEmblems[0]) => {
    setConfig((prev) => ({
      ...prev,
      type: 'preset_emblem',
      customImageUrl: preset.dataUrl,
    }));
    showNotification(`Emblem "${preset.name}" dipilih!`);
  };

  const handleResetToDefault = () => {
    setConfig({ ...defaultHeaderLogo });
    showNotification('Logo dan teks header dikembalikan ke pengaturan awal.');
  };

  const handleCropCircleAndMaximize = async () => {
    const targetUrl = config.customImageUrl;
    if (!targetUrl) return;
    setIsProcessingTransparency(true);
    try {
      const cropped = await cropCircleAndMaximizeEmblem(targetUrl, 1.15);
      setConfig((prev) => ({
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
      showNotification('✨ Kotak putih/catur berhasil dihilangkan! Logo dipotong bulat & diperbesar maksimal!');
    } catch (err) {
      console.error('Failed to crop circle:', err);
      showNotification('Gagal memotong bulat logo.');
    } finally {
      setIsProcessingTransparency(false);
    }
  };

  const handleMakeHeaderLogoTransparent = async () => {
    if (!config.customImageUrl) return;
    setIsProcessingTransparency(true);
    try {
      const transparentDataUrl = await removeWhiteBackground(config.customImageUrl, 220);
      setConfig((prev) => ({
        ...prev,
        customImageUrl: transparentDataUrl,
        shape: 'transparent',
        backgroundColor: 'transparent',
        blendMode: 'normal',
      }));
      showNotification('✨ Latar belakang putih berhasil dihilangkan! Logo kini transparan dan tetap cerah tajam.');
    } catch (err) {
      console.error('Failed to process transparency:', err);
      showNotification('Gagal memproses transparansi gambar.');
    } finally {
      setIsProcessingTransparency(false);
    }
  };

  const handleMakeFooterLogoTransparent = async () => {
    const targetUrl = config.footerLogoUrl || config.customImageUrl;
    if (!targetUrl) return;
    setIsProcessingTransparency(true);
    try {
      const transparentDataUrl = await removeWhiteBackground(targetUrl, 220);
      setConfig((prev) => ({
        ...prev,
        footerLogoType: 'custom',
        footerLogoUrl: transparentDataUrl,
        footerBlendMode: 'normal',
      }));
      showNotification('✨ Logo footer berhasil dibuat transparan & jernih cerah!');
    } catch (err) {
      console.error('Failed to process footer transparency:', err);
      showNotification('Gagal memproses transparansi logo footer.');
    } finally {
      setIsProcessingTransparency(false);
    }
  };

  const handleGenerateFaviconFromLogo = async () => {
    const targetUrl = config.customImageUrl || config.faviconUrl || '/og-image.jpg';
    setIsProcessingTransparency(true);
    try {
      const faviconDataUrl = await generateFaviconDataUrl(targetUrl, 64);
      setConfig((prev) => ({
        ...prev,
        faviconUrl: faviconDataUrl,
      }));
      showNotification('✨ Favicon 64x64 transparan berhasil dibuat dan dipasang!');
    } catch (err) {
      console.error('Failed to generate favicon:', err);
      showNotification('Gagal membuat favicon.');
    } finally {
      setIsProcessingTransparency(false);
    }
  };

  const handleSaveAndApply = async () => {
    setIsSaving(true);
    showNotification('Menyimpan logo ke server...');
    try {
      const finalConfig = { ...config };

      // Ensure any direct base64 / data URIs are converted in parallel
      const uploadTasks: Promise<void>[] = [];

      if (finalConfig.customImageUrl && (finalConfig.customImageUrl.startsWith('data:image/') || finalConfig.customImageUrl.startsWith('data:image/svg+xml') || finalConfig.customImageUrl.startsWith('<svg'))) {
        uploadTasks.push(
          fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: finalConfig.customImageUrl, type: 'logo', filename: 'logo.png' })
          })
            .then((r) => r.json())
            .then((d) => {
              if (d && d.url) {
                finalConfig.customImageUrl = d.url;
              }
            })
            .catch(() => {})
        );
      }

      if (finalConfig.faviconUrl && (finalConfig.faviconUrl.startsWith('data:image/') || finalConfig.faviconUrl.startsWith('data:image/svg+xml') || finalConfig.faviconUrl.startsWith('<svg'))) {
        uploadTasks.push(
          fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: finalConfig.faviconUrl, type: 'favicon', filename: 'favicon.png' })
          })
            .then((r) => r.json())
            .then((d) => {
              if (d && d.url) {
                finalConfig.faviconUrl = d.url;
              }
            })
            .catch(() => {})
        );
      }

      if (finalConfig.footerCustomImageUrl && (finalConfig.footerCustomImageUrl.startsWith('data:image/') || finalConfig.footerCustomImageUrl.startsWith('data:image/svg+xml') || finalConfig.footerCustomImageUrl.startsWith('<svg'))) {
        uploadTasks.push(
          fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: finalConfig.footerCustomImageUrl, type: 'footer_logo', filename: 'footer_logo.png' })
          })
            .then((r) => r.json())
            .then((d) => {
              if (d && d.url) {
                finalConfig.footerCustomImageUrl = d.url;
              }
            })
            .catch(() => {})
        );
      }

      if (finalConfig.footerLogoUrl && (finalConfig.footerLogoUrl.startsWith('data:image/') || finalConfig.footerLogoUrl.startsWith('data:image/svg+xml') || finalConfig.footerLogoUrl.startsWith('<svg'))) {
        uploadTasks.push(
          fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: finalConfig.footerLogoUrl, type: 'footer_logo', filename: 'footer_logo.png' })
          })
            .then((r) => r.json())
            .then((d) => {
              if (d && d.url) {
                finalConfig.footerLogoUrl = d.url;
              }
            })
            .catch(() => {})
        );
      }

      if (uploadTasks.length > 0) {
        await Promise.all(uploadTasks);
      }

      setConfig(finalConfig);

      if (onSaveConfig) {
        await onSaveConfig(finalConfig);
      }

      showNotification('✅ Logo header berhasil disimpan dan diterapkan!');
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 300);
    } catch (err) {
      console.error('Error saving logo config:', err);
      showNotification('Gagal menyimpan logo. Silakan coba lagi.');
      setIsSaving(false);
    }
  };

  // Render the logo icon based on current draft config
  const renderDraftLogoIcon = (sizeClass = 'w-14 h-14') => {
    const size = config.size || 'large';
    const isTransparent = config.shape === 'transparent' || config.backgroundColor === 'transparent';
    const fitMode = config.fitMode || 'contain';

    const actualSizeClass = size === 'compact'
      ? 'w-10 h-10'
      : size === 'normal'
      ? 'w-12 h-12'
      : size === 'extralarge'
      ? 'w-16 h-16 sm:w-18 sm:h-18'
      : 'w-14 h-14';

    const isGoldGlow = config.borderStyle === 'gold' || !config.borderStyle;

    const shapeClass = isTransparent
      ? 'rounded-full bg-transparent border-0 shadow-none'
      : 'rounded-full';

    const goldenGlowFrameClass = isGoldGlow && !isTransparent
      ? 'border-[2.5px] border-amber-300 ring-2 ring-amber-500/80 ring-offset-1 ring-offset-emerald-950 shadow-[0_0_15px_rgba(251,191,36,0.75),0_0_30px_rgba(245,158,11,0.35)]'
      : config.borderStyle === 'emerald'
      ? 'border-2 border-emerald-400 shadow-md ring-1 ring-emerald-300/40'
      : 'border border-white/20';

    const bgClass = isTransparent
      ? 'bg-transparent'
      : config.backgroundColor === 'white'
      ? 'bg-white'
      : config.backgroundColor === 'transparent'
      ? 'bg-transparent'
      : 'bg-emerald-950';

    const blendStyle: React.CSSProperties = {
      mixBlendMode: config.blendMode === 'screen'
        ? 'screen'
        : config.blendMode === 'multiply'
        ? 'multiply'
        : 'normal',
    };

    if (config.type === 'custom_image' && config.customImageUrl) {
      return (
        <div
          className={`${actualSizeClass} ${shapeClass} ${goldenGlowFrameClass} ${bgClass} overflow-hidden flex items-center justify-center shrink-0 shadow-md relative p-0.5`}
          style={{ isolation: 'isolate' }}
        >
          <div className="w-full h-full overflow-hidden flex items-center justify-center rounded-full relative">
            <img
              src={config.customImageUrl}
              alt="Custom Header Logo"
              style={blendStyle}
              className={`w-full h-full ${fitMode === 'contain' ? 'object-contain p-0.5' : 'object-cover'} pointer-events-none transition-transform duration-200 rounded-full`}
            />
          </div>
          {isGoldGlow && !isTransparent && (
            <div className="absolute inset-0 rounded-full pointer-events-none border border-amber-200/40 shadow-inner" />
          )}
        </div>
      );
    }

    if (config.type === 'preset_emblem' && config.customImageUrl) {
      return (
        <div
          className={`${actualSizeClass} ${shapeClass} ${goldenGlowFrameClass} ${bgClass} overflow-hidden flex items-center justify-center shrink-0 shadow-md relative p-0.5`}
          style={{ isolation: 'isolate' }}
        >
          <div className="w-full h-full overflow-hidden flex items-center justify-center rounded-full relative">
            <img
              src={config.customImageUrl}
              alt="Preset Emblem Logo"
              style={blendStyle}
              className="w-full h-full object-contain pointer-events-none transition-transform duration-200 rounded-full p-0.5"
            />
          </div>
          {isGoldGlow && !isTransparent && (
            <div className="absolute inset-0 rounded-full pointer-events-none border border-amber-200/40 shadow-inner" />
          )}
        </div>
      );
    }

    // Default monogram
    return (
      <div
        className={`${actualSizeClass} rounded-full ${goldenGlowFrameClass} bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center text-emerald-950 font-bold text-lg font-cinzel shadow-inner shrink-0`}
      >
        {config.monogramText || 'JM'}
      </div>
    );
  };

  return (
    <div
      id="logo-uploader-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-emerald-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
    >
      <div className="bg-[#faf8f5] rounded-3xl border-2 border-amber-500/50 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-[#1c2e24]">
        {/* Header Bar */}
        <div className="bg-[#064e3b] text-white px-6 py-4 border-b border-amber-500/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-amber-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Pengaturan & Upload Logo Header
              </h3>
              <p className="text-xs text-emerald-200 font-light">
                Kustomisasi lambang madrasah, foto logo, monogram, serta teks identitas bilah navigasi.
              </p>
            </div>
          </div>

          <button
            id="close-logo-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-800/80 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Toast */}
        {successMessage && (
          <div className="bg-emerald-700 text-amber-200 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 border-b border-amber-400/40">
            <CheckCircle2 className="w-4 h-4 text-amber-300" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Live Preview Box */}
        <div className="bg-[#043327] p-4 sm:p-5 border-b border-emerald-800/80 text-white shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>Pratinjau Langsung Bilah Header (Live Navbar Preview)</span>
            </span>
            <span className="text-[10px] bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded border border-emerald-700">
              Tampilan Real-Time
            </span>
          </div>

          <div className="bg-[#064e3b] p-3 rounded-2xl border border-amber-500/30 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-3">
              {renderDraftLogoIcon('w-10 h-10 sm:w-11 sm:h-11')}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm sm:text-base tracking-wide">
                    {config.brandName || 'Jaenal Maskun'}
                  </span>
                  {config.showBadge && (
                    <span className="text-[9px] sm:text-[10px] uppercase font-semibold bg-emerald-800 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                      {config.badgeText || 'Madrasah'}
                    </span>
                  )}
                </div>
                {config.showTagline && (
                  <p className="text-[11px] sm:text-xs text-emerald-200 font-light truncate max-w-[240px] sm:max-w-md">
                    {config.taglineText || 'Pendidik & Inovator Kurikulum Islam'}
                  </p>
                )}
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-200/80">
              <span className="px-2 py-1 rounded bg-emerald-800/60">Beranda</span>
              <span className="px-2 py-1 rounded bg-emerald-800/60">Karya</span>
              <span className="px-2 py-1 rounded bg-emerald-800/60">Kontak</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-emerald-50/50 px-4 pt-2 shrink-0 overflow-x-auto gap-1">
          <button
            id="tab-logo-upload"
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'upload'
                ? 'bg-white text-emerald-900 border-t-2 border-x border-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-emerald-900 hover:bg-white/60'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>1. Unggah Berkas Logo</span>
          </button>

          <button
            id="tab-logo-preset"
            onClick={() => setActiveTab('preset')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'preset'
                ? 'bg-white text-emerald-900 border-t-2 border-x border-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-emerald-900 hover:bg-white/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. Lambang Islami Preset</span>
          </button>

          <button
            id="tab-logo-monogram"
            onClick={() => setActiveTab('monogram')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'monogram'
                ? 'bg-white text-emerald-900 border-t-2 border-x border-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-emerald-900 hover:bg-white/60'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>3. Monogram & Bingkai Bulat</span>
          </button>

          <button
            id="tab-logo-text"
            onClick={() => setActiveTab('text')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'text'
                ? 'bg-white text-emerald-900 border-t-2 border-x border-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-emerald-900 hover:bg-white/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>4. Judul & Sub Judul Header</span>
          </button>

          <button
            id="tab-logo-favicon-footer"
            onClick={() => setActiveTab('favicon_footer')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'favicon_footer'
                ? 'bg-white text-emerald-900 border-t-2 border-x border-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-emerald-900 hover:bg-white/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>5. Favicon & Logo Footer</span>
            <span className="px-1.5 py-0.2 bg-amber-400 text-emerald-950 text-[9px] font-extrabold rounded-full">
              Baru
            </span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* ============================================================ */}
          {/* TAB 1: UPLOAD BERKAS GAMBAR */}
          {/* ============================================================ */}
          {activeTab === 'upload' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#064e3b]">
                    Unggah Berkas Gambar / Lambang Pribadi
                  </h4>
                  <p className="text-xs text-gray-500">
                    Mendukung format PNG, JPG, SVG, atau WEBP (Maksimal 4MB). Disarankan berlatar transparan.
                  </p>
                </div>

                {config.type === 'custom_image' && config.customImageUrl && (
                  <button
                    onClick={() => {
                      setConfig((prev) => ({ ...prev, customImageUrl: undefined, type: 'monogram' }));
                      showNotification('Gambar kustom dihapus.');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold flex items-center gap-1 border border-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Gambar</span>
                  </button>
                )}
              </div>

              {/* Error Box */}
              {uploadError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200 flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div
                id="logo-drag-drop-zone"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-emerald-600 bg-emerald-50 scale-[1.01]'
                    : 'border-emerald-300/80 bg-white hover:bg-emerald-50/40 hover:border-emerald-500'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  id="logo-file-input"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml, image/gif"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center border border-emerald-200 shadow-xs">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-950">
                      Tarik & Letakkan Berkas Logo ke Sini, atau <span className="text-emerald-700 underline">Klik untuk Memilih</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Rekomendasi rasio 1:1 (persegi) dengan resolusi minimal 200x200 pixel.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                    <span className="bg-gray-100 px-2 py-0.5 rounded">PNG</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded">JPG</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded">SVG</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded">WEBP</span>
                  </div>
                </div>
              </div>

              {/* Uploaded image active confirmation & Transparency Controls */}
              {config.type === 'custom_image' && config.customImageUrl && (
                <div className="space-y-3">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl border border-emerald-300 bg-white overflow-hidden p-1 shrink-0">
                        <img src={config.customImageUrl} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          <span>Gambar Kustom Sedang Aktif</span>
                        </p>
                        <p className="text-[11px] text-gray-600">
                          Gambar siap dipasang di bilah navigasi website.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      Ganti Berkas
                    </button>
                  </div>

                  {/* Anti-Contrast, Circle Crop & Transparency Toolkit */}
                  <div className="p-4 bg-gradient-to-br from-emerald-900/15 via-amber-950/10 to-emerald-900/10 rounded-2xl border-2 border-amber-400/70 space-y-3.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-500 text-emerald-950 font-bold">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-extrabold text-emerald-950">
                            Fitur Cepat: Hilangkan Kotak Putih/Catur & Maksimalkan Logo
                          </h5>
                          <p className="text-[11px] text-emerald-900">
                            Potong bulat presisi, bersihkan latar belakang kotak catur/putih, dan perbesar logo agar memenuhi frame dengan jelas.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Prominent 1-Click Circle Crop & Maximize Button */}
                    <button
                      type="button"
                      disabled={isProcessingTransparency}
                      onClick={handleCropCircleAndMaximize}
                      className="w-full p-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-emerald-950 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer border border-amber-300"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-950 shrink-0 animate-pulse" />
                      <span>{isProcessingTransparency ? 'Sedang Memproses Potongan Bulat & Memaksimalkan...' : '✨ 1-Klik Potong Bulat & Maksimalkan Ukuran (Rekomendasi Utama)'}</span>
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isProcessingTransparency}
                        onClick={handleMakeHeaderLogoTransparent}
                        className="p-2.5 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>{isProcessingTransparency ? 'Memproses...' : '🪄 Hapus Background Putih Saja'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setConfig((prev) => ({
                            ...prev,
                            shape: 'circle',
                            fitMode: 'cover',
                            backgroundColor: 'transparent',
                            blendMode: 'normal',
                          }));
                          showNotification('Mode Bingkai Lingkaran Emas Bulat Otomatis diaktifkan!');
                        }}
                        className="p-2.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Circle className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>Pasang Bingkai Lingkaran Emas</span>
                      </button>
                    </div>

                    {/* Blend Mode Selector */}
                    <div className="pt-2 border-t border-emerald-200/60">
                      <label className="block text-[11px] font-bold text-emerald-950 uppercase tracking-wider mb-1.5">
                        Pilihan Mode Tampilan Gambar:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {[
                          { id: 'normal', label: '1. Normal Cerah (Rekomendasi)', desc: 'Warna asli, tajam & tidak gelap' },
                          { id: 'screen', label: '2. Screen / Bersinar', desc: 'Mencerahkan logo gelap' },
                          { id: 'multiply', label: '3. Multiply (Tembus Putih)', desc: 'Khusus gambar dasar putih pekat' },
                        ].map((bm) => {
                          const isSel = (config.blendMode || 'normal') === bm.id;
                          return (
                            <button
                              key={bm.id}
                              type="button"
                              onClick={() => setConfig({ ...config, blendMode: bm.id as any })}
                              className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-emerald-800 text-amber-300 border-amber-400 font-bold shadow-xs'
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50'
                              }`}
                            >
                              <div className="text-[11px]">{bm.label}</div>
                              <div className="text-[9px] opacity-75">{bm.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: PRESET EMBLEM ISLAMI */}
          {/* ============================================================ */}
          {activeTab === 'preset' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h4 className="text-sm font-bold text-[#064e3b]">
                  Pilihan Lambang Islami Madrasah
                </h4>
                <p className="text-xs text-gray-500">
                  Pilih salah satu emblem bernuansa Islami yang telah dirancang selaras dengan warna hijau zamrud dan emas madrasah.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {presetEmblems.map((emblem) => {
                  const isSelected =
                    config.type === 'preset_emblem' && config.customImageUrl === emblem.dataUrl;

                  return (
                    <button
                      key={emblem.id}
                      onClick={() => handleSelectPreset(emblem)}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 relative ${
                        isSelected
                          ? 'border-amber-500 bg-emerald-50/80 shadow-md ring-2 ring-amber-400/50'
                          : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-gray-50/80'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-amber-400/40 p-1 flex items-center justify-center shrink-0">
                        <img src={emblem.dataUrl} alt={emblem.name} className="w-full h-full object-contain" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-gray-900">{emblem.name}</h5>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-emerald-950 flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 font-light mt-0.5 leading-relaxed">
                          {emblem.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: MONOGRAM & BENTUK BINGKAI */}
          {/* ============================================================ */}
          {activeTab === 'monogram' && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h4 className="text-sm font-bold text-[#064e3b]">
                  Kustomisasi Monogram Huruf & Bentuk
                </h4>
                <p className="text-xs text-gray-500">
                  Gunakan inisial nama atau singkatan madrasah dengan perpaduan warna tipografi emas.
                </p>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Huruf Inisial Monogram (1-4 Karakter)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      maxLength={4}
                      value={config.monogramText}
                      onChange={(e) => {
                        setConfig({
                          ...config,
                          monogramText: e.target.value.toUpperCase(),
                          type: 'monogram',
                        });
                      }}
                      placeholder="JM"
                      className="w-32 px-3.5 py-2 text-base font-bold text-center uppercase tracking-widest rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 font-cinzel"
                    />
                    <button
                      onClick={() => {
                        setConfig((prev) => ({ ...prev, type: 'monogram' }));
                        showNotification('Mode monogram diaktifkan.');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-700"
                    >
                      Gunakan Monogram Ini
                    </button>
                  </div>
                </div>

                {/* Automatic Circular Shape Info */}
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-800 text-amber-300 flex items-center justify-center font-bold shrink-0">
                      <Circle className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-emerald-950">
                        Bentuk Bulat Otomatis (Circular 1:1)
                      </h5>
                      <p className="text-[11px] text-emerald-800">
                        Logo dan monogram header selalu disajikan dalam bingkai bulat proporsional secara otomatis.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-800 text-amber-300 text-[10px] font-extrabold rounded-full whitespace-nowrap shadow-xs">
                    ✓ Otomatis Aktif
                  </span>
                </div>

                {/* Fit Mode & HD Options for Custom Images */}
                <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider mb-1">
                      Mode Ketajaman & Tampilan Gambar (HD Desktop)
                    </label>
                    <p className="text-[11px] text-amber-900/80 mb-2">
                      Pilih bagaimana gambar logo disesuaikan di bilah navigasi header:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, fitMode: 'contain' })}
                        className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                          (config.fitMode || 'contain') === 'contain'
                            ? 'bg-emerald-800 text-white border-amber-400 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5">
                          <span>✨ Utuh & Sangat Jelas (Contain)</span>
                        </div>
                        <p className="text-[10px] mt-0.5 opacity-90">
                          Gambar tampil 100% utuh, tajam, tidak pecah dan tidak terpotong (Sangat disarankan untuk logo teks/lebar).
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, fitMode: 'cover' })}
                        className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                          config.fitMode === 'cover'
                            ? 'bg-emerald-800 text-white border-amber-400 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5">
                          <span>🔍 Penuh Memenuhi Bingkai (Cover)</span>
                        </div>
                        <p className="text-[10px] mt-0.5 opacity-90">
                          Gambar dizoom memenuhi kotak (cocok hanya jika gambar adalah foto bujur sangkar 1:1).
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Size Preset Selection */}
                  <div>
                    <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider mb-1.5">
                      Ukuran Logo di Layar Komputer / Desktop
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'compact', label: 'Ringkas (44px)', desc: 'Minimalis' },
                        { id: 'large', label: 'Besar & Jelas (64px)', desc: 'Rekomendasi Utama' },
                        { id: 'extralarge', label: 'Ekstra Besar (76px)', desc: 'Gagah & Sangat Jelas' },
                      ].map((sz) => {
                        const isSelected = (config.size || 'large') === sz.id;
                        return (
                          <button
                            key={sz.id}
                            type="button"
                            onClick={() => setConfig({ ...config, size: sz.id as any })}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-800 text-amber-300 border-amber-400 font-bold shadow-xs ring-1 ring-amber-400'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="text-xs font-semibold">{sz.label}</div>
                            <div className="text-[10px] opacity-80">{sz.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Background Container Color */}
                  <div>
                    <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider mb-1.5">
                      Latar Belakang Wadah Logo
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'emerald', label: 'Hijau Madrasah', desc: 'Serasi Navbar' },
                        { id: 'white', label: 'Putih Bersih', desc: 'Logo Warna Gelap' },
                        { id: 'transparent', label: 'Transparan', desc: 'Alami' },
                      ].map((bg) => {
                        const isSelected = (config.backgroundColor || 'emerald') === bg.id;
                        return (
                          <button
                            key={bg.id}
                            type="button"
                            onClick={() => setConfig({ ...config, backgroundColor: bg.id as any })}
                            className={`p-2 rounded-xl border text-center transition-all ${
                              isSelected
                                ? 'bg-emerald-800 text-amber-300 border-amber-400 font-bold shadow-xs'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="text-xs font-semibold">{bg.label}</div>
                            <div className="text-[9px] opacity-75">{bg.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Border Style Options */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Gaya Garis Tepi (Border Accent)
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'gold', label: 'Emas Berkilau (Gold)' },
                      { id: 'emerald', label: 'Hijau Zamrud (Emerald)' },
                      { id: 'none', label: 'Minimalis (Tipis)' },
                    ].map((bdr) => {
                      const isSelected = config.borderStyle === bdr.id;
                      return (
                        <button
                          key={bdr.id}
                          onClick={() => setConfig({ ...config, borderStyle: bdr.id as any })}
                          className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                            isSelected
                              ? 'bg-emerald-800 text-amber-300 border-amber-400 shadow-xs'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {bdr.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: TEKS IDENTITAS & SUB JUDUL HEADER */}
          {/* ============================================================ */}
          {activeTab === 'text' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h4 className="text-sm font-bold text-[#064e3b]">
                  Teks Identitas, Judul, & Sub Judul di Bilah Header
                </h4>
                <p className="text-xs text-gray-500">
                  Sesuaikan nama judul utama yang tampil di header, sub judul (tulisan di bawah judul), serta lencana kategori.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    1. Judul Header Utama (Nama / Brand) *
                  </label>
                  <input
                    type="text"
                    required
                    value={config.brandName}
                    onChange={(e) => setConfig({ ...config, brandName: e.target.value })}
                    placeholder="Jaenal Maskun"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 font-semibold"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Teks judul berukuran tebal di sebelah logo navbar (contoh: Ust. Jaenal Maskun, S.Pd.I. / HOSTING JEN).
                  </p>
                </div>

                {/* Sub Judul Header (Tulisan di Bawah Judul Header) */}
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider">
                      2. Sub Judul Header (Tulisan di Bawah Judul Header)
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 cursor-pointer bg-white px-2 py-0.5 rounded-md border border-emerald-300">
                      <input
                        type="checkbox"
                        checked={config.showTagline}
                        onChange={(e) => setConfig({ ...config, showTagline: e.target.checked })}
                        className="rounded text-emerald-700 focus:ring-emerald-600"
                      />
                      <span>Tampilkan di Header</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    disabled={!config.showTagline}
                    value={config.taglineText}
                    onChange={(e) => setConfig({ ...config, taglineText: e.target.value })}
                    placeholder="Pendidik & Inovator Kurikulum Islam"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 disabled:bg-gray-100 disabled:text-gray-400 font-medium bg-white"
                  />
                  <p className="text-[10px] text-emerald-700 mt-1">
                    Teks sub judul ini akan muncul tepat di bawah judul header (contoh: <em>Pendidik & Inovator Kurikulum Islam</em> atau <em>Gelar & Jabatan</em>).
                  </p>
                </div>

                {/* Lencana (Badge) */}
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider">
                      3. Teks Lencana (Badge di Samping Judul)
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 cursor-pointer bg-white px-2 py-0.5 rounded-md border border-amber-300">
                      <input
                        type="checkbox"
                        checked={config.showBadge}
                        onChange={(e) => setConfig({ ...config, showBadge: e.target.checked })}
                        className="rounded text-emerald-700 focus:ring-emerald-600"
                      />
                      <span>Tampilkan Lencana</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    disabled={!config.showBadge}
                    value={config.badgeText}
                    onChange={(e) => setConfig({ ...config, badgeText: e.target.value })}
                    placeholder="MADRASAH"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 disabled:bg-gray-100 disabled:text-gray-400 font-medium bg-white uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 5: FAVICON & LOGO FOOTER */}
          {/* ============================================================ */}
          {activeTab === 'favicon_footer' && (
            <div className="space-y-6 animate-fadeIn">
              {/* SECTION 1: FAVICON */}
              <div className="bg-white rounded-2xl border-2 border-emerald-800/30 p-5 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 text-emerald-900 rounded-lg">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        1. Unggah Logo Favicon Website
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        Ikon kecil yang muncul pada tab browser, penanda bookmark, dan ikon pintasan aplikasi.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Browser Tab Simulator Preview */}
                <div className="mb-4 p-3.5 bg-gray-900 rounded-xl border border-gray-800 shadow-inner">
                  <div className="text-[10px] text-gray-400 font-semibold mb-1.5 uppercase tracking-wider">
                    Simulasi Tab Browser Pengunjung:
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-t-lg bg-gray-800 border-t border-x border-gray-700 max-w-sm">
                    {/* Favicon Icon */}
                    <div className="w-4 h-4 rounded bg-gray-900 flex items-center justify-center overflow-hidden shrink-0 border border-gray-700">
                      {config.faviconUrl ? (
                        <img
                          src={config.faviconUrl}
                          alt="Favicon"
                          className="w-full h-full object-contain"
                        />
                      ) : config.customImageUrl ? (
                        <img
                          src={config.customImageUrl}
                          alt="Favicon Header"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full bg-emerald-900 flex items-center justify-center text-[8px] font-bold text-amber-300 font-cinzel">
                          {config.monogramText || 'JM'}
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-gray-200 truncate max-w-[200px]">
                      {config.brandName ? `${config.brandName} | Web Resmi` : 'Ust. Jaenal Maskun, S.Pd.I.'}
                    </span>
                    <span className="text-[10px] text-gray-500 hover:text-gray-300 ml-auto">×</span>
                  </div>
                </div>

                {/* Upload & Action Area for Favicon */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-8 flex flex-wrap items-center gap-2">
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept=".ico,.png,.svg,.webp,.jpg,.jpeg,image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFaviconUpload(e.target.files[0]);
                        }
                      }}
                    />
                    <button
                      type="button"
                      id="upload-favicon-btn"
                      onClick={() => faviconInputRef.current?.click()}
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-300" />
                      <span>{config.faviconUrl ? 'Ganti Berkas Favicon' : 'Pilih Berkas Favicon (.ico / .png)'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isProcessingTransparency}
                      onClick={handleGenerateFaviconFromLogo}
                      className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      title="Otomatis konversi gambar logo header menjadi favicon transparan 64x64 piksel"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-amber-200" />
                      <span>{isProcessingTransparency ? 'Memproses Favicon...' : '🪄 Konversi Logo Jadi Favicon Transparan (64x64)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const source = config.customImageUrl || '/og-image.jpg';
                        setConfig((prev) => ({ ...prev, faviconUrl: source }));
                        showNotification('Logo header disalin sebagai favicon!');
                      }}
                      className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Salin gambar logo header aktif saat ini menjadi favicon website"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Gunakan Logo Header</span>
                    </button>

                    {config.faviconUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setConfig((prev) => ({ ...prev, faviconUrl: undefined }));
                          showNotification('Favicon dikembalikan ke standar.');
                        }}
                        className="px-2.5 py-2 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Hapus favicon kustom"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>

                  <div className="sm:col-span-4 text-right sm:text-right">
                    <span className="text-[10px] text-gray-500">
                      Rekomendasi: Resolusi 32x32 atau 64x64 piksel persegi (.ico / .png).
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: FOOTER LOGO */}
              <div className="bg-white rounded-2xl border-2 border-emerald-800/30 p-5 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-100 text-amber-900 rounded-lg">
                      <LayoutTemplate className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        2. Logo Footer (Sebelah Kiri Nama "Jaenal Maskun")
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        Logo ini ditampilkan di bagian bawah website (Footer) tepat di sebelah kiri tulisan nama Ust. Jaenal Maskun.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Mode Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setConfig((prev) => ({
                        ...prev,
                        footerLogoType: 'sync_header',
                        footerLogoUrl: undefined,
                      }));
                      showNotification('Logo footer disinkronkan dengan logo header!');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      config.footerLogoType !== 'custom' && config.footerLogoType !== 'monogram'
                        ? 'border-emerald-800 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-700/20'
                        : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">Sinkron Header (Default)</span>
                      {config.footerLogoType !== 'custom' && config.footerLogoType !== 'monogram' && (
                        <Check className="w-3.5 h-3.5 text-emerald-800" />
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500">
                      Otomatis memakai logo / gambar yang sama dengan header atas.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConfig((prev) => ({
                        ...prev,
                        footerLogoType: 'custom',
                      }));
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      config.footerLogoType === 'custom'
                        ? 'border-emerald-800 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-700/20'
                        : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">Gambar Logo Khusus Footer</span>
                      {config.footerLogoType === 'custom' && (
                        <Check className="w-3.5 h-3.5 text-emerald-800" />
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500">
                      Unggah berkas logo berbeda untuk tampilan footer bawah.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConfig((prev) => ({
                        ...prev,
                        footerLogoType: 'monogram',
                        footerLogoUrl: undefined,
                      }));
                      showNotification('Logo footer diubah ke monogram inisial!');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      config.footerLogoType === 'monogram'
                        ? 'border-emerald-800 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-700/20'
                        : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">Inisial Monogram Emas</span>
                      {config.footerLogoType === 'monogram' && (
                        <Check className="w-3.5 h-3.5 text-emerald-800" />
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500">
                      Menggunakan badge inisial monogram ({config.monogramText || 'JM'}).
                    </p>
                  </button>
                </div>

                {/* Live Mockup of Footer with Blend Style */}
                <div className="mb-4 p-4 bg-[#042e23] rounded-xl border border-amber-600/40 shadow-inner text-emerald-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider">
                      Simulasi Tampilan Footer Website Asli (Sebelah Kiri Nama):
                    </span>
                    <span className="text-[9px] bg-emerald-900 text-amber-200 px-2 py-0.5 rounded border border-emerald-700 font-mono">
                      Background: #042e23
                    </span>
                  </div>
                  <div className="flex items-center gap-3.5 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 max-w-lg">
                    {/* The Logo Preview */}
                    <div className="w-12 h-12 rounded-full bg-emerald-950 border border-amber-400/80 p-0.5 overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                      {config.footerLogoType === 'custom' && config.footerLogoUrl ? (
                        <img
                          src={config.footerLogoUrl}
                          alt="Logo Footer Preview"
                          style={
                            config.footerBlendMode === 'screen'
                              ? { mixBlendMode: 'screen' }
                              : config.footerBlendMode === 'multiply'
                              ? { mixBlendMode: 'multiply' }
                              : {}
                          }
                          className="w-full h-full object-contain p-0.5 rounded-full"
                        />
                      ) : config.footerLogoType === 'monogram' ? (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center font-cinzel font-bold text-emerald-950 text-base">
                          {config.monogramText || 'JM'}
                        </div>
                      ) : config.customImageUrl ? (
                        <img
                          src={config.customImageUrl}
                          alt="Logo Header in Footer"
                          style={
                            config.footerBlendMode === 'screen'
                              ? { mixBlendMode: 'screen' }
                              : config.footerBlendMode === 'multiply'
                              ? { mixBlendMode: 'multiply' }
                              : {}
                          }
                          className="w-full h-full object-contain p-0.5 rounded-full"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center font-cinzel font-bold text-emerald-950 text-base">
                          {config.monogramText || 'JM'}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base">
                        Ust. Jaenal Maskun, S.Pd.I.
                      </h4>
                      <p className="text-[11px] text-amber-300 font-medium">
                        Pendidik, Akademisi & Penggerak Literasi Madrasah
                      </p>
                    </div>
                  </div>
                </div>

                {/* Upload & Transparency Section for Footer Logo */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={footerLogoInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.svg,image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFooterLogoUpload(e.target.files[0]);
                        }
                      }}
                    />
                    <button
                      type="button"
                      id="upload-footer-logo-btn"
                      onClick={() => footerLogoInputRef.current?.click()}
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-300" />
                      <span>
                        {config.footerLogoUrl ? 'Ganti Berkas Logo Footer' : 'Unggah Berkas Gambar Logo Footer'}
                      </span>
                    </button>

                    {config.customImageUrl && config.footerLogoType !== 'sync_header' && (
                      <button
                        type="button"
                        onClick={() => {
                          setConfig((prev) => ({
                            ...prev,
                            footerLogoType: 'custom',
                            footerLogoUrl: prev.customImageUrl,
                          }));
                          showNotification('Logo header disalin ke logo footer!');
                        }}
                        className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Salin dari Logo Header</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isProcessingTransparency || (!config.footerLogoUrl && !config.customImageUrl)}
                      onClick={handleMakeFooterLogoTransparent}
                      className="px-3 py-2 bg-emerald-900/10 hover:bg-emerald-900/20 disabled:opacity-50 text-emerald-950 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Hilangkan warna putih latar belakang logo footer agar membaur indah dengan warna dasar hijau gelap footer"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{isProcessingTransparency ? 'Memproses...' : '🪄 Hapus Background Putih Footer'}</span>
                    </button>

                    {config.footerLogoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setConfig((prev) => ({
                            ...prev,
                            footerLogoUrl: undefined,
                            footerLogoType: 'sync_header',
                          }));
                          showNotification('Logo khusus footer dihapus, kembali ke sinkron header.');
                        }}
                        className="px-2.5 py-2 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Logo Khusus</span>
                      </button>
                    )}
                  </div>

                  {/* Footer Blend Mode Toggle */}
                  <div className="pt-2 border-t border-gray-100">
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Mode Membaur Logo Footer (Blend Mode):
                    </label>
                    <div className="grid grid-cols-3 gap-2 max-w-md">
                      {[
                        { id: 'normal', label: '1. Normal Cerah (Rekomendasi)', desc: 'Warna Asli Gambar' },
                        { id: 'screen', label: '2. Screen / Cahaya', desc: 'Mencerahkan Logo' },
                        { id: 'multiply', label: '3. Multiply', desc: 'Khusus Dasar Putih' },
                      ].map((fbm) => {
                        const isSelected = (config.footerBlendMode || 'normal') === fbm.id;
                        return (
                          <button
                            key={fbm.id}
                            type="button"
                            onClick={() => setConfig({ ...config, footerBlendMode: fbm.id as any })}
                            className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-800 text-amber-300 border-amber-400 font-bold shadow-xs'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <div className="text-[11px]">{fbm.label}</div>
                            <div className="text-[9px] opacity-75">{fbm.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-100 px-6 py-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            id="reset-default-logo-btn"
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
              id="apply-save-logo-btn"
              disabled={isSaving}
              onClick={handleSaveAndApply}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-800 hover:bg-emerald-700 disabled:bg-emerald-900/60 shadow-md flex items-center gap-2 transition-all active:scale-95 border border-amber-400/40"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 text-amber-300 animate-spin" />
                  <span>Menyimpan Logo...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-amber-300" />
                  <span>Terapkan & Simpan Logo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
