/**
 * mediaBackupHelper.ts
 * Utilitas komprehensif untuk mengamankan seluruh aset media website
 * (Foto Profil, Foto Hero, Galeri Foto, Sampul Karya & Modul PDF, Flyer Agenda,
 * Logo Header, Favicon, serta Sticky Footer) ke dalam berkas cadangan mandiri.
 * 
 * Memastikan tidak ada aset yang hilang dan 100% tampil di Android, Desktop, maupun Server Hosting.
 */

// Cache sementara saat sesi backup berjalan agar URL yang sama tidak diunduh berulang
const base64Cache = new Map<string, string>();

/**
 * Konversi URL gambar atau berkas dokumen (relatif / absolute / blob) menjadi Base64 Data URL
 */
export async function convertUrlToBase64(url: string, timeoutMs = 4500): Promise<string | null> {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Sudah berupa Data URL Base64
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Cek cache
  if (base64Cache.has(trimmed)) {
    return base64Cache.get(trimmed)!;
  }

  // 1. Coba fetch langsung via fetch API + FileReader
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(trimmed, { signal: controller.signal, mode: 'cors' });
    clearTimeout(timer);

    if (res.ok) {
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve((reader.result as string) || trimmed);
        };
        reader.onerror = () => resolve(trimmed);
        reader.readAsDataURL(blob);
      });

      if (base64 && base64.startsWith('data:')) {
        base64Cache.set(trimmed, base64);
        return base64;
      }
    }
  } catch (err) {
    // Fetch gagal / dibatasi, lanjutkan ke metode fallback
  }

  // 2. Fallback khusus file gambar via HTMLImageElement dan Canvas
  const isLikelyImage = /\.(jpg|jpeg|png|webp|gif|svg|ico)(\?.*)?$/i.test(trimmed) ||
    trimmed.includes('/uploads/') ||
    trimmed.includes('avatar') ||
    trimmed.includes('hero') ||
    trimmed.includes('logo');

  if (isLikelyImage && typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const dataUrl = await new Promise<string>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        const timer = setTimeout(() => resolve(trimmed), timeoutMs);

        img.onload = () => {
          clearTimeout(timer);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width || 400;
            canvas.height = img.naturalHeight || img.height || 400;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(trimmed);
            ctx.drawImage(img, 0, 0);

            let mime = 'image/jpeg';
            if (trimmed.toLowerCase().endsWith('.png')) mime = 'image/png';
            else if (trimmed.toLowerCase().endsWith('.webp')) mime = 'image/webp';

            const generated = canvas.toDataURL(mime, 0.9);
            resolve(generated);
          } catch (e) {
            resolve(trimmed);
          }
        };

        img.onerror = () => {
          clearTimeout(timer);
          resolve(trimmed);
        };

        img.src = trimmed;
      });

      if (dataUrl && dataUrl.startsWith('data:')) {
        base64Cache.set(trimmed, dataUrl);
        return dataUrl;
      }
    } catch (e) {
      // Abaikan fallback canvas jika gagal
    }
  }

  return trimmed;
}

/**
 * Cek apakah sebuah string merupakan URL / path berkas media yang perlu disematkan
 */
function isMediaUrlString(val: any, keyName = ''): boolean {
  if (typeof val !== 'string' || !val) return false;
  const str = val.trim();
  if (str.startsWith('data:')) return false;

  const lowerKey = keyName.toLowerCase();
  const knownMediaKeys = [
    'avatarurl', 'avatar', 'heroimage', 'imageurl', 'image', 'coverurl', 'cover',
    'logourl', 'customlogourl', 'faviconurl', 'flyerurl', 'flyer', 'iconurl', 'icon',
    'pdfurl', 'downloadurl', 'thumbnailurl', 'thumbnail', 'bannerurl', 'banner',
    'photourl', 'backgroundimage', 'badgeicon', 'profileimage'
  ];

  if (knownMediaKeys.includes(lowerKey)) {
    return str.length > 2 && (str.startsWith('/') || str.startsWith('http') || str.includes('.'));
  }

  return /\.(jpg|jpeg|png|webp|gif|svg|ico|pdf|bmp)(\?.*)?$/i.test(str) ||
    str.startsWith('/uploads/') ||
    str.startsWith('uploads/') ||
    str.startsWith('/assets/uploads/');
}

