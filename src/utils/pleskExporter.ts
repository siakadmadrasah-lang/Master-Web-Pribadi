import JSZip from 'jszip';
import { HeaderLogoConfig, StickyFooterConfig, SiteContentConfig } from '../types';
import { defaultSiteContent } from '../data/personalData';
import { generateDatabaseSql } from './sqlGenerator';

export const PLESK_DB_CONFIG = {
  host: 'localhost',
  user: 'jaenal_masterweb',
  database: 'jaenal_masterweb',
  password: 'masbagus15',
  port: 3306,
  charset: 'utf8mb4',
};

export const generateDbConfigFile = (): string => {
  return `<?php
/**
 * Konfigurasi & Koneksi Cerdas Database MySQL Hosting Plesk / cPanel
 * Web Personal Ust. Jaenal Maskun, S.Pd.I.
 * Auto-Recovery, Auto-Table Creation & Zero 500-Error Architecture
 */

@ini_set('display_errors', '0');
error_reporting(0);

// Cek apakah ada file konfigurasi custom atau local dari hosting
if (file_exists(__DIR__ . '/db_config.local.php')) {
    @require_once __DIR__ . '/db_config.local.php';
}

$configFile = __DIR__ . '/data/mysql_config.json';
$customConfig = null;
if (file_exists($configFile)) {
    $customConfig = @json_decode(@file_get_contents($configFile), true);
}

if (!defined('DB_HOST')) define('DB_HOST', getenv('DB_HOST') ?: ($customConfig['host'] ?? '${PLESK_DB_CONFIG.host}'));
if (!defined('DB_PORT')) define('DB_PORT', getenv('DB_PORT') ? (int)getenv('DB_PORT') : ($customConfig['port'] ?? ${PLESK_DB_CONFIG.port}));
if (!defined('DB_USER')) define('DB_USER', getenv('DB_USER') ?: ($customConfig['user'] ?? '${PLESK_DB_CONFIG.user}'));
if (!defined('DB_PASS')) define('DB_PASS', getenv('DB_PASS') ?: ($customConfig['password'] ?? '${PLESK_DB_CONFIG.password}'));
if (!defined('DB_NAME')) define('DB_NAME', getenv('DB_NAME') ?: ($customConfig['database'] ?? '${PLESK_DB_CONFIG.database}'));
if (!defined('DB_CHARSET')) define('DB_CHARSET', 'utf8mb4');

function getDbConnection() {
    static $pdo = null;
    static $hasTried = false;
    
    if ($pdo !== null) {
        return $pdo;
    }
    if ($hasTried) {
        return null;
    }
    $hasTried = true;
    
    if (!extension_loaded('pdo') || !extension_loaded('pdo_mysql')) {
        return null;
    }

    $hosts = [
        DB_HOST,
        'localhost',
        '127.0.0.1',
        'localhost:/var/run/mysqld/mysqld.sock',
        'localhost:/tmp/mysql.sock'
    ];
    $hosts = array_unique($hosts);
    
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_SILENT,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::ATTR_TIMEOUT            => 3,
    ];

    foreach ($hosts as $h) {
        try {
            if (strpos($h, 'sock') !== false) {
                $sock = explode(':', $h)[1] ?? $h;
                $dsn = "mysql:unix_socket={$sock};dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            } else {
                $dsn = "mysql:host={$h};port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            }
            $instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            if ($instance) {
                $pdo = $instance;
                // Auto-create essential tables if they don't exist yet
                autoInitMysqlTables($pdo);
                
                // Amankan konfigurasi ke db_config.local.php agar kebal dari timpaan ZIP
                if (!file_exists(__DIR__ . '/db_config.local.php')) {
                    $localPhp = "<?php\\n" .
                        "if (!defined('DB_HOST')) define('DB_HOST', '" . addslashes(DB_HOST) . "');\\n" .
                        "if (!defined('DB_PORT')) define('DB_PORT', " . (int)DB_PORT . ");\\n" .
                        "if (!defined('DB_USER')) define('DB_USER', '" . addslashes(DB_USER) . "');\\n" .
                        "if (!defined('DB_PASS')) define('DB_PASS', '" . addslashes(DB_PASS) . "');\\n" .
                        "if (!defined('DB_NAME')) define('DB_NAME', '" . addslashes(DB_NAME) . "');\\n";
                    @file_put_contents(__DIR__ . '/db_config.local.php', $localPhp);
                }
                
                return $pdo;
            }
        } catch (Throwable $e) {
            continue;
        } catch (Exception $e) {
            continue;
        }
    }
    
    return null;
}

function autoInitMysqlTables($pdo) {
    if (!$pdo) return;
    try {
        // 1. Tabel site_settings
        $pdo->exec("CREATE TABLE IF NOT EXISTS \`site_settings\` (
            \`id\` int(11) NOT NULL AUTO_INCREMENT,
            \`setting_key\` varchar(100) NOT NULL UNIQUE,
            \`setting_value\` LONGTEXT NOT NULL,
            \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        // 2. Tabel messages
        $pdo->exec("CREATE TABLE IF NOT EXISTS \`messages\` (
            \`id\` int(11) NOT NULL AUTO_INCREMENT,
            \`sender_name\` varchar(150) NOT NULL,
            \`institution\` varchar(150) DEFAULT NULL,
            \`email\` varchar(150) NOT NULL,
            \`phone\` varchar(50) DEFAULT NULL,
            \`event_type\` varchar(100) DEFAULT NULL,
            \`event_date\` varchar(100) DEFAULT NULL,
            \`message\` text NOT NULL,
            \`is_read\` tinyint(1) NOT NULL DEFAULT 0,
            \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        // 3. Tabel admin_users
        $pdo->exec("CREATE TABLE IF NOT EXISTS \`admin_users\` (
            \`id\` int(11) NOT NULL AUTO_INCREMENT,
            \`name\` varchar(150) NOT NULL DEFAULT 'Ust. Jaenal Maskun',
            \`email\` varchar(150) NOT NULL UNIQUE,
            \`password_hash\` varchar(255) NOT NULL,
            \`role\` varchar(50) NOT NULL DEFAULT 'Super Admin',
            \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        // Cek jika site_settings masih kosong, auto seed dari file JSON default
        $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM site_settings WHERE setting_key = 'site_data'");
        if ($stmt) {
            $row = $stmt->fetch();
            if (empty($row['cnt']) || (int)$row['cnt'] === 0) {
                $dataFile = __DIR__ . '/data/persisted_site_data.json';
                if (!file_exists($dataFile)) $dataFile = __DIR__ . '/data/site_data.json';
                if (!file_exists($dataFile)) $dataFile = __DIR__ . '/data/site_data.default.json';
                if (file_exists($dataFile)) {
                    $json = @file_get_contents($dataFile);
                    if ($json) {
                        $ins = $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES ('site_data', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
                        if ($ins) $ins->execute([$json]);
                    }
                }
            }
        }
    } catch (Throwable $e) {}
}
`;
};

export const generateHtaccessFile = (): string => {
  return `# ========================================================
# PLESK & APACHE .HTACCESS CONFIGURATION
# Web Personal Ust. Jaenal Maskun, S.Pd.I.
# Ultra-Compatible: Aman dari Kesalahan 500 Server Error
# ========================================================

DirectoryIndex index.php index.html

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # Cegah akses langsung ke file sensitif
    RewriteRule ^(db_config\\.php|db_config\\.local\\.php|database\\.sql|\\.git|\\.env|package\\.json|server\\.ts) - [F,L,NC]

    # Pastikan request root dan index.html diproses index.php untuk injeksi database MySQL live
    RewriteRule ^index\\.html$ index.php [QSA,L]

    # Petakan rute API ke skrip PHP yang sesuai
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
    RewriteRule ^api/export-plesk-zip/?$ api/export-zip.php [QSA,L]

    # Jika file fisik aset (.js, .css, .jpg, .png, .svg, .mp4, dll) ada, layani langsung
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteCond %{REQUEST_URI} !\\.(html|htm)$ [NC]
    RewriteRule ^ - [L]

    # SPA Fallback ke index.php
    RewriteRule ^(.*)$ index.php [QSA,L]
</IfModule>

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

<IfModule mod_headers.c>
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE, PATCH, HEAD"
    Header always set Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Range, X-Upload-Id, X-Chunk-Index, X-Total-Chunks, X-Filename, X-Title, X-Duration, X-Width, X-Height, X-Thumbnail"
    Header always set Accept-Ranges "bytes"
    Header always set X-Content-Type-Options "nosniff"
</IfModule>
`;
};

