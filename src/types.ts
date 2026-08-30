export interface ProfileInfo {
  name: string;
  arabicName: string;
  title: string;
  degrees: string;
  role: string;
  institution: string;
  tagline: string;
  bio: string;
  motto: string;
  location: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  socials: {
    whatsapp?: string;
    youtube?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
  stats: {
    label: string;
    value: string;
    subtext: string;
  }[];
}

export interface Publication {
  id: string;
  title: string;
  category: 'Buku' | 'Jurnal & Riset' | 'Modul Pembelajaran' | 'Opini & Artikel' | 'Buku & Referensi' | 'Jurnal Ilmiah' | 'Panduan Guru';
  year: string;
  publisher: string;
  description: string;
  tags: string[];
  featured?: boolean;
  downloadUrl?: string;
  downloadCount?: number;
  isActive?: boolean;
  videoUrl?: string;
  directUrl?: string;
  mediaType?: 'pdf' | 'video' | 'audio' | 'article' | 'book';
}

export interface Experience {
  id: string;
  period: string;
  role: string;
  organization: string;
  type: 'Pendidikan' | 'Pengabdian' | 'Organisasi' | 'Kepemimpinan' | 'Kemenag';
  description: string;
  achievements?: string[];
  isActive?: boolean;
}

export type ExperienceItem = Experience;

export interface AgendaItem {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: 'Kajian Kitab' | 'Pelatihan Guru' | 'Seminar Nasional' | 'Bimbingan Santri' | 'Workshop Kurikulum' | 'Kajian Rutin' | string;
  status: 'Akan Datang' | 'Rutin' | 'Selesai' | string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  imageUrl?: string;
  description?: string;
}

export interface Quote {
  id: string;
  arabicText: string;
  translation: string;
  source: string;
  theme: string;
}

export type QuoteItem = Quote;

export interface GalleryItem {
  id: string;
  title: string;
  category: 'Kegiatan Belajar' | 'Pelatihan Guru' | 'Kajian & Doa' | 'Penghargaan' | 'Kegiatan Santri' | 'Dokumentasi Madrasah' | string;
  description: string;
  image: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video';
}

export interface HeaderLogoConfig {
  type: 'custom_image' | 'monogram' | 'preset_emblem';
  customImageUrl?: string;
  monogramText: string;
  brandName: string;
  badgeText: string;
  taglineText: string;
  shape: 'rounded' | 'circle' | 'square' | 'shield' | 'rectangle' | 'transparent';
  borderStyle: 'gold' | 'emerald' | 'none';
  showTagline: boolean;
  showBadge: boolean;
  size?: 'compact' | 'normal' | 'large' | 'extralarge';
  fitMode?: 'contain' | 'cover' | 'auto';
  backgroundColor?: 'dark' | 'white' | 'transparent' | 'emerald';
  faviconUrl?: string;
  footerLogoUrl?: string;
  footerLogoType?: 'sync_header' | 'custom' | 'monogram';
  footerLogoMode?: 'match_header' | 'custom';
  blendMode?: 'normal' | 'multiply' | 'screen' | 'darken' | 'transparent_blend';
  footerBlendMode?: 'normal' | 'multiply' | 'screen' | 'darken' | 'transparent_blend';
  autoRemoveWhiteBg?: boolean;
  zoomLevel?: number; // 100 to 140 scale zoom to maximize circular logo to the edges
}

export interface EducationItem {
  year: string;
  degree: string;
  institution: string;
  focus?: string;
  field?: string;
}

export interface CorePillarItem {
  id?: string;
  title: string;
  arabic: string;
  desc: string;
  icon: string;
}

export type PillarItem = CorePillarItem;

export interface MediaChannelAccount {
  id: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'other';
  channelName: string;
  channelHandle?: string;
  channelUrl: string;
  avatarUrl?: string;
  subscribersOrFollowers?: string;
  description?: string;
  isPrimary?: boolean;
}

export interface YouTubeChannelVideo {
  id: string;
  videoId?: string;
  title: string;
  description?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  platform?: 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'drive' | 'mp4' | 'other';
  publishedAt?: string;
  publishedDate?: string;
  channelTitle?: string;
  channelName?: string;
  views?: string;
  viewsCount?: string;
  duration?: string;
  isLive?: boolean;
}

export interface YouTubeChannelConfig {
  enabled?: boolean;
  channelId?: string;
  playlistId?: string;
  channelHandle?: string;
  channelTitle?: string;
  channelUrl?: string;
  autoFetch?: boolean;
  limit?: number;
  videos?: YouTubeChannelVideo[];
  channels?: MediaChannelAccount[];
  lastFetched?: number;
  lastFetchedAt?: string;
}

export interface SectionVisibilityConfig {
  hero: boolean;
  about: boolean;
  pillars: boolean;
  publications: boolean;
  experience: boolean;
  agenda: boolean;
  islamicTools: boolean;
  gallery: boolean;
  youtubeChannel?: boolean;
  contact: boolean;
}

export interface HeroSettings {
  badgeText: string;
  greetingTitle: string;
  greetingSub: string;
  showStats: boolean;
  showDownloadCV: boolean;
  heroImage?: string;
  photoBadgeText?: string;
}

export interface SocialShareSettings {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  authorName?: string;
  badgeText?: string;
}

export interface AdminAccount {
  username: string;
  email: string;
  name: string;
  role: string;
  lastPasswordChange?: string | number;
}

export interface SiteContentConfig {
  profile: ProfileInfo;
  education: EducationItem[];
  pillars: CorePillarItem[];
  quotes: Quote[];
  publications: Publication[];
  experience: Experience[];
  agenda: AgendaItem[];
  agendaCategories?: string[];
  gallery: GalleryItem[];
  youtubeChannel?: YouTubeChannelConfig;
  youtubeVideos?: YouTubeChannelVideo[];
  mediaChannels?: MediaChannelAccount[];
  visibility: SectionVisibilityConfig;
  heroSettings: HeroSettings;
  shareSettings?: SocialShareSettings;
}

export interface StickyFooterItem {
  id: string;
  label: string;
  sectionId: string;
  icon: string;
  badgeText?: string;
  badgeColor?: 'gold' | 'emerald' | 'rose' | 'blue' | 'purple';
  visible: boolean;
  linkType?: 'section' | 'url';
  url?: string;
  isExternal?: boolean;
  externalUrl?: string;
  openInNewTab?: boolean;
}

export interface StickyFooterConfig {
  enabled: boolean;
  showOnDesktop?: boolean;
  showOnMobile?: boolean;
  position: 'floating' | 'bottom';
  theme: 'emerald_gold' | 'dark_emerald' | 'navy_gold' | 'light_modern' | 'amber_gold' | 'monochrome_dark';
  maxWidth: 'max-w-xl' | 'max-w-3xl' | 'max-w-4xl' | 'max-w-5xl' | 'max-w-full';
  showLabels: boolean;
  showBadges: boolean;
  allowCollapse: boolean;
  collapseDefault: boolean;
  collapseText: string;
  showAdminButton: boolean;
  adminButtonText: string;
  showQuickLogoButton: boolean;
  showAudioButton: boolean;
  showEditShortcut: boolean;
  items: StickyFooterItem[];
}

export interface BackupStats {
  publicationsCount: number;
  agendasCount: number;
  galleryCount: number;
  messagesCount: number;
  pillarsCount: number;
  quotesCount: number;
  educationCount: number;
  experienceCount: number;
}

export interface BackupSnapshot {
  id: string;
  timestamp: number;
  dateFormatted: string;
  source: 'auto' | 'manual' | 'restore';
  label: string;
  sizeBytes?: number;
  stats?: BackupStats;
  data?: {
    siteContent?: SiteContentConfig;
    logoConfig?: HeaderLogoConfig;
    stickyFooterConfig?: StickyFooterConfig;
    lastUpdated?: number;
  };
}

export interface FullBackupBundle {
  version: string;
  app: string;
  exportedAt: string;
  timestamp: number;
  data: {
    siteContent: SiteContentConfig;
    logoConfig: HeaderLogoConfig;
    stickyFooterConfig: StickyFooterConfig;
    lastUpdated: number;
  };
  messages?: any[];
  adminProfile?: {
    username: string;
    email: string;
    name: string;
  };
  stats: BackupStats;
}



