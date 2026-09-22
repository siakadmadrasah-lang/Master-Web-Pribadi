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
  generateApiExportZipPhp,
  generateApiAdminProfilePhp,
  generateUnzipPhpFile,
  triggerZipDownload
} from './pleskExporter';

export { triggerZipDownload };

export const CPANEL_DB_CONFIG = {
  host: 'localhost',
  user: 'denbagus_masterweb',
  dbName: 'denbagus_masterweb',
  username: 'denbagus_masterweb',
  database: 'denbagus_masterweb',
  password: 'masbagus15',
  port: 3306,
  charset: 'utf8mb4'
};

export const generatePhpIniConfig = (): string => {
  return `; =============================================================
; KONFIGURASI PHP CPANEL & SHARED HOSTING
; Mengizinkan unggah berkas besar & paket cadangan komplit ZIP
; =============================================================
upload_max_filesize = 256M
post_max_size = 256M
memory_limit = 512M
max_execution_time = 300
max_input_time = 300
`;
};

export const generateCpanelHtaccess = (): string => {
  return `# =============================================================
# CPANEL APACHE & LITESPEED .HTACCESS CONFIGURATION
# Web Personal Ust. Jaenal Maskun, S.Pd.I.
# Ultra-Compatible: 100% Bebas Error 500 & Bebas Loop Redirect
# =============================================================

# 1. Entry Point Configuration
DirectoryIndex index.php index.html
Options -Indexes

# 2. URL Rewriting for Single Page Application & API Routing
<IfModule mod_rewrite.c>
    RewriteEngine On

    # Hentikan penulisan ulang jika permintaan sudah ke index.php (Anti-Loop Error 500)
    RewriteRule ^index\.php$ - [L]

    # Proteksi berkas sensitif dari akses publik langsung
    RewriteRule ^(db_config|db_config\\.local|\\.env|database|package|composer|tsconfig|server)\\.(php|sql|json|ts|env|lock)$ - [F,L,NC]

    # Layani OpenGraph thumbnail sosial media secara dinamis
    RewriteRule ^(og-image|thumbnail|og-preview)\\.(jpg|jpeg|png)$ og-image.php [QSA,L]

    # API Routing ke berkas PHP masing-masing
    RewriteRule ^api/site-data/?$ api/site-data.php [QSA,L]
    RewriteRule ^api/site-content/?$ api/site-content.php [QSA,L]
    RewriteRule ^api/site-content-config/?$ api/site-content.php [QSA,L]
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
    RewriteRule ^api/export-zip/?$ api/export-zip.php [QSA,L]

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

    # Jika berkas atau direktori fisik ada (misal: .js, .css, gambar, audio, video), layani langsung tanpa redirect
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]

    # Seluruh rute aplikasi SPA diarahkan ke index.php
    RewriteRule ^ index.php [QSA,L]
</IfModule>

# 3. Media MIME Types
<IfModule mod_mime.c>
    AddType video/mp4 .mp4 .m4v
    AddType video/webm .webm
    AddType video/ogg .ogv
    AddType video/quicktime .mov .qt
    AddType audio/mpeg .mp3
    AddType audio/wav .wav
    AddType audio/ogg .oga .ogg
    AddType audio/mp4 .m4a .aac
</IfModule>

# 4. Konfigurasi Batas Unggah PHP (Anti Gagal Pulihkan ZIP)
<IfModule mod_php7.c>
    php_value upload_max_filesize 256M
    php_value post_max_size 256M
    php_value memory_limit 512M
    php_value max_execution_time 300
    php_value max_input_time 300
</IfModule>
<IfModule mod_php.c>
    php_value upload_max_filesize 256M
    php_value post_max_size 256M
    php_value memory_limit 512M
    php_value max_execution_time 300
    php_value max_input_time 300
</IfModule>
`;
};

