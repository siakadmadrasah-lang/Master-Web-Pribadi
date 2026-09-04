import JSZip from 'jszip';
import { HeaderLogoConfig, SiteContentConfig, StickyFooterConfig } from '../types';
import { defaultSiteContent } from '../data/personalData';
import { generateDatabaseSql } from './sqlGenerator';
import {
  generateDbConfigFile,
  generateIndexPhpFallback,
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
  triggerZipDownload
} from './pleskExporter';

export { triggerZipDownload };

export const CPANEL_DB_CONFIG = {
  host: 'localhost',
  user: 'jaenal_masterweb',
  dbName: 'jaenal_masterweb',
  username: 'jaenal_masterweb',
  database: 'jaenal_masterweb',
  password: 'masbagus15',
  port: 3306,
  charset: 'utf8mb4'
};

export const generateCpanelHtaccess = (): string => {
  return `# =============================================================
# .HTACCESS OPTIMIZED FOR CPANEL HOSTING (public_html)
# Website Personal Ust. Jaenal Maskun, S.Pd.I.
# =============================================================

# 1. UTF-8 Charset
AddDefaultCharset UTF-8
DefaultLanguage id-ID

# 2. Prevent Directory Listing & Secure Files
Options -Indexes +FollowSymLinks
ServerSignature Off

# 3. Protect Sensitive Configuration & Data
<FilesMatch "^(db_config|db_config\\.local|\\.env|composer|package|tsconfig|vite\\.config)\\.(php|json|ts|env|lock)$">
    <IfModule mod_authz_core.c>
        Require all denied
    </IfModule>
    <IfModule !mod_authz_core.c>
        Order allow,deny
        Deny from all
    </IfModule>
</FilesMatch>

# 4. GZIP / Brotli Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain text/html text/xml text/css application/xml application/xhtml+xml application/rss+xml application/javascript application/x-javascript application/json image/svg+xml
</IfModule>

# 5. Browser Caching
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/gif "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/webp "access plus 1 month"
    ExpiresByType image/svg+xml "access plus 1 month"
    ExpiresByType image/x-icon "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType application/x-javascript "access plus 1 month"
    ExpiresByType video/mp4 "access plus 1 month"
    ExpiresByType video/webm "access plus 1 month"
    ExpiresByType audio/mpeg "access plus 1 month"
</IfModule>

# 6. Security Headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-XSS-Protection "1; mode=block"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# 7. Media MIME Types
<IfModule mod_mime.c>
    AddType video/mp4 .mp4 .m4v
    AddType video/webm .webm
    AddType video/ogg .ogv
    AddType video/quicktime .mov .qt
    AddType video/x-matroska .mkv
    AddType audio/mpeg .mp3
    AddType audio/wav .wav
    AddType audio/ogg .oga .ogg
    AddType audio/mp4 .m4a .aac
</IfModule>

# 8. URL Rewriting for Single Page Application & API Routing
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # Ensure HTTPS
    RewriteCond %{HTTPS} off
    RewriteCond %{HTTP:X-Forwarded-Proto} !https
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

    # API Routing
    RewriteRule ^api/site-data/?$ api/site-data.php [QSA,L]
    RewriteRule ^api/site-content/?$ api/site-content.php [QSA,L]
    RewriteRule ^api/logo-config/?$ api/logo-config.php [QSA,L]
    RewriteRule ^api/sticky-footer-config/?$ api/sticky-footer-config.php [QSA,L]
    RewriteRule ^api/sync-to-mysql/?$ api/sync-to-mysql.php [QSA,L]
    RewriteRule ^api/share-settings/?$ api/share-settings.php [QSA,L]
    RewriteRule ^api/upload-thumbnail/?$ api/upload-thumbnail.php [QSA,L]
    RewriteRule ^api/sync-status/?$ api/sync-status.php [QSA,L]
    RewriteRule ^api/upload-image/?$ api/upload-image.php [QSA,L]
    RewriteRule ^api/upload-file/?$ api/upload-file.php [QSA,L]
    RewriteRule ^api/upload-video-chunk/?$ api/upload-video-chunk.php [QSA,L]
    RewriteRule ^api/upload-video/?$ api/upload-video.php [QSA,L]
    RewriteRule ^api/upload-video-form/?$ api/upload-video.php [QSA,L]
    RewriteRule ^api/messages/?$ api/messages.php [QSA,L]
    RewriteRule ^api/settings/?$ api/settings.php [QSA,L]
    RewriteRule ^api/test-db/?$ api/test_db.php [QSA,L]
    RewriteRule ^api/mysql-status/?$ api/test_db.php [QSA,L]
    RewriteRule ^api/admin/login/?$ api/admin-login.php [QSA,L]
    RewriteRule ^api/admin-login/?$ api/admin-login.php [QSA,L]
    RewriteRule ^api/admin/profile/?$ api/admin-profile.php [QSA,L]
    RewriteRule ^api/admin/update-profile/?$ api/admin-update-profile.php [QSA,L]
    RewriteRule ^api/admin/update-password/?$ api/admin-update-password.php [QSA,L]
    RewriteRule ^api/export-cpanel-zip/?$ api/export-cpanel-zip.php [QSA,L]
    RewriteRule ^api/export-plesk-zip/?$ api/export-zip.php [QSA,L]

    # Backup & Restore Endpoints
    RewriteRule ^api/backup/snapshots/?$ api/backup-snapshots.php [QSA,L]
    RewriteRule ^api/backup/restore/?$ api/backup-restore.php [QSA,L]
    RewriteRule ^api/backup/restore-zip/?$ api/backup-restore-zip.php [QSA,L]
    RewriteRule ^api/backup/full/?$ api/backup-full.php [QSA,L]
    RewriteRule ^api/backup/create-snapshot/?$ api/backup-create-snapshot.php [QSA,L]
    RewriteRule ^api/backup/restore-snapshot/?$ api/backup-restore-snapshot.php [QSA,L]
    RewriteRule ^api/backup/snapshot/([^/]+)/?$ api/backup-delete-snapshot.php?id=$1 [QSA,L]
    RewriteRule ^api/backup/export-messages-csv/?$ api/backup-export-csv.php [QSA,L]
    RewriteRule ^api/backup/zip-data/?$ api/backup-zip-data.php [QSA,L]

    # Direct access to physical files or folders
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteCond %{REQUEST_URI} !\\.(html|htm)$ [NC]
    RewriteRule ^ - [L]

    # SPA Fallback to index.php
    RewriteRule ^(.*)$ index.php [QSA,L]
</IfModule>
`;
};

