export type TabType =
  | 'dashboard'
  | 'daily'
  | 'groups'
  | 'expenses'
  | 'invoices'
  | 'suppliers'
  | 'openAccounts'
  | 'closing'
  | 'vault'
  | 'accounts'
  | 'monthly'
  | 'workspace'
  | 'settings';

export type BanknoteDenomination = 200 | 100 | 50 | 20 | 10 | 5 | 1;

export type BanknoteCounts = {
  200: number;
  100: number;
  50: number;
  20: number;
  10: number;
  5: number;
  1: number;
  [key: number]: number;
};

export interface SafeTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'deposit' | 'withdrawal'; // 'deposit' (Giriş / Kasa Devri) | 'withdrawal' (Çıkış / Harcama / Masraf)
  source: 'daily_closing' | 'manual_deposit' | 'manual_expense' | 'supplier_payment' | 'boss_withdrawal' | 'other';
  sourceDailyEntryDate?: string;
  amount: number;
  banknotes: BanknoteCounts;
  category?: string; // Manav, Toptancı, Personel Avans, Gün Sonu Kasa Devri, Şahsi Çekim vb.
  description: string;
  enteredBy?: string;
  receiptNo?: string;
  notes?: string;
  createdAt: string;
}

export interface MasterSafeState {
  banknotes: BanknoteCounts;
  transactions: SafeTransaction[];
  lastUpdated?: string;
}

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';