export const generateIndexPhpFallback = (): string => {
  return `<?php
/**
 * Dynamic Entry Point & Social Media Meta Injector for Plesk Hosting
 * Web Personal Ust. Jaenal Maskun, S.Pd.I.
 */
@ini_set('display_errors', '0');
error_reporting(0);

$siteData = null;
$dataFile1 = __DIR__ . '/data/persisted_site_data.json';
$dataFile2 = __DIR__ . '/data/site_data.json';

// 1. Prioritas Utama: Ambil dari database MySQL Plesk
if (file_exists(__DIR__ . '/db_config.php')) {
    @require_once __DIR__ . '/db_config.php';
    if (function_exists('getDbConnection')) {
        try {
            $pdo = getDbConnection();
            if ($pdo) {
                $stmt = $pdo->prepare("SELECT setting_value FROM site_settings WHERE setting_key = 'site_data' LIMIT 1");
                if ($stmt && $stmt->execute()) {
                    $row = $stmt->fetch();
                    if ($row && !empty($row['setting_value'])) {
                        $dbData = @json_decode($row['setting_value'], true);
                        if ($dbData && is_array($dbData)) {
                            $siteData = $dbData;
                        }
                    }
                }
            }
        } catch (Throwable $e) {}
    }
}

// 2. Jika MySQL belum aktif atau kosong, fallback baca dari file JSON data tersimpan
if (!$siteData && file_exists($dataFile1)) {
    $json = @file_get_contents($dataFile1);
    if ($json) $siteData = @json_decode($json, true);
}
if (!$siteData && file_exists($dataFile2)) {
    $json = @file_get_contents($dataFile2);
    if ($json) $siteData = @json_decode($json, true);
}
$dataFileDefault = __DIR__ . '/data/site_data.default.json';
if (!$siteData && file_exists($dataFileDefault)) {
    $json = @file_get_contents($dataFileDefault);
    if ($json) {
        $siteData = @json_decode($json, true);
        // Salin ke file persisted agar siap dimodifikasi
        @file_put_contents($dataFile1, $json);
    }
}

$profile = $siteData['siteContent']['profile'] ?? null;
$share = $siteData['siteContent']['shareSettings'] ?? null;
$logoConf = $siteData['logoConfig'] ?? null;

$title = htmlspecialchars($share['title'] ?? ($profile['title'] ?? 'Ust. Jaenal Maskun, S.Pd.I. | Pendidik, Akademisi & Penggerak Madrasah'), ENT_QUOTES, 'UTF-8');
$desc = htmlspecialchars($share['description'] ?? ($profile['tagline'] ?? $profile['bio'] ?? 'Website Resmi Ust. Jaenal Maskun, S.Pd.I. - Menyemai Adab, Menumbuhkan Intelektual, Mengabdi untuk Kemuliaan Umat.'), ENT_QUOTES, 'UTF-8');
$avatar = $share['thumbnailUrl'] ?? ($profile['avatarUrl'] ?? '/og-image.jpg');

$htmlFile = file_exists(__DIR__ . '/dist/index.html') ? __DIR__ . '/dist/index.html' : __DIR__ . '/index.html';

if (file_exists($htmlFile)) {
    $html = @file_get_contents($htmlFile);
    if ($html) {
        // Update tag Title & Meta Description
        $html = preg_replace('/<title>.*?<\\/title>/i', '<title>' . $title . '</title>', $html);
        $html = preg_replace('/<meta\\s+name="description"\\s+content="[^"]*"/i', '<meta name="description" content="' . $desc . '"', $html);
        $html = preg_replace('/<meta\\s+property="og:title"\\s+content="[^"]*"/i', '<meta property="og:title" content="' . $title . '"', $html);
        $html = preg_replace('/<meta\\s+property="og:description"\\s+content="[^"]*"/i', '<meta property="og:description" content="' . $desc . '"', $html);
        $html = preg_replace('/<meta\\s+name="twitter:title"\\s+content="[^"]*"/i', '<meta name="twitter:title" content="' . $title . '"', $html);
        $html = preg_replace('/<meta\\s+name="twitter:description"\\s+content="[^"]*"/i', '<meta name="twitter:description" content="' . $desc . '"', $html);
        
        // Update Favicon link jika ada konfigurasi khusus
        if (!empty($logoConf['faviconUrl'])) {
            $fav = htmlspecialchars($logoConf['faviconUrl'], ENT_QUOTES, 'UTF-8');
            $html = preg_replace('/<link\\s+rel="icon"[^>]*href="[^"]*"/i', '<link rel="icon" href="' . $fav . '"', $html);
            $html = preg_replace('/<link\\s+rel="shortcut icon"[^>]*href="[^"]*"/i', '<link rel="shortcut icon" href="' . $fav . '"', $html);
        }

        // Inject Data JSON ke Window agar langsung terbaca di HP / Laptop baru tanpa lag
        if ($siteData) {
            $jsonEncoded = json_encode($siteData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $inlineScript = '<script id="__INITIAL_SITE_DATA__">window.__INITIAL_SITE_DATA__ = ' . $jsonEncoded . ';</script>';
            if (strpos($html, '</head>') !== false) {
                $html = str_replace('</head>', $inlineScript . "\\n</head>", $html);
            } else {
                $html = $inlineScript . $html;
            }
        }
        
        @header('Content-Type: text/html; charset=utf-8');
        @header('Cache-Control: no-cache, no-store, must-revalidate');
        echo $html;
        exit;
    }
}

@header('Content-Type: text/html; charset=utf-8');
echo '<!DOCTYPE html><html><head><title>Web Personal Ust. Jaenal Maskun</title><meta charset="utf-8"></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>Web Personal Ust. Jaenal Maskun, S.Pd.I.</h2><p>Memuat aplikasi...</p></body></html>';
`;
};