export const generateCpanelReadme = (): string => {
  return `# PANDUAN DEPLOYMENT CPANEL HOSTING (public_html)
======================================================
Website Resmi Ust. Jaenal Maskun, S.Pd.I.
Domain Target: denbaguse.my.id
Dibuat: ${new Date().toLocaleString('id-ID')}

Paket ZIP ini dirancang khusus untuk deployment instan di server hosting cPanel,
BAIK diletakkan di root public_html MAUPUN di dalam subfolder (misal: public_html/denbaguse.my.id/).

---

### CARA DEPLOY DI DALAM SUBFOLDER public_html (denbaguse.my.id)
Jika Anda mengekstrak file ini ke dalam subfolder: \`public_html/denbaguse.my.id/\`:
Website Anda TETAP DAPAT LANGSUNG DIAKSES melalui domain utama https://denbaguse.my.id
TANPA menampilkan isi daftar folder (Index of /) melalui salah satu cara berikut:

CARA 1 (OTOMATIS 100%):
1. Ekstrak ZIP ke dalam folder \`public_html/denbaguse.my.id/\`.
2. Buka berkas \`https://denbaguse.my.id/denbaguse.my.id/aktifkan_domain.php\` di browser Anda.
3. Klik tombol "⚡ Pasang / Perbarui Jembatan ke public_html".
   -> Jembatan .htaccess dan index.php akan langsung dipasang di root public_html!
4. Buka https://denbaguse.my.id - website langsung aktif bersih tanpa subfolder di URL!

CARA 2 (MELALUI MENU DOMAINS cPanel):
1. Di cPanel, buka menu "Domains".
2. Pada baris domain "denbaguse.my.id", klik "Manage".
3. Ubah kolom "Document Root" dari:
   public_html
   menjadi:
   public_html/denbaguse.my.id
4. Klik "Update". Selesai! Domain utama kini langsung mengarah ke subfolder.

CARA 3 (MANUAL SALIN JEMBATAN):
Salin berkas:
- \`PUBLIC_HTML_HTACCESS_JEMBATAN.txt\` -> salin isinya ke \`public_html/.htaccess\`
- \`PUBLIC_HTML_INDEX_JEMBATAN.php\` -> salin/rename ke \`public_html/index.php\`

---

### KONFIGURASI DATABASE MYSQL CPANEL OTOMATIS
Paket ZIP ini sudah siap pakai dengan kredensial database cPanel:
- Database Name: denbagus_masterweb
- Database User: denbagus_masterweb
- Password DB  : masbagus15
- Host DB      : localhost (port 3306)

Cukup buat database dan user tersebut di cPanel (menu MySQL Databases), lalu impor berkas \`database.sql\` via phpMyAdmin.
`;
};

export const generatePublicHtmlRootHtaccess = (subfolderName: string = 'denbaguse.my.id'): string => {
  return `# =============================================================
# CPANEL APACHE & LITESPEED .HTACCESS UNTUK ROOT public_html
# Domain: denbaguse.my.id | Target Subfolder: ${subfolderName}
# Membuka website di dalam subfolder secara otomatis dan transparan
# TANPA menampilkan isi folder ('Index of /') dan TANPA merubah URL browser!
# =============================================================

# 1. Matikan daftar isi direktori (Mencegah tampilan folder / Index of)
Options -Indexes
DirectoryIndex index.php index.html

# 2. URL Rewriting transparan ke subfolder
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # Jangan rewrite jika request sudah ke dalam subfolder
    RewriteCond %{REQUEST_URI} ^/${subfolderName}(/|$) [NC]
    RewriteRule ^ - [L]

    # Layani file fisik (CSS, JS, gambar, upload, favicon) langsung dari subfolder
    RewriteCond %{DOCUMENT_ROOT}/${subfolderName}/$1 -f
    RewriteRule ^(.*)$ ${subfolderName}/$1 [L,QSA]

    # Layani folder fisik langsung dari subfolder
    RewriteCond %{DOCUMENT_ROOT}/${subfolderName}/$1 -d
    RewriteRule ^(.*)$ ${subfolderName}/$1/ [L,QSA]

    # Routing API ke PHP di dalam subfolder
    RewriteRule ^api/(.*)$ ${subfolderName}/api/$1 [L,QSA]

    # Seluruh rute website diarahkan ke index.php di dalam subfolder
    RewriteRule ^(.*)$ ${subfolderName}/index.php [L,QSA]
</IfModule>
`;
};

