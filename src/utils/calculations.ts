import {
  DailyEntry,
  CashExpense,
  Invoice,
  PosZReportItem,
  AuditWarning,
  MonthlySummary,
} from '../types';

/**
 * Calculates sum of all POS Z Reports for a day
 */
export function getPosTotal(posReports: PosZReportItem[] = []): number {
  return posReports.reduce((sum, item) => sum + (Number(item.creditCardTotal) || 0), 0);
}

/**
 * Calculates total expenses paid via Cash (Kasadan) for a specific date
 */
export function getDailyCashExpenses(expenses: CashExpense[] = [], date: string): number {
  return expenses
    .filter((e) => e.isActive && e.date === date && e.paidBy === 'Kasa')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

/**
 * Calculates all expenses (Kasa + Banka + Şahsi) for a date
 */
export function getDailyTotalExpenses(expenses: CashExpense[] = [], date: string): number {
  return expenses
    .filter((e) => e.isActive && e.date === date)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

/**
 * Calculates invoice payments made in CASH from the register for a specific date
 */
export function getDailyInvoiceCashPayments(invoices: Invoice[] = [], date: string): number {
  let total = 0;
  invoices
    .filter((inv) => inv.isActive)
    .forEach((inv) => {
      inv.payments.forEach((pmt) => {
        if (pmt.date === date && pmt.paymentMethod === 'Nakit (Kasadan)') {
          total += Number(pmt.amount) || 0;
        }
      });
    });
  return total;
}

/**
 * Calculates total withdrawals from register (Banka yatırılan, Patron çekimi vb.)
 */
export function getDailyCashWithdrawals(dailyEntry: DailyEntry): number {
  return (dailyEntry.cashWithdrawals || []).reduce(
    (sum, w) => sum + (Number(w.amount) || 0),
    0
  );
}

/**
 * Full register calculation for a specific day:
 * DEVİR (Önceki gün) + NAKİT GELİR - KASA GİDERLERİ - KASADAN FATURA ÖDEMELERİ - ÇEKİMLER = BEKLENEN KASA
 */
export interface DailyRegisterSummary {
  openingCash: number;
  grossProductSales: number;
  discountTotal: number;
  openAccountTotal: number;
  cashSales: number;
  creditCardSales: number;
  otherSales: number;
  totalSales: number;
  posTotal: number;
  posVegaDifference: number;
  isPosReconciled: boolean;
  cashExpenses: number;
  invoiceCashPayments: number;
  cashWithdrawals: number;
  totalCashOutflow: number;
  expectedCash: number;
  actualCashInHand: number;
  cashDifference: number;
  isCashBalanced: boolean;
  totalDailyInvoices: number;
}

export function calculateDailyRegister(
  dailyEntry: DailyEntry,
  expenses: CashExpense[] = [],
  invoices: Invoice[] = []
): DailyRegisterSummary {
  const openingCash = Number(dailyEntry.openingCash) || 0;
  const grossProductSales = Number(dailyEntry.vegaReport?.grossProductSales) || 0;
  const discountTotal = Number(dailyEntry.vegaReport?.discountTotal || dailyEntry.vegaReport?.discountAmount) || 0;
  const openAccountTotal = Number(dailyEntry.vegaReport?.openAccountTotal) || 0;

  const cashSales = Number(dailyEntry.vegaReport?.cashSales) || 0;
  const creditCardSales = Number(dailyEntry.vegaReport?.creditCardSales) || 0;
  const otherSales = Number(dailyEntry.vegaReport?.otherSales) || 0;
  
  // Total Sales / Net Ciro
  let totalSales = Number(dailyEntry.vegaReport?.totalSales) || 0;
  if (totalSales <= 0 && grossProductSales > 0) {
    totalSales = Math.max(0, grossProductSales - discountTotal - openAccountTotal);
  } else if (totalSales <= 0) {
    totalSales = cashSales + creditCardSales + otherSales;
  }

  const posTotal = getPosTotal(dailyEntry.posReports);
  const posVegaDifference = posTotal - creditCardSales;
  const isPosReconciled = Math.abs(posVegaDifference) < 0.01;

  const cashExpenses = getDailyCashExpenses(expenses, dailyEntry.date);
  const invoiceCashPayments = getDailyInvoiceCashPayments(invoices, dailyEntry.date);
  const cashWithdrawals = getDailyCashWithdrawals(dailyEntry);

  const totalCashOutflow = cashExpenses + invoiceCashPayments + cashWithdrawals;
  const expectedCash = openingCash + cashSales - totalCashOutflow;
  const actualCashInHand = Number(dailyEntry.actualCashInHand) || 0;
  const cashDifference = actualCashInHand - expectedCash;
  const isCashBalanced = Math.abs(cashDifference) < 0.01;

  // Invoices entered on this date
  const totalDailyInvoices = invoices
    .filter((inv) => inv.isActive && inv.date === dailyEntry.date)
    .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);

  return {
    openingCash,
    grossProductSales,
    discountTotal,
    openAccountTotal,
    cashSales,
    creditCardSales,
    otherSales,
    totalSales,
    posTotal,
    posVegaDifference,
    isPosReconciled,
    cashExpenses,
    invoiceCashPayments,
    cashWithdrawals,
    totalCashOutflow,
    expectedCash,
    actualCashInHand,
    cashDifference,
    isCashBalanced,
    totalDailyInvoices,
  };
}

/**
 * Generates audit warnings and missing field notifications for the daily closing
 */
export function auditDailyEntry(
  dailyEntry: DailyEntry,
  expenses: CashExpense[] = [],
  invoices: Invoice[] = []
): AuditWarning[] {
  const warnings: AuditWarning[] = [];
  const reg = calculateDailyRegister(dailyEntry, expenses, invoices);

  // 1. Vega Sales Check
  if (reg.totalSales <= 0) {
    warnings.push({
      id: 'vega-empty',
      type: 'warning',
      title: 'Vega Raporu Eksik',
      message: 'Bugüne ait Vega Şefim satış verisi girilmemiş görünüyor.',
      category: 'closing',
    });
  }

  // 2. POS Z-Report checks
  if (dailyEntry.posReports.length === 0) {
    warnings.push({
      id: 'pos-none',
      type: 'error',
      title: 'POS Z Raporu Yok',
      message: 'Bugün için hiçbir POS Z raporu girilmemiş.',
      category: 'pos',
    });
  } else {
    // Check if any POS has missing Z number or 0 total while others have
    const missingZ = dailyEntry.posReports.some((p) => !p.zNumber || p.zNumber.trim() === '');
    if (missingZ) {
      warnings.push({
        id: 'pos-z-num',
        type: 'warning',
        title: 'Z Numarası Eksik POS',
        message: 'Bazı POS cihazlarının Z numarası girilmemiş.',
        category: 'pos',
      });
    }

    // POS vs Vega Difference check
    if (!reg.isPosReconciled) {
      warnings.push({
        id: 'pos-diff',
        type: 'error',
        title: 'Vega / POS Kart Uyuşmazlığı',
        message: `Vega Kredi Kartı (${reg.creditCardSales.toLocaleString('tr-TR')} ₺) ile POS Toplamı (${reg.posTotal.toLocaleString('tr-TR')} ₺) arasında ${Math.abs(reg.posVegaDifference).toLocaleString('tr-TR')} ₺ fark var.`,
        category: 'pos',
      });
    }
  }

  // 3. Cash In Hand check
  if (dailyEntry.actualCashInHand === 0 && reg.cashSales > 0) {
    warnings.push({
      id: 'cash-zero',
      type: 'warning',
      title: 'Fiili Kasa Sayımı Girilmedi',
      message: 'Gün sonu fiili sayılan nakit tutarı 0 olarak kayıtlı. Lütfen kasayı sayıp giriniz.',
      category: 'cash',
    });
  } else if (!reg.isCashBalanced) {
    warnings.push({
      id: 'cash-diff',
      type: 'error',
      title: 'Kasa Farkı Mevcut',
      message: `Beklenen Kasa: ${reg.expectedCash.toLocaleString('tr-TR')} ₺ | Fiili Kasa: ${reg.actualCashInHand.toLocaleString('tr-TR')} ₺ | Fark: ${reg.cashDifference.toLocaleString('tr-TR')} ₺`,
      category: 'cash',
    });
  }

  // 4. Overdue Invoices
  const overdueInvoices = invoices.filter(
    (inv) => inv.isActive && inv.paymentStatus !== 'paid' && inv.dueDate && inv.dueDate < dailyEntry.date
  );
  if (overdueInvoices.length > 0) {
    warnings.push({
      id: 'inv-overdue',
      type: 'info',
      title: `${overdueInvoices.length} Adet Vadesi Geçmiş Fatura`,
      message: 'Sistemde ödemesi gecikmiş tedarikçi faturaları bulunuyor.',
      category: 'invoice',
    });
  }

  return warnings;
}

/**
 * Calculates Monthly Consolidated Summary
 */
export function calculateMonthlySummary(
  targetMonth: string,
  entries: DailyEntry[] | Record<string, DailyEntry> = [],
  expenses: CashExpense[] = [],
  invoices: Invoice[] = []
): MonthlySummary {
  const entriesList: DailyEntry[] = Array.isArray(entries)
    ? entries
    : Object.values(entries);

  const monthEntries = entriesList
    .filter((e) => e && e.date && e.date.startsWith(targetMonth))
    .sort((a, b) => a.date.localeCompare(b.date));

  const monthExpenses = expenses.filter((e) => e.isActive && e.date.startsWith(targetMonth));
  const monthInvoices = invoices.filter((i) => i.isActive && i.date.startsWith(targetMonth));

  let totalSales = 0;
  let totalCashSales = 0;
  let totalCreditCardSales = 0;
  let totalOtherSales = 0;
  let totalPosCreditCard = 0;
  let totalCashExpenses = 0;
  let totalCashInvoicePayments = 0;
  let totalCashDifference = 0;
  let totalPosDifference = 0;

  const dailyRows = monthEntries.map((entry) => {
    const reg = calculateDailyRegister(entry, monthExpenses, monthInvoices);
    totalSales += reg.totalSales;
    totalCashSales += reg.cashSales;
    totalCreditCardSales += reg.creditCardSales;
    totalOtherSales += reg.otherSales;
    totalPosCreditCard += reg.posTotal;
    totalCashExpenses += reg.cashExpenses;
    totalCashInvoicePayments += reg.invoiceCashPayments;
    totalCashDifference += reg.cashDifference;
    totalPosDifference += reg.posVegaDifference;

    return {
      date: entry.date,
      openingCash: reg.openingCash,
      totalSales: reg.totalSales,
      cashSales: reg.cashSales,
      creditCardSales: reg.creditCardSales,
      posTotal: reg.posTotal,
      cashExpenses: reg.cashExpenses,
      actualCashInHand: reg.actualCashInHand,
      isPosReconciled: reg.isPosReconciled,
      isCashBalanced: reg.isCashBalanced,
      cashDifference: reg.cashDifference,
      posVegaDifference: reg.posVegaDifference,
    };
  });

  const totalInvoices = monthInvoices.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
  
  let totalInvoicePayments = 0;
  invoices
    .filter((inv) => inv.isActive)
    .forEach((inv) => {
      inv.payments.forEach((pmt) => {
        if (pmt.date.startsWith(targetMonth)) {
          totalInvoicePayments += Number(pmt.amount) || 0;
        }
      });
    });

  const unpaidInvoicesTotal = invoices
    .filter((inv) => inv.isActive && inv.paymentStatus !== 'paid')
    .reduce((sum, inv) => {
      const paid = inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      return sum + Math.max(0, inv.totalAmount - paid);
    }, 0);

  const netCashFlow = totalCashSales - totalCashExpenses - totalCashInvoicePayments;
  const estimatedProfit = totalSales - (totalCashExpenses + totalInvoices);

  return {
    month: targetMonth,
    totalDays: monthEntries.length,
    closedDays: monthEntries.filter((e) => e.status === 'closed').length,
    totalSales,
    totalCashSales,
    totalCreditCardSales,
    totalOtherSales,
    totalPosCreditCard,
    totalCashExpenses,
    totalInvoices,
    totalInvoicePayments,
    totalCashInvoicePayments,
    unpaidInvoicesTotal,
    totalCashDifference,
    totalPosDifference,
    netCashFlow,
    cashSales: totalCashSales,
    creditCardSales: totalCreditCardSales,
    remainingInvoiceDebt: unpaidInvoicesTotal,
    estimatedProfit,
    dailyRows,
  };
}
