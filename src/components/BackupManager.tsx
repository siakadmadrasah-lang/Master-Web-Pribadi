import React, { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  RotateCcw,
  History,
  Archive,
  FileSpreadsheet,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  Sparkles,
  Database,
  Trash2,
  RefreshCw,
  Plus,
  Layers,
  FileText,
  BookOpen,
  Calendar,
  MessageSquare,
  Eye,
  Check,
  Server,
  FolderDown,
  Globe
} from 'lucide-react';
import { BackupSnapshot, BackupStats, FullBackupBundle, SiteContentConfig, HeaderLogoConfig, StickyFooterConfig } from '../types';
import { downloadPleskPackageZip, triggerZipDownload } from '../utils/pleskExporter';

interface BackupManagerProps {
  onDataRestored?: (restoredData: any) => void;
  siteContent?: SiteContentConfig;
  logoConfig?: HeaderLogoConfig;
  stickyFooterConfig?: StickyFooterConfig;
}

export const BackupManager: React.FC<BackupManagerProps> = ({
  onDataRestored,
  siteContent,
  logoConfig,
  stickyFooterConfig
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'restore' | 'snapshots' | 'exports'>('overview');
  
  // Snapshots list state
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [newSnapshotLabel, setNewSnapshotLabel] = useState('');
  const [snapshotActionMsg, setSnapshotActionMsg] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });
  const [restoringSnapshotId, setRestoringSnapshotId] = useState<string | null>(null);

  // Restore file state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRestoreData, setParsedRestoreData] = useState<any | null>(null);
  const [restoreStats, setRestoreStats] = useState<BackupStats | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [restoreIncludeMessages, setRestoreIncludeMessages] = useState(true);

  // Plesk ZIP generation state
  const [isExportingPlesk, setIsExportingPlesk] = useState(false);
  const [pleskProgress, setPleskProgress] = useState<{ percent: number; message: string } | null>(null);

  // Live Stats from current props
  const currentLiveStats: BackupStats = {
    publicationsCount: siteContent?.publications?.length || 0,
    agendasCount: siteContent?.agenda?.length || 0,
    galleryCount: siteContent?.gallery?.length || 0,
    messagesCount: 0, // Loaded from API
    pillarsCount: siteContent?.pillars?.length || 0,
    quotesCount: siteContent?.quotes?.length || 0,
    educationCount: siteContent?.education?.length || 0,
    experienceCount: siteContent?.experience?.length || 0
  };

  // Fetch snapshots list
  const fetchSnapshots = async () => {
    setIsLoadingSnapshots(true);
    try {
      const res = await fetch('/api/backup/snapshots');
      const data = await res.json();
      if (data.success && Array.isArray(data.snapshots)) {
        setSnapshots(data.snapshots);
      }
    } catch (err) {
      console.error('Error fetching snapshots:', err);
    } finally {
      setIsLoadingSnapshots(false);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, []);

  // Download loading states
  const [isDownloadingJson, setIsDownloadingJson] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);

  // Safe non-navigating blob downloader
  const triggerBlobDownload = async (url: string, defaultFilename: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Gagal mengunduh berkas (Status: ${res.status})`);
      }
      let filename = defaultFilename;
      const disposition = res.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '');
        }
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
        link.remove();
      }, 1500);
    } catch (err: any) {
      console.error('Download error:', err);
      alert(err.message || 'Terjadi kesalahan saat mengunduh berkas cadangan.');
    }
  };

  // Handler: 1-Click JSON Download (Non-navigating)
  const handleDownloadJsonBackup = async () => {
    if (isDownloadingJson) return;
    setIsDownloadingJson(true);
    try {
      await triggerBlobDownload(
        '/api/backup/full?download=1',
        `backup-master-web-jaenalmaskun-${new Date().toISOString().slice(0, 10)}.json`
      );
    } finally {
      setIsDownloadingJson(false);
    }
  };

  // Handler: Full ZIP Download (Non-navigating)
  const handleDownloadZipBackup = async () => {
    if (isDownloadingZip) return;
    setIsDownloadingZip(true);
    try {
      await triggerBlobDownload(
        '/api/backup/zip-data',
        `paket-cadangan-lengkap-jaenalmaskun-${new Date().toISOString().slice(0, 10)}.zip`
      );
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Handler: Plesk ZIP Export
  const handleDownloadPleskZip = async () => {
    if (isExportingPlesk) return;
    setIsExportingPlesk(true);
    setPleskProgress({ percent: 10, message: 'Menyiapkan paket hosting Plesk & database MySQL...' });

    try {
      const zipBlob = await downloadPleskPackageZip(
        siteContent,
        logoConfig,
        stickyFooterConfig,
        (percent, message) => {
          setPleskProgress({ percent, message });
        }
      );
      triggerZipDownload(zipBlob, 'Web-Personal-Ust-Jaenal-Plesk-Hosting.zip');
      setTimeout(() => {
        setIsExportingPlesk(false);
        setPleskProgress(null);
      }, 1500);
    } catch (err) {
      console.warn('Client-side ZIP failed, falling back to server export:', err);
      await triggerBlobDownload('/api/export-plesk-zip', 'Web-Personal-Ust-Jaenal-Plesk-Hosting.zip');
      setIsExportingPlesk(false);
      setPleskProgress(null);
    }
  };

  // Handler: CSV Messages Export (Non-navigating)
  const handleDownloadMessagesCsv = async () => {
    if (isDownloadingCsv) return;
    setIsDownloadingCsv(true);
    try {
      await triggerBlobDownload(
        '/api/backup/export-messages-csv',
        `arsip-pesan-undangan-jaenalmaskun-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } finally {
      setIsDownloadingCsv(false);
    }
  };

  // Handler: Create manual snapshot
  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingSnapshot) return;
    setIsCreatingSnapshot(true);
    setSnapshotActionMsg({ type: '', text: '' });

    try {
      const res = await fetch('/api/backup/create-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newSnapshotLabel.trim() || 'Cadangan Manual Admin' })
      });
      const data = await res.json();
      if (data.success) {
        setSnapshotActionMsg({ type: 'success', text: data.message || 'Snapshot berhasil dibuat.' });
        setNewSnapshotLabel('');
        fetchSnapshots();
      } else {
        setSnapshotActionMsg({ type: 'error', text: data.error || 'Gagal membuat snapshot.' });
      }
    } catch (err: any) {
      setSnapshotActionMsg({ type: 'error', text: err.message || 'Terjadi kesalahan jaringan.' });
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  // Handler: Restore snapshot by ID
  const handleRestoreSnapshot = async (snapshotId: string, label: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin memulihkan data website ke snapshot "${label}"?\n\nSistem akan membuat titik pemulihan otomatis sebelum menerapkan data ini.`)) {
      return;
    }

    setRestoringSnapshotId(snapshotId);
    setSnapshotActionMsg({ type: '', text: '' });

    try {
      const res = await fetch('/api/backup/restore-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId })
      });
      const data = await res.json();
      if (data.success) {
        setSnapshotActionMsg({
          type: 'success',
          text: `Berhasil! Data website telah dipulihkan ke titik "${label}". Halaman akan diperbarui.`
        });
        if (data.restoredData && onDataRestored) {
          onDataRestored(data.restoredData);
        }
        fetchSnapshots();
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setSnapshotActionMsg({ type: 'error', text: data.error || 'Gagal memulihkan snapshot.' });
      }
    } catch (err: any) {
      setSnapshotActionMsg({ type: 'error', text: err.message || 'Terjadi kesalahan jaringan.' });
    } finally {
      setRestoringSnapshotId(null);
    }
  };

  // Handler: Delete snapshot
  const handleDeleteSnapshot = async (snapshotId: string, label: string) => {
    if (!window.confirm(`Hapus snapshot cadangan "${label}"?`)) return;

    try {
      const res = await fetch(`/api/backup/snapshot/${snapshotId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchSnapshots();
      } else {
        alert(data.error || 'Gagal menghapus snapshot');
      }
    } catch (err) {
      console.error('Error deleting snapshot:', err);
    }
  };

  // Handler: Handle file upload for restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setRestoreError(null);
    setRestoreSuccessMsg(null);
    setParsedRestoreData(null);
    setRestoreStats(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!file.name.endsWith('.json')) {
      setRestoreError('Berkas harus berformat .json');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        const dataContent = parsed.data?.siteContent || parsed.siteContent || (parsed.profile ? parsed : null);
        if (!dataContent && !parsed.logoConfig && !parsed.stickyFooterConfig) {
          setRestoreError('Struktur berkas JSON tidak sesuai format cadangan website ini.');
          return;
        }

        setParsedRestoreData(parsed);

        // Calculate preview stats
        const content = dataContent || {};
        const stats: BackupStats = {
          publicationsCount: Array.isArray(content.publications) ? content.publications.length : 0,
          agendasCount: Array.isArray(content.agenda) ? content.agenda.length : 0,
          galleryCount: Array.isArray(content.gallery) ? content.gallery.length : 0,
          messagesCount: Array.isArray(parsed.messages) ? parsed.messages.length : 0,
          pillarsCount: Array.isArray(content.pillars) ? content.pillars.length : 0,
          quotesCount: Array.isArray(content.quotes) ? content.quotes.length : 0,
          educationCount: Array.isArray(content.education) ? content.education.length : 0,
          experienceCount: Array.isArray(content.experience) ? content.experience.length : (Array.isArray(content.experiences) ? content.experiences.length : 0)
        };
        setRestoreStats(stats);
      } catch (err) {
        setRestoreError('Gagal membaca berkas JSON. Format tidak valid atau rusak.');
      }
    };
    reader.readAsText(file);
  };

  // Handler: Confirm and execute file restore
  const handleExecuteRestore = async () => {
    if (!parsedRestoreData) return;
    if (!window.confirm('Terapkan pemulihan data ini ke website?\n\nSistem akan otomatis membuat cadangan sebelum pemulihan diterapkan.')) {
      return;
    }

    setIsRestoring(true);
    setRestoreError(null);
    setRestoreSuccessMsg(null);

    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parsedRestoreData,
          restoreMessages: restoreIncludeMessages
        })
      });

      const data = await res.json();
      if (data.success) {
        setRestoreSuccessMsg(data.message || 'Data website berhasil dipulihkan!');
        if (data.restoredData && onDataRestored) {
          onDataRestored(data.restoredData);
        }
        fetchSnapshots();
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setRestoreError(data.error || 'Gagal menerapkan pemulihan data.');
      }
    } catch (err: any) {
      setRestoreError(err.message || 'Terjadi kesalahan koneksi server.');
    } finally {
      setIsRestoring(false);
    }
  };

  // Handler: Restore directly from this browser's local memory (Anti-Loss Guarantee)
  const [isRestoringLocal, setIsRestoringLocal] = useState(false);
  const handleRestoreFromBrowserMemory = async () => {
    try {
      setIsRestoringLocal(true);
      const savedContent = localStorage.getItem('madrasah_site_content_config');
      const savedLogo = localStorage.getItem('madrasah_custom_header_logo');
      const savedFooter = localStorage.getItem('madrasah_sticky_footer_config');

      if (!savedContent && !savedLogo && !savedFooter) {
        alert('Tidak ditemukan data pengaturan di memori browser ini.');
        setIsRestoringLocal(false);
        return;
      }

      const payload = {
        siteContent: savedContent ? JSON.parse(savedContent) : siteContent,
        logoConfig: savedLogo ? JSON.parse(savedLogo) : logoConfig,
        stickyFooterConfig: savedFooter ? JSON.parse(savedFooter) : stickyFooterConfig,
        lastUpdated: Date.now()
      };

      const res = await fetch('/api/sync-to-mysql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      localStorage.setItem('madrasah_last_updated', String(payload.lastUpdated));

      if (data.success) {
        alert('⚡ BERHASIL! Seluruh data pengaturan dari browser ini telah dipulihkan dan dikunci ke database MySQL & server. Halaman akan dimuat ulang.');
        if (onDataRestored) {
          onDataRestored(payload);
        }
        window.location.reload();
      } else {
        alert('Gagal memulihkan ke database: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (e: any) {
      alert('Terjadi kesalahan: ' + (e.message || 'Gagal terhubung'));
    } finally {
      setIsRestoringLocal(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#064e3b] via-[#043327] to-[#022c22] p-6 sm:p-8 rounded-3xl border-2 border-amber-400/80 shadow-xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-300">
            <HardDrive className="w-6 h-6 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Keamanan & Ketahanan Data</span>
            <span className="bg-emerald-800 text-emerald-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-600">
              Snapshot & Anti-Loss Aktif
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Pusat Cadangan & Pemulihan (Backup & Restore)
          </h3>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
            Simpan cadangan data website secara berkala, pulihkan data kapan saja tanpa khawatir kehilangan konten, kelola titik pemulihan otomatis, serta unduh paket lengkap arsip website.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={handleRestoreFromBrowserMemory}
            disabled={isRestoringLocal}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Pulihkan data yang tersimpan di browser ini langsung ke database server"
          >
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{isRestoringLocal ? 'Memulihkan...' : '⚡ Pulihkan dari Browser (Anti-Hilang)'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadJsonBackup}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Cadangkan JSON (1-Klik)</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'overview'
              ? 'bg-emerald-900 text-amber-300 shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Cadangan Cepat</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('restore')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'restore'
              ? 'bg-emerald-900 text-amber-300 shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Pulihkan Data (Restore)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('snapshots');
            fetchSnapshots();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'snapshots'
              ? 'bg-emerald-900 text-amber-300 shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Titik Pemulihan (Snapshots)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-800 text-emerald-100 font-mono">
            {snapshots.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('exports')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'exports'
              ? 'bg-emerald-900 text-amber-300 shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Ekspor ZIP & Tabel CSV</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: OVERVIEW & QUICK BACKUP */}
      {/* ========================================================================= */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-bold uppercase">Karya & Modul</span>
                <BookOpen className="w-4 h-4 text-emerald-700" />
              </div>
              <p className="text-xl font-black text-gray-900">{currentLiveStats.publicationsCount}</p>
              <span className="text-[10px] text-gray-400">Modul & publikasi</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-bold uppercase">Agenda & Kajian</span>
                <Calendar className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-xl font-black text-gray-900">{currentLiveStats.agendasCount}</p>
              <span className="text-[10px] text-gray-400">Jadwal kegiatan</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-bold uppercase">Pilar Madrasah</span>
                <Layers className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xl font-black text-gray-900">{currentLiveStats.pillarsCount}</p>
              <span className="text-[10px] text-gray-400">Pilar nilai & visi</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-bold uppercase">Dokumentasi</span>
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-xl font-black text-gray-900">{currentLiveStats.galleryCount}</p>
              <span className="text-[10px] text-gray-400">Galeri foto</span>
            </div>
          </div>

          {/* Backup Options Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: JSON Full Backup */}
            <div className="bg-white p-6 rounded-3xl border-2 border-emerald-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">1. Cadangan Berkas JSON (Ringkas)</h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Menyimpan seluruh konfigurasi profil, karya, agenda, pilar, galeri, pesan, pengaturan logo, dan sticky footer dalam 1 berkas format JSON terstruktur.
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                  <span className="font-bold block">✓ Keunggulan:</span>
                  <p>Ukuran sangat kecil (~50 KB), proses unduh instan, dan mudah dipulihkan kembali ke website.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadJsonBackup}
                disabled={isDownloadingJson}
                className="w-full py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                <Download className={`w-4 h-4 text-amber-300 ${isDownloadingJson ? 'animate-bounce' : ''}`} />
                <span>{isDownloadingJson ? 'Menyiapkan & Mengunduh JSON...' : 'Unduh JSON Cadangan'}</span>
              </button>
            </div>

            {/* Card 2: Full ZIP Package */}
            <div className="bg-white p-6 rounded-3xl border-2 border-amber-300 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Archive className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">2. Paket Cadangan Komplit (ZIP)</h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Paket lengkap yang mencakup seluruh file data JSON, berkas unggahan PDF modul & foto, dan panduan pemulihan mandiri.
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-950 space-y-1">
                  <span className="font-bold block">✓ Keunggulan:</span>
                  <p>Arsip terlengkap untuk backup jangka panjang di Google Drive, harddisk lokal, atau migrasi server.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadZipBackup}
                disabled={isDownloadingZip}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-emerald-950 text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                <Archive className={`w-4 h-4 ${isDownloadingZip ? 'animate-spin' : ''}`} />
                <span>{isDownloadingZip ? 'Mengemas & Mengunduh ZIP...' : 'Unduh Paket Arsip ZIP'}</span>
              </button>
            </div>

            {/* Card 3: Instant Snapshot */}
            <div className="bg-white p-6 rounded-3xl border-2 border-blue-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">3. Titik Pemulihan Server (Snapshot)</h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Buat salinan instan langsung di server sebelum melakukan perubahan besar pada konten, tata letak, atau materi ajar.
                  </p>
                </div>
                <form onSubmit={handleCreateSnapshot} className="space-y-2">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase">Label Snapshot Baru:</label>
                  <input
                    type="text"
                    value={newSnapshotLabel}
                    onChange={(e) => setNewSnapshotLabel(e.target.value)}
                    placeholder="Misal: Sebelum Update Modul Semester Genap"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-700"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingSnapshot}
                    className="w-full py-2.5 px-3 rounded-xl bg-blue-800 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isCreatingSnapshot ? 'Menyimpan...' : 'Simpan Snapshot Sekarang'}</span>
                  </button>
                </form>
              </div>

              <div className="text-[11px] text-gray-500 text-center">
                Total {snapshots.length} snapshot tersimpan di server
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: RESTORE FROM BACKUP */}
      {/* ========================================================================= */}
      {activeSubTab === 'restore' && (
        <div className="space-y-6">
          {/* Card: Instant Browser Memory Restore */}
          <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-950 p-6 rounded-3xl border-2 border-amber-400 text-white shadow-lg space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Fitur Unggulan Anti Data-Loss
                </span>
                <h4 className="text-base font-bold text-white">
                  ⚡ Pulihkan Data Langsung dari Memori Browser Ini
                </h4>
                <p className="text-xs text-emerald-100/90 leading-relaxed max-w-xl">
                  Jika Anda baru saja menimpa berkas hosting Plesk dan data tampak kembali ke awal, tekan tombol di bawah. Sistem akan mengambil data terakhir yang tersimpan di browser ini dan langsung menguncinya ke database MySQL server.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRestoreFromBrowserMemory}
                disabled={isRestoringLocal}
                className="shrink-0 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-extrabold text-xs flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`w-4 h-4 ${isRestoringLocal ? 'animate-spin' : ''}`} />
                <span>{isRestoringLocal ? 'Memulihkan...' : '⚡ Pulihkan Sekarang (1-Klik)'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-emerald-200 shadow-sm space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-emerald-700" />
                <span>Pemulihan Data dari Berkas Cadangan JSON (File Upload)</span>
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Pilih berkas cadangan JSON yang telah Anda unduh sebelumnya. Sistem akan membaca dan memverifikasi data sebelum menerapkan pemulihan.
              </p>
            </div>

            {/* Step 1: Upload File */}
            <div className="p-6 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <label className="text-sm font-bold text-emerald-950 block cursor-pointer hover:underline">
                  Klik untuk Memilih Berkas JSON Cadangan
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Format yang didukung: <code className="font-mono text-emerald-800">.json</code> (misal: <code className="font-mono">backup-master-web-jaenalmaskun-...json</code>)
                </p>
              </div>

              {selectedFile && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-emerald-300 text-xs font-semibold text-emerald-900 shadow-2xs">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {restoreError && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-300 text-xs text-red-900 flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{restoreError}</span>
              </div>
            )}

            {/* Success Message */}
            {restoreSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{restoreSuccessMsg}</span>
              </div>
            )}

            {/* Step 2: Verification Preview Box */}
            {parsedRestoreData && restoreStats && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-gray-300 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Pratinjau Data yang Akan Dipulihkan</span>
                  </h5>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Format Valid
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Karya / Modul</span>
                    <strong className="text-sm font-bold text-emerald-900">{restoreStats.publicationsCount} item</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Agenda / Jadwal</span>
                    <strong className="text-sm font-bold text-emerald-900">{restoreStats.agendasCount} item</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Pilar & Nilai</span>
                    <strong className="text-sm font-bold text-emerald-900">{restoreStats.pillarsCount} item</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Galeri Dokumentasi</span>
                    <strong className="text-sm font-bold text-emerald-900">{restoreStats.galleryCount} foto</strong>
                  </div>
                </div>

                {Array.isArray(parsedRestoreData.messages) && parsedRestoreData.messages.length > 0 && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-950 block">Sertakan Arsip Pesan Masuk ({parsedRestoreData.messages.length} pesan)</span>
                      <span className="text-[10px] text-amber-800">Gabungkan pesan masuk lama ke dalam kotak pesan tanpa menimpa pesan baru</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={restoreIncludeMessages}
                      onChange={(e) => setRestoreIncludeMessages(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
                    />
                  </div>
                )}

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-[11px] text-blue-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    <strong>Proteksi Keamanan:</strong> Sistem akan otomatis membuat titik rollback (Safety Snapshot) sebelum pemulihan dijalankan.
                  </span>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    disabled={isRestoring}
                    onClick={handleExecuteRestore}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-950 hover:from-emerald-700 hover:to-emerald-900 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className={`w-4 h-4 text-amber-300 ${isRestoring ? 'animate-spin' : ''}`} />
                    <span>{isRestoring ? 'Menerapkan Pemulihan Data...' : 'Konfirmasi & Terapkan Pemulihan Sekarang'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: SNAPSHOTS LIST */}
      {/* ========================================================================= */}
      {activeSubTab === 'snapshots' && (
        <div className="space-y-6">
          {/* Header Action */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-800" />
                <span>Riwayat Titik Pemulihan Server (Snapshots)</span>
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Daftar salinan cadangan tersimpan di server. Anda dapat kembali ke titik mana pun dalam 1-klik jika terjadi kekeliruan.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchSnapshots}
              disabled={isLoadingSnapshots}
              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSnapshots ? 'animate-spin' : ''}`} />
              <span>Muat Ulang</span>
            </button>
          </div>

          {snapshotActionMsg.text && (
            <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 shadow-2xs ${
              snapshotActionMsg.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-300 text-red-900'
            }`}>
              {snapshotActionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
              <span>{snapshotActionMsg.text}</span>
            </div>
          )}

          {/* Snapshots List */}
          {snapshots.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center space-y-3">
              <History className="w-12 h-12 text-gray-300 mx-auto" />
              <h5 className="text-sm font-bold text-gray-700">Belum Ada Snapshot Tersimpan</h5>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Snapshot otomatis dibuat setiap kali Anda menyimpan perubahan besar atau memulihkan data. Anda juga dapat membuat snapshot manual kapan saja.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {snapshots.map((snap) => {
                const isRestoringThis = restoringSnapshotId === snap.id;
                return (
                  <div
                    key={snap.id}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 hover:border-emerald-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          snap.source === 'manual'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : snap.source === 'restore'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {snap.source === 'manual' ? 'Manual Admin' : snap.source === 'restore' ? 'Pra-Pemulihan (Safety)' : 'Otomatis'}
                        </span>
                        <h5 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                          {snap.label || 'Snapshot Cadangan'}
                        </h5>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{snap.dateFormatted || new Date(snap.timestamp).toLocaleString('id-ID')}</span>
                        </span>
                        <span>•</span>
                        <span>Karya: <strong>{snap.stats?.publicationsCount ?? 0}</strong></span>
                        <span>•</span>
                        <span>Agenda: <strong>{snap.stats?.agendasCount ?? 0}</strong></span>
                        {snap.sizeBytes && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{(snap.sizeBytes / 1024).toFixed(1)} KB</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        disabled={isRestoringThis}
                        onClick={() => handleRestoreSnapshot(snap.id, snap.label)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 text-amber-300 ${isRestoringThis ? 'animate-spin' : ''}`} />
                        <span>{isRestoringThis ? 'Memulihkan...' : 'Kembalikan ke Titik Ini'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSnapshot(snap.id, snap.label)}
                        title="Hapus Snapshot"
                        className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: EXPORTS (ZIP, PLESK & CSV) */}
      {/* ========================================================================= */}
      {activeSubTab === 'exports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Box 1: Plesk Hosting Package */}
            <div className="bg-gradient-to-br from-[#064e3b] via-[#043327] to-[#022c22] text-white p-6 rounded-3xl border-2 border-amber-400/90 shadow-lg flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold shadow-md">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">Paket Siap Hosting Plesk (.ZIP)</h4>
                    <span className="bg-amber-400 text-emerald-950 text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                      Siap Upload
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100/90 mt-1 leading-relaxed">
                    Paket lengkap khusus hosting Plesk/cPanel berisi backend PHP API, database.sql (MySQL), db_config.php, .htaccess, index.php, dan auto-unzipper.
                  </p>
                </div>
                <div className="p-3 bg-emerald-900/60 rounded-xl border border-amber-400/30 text-[11px] text-amber-200 space-y-1">
                  <span className="font-bold block">✓ Database Pre-Configured:</span>
                  <p className="font-mono text-[10px] text-emerald-200">DB: jaenal_masterweb | User: jaenal_masterweb</p>
                </div>
              </div>

              <div className="space-y-2">
                {pleskProgress && (
                  <div className="p-2.5 bg-emerald-950 rounded-xl border border-amber-400/40 text-[10px] text-amber-300 font-semibold space-y-1">
                    <div className="flex justify-between">
                      <span>{pleskProgress.message}</span>
                      <span>{pleskProgress.percent}%</span>
                    </div>
                    <div className="w-full bg-emerald-900 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full transition-all duration-300" style={{ width: `${pleskProgress.percent}%` }} />
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleDownloadPleskZip}
                  disabled={isExportingPlesk}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  <Server className="w-4 h-4" />
                  <span>{isExportingPlesk ? 'Mengemas Paket Plesk...' : 'Unduh ZIP Hosting Plesk'}</span>
                </button>
              </div>
            </div>

            {/* Box 2: CSV Messages Export */}
            <div className="bg-white p-6 rounded-3xl border-2 border-emerald-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-800" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Ekspor Arsip Pesan ke Excel / CSV</h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Unduh seluruh daftar pesan masuk, undangan silaturahmi, nama pemohon, kontak WhatsApp, dan isi pesan dalam berkas format Spreadsheet CSV.
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                  <span className="font-bold block">✓ Kompatibilitas:</span>
                  <p>Dapat dibuka langsung di Microsoft Excel, Google Sheets, atau software database.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadMessagesCsv}
                disabled={isDownloadingCsv}
                className="w-full py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                <FileSpreadsheet className={`w-4 h-4 text-amber-300 ${isDownloadingCsv ? 'animate-pulse' : ''}`} />
                <span>{isDownloadingCsv ? 'Mengekspor CSV...' : 'Unduh Tabel Pesan (.CSV)'}</span>
              </button>
            </div>

            {/* Box 3: Full Backup ZIP Package */}
            <div className="bg-white p-6 rounded-3xl border-2 border-amber-300 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Archive className="w-6 h-6 text-amber-800" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Paket Cadangan Komplit Data (.ZIP)</h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Arsip lengkap berisi seluruh folder data, skrip database SQL, semua berkas PDF materi modul, dan foto flyer yang telah diunggah.
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-950 space-y-1">
                  <span className="font-bold block">✓ Isi Paket:</span>
                  <p>persisted_site_data.json, database.sql, folder uploads/, README_BACKUP.txt</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadZipBackup}
                disabled={isDownloadingZip}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-emerald-950 text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                <Archive className={`w-4 h-4 ${isDownloadingZip ? 'animate-spin' : ''}`} />
                <span>{isDownloadingZip ? 'Mengemas & Mengunduh ZIP...' : 'Unduh Cadangan Komplit (.ZIP)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
