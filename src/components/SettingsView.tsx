import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Stamp,
  CreditCard,
  Tag,
  Save,
  Check,
  Plus,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  FileText,
  RotateCcw,
  Sparkles,
  Calendar,
  ShieldAlert,
  Database,
  X,
  Palette,
  Search,
  ChevronRight,
  ChevronDown,
  Sliders,
  Layers,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { PosDevice, ExpenseCategory, DailyEntry, CashExpense, Invoice } from '../types';
import { RestaurantProfile } from '../utils/storage';
import { formatDateTR, formatCurrency, getTodayIsoDate } from '../utils/formatters';
import { ThemeAppearanceSettings } from './ThemeAppearanceSettings';
import { SoftwareUpdateSection } from './SoftwareUpdateSection';

export type SettingsSectionId =
  | 'kase'
  | 'pos'
  | 'categories'
  | 'appearance'
  | 'system_day'
  | 'system_bulk'
  | 'update'
  | 'cloud';

export interface SettingsSubGroup {
  id: string;
  title: string;
  shortTitle: string;
  badgeText: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  items: {
    id: SettingsSectionId;
    label: string;
    shortLabel: string;
    subtext: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }[];
}

interface SettingsViewProps {
  posDevices: PosDevice[];
  onUpdatePosDevices: (devices: PosDevice[]) => void;
  categories: ExpenseCategory[];
  onUpdateCategories: (categories: ExpenseCategory[]) => void;
  profile: RestaurantProfile;
  onUpdateProfile: (profile: RestaurantProfile) => void;
  onResetData: () => void;
  entries?: Record<string, DailyEntry>;
  expenses?: CashExpense[];
  invoices?: Invoice[];
  selectedDate?: string;
  onResetAllFinancialData?: () => void;
  onResetSingleDay?: (date: string) => void;
  initialSection?: SettingsSectionId;
  activeSection?: SettingsSectionId;
  onSectionChange?: (section: SettingsSectionId) => void;
  onNavigate?: (tab: any) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  posDevices,
  onUpdatePosDevices,
  categories,
  onUpdateCategories,
  profile,
  onUpdateProfile,
  onResetData,
  entries = {},
  expenses = [],
  invoices = [],
  selectedDate = getTodayIsoDate(),
  onResetAllFinancialData,
  onResetSingleDay,
  initialSection = 'kase',
  activeSection: propActiveSection,
  onSectionChange,
  onNavigate,
}) => {
  const [internalSection, setInternalSection] = useState<SettingsSectionId>(initialSection);
  const activeSection = propActiveSection !== undefined ? propActiveSection : internalSection;

  const setActiveSection = (sec: SettingsSectionId) => {
    setInternalSection(sec);
    if (onSectionChange) {
      onSectionChange(sec);
    }
  };

  const [searchFilter, setSearchFilter] = useState('');
  const [profileForm, setProfileForm] = useState<RestaurantProfile>({
    ...profile,
    companyTitle: profile.companyTitle || profile.name || '',
    taxOffice: profile.taxOffice || '',
    taxNumber: profile.taxNumber || '',
    tradeRegistryNo: profile.tradeRegistryNo || '',
    mersisNo: profile.mersisNo || '',
    address: profile.address || '',
    stampText: profile.stampText || '',
  });

  const [devicesList, setDevicesList] = useState<PosDevice[]>(posDevices);
  const [categoriesList, setCategoriesList] = useState<ExpenseCategory[]>(categories);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Day reset state
  const [targetDayToReset, setTargetDayToReset] = useState<string>(selectedDate || getTodayIsoDate());

  // Modal Confirmation State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'single_day' | 'clean_install' | 'factory_reset';
    targetDate?: string;
    title: string;
    description: string;
    impacts: string[];
    confirmButtonText: string;
  } | null>(null);

  // Sub-groups definition
  const subGroups: SettingsSubGroup[] = useMemo(() => [
    {
      id: 'corporate',
      title: '1. Kurumsal & Firma Tanımları',
      shortTitle: 'Kurumsal',
      badgeText: 'Kurumsal',
      description: 'Resmi şirket kimliği, kaşe bilgisi, banka POS cihazları ve gider kategorileri',
      icon: Building2,
      items: [
        {
          id: 'kase',
          label: 'Şirket Ünvanı & Kaşe Bilgisi',
          shortLabel: 'Firma & Kaşe',
          subtext: 'Resmi ünvan, VKN, adres ve mühür',
          icon: Stamp,
        },
        {
          id: 'pos',
          label: 'Banka POS Cihazları',
          shortLabel: 'POS Cihazları',
          subtext: 'Terminal Z raporu cihaz tanımları',
          icon: CreditCard,
          badge: devicesList.length,
        },
        {
          id: 'categories',
          label: 'Gider & Masraf Kategorileri',
          shortLabel: 'Gider Kategorileri',
          subtext: 'Kasa harcaması sınıflandırma etiketleri',
          icon: Tag,
          badge: categoriesList.length,
        },
      ],
    },
    {
      id: 'ui',
      title: '2. Arayüz & Görünüm Tercihleri',
      shortTitle: 'Görünüm',
      badgeText: 'Arayüz',
      description: 'Karanlık/aydınlık tema, yazı tipleri, punto ve sistem vurgu renkleri',
      icon: Palette,
      items: [
        {
          id: 'appearance',
          label: 'Görünüm, Tema & Yazı Tipi',
          shortLabel: 'Tema & Font',
          subtext: 'Koyu/açık mod, font ailesi & renkler',
          icon: Palette,
        },
      ],
    },
    {
      id: 'maintenance',
      title: '3. Veri Yönetimi & Sistem Bakımı',
      shortTitle: 'Sistem',
      badgeText: 'Bakım',
      description: 'Gün bazlı kasa sıfırlama, test verisi temizleme ve tam fabrika ayarlarına dönme',
      icon: ShieldAlert,
      items: [
        {
          id: 'system_day',
          label: 'Gün Gün Sıfırlama & Temizlik',
          shortLabel: 'Günlük Sıfırlama',
          subtext: 'Seçili bir günün kayıtlarını sıfırlama',
          icon: Calendar,
          badge: `${Object.keys(entries).length} Gün`,
        },
        {
          id: 'system_bulk',
          label: 'Temiz Kurulum & Fabrika Sıfırlaması',
          shortLabel: 'Toplu Sıfırlama',
          subtext: 'Tüm hareketleri sil veya fabrika ayarları',
          icon: RotateCcw,
        },
        {
          id: 'update',
          label: 'Yazılım Güncelleme',
          shortLabel: 'Yazılım Güncelle',
          subtext: 'GitHub sürüm denetimi ve otomatik güncelleme',
          icon: RefreshCw,
        },
      ],
    },
    {
      id: 'cloud',
      title: '4. Bulut & Google Drive Entegrasyonu',
      shortTitle: 'Bulut & Yedek',
      badgeText: 'Google Bulut',
      description: 'Google Drive ve Google E-Tablolar çift yönlü veri senkronizasyonu ve otomatik yedekleme',
      icon: Sparkles,
      items: [
        {
          id: 'cloud',
          label: 'Google Workspace (Drive & Sheets)',
          shortLabel: 'Bulut Senkron',
          subtext: 'Drive yedekleme & Google Sheets senkronizasyonu',
          icon: Sparkles,
        },
      ],
    },
  ], [devicesList.length, categoriesList.length, entries]);

  // Current active group and item
  const currentGroup = useMemo(() => {
    return subGroups.find((g) => g.items.some((item) => item.id === activeSection)) || subGroups[0];
  }, [subGroups, activeSection]);

  const currentItem = useMemo(() => {
    return currentGroup.items.find((item) => item.id === activeSection) || currentGroup.items[0];
  }, [currentGroup, activeSection]);

  // Filtered sub-groups for instant search
  const filteredSubGroups = useMemo(() => {
    if (!searchFilter.trim()) return subGroups;
    const q = searchFilter.toLowerCase();
    return subGroups.map((g) => ({
      ...g,
      items: g.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.subtext.toLowerCase().includes(q) ||
          g.title.toLowerCase().includes(q)
      ),
    })).filter((g) => g.items.length > 0);
  }, [subGroups, searchFilter]);

  // Track accordion open/closed state for sub-groups on desktop left panel
  const [expandedGroupIds, setExpandedGroupIds] = useState<Record<string, boolean>>({
    corporate: true,
    ui: true,
    maintenance: true,
    cloud: true,
  });

  // Ensure current active group is open when section changes
  useEffect(() => {
    if (currentGroup?.id) {
      setExpandedGroupIds((prev) => ({
        ...prev,
        [currentGroup.id]: true,
      }));
    }
  }, [currentGroup?.id]);

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroupIds((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleExpandAll = (expand: boolean) => {
    const updated: Record<string, boolean> = {};
    subGroups.forEach((g) => {
      updated[g.id] = expand;
    });
    setExpandedGroupIds(updated);
  };

  // Auto-generate stamp text helper
  const handleGenerateStampText = () => {
    const lines = [
      profileForm.companyTitle || profileForm.name || 'ŞİRKET ÜNVANI',
      `${profileForm.taxOffice ? profileForm.taxOffice + ' V.D. ' : ''}${profileForm.taxNumber ? 'VKN: ' + profileForm.taxNumber : ''} ${profileForm.tradeRegistryNo ? '• Tic. Sicil: ' + profileForm.tradeRegistryNo : ''}`.trim(),
      profileForm.mersisNo ? `Mersis: ${profileForm.mersisNo}` : '',
      profileForm.address || '',
      profileForm.phone ? `Tel: ${profileForm.phone}` : '',
    ].filter(Boolean);

    const generated = lines.join('\n');
    setProfileForm((prev) => ({
      ...prev,
      stampText: generated,
    }));
  };

  // Save Profile / Kaşe
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(profileForm);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Add POS
  const handleAddPos = () => {
    const newPos: PosDevice = {
      id: `pos-${Date.now()}`,
      name: `POS ${devicesList.length + 1}`,
      bankName: 'Banka Adı',
      isActive: true,
      terminalId: '00000000',
    };
    const updated = [...devicesList, newPos];
    setDevicesList(updated);
    onUpdatePosDevices(updated);
  };

  const handleUpdatePos = (idx: number, field: keyof PosDevice, val: any) => {
    const updated = [...devicesList];
    updated[idx] = { ...updated[idx], [field]: val };
    setDevicesList(updated);
    onUpdatePosDevices(updated);
  };

  const handleDeletePos = (idx: number) => {
    const updated = devicesList.filter((_, i) => i !== idx);
    setDevicesList(updated);
    onUpdatePosDevices(updated);
  };

  // Add Category
  const handleAddCategory = () => {
    const newCat: ExpenseCategory = {
      id: `cat-${Date.now()}`,
      name: 'Yeni Kategori',
      type: 'kasa',
    };
    const updated = [...categoriesList, newCat];
    setCategoriesList(updated);
    onUpdateCategories(updated);
  };

  const handleClearAllCategories = () => {
    if (window.confirm('Tüm gider kategorilerini silmek ve listeyi tamamen temizlemek istediğinize emin misiniz?')) {
      setCategoriesList([]);
      onUpdateCategories([]);
    }
  };

  const handleClearAllPos = () => {
    if (window.confirm('Tüm POS cihazı tanımlarını silmek istediğinize emin misiniz?')) {
      setDevicesList([]);
      onUpdatePosDevices([]);
    }
  };

  const handleUpdateCat = (idx: number, name: string) => {
    const updated = [...categoriesList];
    updated[idx] = { ...updated[idx], name };
    setCategoriesList(updated);
    onUpdateCategories(updated);
  };

  const handleDeleteCat = (idx: number) => {
    const updated = categoriesList.filter((_, i) => i !== idx);
    setCategoriesList(updated);
    onUpdateCategories(updated);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 sm:p-6 text-gray-200 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 shrink-0 shadow-inner">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2 text-xs font-semibold text-orange-500 uppercase tracking-wider mb-0.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
                <span>SİSTEM & KURUMSAL AYARLAR</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400 lowercase font-normal">3 alt grup / 6 modül</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {profileForm.companyTitle || profileForm.name || 'Sistem Ayarları'}
              </h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Ayarlarınız gruplandırılmıştır: Kurumsal Tanımlar, Arayüz & Görünüm ve Veri Güvenliği alt gruplarından dilediğinizi yönetebilirsiniz.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {savedSuccess && (
              <div className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-mono font-bold flex items-center space-x-2 animate-pulse">
                <Check className="w-4 h-4" />
                <span>Ayarlar Kaydedildi!</span>
              </div>
            )}
            {resetSuccessMessage && (
              <div className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-mono font-bold flex items-center space-x-2 animate-pulse">
                <Check className="w-4 h-4" />
                <span>{resetSuccessMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Ayarlar Alt Grupları - Horizontal Visual Category Selector on ALL screens */}
        <div className="mt-5 pt-4 border-t border-[#30363d] space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono text-gray-300 font-bold uppercase tracking-wider flex items-center space-x-2">
              <Layers className="w-3.5 h-3.5 text-orange-400" />
              <span>SİSTEM AYARLARI ALT GRUPLARI</span>
            </div>
            <span className="text-[11px] font-mono text-gray-400">
              {subGroups.length} ana kategori • {subGroups.reduce((acc, g) => acc + g.items.length, 0)} alt modül
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {subGroups.map((g) => {
              const isGroupActive = g.id === currentGroup.id;
              const GIcon = g.icon;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    if (g.id === 'cloud' && onNavigate) {
                      setActiveSection('cloud');
                    } else if (g.items.length > 0) {
                      setActiveSection(g.items[0].id);
                    }
                  }}
                  className={`p-3.5 rounded-2xl border text-left font-mono transition-all duration-200 cursor-pointer flex flex-col justify-between relative group ${
                    isGroupActive
                      ? 'bg-gradient-to-br from-orange-500/20 to-amber-500/10 border-orange-500 ring-2 ring-orange-500/30 text-white shadow-lg shadow-orange-500/10'
                      : 'bg-[#0d1117] hover:bg-[#21262d] border-[#30363d] text-gray-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className={`p-2 rounded-xl transition ${
                        isGroupActive
                          ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/30'
                          : 'bg-[#161b22] text-orange-400 group-hover:bg-[#30363d] group-hover:text-orange-300'
                      }`}>
                        <GIcon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs truncate text-white">{g.shortTitle}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                      isGroupActive
                        ? 'bg-orange-500/30 text-orange-200 border border-orange-500/40'
                        : 'bg-[#21262d] text-gray-400 border border-[#30363d]'
                    }`}>
                      {g.badgeText}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-mono line-clamp-2 leading-tight">
                    {g.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Sub-items under active group (Secondary tab bar) */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-2.5 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2 text-xs font-mono text-gray-400 font-bold px-1">
              <span className="text-orange-400">» {currentGroup.title}</span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400 text-[11px] font-normal">Modüller:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {currentGroup.items.map((item) => {
                const isActive = activeSection === item.id;
                const ItemIcon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center space-x-1.5 cursor-pointer border ${
                      isActive
                        ? 'bg-orange-600 text-white font-bold border-orange-500 shadow-md shadow-orange-600/30'
                        : 'bg-[#161b22] hover:bg-[#21262d] text-gray-300 hover:text-white border-[#30363d]'
                    }`}
                  >
                    <ItemIcon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-orange-400'}`} />
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-black/30 text-white' : 'bg-[#21262d] text-gray-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Layout (Grouped Sidebar on Desktop + Content Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Sub-groups Navigation (4 Cols) */}
        <div className="hidden lg:block lg:col-span-4 space-y-4">
          {/* Quick Search inside Settings */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 shadow-md">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Ayar ara... (Kaşe, POS, Tema, Sıfırla)"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 font-mono focus:border-orange-500 focus:outline-none"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Header Controls for Left Accordion: Total count + Tümünü Aç/Kapat */}
          <div className="flex items-center justify-between px-1 text-[11px] font-mono text-gray-400">
            <span className="font-bold text-gray-300">Ayar Alt Grupları ({filteredSubGroups.length})</span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleExpandAll(true)}
                className="text-[10px] text-gray-400 hover:text-orange-400 transition cursor-pointer"
                title="Tüm alt grupları genişlet"
              >
                Tümünü Aç
              </button>
              <span className="text-gray-600">/</span>
              <button
                type="button"
                onClick={() => handleExpandAll(false)}
                className="text-[10px] text-gray-400 hover:text-orange-400 transition cursor-pointer"
                title="Tüm alt grupları daralt"
              >
                Kapat
              </button>
            </div>
          </div>

          {/* Sub-groups Accordion/List */}
          {filteredSubGroups.map((group) => {
            const isThisGroupActive = group.id === currentGroup.id;
            const isGroupOpen = searchFilter.trim() ? true : (expandedGroupIds[group.id] ?? false);
            const GIcon = group.icon;

            return (
              <div
                key={group.id}
                className={`bg-[#161b22] border rounded-2xl p-4 shadow-md transition space-y-2.5 ${
                  isThisGroupActive ? 'border-orange-500/40 ring-1 ring-orange-500/20' : 'border-[#30363d]'
                }`}
              >
                {/* Group Header Button - Click toggles sub-categories open/close */}
                <button
                  type="button"
                  onClick={() => toggleGroupExpanded(group.id)}
                  className="w-full flex items-center justify-between pb-2 border-b border-[#30363d] cursor-pointer text-left group/hdr"
                  title={`${group.title} alt kategorilerini aç / kapat`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${isThisGroupActive ? 'bg-orange-500/20 text-orange-400' : 'bg-[#21262d] text-gray-400'}`}>
                      <GIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs uppercase tracking-wider text-white font-mono group-hover/hdr:text-orange-400 transition">
                        {group.title}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-mono leading-tight truncate">
                        {group.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0 pl-1">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      isThisGroupActive ? 'bg-orange-500/20 text-orange-300' : 'bg-[#21262d] text-gray-400'
                    }`}>
                      {group.badgeText}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                      isGroupOpen ? 'rotate-180 text-orange-400' : ''
                    }`} />
                  </div>
                </button>

                {/* Sub-items in this group (Collapsible) */}
                {isGroupOpen && (
                  <div className="space-y-1.5 pt-1">
                    {group.items.map((item) => {
                      const isActive = activeSection === item.id;
                      const ItemIcon = item.icon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveSection(item.id)}
                          className={`w-full text-left p-2.5 rounded-xl font-mono text-xs transition flex items-center justify-between cursor-pointer border ${
                            isActive
                              ? 'bg-orange-600 text-white font-bold border-orange-500 shadow-md shadow-orange-600/20'
                              : 'bg-[#0d1117] hover:bg-[#21262d] text-gray-300 hover:text-white border-[#30363d]'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <ItemIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-orange-400'}`} />
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{item.label}</div>
                              <div className={`text-[10px] truncate ${isActive ? 'text-orange-100' : 'text-gray-400'}`}>
                                {item.subtext}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0 pl-1">
                            {item.badge !== undefined && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                isActive ? 'bg-black/30 text-white' : 'bg-[#21262d] text-gray-400 border border-[#30363d]'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                            <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredSubGroups.length === 0 && (
            <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl text-center text-xs text-gray-400 font-mono">
              Arama kriterine uygun ayar grubu bulunamadı.
            </div>
          )}
        </div>

        {/* Right Column: Active Setting Panel (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Breadcrumb Banner */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-3 flex items-center justify-between text-xs font-mono shadow-sm">
            <div className="flex items-center space-x-2 min-w-0">
              <span className="text-gray-400 font-medium truncate">{currentGroup.title}</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="text-orange-400 font-bold truncate flex items-center gap-1.5">
                <currentItem.icon className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>{currentItem.label}</span>
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#0d1117] text-gray-400 border border-[#30363d] shrink-0">
              {currentGroup.badgeText}
            </span>
          </div>

          {/* ============================================================ */}
          {/* ALT GRUP 1: KURUMSAL & FİRMA TANIMLARI                       */}
          {/* ============================================================ */}

          {/* Item 1.1: Kaşe Bilgileri & Şirket Ünvanı */}
          {activeSection === 'kase' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Fields (2 Cols) */}
                <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl p-5 sm:p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
                    <div className="flex items-center space-x-2">
                      <Stamp className="w-4 h-4 text-orange-400" />
                      <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono">
                        Şirket & Kaşe Tanımlaması
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-gray-400">
                      * Başlıkta ve raporlarda görünecektir
                    </span>
                  </div>

                  {/* 1. Resmi Şirket Ünvanı (Firma Adı) */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-200 mb-1.5 font-mono">
                      Şirket Resmi Ünvanı / Firma Adı *
                      <span className="text-gray-400 font-normal ml-1">
                        (Üst menüde ve resmi dökümlerde görünecek isim)
                      </span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.companyTitle}
                      onChange={(e) => setProfileForm({ ...profileForm, companyTitle: e.target.value })}
                      placeholder="Örn: ANADOLU LEZZETLERİ GIDA TURİZM SAN. VE TİC. LTD. ŞTİ."
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:border-orange-500 focus:outline-none shadow-inner"
                    />
                  </div>

                  {/* 2. Tabela / Marka Adı ve Şube */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                        Tabela / İşletme Adı (Marka)
                      </label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        placeholder="Örn: Lezzet Sarayı Restoran"
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                        Şube / Lokasyon Adı
                      </label>
                      <input
                        type="text"
                        value={profileForm.branch}
                        onChange={(e) => setProfileForm({ ...profileForm, branch: e.target.value })}
                        placeholder="Örn: Kadıköy Merkez Şube"
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 3. Vergi Dairesi, Vergi No, Ticaret Sicil, Mersis No */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                        Vergi Dairesi
                      </label>
                      <input
                        type="text"
                        value={profileForm.taxOffice || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, taxOffice: e.target.value })}
                        placeholder="Örn: Kadıköy"
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                        Vergi No / TC No *
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.taxNumber}
                        onChange={(e) => setProfileForm({ ...profileForm, taxNumber: e.target.value })}
                        placeholder="Örn: 1234567890"
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                        Ticaret Sicil No
                      </label>
                      <input
                        type="text"
                        value={profileForm.tradeRegistryNo || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, tradeRegistryNo: e.target.value })}
                        placeholder="Örn: 987654"
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                        Mersis No
                      </label>
                      <input
                        type="text"
                        value={profileForm.mersisNo || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, mersisNo: e.target.value })}
                        placeholder="Örn: 012345..."
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 4. Şirket / Şube Adresi */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                      Şirket / Fatura Adresi
                    </label>
                    <input
                      type="text"
                      value={profileForm.address || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      placeholder="Örn: Caferağa Mah. Moda Cad. No:44 Kadıköy / İstanbul"
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  {/* 5. Yetkili / İletişim */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                        Sorumlu Muhasebeci / Kasiyer
                      </label>
                      <input
                        type="text"
                        value={profileForm.accountantName}
                        onChange={(e) => setProfileForm({ ...profileForm, accountantName: e.target.value })}
                        placeholder="Mehmet Muhasebeci"
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                        Telefon / WhatsApp
                      </label>
                      <input
                        type="text"
                        value={profileForm.bossPhone}
                        onChange={(e) => setProfileForm({ ...profileForm, bossPhone: e.target.value })}
                        placeholder="+90 532 000 00 00"
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                        E-Posta Adresi
                      </label>
                      <input
                        type="email"
                        value={profileForm.bossEmail}
                        onChange={(e) => setProfileForm({ ...profileForm, bossEmail: e.target.value })}
                        placeholder="patron@sirket.com"
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 6. Kaşe Metni (Textarea) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-gray-300 font-mono">
                        Kaşe Metni & Rapor Dipnotu
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateStampText}
                        className="text-[11px] font-mono text-orange-400 hover:text-orange-300 underline cursor-pointer flex items-center space-x-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Bilgilerden Otomatik Kaşe Üret</span>
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={profileForm.stampText || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, stampText: e.target.value })}
                      placeholder="Kaşe metnini buraya yazabilir veya yukarıdaki butonla otomatik üretebilirsiniz..."
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-gray-200 font-mono focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-[#30363d] flex items-center justify-between">
                    <p className="text-xs text-gray-400 font-mono">
                      Kaydettiğinizde şirket ismi üst menüde anında güncellenir.
                    </p>

                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg shadow-md transition cursor-pointer flex items-center space-x-2 font-mono text-xs"
                    >
                      <Save className="w-4 h-4" />
                      <span>Bilgileri Kaydet</span>
                    </button>
                  </div>
                </div>

                {/* Live Kaşe Stamp Preview (1 Col) */}
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center space-x-2 border-b border-[#30363d] pb-3 mb-4">
                      <Stamp className="w-4 h-4 text-orange-400" />
                      <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono">
                        Canlı Kaşe Önizlemesi
                      </h3>
                    </div>

                    <p className="text-xs text-gray-400 font-mono mb-4">
                      Aşağıdaki kaşe görseli girdiğiniz şirket bilgileriyle anlık olarak oluşturulur:
                    </p>

                    {/* Stamp Box */}
                    <div className="border-2 border-dashed border-orange-500/50 rounded-xl p-5 bg-[#0d1117] relative shadow-inner text-center font-mono space-y-2">
                      <div className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-orange-500/60 border border-orange-500/30 px-1.5 py-0.5 rounded">
                        KAŞE / MÜHÜR
                      </div>

                      <div className="text-xs font-bold text-white uppercase tracking-tight break-words pt-1">
                        {profileForm.companyTitle || profileForm.name || 'ŞİRKET ÜNVANI GİRİNİZ'}
                      </div>

                      {profileForm.name && profileForm.name !== profileForm.companyTitle && (
                        <div className="text-[11px] text-orange-400 font-semibold">
                          ({profileForm.name})
                        </div>
                      )}

                      <div className="text-[11px] text-gray-300 font-mono border-t border-[#30363d] pt-2 mt-2 space-y-0.5">
                        {profileForm.taxOffice && (
                          <div>
                            {profileForm.taxOffice} V.D. No: <strong className="text-white">{profileForm.taxNumber || '-'}</strong>
                          </div>
                        )}
                        {profileForm.tradeRegistryNo && (
                          <div>
                            Tic. Sicil No: <strong className="text-white">{profileForm.tradeRegistryNo}</strong>
                          </div>
                        )}
                        {profileForm.mersisNo && (
                          <div className="text-[10px] text-gray-400">
                            Mersis: {profileForm.mersisNo}
                          </div>
                        )}
                        {profileForm.address && (
                          <div className="text-[10px] text-gray-400 break-words mt-1">
                            {profileForm.address}
                          </div>
                        )}
                        {profileForm.bossPhone && (
                          <div className="text-[10px] text-gray-400">
                            Tel: {profileForm.bossPhone}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs text-gray-400 font-mono space-y-1.5">
                      <div className="font-semibold text-gray-200 flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-orange-400" />
                        <span>Kullanım Alanları:</span>
                      </div>
                      <ul className="list-disc list-inside text-[11px] space-y-1 text-gray-400">
                        <li>Üst başlık menüsü & ana navigasyon</li>
                        <li>Patron Raporu & WhatsApp paylaşım kartı</li>
                        <li>Aylık İcmal ve Resmi Yazdırma çıktıları</li>
                        <li>Kasa teslim & mutabakat tutanakları</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6 pt-3 border-t border-[#30363d]">
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg shadow-md transition cursor-pointer font-mono text-xs flex items-center justify-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Değişiklikleri Kaydet</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Item 1.2: POS Cihazları */}
          {activeSection === 'pos' && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 sm:p-6 shadow-xl space-y-4 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d] pb-3">
                <div>
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-orange-400" />
                    <span>Banka POS Cihazları Yönetimi ({devicesList.length})</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Günlük Z raporu mutabakatı yapılacak banka POS terminalleri
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {devicesList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllPos}
                      className="px-3 py-2 bg-[#0d1117] hover:bg-rose-950/40 text-gray-400 hover:text-rose-400 font-semibold rounded-lg text-xs border border-[#30363d] transition cursor-pointer"
                    >
                      Tüm POS'ları Sil
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleAddPos}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs shadow-md transition cursor-pointer flex items-center space-x-1.5 self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Yeni POS Ekle</span>
                  </button>
                </div>
              </div>

              {devicesList.length === 0 ? (
                <div className="p-8 rounded-lg bg-[#0d1117] border border-[#30363d] text-center text-gray-500 space-y-2">
                  <CreditCard className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-300 font-semibold text-sm">Tanımlı POS cihazı bulunmuyor</p>
                  <p className="text-xs text-gray-500">POS cihazı eklemek için yukarıdaki 'Yeni POS Ekle' butonunu kullanabilirsiniz.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {devicesList.map((device, idx) => (
                    <div
                      key={device.id || idx}
                      className="p-3.5 rounded-lg bg-[#0d1117] border border-[#30363d] flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                    >
                      <div className="flex items-center space-x-2 text-orange-400">
                        <CreditCard className="w-4 h-4 flex-shrink-0" />
                        <span className="text-xs text-gray-500 font-bold">#{idx + 1}</span>
                      </div>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={device.name}
                          onChange={(e) => handleUpdatePos(idx, 'name', e.target.value)}
                          placeholder="Cihaz Adı (Örn: POS 1 - Garanti)"
                          className="bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={device.bankName}
                          onChange={(e) => handleUpdatePos(idx, 'bankName', e.target.value)}
                          placeholder="Banka Adı (Örn: Garanti BBVA)"
                          className="bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={device.terminalId || ''}
                          onChange={(e) => handleUpdatePos(idx, 'terminalId', e.target.value)}
                          placeholder="Terminal / Seri No"
                          className="bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeletePos(idx)}
                        className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer self-end sm:self-auto"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Item 1.3: Gider Kategorileri */}
          {activeSection === 'categories' && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 sm:p-6 shadow-xl space-y-4 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d] pb-3">
                <div>
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-orange-400" />
                    <span>Kasa Gider Kategorileri ({categoriesList.length})</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Günlük nakit harcamaların sınıflandırıldığı başlıklar
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {categoriesList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllCategories}
                      className="px-3 py-2 bg-[#0d1117] hover:bg-rose-950/40 text-gray-400 hover:text-rose-400 font-semibold rounded-lg text-xs border border-[#30363d] transition cursor-pointer"
                    >
                      Tümünü Temizle
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs shadow-md transition cursor-pointer flex items-center space-x-1.5 self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Yeni Kategori Ekle</span>
                  </button>
                </div>
              </div>

              {categoriesList.length === 0 ? (
                <div className="p-8 rounded-lg bg-[#0d1117] border border-[#30363d] text-center text-gray-500 space-y-2">
                  <Tag className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-300 font-semibold text-sm">Tanımlı kategori bulunmuyor (Tertemiz Liste)</p>
                  <p className="text-xs text-gray-500">Gider girerken kategori adını serbestçe yazabilir veya '+ Yeni Kategori Ekle' butonundan ekleyebilirsiniz.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {categoriesList.map((cat, idx) => (
                    <div
                      key={cat.id || idx}
                      className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-center space-x-2"
                    >
                      <Tag className="w-4 h-4 text-orange-400 flex-shrink-0" />
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => handleUpdateCat(idx, e.target.value)}
                        className="flex-1 bg-[#161b22] border border-[#30363d] rounded px-2.5 py-1 text-xs text-white focus:border-orange-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteCat(idx)}
                        className="text-gray-500 hover:text-rose-400 p-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* ALT GRUP 2: ARAYÜZ & GÖRÜNÜM TERCİHLERİ                      */}
          {/* ============================================================ */}

          {/* Item 2.1: Görünüm, Tema & Yazı Tipi Tercihleri */}
          {activeSection === 'appearance' && (
            <ThemeAppearanceSettings />
          )}

          {/* ============================================================ */}
          {/* ALT GRUP 3: VERİ YÖNETİMİ & SİSTEM BAKIMI                    */}
          {/* ============================================================ */}

          {/* Item 3.1: Gün Gün Sıfırlama */}
          {activeSection === 'system_day' && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 sm:p-6 shadow-xl space-y-6 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d] pb-3">
                <div>
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-orange-400" />
                    <span>Gün Gün Sıfırlama (Seçili Tarihi Temizle)</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Yalnızca seçtiğiniz tarihe ait Vega hasılatını, POS dökümlerini ve kasa masraflarını sıfırlar. Diğer günleriniz etkilenmez.
                  </p>
                </div>
              </div>

              {/* Gün Seçici Kartı */}
              <div className="p-4 sm:p-5 rounded-xl bg-[#0d1117] border border-orange-500/30 space-y-4 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs uppercase tracking-wider">
                        Sıfırlanacak Tarih Seçimi
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Takvimden sıfırlamak istediğiniz tarihi belirleyin
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="date"
                      value={targetDayToReset}
                      onChange={(e) => setTargetDayToReset(e.target.value)}
                      className="bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const dayEntry = entries[targetDayToReset];
                        const dayExpenses = expenses.filter((e) => e.date === targetDayToReset);
                        const dayInvoices = invoices.filter((i) => i.date === targetDayToReset);

                        setConfirmModal({
                          isOpen: true,
                          type: 'single_day',
                          targetDate: targetDayToReset,
                          title: `${formatDateTR(targetDayToReset)} Tarihli Günü Sıfırla`,
                          description: `Seçili güne ait tüm operasyonel kayıtlar temizlenerek gün başlangıç (taslak) haline döndürülecektir.`,
                          impacts: [
                            `Vega Raporu & Ciro Tutarları (Mevcut: ${formatCurrency(dayEntry?.vegaReport?.totalSales || 0)})`,
                            `POS Z Raporları & Kredi Kartı Girişleri`,
                            `Bu tarihe ait Kasa Harcamaları (${dayExpenses.length} adet gider)`,
                            `Bu tarihe ait Faturalar (${dayInvoices.length} adet fatura)`,
                            `Diğer günlerin kayıtlarına VE şirket/kaşe/POS ayarlarınıza DOKUNULMAZ.`,
                          ],
                          confirmButtonText: `${formatDateTR(targetDayToReset)} Gününü Sıfırla`,
                        });
                      }}
                      className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Seçili Günü Sıfırla</span>
                    </button>
                  </div>
                </div>

                {/* Kayıtlı Günler Tablosu */}
                <div className="pt-3 border-t border-[#30363d]">
                  <div className="text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Sistemde İşlem Görmüş Günler:</span>
                    <span className="text-gray-500 text-[10px] font-normal">
                      ({Object.keys(entries).length} Gün Kayıtlı)
                    </span>
                  </div>

                  {Object.keys(entries).length === 0 ? (
                    <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg text-center text-xs text-gray-500">
                      Henüz kaydedilmiş bir gün bulunmuyor.
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto border border-[#30363d] rounded-lg divide-y divide-[#30363d] bg-[#161b22]">
                      {(Object.values(entries) as DailyEntry[])
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((item: DailyEntry) => {
                          const dayExpensesCount = expenses.filter((e) => e.date === item.date).length;
                          const hasData = (item.vegaReport?.totalSales || 0) > 0 || dayExpensesCount > 0 || (item.actualCashInHand || 0) > 0;

                          return (
                            <div
                              key={item.date}
                              className="p-2.5 sm:px-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#21262d] transition text-xs"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="font-bold text-white flex items-center space-x-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-orange-400" />
                                  <span>{formatDateTR(item.date)}</span>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  item.status === 'closed'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}>
                                  {item.status === 'closed' ? 'Kapatıldı' : 'Taslak'}
                                </span>
                                {hasData && (
                                  <span className="text-[11px] text-gray-400 hidden sm:inline">
                                    Ciro: <strong className="text-gray-200">{formatCurrency(item.vegaReport?.totalSales || 0)}</strong> • Gider: <strong className="text-gray-200">{dayExpensesCount} Adet</strong>
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const dayExpenses = expenses.filter((e) => e.date === item.date);
                                  const dayInvoices = invoices.filter((i) => i.date === item.date);

                                  setConfirmModal({
                                    isOpen: true,
                                    type: 'single_day',
                                    targetDate: item.date,
                                    title: `${formatDateTR(item.date)} Tarihli Günü Sıfırla`,
                                    description: `${formatDateTR(item.date)} tarihine ait kasa, ciro ve gider kayıtları sıfırlanacaktır.`,
                                    impacts: [
                                      `Vega Raporu & Ciro Tutarları (Mevcut: ${formatCurrency(item.vegaReport?.totalSales || 0)})`,
                                      `POS Z Raporları & Kredi Kartı Girişleri`,
                                      `Bu tarihe ait Kasa Harcamaları (${dayExpenses.length} adet gider)`,
                                      `Bu tarihe ait Faturalar (${dayInvoices.length} adet fatura)`,
                                    ],
                                    confirmButtonText: `${formatDateTR(item.date)} Gününü Sıfırla`,
                                  });
                                }}
                                className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-600/30 rounded text-[11px] font-bold transition cursor-pointer flex items-center space-x-1 self-end sm:self-auto"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Bu Günü Sıfırla</span>
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Item 3.2: Toplu Sıfırlama & Fabrika Ayarları */}
          {activeSection === 'system_bulk' && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 sm:p-6 shadow-xl space-y-6 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d] pb-3">
                <div>
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-orange-400" />
                    <span>Toplu Sıfırlama & Fabrika Ayarları</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Test aşaması sonrası temiz kuruluma geçebilir veya tüm sistemi ilk haline sıfırlayabilirsiniz.
                  </p>
                </div>
              </div>

              {/* 2. TOPLU SIFIRLAMA SEÇENEKLERİ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SEÇENEK A: Temiz Kurulum (Sadece Hareketleri Sıfırla - Ayarları Koru) */}
                <div className="p-4 sm:p-5 rounded-xl bg-[#0d1117] border border-emerald-500/30 flex flex-col justify-between space-y-4 shadow-md">
                  <div>
                    <div className="flex items-center space-x-2 text-emerald-400 mb-1.5">
                      <Database className="w-4 h-4" />
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                        A. Temiz Kuruluma Sıfırla (Önerilen)
                      </h4>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      Şirket Resmi Ünvanı, Kaşe bilgileri, POS Cihazları ve Gider Kategorileri <strong className="text-emerald-400">KORUNUR</strong>. Tüm test amaçlı girilen günlük kasa icmalleri, Vega raporları, masraflar ve faturalar sıfırlanır.
                    </p>
                    <div className="mt-3 p-2.5 bg-[#161b22] rounded-lg border border-[#30363d] text-[11px] space-y-1 text-gray-400">
                      <div className="text-emerald-400 font-bold flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Şirket & POS Ayarları Korunur</span>
                      </div>
                      <div>• Tüm Günlük Kasa Raporları temizlenir</div>
                      <div>• Tüm Kasa Giderleri & Faturalar temizlenir</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#30363d]">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          type: 'clean_install',
                          title: 'Temiz Kuruluma Sıfırla (Hareketleri Temizle)',
                          description: 'Test aşamasına geçmek için tüm kasa dökümleri, masraflar ve faturalar sıfırlanacaktır. Şirket kaşesi ve POS cihazlarınız korunacaktır.',
                          impacts: [
                            'Tüm Günlük Kasa & Vega Hasılat Dökümleri silinecektir.',
                            'Tüm Kasa Harcamaları & Gider Kayıtları silinecektir.',
                            'Tüm Tedarikçi Faturaları silinecektir.',
                            'ŞİRKET ÜNVANI, KAŞE, POS CİHAZLARI VE KATEGORİLER SAKLANACAKTIR.',
                          ],
                          confirmButtonText: 'Temiz Kuruluma Geç (Hareketleri Sıfırla)',
                        });
                      }}
                      className="w-full py-2.5 bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center space-x-2 shadow-md"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Temiz Kuruluma Sıfırla (Ayarları Koru)</span>
                    </button>
                  </div>
                </div>

                {/* SEÇENEK B: Tam Fabrika Ayarlarına Dön (Her Şeyi Sıfırla) */}
                <div className="p-4 sm:p-5 rounded-xl bg-[#0d1117] border border-rose-500/30 flex flex-col justify-between space-y-4 shadow-md">
                  <div>
                    <div className="flex items-center space-x-2 text-rose-400 mb-1.5">
                      <ShieldAlert className="w-4 h-4" />
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                        B. Tam Fabrika Sıfırlaması
                      </h4>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      Şirket profili, kaşe bilgisi, POS cihazları, kategoriler ve tüm finansal veriler dahil <strong className="text-rose-400">HER ŞEYİ</strong> ilk kurulum haline sıfırlar.
                    </p>
                    <div className="mt-3 p-2.5 bg-[#161b22] rounded-lg border border-[#30363d] text-[11px] space-y-1 text-gray-400">
                      <div className="text-rose-400 font-bold flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Tüm Ayarlar ve Bilgiler Silinir</span>
                      </div>
                      <div>• Şirket & Kaşe bilgileri sıfırlanır</div>
                      <div>• POS cihazları ve kategoriler ilk varsayılana döner</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#30363d]">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          type: 'factory_reset',
                          title: 'Tam Fabrika Ayarlarına Sıfırla',
                          description: 'Tüm sistem, kaşe tanımları ve hareket kayıtları kalıcı olarak ilk kurulum haline döndürülecektir.',
                          impacts: [
                            'Şirket Ünvanı, Kaşe, VKN ve Adres bilgileri silinir.',
                            'POS Cihazları ve Gider Kategorileri varsayılana döner.',
                            'Tüm Günlük Kasa, Harcama ve Fatura kayıtları silinir.',
                          ],
                          confirmButtonText: 'Tüm Sistemi Fabrika Ayarlarına Sıfırla',
                        });
                      }}
                      className="w-full py-2.5 bg-rose-950/50 hover:bg-rose-900/80 border border-rose-600/40 text-rose-300 font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center space-x-2 shadow-md"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Tam Fabrika Ayarlarına Sıfırla</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Item 3.3: Yazılım Güncelleme */}
          {activeSection === 'update' && (
            <SoftwareUpdateSection
              onNotify={(msg, type) => {
                if (type === 'success') {
                  setSavedSuccess(true);
                  setTimeout(() => setSavedSuccess(false), 3000);
                }
              }}
            />
          )}

          {/* ============================================================ */}
          {/* ALT GRUP 4: BULUT & GOOGLE DRIVE ENTEGRASYONU                */}
          {/* ============================================================ */}
          {activeSection === 'cloud' && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 sm:p-6 shadow-xl space-y-6 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d] pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                      Google Workspace & Bulut Yedekleme
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Kasa defteri kayıtlarınızı Google Drive ve Google E-Tablolar (Sheets) ile otomatik senkronize edin.
                    </p>
                  </div>
                </div>

                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('workspace')}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center space-x-1.5 shadow-md shrink-0"
                  >
                    <span>Bulut Paneline Git</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2">
                  <div className="text-xs font-bold text-orange-400 uppercase">Google Drive Yedekleme</div>
                  <p className="text-xs text-gray-400">
                    Günlük kasa kapanışları ve aylık icmal tablolarınız güvenli Google Drive klasörünüze otomatik yedeklenir.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2">
                  <div className="text-xs font-bold text-emerald-400 uppercase">Google Sheets Entegrasyonu</div>
                  <p className="text-xs text-gray-400">
                    Excel ve E-tablo formatında anlık veri akışı sağlanır, patron ve muhasebe uzaktan anında takip edebilir.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2">
                  <div className="text-xs font-bold text-blue-400 uppercase">OAuth 2.0 Güvenli Giriş</div>
                  <p className="text-xs text-gray-400">
                    Google hesabınızla doğrudan, şifre paylaşmadan güvenli yetkilendirme ile tam koruma.
                  </p>
                </div>
              </div>

              {onNavigate && (
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-orange-200">
                    Bulut yedekleme durumunu kontrol etmek ve senkronizasyonu başlatmak için:
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('workspace')}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center space-x-1.5 shrink-0 shadow-md"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Bulut Entegrasyonunu Aç</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SAFETY CONFIRMATION MODAL */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto font-mono">
          <div className="bg-[#161b22] rounded-xl border border-rose-500/50 w-full max-w-lg p-6 shadow-2xl space-y-4 my-6 text-gray-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#30363d] pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                    GÜVENLİK ONAYI GEREKLİ
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {confirmModal.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="text-gray-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-300 leading-relaxed">
              {confirmModal.description}
            </p>

            {/* Impacts List */}
            <div className="p-3.5 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-2">
              <div className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Bu işlem sonucunda:</span>
              </div>
              <ul className="space-y-1 text-xs text-gray-400">
                {confirmModal.impacts.map((imp, idx) => (
                  <li key={idx} className="flex items-start space-x-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#30363d] flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="w-full sm:w-auto px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 font-bold rounded-lg text-xs transition cursor-pointer"
              >
                Vazgeç / İptal
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirmModal.type === 'single_day' && confirmModal.targetDate) {
                    if (onResetSingleDay) {
                      onResetSingleDay(confirmModal.targetDate);
                    }
                    setResetSuccessMessage(`${formatDateTR(confirmModal.targetDate)} tarihli gün başarıyla sıfırlandı.`);
                  } else if (confirmModal.type === 'clean_install') {
                    if (onResetAllFinancialData) {
                      onResetAllFinancialData();
                    } else {
                      onResetData();
                    }
                    setResetSuccessMessage('Tüm kasa hareketleri sıfırlandı. Temiz kuruluma geçildi.');
                  } else if (confirmModal.type === 'factory_reset') {
                    onResetData();
                    setResetSuccessMessage('Tüm sistem fabrika ayarlarına döndürüldü.');
                  }

                  setConfirmModal(null);
                  setTimeout(() => setResetSuccessMessage(null), 4000);
                }}
                className="w-full sm:w-auto px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center space-x-2 shadow-lg"
              >
                <Trash2 className="w-4 h-4" />
                <span>{confirmModal.confirmButtonText}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
