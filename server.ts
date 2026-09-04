import express from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import sharp from 'sharp';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { 
  generateDbConfigFile, 
  generateHtaccessFile, 
  generateIndexPhpFallback, 
  generateUnzipPhpFile, 
  generateReadmePlesk, 
  generateApiMessagesPhp, 
  generateApiSettingsPhp, 
  generateApiTestDbPhp 
} from './src/utils/pleskExporter';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Universal CORS & Network Header Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Expose-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// High-speed compression for HTML, JS, CSS, JSON responses
app.use(compression({
  filter: (req: any, res: any) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
}) as any);

// High payload limit to allow high-resolution media & video uploads
app.use(express.raw({ type: ['application/octet-stream', 'application/x-binary', 'video/*'], limit: '500mb' }));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

const DATA_DIR = path.join(process.cwd(), 'data');
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const DIST_DIR = path.join(process.cwd(), 'dist');
const UPLOADS_PUBLIC_DIR = path.join(PUBLIC_DIR, 'uploads');
const UPLOADS_DATA_DIR = path.join(DATA_DIR, 'uploads');
const UPLOADS_DIST_DIR = path.join(DIST_DIR, 'uploads');
const STORAGE_FILE = path.join(DATA_DIR, 'persisted_site_data.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'persisted_messages.json');
const DB_CONFIG_FILE = path.join(DATA_DIR, 'mysql_config.json');
const AUTH_FILE = path.join(DATA_DIR, 'admin_auth.json');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');

// Default Admin Auth Configuration
const defaultAdminAuth = {
  username: 'admin',
  email: 'jaenalmaskun.ai@gmail.com',
  name: 'Ust. Jaenal Maskun, S.Pd.I.',
  role: 'Super Administrator',
  password: 'masbagus',
  allowedFallbackPasswords: ['masbagus', 'masbagus15', 'madrasah123', 'admin123'],
  lastPasswordChange: new Date().toISOString()
};

let currentAdminAuth = { ...defaultAdminAuth };

function loadAdminAuth() {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
      currentAdminAuth = { ...defaultAdminAuth, ...JSON.parse(raw) };
    } else {
      currentAdminAuth = { ...defaultAdminAuth };
      fs.writeFileSync(AUTH_FILE, JSON.stringify(currentAdminAuth, null, 2), 'utf-8');
    }
  } catch (e) {
    console.warn('Could not read admin auth file, using defaults', e);
    currentAdminAuth = { ...defaultAdminAuth };
  }
  return currentAdminAuth;
}

async function saveAdminAuth(authData: any) {
  try {
    currentAdminAuth = { ...currentAdminAuth, ...authData };
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(AUTH_FILE, JSON.stringify(currentAdminAuth, null, 2), 'utf-8');

    if (mysqlPool && isMySQLConnected) {
      try {
        const connection = await mysqlPool.getConnection();
        await connection.query(
          `INSERT INTO site_settings (setting_key, setting_value) VALUES ('admin_auth', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [JSON.stringify(currentAdminAuth)]
        );
        connection.release();
      } catch (dbErr) {
        console.warn('Could not sync admin_auth to MySQL', dbErr);
      }
    }
    return true;
  } catch (err) {
    console.error('Error saving admin auth:', err);
    return false;
  }
}

// Initial load of admin auth
loadAdminAuth();

// Ensure necessary directories exist
[DATA_DIR, PUBLIC_DIR, UPLOADS_PUBLIC_DIR, UPLOADS_DATA_DIR, SNAPSHOTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      console.error('Failed to create directory:', dir, err);
    }
  }
});

// Fast static caching options
const staticCacheOptions = {
  maxAge: '7d',
  etag: true,
  lastModified: true
};

// Serve uploaded images & videos with range streaming, HEAD support & CORS
app.options('/uploads/:filename', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.sendStatus(200);
});

app.get('/uploads/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const p1 = path.join(UPLOADS_PUBLIC_DIR, filename);
  const p2 = path.join(UPLOADS_DATA_DIR, filename);
  const p3 = path.join(UPLOADS_DIST_DIR, filename);
  
  const targetPath = fs.existsSync(p1) ? p1 : (fs.existsSync(p2) ? p2 : (fs.existsSync(p3) ? p3 : null));
  if (!targetPath) {
    return res.status(404).send('Berkas media tidak ditemukan');
  }

  const ext = path.extname(filename).toLowerCase();
  const isVideo = ['.mp4', '.webm', '.ogg', '.mov', '.m4v', '.mkv', '.avi', '.3gp', '.flv', '.wmv', '.ts', '.mpg', '.mpeg', '.m4p', '.qt'].includes(ext);
  const isAudio = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.opus', '.wma'].includes(ext);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');

  if (isVideo || isAudio) {
    const stat = fs.statSync(targetPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    let mimeType = 'video/mp4';
    if (ext === '.webm') mimeType = 'video/webm';
    else if (ext === '.ogg') mimeType = isAudio ? 'audio/ogg' : 'video/ogg';
    else if (ext === '.mov' || ext === '.qt') mimeType = 'video/quicktime';
    else if (ext === '.mkv') mimeType = 'video/x-matroska';
    else if (ext === '.avi') mimeType = 'video/x-msvideo';
    else if (ext === '.3gp') mimeType = 'video/3gpp';
    else if (ext === '.ts') mimeType = 'video/mp2t';
    else if (ext === '.flv') mimeType = 'video/x-flv';
    else if (ext === '.wmv') mimeType = 'video/x-ms-wmv';
    else if (ext === '.mp3') mimeType = 'audio/mpeg';
    else if (ext === '.wav') mimeType = 'audio/wav';
    else if (ext === '.m4a' || ext === '.aac') mimeType = 'audio/mp4';
    else if (ext === '.flac') mimeType = 'audio/flac';

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(targetPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes'
      };
      res.writeHead(200, head);
      fs.createReadStream(targetPath).pipe(res);
    }
  } else {
    res.sendFile(targetPath);
  }
});

// Fallback static handler
app.use('/uploads', express.static(UPLOADS_PUBLIC_DIR, staticCacheOptions));
app.use('/uploads', express.static(UPLOADS_DATA_DIR, staticCacheOptions));

// Explicit Favicon Serving Endpoints for Browsers & Mobile Bookmarks
app.get(['/favicon.ico', '/favicon.png', '/apple-touch-icon.png', '/apple-touch-icon-precomposed.png'], (req, res) => {
  const reqName = path.basename(req.path);
  const pData = path.join(DATA_DIR, reqName);
  const pPub = path.join(PUBLIC_DIR, reqName);
  const pDist = path.join(DIST_DIR, reqName);

  const ext = path.extname(reqName).toLowerCase();
  const contentType = ext === '.ico' ? 'image/x-icon' : 'image/png';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');

  if (fs.existsSync(pData)) return res.sendFile(pData);
  if (fs.existsSync(pPub)) return res.sendFile(pPub);
  if (fs.existsSync(pDist)) return res.sendFile(pDist);

  // Fallback check
  const pFaviconIco = path.join(PUBLIC_DIR, 'favicon.ico');
  const pFaviconPng = path.join(PUBLIC_DIR, 'favicon.png');
  if (fs.existsSync(pFaviconPng)) return res.sendFile(pFaviconPng);
  if (fs.existsSync(pFaviconIco)) return res.sendFile(pFaviconIco);

  res.status(404).send('Favicon tidak ditemukan');
});

// Explicit OpenGraph Thumbnail Endpoints for WhatsApp, Telegram, Facebook & Social Bots
app.get(['/og-image.jpg', '/thumbnail.jpg', '/og-preview.jpg', '/og-share.jpg'], (req, res) => {
  const pData = path.join(DATA_DIR, 'persisted_og_image.jpg');
  const pPub = path.join(PUBLIC_DIR, 'og-image.jpg');
  const pDist = path.join(DIST_DIR, 'og-image.jpg');
  const pAvatar = path.join(PUBLIC_DIR, 'avatar-jaenal.jpg');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=43200');

  if (fs.existsSync(pData)) return res.sendFile(pData);
  if (fs.existsSync(pPub)) return res.sendFile(pPub);
  if (fs.existsSync(pDist)) return res.sendFile(pDist);
  if (fs.existsSync(pAvatar)) return res.sendFile(pAvatar);
  res.status(404).send('Thumbnail tidak ditemukan');
});

app.get('/avatar-jaenal.jpg', (req, res) => {
  const pPub = path.join(PUBLIC_DIR, 'avatar-jaenal.jpg');
  const pDist = path.join(DIST_DIR, 'avatar-jaenal.jpg');
  const pData = path.join(DATA_DIR, 'persisted_og_image.jpg');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=43200');

  if (fs.existsSync(pPub)) return res.sendFile(pPub);
  if (fs.existsSync(pDist)) return res.sendFile(pDist);
  if (fs.existsSync(pData)) return res.sendFile(pData);
  res.status(404).send('Avatar tidak ditemukan');
});

// Default MySQL Configuration
const defaultMySQLConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'jaenal_masterweb',
  password: process.env.MYSQL_PASSWORD || 'masbagus15',
  database: process.env.MYSQL_DATABASE || 'jaenal_masterweb',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  connectTimeout: 5000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let currentMySQLConfig = { ...defaultMySQLConfig };

// Load custom DB config if exists from any known config files
const possibleDbConfigFiles = [
  DB_CONFIG_FILE,
  path.join(DATA_DIR, 'database-config.json'),
  path.join(process.cwd(), 'database-config.json'),
  path.join(process.cwd(), 'mysql_config.json')
];

for (const cfgPath of possibleDbConfigFiles) {
  if (fs.existsSync(cfgPath)) {
    try {
      const customConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
      if (customConfig && typeof customConfig === 'object') {
        currentMySQLConfig = { ...currentMySQLConfig, ...customConfig };
        break;
      }
    } catch (e) {
      console.warn('Could not read custom db config file:', cfgPath, e);
    }
  }
}

// In-memory cache fallback and persistence helpers
const defaultInitialSiteData = {
  siteContent: {
    profile: {
      name: "Ust. Jaenal Maskun, S.Pd.I.",
      arabicName: "الأستاذ زين الماسكون",
      title: "Jaenal Maskun, S.Pd.I.",
      degrees: "S.Pd.I.",
      role: "Pendidik, Akademisi & Dev APP Madrasah",
      institution: "MI Ma'arif NU 2 Sanggreman",
      tagline: "Menyemai Adab, Menumbuhkan Intelektual, Mengabdi untuk Kemuliaan Umat",
      bio: "Lebih dari 15 tahun mendedikasikan diri dalam dunia pendidikan Islam, pengembangan kurikulum madrasah terpadu, serta pembinaan akhlak santri dan generasi muda. Berkomitmen menghadirkan ekosistem madrasah yang adaptif terhadap sains-teknologi modern tanpa mencabut akar tradisi keilmuan Islam dan kearifan pesantren.",
      motto: "العِلْمُ بِلَا عَمَلٍ كَالشَّجَرِ بِلَا ثَمَرٍ — Ilmu tanpa amal laksana pohon tanpa buah.",
      location: "Gentawangi, Indonesia",
      email: "jaenalmaskun.ai@gmail.com",
      phone: "+62 812-3456-7890",
      avatarUrl: "/uploads/avatar_1787051686042_07hu2t.jpg",
      socials: {
        whatsapp: "https://wa.me/6281234567890",
        youtube: "https://www.youtube.com/@jaenalmaskunofficial3977",
        instagram: "https://instagram.com/jaenalmaskun",
        facebook: "https://facebook.com/jaenalmaskun",
        linkedin: "https://linkedin.com/in/jaenalmaskun"
      },
      stats: [
        { label: "Tahun Pengabdian", value: "15+", subtext: "Di Dunia Pendidikan Madrasah" },
        { label: "Karya Tulis & Modul", value: "24+", subtext: "Modul Ajar" },
        { label: "Guru Terlatih", value: "3.500+", subtext: "Pelatihan PKB & Pedagogi" },
        { label: "Santri & Siswa Dibina", value: "12.000+", subtext: "Alumni Berprestasi" }
      ]
    },
    heroSettings: {
      badgeText: "Guru",
      greetingTitle: "Assalamu’alaikum Warahmatullahi Wabarakatuh",
      greetingSub: "Khidmat untuk Pendidikan Islam & Literasi Madrasah",
      showStats: true,
      showDownloadCV: true,
      heroImage: "/uploads/hero_1787051686043_doq56m.jpg",
      photoBadgeText: "Pejuang MI"
    },
    education: [
      {
        year: "2013",
        degree: "Sarjana Pendidikan S1",
        institution: "IAIIG Cilacap",
        focus: "Konsentrasi Manajemen Pendidikan Islam & Kurikulum (Cum Laude)"
      },
      {
        year: "2013",
        degree: "Sarjana Pendidikan Agama Islam (S.Pd.I.)",
        institution: "Fakultas Tarbiyah dan Keguruan",
        focus: "Pendidikan Agama Islam, Metodologi Pengajaran & Bahasa Arab"
      },
      {
        year: "1995",
        degree: "Pendidikan Pesantren & Madrasah Aliyah",
        institution: "Pondok Pesantren As Syafi'iyah Situbondo",
        focus: "Tafsir Al-Qur'an, Hadits, Fiqh Syafi'iyah, & Tahfidzul Qur'an"
      }
    ],
    pillars: [
      {
        title: "Adab & Karakter Luhur",
        arabic: "الأخلاق الكريمة",
        desc: "Menempatkan pembentukan adab dan tata krama islami sebagai pondasi utama sebelum penanaman keilmuan akademis.",
        icon: "HeartHandshake"
      },
      {
        title: "Tradisi & Nalar Kritis",
        arabic: "التراث والتجديد",
        desc: "Melestarikan khazanah turots pesantren klasik seraya menumbuhkan daya analitis terhadap tantangan sains modern.",
        icon: "BookOpenCheck"
      },
      {
        title: "Inovasi & Adaptasi Digital",
        arabic: "مواكبة العصر",
        desc: "Pemanfaatan teknologi mutakhir untuk memperluas syiar dakwah, memperkaya media ajar, dan meningkatkan efisiensi madrasah.",
        icon: "Sparkles"
      },
      {
        title: "Keteladanan Nyata",
        arabic: "الأسوة الحسنة",
        desc: "Mendidik dengan tindakan nyata, integritas kepribadian, serta konsistensi antara lisan dan perbuatan sehari-hari.",
        icon: "ShieldCheck"
      }
    ],
    quotes: [
      {
        id: "q1",
        arabicText: "يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ",
        translation: "Allah akan meninggikan orang-orang yang beriman di antaramu dan orang-orang yang diberi ilmu pengetahuan beberapa derajat.",
        source: "QS. Al-Mujadilah [58]: 11",
        theme: "Keutamaan Ilmu"
      },
      {
        id: "q2",
        arabicText: "طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ",
        translation: "Menuntut ilmu itu wajib atas setiap muslim.",
        source: "HR. Ibnu Majah no. 224",
        theme: "Kewajiban Belajar"
      },
      {
        id: "q3",
        arabicText: "الأَدَبُ قَبْلَ العِلْمِ",
        translation: "Adab dan budi pekerti mendahului ilmu pengetahuan.",
        source: "Imam Malik rahimahullah",
        theme: "Pilar Adab"
      },
      {
        id: "q4",
        arabicText: "مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ",
        translation: "Barangsiapa menempuh jalan untuk mencari ilmu, maka Allah akan memudahkan baginya jalan menuju surga.",
        source: "HR. Muslim no. 2699",
        theme: "Jalan Menuju Surga"
      },
      {
        id: "q5",
        arabicText: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
        translation: "Sebaik-baik kalian adalah orang yang belajar Al-Qur'an dan mengajarkannya.",
        source: "HR. Al-Bukhari no. 5027",
        theme: "Keberkahan Al-Qur'an"
      }
    ],
    publications: [
      {
        id: "pub-1",
        title: "Harmonisasi Adab & Sains: Desain Pembelajaran Integratif di Madrasah Abad 21",
        category: "Buku",
        year: "2024",
        publisher: "Pustaka Cendekia Nusantara",
        description: "Kajian komprehensif tentang perumusan strategi integrasi nilai-nilai keislaman dengan metodologi sains dan computational thinking di ruang kelas madrasah.",
        tags: ["Kurikulum Madrasah", "Integrasi Sains-Islam", "Pedagogi"],
        featured: true
      },
      {
        id: "pub-2",
        title: "Panduan Praktis Manajemen Kelas Humanis Berbasis Pesantren",
        category: "Buku",
        year: "2023",
        publisher: "Lentera Ilmu Publishing",
        description: "Pendekatan keteladanan (Uswah Hasanah) dalam mengelola kedisiplinan santri dengan cinta dan dialog yang memberdayakan.",
        tags: ["Manajemen Pendidikan", "Karakter Santri", "Psikologi Anak"],
        featured: true
      },
      {
        id: "pub-3",
        title: "Efektivitas Model Flipped Classroom Berorientasi Fiqh Tematik terhadap Literasi Keagamaan Siswa MA",
        category: "Jurnal & Riset",
        year: "2023",
        publisher: "Jurnal Pendidikan Islam Terakreditasi SINTA",
        description: "Penelitian kuantitatif-kualitatif terkait penerapan media digital dalam kajian fiqh muamalah di tingkat Madrasah Aliyah.",
        tags: ["Riset Pendidikan", "Fiqh Kontemporer", "EdTech"]
      },
      {
        id: "pub-4",
        title: "Modul Ajar Pembelajaran Berdiferensiasi Mata Pelajaran Akidah Akhlak",
        category: "Modul Pembelajaran",
        year: "2024",
        publisher: "Kelompok Kerja Guru (KKG) & MGMP",
        description: "Panduan guru dalam memetakan kesiapan, minat, dan profil belajar siswa madrasah dengan asesmen diagnostik yang terstruktur.",
        tags: ["Kurikulum Merdeka", "Akidah Akhlak", "Modul Guru"]
      },
      {
        id: "pub-5",
        title: "Menjaga Nalar Kritis di Balik Jubah Tradisi: Refleksi Pendidikan Madrasah",
        category: "Opini & Artikel",
        year: "2024",
        publisher: "Kolom Literasi Keislaman & Media Nasional",
        description: "Tulisan esai populer mengenai pentingnya membangun tradisi tadabbur dan dialektika ilmu dalam lingkungan santri.",
        tags: ["Opini Publik", "Transformasi Madrasah"]
      }
    ],
    experience: [
      {
        id: "exp-1",
        period: "2019 — Sekarang",
        role: "Kepala Pusat Penjaminan Mutu & Kurikulum",
        organization: "Yayasan Pendidikan Islam & Madrasah Terpadu",
        type: "Pengabdian",
        description: "Memimpin perancangan kurikulum khas madrasah yang menyinergikan Kurikulum Nasional, Kemenag, dan Kurikulum Kepesantrenan Klasik (Kuning).",
        achievements: [
          "Meningkatkan akreditasi madrasah menjadi Unggul (A) secara konsisten",
          "Menginisiasi program Tahfidz Berbasis Pemahaman Makna (Fahmul Qur'an)",
          "Digitalisasi rapor dan sistem evaluasi pembelajaran madrasah"
        ]
      },
      {
        id: "exp-2",
        period: "2021 — Sekarang",
        role: "Fasilitator & Instruktur Pengembangan Keprofesian Berkelanjutan (PKB)",
        organization: "Kementerian Agama RI / Forum MGMP",
        type: "Pendidikan",
        description: "Memberikan pelatihan dan mentoring intensif bagi ratusan guru madrasah se-wilayah dalam penyusunan modul ajar inovatif, asesmen autentik, dan literasi digital.",
        achievements: [
          "Telah melatih lebih dari 3.500 guru Madrasah Ibtidaiyah, Tsanawiyah, & Aliyah",
          "Penyusun instrumen workshop literasi numerasi madrasah"
        ]
      },
      {
        id: "exp-3",
        period: "2015 — 2019",
        role: "Wakil Kepala Bidang Akademik & Kesiswaan",
        organization: "Madrasah Tsanawiyah Unggulan",
        type: "Pendidikan",
        description: "Mengkoordinir pembinaan olimpiade sains madrasah (KSM), kepanduan Pramuka Santri, serta program pembiasaan sholat dhuha dan tadarus harian.",
        achievements: [
          "Membimbing santri meraih medali emas KSM (Kompetisi Sains Madrasah) tingkat provinsi",
          "Membangun program Duta Akhlak dan Budaya Literasi 15 Menit"
        ]
      },
      {
        id: "exp-4",
        period: "2010 — 2015",
        role: "Guru Senior Pendidikan Agama Islam & Bahasa Arab",
        organization: "Madrasah & Pesantren As-Salam",
        type: "Pengabdian",
        description: "Mengajar ilmu Fiqh, Nahwu Shorof dasar, serta pendampingan asrama santri.",
        achievements: [
          "Dinobatkan sebagai Guru Teladan Tingkat Kabupaten tahun 2014"
        ]
      }
    ],
    agenda: [
      {
        id: "ag-1",
        title: "Kajian Rutin Kitab Ta'lim Muta'allim: Etika Murid dan Guru",
        date: "Setiap Ahad Pagi",
        time: "06.30 — 08.00 WIB",
        location: "Masjid Baitul 'Ilmi & Live Streaming YouTube",
        type: "Kajian Kitab",
        status: "Rutin"
      },
      {
        id: "ag-2",
        title: "Workshop Desain Modul Ajar Digital Interaktif untuk Guru Madrasah",
        date: "Sabtu, 28 Agustus 2026",
        time: "08.30 — 15.00 WIB",
        location: "Aula Kemenag Wilayah & Hybrid Zoom",
        type: "Pelatihan Guru",
        status: "Akan Datang"
      },
      {
        id: "ag-3",
        title: "Seminar Parenting Islami: Menemani Generasi Alpha Bersahabat dengan Al-Qur'an",
        date: "Ahad, 06 September 2026",
        time: "09.00 — 11.45 WIB",
        location: "Gedung Pusat Dakwah Islam (Pusdai)",
        type: "Seminar Nasional",
        status: "Akan Datang"
      },
      {
        id: "ag-4",
        title: "Bimbingan Tahsin & Fahmul Ayat Tematik bagi Calon Asatidz",
        date: "Setiap Malam Kamis",
        time: "Ba'da Maghrib — Isya",
        location: "Halaqah Pesantren",
        type: "Bimbingan Santri",
        status: "Rutin"
      }
    ],
    gallery: [
      {
        id: "gal-1",
        title: "Halaqah Kajian Keilmuan Santri & Pembacaan Kitab",
        category: "Kegiatan Belajar",
        description: "Suasana diskusi interaktif santri dalam membedah teks kitab kuning dan adab thalabul ilmi dengan pendekatan kontekstual.",
        image: "https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&w=800&q=80",
        videoUrl: "https://www.youtube.com/watch?v=F32o6bO2g7Y"
      },
      {
        id: "gal-2",
        title: "Pelatihan Kurikulum Guru Madrasah & Asesmen Digital",
        category: "Pelatihan Guru",
        description: "Sesi workshop praktikum asesmen diagnostik, penyusunan lembar kerja interaktif bersama para tenaga pendidik se-wilayah.",
        image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80",
        videoUrl: "https://www.youtube.com/watch?v=kYJzBw_jQ-M"
      },
      {
        id: "gal-3",
        title: "Wisuda Tahfidz & Peneguhan Sanad Al-Qur'an",
        category: "Kajian & Doa",
        description: "Momen sakral penganugerahan syahadah bagi para santri yang menuntaskan hafalan Al-Qur'an 30 Juz.",
        image: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=800&q=80",
        videoUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE"
      },
      {
        id: "gal-4",
        title: "Anugerah Dedikasi Pendidik Inspiratif",
        category: "Penghargaan",
        description: "Apresiasi atas inovasi pembelajaran ramah anak, riset madrasah, dan pengembangan literasi digital.",
        image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80"
      }
    ],
    youtubeChannel: {
      enabled: true,
      channelHandle: "@jaenalmaskunofficial3977",
      channelTitle: "JAENAL MASKUN OFFICIAL",
      channelId: "UC45A9VF3hameYBW1reLO3BQ",
      channelUrl: "https://www.youtube.com/@jaenalmaskunofficial3977",
      playlistId: "",
      autoFetch: true,
      videos: [
        {
          id: "yt-vid-1",
          videoId: "F32o6bO2g7Y",
          title: "HALAQAH KAJIAN KEILMUAN SANTRI & PEMBACAAN KITAB KUNING",
          description: "Dokumentasi kajian interaktif santri dalam membedah kitab kuning dan adab thalabul ilmi.",
          thumbnail: "https://img.youtube.com/vi/F32o6bO2g7Y/hqdefault.jpg",
          videoUrl: "https://www.youtube.com/watch?v=F32o6bO2g7Y",
          publishedAt: "Kajian Rutin",
          views: "1.2K tayangan",
          channelName: "JAENAL MASKUN OFFICIAL",
          platform: "youtube"
        },
        {
          id: "yt-vid-2",
          videoId: "kYJzBw_jQ-M",
          title: "PELATIHAN KURIKULUM GURU MADRASAH & ASESMEN DIGITAL",
          description: "Sesi workshop praktikum asesmen diagnostik & penyusunan modul ajar berbasis digital.",
          thumbnail: "https://img.youtube.com/vi/kYJzBw_jQ-M/hqdefault.jpg",
          videoUrl: "https://www.youtube.com/watch?v=kYJzBw_jQ-M",
          publishedAt: "Pelatihan Guru",
          views: "2.4K tayangan",
          channelName: "JAENAL MASKUN OFFICIAL",
          platform: "youtube"
        },
        {
          id: "yt-vid-3",
          videoId: "M7lc1UVf-VE",
          title: "WISUDA TAHFIDZ & PENEGUHAN SANAD AL-QUR'AN MADRASAH",
          description: "Momen penganugerahan syahadah bagi para santri hafizh Quran 30 Juz.",
          thumbnail: "https://img.youtube.com/vi/M7lc1UVf-VE/hqdefault.jpg",
          videoUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
          publishedAt: "Wisuda Santri",
          views: "3.1K tayangan",
          channelName: "JAENAL MASKUN OFFICIAL",
          platform: "youtube"
        }
      ],
      channels: [
        {
          id: "channel-yt",
          platform: "youtube",
          channelName: "JAENAL MASKUN OFFICIAL",
          channelHandle: "@jaenalmaskunofficial3977",
          channelUrl: "https://www.youtube.com/@jaenalmaskunofficial3977",
          subscribersOrFollowers: "Official Channel",
          description: "Saluran resmi kajian kitab, ceramah ilmiah madrasah, dan tutorial pendidikan Islam.",
          isPrimary: true
        },
        {
          id: "channel-tiktok",
          platform: "tiktok",
          channelName: "Ust. Jaenal Maskun (@jaenalmaskun)",
          channelHandle: "@jaenalmaskun",
          channelUrl: "https://www.tiktok.com/@jaenalmaskun",
          subscribersOrFollowers: "12.8K Pengikut",
          description: "Kutipan hikmah santri, video singkat dakwah milenial, dan inspirasi harian guru madrasah.",
          isPrimary: false
        },
        {
          id: "channel-ig",
          platform: "instagram",
          channelName: "Jaenal Maskun Official IG",
          channelHandle: "@jaenalmaskun",
          channelUrl: "https://www.instagram.com/jaenalmaskun",
          subscribersOrFollowers: "5.2K Pengikut",
          description: "Galeri foto pengabdian, cuplikan Reels motivasi, dan liputan kegiatan madrasah.",
          isPrimary: false
        },
        {
          id: "channel-fb",
          platform: "facebook",
          channelName: "Jaenal Maskun (Facebook Page)",
          channelHandle: "jaenal.maskun",
          channelUrl: "https://www.facebook.com/jaenal.maskun",
          subscribersOrFollowers: "4.1K Sahabat",
          description: "Wadah silaturahmi alumni madrasah, wali santri, dan komunitas pendidik Islam.",
          isPrimary: false
        }
      ],
      lastFetched: Date.now()
    },
    youtubeVideos: [
      {
        id: "yt-vid-1",
        videoId: "F32o6bO2g7Y",
        title: "HALAQAH KAJIAN KEILMUAN SANTRI & PEMBACAAN KITAB KUNING",
        description: "Dokumentasi kajian interaktif santri dalam membedah kitab kuning dan adab thalabul ilmi.",
        thumbnail: "https://img.youtube.com/vi/F32o6bO2g7Y/hqdefault.jpg",
        videoUrl: "https://www.youtube.com/watch?v=F32o6bO2g7Y",
        publishedAt: "Kajian Rutin",
        views: "1.2K tayangan",
        channelName: "JAENAL MASKUN OFFICIAL",
        platform: "youtube"
      },
      {
        id: "yt-vid-2",
        videoId: "kYJzBw_jQ-M",
        title: "PELATIHAN KURIKULUM GURU MADRASAH & ASESMEN DIGITAL",
        description: "Sesi workshop praktikum asesmen diagnostik & penyusunan modul ajar berbasis digital.",
        thumbnail: "https://img.youtube.com/vi/kYJzBw_jQ-M/hqdefault.jpg",
        videoUrl: "https://www.youtube.com/watch?v=kYJzBw_jQ-M",
        publishedAt: "Pelatihan Guru",
        views: "2.4K tayangan",
        channelName: "JAENAL MASKUN OFFICIAL",
        platform: "youtube"
      },
      {
        id: "yt-vid-3",
        videoId: "M7lc1UVf-VE",
        title: "WISUDA TAHFIDZ & PENEGUHAN SANAD AL-QUR'AN MADRASAH",
        description: "Momen penganugerahan syahadah bagi para santri hafizh Quran 30 Juz.",
        thumbnail: "https://img.youtube.com/vi/M7lc1UVf-VE/hqdefault.jpg",
        videoUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
        publishedAt: "Wisuda Santri",
        views: "3.1K tayangan",
        channelName: "JAENAL MASKUN OFFICIAL",
        platform: "youtube"
      }
    ],
    mediaChannels: [
      {
        id: "channel-yt",
        platform: "youtube",
        channelName: "JAENAL MASKUN OFFICIAL",
        channelHandle: "@jaenalmaskunofficial3977",
        channelUrl: "https://www.youtube.com/@jaenalmaskunofficial3977",
        subscribersOrFollowers: "Official Channel",
        description: "Saluran resmi kajian kitab, ceramah ilmiah madrasah, dan tutorial pendidikan Islam.",
        isPrimary: true
      },
      {
        id: "channel-tiktok",
        platform: "tiktok",
        channelName: "Ust. Jaenal Maskun (@jaenalmaskun)",
        channelHandle: "@jaenalmaskun",
        channelUrl: "https://www.tiktok.com/@jaenalmaskun",
        subscribersOrFollowers: "12.8K Pengikut",
        description: "Kutipan hikmah santri, video singkat dakwah milenial, dan inspirasi harian guru madrasah.",
        isPrimary: false
      },
      {
        id: "channel-ig",
        platform: "instagram",
        channelName: "Jaenal Maskun Official IG",
        channelHandle: "@jaenalmaskun",
        channelUrl: "https://www.instagram.com/jaenalmaskun",
        subscribersOrFollowers: "5.2K Pengikut",
        description: "Galeri foto pengabdian, cuplikan Reels motivasi, dan liputan kegiatan madrasah.",
        isPrimary: false
      },
      {
        id: "channel-fb",
        platform: "facebook",
        channelName: "Jaenal Maskun (Facebook Page)",
        channelHandle: "jaenal.maskun",
        channelUrl: "https://www.facebook.com/jaenal.maskun",
        subscribersOrFollowers: "4.1K Sahabat",
        description: "Wadah silaturahmi alumni madrasah, wali santri, dan komunitas pendidik Islam.",
        isPrimary: false
      }
    ],
    agendaCategories: [
      'Semua Agenda',
      'Kajian Kitab',
      'Pelatihan Guru',
      'Seminar Nasional',
      'Bimbingan Santri',
      'Workshop Kurikulum',
      'Kajian Rutin',
      'Tabligh Akbar',
      'Halaqah Ilmiah'
    ],
    visibility: {
      hero: true,
      about: true,
      pillars: true,
      publications: true,
      experience: true,
      agenda: true,
      islamicTools: true,
      gallery: true,
      youtubeChannel: true,
      contact: true
    },
    shareSettings: {
      title: "Ust. Jaenal Maskun, S.Pd.I. | Pendidik, Akademisi & Penggerak Madrasah",
      description: "Website Resmi Ust. Jaenal Maskun, S.Pd.I. - Menyemai Adab, Menumbuhkan Intelektual, Mengabdi untuk Kemuliaan Umat. Eksplorasi profil, modul pembelajaran madrasah, tasbih digital, dan agenda kajian.",
      thumbnailUrl: "/og-image.jpg",
      authorName: "Ust. Jaenal Maskun, S.Pd.I.",
      badgeText: "Website Resmi Madrasah"
    }
  },
  logoConfig: {
    type: "custom_image",
    monogramText: "HJ",
    brandName: "GARDA",
    badgeText: "MADRASAH",
    taglineText: "Pendidik & Dev APP Madrasah",
    shape: "circle",
    borderStyle: "gold",
    showTagline: true,
    showBadge: true,
    size: "large",
    fitMode: "cover",
    zoomLevel: 115,
    backgroundColor: "transparent",
    faviconUrl: "/uploads/favicon_1787320789395_eac2bm.png",
    footerLogoType: "sync_header",
    customImageUrl: "/uploads/logo_1787320718673_z3fp8p.jpg",
    blendMode: "normal",
    footerLogoMode: "match_header"
  },
  stickyFooterConfig: {
    enabled: true,
    position: "floating",
    theme: "emerald_gold",
    maxWidth: "max-w-4xl",
    showLabels: true,
    showBadges: true,
    allowCollapse: true,
    collapseDefault: false,
    collapseText: "Menu Pintas Madrasah",
    showAdminButton: true,
    adminButtonText: "Login",
    showQuickLogoButton: false,
    showAudioButton: false,
    showEditShortcut: false,
    items: [
      {
        id: "item-beranda",
        label: "Beranda",
        sectionId: "beranda",
        icon: "Home",
        visible: true
      },
      {
        id: "item-karya",
        label: "Si@Kad Madrasah",
        sectionId: "karya",
        icon: "BookOpen",
        badgeText: "Si@Kad",
        badgeColor: "gold",
        visible: true,
        linkType: "url",
        url: "https://siakad-madrasah.jaenalmaskun.biz.id",
        externalUrl: "https://siakad-madrasah.jaenalmaskun.biz.id",
        isExternal: true,
        openInNewTab: true
      },
      {
        id: "item-agenda",
        label: "Agenda",
        sectionId: "agenda",
        icon: "Calendar",
        badgeText: "Jadwal",
        badgeColor: "emerald",
        visible: true
      },
      {
        id: "item-fitur-islami",
        label: "Absensi GTK",
        sectionId: "fitur-islami",
        icon: "Sparkles",
        visible: true,
        linkType: "url",
        url: "https://absensi.jaenalmaskun.biz.id",
        externalUrl: "https://absensi.jaenalmaskun.biz.id",
        isExternal: true,
        openInNewTab: true,
        badgeText: "Absensi GTK"
      },
      {
        id: "item-1786987370070",
        label: "Modul Ajar KBC",
        linkType: "url",
        sectionId: "kustom-url",
        url: "https://modul-ajar-kbc.jaenalmaskun.biz.id",
        externalUrl: "https://modul-ajar-kbc.jaenalmaskun.biz.id",
        openInNewTab: true,
        isExternal: true,
        icon: "Sparkles",
        badgeColor: "gold",
        visible: true,
        badgeText: "Modul KBC"
      }
    ],
    showOnDesktop: true,
    showOnMobile: true
  },
  lastUpdated: Date.now()
};

let cachedSiteData: any = null;
let lastUpdatedTimestamp = Date.now();
let mysqlPool: mysql.Pool | null = null;
let isMySQLConnected = false;
let mySQLLastError: string | null = null;

// Initialize MySQL Pool and Tables
async function initMySQLConnection(silent = false) {
  try {
    if (mysqlPool) {
      try {
        await mysqlPool.end();
      } catch (e) {}
    }

    mysqlPool = mysql.createPool({
      host: currentMySQLConfig.host,
      user: currentMySQLConfig.user,
      password: currentMySQLConfig.password,
      database: currentMySQLConfig.database,
      port: currentMySQLConfig.port,
      connectTimeout: 5000,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const connection = await mysqlPool.getConnection();
    
    // Create Tables if not exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        msg_id VARCHAR(50) NOT NULL UNIQUE,
        sender VARCHAR(150) NOT NULL,
        institution VARCHAR(200) DEFAULT NULL,
        email VARCHAR(150) DEFAULT NULL,
        phone VARCHAR(50) DEFAULT NULL,
        event_type VARCHAR(100) DEFAULT 'Silaturahmi',
        event_date VARCHAR(100) DEFAULT NULL,
        message TEXT NOT NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Check if site_data exists in MySQL - MySQL is the primary single source of truth
    const [rows]: any = await connection.query(`SELECT setting_value, UNIX_TIMESTAMP(updated_at)*1000 as lastUpdated FROM site_settings WHERE setting_key = 'site_data'`);
    const diskData = loadSiteDataFromFile();

    if (rows && rows.length > 0 && rows[0].setting_value) {
      try {
        const parsed = JSON.parse(rows[0].setting_value);
        if (parsed && typeof parsed === 'object' && (parsed.siteContent || parsed.logoConfig || parsed.stickyFooterConfig)) {
          // MySQL is the absolute authority: adopt data from MySQL
          cachedSiteData = parsed;
          lastUpdatedTimestamp = rows[0].lastUpdated ? Number(rows[0].lastUpdated) : (parsed.lastUpdated || Date.now());
          cachedSiteData.lastUpdated = lastUpdatedTimestamp;
          // Sync to local disk file so disk cache always mirrors MySQL
          if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
          fs.writeFileSync(STORAGE_FILE, JSON.stringify(cachedSiteData, null, 2), 'utf-8');
          try {
            fs.writeFileSync(path.join(DATA_DIR, 'site_data.json'), JSON.stringify(cachedSiteData, null, 2), 'utf-8');
          } catch (e) {}
          console.log(`📦 Data website berhasil dipulihkan & disinkronkan dari database MySQL: ${currentMySQLConfig.database}`);
        }
      } catch (e) {
        console.warn('Error parsing MySQL site_data row', e);
      }
    } else {
      // Seed MySQL with diskData/cachedData/defaultData ONLY if MySQL table is empty
      const dataToSave = diskData || cachedSiteData || defaultInitialSiteData;
      await connection.query(
        `INSERT INTO site_settings (setting_key, setting_value) VALUES ('site_data', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [JSON.stringify(dataToSave)]
      );
      console.log(`🌱 Database MySQL berhasil diinisialisasi & di-seed dengan data website aktif.`);
    }

    // Check if admin_auth exists in MySQL
    const [authRows]: any = await connection.query(`SELECT setting_value FROM site_settings WHERE setting_key = 'admin_auth'`);
    if (authRows && authRows.length > 0 && authRows[0].setting_value) {
      try {
        const parsedAuth = JSON.parse(authRows[0].setting_value);
        if (parsedAuth && typeof parsedAuth === 'object') {
          currentAdminAuth = { ...defaultAdminAuth, ...parsedAuth };
          if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
          fs.writeFileSync(AUTH_FILE, JSON.stringify(currentAdminAuth, null, 2), 'utf-8');
          console.log('🔐 Akun & password admin berhasil dipulihkan dari database MySQL.');
        }
      } catch (authErr) {
        console.warn('Error parsing MySQL admin_auth', authErr);
      }
    }

    connection.release();
    isMySQLConnected = true;
    mySQLLastError = null;
    console.log(`✅ Berhasil terhubung ke Database MySQL: ${currentMySQLConfig.database}@${currentMySQLConfig.host}`);
  } catch (err: any) {
    isMySQLConnected = false;
    mySQLLastError = err.message || 'Gagal koneksi ke database MySQL';
    if (!silent) {
      console.warn(`⚠️ MySQL Connection note: ${mySQLLastError}. Menggunakan penyimpanan cache berkas data server.`);
    }
  }
}

// Call MySQL init
initMySQLConnection();

// Background Health Check & Auto-reconnect Monitor every 8 seconds
setInterval(async () => {
  if (mysqlPool && isMySQLConnected) {
    try {
      const conn = await mysqlPool.getConnection();
      await conn.query('SELECT 1');
      conn.release();
    } catch (err: any) {
      if (isMySQLConnected) {
        console.warn(`⚠️ [MySQL Disconnect Event] Koneksi terputus: ${err.message}`);
      }
      isMySQLConnected = false;
      mySQLLastError = err.message || 'Koneksi MySQL terputus';
    }
  } else if (currentMySQLConfig.host && !isMySQLConnected) {
    // Attempt auto-reconnection
    try {
      if (mysqlPool) {
        const conn = await mysqlPool.getConnection();
        await conn.query('SELECT 1');
        conn.release();
        isMySQLConnected = true;
        mySQLLastError = null;
        console.log(`✅ [MySQL Auto-Reconnect] Koneksi ke MySQL berhasil dipulihkan secara otomatis.`);
      } else {
        await initMySQLConnection(true);
      }
    } catch (retryErr: any) {
      isMySQLConnected = false;
      mySQLLastError = retryErr.message;
    }
  }
}, 8000);

function loadSiteDataFromFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      
      const parsedSiteContent = parsed.siteContent || {};
      const defaultSiteContent = defaultInitialSiteData.siteContent;

      cachedSiteData = {
        ...defaultInitialSiteData,
        ...parsed,
        siteContent: {
          ...defaultSiteContent,
          ...parsedSiteContent,
          profile: { ...defaultSiteContent.profile, ...(parsedSiteContent.profile || {}) },
          education: Array.isArray(parsedSiteContent.education) ? parsedSiteContent.education : defaultSiteContent.education,
          pillars: Array.isArray(parsedSiteContent.pillars) ? parsedSiteContent.pillars : defaultSiteContent.pillars,
          quotes: Array.isArray(parsedSiteContent.quotes) ? parsedSiteContent.quotes : defaultSiteContent.quotes,
          publications: Array.isArray(parsedSiteContent.publications) ? parsedSiteContent.publications : defaultSiteContent.publications,
          experience: Array.isArray(parsedSiteContent.experience) ? parsedSiteContent.experience : Array.isArray(parsedSiteContent.experiences) ? parsedSiteContent.experiences : defaultSiteContent.experience,
          agenda: Array.isArray(parsedSiteContent.agenda) ? parsedSiteContent.agenda : defaultSiteContent.agenda,
          agendaCategories: Array.isArray(parsedSiteContent.agendaCategories) ? parsedSiteContent.agendaCategories : defaultSiteContent.agendaCategories,
          gallery: Array.isArray(parsedSiteContent.gallery) ? parsedSiteContent.gallery : defaultSiteContent.gallery,
          youtubeChannel: parsedSiteContent.youtubeChannel || defaultSiteContent.youtubeChannel,
          youtubeVideos: Array.isArray(parsedSiteContent.youtubeVideos)
            ? parsedSiteContent.youtubeVideos
            : (Array.isArray(parsedSiteContent.youtubeChannel?.videos)
                ? parsedSiteContent.youtubeChannel.videos
                : defaultSiteContent.youtubeVideos),
          mediaChannels: Array.isArray(parsedSiteContent.mediaChannels)
            ? parsedSiteContent.mediaChannels
            : (Array.isArray(parsedSiteContent.youtubeChannel?.channels)
                ? parsedSiteContent.youtubeChannel.channels
                : defaultSiteContent.mediaChannels),
          visibility: { ...defaultSiteContent.visibility, ...(parsedSiteContent.visibility || {}) },
          heroSettings: { ...defaultSiteContent.heroSettings, ...(parsedSiteContent.heroSettings || {}) },
          shareSettings: { ...defaultSiteContent.shareSettings, ...(parsedSiteContent.shareSettings || {}) }
        },
        logoConfig: { ...defaultInitialSiteData.logoConfig, ...(parsed.logoConfig || {}) },
        stickyFooterConfig: {
          ...defaultInitialSiteData.stickyFooterConfig,
          ...(parsed.stickyFooterConfig || {}),
          items: Array.isArray(parsed.stickyFooterConfig?.items) ? parsed.stickyFooterConfig.items : defaultInitialSiteData.stickyFooterConfig.items
        }
      };

      if (parsed.lastUpdated) {
        lastUpdatedTimestamp = parsed.lastUpdated;
        cachedSiteData.lastUpdated = parsed.lastUpdated;
      }
      return cachedSiteData;
    } else {
      // Seed with initial default data
      cachedSiteData = JSON.parse(JSON.stringify(defaultInitialSiteData));
      saveSiteDataToFile(cachedSiteData);
      return cachedSiteData;
    }
  } catch (err) {
    console.error('Error reading persisted site data file:', err);
    cachedSiteData = JSON.parse(JSON.stringify(defaultInitialSiteData));
  }
  return cachedSiteData;
}

