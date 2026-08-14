import {
  DailyEntry,
  CashExpense,
  Invoice,
  POSDevice,
  ExpenseCategory,
} from '../types';
import { getTodayIsoDate } from './formatters';

const STORAGE_KEYS = {
  DAILY_ENTRIES: 'restoran_muhasebe_entries_clean_v2',
  CASH_EXPENSES: 'restoran_muhasebe_expenses_clean_v2',
  INVOICES: 'restoran_muhasebe_invoices_clean_v2',
  POS_DEVICES: 'restoran_muhasebe_pos_clean_v2',
  EXPENSE_CATEGORIES: 'restoran_muhasebe_categories_clean_v2',
  RESTAURANT_PROFILE: 'restoran_muhasebe_profile_clean_v2',
};

export interface RestaurantProfile {
  name: string; // İşletme / Tabela Adı
  companyTitle: string; // Resmi Şirket Ünvanı / Kaşe Üst Bilgisi
  stampText?: string; // Kaşe Detay Metni
  taxOffice: string; // Vergi Dairesi
  taxNumber: string; // Vergi Kimlik No / TC No
  tradeRegistryNo?: string; // Ticaret Sicil No
  mersisNo?: string; // Mersis No
  address: string; // Şirket / Şube Adresi
  branch: string; // Şube
  accountantName: string; // Sorumlu Muhasebeci / Kasiyer
  phone?: string;
  bossPhone: string;
  bossEmail: string;
  currency: string;
}

export const DEFAULT_PROFILE: RestaurantProfile = {
  name: '',
  companyTitle: '',
  stampText: '',
  taxOffice: '',
  taxNumber: '',
  tradeRegistryNo: '',
  mersisNo: '',
  address: '',
  branch: '',
  accountantName: '',
  phone: '',
  bossPhone: '',
  bossEmail: '',
  currency: '₺',
};

export const DEFAULT_POS_DEVICES: POSDevice[] = [];

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [];

/**
 * Clean initial installation data (No test records)
 */
export function getInitialCleanData(): {
  entries: DailyEntry[];
  expenses: CashExpense[];
  invoices: Invoice[];
  posDevices: POSDevice[];
  categories: ExpenseCategory[];
  profile: RestaurantProfile;
} {
  return {
    entries: [],
    expenses: [],
    invoices: [],
    posDevices: DEFAULT_POS_DEVICES,
    categories: DEFAULT_EXPENSE_CATEGORIES,
    profile: DEFAULT_PROFILE,
  };
}

export const getInitialSampleData = getInitialCleanData;

/**
 * Storage getters and setters
 */
export function loadDailyEntries(): DailyEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_ENTRIES);
    if (!raw) {
      const initial = getInitialCleanData();
      saveDailyEntries(initial.entries);
      return initial.entries;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load daily entries', e);
    return [];
  }
}

export function saveDailyEntries(entries: DailyEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DAILY_ENTRIES, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to save daily entries', e);
  }
}

export function loadCashExpenses(): CashExpense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CASH_EXPENSES);
    if (!raw) {
      const initial = getInitialCleanData();
      saveCashExpenses(initial.expenses);
      return initial.expenses;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load cash expenses', e);
    return [];
  }
}

export function saveCashExpenses(expenses: CashExpense[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CASH_EXPENSES, JSON.stringify(expenses));
  } catch (e) {
    console.error('Failed to save cash expenses', e);
  }
}

export function loadInvoices(): Invoice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (!raw) {
      const initial = getInitialCleanData();
      saveInvoices(initial.invoices);
      return initial.invoices;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load invoices', e);
    return [];
  }
}

export function saveInvoices(invoices: Invoice[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  } catch (e) {
    console.error('Failed to save invoices', e);
  }
}

export function loadPOSDevices(): POSDevice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.POS_DEVICES);
    if (!raw) {
      savePOSDevices(DEFAULT_POS_DEVICES);
      return DEFAULT_POS_DEVICES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_POS_DEVICES;
  }
}

export function savePOSDevices(devices: POSDevice[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.POS_DEVICES, JSON.stringify(devices));
  } catch (e) {
    console.error('Failed to save POS devices', e);
  }
}

export function loadExpenseCategories(): ExpenseCategory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSE_CATEGORIES);
    if (!raw) {
      saveExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
      return DEFAULT_EXPENSE_CATEGORIES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_EXPENSE_CATEGORIES;
  }
}

export function saveExpenseCategories(categories: ExpenseCategory[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EXPENSE_CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.error('Failed to save expense categories', e);
  }
}

export function loadRestaurantProfile(): RestaurantProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RESTAURANT_PROFILE);
    if (!raw) {
      saveRestaurantProfile(DEFAULT_PROFILE);
      return DEFAULT_PROFILE;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_PROFILE;
  }
}

export function saveRestaurantProfile(profile: RestaurantProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RESTAURANT_PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save profile', e);
  }
}

/**
 * Gets or creates a daily entry for a specific date.
 * If creating, auto-links openingCash from previous day's actual cash.
 */
