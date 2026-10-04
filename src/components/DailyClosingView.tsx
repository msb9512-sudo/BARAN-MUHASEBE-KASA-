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
  Info,
  Edit2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DailyEntry, CashExpense, Invoice, TabType, MasterSafeState, BanknoteCounts, FinancialAccount, AccountTransaction } from '../types';
import { formatCurrency, formatDateTR, formatDateWithDayTR, parseNumberInput } from '../utils/formatters';
import { calculateDailyRegister, auditDailyEntry, getPreviousDayClosingCarryOver } from '../utils/calculations';
import { exportDailyRegisterToExcel } from '../utils/excelExport';
import { CashierStepFooter } from './CashierStepFooter';

interface DailyClosingViewProps {
  currentEntry: DailyEntry;
  onUpdateEntry: (updated: DailyEntry) => void;
  expenses: CashExpense[];
  invoices: Invoice[];
  masterSafe?: MasterSafeState;
  accounts?: FinancialAccount[];
  accountTransactions?: AccountTransaction[];
  allEntries?: Record<string, DailyEntry> | DailyEntry[];
  onTransferToMasterSafe?: (transferData: {
    date: string;
    amount: number;
    banknotes: BanknoteCounts;
    enteredBy: string;
    description: string;
  }) => void;
  onSaveClosingTransaction?: (date: string, closingCarryOver: number, openingCash: number) => void;
  onRemoveClosingTransaction?: (date: string) => void;
  onOpenBossReport: () => void;
  onNavigate?: (tab: TabType) => void;
}