/**
 * Pemindaian mendalam dan rekursif untuk menyematkan SEMUA media di seluruh struktur data
 */
export async function deepEmbedAllMedia(
  rootObj: any,
  onProgress?: (msg: string) => void
): Promise<{ result: any; embeddedCount: number }> {
  let embeddedCount = 0;
  base64Cache.clear();

  async function traverseAndEmbed(target: any, currentPath = ''): Promise<any> {
    if (!target) return target;

    if (Array.isArray(target)) {
      const newArr = [];
      for (let i = 0; i < target.length; i++) {
        newArr.push(await traverseAndEmbed(target[i], `${currentPath}[${i}]`));
      }
      return newArr;
    }

    if (typeof target === 'object') {
      const newObj: Record<string, any> = {};
      const entries = Object.entries(target);

      for (const [key, value] of entries) {
        if (typeof value === 'string' && isMediaUrlString(value, key)) {
          onProgress?.(`Menyematkan media: ${key} (${value.split('/').pop() || value})...`);
          const base64 = await convertUrlToBase64(value);
          if (base64 && base64.startsWith('data:')) {
            newObj[key] = base64;
            embeddedCount++;
          } else {
            newObj[key] = value;
          }
        } else if (typeof value === 'object' && value !== null) {
          newObj[key] = await traverseAndEmbed(value, `${currentPath}.${key}`);
        } else {
          newObj[key] = value;
        }
      }
      return newObj;
    }

    return target;
  }

  const result = await traverseAndEmbed(rootObj);
  return { result, embeddedCount };
}

/**
 * Menyematkan seluruh foto & media dalam konfigurasi situs menjadi Base64 Data URL secara utuh
 */
export async function embedMediaInSiteData(
  siteContent: any,
  logoConfig?: any,
  stickyFooterConfig?: any,
  onProgress?: (msg: string) => void
): Promise<{
  siteContent: any;
  logoConfig: any;
  stickyFooterConfig: any;
  inlinedMediaCount: number;
}> {
  onProgress?.('Memeriksa dan memindai seluruh aset media website...');

  // Bundel sementara untuk dipindai secara menyeluruh
  const bundle = {
    siteContent: siteContent ? JSON.parse(JSON.stringify(siteContent)) : {},
    logoConfig: logoConfig ? JSON.parse(JSON.stringify(logoConfig)) : {},
    stickyFooterConfig: stickyFooterConfig ? JSON.parse(JSON.stringify(stickyFooterConfig)) : {}
  };

  const { result: embeddedBundle, embeddedCount } = await deepEmbedAllMedia(bundle, onProgress);

  return {
    siteContent: embeddedBundle.siteContent,
    logoConfig: embeddedBundle.logoConfig,
    stickyFooterConfig: embeddedBundle.stickyFooterConfig,
    inlinedMediaCount: embeddedCount
  };
}

/**
 * Rekursif: Mengembalikan URL media dari peta berkas ZIP ke dalam struktur data
 */
