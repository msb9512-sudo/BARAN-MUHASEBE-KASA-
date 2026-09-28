import React, { useState, useEffect, useRef, useCallback } from 'react';
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

  const subTabsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollState = useCallback(() => {
    const el = subTabsContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  }, []);

  // Reset scroll and re-evaluate on group switch
  useEffect(() => {
    if (subTabsContainerRef.current) {
      subTabsContainerRef.current.scrollLeft = 0;
    }
    checkScrollState();
  }, [activeGroup.id, checkScrollState]);

  // Listen to scroll events on container and window resize
  useEffect(() => {
    const el = subTabsContainerRef.current;
    if (!el) return;
    checkScrollState();
    el.addEventListener('scroll', checkScrollState, { passive: true });
    window.addEventListener('resize', checkScrollState);
    return () => {
      el.removeEventListener('scroll', checkScrollState);
      window.removeEventListener('resize', checkScrollState);
    };
  }, [checkScrollState, activeGroup]);

  // Support horizontal mouse wheel scroll over the subtabs bar
  useEffect(() => {
    const el = subTabsContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0 && !e.shiftKey) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        checkScrollState();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [checkScrollState]);

  const scrollTabs = (direction: 'left' | 'right') => {
    const el = subTabsContainerRef.current;
    if (!el) return;
    const scrollAmount = direction === 'left' ? -220 : 220;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    setTimeout(checkScrollState, 320);
  };

  // Scroll logic when tab is clicked: if user clicked near edge, reveal the next neighbor tab ("bir yandaki")!
  const handleSubTabClick = (subId: TabType, index: number) => {
    setActiveTab(subId);

    setTimeout(() => {
      const container = subTabsContainerRef.current;
      if (!container) return;

      const nextItem = activeGroup.subItems[index + 1];
      const prevItem = activeGroup.subItems[index - 1];

      // If there is a next tab, ensure it is completely visible in view
      if (nextItem) {
        const nextEl = document.getElementById(`subtab-${nextItem.id}`);
        if (nextEl) {
          const cRect = container.getBoundingClientRect();
          const nRect = nextEl.getBoundingClientRect();
          if (nRect.right > cRect.right - 24) {
            const extra = nRect.right - cRect.right + 48;
            container.scrollBy({ left: extra, behavior: 'smooth' });
            setTimeout(checkScrollState, 320);
            return;
          }
        }
      }

      // If moving backwards and previous tab is cut off on left
      if (prevItem) {
        const prevEl = document.getElementById(`subtab-${prevItem.id}`);
        if (prevEl) {
          const cRect = container.getBoundingClientRect();
          const pRect = prevEl.getBoundingClientRect();
          if (pRect.left < cRect.left + 24) {
            const extra = pRect.left - cRect.left - 48;
            container.scrollBy({ left: extra, behavior: 'smooth' });
            setTimeout(checkScrollState, 320);
            return;
          }
        }
      }

      const activeEl = document.getElementById(`subtab-${subId}`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
      setTimeout(checkScrollState, 320);
    }, 40);
  };

  // When activeTab changes (e.g. from page navigation or shortcut), auto-scroll to reveal active & neighbor
  useEffect(() => {
    const timer = setTimeout(() => {
      const container = subTabsContainerRef.current;
      if (!container) return;

      const idx = activeGroup.subItems.findIndex((s) => s.id === activeTab);
      if (idx === -1) return;

      const nextItem = activeGroup.subItems[idx + 1];
      const prevItem = activeGroup.subItems[idx - 1];

      if (nextItem) {
        const nextEl = document.getElementById(`subtab-${nextItem.id}`);
        if (nextEl) {
          const cRect = container.getBoundingClientRect();
          const nRect = nextEl.getBoundingClientRect();
          if (nRect.right > cRect.right - 24) {
            container.scrollBy({ left: nRect.right - cRect.right + 48, behavior: 'smooth' });
            setTimeout(checkScrollState, 320);
            return;
          }
        }
      }

      if (prevItem) {
        const prevEl = document.getElementById(`subtab-${prevItem.id}`);
        if (prevEl) {
          const cRect = container.getBoundingClientRect();
          const pRect = prevEl.getBoundingClientRect();
          if (pRect.left < cRect.left + 24) {
            container.scrollBy({ left: pRect.left - cRect.left - 48, behavior: 'smooth' });
            setTimeout(checkScrollState, 320);
            return;
          }
        }
      }

      const activeEl = document.getElementById(`subtab-${activeTab}`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
      setTimeout(checkScrollState, 320);
    }, 60);

    return () => clearTimeout(timer);
  }, [activeTab, activeGroup, checkScrollState]);

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
      <div className="border-t border-[#30363d] bg-[#0d1117]">
        <div className="w-full px-3 sm:px-6 lg:px-8 flex items-center justify-between py-1.5 gap-2">
          <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1">
            {/* Active Group Indicator Badge */}
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#161b22] border border-[#30363d] text-[11px] font-mono font-bold text-orange-400 shrink-0 select-none">
              <span>{activeGroup.label}</span>
              <ChevronRightIcon className="w-3 h-3 text-gray-500" />
            </div>

            {/* Scrollable Sub-Tabs Container with Left/Right Scroll Arrows */}
            <div className="relative flex items-center min-w-0 flex-1">
              {/* Left Arrow Button (shows when scrolled right) */}
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => scrollTabs('left')}
                  className="mr-1 p-1 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-md text-gray-300 hover:text-white transition cursor-pointer shrink-0 z-10 shadow-sm"
                  title="Önceki sekmelere kaydır"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Sub-Tabs for Active Group */}
              <div
                ref={subTabsContainerRef}
                className="flex items-center space-x-1 overflow-x-auto no-scrollbar scroll-smooth py-0.5 min-w-0 flex-1"
              >
                {activeGroup.subItems.map((sub, idx) => {
                  const isActive = activeTab === sub.id;
                  const SubIcon = sub.icon;
                  return (
                    <button
                      key={sub.id}
                      id={`subtab-${sub.id}`}
                      onClick={() => handleSubTabClick(sub.id, idx)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition cursor-pointer shrink-0 ${
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

              {/* Right Arrow Button (shows when more tabs are available to the right) */}
              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => scrollTabs('right')}
                  className="ml-1 p-1 bg-[#21262d] hover:bg-orange-500/20 border border-orange-500/40 rounded-md text-orange-400 hover:text-orange-300 transition cursor-pointer shrink-0 z-10 shadow-sm animate-pulse"
                  title="Sonraki sekmelere kaydır"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
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