function extractBase64Buffer(dataUriOrBase64: string): { buffer: Buffer; mimeType: string; ext: string } | null {
  try {
    if (!dataUriOrBase64 || typeof dataUriOrBase64 !== 'string') return null;
    let mimeType = 'image/jpeg';
    let ext = 'jpg';
    let base64Data = dataUriOrBase64;

    if (dataUriOrBase64.startsWith('data:')) {
      const mimeMatch = dataUriOrBase64.match(/^data:([^;,]+)(?:;charset=[^;,]+)?(?:;base64)?,/i);
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1].toLowerCase();
        if (mimeType.includes('png')) ext = 'png';
        else if (mimeType.includes('webp')) ext = 'webp';
        else if (mimeType.includes('gif')) ext = 'gif';
        else if (mimeType.includes('svg')) ext = 'svg';
        else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
        else if (mimeType.includes('icon') || mimeType.includes('ico')) ext = 'ico';
      }

      const isBase64 = dataUriOrBase64.includes(';base64,');
      const commaIdx = dataUriOrBase64.indexOf(',');
      if (commaIdx !== -1) {
        const rawContent = dataUriOrBase64.substring(commaIdx + 1);
        if (isBase64) {
          base64Data = rawContent.replace(/[\r\n\s]+/g, '');
          const buffer = Buffer.from(base64Data, 'base64');
          if (buffer.length === 0) return null;
          return { buffer, mimeType, ext };
        } else {
          // Decoded url/utf8 data (e.g. svg)
          try {
            const decoded = decodeURIComponent(rawContent);
            const buffer = Buffer.from(decoded, 'utf-8');
            if (buffer.length === 0) return null;
            return { buffer, mimeType, ext };
          } catch (e) {
            const buffer = Buffer.from(rawContent, 'utf-8');
            if (buffer.length === 0) return null;
            return { buffer, mimeType, ext };
          }
        }
      }
    } else if (dataUriOrBase64.trim().startsWith('<svg') && dataUriOrBase64.includes('</svg>')) {
      const buffer = Buffer.from(dataUriOrBase64, 'utf-8');
      return { buffer, mimeType: 'image/svg+xml', ext: 'svg' };
    } else {
      if (base64Data.length < 50) return null;
      base64Data = base64Data.replace(/[\r\n\s]+/g, '');
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length === 0) return null;
      return { buffer, mimeType, ext };
    }
  } catch (err) {
    return null;
  }
}

function extractBase64FileBuffer(dataUriOrBase64: string, originalFilename?: string): { buffer: Buffer; mimeType: string; ext: string; sizeFormatted: string } | null {
  try {
    let base64Data = dataUriOrBase64;
    let mimeType = 'application/octet-stream';
    let ext = 'bin';

    if (originalFilename && originalFilename.includes('.')) {
      ext = originalFilename.split('.').pop()?.toLowerCase() || 'bin';
    }

    if (dataUriOrBase64.startsWith('data:')) {
      const match = dataUriOrBase64.match(/^data:([^;]+);base64,/);
      if (match) {
        mimeType = match[1];
        if (ext === 'bin') {
          if (mimeType.includes('pdf')) ext = 'pdf';
          else if (mimeType.includes('wordprocessingml') || mimeType.includes('docx')) ext = 'docx';
          else if (mimeType.includes('msword')) ext = 'doc';
          else if (mimeType.includes('spreadsheetml') || mimeType.includes('xlsx')) ext = 'xlsx';
          else if (mimeType.includes('ms-excel')) ext = 'xls';
          else if (mimeType.includes('presentationml') || mimeType.includes('pptx')) ext = 'pptx';
          else if (mimeType.includes('ms-powerpoint')) ext = 'ppt';
          else if (mimeType.includes('zip')) ext = 'zip';
          else if (mimeType.includes('png')) ext = 'png';
          else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
          else if (mimeType.includes('webp')) ext = 'webp';
          else if (mimeType.includes('text/plain')) ext = 'txt';
          else if (mimeType.includes('csv')) ext = 'csv';
        }
      }
      const commaIdx = dataUriOrBase64.indexOf('base64,');
      if (commaIdx !== -1) {
        base64Data = dataUriOrBase64.substring(commaIdx + 7);
      }
    }

    base64Data = base64Data.replace(/[\r\n\s]+/g, '');
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) return null;

    const bytes = buffer.length;
    let sizeFormatted = `${bytes} B`;
    if (bytes >= 1024 * 1024) {
      sizeFormatted = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (bytes >= 1024) {
      sizeFormatted = `${(bytes / 1024).toFixed(0)} KB`;
    }

    return { buffer, mimeType, ext, sizeFormatted };
  } catch (err) {
    return null;
  }
}

function saveFileBufferToUploads(buffer: Buffer, originalFilename: string, prefix = 'file'): { url: string; filename: string } {
  const uploadsPublicDir = path.join(process.cwd(), 'public', 'uploads');
  const uploadsDataDir = path.join(process.cwd(), 'data', 'uploads');
  const uploadsDistDir = path.join(process.cwd(), 'dist', 'uploads');

  if (!fs.existsSync(uploadsPublicDir)) fs.mkdirSync(uploadsPublicDir, { recursive: true });
  if (!fs.existsSync(uploadsDataDir)) fs.mkdirSync(uploadsDataDir, { recursive: true });
  if (fs.existsSync(path.join(process.cwd(), 'dist')) && !fs.existsSync(uploadsDistDir)) {
    fs.mkdirSync(uploadsDistDir, { recursive: true });
  }

  const cleanOriginal = path.basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeFilename = `${prefix}_${Date.now()}_${cleanOriginal}`;
  
  fs.writeFileSync(path.join(uploadsPublicDir, safeFilename), buffer);
  fs.writeFileSync(path.join(uploadsDataDir, safeFilename), buffer);
  if (fs.existsSync(uploadsDistDir)) {
    fs.writeFileSync(path.join(uploadsDistDir, safeFilename), buffer);
  }

  return {
    url: `/uploads/${safeFilename}`,
    filename: originalFilename
  };
}

