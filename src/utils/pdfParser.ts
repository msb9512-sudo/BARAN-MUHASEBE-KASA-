import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker for Vite environment
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
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
 * Smart Regex & Multi-line Parser for Restaurant & Vega Group Reports
 */
export function parseReportText(rawText: string): ParsedPdfReport {
  const lines = rawText.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);

  let grossProductSales = 0;
  let discountAmount = 0;
  let openAccountTotal = 0;
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
      aliases: ['KASA', 'KASA GELIR GIDER'],
    },
  ];

  const groups: ExtractedGroupItem[] = [];
  let currentGroup: ExtractedGroupItem | null = null;

  // Helper to test if a line is a Category Header
  const checkCategoryMatch = (normL: string): string | null => {
    // Remove group/report suffixes or numbers
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

  // Helper to commit current group and compute its subtotal if items exist
  const commitCurrentGroup = () => {
    if (currentGroup) {
      if (currentGroup.items && currentGroup.items.length > 0) {
        const sumItemsAmount = currentGroup.items.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
        const sumItemsCount = currentGroup.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
        if (currentGroup.amount <= 0 || sumItemsAmount > 0) {
          currentGroup.amount = Math.round(sumItemsAmount * 100) / 100;
        }
        if (currentGroup.itemCount === undefined || currentGroup.itemCount <= 0 || sumItemsCount > 0) {
          currentGroup.itemCount = sumItemsCount;
        }
      }

      if (!groups.some((g) => g.id === currentGroup?.id)) {
        groups.push(currentGroup);
      }
      currentGroup = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normLine = normalizeTR(line);

    // 1. Report Summary Blocks (Gross, Discount, Open Accounts, Net, Cash, Card)
    if (
      normLine.includes('URUN TOPLAM SATIS') ||
      normLine.includes('URUN TOPLAM') ||
      normLine.includes('URUN SATIS TOPLAM') ||
      normLine.includes('BRUT SATIS') ||
      normLine.includes('BRUT TOPLAM') ||
      normLine.includes('TOPLAM URUN') ||
      normLine.includes('TOPLAM MATRAH')
    ) {
      const amt = extractMoneyAmount(line, lines[i + 1]);
      if (amt > 0) grossProductSales = amt;
      continue;
    }

    if (
      normLine.includes('ISKONTO') ||
      normLine.includes('SKONTO') ||
      normLine.includes('INDIRIM') ||
      normLine.includes('YAPILAN ISKONTO') ||
      normLine.includes('TOPLAM ISKONTO') ||
      normLine.includes('ISKONTO TUTARI') ||
      normLine.includes('ISKONTO TOPLAMI') ||
      normLine.includes('INDIRIM TOPLAMI') ||
      normLine.includes('INDIRIM TUTARI')
    ) {
      const amt = extractMoneyAmount(line, lines[i + 1]);
      if (amt > 0) discountAmount = amt;
      continue;
    }

    if (
      normLine.includes('ACIK HESAP') ||
      normLine.includes('ACIKHESAP') ||
      normLine.includes('CARI HESAP') ||
      normLine.includes('CARI TOPLAM') ||
      normLine.includes('CARI SATIS') ||
      normLine.includes('CARI') ||
      normLine.includes('VERESIYE') ||
      normLine.includes('MUSTERI HESAP') ||
      normLine.includes('ACIK ADISYON')
    ) {
      const amt = extractMoneyAmount(line, lines[i + 1]);
      if (amt > 0) openAccountTotal = amt;
      continue;
    }

    if (normLine.includes('ACIK OLAN MASALAR') || normLine.includes('ACIK MASALAR') || normLine.includes('ACIK MASA')) {
      const amt = extractMoneyAmount(line, lines[i + 1]);
      if (amt > 0) openTablesTotal = amt;
      continue;
    }

    if (normLine.includes('KASA GELIR GIDER') || normLine.includes('GELIR GIDER TOPLAM')) {
      const amt = extractMoneyAmount(line, lines[i + 1]);
      if (amt > 0) kasaGelirGiderTotal = amt;
      continue;
    }

    if (
      normLine.includes('GENEL KASA TOPLAMI') ||
      normLine.includes('GENEL KASA') ||
      normLine.includes('NET SATIS') ||
      normLine.includes('NET CIRO') ||
      normLine.includes('GENEL TOPLAM') ||
      normLine.includes('KASA TOPLAMI')
    ) {
      const amt = extractMoneyAmount(line, lines[i + 1]);
      if (amt > 0) netGeneralTotal = amt;
      continue;
    }

    if (
      normLine.includes('KREDI KARTI') ||
      normLine.includes('K KARTI') ||
      normLine.includes('POS TOPLAM') ||
      normLine.includes('KARTLI SATIS') ||
      normLine.includes('BANKA KARTI') ||
      normLine.includes('KART TAHSILAT')
    ) {
      const amt = extractMoneyAmount(line, lines[i + 1]);
      if (amt > 0) creditCardSales = amt;
      continue;
    }

    if (
      normLine.includes('NAKIT SATIS') ||
      normLine.includes('NAKIT HASILAT') ||
      normLine.includes('NAKIT TAHSILAT') ||
      normLine.includes('PESIN') ||
      normLine.includes('NAKIT')
    ) {
      const amt = extractMoneyAmount(line, lines[i + 1]);
      if (amt > 0) cashSales = amt;
      continue;
    }

    // Skip generic table headers
    if (
      normLine.includes('URUN ADI') ||
      normLine.includes('MIKTAR') ||
      normLine.includes('FIYAT') ||
      normLine.includes('TUTAR') ||
      normLine.includes('SAYFA') ||
      normLine.includes('TARIH')
    ) {
      continue;
    }

    // 2. Category Subtotal Line Check (e.g. "Toplam : 30 Ad. 44.820,00 TL" or "30 Ad. 44.820,00")
    if (
      currentGroup &&
      (normLine.startsWith('TOPLAM') ||
        normLine.startsWith('ARA TOPLAM') ||
        normLine.startsWith('GRUP TOPLAMI') ||
        normLine.includes(' GRUP TOPLAMI') ||
        normLine.endsWith('TOPLAMI'))
    ) {
      const nums = line.match(/[0-9]+(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[0-9]+/g);
      if (nums && nums.length > 0) {
        const lastNum = parseTRNumber(nums[nums.length - 1]);
        const firstNum = nums.length > 1 ? parseTRNumber(nums[0]) : 0;

        currentGroup.amount = lastNum;
        if (firstNum > 0 && nums.length > 1) {
          currentGroup.itemCount = firstNum;
        }
      }
      commitCurrentGroup();
      continue;
    }

    // 3. Product Row Item Check (High priority: Check if line is a valid product before checking category header)
    const prodItem = extractProductFromLine(line);
    if (prodItem) {
      if (!currentGroup) {
        currentGroup = {
          id: `pdf-cat-${Date.now()}-${groups.length}`,
          name: 'ALKOLLÜ İÇECEK',
          amount: 0,
          itemCount: 0,
          items: [],
        };
      }
      if (!currentGroup.items) currentGroup.items = [];
      currentGroup.items.push(prodItem);
      continue;
    }

    // 4. Check Category Header match (only if not a product line)
    const matchedCategory = checkCategoryMatch(normLine);
    if (matchedCategory) {
      commitCurrentGroup();

      currentGroup = {
        id: `pdf-cat-${Date.now()}-${groups.length}`,
        name: matchedCategory,
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
      if (g.amount <= 0 || sumAmt > 0) {
        g.amount = Math.round(sumAmt * 100) / 100;
      }
      if (!g.itemCount || g.itemCount <= 0) {
        g.itemCount = sumQty;
      }
    }
  });

  // Clean up any groups or items that might actually be discount or open account summary rows
  const sanitizedGroups: ExtractedGroupItem[] = [];
  for (const g of groups) {
    const gNorm = normalizeTR(g.name);
    if (gNorm.includes('ISKONTO') || gNorm.includes('SKONTO') || gNorm.includes('INDIRIM')) {
      if (discountAmount <= 0 && g.amount > 0) {
        discountAmount = g.amount;
      }
      continue;
    }
    if (gNorm.includes('ACIK HESAP') || gNorm.includes('CARI') || gNorm.includes('VERESIYE')) {
      if (openAccountTotal <= 0 && g.amount > 0) {
        openAccountTotal = g.amount;
      }
      continue;
    }

    // Also filter individual items inside this group
    if (g.items && g.items.length > 0) {
      const validItems: SoldProductItem[] = [];
      for (const it of g.items) {
        const itNorm = normalizeTR(it.name);
        if (itNorm.includes('ISKONTO') || itNorm.includes('SKONTO') || itNorm.includes('INDIRIM')) {
          if (discountAmount <= 0 && it.totalPrice > 0) {
            discountAmount = it.totalPrice;
          }
          continue;
        }
        if (itNorm.includes('ACIK HESAP') || itNorm.includes('CARI') || itNorm.includes('VERESIYE')) {
          if (openAccountTotal <= 0 && it.totalPrice > 0) {
            openAccountTotal = it.totalPrice;
          }
          continue;
        }
        validItems.push(it);
      }
      g.items = validItems;
      if (g.items.length > 0) {
        g.amount = g.items.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
        g.itemCount = g.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
      }
    }
    sanitizedGroups.push(g);
  }

  // Secondary fallback for discount and open accounts directly from raw text if not yet found
  if (discountAmount <= 0) {
    const discRegex = /(?:TOPLAM\s*I?SKONTO|I?SKONTO\s*(?:TOPLAMI|TUTARI|TUTAR)?|TOPLAM\s*INDIRIM|INDIRIM\s*(?:TOPLAMI|TUTARI)?|YAPILAN\s*I?SKONTO|SATIR\s*I?SKONTOSU|ADISYON\s*I?SKONTOSU|TOPLAM\s*İ?SKONTO|İ?SKONTO\s*(?:TOPLAMI|TUTARI)?|TOPLAM\s*İNDİRİM|İNDİRİM\s*(?:TOPLAMI|TUTARI)?|YAPILAN\s*İ?SKONTO|I?SKONTO|INDIRIM|İ?SKONTO|İNDİRİM)[\s:.\-_=]*([0-9]+(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[0-9]+)/i;
    const mDisc = rawText.match(discRegex);
    if (mDisc) discountAmount = parseTRNumber(mDisc[1]);
  }

  if (openAccountTotal <= 0) {
    const openAccRegex = /(?:ACIK\s*HESAP(?:\s*(?:TOPLAMI|TUTARI))?|CARI\s*(?:HESAP|SATIS)?(?:\s*(?:TOPLAMI|TUTARI))?|VERESIYE(?:\s*(?:TOPLAMI|SATIS))?|ACIK\s*ADISYON(?:LAR)?|AÇIK\s*HESAP(?:\s*TOPLAMI)?|CARİ\s*HESAP(?:\s*TOPLAMI)?|VERESİYE(?:\s*TOPLAMI)?)[\s:.\-_=]*([0-9]+(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[0-9]+)/i;
    const mOpen = rawText.match(openAccRegex);
    if (mOpen) openAccountTotal = parseTRNumber(mOpen[1]);
  }

  const groupsSum = sanitizedGroups.reduce((acc, g) => acc + (Number(g.amount) || 0), 0);

  // If gross product sales was not detected directly from summary, infer from sum of groups
  if (grossProductSales <= 0 && groupsSum > 0) {
    grossProductSales = groupsSum;
  }

  // If gross and net were found, but discount was not captured by text:
  if (discountAmount <= 0 && grossProductSales > 0 && netGeneralTotal > 0 && grossProductSales > netGeneralTotal) {
    const diff = Math.round((grossProductSales - netGeneralTotal - openAccountTotal) * 100) / 100;
    if (diff > 0) {
      discountAmount = diff;
    }
  }

  // If net general total was not found, calculate: Gross - Discount - OpenAccounts
  if (netGeneralTotal <= 0 && grossProductSales > 0) {
    netGeneralTotal = Math.max(0, grossProductSales - discountAmount - openAccountTotal);
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
    openTablesTotal,
    kasaGelirGiderTotal,
    netGeneralTotal,
    complimentaryAmount,
    cancelledAmount,
    groups: sanitizedGroups,
    detectedDate,
    tableCount,
    guestCount,
  };
}