export function deepResolveMediaUrls(target: any, mediaMap: Record<string, string>): any {
  if (!target || typeof mediaMap !== 'object' || Object.keys(mediaMap).length === 0) {
    return target;
  }

  const resolveSingle = (val: string): string => {
    if (typeof val !== 'string' || !val) return val;
    if (val.startsWith('data:')) return val;

    // 1. Cek kecocokan langsung
    if (mediaMap[val]) return mediaMap[val];

    // 2. Cek nama berkas saja (misal: avatar-jaenal.jpg)
    const baseName = val.split('/').pop()?.split('?')[0] || '';
    if (baseName && mediaMap[baseName]) return mediaMap[baseName];

    // 3. Cek decoded uri
    try {
      const decoded = decodeURIComponent(val);
      if (mediaMap[decoded]) return mediaMap[decoded];
      const decodedBase = decoded.split('/').pop()?.split('?')[0] || '';
      if (decodedBase && mediaMap[decodedBase]) return mediaMap[decodedBase];
    } catch (e) {}

    // 4. Cek varian awalan slash
    const noLeadingSlash = val.replace(/^\/+/, '');
    if (mediaMap[noLeadingSlash]) return mediaMap[noLeadingSlash];
    if (mediaMap[`/${noLeadingSlash}`]) return mediaMap[`/${noLeadingSlash}`];

    return val;
  };

  if (Array.isArray(target)) {
    return target.map((item) => deepResolveMediaUrls(item, mediaMap));
  }

  if (typeof target === 'object' && target !== null) {
    const res: Record<string, any> = {};
    for (const [key, val] of Object.entries(target)) {
      if (typeof val === 'string' && isMediaUrlString(val, key)) {
        res[key] = resolveSingle(val);
      } else if (typeof val === 'object' && val !== null) {
        res[key] = deepResolveMediaUrls(val, mediaMap);
      } else {
        res[key] = val;
      }
    }
    return res;
  }

  return target;
}

/**
 * Konversi Base64 string kembali ke Binary Uint8Array untuk dimasukkan ke dalam arsip ZIP
 */
export function base64ToUint8Array(base64DataUrl: string): { data: Uint8Array; ext: string; mime: string } | null {
  try {
    if (typeof base64DataUrl !== 'string' || !base64DataUrl.startsWith('data:')) {
      return null;
    }
    const parts = base64DataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    let ext = 'jpg';
    if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('svg')) ext = 'svg';
    else if (mime.includes('gif')) ext = 'gif';
    else if (mime.includes('pdf')) ext = 'pdf';
    else if (mime.includes('icon') || mime.includes('ico')) ext = 'ico';

    const binaryStr = atob(parts[1]);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return { data: bytes, ext, mime };
  } catch (e) {
    return null;
  }
}

/**
 * Mengumpulkan seluruh berkas media fisik dari data untuk dikemas ke dalam folder uploads/ berkas ZIP
 */