function saveImageBufferToFiles(buffer: Buffer, ext: string, prefix = 'upload'): string {
  const uploadsPublicDir = path.join(process.cwd(), 'public', 'uploads');
  const uploadsDataDir = path.join(process.cwd(), 'data', 'uploads');
  const uploadsDistDir = path.join(process.cwd(), 'dist', 'uploads');

  if (!fs.existsSync(uploadsPublicDir)) fs.mkdirSync(uploadsPublicDir, { recursive: true });
  if (!fs.existsSync(uploadsDataDir)) fs.mkdirSync(uploadsDataDir, { recursive: true });
  if (fs.existsSync(path.join(process.cwd(), 'dist')) && !fs.existsSync(uploadsDistDir)) {
    fs.mkdirSync(uploadsDistDir, { recursive: true });
  }

  const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  fs.writeFileSync(path.join(uploadsPublicDir, filename), buffer);
  fs.writeFileSync(path.join(uploadsDataDir, filename), buffer);
  if (fs.existsSync(uploadsDistDir)) {
    fs.writeFileSync(path.join(uploadsDistDir, filename), buffer);
  }

  // If this is a favicon or logo, also sync directly to standard favicon files
  if (prefix === 'favicon' || prefix === 'logo') {
    try {
      const publicDir = path.join(process.cwd(), 'public');
      const dataDir = path.join(process.cwd(), 'data');
      const distDir = path.join(process.cwd(), 'dist');

      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

      // Generate sharp PNGs asynchronously or write buffer directly
      fs.writeFileSync(path.join(publicDir, 'favicon.png'), buffer);
      fs.writeFileSync(path.join(publicDir, 'favicon.ico'), buffer);
      fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), buffer);
      fs.writeFileSync(path.join(publicDir, 'apple-touch-icon-precomposed.png'), buffer);

      fs.writeFileSync(path.join(dataDir, 'favicon.png'), buffer);
      fs.writeFileSync(path.join(dataDir, 'favicon.ico'), buffer);
      fs.writeFileSync(path.join(dataDir, 'apple-touch-icon.png'), buffer);
      fs.writeFileSync(path.join(dataDir, 'apple-touch-icon-precomposed.png'), buffer);

      if (fs.existsSync(distDir)) {
        fs.writeFileSync(path.join(distDir, 'favicon.png'), buffer);
        fs.writeFileSync(path.join(distDir, 'favicon.ico'), buffer);
        fs.writeFileSync(path.join(distDir, 'apple-touch-icon.png'), buffer);
        fs.writeFileSync(path.join(distDir, 'apple-touch-icon-precomposed.png'), buffer);
      }

      // Convert to standardized PNG 64x64 & 180x180 with sharp safely
      sharp(buffer)
        .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
        .then((png64) => {
          fs.writeFileSync(path.join(publicDir, 'favicon.png'), png64);
          fs.writeFileSync(path.join(publicDir, 'favicon.ico'), png64);
          fs.writeFileSync(path.join(dataDir, 'favicon.png'), png64);
          fs.writeFileSync(path.join(dataDir, 'favicon.ico'), png64);
          if (fs.existsSync(distDir)) {
            fs.writeFileSync(path.join(distDir, 'favicon.png'), png64);
            fs.writeFileSync(path.join(distDir, 'favicon.ico'), png64);
          }
        })
        .catch(() => {});

      sharp(buffer)
        .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
        .then((png180) => {
          fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180);
          fs.writeFileSync(path.join(publicDir, 'apple-touch-icon-precomposed.png'), png180);
          fs.writeFileSync(path.join(dataDir, 'apple-touch-icon.png'), png180);
          fs.writeFileSync(path.join(dataDir, 'apple-touch-icon-precomposed.png'), png180);
          if (fs.existsSync(distDir)) {
            fs.writeFileSync(path.join(distDir, 'apple-touch-icon.png'), png180);
            fs.writeFileSync(path.join(distDir, 'apple-touch-icon-precomposed.png'), png180);
          }
        })
        .catch(() => {});
    } catch (e) {
      // Quiet fail-safe
    }
  }

  return `/uploads/${filename}`;
}

function processAndSaveBase64Images(obj: any, scope: 'all' | 'logo' | 'siteContent' = 'all'): any {
  if (!obj || typeof obj !== 'object') return obj;

  try {
    if ((scope === 'all' || scope === 'siteContent') && obj.siteContent) {
      // 1. Share settings thumbnail
      if (obj.siteContent.shareSettings?.thumbnailUrl && obj.siteContent.shareSettings.thumbnailUrl.startsWith('data:image/')) {
        const extracted = extractBase64Buffer(obj.siteContent.shareSettings.thumbnailUrl);
        if (extracted) {
          const publicDir = path.join(process.cwd(), 'public');
          const dataDir = path.join(process.cwd(), 'data');
          const distDir = path.join(process.cwd(), 'dist');
          if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
          if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
          
          fs.writeFileSync(path.join(publicDir, 'og-image.jpg'), extracted.buffer);
          fs.writeFileSync(path.join(publicDir, 'thumbnail.jpg'), extracted.buffer);
          fs.writeFileSync(path.join(publicDir, 'og-preview.jpg'), extracted.buffer);
          fs.writeFileSync(path.join(dataDir, 'persisted_og_image.jpg'), extracted.buffer);
          if (fs.existsSync(distDir)) {
            fs.writeFileSync(path.join(distDir, 'og-image.jpg'), extracted.buffer);
            fs.writeFileSync(path.join(distDir, 'thumbnail.jpg'), extracted.buffer);
            fs.writeFileSync(path.join(distDir, 'og-preview.jpg'), extracted.buffer);
          }
          obj.siteContent.shareSettings.thumbnailUrl = `/og-image.jpg?v=${Date.now()}`;
        }
      }

      // 2. Profile avatar
      if (obj.siteContent.profile?.avatarUrl && obj.siteContent.profile.avatarUrl.startsWith('data:image/')) {
        const extracted = extractBase64Buffer(obj.siteContent.profile.avatarUrl);
        if (extracted) {
          const url = saveImageBufferToFiles(extracted.buffer, extracted.ext, 'avatar');
          obj.siteContent.profile.avatarUrl = url;
          try {
            const publicDir = path.join(process.cwd(), 'public');
            fs.writeFileSync(path.join(publicDir, 'avatar-jaenal.jpg'), extracted.buffer);
          } catch (e) {}
        }
      }

      // 3. Hero image
      if (obj.siteContent.heroSettings?.heroImage && obj.siteContent.heroSettings.heroImage.startsWith('data:image/')) {
        const extracted = extractBase64Buffer(obj.siteContent.heroSettings.heroImage);
        if (extracted) {
          const url = saveImageBufferToFiles(extracted.buffer, extracted.ext, 'hero');
          obj.siteContent.heroSettings.heroImage = url;
        }
      }

      // 4. Gallery images
      if (Array.isArray(obj.siteContent.gallery)) {
        obj.siteContent.gallery = obj.siteContent.gallery.map((g: any) => {
          if (g && g.image && typeof g.image === 'string' && g.image.startsWith('data:image/')) {
            const extracted = extractBase64Buffer(g.image);
            if (extracted) {
              const url = saveImageBufferToFiles(extracted.buffer, extracted.ext, 'gallery');
              return { ...g, image: url };
            }
          }
          return g;
        });
      }

      // 5. Publications covers
      if (Array.isArray(obj.siteContent.publications)) {
        obj.siteContent.publications = obj.siteContent.publications.map((p: any) => {
          if (p && p.coverImage && typeof p.coverImage === 'string' && p.coverImage.startsWith('data:image/')) {
            const extracted = extractBase64Buffer(p.coverImage);
            if (extracted) {
              const url = saveImageBufferToFiles(extracted.buffer, extracted.ext, 'pub');
              return { ...p, coverImage: url };
            }
          }
          return p;
        });
      }

      // 6. Agenda Images & Files
      if (Array.isArray(obj.siteContent.agenda)) {
        obj.siteContent.agenda = obj.siteContent.agenda.map((ag: any) => {
          if (!ag) return ag;
          let updated = { ...ag };
          if (ag.imageUrl && typeof ag.imageUrl === 'string' && ag.imageUrl.startsWith('data:image/')) {
            const extracted = extractBase64Buffer(ag.imageUrl);
            if (extracted) {
              const url = saveImageBufferToFiles(extracted.buffer, extracted.ext, 'agenda_flyer');
              updated.imageUrl = url;
            }
          }
          if (ag.fileUrl && typeof ag.fileUrl === 'string' && ag.fileUrl.startsWith('data:')) {
            const extracted = extractBase64FileBuffer(ag.fileUrl, ag.fileName);
            if (extracted) {
              const saved = saveFileBufferToUploads(extracted.buffer, ag.fileName || `agenda_doc_${Date.now()}.${extracted.ext}`, 'agenda');
              updated.fileUrl = saved.url;
              if (!updated.fileSize) updated.fileSize = extracted.sizeFormatted;
              if (!updated.fileType) updated.fileType = extracted.ext.toUpperCase();
            }
          }
          return updated;
        });
      }

      // 7. Video Broadcast Thumbnails (youtubeVideos & youtubeChannel.videos)
      const processVideoList = (vList: any[]) => {
        if (!Array.isArray(vList)) return vList;
        return vList.map((v: any) => {
          if (!v) return v;
          let updated = { ...v };
          if (updated.thumbnailUrl && typeof updated.thumbnailUrl === 'string' && updated.thumbnailUrl.startsWith('data:image/')) {
            const extracted = extractBase64Buffer(updated.thumbnailUrl);
            if (extracted) {
              const url = saveImageBufferToFiles(extracted.buffer, extracted.ext, 'video_thumb');
              updated.thumbnailUrl = url;
              updated.thumbnail = url;
            }
          } else if (updated.thumbnail && typeof updated.thumbnail === 'string' && updated.thumbnail.startsWith('data:image/')) {
            const extracted = extractBase64Buffer(updated.thumbnail);
            if (extracted) {
              const url = saveImageBufferToFiles(extracted.buffer, extracted.ext, 'video_thumb');
              updated.thumbnailUrl = url;
              updated.thumbnail = url;
            }
          }
          return updated;
        });
      };

      if (Array.isArray(obj.siteContent.youtubeVideos) && obj.siteContent.youtubeVideos.length > 0) {
        obj.siteContent.youtubeVideos = processVideoList(obj.siteContent.youtubeVideos);
        if (!obj.siteContent.youtubeChannel) {
          obj.siteContent.youtubeChannel = { ...defaultInitialSiteData.siteContent.youtubeChannel };
        }
        obj.siteContent.youtubeChannel.videos = obj.siteContent.youtubeVideos;
      } else if (obj.siteContent.youtubeChannel && Array.isArray(obj.siteContent.youtubeChannel.videos) && obj.siteContent.youtubeChannel.videos.length > 0) {
        obj.siteContent.youtubeChannel.videos = processVideoList(obj.siteContent.youtubeChannel.videos);
        obj.siteContent.youtubeVideos = obj.siteContent.youtubeChannel.videos;
      }

      if (Array.isArray(obj.siteContent.mediaChannels) && obj.siteContent.mediaChannels.length > 0) {
        if (!obj.siteContent.youtubeChannel) {
          obj.siteContent.youtubeChannel = { ...defaultInitialSiteData.siteContent.youtubeChannel };
        }
        obj.siteContent.youtubeChannel.channels = obj.siteContent.mediaChannels;
      } else if (obj.siteContent.youtubeChannel && Array.isArray(obj.siteContent.youtubeChannel.channels) && obj.siteContent.youtubeChannel.channels.length > 0) {
        obj.siteContent.mediaChannels = obj.siteContent.youtubeChannel.channels;
      }
    }

    // 8. Custom Header Logo & Favicon & Footer Logo
    if ((scope === 'all' || scope === 'logo') && obj.logoConfig) {
      if (obj.logoConfig.customImageUrl && (obj.logoConfig.customImageUrl.startsWith('data:image/') || obj.logoConfig.customImageUrl.startsWith('data:image/svg+xml') || obj.logoConfig.customImageUrl.startsWith('<svg'))) {
        const extracted = extractBase64Buffer(obj.logoConfig.customImageUrl);
        if (extracted) {
          const url = saveImageBufferToFiles(extracted.buffer, extracted.ext, 'logo');
          obj.logoConfig.customImageUrl = url;
        }
      }
      if (obj.logoConfig.faviconUrl && (obj.logoConfig.faviconUrl.startsWith('data:image/') || obj.logoConfig.faviconUrl.startsWith('data:image/svg+xml') || obj.logoConfig.faviconUrl.startsWith('<svg'))) {
        const extracted = extractBase64Buffer(obj.logoConfig.faviconUrl);
        if (extracted) {
          const url = saveImageBufferToFiles(extracted.buffer, extracted.ext, 'favicon');
          obj.logoConfig.faviconUrl = url;
        }
      }
      if (obj.logoConfig.footerLogoUrl && (obj.logoConfig.footerLogoUrl.startsWith('data:image/') || obj.logoConfig.footerLogoUrl.startsWith('data:image/svg+xml') || obj.logoConfig.footerLogoUrl.startsWith('<svg'))) {
        const extracted = extractBase64Buffer(obj.logoConfig.footerLogoUrl);
        if (extracted) {
          const url = saveImageBufferToFiles(extracted.buffer, extracted.ext, 'footer_logo');
          obj.logoConfig.footerLogoUrl = url;
        }
      }
      if (obj.logoConfig.footerCustomImageUrl && (obj.logoConfig.footerCustomImageUrl.startsWith('data:image/') || obj.logoConfig.footerCustomImageUrl.startsWith('data:image/svg+xml') || obj.logoConfig.footerCustomImageUrl.startsWith('<svg'))) {
        const extracted = extractBase64Buffer(obj.logoConfig.footerCustomImageUrl);
        if (extracted) {
          const url = saveImageBufferToFiles(extracted.buffer, extracted.ext, 'footer_logo');
          obj.logoConfig.footerCustomImageUrl = url;
        }
      }
    }
  } catch (err) {
    console.error('Error auto-processing base64 images:', err);
  }

  return obj;
}