export const generatePublicHtmlRootIndexPhp = (subfolderName: string = 'denbaguse.my.id'): string => {
  return `<?php
/**
 * JEMBATAN OTOMATIS ROOT public_html (TRANSPARENT SUBFOLDER BRIDGE)
 * Domain: denbaguse.my.id
 *
 * Menghubungkan pengunjung domain utama langsung ke subfolder: ${subfolderName}
 * TANPA menampilkan daftar isi folder ('Index of /') dan TANPA mengubah URL di browser.
 */
@ini_set('display_errors', '0');
error_reporting(0);

$subfolder = __DIR__ . '/${subfolderName}';

// Deteksi otomatis jika nama subfolder disesuaikan
if (!is_dir($subfolder)) {
    $candidates = ['${subfolderName}', 'denbaguse.my.id', 'web', 'masterweb', 'profil', 'denbaguse'];
    foreach ($candidates as $cand) {
        if (is_dir(__DIR__ . '/' . $cand) && (file_exists(__DIR__ . '/' . $cand . '/index.php') || file_exists(__DIR__ . '/' . $cand . '/index.html'))) {
            $subfolder = __DIR__ . '/' . $cand;
            break;
        }
    }
}

if (!is_dir($subfolder)) {
    $items = @scandir(__DIR__);
    if ($items) {
        foreach ($items as $item) {
            if ($item === '.' || $item === '..' || $item === 'cgi-bin' || $item === '.well-known') continue;
            $path = __DIR__ . '/' . $item;
            if (is_dir($path) && (file_exists($path . '/index.php') || file_exists($path . '/index.html'))) {
                $subfolder = $path;
                break;
            }
        }
    }
}

if (is_dir($subfolder)) {
    $reqUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    $targetFile = $subfolder . $reqUri;

    // Layani file statis (JS, CSS, Media) jika diminta via root
    if ($reqUri !== '/' && is_file($targetFile)) {
        $ext = strtolower(pathinfo($targetFile, PATHINFO_EXTENSION));
        $mimes = [
            'js' => 'application/javascript',
            'css' => 'text/css',
            'json' => 'application/json',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'svg' => 'image/svg+xml',
            'ico' => 'image/x-icon',
            'webp' => 'image/webp',
            'mp3' => 'audio/mpeg',
            'mp4' => 'video/mp4',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf'
        ];
        if (isset($mimes[$ext])) {
            header('Content-Type: ' . $mimes[$ext]);
        }
        readfile($targetFile);
        exit;
    }

    // Jalankan index.php subfolder secara langsung
    chdir($subfolder);
    if (file_exists($subfolder . '/index.php')) {
        require $subfolder . '/index.php';
        exit;
    } elseif (file_exists($subfolder . '/index.html')) {
        echo file_get_contents($subfolder . '/index.html');
        exit;
    }
}

// Tampilan aman jika subfolder belum siap (Mencegah tampilan folder cPanel)
header('HTTP/1.1 200 OK');
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>denbaguse.my.id - Website Resmi Ust. Jaenal Maskun, S.Pd.I.</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #064e3b; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
    .card { background: rgba(255,255,255,0.08); border: 1px solid rgba(251,191,36,0.3); border-radius: 20px; padding: 32px; max-width: 480px; width: 90%; }
    h1 { color: #fde68a; font-size: 1.25rem; }
    p { color: #cbd5e1; font-size: 0.95rem; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Portal denbaguse.my.id</h1>
    <p>Silakan ekstrak berkas ZIP ke dalam subfolder <code>public_html/${subfolderName}/</code>.</p>
  </div>
</body>
</html>
`;
};

