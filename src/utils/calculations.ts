import {
  DailyEntry,
  CashExpense,
  Invoice,
  PosZReportItem,
  AuditWarning,
  MonthlySummary,
  SupplierGroup,
  AccountTransaction,
  FinancialAccount,
} from '../types';

/**
 * Calculates sum of all POS Z Reports for a day
 */
export function getPosTotal(posReports: PosZReportItem[] = []): number {
  return posReports.reduce((sum, item) => sum + (Number(item.creditCardTotal) || 0), 0);
}

/**
 * Helper to determine if an expense was paid using Credit Card or Bank Card.
 * These are categorized as "Kredi Giderleri" and are NEVER deducted from the physical cash drawer.
 */
export function isCreditCardExpenseMethod(paidBy?: string): boolean {
  if (!paidBy) return false;
  const p = paidBy.trim().toLowerCase();
  return (
    p === 'kredi kartı' ||
    p === 'banka kartı' ||
    p === 'kredi karti' ||
    p === 'banka karti' ||
    p === 'kredi' ||
    p === 'kredi_giderleri' ||
    p.includes('kredi kart') ||
    p.includes('banka kart')
  );
}

/**
 * Helper to determine if an expense was paid in cash from the register drawer.
 * Only cash payments deduct from the physical register cash.
 */
export function isCashExpenseMethod(paidBy?: string): boolean {
  if (!paidBy) return true;
  if (isCreditCardExpenseMethod(paidBy)) return false;
  const p = paidBy.trim().toLowerCase();
  if (p === 'banka' || p.includes('havale') || p.includes('eft')) return false;
  if (p.includes('şahsi') || p.includes('sahsi') || p.includes('cep')) return false;
  return p === 'kasa' || p === 'nakit' || p === 'nakit kasa';
}

/**
 * Calculates total expenses paid via Cash (Kasadan / Elden Nakit) for a specific date.
 * Banka Kartı ve Kredi Kartı harcamaları KESİNLİKLE kasadan düşürülmez.
 */
