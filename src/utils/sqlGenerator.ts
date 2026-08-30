import { HeaderLogoConfig, StickyFooterConfig, SiteContentConfig } from '../types';
import { defaultSiteContent } from '../data/personalData';

export const DEFAULT_DB_CONFIG = {
  host: 'localhost',
  user: 'jaenal_masterweb',
  database: 'jaenal_masterweb',
  password: 'masbagus15',
  port: 3306,
  charset: 'utf8mb4',
};

const escapeSql = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val).replace(/'/g, "''");
};

export const generateDatabaseSql = (
  siteContent?: SiteContentConfig,
  logoConfig?: HeaderLogoConfig,
  footerConfig?: StickyFooterConfig
): string => {
  const content = siteContent || defaultSiteContent;
  const dateStr = new Date().toISOString();
  return `-- ========================================================
-- DATABASE SCHEMA & SAFE SEED DATA: WEB PERSONAL UST. JAENAL MASKUN
-- Dikonfigurasi Siap Import untuk Database MySQL
-- Database: \`${DEFAULT_DB_CONFIG.database}\`
-- User DB : \`${DEFAULT_DB_CONFIG.user}\`
-- Dibuat  : ${dateStr}
-- ========================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------
-- Struktur Tabel: \`admin_users\`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`admin_users\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`name\` varchar(150) NOT NULL DEFAULT 'Ust. Jaenal Maskun',
  \`email\` varchar(150) NOT NULL UNIQUE,
  \`password_hash\` varchar(255) NOT NULL,
  \`role\` varchar(50) NOT NULL DEFAULT 'Super Admin',
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data Seed Super Admin (Hanya dimasukkan jika belum ada)
INSERT IGNORE INTO \`admin_users\` (\`id\`, \`name\`, \`email\`, \`password_hash\`, \`role\`) VALUES
(1, '${escapeSql(content.profile.title || content.profile.name || 'Ust. Jaenal Maskun, S.Ag., M.Pd.I.')}', 'jaenalmaskun@gmail.com', '$2y$10$masbagusSuperAdminHash2026MasterwebSecurePleskDb', 'Super Admin');

-- --------------------------------------------------------
-- Struktur Tabel: \`publications\` (Karya, Modul, Buku)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`publications\` (
  \`id\` varchar(64) NOT NULL,
  \`title\` varchar(255) NOT NULL,
  \`category\` varchar(100) NOT NULL,
  \`year\` varchar(20) NOT NULL,
  \`publisher\` varchar(150) NOT NULL,
  \`description\` text NOT NULL,
  \`tags\` text NOT NULL,
  \`download_url\` varchar(255) DEFAULT NULL,
  \`download_count\` int(11) NOT NULL DEFAULT 0,
  \`featured\` tinyint(1) NOT NULL DEFAULT 0,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data Seed Karya & Modul Pembelajaran (Hanya dimasukkan jika belum ada)
${content.publications
  .map(
    (p) =>
      `INSERT IGNORE INTO \`publications\` (\`id\`, \`title\`, \`category\`, \`year\`, \`publisher\`, \`description\`, \`tags\`, \`download_count\`, \`featured\`) VALUES (` +
      `'${escapeSql(p.id)}', ` +
      `'${escapeSql(p.title)}', ` +
      `'${escapeSql(p.category)}', ` +
      `'${escapeSql(p.year)}', ` +
      `'${escapeSql(p.publisher)}', ` +
      `'${escapeSql(p.description)}', ` +
      `'${escapeSql(JSON.stringify(p.tags))}', ` +
      `${p.downloadCount || 0}, ` +
      `${p.featured ? 1 : 0});`
  )
  .join('\n')}

-- --------------------------------------------------------
-- Struktur Tabel: \`agenda\` (Jadwal Kajian & Seminar)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`agenda\` (
  \`id\` varchar(64) NOT NULL,
  \`title\` varchar(255) NOT NULL,
  \`date\` varchar(100) NOT NULL,
  \`time\` varchar(100) NOT NULL,
  \`location\` varchar(255) NOT NULL,
  \`type\` varchar(100) NOT NULL,
  \`status\` varchar(50) NOT NULL DEFAULT 'Akan Datang',
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data Seed Agenda (Hanya dimasukkan jika belum ada)
${content.agenda
  .map(
    (a) =>
      `INSERT IGNORE INTO \`agenda\` (\`id\`, \`title\`, \`date\`, \`time\`, \`location\`, \`type\`, \`status\`) VALUES (` +
      `'${escapeSql(a.id)}', ` +
      `'${escapeSql(a.title)}', ` +
      `'${escapeSql(a.date)}', ` +
      `'${escapeSql(a.time)}', ` +
      `'${escapeSql(a.location)}', ` +
      `'${escapeSql(a.type)}', ` +
      `'${escapeSql(a.status)}');`
  )
  .join('\n')}

-- --------------------------------------------------------
-- Struktur Tabel: \`messages\` (Pesan & Undangan Silaturahmi)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`messages\` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Pesan Contoh (Hanya dimasukkan jika belum ada)
INSERT IGNORE INTO \`messages\` (\`id\`, \`sender_name\`, \`institution\`, \`email\`, \`phone\`, \`event_type\`, \`event_date\`, \`message\`, \`is_read\`) VALUES
(1, 'H. Abdul Rasyid, M.Pd.', 'Kemenag Wilayah Jawa Barat', 'a.rasyid@kemenag.go.id', '+62 812-3456-7890', 'Pelatihan & Workshop Guru', '15 Agustus 2026', 'Assalamu’alaikum Ust. Jaenal Maskun. Kami mengundang antum sebagai narasumber utama dalam Workshop Penguatan Karakter Santri.', 0),
(2, 'Dewi Sartika', 'Yayasan Bina Insan Mulia', 'dewi.sartika@binainsan.org', '+62 821-9876-5432', 'Kajian Rutin & Majelis Taklim', '12 Agustus 2026', 'Mohon ketersediaan Ustadz mengisi kajian Fiqih Pendidikan Anak pada awal bulan depan.', 1);

-- --------------------------------------------------------
-- Struktur Tabel: \`site_settings\` (Konfigurasi Utama Dual-Engine)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`site_settings\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`setting_key\` varchar(100) NOT NULL UNIQUE,
  \`setting_value\` LONGTEXT NOT NULL,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Auto-Protect: Jangan pernah menimpa site_data yang sudah ada di database MySQL server live
INSERT IGNORE INTO \`site_settings\` (\`setting_key\`, \`setting_value\`) VALUES
('site_data', '${escapeSql(JSON.stringify({ siteContent: content, logoConfig: logoConfig || {}, stickyFooterConfig: footerConfig || {}, lastUpdated: Date.now() }))}');

-- --------------------------------------------------------
-- Struktur Tabel: \`site_configs\` (Konfigurasi Logo & Sticky Footer)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`site_configs\` (
  \`config_key\` varchar(100) NOT NULL,
  \`config_value\` longtext NOT NULL,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`config_key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Konfigurasi Terkini (Hanya insert jika belum ada)
INSERT IGNORE INTO \`site_configs\` (\`config_key\`, \`config_value\`) VALUES
('site_content', '${escapeSql(JSON.stringify(content))}'),
('header_logo', '${escapeSql(JSON.stringify(logoConfig || {}))}'),
('sticky_footer', '${escapeSql(JSON.stringify(footerConfig || {}))}');

COMMIT;
`;
};