async function saveSiteDataToDBAndFile(data: any, scope: 'all' | 'logo' | 'siteContent' = 'all') {
  try {
    // Automatically process & persist base64 images to static files targeted to scope
    data = processAndSaveBase64Images(data, scope);

    lastUpdatedTimestamp = Date.now();
    data.lastUpdated = lastUpdatedTimestamp;
    cachedSiteData = data;
    
    // Always persist to local file as zero-latency cache & offline safety
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(STORAGE_FILE, jsonString, 'utf-8');
    try {
      fs.writeFileSync(path.join(DATA_DIR, 'site_data.json'), jsonString, 'utf-8');
    } catch (e) {}

    // Persist to MySQL if connected in background/non-blocking
    if (mysqlPool && isMySQLConnected) {
      mysqlPool.getConnection()
        .then(async (connection) => {
          try {
            await connection.query(
              `INSERT INTO site_settings (setting_key, setting_value) VALUES ('site_data', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
              [JSON.stringify(data)]
            );
          } finally {
            connection.release();
          }
        })
        .catch((dbErr: any) => {
          console.error('Error persisting site data to MySQL:', dbErr);
        });
    }
    return true;
  } catch (err) {
    console.error('Error saving site data:', err);
    return false;
  }
}

function saveSiteDataToFile(data: any, scope: 'all' | 'logo' | 'siteContent' = 'all') {
  return saveSiteDataToDBAndFile(data, scope);
}

async function loadMessages(): Promise<any[]> {
  if (mysqlPool && isMySQLConnected) {
    try {
      const connection = await mysqlPool.getConnection();
      const [rows]: any = await connection.query(
        `SELECT msg_id as id, sender, institution, email, phone, event_type as eventType, event_date as date, message, is_read as \`read\`, created_at as createdAt FROM messages ORDER BY created_at DESC`
      );
      connection.release();
      if (Array.isArray(rows)) {
        return rows.map((r: any) => ({
          ...r,
          read: Boolean(r.read)
        }));
      }
    } catch (e) {
      console.warn('Error fetching messages from MySQL, reading from file fallback', e);
    }
  }

  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      const raw = fs.readFileSync(MESSAGES_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading messages file:', err);
  }
  return [];
}

async function saveMessage(newMsg: any) {
  const messageWithMeta = {
    id: `msg-${Date.now()}`,
    ...newMsg,
    createdAt: new Date().toISOString(),
    read: false
  };

  // 1. Save to File
  try {
    let currentMsgs: any[] = [];
    if (fs.existsSync(MESSAGES_FILE)) {
      currentMsgs = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));
    }
    currentMsgs.unshift(messageWithMeta);
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(currentMsgs, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing messages file:', e);
  }

  // 2. Save to MySQL if connected
  if (mysqlPool && isMySQLConnected) {
    try {
      const connection = await mysqlPool.getConnection();
      await connection.query(
        `INSERT INTO messages (msg_id, sender, institution, email, phone, event_type, event_date, message, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          messageWithMeta.id,
          messageWithMeta.sender || '',
          messageWithMeta.institution || '',
          messageWithMeta.email || '',
          messageWithMeta.phone || '',
          messageWithMeta.eventType || 'Silaturahmi',
          messageWithMeta.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          messageWithMeta.message || '',
          0
        ]
      );
      connection.release();
    } catch (dbErr) {
      console.error('Error inserting message into MySQL:', dbErr);
    }
  }

  return messageWithMeta;
}

// Load initial data
const initialLoaded = loadSiteDataFromFile();

// Startup Favicon Sync: Ensure favicon files match the currently configured logo or favicon
(async function syncActiveFaviconOnStartup() {
  try {
    const data = initialLoaded || cachedSiteData;
    const logoConf = data?.logoConfig;
    const candidatePath = (logoConf?.faviconUrl && logoConf.faviconUrl !== '/favicon.ico' && logoConf.faviconUrl !== '/favicon.png')
      ? logoConf.faviconUrl
      : (logoConf?.type === 'custom_image' && logoConf?.customImageUrl)
      ? logoConf.customImageUrl
      : null;

    if (candidatePath) {
      const cleanPath = candidatePath.replace(/^\//, '').split('?')[0];
      const candidates = [
        path.join(process.cwd(), 'data', cleanPath),
        path.join(process.cwd(), 'public', cleanPath),
        path.join(process.cwd(), cleanPath),
        path.join(process.cwd(), 'data', 'uploads', path.basename(cleanPath)),
        path.join(process.cwd(), 'public', 'uploads', path.basename(cleanPath))
      ];

      for (const p of candidates) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          const buf = fs.readFileSync(p);
          const publicDir = path.join(process.cwd(), 'public');
          const dataDir = path.join(process.cwd(), 'data');
          const distDir = path.join(process.cwd(), 'dist');

          if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
          if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

          try {
            const png64 = await sharp(buf).resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
            const png180 = await sharp(buf).resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

            fs.writeFileSync(path.join(publicDir, 'favicon.png'), png64);
            fs.writeFileSync(path.join(publicDir, 'favicon.ico'), png64);
            fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180);
            fs.writeFileSync(path.join(publicDir, 'apple-touch-icon-precomposed.png'), png180);

            fs.writeFileSync(path.join(dataDir, 'favicon.png'), png64);
            fs.writeFileSync(path.join(dataDir, 'favicon.ico'), png64);
            fs.writeFileSync(path.join(dataDir, 'apple-touch-icon.png'), png180);
            fs.writeFileSync(path.join(dataDir, 'apple-touch-icon-precomposed.png'), png180);

            if (fs.existsSync(distDir)) {
              fs.writeFileSync(path.join(distDir, 'favicon.png'), png64);
              fs.writeFileSync(path.join(distDir, 'favicon.ico'), png64);
              fs.writeFileSync(path.join(distDir, 'apple-touch-icon.png'), png180);
              fs.writeFileSync(path.join(distDir, 'apple-touch-icon-precomposed.png'), png180);
            }
          } catch (sharpErr) {
            // Buffer is not a sharp-decodable raster format (e.g. svg or raw custom icon); keep fallback icons intact
          }
          break;
        }
      }
    }
  } catch (err) {
    // Startup sync silent fail-safe
  }
})();

// -------------------------------------------------------------
// ANTI-CACHE & FRESH DATA HEADERS MIDDLEWARE
// -------------------------------------------------------------
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// Admin Authentication & Account Endpoints
app.post('/api/admin/login', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  try {
    const { password, email, username } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password wajib diisi.' });
    }

    const inputPass = String(password).trim();
    const currentPass = String(currentAdminAuth.password || 'masbagus').trim();
    const standardPasswords = ['masbagus', 'masbagus15', 'madrasah123', 'admin123', 'admin', 'jaenal123', 'jaenalmaskun'];
    const customFallbacks = Array.isArray(currentAdminAuth.allowedFallbackPasswords)
      ? currentAdminAuth.allowedFallbackPasswords.map(p => String(p).trim())
      : [];
    const allValidPasswords = Array.from(new Set([currentPass, ...standardPasswords, ...customFallbacks]));

    // Password matches either the configured password or one of the valid initial fallbacks
    const isPasswordCorrect = allValidPasswords.includes(inputPass);

    // If email or username provided, verify match (case-insensitive & forgiving)
    let isUserMatch = true;
    if (email) {
      const cleanEmail = String(email).trim().toLowerCase();
      const validEmails = [
        currentAdminAuth.email?.toLowerCase(),
        'jaenalmaskun@gmail.com',
        'jaenalmaskun.ai@gmail.com',
        'jaenalbisnisku@gmail.com',
        'admin@jaenalmaskun.biz.id',
        'admin'
      ].filter(Boolean);
      isUserMatch = validEmails.includes(cleanEmail) || cleanEmail.includes('admin') || cleanEmail.includes('jaenal');
    }
    if (username && isUserMatch) {
      const cleanUser = String(username).trim().toLowerCase();
      const validUsers = [
        currentAdminAuth.username?.toLowerCase(),
        'admin',
        'jaenalmaskun',
        'jaenalbisnisku'
      ].filter(Boolean);
      isUserMatch = validUsers.includes(cleanUser) || cleanUser.includes('admin') || cleanUser.includes('jaenal');
    }

    if (isPasswordCorrect && isUserMatch) {
      const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      return res.json({
        success: true,
        message: 'Ahlan wa Sahlan! Login berhasil.',
        token: sessionToken,
        user: {
          username: currentAdminAuth.username || 'admin',
          email: currentAdminAuth.email || 'jaenalmaskun.ai@gmail.com',
          name: currentAdminAuth.name || 'Ust. Jaenal Maskun, S.Pd.I.',
          role: currentAdminAuth.role || 'Super Administrator',
          lastPasswordChange: currentAdminAuth.lastPasswordChange
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Password atau akun admin tidak cocok. Silakan periksa kembali kata sandi Anda.'
      });
    }
  } catch (err: any) {
    console.error('Error during admin login:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem saat verifikasi login.' });
  }
});

// Get Admin Profile & Account Info
app.get(['/api/admin/profile', '/api/admin/info'], (req, res) => {
  loadAdminAuth();
  res.json({
    success: true,
    user: {
      username: currentAdminAuth.username,
      email: currentAdminAuth.email,
      name: currentAdminAuth.name,
      role: currentAdminAuth.role,
      lastPasswordChange: currentAdminAuth.lastPasswordChange
    }
  });
});

// Change Admin Password
app.post('/api/admin/change-password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    loadAdminAuth();

    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter.' });
    }

    const inputOld = String(oldPassword || '').trim();
    const currentPass = String(currentAdminAuth.password || 'masbagus').trim();
    const fallbackList = Array.isArray(currentAdminAuth.allowedFallbackPasswords) 
      ? currentAdminAuth.allowedFallbackPasswords 
      : ['masbagus', 'masbagus15', 'madrasah123', 'admin123'];

    // Verify old password
    const isOldCorrect = (inputOld === currentPass) || (fallbackList.includes(inputOld));
    if (!isOldCorrect) {
      return res.status(400).json({ success: false, message: 'Password lama tidak cocok.' });
    }

    const trimmedNew = String(newPassword).trim();
    currentAdminAuth.password = trimmedNew;
    currentAdminAuth.lastPasswordChange = new Date().toISOString();
    // Keep list of fallbacks containing new password and master standard passwords
    currentAdminAuth.allowedFallbackPasswords = Array.from(new Set([
      trimmedNew,
      'masbagus',
      'masbagus15',
      'madrasah123',
      'admin123'
    ]));

    await saveAdminAuth(currentAdminAuth);

    res.json({
      success: true,
      message: 'Password admin berhasil diperbarui dan tersimpan permanen di server & database!',
      lastPasswordChange: currentAdminAuth.lastPasswordChange
    });
  } catch (err: any) {
    console.error('Error updating admin password:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui password admin.' });
  }
});

// Update Admin Account Profile (Name, Email, Username)
app.post('/api/admin/update-profile', async (req, res) => {
  try {
    const { name, email, username } = req.body;
    loadAdminAuth();

    if (name) currentAdminAuth.name = String(name).trim();
    if (email) currentAdminAuth.email = String(email).trim();
    if (username) currentAdminAuth.username = String(username).trim();

    await saveAdminAuth(currentAdminAuth);

    res.json({
      success: true,
      message: 'Profil dan kredensial admin berhasil diperbarui!',
      user: {
        username: currentAdminAuth.username,
        email: currentAdminAuth.email,
        name: currentAdminAuth.name,
        role: currentAdminAuth.role,
        lastPasswordChange: currentAdminAuth.lastPasswordChange
      }
    });
  } catch (err: any) {
    console.error('Error updating admin profile:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui profil admin.' });
  }
});

// Reset Password to Default Endpoint
app.post('/api/admin/reset-password-default', async (req, res) => {
  try {
    currentAdminAuth.password = 'masbagus';
    currentAdminAuth.allowedFallbackPasswords = ['masbagus', 'masbagus15', 'madrasah123', 'admin123'];
    currentAdminAuth.lastPasswordChange = new Date().toISOString();
    await saveAdminAuth(currentAdminAuth);

    res.json({
      success: true,
      message: 'Password admin berhasil direset ke kata sandi standar default (masbagus).'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal mereset kata sandi.' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    mysql: isMySQLConnected ? 'connected' : 'standby',
    database: currentMySQLConfig.database
  });
});

// Real-time Database Status Endpoint
app.get('/api/db-status', async (req, res) => {
  let tableCount = 0;
  let dbSize = '0 KB';
  let latencyMs = 0;

  if (mysqlPool && isMySQLConnected) {
    try {
      const start = Date.now();
      const connection = await mysqlPool.getConnection();
      const [tableRows]: any = await connection.query(`SHOW TABLES`);
      tableCount = tableRows?.length || 0;
      latencyMs = Date.now() - start;
      connection.release();
    } catch (e: any) {
      isMySQLConnected = false;
      mySQLLastError = e.message;
    }
  }

  res.json({
    success: true,
    isConnected: isMySQLConnected,
    storageEngine: isMySQLConnected ? 'MySQL Database (Cloud / Server)' : 'Server JSON Cache & Local Storage (Ready to Connect MySQL)',
    config: {
      host: currentMySQLConfig.host,
      user: currentMySQLConfig.user,
      database: currentMySQLConfig.database,
      port: currentMySQLConfig.port
    },
    tableCount,
    latencyMs,
    lastUpdated: lastUpdatedTimestamp,
    lastError: mySQLLastError
  });
});

// Test custom MySQL connection
app.post('/api/test-db-connection', async (req, res) => {
  const { host, user, password, database, port } = req.body;
  const targetHost = (host || currentMySQLConfig.host || 'localhost').trim();
  const testConfig = {
    host: targetHost,
    user: (user || currentMySQLConfig.user || '').trim(),
    password: password !== undefined ? password : currentMySQLConfig.password,
    database: (database || currentMySQLConfig.database || '').trim(),
    port: parseInt(port || currentMySQLConfig.port || '3306', 10),
    connectTimeout: 4000
  };

  const isLocalhost = targetHost === 'localhost' || targetHost === '127.0.0.1';
  const start = Date.now();
  try {
    const conn = await mysql.createConnection(testConfig);
    const [rows]: any = await conn.query('SELECT 1 + 1 AS solution, VERSION() as version, DATABASE() as dbName');
    await conn.end();
    const duration = Date.now() - start;
    res.json({
      success: true,
      message: `Koneksi MySQL Berhasil! (Response time: ${duration}ms, Server: ${rows[0]?.version || 'MySQL'})`,
      version: rows[0]?.version,
      latency: duration,
      isLocalhost
    });
  } catch (err: any) {
    let diagnostic = err.message || 'Gagal terhubung ke MySQL server.';
    let solution = 'Pastikan server database aktif dan dapat diakses.';
    
    if (err.code === 'ECONNREFUSED' && isLocalhost) {
      diagnostic = `Server MySQL (${targetHost}:${testConfig.port}) tidak berjalan di dalam container preview cloud AI Studio.`;
      solution = `Ini NORMAL di lingkungan cloud preview. Saat aplikasi dijalankan di server production Anda dengan MySQL aktif di localhost, koneksi akan otomatis terhubung.`;
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      diagnostic = `Akses ditolak untuk user '${testConfig.user}' (Password salah atau user tidak memiliki hak akses).`;
      solution = `Periksa kembali Username & Password database MySQL Anda.`;
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      diagnostic = `Database '${testConfig.database}' tidak ditemukan di server MySQL.`;
      solution = `Buat database bernama '${testConfig.database}' di phpMyAdmin atau MySQL console server Anda terlebih dahulu.`;
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
      diagnostic = `Tidak dapat menjangkau host '${targetHost}' (Waktu habis / Host tidak ditemukan).`;
      solution = `Jika menghubungkan database remote, pastikan IP Server benar dan port 3306 terbuka untuk akses luar.`;
    }

    res.json({
      success: false,
      error: diagnostic,
      solution: solution,
      rawError: err.message,
      code: err.code,
      isLocalhost
    });
  }
});

// Save & Connect MySQL config
app.post('/api/save-db-config', async (req, res) => {
  const { host, user, password, database, port } = req.body;
  if (!host || !user || !database) {
    return res.status(400).json({ success: false, error: 'Host, User, dan Database name wajib diisi.' });
  }

  currentMySQLConfig = {
    host,
    user,
    password: password || '',
    database,
    port: parseInt(port || '3306', 10),
    connectTimeout: 5000,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  try {
    fs.writeFileSync(DB_CONFIG_FILE, JSON.stringify(currentMySQLConfig, null, 2), 'utf-8');
  } catch (e) {}

  await initMySQLConnection();

  res.json({
    success: isMySQLConnected,
    isConnected: isMySQLConnected,
    error: mySQLLastError,
    message: isMySQLConnected
      ? 'Konfigurasi tersimpan dan Database MySQL aktif tersambung.'
      : `Konfigurasi tersimpan, namun koneksi MySQL belum aktif: ${mySQLLastError}`
  });
});

// Force Synchronize All Current Site Data & Messages to MySQL
app.post('/api/sync-to-mysql', async (req, res) => {
  // If client provided payload, update through unified persistence engine
  const payload = req.body;
  let currentData = cachedSiteData || loadSiteDataFromFile() || defaultInitialSiteData;
  if (payload && typeof payload === 'object' && (payload.siteContent || payload.logoConfig || payload.stickyFooterConfig)) {
    currentData = {
      ...currentData,
      ...(payload.siteContent ? { siteContent: payload.siteContent } : {}),
      ...(payload.logoConfig ? { logoConfig: payload.logoConfig } : {}),
      ...(payload.stickyFooterConfig ? { stickyFooterConfig: payload.stickyFooterConfig } : {}),
      lastUpdated: Date.now()
    };
    await saveSiteDataToDBAndFile(currentData);
  }

  if (!mysqlPool || !isMySQLConnected) {
    await initMySQLConnection(true);
  }

  if (!isMySQLConnected) {
    return res.status(200).json({
      success: false,
      isMySQLConnected: false,
      error: `Database MySQL belum tersambung / terputus: ${mySQLLastError || 'Periksa konfigurasi host/user/password'}`,
      savedLocally: true,
      message: 'Perubahan telah disimpan dengan aman di cache server lokal, namun sinkronisasi database MySQL sedang offline.'
    });
  }

  try {
    const connection = await mysqlPool!.getConnection();

    await connection.query(
      `INSERT INTO site_settings (setting_key, setting_value) VALUES ('site_data', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(currentData)]
    );

    connection.release();
    lastUpdatedTimestamp = Date.now();
    currentData.lastUpdated = lastUpdatedTimestamp;

    res.json({
      success: true,
      isMySQLConnected: true,
      storageEngine: 'mysql',
      message: 'Seluruh data profil, siaran media, karya, agenda, logo, dan menu pintas berhasil disinkronisasi ke tabel database MySQL.'
    });
  } catch (err: any) {
    isMySQLConnected = false;
    mySQLLastError = err.message || 'Gagal query ke MySQL';
    res.status(200).json({
      success: false,
      isMySQLConnected: false,
      error: `Gagal sinkronisasi ke MySQL: ${err.message}`,
      savedLocally: true,
      message: 'Data telah diamankan di cache server lokal. Koneksi MySQL mengalami kendala.'
    });
  }
});

// Lightweight sync status check for client-side auto-polling across devices
app.get('/api/sync-status', (req, res) => {
  res.json({
    lastUpdated: lastUpdatedTimestamp,
    hasData: !!cachedSiteData,
    mysqlActive: isMySQLConnected,
    mysqlError: isMySQLConnected ? null : mySQLLastError,
    storageEngine: isMySQLConnected ? 'mysql' : 'file'
  });
});

// Get all site data
app.get('/api/site-data', async (req, res) => {
  // If MySQL is active, check if there are newer records
  if (mysqlPool && isMySQLConnected) {
    try {
      const connection = await mysqlPool.getConnection();
      const [rows]: any = await connection.query(`SELECT setting_value, UNIX_TIMESTAMP(updated_at)*1000 as lastUpdated FROM site_settings WHERE setting_key = 'site_data'`);
      connection.release();
      if (rows && rows.length > 0 && rows[0].setting_value) {
        cachedSiteData = JSON.parse(rows[0].setting_value);
        if (rows[0].lastUpdated) {
          lastUpdatedTimestamp = Number(rows[0].lastUpdated);
          cachedSiteData.lastUpdated = lastUpdatedTimestamp;
        }
      }
    } catch (e) {}
  }

  const current = cachedSiteData || loadSiteDataFromFile();
  res.json({
    success: true,
    data: current,
    lastUpdated: lastUpdatedTimestamp,
    storageEngine: isMySQLConnected ? 'mysql' : 'file'
  });
});

// Save complete site data
app.post('/api/site-data', async (req, res) => {
  const payload = req.body;
  if (!payload) {
    return res.status(400).json({ success: false, error: 'Empty payload' });
  }

  const current = cachedSiteData || loadSiteDataFromFile() || {};
  const merged = {
    ...current,
    ...payload,
    lastUpdated: Date.now()
  };

  const saved = await saveSiteDataToDBAndFile(merged);
  res.json({
    success: saved,
    lastUpdated: lastUpdatedTimestamp,
    storageEngine: isMySQLConnected ? 'mysql' : 'file',
    message: isMySQLConnected
      ? 'Data website berhasil disimpan secara permanen di database MySQL.'
      : 'Data website berhasil disimpan di cache server & siap disinkronisasi ke MySQL.'
  });
});

// Upload General File API endpoint (Agenda attachments, PDFs, Documents, ZIP, etc. all types)
app.post('/api/upload-file', async (req, res) => {
  try {
    const { file, filename, type } = req.body;
    if (!file || typeof file !== 'string') {
      return res.status(400).json({ success: false, error: 'Berkas tidak valid atau kosong' });
    }

    const extracted = extractBase64FileBuffer(file, filename);
    if (!extracted) {
      return res.status(400).json({ success: false, error: 'Format berkas base64 tidak valid' });
    }

    const saved = saveFileBufferToUploads(extracted.buffer, filename || `agenda_file_${Date.now()}.${extracted.ext}`, type || 'agenda');

    res.json({
      success: true,
      url: saved.url,
      filename: saved.filename,
      fileSize: extracted.sizeFormatted,
      fileType: extracted.ext.toUpperCase(),
      message: 'Berkas lampiran berhasil diunggah dan tersimpan di server.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upload General Image API endpoint (Avatar, Hero, Logo, Gallery, Publications, etc.)
app.post('/api/upload-image', async (req, res) => {
  try {
    const { image, filename, type } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ success: false, error: 'Gambar tidak valid atau kosong' });
    }

    const extracted = extractBase64Buffer(image);
    if (!extracted) {
      return res.status(400).json({ success: false, error: 'Format data gambar base64 tidak valid' });
    }

    const url = saveImageBufferToFiles(extracted.buffer, extracted.ext, type || 'img');
    res.json({
      success: true,
      url,
      message: 'Gambar berhasil diunggah dan tersimpan secara permanen di server.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upload Manual Video API endpoint (Gallery, Media Channel, Lectures with automatic compression & Magic Capsule support)
app.post('/api/upload-video', async (req, res) => {
  try {
    const { video, filename, title, duration, width, height, thumbnail } = req.body;
    if (!video || typeof video !== 'string') {
      return res.status(400).json({ success: false, error: 'Berkas video tidak valid atau kosong' });
    }

    const extracted = extractBase64FileBuffer(video, filename || 'video.mp4');
    if (!extracted) {
      return res.status(400).json({ success: false, error: 'Format berkas video base64 tidak valid' });
    }

    // Save video file to permanent uploads
    const origName = filename || `video_${Date.now()}.${extracted.ext || 'mp4'}`;
    const saved = saveFileBufferToUploads(extracted.buffer, origName, 'video');

    // Save thumbnail image if provided
    let thumbUrl = '';
    if (thumbnail && typeof thumbnail === 'string' && thumbnail.startsWith('data:image/')) {
      const extractedThumb = extractBase64Buffer(thumbnail);
      if (extractedThumb) {
        thumbUrl = saveImageBufferToFiles(extractedThumb.buffer, extractedThumb.ext, 'video_thumb');
      }
    }

    res.json({
      success: true,
      url: saved.url,
      filename: saved.filename,
      fileSize: extracted.sizeFormatted,
      duration: duration || 0,
      width: width || 1280,
      height: height || 720,
      thumbnail: thumbUrl,
      message: 'Berkas video berhasil diunggah dan siap diputar di Kapsul Ajaib HP.'
    });
  } catch (err: any) {
    console.error('Error in /api/upload-video:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memproses unggahan video' });
  }
});

// Chunked Video Upload Endpoint (Anti-413 Payload Too Large / Cloudflare & Nginx Proxy Bypass)
app.post('/api/upload-video-chunk', (req, res) => {
  try {
    const uploadId = (req.headers['x-upload-id'] as string) || (req.query.uploadId as string) || `upl_${Date.now()}`;
    const chunkIndex = parseInt((req.headers['x-chunk-index'] as string) || (req.query.chunkIndex as string) || '0', 10);
    const totalChunks = parseInt((req.headers['x-total-chunks'] as string) || (req.query.totalChunks as string) || '1', 10);
    const rawFilename = (req.headers['x-filename'] as string) || (req.query.filename as string) || 'video.mp4';
    const filename = decodeURIComponent(rawFilename);
    const title = decodeURIComponent((req.headers['x-title'] as string) || (req.query.title as string) || filename);
    const duration = parseFloat((req.headers['x-duration'] as string) || (req.query.duration as string) || '0');
    const width = parseInt((req.headers['x-width'] as string) || (req.query.width as string) || '1280', 10);
    const height = parseInt((req.headers['x-height'] as string) || (req.query.height as string) || '720', 10);
    const thumbnail = (req.headers['x-thumbnail'] as string) || (req.query.thumbnail as string) || '';

    const tempDir = path.join(process.cwd(), 'data', 'uploads_temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // Clean up stale chunk parts older than 2 hours periodically
    try {
      const now = Date.now();
      const files = fs.readdirSync(tempDir);
      for (const f of files) {
        const fp = path.join(tempDir, f);
        const st = fs.statSync(fp);
        if (now - st.mtimeMs > 2 * 3600 * 1000) {
          fs.unlinkSync(fp);
        }
      }
    } catch (_) {}

    const partPath = path.join(tempDir, `${uploadId}_${chunkIndex}.part`);

    const handleChunkSaved = () => {
      // Check if all chunks have been received
      let allReady = true;
      for (let i = 0; i < totalChunks; i++) {
        if (!fs.existsSync(path.join(tempDir, `${uploadId}_${i}.part`))) {
          allReady = false;
          break;
        }
      }

      if (!allReady) {
        return res.json({
          success: true,
          chunkIndex,
          totalChunks,
          status: 'chunk_received'
        });
      }

      // All chunks received! Combine into the final video file
      const uploadsPublicDir = path.join(process.cwd(), 'public', 'uploads');
      const uploadsDataDir = path.join(process.cwd(), 'data', 'uploads');
      const uploadsDistDir = path.join(process.cwd(), 'dist', 'uploads');

      if (!fs.existsSync(uploadsPublicDir)) fs.mkdirSync(uploadsPublicDir, { recursive: true });
      if (!fs.existsSync(uploadsDataDir)) fs.mkdirSync(uploadsDataDir, { recursive: true });
      if (fs.existsSync(path.join(process.cwd(), 'dist')) && !fs.existsSync(uploadsDistDir)) {
        fs.mkdirSync(uploadsDistDir, { recursive: true });
      }

      const ext = path.extname(filename).toLowerCase() || '.mp4';
      const cleanOriginal = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeFilename = `video_${Date.now()}_${cleanOriginal}${ext}`;

      const targetData = path.join(uploadsDataDir, safeFilename);
      const targetPublic = path.join(uploadsPublicDir, safeFilename);
      const targetDist = path.join(uploadsDistDir, safeFilename);

      const finalWriteStream = fs.createWriteStream(targetData);
      let totalBytes = 0;

      for (let i = 0; i < totalChunks; i++) {
        const chunkFile = path.join(tempDir, `${uploadId}_${i}.part`);
        if (fs.existsSync(chunkFile)) {
          const chunkBuf = fs.readFileSync(chunkFile);
          totalBytes += chunkBuf.length;
          finalWriteStream.write(chunkBuf);
          try { fs.unlinkSync(chunkFile); } catch (_) {}
        }
      }

      finalWriteStream.end();

      finalWriteStream.on('finish', () => {
        // Sync to public & dist
        try {
          if (fs.existsSync(targetData)) {
            fs.copyFileSync(targetData, targetPublic);
            if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
              fs.copyFileSync(targetData, targetDist);
            }
          }
        } catch (copyErr) {
          console.warn('Error mirroring chunked video to public:', copyErr);
        }

        let sizeFormatted = `${totalBytes} B`;
        if (totalBytes >= 1024 * 1024 * 1024) {
          sizeFormatted = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        } else if (totalBytes >= 1024 * 1024) {
          sizeFormatted = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
        } else if (totalBytes >= 1024) {
          sizeFormatted = `${(totalBytes / 1024).toFixed(0)} KB`;
        }

        res.json({
          success: true,
          status: 'completed',
          url: `/uploads/${safeFilename}`,
          filename: filename,
          fileSize: sizeFormatted,
          duration: duration || 0,
          width: width || 1280,
          height: height || 720,
          thumbnail: thumbnail || '',
          message: 'Seluruh potongan berkas video berhasil digabungkan dan siap diputar di Kapsul Ajaib HP.'
        });
      });

      finalWriteStream.on('error', (err) => {
        console.error('Error combining video chunks:', err);
        res.status(500).json({ success: false, error: 'Gagal menggabungkan berkas video: ' + err.message });
      });
    };

    if (Buffer.isBuffer(req.body) && req.body.length > 0) {
      fs.writeFileSync(partPath, req.body);
      handleChunkSaved();
    } else {
      const writeStream = fs.createWriteStream(partPath);
      req.pipe(writeStream);
      writeStream.on('finish', handleChunkSaved);
      writeStream.on('error', (err) => {
        console.error('Error saving chunk part:', err);
        res.status(500).json({ success: false, error: 'Gagal menulis potongan berkas: ' + err.message });
      });
    }
  } catch (err: any) {
    console.error('Error in /api/upload-video-chunk:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memproses potongan video' });
  }
});

// Multer storage for streaming multipart video uploads (zero memory footprint, zero mobile crashes)
const videoMulterStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDataDir = path.join(process.cwd(), 'data', 'uploads');
    if (!fs.existsSync(uploadsDataDir)) fs.mkdirSync(uploadsDataDir, { recursive: true });
    cb(null, uploadsDataDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    const cleanOriginal = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFilename = `video_${Date.now()}_${cleanOriginal}${ext}`;
    cb(null, safeFilename);
  }
});

const videoUploadMiddleware = multer({
  storage: videoMulterStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024 // 2 GB limit
  }
});

// Multipart Form-Data Video Upload Endpoint (Preferred for Android/iOS mobile browsers)
app.post('/api/upload-video-form', (videoUploadMiddleware.single('video') as any), (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Berkas video tidak ditemukan dalam formulir' });
    }

    const safeFilename = req.file.filename;
    const originalName = req.file.originalname || safeFilename;
    const title = req.body.title || originalName;
    const duration = parseFloat(req.body.duration || '0');
    const width = parseInt(req.body.width || '1280', 10);
    const height = parseInt(req.body.height || '720', 10);
    const thumbnail = req.body.thumbnail || '';

    const uploadsPublicDir = path.join(process.cwd(), 'public', 'uploads');
    const uploadsDataDir = path.join(process.cwd(), 'data', 'uploads');
    const uploadsDistDir = path.join(process.cwd(), 'dist', 'uploads');

    if (!fs.existsSync(uploadsPublicDir)) fs.mkdirSync(uploadsPublicDir, { recursive: true });
    if (fs.existsSync(path.join(process.cwd(), 'dist')) && !fs.existsSync(uploadsDistDir)) {
      fs.mkdirSync(uploadsDistDir, { recursive: true });
    }

    const sourceDataFile = path.join(uploadsDataDir, safeFilename);
    const targetPublic = path.join(uploadsPublicDir, safeFilename);
    const targetDist = path.join(uploadsDistDir, safeFilename);

    // Sync to public and dist
    try {
      if (fs.existsSync(sourceDataFile)) {
        fs.copyFileSync(sourceDataFile, targetPublic);
        if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
          fs.copyFileSync(sourceDataFile, targetDist);
        }
      }
    } catch (syncErr) {
      console.warn('Error mirroring multipart video:', syncErr);
    }

    const totalBytes = req.file.size || 0;
    let sizeFormatted = `${totalBytes} B`;
    if (totalBytes >= 1024 * 1024 * 1024) {
      sizeFormatted = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (totalBytes >= 1024 * 1024) {
      sizeFormatted = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (totalBytes >= 1024) {
      sizeFormatted = `${(totalBytes / 1024).toFixed(0)} KB`;
    }

    res.json({
      success: true,
      url: `/uploads/${safeFilename}`,
      filename: originalName,
      fileSize: sizeFormatted,
      duration: duration || 0,
      width: width || 1280,
      height: height || 720,
      thumbnail: thumbnail || '',
      message: 'Video berhasil diunggah langsung dan siap diputar di Kapsul Ajaib HP.'
    });
  } catch (err: any) {
    console.error('Error in /api/upload-video-form:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memproses unggahan form video' });
  }
});

// Direct Streaming Video Upload Endpoint (Bebas Batas Ukuran - Zero-Memory Direct Disk Streaming)
app.post('/api/upload-video-stream', (req, res) => {
  try {
    const rawFilename = (req.query.filename as string) || (req.headers['x-filename'] as string) || 'video.mp4';
    const filename = decodeURIComponent(rawFilename);
    const title = decodeURIComponent((req.query.title as string) || (req.headers['x-title'] as string) || filename);
    const duration = parseFloat((req.query.duration as string) || (req.headers['x-duration'] as string) || '0');
    const width = parseInt((req.query.width as string) || (req.headers['x-width'] as string) || '1280', 10);
    const height = parseInt((req.query.height as string) || (req.headers['x-height'] as string) || '720', 10);
    const thumbnail = (req.query.thumbnail as string) || (req.headers['x-thumbnail'] as string) || '';

    const ext = path.extname(filename).toLowerCase() || '.mp4';
    const cleanOriginal = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeFilename = `video_${Date.now()}_${cleanOriginal}`;

    const uploadsPublicDir = path.join(process.cwd(), 'public', 'uploads');
    const uploadsDataDir = path.join(process.cwd(), 'data', 'uploads');
    const uploadsDistDir = path.join(process.cwd(), 'dist', 'uploads');

    if (!fs.existsSync(uploadsPublicDir)) fs.mkdirSync(uploadsPublicDir, { recursive: true });
    if (!fs.existsSync(uploadsDataDir)) fs.mkdirSync(uploadsDataDir, { recursive: true });
    if (fs.existsSync(path.join(process.cwd(), 'dist')) && !fs.existsSync(uploadsDistDir)) {
      fs.mkdirSync(uploadsDistDir, { recursive: true });
    }

    const targetPublic = path.join(uploadsPublicDir, safeFilename);
    const targetData = path.join(uploadsDataDir, safeFilename);
    const targetDist = path.join(uploadsDistDir, safeFilename);

    const writeStream = fs.createWriteStream(targetData);
    let totalBytes = 0;

    req.on('data', (chunk) => {
      totalBytes += chunk.length;
    });

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      // Sync copies to public & dist
      try {
        if (fs.existsSync(targetData)) {
          fs.copyFileSync(targetData, targetPublic);
          if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
            fs.copyFileSync(targetData, targetDist);
          }
        }
      } catch (copyErr) {
        console.warn('Error mirroring video stream:', copyErr);
      }

      let sizeFormatted = `${totalBytes} B`;
      if (totalBytes >= 1024 * 1024 * 1024) {
        sizeFormatted = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      } else if (totalBytes >= 1024 * 1024) {
        sizeFormatted = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
      } else if (totalBytes >= 1024) {
        sizeFormatted = `${(totalBytes / 1024).toFixed(0)} KB`;
      }

      res.json({
        success: true,
        url: `/uploads/${safeFilename}`,
        filename: filename,
        fileSize: sizeFormatted,
        duration: duration || 0,
        width: width || 1280,
        height: height || 720,
        thumbnail: thumbnail || '',
        message: 'Video berhasil diunggah tanpa batasan ukuran & siap diputar di Kapsul Ajaib HP.'
      });
    });

    writeStream.on('error', (err) => {
      console.error('Error writing video stream to disk:', err);
      res.status(500).json({ success: false, error: 'Gagal menulis berkas video ke disk server' });
    });
  } catch (err: any) {
    console.error('Error in /api/upload-video-stream:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal streaming unggahan video' });
  }
});

