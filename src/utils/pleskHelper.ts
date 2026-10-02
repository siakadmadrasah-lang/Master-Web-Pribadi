/**
 * Helper Generator untuk Paket Siap Hosting Plesk
 * Web Personal Ust. Jaenal Maskun, S.Pd.I.
 */

export function generatePleskDbConfigPhp(): string {
  return `<?php
/**
 * Konfigurasi & Koneksi Database MySQL Hosting Plesk
 * Web Personal Ust. Jaenal Maskun, S.Pd.I.
 */
@ini_set('display_errors', '0');
error_reporting(0);

if (file_exists(__DIR__ . '/db_config.local.php')) {
    @require_once __DIR__ . '/db_config.local.php';
}

$configFile = __DIR__ . '/data/mysql_config.json';
$customConfig = null;
if (file_exists($configFile)) {
    $customConfig = @json_decode(@file_get_contents($configFile), true);
}

if (!defined('DB_HOST')) define('DB_HOST', $customConfig['host'] ?? getenv('DB_HOST') ?: 'localhost');
if (!defined('DB_USER')) define('DB_USER', $customConfig['user'] ?? getenv('DB_USER') ?: 'denbagus_masterweb');
if (!defined('DB_PASS')) define('DB_PASS', $customConfig['password'] ?? getenv('DB_PASS') ?: 'masbagus15');
if (!defined('DB_NAME')) define('DB_NAME', $customConfig['database'] ?? getenv('DB_NAME') ?: 'denbagus_masterweb');
if (!defined('DB_PORT')) define('DB_PORT', $customConfig['port'] ?? getenv('DB_PORT') ?: 3306);

function getPleskPdoConnection() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    try {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_SILENT,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 3
        ]);
        return $pdo;
    } catch (Exception $e) {
        return null;
    }
}
`;
}

export function generatePleskHtaccess(): string {
  return `# ========================================================
# PLESK & APACHE .HTACCESS CONFIGURATION
# Web Personal Ust. Jaenal Maskun, S.Pd.I.
# Ultra-Compatible: Bebas Kesalahan 500 Server Error
# ========================================================

DirectoryIndex index.php index.html

<IfModule mod_rewrite.c>
    RewriteEngine On

    # Hentikan penulisan ulang jika permintaan sudah ke index.php
    RewriteRule ^index\\.php$ - [L]

    # Cegah akses langsung ke file konfigurasi sensitif
    RewriteRule ^(db_config\\.php|db_config\\.local\\.php|database\\.sql|\\.git|\\.env|package\\.json) - [F,L,NC]

    # Layani thumbnail OpenGraph sosial media secara dinamis
    RewriteRule ^(og-image|thumbnail|og-preview)\\.(jpg|jpeg|png)$ og-image.php [QSA,L]

    # Pastikan request root dan index.html diproses index.php untuk injeksi OpenGraph
    RewriteRule ^$ index.php [QSA,L]
    RewriteRule ^index\\.html$ index.php [QSA,L]

    # Petakan rute API ke skrip PHP yang sesuai
    RewriteRule ^api/site-data/?$ api/site-data.php [QSA,L]
    RewriteRule ^api/site-content/?$ api/site-content.php [QSA,L]
    RewriteRule ^api/sync-to-mysql/?$ api/sync-to-mysql.php [QSA,L]
    RewriteRule ^api/messages/?$ api/messages.php [QSA,L]
    RewriteRule ^api/settings/?$ api/settings.php [QSA,L]
    RewriteRule ^api/test-db/?$ api/test_db.php [QSA,L]
    RewriteRule ^api/admin/login/?$ api/admin-login.php [QSA,L]
    RewriteRule ^api/admin-login/?$ api/admin-login.php [QSA,L]
    RewriteRule ^api/upload-image/?$ api/upload-image.php [QSA,L]
    RewriteRule ^api/upload-file/?$ api/upload-image.php [QSA,L]
    RewriteRule ^api/backup/zip-data/?$ api/backup-zip.php [QSA,L]
    RewriteRule ^api/export-plesk-zip/?$ api/backup-zip.php [QSA,L]

    # File atau folder fisik langsung dilayani tanpa rewrite loop
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]

    # SPA Fallback ke index.php
    RewriteRule ^ index.php [QSA,L]
</IfModule>

<IfModule mod_mime.c>
    AddType video/mp4 .mp4 .m4v
    AddType video/webm .webm
    AddType audio/mpeg .mp3
    AddType audio/ogg .ogg
</IfModule>
`;
}