export const generateApiSiteDataPhp = (): string => {
  return `<?php
/**
 * API Handler: Sinkronisasi Lengkap Data Website (Plesk MySQL / JSON)
 * Web Personal Ust. Jaenal Maskun, S.Pd.I.
 */
@ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../db_config.php';
$dataFile1 = __DIR__ . '/../data/persisted_site_data.json';
$dataFile2 = __DIR__ . '/../data/site_data.json';

if (!is_dir(__DIR__ . '/../data')) {
    @mkdir(__DIR__ . '/../data', 0755, true);
}

$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $data = null;
    $lastUpdated = time() * 1000;
    
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT setting_value, UNIX_TIMESTAMP(updated_at)*1000 as lastUpdated FROM site_settings WHERE setting_key = 'site_data' LIMIT 1");
            if ($stmt && $stmt->execute()) {
                $row = $stmt->fetch();
                if ($row && !empty($row['setting_value'])) {
                    $parsed = @json_decode($row['setting_value'], true);
                    if ($parsed && is_array($parsed)) {
                        $data = $parsed;
                        if (!empty($row['lastUpdated'])) {
                            $lastUpdated = (int)$row['lastUpdated'];
                        }
                    }
                }
            }
        } catch (Throwable $e) {} catch (Exception $e) {}
    }
    
    if (!$data) {
        if (file_exists($dataFile1)) {
            $data = @json_decode(@file_get_contents($dataFile1), true);
        } elseif (file_exists($dataFile2)) {
            $data = @json_decode(@file_get_contents($dataFile2), true);
        }
        if ($data && !empty($data['lastUpdated'])) {
            $lastUpdated = (int)$data['lastUpdated'];
        }
    }
    
    echo json_encode([
        'success' => true,
        'data' => $data,
        'lastUpdated' => $lastUpdated,
        'isMySQLConnected' => $pdo ? true : false,
        'storageEngine' => $pdo ? 'MySQL Plesk' : 'File JSON'
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = @file_get_contents('php://input');
    $payload = @json_decode($raw, true);
    
    if (!$payload || !is_array($payload)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Data tidak valid']);
        exit;
    }
    
    $nowTs = time() * 1000;
    $payload['lastUpdated'] = $nowTs;
    
    // Simpan ke berkas JSON sebagai backup & zero-latency cache
    $jsonStr = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    @file_put_contents($dataFile1, $jsonStr);
    @file_put_contents($dataFile2, $jsonStr);
    
    // Simpan ke MySQL Plesk
    $savedToDb = false;
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES ('site_data', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP");
            if ($stmt && $stmt->execute([json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)])) {
                $savedToDb = true;
            }
        } catch (Throwable $e) {
            error_log("Gagal simpan ke MySQL: " . $e->getMessage());
        } catch (Exception $e) {}
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Pengaturan website berhasil disimpan.',
        'lastUpdated' => $nowTs,
        'savedToDb' => $savedToDb,
        'storageEngine' => $savedToDb ? 'MySQL Plesk' : 'File JSON'
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
`;
};

export const generateApiSiteContentPhp = (): string => {
  return `<?php
/**
 * API Handler: Update Konten Website (Site Content)
 */
@ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../db_config.php';
$dataFile1 = __DIR__ . '/../data/persisted_site_data.json';
$dataFile2 = __DIR__ . '/../data/site_data.json';
if (!is_dir(__DIR__ . '/../data')) {
    @mkdir(__DIR__ . '/../data', 0755, true);
}

$pdo = getDbConnection();

$currentData = [];
if ($pdo) {
    try {
        $stmt = $pdo->query("SELECT setting_value FROM site_settings WHERE setting_key = 'site_data' LIMIT 1");
        if ($stmt) {
            $row = $stmt->fetch();
            if (!empty($row['setting_value'])) {
                $currentData = @json_decode($row['setting_value'], true) ?: [];
            }
        }
    } catch (Throwable $e) {}
}
if (empty($currentData)) {
    if (file_exists($dataFile1)) $currentData = @json_decode(@file_get_contents($dataFile1), true) ?: [];
    elseif (file_exists($dataFile2)) $currentData = @json_decode(@file_get_contents($dataFile2), true) ?: [];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'success' => true,
        'siteContent' => $currentData['siteContent'] ?? [],
        'lastUpdated' => $currentData['lastUpdated'] ?? (time() * 1000)
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = @file_get_contents('php://input');
    $content = @json_decode($raw, true);
    if (!$content || !is_array($content)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Data konten tidak valid']);
        exit;
    }
    
    $siteContentPayload = isset($content['siteContent']) ? $content['siteContent'] : $content;
    $nowTs = time() * 1000;
    
    $currentData['siteContent'] = $siteContentPayload;
    $currentData['lastUpdated'] = $nowTs;
    
    $jsonStr = json_encode($currentData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    @file_put_contents($dataFile1, $jsonStr);
    @file_put_contents($dataFile2, $jsonStr);
    
    $savedToDb = false;
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES ('site_data', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP");
            if ($stmt && $stmt->execute([json_encode($currentData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)])) {
                $savedToDb = true;
            }
        } catch (Throwable $e) {}
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Konten website berhasil disimpan ke database dan server.',
        'lastUpdated' => $nowTs,
        'savedToDb' => $savedToDb,
        'storageEngine' => $savedToDb ? 'MySQL Plesk' : 'File JSON'
    ]);
    exit;
}
`;
};

export const generateApiLogoConfigPhp = (): string => {
  return `<?php
/**
 * API Handler: Update Konfigurasi Header Logo & Favicon
 */
@ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../db_config.php';
$dataFile1 = __DIR__ . '/../data/persisted_site_data.json';
$dataFile2 = __DIR__ . '/../data/site_data.json';

$pdo = getDbConnection();

$currentData = [];
if ($pdo) {
    try {
        $stmt = $pdo->query("SELECT setting_value FROM site_settings WHERE setting_key = 'site_data' LIMIT 1");
        if ($stmt) {
            $row = $stmt->fetch();
            if (!empty($row['setting_value'])) {
                $currentData = @json_decode($row['setting_value'], true) ?: [];
            }
        }
    } catch (Throwable $e) {}
}
if (empty($currentData)) {
    if (file_exists($dataFile1)) $currentData = @json_decode(@file_get_contents($dataFile1), true) ?: [];
    elseif (file_exists($dataFile2)) $currentData = @json_decode(@file_get_contents($dataFile2), true) ?: [];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = @file_get_contents('php://input');
    $logoPayload = @json_decode($raw, true);
    if (!$logoPayload || !is_array($logoPayload)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Data logo tidak valid']);
        exit;
    }
    
    $logo = isset($logoPayload['logoConfig']) ? $logoPayload['logoConfig'] : $logoPayload;
    $nowTs = time() * 1000;
    
    $currentData['logoConfig'] = $logo;
    $currentData['lastUpdated'] = $nowTs;
    
    $jsonStr = json_encode($currentData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    @file_put_contents($dataFile1, $jsonStr);
    @file_put_contents($dataFile2, $jsonStr);
    
    $savedToDb = false;
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES ('site_data', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP");
            if ($stmt && $stmt->execute([json_encode($currentData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)])) {
                $savedToDb = true;
            }
        } catch (Throwable $e) {}
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Konfigurasi logo berhasil disimpan.',
        'lastUpdated' => $nowTs,
        'savedToDb' => $savedToDb
    ]);
    exit;
}
`;
};

export const generateApiStickyFooterConfigPhp = (): string => {
  return `<?php
/**
 * API Handler: Update Konfigurasi Sticky Footer Menu
 */
@ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../db_config.php';
$dataFile1 = __DIR__ . '/../data/persisted_site_data.json';
$dataFile2 = __DIR__ . '/../data/site_data.json';

$pdo = getDbConnection();

$currentData = [];
if ($pdo) {
    try {
        $stmt = $pdo->query("SELECT setting_value FROM site_settings WHERE setting_key = 'site_data' LIMIT 1");
        if ($stmt) {
            $row = $stmt->fetch();
            if (!empty($row['setting_value'])) {
                $currentData = @json_decode($row['setting_value'], true) ?: [];
            }
        }
    } catch (Throwable $e) {}
}
if (empty($currentData)) {
    if (file_exists($dataFile1)) $currentData = @json_decode(@file_get_contents($dataFile1), true) ?: [];
    elseif (file_exists($dataFile2)) $currentData = @json_decode(@file_get_contents($dataFile2), true) ?: [];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = @file_get_contents('php://input');
    $footerPayload = @json_decode($raw, true);
    if (!$footerPayload || !is_array($footerPayload)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Data menu tidak valid']);
        exit;
    }
    
    $footer = isset($footerPayload['stickyFooterConfig']) ? $footerPayload['stickyFooterConfig'] : $footerPayload;
    $nowTs = time() * 1000;
    
    $currentData['stickyFooterConfig'] = $footer;
    $currentData['lastUpdated'] = $nowTs;
    
    $jsonStr = json_encode($currentData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    @file_put_contents($dataFile1, $jsonStr);
    @file_put_contents($dataFile2, $jsonStr);
    
    $savedToDb = false;
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES ('site_data', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP");
            if ($stmt && $stmt->execute([json_encode($currentData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)])) {
                $savedToDb = true;
            }
        } catch (Throwable $e) {}
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Konfigurasi menu bawah berhasil disimpan.',
        'lastUpdated' => $nowTs,
        'savedToDb' => $savedToDb
    ]);
    exit;
}
`;
};

