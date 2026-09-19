import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  Settings,
  Sparkles,
  ChevronRight as ChevronRightIcon,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { formatDateWithDayTR, addDays } from '../utils/formatters';
import { TabType } from '../types';
import { RestaurantProfile } from '../utils/storage';
import { NAVIGATION_GROUPS, getGroupForTab } from '../components/Sidebar';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  onOpenBossReport: () => void;
  onOpenVegaImport: () => void;
  onOpenSettings: () => void;
  profile?: RestaurantProfile;
  onToggleMobileSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedDate,
  setSelectedDate,
  onOpenBossReport,
  onOpenVegaImport,
  onOpenSettings,
  profile,
  onToggleMobileSidebar,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
}) => {
  const activeGroupId = getGroupForTab(activeTab);
  const activeGroup =
    NAVIGATION_GROUPS.find((g) => g.id === activeGroupId) ||
    (activeTab === 'settings' || activeTab === 'workspace'
      ? {
          id: 'system' as const,
          label: 'Sistem & Ayarlar',
          shortLabel: 'Ayarlar',
          icon: Settings,
          description: 'Sistem ayarları ve Bulut',
          defaultTab: 'settings' as const,
          subItems: [
            {
              id: 'settings' as const,
              label: 'Ayarlar',
              shortLabel: 'Ayarlar',
              icon: Settings,
            },
            {
              id: 'workspace' as const,
              label: 'Bulut',
              shortLabel: 'Bulut',
              icon: Sparkles,
            },
          ],
        }
      : NAVIGATION_GROUPS[0]);

  const getCompanyInitials = (str?: string) => {
    if (!str) return 'ŞK';
    const words = str.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const companyDisplayName = profile?.companyTitle || profile?.name || 'ŞİRKET ADI GİRİNİZ';

  return (
    <header className="bg-[#161b22] border-b border-[#30363d] text-gray-200 sticky top-0 z-40 shadow-xl">
      {/* Top Bar */}
      <div className="w-full px-3 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Brand & Mobile Hamburger & Desktop Sidebar Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Hamburger Button for Mobile / Small Screens */}
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg text-gray-300 hover:text-white transition cursor-pointer"
              title="Menüyü Aç/Kapat"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop Sidebar Toggle (Gizleme / Açma Tuşu) */}
            <button
              id="btn-navbar-toggle-sidebar"
              onClick={onToggleSidebarCollapse}
              className="hidden lg:flex p-2 bg-[#21262d] hover:bg-orange-500/20 border border-[#30363d] hover:border-orange-500/40 rounded-lg text-gray-300 hover:text-orange-400 transition cursor-pointer"
              title={isSidebarCollapsed ? 'Sol Menüyü Genişlet' : 'Sol Menüyü Gizle/Daralt'}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-orange-400" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-gray-400 hover:text-orange-400" />
              )}
            </button>

            <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-sm font-mono shadow-inner shrink-0">
              {getCompanyInitials(companyDisplayName)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h1
                  className="text-sm sm:text-base font-bold tracking-tight text-white uppercase font-sans truncate max-w-[170px] sm:max-w-xs md:max-w-md lg:max-w-lg"
                  title={companyDisplayName}
                >
                  {companyDisplayName}
                </h1>
                {profile?.taxOffice && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#21262d] text-gray-300 border border-[#30363d] uppercase tracking-wider hidden md:inline">
                    {profile.taxOffice} V.D.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Date Picker Control */}
          <div className="flex items-center bg-[#0d1117] p-1 rounded-lg border border-[#30363d] shadow-inner">
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              className="p-1 hover:bg-[#21262d] rounded text-gray-400 hover:text-white transition cursor-pointer"
              title="Önceki Gün"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center px-2.5">
              <label className="cursor-pointer flex items-center" title="Tarih seçmek için tıklayın">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  className="sr-only"
                />
                <span className="text-xs sm:text-sm font-semibold font-mono text-white hover:text-orange-400 transition select-none">
                  {formatDateWithDayTR(selectedDate)}
                </span>
              </label>
            </div>

            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="p-1 hover:bg-[#21262d] rounded text-gray-400 hover:text-white transition cursor-pointer"
              title="Sonraki Gün"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setSelectedDate('2026-08-14')}
              className="ml-1 text-[11px] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] px-2 py-0.5 rounded text-gray-300 hover:text-white transition font-mono hidden md:inline"
            >
              Bugün
            </button>
          </div>

          {/* Quick Action Tools */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onOpenBossReport}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <span>👔</span>
              <span className="hidden sm:inline font-semibold">Patron Raporu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Sub-Tabs Bar (Shows Sub-Items of Current Active Group at the Top) */}
      <div className="border-t border-[#30363d] bg-[#0d1117] overflow-x-auto no-scrollbar">
        <div className="w-full px-3 sm:px-6 lg:px-8 flex items-center justify-between py-1.5">
          <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
            {/* Active Group Indicator Badge */}
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#161b22] border border-[#30363d] text-[11px] font-mono font-bold text-orange-400 shrink-0">
              <span>{activeGroup.label}</span>
              <ChevronRightIcon className="w-3 h-3 text-gray-500" />
            </div>

            {/* Sub-Tabs for Active Group */}
            <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
              {activeGroup.subItems.map((sub) => {
                const isActive = activeTab === sub.id;
                const SubIcon = sub.icon;
                return (
                  <button
                    key={sub.id}
                    id={`subtab-${sub.id}`}
                    onClick={() => setActiveTab(sub.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition cursor-pointer ${
                      isActive
                        ? 'bg-orange-500 text-white font-bold shadow-sm shadow-orange-500/20'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-[#21262d] border border-transparent'
                    }`}
                  >
                    <SubIcon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Group Switcher Pills on Right for Convenience */}
          <div className="hidden xl:flex items-center space-x-1 pl-4 border-l border-[#30363d] shrink-0">
            {NAVIGATION_GROUPS.map((g) => {
              const isCurr = activeGroupId === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setActiveTab(g.defaultTab)}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded transition cursor-pointer ${
                    isCurr
                      ? 'text-orange-400 font-bold bg-orange-500/10 border border-orange-500/30'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {g.shortLabel || g.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};

