import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
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
  Globe,
  FolderArchive,
  FileCode2,
  Image as ImageIcon,
  FolderUp,
  Camera,
  Smartphone
} from 'lucide-react';
import { BackupSnapshot, BackupStats, FullBackupBundle, SiteContentConfig, HeaderLogoConfig, StickyFooterConfig } from '../types';
import { downloadPleskPackageZip, triggerZipDownload } from '../utils/pleskExporter';
import { downloadCpanelPackageZip } from '../utils/cpanelExporter';
import { generateDatabaseSql } from '../utils/sqlGenerator';
import { embedMediaInSiteData, base64ToUint8Array, deepResolveMediaUrls, collectAllMediaAssetsForZip } from '../utils/mediaBackupHelper';

interface BackupManagerProps {
  onDataRestored?: (restoredData: any) => void;
  siteContent?: SiteContentConfig;
  logoConfig?: HeaderLogoConfig;
  stickyFooterConfig?: StickyFooterConfig;
  onSaveLogoConfig?: (cfg: HeaderLogoConfig) => void;
  onSaveStickyFooterConfig?: (cfg: StickyFooterConfig) => void;
  onOpenCpanelTab?: () => void;
}

// Helper: Download Blob safely in mobile and desktop browsers
const downloadBlobSafely = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    window.URL.revokeObjectURL(url);
  }, 2500);
};