export interface OpenAccountCustomer {
  id: string;
  name: string; // Müşteri / Kişi / Firma Adı
  phone?: string;
  company?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OpenAccountTransaction {
  id: string;
  customerId: string;
  customerName: string;
  date: string; // YYYY-MM-DD
  type: 'debt' | 'payment'; // 'debt' (Borç / Veresiye Satış) | 'payment' (Tahsilat / Ödeme)
  amount: number;
  description: string;
  paymentMethod?: 'Nakit' | 'Kredi Kartı / POS' | 'Banka Transferi / EFT' | 'Diğer';
  sourceDailyEntryDate?: string;
  receiptNo?: string;
  notes?: string;
  createdAt: string;
}


export interface PosZReportItem {
  id: string;
  posDeviceId: string;
  posDeviceName: string;
  bankName?: string;
  zNumber?: string;
  creditCardTotal: number;
  bankTotal?: number;
  refundTotal?: number;
  slipCount?: number;
  notes?: string;
  rawExpression?: string; // Optional math expression string (e.g. "1250,50 + 450,25")
  subZReports?: Array<{
    id: string;
    zNumber?: string;
    amount: number;
    slipCount?: number;
  }>;
}

export interface SoldProductItem {
  id: string;
  name: string; // Ürün Adı (örn: ADANA, BIRA.CARLSBERG 50CL, RAKI.BEYLERBEYİ 100CL)
  quantity: number; // Satılan Adet (örn: 16.50, 3.00)
  unit?: string; // Ad., Porsiyon, vb.
  unitPrice: number; // Birim Fiyat (TL)
  totalPrice: number; // Toplam Tutar (TL)
}

export interface VegaGroupItem {
  id: string;
  name: string; // Kategori / Ürün Grubu (örn: ANA YEMEK, ALKOLLÜ İÇECEK, ARA SICAKLAR, BAŞLANGIÇ, vb.)
  amount: number; // Grup Toplam Tutarı
  itemCount?: number; // Toplam Satılan Adet
  percentage?: number; // Cirodaki Yüzdesi (%)
  items?: SoldProductItem[]; // Kategori altındaki tek tek satılan ürünler
}

export interface VegaReportData {
  totalSales: number; // Net Satış / Genel Kasa Toplamı (İskonto ve kesintiler düşüldükten sonra)
  grossProductSales?: number; // Ürün Toplam Satış (Brüt Satış)
  cashSales: number; // Nakit Satış Hasılatı
  creditCardSales: number; // Kredi Kartı / POS Satış
  otherSales?: number; // Yemek Çeki, Cari, Açık Hesap vb.
  discountTotal?: number; // Toplam İskonto Tutarı (Düşülen İskonto)
  discountAmount?: number; // İskonto Tutarı (Eşdeğer)
  openAccountTotal?: number; // Açık Hesap Toplamı
  openTablesTotal?: number; // Şuan Açık Olan Masalar
  kasaGelirGiderTotal?: number; // Kasa Gelir Gider Toplamı
  netGeneralTotal?: number; // Genel Kasa Toplamı
  refundTotal?: number; // İade Toplamı
  cancelledAmount?: number; // İptal Tutarı
  treatTotal?: number; // İkram / Zayi
  complimentaryAmount?: number; // İkram Tutarı
  serviceCharge?: number; // Servis / Kuver
  tableCount?: number; // Masa / Adisyon Sayısı
  guestCount?: number; // Kuver / Kişi Sayısı
  notes?: string;
}

export interface CashWithdrawalItem {
  id: string;
  description: string;
  amount: number;
  target: 'Banka Hesabına Yatırılan' | 'Ortak / Patron Çekimi' | 'Diğer';
  notes?: string;
}

export interface DailyEntry {
  id?: string;
  date: string; // YYYY-MM-DD
  status: 'draft' | 'closed';
  closedAt?: string;
  closedBy?: string;
  openingCash: number; // Önceki günden devreden kasa
  actualCashInHand: number; // Fiili sayılan kasa mevcudu
  notes: string;
  vegaReport: VegaReportData;
  vegaGroups: VegaGroupItem[];
  posReports: PosZReportItem[];
  cashWithdrawals: CashWithdrawalItem[];
  vaultTransfer?: {
    transferred: boolean;
    amount: number;
    banknotes: BanknoteCounts;
    transferredAt?: string;
    transferredBy?: string;
    transactionId?: string;
  };
  createdAt?: string;
  updatedAt: string;
}

export type AccountType = 'cash' | 'bank' | 'pos' | 'credit_card' | 'other';

export interface FinancialAccount {
  id: string;
  name: string; // Örn: Ana Kasa (Nakit), Ziraat Bankası, Garanti POS, Şirket Kredi Kartı
  type: AccountType;
  bankName?: string;
  accountNumber?: string; // IBAN veya Hesap No
  initialBalance: number; // Başlangıç Bakiyesi
  isDefault?: boolean; // Ana Kasa için true
  color?: string; // Kart / rozet rengi
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AccountTransaction {
  id: string;
  accountId: string; // İşlemin ait olduğu ana hesap
  accountName?: string;
  date: string; // YYYY-MM-DD
  type: 'deposit' | 'withdrawal' | 'transfer'; // Giriş, Çıkış, Virman
  amount: number;
  category?: string; // Sermaye, Kasa Devri, Havale/EFT, Ortak Çekimi, Masraf vb.
  description: string;
  toAccountId?: string; // Virman ise hedef hesap ID
  toAccountName?: string;
  fromAccountId?: string; // Virman ise kaynak hesap ID
  fromAccountName?: string;
  relatedExpenseId?: string;
  relatedInvoiceId?: string;
  receiptNo?: string;
  enteredBy?: string;
  notes?: string;
  createdAt: string;
}

export type ExpensePaymentMethod = 'Kasa' | 'Banka' | 'Kredi Kartı' | 'Banka Kartı' | 'Cepte/Şahsi';

export interface CashExpense {
  id: string;
  date: string; // YYYY-MM-DD
  category: string; // Manav, Market, Personel Avans, Nakliye, Temizlik, Bakım, Küçük Gider, Kargo, Diğer
  description: string;
  amount: number;
  paidBy: ExpensePaymentMethod;
  accountId?: string; // Seçilen hesap ID'si (Örn: 'ana-kasa', 'ziraat', vb.)
  accountName?: string; // Seçilen hesap adı
  receiptNo?: string;
  enteredBy: string;
  attachmentUrl?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  productName: string;
  quantity: number;
  unit: string; // kg, adet, lt, koli, demet, teneke, kasa
  unitPrice: number;
  vatRate: number; // 1, 10, 20
  total: number;
  category: string; // Sebze/Meyve, Et/Tavuk, Süt/Peynir, Bakliyat, İçecek, Temizlik, Ambalaj, vb.
  usedQuantity?: number; // Tüketim
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  paymentMethod: 'Nakit (Kasadan)' | 'Banka Transferi / EFT' | 'Kredi Kartı' | 'Çek';
  bankOrSource: string;
  receiptNo?: string;
  notes?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  date: string; // YYYY-MM-DD (Fatura Tarihi)
  invoiceNo: string;
  supplierName: string;
  taxNumber?: string;
  netAmount?: number; // KDV Hariç Tutar
  totalAmount: number; // KDV Dahil Genel Toplam
  vatAmount: number;
  vatRate: number; // Karışık veya genel oran
  dueDate: string; // Vade Tarihi
  paymentStatus: PaymentStatus;
  category: string; // Manav, Kasap, Toptan Gıda, İçecek, Sarf & Temizlik, Hizmet, Diğer
  description: string;
  attachmentUrl?: string;
  items: InvoiceItem[];
  payments: InvoicePayment[];
  isActive: boolean;
  createdAt: string;
}

export interface SupplierGroup {
  id: string;
  name: string;
  taxNumber?: string;
  invoiceCount: number;
  totalAmount: number; // KDV Dahil toplam alım
  netAmount: number; // KDV Hariç toplam
  vatAmount: number; // KDV toplamı
  paidAmount: number;
  remainingDebt: number;
  lastTransactionDate: string;
  invoices: Invoice[];
}

export interface RestaurantProfile {
  name: string;
  companyTitle?: string;
  stampText?: string;
  taxOffice?: string;
  taxNumber: string;
  tradeRegistryNo?: string;
  mersisNo?: string;
  address?: string;
  branch: string;
  accountantName: string;
  phone?: string;
  bossPhone: string;
  bossEmail: string;
  currency: string;
}

export interface POSDevice {
  id: string;
  name: string; // POS 1 - Garanti BBVA vb.
  bankName: string;
  serialNo?: string;
  terminalId?: string;
  isActive: boolean;
}

export type PosDevice = POSDevice;

export interface ExpenseCategory {
  id: string;
  name: string;
  type?: string;
  color?: string;
  icon?: string;
}

export interface ProductStockSummary {
  productName: string;
  unit: string;
  category: string;
  totalQuantity: number;
  totalCost: number;
  avgUnitPrice: number;
  lastPurchaseDate: string;
  lastSupplier: string;
  usedQuantity: number;
  remainingQuantity: number;
}

export interface AuditWarning {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  category: 'pos' | 'cash' | 'invoice' | 'closing';
}

export interface MonthlyDailyRow {
  date: string;
  openingCash: number;
  totalSales: number;
  cashSales: number;
  creditCardSales: number;
  posTotal: number;
  cashExpenses: number;
  actualCashInHand: number;
  isPosReconciled: boolean;
  isCashBalanced: boolean;
  cashDifference: number;
  posVegaDifference: number;
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  totalDays: number;
  closedDays: number;
  totalSales: number;
  totalCashSales: number;
  totalCreditCardSales: number;
  totalOtherSales: number;
  totalPosCreditCard: number;
  totalCashExpenses: number;
  totalInvoices: number;
  totalInvoicePayments: number;
  totalCashInvoicePayments: number;
  unpaidInvoicesTotal: number;
  totalCashDifference: number;
  totalPosDifference: number;
  netCashFlow: number;
  cashSales?: number;
  creditCardSales?: number;
  remainingInvoiceDebt?: number;
  estimatedProfit?: number;
  dailyRows?: MonthlyDailyRow[];
}

export type ThemeId =
  | 'dark-obsidian'
  | 'midnight-black'
  | 'deep-navy'
  | 'warm-bistro'
  | 'emerald-nordic'
  | 'clean-light';

export type FontFamilyId =
  | 'inter'
  | 'jakarta'
  | 'jetbrains'
  | 'outfit'
  | 'geist'
  | 'playfair'
  | 'firacode';

export type FontSizeId = 'compact' | 'normal' | 'relaxed' | 'large';

export type AccentColorId =
  | 'orange'
  | 'emerald'
  | 'blue'
  | 'amber'
  | 'rose'
  | 'indigo';

export interface AppThemeSettings {
  themeId: ThemeId;
  fontFamilyId: FontFamilyId;
  fontSizeId: FontSizeId;
  accentColorId: AccentColorId;
}
