import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import {
  generateDbConfigFile,
  generateHtaccessFile,
  generateIndexPhpFallback,
  generateOgImagePhp,
  generateUnzipPhpFile,
  generateReadmePlesk,
  generateApiSiteDataPhp,
  generateApiSiteContentPhp,
  generateApiLogoConfigPhp,
  generateApiStickyFooterConfigPhp,
  generateApiSyncToMysqlPhp,
  generateApiShareSettingsPhp,
  generateApiUploadThumbnailPhp,
  generateApiSyncStatusPhp,
  generateApiUploadImagePhp,
  generateApiUploadVideoChunkPhp,
  generateApiUploadVideoPhp,
  generateApiAdminLoginPhp,
  generateApiMessagesPhp,
  generateApiSettingsPhp,
  generateApiTestDbPhp,
  generateApiBackupZipPhp,
  generateApiBackupRestorePhp,
  generateApiBackupRestoreZipPhp,
  generateApiBackupSnapshotsPhp,
  generateApiBackupCreateSnapshotPhp,
  generateApiBackupRestoreSnapshotPhp,
  generateApiBackupDeleteSnapshotPhp,
  generateApiBackupExportCsvPhp,
  generateApiExportZipPhp,
  generateApiAdminProfilePhp,
} from '../src/utils/pleskExporter';
import { generateDatabaseSql } from '../src/utils/sqlGenerator';
import { defaultSiteContent, defaultHeaderLogo, defaultStickyFooterConfig } from '../src/data/personalData';