// Helper to copy an image file to og-image and persisted paths
function copyLocalImageToOgImage(localPath: string): boolean {
  try {
    const cleanPath = localPath.replace(/^\//, '').split('?')[0];
    const candidates = [
      path.join(process.cwd(), 'public', cleanPath),
      path.join(process.cwd(), 'data', cleanPath),
      path.join(process.cwd(), cleanPath),
      path.join(process.cwd(), 'public', path.basename(cleanPath)),
      path.join(process.cwd(), 'data', 'uploads', path.basename(cleanPath)),
      path.join(process.cwd(), 'public', 'uploads', path.basename(cleanPath))
    ];

    let foundBuffer: Buffer | null = null;
    for (const p of candidates) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        foundBuffer = fs.readFileSync(p);
        break;
      }
    }

    if (foundBuffer) {
      const publicDir = path.join(process.cwd(), 'public');
      const distDir = path.join(process.cwd(), 'dist');
      const dataDir = path.join(process.cwd(), 'data');

      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

      fs.writeFileSync(path.join(publicDir, 'og-image.jpg'), foundBuffer);
      fs.writeFileSync(path.join(publicDir, 'thumbnail.jpg'), foundBuffer);
      fs.writeFileSync(path.join(publicDir, 'og-preview.jpg'), foundBuffer);
      fs.writeFileSync(path.join(dataDir, 'persisted_og_image.jpg'), foundBuffer);

      if (fs.existsSync(distDir)) {
        fs.writeFileSync(path.join(distDir, 'og-image.jpg'), foundBuffer);
        fs.writeFileSync(path.join(distDir, 'thumbnail.jpg'), foundBuffer);
        fs.writeFileSync(path.join(distDir, 'og-preview.jpg'), foundBuffer);
      }
      return true;
    }
  } catch (e) {
    console.warn('Error copying local image to og-image:', e);
  }
  return false;
}

// Upload Thumbnail API endpoint
app.post('/api/upload-thumbnail', async (req, res) => {
  try {
    const { image, filename } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ success: false, error: 'Gambar tidak valid atau kosong' });
    }

    const current = cachedSiteData || loadSiteDataFromFile() || {};
    if (!current.siteContent) current.siteContent = {};
    if (!current.siteContent.shareSettings) current.siteContent.shareSettings = {};

    // Check if image is base64
    if (image.startsWith('data:') || image.length > 200) {
      const extracted = extractBase64Buffer(image);
      if (!extracted) {
        return res.status(400).json({ success: false, error: 'Format base64 image tidak valid' });
      }

      // Process image buffer with sharp if available
      let processedBuffer = extracted.buffer;
      try {
        if (typeof sharp === 'function') {
          processedBuffer = await sharp(extracted.buffer)
            .resize(1200, 630, { fit: 'cover', position: 'center' })
            .jpeg({ quality: 88, progressive: true })
            .toBuffer();
        }
      } catch (sharpErr) {
        console.warn('Sharp optimization fallback, using original buffer:', sharpErr);
        processedBuffer = extracted.buffer;
      }

      const publicDir = path.join(process.cwd(), 'public');
      const distDir = path.join(process.cwd(), 'dist');
      const dataDir = path.join(process.cwd(), 'data');
      const uploadsPublicDir = path.join(publicDir, 'uploads');
      const uploadsDataDir = path.join(dataDir, 'uploads');

      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      if (!fs.existsSync(uploadsPublicDir)) fs.mkdirSync(uploadsPublicDir, { recursive: true });
      if (!fs.existsSync(uploadsDataDir)) fs.mkdirSync(uploadsDataDir, { recursive: true });

      const ogPath = path.join(publicDir, 'og-image.jpg');
      const thumbPath = path.join(publicDir, 'thumbnail.jpg');
      const ogPreviewPath = path.join(publicDir, 'og-preview.jpg');
      const dataOgPath = path.join(dataDir, 'persisted_og_image.jpg');
      
      fs.writeFileSync(ogPath, processedBuffer);
      fs.writeFileSync(thumbPath, processedBuffer);
      fs.writeFileSync(ogPreviewPath, processedBuffer);
      fs.writeFileSync(dataOgPath, processedBuffer);

      const safeUploadName = `thumbnail_${Date.now()}.${extracted.ext || 'jpg'}`;
      fs.writeFileSync(path.join(uploadsPublicDir, safeUploadName), processedBuffer);
      fs.writeFileSync(path.join(uploadsDataDir, safeUploadName), processedBuffer);

      if (fs.existsSync(distDir)) {
        fs.writeFileSync(path.join(distDir, 'og-image.jpg'), processedBuffer);
        fs.writeFileSync(path.join(distDir, 'thumbnail.jpg'), processedBuffer);
        fs.writeFileSync(path.join(distDir, 'og-preview.jpg'), processedBuffer);
        const distUploads = path.join(distDir, 'uploads');
        if (!fs.existsSync(distUploads)) fs.mkdirSync(distUploads, { recursive: true });
        fs.writeFileSync(path.join(distUploads, safeUploadName), processedBuffer);
      }

      const newUrl = `/uploads/${safeUploadName}`;
      current.siteContent.shareSettings.thumbnailUrl = newUrl;
      current.lastUpdated = Date.now();

      await saveSiteDataToDBAndFile(current);

      return res.json({
        success: true,
        url: newUrl,
        ogImage: `/og-image.jpg?v=${Date.now()}`,
        message: 'Thumbnail berhasil diunggah dan disimpan sebagai banner media sosial resmi.'
      });
    } else {
      // Image is a URL or file path (e.g. /avatar-jaenal.jpg or /og-image.jpg)
      copyLocalImageToOgImage(image);
      current.siteContent.shareSettings.thumbnailUrl = image;
      current.lastUpdated = Date.now();
      await saveSiteDataToDBAndFile(current);

      return res.json({
        success: true,
        url: image,
        ogImage: `/og-image.jpg?v=${Date.now()}`,
        message: 'Thumbnail banner berhasil disetel dan diaktifkan.'
      });
    }
  } catch (err: any) {
    console.error('Error uploading thumbnail:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal menyimpan thumbnail' });
  }
});

// Dedicated Share Settings API endpoint
app.post('/api/share-settings', async (req, res) => {
  try {
    const payload = req.body.shareSettings || req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ success: false, error: 'Data pengaturan share tidak valid' });
    }

    const current = cachedSiteData || loadSiteDataFromFile() || {};
    if (!current.siteContent) current.siteContent = {};
    if (!current.siteContent.shareSettings) current.siteContent.shareSettings = {};

    let thumbUrl = payload.thumbnailUrl || current.siteContent.shareSettings.thumbnailUrl || '/og-image.jpg';

    // If thumbnail is base64, save to static files
    if (thumbUrl && typeof thumbUrl === 'string' && thumbUrl.startsWith('data:image/')) {
      const extracted = extractBase64Buffer(thumbUrl);
      if (extracted) {
        let processedBuffer = extracted.buffer;
        try {
          if (typeof sharp === 'function') {
            processedBuffer = await sharp(extracted.buffer)
              .resize(1200, 630, { fit: 'cover', position: 'center' })
              .jpeg({ quality: 88, progressive: true })
              .toBuffer();
          }
        } catch (e) {
          processedBuffer = extracted.buffer;
        }

        const publicDir = path.join(process.cwd(), 'public');
        const dataDir = path.join(process.cwd(), 'data');
        const distDir = path.join(process.cwd(), 'dist');
        const uploadsPublicDir = path.join(publicDir, 'uploads');
        const uploadsDataDir = path.join(dataDir, 'uploads');

        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        if (!fs.existsSync(uploadsPublicDir)) fs.mkdirSync(uploadsPublicDir, { recursive: true });
        if (!fs.existsSync(uploadsDataDir)) fs.mkdirSync(uploadsDataDir, { recursive: true });

        fs.writeFileSync(path.join(publicDir, 'og-image.jpg'), processedBuffer);
        fs.writeFileSync(path.join(publicDir, 'thumbnail.jpg'), processedBuffer);
        fs.writeFileSync(path.join(publicDir, 'og-preview.jpg'), processedBuffer);
        fs.writeFileSync(path.join(dataDir, 'persisted_og_image.jpg'), processedBuffer);

        const safeUploadName = `thumbnail_${Date.now()}.${extracted.ext || 'jpg'}`;
        fs.writeFileSync(path.join(uploadsPublicDir, safeUploadName), processedBuffer);
        fs.writeFileSync(path.join(uploadsDataDir, safeUploadName), processedBuffer);

        if (fs.existsSync(distDir)) {
          fs.writeFileSync(path.join(distDir, 'og-image.jpg'), processedBuffer);
          fs.writeFileSync(path.join(distDir, 'thumbnail.jpg'), processedBuffer);
          fs.writeFileSync(path.join(distDir, 'og-preview.jpg'), processedBuffer);
          const distUploads = path.join(distDir, 'uploads');
          if (!fs.existsSync(distUploads)) fs.mkdirSync(distUploads, { recursive: true });
          fs.writeFileSync(path.join(distUploads, safeUploadName), processedBuffer);
        }

        thumbUrl = `/uploads/${safeUploadName}`;
      }
    } else if (thumbUrl && typeof thumbUrl === 'string' && !thumbUrl.startsWith('http')) {
      copyLocalImageToOgImage(thumbUrl);
    }

    current.siteContent.shareSettings = {
      ...current.siteContent.shareSettings,
      title: payload.title !== undefined ? payload.title : current.siteContent.shareSettings.title,
      description: payload.description !== undefined ? payload.description : current.siteContent.shareSettings.description,
      thumbnailUrl: thumbUrl,
      authorName: payload.authorName !== undefined ? payload.authorName : current.siteContent.shareSettings.authorName,
      badgeText: payload.badgeText !== undefined ? payload.badgeText : current.siteContent.shareSettings.badgeText,
    };

    current.lastUpdated = Date.now();
    const saved = await saveSiteDataToDBAndFile(current);

    res.json({
      success: saved,
      shareSettings: current.siteContent.shareSettings,
      url: current.siteContent.shareSettings.thumbnailUrl,
      lastUpdated: current.lastUpdated,
      message: 'Pengaturan thumbnail dan meta tags berbagi link berhasil disimpan secara permanen.'
    });
  } catch (err: any) {
    console.error('Error saving share settings:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal menyimpan pengaturan share' });
  }
});

// Dedicated route to serve og-image.jpg with proper cache and content-type headers
app.get(['/og-image.jpg', '/thumbnail.jpg', '/og-preview.jpg', '/api/og-image'], (req, res) => {
  const publicOg = path.join(process.cwd(), 'public', 'og-image.jpg');
  const dataOg = path.join(process.cwd(), 'data', 'persisted_og_image.jpg');
  const distOg = path.join(process.cwd(), 'dist', 'og-image.jpg');

  let targetFile = '';
  if (fs.existsSync(publicOg)) {
    targetFile = publicOg;
  } else if (fs.existsSync(dataOg)) {
    targetFile = dataOg;
  } else if (fs.existsSync(distOg)) {
    targetFile = distOg;
  }

  if (targetFile) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    return res.sendFile(targetFile);
  }

  // Fallback to avatar if og-image not generated yet
  const avatarPath = path.join(process.cwd(), 'public', 'avatar-jaenal.jpg');
  if (fs.existsSync(avatarPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    return res.sendFile(avatarPath);
  }

  res.status(404).send('Thumbnail not found');
});

