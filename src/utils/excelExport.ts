import * as XLSX from 'xlsx';
import { DailyEntry, CashExpense, Invoice } from '../types';
import { calculateDailyRegister, getDailyCashExpenses, getDailyInvoiceCashPayments } from './calculations';
import { formatDateTR } from './formatters';

/**
 * Downloads an Excel workbook with a safe filename
 */
function downloadWorkbook(workbook: XLSX.WorkBook, fileName: string) {
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports single Day Daily Register Report to Excel
 */
export function exportDailyRegisterToExcel(
  entry: DailyEntry,
  expenses: CashExpense[],
  invoices: Invoice[]
) {
  const reg = calculateDailyRegister(entry, expenses, invoices);
  const wb = XLSX.utils.book_new();

  // 1. Summary Sheet
  const summaryRows = [
    ['RESTORAN GÜNLÜK KASA VE VEGA RAPORU'],
    ['Tarih', formatDateTR(entry.date)],
    ['Durum', entry.status === 'closed' ? 'KAPATILDI / KİLİTLİ' : 'AÇIK / TASLAK'],
    [],
    ['SATIŞ VE GELİRLER (VEGA ŞEFİM)'],
    ['Vega Toplam Satış (Ciro)', reg.totalSales],
    ['Nakit Satış', reg.cashSales],
    ['Kredi Kartı Satış (Vega)', reg.creditCardSales],
    ['Diğer Satışlar (Yemek Kartı / Cari)', reg.otherSales],
    ['İskonto Toplamı', entry.vegaReport.discountTotal || 0],
    ['İade Toplamı', entry.vegaReport.refundTotal || 0],
    ['İkram / Zayi', entry.vegaReport.treatTotal || 0],
    ['Masa / Adisyon Sayısı', entry.vegaReport.tableCount || 0],
    ['Kişi / Kuver Sayısı', entry.vegaReport.guestCount || 0],
    [],
    ['POS CİHAZLARI Z RAPORLARI'],
    ...entry.posReports.map((p) => [p.posDeviceName, `Z No: ${p.zNumber || '-'}`, p.creditCardTotal]),
    ['TOPLAM POS TUTARI', '', reg.posTotal],
    ['VEGA / POS FARKI', '', reg.posVegaDifference],
    ['POS UYUM DURUMU', '', reg.isPosReconciled ? 'UYUMLU' : 'FARK VAR'],
    [],
    ['GÜNLÜK NAKİT KASA HESABI'],
    ['Önceki Günden Devir Kasa', reg.openingCash],
    ['(+) Günlük Nakit Satış', reg.cashSales],
    ['(-) Kasadan Ödenen Giderler', reg.cashExpenses],
    ['(-) Kasadan Ödenen Fatura Ödemeleri', reg.invoiceCashPayments],
    ['(-) Bankaya Yatırılan / Çekimler', reg.cashWithdrawals],
    ['(=) BEKLENEN NAKİT KASA', reg.expectedCash],
    ['(Fiili) SAYILAN KASA MEVCUDU', reg.actualCashInHand],
    ['KASA FARKI', reg.cashDifference],
    ['KASA DURUMU', reg.isCashBalanced ? 'KASA MUTABIK' : (reg.cashDifference > 0 ? 'KASA FAZLASI' : 'KASA AÇIĞI')],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Günlük Kasa Özeti');

  // 2. Day Expenses Sheet
  const dayExpenses = expenses.filter((e) => e.isActive && e.date === entry.date);
  const expenseData = [
    ['Tarih', 'Kategori', 'Açıklama', 'Tutar (TL)', 'Ödeme Kaynağı', 'Belge/Fiş No', 'Giren'],
    ...dayExpenses.map((e) => [
      formatDateTR(e.date),
      e.category,
      e.description,
      e.amount,
      e.paidBy,
      e.receiptNo || '-',
      e.enteredBy,
    ]),
  ];
  const wsExpenses = XLSX.utils.aoa_to_sheet(expenseData);
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Günün Giderleri');

  // 3. Day Invoices Sheet
  const dayInvoices = invoices.filter((i) => i.isActive && i.date === entry.date);
  const invoiceData = [
    ['Tarih', 'Fatura No', 'Tedarikçi / Firma', 'Kategori', 'Tutar (TL)', 'KDV', 'Ödeme Durumu', 'Vade'],
    ...dayInvoices.map((inv) => [
      formatDateTR(inv.date),
      inv.invoiceNo,
      inv.supplierName,
      inv.category,
      inv.totalAmount,
      inv.vatAmount,
      inv.paymentStatus === 'paid' ? 'Ödendi' : inv.paymentStatus === 'partial' ? 'Kısmi Ödendi' : 'Ödenmedi',
      formatDateTR(inv.dueDate),
    ]),
  ];
  const wsInvoices = XLSX.utils.aoa_to_sheet(invoiceData);
  XLSX.utils.book_append_sheet(wb, wsInvoices, 'Günün Faturaları');

  downloadWorkbook(wb, `Gunluk_Kasa_Raporu_${entry.date}.xlsx`);
}

/**
 * Exports Monthly Consolidated Summary Table to Excel
 */
export function exportMonthlyReportToExcel(
  month: string, // YYYY-MM
  entries: DailyEntry[] | Record<string, DailyEntry>,
  expenses: CashExpense[] = [],
  invoices: Invoice[] = []
) {
  const entriesList: DailyEntry[] = Array.isArray(entries)
    ? entries
    : Object.values(entries);

  const monthEntries = entriesList
    .filter((e) => e && e.date && e.date.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date));

  const wb = XLSX.utils.book_new();

  // 1. Daily breakdown sheet
  const headers = [
    'Tarih',
    'Durum',
    'Vega Toplam Ciro',
    'Nakit Satış',
    'Kredi Kartı (Vega)',
    'POS Z Toplamı',
    'POS / Vega Farkı',
    'Devir Kasa',
    'Kasa Gideri',
    'Kasadan Fatura Öd.',
    'Beklenen Kasa',
    'Fiili Kasa',
    'Kasa Farkı',
  ];

  const rows: (string | number)[][] = [headers];

  let sumSales = 0;
  let sumCash = 0;
  let sumCC = 0;
  let sumPOS = 0;
  let sumPosDiff = 0;
  let sumCashExpenses = 0;
  let sumInvoiceCash = 0;
  let sumCashDiff = 0;

  monthEntries.forEach((entry) => {
    const reg = calculateDailyRegister(entry, expenses, invoices);
    sumSales += reg.totalSales;
    sumCash += reg.cashSales;
    sumCC += reg.creditCardSales;
    sumPOS += reg.posTotal;
    sumPosDiff += reg.posVegaDifference;
    sumCashExpenses += reg.cashExpenses;
    sumInvoiceCash += reg.invoiceCashPayments;
    sumCashDiff += reg.cashDifference;

    rows.push([
      formatDateTR(entry.date),
      entry.status === 'closed' ? 'Kapatıldı' : 'Açık',
      reg.totalSales,
      reg.cashSales,
      reg.creditCardSales,
      reg.posTotal,
      reg.posVegaDifference,
      reg.openingCash,
      reg.cashExpenses,
      reg.invoiceCashPayments,
      reg.expectedCash,
      reg.actualCashInHand,
      reg.cashDifference,
    ]);
  });

  // Total row
  rows.push([
    'AYLIK TOPLAM',
    `${monthEntries.length} Gün`,
    sumSales,
    sumCash,
    sumCC,
    sumPOS,
    sumPosDiff,
    '-',
    sumCashExpenses,
    sumInvoiceCash,
    '-',
    '-',
    sumCashDiff,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, `${month} Günlük Döküm`);

  // 2. Invoices of the month
  const monthInvoices = invoices.filter((i) => i.isActive && i.date.startsWith(month));
  const invoiceRows = [
    ['Tarih', 'Fatura No', 'Firma Adı', 'Kategori', 'Fatura Tutarı', 'KDV', 'Ödenen', 'Kalan Bakiye', 'Durum', 'Vade'],
    ...monthInvoices.map((inv) => {
      const paid = inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const remaining = Math.max(0, inv.totalAmount - paid);
      return [
        formatDateTR(inv.date),
        inv.invoiceNo,
        inv.supplierName,
        inv.category,
        inv.totalAmount,
        inv.vatAmount,
        paid,
        remaining,
        inv.paymentStatus === 'paid' ? 'Ödendi' : inv.paymentStatus === 'partial' ? 'Kısmi Ödendi' : 'Ödenmedi',
        formatDateTR(inv.dueDate),
      ];
    }),
  ];
  const wsInv = XLSX.utils.aoa_to_sheet(invoiceRows);
  XLSX.utils.book_append_sheet(wb, wsInv, `${month} Faturalar`);

  downloadWorkbook(wb, `Aylik_Muhasebe_Raporu_${month}.xlsx`);
}

/**
 * Exports All Invoices and Line Items to Excel
 */
export function exportInvoicesToExcel(invoices: Invoice[]) {
  const wb = XLSX.utils.book_new();

  // Header level
  const invoiceHeaders = [
    'Tarih',
    'Fatura No',
    'Tedarikçi / Firma',
    'Vergi No',
    'Kategori',
    'Toplam Tutar',
    'KDV Tutarı',
    'KDV Oranı (%)',
    'Ödenen Tutar',
    'Kalan Borç',
    'Ödeme Durumu',
    'Vade Tarihi',
    'Açıklama',
  ];

  const invoiceRows = [
    invoiceHeaders,
    ...invoices
      .filter((i) => i.isActive)
      .map((inv) => {
        const paid = inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        return [
          formatDateTR(inv.date),
          inv.invoiceNo,
          inv.supplierName,
          inv.taxNumber || '-',
          inv.category,
          inv.totalAmount,
          inv.vatAmount,
          inv.vatRate,
          paid,
          Math.max(0, inv.totalAmount - paid),
          inv.paymentStatus === 'paid' ? 'Ödendi' : inv.paymentStatus === 'partial' ? 'Kısmi Ödendi' : 'Ödenmedi',
          formatDateTR(inv.dueDate),
          inv.description || '',
        ];
      }),
  ];

  const ws = XLSX.utils.aoa_to_sheet(invoiceRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Faturalar');

  // Itemized breakdown
  const itemHeaders = [
    'Fatura Tarihi',
    'Fatura No',
    'Tedarikçi',
    'Ürün Adı',
    'Ürün Kategorisi',
    'Miktar',
    'Birim',
    'Birim Fiyat',
    'KDV (%)',
    'Toplam Kalem Tutarı',
  ];

  const itemRows: (string | number)[][] = [itemHeaders];
  invoices
    .filter((i) => i.isActive)
    .forEach((inv) => {
      inv.items.forEach((it) => {
        itemRows.push([
          formatDateTR(inv.date),
          inv.invoiceNo,
          inv.supplierName,
          it.productName,
          it.category,
          it.quantity,
          it.unit,
          it.unitPrice,
          it.vatRate,
          it.total,
        ]);
      });
    });

  const wsItems = XLSX.utils.aoa_to_sheet(itemRows);
  XLSX.utils.book_append_sheet(wb, wsItems, 'Ürün Kalemleri');

  downloadWorkbook(wb, `Faturalar_ve_Urunler_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Exports Expenses to Excel
 */
export function exportExpensesToExcel(expenses: CashExpense[]) {
  const wb = XLSX.utils.book_new();
  const rows = [
    ['Tarih', 'Kategori', 'Açıklama', 'Tutar (TL)', 'Ödeme Kaynağı', 'Belge / Fiş No', 'Giriş Yapan', 'Notlar'],
    ...expenses
      .filter((e) => e.isActive)
      .map((e) => [
        formatDateTR(e.date),
        e.category,
        e.description,
        e.amount,
        e.paidBy,
        e.receiptNo || '-',
        e.enteredBy,
        e.notes || '',
      ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Kasa Giderleri');
  downloadWorkbook(wb, `Kasa_Giderleri_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
