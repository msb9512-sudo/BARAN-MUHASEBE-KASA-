import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Receipt,
  Wallet,
  Building2,
  Calendar,
  Sparkles,
  ArrowRight,
  Coins,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DailyEntry, CashExpense, Invoice, TabType, MasterSafeState, BanknoteCounts } from '../types';
import { formatCurrency, formatDateTR, formatDateWithDayTR } from '../utils/formatters';
import { calculateDailyRegister, auditDailyEntry } from '../utils/calculations';
import { exportDailyRegisterToExcel } from '../utils/excelExport';
import { CashierStepFooter } from './CashierStepFooter';
import { BanknoteCountModal, BanknoteModalSubmitData } from './BanknoteCountModal';

interface DailyClosingViewProps {
  currentEntry: DailyEntry;
  onUpdateEntry: (updated: DailyEntry) => void;
  expenses: CashExpense[];
  invoices: Invoice[];
  masterSafe?: MasterSafeState;
  onTransferToMasterSafe?: (transferData: {
    date: string;
    amount: number;
    banknotes: BanknoteCounts;
    enteredBy: string;
    description: string;
  }) => void;
  onOpenBossReport: () => void;
  onNavigate?: (tab: TabType) => void;
}

export const DailyClosingView: React.FC<DailyClosingViewProps> = ({
  currentEntry,
  onUpdateEntry,
  expenses,
  invoices,
  masterSafe,
  onTransferToMasterSafe,
  onOpenBossReport,
  onNavigate,
}) => {
  const [accountantName, setAccountantName] = useState(currentEntry.closedBy || 'Mehmet Muhasebe');
  const [isBanknoteModalOpen, setIsBanknoteModalOpen] = useState(false);

  const reg = calculateDailyRegister(currentEntry, expenses, invoices);
  const warnings = auditDailyEntry(currentEntry, expenses, invoices);
  const errorCount = warnings.filter((w) => w.type === 'error').length;
  const isClosed = currentEntry.status === 'closed';

  // Remaining positive cash that should be transferred to Master Safe
  const remainingCashToTransfer = reg.actualCashInHand > 0 ? reg.actualCashInHand : reg.expectedCash;

  const handleCloseDay = () => {
    if (errorCount > 0) {
      const confirmClose = window.confirm(
        `Dikkat: Sistemde ${errorCount} adet kritik uyarı/fark bulunuyor. Yine de bu günün kapanışını onaylamak istiyor musunuz?`
      );
      if (!confirmClose) return;
    }

    onUpdateEntry({
      ...currentEntry,
      status: 'closed',
      closedAt: new Date().toISOString(),
      closedBy: accountantName.trim() || 'Muhasebe Sorumlusu',
      updatedAt: new Date().toISOString(),
    });

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    // If there is cash to transfer and not yet transferred, prompt the banknote modal
    if (remainingCashToTransfer > 0 && !currentEntry.vaultTransfer?.transferred) {
      setIsBanknoteModalOpen(true);
    }
  };

  const handleBanknoteTransferConfirm = (data: BanknoteModalSubmitData) => {
    // 1. Notify parent master safe
    if (onTransferToMasterSafe) {
      onTransferToMasterSafe({
        date: currentEntry.date,
        amount: data.totalAmount,
        banknotes: data.banknotes,
        enteredBy: data.enteredBy || accountantName,
        description: data.description || `${formatDateTR(currentEntry.date)} Gün Sonu Kalan Kasa Nakti`,
      });
    }

    // 2. Mark entry as transferred
    onUpdateEntry({
      ...currentEntry,
      vaultTransfer: {
        transferred: true,
        amount: data.totalAmount,
        banknotes: data.banknotes,
        transferredAt: new Date().toISOString(),
        transferredBy: data.enteredBy || accountantName,
      },
      updatedAt: new Date().toISOString(),
    });

    setIsBanknoteModalOpen(false);
  };

  const handleReopenDay = () => {
    if (window.confirm('Bu günün kapanış kilidini açıp yeniden düzenlenebilir duruma getirmek istiyor musunuz?')) {
      onUpdateEntry({
        ...currentEntry,
        status: 'draft',
        updatedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div
        className={`p-6 rounded-xl border text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
          isClosed
            ? 'bg-[#161b22] border-emerald-500/50'
            : 'bg-[#161b22] border-[#30363d]'
        }`}
      >
        <div className="flex items-start space-x-4">
          <div
            className={`p-3.5 rounded-xl ${
              isClosed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
            }`}
          >
            {isClosed ? <Lock className="w-8 h-8" /> : <Unlock className="w-8 h-8" />}
          </div>
          <div>
            <div className="flex items-center space-x-2 font-mono">
              <span className="text-xs font-semibold text-orange-500 uppercase tracking-wider">
                GÜNLÜK MUHASEBE VE KASA KAPANIŞI
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  isClosed
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {isClosed ? 'KAPATILDI & KİLİTLENDİ' : 'AÇIK (DÜZENLENEBİLİR)'}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-white mt-1">
              {formatDateWithDayTR(currentEntry.date)}
            </h2>
            {isClosed && (
              <p className="text-xs text-gray-400 font-mono mt-1">
                Kapanış Yapan: <strong className="text-gray-200">{currentEntry.closedBy}</strong> • Saat:{' '}
                {new Date(currentEntry.closedAt || '').toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono">
          <button
            onClick={() => exportDailyRegisterToExcel(currentEntry, expenses, invoices)}
            className="flex items-center space-x-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-semibold px-3.5 py-2 rounded-lg border border-[#30363d] transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Günlük Excel İndir</span>
          </button>

          <button
            onClick={onOpenBossReport}
            className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-md transition cursor-pointer"
          >
            <span>👔</span>
            <span>Patron Raporu</span>
          </button>

          {isClosed ? (
            <button
              onClick={handleReopenDay}
              className="flex items-center space-x-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-semibold px-3.5 py-2 rounded-lg border border-rose-800 transition cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Kapanışı Yeniden Aç</span>
            </button>
          ) : (
            <button
              onClick={handleCloseDay}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Kapanışı Onayla ve Kilitle</span>
            </button>
          )}
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Full Daily Financial Statement (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 sm:p-6 shadow-lg font-mono">
            <h3 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
              <span>📋 Günlük Finansal Hesap Özeti</span>
            </h3>

            <div className="space-y-4 text-xs">
              
              {/* 1. Vega Sales Group */}
              <div className="border border-[#30363d] rounded-lg overflow-hidden bg-[#0d1117]">
                <div className="bg-[#161b22] px-4 py-2.5 font-bold text-gray-200 flex items-center justify-between border-b border-[#30363d]">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>1. GELİRLER & HASILAT (VEGA ŞEFİM)</span>
                  </div>
                  <span className="text-emerald-400 text-sm">
                    {formatCurrency(reg.totalSales)}
                  </span>
                </div>
                <div className="p-3 divide-y divide-[#21262d]">
                  {currentEntry.vegaReport.grossProductSales ? (
                    <div className="py-1.5 flex justify-between">
                      <span className="text-gray-400">Brüt Ürün Satışı:</span>
                      <strong className="text-white">{formatCurrency(currentEntry.vegaReport.grossProductSales)}</strong>
                    </div>
                  ) : null}
                  {(currentEntry.vegaReport.discountTotal || currentEntry.vegaReport.discountAmount) ? (
                    <div className="py-1.5 flex justify-between">
                      <span className="text-rose-400 font-semibold">(-) Toplam İskonto:</span>
                      <strong className="text-rose-400">-{formatCurrency(currentEntry.vegaReport.discountTotal || currentEntry.vegaReport.discountAmount || 0)}</strong>
                    </div>
                  ) : null}
                  {currentEntry.vegaReport.openAccountTotal ? (
                    <div className="py-1.5 flex justify-between">
                      <span className="text-amber-400 font-semibold">(-) Açık Hesap (Cari):</span>
                      <strong className="text-amber-400">-{formatCurrency(currentEntry.vegaReport.openAccountTotal)}</strong>
                    </div>
                  ) : null}
                  <div className="py-1.5 flex justify-between font-bold">
                    <span className="text-gray-300">(=) Net Satış (Ciro):</span>
                    <strong className="text-emerald-400">{formatCurrency(reg.totalSales)}</strong>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span className="text-gray-400">Nakit Satış:</span>
                    <strong className="text-white">{formatCurrency(reg.cashSales)}</strong>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span className="text-gray-400">Kredi Kartı Satış (Vega):</span>
                    <strong className="text-blue-400">{formatCurrency(reg.creditCardSales)}</strong>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span className="text-gray-400">Diğer Satışlar (Yemek Kartı vb.):</span>
                    <strong className="text-white">{formatCurrency(reg.otherSales)}</strong>
                  </div>
                  <div className="py-1.5 flex justify-between text-[11px] text-gray-500">
                    <span>Masa / Kuver Sayısı:</span>
                    <span>{currentEntry.vegaReport.tableCount || 0} Adisyon / {currentEntry.vegaReport.guestCount || 0} Kişi</span>
                  </div>
                </div>
              </div>

              {/* 2. POS Z-Report Reconciliation */}
              <div className="border border-[#30363d] rounded-lg overflow-hidden bg-[#0d1117]">
                <div className="bg-[#161b22] px-4 py-2.5 font-bold text-gray-200 flex items-center justify-between border-b border-[#30363d]">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    <span>2. POS Z RAPORLARI DENETİMİ</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${reg.isPosReconciled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                    {reg.isPosReconciled ? '✓ UYUMLU' : `${reg.posVegaDifference > 0 ? '+' : ''}${reg.posVegaDifference.toLocaleString('tr-TR')} ₺ FARK`}
                  </span>
                </div>
                <div className="p-3 divide-y divide-[#21262d]">
                  {currentEntry.posReports.map((p) => (
                    <div key={p.id} className="py-1.5 flex justify-between">
                      <span className="text-gray-400">
                        {p.posDeviceName} {p.zNumber && `(Z: ${p.zNumber})`}:
                      </span>
                      <strong className="text-white">{formatCurrency(p.creditCardTotal)}</strong>
                    </div>
                  ))}
                  <div className="py-1.5 flex justify-between font-bold text-white pt-2">
                    <span>TOPLAM POS:</span>
                    <span className="text-blue-400">{formatCurrency(reg.posTotal)}</span>
                  </div>
                </div>
              </div>

              {/* 3. Cash Expenses & Withdrawals */}
              <div className="border border-[#30363d] rounded-lg overflow-hidden bg-[#0d1117]">
                <div className="bg-[#161b22] px-4 py-2.5 font-bold text-gray-200 flex items-center justify-between border-b border-[#30363d]">
                  <div className="flex items-center space-x-2">
                    <Receipt className="w-4 h-4 text-amber-400" />
                    <span>3. KASADAN ÇIKIŞLAR & GİDERLER</span>
                  </div>
                  <span className="text-amber-400 text-sm">
                    -{formatCurrency(reg.totalCashOutflow)}
                  </span>
                </div>
                <div className="p-3 divide-y divide-[#21262d]">
                  <div className="py-1.5 flex justify-between">
                    <span className="text-gray-400">Kasadan Ödenen Günlük Giderler:</span>
                    <strong className="text-amber-400">-{formatCurrency(reg.cashExpenses)}</strong>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span className="text-gray-400">Kasadan Ödenen Faturalar:</span>
                    <strong className="text-purple-400">-{formatCurrency(reg.invoiceCashPayments)}</strong>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span className="text-gray-400">Bankaya Yatırılan / Çekim:</span>
                    <strong className="text-gray-300">-{formatCurrency(reg.cashWithdrawals)}</strong>
                  </div>
                </div>
              </div>

              {/* 4. Final Register Balance */}
              <div className="p-4 rounded-lg bg-[#0d1117] text-white border border-[#30363d] space-y-2">
                <div className="flex items-center justify-between text-gray-400">
                  <span>Önceki Günden Devir:</span>
                  <span className="font-mono">{formatCurrency(reg.openingCash)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>(+) Nakit Satış:</span>
                  <span className="font-mono text-emerald-400">+{formatCurrency(reg.cashSales)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>(-) Kasadan Toplam Çıkan:</span>
                  <span className="font-mono text-amber-400">-{formatCurrency(reg.totalCashOutflow)}</span>
                </div>
                <div className="pt-2 border-t border-[#30363d] flex items-center justify-between font-bold text-sm">
                  <span className="text-gray-200">BEKLENEN NAKİT KASA:</span>
                  <span className="text-emerald-400 font-mono">{formatCurrency(reg.expectedCash)}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-sm">
                  <span className="text-amber-300">(Fiili) SAYILAN KASA MEVCUDU:</span>
                  <span className="text-amber-300 font-mono">{formatCurrency(reg.actualCashInHand)}</span>
                </div>
                <div
                  className={`pt-2 border-t border-[#30363d] flex items-center justify-between text-base font-bold ${
                    reg.isCashBalanced ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  <span>KASA FARKI:</span>
                  <span className="font-mono">
                    {reg.cashDifference > 0 ? '+' : ''}
                    {reg.cashDifference.toLocaleString('tr-TR')} ₺
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Column: Automated Checklist & Accountant Approval (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Smart Audit Checklist */}
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 shadow-lg space-y-4 font-mono">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Otomatik Kapanış Denetim Listesi</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              
              {/* Check 1: Vega Sales */}
              <div
                className={`p-3 rounded-lg border flex items-center space-x-3 ${
                  reg.totalSales > 0
                    ? 'bg-[#0d1117] border-emerald-500/30 text-emerald-300'
                    : 'bg-[#0d1117] border-rose-500/30 text-rose-300'
                }`}
              >
                {reg.totalSales > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="font-bold">Vega Şefim Satışları Girildi</div>
                  <div className="text-[11px] opacity-80 text-gray-400">Toplam: {formatCurrency(reg.totalSales)}</div>
                </div>
              </div>

              {/* Check 2: POS Z Reports */}
              <div
                className={`p-3 rounded-lg border flex items-center space-x-3 ${
                  currentEntry.posReports.length > 0 && reg.posTotal > 0
                    ? 'bg-[#0d1117] border-emerald-500/30 text-emerald-300'
                    : 'bg-[#0d1117] border-amber-500/30 text-amber-300'
                }`}
              >
                {currentEntry.posReports.length > 0 && reg.posTotal > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="font-bold">POS Cihazları Z Raporları Alındı</div>
                  <div className="text-[11px] opacity-80 text-gray-400">{currentEntry.posReports.length} Cihaz Kaydedildi</div>
                </div>
              </div>

              {/* Check 3: POS vs Vega Match */}
              <div
                className={`p-3 rounded-lg border flex items-center space-x-3 ${
                  reg.isPosReconciled
                    ? 'bg-[#0d1117] border-emerald-500/30 text-emerald-300'
                    : 'bg-[#0d1117] border-rose-500/30 text-rose-300'
                }`}
              >
                {reg.isPosReconciled ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="font-bold">Vega & POS Mutabakatı</div>
                  <div className="text-[11px] opacity-80 text-gray-400">
                    {reg.isPosReconciled
                      ? 'Kredi kartı ciroları birebir eşit'
                      : `Fark: ${reg.posVegaDifference > 0 ? '+' : ''}${reg.posVegaDifference.toLocaleString('tr-TR')} ₺`}
                  </div>
                </div>
              </div>

              {/* Check 4: Cash Register Count */}
              <div
                className={`p-3 rounded-lg border flex items-center space-x-3 ${
                  reg.isCashBalanced
                    ? 'bg-[#0d1117] border-emerald-500/30 text-emerald-300'
                    : 'bg-[#0d1117] border-rose-500/30 text-rose-300'
                }`}
              >
                {reg.isCashBalanced ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="font-bold">Nakit Kasa Sayım Doğrulaması</div>
                  <div className="text-[11px] opacity-80 text-gray-400">
                    {reg.isCashBalanced
                      ? 'Kasa mevcudu eksiksiz mutabık'
                      : `Kasa Farkı: ${reg.cashDifference > 0 ? '+' : ''}${reg.cashDifference.toLocaleString('tr-TR')} ₺`}
                  </div>
                </div>
              </div>

            </div>

            {/* Approval Input & Confirmation Box */}
            <div className="pt-4 border-t border-[#30363d] space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Kapanışı Yapan Muhasebeci / Kasiyer
                </label>
                <input
                  type="text"
                  value={accountantName}
                  onChange={(e) => setAccountantName(e.target.value)}
                  disabled={isClosed}
                  placeholder="Ad Soyad"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white disabled:opacity-60 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {!isClosed ? (
                <button
                  onClick={handleCloseDay}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>{formatDateTR(currentEntry.date)} Günlük Kapanışını Tamamla</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <div className="text-xs font-bold text-emerald-400">
                    ✓ Bu günün kapanış işlemleri tamamlanmıştır.
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Patron raporunu gönderebilir veya aylık dökümlere aktarabilirsiniz.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Master Safe Vault Transfer Card */}
          <div className="bg-[#161b22] rounded-xl border border-amber-500/40 p-5 shadow-lg space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Ana Kasaya Kalan Nakit Devri
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                BANKNOT SAYIMI
              </span>
            </div>

            {currentEntry.vaultTransfer?.transferred ? (
              <div className="p-3.5 rounded-xl bg-[#0d1117] border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ana Kasaya Aktarıldı</span>
                  </span>
                  <strong className="text-sm text-white font-black">
                    {formatCurrency(currentEntry.vaultTransfer.amount)}
                  </strong>
                </div>

                {/* Banknotes Breakdown */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[200, 100, 50, 20, 10, 5, 1]
                    .filter((d) => Number(currentEntry.vaultTransfer?.banknotes?.[d]) > 0)
                    .map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#161b22] border border-[#30363d] text-[11px] text-gray-300"
                      >
                        <strong className="text-amber-400">{d} ₺</strong>
                        <span>×</span>
                        <strong className="text-white">
                          {currentEntry.vaultTransfer?.banknotes[d]}
                        </strong>
                      </span>
                    ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#21262d] text-[11px] text-gray-400">
                  <span>
                    Aktaran: <strong className="text-gray-300">{currentEntry.vaultTransfer.transferredBy}</strong>
                  </span>
                  <button
                    onClick={() => setIsBanknoteModalOpen(true)}
                    className="text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer"
                  >
                    Sayımı Güncelle
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Devredilecek Net Kasa Nakti:</span>
                  <strong className="text-sm font-black text-amber-400">
                    {formatCurrency(remainingCashToTransfer)}
                  </strong>
                </div>
                <p className="text-[11px] text-gray-300">
                  Günün kapanışında artan nakit mevcudunu küpürlerine (200₺, 100₺, 50₺...) ayırarak ana kasaya devredin.
                </p>
                <button
                  onClick={() => setIsBanknoteModalOpen(true)}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Coins className="w-4 h-4" />
                  <span>Kalan Nakti Banknot Sayımıyla Aktar</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Banknote Count & Transfer Modal */}
      {isBanknoteModalOpen && (
        <BanknoteCountModal
          isOpen={true}
          onClose={() => setIsBanknoteModalOpen(false)}
          mode="closing_transfer"
          currentSafe={masterSafe}
          targetAmount={remainingCashToTransfer}
          initialDate={currentEntry.date}
          initialDescription={`${formatDateTR(currentEntry.date)} Gün Sonu Kalan Kasa Nakti`}
          initialCategory="Gün Sonu Kasa Devri"
          onConfirm={handleBanknoteTransferConfirm}
        />
      )}

      {/* Sequential Cashier Workflow Navigation Footer */}
      {onNavigate && (
        <CashierStepFooter
          currentTab="closing"
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
};