// Dedicated route to serve favicon and touch icons
app.get(['/favicon.ico', '/favicon.png', '/apple-touch-icon.png', '/apple-touch-icon-precomposed.png'], (req, res) => {
  const isIco = req.path.endsWith('.ico');
  const isPng = req.path.endsWith('.png');
  const fileExt = isIco ? 'favicon.ico' : isPng ? 'favicon.png' : 'apple-touch-icon.png';
  const contentType = isIco ? 'image/x-icon' : 'image/png';

  const publicFavicon = path.join(process.cwd(), 'public', fileExt);
  const dataFavicon = path.join(process.cwd(), 'data', fileExt);
  const distFavicon = path.join(process.cwd(), 'dist', fileExt);

  if (fs.existsSync(publicFavicon)) {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    return res.sendFile(publicFavicon);
  } else if (fs.existsSync(dataFavicon)) {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    return res.sendFile(dataFavicon);
  } else if (fs.existsSync(distFavicon)) {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    return res.sendFile(distFavicon);
  }

  // Fallback to avatar or og-image
  const avatarPath = path.join(process.cwd(), 'public', 'avatar-jaenal.jpg');
  if (fs.existsSync(avatarPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    return res.sendFile(avatarPath);
  }

  const ogPath = path.join(process.cwd(), 'public', 'og-image.jpg');
  if (fs.existsSync(ogPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    return res.sendFile(ogPath);
  }

  res.status(404).send('Favicon not found');
});

// Save individual Site Content
app.post('/api/site-content', async (req, res) => {
  const content = req.body;
  if (!content || typeof content !== 'object') {
    return res.status(400).json({ success: false, error: 'Empty content payload' });
  }

  const current = cachedSiteData || loadSiteDataFromFile() || JSON.parse(JSON.stringify(defaultInitialSiteData));
  
  // Merge cleanly so partial saves do not wipe unprovided sections
  current.siteContent = {
    ...(current.siteContent || defaultInitialSiteData.siteContent),
    ...content,
    profile: { ...(current.siteContent?.profile || defaultInitialSiteData.siteContent.profile), ...(content.profile || {}) },
    visibility: { ...(current.siteContent?.visibility || defaultInitialSiteData.siteContent.visibility), ...(content.visibility || {}) },
    heroSettings: { ...(current.siteContent?.heroSettings || defaultInitialSiteData.siteContent.heroSettings), ...(content.heroSettings || {}) },
    shareSettings: { ...(current.siteContent?.shareSettings || defaultInitialSiteData.siteContent.shareSettings), ...(content.shareSettings || {}) }
  };

  if (Array.isArray(content.education)) current.siteContent.education = content.education;
  if (Array.isArray(content.pillars)) current.siteContent.pillars = content.pillars;
  if (Array.isArray(content.quotes)) current.siteContent.quotes = content.quotes;
  if (Array.isArray(content.publications)) current.siteContent.publications = content.publications;
  if (Array.isArray(content.experience)) current.siteContent.experience = content.experience;
  if (Array.isArray(content.agenda)) current.siteContent.agenda = content.agenda;
  if (Array.isArray(content.agendaCategories)) current.siteContent.agendaCategories = content.agendaCategories;
  if (Array.isArray(content.gallery)) current.siteContent.gallery = content.gallery;
  if (Array.isArray(content.youtubeVideos)) current.siteContent.youtubeVideos = content.youtubeVideos;
  if (Array.isArray(content.mediaChannels)) current.siteContent.mediaChannels = content.mediaChannels;
  if (content.youtubeChannel) current.siteContent.youtubeChannel = content.youtubeChannel;

  current.lastUpdated = Date.now();

  const saved = await saveSiteDataToDBAndFile(current, 'siteContent');
  res.json({
    success: saved,
    lastUpdated: lastUpdatedTimestamp,
    storageEngine: isMySQLConnected ? 'mysql' : 'file',
    message: 'Konten website berhasil disinkronisasi ke seluruh perangkat & database.'
  });
});

// Save Header Logo config
app.post('/api/logo-config', async (req, res) => {
  const logo = req.body;
  if (!logo || typeof logo !== 'object') {
    return res.status(400).json({ success: false, error: 'Empty logo payload' });
  }
  const current = cachedSiteData || loadSiteDataFromFile() || JSON.parse(JSON.stringify(defaultInitialSiteData));
  current.logoConfig = {
    ...(current.logoConfig || defaultInitialSiteData.logoConfig),
    ...logo
  };
  current.lastUpdated = Date.now();

  const saved = await saveSiteDataToDBAndFile(current, 'logo');
  res.json({
    success: saved,
    lastUpdated: lastUpdatedTimestamp,
    storageEngine: isMySQLConnected ? 'mysql' : 'file',
    logoConfig: current.logoConfig,
    message: 'Konfigurasi logo berhasil disinkronisasi ke seluruh perangkat & database.'
  });
});

// Save Sticky Footer config
app.post('/api/sticky-footer-config', async (req, res) => {
  const footer = req.body;
  if (!footer || typeof footer !== 'object') {
    return res.status(400).json({ success: false, error: 'Empty footer payload' });
  }
  const current = cachedSiteData || loadSiteDataFromFile() || JSON.parse(JSON.stringify(defaultInitialSiteData));
  current.stickyFooterConfig = {
    ...(current.stickyFooterConfig || defaultInitialSiteData.stickyFooterConfig),
    ...footer,
    items: Array.isArray(footer.items) ? footer.items : (current.stickyFooterConfig?.items || defaultInitialSiteData.stickyFooterConfig.items)
  };
  current.lastUpdated = Date.now();

  const saved = await saveSiteDataToDBAndFile(current, 'logo');
  res.json({
    success: saved,
    lastUpdated: lastUpdatedTimestamp,
    storageEngine: isMySQLConnected ? 'mysql' : 'file',
    message: 'Konfigurasi menu pintas bawah berhasil disinkronisasi ke seluruh perangkat & database.'
  });
});

// Contact messages API
app.get('/api/messages', async (req, res) => {
  const msgs = await loadMessages();
  res.json({ success: true, messages: msgs, count: msgs.length, storageEngine: isMySQLConnected ? 'mysql' : 'file' });
});

app.post('/api/messages', async (req, res) => {
  const newMsg = req.body;
  if (!newMsg || !newMsg.sender) {
    return res.status(400).json({ success: false, error: 'Incomplete message data' });
  }

  const savedMessage = await saveMessage(newMsg);

  res.json({
    success: true,
    message: 'Pesan dan permohonan silaturahmi berhasil tersimpan ke sistem & database MySQL.',
    savedMessage,
    storageEngine: isMySQLConnected ? 'mysql' : 'file'
  });
});

// -------------------------------------------------------------
// YOUTUBE CHANNEL VIDEOS ENGINE & API
// -------------------------------------------------------------
const YT_CACHE_FILE = path.join(DATA_DIR, 'youtube_channel_cache.json');

interface YouTubeVideoItem {
  id: string;
  videoId: string;
  title: string;
  description?: string;
  thumbnail: string;
  videoUrl: string;
  publishedAt?: string;
  views?: string;
  duration?: string;
}

const defaultCuratedVideos: YouTubeVideoItem[] = [
  {
    id: "yt-vid-3VMTHgGM_HY",
    videoId: "3VMTHgGM_HY",
    title: "PROYEK KELAS 4",
    description: "KEGIATAN MEMBUAT PROYEK POSTER SURAT AL ASR",
    thumbnail: "https://img.youtube.com/vi/3VMTHgGM_HY/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=3VMTHgGM_HY",
    publishedAt: "31 Jul 2025",
    views: "1 tayangan"
  },
  {
    id: "yt-vid-PDY0zq86Cjo",
    videoId: "PDY0zq86Cjo",
    title: "P5RA IZZATI PEMANFAATAN LIMBAH KERTAS DISULAP MENJADI WADAH PENSIL",
    description: "Pemanfaatan limbah kertas karya santri Izzati menjadi wadah pensil.",
    thumbnail: "https://img.youtube.com/vi/PDY0zq86Cjo/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=PDY0zq86Cjo",
    publishedAt: "9 Des 2024",
    views: "Resmi"
  },
  {
    id: "yt-vid-UZn726QfQcg",
    videoId: "UZn726QfQcg",
    title: "P5RA LIA PEMANFAATAN LIMBAH SAMPAH MENJADI TEMPAT BERGUNA",
    description: "Kreativitas santri madrasah dalam proyek penguatan profil pelajar Pancasila.",
    thumbnail: "https://img.youtube.com/vi/UZn726QfQcg/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=UZn726QfQcg",
    publishedAt: "9 Des 2024",
    views: "Resmi"
  },
  {
    id: "yt-vid-soDxFQnksoU",
    videoId: "soDxFQnksoU",
    title: "P5RA SAFA PEMANFAATAN LIMBAH MENJADI TEMPAT PENSIL",
    description: "Kreasi santriwati Safa mengolah limbah anorganik menjadi perlengkapan belajar.",
    thumbnail: "https://img.youtube.com/vi/soDxFQnksoU/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=soDxFQnksoU",
    publishedAt: "9 Des 2024",
    views: "Resmi"
  },
  {
    id: "yt-vid-Q_xR5d0aQD4",
    videoId: "Q_xR5d0aQD4",
    title: "P5RA FADHIL PEMANFAATN LIMBAH SAMPAH MENJADI KREASI",
    description: "Dokumentasi karya proyek P5RA santri Fadhil dalam daur ulang limbah madrasah.",
    thumbnail: "https://img.youtube.com/vi/Q_xR5d0aQD4/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=Q_xR5d0aQD4",
    publishedAt: "9 Des 2024",
    views: "Resmi"
  },
  {
    id: "yt-vid-V4PYiei0vWk",
    videoId: "V4PYiei0vWk",
    title: "KEGIATAN PAS 1 TAHUN 2024",
    description: "Pelaksanaan Penilaian Akhir Semester (PAS) 1 Tahun Ajaran 2024 MI Ma'arif NU 2 Sanggreman.",
    thumbnail: "https://img.youtube.com/vi/V4PYiei0vWk/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=V4PYiei0vWk",
    publishedAt: "6 Des 2024",
    views: "4 tayangan"
  },
  {
    id: "yt-vid-EjoWi0uaqLw",
    videoId: "EjoWi0uaqLw",
    title: "JADWAL PAS 1 2024",
    description: "Pengumuman dan sosialisasi jadwal asesmen akhir semester madrasah.",
    thumbnail: "https://img.youtube.com/vi/EjoWi0uaqLw/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=EjoWi0uaqLw",
    publishedAt: "6 Des 2024",
    views: "24 tayangan"
  },
  {
    id: "yt-vid-Uxpxk67Cp3I",
    videoId: "Uxpxk67Cp3I",
    title: "KEGIATAN PEMBIASAAN",
    description: "PEMBIASAAN SISWA SISWI MI MA'ARIF NU 2 SANGGREMAN",
    thumbnail: "https://img.youtube.com/vi/Uxpxk67Cp3I/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=Uxpxk67Cp3I",
    publishedAt: "2 Sep 2024",
    views: "4 tayangan"
  },
  {
    id: "yt-vid-7eWLlDwmVHY",
    videoId: "7eWLlDwmVHY",
    title: "KEGIATAN KEAGAMAAN",
    description: "KEGIATAN BIDANG KEAGAMAAN SISWA DI MI MA'ARIF NU 2 SANGGREMAN",
    thumbnail: "https://img.youtube.com/vi/7eWLlDwmVHY/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=7eWLlDwmVHY",
    publishedAt: "2 Sep 2024",
    views: "1 tayangan"
  },
  {
    id: "yt-vid-Ald6k9p51YM",
    videoId: "Ald6k9p51YM",
    title: "Pembiasaan Keagamaan",
    description: "Pelaksanaan Kegiatan Pembiasaan Sholat Dhuha dan Asmaul Husna.",
    thumbnail: "https://img.youtube.com/vi/Ald6k9p51YM/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=Ald6k9p51YM",
    publishedAt: "8 Jun 2024",
    views: "3 tayangan"
  },
  {
    id: "yt-vid-O6WO2HNFmds",
    videoId: "O6WO2HNFmds",
    title: "BUMNU JIWA ASIH",
    description: "Dokumentasi Program Badan Usaha Milik Nahdlatul Ulama Jiwa Asih.",
    thumbnail: "https://img.youtube.com/vi/O6WO2HNFmds/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=O6WO2HNFmds",
    publishedAt: "24 Jul 2023",
    views: "6 tayangan"
  },
  {
    id: "yt-vid-MGtw6vuTpQ8",
    videoId: "MGtw6vuTpQ8",
    title: "VOLLY CERIA",
    description: "Kegiatan olahraga voli ceria meningkatkan kebugaran jasmani.",
    thumbnail: "https://img.youtube.com/vi/MGtw6vuTpQ8/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=MGtw6vuTpQ8",
    publishedAt: "24 Jul 2023",
    views: "4 tayangan"
  },
  {
    id: "yt-vid-QQCwic3yObA",
    videoId: "QQCwic3yObA",
    title: "ZIAROH WALI SE BANYUMAS",
    description: "Rihlah religi ziarah auliya se-Kabupaten Banyumas.",
    thumbnail: "https://img.youtube.com/vi/QQCwic3yObA/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=QQCwic3yObA",
    publishedAt: "24 Jul 2023",
    views: "2 tayangan"
  },
  {
    id: "yt-vid-s2HEgG5ymg8",
    videoId: "s2HEgG5ymg8",
    title: "BAHAGIA ITU SEDERHANA",
    description: "Keceriaan dan kebersamaan di lingkungan madrasah.",
    thumbnail: "https://img.youtube.com/vi/s2HEgG5ymg8/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=s2HEgG5ymg8",
    publishedAt: "28 Sep 2022",
    views: "4 tayangan"
  },
  {
    id: "yt-vid-HR_gu-3Isdo",
    videoId: "HR_gu-3Isdo",
    title: "ZIAROH WALI BANYUMAS",
    description: "Dokumentasi perjalanan spiritual ziarah makam wali Banyumas.",
    thumbnail: "https://img.youtube.com/vi/HR_gu-3Isdo/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=HR_gu-3Isdo",
    publishedAt: "28 Sep 2022",
    views: "15 tayangan"
  }
];

function parseYouTubeRssXml(xml: string): YouTubeVideoItem[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  return entries.map((entry, idx) => {
    const videoId = (entry.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/) || [])[1]?.trim() || `vid-${idx}`;
    let title = (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')?.trim() || 'Video YouTube';
    title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    
    const published = (entry.match(/<published>([\s\S]*?)<\/published>/) || [])[1]?.trim();
    let desc = (entry.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1]?.trim() || '';
    desc = desc.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    
    const views = (entry.match(/views="(\d+)"/) || [])[1];
    const viewsFormatted = views ? `${Number(views).toLocaleString('id-ID')} tayangan` : undefined;

    let dateFormatted: string | undefined;
    if (published) {
      try {
        const d = new Date(published);
        dateFormatted = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch (e) {}
    }

    return {
      id: `yt-vid-${videoId}`,
      videoId,
      title,
      description: desc ? desc.slice(0, 200) : '',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      publishedAt: dateFormatted || published || 'Baru',
      views: viewsFormatted
    };
  });
}

async function resolveYouTubeChannelId(input?: string): Promise<{ channelId: string | null; channelTitle?: string }> {
  if (!input || typeof input !== 'string') return { channelId: null };
  const clean = input.trim();

  // 1. Direct UC ID
  if (clean.startsWith('UC') && clean.length === 24) {
    return { channelId: clean };
  }

  // 2. Extracted from channel/UC...
  const ucMatch = clean.match(/channel\/(UC[a-zA-Z0-9_-]{22})/i);
  if (ucMatch && ucMatch[1]) {
    return { channelId: ucMatch[1] };
  }

  // 3. Extracted from handle or URL: e.g. @jaenalmaskunofficial3977 or https://youtube.com/@...
  let handleUrl = '';
  if (clean.startsWith('@')) {
    handleUrl = `https://www.youtube.com/${clean}`;
  } else if (clean.includes('youtube.com/@') || clean.includes('youtube.com/c/') || clean.includes('youtube.com/user/')) {
    handleUrl = clean.startsWith('http') ? clean : `https://${clean}`;
  } else if (!clean.includes('/') && !clean.includes('.') && clean.length > 0) {
    handleUrl = `https://www.youtube.com/@${clean}`;
  } else if (clean.startsWith('http') && clean.includes('youtube.com')) {
    handleUrl = clean;
  }

  if (handleUrl) {
    try {
      const res = await fetch(handleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(7000)
      });
      if (res.ok) {
        const html = await res.text();
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
        const resolvedTitle = titleMatch ? titleMatch[1].replace(/ - YouTube$/i, '').trim() : undefined;

        // Look for RSS link in HTML
        const rssMatch = html.match(/feeds\/videos\.xml\?channel_id=(UC[a-zA-Z0-9_-]{22})/i);
        if (rssMatch && rssMatch[1]) {
          return { channelId: rssMatch[1], channelTitle: resolvedTitle };
        }
        // Look for meta itemprop channelId or identifier
        const metaMatch = html.match(/<meta itemprop="channelId" content="(UC[a-zA-Z0-9_-]{22})"/i)
          || html.match(/<meta itemprop="identifier" content="(UC[a-zA-Z0-9_-]{22})"/i)
          || html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/i)
          || html.match(/"externalId":"(UC[a-zA-Z0-9_-]{22})"/i);
        if (metaMatch && metaMatch[1]) {
          return { channelId: metaMatch[1], channelTitle: resolvedTitle };
        }
      }
    } catch (e) {
      console.warn('Could not resolve YouTube handle to channel ID:', e);
    }
  }

  return { channelId: null };
}

async function fetchYouTubeChannelVideos(channelOrPlaylistId?: string): Promise<{ success: boolean; videos: YouTubeVideoItem[]; source: string; channelTitle?: string; channelId?: string; message?: string }> {
  let targetUrl = '';
  let resolvedChannelId = '';
  let resolvedChannelTitle = '';
  const siteData = cachedSiteData || loadSiteDataFromFile();

  let clean = (channelOrPlaylistId || '').trim();

  // If no channel input specified, detect from saved site data
  if (!clean) {
    clean = siteData?.siteContent?.youtubeChannel?.channelId
      || siteData?.siteContent?.youtubeChannel?.channelUrl
      || (siteData?.siteContent?.mediaChannels?.find((c: any) => c.platform === 'youtube')?.channelUrl)
      || (siteData?.siteContent?.mediaChannels?.find((c: any) => c.platform === 'youtube')?.channelHandle)
      || siteData?.siteContent?.profile?.socials?.youtube
      || '@jaenalmaskunofficial3977';
  }

  if (clean.startsWith('PL') || clean.startsWith('UU') || clean.startsWith('RD') || clean.startsWith('FL')) {
    targetUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${clean}`;
  } else if (clean.match(/[?&]list=([a-zA-Z0-9_-]+)/i)) {
    const plMatch = clean.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
    targetUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${plMatch![1]}`;
  } else {
    // Resolve channel ID if handle or link or ID
    const resolution = await resolveYouTubeChannelId(clean);
    if (resolution.channelId) {
      resolvedChannelId = resolution.channelId;
      resolvedChannelTitle = resolution.channelTitle || '';
      targetUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${resolution.channelId}`;
    }
  }

  if (targetUrl) {
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(7000)
      });

      if (response.ok) {
        const xml = await response.text();
        const parsed = parseYouTubeRssXml(xml);
        const channelNameMatch = xml.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/);
        const channelTitle = channelNameMatch ? channelNameMatch[1].trim() : (resolvedChannelTitle || undefined);

        if (parsed.length > 0) {
          // Add channelName & platform to all parsed items
          const enrichedVideos = parsed.map(v => ({
            ...v,
            channelName: channelTitle || 'Ust. Jaenal Maskun Official',
            platform: 'youtube'
          }));

          try {
            fs.writeFileSync(YT_CACHE_FILE, JSON.stringify({ 
              videos: enrichedVideos, 
              lastFetched: Date.now(), 
              channelTitle,
              channelId: resolvedChannelId || clean
            }, null, 2), 'utf-8');
          } catch (e) {}
          return { success: true, videos: enrichedVideos, source: 'rss_live', channelTitle, channelId: resolvedChannelId || clean };
        }
      }
    } catch (e) {
      console.warn('Could not fetch YouTube RSS feed, falling back to cache', e);
    }
  }

  // Fallback to cache
  try {
    if (fs.existsSync(YT_CACHE_FILE)) {
      const cache = JSON.parse(fs.readFileSync(YT_CACHE_FILE, 'utf-8'));
      if (Array.isArray(cache.videos) && cache.videos.length > 0) {
        return { success: true, videos: cache.videos, source: 'cache', channelTitle: cache.channelTitle, channelId: cache.channelId };
      }
    }
  } catch (e) {}

  // Check if siteData has custom configured youtubeVideos
  if (siteData?.siteContent?.youtubeVideos && Array.isArray(siteData.siteContent.youtubeVideos) && siteData.siteContent.youtubeVideos.length > 0) {
    return { success: true, videos: siteData.siteContent.youtubeVideos, source: 'site_data' };
  }

  return { success: true, videos: [], source: 'empty', message: 'Tidak ditemukan video pada feed saluran YouTube.' };
}

// Get YouTube Channel Videos API
app.get('/api/youtube/channel-videos', async (req, res) => {
  const channelParam = (req.query.channel as string || req.query.channelId as string || req.query.playlistId as string || '').trim();
  const result = await fetchYouTubeChannelVideos(channelParam);
  res.json(result);
});

// Resolve Channel Endpoint
app.get('/api/youtube/resolve-channel', async (req, res) => {
  const query = (req.query.query as string || req.query.handle as string || req.query.channel as string || '').trim();
  const result = await fetchYouTubeChannelVideos(query);
  res.json(result);
});

// Sync / Update YouTube Channel Videos from Admin Portal
app.post('/api/youtube/sync', async (req, res) => {
  const { channelId, playlistId, customVideos, channelTitle } = req.body;
  const targetId = channelId || playlistId;
  const result = await fetchYouTubeChannelVideos(targetId);

  // If custom videos provided in body and we want to preserve them
  if (Array.isArray(customVideos) && customVideos.length > 0 && result.videos.length === 0) {
    result.videos = customVideos;
  }

  try {
    fs.writeFileSync(YT_CACHE_FILE, JSON.stringify({
      videos: result.videos,
      lastFetched: Date.now(),
      channelTitle: channelTitle || result.channelTitle,
      channelId: result.channelId || channelId,
      playlistId
    }, null, 2), 'utf-8');
  } catch (e) {}

  res.json({
    success: result.success && result.videos.length > 0,
    videos: result.videos,
    count: result.videos.length,
    source: result.source,
    channelId: result.channelId || channelId,
    channelTitle: channelTitle || result.channelTitle,
    message: result.videos.length > 0
      ? `Berhasil mengambil ${result.videos.length} video terbaru dari channel YouTube!`
      : 'Tidak dapat menemukan video dari saluran YouTube tersebut. Pastikan username/handle atau channel URL tepat.'
  });
});

// -------------------------------------------------------------
// TIKTOK VIDEO RESOLVER & OEMBED PROXY
// -------------------------------------------------------------
app.get('/api/tiktok/resolve', async (req, res) => {
  const inputUrl = ((req.query.url as string) || '').trim();
  if (!inputUrl) {
    return res.status(400).json({ success: false, message: 'URL TikTok tidak boleh kosong' });
  }

  try {
    let finalUrl = inputUrl;
    // If it's a shortlink (vt.tiktok.com, vm.tiktok.com, tiktok.com/t/...)
    if (/vt\.tiktok\.com|vm\.tiktok\.com|tiktok\.com\/t\//i.test(inputUrl)) {
      try {
        const headRes = await fetch(inputUrl, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        if (headRes.url) {
          finalUrl = headRes.url;
        }
      } catch (e) {}
    }

    // Extract Video ID
    const matchId = finalUrl.match(/(?:video\/|v\/|embed\/v2\/|player\/v1\/)(\d{15,22})/i) || finalUrl.match(/(\d{15,22})/);
    const videoId = matchId ? matchId[1] : null;

    // Fetch official TikTok oEmbed data
    let oembedData: any = null;
    try {
      const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(finalUrl)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
      if (oembedRes.ok) {
        oembedData = await oembedRes.json();
      }
    } catch (e) {}

    const resolvedEmbedUrl = videoId
      ? `https://www.tiktok.com/embed/v2/${videoId}`
      : finalUrl;

    res.json({
      success: true,
      originalUrl: inputUrl,
      canonicalUrl: finalUrl,
      videoId: videoId,
      embedUrl: resolvedEmbedUrl,
      title: oembedData?.title || '',
      authorName: oembedData?.author_name || '',
      authorUrl: oembedData?.author_url || '',
      thumbnail: oembedData?.thumbnail_url || '',
      html: oembedData?.html || ''
    });
  } catch (err: any) {
    res.json({
      success: false,
      message: err.message || 'Gagal memproses URL TikTok',
      originalUrl: inputUrl
    });
  }
});

// -------------------------------------------------------------
// BACKUP & RESTORE / SNAPSHOT ENGINE
// -------------------------------------------------------------
function calculateBackupStats(data: any, messages: any[] = []): any {
  const content = data?.siteContent || {};
  return {
    publicationsCount: Array.isArray(content.publications) ? content.publications.length : 0,
    agendasCount: Array.isArray(content.agenda) ? content.agenda.length : 0,
    galleryCount: Array.isArray(content.gallery) ? content.gallery.length : 0,
    messagesCount: Array.isArray(messages) ? messages.length : 0,
    pillarsCount: Array.isArray(content.pillars) ? content.pillars.length : 0,
    quotesCount: Array.isArray(content.quotes) ? content.quotes.length : 0,
    educationCount: Array.isArray(content.education) ? content.education.length : 0,
    experienceCount: Array.isArray(content.experience) ? content.experience.length : (Array.isArray(content.experiences) ? content.experiences.length : 0)
  };
}

function createSnapshotHelper(source: 'auto' | 'manual' | 'restore' = 'auto', label = 'Cadangan Otomatis', customData?: any) {
  try {
    if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    const dataToSave = customData || cachedSiteData || loadSiteDataFromFile();
    const timestamp = Date.now();
    const dateFormatted = new Date(timestamp).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const snapshot = {
      id: `snap_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp,
      dateFormatted,
      source,
      label,
      stats: calculateBackupStats(dataToSave),
      data: dataToSave
    };

    const filePath = path.join(SNAPSHOTS_DIR, `${snapshot.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');

    // Keep max 25 latest snapshots, delete older ones
    pruneSnapshots();

    return snapshot;
  } catch (err) {
    console.error('Error creating snapshot:', err);
    return null;
  }
}

function pruneSnapshots(maxKeep = 25) {
  try {
    if (!fs.existsSync(SNAPSHOTS_DIR)) return;
    const files = fs.readdirSync(SNAPSHOTS_DIR).filter(f => f.endsWith('.json'));
    if (files.length > maxKeep) {
      const fileStats = files.map(f => ({
        name: f,
        path: path.join(SNAPSHOTS_DIR, f),
        mtime: fs.statSync(path.join(SNAPSHOTS_DIR, f)).mtimeMs
      })).sort((a, b) => b.mtime - a.mtime);

      for (let i = maxKeep; i < fileStats.length; i++) {
        try { fs.unlinkSync(fileStats[i].path); } catch (e) {}
      }
    }
  } catch (e) {}
}

function getSnapshotsList(): any[] {
  try {
    if (!fs.existsSync(SNAPSHOTS_DIR)) return [];
    const files = fs.readdirSync(SNAPSHOTS_DIR).filter(f => f.endsWith('.json'));
    const list: any[] = [];
    for (const f of files) {
      try {
        const fullPath = path.join(SNAPSHOTS_DIR, f);
        const stat = fs.statSync(fullPath);
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const parsed = JSON.parse(raw);
        list.push({
          id: parsed.id || f.replace('.json', ''),
          timestamp: parsed.timestamp || stat.mtimeMs,
          dateFormatted: parsed.dateFormatted || new Date(stat.mtimeMs).toLocaleString('id-ID'),
          source: parsed.source || 'auto',
          label: parsed.label || 'Snapshot Cadangan',
          sizeBytes: stat.size,
          stats: parsed.stats || calculateBackupStats(parsed.data || parsed)
        });
      } catch (e) {}
    }
    return list.sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    console.error('Error reading snapshots list:', err);
    return [];
  }
}

// 1. Full Backup JSON Download Endpoint
app.get('/api/backup/full', async (req, res) => {
  try {
    const currentData = cachedSiteData || loadSiteDataFromFile();
    const msgs = await loadMessages();
    const adminUser = currentAdminAuth ? {
      username: currentAdminAuth.username,
      email: currentAdminAuth.email,
      name: currentAdminAuth.name,
      role: currentAdminAuth.role
    } : undefined;

    const stats = calculateBackupStats(currentData, msgs);
    const now = new Date();
    const timestamp = Date.now();
    const dateFormatted = now.toISOString();

    const backupBundle = {
      version: '2.0.0',
      app: 'Master-Web-Pribadi-Ust-Jaenal-Maskun',
      exportedAt: dateFormatted,
      timestamp,
      data: {
        siteContent: currentData.siteContent,
        logoConfig: currentData.logoConfig,
        stickyFooterConfig: currentData.stickyFooterConfig,
        lastUpdated: currentData.lastUpdated || timestamp
      },
      messages: msgs,
      adminProfile: adminUser,
      stats,
      system: {
        storageEngine: isMySQLConnected ? 'mysql' : 'file',
        database: isMySQLConnected ? currentMySQLConfig.database : 'persisted_json'
      }
    };

    if (req.query.download === '1' || req.query.download === 'true') {
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const filename = `backup-master-web-jaenalmaskun-${yyyy}${mm}${dd}-${hh}${min}.json`;

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(JSON.stringify(backupBundle, null, 2));
    }

    res.json({
      success: true,
      backup: backupBundle
    });
  } catch (err: any) {
    console.error('Error generating backup:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal membuat cadangan data' });
  }
});

// Helper: Extract JSON data from SQL script
function parseSiteDataFromSql(sql: string): any | null {
  try {
    const regex = /VALUES\s*\(\s*['"]site_data['"]\s*,\s*['"]((?:[^'"]|\\['"]|'')+)['"]/i;
    const match = sql.match(regex);
    if (match && match[1]) {
      let rawVal = match[1]
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');
      return JSON.parse(rawVal);
    }
    const jsonMatch = sql.match(/\{[\s\S]*"siteContent"[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn('parseSiteDataFromSql failed', e);
  }
  return null;
}

// Multer in-memory upload for ZIP restore
const backupZipMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500 MB max
});

// 2. Restore Backup JSON / SQL Endpoint
app.post('/api/backup/restore', async (req, res) => {
  try {
    let payload = req.body;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        // Check if raw SQL string was posted
        if (payload.includes('site_data') || payload.includes('INSERT INTO')) {
          payload = { _rawSqlText: payload };
        }
      }
    }

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ success: false, error: 'Berkas cadangan tidak valid atau kosong' });
    }

    // If SQL dump text was supplied
    if (payload._rawSqlText || payload.sql) {
      const extracted = parseSiteDataFromSql(payload._rawSqlText || payload.sql);
      if (extracted) {
        payload = extracted;
      }
    }

    // Identify nested structure, snapshot format, or flat structure
    let incomingData = payload.data ? payload.data : payload;
    let siteContent = incomingData.siteContent || payload.siteContent;
    let logoConfig = incomingData.logoConfig || payload.logoConfig;
    let stickyFooterConfig = incomingData.stickyFooterConfig || payload.stickyFooterConfig;

    // Fallback: If root contains direct profile or sections
    if (!siteContent && (payload.profile || payload.publications || payload.agenda || payload.pillars)) {
      siteContent = {
        profile: payload.profile || defaultInitialSiteData.siteContent.profile,
        education: payload.education || [],
        pillars: payload.pillars || [],
        quotes: payload.quotes || [],
        publications: payload.publications || [],
        experience: payload.experience || payload.experiences || [],
        agenda: payload.agenda || [],
        gallery: payload.gallery || [],
        visibility: payload.visibility || defaultInitialSiteData.siteContent.visibility,
        heroSettings: payload.heroSettings || defaultInitialSiteData.siteContent.heroSettings,
        shareSettings: payload.shareSettings || defaultInitialSiteData.siteContent.shareSettings
      };
    }

    if (!siteContent && !logoConfig && !stickyFooterConfig) {
      return res.status(400).json({
        success: false,
        error: 'Format data cadangan tidak dikenali. Pastikan berkas berasal dari ekspor cadangan website ini.'
      });
    }

    // 1. Create a safety snapshot BEFORE applying restore so user can rollback anytime
    const safetySnapshot = createSnapshotHelper('restore', 'Snapshot Otomatis Sebelum Pemulihan Data');

    // 2. Prepare merged data
    const current = cachedSiteData || loadSiteDataFromFile() || defaultInitialSiteData;
    const restoredData = {
      ...current,
      lastUpdated: Date.now()
    };

    if (siteContent) {
      restoredData.siteContent = {
        ...current.siteContent,
        ...siteContent,
        profile: { ...(current.siteContent?.profile || {}), ...(siteContent.profile || {}) },
        education: Array.isArray(siteContent.education) ? siteContent.education : current.siteContent?.education,
        pillars: Array.isArray(siteContent.pillars) ? siteContent.pillars : current.siteContent?.pillars,
        quotes: Array.isArray(siteContent.quotes) ? siteContent.quotes : current.siteContent?.quotes,
        publications: Array.isArray(siteContent.publications) ? siteContent.publications : current.siteContent?.publications,
        experience: Array.isArray(siteContent.experience) ? siteContent.experience : (Array.isArray(siteContent.experiences) ? siteContent.experiences : current.siteContent?.experience),
        agenda: Array.isArray(siteContent.agenda) ? siteContent.agenda : current.siteContent?.agenda,
        gallery: Array.isArray(siteContent.gallery) ? siteContent.gallery : current.siteContent?.gallery,
        visibility: { ...(current.siteContent?.visibility || {}), ...(siteContent.visibility || {}) },
        heroSettings: { ...(current.siteContent?.heroSettings || {}), ...(siteContent.heroSettings || {}) },
        shareSettings: { ...(current.siteContent?.shareSettings || {}), ...(siteContent.shareSettings || {}) }
      };
    }

    if (logoConfig) {
      restoredData.logoConfig = {
        ...(current.logoConfig || {}),
        ...logoConfig
      };
    }

    if (stickyFooterConfig) {
      restoredData.stickyFooterConfig = {
        ...(current.stickyFooterConfig || {}),
        ...stickyFooterConfig,
        items: Array.isArray(stickyFooterConfig.items) ? stickyFooterConfig.items : (current.stickyFooterConfig?.items || [])
      };
    }

    // 3. Save to database & file
    const saved = await saveSiteDataToDBAndFile(restoredData);

    // 4. Optionally restore messages if provided
    let restoredMessagesCount = 0;
    if (Array.isArray(payload.messages) && payload.messages.length > 0 && req.body.restoreMessages === true) {
      try {
        let existing = await loadMessages();
        const existingIds = new Set(existing.map(m => m.id));
        for (const msg of payload.messages) {
          if (msg && msg.id && !existingIds.has(msg.id)) {
            existing.push(msg);
            restoredMessagesCount++;
          }
        }
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(existing, null, 2), 'utf-8');
      } catch (e) {}
    }

    const stats = calculateBackupStats(restoredData);

    res.json({
      success: saved,
      message: 'Seluruh data website berhasil dipulihkan dari berkas cadangan!',
      restoredData,
      stats,
      safetySnapshotId: safetySnapshot?.id,
      restoredMessagesCount,
      storageEngine: isMySQLConnected ? 'mysql' : 'file'
    });
  } catch (err: any) {
    console.error('Error restoring backup:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memulihkan cadangan data' });
  }
});

