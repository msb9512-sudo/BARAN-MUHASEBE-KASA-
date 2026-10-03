import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// PDF okuyucu (worker) dosyası uygulamanın içinden yüklenir, internet gerekmez.
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
} catch (e) {
  console.warn('PDF Worker initialization note:', e);
}

export interface SoldProductItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  totalPrice: number;
}

export interface ExtractedGroupItem {
  id: string;
  name: string;
  amount: number;
  itemCount?: number;
  percentage?: number;
  items?: SoldProductItem[];
}

export interface ParsedPdfReport {
  rawText: string;
  totalSales: number; // Net satış / Genel Kasa Toplamı
  grossProductSales?: number; // Ürün Toplam Satış (Brüt)
  cashSales: number;
  creditCardSales: number;
  otherSales: number;
  discountAmount: number; // Toplam İskonto
  discountTotal?: number;
  openAccountTotal?: number; // Açık Hesap Toplamı
  openAccountDiscount?: number; // Açık Hesap İskonto Toplamı
  openTablesTotal?: number; // Şuan Açık Olan Masalar
  kasaGelirGiderTotal?: number;
  netGeneralTotal?: number;
  complimentaryAmount: number;
  cancelledAmount: number;
  groups: ExtractedGroupItem[];
  detectedDate?: string;
  tableCount?: number;
  guestCount?: number;
  posBreakdown?: { name: string; amount: number }[];
  validationWarnings?: string[];
}

/**
 * Parses numeric values safely from Turkish format (e.g. 14.520,50 -> 14520.50, -3.933,00 -> -3933.00)
 */
export function parseTRNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).trim();
  const isNegative = str.includes('-') || str.startsWith('(');
  // Remove currency signs, spaces, parens, minus
  const cleaned = str.replace(/[₺TL$€\s()-]/g, '');
  if (!cleaned) return 0;

  let num = 0;
  // Check if standard Turkish formatting: 12.345,67
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      // 12.345,67 -> 12345.67
      const norm = cleaned.replace(/\./g, '').replace(',', '.');
      num = parseFloat(norm);
    } else {
      // 12,345.67 -> 12345.67
      const norm = cleaned.replace(/,/g, '');
      num = parseFloat(norm);
    }
  } else if (cleaned.includes(',')) {
    const norm = cleaned.replace(',', '.');
    num = parseFloat(norm);
  } else {
    num = parseFloat(cleaned);
  }

  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : num;
}

/**
 * Extracts raw text from a PDF ArrayBuffer with 2D spatial layout reconstruction.
 * Groups visual tokens by horizontal lines (Y coordinates) and sorts them left-to-right (X coordinates).
 */
export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Extract raw text items with precise 2D coordinates
    interface RawPdfToken {
      str: string;
      x: number;
      y: number;
      w: number;
      h: number;
    }

    const rawTokens: RawPdfToken[] = [];
    (textContent.items || []).forEach((item: any) => {
      if (!item || !item.str) return;
      const str = item.str.replace(/\u00A0/g, ' '); // Replace non-breaking spaces
      if (str.trim() === '') return;
      const x = item.transform[4] || 0;
      const y = item.transform[5] || 0;
      const w = item.width || (str.length * 6);
      const h = item.height || (item.transform[0] ? Math.abs(item.transform[0]) : 10);
      rawTokens.push({ str, x, y, w, h });
    });

    if (rawTokens.length === 0) continue;

    // Cluster tokens into horizontal text lines based on Y coordinate tolerance
    // Note: in PDF coordinate space, Y=0 is at the bottom, so higher Y is higher up on page.
    rawTokens.sort((a, b) => b.y - a.y);

    const rows: { y: number; tokens: RawPdfToken[] }[] = [];
    rawTokens.forEach((token) => {
      // Find row within 4.5pt Y tolerance
      const matchingRow = rows.find((r) => Math.abs(r.y - token.y) <= 4.5);
      if (matchingRow) {
        matchingRow.tokens.push(token);
      } else {
        rows.push({ y: token.y, tokens: [token] });
      }
    });

    // Sort rows from top of the page to bottom (descending Y)
    rows.sort((a, b) => b.y - a.y);

    // Within each row, sort tokens left to right (ascending X) and join them
    let pageText = '';
    rows.forEach((row) => {
      row.tokens.sort((a, b) => a.x - b.x);

      let rowStr = '';
      let prevTokenEnd = -1;

      row.tokens.forEach((token) => {
        if (prevTokenEnd >= 0) {
          const spaceGap = token.x - prevTokenEnd;
          if (spaceGap > 2.0) {
            rowStr += ' ';
          }
        }
        rowStr += token.str;
        prevTokenEnd = token.x + token.w;
      });

      const cleanRow = rowStr.trim();
      if (cleanRow) {
        pageText += cleanRow + '\n';
      }
    });

    fullText += pageText + '\n';
  }

  return fullText;
}

/**
 * Normalizes Turkish text for comparison by removing diacritics, case differences, and special characters
 */
