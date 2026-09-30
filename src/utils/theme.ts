import {
  AppThemeSettings,
  ThemeId,
  FontFamilyId,
  FontSizeId,
  AccentColorId,
} from '../types';

export const THEME_STORAGE_KEY = 'restoran_theme_settings_v1';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  shortName: string;
  tagline: string;
  badge: string;
  previewColors: {
    bg: string;
    card: string;
    border: string;
    text: string;
    accent: string;
  };
}

export interface FontOption {
  id: FontFamilyId;
  name: string;
  family: string;
  category: string;
  badge: string;
  description: string;
  sampleText: string;
}

export interface FontSizeOption {
  id: FontSizeId;
  name: string;
  scale: string;
  scalePercent: string;
  description: string;
  badge: string;
}

export interface AccentOption {
  id: AccentColorId;
  name: string;
  hex: string;
  hoverHex: string;
  bgHex: string;
  borderHex: string;
  badge: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark-obsidian',
    name: 'Koyu Obsidyen (Gece)',
    shortName: 'Obsidyen Gece',
    tagline: 'Dengeli koyu gri ve karbon tonları (Klasik)',
    badge: 'Varsayılan',
    previewColors: {
      bg: '#0f1115',
      card: '#161b22',
      border: '#30363d',
      text: '#f0f6fc',
      accent: '#f97316',
    },
  },
  {
    id: 'midnight-black',
    name: 'Kömür & Asil Siyah',
    shortName: 'Onyx Siyah',
    tagline: 'Ultra derin OLED siyahı ve maksimum kontrast',
    badge: 'OLED Dostu',
    previewColors: {
      bg: '#050505',
      card: '#111111',
      border: '#262626',
      text: '#ffffff',
      accent: '#fbbf24',
    },
  },
  {
    id: 'deep-navy',
    name: 'Finans & Derin Lacivert',
    shortName: 'Gece Mavisi',
    tagline: 'Kurumsal banka, safir ve gece mavisi zarafeti',
    badge: 'Kurumsal',
    previewColors: {
      bg: '#0a0f1d',
      card: '#0f172a',
      border: '#334155',
      text: '#f8fafc',
      accent: '#38bdf8',
    },
  },
  {
    id: 'warm-bistro',
    name: 'Sıcak Bistro & Espresso',
    shortName: 'Sıcak Ahşap',
    tagline: 'Kahve, sıcak ahşap ve amber tonlarında samimi restoran havası',
    badge: 'Bistro & Kafe',
    previewColors: {
      bg: '#14100e',
      card: '#1c1613',
      border: '#42352d',
      text: '#fbf7f4',
      accent: '#f59e0b',
    },
  },
  {
    id: 'emerald-nordic',
    name: 'Zümrüt Kasa & İskandinav',
    shortName: 'Zümrüt Orman',
    tagline: 'Huzurlu koyu çam, nane ve ferah kasa tonları',
    badge: 'Doğal & Dingin',
    previewColors: {
      bg: '#07150e',
      card: '#0d2217',
      border: '#1b4b35',
      text: '#ecfdf5',
      accent: '#10b981',
    },
  },
  {
    id: 'clean-light',
    name: 'Aydınlık & Modern Açık',
    shortName: 'Gündüz Beyaz',
    tagline: 'Göz yormayan ferah beyaz ve açık gri kurumsal stil',
    badge: 'Açık Mod',
    previewColors: {
      bg: '#f8fafc',
      card: '#ffffff',
      border: '#cbd5e1',
      text: '#0f172a',
      accent: '#ea580c',
    },
  },
];

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'inter',
    name: 'Inter Modern Sans',
    family: '"Inter", sans-serif',
    category: 'Modern Sans',
    badge: 'Standart',
    description: 'En popüler modern kullanıcı arayüzü yazı tipi. Dengeli ve yüksek netlik.',
    sampleText: 'Günlük Ciro: 48.750,00 ₺ • Garanti POS: 32.140,50 ₺',
  },
  {
    id: 'jakarta',
    name: 'Plus Jakarta Sans',
    family: '"Plus Jakarta Sans", sans-serif',
    category: 'Kurumsal Sans',
    badge: 'Önerilen',
    description: 'Zarif kıvrımlara sahip premium geometrik kurumsal tipografi.',
    sampleText: 'Kasa Dengesi: +1.250,00 ₺ • Kasa Gideri: 8.400,00 ₺',
  },
  {
    id: 'jetbrains',
    name: 'JetBrains Mono',
    family: '"JetBrains Mono", monospace',
    category: 'Teknik Mono',
    badge: 'Sayı & Rapor',
    description: 'Finansal rakamlar, Z-Raporları ve sayısal tablolar için kusursuz monospace.',
    sampleText: 'Z-NO: 0148 | NET SATIŞ: 62.400,00 ₺ | KASA: TAM',
  },
  {
    id: 'outfit',
    name: 'Outfit Geometric',
    family: '"Outfit", sans-serif',
    category: 'Dinamik Geometrik',
    badge: 'Canlı & Modern',
    description: 'Yumuşak hatlı, modern ve enerjik restoran menü & POS tasarımı.',
    sampleText: 'Masa 14: Kuver 4 Kişi • Toplam Hesap: 3.840,00 ₺',
  },
  {
    id: 'firacode',
    name: 'Fira Code Numeral',
    family: '"Fira Code", monospace',
    category: 'Muhasebe Mono',
    badge: 'Tablo Odaklı',
    description: 'Muhasebe dökümleri ve hassas finansal girişler için optimize edilmiş font.',
    sampleText: '125.400,00 ₺ + 4.250,50 ₺ = 129.650,50 ₺ (DEVİR)',
  },
  {
    id: 'playfair',
    name: 'Playfair Display Serif',
    family: '"Playfair Display", Georgia, serif',
    category: 'Klasik Serif',
    badge: 'Lüks Restoran',
    description: 'Fine-dining, gurme ve klasik şık restoran atmosferi için asil serif font.',
    sampleText: 'A la Carte Gelirleri & Özel Ziyafet Kasa Mutabakatı',
  },
];

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  {
    id: 'compact',
    name: 'Kompakt (Küçük)',
    scale: '0.88',
    scalePercent: '%88',
    description: 'Yoğun veri tabloları ve küçük ekranlarda maksimum içerik sığdırma.',
    badge: 'Kompakt',
  },
  {
    id: 'normal',
    name: 'Standart (Normal)',
    scale: '1',
    scalePercent: '%100',
    description: 'Tüm cihazlar ve günlük muhasebe için ideal dengeli varsayılan boyut.',
    badge: 'Varsayılan',
  },
  {
    id: 'relaxed',
    name: 'Geniş (Rahat Okuma)',
    scale: '1.08',
    scalePercent: '%108',
    description: 'Gözü yormayan ferah satır aralıkları ve rahat okunabilirlik.',
    badge: 'Konforlu',
  },
  {
    id: 'large',
    name: 'Büyük (POS / Dokunmatik)',
    scale: '1.18',
    scalePercent: '%118',
    description: 'Dokunmatik ekranlar, kasa başı kullanımı ve yüksek görünürlük.',
    badge: 'Büyük Metin',
  },
];

