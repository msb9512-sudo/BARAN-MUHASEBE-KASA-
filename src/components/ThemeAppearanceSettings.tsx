import React, { useState, useEffect } from 'react';
import {
  Palette,
  Type,
  Maximize2,
  Sparkles,
  Check,
  RotateCcw,
  Sun,
  Moon,
  Zap,
  Sliders,
  Eye,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import {
  AppThemeSettings,
  ThemeId,
  FontFamilyId,
  FontSizeId,
  AccentColorId,
} from '../types';
import {
  THEME_OPTIONS,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  ACCENT_OPTIONS,
  DEFAULT_THEME_SETTINGS,
  loadThemeSettings,
  saveThemeSettings,
  applyThemeToDOM,
} from '../utils/theme';

interface ThemeAppearanceSettingsProps {
  onSettingsChanged?: (settings: AppThemeSettings) => void;
}

export const ThemeAppearanceSettings: React.FC<ThemeAppearanceSettingsProps> = ({
  onSettingsChanged,
}) => {
  const [themeSettings, setThemeSettings] = useState<AppThemeSettings>(() => loadThemeSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Apply immediately when loaded
  useEffect(() => {
    applyThemeToDOM(themeSettings);
  }, []);

  const handleUpdateTheme = (themeId: ThemeId) => {
    const updated = { ...themeSettings, themeId };
    setThemeSettings(updated);
    saveThemeSettings(updated);
    if (onSettingsChanged) onSettingsChanged(updated);
    showSuccessToast();
  };

  const handleUpdateFont = (fontFamilyId: FontFamilyId) => {
    const updated = { ...themeSettings, fontFamilyId };
    setThemeSettings(updated);
    saveThemeSettings(updated);
    if (onSettingsChanged) onSettingsChanged(updated);
    showSuccessToast();
  };

  const handleUpdateSize = (fontSizeId: FontSizeId) => {
    const updated = { ...themeSettings, fontSizeId };
    setThemeSettings(updated);
    saveThemeSettings(updated);
    if (onSettingsChanged) onSettingsChanged(updated);
    showSuccessToast();
  };

  const handleUpdateAccent = (accentColorId: AccentColorId) => {
    const updated = { ...themeSettings, accentColorId };
    setThemeSettings(updated);
    saveThemeSettings(updated);
    if (onSettingsChanged) onSettingsChanged(updated);
    showSuccessToast();
  };

  const handleResetToDefaults = () => {
    setThemeSettings(DEFAULT_THEME_SETTINGS);
    saveThemeSettings(DEFAULT_THEME_SETTINGS);
    if (onSettingsChanged) onSettingsChanged(DEFAULT_THEME_SETTINGS);
    showSuccessToast();
  };

  const showSuccessToast = () => {
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2200);
  };

  const currentTheme = THEME_OPTIONS.find((t) => t.id === themeSettings.themeId) || THEME_OPTIONS[0];
  const currentFont = FONT_OPTIONS.find((f) => f.id === themeSettings.fontFamilyId) || FONT_OPTIONS[0];
  const currentSize = FONT_SIZE_OPTIONS.find((s) => s.id === themeSettings.fontSizeId) || FONT_SIZE_OPTIONS[1];
  const currentAccent = ACCENT_OPTIONS.find((a) => a.id === themeSettings.accentColorId) || ACCENT_OPTIONS[0];

  return (
    <div className="space-y-8 select-none">
      {/* Top Banner / Info & Reset Bar */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 shrink-0">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1 font-mono">
              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block animate-pulse"></span>
              <span>KİŞİSELLEŞTİRİLEBİLİR GÖRÜNÜM STÜDYOSU</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Tema, Tipografi & Yazı Boyutu Tercihleri
            </h3>
            <p className="text-xs text-gray-400 mt-1 max-w-2xl">
              Göz zevkinize ve çalışma ortamınıza göre arayüzün rengini, yazı tipini ve boyutunu özelleştirin. Seçimleriniz anında tüm sisteme uygulanır ve cihazınızda kaydedilir.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start md:self-auto shrink-0">
          {savedSuccess && (
            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono font-bold flex items-center space-x-1.5 animate-pulse">
              <Check className="w-3.5 h-3.5" />
              <span>Kaydedildi</span>
            </div>
          )}
          <button
            onClick={handleResetToDefaults}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-gray-300 hover:text-white text-xs font-mono transition cursor-pointer"
            title="Varsayılan Tema ve Fontlara Dön"
          >
            <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
            <span>Varsayılana Sıfırla</span>
          </button>
        </div>
      </div>

      {/* 1. SECTION: TEMA SEÇİMİ (6 RENK PALETİ) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-orange-500/15 text-orange-400">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                1. Renk Teması ({THEME_OPTIONS.length} Seçenek)
              </h4>
              <p className="text-[11px] text-gray-400">
                Karanlık, OLED, Gece Mavisi, Sıcak Ahşap veya Aydınlık modları arasından seçin.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold text-orange-400 px-2.5 py-1 bg-orange-500/10 rounded-lg border border-orange-500/20">
            Aktif: {currentTheme.name}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {THEME_OPTIONS.map((theme) => {
            const isSelected = themeSettings.themeId === theme.id;
            return (
              <button
                key={theme.id}
                id={`theme-card-${theme.id}`}
                onClick={() => handleUpdateTheme(theme.id)}
                className={`relative p-4 rounded-2xl text-left transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-gradient-to-b from-orange-500/15 to-[#161b22] border-orange-500 shadow-lg shadow-orange-500/10 scale-[1.01]'
                    : 'bg-[#161b22] hover:bg-[#21262d] border-[#30363d] hover:border-gray-500'
                }`}
              >
                {/* Header & Badges */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white font-mono">
                      {theme.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-[#21262d] text-gray-400 border border-[#30363d]">
                      {theme.badge}
                    </span>
                  </div>
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-gray-600 bg-[#0d1117]" />
                  )}
                </div>

                {/* Theme Visual Preview Box */}
                <div
                  className="rounded-xl p-3 mb-3 border transition flex flex-col justify-between h-20 shadow-inner"
                  style={{
                    backgroundColor: theme.previewColors.bg,
                    borderColor: theme.previewColors.border,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                      style={{
                        backgroundColor: theme.previewColors.card,
                        color: theme.previewColors.text,
                        borderColor: theme.previewColors.border,
                        borderWidth: 1,
                      }}
                    >
                      Kasa: 48.750 ₺
                    </div>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.previewColors.accent }}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <div
                      className="h-2 rounded flex-1"
                      style={{ backgroundColor: theme.previewColors.card }}
                    />
                    <div
                      className="h-2 w-8 rounded"
                      style={{ backgroundColor: theme.previewColors.accent }}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 font-mono leading-relaxed line-clamp-2">
                  {theme.tagline}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SECTION: YAZI TİPLERİ (6 FARKLI FONT) */}
      <div className="space-y-4 pt-4 border-t border-[#30363d]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-orange-500/15 text-orange-400">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                2. Yazı Tipi & Tipografi ({FONT_OPTIONS.length} Yazı Tipi)
              </h4>
              <p className="text-[11px] text-gray-400">
                Sayısal netlik, kurumsal modern veya klasik restoran karakterine uygun fontlar.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold text-orange-400 px-2.5 py-1 bg-orange-500/10 rounded-lg border border-orange-500/20">
            Aktif: {currentFont.name}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FONT_OPTIONS.map((font) => {
            const isSelected = themeSettings.fontFamilyId === font.id;
            return (
              <button
                key={font.id}
                id={`font-card-${font.id}`}
                onClick={() => handleUpdateFont(font.id)}
                className={`relative p-4 rounded-2xl text-left transition-all cursor-pointer border flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-b from-orange-500/15 to-[#161b22] border-orange-500 shadow-lg shadow-orange-500/10 scale-[1.01]'
                    : 'bg-[#161b22] hover:bg-[#21262d] border-[#30363d] hover:border-gray-500'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white" style={{ fontFamily: font.family }}>
                        {font.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#21262d] text-gray-400 border border-[#30363d]">
                        {font.badge}
                      </span>
                    </div>
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-gray-600 bg-[#0d1117] shrink-0" />
                    )}
                  </div>

                  <p className="text-[11px] text-gray-400 font-mono mb-3">
                    {font.description}
                  </p>
                </div>

                {/* Live Font Sample Showcase */}
                <div
                  className="p-2.5 rounded-xl bg-[#0d1117] border border-[#30363d]/80 text-gray-200 text-xs mt-1"
                  style={{ fontFamily: font.family }}
                >
                  <div className="font-semibold text-orange-400 text-[13px] mb-0.5">
                    123.456,78 ₺ • Z-Raporu
                  </div>
                  <div className="text-[11px] text-gray-400 truncate">
                    {font.sampleText}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. SECTION: YAZI BOYUTU (4 FARKLI ÖLÇEK) & AKSAN RENKLERİ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-[#30363d]">
        {/* Font Sizes */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-orange-500/15 text-orange-400">
              <Maximize2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                3. Yazı Boyutu & Ölçek
              </h4>
              <p className="text-[11px] text-gray-400">
                Ekran yoğunluğunu ve yazıların genel büyüklüğünü ayarlayın.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {FONT_SIZE_OPTIONS.map((size) => {
              const isSelected = themeSettings.fontSizeId === size.id;
              return (
                <button
                  key={size.id}
                  id={`font-size-${size.id}`}
                  onClick={() => handleUpdateSize(size.id)}
                  className={`p-3 rounded-xl text-left transition cursor-pointer border ${
                    isSelected
                      ? 'bg-orange-500/20 border-orange-500 text-white shadow-md'
                      : 'bg-[#0d1117] hover:bg-[#21262d] border-[#30363d] text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs">{size.name}</span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#21262d] text-orange-300">
                      {size.scalePercent}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono line-clamp-2">
                    {size.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent Colors */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-orange-500/15 text-orange-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                4. Vurgu & Aksan Rengi
              </h4>
              <p className="text-[11px] text-gray-400">
                Butonlar, grafikler ve odak alanlarında kullanılan ana renk.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {ACCENT_OPTIONS.map((accent) => {
              const isSelected = themeSettings.accentColorId === accent.id;
              return (
                <button
                  key={accent.id}
                  id={`accent-color-${accent.id}`}
                  onClick={() => handleUpdateAccent(accent.id)}
                  style={
                    isSelected
                      ? {
                          borderColor: accent.hex,
                          backgroundColor: `${accent.hex}18`,
                          boxShadow: `0 0 12px ${accent.hex}30`,
                        }
                      : {}
                  }
                  className={`p-2.5 rounded-xl text-left transition cursor-pointer border flex flex-col items-center justify-center space-y-1.5 ${
                    isSelected
                      ? 'shadow-md ring-1'
                      : 'bg-[#0d1117] hover:bg-[#21262d] border-[#30363d]'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shadow-md transition transform group-hover:scale-110"
                    style={{ backgroundColor: accent.hex }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </div>
                  <span
                    className="text-[11px] font-mono truncate font-semibold"
                    style={isSelected ? { color: accent.hex } : { color: '#e2e8f0' }}
                  >
                    {accent.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. SECTION: CANLI ANLIK ÖNİZLEME VİTRİNİ (LIVE PREVIEW WIDGET) */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-orange-500/15 text-orange-400">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Canlı Önizleme Vitrini (Seçimlerinizin Canlı Hali)
            </h4>
            <p className="text-[11px] text-gray-400">
              Şu an seçtiğiniz tema, font, boyut ve renklerin uygulama içi görünümü:
            </p>
          </div>
        </div>

        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 sm:p-5 space-y-4 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#30363d]">
            <div className="flex items-center space-x-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow"
                style={{ backgroundColor: currentAccent.hex }}
              >
                K
              </div>
              <div>
                <h5 className="font-bold text-white text-sm">
                  Restoran Kasa & Finansal Özet Paneli
                </h5>
                <span className="text-xs text-gray-400 font-mono">
                  Font: {currentFont.name} • Ölçek: {currentSize.scalePercent} • Tema: {currentTheme.name}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Kasa Dengede</span>
              </span>
            </div>
          </div>

          {/* Cards preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5">
              <div className="text-[11px] text-gray-400 uppercase">Toplam Günlük Ciro</div>
              <div className="text-lg font-bold text-white mt-1">48.750,00 ₺</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">+%12 Geçen Haftaya Göre</div>
            </div>

            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5">
              <div className="text-[11px] text-gray-400 uppercase">POS Kredi Kartı Toplamı</div>
              <div className="text-lg font-bold text-white mt-1">36.420,50 ₺</div>
              <div className="text-[10px] text-gray-400 mt-0.5">3 Banka Terminali</div>
            </div>

            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5">
              <div className="text-[11px] text-gray-400 uppercase">Kasa Nakit Mevcudu</div>
              <div
                className="text-lg font-bold mt-1"
                style={{ color: currentAccent.hex }}
              >
                12.329,50 ₺
              </div>
              <div className="text-[10px] text-orange-400 mt-0.5">Fiili Sayım Tam</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