export const generateCpanelReadme = (): string => {
  return `# PANDUAN DEPLOYMENT CPANEL HOSTING (public_html)
======================================================
Website Resmi Ust. Jaenal Maskun, S.Pd.I.
Dibuat: ${new Date().toLocaleString('id-ID')}

Paket ZIP ini dirancang khusus untuk deployment instan di server hosting berbasis cPanel.

---

### LANGKAH 1: MEMBUAT DATABASE MYSQL DI CPANEL
1. Masuk ke cPanel hosting Anda (misal: \`https://namadomainanda.com/cpanel\`).
2. Cari menu **"MySQL Database Wizard"** atau **"MySQL Databases"**.
3. Buat Database baru, misalnya: \`username_jaenalweb\`.
4. Buat Pengguna (User) baru, misalnya: \`username_admin\`, lalu buat Password yang kuat.
5. Kaitkan Pengguna ke Database tersebut dan centang **"ALL PRIVILEGES"** (Semua Hak Akses).
6. Catat nama database, username, dan password tersebut.

---

### LANGKAH 2: IMPOR DATABASE DENGAN PHPMYADMIN
1. Di cPanel, klik menu **"phpMyAdmin"**.
2. Pilih nama database yang baru Anda buat di panel sebelah kiri.
3. Klik tab **"Import"** di bagian atas.
4. Klik tombol **"Choose File"** dan pilih berkas **\`database.sql\`** dari paket ZIP ini.
5. Gulir ke bawah lalu klik **"Go"** / **"Impor"**.
6. Tabel \`site_settings\`, \`messages\`, dan data awal website akan otomatis terpasang.

---

### LANGKAH 3: UNGGAH & EKSTRAK BERKAS KE PUBLIC_HTML
1. Di cPanel, buka menu **"File Manager"** (Pengelola Berkas).
2. Masuk ke direktori **\`public_html\`** (atau folder subdomain Anda).
3. Klik tombol **"Upload"** di bilah atas.
4. Unggah berkas **\`Web-Personal-Ust-Jaenal-cPanel-Hosting.zip\`**.
5. Setelah selesai, klik kanan berkas ZIP tersebut dan pilih **"Extract"** (Ekstrak).
6. Pastikan file terekstrak langsung di dalam \`public_html\` (sejajar dengan \`index.php\`, \`.htaccess\`, folder \`api/\`, dll).

*Alternatif Otomatis via Browser:*
Anda juga dapat mengekstrak menggunakan skrip pembantu: cukup unggah berkas ZIP dan \`unzip.php\` ke \`public_html\`, lalu buka \`https://namadomainanda.com/unzip.php\` di browser Anda, lalu klik "Ekstrak Semua".

---

### LANGKAH 4: HUBUNGKAN KONFIGURASI DATABASE
1. Di File Manager cPanel, cari berkas **\`db_config.local.php\`** (jika belum ada, buat atau edit \`db_config.php\`).
2. Masukkan rincian koneksi:
\`\`\`php
<?php
define('DB_HOST', 'localhost');
define('DB_PORT', 3306);
define('DB_NAME', 'username_jaenalweb');
define('DB_USER', 'username_admin');
define('DB_PASS', 'PasswordAnda123!');
define('DB_CHARSET', 'utf8mb4');
\`\`\`
3. Simpan berkas.

---

### FITUR ANTI DATA-LOSS:
- Berkas data asli di server (\`persisted_site_data.json\`, \`messages.json\`, \`db_config.local.php\`) TIDAK AKAN PERNAH terhapus atau tertimpa saat Anda memperbarui paket ZIP di masa mendatang.
- Modul Backup & Pemulihan Data di panel admin mendukung pemulihan langsung dari format .ZIP, .JSON, maupun dump .SQL.
`;
};