export const ACCENT_OPTIONS: AccentOption[] = [
  {
    id: 'orange',
    name: 'Restoran Turuncusu',
    hex: '#f97316',
    hoverHex: '#ea580c',
    bgHex: 'rgba(249, 115, 22, 0.15)',
    borderHex: 'rgba(249, 115, 22, 0.35)',
    badge: 'Klasik',
  },
  {
    id: 'emerald',
    name: 'Zümrüt & Kasa Yeşili',
    hex: '#10b981',
    hoverHex: '#059669',
    bgHex: 'rgba(16, 185, 129, 0.15)',
    borderHex: 'rgba(16, 185, 129, 0.35)',
    badge: 'Finans',
  },
  {
    id: 'blue',
    name: 'Safir & Finans Mavisi',
    hex: '#3b82f6',
    hoverHex: '#2563eb',
    bgHex: 'rgba(59, 130, 246, 0.15)',
    borderHex: 'rgba(59, 130, 246, 0.35)',
    badge: 'Güven',
  },
  {
    id: 'amber',
    name: 'Sıcak Altın / Amber',
    hex: '#f59e0b',
    hoverHex: '#d97706',
    bgHex: 'rgba(245, 158, 11, 0.15)',
    borderHex: 'rgba(245, 158, 11, 0.35)',
    badge: 'Sıcak',
  },
  {
    id: 'rose',
    name: 'Gül & Yakut Kırmızı',
    hex: '#f43f5e',
    hoverHex: '#e11d48',
    bgHex: 'rgba(244, 63, 94, 0.15)',
    borderHex: 'rgba(244, 63, 94, 0.35)',
    badge: 'Canlı',
  },
  {
    id: 'indigo',
    name: 'Asil İndigo & Mor',
    hex: '#6366f1',
    hoverHex: '#4f46e5',
    bgHex: 'rgba(99, 102, 241, 0.15)',
    borderHex: 'rgba(99, 102, 241, 0.35)',
    badge: 'Teknolojik',
  },
];