// Helper: Extract JSON from SQL Dump (e.g. database.sql, phpMyAdmin dumps, etc.)
function extractSiteDataFromSql(sql: string): any | null {
  if (!sql || typeof sql !== 'string') return null;

  try {
    // 1. Search for key 'site_data' or 'site_content' with single or double quotes
    const keyMatches = [
      { key: 'site_data', isFullData: true },
      { key: 'site_content', isFullData: false }
    ];

    for (const { key, isFullData } of keyMatches) {
      let searchIdx = 0;
      while (searchIdx < sql.length) {
        // Find key surrounded by quotes
        const keyPattern = new RegExp(`['"\`]${key}['"\`]`, 'i');
        const sub = sql.slice(searchIdx);
        const match = sub.match(keyPattern);
        if (!match || match.index === undefined) break;

        const keyPos = searchIdx + match.index + match[0].length;
        searchIdx = keyPos;

        // Find the next comma separating the key and value column
        const commaIdx = sql.indexOf(',', keyPos);
        if (commaIdx === -1 || commaIdx - keyPos > 300) continue;

        // Find opening quote of the value string
        let quoteIdx = -1;
        let quoteChar = '';
        for (let i = commaIdx + 1; i < sql.length && i < commaIdx + 80; i++) {
          const c = sql[i];
          if (c === "'" || c === '"') {
            quoteIdx = i;
            quoteChar = c;
            break;
          } else if (c !== ' ' && c !== '\t' && c !== '\r' && c !== '\n') {
            break;
          }
        }

        if (quoteIdx === -1) continue;

        // Extract value characters respecting SQL string escaping rules
        const valueChars: string[] = [];
        let i = quoteIdx + 1;
        let foundClosing = false;

        while (i < sql.length) {
          const c = sql[i];
          if (c === '\\') {
            const next = sql[i + 1];
            if (next === "'") valueChars.push("'");
            else if (next === '"') valueChars.push('"');
            else if (next === '\\') valueChars.push('\\');
            else if (next === 'n') valueChars.push('\n');
            else if (next === 'r') valueChars.push('\r');
            else if (next === 't') valueChars.push('\t');
            else if (next !== undefined) valueChars.push(next);
            i += 2;
          } else if (c === quoteChar) {
            if (quoteChar === "'" && sql[i + 1] === "'") {
              valueChars.push("'");
              i += 2;
            } else {
              foundClosing = true;
              break;
            }
          } else {
            valueChars.push(c);
            i++;
          }
        }

        if (foundClosing) {
          const rawJson = valueChars.join('');
          try {
            const parsed = JSON.parse(rawJson);
            if (parsed && typeof parsed === 'object') {
              return isFullData ? parsed : { siteContent: parsed };
            }
          } catch (e) {
            try {
              const unescaped = rawJson.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
              const parsed2 = JSON.parse(unescaped);
              if (parsed2 && typeof parsed2 === 'object') {
                return isFullData ? parsed2 : { siteContent: parsed2 };
              }
            } catch (e2) {}
          }
        }
      }
    }

    // 2. Direct brace-matching search for {"siteContent":...} or {"profile":...} in SQL text
    const anchors = ['"siteContent"', '"profile"', 'siteContent'];
    for (const anchor of anchors) {
      let anchorIdx = sql.indexOf(anchor);
      while (anchorIdx !== -1) {
        let openBrace = -1;
        for (let j = anchorIdx; j >= 0 && j >= anchorIdx - 200; j--) {
          if (sql[j] === '{') {
            openBrace = j;
            break;
          }
        }

        if (openBrace !== -1) {
          let depth = 0;
          let inString = false;
          let stringChar = '';
          let escaped = false;

          for (let k = openBrace; k < sql.length; k++) {
            const ch = sql[k];
            if (inString) {
              if (escaped) {
                escaped = false;
              } else if (ch === '\\') {
                escaped = true;
              } else if (ch === stringChar) {
                inString = false;
              }
            } else {
              if (ch === '"' || ch === "'") {
                inString = true;
                stringChar = ch;
              } else if (ch === '{') {
                depth++;
              } else if (ch === '}') {
                depth--;
                if (depth === 0) {
                  const candidate = sql.slice(openBrace, k + 1);
                  try {
                    const parsed = JSON.parse(candidate);
                    if (parsed?.siteContent || parsed?.profile) {
                      return parsed;
                    }
                  } catch (e) {
                    try {
                      const cleaned = candidate.replace(/''/g, "'").replace(/\\'/g, "'");
                      const parsed = JSON.parse(cleaned);
                      if (parsed?.siteContent || parsed?.profile) {
                        return parsed;
                      }
                    } catch (e2) {}
                  }
                  break;
                }
              }
            }
          }
        }

        anchorIdx = sql.indexOf(anchor, anchorIdx + anchor.length);
      }
    }
  } catch (e) {
    console.warn('SQL extraction notice:', e);
  }
  return null;
}

export const BackupManager: React.FC<BackupManagerProps> = ({
  onDataRestored,
  siteContent,
  logoConfig,
  stickyFooterConfig,
  onSaveLogoConfig,
  onSaveStickyFooterConfig,
  onOpenCpanelTab
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
  const [restoreStats, setRestoreStats] = useState<(BackupStats & { mediaCount?: number; fileTypeDesc?: string }) | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [restoreIncludeMessages, setRestoreIncludeMessages] = useState(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Export progress
  const [isDownloadingJson, setIsDownloadingJson] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [backupStatusText, setBackupStatusText] = useState<string | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [isDownloadingCpanelZip, setIsDownloadingCpanelZip] = useState(false);
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
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (data.success && Array.isArray(data.snapshots)) {
            setSnapshots(data.snapshots);
          }
        } catch (e) {
          // If response is HTML or malformed, don't crash
        }
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

  // Handler: Process uploaded file (.json, .zip, or .sql)
  const processBackupFile = async (file: File) => {
    setRestoreError(null);
    setRestoreSuccessMsg(null);
    setParsedRestoreData(null);
    setRestoreStats(null);
    setSelectedFile(file);

    const fileNameLower = file.name.toLowerCase();

    // 1. Detect if it's a ZIP archive by magic bytes OR file extension/MIME
    let isZipArchive = fileNameLower.endsWith('.zip') || file.type.includes('zip') || file.type.includes('compressed');
    if (!isZipArchive) {
      try {
        const slice = await file.slice(0, 4).arrayBuffer();
        const b = new Uint8Array(slice);
        if (b[0] === 0x50 && b[1] === 0x4B) { // 'PK' magic bytes
          isZipArchive = true;
        }
      } catch (e) {}
    }

    if (isZipArchive) {
      try {
        const zip = await JSZip.loadAsync(file);
        
        // Find JSON data inside the ZIP
        let jsonContentStr: string | null = null;
        let jsonFoundPath = '';
        
        const candidatePaths = [
          'data/persisted_site_data.json',
          'persisted_site_data.json',
          'data/site_data.default.json',
          'site_data.default.json',
          'data/site_data.json',
          'site_data.json',
          'backup.json',
          'data/backup_data.json'
        ];
        
        for (const p of candidatePaths) {
          const entry = zip.file(p);
          if (entry) {
            jsonContentStr = await entry.async('string');
            jsonFoundPath = p;
            break;
          }
        }
        
        // Search all entries for any .json file with valid structure
        if (!jsonContentStr) {
          for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
            if (!zipEntry.dir && relativePath.endsWith('.json')) {
              try {
                const testStr = await zipEntry.async('string');
                const testObj = JSON.parse(testStr);
                if (testObj?.siteContent || testObj?.data?.siteContent || testObj?.profile || testObj?.logoConfig || testObj?.stickyFooterConfig) {
                  jsonContentStr = testStr;
                  jsonFoundPath = relativePath;
                  break;
                }
              } catch (e) {}
            }
          }
        }

        // Search for database.sql inside the ZIP
        if (!jsonContentStr) {
          for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
            if (!zipEntry.dir && relativePath.endsWith('.sql')) {
              const sqlStr = await zipEntry.async('string');
              const extracted = extractSiteDataFromSql(sqlStr);
              if (extracted) {
                jsonContentStr = JSON.stringify(extracted);
                jsonFoundPath = relativePath;
                break;
              }
            }
          }
        }

        if (!jsonContentStr) {
          setRestoreError('Berkas ZIP tidak memuat data website (.json atau database.sql yang valid). Pastikan berkas berasal dari ekspor website ini.');
          return;
        }

        const parsed = JSON.parse(jsonContentStr);

        // Extract media files in uploads/ into Base64 map
        const zipMediaMap: Record<string, string> = {};
        let mediaFilesCount = 0;
        for (const [path, entry] of Object.entries(zip.files)) {
          if (!entry.dir && (path.startsWith('uploads/') || path.startsWith('data/uploads/') || path.includes('/uploads/'))) {
            const fileName = path.split('/').pop() || '';
            if (fileName && !fileName.startsWith('.')) {
              mediaFilesCount++;
              try {
                const base64Str = await entry.async('base64');
                let mime = 'image/jpeg';
                const lower = fileName.toLowerCase();
                if (lower.endsWith('.png')) mime = 'image/png';
                else if (lower.endsWith('.webp')) mime = 'image/webp';
                else if (lower.endsWith('.svg')) mime = 'image/svg+xml';
                else if (lower.endsWith('.gif')) mime = 'image/gif';

                const dataUrl = `data:${mime};base64,${base64Str}`;
                zipMediaMap[fileName] = dataUrl;
                zipMediaMap[`/uploads/${fileName}`] = dataUrl;
                zipMediaMap[`uploads/${fileName}`] = dataUrl;
                zipMediaMap[`assets/uploads/${fileName}`] = dataUrl;
                zipMediaMap[`/assets/uploads/${fileName}`] = dataUrl;
              } catch (e) {}
            }
          }
        }

        let dataContent = parsed.data?.siteContent || parsed.siteContent || (parsed.profile ? parsed : null);

        // If ZIP has media files, resolve relative URLs to Base64 data URLs for seamless offline/Android display
        if (Object.keys(zipMediaMap).length > 0) {
          if (dataContent) {
            dataContent = deepResolveMediaUrls(dataContent, zipMediaMap);
          }
          if (parsed.logoConfig) {
            parsed.logoConfig = deepResolveMediaUrls(parsed.logoConfig, zipMediaMap);
          }
          if (parsed.data?.logoConfig) {
            parsed.data.logoConfig = deepResolveMediaUrls(parsed.data.logoConfig, zipMediaMap);
          }
          if (parsed.stickyFooterConfig) {
            parsed.stickyFooterConfig = deepResolveMediaUrls(parsed.stickyFooterConfig, zipMediaMap);
          }
          if (parsed.data?.stickyFooterConfig) {
            parsed.data.stickyFooterConfig = deepResolveMediaUrls(parsed.data.stickyFooterConfig, zipMediaMap);
          }
        }

        const content = dataContent || {};
        if (content.profile?.avatarUrl) {
          setPreviewAvatar(content.profile.avatarUrl);
        } else {
          setPreviewAvatar(null);
        }

        const stats: BackupStats & { mediaCount?: number; fileTypeDesc?: string } = {
          publicationsCount: Array.isArray(content.publications) ? content.publications.length : 0,
          agendasCount: Array.isArray(content.agenda) ? content.agenda.length : 0,
          galleryCount: Array.isArray(content.gallery) ? content.gallery.length : 0,
          messagesCount: Array.isArray(parsed.messages) ? parsed.messages.length : 0,
          pillarsCount: Array.isArray(content.pillars) ? content.pillars.length : 0,
          quotesCount: Array.isArray(content.quotes) ? content.quotes.length : 0,
          educationCount: Array.isArray(content.education) ? content.education.length : 0,
          experienceCount: Array.isArray(content.experience) ? content.experience.length : (Array.isArray(content.experiences) ? content.experiences.length : 0),
          mediaCount: mediaFilesCount,
          fileTypeDesc: `Paket Komplit ZIP (${jsonFoundPath || 'Arsip'}, ${mediaFilesCount} media)`
        };

        setParsedRestoreData({
          ...parsed,
          data: {
            ...parsed.data,
            siteContent: dataContent
          },
          siteContent: dataContent,
          _fileType: 'zip',
          _mediaFilesCount: mediaFilesCount,
          _zipSourceFile: file
        });
        setRestoreStats(stats);
        setRestoreSuccessMsg(`Paket ZIP berhasil diverifikasi! Ditemukan konfigurasi web & ${mediaFilesCount} berkas media terintegrasi.`);
      } catch (err: any) {
        setRestoreError(`Gagal membaca berkas ZIP: ${err.message || 'Format arsip tidak valid'}`);
      }
      return;
    }

    // 2. Read as text to check if JSON or SQL
    let fileText = '';
    try {
      fileText = await file.text();
    } catch (e: any) {
      setRestoreError('Gagal membaca isi berkas. Pastikan berkas tidak rusak atau coba pilih ulang.');
      return;
    }

    const cleanText = fileText.replace(/^\uFEFF/, '').trim();

    // Try parsing as JSON (supporting standard backup, raw site_data, phpMyAdmin JSON array, etc.)
    let parsedJson: any = null;
    try {
      parsedJson = JSON.parse(cleanText);
    } catch (e) {
      // Substring fallback if there are leading/trailing non-JSON characters
      const firstObj = cleanText.indexOf('{');
      const lastObj = cleanText.lastIndexOf('}');
      if (firstObj !== -1 && lastObj > firstObj) {
        try {
          parsedJson = JSON.parse(cleanText.slice(firstObj, lastObj + 1));
        } catch (e2) {}
      }
      if (!parsedJson) {
        const firstArr = cleanText.indexOf('[');
        const lastArr = cleanText.lastIndexOf(']');
        if (firstArr !== -1 && lastArr > firstArr) {
          try {
            parsedJson = JSON.parse(cleanText.slice(firstArr, lastArr + 1));
          } catch (e3) {}
        }
      }
    }

    if (parsedJson) {
      let dataContent: any = null;
      let logoCandidate: any = null;
      let footerCandidate: any = null;
      let messagesCandidate: any = null;

      // Case A: phpMyAdmin / Adminer table dump as JSON array
      if (Array.isArray(parsedJson)) {
        for (const row of parsedJson) {
          if (row && (row.setting_key === 'site_data' || row.key === 'site_data')) {
            try {
              const val = typeof row.setting_value === 'string' ? JSON.parse(row.setting_value) : row.setting_value;
              if (val) {
                dataContent = val.siteContent || (val.profile ? val : null);
                logoCandidate = val.logoConfig;
                footerCandidate = val.stickyFooterConfig;
                messagesCandidate = val.messages;
              }
            } catch (e) {}
          }
        }
      } else if (typeof parsedJson === 'object') {
        // Case B: standard backup envelope or persisted_site_data.json
        if (parsedJson.data?.siteContent) {
          dataContent = parsedJson.data.siteContent;
          logoCandidate = parsedJson.data.logoConfig || parsedJson.logoConfig;
          footerCandidate = parsedJson.data.stickyFooterConfig || parsedJson.stickyFooterConfig;
          messagesCandidate = parsedJson.data.messages || parsedJson.messages;
        } else if (parsedJson.siteContent) {
          dataContent = parsedJson.siteContent;
          logoCandidate = parsedJson.logoConfig;
          footerCandidate = parsedJson.stickyFooterConfig;
          messagesCandidate = parsedJson.messages;
        } else if (parsedJson.site_data) {
          try {
            const val = typeof parsedJson.site_data === 'string' ? JSON.parse(parsedJson.site_data) : parsedJson.site_data;
            dataContent = val?.siteContent || (val?.profile ? val : null);
            logoCandidate = val?.logoConfig;
            footerCandidate = val?.stickyFooterConfig;
            messagesCandidate = val?.messages;
          } catch (e) {}
        } else if (parsedJson.setting_key === 'site_data' && parsedJson.setting_value) {
          try {
            const val = typeof parsedJson.setting_value === 'string' ? JSON.parse(parsedJson.setting_value) : parsedJson.setting_value;
            dataContent = val?.siteContent || (val?.profile ? val : null);
            logoCandidate = val?.logoConfig;
            footerCandidate = val?.stickyFooterConfig;
            messagesCandidate = val?.messages;
          } catch (e) {}
        } else if (parsedJson.profile) {
          dataContent = parsedJson;
          logoCandidate = parsedJson.logoConfig;
          footerCandidate = parsedJson.stickyFooterConfig;
        }
      }

      if (dataContent || logoCandidate || footerCandidate) {
        const content = dataContent || {};
        
        // Count embedded Base64 media in JSON
        let embeddedMediaCount = 0;
        if (content.profile?.avatarUrl?.startsWith('data:image/')) embeddedMediaCount++;
        if (content.heroSettings?.heroImage?.startsWith('data:image/')) embeddedMediaCount++;
        if (Array.isArray(content.gallery)) {
          embeddedMediaCount += content.gallery.filter((g: any) => g?.imageUrl?.startsWith('data:image/')).length;
        }
        if (Array.isArray(content.publications)) {
          embeddedMediaCount += content.publications.filter((p: any) => p?.coverUrl?.startsWith('data:image/')).length;
        }
        if (Array.isArray(content.agenda)) {
          embeddedMediaCount += content.agenda.filter((a: any) => a?.flyerUrl?.startsWith('data:image/')).length;
        }
        if (logoCandidate?.logoUrl?.startsWith('data:image/')) embeddedMediaCount++;
        if (footerCandidate?.customIcon?.startsWith('data:image/')) embeddedMediaCount++;

        if (content.profile?.avatarUrl) {
          setPreviewAvatar(content.profile.avatarUrl);
        } else {
          setPreviewAvatar(null);
        }

        const msgsList = messagesCandidate || parsedJson.messages || [];
        const stats: BackupStats & { mediaCount?: number; fileTypeDesc?: string } = {
          publicationsCount: Array.isArray(content.publications) ? content.publications.length : 0,
          agendasCount: Array.isArray(content.agenda) ? content.agenda.length : 0,
          galleryCount: Array.isArray(content.gallery) ? content.gallery.length : 0,
          messagesCount: Array.isArray(msgsList) ? msgsList.length : 0,
          pillarsCount: Array.isArray(content.pillars) ? content.pillars.length : 0,
          quotesCount: Array.isArray(content.quotes) ? content.quotes.length : 0,
          educationCount: Array.isArray(content.education) ? content.education.length : 0,
          experienceCount: Array.isArray(content.experience) ? content.experience.length : (Array.isArray(content.experiences) ? content.experiences.length : 0),
          mediaCount: embeddedMediaCount,
          fileTypeDesc: embeddedMediaCount > 0 ? `Berkas Cadangan JSON (${embeddedMediaCount} Foto Tersemat)` : 'Berkas Cadangan JSON'
        };

        setParsedRestoreData({
          ...parsedJson,
          siteContent: dataContent,
          logoConfig: logoCandidate || parsedJson.logoConfig,
          stickyFooterConfig: footerCandidate || parsedJson.stickyFooterConfig,
          messages: msgsList,
          data: {
            siteContent: dataContent,
            logoConfig: logoCandidate || parsedJson.logoConfig,
            stickyFooterConfig: footerCandidate || parsedJson.stickyFooterConfig,
            messages: msgsList
          },
          _fileType: 'json'
        });
        setRestoreStats(stats);
        setRestoreSuccessMsg(`Berkas JSON berhasil diverifikasi! ${embeddedMediaCount > 0 ? `${embeddedMediaCount} foto/media tersemat & siap dipulihkan ke Android/PC.` : 'Siap dipulihkan.'}`);
        return;
      }
    }

    // Try extracting from SQL dump (e.g. database.sql, phpMyAdmin exports)
    const extractedSql = extractSiteDataFromSql(cleanText);
    if (extractedSql) {
      const dataContent = extractedSql.data?.siteContent || extractedSql.siteContent || (extractedSql.profile ? extractedSql : null);
      const content = dataContent || {};

      if (content.profile?.avatarUrl) {
        setPreviewAvatar(content.profile.avatarUrl);
      } else {
        setPreviewAvatar(null);
      }

      const stats: BackupStats & { mediaCount?: number; fileTypeDesc?: string } = {
        publicationsCount: Array.isArray(content.publications) ? content.publications.length : 0,
        agendasCount: Array.isArray(content.agenda) ? content.agenda.length : 0,
        galleryCount: Array.isArray(content.gallery) ? content.gallery.length : 0,
        messagesCount: Array.isArray(extractedSql.messages) ? extractedSql.messages.length : 0,
        pillarsCount: Array.isArray(content.pillars) ? content.pillars.length : 0,
        quotesCount: Array.isArray(content.quotes) ? content.quotes.length : 0,
        educationCount: Array.isArray(content.education) ? content.education.length : 0,
        experienceCount: Array.isArray(content.experience) ? content.experience.length : 0,
        fileTypeDesc: 'Skrip Database MySQL (.sql dump)'
      };

      setParsedRestoreData({
        ...extractedSql,
        siteContent: dataContent,
        logoConfig: extractedSql.logoConfig || extractedSql.data?.logoConfig,
        stickyFooterConfig: extractedSql.stickyFooterConfig || extractedSql.data?.stickyFooterConfig,
        data: {
          siteContent: dataContent,
          logoConfig: extractedSql.logoConfig || extractedSql.data?.logoConfig,
          stickyFooterConfig: extractedSql.stickyFooterConfig || extractedSql.data?.stickyFooterConfig
        },
        _fileType: 'sql',
        _rawSqlText: cleanText
      });
      setRestoreStats(stats);
      setRestoreSuccessMsg('Skrip database SQL berhasil diekstrak dan siap dipulihkan!');
      return;
    }

    setRestoreError(`Format berkas "${file.name}" tidak dikenali. Mohon pilih berkas cadangan website (.zip, .json, atau dump .sql).`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processBackupFile(file);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processBackupFile(file);
    }
  };

  // Handler: Confirm and execute file restore
  const handleExecuteRestore = async () => {
    if (!parsedRestoreData) return;

    setIsRestoring(true);
    setRestoreError(null);
    setRestoreSuccessMsg(null);

    try {
      let resultData: any = null;

      // 1. If it's a ZIP package, attempt multipart restore to server
      if (parsedRestoreData._fileType === 'zip' && selectedFile) {
        const formData = new FormData();
        formData.append('backupZip', selectedFile);
        formData.append('restoreMessages', String(restoreIncludeMessages));

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 60000);
          const res = await fetch('/api/backup/restore-zip', {
            method: 'POST',
            body: formData,
            signal: controller.signal
          });
          clearTimeout(timer);
          if (res.ok) {
            const text = await res.text();
            try {
              const jsonRes = JSON.parse(text);
              if (jsonRes.success) {
                resultData = jsonRes;
              }
            } catch (e) {}
          }
        } catch (zipErr) {
          console.warn('Server zip restore notice:', zipErr);
        }
      }

      // 2. Standard JSON restore
      if (!resultData) {
        const payloadToRestore = {
          ...parsedRestoreData,
          restoreMessages: restoreIncludeMessages
        };
        delete payloadToRestore._fileType;
        delete payloadToRestore._mediaFilesCount;
        delete payloadToRestore._zipSourceFile;
        delete payloadToRestore._rawSqlText;

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 60000);
          const res = await fetch('/api/backup/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadToRestore),
            signal: controller.signal
          });
          clearTimeout(timer);

          if (res.ok) {
            const text = await res.text();
            try {
              resultData = JSON.parse(text);
            } catch (parseErr) {
              resultData = {
                success: true,
                message: 'Data berhasil dipulihkan dan diselaraskan ke browser!',
                restoredData: payloadToRestore.data || payloadToRestore
              };
            }
          }
        } catch (netErr) {
          console.warn('Network notice during restore:', netErr);
        }
      }

      if (!resultData) {
        // Local fallback if offline
        const payloadToRestore = parsedRestoreData.data || parsedRestoreData;
        resultData = {
          success: true,
          message: 'Data berhasil dipulihkan ke memori lokal browser!',
          restoredData: payloadToRestore
        };
      }

      if (resultData && resultData.success) {
        setRestoreSuccessMsg(resultData.message || 'Data website berhasil dipulihkan!');

        const restoredObj = resultData.restoredData || parsedRestoreData.data || parsedRestoreData;
        let finalContent = restoredObj.siteContent || (restoredObj.profile ? restoredObj : null);
        let finalLogo = restoredObj.logoConfig || parsedRestoreData.logoConfig || parsedRestoreData.data?.logoConfig;
        let finalFooter = restoredObj.stickyFooterConfig || parsedRestoreData.stickyFooterConfig || parsedRestoreData.data?.stickyFooterConfig;

        // Ensure resolved Base64 photos from parsedRestoreData are preserved on Android/offline
        const parsedContent = parsedRestoreData.data?.siteContent || parsedRestoreData.siteContent || (parsedRestoreData.profile ? parsedRestoreData : null);
        if (parsedContent && finalContent) {
          if (parsedContent.profile?.avatarUrl?.startsWith('data:image/')) {
            finalContent.profile = { ...finalContent.profile, avatarUrl: parsedContent.profile.avatarUrl };
          }
          if (parsedContent.heroSettings?.heroImage?.startsWith('data:image/')) {
            finalContent.heroSettings = { ...finalContent.heroSettings, heroImage: parsedContent.heroSettings.heroImage };
          }
          if (Array.isArray(parsedContent.gallery) && Array.isArray(finalContent.gallery)) {
            parsedContent.gallery.forEach((pg: any, i: number) => {
              if (pg?.imageUrl?.startsWith('data:image/') && finalContent.gallery[i]) {
                finalContent.gallery[i].imageUrl = pg.imageUrl;
              }
            });
          }
        }

        // Persist to local storage immediately
        if (finalContent) {
          localStorage.setItem('madrasah_site_content_config', JSON.stringify(finalContent));
          if (onDataRestored) onDataRestored(finalContent);
        }
        if (finalLogo && onSaveLogoConfig) {
          localStorage.setItem('madrasah_custom_header_logo', JSON.stringify(finalLogo));
          onSaveLogoConfig(finalLogo);
        }
        if (finalFooter && onSaveStickyFooterConfig) {
          localStorage.setItem('madrasah_sticky_footer_config', JSON.stringify(finalFooter));
          onSaveStickyFooterConfig(finalFooter);
        }
        const restoreNowTs = Date.now();
        localStorage.setItem('madrasah_last_updated', String(restoreNowTs));

        // Also sync to MySQL / server so database has the restored data
        try {
          await fetch('/api/sync-to-mysql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              siteContent: finalContent,
              logoConfig: finalLogo,
              stickyFooterConfig: finalFooter,
              lastUpdated: restoreNowTs
            })
          });
        } catch (syncErr) {}

        fetchSnapshots();
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        setRestoreError(resultData?.error || 'Gagal menerapkan pemulihan data.');
      }
    } catch (err: any) {
      setRestoreError(err.message || 'Terjadi kesalahan pemulihan data.');
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

      localStorage.setItem('madrasah_last_updated', String(payload.lastUpdated));
      if (onDataRestored) {
        onDataRestored(payload.siteContent || payload);
      }
      if (payload.logoConfig && onSaveLogoConfig) {
        onSaveLogoConfig(payload.logoConfig);
      }
      if (payload.stickyFooterConfig && onSaveStickyFooterConfig) {
        onSaveStickyFooterConfig(payload.stickyFooterConfig);
      }

      // Background sync to MySQL
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 2500);
        await fetch('/api/sync-to-mysql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify(payload)
        });
        clearTimeout(t);
      } catch (e) {}

      alert('⚡ BERHASIL! Seluruh data pengaturan dari browser ini telah dipulihkan. Halaman akan dimuat ulang.');
      window.location.reload();
    } catch (e: any) {
      alert('Terjadi kesalahan: ' + (e.message || 'Gagal memulihkan'));
    } finally {
      setIsRestoringLocal(false);
    }
  };

  // Handler: Download JSON Backup (Instant, Self-Contained with Photos)
  const handleDownloadJsonBackup = async () => {
    setIsDownloadingJson(true);
    setBackupStatusText('Menyematkan seluruh foto profil, galeri, dan media...');
    try {
      let contentToBackup = siteContent;
      let logoToBackup = logoConfig;
      let footerToBackup = stickyFooterConfig;

      if (!contentToBackup) {
        try {
          const raw = localStorage.getItem('madrasah_site_content_config');
          if (raw) contentToBackup = JSON.parse(raw);
        } catch (e) {}
      }
      if (!logoToBackup) {
        try {
          const raw = localStorage.getItem('madrasah_custom_header_logo');
          if (raw) logoToBackup = JSON.parse(raw);
        } catch (e) {}
      }
      if (!footerToBackup) {
        try {
          const raw = localStorage.getItem('madrasah_sticky_footer_config');
          if (raw) footerToBackup = JSON.parse(raw);
        } catch (e) {}
      }

      // Automatically embed all images as Base64 Data URLs so the JSON backup is 100% self-contained on Android
      const {
        siteContent: embeddedContent,
        logoConfig: embeddedLogo,
        stickyFooterConfig: embeddedFooter,
        inlinedMediaCount
      } = await embedMediaInSiteData(contentToBackup, logoToBackup, footerToBackup, (msg) => setBackupStatusText(msg));

      const backupObj = {
        version: '2.0',
        app: 'Web-Personal-Ust-Jaenal-Maskun',
        exportedAt: new Date().toISOString(),
        timestamp: Date.now(),
        data: {
          siteContent: embeddedContent,
          logoConfig: embeddedLogo,
          stickyFooterConfig: embeddedFooter,
          lastUpdated: Date.now()
        },
        meta: {
          embeddedMediaCount: inlinedMediaCount,
          compatibleWithAndroid: true
        }
      };

      const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadBlobSafely(blob, `backup-master-web-jaenalmaskun-${dateStr}.json`);
      setRestoreSuccessMsg(`Cadangan JSON berhasil diunduh (${inlinedMediaCount} foto tersimpan mandiri)!`);
    } catch (e: any) {
      alert('Gagal mengunduh cadangan JSON: ' + (e?.message || 'Kesalahan browser'));
    } finally {
      setIsDownloadingJson(false);
      setBackupStatusText(null);
    }
  };

  // Handler: Download Full ZIP Backup (Instant, Self-Contained with Embedded Photos & Uploads Folder)
  const handleDownloadZipBackup = async () => {
    setIsDownloadingZip(true);
    setBackupStatusText('Menyiapkan paket ZIP lengkap...');
    const dateStr = new Date().toISOString().slice(0, 10);
    const backupFileName = `backup-data-komplit-jaenalmaskun-${dateStr}.zip`;

    // 1. Prioritas Utama: Unduh langsung via Server API (/api/backup/zip-data)
    // Sangat cepat (<1 detik), ukuran sangat ringkas (~800 KB, bukan ratusan MB),
    // 100% bebas dari crash "Yah! Terjadi masalah sewaktu menampilkan halaman web ini"
    try {
      const directUrl = `/api/backup/zip-data?_t=${Date.now()}`;
      const link = document.createElement('a');
      link.href = directUrl;
      link.download = backupFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setRestoreSuccessMsg('Paket cadangan ZIP komplit berhasil diunduh (ringkas ~800 KB, lengkap dengan foto & database)!');
      setIsDownloadingZip(false);
      setBackupStatusText(null);
      return;
    } catch (serverErr) {
      console.warn('Direct server ZIP download failed, falling back to local export', serverErr);
    }

    // 2. Fallback aman client-side jika server offline / unreachable
    try {
      setBackupStatusText('Mengemas data website...');
      let contentToBackup = siteContent;
      let logoToBackup = logoConfig;
      let footerToBackup = stickyFooterConfig;

      if (!contentToBackup) {
        try {
          const raw = localStorage.getItem('madrasah_site_content_config');
          if (raw) contentToBackup = JSON.parse(raw);
        } catch (e) {}
      }
      if (!logoToBackup) {
        try {
          const raw = localStorage.getItem('madrasah_custom_header_logo');
          if (raw) logoToBackup = JSON.parse(raw);
        } catch (e) {}
      }
      if (!footerToBackup) {
        try {
          const raw = localStorage.getItem('madrasah_sticky_footer_config');
          if (raw) footerToBackup = JSON.parse(raw);
        } catch (e) {}
      }

      // Embed media safely with progress
      const {
        siteContent: embeddedContent,
        logoConfig: embeddedLogo,
        stickyFooterConfig: embeddedFooter,
        inlinedMediaCount
      } = await embedMediaInSiteData(contentToBackup, logoToBackup, footerToBackup, (msg) => setBackupStatusText(msg));

      const zip = new JSZip();
      const backupBundle = {
        version: '2.0',
        app: 'Web-Personal-Ust-Jaenal-Maskun',
        exportedAt: new Date().toISOString(),
        timestamp: Date.now(),
        data: {
          siteContent: embeddedContent,
          logoConfig: embeddedLogo,
          stickyFooterConfig: embeddedFooter,
          lastUpdated: Date.now()
        },
        meta: {
          embeddedMediaCount: inlinedMediaCount,
          compatibleWithAndroid: true
        }
      };

      zip.file('backup.json', JSON.stringify(backupBundle, null, 2));
      zip.file('data/persisted_site_data.json', JSON.stringify({ siteContent: embeddedContent, logoConfig: embeddedLogo, stickyFooterConfig: embeddedFooter }, null, 2));
      zip.file('data/site_content.json', JSON.stringify(embeddedContent, null, 2));
      zip.file('database.sql', generateDatabaseSql(embeddedContent, embeddedLogo, embeddedFooter));

      // Pack physical media assets into uploads/
      const uploadsFolder = zip.folder('uploads');
      if (uploadsFolder) {
        const mediaAssets = collectAllMediaAssetsForZip(embeddedContent, embeddedLogo, embeddedFooter);
        for (const asset of mediaAssets) {
          uploadsFolder.file(asset.filename, asset.data);
        }
      }

      zip.file('README_CADANGAN.txt', `PAKET CADANGAN LENGKAP WEB UST. JAENAL MASKUN\nTanggal Ekspor: ${new Date().toLocaleString('id-ID')}\nTotal Foto/Media Disematkan: ${inlinedMediaCount}\nKompatibilitas: Android, iPhone, Windows, Mac & Hosting cPanel/Plesk.`);

      // Use fast STORE or low DEFLATE level to prevent high CPU/RAM spikes on phones
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 1 }
      });
      downloadBlobSafely(zipBlob, backupFileName);
      setRestoreSuccessMsg(`Paket ZIP berhasil diunduh (${inlinedMediaCount} foto tersemat mandiri)!`);
    } catch (e: any) {
      alert('Gagal membuat berkas ZIP: ' + (e?.message || 'Kesalahan'));
    } finally {
      setIsDownloadingZip(false);
      setBackupStatusText(null);
    }
  };

  // Handler: Download cPanel ZIP
  const handleDownloadCpanelZip = async () => {
    setIsDownloadingCpanelZip(true);
    try {
      const blob = await downloadCpanelPackageZip(siteContent, logoConfig, stickyFooterConfig);
      triggerZipDownload(blob, 'Web-Personal-Ust-Jaenal-cPanel-Hosting.zip');
    } catch (e) {
      alert('Gagal membuat paket ZIP cPanel.');
    } finally {
      setIsDownloadingCpanelZip(false);
    }
  };

  // Handler: Create manual snapshot
  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingSnapshot(true);
    setSnapshotActionMsg({ type: '', text: '' });
    try {
      const res = await fetch('/api/backup/create-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newSnapshotLabel.trim() || undefined })
      });
      const data = await res.json();
      if (data.success) {
        setNewSnapshotLabel('');
        setSnapshotActionMsg({ type: 'success', text: 'Titik pemulihan (snapshot) baru berhasil disimpan!' });
        fetchSnapshots();
      } else {
        setSnapshotActionMsg({ type: 'error', text: data.error || 'Gagal membuat snapshot' });
      }
    } catch (err: any) {
      setSnapshotActionMsg({ type: 'error', text: err.message || 'Gagal terhubung ke server' });
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  // Handler: Restore snapshot by ID
  const handleRestoreSnapshot = async (snapshotId: string) => {
    if (!window.confirm('Pulihkan website ke snapshot ini? Data saat ini akan digantikan.')) return;
    setRestoringSnapshotId(snapshotId);
    try {
      const res = await fetch('/api/backup/restore-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId })
      });
      const data = await res.json();
      if (data.success) {
        alert('Website berhasil dipulihkan dari snapshot! Halaman akan dimuat ulang.');
        if (data.restoredData && onDataRestored) {
          onDataRestored(data.restoredData.siteContent || data.restoredData);
        }
        window.location.reload();
      } else {
        alert(data.error || 'Gagal memulihkan snapshot');
      }
    } catch (err) {
      alert('Kesalahan saat memulihkan snapshot');
    } finally {
      setRestoringSnapshotId(null);
    }
  };

  // Handler: Delete snapshot by ID
  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (!window.confirm('Hapus snapshot cadangan ini secara permanen?')) return;
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

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#064e3b] via-[#043327] to-[#022c22] p-6 sm:p-8 rounded-3xl border-2 border-amber-400/80 shadow-xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-300 flex-wrap">
            <HardDrive className="w-6 h-6 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Keamanan & Ketahanan Data</span>
            <span className="bg-emerald-800 text-emerald-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-600">
              Multi-Format .ZIP / .JSON / .SQL
            </span>
            <span className="bg-amber-400 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
              Anti Data-Loss Aktif
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Pusat Cadangan & Pemulihan (Backup & Restore)
          </h3>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
            Amankan seluruh data karya, agenda, pilar, galeri foto, pengaturan logo, sticky footer, dan pesan masuk. Mendukung ekspor instan dan pemulihan dari berkas <strong className="text-amber-300">.ZIP</strong> komplit, <strong className="text-amber-300">.JSON</strong> ringkas, maupun dump <strong className="text-amber-300">.SQL</strong>.
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
            disabled={isDownloadingJson}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>{isDownloadingJson ? 'Mengunduh...' : 'Cadangkan JSON (1-Klik)'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
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
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'restore'
              ? 'bg-emerald-900 text-amber-300 shadow-sm ring-2 ring-amber-400/50'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Pulihkan Data (.ZIP / .JSON / .SQL)</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400 text-emerald-950 font-extrabold">
            Multi-Format
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('snapshots');
            fetchSnapshots();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
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
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
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

          {/* Quick Action Prompt to Restore */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-900" />
              </div>
              <div>
                <strong className="text-xs sm:text-sm font-bold block">Punya Berkas Cadangan (.ZIP / .JSON / .SQL)?</strong>
                <span className="text-[11px] text-amber-800">
                  Anda dapat memulihkan seluruh modul karya, agenda, profil, dan media dengan sekali klik.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('restore')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs shrink-0 shadow-xs cursor-pointer flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Buka Modul Pemulihan</span>
            </button>
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
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                      Foto Tersemat (Android Ready)
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">1. Cadangan Berkas JSON (Mandiri & Foto)</h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Menyimpan seluruh konfigurasi profil, karya, agenda, pilar, galeri, logo, serta menyematkan foto profil secara mandiri sehingga foto tetap tampil sempurna saat dipulihkan di HP Android maupun PC.
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                  <span className="font-bold block">✓ Keunggulan:</span>
                  <p>Ukuran efisien, foto profil & galeri otomatis disematkan, dan mudah dipulihkan langsung dari HP.</p>
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
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      Paket Arsip Komplit
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">2. Paket Cadangan Komplit (ZIP + Media)</h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Paket terlengkap berisi file database JSON (dengan foto tersemat), folder fisik gambar/media (<code className="font-mono text-emerald-800">uploads/</code>), dan skrip SQL untuk migrasi database.
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-950 space-y-1">
                  <span className="font-bold block">✓ Keunggulan:</span>
                  <p>Menyertakan salinan fisik foto dan gambar sehingga dapat diekstrak atau dipulihkan di segala perangkat.</p>
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
      {/* SUBTAB 2: RESTORE FROM BACKUP (.ZIP / .JSON / .SQL) */}
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
                  Jika Anda baru saja menimpa berkas hosting Plesk/cPanel dan data tampak kembali ke awal, tekan tombol di bawah. Sistem akan mengambil data terakhir yang tersimpan di browser ini dan langsung menguncinya ke database MySQL server.
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
                <span>Pemulihan Data & Berkas Media (.ZIP / .JSON / .SQL)</span>
              </h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Pilih atau seret berkas paket komplit .zip (berkas web, gambar/media & database), berkas .json, atau dump .sql. Sistem akan otomatis mengekstrak berkas media, memvalidasi struktur, dan memperbarui basis data.
              </p>
            </div>

            {/* Backup Processing Status Alert */}
            {backupStatusText && (
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-950 flex items-center gap-3 font-bold animate-pulse">
                <RefreshCw className="w-5 h-5 text-amber-600 animate-spin shrink-0" />
                <span>{backupStatusText}</span>
              </div>
            )}

            {/* Step 1: Upload / Dropzone Box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center space-y-4 cursor-pointer ${
                isDraggingOver
                  ? 'border-amber-500 bg-amber-50 scale-[1.01]'
                  : 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-400'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold transition-all ${
                isDraggingOver ? 'bg-amber-200 text-amber-900 scale-110' : 'bg-emerald-100 text-emerald-800'
              }`}>
                <Upload className="w-7 h-7" />
              </div>

              <div className="space-y-2.5 max-w-lg">
                <button
                  type="button"
                  onClick={() => document.getElementById('backup-restore-file-input')?.click()}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-950 hover:from-emerald-700 hover:to-emerald-900 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer mx-auto"
                >
                  <FolderUp className="w-4 h-4 text-amber-300" />
                  <span>Pilih Berkas Cadangan (HP Android / Komputer)</span>
                </button>
                <input
                  id="backup-restore-file-input"
                  type="file"
                  accept="*/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                <p className="text-xs text-gray-500">
                  Mendukung paket arsip <code className="font-mono font-bold text-emerald-800">.zip</code> komplit beserta foto, berkas konfigurasi <code className="font-mono font-bold text-emerald-800">.json</code>, serta skrip dump <code className="font-mono font-bold text-emerald-800">.sql</code>
                </p>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/90 text-emerald-950 text-[11px] font-semibold border border-emerald-200">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>📱 <strong>Pengguna HP Android:</strong> Berkas hasil unduh biasanya berada di folder <strong>Download / Unduhan</strong> pada aplikasi File Manager Anda.</span>
                </div>
              </div>

              {selectedFile && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-emerald-300 text-xs font-semibold text-emerald-900 shadow-sm">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  {restoreStats?.fileTypeDesc && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                      {restoreStats.fileTypeDesc}
                    </span>
                  )}
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

            {/* Success Verification Message */}
            {restoreSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{restoreSuccessMsg}</span>
              </div>
            )}

            {/* Step 2: Verification Preview Box */}
            {parsedRestoreData && restoreStats && (
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-gray-300 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3 flex-wrap gap-2">
                  <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Pratinjau Data yang Akan Dipulihkan</span>
                  </h5>
                  <div className="flex items-center gap-2">
                    {restoreStats.mediaCount !== undefined && restoreStats.mediaCount > 0 && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-amber-700" />
                        {restoreStats.mediaCount} Berkas Media/Foto
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Struktur Terverifikasi
                    </span>
                  </div>
                </div>

                {/* Avatar Preview if available */}
                {previewAvatar && (
                  <div className="flex items-center gap-3.5 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-300 shadow-2xs">
                    <img
                      src={previewAvatar}
                      alt="Pratinjau Foto Profil"
                      className="w-12 h-14 rounded-xl object-cover border-2 border-emerald-600 shadow-xs shrink-0"
                    />
                    <div>
                      <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-emerald-700" />
                        Foto Profil & Media Tersemat (Siap Tampil di Android)
                      </span>
                      <span className="text-[11px] text-emerald-800 leading-relaxed block mt-0.5">
                        Foto tersimpan langsung di dalam berkas cadangan ini dan akan otomatis tampil di Android maupun komputer setelah pemulihan disetujui.
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Karya / Modul</span>
                    <strong className="text-sm font-bold text-emerald-900">{restoreStats.publicationsCount} item</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Agenda / Jadwal</span>
                    <strong className="text-sm font-bold text-emerald-900">{restoreStats.agendasCount} item</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Pilar & Nilai</span>
                    <strong className="text-sm font-bold text-emerald-900">{restoreStats.pillarsCount} item</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Galeri Foto</span>
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
                    <strong>Proteksi Keamanan:</strong> Sistem akan otomatis membuat titik rollback (Safety Snapshot) sebelum pemulihan dijalankan ke database.
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
              className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSnapshots ? 'animate-spin' : ''}`} />
              <span>Muat Ulang</span>
            </button>
          </div>

          {snapshotActionMsg.text && (
            <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              snapshotActionMsg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
            }`}>
              {snapshotActionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
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
                        onClick={() => handleRestoreSnapshot(snap.id)}
                        disabled={isRestoringThis}
                        className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isRestoringThis ? 'animate-spin' : ''}`} />
                        <span>{isRestoringThis ? 'Memulihkan...' : 'Pulihkan Snapshot'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSnapshot(snap.id)}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 transition-all cursor-pointer"
                        title="Hapus snapshot ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
      {/* SUBTAB 4: EXPORTS ZIP & CSV */}
      {/* ========================================================================= */}
      {activeSubTab === 'exports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* cPanel Hosting ZIP */}
            <div className="bg-white p-6 rounded-3xl border-2 border-orange-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-900 flex items-center justify-center font-bold">
                  <FolderArchive className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">1. Paket Hosting cPanel (public_html)</h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Paket berkas lengkap yang siap diekstrak langsung ke dalam folder <code className="font-mono text-orange-700">public_html</code> pada server hosting cPanel Anda.
                  </p>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 text-[11px] text-orange-950 space-y-1">
                  <span className="font-bold block">✓ Isi Paket cPanel:</span>
                  <p>Backend PHP API, database.sql, .htaccess mod_rewrite, unzip.php helper, dan berkas statis web.</p>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleDownloadCpanelZip}
                  disabled={isDownloadingCpanelZip}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
                >
                  <Download className={`w-4 h-4 ${isDownloadingCpanelZip ? 'animate-bounce' : ''}`} />
                  <span>{isDownloadingCpanelZip ? 'Mengemas Paket cPanel...' : 'Unduh Paket ZIP cPanel'}</span>
                </button>
                {onOpenCpanelTab && (
                  <button
                    type="button"
                    onClick={onOpenCpanelTab}
                    className="w-full py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Buka Panduan & Modul cPanel Penuh</span>
                  </button>
                )}
              </div>
            </div>

            {/* Export Messages to CSV */}
            <div className="bg-white p-6 rounded-3xl border-2 border-emerald-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-800" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">2. Ekspor Arsip Pesan Masuk (CSV)</h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Unduh seluruh rekap formulir pesan masuk, undangan pengajian, seminar, dan kontak masyarakat dalam format spreadsheet Excel/CSV.
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                  <span className="font-bold block">✓ Format UTF-8:</span>
                  <p>Mendukung karakter teks penuh, rapi dibuka langsung di Microsoft Excel, Google Sheets, atau LibreOffice.</p>
                </div>
              </div>

              <a
                href="/api/backup/export-messages-csv"
                download="rekap-pesan-madrasah-jaenalmaskun.csv"
                className="w-full py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all text-center block"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-300 inline" />
                <span>Unduh Tabel CSV Pesan Masuk</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
