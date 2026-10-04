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

  // Bugünün Günlük Kasa virmanları (para girişleri ve çıkışları)
  let gunlukKasaTransferIn = 0;
  let gunlukKasaTransferOut = 0;

  if (accountTransactions && accountTransactions.length > 0) {
    accountTransactions.forEach((tx) => {
      if (tx.date !== dailyEntry.date) return;
      // Kasa devri / vault transfers hariç tutulur
      const isDailyClosing =
        tx.category === 'Gün Sonu Kasa Devri' ||
        tx.category === 'Kasa Devri' ||
        tx.id?.startsWith('vault-') ||
        tx.id?.startsWith('closing-tx-') ||
        tx.id?.startsWith('safe-transfer-');
      if (isDailyClosing) return;

      const amt = Number(tx.amount) || 0;

      // Günlük Kasa'ya gelen virmanlar ('gunluk-kasa' hedeflenen transferler veya direkt yatırılanlar)
      if (tx.type === 'transfer' && tx.toAccountId === 'gunluk-kasa') {
        gunlukKasaTransferIn += amt;
      } else if (tx.type === 'deposit' && tx.accountId === 'gunluk-kasa') {
        gunlukKasaTransferIn += amt;
      }

      // Günlük Kasa'dan giden virmanlar ('gunluk-kasa' kaynaklı transferler veya direkt çekimler)
      if (tx.type === 'transfer' && tx.fromAccountId === 'gunluk-kasa') {
        gunlukKasaTransferOut += amt;
      } else if (tx.type === 'withdrawal' && tx.accountId === 'gunluk-kasa') {
        gunlukKasaTransferOut += amt;
      }
    });
  }

  const accountCashDeposits = gunlukKasaTransferIn;
  const accountCashWithdrawals = gunlukKasaTransferOut;
  const totalCashOutflow = cashExpenses + invoiceCashPayments + cashWithdrawals + gunlukKasaTransferOut;
  // Gün sonu hesaplanan kasa = openingCash + cashSales - cashExpenses - cashInvoicePayments - cashWithdrawals + (o gün Günlük Kasa'ya gelen virmanlar) - (o gün Günlük Kasa'dan giden virmanlar)
  const expectedCash = openingCash + cashSales + gunlukKasaTransferIn - totalCashOutflow;
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
 * Zincirleme (chain) devir mantığı:
 * Her günün openingCash (o günün açılış avansı) değeri:
 * - Bir önceki günün DailyEntry kaydının closingCarryOver (gün sonu kapanışta kalan tutar) değerini otomatik devralır.
 * - Gün N'in openingCash'i = Gün N-1'in closingCarryOver'ı.
 * - İlk gün (hiç önceki kayıt yoksa) openingCash, Ana Kasa hesabının initialBalance'ı ile başlar (bir defaya mahsus).
 */
export function getPreviousDayClosingCarryOver(
  date: string,
  entries: DailyEntry[] | Record<string, DailyEntry> = [],
  mainAccount?: FinancialAccount
): number {
  const entryList: DailyEntry[] = Array.isArray(entries) ? entries : Object.values(entries || {});

  // date'den önceki günleri bul ve tarihe göre azalan (en yeniden en eskiye) sırala
  const prevEntries = entryList
    .filter((e) => e && e.date && e.date < date)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (prevEntries.length > 0) {
    const prev = prevEntries[0];
    if (prev.closingCarryOver !== undefined && prev.closingCarryOver !== null) {
      return Number(prev.closingCarryOver) || 0;
    }
    // Önceki kayıt varsa ama closingCarryOver henüz atanmamışsa
    if (prev.status === 'closed' && prev.actualCashInHand !== undefined && prev.actualCashInHand > 0) {
      return Number(prev.actualCashInHand) || 0;
    }
    return Number(prev.actualCashInHand) || Number(prev.openingCash) || 0;
  }

  // İlk gün (hiç önceki kayıt yoksa) openingCash, Ana Kasa hesabının initialBalance'ı ile başlar
  return Number(mainAccount?.initialBalance) || 0;
}

/**
 * Calculates Ana Kasa devir balance before a given date using the Carry-over chain.
 */
export function getAnaKasaBalanceBeforeDate(
  date: string,
  entries: DailyEntry[] | Record<string, DailyEntry> = [],
  _expenses: CashExpense[] = [],
  _invoices: Invoice[] = [],
  _accountTransactions: AccountTransaction[] = [],
  mainAccount?: FinancialAccount
): number {
  return getPreviousDayClosingCarryOver(date, entries, mainAccount);
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

