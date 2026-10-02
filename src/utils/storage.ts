import {
  DailyEntry,
  CashExpense,
  Invoice,
  POSDevice,
  ExpenseCategory,
  OpenAccountCustomer,
  OpenAccountTransaction,
  MasterSafeState,
  SafeTransaction,
  BanknoteCounts,
  FinancialAccount,
  AccountTransaction,
} from '../types';
import { getTodayIsoDate } from './formatters';

const STORAGE_KEYS = {
  DAILY_ENTRIES: 'restoran_muhasebe_entries_clean_v2',
  CASH_EXPENSES: 'restoran_muhasebe_expenses_clean_v2',
  INVOICES: 'restoran_muhasebe_invoices_clean_v2',
  POS_DEVICES: 'restoran_muhasebe_pos_clean_v2',
  EXPENSE_CATEGORIES: 'restoran_muhasebe_categories_clean_v2',
  RESTAURANT_PROFILE: 'restoran_muhasebe_profile_clean_v2',
  OPEN_ACCOUNT_CUSTOMERS: 'restoran_muhasebe_open_account_customers_v1',
  OPEN_ACCOUNT_TRANSACTIONS: 'restoran_muhasebe_open_account_txs_v1',
  MASTER_SAFE: 'restoran_muhasebe_master_safe_v1',
  ACCOUNTS: 'restoran_muhasebe_accounts_v1',
  ACCOUNT_TRANSACTIONS: 'restoran_muhasebe_account_txs_v1',
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
  openAccountCustomers: OpenAccountCustomer[];
  openAccountTransactions: OpenAccountTransaction[];
  posDevices: POSDevice[];
  categories: ExpenseCategory[];
  profile: RestaurantProfile;
} {
  return {
    entries: [],
    expenses: [],
    invoices: [],
    openAccountCustomers: [],
    openAccountTransactions: [],
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
export function loadOpenAccountCustomers(): OpenAccountCustomer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OPEN_ACCOUNT_CUSTOMERS);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load open account customers', e);
    return [];
  }
}

export const DEFAULT_BANKNOTES: BanknoteCounts = {
  200: 0,
  100: 0,
  50: 0,
  20: 0,
  10: 0,
  5: 0,
  1: 0,
};

export const DEFAULT_MASTER_SAFE: MasterSafeState = {
  banknotes: { ...DEFAULT_BANKNOTES },
  transactions: [],
  lastUpdated: new Date().toISOString(),
};

export function calculateBanknoteTotal(banknotes: BanknoteCounts): number {
  if (!banknotes) return 0;
  return (
    (Number(banknotes[200]) || 0) * 200 +
    (Number(banknotes[100]) || 0) * 100 +
    (Number(banknotes[50]) || 0) * 50 +
    (Number(banknotes[20]) || 0) * 20 +
    (Number(banknotes[10]) || 0) * 10 +
    (Number(banknotes[5]) || 0) * 5 +
    (Number(banknotes[1]) || 0) * 1
  );
}

export function calculateTotalBanknoteCount(banknotes: BanknoteCounts): number {
  if (!banknotes) return 0;
  return (
    (Number(banknotes[200]) || 0) +
    (Number(banknotes[100]) || 0) +
    (Number(banknotes[50]) || 0) +
    (Number(banknotes[20]) || 0) +
    (Number(banknotes[10]) || 0) +
    (Number(banknotes[5]) || 0) +
    (Number(banknotes[1]) || 0)
  );
}

export function loadMasterSafe(): MasterSafeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MASTER_SAFE);
    if (!raw) {
      saveMasterSafe(DEFAULT_MASTER_SAFE);
      return DEFAULT_MASTER_SAFE;
    }
    const parsed = JSON.parse(raw);
    return {
      banknotes: { ...DEFAULT_BANKNOTES, ...(parsed.banknotes || {}) },
      transactions: parsed.transactions || [],
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch (e) {
    console.error('Failed to load master safe', e);
    return DEFAULT_MASTER_SAFE;
  }
}

export function saveMasterSafe(safe: MasterSafeState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MASTER_SAFE, JSON.stringify(safe));
  } catch (e) {
    console.error('Failed to save master safe', e);
  }
}