export function getOrCreateDailyEntry(date: string, allEntries: DailyEntry[], posDevices: POSDevice[]): DailyEntry {
  const existing = allEntries.find((e) => e.date === date);
  if (existing) return existing;

  // Find previous day's entry to fetch opening cash
  const sorted = [...allEntries].filter((e) => e.date < date).sort((a, b) => b.date.localeCompare(a.date));
  const prevEntry = sorted[0];
  const autoOpeningCash = prevEntry ? (prevEntry.actualCashInHand || 0) : 0;

  const newEntry: DailyEntry = {
    date,
    status: 'draft',
    openingCash: autoOpeningCash,
    actualCashInHand: autoOpeningCash,
    notes: '',
    vegaReport: {
      totalSales: 0,
      cashSales: 0,
      creditCardSales: 0,
      otherSales: 0,
      discountTotal: 0,
      refundTotal: 0,
      treatTotal: 0,
      serviceCharge: 0,
      tableCount: 0,
      guestCount: 0,
    },
    vegaGroups: [],
    posReports: posDevices.filter((p) => p.isActive).map((p, idx) => ({
      id: `pos-rep-${Date.now()}-${idx}`,
      posDeviceId: p.id,
      posDeviceName: p.name,
      bankName: p.bankName,
      zNumber: '',
      creditCardTotal: 0,
    })),
    cashWithdrawals: [],
    updatedAt: new Date().toISOString(),
  };

  return newEntry;
}

/**
 * Backup / Export all app data as JSON string
 */
export function exportFullBackupJSON(): string {
  const data = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    profile: loadRestaurantProfile(),
    posDevices: loadPOSDevices(),
    categories: loadExpenseCategories(),
    dailyEntries: loadDailyEntries(),
    cashExpenses: loadCashExpenses(),
    invoices: loadInvoices(),
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Restore app data from JSON string
 */
export function restoreBackupJSON(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (!data.dailyEntries || !Array.isArray(data.dailyEntries)) {
      throw new Error('Geçersiz yedek dosyası formatı.');
    }
    if (data.profile) saveRestaurantProfile(data.profile);
    if (data.posDevices) savePOSDevices(data.posDevices);
    if (data.categories) saveExpenseCategories(data.categories);
    if (data.dailyEntries) saveDailyEntries(data.dailyEntries);
    if (data.cashExpenses) saveCashExpenses(data.cashExpenses);
    if (data.invoices) saveInvoices(data.invoices);
    return true;
  } catch (e) {
    console.error('Backup restore failed', e);
    return false;
  }
}

export interface AppState {
  currentSelectedDate: string;
  entries: Record<string, DailyEntry>;
  expenses: CashExpense[];
  invoices: Invoice[];
  posDevices: POSDevice[];
  categories: ExpenseCategory[];
  profile: RestaurantProfile;
}

export function loadAppState(): AppState {
  const today = getTodayIsoDate();
  const rawEntries = loadDailyEntries();
  const entriesRecord: Record<string, DailyEntry> = {};
  rawEntries.forEach((e) => {
    entriesRecord[e.date] = e;
  });

  return {
    currentSelectedDate: today,
    entries: entriesRecord,
    expenses: loadCashExpenses(),
    invoices: loadInvoices(),
    posDevices: loadPOSDevices(),
    categories: loadExpenseCategories(),
    profile: loadRestaurantProfile(),
  };
}

export function saveAppState(state: AppState): void {
  saveDailyEntries(Object.values(state.entries));
  saveCashExpenses(state.expenses);
  saveInvoices(state.invoices);
  savePOSDevices(state.posDevices);
  saveExpenseCategories(state.categories);
  saveRestaurantProfile(state.profile);
}

export function resetToSampleData(): AppState {
  resetToInitialSampleData();
  return loadAppState();
}

/**
 * Resets all financial entries, expenses and invoices, but preserves company profile, POS devices, and expense categories.
 */
export function resetAllFinancialData(currentState: AppState): AppState {
  const cleanState: AppState = {
    ...currentState,
    entries: {},
    expenses: [],
    invoices: [],
  };
  saveDailyEntries([]);
  saveCashExpenses([]);
  saveInvoices([]);
  return cleanState;
}

/**
 * Resets a single specific day's records (daily entry, expenses for that day, invoices for that day)
 */
export function resetSingleDayData(date: string, currentState: AppState): AppState {
  const remainingEntries = { ...currentState.entries };
  delete remainingEntries[date];

  // Re-create an empty fresh draft for that day
  const freshEntry = getOrCreateDailyEntry(date, Object.values(remainingEntries), currentState.posDevices);
  remainingEntries[date] = freshEntry;

  const remainingExpenses = currentState.expenses.filter((e) => e.date !== date);
  const remainingInvoices = currentState.invoices.filter((i) => i.date !== date);

  const updatedState: AppState = {
    ...currentState,
    entries: remainingEntries,
    expenses: remainingExpenses,
    invoices: remainingInvoices,
  };

  saveDailyEntries(Object.values(remainingEntries));
  saveCashExpenses(remainingExpenses);
  saveInvoices(remainingInvoices);

  return updatedState;
}

/**
 * Reset all data to clean initial state
 */
export function resetToInitialSampleData(): void {
  const clean = getInitialCleanData();
  saveDailyEntries(clean.entries);
  saveCashExpenses(clean.expenses);
  saveInvoices(clean.invoices);
  savePOSDevices(clean.posDevices);
  saveExpenseCategories(clean.categories);
  saveRestaurantProfile(clean.profile);
}
