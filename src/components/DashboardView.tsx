import React from 'react';
import {
  TrendingUp,
  Wallet,
  CreditCard,
  Receipt,
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  Calendar,
  Lock,
  Unlock,
  Building2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ChevronRight,
  UserCheck,
  Landmark,
} from 'lucide-react';
import {
  DailyEntry,
  CashExpense,
  Invoice,
  OpenAccountCustomer,
  OpenAccountTransaction,
  TabType,
  MasterSafeState,
} from '../types';
import { formatCurrency, formatDateTR, formatDateWithDayTR } from '../utils/formatters';
import { calculateDailyRegister, auditDailyEntry, isCreditCardExpenseMethod, isCashExpenseMethod } from '../utils/calculations';
import { calculateBanknoteTotal, calculateTotalBanknoteCount } from '../utils/storage';
import { OpenAccountCarilerTable } from './OpenAccountCarilerTable';

interface DashboardViewProps {
  selectedDate: string;
  currentEntry: DailyEntry;
  expenses: CashExpense[];
  invoices: Invoice[];
  customers?: OpenAccountCustomer[];
  transactions?: OpenAccountTransaction[];
  masterSafe?: MasterSafeState;
  onNavigate: (tab: TabType) => void;
  onOpenBossReport: () => void;
  onOpenVegaImport: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  selectedDate,
  currentEntry,
  expenses,
  invoices,
  customers = [],
  transactions = [],
  masterSafe,
  onNavigate,
  onOpenBossReport,
  onOpenVegaImport,
}) => {
  const reg = calculateDailyRegister(currentEntry, expenses, invoices);
  const warnings = auditDailyEntry(currentEntry, expenses, invoices);
  const errorCount = warnings.filter((w) => w.type === 'error').length;
  const isClosed = currentEntry.status === 'closed';

  const vaultTotal = masterSafe ? calculateBanknoteTotal(masterSafe.banknotes) : 0;
  const vaultBanknoteCount = masterSafe ? calculateTotalBanknoteCount(masterSafe.banknotes) : 0;

  const dayExpenses = expenses.filter((e) => e.isActive && e.date === selectedDate);
  const dayInvoices = invoices.filter((i) => i.isActive && i.date === selectedDate);
  const overdueInvoices = invoices.filter(
    (i) => i.isActive && i.paymentStatus !== 'paid' && i.dueDate && i.dueDate < selectedDate
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 sm:p-6 text-gray-200 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1 font-mono">
              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
              <span>GÜNLÜK FİNANS & KASA ÖZETİ</span>
            </div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
                {formatDateWithDayTR(selectedDate)}
              </h2>
              <span className="px-2.5 py-1 text-[11px] bg-[#21262d] rounded border border-[#30363d] text-gray-300 font-mono">
                {selectedDate}
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('daily')}
              className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md transition cursor-pointer font-mono"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Kasa Girişine Git</span>
            </button>
            <button
              onClick={() => onNavigate('accounts')}
              className="flex items-center space-x-2 bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-semibold px-3.5 py-2 rounded-lg border border-[#30363d] transition cursor-pointer font-mono"
            >
              <Landmark className="w-3.5 h-3.5 text-sky-400" />
              <span>Hesaplar & Bakiyeler</span>
            </button>
            <button
              onClick={() => onNavigate('closing')}
              className="flex items-center space-x-2 bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-semibold px-3.5 py-2 rounded-lg border border-[#30363d] transition cursor-pointer font-mono"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Günlük Kapanış</span>
            </button>
          </div>
        </div>

        {/* Quick status bar */}
        <div className="mt-4 pt-3.5 border-t border-[#30363d] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Kasa Durumu:</span>
              <span
                className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${
                  isClosed
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {isClosed ? '✓ Kapanış Onaylandı' : '● Açık (Taslak)'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Kasa Farkı:</span>
              <span
                className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${
                  reg.isCashBalanced
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {reg.isCashBalanced
                  ? '✓ 0,00 ₺'
                  : `${reg.cashDifference > 0 ? '+' : ''}${reg.cashDifference.toLocaleString('tr-TR')} ₺`}
              </span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('closing')}
            className="flex items-center space-x-1 text-orange-400 hover:text-orange-300 transition cursor-pointer"
          >
            <span>Kapanış Denetimi</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 5 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Sales / Vega */}
        <div
          onClick={() => onNavigate('daily')}
          className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] hover:border-orange-500/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase font-mono">
            <span>Toplam Satış (Vega)</span>
            <div className="p-1.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 group-hover:scale-105 transition">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-white mt-2">
            {formatCurrency(reg.totalSales)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono mt-2 pt-2 border-t border-[#30363d]">
            <span>Nakit: <strong className="text-gray-200">{formatCurrency(reg.cashSales)}</strong></span>
            <span>POS: <strong className="text-gray-200">{formatCurrency(reg.creditCardSales)}</strong></span>
          </div>
        </div>

        {/* Cash in Hand */}
        <div
          onClick={() => onNavigate('daily')}
          className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] hover:border-orange-500/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase font-mono">
            <span>Nakit Kasa Mevcudu</span>
            <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-white mt-2">
            {formatCurrency(reg.actualCashInHand)}
          </p>
          <div className="flex items-center justify-between text-[11px] font-mono mt-2 pt-2 border-t border-[#30363d]">
            <span className="text-gray-400">Devir Kasa: {formatCurrency(reg.openingCash)}</span>
            <span className={reg.isCashBalanced ? 'text-emerald-400' : 'text-rose-400'}>
              {reg.isCashBalanced ? 'Fark Yok' : `${reg.cashDifference > 0 ? '+' : ''}${reg.cashDifference.toLocaleString('tr-TR')} ₺`}
            </span>
          </div>
        </div>

        {/* POS Z Reports Total */}
        <div
          onClick={() => onNavigate('daily')}
          className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] hover:border-orange-500/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase font-mono">
            <span>Kredi Kartı / POS</span>
            <div className="p-1.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-105 transition">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-white mt-2">
            {formatCurrency(reg.posTotal)}
          </p>
          <div className="flex items-center justify-between text-[11px] font-mono mt-2 pt-2 border-t border-[#30363d]">
            <span className="text-gray-400">{currentEntry.posReports.length} Terminal Z</span>
            <span
              className={
                reg.isNoVegaCardSales
                  ? 'text-sky-400'
                  : reg.isPosReconciled
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }
            >
              {reg.isNoVegaCardSales
                ? 'POS Baz Alındı'
                : reg.isPosReconciled
                ? '✓ Uyumlu'
                : '⚠ Fark Var'}
            </span>
          </div>
        </div>

        {/* Expenses Total */}
        <div
          onClick={() => onNavigate('expenses')}
          className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] hover:border-orange-500/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase font-mono">
            <span>Kasa Giderleri (Nakit)</span>
            <div className="p-1.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-105 transition">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-rose-400 mt-2">
            {formatCurrency(reg.cashExpenses)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono mt-2 pt-2 border-t border-[#30363d]">
            <span>{dayExpenses.filter((e) => isCashExpenseMethod(e.paidBy) && (!e.accountId || e.accountId === 'gunluk-kasa')).length} Nakit Harcama</span>
            {reg.creditCardExpenses > 0 ? (
              <span className="text-sky-400 font-semibold" title="Banka & Kredi Kartı Harcamaları (Kasadan Düşmez)">
                💳 Kredi: {formatCurrency(reg.creditCardExpenses)}
              </span>
            ) : (
              <span>Fatura: {formatCurrency(reg.invoiceCashPayments)}</span>
            )}
          </div>
        </div>

        {/* Master Safe Vault Metric */}
        <div
          onClick={() => onNavigate('vault')}
          className="bg-gradient-to-br from-[#161b22] to-[#1c1810] p-4 rounded-xl border border-amber-500/40 hover:border-amber-400 transition cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold uppercase font-mono">
            <span>Ana Kasa (Banknot)</span>
            <div className="p-1.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 group-hover:scale-105 transition">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-amber-300 mt-2">
            {formatCurrency(vaultTotal)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono mt-2 pt-2 border-t border-[#30363d]">
            <span>{vaultBanknoteCount} Banknot</span>
            <span className="text-amber-400 group-hover:underline">Detay & Harcama →</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Vega vs POS Table + Kasa Mutabakat + Son Giderler/Faturalar */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column (3 cols on large screens) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Vega vs POS Karşılaştırması Card */}
          <section className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#30363d] flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-orange-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300 font-mono">
                  Vega vs POS Z Raporu Karşılaştırması
                </h3>
              </div>
              <span
                className={`px-2.5 py-0.5 text-[10px] rounded font-mono font-bold uppercase border ${
                  reg.isNoVegaCardSales
                    ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                    : reg.isPosReconciled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                {reg.isNoVegaCardSales
                  ? 'Kart satışı raporda yok, POS toplamı baz alındı'
                  : reg.isPosReconciled
                  ? '✓ POS Tam Uyumlu'
                  : '⚠ Fark Tespit Edildi'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0d1117] text-gray-400 font-mono">
                  <tr>
                    <th className="p-3 font-semibold border-b border-[#30363d]">Ödeme Türü / Cihaz</th>
                    <th className="p-3 font-semibold border-b border-[#30363d] text-right">Vega Raporu</th>
                    <th className="p-3 font-semibold border-b border-[#30363d] text-right">Z / POS Toplamı</th>
                    <th className="p-3 font-semibold border-b border-[#30363d] text-right">Fark</th>
                  </tr>
                </thead>
                <tbody className="font-mono divide-y divide-[#21262d]">
                  <tr className="hover:bg-[#21262d] transition-colors">
                    <td className="p-3 font-medium text-gray-200">Nakit Satış</td>
                    <td className="p-3 text-right text-gray-300">{formatCurrency(reg.cashSales)}</td>
                    <td className="p-3 text-right text-gray-300">{formatCurrency(reg.cashSales)}</td>
                    <td className="p-3 text-right text-emerald-400 font-bold">0,00 ₺</td>
                  </tr>

                  {currentEntry.posReports.map((pos) => {
                    return (
                      <tr key={pos.id} className="hover:bg-[#21262d] transition-colors">
                        <td className="p-3 font-medium text-gray-300">
                          {pos.posDeviceName} {pos.zNumber ? `(Z #${pos.zNumber})` : ''}
                        </td>
                        <td className="p-3 text-right text-gray-400">-</td>
                        <td className="p-3 text-right text-gray-200 font-semibold">
                          {formatCurrency(pos.creditCardTotal)}
                        </td>
                        <td className="p-3 text-right text-gray-400">-</td>
                      </tr>
                    );
                  })}

                  {/* Consolidated Total Row */}
                  <tr className="bg-[#0d1117] font-bold border-t border-[#30363d]">
                    <td className="p-3 text-white">Toplam Kredi Kartı (Genel)</td>
                    <td className="p-3 text-right text-orange-400">{formatCurrency(reg.creditCardSales)}</td>
                    <td className="p-3 text-right text-blue-400">{formatCurrency(reg.posTotal)}</td>
                    <td
                      className={`p-3 text-right ${
                        reg.isPosReconciled ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {reg.posVegaDifference === 0
                        ? '0,00 ₺'
                        : `${reg.posVegaDifference > 0 ? '+' : ''}${reg.posVegaDifference.toLocaleString('tr-TR')} ₺`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Kasa Mutabakat Sonucu Section */}
          <section className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex flex-col justify-between shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-orange-400" />
                <h3 className="text-xs font-semibold uppercase text-gray-300 font-mono tracking-wider">
                  Kasa Mutabakat ve Sayım Sonucu
                </h3>
              </div>
              <span className="text-[11px] font-mono text-gray-500">
                Kayıt: #{currentEntry.id || `REG-${selectedDate}`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div className="space-y-1 bg-[#0d1117] p-3.5 rounded-lg border border-[#30363d]">
                <div className="text-xs text-gray-400 font-mono">Beklenen Gün Sonu Kasa</div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-white">
                  {formatCurrency(reg.expectedCash)}
                </div>
                <div className="text-xs text-gray-400 font-mono font-medium">
                  Devir + Nakit - Kasa Gideri - Fatura
                </div>
              </div>

              <div className="space-y-1 bg-[#0d1117] p-3.5 rounded-lg border border-[#30363d]">
                <div className="text-xs text-gray-400 font-mono">Fiili Kasa Mevcudu</div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-orange-400">
                  {formatCurrency(reg.actualCashInHand)}
                </div>
                <div className="text-xs text-gray-400 font-mono font-medium">
                  Kasada fiziki sayılan tutar
                </div>
              </div>

              <div
                className={`p-3.5 rounded-lg border flex flex-col items-center justify-center text-center ${
                  reg.isCashBalanced
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-rose-500/10 border-rose-500/30'
                }`}
              >
                <div
                  className={`text-xs font-bold font-mono uppercase ${
                    reg.isCashBalanced ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {reg.isCashBalanced ? 'KASA DENK' : 'KASA FARKI'}
                </div>
                <div
                  className={`text-xl sm:text-2xl font-mono font-bold mt-0.5 ${
                    reg.isCashBalanced ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {reg.cashDifference === 0
                    ? '0,00 ₺'
                    : `${reg.cashDifference > 0 ? '+' : ''}${reg.cashDifference.toLocaleString('tr-TR')} ₺`}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Son Giderler & Faturalar Feed (2 cols on large screens) */}
        <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden flex flex-col shadow-lg">
          <div className="p-4 border-b border-[#30363d] flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-orange-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300 font-mono">
                Günün Giderleri & Faturaları
              </h3>
            </div>
            <button
              onClick={() => onNavigate('expenses')}
              className="text-xs text-orange-400 hover:text-orange-300 font-mono font-medium hover:underline cursor-pointer"
            >
              Tümünü Gör →
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[440px] divide-y divide-[#30363d]">
            {dayExpenses.length === 0 && dayInvoices.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 font-mono">
                Bugün için kaydedilmiş gider veya fatura kaydı bulunmamaktadır.
              </div>
            ) : (
              <>
                {dayExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    onClick={() => onNavigate('expenses')}
                    className="p-3.5 flex flex-col gap-1 hover:bg-[#21262d] transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono text-[10px] font-semibold uppercase">
                        {exp.category}
                      </span>
                      {isCreditCardExpenseMethod(exp.paidBy) ? (
                        <span className="text-[10px] text-sky-400 font-mono font-bold bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.2 rounded">
                          💳 {exp.paidBy} (Kasadan Düşmez)
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400 font-mono">{exp.paidBy}</span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-gray-200 mt-1">
                      {exp.description}
                    </div>
                    <div className="flex justify-between items-center text-xs mt-1">
                      <span className="text-[10px] text-gray-500 font-mono">
                        {exp.receiptNo ? `Fiş #${exp.receiptNo}` : 'Kasa Fişi Yok'}
                      </span>
                      <span className={`text-sm font-mono font-bold ${
                        isCreditCardExpenseMethod(exp.paidBy) ? 'text-sky-400' : 'text-rose-400'
                      }`}>
                        -{formatCurrency(exp.amount)}
                      </span>
                    </div>
                  </div>
                ))}

                {dayInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => onNavigate('invoices')}
                    className="p-3.5 flex flex-col gap-1 hover:bg-[#21262d] transition-colors cursor-pointer bg-blue-950/10"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-[10px] font-semibold uppercase">
                        Fatura Kaydı
                      </span>
                      <span
                        className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded ${
                          inv.paymentStatus === 'paid'
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : inv.paymentStatus === 'partial'
                            ? 'text-blue-400 bg-blue-500/10'
                            : 'text-rose-400 bg-rose-500/10'
                        }`}
                      >
                        {inv.paymentStatus === 'paid' ? 'ÖDENDİ' : inv.paymentStatus === 'partial' ? 'KISMİ' : 'ÖDENMEDİ'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-gray-200 mt-1">
                      {inv.supplierName} {inv.invoiceNo ? `(#${inv.invoiceNo})` : ''}
                    </div>
                    <div className="flex justify-between items-center text-xs mt-1">
                      <span className="text-[10px] text-gray-500 font-mono">
                        {inv.items?.length || 0} Kalem Malzeme
                      </span>
                      <span className="text-sm font-mono font-bold text-white">
                        {formatCurrency(inv.totalAmount)}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="p-3 bg-[#0d1117] border-t border-[#30363d] flex flex-col gap-1 text-xs font-mono text-gray-400">
            <div className="flex justify-between items-center">
              <span>Kasadan Çıkan Nakit Gider:</span>
              <span className="text-sm font-bold text-rose-400 font-mono">
                -{formatCurrency(reg.cashExpenses)}
              </span>
            </div>
            {reg.creditCardExpenses > 0 && (
              <div className="flex justify-between items-center text-[11px] text-sky-400 pt-1 border-t border-[#21262d]">
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  <span>Kredi & Kart Giderleri (Kasadan Düşmez):</span>
                </span>
                <span className="font-bold">
                  {formatCurrency(reg.creditCardExpenses)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Open Account Cariler Section with 10-item pagination */}
      <OpenAccountCarilerTable
        customers={customers}
        transactions={transactions}
        onNavigate={onNavigate}
        title="Açık Hesaplar & Cari Takip Listesi"
        subtitle="Veresiye masalar, müşteri carileri ve açık hesap bakiye icmali"
        badgeLabel="ANA PANEL CARİ İCMALİ"
      />

      {/* Audit Warnings Box (If any error/warning exists) */}
      {warnings.length > 0 && (
        <div className="bg-[#161b22] border border-amber-500/30 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3 font-mono">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>DENETİM VE KONTROL UYARILARI ({warnings.length})</span>
            </div>
            <span className="text-[11px] text-gray-500">
              Kapanış öncesi lütfen bu maddeleri kontrol ediniz
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {warnings.map((warn) => (
              <div
                key={warn.id}
                className={`p-3 rounded-lg border flex items-start space-x-3 text-xs font-mono ${
                  warn.type === 'error'
                    ? 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                    : warn.type === 'warning'
                    ? 'bg-amber-950/20 border-amber-800/40 text-amber-300'
                    : 'bg-blue-950/20 border-blue-800/40 text-blue-300'
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {warn.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  ) : warn.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white">{warn.title}</div>
                  <div className="text-gray-300 text-[11px] mt-0.5 leading-relaxed">{warn.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