export function saveOpenAccountCustomers(customers: OpenAccountCustomer[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.OPEN_ACCOUNT_CUSTOMERS, JSON.stringify(customers));
  } catch (e) {
    console.error('Failed to save open account customers', e);
  }
}

export function loadOpenAccountTransactions(): OpenAccountTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OPEN_ACCOUNT_TRANSACTIONS);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load open account transactions', e);
    return [];
  }
}

export function saveOpenAccountTransactions(transactions: OpenAccountTransaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.OPEN_ACCOUNT_TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    console.error('Failed to save open account transactions', e);
  }
}

export const DEFAULT_ACCOUNTS: FinancialAccount[] = [
  {
    id: 'ana-kasa',
    name: 'Ana Kasa (Nakit)',
    type: 'cash',
    isDefault: true,
    initialBalance: 0,
    color: '#f97316',
    notes: 'İşletme ana nakit kasası',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ziraat-bankasi',
    name: 'Ziraat Bankası',
    type: 'bank',
    bankName: 'Ziraat Bankası',
    initialBalance: 0,
    color: '#ef4444',
    notes: 'Ana ticari banka mevduat hesabı',
    createdAt: new Date().toISOString(),
  },
];

export function loadAccounts(): FinancialAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (!raw) {
      saveAccounts(DEFAULT_ACCOUNTS);
      return DEFAULT_ACCOUNTS;
    }
    const parsed: FinancialAccount[] = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
      saveAccounts(DEFAULT_ACCOUNTS);
      return DEFAULT_ACCOUNTS;
    }
    const hasDefault = parsed.some((a) => a.isDefault || a.id === 'ana-kasa');
    if (!hasDefault) {
      parsed.unshift(DEFAULT_ACCOUNTS[0]);
      saveAccounts(parsed);
    }
    return parsed;
  } catch (e) {
    console.error('Failed to load accounts', e);
    return DEFAULT_ACCOUNTS;
  }
}

export function saveAccounts(accounts: FinancialAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save accounts', e);
  }
}

export function loadAccountTransactions(): AccountTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNT_TRANSACTIONS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load account transactions', e);
    return [];
  }
}

export function saveAccountTransactions(txs: AccountTransaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACCOUNT_TRANSACTIONS, JSON.stringify(txs));
  } catch (e) {
    console.error('Failed to save account transactions', e);
  }
}

export interface AccountBalanceSummary {
  initialBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalTransfersIn: number;
  totalTransfersOut: number;
  totalExpenses: number;
  totalInflow: number;
  totalOutflow: number;
  currentBalance: number;
}

