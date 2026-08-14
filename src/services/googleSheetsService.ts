import { getAccessToken } from './googleAuth';
import { DailyEntry, CashExpense, Invoice, PosDevice } from '../types';
import { calculateDailyRegister } from '../utils/calculations';
import { formatCurrency, formatDateTR } from '../utils/formatters';

export interface SpreadsheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  sheets: { sheetId: number; title: string }[];
}

/**
 * Creates a dedicated, beautifully formatted Google Spreadsheet for Restaurant Cash & Vega Management
 */
export const createRestaurantSpreadsheet = async (
  title = `Restoran Kasa & Vega Takip Tablosu (${new Date().getFullYear()})`
): Promise<SpreadsheetInfo> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Hesabı oturumu açık değil.');

  const requestBody = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'Günlük Kasa İcmali',
          gridProperties: { rowCount: 100, columnCount: 15, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Vega Satış Grupları',
          gridProperties: { rowCount: 200, columnCount: 8, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Kasa Masrafları',
          gridProperties: { rowCount: 300, columnCount: 7, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Faturalar & Ödemeler',
          gridProperties: { rowCount: 300, columnCount: 10, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'POS & Banka Dağılımı',
          gridProperties: { rowCount: 200, columnCount: 7, frozenRowCount: 1 },
        },
      },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Google E-Tablo oluşturulamadı.');
  }

  const data = await res.json();

  // Populate initial headers in sheets
  const spreadsheetId = data.spreadsheetId;
  await initializeSpreadsheetHeaders(spreadsheetId);

  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
    title: data.properties.title,
    sheets: data.sheets.map((s: any) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
    })),
  };
};

/**
 * Initializes header columns and styles for all sheets
 */
export const initializeSpreadsheetHeaders = async (spreadsheetId: string) => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Hesabı oturumu açık değil.');

  const headers = [
    {
      range: "'Günlük Kasa İcmali'!A1:L1",
      values: [
        [
          'Tarih',
          'Durum',
          'Açılış Devir Kasa (₺)',
          'Vega Toplam Ciro (₺)',
          'Nakit Satış (₺)',
          'Kredi Kartı Satış (₺)',
          'Kasa Masrafları (₺)',
          'Kasa Çıkışları / Çekilen (₺)',
          'Hesaplanan Kasa (₺)',
          'Fiili Sayılan Kasa (₺)',
          'Kasa Farkı / Durum (₺)',
          'Notlar',
        ],
      ],
    },
    {
      range: "'Vega Satış Grupları'!A1:G1",
      values: [
        [
          'Tarih',
          'Kategori / Grup Adı',
          'Ürün / Kalem Adı',
          'Satılan Adet',
          'Birim Fiyat (₺)',
          'Toplam Tutar (₺)',
          'Pay (%)',
        ],
      ],
    },
    {
      range: "'Kasa Masrafları'!A1:F1",
      values: [
        [
          'Tarih',
          'Gider Kategorisi',
          'Açıklama / Detay',
          'Belge / Fiş No',
          'Ödeme Yapan / Alan',
          'Tutar (₺)',
        ],
      ],
    },
    {
      range: "'Faturalar & Ödemeler'!A1:H1",
      values: [
        [
          'Fatura Tarihi',
          'Tedarikçi Firma',
          'Fatura No',
          'Kategori',
          'Toplam Tutar (₺)',
          'Ödenen Tutar (₺)',
          'Kalan Borç (₺)',
          'Ödeme Durumu',
        ],
      ],
    },
    {
      range: "'POS & Banka Dağılımı'!A1:E1",
      values: [
        ['Tarih', 'POS Cihazı / Tanımı', 'Banka Adı', 'Gün Sonu Slip Toplamı (₺)', 'Not'],
      ],
    },
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: headers,
      }),
    }
  );
};

/**
 * Appends or updates a DailyEntry into the Google Spreadsheet
 */
