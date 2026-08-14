import React, { useState } from 'react';
import {
  CalendarDays,
  FileSpreadsheet,
  TrendingUp,
  CreditCard,
  Receipt,
  Wallet,
  Building2,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { DailyEntry, CashExpense, Invoice } from '../types';
import {
  formatCurrency,
  formatPercent,
  formatDateTR,
  formatDateWithDayTR,
  getMonthNameTR,
} from '../utils/formatters';
import { calculateMonthlySummary, calculateDailyRegister } from '../utils/calculations';
import { exportMonthlyReportToExcel } from '../utils/excelExport';

interface MonthlyReportViewProps {
  entries: Record<string, DailyEntry>;
  expenses: CashExpense[];
  invoices: Invoice[];
  onSelectDate: (date: string) => void;
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  entries,
  expenses,
  invoices,
  onSelectDate,
}) => {
  const [selectedMonth, setSelectedMonth] = useState('2026-08');

  const summary = calculateMonthlySummary(selectedMonth, entries, expenses, invoices);

  // Group expenses by category for this month
  const currentMonthExpenses = expenses.filter(
    (e) => e.isActive && e.date.startsWith(selectedMonth)
  );

  const categoryMap: Record<string, number> = {};
  currentMonthExpenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + (Number(e.amount) || 0);
  });

  const sortedCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

  // Product groups aggregation across the month
  const groupMap: Record<string, number> = {};
  const entriesList: DailyEntry[] = Array.isArray(entries) ? entries : Object.values(entries);
  entriesList
    .filter((e) => e && e.date && e.date.startsWith(selectedMonth))
    .forEach((e) => {
      e.vegaGroups?.forEach((g) => {
        groupMap[g.name] = (groupMap[g.name] || 0) + (Number(g.amount) || 0);
      });
    });
  const sortedProductGroups = Object.entries(groupMap).sort((a, b) => b[1] - a[1]);
  const totalGroupSales = sortedProductGroups.reduce((s, g) => s + g[1], 0);

  const monthsList = [
    { value: '2026-08', label: 'Ağustos 2026' },
    { value: '2026-07', label: 'Temmuz 2026' },
    { value: '2026-06', label: 'Haziran 2026' },
    { value: '2026-05', label: 'Mayıs 2026' },
    { value: '2026-04', label: 'Nisan 2026' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161b22] p-5 rounded-xl border border-[#30363d] shadow-lg">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1 font-mono">
            <CalendarDays className="w-4 h-4" />
            <span>AYLIK İCMAL VE RAPORLAMA</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Aylık Kasa ve Muhasebe İcmal Raporu
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Aylık toplam ciro, nakit/kart dağılımı, tedarikçi faturaları ve gider analizleri
          </p>
        </div>

        <div className="flex items-center space-x-3 font-mono">
          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs font-bold text-white focus:border-orange-500 focus:outline-none"
          >
            {monthsList.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => exportMonthlyReportToExcel(selectedMonth, entries, expenses, invoices)}
            className="flex items-center space-x-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-semibold px-4 py-2 rounded-lg border border-[#30363d] transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Aylık Excel İndir</span>
          </button>
        </div>
      </div>

      {/* Main Monthly KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {/* Total Month Sales */}
        <div className="bg-[#161b22] p-5 rounded-xl border border-[#30363d] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-semibold uppercase">AYLIK TOPLAM CİRO</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {formatCurrency(summary.totalSales)}
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400 mt-2">
            <span>Nakit: <strong className="text-gray-200">{formatCurrency(summary.cashSales)}</strong></span>
            <span>•</span>
            <span>Kart: <strong className="text-blue-400">{formatCurrency(summary.creditCardSales)}</strong></span>
          </div>
        </div>

        {/* Cash Expenses */}
        <div className="bg-[#161b22] p-5 rounded-xl border border-[#30363d] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-semibold uppercase">TOPLAM KASA GİDERİ</span>
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2">
            {formatCurrency(summary.totalCashExpenses)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            İşletme günlük harcamaları ({currentMonthExpenses.length} kalem)
          </div>
        </div>

        {/* Invoices Volume */}
        <div className="bg-[#161b22] p-5 rounded-xl border border-[#30363d] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-semibold uppercase">AYLIK FATURA HACMİ</span>
            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {formatCurrency(summary.totalInvoices)}
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400 mt-2">
            <span>Ödenen: <strong className="text-emerald-400">{formatCurrency(summary.totalInvoicePayments)}</strong></span>
            <span>•</span>
            <span>Kalan: <strong className="text-amber-400">{formatCurrency(summary.remainingInvoiceDebt)}</strong></span>
          </div>
        </div>

        {/* Operating Cash Flow Margin */}
        <div className="bg-[#161b22] p-5 rounded-xl border border-[#30363d] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-semibold uppercase">OPERASYONEL BRÜT FARK</span>
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-400 mt-2">
            {formatCurrency(summary.estimatedProfit)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Toplam Ciro - (Giderler + Fatura Girişleri)
          </div>
        </div>
      </div>

      {/* 2-Column: Expense Categories & Product Group Shares */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono">
        {/* Category Breakdown */}
        <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 shadow-lg space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center space-x-2">
            <PieChart className="w-4 h-4 text-amber-400" />
            <span>Aylık Gider Dağılımı ({getMonthNameTR(selectedMonth)})</span>
          </h3>

          {sortedCategories.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">Bu ay için gider kaydı bulunamadı.</p>
          ) : (
            <div className="space-y-3">
              {sortedCategories.map(([catName, amount], idx) => {
                const perc = summary.totalCashExpenses > 0 ? (amount / summary.totalCashExpenses) * 100 : 0;
                return (
                  <div key={catName} className="text-xs space-y-1">
                    <div className="flex justify-between font-semibold text-gray-200">
                      <span>{catName}</span>
                      <span>
                        {formatCurrency(amount)} ({formatPercent(perc)})
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#0d1117] rounded-full overflow-hidden border border-[#30363d]">
                      <div
                        style={{ width: `${perc}%` }}
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Product Group Breakdown */}
        <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 shadow-lg space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Aylık Ürün Grubu Satış Dağılımı (Vega)</span>
          </h3>

          {sortedProductGroups.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">Bu ay için grup satış kaydı bulunamadı.</p>
          ) : (
            <div className="space-y-3">
              {sortedProductGroups.map(([grpName, amount], idx) => {
                const perc = totalGroupSales > 0 ? (amount / totalGroupSales) * 100 : 0;
                return (
                  <div key={grpName} className="text-xs space-y-1">
                    <div className="flex justify-between font-semibold text-gray-200">
                      <span>{grpName}</span>
                      <span>
                        {formatCurrency(amount)} ({formatPercent(perc)})
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#0d1117] rounded-full overflow-hidden border border-[#30363d]">
                      <div
                        style={{ width: `${perc}%` }}
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Day by Day Monthly Register Table */}
      <div className="bg-[#161b22] rounded-xl border border-[#30363d] overflow-hidden shadow-lg font-mono">
        <div className="p-4 border-b border-[#30363d] flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">
            {getMonthNameTR(selectedMonth)} Günlük Kasa & Muhasebe İcmal Tablosu
          </h3>
          <span className="text-xs text-gray-400 font-medium">{summary.dailyRows.length} Gün Kayıtlı</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1117] text-gray-400 font-semibold border-b border-[#30363d]">
              <tr>
                <th className="py-3 px-4">Tarih</th>
                <th className="py-3 px-3 text-right">Önceki Devir</th>
                <th className="py-3 px-3 text-right">Vega Ciro</th>
                <th className="py-3 px-3 text-right">Nakit Satış</th>
                <th className="py-3 px-3 text-right">Kredi Kartı (Vega)</th>
                <th className="py-3 px-3 text-right">POS Z Toplamı</th>
                <th className="py-3 px-3 text-right">Kasa Gideri</th>
                <th className="py-3 px-3 text-right font-bold text-white">Gün Sonu Kasa</th>
                <th className="py-3 px-3 text-center">POS Mutabakat</th>
                <th className="py-3 px-3 text-center">Kasa Durumu</th>
                <th className="py-3 px-3 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d]">
              {summary.dailyRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-gray-500">
                    Seçilen ay için kayıtlı gün bulunamadı.
                  </td>
                </tr>
              ) : (
                summary.dailyRows.map((row) => (
                  <tr
                    key={row.date}
                    className="hover:bg-[#21262d] transition"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-gray-200 whitespace-nowrap">
                      {formatDateTR(row.date)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-400">
                      {formatCurrency(row.openingCash)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-400">
                      {formatCurrency(row.totalSales)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-300">
                      {formatCurrency(row.cashSales)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-blue-400">
                      {formatCurrency(row.creditCardSales)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-gray-400">
                      {formatCurrency(row.posTotal)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-400">
                      -{formatCurrency(row.cashExpenses)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-white">
                      {formatCurrency(row.actualCashInHand)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.isPosReconciled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {row.isPosReconciled ? '✓ Uyumlu' : '⚠ Fark Var'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.isCashBalanced
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {row.isCashBalanced ? '✓ Tam' : `${row.cashDifference > 0 ? '+' : ''}${row.cashDifference.toLocaleString('tr-TR')} ₺`}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onSelectDate(row.date)}
                        className="text-xs text-orange-400 hover:text-orange-300 font-semibold cursor-pointer"
                      >
                        Güne Git →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