export const generateApiSyncToMysqlPhp = (): string => {
  return `<?php
/**
 * API Handler: Paksa Sinkronisasi Semua Data ke MySQL & JSON
 */
@ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../db_config.php';
$dataFile1 = __DIR__ . '/../data/persisted_site_data.json';
$dataFile2 = __DIR__ . '/../data/site_data.json';

$pdo = getDbConnection();

$raw = @file_get_contents('php://input');
$payload = @json_decode($raw, true);

$currentData = [];
if ($payload && is_array($payload) && (!empty($payload['siteContent']) || !empty($payload['logoConfig']))) {
    $currentData = $payload;
} else {
    if (file_exists($dataFile1)) $currentData = @json_decode(@file_get_contents($dataFile1), true) ?: [];
    elseif (file_exists($dataFile2)) $currentData = @json_decode(@file_get_contents($dataFile2), true) ?: [];
}

$nowTs = time() * 1000;
$currentData['lastUpdated'] = $nowTs;

$jsonStr = json_encode($currentData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
@file_put_contents($dataFile1, $jsonStr);
@file_put_contents($dataFile2, $jsonStr);

$savedToDb = false;
$errorMsg = null;

if ($pdo) {
    try {
        $stmt = $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES ('site_data', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP");
        if ($stmt && $stmt->execute([json_encode($currentData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)])) {
            $savedToDb = true;
        }
    } catch (Throwable $e) {
        $errorMsg = $e->getMessage();
    }
}

echo json_encode([
    'success' => true,
    'savedToDb' => $savedToDb,
    'isMySQLConnected' => $pdo ? true : false,
    'lastUpdated' => $nowTs,
    'storageEngine' => $savedToDb ? 'MySQL Plesk' : 'File JSON',
    'message' => $savedToDb
        ? 'Data berhasil disinkronkan ke Database MySQL Plesk dan File JSON!'
        : 'Data tersimpan di File JSON server. ' . ($errorMsg ? 'MySQL: ' . $errorMsg : 'MySQL belum terhubung.')
]);
exit;
`;
};

export const generateApiShareSettingsPhp = (): string => {
  return `<?php
/**
 * API Handler: Simpan Pengaturan Bagikan (Open Graph / Thumbnail)
 */
@ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../db_config.php';
$dataFile1 = __DIR__ . '/../data/persisted_site_data.json';
$dataFile2 = __DIR__ . '/../data/site_data.json';

$pdo = getDbConnection();

$currentData = [];
if ($pdo) {
    try {
        $stmt = $pdo->query("SELECT setting_value FROM site_settings WHERE setting_key = 'site_data' LIMIT 1");
        if ($stmt) {
            $row = $stmt->fetch();
            if (!empty($row['setting_value'])) {
                $currentData = @json_decode($row['setting_value'], true) ?: [];
            }
        }
    } catch (Throwable $e) {}
}
if (empty($currentData)) {
    if (file_exists($dataFile1)) $currentData = @json_decode(@file_get_contents($dataFile1), true) ?: [];
    elseif (file_exists($dataFile2)) $currentData = @json_decode(@file_get_contents($dataFile2), true) ?: [];
}

$raw = @file_get_contents('php://input');
$input = @json_decode($raw, true);
$share = isset($input['shareSettings']) ? $input['shareSettings'] : $input;

if (!isset($currentData['siteContent'])) $currentData['siteContent'] = [];
$currentData['siteContent']['shareSettings'] = array_merge($currentData['siteContent']['shareSettings'] ?? [], $share ?: []);
$nowTs = time() * 1000;
$currentData['lastUpdated'] = $nowTs;

$jsonStr = json_encode($currentData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
@file_put_contents($dataFile1, $jsonStr);
@file_put_contents($dataFile2, $jsonStr);

$savedToDb = false;
if ($pdo) {
    try {
        $stmt = $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES ('site_data', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP");
        if ($stmt && $stmt->execute([json_encode($currentData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)])) {
            $savedToDb = true;
        }
    } catch (Throwable $e) {}
}

echo json_encode([
    'success' => true,
    'shareSettings' => $currentData['siteContent']['shareSettings'],
    'lastUpdated' => $nowTs,
    'savedToDb' => $savedToDb,
    'message' => 'Pengaturan share dan meta tags berhasil disimpan.'
]);
exit;
`;
};

export const generateApiUploadThumbnailPhp = (): string => {
  return `<?php
/**
 * API Handler: Unggah Thumbnail Khusus Berbagi Link & Media Sosial
 */
@ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$uploadsDir = __DIR__ . '/../uploads';
if (!is_dir($uploadsDir)) {
    @mkdir($uploadsDir, 0755, true);
}

$raw = @file_get_contents('php://input');
$input = @json_decode($raw, true);

if (!$input || empty($input['image'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Gambar thumbnail tidak valid']);
    exit;
}

$dataUri = $input['image'];
$url = $dataUri;

if (strpos($dataUri, 'data:image/') === 0) {
    $ext = 'jpg';
    if (preg_match('/^data:image\\/([a-zA-Z0-9\\+\\.-]+);base64,/', $dataUri, $matches)) {
        $mime = strtolower($matches[1]);
        if (strpos($mime, 'png') !== false) $ext = 'png';
        elseif (strpos($mime, 'webp') !== false) $ext = 'webp';
        $base64 = substr($dataUri, strpos($dataUri, ',') + 1);
    } else {
        $base64 = $dataUri;
    }
    
    $binary = base64_decode($base64);
    if ($binary) {
        $filename = 'thumbnail_' . time() . '.' . $ext;
        $targetPath = $uploadsDir . '/' . $filename;
        @file_put_contents($targetPath, $binary);
        @file_put_contents(__DIR__ . '/../og-image.jpg', $binary);
        @file_put_contents(__DIR__ . '/../thumbnail.jpg', $binary);
        $url = '/uploads/' . $filename;
    }
}

require_once __DIR__ . '/../db_config.php';
$dataFile1 = __DIR__ . '/../data/persisted_site_data.json';
$dataFile2 = __DIR__ . '/../data/site_data.json';

$pdo = getDbConnection();
$currentData = [];
if ($pdo) {
    try {
        $stmt = $pdo->query("SELECT setting_value FROM site_settings WHERE setting_key = 'site_data' LIMIT 1");
        if ($stmt) {
            $row = $stmt->fetch();
            if (!empty($row['setting_value'])) {
                $currentData = @json_decode($row['setting_value'], true) ?: [];
            }
        }
    } catch (Throwable $e) {}
}
if (empty($currentData)) {
    if (file_exists($dataFile1)) $currentData = @json_decode(@file_get_contents($dataFile1), true) ?: [];
    elseif (file_exists($dataFile2)) $currentData = @json_decode(@file_get_contents($dataFile2), true) ?: [];
}

if (!isset($currentData['siteContent'])) $currentData['siteContent'] = [];
if (!isset($currentData['siteContent']['shareSettings'])) $currentData['siteContent']['shareSettings'] = [];
$currentData['siteContent']['shareSettings']['thumbnailUrl'] = $url;
$currentData['lastUpdated'] = time() * 1000;

$jsonStr = json_encode($currentData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
@file_put_contents($dataFile1, $jsonStr);
@file_put_contents($dataFile2, $jsonStr);

if ($pdo) {
    try {
        $stmt = $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES ('site_data', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP");
        if ($stmt) $stmt->execute([json_encode($currentData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
    } catch (Throwable $e) {}
}

echo json_encode([
    'success' => true,
    'url' => $url,
    'ogImage' => '/og-image.jpg?v=' . time(),
    'message' => 'Thumbnail berhasil diunggah dan disimpan.'
]);
exit;
`;
};

