/**
 * Turkish currency, date and number formatters for Restaurant Accounting System
 */

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0,00 ₺';
  }
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('TRY', '₺');
}

export function formatNumber(amount: number | null | undefined, decimals = 2): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0';
  }
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatDateTR(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateWithDayTR(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '%0';
  return `%${value.toFixed(1)}`;
}

/**
 * Evaluates a single number string with support for Turkish comma (,) and dot (.) decimals.
 * Examples:
 *  "150,50" -> 150.50
 *  "150.50" -> 150.50
 *  "1.250,50" -> 1250.50
 *  "1,250.50" -> 1250.50
 *  "1500" -> 1500
 */
export function parseSingleNumber(str: string): number {
  if (!str) return 0;
  let s = str.trim();
  if (!s) return 0;

  // Check if negative
  const isNegative = s.startsWith('-');
  if (isNegative) {
    s = s.substring(1).trim();
  }

  // If contains both dot and comma
  if (s.includes('.') && s.includes(',')) {
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    if (lastDot < lastComma) {
      // 1.250,50 -> dot is thousands, comma is decimal
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,250.50 -> comma is thousands, dot is decimal
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    // Only comma: e.g. "150,50" or "1250,5" or "1,500"
    const commaParts = s.split(',');
    if (commaParts.length === 2) {
      // If single comma with 1 or 2 digits, it's definitely decimals: 150,50 -> 150.50
      s = s.replace(',', '.');
    } else {
      // Multiple commas e.g. 1,000,000
      s = s.replace(/,/g, '');
    }
  } else if (s.includes('.')) {
    // Only dot: e.g. "150.50" or "1.250"
    const dotParts = s.split('.');
    if (dotParts.length === 2) {
      // Single dot: 150.50 -> 150.50
      // If 3 digits after dot and before has 1-3 digits without other dots, could be thousands,
      // but in JS number inputs/typing, dot is standard decimal point.
      // E.g. "150.50" -> 150.50
    } else {
      // Multiple dots: 1.000.000 -> 1000000
      s = s.replace(/\./g, '');
    }
  }

  // Remove any remaining non-numeric characters except single decimal dot
  s = s.replace(/[^0-9.]/g, '');
  const val = parseFloat(s);
  if (isNaN(val)) return 0;
  return isNegative ? -val : val;
}

/**
 * Evaluates mathematical addition expressions (e.g., "1250,50 + 450,25 + 100")
 * Frequently used when a POS device has 2 or more Z reports in a single day.
 */
export function evaluateMathExpression(value: string | number): {
  total: number;
  terms: number[];
  count: number;
  isExpression: boolean;
  rawExpression: string;
} {
  if (typeof value === 'number') {
    const val = isNaN(value) ? 0 : value;
    return {
      total: val,
      terms: [val],
      count: 1,
      isExpression: false,
      rawExpression: val.toString(),
    };
  }

  if (!value || typeof value !== 'string') {
    return {
      total: 0,
      terms: [],
      count: 0,
      isExpression: false,
      rawExpression: '',
    };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return {
      total: 0,
      terms: [],
      count: 0,
      isExpression: false,
      rawExpression: '',
    };
  }

  // Split by '+' sign
  if (trimmed.includes('+')) {
    const rawTerms = trimmed.split('+').map((t) => t.trim()).filter(Boolean);
    const parsedTerms = rawTerms.map((t) => parseSingleNumber(t));
    const total = parsedTerms.reduce((sum, n) => sum + n, 0);
    return {
      total: Math.round(total * 100) / 100,
      terms: parsedTerms,
      count: parsedTerms.length,
      isExpression: true,
      rawExpression: trimmed,
    };
  }

  const single = parseSingleNumber(trimmed);
  return {
    total: Math.round(single * 100) / 100,
    terms: [single],
    count: 1,
    isExpression: false,
    rawExpression: trimmed,
  };
}

export function parseNumberInput(value: string | number): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;
  const result = evaluateMathExpression(value);
  return result.total;
}

export function getTodayISO(): string {
  // Current ISO date representation
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayIsoDate(): string {
  return getTodayISO();
}

export function getMonthNameTR(monthStr: string): string {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, 1);
  return new Intl.DateTimeFormat('tr-TR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