export function calculateAccountBalance(
  account: FinancialAccount,
  expenses: CashExpense[] = [],
  transactions: AccountTransaction[] = [],
  masterSafe?: MasterSafeState
): AccountBalanceSummary {
  const initialBalance = Number(account.initialBalance) || 0;
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let totalTransfersIn = 0;
  let totalTransfersOut = 0;
  let totalExpenses = 0;

  transactions.forEach((tx) => {
    const amount = Number(tx.amount) || 0;
    if (tx.accountId === account.id) {
      if (tx.type === 'deposit') {
        totalDeposits += amount;
      } else if (tx.type === 'withdrawal') {
        totalWithdrawals += amount;
      } else if (tx.type === 'transfer') {
        totalTransfersOut += amount;
      }
    } else if (tx.type === 'transfer' && tx.toAccountId === account.id) {
      totalTransfersIn += amount;
    }
  });

  expenses.forEach((exp) => {
    if (!exp.isActive) return;
    const amount = Number(exp.amount) || 0;

    const p = (exp.paidBy || '').toLowerCase();
    const isCreditOrCard =
      p === 'kredi kartı' ||
      p === 'banka kartı' ||
      p === 'kredi karti' ||
      p === 'banka karti' ||
      p.includes('kredi') ||
      p.includes('kart');

    const isCashAccount = account.type === 'cash' || account.isDefault || account.id === 'ana-kasa';

    // KURAL: Banka Kartı ve Kredi Kartı harcamaları KESİNLİKLE Nakit Kasa hesabından DÜŞÜRÜLMEZ!
    if (isCashAccount && isCreditOrCard) {
      return;
    }

    const isThisAccount =
      exp.accountId === account.id ||
      (!exp.accountId && isCashAccount && exp.paidBy === 'Kasa') ||
      (!exp.accountId && account.type === 'bank' && (exp.paidBy === 'Banka' || exp.paidBy === 'Banka Kartı')) ||
      (!exp.accountId && (account.type === 'credit_card' || account.type === 'pos') && exp.paidBy === 'Kredi Kartı');

    if (isThisAccount) {
      totalExpenses += amount;
    }
  });

  if ((account.isDefault || account.id === 'ana-kasa') && masterSafe?.transactions) {
    masterSafe.transactions.forEach((st) => {
      if (st.source === 'daily_closing' && st.type === 'deposit') {
        const alreadyInTxs = transactions.some(
          (tx) => tx.id === `vault-${st.id}` || (tx.type === 'deposit' && tx.amount === st.amount && tx.date === st.date)
        );
        if (!alreadyInTxs) {
          totalDeposits += Number(st.amount) || 0;
        }
      }
    });
  }

  const totalInflow = initialBalance + totalDeposits + totalTransfersIn;
  const totalOutflow = totalWithdrawals + totalTransfersOut + totalExpenses;
  const currentBalance = totalInflow - totalOutflow;

  return {
    initialBalance,
    totalDeposits,
    totalWithdrawals,
    totalTransfersIn,
    totalTransfersOut,
    totalExpenses,
    totalInflow,
    totalOutflow,
    currentBalance,
  };
}

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
    openAccountCustomers: loadOpenAccountCustomers(),
    openAccountTransactions: loadOpenAccountTransactions(),
    masterSafe: loadMasterSafe(),
    accounts: loadAccounts(),
    accountTransactions: loadAccountTransactions(),
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
    if (data.openAccountCustomers) saveOpenAccountCustomers(data.openAccountCustomers);
    if (data.openAccountTransactions) saveOpenAccountTransactions(data.openAccountTransactions);
    if (data.masterSafe) saveMasterSafe(data.masterSafe);
    if (data.accounts) saveAccounts(data.accounts);
    if (data.accountTransactions) saveAccountTransactions(data.accountTransactions);
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
  openAccountCustomers: OpenAccountCustomer[];
  openAccountTransactions: OpenAccountTransaction[];
  masterSafe: MasterSafeState;
  accounts: FinancialAccount[];
  accountTransactions: AccountTransaction[];
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
    openAccountCustomers: loadOpenAccountCustomers(),
    openAccountTransactions: loadOpenAccountTransactions(),
    masterSafe: loadMasterSafe(),
    accounts: loadAccounts(),
    accountTransactions: loadAccountTransactions(),
    posDevices: loadPOSDevices(),
    categories: loadExpenseCategories(),
    profile: loadRestaurantProfile(),
  };
}

export function saveAppState(state: AppState): void {
  saveDailyEntries(Object.values(state.entries));
  saveCashExpenses(state.expenses);
  saveInvoices(state.invoices);
  saveOpenAccountCustomers(state.openAccountCustomers || []);
  saveOpenAccountTransactions(state.openAccountTransactions || []);
  saveMasterSafe(state.masterSafe || DEFAULT_MASTER_SAFE);
  saveAccounts(state.accounts || DEFAULT_ACCOUNTS);
  saveAccountTransactions(state.accountTransactions || []);
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
    openAccountCustomers: [],
    openAccountTransactions: [],
    masterSafe: DEFAULT_MASTER_SAFE,
    accounts: DEFAULT_ACCOUNTS,
    accountTransactions: [],
  };
  saveDailyEntries([]);
  saveCashExpenses([]);
  saveInvoices([]);
  saveOpenAccountCustomers([]);
  saveOpenAccountTransactions([]);
  saveMasterSafe(DEFAULT_MASTER_SAFE);
  saveAccounts(DEFAULT_ACCOUNTS);
  saveAccountTransactions([]);
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
  saveOpenAccountCustomers(clean.openAccountCustomers);
  saveOpenAccountTransactions(clean.openAccountTransactions);
  savePOSDevices(clean.posDevices);
  saveExpenseCategories(clean.categories);
  saveRestaurantProfile(clean.profile);
}