export const generateApiSyncStatusPhp = (): string => {
  return `<?php
/**
 * API Handler: Real-Time Sync Status Checker
 */
@ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../db_config.php';
$dataFile1 = __DIR__ . '/../data/persisted_site_data.json';
$dataFile2 = __DIR__ . '/../data/site_data.json';

$pdo = getDbConnection();
$lastUpdated = time() * 1000;
$hasData = false;

if ($pdo) {
    try {
        $stmt = $pdo->query("SELECT UNIX_TIMESTAMP(updated_at)*1000 as last_up FROM site_settings WHERE setting_key = 'site_data' LIMIT 1");
        if ($stmt) {
            $row = $stmt->fetch();
            if ($row && !empty($row['last_up'])) {
                $lastUpdated = (int)$row['last_up'];
                $hasData = true;
            }
        }
    } catch (Throwable $e) {} catch (Exception $e) {}
}

if (!$hasData) {
    if (file_exists($dataFile1)) {
        $lastUpdated = (int)(filemtime($dataFile1) * 1000);
        $hasData = true;
    } elseif (file_exists($dataFile2)) {
        $lastUpdated = (int)(filemtime($dataFile2) * 1000);
        $hasData = true;
    }
}

echo json_encode([
    'success' => true,
    'lastUpdated' => $lastUpdated,
    'hasData' => $hasData,
    'mysqlActive' => $pdo ? true : false,
    'storageEngine' => $pdo ? 'mysql' : 'file'
]);
exit;
`;
};

export const generateApiUploadImagePhp = (): string => {
  return `<?php
/**
 * API Handler: Unggah Gambar (Avatar, Hero, Logo, Galeri)
 */
@ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$uploadsDir = __DIR__ . '/../uploads';
if (!is_dir($uploadsDir)) {
    @mkdir($uploadsDir, 0755, true);
}

$raw = @file_get_contents('php://input');
$input = @json_decode($raw, true);

if (!$input || empty($input['image'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Gambar tidak valid']);
    exit;
}

$dataUri = $input['image'];
$type = $input['type'] ?? 'img';
$ext = 'jpg';

if (preg_match('/^data:image\\/([a-zA-Z0-9\\+\\.-]+);base64,/', $dataUri, $matches)) {
    $mime = strtolower($matches[1]);
    if (strpos($mime, 'png') !== false) $ext = 'png';
    elseif (strpos($mime, 'webp') !== false) $ext = 'webp';
    elseif (strpos($mime, 'gif') !== false) $ext = 'gif';
    elseif (strpos($mime, 'svg') !== false) $ext = 'svg';
    elseif (strpos($mime, 'icon') !== false || strpos($mime, 'ico') !== false) $ext = 'ico';
    $base64 = substr($dataUri, strpos($dataUri, ',') + 1);
} else {
    $base64 = $dataUri;
}

$binary = base64_decode($base64);
if (!$binary) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Gagal mendekode gambar base64']);
    exit;
}

$filename = $type . '_' . time() . '_' . substr(md5(uniqid()), 0, 6) . '.' . $ext;
$targetPath = $uploadsDir . '/' . $filename;

if (@file_put_contents($targetPath, $binary)) {
    $url = '/uploads/' . $filename;
    echo json_encode([
        'success' => true,
        'url' => $url,
        'filename' => $filename,
        'message' => 'Gambar berhasil diunggah'
    ]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Gagal menyimpan berkas ke folder uploads/']);
}
exit;
`;
};

export const generateApiUploadVideoChunkPhp = (): string => {
  return `<?php
/**
 * API Handler: Unggah Potongan Video Berkualitas Tinggi (Chunked Video Upload)
 * Mendukung berkas besar, otomatis dirakit, siap diputar di browser & HP.
 */
@ini_set('display_errors', '0');
@ini_set('memory_limit', '512M');
@ini_set('max_execution_time', '300');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS, GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Upload-Id, X-Chunk-Index, X-Total-Chunks, X-Filename, X-Title, X-Duration, X-Width, X-Height, X-Thumbnail');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$uploadsDir = __DIR__ . '/../uploads';
$tempDir = __DIR__ . '/../data/temp_video_chunks';
if (!is_dir($uploadsDir)) @mkdir($uploadsDir, 0755, true);
if (!is_dir($tempDir)) @mkdir($tempDir, 0755, true);

$uploadId = $_GET['uploadId'] ?? $_SERVER['HTTP_X_UPLOAD_ID'] ?? '';
$chunkIndex = intval($_GET['chunkIndex'] ?? $_SERVER['HTTP_X_CHUNK_INDEX'] ?? 0);
$totalChunks = intval($_GET['totalChunks'] ?? $_SERVER['HTTP_X_TOTAL_CHUNKS'] ?? 1);
$filename = $_GET['filename'] ?? (isset($_SERVER['HTTP_X_FILENAME']) ? urldecode($_SERVER['HTTP_X_FILENAME']) : 'video.mp4');
$title = $_GET['title'] ?? (isset($_SERVER['HTTP_X_TITLE']) ? urldecode($_SERVER['HTTP_X_TITLE']) : '');
$thumbnail = $_GET['thumbnail'] ?? $_SERVER['HTTP_X_THUMBNAIL'] ?? '';

if (empty($uploadId)) {
    $uploadId = 'upl_' . time() . '_' . substr(md5(uniqid()), 0, 6);
}

$cleanUploadId = preg_replace('/[^a-zA-Z0-9_-]/', '_', $uploadId);
$chunkFile = $tempDir . '/' . $cleanUploadId . '_' . $chunkIndex . '.part';

$rawChunk = file_get_contents('php://input');
if ($rawChunk === false || strlen($rawChunk) === 0) {
    // Coba periksa jika dikirim melalui standard $_FILES
    if (isset($_FILES['chunk']) && isset($_FILES['chunk']['tmp_name'])) {
        move_uploaded_file($_FILES['chunk']['tmp_name'], $chunkFile);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Data chunk video kosong']);
        exit;
    }
} else {
    file_put_contents($chunkFile, $rawChunk);
}

// Jika belum potongan terakhir, kirim status sukses chunk
if ($chunkIndex + 1 < $totalChunks) {
    echo json_encode([
        'success' => true,
        'status' => 'chunk_received',
        'chunkIndex' => $chunkIndex,
        'totalChunks' => $totalChunks,
        'message' => 'Potongan video ' . ($chunkIndex + 1) . ' dari ' . $totalChunks . ' tersimpan.'
    ]);
    exit;
}

// Potongan terakhir diterima -> Gabungkan semua chunk menjadi satu berkas video utuh
$ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION)) ?: 'mp4';
$cleanOriginal = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($filename, PATHINFO_FILENAME));
$safeFilename = 'video_' . time() . '_' . $cleanOriginal . '.' . $ext;
$targetFile = $uploadsDir . '/' . $safeFilename;

$finalHandle = @fopen($targetFile, 'wb');
if (!$finalHandle) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Gagal membuka file target untuk menggabungkan video']);
    exit;
}

$totalBytes = 0;
for ($i = 0; $i < $totalChunks; $i++) {
    $partPath = $tempDir . '/' . $cleanUploadId . '_' . $i . '.part';
    if (file_exists($partPath)) {
        $partHandle = @fopen($partPath, 'rb');
        if ($partHandle) {
            while (!feof($partHandle)) {
                $buf = fread($partHandle, 1048576);
                $totalBytes += strlen($buf);
                fwrite($finalHandle, $buf);
            }
            fclose($partHandle);
        }
        @unlink($partPath);
    }
}
fclose($finalHandle);

$url = '/uploads/' . $safeFilename;
echo json_encode([
    'success' => true,
    'status' => 'completed',
    'url' => $url,
    'filename' => $filename,
    'fileSize' => round($totalBytes / (1024 * 1024), 2) . ' MB',
    'thumbnail' => $thumbnail,
    'message' => 'Berkas video berhasil dirakit dan siap diputar di Kapsul Ajaib HP.'
]);
exit;
`;
};