export function generatePleskIndexPhp(): string {
  return `<?php
/**
 * Dynamic Entry Point & Social Media Meta Injector for Plesk Hosting
 * Web Personal Ust. Jaenal Maskun, S.Pd.I.
 */
@ini_set('display_errors', '0');
error_reporting(0);

$siteData = null;
$dataFile = __DIR__ . '/data/persisted_site_data.json';
$defaultFile = __DIR__ . '/data/site_data.default.json';

if (file_exists($dataFile)) {
    $raw = @file_get_contents($dataFile);
    $siteData = @json_decode($raw, true);
}
if (!$siteData && file_exists($defaultFile)) {
    $raw = @file_get_contents($defaultFile);
    $siteData = @json_decode($raw, true);
}

$content = $siteData['siteContent'] ?? $siteData ?? [];
$profile = $content['profile'] ?? [];
$share = $content['shareSettings'] ?? [];

$pageTitle = !empty($share['title']) ? $share['title'] : (!empty($profile['title']) ? $profile['title'] : 'Ust. Jaenal Maskun, S.Pd.I. | Pendidik, Akademisi & Penggerak Madrasah');
$pageDesc = !empty($share['description']) ? $share['description'] : (!empty($profile['bio']) ? $profile['bio'] : 'Website Resmi Ust. Jaenal Maskun, S.Pd.I. - Pendidik, Akademisi, Penulis Modul Keagamaan & Penggerak Literasi Madrasah.');

$host = $_SERVER['HTTP_HOST'] ?? 'jaenalmaskun.biz.id';
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? 80) == 443 || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
$protocol = $isHttps ? 'https' : 'http';
$currentUrl = $protocol . '://' . $host . ($_SERVER['REQUEST_URI'] ?? '/');

$htmlFile = __DIR__ . '/index.html';
if (file_exists($htmlFile)) {
    $html = file_get_contents($htmlFile);
    
    // Inject OpenGraph meta tags
    $ogTags = "<!-- Dynamic OpenGraph Meta Tags for Plesk Hosting -->\\n";
    $ogTags .= "<title>" . htmlspecialchars($pageTitle) . "</title>\\n";
    $ogTags .= '<meta name="description" content="' . htmlspecialchars($pageDesc) . '">' . "\\n";
    $ogTags .= '<meta property="og:title" content="' . htmlspecialchars($pageTitle) . '">' . "\\n";
    $ogTags .= '<meta property="og:description" content="' . htmlspecialchars($pageDesc) . '">' . "\\n";
    $ogTags .= '<meta property="og:url" content="' . htmlspecialchars($currentUrl) . '">' . "\\n";
    $ogTags .= '<meta property="og:type" content="website">' . "\\n";

    if (stripos($html, '<head>') !== false) {
        $html = str_ireplace('<head>', "<head>\\n" . $ogTags, $html);
    }
    echo $html;
} else {
    echo "<!DOCTYPE html><html><head><title>" . htmlspecialchars($pageTitle) . "</title></head><body><h1>" . htmlspecialchars($pageTitle) . "</h1><p>" . htmlspecialchars($pageDesc) . "</p></body></html>";
}
`;
}

export function generatePleskUnzipPhp(): string {
  return `<?php
/**
 * Auto Extractor & Web Installer for Plesk Hosting
 */
@ini_set('max_execution_time', 300);
@ini_set('memory_limit', '256M');

$password = "masbagus15";
$message = "";
$status = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $inputPass = $_POST['password'] ?? '';
    if ($inputPass === $password) {
        $zipFiles = glob(__DIR__ . '/*.zip');
        if (!empty($zipFiles)) {
            $zipPath = $zipFiles[0];
            $zip = new ZipArchive();
            if ($zip->open($zipPath) === TRUE) {
                $zip->extractTo(__DIR__);
                $zip->close();
                $message = "Berhasil mengekstrak paket web ke server Plesk!";
                $status = "success";
            } else {
                $message = "Gagal membuka berkas ZIP. Pastikan izin tulis (write permission) aktif.";
                $status = "error";
            }
        } else {
            $message = "Tidak ada berkas .zip ditemukan di folder ini.";
            $status = "error";
        }
    } else {
        $message = "Kata sandi salah.";
        $status = "error";
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Plesk Web Auto-Installer</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-white min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-slate-800 p-6 rounded-3xl border border-emerald-500/40 shadow-2xl space-y-4">
        <h2 class="text-xl font-bold text-amber-400">Plesk Auto-Installer</h2>
        <p class="text-xs text-slate-300">Ekstrak otomatis seluruh berkas web ke folder httpdocs server Plesk.</p>
        <?php if ($message): ?>
            <div class="p-3 rounded-xl text-xs font-bold <?php echo $status === 'success' ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-500' : 'bg-red-900/80 text-red-200 border border-red-500'; ?>">
                <?php echo htmlspecialchars($message); ?>
            </div>
        <?php endif; ?>
        <form method="POST" class="space-y-3">
            <div>
                <label class="block text-xs font-bold text-slate-300 mb-1">Kata Sandi Installer:</label>
                <input type="password" name="password" required placeholder="Masukkan kata sandi..." class="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-500">
            </div>
            <button type="submit" class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-md">
                ⚡ Ekstrak &amp; Pasang Sekarang
            </button>
        </form>
    </div>
</body>
</html>
`;
}

