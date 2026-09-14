import JSZip from 'jszip';
import { HeaderLogoConfig, SiteContentConfig, StickyFooterConfig } from '../types';
import { defaultSiteContent } from '../data/personalData';
import { generateDatabaseSql } from './sqlGenerator';
import {
  generateDbConfigFile,
  generateIndexPhpFallback,
  generateOgImagePhp,
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
  triggerZipDownload
} from './pleskExporter';

export { triggerZipDownload };

export const CPANEL_DB_CONFIG = {
  host: 'localhost',
  user: 'denbagus_webpersonal',
  dbName: 'denbagues_webpersonal',
  username: 'denbagus_webpersonal',
  database: 'denbagues_webpersonal',
  password: 'masbagus15',
  port: 3306,
  charset: 'utf8mb4'
};

export const generateCpanelHtaccess = (): string => {
  return `# =============================================================
# .HTACCESS OPTIMIZED FOR CPANEL HOSTING (public_html)
# Website Personal Ust. Jaenal Maskun, S.Pd.I.
# =============================================================

# 0. Entry Point Configuration
DirectoryIndex index.php index.html

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

# 5. Anti-Cache for Social Media OpenGraph Thumbnails
<FilesMatch "^(og-image|thumbnail|og-preview)\\.(jpg|jpeg|png)$">
    <IfModule mod_expires.c>
        ExpiresActive Off
    </IfModule>
    <IfModule mod_headers.c>
        Header set Cache-Control "no-cache, no-store, must-revalidate, max-age=0"
        Header set Pragma "no-cache"
        Header set Expires 0
    </IfModule>
</FilesMatch>

# 6. Browser Caching for Static Assets
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

# 7. Security Headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-XSS-Protection "1; mode=block"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# 8. Media MIME Types
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

# 9. URL Rewriting for Single Page Application & API Routing
<IfModule mod_rewrite.c>
    RewriteEngine On
    # RewriteBase dinamis - otomatis menyesuaikan bila ditaruh di root public_html ataupun subfolder
    # RewriteBase /

    # Ensure HTTPS
    RewriteCond %{HTTPS} off
    RewriteCond %{HTTP:X-Forwarded-Proto} !https
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

    # Dynamic Social Media & OpenGraph Thumbnail (Anti-Cache)
    RewriteRule ^(og-image|thumbnail|og-preview)\\.(jpg|jpeg|png)$ og-image.php [QSA,L]

    # Ensure root and index.html are processed by index.php for dynamic OpenGraph injection
    RewriteRule ^$ index.php [QSA,L]
    RewriteRule ^index\\.html$ index.php [QSA,L]

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
  if (onProgress) onProgress(25, 'Menyiapkan paket ZIP cPanel dari server...');
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    const response = await fetch('/api/export-cpanel-zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteContent,
        logoConfig,
        stickyFooterConfig: footerConfig
      }),
      signal: controller.signal
    });
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
  zip.file('og-image.php', generateOgImagePhp());
  zip.file('.htaccess', generateCpanelHtaccess());
  zip.file('bridge.html', `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Website Resmi Ust. Jaenal Maskun, S.Pd.I.</title>
  <script>
    (function() {
      var currentPath = window.location.pathname;
      var params = new URLSearchParams(window.location.search);
      var targetFolder = params.get('folder') || 'web';
      if (currentPath.indexOf('/' + targetFolder) === 0) return;
      var search = window.location.search ? window.location.search : '';
      var hash = window.location.hash ? window.location.hash : '';
      window.location.replace('/' + targetFolder + '/' + search + hash);
    })();
  </script>
  <style>
    body { font-family: system-ui, sans-serif; background: #064e3b; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
    .card { background: rgba(255,255,255,0.08); border: 1px solid rgba(251,191,36,0.3); border-radius: 20px; padding: 32px; max-width: 480px; width: 90%; }
    h1 { font-size: 1.25rem; color: #fde68a; }
    p { font-size: 0.9rem; color: #e2e8f0; line-height: 1.6; }
    a.btn { display: inline-block; margin-top: 16px; padding: 12px 24px; background: #f59e0b; color: #022c22; font-weight: bold; border-radius: 12px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Menghubungkan ke Website...</h1>
    <p>Sedang memuat portal Ust. Jaenal Maskun, S.Pd.I. Klik di bawah jika tidak beralih otomatis:</p>
    <a id="btn" class="btn" href="./web/">Buka Website Sekarang &rarr;</a>
  </div>
  <script>
    var p = new URLSearchParams(window.location.search);
    var t = p.get('folder') || 'web';
    var b = document.getElementById('btn');
    if (b) b.href = './' + t + '/';
  </script>
</body>
</html>`);
  zip.file('redirect.html', zip.file('bridge.html') ? '' : '');
  zip.file('symlink_maker.php', `<?php
/**
 * Utilitas Pembuat Tautan Simbolik (Symlink) cPanel
 * Web Personal Ust. Jaenal Maskun, S.Pd.I.
 */
@ini_set('display_errors', '1');
error_reporting(E_ALL);
$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? __DIR__;
$msg = '';
$status = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $target = trim($_POST['target_folder'] ?? '');
    $link = trim($_POST['link_name'] ?? 'web');
    if (empty($target)) {
        $msg = 'Harap masukkan path target folder.';
        $status = 'error';
    } else {
        $linkPath = rtrim($docRoot, '/') . '/' . ltrim($link, '/');
        if (file_exists($linkPath) || is_link($linkPath)) {
            $msg = "Tautan simbolik atau folder '$link' sudah ada.";
            $status = 'error';
        } else {
            if (@symlink($target, $linkPath)) {
                $msg = "Berhasil membuat tautan simbolik dari '$target' ke '$linkPath'.";
                $status = 'success';
            } else {
                $msg = "Gagal membuat symlink. Kemungkinan fungsi symlink dinonaktifkan hosting.";
                $status = 'error';
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Symlink Maker cPanel - Web Ust. Jaenal Maskun</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #064e3b; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: rgba(255,255,255,0.08); border: 1px solid rgba(251,191,36,0.3); border-radius: 20px; padding: 32px; max-width: 500px; width: 90%; }
    h1 { font-size: 1.25rem; color: #fde68a; margin-top: 0; }
    input[type=text] { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ccc; margin-top: 6px; box-sizing: border-box; }
    button { margin-top: 16px; padding: 12px 24px; background: #f59e0b; color: #022c22; font-weight: bold; border: none; border-radius: 12px; cursor: pointer; }
    .msg { margin-top: 16px; padding: 12px; border-radius: 8px; font-size: 0.9rem; }
    .success { background: #065f46; color: #a7f3d0; }
    .error { background: #991b1b; color: #fecaca; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Pembuat Tautan Simbolik (cPanel)</h1>
    <?php if ($msg): ?><div class="msg <?= $status ?>"><?= htmlspecialchars($msg) ?></div><?php endif; ?>
    <form method="POST">
      <label>Path Target Folder:</label>
      <input type="text" name="target_folder" placeholder="/home/username/folder_anda" required>
      <label style="margin-top:12px;display:block;">Nama Tautan (di public_html):</label>
      <input type="text" name="link_name" value="web" required>
      <button type="submit">Buat Tautan Simbolik</button>
    </form>
  </div>
</body>
</html>`);
  zip.file('index_bridge.php', `<?php
/**
 * Jembatan Akses Web (Bridge Wrapper) cPanel
 * Web Personal Ust. Jaenal Maskun, S.Pd.I.
 */
@ini_set('display_errors', '0');
error_reporting(0);
$targetFolder = 'web';
$targetPath = __DIR__ . '/' . $targetFolder;
if (file_exists($targetPath . '/index.php')) {
    chdir($targetPath);
    require $targetPath . '/index.php';
    exit;
} elseif (file_exists($targetPath . '/index.html')) {
    header('Location: ./' . $targetFolder . '/');
    exit;
} else {
    echo "Folder website '$targetFolder' belum ditemukan. Pastikan Anda telah mengekstrak ZIP ke dalam subfolder 'public_html/$targetFolder/'.";
}
`);
  zip.file('README_CPANEL.md', generateCpanelReadme());
  zip.file('PANDUAN_HOSTING_CPANEL.txt', generateCpanelReadme());
  zip.file('PANDUAN_AKSES_FOLDER_LUAR_PUBLIC_HTML.txt', `================================================================================
PANDUAN MENJALANKAN WEBSITE DI DALAM SUBFOLDER PUBLIC_HTML (cPanel)
Web Personal Ust. Jaenal Maskun, S.Pd.I.
================================================================================

Apakah website bisa langsung aktif jika ditaruh di dalam folder buatan Anda
di dalam public_html (misal: public_html/web/ atau public_html/profil/)?

JAWABANNYA: YA, 100% BISA & LANGSUNG AKTIF OTOMATIS!

Website ini telah dirancang khusus dengan sistem "Self-Adaptive Subfolder Engine":
- Skrip CSS & JavaScript menggunakan relative base path (./assets/...)
- Panggilan API (/api/...) dan gambar (/uploads/...) otomatis disesuaikan
  ke nama subfolder apa pun yang Anda gunakan secara dinamis.
- Database MySQL & file JSON diatur menggunakan path server lokal (__DIR__).

--------------------------------------------------------------------------------
LANGKAH 1: EKSTRAK ZIP KE SUBFOLDER PILIHAN ANDA
--------------------------------------------------------------------------------
1. Masuk ke cPanel > File Manager.
2. Buka folder "public_html".
3. Buat folder baru sesuai keinginan Anda, contoh:
   - "web"       -> lokasi: public_html/web/
   - "profil"    -> lokasi: public_html/profil/
   - "ustadz"    -> lokasi: public_html/ustadz/
4. Upload file ZIP ini ke dalam folder tersebut, lalu klik kanan > "Extract".
5. Pastikan semua berkas (.htaccess, index.php, index.html, folder api, dll)
   berada langsung di dalam folder tersebut (bukan tersarang di subfolder ganda).

--------------------------------------------------------------------------------
LANGKAH 2: CARA AKSES WEBSITE ANDA
--------------------------------------------------------------------------------
Website Anda LANGSUNG AKTIF dan bisa dibuka di browser:
👉 https://domainanda.com/nama-folder/
(Contoh: https://domainanda.com/web/ atau https://domainanda.com/profil/)

Semua fitur (halaman utama, tasbih digital, modul madrasah, form pesan, galeri,
hingga admin portal) langsung bekerja penuh!

--------------------------------------------------------------------------------
LANGKAH 3 (OPSIONAL): INGIN DOMAIN UTAMA OTOMATIS MEMBUKA SUBFOLDER TERSEBUT?
--------------------------------------------------------------------------------
Jika Anda ingin saat seseorang membuka https://domainanda.com (tanpa mengetik nama
folder) langsung otomatis menampilkan website di dalam subfolder:

PILIHAN A (Paling Mudah - Pakai bridge.html):
1. Salin berkas "bridge.html" dari subfolder ke folder root "public_html/".
2. Ubah nama berkasnya di "public_html/" menjadi "index.html".
3. Pengunjung domain utama akan langsung dialihkan ke subfolder secara instan!

PILIHAN B (Tanpa Redirect URL - Pakai index_bridge.php):
1. Salin berkas "index_bridge.php" dari subfolder ke folder root "public_html/".
2. Ubah namanya menjadi "index.php" di "public_html/".
3. Website akan tampil langsung di domain utama seolah-olah ditaruh di root!

PILIHAN C (Pengaturan Domain cPanel):
1. Di cPanel, buka menu "Domains".
2. Ubah "Document Root" domain utama Anda dari "public_html" menjadi
   "public_html/web" (atau nama folder Anda). Klik Update.

================================================================================
Semoga panduan ini membantu kelancaran dakwah & karya Ust. Jaenal Maskun, S.Pd.I.
================================================================================`);

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
    apiFolder.file('backup-zip.php', generateApiBackupZipPhp());
    apiFolder.file('backup-zip-data.php', generateApiBackupZipPhp());
    apiFolder.file('backup-restore.php', generateApiBackupRestorePhp());
    apiFolder.file('backup-restore-zip.php', generateApiBackupRestoreZipPhp());
    apiFolder.file('backup-snapshots.php', generateApiBackupSnapshotsPhp());
    apiFolder.file('backup-create-snapshot.php', generateApiBackupCreateSnapshotPhp());
    apiFolder.file('backup-restore-snapshot.php', generateApiBackupRestoreSnapshotPhp());
    apiFolder.file('backup-delete-snapshot.php', generateApiBackupDeleteSnapshotPhp());
    apiFolder.file('backup-export-csv.php', generateApiBackupExportCsvPhp());
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