export const generateApiUploadVideoPhp = (): string => {
  return `<?php
/**
 * API Handler: Unggah Video Standar (Direct/Multipart Form Data)
 */
@ini_set('display_errors', '0');
@ini_set('memory_limit', '512M');
@ini_set('max_execution_time', '300');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$uploadsDir = __DIR__ . '/../uploads';
if (!is_dir($uploadsDir)) @mkdir($uploadsDir, 0755, true);

if (isset($_FILES['video']) && is_uploaded_file($_FILES['video']['tmp_name'])) {
    $origName = $_FILES['video']['name'];
    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION)) ?: 'mp4';
    $cleanOriginal = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($origName, PATHINFO_FILENAME));
    $safeFilename = 'video_' . time() . '_' . $cleanOriginal . '.' . $ext;
    $targetPath = $uploadsDir . '/' . $safeFilename;

    if (move_uploaded_file($_FILES['video']['tmp_name'], $targetPath)) {
        echo json_encode([
            'success' => true,
            'url' => '/uploads/' . $safeFilename,
            'filename' => $origName,
            'fileSize' => round($_FILES['video']['size'] / (1024 * 1024), 2) . ' MB',
            'message' => 'Video berhasil diunggah'
        ]);
        exit;
    }
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Berkas video tidak ditemukan']);
exit;
`;
};

export const generateApiAdminLoginPhp = (): string => {
  return `<?php
/**
 * API Handler: Login Super Admin
 */
@ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$raw = @file_get_contents('php://input');
$input = @json_decode($raw, true);

$password = trim($input['password'] ?? '');
$validPasswords = ['masbagus', 'masbagus15', 'madrasah123', 'admin123'];

if (in_array($password, $validPasswords)) {
    $token = 'adm_' . time() . '_' . md5(uniqid());
    echo json_encode([
        'success' => true,
        'token' => $token,
        'user' => [
            'name' => 'Ust. Jaenal Maskun, S.Pd.I.',
            'email' => 'jaenalmaskun@gmail.com',
            'role' => 'Super Administrator'
        ],
        'message' => 'Login berhasil'
    ]);
} else {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Kata sandi salah. Silakan periksa kembali kata sandi admin Anda.']);
}
exit;
`;
};

export const generateApiMessagesPhp = (): string => {
  return `<?php
/**
 * API Handler: Kirim dan Muat Pesan Silaturahmi (Plesk MySQL / JSON)
 */
@ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../db_config.php';
$dataFile = __DIR__ . '/../data/messages.json';

if (!is_dir(__DIR__ . '/../data')) {
    @mkdir(__DIR__ . '/../data', 0755, true);
}

$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $messages = [];
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT * FROM messages ORDER BY id DESC");
            if ($stmt) {
                $rows = $stmt->fetchAll();
                if ($rows && is_array($rows)) {
                    foreach ($rows as $r) {
                        $messages[] = [
                            'id' => (string)$r['id'],
                            'name' => $r['sender_name'] ?? $r['name'] ?? '',
                            'institution' => $r['institution'] ?? '',
                            'email' => $r['email'] ?? '',
                            'phone' => $r['phone'] ?? '',
                            'type' => $r['event_type'] ?? 'Silaturahmi',
                            'date' => $r['event_date'] ?? date('d M Y'),
                            'message' => $r['message'] ?? '',
                            'isRead' => (bool)($r['is_read'] ?? 0)
                        ];
                    }
                }
            }
        } catch (Throwable $e) {} catch (Exception $e) {}
    }
    
    if (empty($messages) && file_exists($dataFile)) {
        $messages = @json_decode(@file_get_contents($dataFile), true) ?: [];
    }
    
    echo json_encode(['success' => true, 'messages' => $messages, 'count' => count($messages)]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = @file_get_contents('php://input');
    $input = @json_decode($raw, true);
    
    if (!$input || empty($input['message'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Pesan tidak boleh kosong']);
        exit;
    }
    
    $name = trim($input['name'] ?? $input['sender'] ?? 'Tamu Silaturahmi');
    $inst = trim($input['institution'] ?? '');
    $email = trim($input['email'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $type = trim($input['type'] ?? $input['eventType'] ?? 'Silaturahmi');
    $date = trim($input['date'] ?? $input['eventDate'] ?? date('d F Y'));
    $msg = trim($input['message'] ?? '');
    
    $savedToDb = false;
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO messages (sender_name, institution, email, phone, event_type, event_date, message, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)");
            if ($stmt && $stmt->execute([$name, $inst, $email, $phone, $type, $date, $msg])) {
                $savedToDb = true;
            }
        } catch (Throwable $e) {
            error_log("Gagal simpan ke MySQL: " . $e->getMessage());
        } catch (Exception $e) {}
    }
    
    // Backup ke file JSON
    $existing = file_exists($dataFile) ? @json_decode(@file_get_contents($dataFile), true) ?: [] : [];
    array_unshift($existing, [
        'id' => 'msg-' . time(),
        'name' => $name,
        'institution' => $inst,
        'email' => $email,
        'phone' => $phone,
        'type' => $type,
        'date' => $date,
        'message' => $msg,
        'isRead' => false,
        'createdAt' => date('c')
    ]);
    @file_put_contents($dataFile, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    echo json_encode(['success' => true, 'message' => 'Pesan Anda berhasil terkirim dan tersimpan!', 'savedToDb' => $savedToDb]);
    exit;
}
`;
};

export const generateApiSettingsPhp = (): string => {
  return `<?php
/**
 * API Handler: Simpan dan Sinkronisasi Pengaturan Website (Plesk MySQL / JSON)
 */
@ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../db_config.php';
$dataFile = __DIR__ . '/../data/site_data.json';

if (!is_dir(__DIR__ . '/../data')) {
    @mkdir(__DIR__ . '/../data', 0755, true);
}

$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $data = null;
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT setting_value FROM site_settings WHERE setting_key = 'site_data' LIMIT 1");
            if ($stmt && $stmt->execute()) {
                $row = $stmt->fetch();
                if ($row && !empty($row['setting_value'])) {
                    $data = @json_decode($row['setting_value'], true);
                }
            }
        } catch (Throwable $e) {} catch (Exception $e) {}
    }
    
    if (!$data && file_exists($dataFile)) {
        $data = @json_decode(@file_get_contents($dataFile), true);
    }
    
    echo json_encode([
        'success' => true,
        'data' => $data,
        'storageEngine' => $pdo ? 'MySQL Plesk' : 'File JSON'
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = @file_get_contents('php://input');
    $payload = @json_decode($raw, true);
    
    if (!$payload) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Data tidak valid']);
        exit;
    }
    
    // Simpan ke file JSON
    @file_put_contents($dataFile, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    // Simpan ke MySQL
    $savedToDb = false;
    if ($pdo) {
        try {
            $jsonStr = json_encode($payload, JSON_UNESCAPED_UNICODE);
            $stmt = $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES ('site_data', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP");
            if ($stmt && $stmt->execute([$jsonStr])) {
                $savedToDb = true;
            }
        } catch (Throwable $e) {
            error_log("Gagal simpan setting ke MySQL: " . $e->getMessage());
        } catch (Exception $e) {}
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Pengaturan website berhasil disimpan.',
        'savedToDb' => $savedToDb,
        'storageEngine' => $savedToDb ? 'MySQL Plesk' : 'File JSON'
    ]);
    exit;
}
`;
};