export function generatePleskReadme(): string {
  return `# PANDUAN DEPLOYMENT HOSTING PLESK & MYSQL
Web Personal Ust. Jaenal Maskun, S.Pd.I.

Paket ZIP ini dirancang khusus untuk deployment instan di Plesk Obsidian / Onyx.

## LANGKAH-LANGKAH INSTALASI:
1. Masuk ke Panel Plesk hosting Anda.
2. Buka menu **Files (File Manager)** lalu masuk ke folder \`httpdocs\`.
3. Unggah berkas \`Web-Personal-Ust-Jaenal-Plesk-Hosting.zip\` ke folder \`httpdocs\`.
4. Klik kanan berkas ZIP tersebut, lalu pilih **Extract Files** (atau buka \`https://domainanda.com/unzip.php\` di browser).
5. Buka menu **Databases** di Plesk, klik **phpMyAdmin** pada database Anda.
6. Buka tab **Import**, pilih berkas \`database.sql\`, lalu klik **Go**.
7. Buka domain website Anda di browser. Website 100% siap digunakan!
`;
}

export function generatePleskApiSiteDataPhp(): string {
  return `<?php
/**
 * API: Ambil / Simpan Data Website (MySQL / File JSON)
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../db_config.php';
$dataFile = __DIR__ . '/../data/persisted_site_data.json';
$defaultFile = __DIR__ . '/../data/site_data.default.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($dataFile)) {
        echo file_get_contents($dataFile);
        exit;
    }
    if (file_exists($defaultFile)) {
        echo file_get_contents($defaultFile);
        exit;
    }
    echo json_encode(['success' => false, 'error' => 'Data tidak ditemukan']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    if (!$data) {
        echo json_encode(['success' => false, 'error' => 'Format JSON tidak valid']);
        exit;
    }

    if (!is_dir(__DIR__ . '/../data')) {
        @mkdir(__DIR__ . '/../data', 0755, true);
    }
    @file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    echo json_encode([
        'success' => true,
        'message' => 'Data website berhasil disimpan di server Plesk.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
`;
}

export function generatePleskApiAdminLoginPhp(): string {
  return `<?php
/**
 * API: Autentikasi Super Admin Plesk
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: *');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

$username = trim($data['username'] ?? '');
$password = trim($data['password'] ?? '');

$defaultUsers = [
    'denbagus' => 'masbagus15',
    'jaenalmaskun' => 'masbagus15',
    'admin' => 'masbagus15'
];

if (isset($defaultUsers[$username]) && $defaultUsers[$username] === $password) {
    echo json_encode([
        'success' => true,
        'message' => 'Login berhasil',
        'user' => [
            'username' => $username,
            'role' => 'Super Admin'
        ]
    ], JSON_UNESCAPED_UNICODE);
} else {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Username atau password salah']);
}
`;
}

export function generatePleskApiSyncToMysqlPhp(): string {
  return `<?php
/**
 * API: Sinkronisasi Data ke MySQL
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: *');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../db_config.php';
$pdo = getPleskPdoConnection();

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!is_dir(__DIR__ . '/../data')) {
    @mkdir(__DIR__ . '/../data', 0755, true);
}
@file_put_contents(__DIR__ . '/../data/persisted_site_data.json', json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo json_encode([
    'success' => true,
    'message' => $pdo ? 'Data berhasil disinkronkan ke Database MySQL dan berkas data!' : 'Data tersimpan ke berkas lokal (MySQL belum terhubung).'
], JSON_UNESCAPED_UNICODE);
`;
}
