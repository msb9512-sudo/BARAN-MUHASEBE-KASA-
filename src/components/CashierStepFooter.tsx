import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  FileSpreadsheet,
  Receipt,
  PieChart,
  FileText,
  Lock,
  Wallet,
} from 'lucide-react';
import { TabType } from '../types';

export interface CashierStep {
  stepNumber: number;
  id: TabType;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CASHIER_STEPS: CashierStep[] = [
  {
    stepNumber: 1,
    id: 'daily',
    label: '1. Günlük Kasa & POS',
    shortLabel: 'Kasa & POS',
    description: 'Nakit kasa sayımı, Z raporları ve banka POS girişleri',
    icon: FileSpreadsheet,
  },
  {
    stepNumber: 2,
    id: 'expenses',
    label: '2. Kasa Giderleri',
    shortLabel: 'Giderler',
    description: 'Elden nakit ödenen günlük işletme giderleri',
    icon: Receipt,
  },
  {
    stepNumber: 3,
    id: 'groups',
    label: '3. Vega Satış Grupları',
    shortLabel: 'Satış Grupları',
    description: 'Ürün grupları, iskonto ve açık hesap mutabakatı',
    icon: PieChart,
  },
  {
    stepNumber: 4,
    id: 'invoices',
    label: '4. Faturalar & Ürünler',
    shortLabel: 'Faturalar',
    description: 'Tedarikçi faturaları ve ürün bazlı takip',
    icon: FileText,
  },
  {
    stepNumber: 5,
    id: 'closing',
    label: '5. Günlük Kasa Kapanışı',
    shortLabel: 'Kapanış',
    description: 'Kasa devri kilitleme ve gün sonu mutabakatı',
    icon: Lock,
  },
  {
    stepNumber: 6,
    id: 'vault',
    label: '6. Ana Kasa (Banknot)',
    shortLabel: 'Ana Kasa',
    description: 'Kalan nakit aktarımı ve banknotlu rezerv kasa takibi',
    icon: Wallet,
  },
];

interface CashierStepFooterProps {
  currentTab: TabType;
  onNavigate: (tab: TabType) => void;
  onFinish?: () => void;
}

export const CashierStepFooter: React.FC<CashierStepFooterProps> = ({
  currentTab,
  onNavigate,
  onFinish,
}) => {
  const currentIndex = CASHIER_STEPS.findIndex((s) => s.id === currentTab);

  if (currentIndex === -1) {
    return null;
  }

  const handleStepClick = (tab: TabType) => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    onNavigate(tab);
  };

  const currentStep = CASHIER_STEPS[currentIndex];
  const prevStep = currentIndex > 0 ? CASHIER_STEPS[currentIndex - 1] : null;
  const nextStep = currentIndex < CASHIER_STEPS.length - 1 ? CASHIER_STEPS[currentIndex + 1] : null;
  const isLastStep = currentIndex === CASHIER_STEPS.length - 1;

  return (
    <div className="mt-8 pt-5 border-t border-[#30363d] bg-[#161b22]/90 rounded-2xl p-4 sm:p-5 border shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 select-none">
      {/* Left: Previous Step Button */}
      <div className="w-full md:w-auto flex items-center justify-start">
        {prevStep ? (
          <button
            id="btn-cashier-step-prev"
            onClick={() => handleStepClick(prevStep.id)}
            className="w-full md:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] hover:border-gray-500 text-gray-200 hover:text-white text-xs font-mono font-semibold transition cursor-pointer shadow-sm group"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-white transition group-hover:-translate-x-0.5" />
            <div className="text-left">
              <span className="text-[10px] text-gray-400 block font-normal leading-none">Geri Adım ({prevStep.stepNumber}/5)</span>
              <span>{prevStep.shortLabel}</span>
            </div>
          </button>
        ) : (
          <div className="hidden md:block text-[11px] text-gray-400 font-mono px-3 py-2 bg-[#0d1117]/60 rounded-xl border border-[#30363d]/40">
            Adım 1 / 5: Başlangıç
          </div>
        )}
      </div>

      {/* Middle: Visual Step Progress Indicator */}
      <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto no-scrollbar py-1">
        {CASHIER_STEPS.map((step, idx) => {
          const isCurrent = step.id === currentTab;
          const isPassed = idx < currentIndex;
          const StepIcon = step.icon;

          return (
            <button
              key={step.id}
              onClick={() => handleStepClick(step.id)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer border ${
                isCurrent
                  ? 'bg-orange-500 text-white font-bold border-orange-400 shadow-md shadow-orange-500/20'
                  : isPassed
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/40'
                  : 'bg-[#21262d]/50 text-gray-400 border-[#30363d]/70 hover:bg-[#21262d] hover:text-gray-200'
              }`}
              title={step.label}
            >
              {isPassed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isCurrent ? 'bg-white text-orange-600' : 'bg-[#30363d] text-gray-300'
                }`}>
                  {step.stepNumber}
                </span>
              )}
              <span className="hidden sm:inline truncate">{step.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Next Step / Complete Button */}
      <div className="w-full md:w-auto flex items-center justify-end">
        {nextStep ? (
          <button
            id="btn-cashier-step-next"
            onClick={() => handleStepClick(nextStep.id)}
            className="w-full md:w-auto flex items-center justify-center space-x-2.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-mono font-bold transition cursor-pointer shadow-lg shadow-orange-600/20 group"
          >
            <div className="text-right">
              <span className="text-[10px] text-orange-200 block font-normal leading-none">Sonraki Adım ({nextStep.stepNumber}/5)</span>
              <span>{nextStep.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-1 transition" />
          </button>
        ) : (
          <button
            id="btn-cashier-step-finish"
            onClick={() => {
              window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              if (onFinish) {
                onFinish();
              } else {
                onNavigate('dashboard');
              }
            }}
            className="w-full md:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition cursor-pointer shadow-lg shadow-emerald-600/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Kasa Kapanışını Tamamla & Panoya Dön</span>
          </button>
        )}
      </div>
    </div>
  );
};