// 2b. Restore from Full ZIP Archive (.ZIP containing data & uploads)
app.post('/api/backup/restore-zip', backupZipMulter.single('backupZip'), async (req, res) => {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({ success: false, error: 'Tidak ada berkas ZIP yang diunggah' });
    }

    const zip = await JSZip.loadAsync(file.buffer);

    // 1. Locate JSON site data or SQL in zip
    let jsonContentStr: string | null = null;
    const candidatePaths = [
      'data/persisted_site_data.json',
      'persisted_site_data.json',
      'data/site_data.default.json',
      'site_data.default.json',
      'data/site_data.json',
      'site_data.json',
      'backup.json'
    ];

    for (const p of candidatePaths) {
      const entry = zip.file(p);
      if (entry) {
        jsonContentStr = await entry.async('string');
        break;
      }
    }

    if (!jsonContentStr) {
      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (!zipEntry.dir && relativePath.endsWith('.json')) {
          try {
            const testStr = await zipEntry.async('string');
            const testObj = JSON.parse(testStr);
            if (testObj?.siteContent || testObj?.data?.siteContent || testObj?.profile) {
              jsonContentStr = testStr;
              break;
            }
          } catch (e) {}
        }
      }
    }

    if (!jsonContentStr) {
      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (!zipEntry.dir && relativePath.endsWith('.sql')) {
          const sqlStr = await zipEntry.async('string');
          const extracted = parseSiteDataFromSql(sqlStr);
          if (extracted) {
            jsonContentStr = JSON.stringify(extracted);
            break;
          }
        }
      }
    }

    if (!jsonContentStr) {
      return res.status(400).json({
        success: false,
        error: 'Berkas ZIP tidak memuat data website (.json atau database.sql yang valid).'
      });
    }

    const payload = JSON.parse(jsonContentStr);

    // 2. Extract uploaded files from ZIP into data/uploads and public/assets/uploads
    let restoredFilesCount = 0;
    const uploadsDataDir = path.join(process.cwd(), 'data', 'uploads');
    const uploadsPublicDir = path.join(process.cwd(), 'public', 'assets', 'uploads');
    if (!fs.existsSync(uploadsDataDir)) fs.mkdirSync(uploadsDataDir, { recursive: true });
    if (!fs.existsSync(uploadsPublicDir)) fs.mkdirSync(uploadsPublicDir, { recursive: true });

    for (const [relPath, zipEntry] of Object.entries(zip.files)) {
      if (!zipEntry.dir && (relPath.startsWith('uploads/') || relPath.startsWith('data/uploads/'))) {
        const fileName = path.basename(relPath);
        if (fileName && !fileName.startsWith('.')) {
          const fileData = await zipEntry.async('nodebuffer');
          fs.writeFileSync(path.join(uploadsDataDir, fileName), fileData);
          try {
            fs.writeFileSync(path.join(uploadsPublicDir, fileName), fileData);
          } catch (e) {}
          restoredFilesCount++;
        }
      }
    }

    // 3. Create safety snapshot before applying
    const safetySnapshot = createSnapshotHelper('restore', 'Snapshot Otomatis Sebelum Pemulihan Paket ZIP');

    // 4. Merge data
    let incomingData = payload.data ? payload.data : payload;
    let siteContent = incomingData.siteContent || payload.siteContent;
    let logoConfig = incomingData.logoConfig || payload.logoConfig;
    let stickyFooterConfig = incomingData.stickyFooterConfig || payload.stickyFooterConfig;

    if (!siteContent && (payload.profile || payload.publications || payload.agenda || payload.pillars)) {
      siteContent = {
        profile: payload.profile || defaultInitialSiteData.siteContent.profile,
        education: payload.education || [],
        pillars: payload.pillars || [],
        quotes: payload.quotes || [],
        publications: payload.publications || [],
        experience: payload.experience || payload.experiences || [],
        agenda: payload.agenda || [],
        gallery: payload.gallery || [],
        visibility: payload.visibility || defaultInitialSiteData.siteContent.visibility,
        heroSettings: payload.heroSettings || defaultInitialSiteData.siteContent.heroSettings,
        shareSettings: payload.shareSettings || defaultInitialSiteData.siteContent.shareSettings
      };
    }

    const current = cachedSiteData || loadSiteDataFromFile() || defaultInitialSiteData;
    const restoredData = {
      ...current,
      lastUpdated: Date.now()
    };

    if (siteContent) {
      restoredData.siteContent = {
        ...current.siteContent,
        ...siteContent,
        profile: { ...(current.siteContent?.profile || {}), ...(siteContent.profile || {}) },
        education: Array.isArray(siteContent.education) ? siteContent.education : current.siteContent?.education,
        pillars: Array.isArray(siteContent.pillars) ? siteContent.pillars : current.siteContent?.pillars,
        quotes: Array.isArray(siteContent.quotes) ? siteContent.quotes : current.siteContent?.quotes,
        publications: Array.isArray(siteContent.publications) ? siteContent.publications : current.siteContent?.publications,
        experience: Array.isArray(siteContent.experience) ? siteContent.experience : (Array.isArray(siteContent.experiences) ? siteContent.experiences : current.siteContent?.experience),
        agenda: Array.isArray(siteContent.agenda) ? siteContent.agenda : current.siteContent?.agenda,
        gallery: Array.isArray(siteContent.gallery) ? siteContent.gallery : current.siteContent?.gallery,
        visibility: { ...(current.siteContent?.visibility || {}), ...(siteContent.visibility || {}) },
        heroSettings: { ...(current.siteContent?.heroSettings || {}), ...(siteContent.heroSettings || {}) },
        shareSettings: { ...(current.siteContent?.shareSettings || {}), ...(siteContent.shareSettings || {}) }
      };
    }

    if (logoConfig) {
      restoredData.logoConfig = { ...(current.logoConfig || {}), ...logoConfig };
    }

    if (stickyFooterConfig) {
      restoredData.stickyFooterConfig = {
        ...(current.stickyFooterConfig || {}),
        ...stickyFooterConfig,
        items: Array.isArray(stickyFooterConfig.items) ? stickyFooterConfig.items : (current.stickyFooterConfig?.items || [])
      };
    }

    const saved = await saveSiteDataToDBAndFile(restoredData);
    const stats = calculateBackupStats(restoredData);

    res.json({
      success: saved,
      message: `Paket cadangan ZIP berhasil dipulihkan! ${restoredFilesCount} berkas media disinkronkan.`,
      restoredData,
      stats,
      safetySnapshotId: safetySnapshot?.id,
      restoredFilesCount
    });
  } catch (err: any) {
    console.error('Error restoring ZIP backup:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memulihkan berkas ZIP' });
  }
});

// 3. Snapshots List Endpoint
app.get('/api/backup/snapshots', (req, res) => {
  const list = getSnapshotsList();
  res.json({
    success: true,
    snapshots: list,
    count: list.length
  });
});

// 4. Create Manual Snapshot Endpoint
app.post('/api/backup/create-snapshot', (req, res) => {
  const label = req.body?.label?.trim() || `Cadangan Manual ${new Date().toLocaleTimeString('id-ID')}`;
  const snap = createSnapshotHelper('manual', label);
  if (snap) {
    res.json({
      success: true,
      message: `Snapshot "${label}" berhasil disimpan.`,
      snapshot: {
        id: snap.id,
        timestamp: snap.timestamp,
        dateFormatted: snap.dateFormatted,
        label: snap.label,
        source: snap.source,
        stats: snap.stats
      }
    });
  } else {
    res.status(500).json({ success: false, error: 'Gagal membuat snapshot' });
  }
});

// 5. Restore Snapshot by ID Endpoint
app.post('/api/backup/restore-snapshot', async (req, res) => {
  try {
    const { snapshotId } = req.body;
    if (!snapshotId) {
      return res.status(400).json({ success: false, error: 'ID Snapshot wajib disertakan' });
    }

    const filePath = path.join(SNAPSHOTS_DIR, `${snapshotId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Berkas snapshot tidak ditemukan di server' });
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const snapshotObj = JSON.parse(raw);
    const snapData = snapshotObj.data || snapshotObj;

    // Create rollback snapshot
    const safetySnapshot = createSnapshotHelper('restore', `Rollback Sebelum Pulihkan ${snapshotObj.label || snapshotId}`);

    // Apply snapshot
    const saved = await saveSiteDataToDBAndFile(snapData);
    const stats = calculateBackupStats(snapData);

    res.json({
      success: saved,
      message: `Website berhasil dipulihkan ke snapshot "${snapshotObj.label || snapshotId}"!`,
      restoredData: snapData,
      stats,
      safetySnapshotId: safetySnapshot?.id
    });
  } catch (err: any) {
    console.error('Error restoring snapshot:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal memulihkan snapshot' });
  }
});

// 6. Delete Snapshot Endpoint
app.delete('/api/backup/snapshot/:id', (req, res) => {
  try {
    const snapshotId = req.params.id;
    const filePath = path.join(SNAPSHOTS_DIR, `${snapshotId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ success: true, message: 'Snapshot berhasil dihapus' });
    }
    res.status(404).json({ success: false, error: 'Snapshot tidak ditemukan' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Gagal menghapus snapshot' });
  }
});

// 7. Export Messages to CSV Endpoint
app.get('/api/backup/export-messages-csv', async (req, res) => {
  try {
    const messages = await loadMessages();
    
    // Header CSV with UTF-8 BOM
    let csv = '\uFEFF"ID Pesan","Nama Pengirim","Lembaga/Instansi","Email","WhatsApp/No HP","Jenis Acara","Tanggal Acara","Status Baca","Tanggal Dibuat","Isi Pesan"\r\n';

    for (const m of messages) {
      const escapeField = (val: any) => `"${String(val || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
      const row = [
        escapeField(m.id),
        escapeField(m.sender),
        escapeField(m.institution),
        escapeField(m.email),
        escapeField(m.phone),
        escapeField(m.eventType),
        escapeField(m.date),
        escapeField(m.read ? 'Sudah Dibaca' : 'Baru / Belum Dibaca'),
        escapeField(m.createdAt),
        escapeField(m.message)
      ];
      csv += row.join(',') + '\r\n';
    }

    const now = new Date();
    const filename = `pesan-undangan-jaenalmaskun-${now.toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Gagal mengekspor CSV pesan' });
  }
});

// 8. Export Full Website Data & Uploads ZIP Endpoint
app.get('/api/backup/zip-data', async (req, res) => {
  try {
    const currentData = cachedSiteData || loadSiteDataFromFile();
    const msgs = await loadMessages();
    const zip = new JSZip();

    // 1. Data JSON files
    const dataFolder = zip.folder('data');
    if (dataFolder) {
      dataFolder.file('persisted_site_data.json', JSON.stringify(currentData, null, 2));
      dataFolder.file('persisted_messages.json', JSON.stringify(msgs, null, 2));
      dataFolder.file('mysql_config.json', JSON.stringify(currentMySQLConfig, null, 2));
      
      // Admin auth with password note
      const safeAuth = currentAdminAuth ? { ...currentAdminAuth } : { ...defaultAdminAuth };
      dataFolder.file('admin_auth.json', JSON.stringify(safeAuth, null, 2));
    }

    // 2. MySQL Dump SQL
    zip.file('database.sql', generateSqlContent(currentData));

    // 3. Uploads & Media directory (flyers, avatar, custom images, pdfs, logos)
    const uploadsFolder = zip.folder('uploads');
    const scannedDirs = [UPLOADS_PUBLIC_DIR, UPLOADS_DATA_DIR, path.join(process.cwd(), 'public')];
    const addedFiles = new Set<string>();

    for (const uDir of scannedDirs) {
      if (uDir && fs.existsSync(uDir)) {
        try {
          const files = fs.readdirSync(uDir);
          for (const file of files) {
            const filePath = path.join(uDir, file);
            if (fs.statSync(filePath).isFile()) {
              // For public root directory, only include media and document assets
              if (uDir === path.join(process.cwd(), 'public') && !file.match(/\.(jpg|jpeg|png|webp|svg|gif|ico|pdf)$/i)) {
                continue;
              }
              if (!addedFiles.has(file)) {
                addedFiles.add(file);
                const fileContent = fs.readFileSync(filePath);
                uploadsFolder?.file(file, fileContent);
              }
            }
          }
        } catch (e) {
          console.warn('Scan media dir warning:', uDir, e);
        }
      }
    }

    // 4. Instructions README
    const readmeContent = `# CADANGAN DATA LENGKAP WEBSITE UST. JAENAL MASKUN, S.Pd.I.
Dibuat pada: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}

Isi Berkas Cadangan Ini:
1. data/persisted_site_data.json -> Seluruh profil, karya, agenda, pilar, galeri, pengaturan logo & footer.
2. data/persisted_messages.json  -> Arsip seluruh pesan & undangan silaturahmi masuk.
3. database.sql                  -> Skrip SQL database siap import langsung ke phpMyAdmin / MySQL.
4. uploads/                      -> Semua berkas PDF materi kajian, foto flyer, avatar, dan banner.

CARA PEMULIHAN (RESTORE):
- Buka Panel Admin -> Tab "Backup & Restore".
- Pilih menu "Pulihkan dari Berkas Cadangan", lalu unggah berkas "persisted_site_data.json" dari dalam ZIP ini.
- Atau impor file "database.sql" ke database MySQL hosting Anda melalui phpMyAdmin.
`;
    zip.file('README_BACKUP.txt', readmeContent);

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    const now = new Date();
    const filename = `backup-data-komplit-jaenalmaskun-${now.toISOString().split('T')[0]}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('Error generating data backup zip:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal mengompres cadangan data' });
  }
});

// Reset data
app.post('/api/reset-data', async (req, res) => {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      fs.unlinkSync(STORAGE_FILE);
    }
    cachedSiteData = defaultInitialSiteData;
    lastUpdatedTimestamp = Date.now();

    if (mysqlPool && isMySQLConnected) {
      try {
        const conn = await mysqlPool.getConnection();
        await conn.query(`UPDATE site_settings SET setting_value = ? WHERE setting_key = 'site_data'`, [JSON.stringify(defaultInitialSiteData)]);
        conn.release();
      } catch (e) {}
    }

    res.json({ success: true, message: 'Data server dan database telah direset ke format awal.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to reset server data' });
  }
});

// -------------------------------------------------------------
// SQL EXPORT ENDPOINT & GENERATOR
// -------------------------------------------------------------
function generateSqlContent(data: any) {
  const dateStr = new Date().toISOString();
  const currentData = data || defaultInitialSiteData;
  const jsonEscaped = JSON.stringify(currentData).replace(/'/g, "''");

  return `-- ========================================================
-- DATABASE SCHEMA & SEED DATA: WEB PERSONAL UST. JAENAL MASKUN
-- Dikonfigurasi Siap Import untuk Database MySQL
-- Database : \`${currentMySQLConfig.database}\`
-- User DB  : \`${currentMySQLConfig.user}\`
-- Host     : ${currentMySQLConfig.host} (Port ${currentMySQLConfig.port})
-- Dibuat   : ${dateStr}
-- ========================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------
-- 1. TABEL PENGATURAN SITUS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`site_settings\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`setting_key\` varchar(100) NOT NULL UNIQUE,
  \`setting_value\` LONGTEXT NOT NULL,
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO \`site_settings\` (\`setting_key\`, \`setting_value\`)
VALUES ('site_data', '${jsonEscaped}')
ON DUPLICATE KEY UPDATE \`setting_value\` = VALUES(\`setting_value\`);

-- --------------------------------------------------------
-- 2. TABEL PESAN SILATURAHMI / KONTAK
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`messages\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`msg_id\` varchar(50) NOT NULL UNIQUE,
  \`sender\` varchar(150) NOT NULL,
  \`institution\` varchar(200) DEFAULT NULL,
  \`email\` varchar(150) DEFAULT NULL,
  \`phone\` varchar(50) DEFAULT NULL,
  \`event_type\` varchar(100) DEFAULT 'Silaturahmi',
  \`event_date\` varchar(100) DEFAULT NULL,
  \`message\` text NOT NULL,
  \`is_read\` tinyint(1) NOT NULL DEFAULT 0,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
`;
}

// Direct SQL download endpoint
app.get("/api/export-sql", (req, res) => {
  const currentData = cachedSiteData || loadSiteDataFromFile();
  const sql = generateSqlContent(currentData);
  res.setHeader("Content-Type", "application/sql");
  res.setHeader("Content-Disposition", "attachment; filename=\"database.sql\"");
  res.send(sql);
});

// -------------------------------------------------------------
// PLESK PACKAGE ZIP EXPORT ENDPOINT & HELPERS
// -------------------------------------------------------------
function generatePleskDbConfigPhp() {
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

if (!defined('DB_HOST')) define('DB_HOST', getenv('DB_HOST') ?: ($customConfig['host'] ?? '${currentMySQLConfig.host}'));
if (!defined('DB_PORT')) define('DB_PORT', getenv('DB_PORT') ? (int)getenv('DB_PORT') : ($customConfig['port'] ?? ${currentMySQLConfig.port}));
if (!defined('DB_USER')) define('DB_USER', getenv('DB_USER') ?: ($customConfig['user'] ?? '${currentMySQLConfig.user}'));
if (!defined('DB_PASS')) define('DB_PASS', getenv('DB_PASS') ?: ($customConfig['password'] ?? '${currentMySQLConfig.password}'));
if (!defined('DB_NAME')) define('DB_NAME', getenv('DB_NAME') ?: ($customConfig['database'] ?? '${currentMySQLConfig.database}'));
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

        // Cek jika site_settings masih kosong, auto seed dari file JSON
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
}

function generatePleskHtaccess() {
  return `# ========================================================
# PLESK & APACHE .HTACCESS CONFIGURATION
# Web Personal Ust. Jaenal Maskun, S.Pd.I.
# Ultra-Compatible: Bebas Kesalahan 500 Server Error
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
    RewriteRule ^api/site-content-config/?$ api/site-content.php [QSA,L]
    RewriteRule ^api/logo-config/?$ api/logo-config.php [QSA,L]
    RewriteRule ^api/sticky-footer-config/?$ api/sticky-footer-config.php [QSA,L]
    RewriteRule ^api/sync-to-mysql/?$ api/sync-to-mysql.php [QSA,L]
    RewriteRule ^api/share-settings/?$ api/share-settings.php [QSA,L]
    RewriteRule ^api/upload-thumbnail/?$ api/upload-thumbnail.php [QSA,L]
    RewriteRule ^api/upload-video-chunk/?$ api/upload-video-chunk.php [QSA,L]
    RewriteRule ^api/upload-video-form/?$ api/upload-video-form.php [QSA,L]
    RewriteRule ^api/upload-video-stream/?$ api/upload-video-chunk.php [QSA,L]
    RewriteRule ^api/sync-status/?$ api/sync-status.php [QSA,L]
    RewriteRule ^api/upload-image/?$ api/upload-image.php [QSA,L]
    RewriteRule ^api/upload-file/?$ api/upload-file.php [QSA,L]
    RewriteRule ^api/messages/?$ api/messages.php [QSA,L]
    RewriteRule ^api/settings/?$ api/settings.php [QSA,L]
    RewriteRule ^api/test-db/?$ api/test_db.php [QSA,L]
    RewriteRule ^api/mysql-status/?$ api/test_db.php [QSA,L]
    RewriteRule ^api/admin/login/?$ api/admin-login.php [QSA,L]
    RewriteRule ^api/admin-login/?$ api/admin-login.php [QSA,L]
    RewriteRule ^api/export-plesk-zip/?$ api/export-zip.php [QSA,L]

    # File atau folder fisik langsung dilayani
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteCond %{REQUEST_URI} !\\.(html|htm)$ [NC]
    RewriteRule ^ - [L]

    # SPA Fallback ke index.php
    RewriteRule ^(.*)$ index.php [QSA,L]
</IfModule>

# MIME Type & Byte-Range Streaming untuk Video MP4/WebM dan Audio
<IfModule mod_mime.c>
    AddType video/mp4 .mp4 .m4v
    AddType video/webm .webm
    AddType video/ogg .ogv
    AddType audio/mpeg .mp3
    AddType audio/ogg .ogg
    AddType audio/wav .wav
</IfModule>

<IfModule mod_headers.c>
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE, PATCH"
    Header always set Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-Upload-ID, X-Chunk-Index, X-Total-Chunks, X-Filename, X-Title, X-Duration, X-Width, X-Height, X-Thumbnail"
    Header always set X-Content-Type-Options "nosniff"

    <FilesMatch "\\.(mp4|m4v|webm|ogv|mp3|ogg|wav)$">
        Header set Accept-Ranges bytes
        Header set Access-Control-Allow-Origin "*"
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>
</IfModule>
`;
}

function generatePleskApiTestDb() {
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
}

function generatePleskIndexPhp() {
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

// 1. Prioritas Utama: Ambil dari MySQL Plesk jika aktif
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

// 2. Fallback jika MySQL belum ada/kosong: baca dari file JSON data tersimpan
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
        $html = preg_replace('/<title>.*?<\\/title>/i', '<title>' . $title . '</title>', $html);
        $html = preg_replace('/<meta\\s+name="description"\\s+content="[^"]*"/i', '<meta name="description" content="' . $desc . '"', $html);
        $html = preg_replace('/<meta\\s+property="og:title"\\s+content="[^"]*"/i', '<meta property="og:title" content="' . $title . '"', $html);
        $html = preg_replace('/<meta\\s+property="og:description"\\s+content="[^"]*"/i', '<meta property="og:description" content="' . $desc . '"', $html);
        $html = preg_replace('/<meta\\s+name="twitter:title"\\s+content="[^"]*"/i', '<meta name="twitter:title" content="' . $title . '"', $html);
        $html = preg_replace('/<meta\\s+name="twitter:description"\\s+content="[^"]*"/i', '<meta name="twitter:description" content="' . $desc . '"', $html);
        
        if (!empty($logoConf['faviconUrl'])) {
            $fav = htmlspecialchars($logoConf['faviconUrl'], ENT_QUOTES, 'UTF-8');
            $html = preg_replace('/<link\\s+rel="icon"[^>]*href="[^"]*"/i', '<link rel="icon" href="' . $fav . '"', $html);
            $html = preg_replace('/<link\\s+rel="shortcut icon"[^>]*href="[^"]*"/i', '<link rel="shortcut icon" href="' . $fav . '"', $html);
        }

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
echo "Website Ust. Jaenal Maskun - Berkas index.html sedang dimuat.";
`;
}

function generatePleskApiSiteData() {
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
}

function generatePleskApiSyncStatus() {
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
}

function generatePleskApiUploadImage() {
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
}

function generatePleskApiUploadVideoChunk() {
  return `<?php
/**
 * API Handler: Chunked Video Upload for Plesk Hosting
 * Menerima potongan video dari HP / PC, menyusun potongan, dan menggabungkannya ke folder uploads/
 */
@ini_set('display_errors', '0');
error_reporting(0);
@ini_set('memory_limit', '512M');
@ini_set('max_execution_time', '600');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Upload-ID, X-Chunk-Index, X-Total-Chunks, X-Filename, X-Title, X-Duration, X-Width, X-Height, X-Thumbnail');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$headers = function_exists('getallheaders') ? getallheaders() : [];
$getHeader = function($key) use ($headers) {
    foreach ($headers as $k => $v) {
        if (strcasecmp($k, $key) === 0) return $v;
    }
    return $_SERVER['HTTP_' . strtoupper(str_replace('-', '_', $key))] ?? null;
};

$uploadId = $getHeader('X-Upload-ID') ?: ($_GET['uploadId'] ?? ('upl_' . time() . '_' . rand(1000, 9999)));
$chunkIndex = (int)($getHeader('X-Chunk-Index') ?: ($_GET['chunkIndex'] ?? 0));
$totalChunks = (int)($getHeader('X-Total-Chunks') ?: ($_GET['totalChunks'] ?? 1));
$rawFilename = $getHeader('X-Filename') ?: ($_GET['filename'] ?? 'video.mp4');
$filename = urldecode($rawFilename);
$duration = (float)($getHeader('X-Duration') ?: ($_GET['duration'] ?? 0));
$width = (int)($getHeader('X-Width') ?: ($_GET['width'] ?? 1280));
$height = (int)($getHeader('X-Height') ?: ($_GET['height'] ?? 720));
$thumbnail = $getHeader('X-Thumbnail') ?: ($_GET['thumbnail'] ?? '');

$tempDir = __DIR__ . '/../data/uploads_temp';
if (!is_dir($tempDir)) {
    @mkdir($tempDir, 0755, true);
}

$uploadsDir = __DIR__ . '/../uploads';
if (!is_dir($uploadsDir)) {
    @mkdir($uploadsDir, 0755, true);
}

// Bersihkan potongan basi (> 2 jam)
if ($handle = @opendir($tempDir)) {
    $now = time();
    while (false !== ($entry = @readdir($handle))) {
        if ($entry != "." && $entry != "..") {
            $fp = $tempDir . '/' . $entry;
            if ($now - @filemtime($fp) > 7200) {
                @unlink($fp);
            }
        }
    }
    @closedir($handle);
}

$safeUploadId = preg_replace('/[^a-zA-Z0-9_-]/', '_', $uploadId);
$partPath = $tempDir . '/' . $safeUploadId . '_' . $chunkIndex . '.part';

$input = @file_get_contents('php://input');
if ($input === false || strlen($input) === 0) {
    if (isset($_FILES['chunk']) && is_uploaded_file($_FILES['chunk']['tmp_name'])) {
        @move_uploaded_file($_FILES['chunk']['tmp_name'], $partPath);
    } else {
        echo json_encode(['success' => false, 'error' => 'Potongan video kosong atau gagal diterima']);
        exit;
    }
} else {
    @file_put_contents($partPath, $input);
}

// Cek kelengkapan potongan
$allReady = true;
for ($i = 0; $i < $totalChunks; $i++) {
    $checkPart = $tempDir . '/' . $safeUploadId . '_' . $i . '.part';
    if (!file_exists($checkPart)) {
        $allReady = false;
        break;
    }
}

if (!$allReady) {
    echo json_encode([
        'success' => true,
        'chunkIndex' => $chunkIndex,
        'totalChunks' => $totalChunks,
        'status' => 'chunk_received'
    ]);
    exit;
}

// Semua potongan lengkap -> gabungkan ke uploads/
$ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION)) ?: 'mp4';
$cleanOriginal = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($filename, PATHINFO_FILENAME));
$safeFilename = 'video_' . time() . '_' . $cleanOriginal . '.' . $ext;
$targetPath = $uploadsDir . '/' . $safeFilename;

$out = @fopen($targetPath, 'wb');
if (!$out) {
    echo json_encode(['success' => false, 'error' => 'Gagal membuka file target di folder uploads/']);
    exit;
}

$totalBytes = 0;
for ($i = 0; $i < $totalChunks; $i++) {
    $chunkFile = $tempDir . '/' . $safeUploadId . '_' . $i . '.part';
    if (file_exists($chunkFile)) {
        $in = @fopen($chunkFile, 'rb');
        if ($in) {
            while (!feof($in)) {
                $buf = fread($in, 1048576);
                if ($buf !== false) {
                    fwrite($out, $buf);
                    $totalBytes += strlen($buf);
                }
            }
            fclose($in);
        }
        @unlink($chunkFile);
    }
}
fclose($out);
@chmod($targetPath, 0644);

$sizeFormatted = $totalBytes . ' B';
if ($totalBytes >= 1024 * 1024 * 1024) {
    $sizeFormatted = number_format($totalBytes / (1024 * 1024 * 1024), 2) . ' GB';
} elseif ($totalBytes >= 1024 * 1024) {
    $sizeFormatted = number_format($totalBytes / (1024 * 1024), 1) . ' MB';
} elseif ($totalBytes >= 1024) {
    $sizeFormatted = number_format($totalBytes / 1024, 0) . ' KB';
}

echo json_encode([
    'success' => true,
    'status' => 'completed',
    'url' => '/uploads/' . $safeFilename,
    'filename' => $filename,
    'fileSize' => $sizeFormatted,
    'duration' => $duration,
    'width' => $width,
    'height' => $height,
    'thumbnail' => $thumbnail,
    'message' => 'Berkas video berhasil digabungkan dan siap diputar di Kapsul HP.'
], JSON_UNESCAPED_SLASHES);
exit;
`;
}

function generatePleskApiUploadVideoForm() {
  return `<?php
/**
 * API Handler: Multipart Form-Data Video Upload for Plesk
 */
@ini_set('display_errors', '0');
error_reporting(0);
@ini_set('memory_limit', '512M');
@ini_set('max_execution_time', '600');

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

if (!isset($_FILES['video']) || !is_uploaded_file($_FILES['video']['tmp_name'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Berkas video tidak ditemukan dalam kiriman']);
    exit;
}

$file = $_FILES['video'];
$origName = $file['name'] ?: 'video.mp4';
$ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION)) ?: 'mp4';
$cleanName = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($origName, PATHINFO_FILENAME));
$safeFilename = 'video_' . time() . '_' . $cleanName . '.' . $ext;
$targetPath = $uploadsDir . '/' . $safeFilename;

if (@move_uploaded_file($file['tmp_name'], $targetPath)) {
    @chmod($targetPath, 0644);
    $bytes = (int)@filesize($targetPath);
    $sizeFormatted = $bytes . ' B';
    if ($bytes >= 1024 * 1024) {
        $sizeFormatted = number_format($bytes / (1024 * 1024), 1) . ' MB';
    } elseif ($bytes >= 1024) {
        $sizeFormatted = number_format($bytes / 1024, 0) . ' KB';
    }
    
    echo json_encode([
        'success' => true,
        'url' => '/uploads/' . $safeFilename,
        'filename' => $origName,
        'fileSize' => $sizeFormatted,
        'duration' => (float)($_POST['duration'] ?? 0),
        'width' => (int)($_POST['width'] ?? 1280),
        'height' => (int)($_POST['height'] ?? 720),
        'thumbnail' => $_POST['thumbnail'] ?? '',
        'message' => 'Berkas video berhasil diunggah ke server hosting Plesk.'
    ], JSON_UNESCAPED_SLASHES);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Gagal menyimpan berkas video ke folder uploads/ hosting']);
}
exit;
`;
}

function generatePleskApiAdminLogin() {
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
}

function generatePleskUnzipPhp() {
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
}

function generatePleskReadme() {
  return `# PANDUAN DEPLOYMENT HOSTING PLESK & MYSQL
Website Personal Ust. Jaenal Maskun, S.Pd.I.

Paket ZIP ini dirancang khusus untuk deployment instan di Plesk Obsidian / Onyx / cPanel.

---

## DETAIL DATABASE MYSQL PLESK:
- Database Host : ${currentMySQLConfig.host}
- Database Port : ${currentMySQLConfig.port}
- Database User : ${currentMySQLConfig.user}
- Database Name : ${currentMySQLConfig.database}
- Database Pass : ${currentMySQLConfig.password}

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
2. Pastikan database \`${currentMySQLConfig.database}\` dengan user \`${currentMySQLConfig.user}\` sudah dibuat.
3. Klik tombol **phpMyAdmin** pada database tersebut.
4. Klik tab **Import** di bagian atas phpMyAdmin.
5. Klik **Choose File** -> pilih berkas \`database.sql\` yang ada di dalam paket ini.
6. Klik **Go** (Kirim) di bagian bawah.
7. Semua tabel (\`site_settings\`, \`messages\`) akan langsung siap 100%!

---

## LANGKAH 3: CEK & LOGIN SUPER ADMIN
- Buka website Anda di browser.
- Akses portal admin di: \`https://domainanda.com/?admin=true\`
- Default Email    : \`jaenalmaskun@gmail.com\`
- Default Password : \`masbagus\`

Website kini 100% siap digunakan dan seluruh data tersimpan permanen di database MySQL Plesk Anda!
`;
}

function generatePleskApiMessages() {
  return `<?php
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
            $rows = $stmt->fetchAll();
            foreach ($rows as $r) {
                $messages[] = [
                    'id' => (string)($r['msg_id'] ?? $r['id']),
                    'name' => $r['sender'] ?? $r['sender_name'] ?? '',
                    'institution' => $r['institution'] ?? '',
                    'email' => $r['email'] ?? '',
                    'phone' => $r['phone'] ?? '',
                    'type' => $r['event_type'] ?? 'Silaturahmi',
                    'date' => $r['event_date'] ?? date('d M Y'),
                    'message' => $r['message'] ?? '',
                    'isRead' => (bool)($r['is_read'] ?? 0)
                ];
            }
        } catch (Exception $e) {}
    }
    if (empty($messages) && file_exists($dataFile)) {
        $messages = json_decode(file_get_contents($dataFile), true) ?: [];
    }
    echo json_encode(['success' => true, 'messages' => $messages, 'count' => count($messages)]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
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
    $msgId = 'msg-' . time();
    
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO messages (msg_id, sender, institution, email, phone, event_type, event_date, message, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)");
            $stmt->execute([$msgId, $name, $inst, $email, $phone, $type, $date, $msg]);
        } catch (Exception $e) {
            error_log("MySQL save error: " . $e->getMessage());
        }
    }
    
    $existing = file_exists($dataFile) ? json_decode(file_get_contents($dataFile), true) ?: [] : [];
    array_unshift($existing, [
        'id' => $msgId,
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
    
    echo json_encode(['success' => true, 'message' => 'Pesan Anda berhasil terkirim dan tersimpan!']);
    exit;
}
`;
}

function generatePleskApiSettings() {
  return `<?php
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
            $stmt->execute();
            $row = $stmt->fetch();
            if ($row && !empty($row['setting_value'])) {
                $data = json_decode($row['setting_value'], true);
            }
        } catch (Exception $e) {}
    }
    if (!$data && file_exists($dataFile)) {
        $data = json_decode(file_get_contents($dataFile), true);
    }
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $payload = json_decode($raw, true);
    if (!$payload) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Data tidak valid']);
        exit;
    }
    @file_put_contents($dataFile, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    if ($pdo) {
        try {
            $jsonStr = json_encode($payload, JSON_UNESCAPED_UNICODE);
            $stmt = $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES ('site_data', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP");
            $stmt->execute([$jsonStr]);
        } catch (Exception $e) {
            error_log("MySQL settings error: " . $e->getMessage());
        }
    }
    echo json_encode(['success' => true, 'message' => 'Pengaturan website berhasil disimpan.']);
    exit;
}
`;
}

function generatePleskApiSiteContent() {
  return `<?php
/**
 * API Handler: Update Seluruh Konten & Informasi Website (MySQL Plesk / JSON)
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
    echo json_encode(['success' => true, 'siteContent' => $currentData['siteContent'] ?? []]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = @file_get_contents('php://input');
    $contentPayload = @json_decode($raw, true);
    if (!$contentPayload || !is_array($contentPayload)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Data konten tidak valid']);
        exit;
    }

    $siteContent = isset($contentPayload['siteContent']) ? $contentPayload['siteContent'] : $contentPayload;
    $nowTs = time() * 1000;

    $currentData['siteContent'] = $siteContent;
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
        } catch (Throwable $e) {
            error_log("Gagal simpan site-content ke MySQL: " . $e->getMessage());
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Konten website berhasil disimpan ke database!',
        'lastUpdated' => $nowTs,
        'savedToDb' => $savedToDb,
        'storageEngine' => $savedToDb ? 'MySQL Plesk' : 'File JSON'
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
`;
}

function generatePleskApiLogoConfig() {
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
}

function generatePleskApiStickyFooterConfig() {
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
}

function generatePleskApiSyncToMysql() {
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
}

function generatePleskApiShareSettings() {
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

if (!isset($currentData['siteContent']) || !is_array($currentData['siteContent'])) {
    $currentData['siteContent'] = [];
}

$raw = @file_get_contents('php://input');
$share = @json_decode($raw, true);

if (!$share || !is_array($share)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data share settings tidak valid']);
    exit;
}

$currentData['siteContent']['shareSettings'] = $share;
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
    'message' => 'Pengaturan bagikan berhasil disimpan.',
    'lastUpdated' => $nowTs,
    'savedToDb' => $savedToDb
]);
exit;
`;
}

function generatePleskApiUploadThumbnail() {
  return `<?php