export const DailyClosingView: React.FC<DailyClosingViewProps> = ({
  currentEntry,
  onUpdateEntry,
  expenses,
  invoices,
  masterSafe,
  accounts = [],
  accountTransactions = [],
  allEntries = [],
  onTransferToMasterSafe,
  onSaveClosingTransaction,
  onRemoveClosingTransaction,
  onOpenBossReport,
  onNavigate,
}) => {
  const [accountantName, setAccountantName] = useState(currentEntry.closedBy || 'Mehmet Muhasebe');
  const [isEditingDevir, setIsEditingDevir] = useState(false);
  const [devirInput, setDevirInput] = useState('');
  const [isCarryOverModalOpen, setIsCarryOverModalOpen] = useState(false);
  const [carryOverInput, setCarryOverInput] = useState('');

  const mainAccount = accounts?.find((a) => a.isDefault || a.id === 'ana-kasa' || a.type === 'cash');
  const reg = calculateDailyRegister(currentEntry, expenses, invoices, accountTransactions, mainAccount);
  const warnings = auditDailyEntry(currentEntry, expenses, invoices, accountTransactions, mainAccount);
  const errorCount = warnings.filter((w) => w.type === 'error').length;
  const isClosed = currentEntry.status === 'closed';

  const finalizeClosing = (carryOver?: number, diff?: number) => {
    const finalCarryOver = carryOver !== undefined ? carryOver : reg.expectedCash;
    const finalDiff = diff !== undefined ? diff : Math.round((finalCarryOver - reg.openingCash) * 100) / 100;

    onUpdateEntry({
      ...currentEntry,
      status: 'closed',
      closingCarryOver: finalCarryOver,
      carryOverDifference: finalDiff,
      closedAt: new Date().toISOString(),
      closedBy: accountantName.trim() || 'Muhasebe Sorumlusu',
      updatedAt: new Date().toISOString(),
    });

    onSaveClosingTransaction?.(currentEntry.date, finalCarryOver, reg.openingCash);

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
  };

  const handleCloseDay = () => {
    if (errorCount > 0) {
      const confirmClose = window.confirm(
        `Dikkat: Sistemde ${errorCount} adet kritik uyarı/fark bulunuyor. Yine de bu günün kapanışını onaylamak istiyor musunuz?`
      );
      if (!confirmClose) return;
    }

    // Fiili sayılan kasa ile beklenen kasa tutuyorsa
    const hasCashDifference = Math.abs(reg.cashDifference) >= 0.01;
    if (hasCashDifference) {
      setCarryOverInput(reg.expectedCash.toString());
      setIsCarryOverModalOpen(true);
      return;
    }

    finalizeClosing(undefined, undefined);
  };

  const handleConfirmCarryOver = () => {
    const parsed = parseFloat(carryOverInput.replace(',', '.'));
    if (isNaN(parsed)) {
      window.alert('Lütfen geçerli bir devir tutarı giriniz.');
      return;
    }
    const diff = Math.round((parsed - reg.expectedCash) * 100) / 100;
    setIsCarryOverModalOpen(false);
    finalizeClosing(parsed, diff);
  };

  const handleReopenDay = () => {
    if (window.confirm('Bu günün kapanış kilidini açıp yeniden düzenlenebilir duruma getirmek istiyor musunuz?')) {
      onUpdateEntry({
        ...currentEntry,
        status: 'draft',
        closingCarryOver: undefined,
        carryOverDifference: undefined,
        updatedAt: new Date().toISOString(),
      });
      onRemoveClosingTransaction?.(currentEntry.date);
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
              <div className="space-y-0.5 mt-1 font-mono text-xs">
                <p className="text-gray-400">
                  Kapanış Yapan: <strong className="text-gray-200">{currentEntry.closedBy}</strong> • Saat:{' '}
                  {new Date(currentEntry.closedAt || '').toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {currentEntry.closingCarryOver !== undefined && (
                  <p className="text-amber-300">
                    Yarına Devreden Kasa: <strong className="text-white">{formatCurrency(currentEntry.closingCarryOver)}</strong>
                    {currentEntry.carryOverDifference !== undefined && Math.abs(currentEntry.carryOverDifference) >= 0.01 && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        Kasa Düzeltmesi: {currentEntry.carryOverDifference > 0 ? '+' : ''}{formatCurrency(currentEntry.carryOverDifference)}
                      </span>
                    )}
                  </p>
                )}
              </div>
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

      {/* Main Container: Stacked Vertically with Enriched Big Windows on Top, Checklist at Bottom */}
      <div className="space-y-6">
        
        {/* Top: Full Daily Financial Statement Windows (Büyütülmüş Finansal Pencereler) */}
        <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 sm:p-6 shadow-lg font-mono space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#30363d] gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                <span>📋 Günlük Finansal Hesap Özeti & Kasa Dengesi</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDateTR(currentEntry.date)} Tarihli gelirler, POS Z mutabakatı, kasa giderleri ve net kasa mevcudu
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-gray-400">Net Ciro (Vega):</span>
              <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                {formatCurrency(reg.totalSales)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 text-xs">
            
            {/* 1. Vega Sales Group */}
            <div className="border border-[#30363d] rounded-xl overflow-hidden bg-[#0d1117] flex flex-col justify-between">
              <div className="bg-[#161b22] px-4 py-3 font-bold text-gray-200 flex items-center justify-between border-b border-[#30363d]">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>1. GELİRLER & HASILAT (VEGA ŞEFİM)</span>
                </div>
                <span className="text-emerald-400 text-sm font-bold">
                  {formatCurrency(reg.totalSales)}
                </span>
              </div>
              <div className="p-3.5 divide-y divide-[#21262d] flex-1">
                {currentEntry.vegaReport.grossProductSales ? (
                  <div className="py-2 flex justify-between">
                    <span className="text-gray-400">Brüt Ürün Satışı:</span>
                    <strong className="text-white">{formatCurrency(currentEntry.vegaReport.grossProductSales)}</strong>
                  </div>
                ) : null}
                {(currentEntry.vegaReport.discountTotal || currentEntry.vegaReport.discountAmount) ? (
                  <div className="py-2 flex justify-between">
                    <span className="text-rose-400 font-semibold">(-) Toplam İskonto:</span>
                    <strong className="text-rose-400">-{formatCurrency(currentEntry.vegaReport.discountTotal || currentEntry.vegaReport.discountAmount || 0)}</strong>
                  </div>
                ) : null}
                {currentEntry.vegaReport.openAccountTotal ? (
                  <div className="py-2 flex justify-between">
                    <span className="text-amber-400 font-semibold">(-) Açık Hesap (Cari):</span>
                    <strong className="text-amber-400">-{formatCurrency(currentEntry.vegaReport.openAccountTotal)}</strong>
                  </div>
                ) : null}
                <div className="py-2 flex justify-between font-bold">
                  <span className="text-gray-300">(=) Net Satış (Ciro):</span>
                  <strong className="text-emerald-400 text-sm">{formatCurrency(reg.totalSales)}</strong>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-gray-400">Nakit Satış:</span>
                  <strong className="text-white">{formatCurrency(reg.cashSales)}</strong>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-gray-400">Kredi Kartı Satış (Vega):</span>
                  <strong className="text-blue-400">{formatCurrency(reg.creditCardSales)}</strong>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-gray-400">Diğer Satışlar (Yemek Kartı vb.):</span>
                  <strong className="text-white">{formatCurrency(reg.otherSales)}</strong>
                </div>
                <div className="py-2 flex justify-between text-[11px] text-gray-500">
                  <span>Masa / Kuver Sayısı:</span>
                  <span>{currentEntry.vegaReport.tableCount || 0} Adisyon / {currentEntry.vegaReport.guestCount || 0} Kişi</span>
                </div>
              </div>
            </div>

            {/* 2. POS Z-Report Reconciliation */}
            <div className="border border-[#30363d] rounded-xl overflow-hidden bg-[#0d1117] flex flex-col justify-between">
              <div className="bg-[#161b22] px-4 py-3 font-bold text-gray-200 flex items-center justify-between border-b border-[#30363d]">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  <span>2. POS Z RAPORLARI DENETİMİ</span>
                </div>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded font-bold ${
                    reg.isNoVegaCardSales
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : reg.isPosReconciled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {reg.isNoVegaCardSales
                    ? 'Kart satışı raporda yok, POS toplamı baz alındı'
                    : reg.isPosReconciled
                    ? '✓ UYUMLU'
                    : `${reg.posVegaDifference > 0 ? '+' : ''}${reg.posVegaDifference.toLocaleString('tr-TR')} ₺ FARK`}
                </span>
              </div>
              <div className="p-3.5 divide-y divide-[#21262d] flex-1">
                {currentEntry.posReports.map((p) => (
                  <div key={p.id} className="py-2 flex justify-between">
                    <span className="text-gray-400">
                      {p.posDeviceName} {p.zNumber && `(Z: ${p.zNumber})`}:
                    </span>
                    <strong className="text-white">{formatCurrency(p.creditCardTotal)}</strong>
                  </div>
                ))}
                <div className="py-2.5 flex justify-between font-bold text-white pt-3 border-t border-[#30363d]">
                  <span className="text-gray-200">TOPLAM POS Z RAPORU:</span>
                  <span className="text-blue-400 text-sm">{formatCurrency(reg.posTotal)}</span>
                </div>
              </div>
            </div>

            {/* 3. Cash Expenses & Withdrawals */}
            <div className="border border-[#30363d] rounded-xl overflow-hidden bg-[#0d1117] flex flex-col justify-between">
              <div className="bg-[#161b22] px-4 py-3 font-bold text-gray-200 flex items-center justify-between border-b border-[#30363d]">
                <div className="flex items-center space-x-2">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>3. KASADAN ÇIKIŞLAR & GİDERLER</span>
                </div>
                <span className="text-amber-400 text-sm font-bold">
                  -{formatCurrency(reg.totalCashOutflow)}
                </span>
              </div>
              <div className="p-3.5 divide-y divide-[#21262d] flex-1">
                <div className="py-2 flex justify-between">
                  <span className="text-gray-400">Kasadan Ödenen Günlük Giderler:</span>
                  <strong className="text-amber-400">-{formatCurrency(reg.cashExpenses)}</strong>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-gray-400">Kasadan Ödenen Faturalar:</span>
                  <strong className="text-purple-400">-{formatCurrency(reg.invoiceCashPayments)}</strong>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-gray-400">Bankaya Yatırılan / Çekim:</span>
                  <strong className="text-gray-300">-{formatCurrency(reg.cashWithdrawals)}</strong>
                </div>
                {reg.creditCardExpenses > 0 && (
                  <div className="py-2 flex justify-between items-center text-sky-400 bg-sky-950/20 px-2 rounded mt-1 border border-sky-800/30">
                    <span className="flex items-center gap-1.5 font-medium">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Kredi & Kart Giderleri (Kasadan Düşmez):</span>
                    </span>
                    <strong className="text-sky-300 font-bold">{formatCurrency(reg.creditCardExpenses)}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Final Register Balance */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#0d1117] text-white border border-[#30363d] space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-gray-400">
                  <div className="flex items-center space-x-1.5">
                    <span>Önceki Günden Devir:</span>
                    {!currentEntry.isOpeningCashManual ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        ✓ Otomatik
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                        Elle
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {!isEditingDevir ? (
                      <>
                        <span className="font-mono">{formatCurrency(reg.openingCash)}</span>
                        {!isClosed && (
                          <button
                            type="button"
                            onClick={() => {
                              setDevirInput(reg.openingCash.toString());
                              setIsEditingDevir(true);
                            }}
                            className="text-gray-400 hover:text-white text-xs cursor-pointer p-0.5"
                            title="Devir Tutarını Elle Değiştir"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                        {currentEntry.isOpeningCashManual && !isClosed && (
                          <button
                            type="button"
                            onClick={() => {
                              const autoDevir = getPreviousDayClosingCarryOver(
                                currentEntry.date,
                                allEntries,
                                mainAccount
                              );
                              onUpdateEntry({
                                ...currentEntry,
                                openingCash: autoDevir,
                                isOpeningCashManual: false,
                                updatedAt: new Date().toISOString(),
                              });
                            }}
                            className="text-[10px] text-sky-400 hover:text-sky-300 underline cursor-pointer"
                            title="Otomatik Devir Hesabına Dön"
                          >
                            Oto
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={devirInput}
                          onChange={(e) => setDevirInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                          className="w-20 bg-[#161b22] border border-orange-500 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const num = parseNumberInput(devirInput);
                            onUpdateEntry({
                              ...currentEntry,
                              openingCash: num,
                              isOpeningCashManual: true,
                              updatedAt: new Date().toISOString(),
                            });
                            setIsEditingDevir(false);
                          }}
                          className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded cursor-pointer"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingDevir(false)}
                          className="px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-[10px] rounded cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-gray-400">
                  <span>(+) Nakit Satış:</span>
                  <span className="font-mono text-emerald-400 font-bold">+{formatCurrency(reg.cashSales)}</span>
                </div>

                {reg.accountCashDeposits > 0 && (
                  <div className="flex items-center justify-between text-gray-400">
                    <span>(+) Ana Kasa Girişleri:</span>
                    <span className="font-mono text-emerald-400 font-bold">+{formatCurrency(reg.accountCashDeposits)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-gray-400">
                  <span>(-) Kasadan Toplam Çıkan:</span>
                  <span className="font-mono text-amber-400 font-bold">-{formatCurrency(reg.totalCashOutflow)}</span>
                </div>

                {reg.accountCashWithdrawals > 0 && (
                  <div className="flex items-center justify-between text-gray-400">
                    <span>(-) Ana Kasa Çıkışları:</span>
                    <span className="font-mono text-amber-400 font-bold">-{formatCurrency(reg.accountCashWithdrawals)}</span>
                  </div>
                )}
              </div>

              <div className="pt-2.5 border-t border-[#30363d] space-y-2">
                <div className="flex items-center justify-between font-bold text-sm">
                  <span className="text-gray-200">BEKLENEN NAKİT KASA:</span>
                  <span className="text-emerald-400 font-mono text-base">{formatCurrency(reg.expectedCash)}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-sm">
                  <span className="text-amber-300">(Fiili) SAYILAN KASA MEVCUDU:</span>
                  <span className="text-amber-300 font-mono text-base">{formatCurrency(reg.actualCashInHand)}</span>
                </div>
                <div
                  className={`pt-2 border-t border-[#30363d] flex items-center justify-between text-base font-bold ${
                    reg.isCashBalanced ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  <span>KASA FARKI:</span>
                  <span className="font-mono text-lg">
                    {reg.cashDifference > 0 ? '+' : ''}
                    {reg.cashDifference.toLocaleString('tr-TR')} ₺
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom: Automated Checklist & Accountant Approval (Altta Konumlanan Denetim Listesi) */}
        <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 sm:p-6 shadow-lg space-y-5 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#30363d] gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Otomatik Kapanış Denetim Listesi & Onay</span>
            </h3>
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold border self-start sm:self-auto ${
                isClosed
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {isClosed ? '✓ Kilitli & Kapatıldı' : 'Onay Bekliyor'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            
            {/* Check 1: Vega Sales */}
            <div
              className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
                reg.totalSales > 0
                  ? 'bg-[#0d1117] border-emerald-500/30 text-emerald-300'
                  : 'bg-[#0d1117] border-rose-500/30 text-rose-300'
              }`}
            >
              {reg.totalSales > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">1. Vega Satışları</div>
                <div className="text-[11px] opacity-80 text-gray-300 mt-0.5 truncate">
                  Toplam: {formatCurrency(reg.totalSales)}
                </div>
              </div>
            </div>

            {/* Check 2: POS Z Reports */}
            <div
              className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
                currentEntry.posReports.length > 0 && reg.posTotal > 0
                  ? 'bg-[#0d1117] border-emerald-500/30 text-emerald-300'
                  : 'bg-[#0d1117] border-amber-500/30 text-amber-300'
              }`}
            >
              {currentEntry.posReports.length > 0 && reg.posTotal > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">2. POS Z Raporları</div>
                <div className="text-[11px] opacity-80 text-gray-300 mt-0.5 truncate">
                  {currentEntry.posReports.length} Cihaz Kaydedildi
                </div>
              </div>
            </div>

            {/* Check 3: POS vs Vega Match */}
            <div
              className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
                reg.isNoVegaCardSales
                  ? 'bg-[#0d1117] border-sky-500/30 text-sky-300'
                  : reg.isPosReconciled
                  ? 'bg-[#0d1117] border-emerald-500/30 text-emerald-300'
                  : 'bg-[#0d1117] border-rose-500/30 text-rose-300'
              }`}
            >
              {reg.isNoVegaCardSales ? (
                <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
              ) : reg.isPosReconciled ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">3. POS Mutabakatı</div>
                <div className="text-[11px] opacity-80 text-gray-300 mt-0.5 truncate">
                  {reg.isNoVegaCardSales
                    ? 'Kart satışı raporda yok, POS toplamı baz alındı'
                    : reg.isPosReconciled
                    ? 'Kredi kartları tam uyumlu'
                    : `Fark: ${reg.posVegaDifference > 0 ? '+' : ''}${reg.posVegaDifference.toLocaleString('tr-TR')} ₺`}
                </div>
              </div>
            </div>

            {/* Check 4: Cash Register Count */}
            <div
              className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
                reg.isCashBalanced
                  ? 'bg-[#0d1117] border-emerald-500/30 text-emerald-300'
                  : 'bg-[#0d1117] border-rose-500/30 text-rose-300'
              }`}
            >
              {reg.isCashBalanced ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">4. Kasa Sayımı</div>
                <div className="text-[11px] opacity-80 text-gray-300 mt-0.5 truncate">
                  {reg.isCashBalanced
                    ? 'Kasa mevcudu eksiksiz'
                    : `Fark: ${reg.cashDifference > 0 ? '+' : ''}${reg.cashDifference.toLocaleString('tr-TR')} ₺`}
                </div>
              </div>
            </div>

          </div>

          {/* Approval Input & Confirmation Box */}
          <div className="pt-4 border-t border-[#30363d]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-4">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Kapanışı Yapan Muhasebeci / Kasiyer
                </label>
                <input
                  type="text"
                  value={accountantName}
                  onChange={(e) => setAccountantName(e.target.value)}
                  disabled={isClosed}
                  placeholder="Ad Soyad"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-xs text-white disabled:opacity-60 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="lg:col-span-8">
                {!isClosed ? (
                  <button
                    onClick={handleCloseDay}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{formatDateTR(currentEntry.date)} Günlük Kapanışını Tamamla ve Kilitle</span>
                  </button>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>✓ Bu günün kapanış işlemleri kilitlenerek tamamlanmıştır.</span>
                    </div>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('vault')}
                        className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs rounded-lg shadow-md transition cursor-pointer shrink-0"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>6. Ana Kasa & Banknot Sayımına Geç</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Sequential Cashier Workflow Navigation Footer */}
      {onNavigate && (
        <CashierStepFooter
          currentTab="closing"
          onNavigate={onNavigate}
        />
      )}

      {/* Devir ve Kasa Farkı Onay Penceresi (Kural 3) */}
      {isCarryOverModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#161b22] rounded-xl border border-amber-500/50 w-full max-w-md p-6 shadow-2xl space-y-5 text-white font-mono">
            <div className="flex items-center space-x-3 border-b border-[#30363d] pb-3">
              <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Kasa Sayım Farkı ve Devir Onayı</h3>
                <p className="text-xs text-gray-400 font-sans">
                  Sayılan kasa ile hesaplanan kasa arasında fark tespit edildi.
                </p>
              </div>
            </div>

            <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-gray-300">
                <span>Hesaplanan Kasa:</span>
                <span className="font-bold text-white">{formatCurrency(reg.expectedCash)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span>Fiili Sayılan Kasa:</span>
                <span className="font-bold text-sky-400">{formatCurrency(reg.actualCashInHand)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#21262d] pt-2">
                <span className="font-semibold text-gray-200">Kasa Farkı:</span>
                <span className={`font-bold ${reg.cashDifference > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {reg.cashDifference > 0 ? '+' : ''}{formatCurrency(reg.cashDifference)}{' '}
                  <span className="text-[10px] font-normal opacity-80">
                    ({reg.cashDifference > 0 ? 'Fazla' : 'Eksik'})
                  </span>
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider">
                Yarına Devredecek Tutar (₺):
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={carryOverInput}
                  onChange={(e) => setCarryOverInput(e.target.value)}
                  className="w-full bg-[#0d1117] border-2 border-amber-500/60 rounded-xl px-4 py-3 text-lg font-black text-white focus:outline-none focus:border-amber-400"
                  placeholder="0.00"
                  autoFocus
                />
                <span className="absolute right-3.5 top-3.5 text-sm text-gray-400 font-bold">₺</span>
              </div>
              {(() => {
                const val = parseFloat(carryOverInput.replace(',', '.'));
                if (isNaN(val)) return null;
                const diff = Math.round((val - reg.expectedCash) * 100) / 100;
                return (
                  <p className="text-[11px] text-gray-400 font-sans">
                    {Math.abs(diff) < 0.01 ? (
                      <span className="text-gray-300">
                        Hesaplanan kasa ({formatCurrency(reg.expectedCash)}) yarına devir olarak aktarılacak.
                      </span>
                    ) : (
                      <span className={diff > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                        Yarına aktarılacak kasa düzeltmesi:{' '}
                        <strong>
                          {diff > 0 ? '+' : ''}
                          {formatCurrency(diff)}
                        </strong>
                      </span>
                    )}
                  </p>
                );
              })()}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#30363d]">
              <button
                type="button"
                onClick={() => setIsCarryOverModalOpen(false)}
                className="px-4 py-2.5 rounded-lg border border-[#30363d] hover:bg-[#21262d] text-gray-300 text-xs font-semibold transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmCarryOver}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition cursor-pointer flex items-center space-x-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Onayla ve Kilitle</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