export const generateCpanelAktifkanDomainPhp = (): string => {
  return `<?php
/**
 * PENGHUBUNG INSTAN SUBFOLDER KE ROOT public_html
 * Domain Target: denbaguse.my.id
 * Web Personal Ust. Jaenal Maskun, S.Pd.I.
 */
@ini_set('display_errors', '0');
error_reporting(0);

$currentDir = str_replace('\\\\', '/', __DIR__);
$parentDir = str_replace('\\\\', '/', dirname($currentDir));
$currentFolderName = basename($currentDir);
$parentFolderName = basename($parentDir);

$isSubfolderOfPublicHtml = ($parentFolderName === 'public_html' || is_dir($parentDir . '/public_html'));
$targetPublicHtml = ($parentFolderName === 'public_html') ? $parentDir : ($parentDir . '/public_html');

$rootHtaccess = $targetPublicHtml . '/.htaccess';
$rootIndex = $targetPublicHtml . '/index.php';

$action = $_POST['action'] ?? '';
$message = '';
$status = '';

$htaccessTemplate = "# =============================================================\\n" .
    "# CPANEL ROOT public_html .HTACCESS (AUTOMATIC SUBFOLDER ROUTER)\\n" .
    "# Domain: denbaguse.my.id | Subfolder: " . $currentFolderName . "\\n" .
    "# Anti-Folder Listing & Transparent Direct Access\\n" .
    "# =============================================================\\n\\n" .
    "Options -Indexes\\n" .
    "DirectoryIndex index.php index.html\\n\\n" .
    "<IfModule mod_rewrite.c>\\n" .
    "    RewriteEngine On\\n" .
    "    RewriteBase /\\n\\n" .
    "    # 1. Cegah loop jika request sudah ada prefix subfolder\\n" .
    "    RewriteCond %{REQUEST_URI} ^/" . preg_quote($currentFolderName, '/') . "(/|$)\\n" .
    "    RewriteRule ^ - [L]\\n\\n" .
    "    # 2. Layani berkas fisik langsung dari subfolder\\n" .
    "    RewriteCond %{DOCUMENT_ROOT}/" . $currentFolderName . "/$1 -f\\n" .
    "    RewriteRule ^(.*)$ " . $currentFolderName . "/$1 [L,QSA]\\n\\n" .
    "    # 3. Layani folder fisik langsung dari subfolder\\n" .
    "    RewriteCond %{DOCUMENT_ROOT}/" . $currentFolderName . "/$1 -d\\n" .
    "    RewriteRule ^(.*)$ " . $currentFolderName . "/$1/ [L,QSA]\\n\\n" .
    "    # 4. Routing untuk seluruh API ke subfolder\\n" .
    "    RewriteRule ^api/(.*)$ " . $currentFolderName . "/api/$1 [L,QSA]\\n\\n" .
    "    # 5. Routing SPA ke index.php subfolder\\n" .
    "    RewriteRule ^(.*)$ " . $currentFolderName . "/index.php [L,QSA]\\n" .
    "</IfModule>\\n";

$indexTemplate = "<?php\\n" .
    "/**\\n" .
    " * JEMBATAN OTOMATIS ROOT public_html\\n" .
    " * Domain: denbaguse.my.id\\n" .
    " * Melayani website langsung dari subfolder: " . $currentFolderName . "\\n" .
    " * TANPA menampilkan isi folder ('Index of /') dan TANPA merubah URL browser.\\n" .
    " */\\n" .
    "@ini_set('display_errors', '0');\\n" .
    "error_reporting(0);\\n\\n" .
    "\\$subfolder = __DIR__ . '/" . $currentFolderName . "';\\n" .
    "if (is_dir(\\$subfolder)) {\\n" .
    "    \\$reqUri = parse_url(\\\$_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);\\n" .
    "    \\$targetFile = \\$subfolder . \\$reqUri;\\n" .
    "    if (\\$reqUri !== '/' && is_file(\\$targetFile)) {\\n" .
    "        \\$ext = strtolower(pathinfo(\\$targetFile, PATHINFO_EXTENSION));\\n" .
    "        \\$mimes = ['js'=>'application/javascript','css'=>'text/css','json'=>'application/json','png'=>'image/png','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','svg'=>'image/svg+xml','ico'=>'image/x-icon','webp'=>'image/webp','mp3'=>'audio/mpeg','mp4'=>'video/mp4','woff'=>'font/woff','woff2'=>'font/woff2','ttf'=>'font/ttf'];\\n" .
    "        if (isset(\\$mimes[\\$ext])) header('Content-Type: ' . \\$mimes[\\$ext]);\\n" .
    "        readfile(\\$targetFile);\\n" .
    "        exit;\\n" .
    "    }\\n" .
    "    chdir(\\$subfolder);\\n" .
    "    if (file_exists(\\$subfolder . '/index.php')) {\\n" .
    "        require \\$subfolder . '/index.php';\\n" .
    "        exit;\\n" .
    "    } elseif (file_exists(\\$subfolder . '/index.html')) {\\n" .
    "        echo file_get_contents(\\$subfolder . '/index.html');\\n" .
    "        exit;\\n" .
    "    }\\n" .
    "}\\n";

if ($action === 'install') {
    $okHt = @file_put_contents($rootHtaccess, $htaccessTemplate);
    $okIdx = @file_put_contents($rootIndex, $indexTemplate);
    if ($okHt !== false && $okIdx !== false) {
        $status = 'success';
        $message = "Alhamdulillah! Berkas .htaccess dan index.php berhasil dipasang di " . htmlspecialchars($targetPublicHtml) . ". Website denbaguse.my.id kini aktif langsung tanpa menampilkan isi folder!";
    } else {
        $status = 'error';
        $message = "Gagal menulis berkas ke " . htmlspecialchars($targetPublicHtml) . ". Pastikan izin folder public_html adalah 755.";
    }
}

if (isset($_GET['auto']) && $isSubfolderOfPublicHtml) {
    @file_put_contents($rootHtaccess, $htaccessTemplate);
    @file_put_contents($rootIndex, $indexTemplate);
    header("Location: https://denbaguse.my.id/");
    exit;
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aktivasi Domain denbaguse.my.id (Subfolder cPanel)</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #064e3b; color: #fff; margin: 0; padding: 40px 16px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: rgba(255, 255, 255, 0.07); border: 1px solid rgba(251, 191, 36, 0.35); border-radius: 24px; padding: 36px; max-width: 600px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
    h1 { font-size: 1.4rem; color: #fde68a; margin-top: 0; margin-bottom: 8px; }
    p { font-size: 0.95rem; color: #e2e8f0; line-height: 1.6; }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(251, 191, 36, 0.15); border: 1px solid #f59e0b; color: #fde68a; border-radius: 999px; font-size: 0.8rem; font-weight: bold; margin-bottom: 16px; }
    .box { background: rgba(0,0,0,0.25); border-radius: 12px; padding: 16px; margin: 20px 0; font-family: monospace; font-size: 0.85rem; color: #cbd5e1; }
    .btn { display: inline-block; width: 100%; box-sizing: border-box; text-align: center; padding: 14px 24px; background: #f59e0b; color: #022c22; font-weight: bold; font-size: 1rem; border: none; border-radius: 14px; cursor: pointer; text-decoration: none; transition: 0.2s; margin-top: 10px; }
    .btn:hover { background: #fbbf24; }
    .btn-secondary { background: rgba(255,255,255,0.15); color: #fff; margin-top: 10px; }
    .btn-secondary:hover { background: rgba(255,255,255,0.25); }
    .alert { padding: 14px 18px; border-radius: 12px; margin: 16px 0; font-size: 0.95rem; }
    .alert-success { background: #065f46; color: #a7f3d0; border: 1px solid #34d399; }
    .alert-error { background: #7f1d1d; color: #fecaca; border: 1px solid #f87171; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">cPanel Subfolder Bridge Activator</div>
    <h1>Hubungkan denbaguse.my.id ke Subfolder</h1>
    <p>Skrip ini secara otomatis memasang jembatan di <code>public_html/</code> agar domain <strong>denbaguse.my.id</strong> dapat langsung diakses tanpa menampilkan isi daftar folder (Index of /).</p>

    <?php if ($message): ?>
      <div class="alert alert-<?= $status ?>"><?= htmlspecialchars($message) ?></div>
    <?php endif; ?>

    <div class="box">
      <div>📁 Subfolder Saat Ini: <strong><?= htmlspecialchars($currentFolderName) ?></strong></div>
      <div>📍 Lokasi Berkas: <code><?= htmlspecialchars($currentDir) ?></code></div>
      <div>🌐 Domain Tujuan: <strong>denbaguse.my.id</strong></div>
      <div>🛡️ Status Root public_html: <?= (file_exists($rootHtaccess) && file_exists($rootIndex)) ? '<span style="color:#34d399">✅ Jembatan Sudah Terpasang</span>' : '<span style="color:#fbbf24">⚠️ Belum Terpasang (Klik tombol di bawah)</span>' ?></div>
    </div>

    <form method="POST">
      <input type="hidden" name="action" value="install">
      <button type="submit" class="btn">⚡ Pasang / Perbarui Jembatan ke public_html</button>
    </form>

    <a href="https://denbaguse.my.id" class="btn btn-secondary" target="_blank">🌐 Buka Website denbaguse.my.id &rarr;</a>
  </div>
</body>
</html>
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
  zip.file('.user.ini', generatePhpIniConfig());
  zip.file('php.ini', generatePhpIniConfig());
  zip.file('unzip.php', generateUnzipPhpFile());
  zip.file('index.php', generateIndexPhpFallback());
  zip.file('og-image.php', generateOgImagePhp());
  zip.file('.htaccess', generateCpanelHtaccess());
  
  const bridgeHtml = `<!DOCTYPE html>
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
</html>`;
  zip.file('bridge.html', bridgeHtml);
  zip.file('redirect.html', bridgeHtml);
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
  zip.file('aktifkan_domain.php', generateCpanelAktifkanDomainPhp());
  zip.file('pasang_ke_root.php', generateCpanelAktifkanDomainPhp());
  zip.file('index_bridge.php', generatePublicHtmlRootIndexPhp());
  zip.file('PUBLIC_HTML_HTACCESS_JEMBATAN.txt', generatePublicHtmlRootHtaccess());
  zip.file('PUBLIC_HTML_INDEX_JEMBATAN.php', generatePublicHtmlRootIndexPhp());
  zip.file('README_CPANEL.md', generateCpanelReadme());
  zip.file('PANDUAN_HOSTING_CPANEL.txt', generateCpanelReadme());
  zip.file('PANDUAN_AKSES_FOLDER_LUAR_PUBLIC_HTML.txt', `================================================================================
PANDUAN MENJALANKAN WEBSITE DI DALAM SUBFOLDER PUBLIC_HTML (cPanel)
Domain: denbaguse.my.id | Web Personal Ust. Jaenal Maskun, S.Pd.I.
================================================================================

Apakah website bisa langsung aktif jika ditaruh di dalam folder buatan Anda
di dalam public_html (contoh: public_html/denbaguse.my.id/)?

JAWABANNYA: YA, 100% BISA & LANGSUNG AKTIF OTOMATIS!
Website TIDAK AKAN menampilkan daftar isi folder ("Index of /"), melainkan
langsung menampilkan website utama denbaguse.my.id.

--------------------------------------------------------------------------------
LANGKAH 1: EKSTRAK ZIP KE DALAM SUBFOLDER
--------------------------------------------------------------------------------
1. Masuk ke cPanel > File Manager.
2. Buka folder "public_html".
3. Buat folder baru dengan nama: "denbaguse.my.id"
   (Lokasi menjadi: public_html/denbaguse.my.id/)
4. Unggah berkas ZIP ke dalam folder tersebut lalu klik kanan > "Extract".
5. Pastikan semua berkas (.htaccess, index.php, index.html, folder api, dll)
   berada di dalam public_html/denbaguse.my.id/.

--------------------------------------------------------------------------------
LANGKAH 2: AKTIFKAN AGAR DOMAIN UTAMA MEMBUKA SUBFOLDER TERSEBUT
--------------------------------------------------------------------------------
PILIHAN A (Paling Mudah - Otomatis via Browser):
1. Buka di browser Anda:
   👉 https://denbaguse.my.id/denbaguse.my.id/aktifkan_domain.php
2. Klik tombol "⚡ Pasang / Perbarui Jembatan ke public_html".
3. Skrip akan langsung membuat berkas .htaccess dan index.php di root public_html.
4. Sekarang buka https://denbaguse.my.id - website langsung tampil sempurna!

PILIHAN B (Fitur Resmi cPanel - Document Root):
1. Di cPanel, buka menu "Domains".
2. Pada domain "denbaguse.my.id", klik tombol "Manage".
3. Ubah kolom "Document Root" dari:
   public_html
   menjadi:
   public_html/denbaguse.my.id
4. Klik "Update". Selesai! Server cPanel akan langsung menjadikan folder tersebut
   sebagai root domain Anda.

PILIHAN C (Salin Jembatan Manual di File Manager):
1. Masuk ke public_html/denbaguse.my.id/
2. Salin isi berkas "PUBLIC_HTML_HTACCESS_JEMBATAN.txt" ke "public_html/.htaccess"
3. Salin berkas "PUBLIC_HTML_INDEX_JEMBATAN.php" ke "public_html/index.php"

--------------------------------------------------------------------------------
KONFIGURASI DATABASE OTOMATIS:
--------------------------------------------------------------------------------
Paket ZIP ini SUDAH OTOMATIS dikonfigurasi untuk database cPanel:
- Database Name: denbagus_masterweb
- Database User: denbagus_masterweb
- Password DB  : masbagus15
- Host DB      : localhost (port 3306)

Saat diekstrak di cPanel, berkas db_config.php langsung siap pakai dan terhubung
otomatis ke database denbagus_masterweb tanpa perlu konfigurasi ulang!

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
    apiFolder.file('export-cpanel-zip.php', generateApiExportZipPhp());
    apiFolder.file('export-zip.php', generateApiExportZipPhp());
    apiFolder.file('backup-full.php', generateApiBackupZipPhp());
    apiFolder.file('admin-profile.php', generateApiAdminProfilePhp());
    apiFolder.file('admin-update-profile.php', generateApiAdminProfilePhp());
    apiFolder.file('admin-update-password.php', generateApiAdminProfilePhp());
    apiFolder.file('db_config.php', generateDbConfigFile());
    apiFolder.file('.user.ini', generatePhpIniConfig());
    apiFolder.file('php.ini', generatePhpIniConfig());
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