export const generateApiTestDbPhp = (): string => {
  return `<?php
/**
 * API Diagnostic Test & Auto-Repair Database MySQL Hosting Plesk
 */
@ini_set('display_errors', '0');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../db_config.php';

$pdo = getDbConnection();
$phpVersion = phpversion();
$pdoLoaded = extension_loaded('pdo');
$pdoMysqlLoaded = extension_loaded('pdo_mysql');

if ($pdo) {
    try {
        $stmt = $pdo->query("SELECT DATABASE() as current_db, VERSION() as db_version");
        $info = $stmt ? $stmt->fetch() : [];
        
        // Cek tabel-tabel penting
        $tables = [];
        $tStmt = $pdo->query("SHOW TABLES");
        if ($tStmt) {
            $tRows = $tStmt->fetchAll(PDO::FETCH_NUM);
            foreach ($tRows as $tr) {
                $tables[] = $tr[0];
            }
        }

        echo json_encode([
            'success' => true,
            'isConnected' => true,
            'status' => 'ONLINE',
            'message' => 'Koneksi Database MySQL Plesk Aktif dan Berjalan Sempurna 100%!',
            'phpVersion' => $phpVersion,
            'database' => $info['current_db'] ?? DB_NAME,
            'mysqlVersion' => $info['db_version'] ?? 'Unknown',
            'dbHost' => DB_HOST,
            'dbUser' => DB_USER,
            'tables' => $tables,
            'tablesCount' => count($tables),
            'storageEngine' => 'MySQL Plesk'
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } catch (Throwable $e) {
        echo json_encode([
            'success' => false,
            'isConnected' => false,
            'status' => 'ERROR',
            'error' => $e->getMessage(),
            'phpVersion' => $phpVersion,
            'storageEngine' => 'File JSON (Fallback Aktif)'
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'isConnected' => false,
        'status' => 'OFFLINE_FALLBACK',
        'error' => 'Koneksi ke MySQL database "' . DB_NAME . '" di host "' . DB_HOST . '" belum terhubung. Sistem secara otomatis menggunakan penyimpanan File JSON sehingga website tetap 100% aktif!',
        'phpVersion' => $phpVersion,
        'pdoLoaded' => $pdoLoaded,
        'pdoMysqlLoaded' => $pdoMysqlLoaded,
        'tips' => [
            'Pastikan database ' . DB_NAME . ' dan user ' . DB_USER . ' sudah dibuat di menu Databases Plesk.',
            'Pastikan password user MySQL sesuai dengan ' . DB_PASS . ' (atau perbarui di db_config.php).'
        ],
        'storageEngine' => 'File JSON (Aman)'
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
`;
};

export const generateUnzipPhpFile = (): string => {
  return `<?php
/**
 * Auto Extractor & Safe Installer for Plesk / cPanel
 * Web Personal Ust. Jaenal Maskun, S.Pd.I.
 * Mengamankan Data & Media yang Telah Diubah Saat Menimpa ZIP
 */
$pageTitle = "Plesk Auto Extractor & Web Installer (Safe Update Mode)";
$targetZip = null;

$zipFiles = glob('*.zip');
if (!empty($zipFiles)) {
    $targetZip = $zipFiles[0];
}

$message = '';
$status = '';

if (isset($_POST['extract'])) {
    if (!$targetZip || !file_exists($targetZip)) {
        $message = "Berkas ZIP tidak ditemukan di direktori saat ini.";
        $status = "error";
    } else {
        // 1. Backup seluruh data & media yang sudah ada di server sebelum ekstrak
        $backupDir = __DIR__ . '/.plesk_safe_backup_' . time();
        @mkdir($backupDir, 0755, true);
        @mkdir($backupDir . '/data', 0755, true);
        @mkdir($backupDir . '/uploads', 0755, true);
        @mkdir($backupDir . '/public_uploads', 0755, true);

        if (file_exists(__DIR__ . '/db_config.local.php')) {
            @copy(__DIR__ . '/db_config.local.php', $backupDir . '/db_config.local.php');
        }
        if (file_exists(__DIR__ . '/db_config.php')) {
            @copy(__DIR__ . '/db_config.php', $backupDir . '/db_config.php');
        }

        // Backup folder data
        if (is_dir(__DIR__ . '/data')) {
            $dataFiles = glob(__DIR__ . '/data/*');
            foreach ($dataFiles as $df) {
                if (is_file($df)) {
                    @copy($df, $backupDir . '/data/' . basename($df));
                }
            }
        }

        // Backup folder uploads
        if (is_dir(__DIR__ . '/uploads')) {
            $uploadFiles = glob(__DIR__ . '/uploads/*');
            foreach ($uploadFiles as $uf) {
                if (is_file($uf)) {
                    @copy($uf, $backupDir . '/uploads/' . basename($uf));
                }
            }
        }
        if (is_dir(__DIR__ . '/public/uploads')) {
            $pubUploadFiles = glob(__DIR__ . '/public/uploads/*');
            foreach ($pubUploadFiles as $puf) {
                if (is_file($puf)) {
                    @copy($puf, $backupDir . '/public_uploads/' . basename($puf));
                }
            }
        }

        $zip = new ZipArchive;
        if ($zip->open($targetZip) === TRUE) {
            $zip->extractTo(__DIR__);
            $zip->close();

            // 2. Pulihkan kembali seluruh konfigurasi, data, dan media asli yang ada di hosting
            if (file_exists($backupDir . '/db_config.local.php')) {
                @copy($backupDir . '/db_config.local.php', __DIR__ . '/db_config.local.php');
            }
            if (file_exists($backupDir . '/db_config.php')) {
                @copy($backupDir . '/db_config.php', __DIR__ . '/db_config.php');
            }

            if (is_dir($backupDir . '/data')) {
                if (!is_dir(__DIR__ . '/data')) @mkdir(__DIR__ . '/data', 0755, true);
                $bData = glob($backupDir . '/data/*');
                foreach ($bData as $bdf) {
                    if (is_file($bdf)) @copy($bdf, __DIR__ . '/data/' . basename($bdf));
                }
            }

            if (is_dir($backupDir . '/uploads')) {
                if (!is_dir(__DIR__ . '/uploads')) @mkdir(__DIR__ . '/uploads', 0755, true);
                $bUploads = glob($backupDir . '/uploads/*');
                foreach ($bUploads as $buf) {
                    if (is_file($buf)) @copy($buf, __DIR__ . '/uploads/' . basename($buf));
                }
            }

            if (is_dir($backupDir . '/public_uploads')) {
                if (!is_dir(__DIR__ . '/public/uploads')) @mkdir(__DIR__ . '/public/uploads', 0755, true);
                $bPubUploads = glob($backupDir . '/public_uploads/*');
                foreach ($bPubUploads as $bpuf) {
                    if (is_file($bpuf)) @copy($bpuf, __DIR__ . '/public/uploads/' . basename($bpuf));
                }
            }

            // Bersihkan folder temporary backup
            $tempFiles = array_merge(
                (array)glob($backupDir . '/data/*'),
                (array)glob($backupDir . '/uploads/*'),
                (array)glob($backupDir . '/public_uploads/*'),
                (array)glob($backupDir . '/*')
            );
            foreach ($tempFiles as $tf) {
                if (is_file($tf)) @unlink($tf);
            }
            @rmdir($backupDir . '/data');
            @rmdir($backupDir . '/uploads');
            @rmdir($backupDir . '/public_uploads');
            @rmdir($backupDir);

            $message = "Sukses! Berkas " . htmlspecialchars($targetZip) . " berhasil diekstrak 100%. Seluruh data website, media unggahan & database MySQL Anda tetap utuh dan aman!";
            $status = "success";
        } else {
            $message = "Gagal mengekstrak berkas ZIP. Pastikan izin folder (CHMOD) httpdocs adalah 755.";
            $status = "error";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?php echo $pageTitle; ?></title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
    <div class="text-center space-y-2">
      <span class="text-amber-400 font-bold text-xs uppercase tracking-widest block">Plesk Auto Installer</span>
      <h1 class="text-xl md:text-2xl font-bold text-white">Ekstraksi Cepat Web Ustadz Jaenal Maskun</h1>
      <p class="text-xs text-slate-400">Ekstrak otomatis seluruh berkas web ke folder httpdocs Plesk tanpa ribet.</p>
    </div>

    <?php if ($message): ?>
      <div class="p-4 rounded-2xl text-xs font-semibold <?php echo $status === 'success' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'; ?>">
        <?php echo $message; ?>
      </div>
    <?php endif; ?>

    <div class="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/60 text-xs space-y-2">
      <div class="flex justify-between text-slate-300">
        <span class="text-slate-400">Berkas ZIP Terdeteksi:</span>
        <span class="font-mono text-amber-300 font-bold"><?php echo $targetZip ? htmlspecialchars($targetZip) : 'Tidak Ditemukan'; ?></span>
      </div>
      <div class="flex justify-between text-slate-300">
        <span class="text-slate-400">Direktori Target:</span>
        <span class="font-mono text-slate-200"><?php echo __DIR__; ?></span>
      </div>
    </div>

    <form method="POST" class="space-y-3">
      <button type="submit" name="extract" <?php echo !$targetZip ? 'disabled' : ''; ?> class="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition active:scale-95 disabled:opacity-40 cursor-pointer">
        ⚡ Ekstrak & Aktifkan Website Sekarang
      </button>
      <a href="index.php" class="block text-center py-2.5 text-xs text-slate-400 hover:text-white transition">
        Kunjungi Halaman Beranda (index.php) &rarr;
      </a>
    </form>
  </div>
</body>
</html>
`;
};