export const DEFAULT_THEME_SETTINGS: AppThemeSettings = {
  themeId: 'clean-light',
  fontFamilyId: 'inter',
  fontSizeId: 'normal',
  accentColorId: 'orange',
};

export function loadThemeSettings(): AppThemeSettings {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_THEME_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      themeId: parsed.themeId || DEFAULT_THEME_SETTINGS.themeId,
      fontFamilyId: parsed.fontFamilyId || DEFAULT_THEME_SETTINGS.fontFamilyId,
      fontSizeId: parsed.fontSizeId || DEFAULT_THEME_SETTINGS.fontSizeId,
      accentColorId: parsed.accentColorId || DEFAULT_THEME_SETTINGS.accentColorId,
    };
  } catch (e) {
    console.error('Failed to load theme settings', e);
    return DEFAULT_THEME_SETTINGS;
  }
}

export function saveThemeSettings(settings: AppThemeSettings): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings));
    applyThemeToDOM(settings);
  } catch (e) {
    console.error('Failed to save theme settings', e);
  }
}

export function applyThemeToDOM(settings: AppThemeSettings): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Set data-theme attribute
  root.setAttribute('data-theme', settings.themeId);
  root.setAttribute('data-font', settings.fontFamilyId);
  root.setAttribute('data-size', settings.fontSizeId);
  root.setAttribute('data-accent', settings.accentColorId);

  // Apply font family directly
  const selectedFont = FONT_OPTIONS.find((f) => f.id === settings.fontFamilyId);
  if (selectedFont) {
    root.style.setProperty('--app-font-family', selectedFont.family);
    if (document.body) {
      document.body.style.setProperty('--app-font-family', selectedFont.family);
      document.body.style.fontFamily = selectedFont.family;
    }
  }

  // Apply font size scale
  const selectedSize = FONT_SIZE_OPTIONS.find((s) => s.id === settings.fontSizeId);
  if (selectedSize) {
    root.style.setProperty('--app-font-scale', selectedSize.scale);
  }

  // Apply accent colors
  const selectedAccent = ACCENT_OPTIONS.find((a) => a.id === settings.accentColorId);
  if (selectedAccent) {
    root.style.setProperty('--app-accent-color', selectedAccent.hex);
    root.style.setProperty('--app-accent-hover', selectedAccent.hoverHex);
    root.style.setProperty('--app-accent-bg', selectedAccent.bgHex);
    root.style.setProperty('--app-accent-border', selectedAccent.borderHex);
    if (document.body) {
      document.body.style.setProperty('--app-accent-color', selectedAccent.hex);
      document.body.style.setProperty('--app-accent-hover', selectedAccent.hoverHex);
      document.body.style.setProperty('--app-accent-bg', selectedAccent.bgHex);
      document.body.style.setProperty('--app-accent-border', selectedAccent.borderHex);
    }
  }
}
