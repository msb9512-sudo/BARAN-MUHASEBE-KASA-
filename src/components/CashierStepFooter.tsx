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
    <div className="mt-8 pt-4 border-t border-[#30363d] flex items-center justify-between gap-3 select-none font-mono">
      {/* Left: Previous Step Button */}
      <div>
        {prevStep ? (
          <button
            id="btn-cashier-step-prev"
            type="button"
            onClick={() => handleStepClick(prevStep.id)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] hover:border-gray-500 text-gray-200 hover:text-white text-xs font-semibold transition cursor-pointer shadow-sm group"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-white transition group-hover:-translate-x-0.5" />
            <span>Önceki</span>
          </button>
        ) : (
          <div />
        )}
      </div>

      {/* Right: Next Step / Complete Button */}
      <div>
        {nextStep ? (
          <button
            id="btn-cashier-step-next"
            type="button"
            onClick={() => handleStepClick(nextStep.id)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] hover:border-gray-500 text-gray-200 hover:text-white text-xs font-semibold transition cursor-pointer shadow-sm group"
          >
            <span>Sonraki</span>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white transition group-hover:translate-x-0.5" />
          </button>
        ) : (
          <button
            id="btn-cashier-step-finish"
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              if (onFinish) {
                onFinish();
              } else {
                onNavigate('dashboard');
              }
            }}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Panoya Dön</span>
          </button>
        )}
      </div>
    </div>
  );
};