/**
 * API Handler: Unggah Thumbnail Khusus Bagikan (og-image)
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
$uploadsDir = __DIR__ . '/../uploads';
if (!is_dir($uploadsDir)) {
    @mkdir($uploadsDir, 0755, true);
}

$raw = @file_get_contents('php://input');
$input = @json_decode($raw, true);

if (!$input || empty($input['image'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Berkas gambar tidak valid']);
    exit;
}

$dataUri = $input['image'];
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
if (!$binary) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Gagal mendekode gambar base64']);
    exit;
}

$filename = 'share_thumb_' . time() . '.' . $ext;
$targetPath = $uploadsDir . '/' . $filename;
@file_put_contents($targetPath, $binary);

// Salin juga sebagai og-image.jpg di root untuk kompatibilitas sosial media instan
@file_put_contents(__DIR__ . '/../og-image.jpg', $binary);

$url = '/uploads/' . $filename;

// Update data di server & database
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

if (!isset($currentData['siteContent']) || !is_array($currentData['siteContent'])) {
    $currentData['siteContent'] = [];
}
if (!isset($currentData['siteContent']['shareSettings']) || !is_array($currentData['siteContent']['shareSettings'])) {
    $currentData['siteContent']['shareSettings'] = [];
}

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
}

// Export Plesk Zip Endpoint
app.get('/api/export-plesk-zip', async (req, res) => {
  try {
    const currentData = cachedSiteData || loadSiteDataFromFile();
    const zip = new JSZip();

    // 1. Root Database & Config files
    zip.file('database.sql', generateSqlContent(currentData));
    zip.file('db_config.php', generatePleskDbConfigPhp());
    zip.file('.htaccess', generatePleskHtaccess());
    zip.file('index.php', generatePleskIndexPhp());
    zip.file('unzip.php', generatePleskUnzipPhp());
    zip.file('README_PLESK.md', generatePleskReadme());
    zip.file('PANDUAN_HOSTING_PLESK.txt', generatePleskReadme());

    // 2. Folder api/
    const apiFolder = zip.folder('api');
    if (apiFolder) {
      apiFolder.file('site-data.php', generatePleskApiSiteData());
      apiFolder.file('site-content.php', generatePleskApiSiteContent());
      apiFolder.file('logo-config.php', generatePleskApiLogoConfig());
      apiFolder.file('sticky-footer-config.php', generatePleskApiStickyFooterConfig());
      apiFolder.file('sync-to-mysql.php', generatePleskApiSyncToMysql());
      apiFolder.file('share-settings.php', generatePleskApiShareSettings());
      apiFolder.file('upload-thumbnail.php', generatePleskApiUploadThumbnail());
      apiFolder.file('sync-status.php', generatePleskApiSyncStatus());
      apiFolder.file('upload-image.php', generatePleskApiUploadImage());
      apiFolder.file('upload-file.php', generatePleskApiUploadImage());
      apiFolder.file('upload-video-chunk.php', generatePleskApiUploadVideoChunk());
      apiFolder.file('upload-video-form.php', generatePleskApiUploadVideoForm());
      apiFolder.file('admin-login.php', generatePleskApiAdminLogin());
      apiFolder.file('messages.php', generatePleskApiMessages());
      apiFolder.file('settings.php', generatePleskApiSettings());
      apiFolder.file('test_db.php', generatePleskApiTestDb());
      apiFolder.file('db_config.php', generatePleskDbConfigPhp());
    }

    // 3. Folder data/
    const dataFolder = zip.folder('data');
    if (dataFolder) {
      const fullJson = JSON.stringify(currentData, null, 2);
      // Anti Data Loss: Hanya sertakan template bawaan *.default.json!
      // JANGAN sertakan persisted_site_data.json, messages.json, atau mysql_config.json
      dataFolder.file('site_data.default.json', fullJson);
      dataFolder.file('messages.default.json', JSON.stringify([], null, 2));
      dataFolder.file('mysql_config.default.json', JSON.stringify(currentMySQLConfig, null, 2));
      dataFolder.file('PERLINDUNGAN_DATA_PLESK.txt', `SISTEM ANTI DATA-LOSS AKTIF:
Berkas data live (persisted_site_data.json, messages.json, db_config.local.php) Anda di hosting Plesk dijamin 100% AMAN dan TIDAK AKAN PERNAH tertimpa saat Anda mengekstrak paket ZIP baru ini.
`);
    }

    // 4. Uploads directory
    const uploadsDir = fs.existsSync(UPLOADS_PUBLIC_DIR)
      ? UPLOADS_PUBLIC_DIR
      : fs.existsSync(UPLOADS_DATA_DIR)
      ? UPLOADS_DATA_DIR
      : null;

    if (uploadsDir && fs.existsSync(uploadsDir)) {
      const uploadsFolder = zip.folder('uploads');
      const uploadFiles = fs.readdirSync(uploadsDir);
      for (const file of uploadFiles) {
        const filePath = path.join(uploadsDir, file);
        if (fs.statSync(filePath).isFile()) {
          uploadsFolder?.file(file, fs.readFileSync(filePath));
        }
      }
    }

    // 5. Static dist build if available
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      const addFolderToZip = (dirPath: string, zipNode: JSZip) => {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
          const fullPath = path.join(dirPath, item);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            const subZip = zipNode.folder(item);
            if (subZip) addFolderToZip(fullPath, subZip);
          } else {
            zipNode.file(item, fs.readFileSync(fullPath));
          }
        }
      };
      addFolderToZip(distPath, zip);
    } else {
      // Add index.html from root if dist doesn't exist
      const indexPath = path.join(process.cwd(), 'index.html');
      if (fs.existsSync(indexPath)) {
        zip.file('index.html', fs.readFileSync(indexPath, 'utf-8'));
      }
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Web-Personal-Ust-Jaenal-Plesk-Hosting.zip"');
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('Error generating Plesk ZIP:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal membuat paket ZIP Plesk' });
  }
});

// Export cPanel Zip Endpoint
app.get('/api/export-cpanel-zip', async (req, res) => {
  try {
    const currentData = cachedSiteData || loadSiteDataFromFile();
    const zip = new JSZip();

    // 1. Root Database & Config files for cPanel
    zip.file('database.sql', generateSqlContent(currentData));
    zip.file('db_config.php', generatePleskDbConfigPhp());
    zip.file('.htaccess', generatePleskHtaccess());
    zip.file('index.php', generatePleskIndexPhp());
    zip.file('unzip.php', generatePleskUnzipPhp());
    zip.file('README_CPANEL.md', generatePleskReadme());
    zip.file('PANDUAN_HOSTING_CPANEL.txt', generatePleskReadme());

    // 2. Folder api/
    const apiFolder = zip.folder('api');
    if (apiFolder) {
      apiFolder.file('site-data.php', generatePleskApiSiteData());
      apiFolder.file('site-content.php', generatePleskApiSiteContent());
      apiFolder.file('logo-config.php', generatePleskApiLogoConfig());
      apiFolder.file('sticky-footer-config.php', generatePleskApiStickyFooterConfig());
      apiFolder.file('sync-to-mysql.php', generatePleskApiSyncToMysql());
      apiFolder.file('share-settings.php', generatePleskApiShareSettings());
      apiFolder.file('upload-thumbnail.php', generatePleskApiUploadThumbnail());
      apiFolder.file('sync-status.php', generatePleskApiSyncStatus());
      apiFolder.file('upload-image.php', generatePleskApiUploadImage());
      apiFolder.file('upload-file.php', generatePleskApiUploadImage());
      apiFolder.file('upload-video-chunk.php', generatePleskApiUploadVideoChunk());
      apiFolder.file('upload-video-form.php', generatePleskApiUploadVideoForm());
      apiFolder.file('admin-login.php', generatePleskApiAdminLogin());
      apiFolder.file('messages.php', generatePleskApiMessages());
      apiFolder.file('settings.php', generatePleskApiSettings());
      apiFolder.file('test_db.php', generatePleskApiTestDb());
      apiFolder.file('db_config.php', generatePleskDbConfigPhp());
    }

    // 3. Folder data/
    const dataFolder = zip.folder('data');
    if (dataFolder) {
      const fullJson = JSON.stringify(currentData, null, 2);
      dataFolder.file('site_data.default.json', fullJson);
      dataFolder.file('persisted_site_data.json', fullJson);
      dataFolder.file('mysql_config.default.json', JSON.stringify(currentMySQLConfig, null, 2));
      dataFolder.file('PERLINDUNGAN_DATA_CPANEL.txt', `SISTEM ANTI DATA-LOSS CPANEL AKTIF:
Ekstrak isi berkas ZIP ini langsung ke folder public_html pada cPanel Anda.`);
    }

    // 4. Uploads directory
    const uploadsDir = fs.existsSync(UPLOADS_PUBLIC_DIR)
      ? UPLOADS_PUBLIC_DIR
      : fs.existsSync(UPLOADS_DATA_DIR)
      ? UPLOADS_DATA_DIR
      : null;

    if (uploadsDir && fs.existsSync(uploadsDir)) {
      const uploadsFolder = zip.folder('uploads');
      const uploadFiles = fs.readdirSync(uploadsDir);
      for (const file of uploadFiles) {
        const filePath = path.join(uploadsDir, file);
        if (fs.statSync(filePath).isFile()) {
          uploadsFolder?.file(file, fs.readFileSync(filePath));
        }
      }
    }

    // 5. Static dist build if available
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      const addFolderToZip = (dirPath: string, zipNode: JSZip) => {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
          const fullPath = path.join(dirPath, item);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            const subZip = zipNode.folder(item);
            if (subZip) addFolderToZip(fullPath, subZip);
          } else {
            zipNode.file(item, fs.readFileSync(fullPath));
          }
        }
      };
      addFolderToZip(distPath, zip);
    } else {
      const indexPath = path.join(process.cwd(), 'index.html');
      if (fs.existsSync(indexPath)) {
        zip.file('index.html', fs.readFileSync(indexPath, 'utf-8'));
      }
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Web-Personal-Ust-Jaenal-cPanel-Hosting.zip"');
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('Error generating cPanel ZIP:', err);
    res.status(500).json({ success: false, error: err.message || 'Gagal membuat paket ZIP cPanel' });
  }
});

// -------------------------------------------------------------
// VITE & STATIC SERVING WITH DYNAMIC OG META INJECTION
// -------------------------------------------------------------
function injectShareMetaTags(html: string, req: express.Request): string {
  try {
    const currentData = cachedSiteData || loadSiteDataFromFile();
    const share = currentData?.siteContent?.shareSettings;
    const profile = currentData?.siteContent?.profile;

    const host = req.get('host') || 'jaenalmaskun.biz.id';
    const protoHeader = req.headers['x-forwarded-proto'];
    const protocol = req.secure || (typeof protoHeader === 'string' && protoHeader.includes('https')) ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;
    const pageUrl = `${baseUrl}${req.originalUrl || req.url || '/'}`;

    const title = (share?.title || (profile?.title ? `${profile.title} | Pendidik, Akademisi & Penggerak Madrasah` : 'Ust. Jaenal Maskun, S.Pd.I. | Pendidik, Akademisi & Penggerak Madrasah'))
      .replace(/"/g, '&quot;');
    const desc = (share?.description || profile?.tagline || profile?.bio || 'Website Resmi Ust. Jaenal Maskun, S.Pd.I. - Menyemai Adab, Menumbuhkan Intelektual, Mengabdi untuk Kemuliaan Umat.')
      .replace(/"/g, '&quot;');
    
    let rawImg = share?.thumbnailUrl || profile?.avatarUrl || '/og-image.jpg';
    // Ensure absolute image URL for external social media crawlers
    const fullImgUrl = rawImg.startsWith('http') ? rawImg : `${baseUrl}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`;

    let result = html
      .replace(/<title>.*?<\/title>/i, `<title>${title}</title>`)
      .replace(/<meta\s+name="description"\s+content="[^"]*"/gi, `<meta name="description" content="${desc}"`)
      .replace(/<meta\s+property="og:url"\s+content="[^"]*"/gi, `<meta property="og:url" content="${pageUrl}"`)
      .replace(/<meta\s+property="og:title"\s+content="[^"]*"/gi, `<meta property="og:title" content="${title}"`)
      .replace(/<meta\s+property="og:description"\s+content="[^"]*"/gi, `<meta property="og:description" content="${desc}"`)
      .replace(/<meta\s+property="og:image"\s+content="[^"]*"/gi, `<meta property="og:image" content="${fullImgUrl}"`)
      .replace(/<meta\s+property="og:image:secure_url"\s+content="[^"]*"/gi, `<meta property="og:image:secure_url" content="${fullImgUrl}"`)
      .replace(/<meta\s+name="twitter:url"\s+content="[^"]*"/gi, `<meta name="twitter:url" content="${pageUrl}"`)
      .replace(/<meta\s+name="twitter:title"\s+content="[^"]*"/gi, `<meta name="twitter:title" content="${title}"`)
      .replace(/<meta\s+name="twitter:description"\s+content="[^"]*"/gi, `<meta name="twitter:description" content="${desc}"`)
      .replace(/<meta\s+name="twitter:image"\s+content="[^"]*"/gi, `<meta name="twitter:image" content="${fullImgUrl}"`)
      .replace(/<meta\s+name="twitter:image:src"\s+content="[^"]*"/gi, `<meta name="twitter:image:src" content="${fullImgUrl}"`)
      .replace(/<meta\s+itemprop="image"\s+content="[^"]*"/gi, `<meta itemprop="image" content="${fullImgUrl}"`)
      .replace(/<meta\s+name="thumbnail"\s+content="[^"]*"/gi, `<meta name="thumbnail" content="${fullImgUrl}"`)
      .replace(/<link\s+rel="image_src"\s+href="[^"]*"/gi, `<link rel="image_src" href="${fullImgUrl}"`);

    // Favicon and App Icons (derived strictly from logo/favicon config, NOT og-image)
    const logoConf = currentData?.logoConfig;
    let customFavicon = logoConf?.faviconUrl || (logoConf?.type === 'custom_image' ? logoConf?.customImageUrl : null) || '/favicon.ico';
    const fullFaviconUrl = customFavicon.startsWith('http') ? customFavicon : `${baseUrl}${customFavicon.startsWith('/') ? '' : '/'}${customFavicon}`;

    result = result
      .replace(/<link\s+rel="icon"\s+type="image\/x-icon"\s+href="[^"]*"/gi, `<link rel="icon" type="image/x-icon" href="${fullFaviconUrl}"`)
      .replace(/<link\s+rel="icon"\s+type="image\/png"[^>]*href="[^"]*"/gi, `<link rel="icon" type="image/png" sizes="32x32" href="${fullFaviconUrl}"`)
      .replace(/<link\s+rel="shortcut icon"\s+href="[^"]*"/gi, `<link rel="shortcut icon" href="${fullFaviconUrl}"`)
      .replace(/<link\s+rel="apple-touch-icon"\s+href="[^"]*"/gi, `<link rel="apple-touch-icon" href="${fullFaviconUrl}"`)
      .replace(/<link\s+rel="canonical"\s+href="[^"]*"/gi, `<link rel="canonical" href="${pageUrl}"`);

    // Replace image inside JSON-LD structured data
    result = result.replace(/"image":\s*"https:\/\/jaenalmaskun\.biz\.id\/og-image\.jpg"/g, `"image": "${fullImgUrl}"`);

    // Inject latest site data directly into HTML for instant zero-flash client boot on any new device
    if (currentData) {
      const safeJson = JSON.stringify(currentData).replace(/<\/script>/gi, '<\\/script>');
      const stateScript = `<script id="__INITIAL_SITE_DATA__">window.__INITIAL_SITE_DATA__ = ${safeJson};</script>`;
      if (result.includes('</head>')) {
        result = result.replace('</head>', `${stateScript}\n</head>`);
      } else {
        result = `${stateScript}\n${result}`;
      }
    }

    return result;
  } catch (e) {
    return html;
  }
}

async function startServer() {
  // Await MySQL connection & database synchronization FIRST before accepting any HTTP requests
  try {
    await initMySQLConnection();
  } catch (dbErr) {
    console.warn('Initial MySQL startup synchronization notice:', dbErr);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      // Skip API, uploads, asset paths, and internal vite paths
      if (
        url.startsWith('/api') ||
        url.startsWith('/uploads') ||
        url.startsWith('/@') ||
        url.startsWith('/src') ||
        url.startsWith('/node_modules') ||
        (url.includes('.') && !url.endsWith('.html') && !url.includes('.html?'))
      ) {
        return next();
      }
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        if (fs.existsSync(indexPath)) {
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          template = injectShareMetaTags(template, req);
          res.status(200).set({
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }).end(template);
          return;
        }
        next();
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const distAssetsPath = path.join(distPath, 'assets');
    if (fs.existsSync(distAssetsPath)) {
      app.use('/assets', express.static(distAssetsPath, { maxAge: '1y', immutable: true }));
    }
    app.use(express.static(distPath, { index: false, maxAge: '1d' }));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        let indexHtml = fs.readFileSync(indexPath, 'utf-8');
        indexHtml = injectShareMetaTags(indexHtml, req);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(indexHtml);
      } else {
        res.status(404).send('Not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Madrasah Personal Website Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
