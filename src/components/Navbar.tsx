import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import {
  formatDateWithDayTR,
  formatDateTR,
  addDays,
  getTodayIsoDate,
} from '../utils/formatters';
import { TabType } from '../types';
import { RestaurantProfile } from '../utils/storage';

interface NavbarProps {
  activeTab?: TabType;
  setActiveTab?: (tab: TabType) => void;
  activeSettingsSection?: string;
  onSelectSettingsSection?: (section: string) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  onOpenBossReport: () => void;
  onOpenVegaImport?: () => void;
  onOpenSettings?: () => void;
  profile?: RestaurantProfile;
  onToggleMobileSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
}

const TURKISH_MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

const TURKISH_DAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

interface CalendarDay {
  day: number;
  month: number;
  year: number;
  dateStr: string;
  isCurrentMonth: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedDate,
  setSelectedDate,
  onOpenBossReport,
  profile,
  onToggleMobileSidebar,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
}) => {
  const todayIso = getTodayIsoDate();

  // Mini Calendar State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nativeDateInputRef = useRef<HTMLInputElement>(null);

  // Month & Year being viewed in the mini-calendar
  const [viewYear, setViewYear] = useState<number>(() => {
    const y = Number(selectedDate.split('-')[0]);
    return !isNaN(y) && y > 0 ? y : new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    const m = Number(selectedDate.split('-')[1]);
    return !isNaN(m) && m > 0 ? m - 1 : new Date().getMonth();
  });

  // Keep viewMonth & viewYear in sync when selectedDate changes externally
  useEffect(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [selectedDate]);

  // Click outside to close mini-calendar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsCalendarOpen(false);
      }
    }

    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCalendarOpen]);

  // Compute days grid for the mini calendar
  const getCalendarDays = (year: number, month: number): CalendarDay[] => {
    const days: CalendarDay[] = [];

    // Day of week of 1st day of month (0=Sun, 1=Mon, ..., 6=Sat)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Monday as 0, Sunday as 6
    const leadingEmptyCount = (firstDayIndex + 6) % 7;

    // Previous month info
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;

    // Add leading days from previous month
    for (let i = leadingEmptyCount - 1; i >= 0; i--) {
      const d = prevMonthLastDate - i;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, month: prevMonth, year: prevYear, dateStr, isCurrentMonth: false });
    }

    // Days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, month, year, dateStr, isCurrentMonth: true });
    }

    // Trailing days from next month to fill complete rows (35 or 42 cells)
    const totalCells = days.length > 35 ? 42 : 35;
    const trailingCount = totalCells - days.length;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;

    for (let d = 1; d <= trailingCount; d++) {
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, month: nextMonth, year: nextYear, dateStr, isCurrentMonth: false });
    }

    return days;
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleGoToday = () => {
    const today = getTodayIsoDate();
    setSelectedDate(today);
    const [y, m] = today.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
    setIsCalendarOpen(false);
  };

  const getCompanyInitials = (str?: string) => {
    if (!str) return 'ŞK';
    const words = str.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const companyDisplayName = profile?.companyTitle || profile?.name || 'ŞİRKET ADI GİRİNİZ';
  const calendarDays = getCalendarDays(viewYear, viewMonth);

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

          {/* Date Picker Control & Mini Calendar Container */}
          <div className="relative flex items-center bg-[#0d1117] p-1 rounded-lg border border-[#30363d] shadow-inner">
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              className="p-1 hover:bg-[#21262d] rounded text-gray-400 hover:text-white transition cursor-pointer"
              title="Önceki Gün"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Tarih Butonu - Tıklanınca Mini Takvimi Açar */}
            <div className="px-1 sm:px-2">
              <button
                ref={triggerRef}
                type="button"
                id="btn-navbar-calendar-trigger"
                onClick={() => setIsCalendarOpen((prev) => !prev)}
                className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg transition cursor-pointer select-none border ${
                  isCalendarOpen
                    ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 ring-1 ring-orange-500/40'
                    : 'bg-transparent border-transparent hover:bg-[#21262d] text-white hover:text-orange-400'
                }`}
                title="Tarih seçmek ve takvimi açmak için tıklayın"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold font-mono whitespace-nowrap">
                  {formatDateWithDayTR(selectedDate)}
                </span>
              </button>
            </div>

            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="p-1 hover:bg-[#21262d] rounded text-gray-400 hover:text-white transition cursor-pointer"
              title="Sonraki Gün"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Gerçek Bugün Tarihine Götüren Güncel Buton */}
            <button
              onClick={handleGoToday}
              className={`ml-1 text-[11px] px-2.5 py-1 rounded-md transition font-mono cursor-pointer flex items-center space-x-1 ${
                selectedDate === todayIso
                  ? 'bg-orange-500/25 text-orange-300 border border-orange-500/50 font-bold shadow-xs'
                  : 'bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-gray-300 hover:text-white'
              }`}
              title={`Bugünün tarihine git (${formatDateTR(todayIso)})`}
            >
              <span>Bugün</span>
              {selectedDate === todayIso && (
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block"></span>
              )}
            </button>

            {/* Gizli Native Input (Gerektiğinde showPicker ile çağrılabilir) */}
            <input
              ref={nativeDateInputRef}
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />

            {/* Küçük Mini Takvim Popover (Açılır Takvim) */}
            {isCalendarOpen && (
              <div
                ref={calendarRef}
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 z-50 w-72 sm:w-80 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl p-4 font-mono select-none animate-in fade-in zoom-in-95 duration-150"
              >
                {/* Takvim Üst Başlığı (Ay, Yıl & Gezinme) */}
                <div className="flex items-center justify-between pb-3 border-b border-[#21262d]">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 hover:bg-[#21262d] text-gray-400 hover:text-white rounded-lg transition cursor-pointer"
                    title="Önceki Ay"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-white uppercase tracking-wider">
                      {TURKISH_MONTHS[viewMonth]}
                    </span>
                    <span className="font-bold text-sm text-orange-400">
                      {viewYear}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1.5 hover:bg-[#21262d] text-gray-400 hover:text-white rounded-lg transition cursor-pointer"
                      title="Sonraki Ay"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(false)}
                      className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-[#21262d] transition ml-1 cursor-pointer"
                      title="Kapat"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Haftanın Günleri Başlıkları (Pzt ... Paz) */}
                <div className="grid grid-cols-7 gap-1 text-center py-2.5 text-[11px] font-bold text-gray-400 border-b border-[#21262d]/60 mb-2">
                  {TURKISH_DAYS_SHORT.map((d, i) => (
                    <div
                      key={d}
                      className={i >= 5 ? 'text-orange-400/80 font-bold' : 'text-gray-400'}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Günler Matrisi (Grid) */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {calendarDays.map((item, idx) => {
                    const isSelected = item.dateStr === selectedDate;
                    const isToday = item.dateStr === todayIso;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedDate(item.dateStr);
                          setIsCalendarOpen(false);
                        }}
                        className={`h-8 w-8 mx-auto rounded-lg flex flex-col items-center justify-center text-xs transition cursor-pointer font-mono relative ${
                          isSelected
                            ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/30 ring-2 ring-orange-400'
                            : isToday
                            ? 'border border-orange-500/70 text-orange-400 font-bold hover:bg-orange-500/20'
                            : item.isCurrentMonth
                            ? 'text-gray-200 hover:bg-[#21262d] hover:text-white'
                            : 'text-gray-600 hover:bg-[#21262d]/50 hover:text-gray-400'
                        }`}
                        title={formatDateTR(item.dateStr)}
                      >
                        <span>{item.day}</span>
                        {isToday && !isSelected && (
                          <span className="w-1 h-1 rounded-full bg-orange-400 absolute bottom-1"></span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Takvim Alt Bilgisi & Hızlı Butonlar */}
                <div className="pt-3 mt-3 border-t border-[#21262d] flex items-center justify-between text-[11px]">
                  <div className="flex items-center space-x-1.5 text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span>
                    <span>Bugün: <strong>{formatDateTR(todayIso)}</strong></span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoToday}
                    className="px-2.5 py-1 bg-orange-500/15 hover:bg-orange-500 text-orange-400 hover:text-white rounded-lg border border-orange-500/30 transition font-bold cursor-pointer"
                  >
                    Bugüne Git
                  </button>
                </div>
              </div>
            )}
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
    </header>
  );
};