export function normalizeTR(str: string): string {
  if (!str) return '';
  return str
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .toLocaleUpperCase('tr-TR')
    .replace(/[İIıi]/g, 'I')
    .replace(/[Şş]/g, 'S')
    .replace(/[Ğğ]/g, 'G')
    .replace(/[Üü]/g, 'U')
    .replace(/[Öö]/g, 'O')
    .replace(/[Çç]/g, 'C')
    .replace(/[^A-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts money amounts from a line or subsequent lines, smartly skipping percentage (%10) or quantities (15 Ad.)
 */
function extractMoneyAmount(line: string, nextLine?: string): number {
  const getCandidates = (l: string) => {
    if (!l) return [];
    // Match any positive/negative number with optional decimals
    const matches: { val: number; raw: string; idx: number }[] = [];
    const reg = /(-?[0-9]+(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|-?[0-9]+)/g;
    let m: RegExpExecArray | null;
    while ((m = reg.exec(l)) !== null) {
      const raw = m[1];
      const idx = m.index;
      const val = Math.abs(parseTRNumber(raw));
      if (val > 0) {
        // Check if preceded by %
        const before = l.substring(Math.max(0, idx - 5), idx).trim();
        const after = l.substring(idx + raw.length, idx + raw.length + 8).trim();
        const isPercent = before.includes('%') || after.startsWith('%');
        const isQty = /^(?:AD|AD\.|PORS|PORS\.|SAYFA|NO)/i.test(after);
        if (!isPercent && !isQty) {
          matches.push({ val, raw, idx });
        }
      }
    }
    return matches;
  };

  const currCandidates = getCandidates(line);
  if (currCandidates.length > 0) {
    // Look for candidate having decimals or highest index (usually at the end of line)
    const withDecimals = currCandidates.filter((c) => c.raw.includes(',') || (c.raw.includes('.') && c.val > 10));
    if (withDecimals.length > 0) {
      return withDecimals[withDecimals.length - 1].val;
    }
    return currCandidates[currCandidates.length - 1].val;
  }

  if (nextLine) {
    const nextCandidates = getCandidates(nextLine);
    if (nextCandidates.length > 0) {
      return nextCandidates[nextCandidates.length - 1].val;
    }
  }

  return 0;
}

/**
 * Accurately parses a product line by separating product name from numeric data columns.
 * Protects volume/unit specifications (e.g. 50 CL, 70 CL, 330 ML, 1.5 LT, 500 GR, 35'LIK, NO: 2)
 * from being mistaken as table columns (quantity, unit price, or total price).
 */
export function extractProductFromLine(line: string): SoldProductItem | null {
  if (!line) return null;
  const cleanLine = line.trim();
  if (cleanLine.length < 3) return null;

  // Skip header rows or report meta lines
  const norm = normalizeTR(cleanLine);
  if (
    norm.includes('URUN ADI') ||
    norm.includes('MIKTAR') ||
    norm.includes('TUTAR') ||
    norm.includes('FIYAT') ||
    norm.includes('SAYFA') ||
    norm.includes('TARIH') ||
    norm.includes('RAPORU') ||
    norm.includes('GENEL KASA') ||
    norm.includes('ISKONTO') ||
    norm.includes('SKONTO') ||
    norm.includes('INDIRIM') ||
    norm.includes('ACIK HESAP') ||
    norm.includes('ACIKHESAP') ||
    norm.includes('CARI HESAP') ||
    norm.includes('CARI SATIS') ||
    norm.includes('VERESIYE') ||
    norm.includes('KREDI KARTI') ||
    norm.includes('K KARTI') ||
    norm.includes('NAKIT SATIS')
  ) {
    return null;
  }

  // Remove trailing currency tokens like "TL", "TL.", "₺"
  const strippedLine = cleanLine.replace(/\s*(?:TL\.?|₺)\s*$/i, '').trim();

  // Find all number tokens with their boundaries
  interface NumToken {
    val: number;
    raw: string;
    startIndex: number;
    endIndex: number;
    isSpec: boolean; // Is it part of product specification (e.g. 50CL, 70CL, 330ML, etc.)
  }

  const numTokens: NumToken[] = [];
  const numRegex = /([0-9]+(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[0-9]+)/g;
  let m: RegExpExecArray | null;

  while ((m = numRegex.exec(strippedLine)) !== null) {
    const raw = m[1];
    const startIndex = m.index;
    const endIndex = startIndex + raw.length;
    const val = parseTRNumber(raw);

    // Look at text immediately before and after this number token
    const afterText = strippedLine.substring(endIndex, endIndex + 18).trimStart();
    const beforeText = strippedLine.substring(Math.max(0, startIndex - 12), startIndex).trimEnd();

    // Check if this number is a volume, weight, dimension, year, or code specifier in the product name
    const isVolumeOrWeightUnit = /^(?:CL|ML|LT|LITRE|LİTRE|GR|GRAM|KG|CC|LIK|'LIK|’LIK|’LİK|'LİK|LİK|YIL|YILLIK|YILLIK|YAŞ|YAS|DERECE|VOL|%|CL\.|ML\.|LT\.|KG\.|GR\.)(?:\b|\s|$)/i.test(afterText);
    const isPrecededByCode = /(?:NO|NO:|NO\.|#|KOD|KOD:|KOD\.|PASTA|MENÜ|MENU|PAKET|SERİ|SERI)$/i.test(beforeText);
    const isPortionFraction = /^(?:PORSIYON|PORS|PORS\.|DUBLE|TEK|SHOT|DILIM|DİLİM|ŞİŞE|SISE|KADEH|BARDAK|KUTU)(?:\b|\s|$)/i.test(afterText) && (val === 0.5 || val === 1.5 || val === 1 || val === 2);

    const isSpec = isVolumeOrWeightUnit || isPrecededByCode || (isPortionFraction && startIndex < strippedLine.length / 2);

    numTokens.push({
      val,
      raw,
      startIndex,
      endIndex,
      isSpec,
    });
  }

  if (numTokens.length === 0) return null;

  // Filter candidate data columns (non-spec numbers)
  const dataColumns = numTokens.filter((t) => !t.isSpec);
  if (dataColumns.length === 0) return null;

  let chosenQty = 1;
  let chosenUnitPrice = 0;
  let chosenTotalPrice = 0;
  let nameEndIndex = dataColumns[0].startIndex;

  if (dataColumns.length >= 3) {
    // Check if last 3 numbers are: [Qty, UnitPrice, TotalPrice]
    const cQty = dataColumns[dataColumns.length - 3];
    const cUnit = dataColumns[dataColumns.length - 2];
    const cTotal = dataColumns[dataColumns.length - 1];

    // Mathematical check: qty * unitPrice ≈ totalPrice
    const calculated = cQty.val * cUnit.val;
    const isMathConsistent = Math.abs(calculated - cTotal.val) < Math.max(1.5, cTotal.val * 0.06);

    if (isMathConsistent && cTotal.val > 0) {
      chosenQty = cQty.val > 0 ? cQty.val : 1;
      chosenUnitPrice = cUnit.val;
      chosenTotalPrice = cTotal.val;
      nameEndIndex = cQty.startIndex;
    } else {
      // Check if the last 2 numbers are [Qty, TotalPrice]
      if (cTotal.val > 0 && cUnit.val > 0 && cUnit.val < cTotal.val && cUnit.val <= 500) {
        chosenQty = cUnit.val;
        chosenTotalPrice = cTotal.val;
        chosenUnitPrice = Math.round((chosenTotalPrice / chosenQty) * 100) / 100;
        nameEndIndex = cUnit.startIndex;
      } else {
        chosenQty = cQty.val > 0 ? cQty.val : 1;
        chosenUnitPrice = cUnit.val > 0 ? cUnit.val : Math.round((cTotal.val / chosenQty) * 100) / 100;
        chosenTotalPrice = cTotal.val > 0 ? cTotal.val : Math.round((chosenQty * chosenUnitPrice) * 100) / 100;
        nameEndIndex = cQty.startIndex;
      }
    }
  } else if (dataColumns.length === 2) {
    const c1 = dataColumns[0];
    const c2 = dataColumns[1];

    if (c2.val >= c1.val && c1.val > 0) {
      // c1 is Qty, c2 is TotalPrice
      chosenQty = c1.val;
      chosenTotalPrice = c2.val;
      chosenUnitPrice = Math.round((chosenTotalPrice / chosenQty) * 100) / 100;
      nameEndIndex = c1.startIndex;
    } else {
      // c1 is TotalPrice or UnitPrice, c2 is TotalPrice
      chosenQty = 1;
      chosenTotalPrice = c2.val > 0 ? c2.val : c1.val;
      chosenUnitPrice = chosenTotalPrice;
      nameEndIndex = c1.startIndex;
    }
  } else if (dataColumns.length === 1) {
    chosenQty = 1;
    chosenTotalPrice = dataColumns[0].val;
    chosenUnitPrice = chosenTotalPrice;
    nameEndIndex = dataColumns[0].startIndex;
  }

  // Extract raw product name up to nameEndIndex
  let prodName = strippedLine.substring(0, nameEndIndex).trim();
  prodName = prodName.replace(/^[.*•#_—–-]+\s*/, '').replace(/[\s\t]+/g, ' ').trim();

  // Validate product name
  if (prodName.length < 2) return null;
  const normName = normalizeTR(prodName);
  if (
    normName.startsWith('TOPLAM') ||
    normName.startsWith('ARA TOPLAM') ||
    normName.startsWith('GRUP TOPLAMI') ||
    normName.includes('URUN TOPLAM')
  ) {
    return null;
  }

  if (chosenTotalPrice <= 0 && chosenQty <= 0) return null;

  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    name: prodName,
    quantity: chosenQty,
    unit: 'Ad.',
    unitPrice: chosenUnitPrice,
    totalPrice: chosenTotalPrice,
  };
}

/**
 * Formats a number with Turkish standard two-decimal formatting
 */
function formatTRNumber(val: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

/**
 * Checks if a string starts directly with a numeric value (including optional minus sign or currency sign)
 */
function lineStartsWithNumber(str: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  return /^[-+]?\s*₺?\s*-?[0-9]/.test(trimmed);
}

/**
 * Extracts a numeric value for a summary label.
 * - If the label line has a number, extract it from the line.
 * - If not, check next line: ONLY use next line if it is label-free and starts directly with a number.
 * - Otherwise return 0.
 * Preserves negative sign if preserveNegative is true.
 */
function extractSummaryValue(
  line: string,
  labelRegex: RegExp,
  nextLine?: string,
  preserveNegative: boolean = false
): { value: number; consumedNextLine: boolean } {
  const afterLabel = line.replace(labelRegex, '').trim();
  const numMatches = afterLabel.match(/[-+]?\s*₺?\s*[0-9]+(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[-+]?\s*₺?\s*[0-9]+/g);

  if (numMatches && numMatches.length > 0) {
    const raw = numMatches[numMatches.length - 1];
    const val = parseTRNumber(raw);
    return {
      value: preserveNegative ? val : Math.abs(val),
      consumedNextLine: false,
    };
  }

  if (nextLine && lineStartsWithNumber(nextLine)) {
    const nextMatches = nextLine.match(/[-+]?\s*₺?\s*[0-9]+(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[-+]?\s*₺?\s*[0-9]+/g);
    if (nextMatches && nextMatches.length > 0) {
      const raw = nextMatches[0];
      const val = parseTRNumber(raw);
      return {
        value: preserveNegative ? val : Math.abs(val),
        consumedNextLine: true,
      };
    }
  }

  return { value: 0, consumedNextLine: false };
}

/**
 * Detects if a line is a group subtotal line (no product name, only quantity and total amount).
 * Matches patterns like:
 *  "22 Ad. ₺2.200,00"
 *  "75,5 Ad. ₺30.905,00"
 *  "11,0000 Ad. ₺23.100,00"
 *  "Toplam : 22 Ad. 2.200,00 TL"
 */
function parseSubtotalLine(line: string): { itemCount: number; amount: number } | null {
  if (!line) return null;
  const trimmed = line.trim();

  // Pattern specified by user: ^\s*[\d.,]+\s*Ad\.?\s+₺?\s*[\d.,]+\s*(TL)?\s*$
  const subtotalRegex = /^(?:(?:GRUP\s+)?TOPLAM[Iİ]?\s*[:=-]?\s*)?([0-9]+(?:[.,][0-9]+)?)\s*(?:Ad\.?|Adet|Pors\.?|Porsiyon)\s+₺?\s*([0-9]+(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[0-9]+)\s*(?:TL)?$/i;

  const m = trimmed.match(subtotalRegex);
  if (m) {
    const qty = parseTRNumber(m[1]);
    const amt = parseTRNumber(m[2]);
    return { itemCount: qty, amount: amt };
  }

  // Also check if line consists strictly of [qty] [Ad/Ad.] [currency/amount] without product words
  const tokens = trimmed.replace(/[₺TL:]/gi, ' ').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 3 && /^(?:Ad|Ad\.)$/i.test(tokens[1])) {
    const qty = parseTRNumber(tokens[0]);
    const amt = parseTRNumber(tokens[2]);
    if (qty > 0 && amt > 0) {
      return { itemCount: qty, amount: amt };
    }
  }

  return null;
}

/**
 * Checks if a normalized line is an özet satırı (Summary line) or table/report header
 */
function isSummaryOrMetaLine(normLine: string): boolean {
  if (!normLine || normLine.length < 2) return true;

  if (
    normLine.includes('URUN GRUBU BAZLI') ||
    normLine.includes('SATIS RAPORU') ||
    normLine.includes('GRUP RAPORU') ||
    normLine.includes('URUN ADI') ||
    normLine.includes('MIKTAR') ||
    normLine.includes('FIYAT') ||
    normLine.includes('TUTAR') ||
    normLine.startsWith('SAYFA') ||
    normLine.startsWith('TARIH')
  ) {
    return true;
  }

  if (
    normLine.includes('URUN TOPLAM') ||
    normLine.includes('BRUT SATIS') ||
    normLine.includes('BRUT TOPLAM') ||
    normLine.includes('TOPLAM URUN') ||
    normLine.includes('TOPLAM MATRAH') ||
    normLine.includes('ISKONTO') ||
    normLine.includes('SKONTO') ||
    normLine.includes('INDIRIM') ||
    normLine.includes('ACIK HESAP') ||
    normLine.includes('ACIKHESAP') ||
    normLine.includes('CARI HESAP') ||
    normLine.includes('CARI SATIS') ||
    normLine.includes('CARI TOPLAM') ||
    normLine.includes('ACIK ADISYON') ||
    normLine.includes('ACIK OLAN MASALAR') ||
    normLine.includes('ACIK MASALAR') ||
    normLine.includes('KASA GELIR GIDER') ||
    normLine.includes('GENEL KASA') ||
    normLine.includes('KASA TOPLAMI') ||
    normLine.includes('NET SATIS') ||
    normLine.includes('NET CIRO') ||
    normLine.includes('GENEL TOPLAM') ||
    normLine.includes('KREDI KARTI') ||
    normLine.includes('K KARTI') ||
    normLine.includes('POS TOPLAM') ||
    normLine.includes('NAKIT SATIS') ||
    normLine.includes('NAKIT HASILAT')
  ) {
    return true;
  }

  return false;
}

/**
 * Smart Regex & Multi-line Parser for Restaurant & Vega Group Reports
 */
export function parseReportText(rawText: string): ParsedPdfReport {
  const lines = rawText.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);

  let grossProductSales = 0;
  let discountAmount = 0;
  let openAccountTotal = 0;
  let openAccountDiscount = 0;
  let openTablesTotal = 0;
  let kasaGelirGiderTotal = 0;
  let netGeneralTotal = 0;
  let totalSales = 0;
  let cashSales = 0;
  let creditCardSales = 0;
  let otherSales = 0;
  let complimentaryAmount = 0;
  let cancelledAmount = 0;
  let tableCount = 0;
  let guestCount = 0;
  let detectedDate: string | undefined = undefined;

  // Date detector (e.g. 14.08.2026 or 2026-08-14 or 14/08/2026)
  const dateMatch = rawText.match(/(\d{2})[./-](\d{2})[./-](\d{4})/);
  if (dateMatch) {
    const day = dateMatch[1];
    const month = dateMatch[2];
    const year = dateMatch[3];
    detectedDate = `${year}-${month}-${day}`;
  }

  // Canonical Category Definitions
  const categoryDefinitions: { key: string; name: string; aliases: string[] }[] = [
    {
      key: 'alkol',
      name: 'ALKOLLÜ İÇECEK',
      aliases: [
        'ALKOLLU ICECEK', 'ALKOLLÜ İÇECEK', 'ALKOLLU ICECEKLER', 'ALKOLLÜ İÇECEKLER',
        'ALKOL GRUBU', 'ALKOL SATISLARI', 'ALKOLLU ICECEK GRUBU', 'ALKOLLÜ İÇECEK GRUBU',
        'ALKOL', 'ALKOLLU', 'ALKOLLÜ',
      ],
    },
    {
      key: 'ana_yemek',
      name: 'ANA YEMEK',
      aliases: [
        'ANA YEMEK', 'ANA YEMEKLER', 'ANA YEMEK GRUBU', 'ET YEMEKLERI', 'ET YEMEKLERİ',
        'TAVUK YEMEKLERI', 'TAVUK YEMEKLERİ', 'BALIK VE DENIZ URUNLERI', 'BALIKLAR',
      ],
    },
    {
      key: 'ara_sicak',
      name: 'ARA SICAKLAR',
      aliases: ['ARA SICAK', 'ARA SICAKLAR', 'ARASICAK', 'ARASICAKLAR', 'ARA SICAK GRUBU'],
    },
    {
      key: 'baslangic',
      name: 'BAŞLANGIÇ',
      aliases: [
        'BASLANGIC', 'BAŞLANGIÇ', 'BASLANGICLAR', 'BAŞLANGIÇLAR',
        'MEZELER', 'SOGUK MEZELER', 'SOĞUK MEZELER', 'SICAK MEZELER', 'MEZE GRUBU',
      ],
    },
    {
      key: 'hamur_isi',
      name: 'HAMUR İŞİ',
      aliases: ['HAMUR ISI', 'HAMUR İŞİ', 'PIDE VE LAHMACUN', 'PİDE VE LAHMACUN', 'PIDELER', 'PİDELER', 'MAKARNALAR', 'PIZZALAR'],
    },
    {
      key: 'izgara_kebap',
      name: 'IZGARA & KEBAP',
      aliases: ['IZGARA', 'IZGARALAR', 'KEBAP', 'KEBAPLAR', 'DONER', 'DÖNER', 'KÖFTE', 'KÖFTELER', 'IZGARA VE KEBAPLAR'],
    },
    {
      key: 'salata',
      name: 'SALATA',
      aliases: ['SALATA', 'SALATALAR', 'SALATA GRUBU'],
    },
    {
      key: 'soguk_icecek',
      name: 'SOĞUK İÇECEK',
      aliases: [
        'SOGUK ICECEK', 'SOĞUK İÇECEK', 'SOGUK ICECEKLER', 'SOĞUK İÇECEKLER',
        'MESRUBAT', 'MEŞRUBAT', 'MESRUBATLAR', 'MEŞRUBATLAR', 'SOGUK ICECEK GRUBU', 'SOĞUK İÇECEK GRUBU'
      ],
    },
    {
      key: 'sicak_icecek',
      name: 'SICAK İÇECEK',
      aliases: [
        'SICAK ICECEK', 'SICAK İÇECEK', 'SICAK ICECEKLER', 'SICAK İÇECEKLER',
        'KAHVELER', 'CAYLAR', 'ÇAYLAR', 'SICAK ICECEK GRUBU', 'SICAK İÇECEK GRUBU'
      ],
    },
    {
      key: 'tatli',
      name: 'TATLI',
      aliases: ['TATLI', 'TATLILAR', 'TATLI VE DONDURMA', 'DONDURMALAR', 'TATLI GRUBU'],
    },
    {
      key: 'kahvalti',
      name: 'KAHVALTI',
      aliases: ['KAHVALTI', 'KAHVALTILIKLAR', 'SERPME KAHVALTI', 'KAHVALTI GRUBU'],
    },
    {
      key: 'tek_urun',
      name: 'TEK ÜRÜN',
      aliases: ['TEK URUN', 'TEK ÜRÜN', 'TEK URUNLER', 'TEK ÜRÜNLER', 'DIGER', 'DİĞER'],
    },
    {
      key: 'kasa',
      name: 'KASA',
      aliases: ['KASA'],
    },
  ];

  // Helper to test if a line matches a known canonical category definition
  const checkCategoryMatch = (normL: string): string | null => {
    const cleanNorm = normL
      .replace(/^[0-9]+[\s.-]+/, '')
      .replace(/[*#=_-]+/g, '')
      .replace(/\b(GRUBU|GRUP|RAPORU|LISTESI)\b/g, '')
      .trim();

    if (!cleanNorm || cleanNorm.length < 2) return null;

    for (const def of categoryDefinitions) {
      for (const alias of def.aliases) {
        const normAlias = normalizeTR(alias);
        if (
          cleanNorm === normAlias ||
          cleanNorm.startsWith(normAlias + ' GRUBU') ||
          cleanNorm.endsWith(' ' + normAlias) ||
          cleanNorm === normAlias + 'S' ||
          cleanNorm === normAlias + 'LER' ||
          cleanNorm === normAlias + 'LAR'
        ) {
          return def.name;
        }
      }
    }
    return null;
  };

  // Helper to format a category name cleanly: uses canonical name if known, else preserves as is
  const formatCategoryName = (rawLine: string): string => {
    const clean = rawLine.replace(/^[0-9]+[\s.-]+/, '').replace(/[*#=_-]+/g, '').trim();
    const matched = checkCategoryMatch(normalizeTR(clean));
    return matched || clean;
  };

  const groups: ExtractedGroupItem[] = [];
  let currentGroup: ExtractedGroupItem | null = null;

  // Helper to commit current group and compute its subtotal if items exist
  const commitCurrentGroup = () => {
    if (currentGroup) {
      if (currentGroup.items && currentGroup.items.length > 0) {
        const sumItemsAmount = currentGroup.items.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
        const sumItemsCount = currentGroup.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
        if (currentGroup.amount <= 0 && sumItemsAmount > 0) {
          currentGroup.amount = Math.round(sumItemsAmount * 100) / 100;
        }
        if ((currentGroup.itemCount === undefined || currentGroup.itemCount <= 0) && sumItemsCount > 0) {
          currentGroup.itemCount = sumItemsCount;
        }
      }

      if (currentGroup.amount > 0 || (currentGroup.items && currentGroup.items.length > 0)) {
        if (!groups.some((g) => g.id === currentGroup?.id)) {
          groups.push(currentGroup);
        }
      }
      currentGroup = null;
    }
  };

  let seenReportHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normLine = normalizeTR(line);
    const nextLine = lines[i + 1];

    // Check for Report Title ("ÜRÜN GRUBU BAZLI SATIŞ RAPORU")
    if (
      normLine.includes('URUN GRUBU BAZLI SATIS RAPORU') ||
      normLine.includes('URUN GRUBU BAZLI') ||
      normLine.includes('GRUP BAZLI SATIS RAPORU') ||
      normLine.includes('URUN GRUBU SATIS RAPORU')
    ) {
      seenReportHeader = true;
      continue;
    }

    // Skip table column headers or page number lines
    if (
      normLine.includes('URUN ADI') ||
      normLine.includes('MIKTAR') ||
      normLine.includes('FIYAT') ||
      normLine.includes('TUTAR') ||
      normLine.startsWith('SAYFA') ||
      normLine.startsWith('TARIH')
    ) {
      seenReportHeader = true;
      continue;
    }

    // 1. Group Subtotal Line Check (e.g. "22 Ad. ₺2.200,00", "75,5 Ad. ₺30.905,00")
    const subtotal = parseSubtotalLine(line);
    if (subtotal) {
      if (currentGroup) {
        currentGroup.amount = subtotal.amount;
        currentGroup.itemCount = subtotal.itemCount;
        commitCurrentGroup();
      }
      continue;
    }

    // 2. Report Summary Blocks (Özet Satırları)

    // Açık Hesap İskonto Toplamı (Separate field, do NOT count as Toplam İskonto)
    if (normLine.includes('ACIK HESAP ISKONTO') || normLine.includes('ACIK HESAP INDIRIM')) {
      commitCurrentGroup();
      const res = extractSummaryValue(line, /A[ÇC][Iİ]K\s+HESAP\s+[Iİ]SKONTO(?:\s*TOPLAM[Iİ]?)?/i, nextLine);
      openAccountDiscount = res.value;
      if (res.consumedNextLine) i++;
      continue;
    }

    // Kasa Gelir Gider Toplamı (Preserves negative sign, do NOT mix with discount)
    if (normLine.includes('KASA GELIR GIDER') || normLine.includes('GELIR GIDER TOPLAM')) {
      commitCurrentGroup();
      const res = extractSummaryValue(line, /KASA\s+GEL[Iİ]R\s+G[Iİ]DER(?:\s*TOPLAM[Iİ]?)?/i, nextLine, true);
      kasaGelirGiderTotal = res.value;
      if (res.consumedNextLine) i++;
      continue;
    }

    // Toplam İskonto (Standard discount)
    if (
      (normLine.includes('TOPLAM ISKONTO') || normLine.includes('ISKONTO') || normLine.includes('INDIRIM')) &&
      !normLine.includes('ACIK HESAP')
    ) {
      commitCurrentGroup();
      const res = extractSummaryValue(line, /(?:TOPLAM\s+)?(?:[Iİ]SKONTO|[Iİ]ND[Iİ]R[Iİ]M)(?:\s*(?:TOPLAM[Iİ]?|TUTAR[Iİ]?))?/i, nextLine);
      if (res.value > 0 || discountAmount <= 0) {
        discountAmount = res.value;
      }
      if (res.consumedNextLine) i++;
      continue;
    }

    // Ürün Toplam Satış (Gross product sales)
    if (
      normLine.includes('URUN TOPLAM SATIS') ||
      normLine.includes('URUN TOPLAM') ||
      normLine.includes('URUN SATIS TOPLAM') ||
      normLine.includes('BRUT SATIS') ||
      normLine.includes('BRUT TOPLAM') ||
      normLine.includes('TOPLAM URUN') ||
      normLine.includes('TOPLAM MATRAH')
    ) {
      commitCurrentGroup();
      const res = extractSummaryValue(line, /(?:[ÜU]R[ÜU]N\s+TOPLAM(?:\s*SATI[ŞS])?|BR[ÜU]T\s+SATI[ŞS]|TOPLAM\s+[ÜU]R[ÜU]N)/i, nextLine);
      if (res.value > 0) grossProductSales = res.value;
      if (res.consumedNextLine) i++;
      continue;
    }

    // Açık Hesap Toplamı (Cari)
    if (
      !normLine.includes('ISKONTO') &&
      (normLine.includes('ACIK HESAP') ||
       normLine.includes('ACIKHESAP') ||
       normLine.includes('CARI HESAP') ||
       normLine.includes('CARI SATIS') ||
       normLine.includes('CARI TOPLAM') ||
       normLine.includes('VERESIYE'))
    ) {
      commitCurrentGroup();
      const res = extractSummaryValue(line, /(?:A[ÇC][Iİ]K\s*HESAP|CAR[Iİ]\s*HESAP|CAR[Iİ]\s*SATI[ŞS])(?:\s*TOPLAM[Iİ]?)?/i, nextLine);
      if (res.value > 0 || openAccountTotal <= 0) openAccountTotal = res.value;
      if (res.consumedNextLine) i++;
      continue;
    }

    // Şuan Açık Olan Masalar
    if (normLine.includes('ACIK OLAN MASALAR') || normLine.includes('ACIK MASALAR') || normLine.includes('ACIK MASA')) {
      commitCurrentGroup();
      const res = extractSummaryValue(line, /A[ÇC][Iİ]K\s+(?:OLAN\s+)?MASALAR?/i, nextLine);
      if (res.value > 0) openTablesTotal = res.value;
      if (res.consumedNextLine) i++;
      continue;
    }

    // Genel Kasa Toplamı (Net total sales)
    if (
      normLine.includes('GENEL KASA TOPLAMI') ||
      normLine.includes('GENEL KASA') ||
      normLine.includes('NET SATIS') ||
      normLine.includes('NET CIRO') ||
      normLine.includes('GENEL TOPLAM') ||
      (normLine.includes('KASA TOPLAMI') && !normLine.includes('GELIR GIDER'))
    ) {
      commitCurrentGroup();
      const res = extractSummaryValue(line, /(?:GENEL\s+KASA(?:\s*TOPLAM[Iİ]?)?|NET\s+SATI[ŞS]|GENEL\s+TOPLAM)/i, nextLine);
      if (res.value > 0) netGeneralTotal = res.value;
      if (res.consumedNextLine) i++;
      continue;
    }

    // Kredi Kartı
    if (
      normLine.includes('KREDI KARTI') ||
      normLine.includes('K KARTI') ||
      normLine.includes('POS TOPLAM') ||
      normLine.includes('KARTLI SATIS') ||
      normLine.includes('BANKA KARTI') ||
      normLine.includes('KART TAHSILAT')
    ) {
      commitCurrentGroup();
      const res = extractSummaryValue(line, /(?:KRED[Iİ]\s*KART[Iİ]|K\.?\s*KART[Iİ]|POS\s*TOPLAM)/i, nextLine);
      if (res.value > 0) creditCardSales = res.value;
      if (res.consumedNextLine) i++;
      continue;
    }

    // Nakit Satış
    if (
      normLine.includes('NAKIT SATIS') ||
      normLine.includes('NAKIT HASILAT') ||
      normLine.includes('NAKIT TAHSILAT') ||
      normLine.includes('PESIN') ||
      normLine === 'NAKIT'
    ) {
      commitCurrentGroup();
      const res = extractSummaryValue(line, /(?:NAK[Iİ]T\s*(?:SATI[ŞS]|HAS[Iİ]LAT)?|PE[ŞS][Iİ]N)/i, nextLine);
      if (res.value > 0) cashSales = res.value;
      if (res.consumedNextLine) i++;
      continue;
    }

    // 3. Before Report Header: skip restaurant headers/metadata unless a known category begins
    if (!seenReportHeader) {
      const isKnown = checkCategoryMatch(normLine);
      if (isKnown) {
        seenReportHeader = true;
      } else {
        continue;
      }
    }

    // 4. Product Row Item Check
    const prodItem = extractProductFromLine(line);
    if (prodItem) {
      if (!currentGroup) {
        currentGroup = {
          id: `pdf-cat-${Date.now()}-${groups.length}`,
          name: 'DİĞER',
          amount: 0,
          itemCount: 0,
          items: [],
        };
      }
      if (!currentGroup.items) currentGroup.items = [];
      currentGroup.items.push(prodItem);
      continue;
    }

    // 5. New Group Header Check
    // If not a product row, not a subtotal line, and not an özet/meta line:
    // This line is a NEW GROUP HEADER (even if not in categoryDefinitions)!
    if (!isSummaryOrMetaLine(normLine) && line.length >= 2) {
      commitCurrentGroup();
      const groupName = formatCategoryName(line);
      currentGroup = {
        id: `pdf-cat-${Date.now()}-${groups.length}`,
        name: groupName,
        amount: 0,
        itemCount: 0,
        items: [],
      };
      continue;
    }
  }

  // Commit any remaining open group
  commitCurrentGroup();

  // If no groups detected with categories, attempt secondary scan for standalone product blocks
  if (groups.length === 0) {
    const fallbackGroup: ExtractedGroupItem = {
      id: `cat-fallback-${Date.now()}`,
      name: 'Satılan Ürünler',
      amount: 0,
      itemCount: 0,
      items: [],
    };

    lines.forEach((line) => {
      const prodItem = extractProductFromLine(line);
      if (prodItem) {
        fallbackGroup.items?.push(prodItem);
      }
    });

    if (fallbackGroup.items && fallbackGroup.items.length > 0) {
      fallbackGroup.amount = fallbackGroup.items.reduce((s, it) => s + it.totalPrice, 0);
      fallbackGroup.itemCount = fallbackGroup.items.reduce((s, it) => s + it.quantity, 0);
      groups.push(fallbackGroup);
    }
  }

  // Ensure each group amount and item count is mathematically accurate
  groups.forEach((g) => {
    if (g.items && g.items.length > 0) {
      const sumAmt = g.items.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
      const sumQty = g.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
      if (g.amount <= 0 && sumAmt > 0) {
        g.amount = Math.round(sumAmt * 100) / 100;
      }
      if (!g.itemCount || g.itemCount <= 0) {
        g.itemCount = sumQty;
      }
    }
  });

  // Clean up any groups that might actually be summary rows
  const sanitizedGroups: ExtractedGroupItem[] = [];
  for (const g of groups) {
    const gNorm = normalizeTR(g.name);
    if (gNorm.includes('ISKONTO') || gNorm.includes('SKONTO') || gNorm.includes('INDIRIM')) {
      if (discountAmount <= 0 && g.amount > 0) {
        discountAmount = g.amount;
      }
      continue;
    }
    if (gNorm.includes('ACIK HESAP') || gNorm.includes('ACIKHESAP') || gNorm === 'CARI TOPLAM') {
      if (openAccountTotal <= 0 && g.amount > 0) {
        openAccountTotal = g.amount;
      }
      continue;
    }
    if (gNorm.includes('KASA GELIR GIDER') || gNorm.includes('GENEL KASA')) {
      continue;
    }

    sanitizedGroups.push(g);
  }

  // 3. DOĞRULAMA & KONTROLLER (VALIDATION)
  const validationWarnings: string[] = [];

  const groupsSum = Math.round(sanitizedGroups.reduce((acc, g) => acc + (Number(g.amount) || 0), 0) * 100) / 100;

  // If gross product sales was not detected directly from summary, infer from sum of groups
  if (grossProductSales <= 0 && groupsSum > 0) {
    grossProductSales = groupsSum;
  }

  // Kontrol 1: Tüm grup tutarlarının toplamı "Ürün Toplam Satış" ile aynı mı?
  // Değilse uyarı göster: "Grup toplamı X, rapordaki Ürün Toplam Satış Y, fark Z".
  if (grossProductSales > 0) {
    const diffGroups = Math.round(Math.abs(groupsSum - grossProductSales) * 100) / 100;
    if (diffGroups > 0.05) {
      const warnMsg = `Grup toplamı ${formatTRNumber(groupsSum)}, rapordaki Ürün Toplam Satış ${formatTRNumber(grossProductSales)}, fark ${formatTRNumber(diffGroups)}`;
      validationWarnings.push(warnMsg);
      console.warn(`[Vega Rapor Doğrulama]: ${warnMsg}`);
    }
  }

  // Kontrol 2: Ürün Toplam Satış - İskonto - Açık Hesap Toplamı = Genel Kasa Toplamı mı?
  // Tutmuyorsa iskontoyu bu formülden hesapla (Ürün Toplam Satış - Genel Kasa - Açık Hesap) ve uyarı göster.
  if (grossProductSales > 0 && netGeneralTotal > 0) {
    const expectedGenelKasa = Math.round((grossProductSales - discountAmount - openAccountTotal) * 100) / 100;
    const diffKasa = Math.round(Math.abs(expectedGenelKasa - netGeneralTotal) * 100) / 100;
    if (diffKasa > 0.05) {
      const calculatedDiscount = Math.round((grossProductSales - netGeneralTotal - openAccountTotal) * 100) / 100;
      const warnMsg = `Ürün Toplam Satış (${formatTRNumber(grossProductSales)}) - İskonto (${formatTRNumber(discountAmount)}) - Açık Hesap (${formatTRNumber(openAccountTotal)}) = ${formatTRNumber(expectedGenelKasa)}, Genel Kasa (${formatTRNumber(netGeneralTotal)}) ile tutmuyor. İskonto ${formatTRNumber(calculatedDiscount)} olarak hesaplandı.`;
      validationWarnings.push(warnMsg);
      console.warn(`[Vega Rapor Doğrulama]: ${warnMsg}`);
      if (calculatedDiscount >= 0) {
        discountAmount = calculatedDiscount;
      }
    }
  } else if (netGeneralTotal <= 0 && grossProductSales > 0) {
    netGeneralTotal = Math.max(0, Math.round((grossProductSales - discountAmount - openAccountTotal) * 100) / 100);
  }

  // Net total sales for the day
  totalSales = netGeneralTotal > 0 ? netGeneralTotal : (grossProductSales > 0 ? grossProductSales : groupsSum);

  // Calculate percentages for groups based on gross or total sales
  const baseForPct = grossProductSales > 0 ? grossProductSales : (groupsSum > 0 ? groupsSum : 1);
  sanitizedGroups.forEach((g) => {
    g.percentage = Math.round(((Number(g.amount) || 0) / baseForPct) * 1000) / 10;
  });

  // Extract credit card or cash if present in raw text
  const ccRegex = /(?:KREDİ\s*KARTI|K\.KARTI|KARTLI\s*SATIŞ|POS\s*SATIŞ|BANKA\s*KARTI|KART\s*TAHSİLAT)[\s:]*([0-9.,]+)/i;
  const mCC = rawText.match(ccRegex);
  if (mCC) creditCardSales = parseTRNumber(mCC[1]);

  const cashRegex = /(?:NAKİT\s*(?:SATIŞ|HASILAT|ÖDEME|TAHSİLAT)?|PEŞİN)[\s:]*([0-9.,]+)/i;
  const mCash = rawText.match(cashRegex);
  if (mCash) cashSales = parseTRNumber(mCash[1]);

  otherSales = openAccountTotal;

  // If cash is not explicitly stated, calculate Net Total - CC - Other
  if (cashSales <= 0 && totalSales > 0 && creditCardSales > 0) {
    cashSales = Math.max(0, totalSales - creditCardSales - otherSales);
  } else if (cashSales <= 0 && totalSales > 0 && creditCardSales <= 0) {
    cashSales = totalSales;
  }

  return {
    rawText,
    totalSales,
    grossProductSales,
    cashSales,
    creditCardSales,
    otherSales,
    discountAmount,
    discountTotal: discountAmount,
    openAccountTotal,
    openAccountDiscount,
    openTablesTotal,
    kasaGelirGiderTotal,
    netGeneralTotal,
    complimentaryAmount,
    cancelledAmount,
    groups: sanitizedGroups,
    detectedDate,
    tableCount,
    guestCount,
    validationWarnings,
  };
}