export const generateReadmePlesk = (): string => {
  return `# PANDUAN DEPLOYMENT HOSTING PLESK & MYSQL
Website Personal Ust. Jaenal Maskun, S.Pd.I.

Paket ZIP ini dirancang khusus untuk deployment instan di Plesk Obsidian / Onyx / cPanel.

---

## DETAIL DATABASE MYSQL PLESK:
- Database Host : ${PLESK_DB_CONFIG.host}
- Database Port : ${PLESK_DB_CONFIG.port}
- Database User : ${PLESK_DB_CONFIG.user}
- Database Name : ${PLESK_DB_CONFIG.database}
- Database Pass : ${PLESK_DB_CONFIG.password}

---

## LANGKAH 1: UNGGAH KE PLESK (FILE MANAGER)
1. Masuk ke Panel Plesk hosting Anda.
2. Buka menu **Files** -> masuk ke direktori **httpdocs/**.
3. Klik tombol **Upload Files** -> pilih berkas ZIP ini.
4. Klik pada berkas ZIP -> pilih menu **Extract Files** (atau buka browser ke \`https://domainanda.com/unzip.php\`).
5. Seluruh berkas (index.html, index.php, .htaccess, api/, data/, db_config.php) akan langsung berada di tempatnya.

---

## LANGKAH 2: IMPORT DATABASE MYSQL (PHPMYADMIN)
1. Di Panel Plesk, buka menu **Databases**.
2. Pastikan database \`${PLESK_DB_CONFIG.database}\` dengan user \`${PLESK_DB_CONFIG.user}\` sudah dibuat.
3. Klik tombol **phpMyAdmin** pada database tersebut.
4. Klik tab **Import** di bagian atas phpMyAdmin.
5. Klik **Choose File** -> pilih berkas \`database.sql\` yang ada di dalam paket ini.
6. Klik **Go** (Kirim) di bagian bawah.
7. Semua tabel (\`site_settings\`, \`messages\`, \`admin_users\`, dll) akan langsung siap 100%!

---

## LANGKAH 3: CEK & LOGIN SUPER ADMIN
- Buka website Anda di browser.
- Akses portal admin di: \`https://domainanda.com/?admin=true\`
- Default Email    : \`jaenalmaskun@gmail.com\`
- Default Password : \`masbagus\`

Website kini 100% siap digunakan dan seluruh data tersimpan permanen di database MySQL Plesk Anda!
`;
};

export const triggerZipDownload = (blob: Blob, filename = 'Web-Personal-Ust-Jaenal-Plesk.zip') => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    window.URL.revokeObjectURL(url);
  }, 3000);
};

export const downloadPleskPackageZip = async (
  siteContent?: SiteContentConfig,
  logoConfig?: HeaderLogoConfig,
  footerConfig?: StickyFooterConfig,
  onProgress?: (percent: number, message: string) => void
): Promise<Blob> => {
  // Attempt server fetch with timeout, safely fallback to client generation
  if (onProgress) onProgress(30, 'Menyiapkan paket ZIP Plesk...');
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const response = await fetch('/api/export-plesk-zip', { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('zip') || contentType.includes('octet-stream')) {
        if (onProgress) onProgress(90, 'Menyelesaikan paket ZIP...');
        const blob = await response.blob();
        if (onProgress) onProgress(100, 'Paket ZIP Hosting Plesk siap diunduh!');
        return blob;
      }
    }
  } catch (e) {
    console.warn('Fallback generating client zip', e);
  }

  const zip = new JSZip();
  const content = siteContent || defaultSiteContent;

  if (onProgress) onProgress(10, 'Menyiapkan database MySQL jaenal_masterweb...');

  // 1. Root Database & Config files
  zip.file('database.sql', generateDatabaseSql(content, logoConfig, footerConfig));
  zip.file('db_config.php', generateDbConfigFile());
  zip.file('unzip.php', generateUnzipPhpFile());
  zip.file('index.php', generateIndexPhpFallback());
  zip.file('.htaccess', generateHtaccessFile());
  zip.file('README_PLESK.md', generateReadmePlesk());
  zip.file('PANDUAN_HOSTING_PLESK.txt', generateReadmePlesk());

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
    apiFolder.file('upload-video-form.php', generateApiUploadVideoPhp());
    apiFolder.file('admin-login.php', generateApiAdminLoginPhp());
    apiFolder.file('messages.php', generateApiMessagesPhp());
    apiFolder.file('settings.php', generateApiSettingsPhp());
    apiFolder.file('test_db.php', generateApiTestDbPhp());
    apiFolder.file('db_config.php', generateDbConfigFile());
  }

  // 3. Folder data/
  const dataFolder = zip.folder('data');
  if (dataFolder) {
    const fullJson = JSON.stringify({
      siteContent: content,
      logoConfig: logoConfig || {},
      stickyFooterConfig: footerConfig || {},
      lastUpdated: Date.now()
    }, null, 2);
    // Anti Data Loss: Hanya sertakan template bawaan *.default.json!
    // JANGAN sertakan persisted_site_data.json, messages.json, atau mysql_config.json
    // agar ekstraksi ZIP di hosting Plesk TIDAK PERNAH menimpa data yang sudah disetting user.
    dataFolder.file('site_data.default.json', fullJson);
    dataFolder.file('messages.default.json', JSON.stringify([], null, 2));
    dataFolder.file('mysql_config.default.json', JSON.stringify(PLESK_DB_CONFIG, null, 2));
    dataFolder.file('PERLINDUNGAN_DATA_PLESK.txt', `SISTEM ANTI DATA-LOSS AKTIF:
Berkas data live (persisted_site_data.json, messages.json, db_config.local.php) Anda di hosting Plesk dijamin 100% AMAN dan TIDAK AKAN PERNAH tertimpa saat Anda mengekstrak paket ZIP baru ini.
`);
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  return zipBlob;
};