export const syncDailyEntryToSheets = async (
  spreadsheetId: string,
  entry: DailyEntry,
  expenses: CashExpense[],
  invoices: Invoice[]
): Promise<void> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Hesabı oturumu açık değil.');

  const dayExpenses = expenses.filter((e) => e.date === entry.date);
  const dayInvoices = invoices.filter((i) => i.date === entry.date);

  const reg = calculateDailyRegister(entry, dayExpenses, dayInvoices);

  // 1. Günlük Kasa İcmali Satırı
  const icmalRow = [
    entry.date,
    entry.status === 'closed' ? 'KAPANDI / ONAYLI' : 'TASLAK',
    entry.openingCash || 0,
    entry.vegaReport?.totalSales || 0,
    entry.vegaReport?.cashSales || 0,
    entry.vegaReport?.creditCardSales || 0,
    reg.cashExpenses || 0,
    reg.totalCashOutflow || 0,
    reg.expectedCash || 0,
    entry.actualCashInHand || 0,
    reg.cashDifference || 0,
    entry.notes || '',
  ];

  // 2. Vega Satış Grupları Satırları
  const vegaRows: any[][] = [];
  if (entry.vegaGroups && entry.vegaGroups.length > 0) {
    for (const group of entry.vegaGroups) {
      if (group.items && group.items.length > 0) {
        for (const item of group.items) {
          vegaRows.push([
            entry.date,
            group.name,
            item.name,
            item.quantity,
            item.unitPrice,
            item.totalPrice,
            group.percentage ? `${group.percentage.toFixed(1)}%` : '',
          ]);
        }
      } else {
        vegaRows.push([
          entry.date,
          group.name,
          '- (Grup Toplamı)',
          group.itemCount || 0,
          '',
          group.amount || 0,
          group.percentage ? `${group.percentage.toFixed(1)}%` : '',
        ]);
      }
    }
  }

  // 3. Masraflar Satırları
  const expenseRows = dayExpenses.map((exp) => [
    exp.date,
    exp.category,
    exp.description,
    exp.receiptNo || '',
    exp.enteredBy || exp.paidBy || '',
    exp.amount,
  ]);

  // 4. Faturalar Satırları
  const invoiceRows = dayInvoices.map((inv) => [
    inv.date,
    inv.supplierName,
    inv.invoiceNo,
    inv.category,
    inv.totalAmount,
    inv.payments ? inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) : 0,
    inv.totalAmount - (inv.payments ? inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) : 0),
    inv.paymentStatus === 'paid' ? 'ÖDENDİ' : inv.paymentStatus === 'partial' ? 'KISMİ ÖDENDİ' : 'ÖDENMEDİ',
  ]);

  // 5. POS Cihazları Satırları
  const posRows = (entry.posReports || []).map((pos) => [
    entry.date,
    pos.posDeviceName,
    pos.bankName,
    pos.creditCardTotal,
    '',
  ]);

  // Execute append operations
  const appendData = [
    { range: "'Günlük Kasa İcmali'!A:L", values: [icmalRow] },
    ...(vegaRows.length > 0 ? [{ range: "'Vega Satış Grupları'!A:G", values: vegaRows }] : []),
    ...(expenseRows.length > 0 ? [{ range: "'Kasa Masrafları'!A:F", values: expenseRows }] : []),
    ...(invoiceRows.length > 0 ? [{ range: "'Faturalar & Ödemeler'!A:H", values: invoiceRows }] : []),
    ...(posRows.length > 0 ? [{ range: "'POS & Banka Dağılımı'!A:E", values: posRows }] : []),
  ];

  for (const item of appendData) {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        item.range
      )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: item.values }),
      }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn('Sheet append uyarısı:', errData);
    }
  }
};

/**
 * Syncs full database / monthly history to Google Spreadsheet in bulk
 */
export const syncAllDataToSheets = async (
  spreadsheetId: string,
  entries: Record<string, DailyEntry>,
  expenses: CashExpense[],
  invoices: Invoice[]
): Promise<void> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Hesabı oturumu açık değil.');

  // Re-initialize headers
  await initializeSpreadsheetHeaders(spreadsheetId);

  const dates = Object.keys(entries).sort();
  const icmalRows: any[][] = [];
  const vegaRows: any[][] = [];
  const posRows: any[][] = [];

  for (const date of dates) {
    const entry = entries[date];
    const dayExpenses = expenses.filter((e) => e.date === date);
    const dayInvoices = invoices.filter((i) => i.date === date);
    const reg = calculateDailyRegister(entry, dayExpenses, dayInvoices);

    icmalRows.push([
      entry.date,
      entry.status === 'closed' ? 'KAPANDI / ONAYLI' : 'TASLAK',
      entry.openingCash || 0,
      entry.vegaReport?.totalSales || 0,
      entry.vegaReport?.cashSales || 0,
      entry.vegaReport?.creditCardSales || 0,
      reg.cashExpenses || 0,
      reg.totalCashOutflow || 0,
      reg.expectedCash || 0,
      entry.actualCashInHand || 0,
      reg.cashDifference || 0,
      entry.notes || '',
    ]);

    if (entry.vegaGroups) {
      for (const g of entry.vegaGroups) {
        if (g.items && g.items.length > 0) {
          for (const item of g.items) {
            vegaRows.push([
              entry.date,
              g.name,
              item.name,
              item.quantity,
              item.unitPrice,
              item.totalPrice,
              g.percentage ? `${g.percentage.toFixed(1)}%` : '',
            ]);
          }
        } else {
          vegaRows.push([
            entry.date,
            g.name,
            '- (Grup Toplamı)',
            g.itemCount || 0,
            '',
            g.amount || 0,
            g.percentage ? `${g.percentage.toFixed(1)}%` : '',
          ]);
        }
      }
    }

    if (entry.posReports) {
      for (const pos of entry.posReports) {
        posRows.push([entry.date, pos.posDeviceName, pos.bankName, pos.creditCardTotal, '']);
      }
    }
  }

  const expenseRows = expenses.map((exp) => [
    exp.date,
    exp.category,
    exp.description,
    exp.receiptNo || '',
    exp.enteredBy || exp.paidBy || '',
    exp.amount,
  ]);

  const invoiceRows = invoices.map((inv) => [
    inv.date,
    inv.supplierName,
    inv.invoiceNo,
    inv.category,
    inv.totalAmount,
    inv.payments ? inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) : 0,
    inv.totalAmount - (inv.payments ? inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) : 0),
    inv.paymentStatus === 'paid' ? 'ÖDENDİ' : inv.paymentStatus === 'partial' ? 'KISMİ ÖDENDİ' : 'ÖDENMEDİ',
  ]);

  const dataPayload = [
    { range: "'Günlük Kasa İcmali'!A2:L", values: icmalRows },
    { range: "'Vega Satış Grupları'!A2:G", values: vegaRows },
    { range: "'Kasa Masrafları'!A2:F", values: expenseRows },
    { range: "'Faturalar & Ödemeler'!A2:H", values: invoiceRows },
    { range: "'POS & Banka Dağılımı'!A2:E", values: posRows },
  ];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: dataPayload,
      }),
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Veriler Google Sheets tablosuna toplu yazılamadı.');
  }
};
