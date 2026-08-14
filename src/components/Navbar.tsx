import React from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Settings,
  FileSpreadsheet,
  Layers,
  Receipt,
  FileText,
  PieChart,
  SlidersHorizontal,
  Upload,
  Cloud,
} from 'lucide-react';
import { DailyEntry, CashExpense, Invoice } from '../types';
import { formatDateWithDayTR, addDays } from '../utils/formatters';
import { calculateDailyRegister, auditDailyEntry } from '../utils/calculations';
import { RestaurantProfile } from '../utils/storage';

export type TabType =
  | 'dashboard'
  | 'daily'
  | 'groups'
  | 'expenses'
  | 'invoices'
  | 'closing'
  | 'monthly'
  | 'workspace'
  | 'settings';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  onOpenBossReport: () => void;
  onOpenVegaImport: () => void;
  onOpenSettings: () => void;
  profile?: RestaurantProfile;
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
}) => {
  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Ana Panel', icon: Layers },
    { id: 'daily', label: 'Günlük Kasa & POS', icon: FileSpreadsheet },
    { id: 'groups', label: 'Vega Satış Grupları', icon: PieChart },
    { id: 'expenses', label: 'Kasa Giderleri', icon: Receipt },
    { id: 'invoices', label: 'Faturalar & Ürünler', icon: FileText },
    { id: 'closing', label: 'Günlük Kapanış', icon: Lock },
    { id: 'monthly', label: 'Aylık İcmal Raporu', icon: Calendar },
    { id: 'workspace', label: 'Google Drive & Sheets', icon: Cloud },
    { id: 'settings', label: 'Ayarlar & Kaşe', icon: Settings },
  ];

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Brand & Company Details */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-base font-mono shadow-inner flex-shrink-0">
              {getCompanyInitials(companyDisplayName)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h1
                  className="text-base font-bold tracking-tight text-white uppercase font-sans truncate max-w-[260px] sm:max-w-md lg:max-w-lg"
                  title={companyDisplayName}
                >
                  {companyDisplayName}
                </h1>
                {profile?.taxOffice && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#21262d] text-gray-300 border border-[#30363d] uppercase tracking-wider hidden sm:inline">
                    {profile.taxOffice} V.D.
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 font-mono flex items-center gap-2 mt-0.5 truncate">
                {profile?.branch && <span>{profile.branch}</span>}
                {profile?.taxNumber && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-600 inline-block"></span>
                    <span className="text-gray-400">VKN: {profile.taxNumber}</span>
                  </>
                )}
                {!profile?.companyTitle && (
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="text-orange-400 hover:text-orange-300 underline cursor-pointer ml-1 text-[11px]"
                  >
                    Kaşe & Şirket Bilgisi Ekle
                  </button>
                )}
              </p>
            </div>
          </div>

          {/* Date Picker Control */}
          <div className="flex items-center bg-[#0d1117] p-1.5 rounded-lg border border-[#30363d] shadow-inner self-start lg:self-auto">
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              className="p-1.5 hover:bg-[#21262d] rounded text-gray-400 hover:text-white transition cursor-pointer"
              title="Önceki Gün"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center px-3 space-x-2">
              <Calendar className="w-4 h-4 text-orange-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-semibold font-mono text-white focus:outline-none cursor-pointer"
              />
              <span className="text-xs text-gray-400 hidden sm:inline border-l border-[#30363d] pl-2 font-mono">
                {formatDateWithDayTR(selectedDate)}
              </span>
            </div>

            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="p-1.5 hover:bg-[#21262d] rounded text-gray-400 hover:text-white transition cursor-pointer"
              title="Sonraki Gün"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setSelectedDate('2026-08-14')}
              className="ml-2 text-xs bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] px-2.5 py-1 rounded text-gray-300 hover:text-white transition font-mono"
            >
              Bugün
            </button>
          </div>

          {/* Quick Action Tools */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenVegaImport}
              className="flex items-center space-x-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
              title="Vega Şefim Raporunu Excel veya Metinden İçe Aktar"
            >
              <Upload className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden sm:inline">Vega Yükle</span>
            </button>

            <button
              onClick={onOpenBossReport}
              className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <span>👔</span>
              <span className="font-semibold">Patron Raporu</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg text-gray-300 hover:text-white transition cursor-pointer"
              title="Sistem ve Restoran Ayarları"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-t border-[#30363d] bg-[#0d1117] overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1.5 py-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30 font-semibold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#21262d] border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-orange-400' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