export const downloadCpanelPackageZip = async (
  siteContent?: SiteContentConfig,
  logoConfig?: HeaderLogoConfig,
  footerConfig?: StickyFooterConfig,
  onProgress?: (percent: number, message: string) => void
): Promise<Blob> => {
  if (onProgress) onProgress(25, 'Menyiapkan paket ZIP cPanel...');
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const response = await fetch('/api/export-cpanel-zip', { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('zip') || contentType.includes('octet-stream')) {
        if (onProgress) onProgress(85, 'Menyelesaikan paket cPanel ZIP...');
        const blob = await response.blob();
        if (onProgress) onProgress(100, 'Paket ZIP Hosting cPanel siap diunduh!');
        return blob;
      }
    }
  } catch (e) {
    console.warn('Server cPanel export fallback to client-side generation', e);
  }

  const zip = new JSZip();
  const content = siteContent || defaultSiteContent;

  if (onProgress) onProgress(35, 'Menyiapkan database MySQL & konfigurasi cPanel...');

  // 1. Root Database & Config files
  zip.file('database.sql', generateDatabaseSql(content, logoConfig, footerConfig));
  zip.file('db_config.php', generateDbConfigFile());
  zip.file('index.php', generateIndexPhpFallback());
  zip.file('.htaccess', generateCpanelHtaccess());
  zip.file('README_CPANEL.md', generateCpanelReadme());
  zip.file('PANDUAN_HOSTING_CPANEL.txt', generateCpanelReadme());

  // 2. Folder api/
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
    apiFolder.file('upload-video.php', generateApiUploadVideoPhp());
    apiFolder.file('admin-login.php', generateApiAdminLoginPhp());
    apiFolder.file('messages.php', generateApiMessagesPhp());
    apiFolder.file('settings.php', generateApiSettingsPhp());
    apiFolder.file('test_db.php', generateApiTestDbPhp());
    apiFolder.file('db_config.php', generateDbConfigFile());
  }

  // 3. Folder data/
  const dataFolder = zip.folder('data');
  if (dataFolder) {
    dataFolder.file('site_data.default.json', JSON.stringify({ siteContent: content, logoConfig, stickyFooterConfig: footerConfig }, null, 2));
    dataFolder.file('messages.default.json', JSON.stringify([], null, 2));
    dataFolder.file('PERLINDUNGAN_DATA_CPANEL.txt', 'Perlindungan Anti Data-Loss cPanel Aktif.');
  }

  if (onProgress) onProgress(75, 'Mengompresi berkas arsip cPanel...');

  const blob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    },
    (metadata) => {
      if (onProgress) {
        onProgress(75 + Math.round(metadata.percent * 0.25), `Mengompresi paket cPanel... (${Math.round(metadata.percent)}%)`);
      }
    }
  );

  if (onProgress) onProgress(100, 'Paket ZIP cPanel selesai dikemas!');
  return blob;
};
