import React, { useState, useEffect } from 'react';
import {
  Layers,
  FileSpreadsheet,
  PieChart,
  Receipt,
  FileText,
  Lock,
  Calendar,
  Cloud,
  Settings,
  ChevronRight,
  TrendingUp,
  WalletCards,
  SlidersHorizontal,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  UserCheck,
  Wallet,
  Landmark,
  Stamp,
  CreditCard,
  Tag,
  Palette,
  RotateCcw,
  Sparkles,
  Building2,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { TabType } from '../types';
import { RestaurantProfile } from '../utils/storage';

export type NavGroupId = 'main' | 'cashier' | 'accounts' | 'cariler' | 'reports' | 'system';

export interface NavSubItem {
  id: TabType;
  subId?: string;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
}

export interface SettingsSubGroupItem {
  id: TabType;
  subId: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
}

export interface SettingsSubGroupNav {
  id: string;
  title: string;
  shortTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  defaultSubId: string;
  items: SettingsSubGroupItem[];
}

export const SETTINGS_SUB_GROUPS: SettingsSubGroupNav[] = [
  {
    id: 'corporate',
    title: '1. Kurumsal & Firma Tanımları',
    shortTitle: 'Kurumsal Tanımlar',
    icon: Building2,
    badge: '3',
    defaultSubId: 'kase',
    items: [
      {
        id: 'settings',
        subId: 'kase',
        label: 'Şirket Ünvanı & Kaşe',
        shortLabel: 'Firma & Kaşe',
        icon: Stamp,
        description: 'Resmi ünvan, VKN, adres ve mühür',
      },
      {
        id: 'settings',
        subId: 'pos',
        label: 'Banka POS Cihazları',
        shortLabel: 'POS Cihazları',
        icon: CreditCard,
        description: 'Terminal Z raporu cihaz tanımları',
      },
      {
        id: 'settings',
        subId: 'categories',
        label: 'Gider & Masraf Kategorileri',
        shortLabel: 'Giderler',
        icon: Tag,
        description: 'Kasa harcaması etiketleri',
      },
    ],
  },
  {
    id: 'ui',
    title: '2. Arayüz & Görünüm',
    shortTitle: 'Arayüz & Tema',
    icon: Palette,
    badge: '1',
    defaultSubId: 'appearance',
    items: [
      {
        id: 'settings',
        subId: 'appearance',
        label: 'Görünüm, Tema & Font',
        shortLabel: 'Tema & Font',
        icon: Palette,
        description: 'Koyu/açık tema, font ve renkler',
      },
    ],
  },
  {
    id: 'maintenance',
    title: '3. Veri Yönetimi & Bakım',
    shortTitle: 'Sistem & Bakım',
    icon: ShieldAlert,
    badge: '3',
    defaultSubId: 'system_day',
    items: [
      {
        id: 'settings',
        subId: 'system_day',
        label: 'Gün Gün Sıfırlama (Seçili Gün)',
        shortLabel: 'Günlük Sıfırlama',
        icon: Calendar,
        description: 'Seçili bir günün kayıtlarını temizle',
      },
      {
        id: 'settings',
        subId: 'system_bulk',
        label: 'Temiz Kurulum & Fabrika Sıfırla',
        shortLabel: 'Fabrika Sıfırlama',
        icon: RotateCcw,
        description: 'Tüm hareketleri sil veya fabrika ayarları',
      },
      {
        id: 'settings',
        subId: 'update',
        label: 'Yazılım Güncelleme',
        shortLabel: 'Yazılım Güncelle',
        icon: RefreshCw,
        description: 'GitHub sürüm kontrolü ve güncelleme',
      },
    ],
  },
  {
    id: 'cloud',
    title: '4. Bulut & Google Drive',
    shortTitle: 'Bulut & Yedekleme',
    icon: Sparkles,
    badge: 'Bulut',
    defaultSubId: 'cloud',
    items: [
      {
        id: 'workspace',
        subId: 'cloud',
        label: 'Google Workspace & E-Tablolar',
        shortLabel: 'Google Bulut',
        icon: Cloud,
        description: 'Drive yedekleme ve Sheets senkronizasyonu',
      },
    ],
  },
];

export interface NavGroup {
  id: NavGroupId;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  defaultTab: TabType;
  subItems: NavSubItem[];
}

export const NAVIGATION_GROUPS: NavGroup[] = [
  {
    id: 'main',
    label: 'Ana Panel',
    shortLabel: 'Panel',
    icon: Layers,
    description: 'Genel Durum & KPI Özeti',
    defaultTab: 'dashboard',
    subItems: [
      {
        id: 'dashboard',
        label: 'Genel Bakış & Özet',
        shortLabel: 'Özet',
        icon: Layers,
        description: 'Günlük ciro, kasa dengesi ve finansal özet',
      },
    ],
  },
  {
    id: 'cashier',
    label: 'Kasa İşlemleri',
    shortLabel: 'Kasa',
    icon: WalletCards,
    description: 'POS, Kasa, Gider & Fatura',
    defaultTab: 'daily',
    subItems: [
      {
        id: 'daily',
        label: '1. Günlük Kasa & POS',
        shortLabel: 'Kasa & POS',
        icon: FileSpreadsheet,
        description: 'Nakit kasa, Z raporları ve banka POS girişleri',
      },
      {
        id: 'expenses',
        label: '2. Kasa Giderleri',
        shortLabel: 'Kasa Giderleri',
        icon: Receipt,
        description: 'Elden nakit ödenen günlük işletme giderleri',
      },
      {
        id: 'groups',
        label: '3. Vega Satış Grupları',
        shortLabel: 'Vega Satış',
        icon: PieChart,
        description: 'Ürün grupları, iskonto ve açık hesap mutabakatı',
      },
      {
        id: 'invoices',
        label: '4. Faturalar & Ürünler',
        shortLabel: 'Faturalar',
        icon: FileText,
        description: 'Tedarikçi faturaları ve ürün bazlı takip',
      },
      {
        id: 'suppliers',
        label: 'Tedarikçi Firmalar',
        shortLabel: 'Tedarikçiler',
        icon: Building2,
        description: 'Faturalardan derlenen firma borç ve alım dökümü',
      },
      {
        id: 'closing',
        label: '5. Günlük Kasa Kapanışı',
        shortLabel: 'Kasa Kapanış',
        icon: Lock,
        description: 'Kasa devri kilitleme ve gün sonu mutabakatı',
      },
      {
        id: 'vault',
        label: '6. Ana Kasa & Banknot Takibi',
        shortLabel: 'Ana Kasa',
        icon: Wallet,
        description: 'Kalan nakit aktarımı, banknot küpürleri ve harcama çıkışı',
      },
    ],
  },
  {
    id: 'accounts',
    label: 'Hesaplar (Kasa & Banka)',
    shortLabel: 'Hesaplar',
    icon: Landmark,
    description: 'Ana Kasa & Banka Bakiyeleri',
    defaultTab: 'accounts',
    subItems: [
      {
        id: 'accounts',
        label: 'Hesaplar (Kasa & Banka)',
        shortLabel: 'Hesaplar',
        icon: Landmark,
        description: 'Ana kasa, banka hesapları ve bakiye takibi',
      },
    ],
  },
  {
    id: 'cariler',
    label: 'Cari Hesaplar',
    shortLabel: 'Cariler',
    icon: UserCheck,
    description: 'Açık Hesap & Müşteri Alacak Takibi',
    defaultTab: 'openAccounts',
    subItems: [
      {
        id: 'openAccounts',
        label: 'Açık Hesap & Cari Yönetimi',
        shortLabel: 'Cari Yönetimi',
        icon: UserCheck,
        description: 'Veresiye masalar, müşteri carileri ve alacak takibi',
      },
    ],
  },
  {
    id: 'reports',
    label: 'Raporlar & İcmal',
    shortLabel: 'Raporlar',
    icon: TrendingUp,
    description: 'Aylık İcmal & Analiz',
    defaultTab: 'monthly',
    subItems: [
      {
        id: 'monthly',
        label: 'Aylık Kasa İcmali',
        shortLabel: 'Aylık İcmal',
        icon: Calendar,
        description: 'Aylık ciro, gider, POS ve kar-zarar tablosu',
      },
    ],
  },
  {
    id: 'system',
    label: 'Sistem & Ayarlar',
    shortLabel: 'Ayarlar',
    icon: Settings,
    description: 'Şirket, POS, Tema ve Veri Bakımı',
    defaultTab: 'settings',
    subItems: [
      {
        id: 'settings',
        subId: 'kase',
        label: '1. Şirket & Kaşe',
        shortLabel: 'Şirket & Kaşe',
        icon: Stamp,
        description: 'Resmi ünvan, VKN, adres ve mühür',
      },
      {
        id: 'settings',
        subId: 'pos',
        label: '2. POS Cihazları',
        shortLabel: 'POS Cihazları',
        icon: CreditCard,
        description: 'Terminal Z raporu cihaz tanımları',
      },
      {
        id: 'settings',
        subId: 'categories',
        label: '3. Gider Kategorileri',
        shortLabel: 'Gider Grupları',
        icon: Tag,
        description: 'Kasa harcaması sınıflandırma etiketleri',
      },
      {
        id: 'settings',
        subId: 'appearance',
        label: '4. Görünüm & Tema',
        shortLabel: 'Tema & Renk',
        icon: Palette,
        description: 'Koyu/açık mod, font ailesi ve renkler',
      },
      {
        id: 'settings',
        subId: 'system_day',
        label: '5. Günlük Sıfırlama',
        shortLabel: 'Günlük Sıfırlama',
        icon: Calendar,
        description: 'Seçili bir günün kayıtlarını sıfırlama',
      },
      {
        id: 'settings',
        subId: 'system_bulk',
        label: '6. Fabrika Sıfırlaması',
        shortLabel: 'Toplu Sıfırlama',
        icon: RotateCcw,
        description: 'Tüm hareketleri sil veya fabrika ayarları',
      },
      {
        id: 'settings',
        subId: 'update',
        label: '7. Yazılım Güncelleme',
        shortLabel: 'Güncelleme',
        icon: RefreshCw,
        description: 'GitHub sürüm kontrolü ve güncelleme',
      },
      {
        id: 'workspace',
        label: '8. Google Bulut (Drive)',
        shortLabel: 'Google Bulut',
        icon: Sparkles,
        description: 'Google Drive & E-Tablolar senkronizasyonu',
      },
    ],
  },
];

export function getGroupForTab(tab: TabType): NavGroupId {
  if (tab === 'workspace' || tab === 'settings') {
    return 'system';
  }
  for (const group of NAVIGATION_GROUPS) {
    if (group.subItems.some((item) => item.id === tab)) {
      return group.id;
    }
  }
  return 'main';
}

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  activeSettingsSection?: string;
  onSelectSettingsSection?: (section: string) => void;
  onOpenBossReport: () => void;
  onOpenVegaImport: () => void;
  onOpenSettings: () => void;
  profile?: RestaurantProfile;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeSettingsSection,
  onSelectSettingsSection,
  onOpenBossReport,
  onOpenVegaImport,
  onOpenSettings,
  profile,
  isOpenMobile,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}) => {
  const activeGroupId = getGroupForTab(activeTab);

  // Track expanded/collapsed state for each menu group with submenus
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    return { [activeGroupId]: true };
  });

  // Track expanded/collapsed state for Settings sub-groups (Kurumsal, Görünüm, Bakım, Bulut)
  const [expandedSettingsSubGroups, setExpandedSettingsSubGroups] = useState<Record<string, boolean>>(() => {
    return {
      corporate: true,
      ui: true,
      maintenance: false,
      cloud: false,
    };
  });

  // Ensure active group is expanded when activeTab changes
  useEffect(() => {
    setExpandedGroups((prev) => ({
      ...prev,
      [activeGroupId]: true,
    }));
  }, [activeGroupId]);

  // Ensure active settings sub-group is expanded when tab or settings section changes
  useEffect(() => {
    if (activeTab === 'settings' || activeTab === 'workspace') {
      const activeSec = activeSettingsSection || 'kase';
      for (const sg of SETTINGS_SUB_GROUPS) {
        if (sg.items.some((it) => it.id === activeTab && (!it.subId || it.subId === activeSec))) {
          setExpandedSettingsSubGroups((prev) => ({
            ...prev,
            [sg.id]: true,
          }));
          break;
        }
      }
    }
  }, [activeTab, activeSettingsSection]);

  const toggleSettingsSubGroup = (subGroupId: string) => {
    setExpandedSettingsSubGroups((prev) => ({
      ...prev,
      [subGroupId]: !prev[subGroupId],
    }));
  };

  const handleGroupClick = (group: NavGroup) => {
    const isGroupActive = activeGroupId === group.id;
    const isCurrentlyExpanded =
      expandedGroups[group.id] !== undefined
        ? expandedGroups[group.id]
        : isGroupActive;

    if (group.subItems.length > 1) {
      // Toggle expansion when clicking this menu group
      setExpandedGroups((prev) => ({
        ...prev,
        [group.id]: !isCurrentlyExpanded,
      }));

      // If clicking from a different group, navigate to default tab
      if (!group.subItems.some((s) => s.id === activeTab)) {
        setActiveTab(group.defaultTab);
        setExpandedGroups((prev) => ({
          ...prev,
          [group.id]: true,
        }));
      }
    } else {
      if (!group.subItems.some((s) => s.id === activeTab)) {
        setActiveTab(group.defaultTab);
      }
      onCloseMobile();
    }
  };

  const isSettingsActive = activeTab === 'settings';
  const isWorkspaceActive = activeTab === 'workspace';

  // Full Expanded Sidebar Content
  const fullContent = (
    <div className="flex flex-col h-full bg-[#161b22] border-r border-[#30363d] select-none">
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-[#30363d] flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-sm font-mono shrink-0">
            K
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono truncate">
              Kasa Yönetimi
            </h2>
            <span className="text-[10px] text-gray-400 font-mono block truncate">
              Ana Menü Grupları
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {/* Desktop collapse toggle button */}
          <button
            id="btn-collapse-sidebar"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#21262d] transition cursor-pointer"
            title="Menüyü Daralt / Gizle"
          >
            <PanelLeftClose className="w-4 h-4 text-gray-400 hover:text-orange-400" />
          </button>

          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#21262d] cursor-pointer"
            title="Menüyü Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Navigation Groups (Vertical Downwards List) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 font-mono">
          Ana Gruplar
        </div>

        {NAVIGATION_GROUPS.filter((g) => g.id !== 'system').map((group) => {
          const isGroupActive = activeGroupId === group.id;
          const GroupIcon = group.icon;
          const subCount = group.subItems.length;
          const isExpanded =
            expandedGroups[group.id] !== undefined
              ? expandedGroups[group.id]
              : isGroupActive;

          return (
            <div key={group.id} className="space-y-1">
              <button
                id={`nav-group-${group.id}`}
                onClick={() => handleGroupClick(group)}
                className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between group cursor-pointer border ${
                  isGroupActive
                    ? 'bg-orange-500/15 border-orange-500/50 text-white shadow-sm'
                    : 'bg-[#0d1117] hover:bg-[#21262d] border-[#30363d] text-gray-200 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition shrink-0 ${
                      isGroupActive
                        ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/25'
                        : 'bg-[#21262d] text-gray-400 group-hover:text-orange-400 group-hover:bg-[#30363d]'
                    }`}
                  >
                    <GroupIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-semibold text-xs text-white truncate">
                        {group.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono truncate">
                      {group.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 pl-1 shrink-0">
                  {subCount > 1 && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-semibold ${
                        isGroupActive
                          ? 'bg-orange-500/20 text-orange-300'
                          : 'bg-[#21262d] text-gray-400'
                      }`}
                    >
                      {subCount}
                    </span>
                  )}
                  <ChevronRight
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isGroupActive ? 'text-orange-400' : 'text-gray-500 group-hover:text-gray-300'
                    } ${subCount > 1 && isExpanded ? 'rotate-90 text-orange-400' : ''}`}
                  />
                </div>
              </button>

              {/* Sub-items preview under group (toggleable open/closed) */}
              {group.subItems.length > 1 && isExpanded && (
                <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-orange-500/30 ml-4.5 my-1 transition-all duration-200">
                  {group.subItems.map((sub) => {
                    const itemKey = sub.subId ? `${sub.id}-${sub.subId}` : sub.id;
                    const isSubActive = sub.subId
                      ? activeTab === sub.id && (!activeSettingsSection || activeSettingsSection === sub.subId)
                      : activeTab === sub.id;
                    const SubIcon = sub.icon;
                    return (
                      <button
                        key={itemKey}
                        id={`sidebar-subitem-${itemKey}`}
                        onClick={() => {
                          if (sub.subId && onSelectSettingsSection) {
                            onSelectSettingsSection(sub.subId);
                          }
                          setActiveTab(sub.id);
                          onCloseMobile();
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition flex items-center space-x-2 cursor-pointer ${
                          isSubActive
                            ? 'bg-orange-500/20 text-orange-300 font-bold border border-orange-500/40'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-[#21262d]'
                        }`}
                      >
                        <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? 'text-orange-400' : 'text-gray-400'}`} />
                        <span className="truncate">{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Settings & Integration Dock at bottom of Sidebar */}
      <div className="p-3 border-t border-[#30363d] space-y-2 bg-[#0d1117] overflow-y-auto max-h-[50vh] no-scrollbar">
        <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-1 flex items-center justify-between">
          <span>Sistem & Ayarlar</span>
          <span className="text-[9px] text-orange-400/80 font-mono">({SETTINGS_SUB_GROUPS.length} Alt Menü)</span>
        </div>

        {/* Preferred Sistem & Ayarlar Main Header Button */}
        <button
          id="nav-group-system"
          onClick={() => {
            const isCurrentlyExpanded =
              expandedGroups['system'] !== undefined
                ? expandedGroups['system']
                : (activeTab === 'settings' || activeTab === 'workspace');
            setExpandedGroups((prev) => ({
              ...prev,
              system: !isCurrentlyExpanded,
            }));
            if (activeTab !== 'settings' && activeTab !== 'workspace') {
              setActiveTab('settings');
            }
          }}
          className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between group cursor-pointer border ${
            activeTab === 'settings' || activeTab === 'workspace'
              ? 'bg-orange-500/15 border-orange-500/50 text-white shadow-sm'
              : 'bg-[#161b22] hover:bg-[#21262d] border-[#30363d] text-gray-200 hover:text-white'
          }`}
          title="Sistem & Ayarlar menüsünü aç / kapat"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition shrink-0 ${
                activeTab === 'settings' || activeTab === 'workspace'
                  ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/25'
                  : 'bg-[#21262d] text-gray-400 group-hover:text-orange-400 group-hover:bg-[#30363d]'
              }`}
            >
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-xs text-white truncate">
                  Sistem & Ayarlar
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono truncate">
                Şirket, POS, Tema ve Veri Bakımı
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 pl-1 shrink-0">
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === 'settings' || activeTab === 'workspace'
                  ? 'bg-orange-500/20 text-orange-300'
                  : 'bg-[#21262d] text-gray-400'
              }`}
            >
              {SETTINGS_SUB_GROUPS.length}
            </span>
            <ChevronRight
              className={`w-4 h-4 transition-transform duration-200 ${
                activeTab === 'settings' || activeTab === 'workspace'
                  ? 'text-orange-400'
                  : 'text-gray-500 group-hover:text-gray-300'
              } ${(expandedGroups['system'] !== undefined ? expandedGroups['system'] : (activeTab === 'settings' || activeTab === 'workspace')) ? 'rotate-90 text-orange-400' : ''}`}
            />
          </div>
        </button>

        {/* Sub-menus with Accordion when Sistem & Ayarlar is expanded */}
        {(expandedGroups['system'] !== undefined ? expandedGroups['system'] : (activeTab === 'settings' || activeTab === 'workspace')) && (
          <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-orange-500/30 ml-4.5 my-1 transition-all duration-200">
            {SETTINGS_SUB_GROUPS.map((subGroup) => {
              const isSubGroupExpanded = expandedSettingsSubGroups[subGroup.id] ?? false;
              const SubGroupIcon = subGroup.icon;
              const isChildActive = subGroup.items.some(
                (it) => it.id === activeTab && (!activeSettingsSection || activeSettingsSection === it.subId)
              );

              return (
                <div key={subGroup.id} className="space-y-1">
                  {/* Sub-Menu Header Button: Uses exact Kasa İşlemleri styling & font */}
                  <button
                    type="button"
                    id={`btn-subgroup-${subGroup.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSettingsSubGroup(subGroup.id);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition flex items-center justify-between cursor-pointer border ${
                      isChildActive
                        ? 'bg-orange-500/20 text-orange-300 font-bold border border-orange-500/40'
                        : 'bg-[#0d1117] hover:bg-[#21262d] text-gray-400 hover:text-gray-200 border-[#30363d]'
                    }`}
                    title={`${subGroup.title} alt kategorilerini aç / kapat`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <SubGroupIcon className={`w-3.5 h-3.5 shrink-0 ${isChildActive ? 'text-orange-400' : 'text-gray-400'}`} />
                      <span className="truncate">{subGroup.title}</span>
                    </div>

                    <div className="flex items-center space-x-1 pl-1 shrink-0">
                      {subGroup.badge && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-semibold ${
                          isChildActive ? 'bg-orange-500/20 text-orange-300' : 'bg-[#21262d] text-gray-400'
                        }`}>
                          {subGroup.badge}
                        </span>
                      )}
                      <ChevronRight
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isChildActive ? 'text-orange-400' : 'text-gray-500'
                        } ${isSubGroupExpanded ? 'rotate-90 text-orange-400' : ''}`}
                      />
                    </div>
                  </button>

                  {/* Sub-categories (Alt Kategoriler) - Exact Kasa İşlemleri subItems structure */}
                  {isSubGroupExpanded && (
                    <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-orange-500/30 ml-4.5 my-1 transition-all duration-200">
                      {subGroup.items.map((sub) => {
                        const itemKey = `${sub.id}-${sub.subId}`;
                        const isSubActive =
                          activeTab === sub.id && (!activeSettingsSection || activeSettingsSection === sub.subId);
                        const ItemIcon = sub.icon;

                        return (
                          <button
                            key={itemKey}
                            id={`sidebar-subitem-${itemKey}`}
                            onClick={() => {
                              if (sub.subId && onSelectSettingsSection) {
                                onSelectSettingsSection(sub.subId);
                              }
                              setActiveTab(sub.id);
                              onCloseMobile();
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition flex items-center space-x-2 cursor-pointer ${
                              isSubActive
                                ? 'bg-orange-500/20 text-orange-300 font-bold border border-orange-500/40'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-[#21262d]'
                            }`}
                          >
                            <ItemIcon className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? 'text-orange-400' : 'text-gray-400'}`} />
                            <span className="truncate">{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // Slim / Collapsed Sidebar Strip
  const collapsedContent = (
    <div className="flex flex-col h-full bg-[#161b22] border-r border-[#30363d] select-none py-3 px-1.5 items-center justify-between">
      {/* Top Toggle Button */}
      <div className="flex flex-col items-center space-y-3">
        <button
          id="btn-expand-sidebar"
          onClick={onToggleCollapse}
          className="p-2 rounded-lg bg-[#21262d] hover:bg-orange-500 text-gray-300 hover:text-white border border-[#30363d] hover:border-orange-500 transition shadow cursor-pointer group"
          title="Menüyü Genişlet / Aç"
        >
          <PanelLeftOpen className="w-4 h-4 text-orange-400 group-hover:text-white" />
        </button>

        <div className="w-7 h-0.5 bg-[#30363d] rounded-full" />
      </div>

      {/* Main Groups Icons List */}
      <div className="flex-1 flex flex-col items-center space-y-2.5 py-3">
        {NAVIGATION_GROUPS.filter((g) => g.id !== 'system').map((group) => {
          const isGroupActive = activeGroupId === group.id;
          const GroupIcon = group.icon;

          return (
            <button
              key={group.id}
              id={`collapsed-nav-${group.id}`}
              onClick={() => handleGroupClick(group)}
              className={`p-2.5 rounded-xl transition cursor-pointer relative group flex items-center justify-center border ${
                isGroupActive
                  ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/25 font-bold'
                  : 'bg-[#0d1117]/80 hover:bg-[#21262d] text-gray-400 hover:text-orange-400 border-[#30363d]'
              }`}
              title={`${group.label} (${group.description})`}
            >
              <GroupIcon className="w-5 h-5" />

              {/* Floating Tooltip on Hover */}
              <div className="absolute left-full ml-2.5 px-2.5 py-1.5 bg-[#1f242c] text-white text-xs font-mono rounded-lg shadow-xl border border-[#30363d] opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 whitespace-nowrap">
                <div className="font-bold text-orange-400">{group.label}</div>
                <div className="text-[10px] text-gray-400">{group.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Settings Icons (Replaced Quick Tools) */}
      <div className="flex flex-col items-center space-y-2 pt-2 border-t border-[#30363d] w-full">
        <button
          onClick={() => setActiveTab('settings')}
          className={`p-2 rounded-lg transition cursor-pointer relative group border ${
            isSettingsActive
              ? 'bg-orange-500 text-white border-orange-400 shadow-md'
              : 'bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-orange-400 border-[#30363d]'
          }`}
          title="Ayarlar"
        >
          <Settings className="w-4 h-4" />
          <div className="absolute left-full ml-2.5 px-2.5 py-1 bg-[#1f242c] text-white text-xs font-mono rounded-lg shadow-xl border border-[#30363d] opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
            Ayarlar
          </div>
        </button>

        <button
          onClick={() => setActiveTab('workspace')}
          className={`p-2 rounded-lg transition cursor-pointer relative group border ${
            isWorkspaceActive
              ? 'bg-orange-500 text-white border-orange-400 shadow-md'
              : 'bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-orange-400 border-[#30363d]'
          }`}
          title="Bulut"
        >
          <Cloud className="w-4 h-4" />
          <div className="absolute left-full ml-2.5 px-2.5 py-1 bg-[#1f242c] text-white text-xs font-mono rounded-lg shadow-xl border border-[#30363d] opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
            Bulut
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 h-[calc(100vh-73px)] sticky top-[73px] z-30 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-14' : 'w-64 xl:w-72'
        }`}
      >
        {isCollapsed ? collapsedContent : fullContent}
      </aside>

      {/* Mobile Drawer Sidebar Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#161b22] z-10 shadow-2xl">
            {fullContent}
          </div>
        </div>
      )}
    </>
  );
};