export function collectAllMediaAssetsForZip(
  siteContent: any,
  logoConfig?: any,
  stickyFooterConfig?: any
): Array<{ filename: string; data: Uint8Array }> {
  const assets: Array<{ filename: string; data: Uint8Array }> = [];
  const addedSignatures = new Set<string>();

  const addAsset = (dataUrl: string | undefined, preferredName: string) => {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return;
    const bin = base64ToUint8Array(dataUrl);
    if (!bin) return;

    // Hindari duplikasi konten biner yang sama persis
    const sig = `${bin.data.length}_${bin.ext}_${dataUrl.slice(0, 40)}`;
    if (addedSignatures.has(sig)) return;
    addedSignatures.add(sig);

    const safeName = preferredName.endsWith(`.${bin.ext}`) ? preferredName : `${preferredName}.${bin.ext}`;
    assets.push({ filename: safeName, data: bin.data });
  };

  const content = siteContent || {};

  // 1. Profil & Avatar
  if (content.profile?.avatarUrl) {
    addAsset(content.profile.avatarUrl, 'avatar-jaenal');
  }
  if (content.profile?.coverUrl) {
    addAsset(content.profile.coverUrl, 'profile-cover');
  }
  if (content.profile?.bannerUrl) {
    addAsset(content.profile.bannerUrl, 'profile-banner');
  }

  // 2. Hero Image & Background
  if (content.heroSettings?.heroImage) {
    addAsset(content.heroSettings.heroImage, 'hero-jaenal');
  }
  if (content.heroSettings?.backgroundImage) {
    addAsset(content.heroSettings.backgroundImage, 'hero-background');
  }
  if (content.heroSettings?.badgeIcon) {
    addAsset(content.heroSettings.badgeIcon, 'hero-badge-icon');
  }

  // 3. Logo Header & Favicon
  const logo = logoConfig || {};
  if (logo.logoUrl) {
    addAsset(logo.logoUrl, 'logo-header');
  }
  if (logo.customLogoUrl) {
    addAsset(logo.customLogoUrl, 'custom-logo-header');
  }
  if (logo.faviconUrl) {
    addAsset(logo.faviconUrl, 'favicon');
  }

  // 4. Sticky Footer
  const footer = stickyFooterConfig || {};
  if (footer.logoUrl) {
    addAsset(footer.logoUrl, 'logo-footer');
  }
  if (footer.iconUrl) {
    addAsset(footer.iconUrl, 'footer-icon');
  }

  // 5. Galeri Foto Kegiatan
  if (Array.isArray(content.gallery)) {
    content.gallery.forEach((g: any, idx: number) => {
      if (g?.imageUrl) {
        addAsset(g.imageUrl, `gallery_${idx + 1}`);
      }
      if (g?.thumbnailUrl) {
        addAsset(g.thumbnailUrl, `gallery_thumb_${idx + 1}`);
      }
    });
  }

  // 6. Karya / Modul & PDF
  if (Array.isArray(content.publications)) {
    content.publications.forEach((p: any, idx: number) => {
      if (p?.coverUrl) {
        addAsset(p.coverUrl, `karya_cover_${idx + 1}`);
      }
      if (p?.pdfUrl) {
        addAsset(p.pdfUrl, `karya_modul_${idx + 1}`);
      }
      if (p?.downloadUrl) {
        addAsset(p.downloadUrl, `karya_unduhan_${idx + 1}`);
      }
    });
  }

  // 7. Agenda & Jadwal Kajian
  if (Array.isArray(content.agenda)) {
    content.agenda.forEach((a: any, idx: number) => {
      if (a?.flyerUrl) {
        addAsset(a.flyerUrl, `agenda_flyer_${idx + 1}`);
      }
      if (a?.bannerUrl) {
        addAsset(a.bannerUrl, `agenda_banner_${idx + 1}`);
      }
    });
  }

  // 8. Pilar & Nilai
  if (Array.isArray(content.pillars)) {
    content.pillars.forEach((pil: any, idx: number) => {
      if (pil?.iconUrl) {
        addAsset(pil.iconUrl, `pilar_icon_${idx + 1}`);
      }
    });
  }

  // 9. Artikel / Berita
  if (Array.isArray(content.articles)) {
    content.articles.forEach((art: any, idx: number) => {
      if (art?.coverUrl) {
        addAsset(art.coverUrl, `artikel_cover_${idx + 1}`);
      }
      if (art?.imageUrl) {
        addAsset(art.imageUrl, `artikel_img_${idx + 1}`);
      }
    });
  }

  // 10. Testimoni
  if (Array.isArray(content.testimonials)) {
    content.testimonials.forEach((t: any, idx: number) => {
      if (t?.avatarUrl) {
        addAsset(t.avatarUrl, `testimoni_avatar_${idx + 1}`);
      }
    });
  }

  // 11. Pemindaian sisa Base64 yang belum tertangkap
  let genericIdx = 1;
  const scanRemainingBase64 = (obj: any) => {
    if (!obj) return;
    if (Array.isArray(obj)) {
      obj.forEach(scanRemainingBase64);
    } else if (typeof obj === 'object') {
      for (const val of Object.values(obj)) {
        if (typeof val === 'string' && val.startsWith('data:')) {
          addAsset(val, `media_asset_${genericIdx++}`);
        } else if (typeof val === 'object') {
          scanRemainingBase64(val);
        }
      }
    }
  };

  scanRemainingBase64(content);
  scanRemainingBase64(logo);
  scanRemainingBase64(footer);

  return assets;
}