async function buildPleskZip() {
  console.log('Generating Plesk Deployment Package ZIP...');
  const zip = new JSZip();

  const dataDir = path.join(process.cwd(), 'data');
  const distDir = path.join(process.cwd(), 'dist');
  const publicDir = path.join(process.cwd(), 'public');
  const uploadsDataDir = path.join(dataDir, 'uploads');
  const uploadsPublicDir = path.join(publicDir, 'uploads');

  let siteContent = defaultSiteContent;
  const persistedFile = path.join(dataDir, 'persisted_site_data.json');
  if (fs.existsSync(persistedFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(persistedFile, 'utf-8'));
      siteContent = { ...defaultSiteContent, ...(parsed.siteContent || parsed) };
    } catch (e) {
      console.warn('Could not parse persisted_site_data.json, using default');
    }
  }

  // 1. Root Database & Config files
  zip.file('database.sql', generateDatabaseSql(siteContent, defaultHeaderLogo, defaultStickyFooterConfig));
  zip.file('db_config.php', generateDbConfigFile());
  zip.file('.htaccess', generateHtaccessFile());
  zip.file('index.php', generateIndexPhpFallback());
  zip.file('og-image.php', generateOgImagePhp());
  zip.file('unzip.php', generateUnzipPhpFile());
  zip.file('README_PLESK.md', generateReadmePlesk());
  zip.file('PANDUAN_HOSTING_PLESK.txt', generateReadmePlesk());

  // Also include app.js for Plesk Node.js extension
  zip.file('app.js', `// Plesk Node.js Entry Point
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || 3000;
require('./dist/server.cjs');
`);

  // 2. Folder api/ with full PHP backend
  const apiFolder = zip.folder('api');
  if (apiFolder) {
    apiFolder.file('site-data.php', generateApiSiteDataPhp());
    apiFolder.file('site-content.php', generateApiSiteContentPhp());
    apiFolder.file('logo-config.php', generateApiLogoConfigPhp());
    apiFolder.file('sticky-footer-config.php', generateApiStickyFooterConfigPhp());
    apiFolder.file('sync-to-mysql.php', generateApiSyncToMysqlPhp());
    apiFolder.file('share-settings.php', generateApiShareSettingsPhp());
    apiFolder.file('upload-thumbnail.php', generateApiUploadThumbnailPhp());
    apiFolder.file('sync-status.php', generateApiSyncStatusPhp());
    apiFolder.file('upload-image.php', generateApiUploadImagePhp());
    apiFolder.file('upload-file.php', generateApiUploadImagePhp());
    apiFolder.file('upload-video-chunk.php', generateApiUploadVideoChunkPhp());
    apiFolder.file('upload-video-form.php', generateApiUploadVideoPhp());
    apiFolder.file('admin-login.php', generateApiAdminLoginPhp());
    apiFolder.file('messages.php', generateApiMessagesPhp());
    apiFolder.file('settings.php', generateApiSettingsPhp());
    apiFolder.file('test_db.php', generateApiTestDbPhp());
    apiFolder.file('backup-zip.php', generateApiBackupZipPhp());
    apiFolder.file('backup-zip-data.php', generateApiBackupZipPhp());
    apiFolder.file('backup-restore.php', generateApiBackupRestorePhp());
    apiFolder.file('backup-restore-zip.php', generateApiBackupRestoreZipPhp());
    apiFolder.file('backup-snapshots.php', generateApiBackupSnapshotsPhp());
    apiFolder.file('backup-create-snapshot.php', generateApiBackupCreateSnapshotPhp());
    apiFolder.file('backup-restore-snapshot.php', generateApiBackupRestoreSnapshotPhp());
    apiFolder.file('backup-delete-snapshot.php', generateApiBackupDeleteSnapshotPhp());
    apiFolder.file('backup-export-csv.php', generateApiBackupExportCsvPhp());
    apiFolder.file('export-plesk-zip.php', generateApiExportZipPhp());
    apiFolder.file('export-cpanel-zip.php', generateApiExportZipPhp());
    apiFolder.file('export-zip.php', generateApiExportZipPhp());
    apiFolder.file('backup-full.php', generateApiBackupZipPhp());
    apiFolder.file('admin-profile.php', generateApiAdminProfilePhp());
    apiFolder.file('admin-update-profile.php', generateApiAdminProfilePhp());
    apiFolder.file('admin-update-password.php', generateApiAdminProfilePhp());
    apiFolder.file('db_config.php', generateDbConfigFile());
  }

  // 3. Folder data/
  const dataFolder = zip.folder('data');
  if (dataFolder) {
    dataFolder.file('site_data.default.json', JSON.stringify(siteContent, null, 2));
    dataFolder.file('messages.default.json', JSON.stringify([], null, 2));
    dataFolder.file('mysql_config.default.json', JSON.stringify({
      host: 'localhost',
      user: 'denbagus_masterweb',
      password: 'masbagus15',
      database: 'denbagus_masterweb',
      port: 3306
    }, null, 2));
    dataFolder.file('PERLINDUNGAN_DATA_PLESK.txt', `SISTEM ANTI DATA-LOSS AKTIF:
Berkas data live (persisted_site_data.json, messages.json, db_config.local.php) Anda di hosting Plesk dijamin 100% AMAN dan TIDAK AKAN PERNAH tertimpa saat Anda mengekstrak paket ZIP baru ini.`);
  }

  // 4. Uploads directory (active media)
  const uploadsFolder = zip.folder('uploads');
  const candidateUploads = [uploadsPublicDir, uploadsDataDir];
  const addedFiles = new Set<string>();

  for (const uDir of candidateUploads) {
    if (fs.existsSync(uDir)) {
      const files = fs.readdirSync(uDir);
      for (const file of files) {
        if (addedFiles.has(file) || file.startsWith('.')) continue;
        const filePath = path.join(uDir, file);
        if (fs.statSync(filePath).isFile()) {
          uploadsFolder?.file(file, fs.readFileSync(filePath));
          addedFiles.add(file);
        }
      }
    }
  }

  // 5. Static dist folder contents
  if (fs.existsSync(distDir)) {
    const addDir = (currentPath: string, zipParent: JSZip) => {
      const entries = fs.readdirSync(currentPath);
      for (const entry of entries) {
        if (entry === 'uploads' || entry === 'assets/uploads') continue;
        const full = path.join(currentPath, entry);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          const sub = zipParent.folder(entry);
          if (sub) addDir(full, sub);
        } else {
          // Do not re-add existing files if already placed
          if (!zipParent.file(entry)) {
            zipParent.file(entry, fs.readFileSync(full));
          }
        }
      }
    };
    addDir(distDir, zip);
  }

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const zipName = 'Web-Personal-Ust-Jaenal-Plesk-Hosting.zip';
  const outPathRoot = path.join(process.cwd(), zipName);
  const outPathPublic = path.join(publicDir, zipName);
  const outPathDist = path.join(distDir, zipName);

  fs.writeFileSync(outPathRoot, zipBuffer);
  fs.writeFileSync(outPathPublic, zipBuffer);
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(outPathDist, zipBuffer);
  }

  console.log(`✅ Sukses membuat ZIP Plesk!`);
  console.log(`- Ukuran: ${(zipBuffer.length / (1024 * 1024)).toFixed(2)} MB (${zipBuffer.length} bytes)`);
  console.log(`- Lokasi: ${outPathRoot}`);
  console.log(`- Akses Web: /${zipName}`);
}

buildPleskZip().catch((err) => {
  console.error('Error generating plesk zip:', err);
  process.exit(1);
});