export function getDailyCashExpenses(expenses: CashExpense[] = [], date: string): number {
  return expenses
    .filter((e) => e.isActive && e.date === date && isCashExpenseMethod(e.paidBy))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

/**
 * Calculates total expenses paid via Credit Card / Bank Card (Kredi Giderleri) for a specific date.
 * Bu harcamalar kasadaki fiziki nakitten DÜŞÜRÜLMEZ.
 */
export function getDailyCreditCardExpenses(expenses: CashExpense[] = [], date: string): number {
  return expenses
    .filter((e) => e.isActive && e.date === date && isCreditCardExpenseMethod(e.paidBy))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

/**
 * Calculates all expenses (Kasa + Kredi Kartı + Banka + Şahsi) for a date
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
 * DEVİR (Önceki gün) + NAKİT GELİR + BUGÜNKÜ ANA KASA GİRİŞLERİ - KASA GİDERLERİ - KASADAN FATURA ÖDEMELERİ - ÇEKİMLER - BUGÜNKÜ ANA KASA ÇIKIŞLARI = BEKLENEN KASA
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
  isNoVegaCardSales: boolean;
  cashExpenses: number;
  creditCardExpenses: number;
  invoiceCashPayments: number;
  cashWithdrawals: number;
  accountCashDeposits: number; // o günkü Ana Kasa girişleri
  accountCashWithdrawals: number; // o günkü Ana Kasa çıkışları
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
  invoices: Invoice[] = [],
  accountTransactions: AccountTransaction[] = [],
  mainAccount?: FinancialAccount
): DailyRegisterSummary {
  const openingCash = Number(dailyEntry.openingCash) || 0;
  const grossProductSales = Number(dailyEntry.vegaReport?.grossProductSales) || 0;
  const discountTotal = Number(dailyEntry.vegaReport?.discountTotal || dailyEntry.vegaReport?.discountAmount) || 0;
  const openAccountTotal = Number(dailyEntry.vegaReport?.openAccountTotal) || 0;

  const enteredCashSales = Number(dailyEntry.vegaReport?.cashSales) || 0;
  const creditCardSales = Number(dailyEntry.vegaReport?.creditCardSales) || 0;
  const otherSales = Number(dailyEntry.vegaReport?.otherSales) || 0;
  
  // Total Sales / Net Ciro
  let totalSales = Number(dailyEntry.vegaReport?.totalSales) || 0;
  if (totalSales <= 0 && grossProductSales > 0) {
    totalSales = Math.max(0, grossProductSales - discountTotal - openAccountTotal);
  } else if (totalSales <= 0) {
    totalSales = enteredCashSales + creditCardSales + otherSales;
  }

  const posTotal = getPosTotal(dailyEntry.posReports);
  const effectiveCC = posTotal > 0 ? posTotal : creditCardSales;

  // Auto-calculated Cash Sales: Net Total Sales - Credit Card / POS - Other Sales
  let cashSales = enteredCashSales;
  if (totalSales > 0) {
    const derivedCash = Math.max(0, totalSales - effectiveCC - otherSales);
    // If cash sales is not entered or if POS / Credit Card has been entered/modified, compute automatically
    if (cashSales <= 0 || (effectiveCC > 0 && Math.abs(cashSales + effectiveCC + otherSales - totalSales) > 0.01)) {
      cashSales = derivedCash;
    }
  }

  const isNoVegaCardSales =
    creditCardSales <= 0 ||
    dailyEntry.vegaReport?.hasVegaCardSales === false ||
    dailyEntry.vegaReport?.cardSalesFromPos === true;

  const posVegaDifference =
    !isNoVegaCardSales && posTotal > 0 && creditCardSales > 0 ? posTotal - creditCardSales : 0;
  const isPosReconciled = !isNoVegaCardSales && Math.abs(posVegaDifference) < 0.01;

  const cashExpenses = getDailyCashExpenses(expenses, dailyEntry.date);
  const creditCardExpenses = getDailyCreditCardExpenses(expenses, dailyEntry.date);
  const invoiceCashPayments = getDailyInvoiceCashPayments(invoices, dailyEntry.date);
  const cashWithdrawals = getDailyCashWithdrawals(dailyEntry);

  // Bugünün Ana Kasa para girişleri ve çıkışları
  let accountCashDeposits = 0;
  let accountCashWithdrawals = 0;
  const mainId = mainAccount?.id || 'ana-kasa';

  if (accountTransactions && accountTransactions.length > 0) {
    accountTransactions.forEach((tx) => {
      if (tx.date !== dailyEntry.date) return;
      // Kasa devri / vault transfers hariç tutulur (nakit satış zaten otomatik sayılıyor)
      const isDailyClosing =
        tx.category === 'Gün Sonu Kasa Devri' ||
        tx.category === 'Kasa Devri' ||
        tx.id?.startsWith('vault-') ||
        tx.id?.startsWith('safe-transfer-');
      if (isDailyClosing) return;

      if (tx.type === 'deposit' && (tx.accountId === mainId || (!mainAccount && !tx.accountId))) {
        accountCashDeposits += Number(tx.amount) || 0;
      } else if (tx.type === 'transfer' && tx.toAccountId === mainId) {
        accountCashDeposits += Number(tx.amount) || 0;
      } else if (tx.type === 'withdrawal' && (tx.accountId === mainId || (!mainAccount && !tx.accountId))) {
        accountCashWithdrawals += Number(tx.amount) || 0;
      } else if (tx.type === 'transfer' && tx.fromAccountId === mainId) {
        accountCashWithdrawals += Number(tx.amount) || 0;
      }
    });
  }

  const totalCashOutflow = cashExpenses + invoiceCashPayments + cashWithdrawals;
  // beklenenKasa = devir + nakit satış + o günkü Ana Kasa girişleri - kasa çıkışları - o günkü Ana Kasa çıkışları.
  const expectedCash = openingCash + cashSales + accountCashDeposits - totalCashOutflow - accountCashWithdrawals;
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
    isNoVegaCardSales,
    cashExpenses,
    creditCardExpenses,
    invoiceCashPayments,
    cashWithdrawals,
    accountCashDeposits,
    accountCashWithdrawals,
    totalCashOutflow,
    expectedCash,
    actualCashInHand,
    cashDifference,
    isCashBalanced,
    totalDailyInvoices,
  };
}

/**
 * Calculates the complete carry-over chain for Ana Kasa from trackingStartDate.
 * Devir zinciri: Takip başlangıç tarihinden itibaren günleri sırala.
 * Her gün için:
 *   açılış = (ilk gün ? başlangıç bakiyesi : bir önceki günün kapanışı)
 *   beklenen = açılış + nakit satış + girişler - çıkışlar
 *   kapanış = day.closingCarryOver tanımlıysa o, değilse beklenen
 * Ana Kasa bakiyesi ve bir sonraki günün devri bu zincirden hesaplanır.
 */
export interface AnaKasaChainItem {
  date: string;
  openingCash: number;
  cashSales: number;
  accountInflows: number;
  cashExpenses: number;
  cashInvoicePayments: number;
  cashWithdrawals: number;
  accountOutflows: number;
  totalOutflow: number;
  expectedCash: number;
  closingCarryOver?: number;
  carryOverDifference?: number;
  finalClosingCash: number;
}

export interface AnaKasaChainSummary {
  chain: AnaKasaChainItem[];
  chainMap: Map<string, AnaKasaChainItem>;
  currentBalance: number;
  totalCarryOverDifferences: number;
  differenceEntries: Array<{
    date: string;
    difference: number;
    closingCarryOver: number;
    expectedCash: number;
  }>;
}

export function getAnaKasaChain(
  account: FinancialAccount | undefined,
  entries: DailyEntry[] | Record<string, DailyEntry> = [],
  expenses: CashExpense[] = [],
  invoices: Invoice[] = [],
  accountTransactions: AccountTransaction[] = [],
  upToDate?: string
): AnaKasaChainSummary {
  const entryList: DailyEntry[] = Array.isArray(entries) ? entries : Object.values(entries || {});
  const entryMap = new Map<string, DailyEntry>();
  entryList.forEach((e) => {
    if (e && e.date) entryMap.set(e.date, e);
  });

  const emptyResult: AnaKasaChainSummary = {
    chain: [],
    chainMap: new Map(),
    currentBalance: Number(account?.initialBalance) || 0,
    totalCarryOverDifferences: 0,
    differenceEntries: [],
  };

  if (!account || !account.trackingStartDate) {
    return emptyResult;
  }

  const startDate = account.trackingStartDate;
  // Collect all dates >= startDate
  const dateSet = new Set<string>();
  entryList.forEach((e) => {
    if (e.date && e.date >= startDate) dateSet.add(e.date);
  });
  expenses.forEach((e) => {
    if (e.isActive && e.date && e.date >= startDate) dateSet.add(e.date);
  });
  invoices.forEach((inv) => {
    if (inv.isActive) {
      (inv.payments || []).forEach((pmt) => {
        if (pmt.date && pmt.date >= startDate && pmt.paymentMethod === 'Nakit (Kasadan)') {
          dateSet.add(pmt.date);
        }
      });
    }
  });
  const mainId = account.id || 'ana-kasa';
  accountTransactions.forEach((tx) => {
    if (tx.date && tx.date >= startDate) {
      if (tx.accountId === mainId || tx.toAccountId === mainId || (!account.id && !tx.accountId)) {
        dateSet.add(tx.date);
      }
    }
  });
  if (upToDate && upToDate >= startDate) {
    dateSet.add(upToDate);
  }
  dateSet.add(startDate);

  // Sort dates chronologically
  const sortedDates = Array.from(dateSet).sort();
  const firstD = sortedDates[0];
  const lastD = upToDate && upToDate > sortedDates[sortedDates.length - 1] ? upToDate : sortedDates[sortedDates.length - 1];

  const allContinuousDates: string[] = [];
  const cursor = new Date(firstD + 'T00:00:00');
  const endCursor = new Date(lastD + 'T00:00:00');
  while (cursor <= endCursor) {
    allContinuousDates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  const chain: AnaKasaChainItem[] = [];
  const chainMap = new Map<string, AnaKasaChainItem>();
  const differenceEntries: AnaKasaChainSummary['differenceEntries'] = [];
  let totalCarryOverDifferences = 0;

  let prevClosing = Number(account.initialBalance) || 0;

  for (let i = 0; i < allContinuousDates.length; i++) {
    const d = allContinuousDates[i];
    if (upToDate && d > upToDate) break;

    const openingCash = i === 0 ? Number(account.initialBalance) || 0 : prevClosing;
    const dayEntry = entryMap.get(d);

    let cashSales = 0;
    let cashWithdrawals = 0;
    if (dayEntry) {
      const reg = calculateDailyRegister(dayEntry, expenses, invoices, accountTransactions, account);
      cashSales = reg.cashSales;
      cashWithdrawals = reg.cashWithdrawals;
    }

    let accountInflows = 0;
    let accountOutflows = 0;

    accountTransactions.forEach((tx) => {
      if (tx.date !== d) return;
      const isDailyClosing =
        tx.category === 'Gün Sonu Kasa Devri' ||
        tx.category === 'Kasa Devri' ||
        tx.id?.startsWith('vault-') ||
        tx.id?.startsWith('safe-transfer-');
      if (isDailyClosing) return;

      if (tx.type === 'deposit' && (tx.accountId === mainId || (!account.id && !tx.accountId))) {
        accountInflows += Number(tx.amount) || 0;
      } else if (tx.type === 'transfer' && tx.toAccountId === mainId) {
        accountInflows += Number(tx.amount) || 0;
      } else if (tx.type === 'withdrawal' && (tx.accountId === mainId || (!account.id && !tx.accountId))) {
        accountOutflows += Number(tx.amount) || 0;
      } else if (tx.type === 'transfer' && tx.fromAccountId === mainId) {
        accountOutflows += Number(tx.amount) || 0;
      }
    });

    const cashExpenses = getDailyCashExpenses(expenses, d);
    const cashInvoicePayments = getDailyInvoiceCashPayments(invoices, d);
    const totalOutflow = cashExpenses + cashInvoicePayments + cashWithdrawals + accountOutflows;

    const expectedCash = Math.round((openingCash + cashSales + accountInflows - totalOutflow) * 100) / 100;

    let closingCarryOver: number | undefined = undefined;
    let carryOverDifference: number | undefined = undefined;

    if (dayEntry && dayEntry.status === 'closed' && dayEntry.closingCarryOver !== undefined) {
      closingCarryOver = Number(dayEntry.closingCarryOver);
      carryOverDifference = dayEntry.carryOverDifference !== undefined
        ? Number(dayEntry.carryOverDifference)
        : Math.round((closingCarryOver - expectedCash) * 100) / 100;
    }

    const finalClosingCash = closingCarryOver !== undefined ? closingCarryOver : expectedCash;

    if (carryOverDifference !== undefined && Math.abs(carryOverDifference) >= 0.01) {
      differenceEntries.push({
        date: d,
        difference: carryOverDifference,
        closingCarryOver: closingCarryOver!,
        expectedCash,
      });
      totalCarryOverDifferences += carryOverDifference;
    }

    const item: AnaKasaChainItem = {
      date: d,
      openingCash,
      cashSales,
      accountInflows,
      cashExpenses,
      cashInvoicePayments,
      cashWithdrawals,
      accountOutflows,
      totalOutflow,
      expectedCash,
      closingCarryOver,
      carryOverDifference,
      finalClosingCash,
    };

    chain.push(item);
    chainMap.set(d, item);
    prevClosing = finalClosingCash;
  }

  const currentBalance = chain.length > 0 ? chain[chain.length - 1].finalClosingCash : (Number(account.initialBalance) || 0);

  return {
    chain,
    chainMap,
    currentBalance: Math.round(currentBalance * 100) / 100,
    totalCarryOverDifferences: Math.round(totalCarryOverDifferences * 100) / 100,
    differenceEntries,
  };
}

/**
 * Calculates Ana Kasa devir balance before a given date using the Carry-over chain.
 */
export function getAnaKasaBalanceBeforeDate(
  date: string,
  entries: DailyEntry[] | Record<string, DailyEntry> = [],
  expenses: CashExpense[] = [],
  invoices: Invoice[] = [],
  accountTransactions: AccountTransaction[] = [],
  account?: FinancialAccount
): number {
  const entryList: DailyEntry[] = Array.isArray(entries) ? entries : Object.values(entries || {});

  if (!account || !account.trackingStartDate) {
    const sorted = entryList.filter((e) => e.date < date).sort((a, b) => b.date.localeCompare(a.date));
    const prev = sorted[0];
    if (prev) {
      return prev.actualCashInHand > 0 ? prev.actualCashInHand : (prev.openingCash || 0);
    }
    return Number(account?.initialBalance) || 0;
  }

  // Takip başlangıç tarihinden önceki günler için eski hesaplar değişmesin
  if (date < account.trackingStartDate) {
    const sorted = entryList.filter((e) => e.date < date).sort((a, b) => b.date.localeCompare(a.date));
    const prev = sorted[0];
    if (prev) {
      return prev.actualCashInHand > 0 ? prev.actualCashInHand : (prev.openingCash || 0);
    }
    return Number(account.initialBalance) || 0;
  }

  // Başlangıç tarihinin kendi günü için devir = başlangıç bakiyesi
  if (date === account.trackingStartDate) {
    return Number(account.initialBalance) || 0;
  }

  // Calculate day preceding date
  const prevDateObj = new Date(date + 'T00:00:00');
  prevDateObj.setDate(prevDateObj.getDate() - 1);
  const prevDateStr = prevDateObj.toISOString().slice(0, 10);

  const chainSummary = getAnaKasaChain(
    account,
    entries,
    expenses,
    invoices,
    accountTransactions,
    prevDateStr
  );

  const prevItem = chainSummary.chainMap.get(prevDateStr);
  if (prevItem) {
    return prevItem.finalClosingCash;
  }

  return chainSummary.currentBalance;
}

/**
 * Generates audit warnings and missing field notifications for the daily closing
 */
export function auditDailyEntry(
  dailyEntry: DailyEntry,
  expenses: CashExpense[] = [],
  invoices: Invoice[] = [],
  accountTransactions: AccountTransaction[] = [],
  mainAccount?: FinancialAccount
): AuditWarning[] {
  const warnings: AuditWarning[] = [];
  const reg = calculateDailyRegister(dailyEntry, expenses, invoices, accountTransactions, mainAccount);

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

/**
 * Ortak fatura tutarları yardımcı fonksiyonu:
 * - netAmount varsa: net = netAmount, kdv = vatAmount, kdvDahil = totalAmount.
 * - netAmount yoksa (eski kayıt): net = totalAmount, kdv = vatAmount, kdvDahil = totalAmount + vatAmount, isOldRecord = true.
 * - Kalan borç her zaman: totalAmount - ödenen (mevcut sistem).
 */
export interface InvoiceAmounts {
  netAmount: number;
  vatAmount: number;
  totalWithVat: number; // KDV dahil
  paidAmount: number;
  remainingDebt: number;
  isOldRecord: boolean;
}

export function getInvoiceAmounts(inv: Invoice): InvoiceAmounts {
  const round2 = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;
  const isOld = inv.netAmount === undefined || inv.netAmount === null;
  const paid = round2(inv.payments?.reduce((s, p) => s + (Number(p.amount) || 0), 0) || 0);

  let net: number;
  const vat = round2(Number(inv.vatAmount) || 0);
  let totalWithVat: number;

  if (!isOld) {
    net = round2(Number(inv.netAmount) || 0);
    totalWithVat = round2(Number(inv.totalAmount) || 0);
  } else {
    net = round2(Number(inv.totalAmount) || 0);
    totalWithVat = round2(net + vat);
  }

  const remaining = round2(Math.max(0, (Number(inv.totalAmount) || 0) - paid));

  return {
    netAmount: net,
    vatAmount: vat,
    totalWithVat,
    paidAmount: paid,
    remainingDebt: remaining,
    isOldRecord: isOld,
  };
}

/**
 * Normalizes supplier company name:
 * Trims leading/trailing whitespace, collapses consecutive spaces into one,
 * ignores Turkish upper/lowercase differences.
 */
export function normalizeSupplierName(name?: string): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR');
}

/**
 * Clean tax number / VKN:
 * Removes spaces and trims.
 */
export function cleanTaxNumber(taxNo?: string): string {
  if (!taxNo) return '';
  return taxNo.trim().replace(/\s+/g, '');
}

/**
 * Groups active invoices into Supplier groups:
 * - Groups by VKN if present, otherwise by normalized company name.
 * - Same VKN with different names merges into a single supplier (displays the latest name).
 * - Invoice without VKN merges into an existing VKN group if their normalized names match.
 */
export function groupInvoicesBySupplier(invoices: Invoice[]): SupplierGroup[] {
  const round2 = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;
  const activeInvoices = invoices.filter((i) => i.isActive && i.supplierName && i.supplierName.trim());

  // Sort descending by date, then createdAt
  const sorted = [...activeInvoices].sort((a, b) => {
    const dComp = (b.date || '').localeCompare(a.date || '');
    if (dComp !== 0) return dComp;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  interface Cluster {
    id: string;
    names: Set<string>;
    vkns: Set<string>;
    latestName: string;
    latestVkn?: string;
    latestDate: string;
    invoices: Invoice[];
  }

  const clusters: Cluster[] = [];
  const vknToCluster = new Map<string, Cluster>();
  const nameToCluster = new Map<string, Cluster>();

  for (const inv of sorted) {
    const vkn = cleanTaxNumber(inv.taxNumber);
    const normName = normalizeSupplierName(inv.supplierName);

    let cluster: Cluster | undefined = undefined;

    if (vkn && vknToCluster.has(vkn)) {
      cluster = vknToCluster.get(vkn);
    }

    if (normName && nameToCluster.has(normName)) {
      const nameCluster = nameToCluster.get(normName)!;
      if (!cluster) {
        cluster = nameCluster;
      } else if (cluster !== nameCluster) {
        // Merge nameCluster into cluster
        nameCluster.invoices.forEach((i) => cluster!.invoices.push(i));
        nameCluster.names.forEach((n) => {
          cluster!.names.add(n);
          nameToCluster.set(n, cluster!);
        });
        nameCluster.vkns.forEach((v) => {
          cluster!.vkns.add(v);
          vknToCluster.set(v, cluster!);
        });
        const idx = clusters.indexOf(nameCluster);
        if (idx !== -1) clusters.splice(idx, 1);
      }
    }

    if (!cluster) {
      cluster = {
        id: vkn ? `vkn-${vkn}` : `name-${normName}`,
        names: new Set(),
        vkns: new Set(),
        latestName: inv.supplierName.trim(),
        latestVkn: vkn || undefined,
        latestDate: inv.date || '',
        invoices: [],
      };
      clusters.push(cluster);
    }

    cluster.invoices.push(inv);

    if (normName) {
      cluster.names.add(normName);
      nameToCluster.set(normName, cluster);
    }
    if (vkn) {
      cluster.vkns.add(vkn);
      vknToCluster.set(vkn, cluster);
      if (!cluster.latestVkn) {
        cluster.latestVkn = vkn;
      }
    }
    if (!cluster.latestName) {
      cluster.latestName = inv.supplierName.trim();
    }
  }

  return clusters.map((c) => {
    let netSum = 0;
    let vatSum = 0;
    let totalWithVatSum = 0;
    let paidSum = 0;
    let debtSum = 0;
    let maxDate = '';

    c.invoices.forEach((inv) => {
      const amounts = getInvoiceAmounts(inv);
      netSum += amounts.netAmount;
      vatSum += amounts.vatAmount;
      totalWithVatSum += amounts.totalWithVat;
      paidSum += amounts.paidAmount;
      debtSum += amounts.remainingDebt;
      if (!maxDate || (inv.date && inv.date > maxDate)) {
        maxDate = inv.date;
      }
    });

    return {
      id: c.id,
      name: c.latestName || 'İsimsiz Tedarikçi',
      taxNumber: c.latestVkn,
      invoiceCount: c.invoices.length,
      totalAmount: round2(totalWithVatSum),
      netAmount: round2(netSum),
      vatAmount: round2(vatSum),
      paidAmount: round2(paidSum),
      remainingDebt: round2(debtSum),
      lastTransactionDate: maxDate || c.latestDate,
      invoices: c.invoices,
    };
  });
}

