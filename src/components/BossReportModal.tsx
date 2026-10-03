import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Printer,
  ChevronDown,
  ChevronUp,
  Receipt,
  Users,
  CheckCircle2,
  AlertTriangle,
  X,
  CreditCard,
  Wallet,
  Building2,
} from 'lucide-react';
import {
  DailyEntry,
  CashExpense,
  Invoice,
  OpenAccountCustomer,
  OpenAccountTransaction,
} from '../types';
import {
  formatCurrency,
  formatDateTR,
  formatDateWithDayTR,
} from '../utils/formatters';
import { calculateDailyRegister, isCashExpenseMethod } from '../utils/calculations';
import { RestaurantProfile } from '../utils/storage';

interface BossReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: DailyEntry;
  expenses: CashExpense[];
  invoices: Invoice[];
  profile: RestaurantProfile;
  openAccountCustomers: OpenAccountCustomer[];
  openAccountTransactions: OpenAccountTransaction[];
}

export const BossReportModal: React.FC<BossReportModalProps> = ({
  isOpen,
  onClose,
  entry,
  expenses,
  invoices,
  profile,
  openAccountCustomers = [],
  openAccountTransactions = [],
}) => {
  const [copied, setCopied] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const reg = calculateDailyRegister(entry, expenses, invoices);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ==========================================
  // BÖLÜM 1: GİDERLER HESAPLAMALARI
  // ==========================================
  const dayExpenses = (expenses || []).filter((e) => e.isActive && e.date === entry.date);

  // Kasadan nakit ödenen faturalar
  const dayCashInvoices = (invoices || [])
    .filter((inv) => inv.isActive)
    .flatMap((inv) =>
      (inv.payments || [])
        .filter((p) => p.date === entry.date && p.paymentMethod === 'Nakit (Kasadan)')
        .map((p) => ({
          supplierName: inv.supplierName,
          invoiceNumber: inv.invoiceNumber,
          amount: Number(p.amount) || 0,
        }))
    );

  const totalDayExpenses = dayExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalCashInvoicePayments = dayCashInvoices.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const grandTotalGider = totalDayExpenses + totalCashInvoicePayments;
  const hasExpenses = dayExpenses.length > 0 || dayCashInvoices.length > 0;

  // a) Kategoriye göre gruplama
  const categoryMap: Record<string, { totalAmount: number; count: number; items: CashExpense[] }> = {};
  dayExpenses.forEach((exp) => {
    const cat = exp.category?.trim() || 'Diğer Giderler';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { totalAmount: 0, count: 0, items: [] };
    }
    categoryMap[cat].totalAmount += Number(exp.amount) || 0;
    categoryMap[cat].count += 1;
    categoryMap[cat].items.push(exp);
  });

  const categoryList = Object.entries(categoryMap)
    .map(([name, data]) => ({
      name,
      totalAmount: data.totalAmount,
      count: data.count,
      percentage: totalDayExpenses > 0 ? (data.totalAmount / totalDayExpenses) * 100 : 0,
      items: data.items,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // b) Ödeme türüne göre dağılım
  const paymentMethods: { method: string; amount: number; isNonCash: boolean }[] = [
    {
      method: 'Kasa (Nakit)',
      amount: dayExpenses.filter((e) => isCashExpenseMethod(e.paidBy)).reduce((s, e) => s + (Number(e.amount) || 0), 0),
      isNonCash: false,
    },
    {
      method: 'Kredi Kartı',
      amount: dayExpenses.filter((e) => e.paidBy === 'Kredi Kartı').reduce((s, e) => s + (Number(e.amount) || 0), 0),
      isNonCash: true,
    },
    {
      method: 'Banka Kartı',
      amount: dayExpenses.filter((e) => e.paidBy === 'Banka Kartı').reduce((s, e) => s + (Number(e.amount) || 0), 0),
      isNonCash: true,
    },
    {
      method: 'Banka (Havale / EFT)',
      amount: dayExpenses.filter((e) => e.paidBy === 'Banka').reduce((s, e) => s + (Number(e.amount) || 0), 0),
      isNonCash: true,
    },
    {
      method: 'Cepte / Şahsi',
      amount: dayExpenses.filter((e) => e.paidBy === 'Cepte/Şahsi').reduce((s, e) => s + (Number(e.amount) || 0), 0),
      isNonCash: true,
    },
  ].filter((p) => p.amount > 0);

  // ==========================================
  // BÖLÜM 2: CARİ (AÇIK HESAP) HESAPLAMALARI
  // ==========================================
  const dayTransactions = (openAccountTransactions || []).filter((t) => t.date === entry.date);
  const txUpToDate = (openAccountTransactions || []).filter((t) => t.date <= entry.date);
  const vegaOpenAccount = Number(entry.vegaReport?.openAccountTotal) || 0;

  // Vega'da açık hesap 0 ve cari kaydı da yoksa bu bölüm gösterilmez
  const hasOpenAccount = vegaOpenAccount > 0 || dayTransactions.length > 0;

  // a) Bugünün hareketleri: cari adıyla grupla
  const todayCustomerMap: Record<
    string,
    {
      customerName: string;
      debtTotal: number;
      paymentTotal: number;
      transactions: OpenAccountTransaction[];
    }
  > = {};

  dayTransactions.forEach((tx) => {
    const cKey = tx.customerId || tx.customerName;
    if (!todayCustomerMap[cKey]) {
      todayCustomerMap[cKey] = {
        customerName: tx.customerName,
        debtTotal: 0,
        paymentTotal: 0,
        transactions: [],
      };
    }
    if (tx.type === 'debt') {
      todayCustomerMap[cKey].debtTotal += Number(tx.amount) || 0;
    } else {
      todayCustomerMap[cKey].paymentTotal += Number(tx.amount) || 0;
    }
    todayCustomerMap[cKey].transactions.push(tx);
  });

  const todayCustomers = Object.values(todayCustomerMap);
  const todayTotalDebt = dayTransactions
    .filter((t) => t.type === 'debt')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const todayTotalPayment = dayTransactions
    .filter((t) => t.type === 'payment')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  // b) Güncel cari bakiyeler: rapor tarihine kadar olan hareketler
  const activeCustomers = (openAccountCustomers || []).filter((c) => c.isActive);
  const customerBalances = activeCustomers
    .map((cust) => {
      const custTx = txUpToDate.filter((t) => t.customerId === cust.id);
      const totalDebt = custTx.filter((t) => t.type === 'debt').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const totalPmt = custTx.filter((t) => t.type === 'payment').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const balance = Math.round((totalDebt - totalPmt) * 100) / 100;
      return {
        id: cust.id,
        name: cust.name,
        balance,
      };
    })
    .filter((c) => c.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  const totalOutstandingReceivables = customerBalances.reduce((s, c) => s + c.balance, 0);

  // c) Kontrol: Vega Açık Hesap vs Bugünün Cari Borç Toplamı
  const cariVegaDiff = Math.round(Math.abs(vegaOpenAccount - todayTotalDebt) * 100) / 100;
  const isCariReconciled = cariVegaDiff <= 0.05;

  const toggleCategory = (catName: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  // Generate plain text for WhatsApp / SMS
  const generateWhatsAppText = () => {
    const lines = [
      `📊 *${(profile.companyTitle || profile.name).toUpperCase()}*`,
      profile.branch ? `📍 *${profile.branch}*` : '',
      profile.taxNumber ? `🏢 *VKN: ${profile.taxNumber}*` : '',
      `📅 *${formatDateTR(entry.date)} GÜNLÜK KASA VE SATIŞ RAPORU*`,
      `───────────────────────────`,
      `💰 *TOPLAM SATIŞ (CİRO):* ${reg.totalSales.toLocaleString('tr-TR')} ₺`,
      entry.vegaReport.grossProductSales ? `🏷 *Brüt Ürün Satışı:* ${entry.vegaReport.grossProductSales.toLocaleString('tr-TR')} ₺` : '',
      (entry.vegaReport.discountTotal || entry.vegaReport.discountAmount) ? `🔻 *Toplam İskonto:* -${(entry.vegaReport.discountTotal || entry.vegaReport.discountAmount || 0).toLocaleString('tr-TR')} ₺` : '',
      entry.vegaReport.openAccountTotal ? `📝 *Açık Hesap (Cari):* -${entry.vegaReport.openAccountTotal.toLocaleString('tr-TR')} ₺` : '',
      `💵 *Nakit Satış:* ${reg.cashSales.toLocaleString('tr-TR')} ₺`,
      `💳 *Kredi Kartı Satış:* ${reg.creditCardSales.toLocaleString('tr-TR')} ₺`,
      entry.vegaReport.otherSales ? `🎟 *Diğer Satışlar:* ${entry.vegaReport.otherSales.toLocaleString('tr-TR')} ₺` : '',
      `───────────────────────────`,
      `💼 *Önceki Günden Devir Kasa:* ${reg.openingCash.toLocaleString('tr-TR')} ₺`,
      `🎯 *Beklenen Nakit Kasa:* ${reg.expectedCash.toLocaleString('tr-TR')} ₺`,
      `💵 *GÜN SONU FİİLİ KASA:* ${reg.actualCashInHand.toLocaleString('tr-TR')} ₺`,
      entry.vaultTransfer?.transferred ? `🔐 *Ana Kasaya Devredilen Nakit:* ${entry.vaultTransfer.amount.toLocaleString('tr-TR')} ₺` : '',
      `───────────────────────────`,
      `🔍 *DENETİM VE KONTROL:*`,
      `• *Vega / POS Kontrol:* ${
        reg.isNoVegaCardSales
          ? 'Kart satışı raporda yok, POS toplamı baz alındı'
          : reg.isPosReconciled
          ? '✓ UYUMLU (Fark Yok)'
          : `⚠ ${Math.abs(reg.posVegaDifference).toLocaleString('tr-TR')} ₺ FARK VAR`
      }`,
      `• *Kasa Mutabakatı:* ${reg.isCashBalanced ? '✓ UYUMLU (Fark Yok)' : `⚠ ${reg.cashDifference > 0 ? '+' : ''}${reg.cashDifference.toLocaleString('tr-TR')} ₺ KASA FARKI`}`,
    ];

    // BÖLÜM 1: GİDERLER (WhatsApp)
    if (hasExpenses) {
      lines.push(`───────────────────────────`);
      lines.push(`🧾 *GİDERLER*`);
      categoryList.forEach((cat) => {
        lines.push(`• *${cat.name}* (${cat.count} adet, %${cat.percentage.toFixed(1)}): ${cat.totalAmount.toLocaleString('tr-TR')} ₺`);
        cat.items.forEach((it) => {
          const nonCashNote = !isCashExpenseMethod(it.paidBy) ? ' - Kasadan düşmez' : '';
          lines.push(`  - ${it.description || cat.name} (${it.paidBy}${nonCashNote}): ${Number(it.amount).toLocaleString('tr-TR')} ₺`);
        });
      });

      if (paymentMethods.length > 0) {
        lines.push(`*Ödeme Türü Dağılımı:*`);
        paymentMethods.forEach((pm) => {
          lines.push(`• ${pm.method}: ${pm.amount.toLocaleString('tr-TR')} ₺${pm.isNonCash ? ' (Kasadan düşmez)' : ''}`);
        });
      }

      if (dayCashInvoices.length > 0) {
        lines.push(`*Kasadan Nakit Ödenen Faturalar:*`);
        dayCashInvoices.forEach((inv) => {
          lines.push(`• ${inv.supplierName}${inv.invoiceNumber ? ` (${inv.invoiceNumber})` : ''}: -${inv.amount.toLocaleString('tr-TR')} ₺`);
        });
      }

      lines.push(`🔻 *TOPLAM GİDER:* ${grandTotalGider.toLocaleString('tr-TR')} ₺`);
    }

    // BÖLÜM 2: CARİ (AÇIK HESAP) (WhatsApp)
    if (hasOpenAccount) {
      lines.push(`───────────────────────────`);
      lines.push(`👥 *CARİ (AÇIK HESAP)*`);
      lines.push(
        `• *Vega / Cari Kontrolü:* ${
          isCariReconciled
            ? '✓ Uyumlu'
            : `⚠ Vega'da açık hesap ${vegaOpenAccount.toLocaleString('tr-TR')} ₺, cari kaydı ${todayTotalDebt.toLocaleString('tr-TR')} ₺, fark ${cariVegaDiff.toLocaleString('tr-TR')} ₺`
        }`
      );

      if (todayCustomers.length > 0) {
        lines.push(`*Bugünün Cari Hareketleri:*`);
        todayCustomers.forEach((cust) => {
          const parts: string[] = [];
          if (cust.debtTotal > 0) parts.push(`Borç (Veresiye): ${cust.debtTotal.toLocaleString('tr-TR')} ₺`);
          if (cust.paymentTotal > 0) {
            const methods = Array.from(
              new Set(cust.transactions.filter((t) => t.type === 'payment').map((t) => t.paymentMethod || 'Nakit'))
            ).join(', ');
            parts.push(`Tahsilat: ${cust.paymentTotal.toLocaleString('tr-TR')} ₺ (${methods})`);
          }
          lines.push(`• ${cust.customerName}: ${parts.join(' | ')}`);
        });
        if (todayTotalDebt > 0) lines.push(`• *Bugün Toplam Borç:* ${todayTotalDebt.toLocaleString('tr-TR')} ₺`);
        if (todayTotalPayment > 0) lines.push(`• *Bugün Toplam Tahsilat:* ${todayTotalPayment.toLocaleString('tr-TR')} ₺`);
      }

      if (customerBalances.length > 0) {
        lines.push(`*Güncel Cari Bakiyeler (Alacaklar):*`);
        customerBalances.forEach((c) => {
          lines.push(`• ${c.name}: ${c.balance.toLocaleString('tr-TR')} ₺`);
        });
        lines.push(`💰 *TOPLAM ALACAK:* ${totalOutstandingReceivables.toLocaleString('tr-TR')} ₺`);
      }
    }

    if (entry.notes) {
      lines.push(`───────────────────────────`);
      lines.push(`📝 *Not:* ${entry.notes}`);
    }

    lines.push(`\n_Raporu Hazırlayan: ${entry.closedBy || profile.accountantName}_`);

    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateWhatsAppText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="boss-report-backdrop"
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto font-mono cursor-pointer"
    >
      <div
        id="boss-report-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-3xl p-5 sm:p-7 shadow-2xl space-y-5 my-6 max-h-[92vh] overflow-y-auto cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#30363d] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold text-xl">
              👔
            </div>
            <div>
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <span>Patrona Gönderilecek Günlük Kasa Raporu</span>
              </h3>
              <p className="text-xs text-gray-400">
                Sade, net ve yönetici için optimize edilmiş günlük finansal özet kartı
              </p>
            </div>
          </div>

          <button
            id="boss-report-close-top-btn"
            onClick={onClose}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-rose-950/40 text-gray-300 hover:text-rose-300 border border-[#30363d] hover:border-rose-800 transition cursor-pointer text-xs font-semibold"
            title="Kapat (ESC veya Dışarıya Tıklayın)"
          >
            <X className="w-4 h-4" />
            <span>Kapat</span>
          </button>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
          <div className="text-xs text-gray-400 font-medium">
            Raporu tek tuşla WhatsApp veya Telegram ile paylaşabilirsiniz:
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-md transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'WhatsApp Metni Kopyalandı!' : 'Metni Kopyala (WhatsApp)'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-semibold px-3 py-2 rounded-lg border border-[#30363d] transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdır / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="flex items-center space-x-1 bg-[#21262d] hover:bg-rose-950/40 text-gray-300 hover:text-rose-300 text-xs font-semibold px-3 py-2 rounded-lg border border-[#30363d] hover:border-rose-800 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Kapat</span>
            </button>
          </div>
        </div>

        {/* Printable & Aesthetic Card Preview */}
        <div
          id="boss-printable-card"
          className="bg-[#0d1117] text-white rounded-xl p-6 sm:p-8 border border-[#30363d] shadow-2xl space-y-6 print:border-none print:shadow-none"
        >
          {/* Card Top */}
          <div className="text-center border-b border-[#30363d] pb-5">
            <span className="text-xs font-bold tracking-widest text-orange-400 uppercase">
              {profile.companyTitle || profile.name} {profile.branch ? `• ${profile.branch}` : ''}
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
              GÜNLÜK KASA VE SATIŞ RAPORU
            </h2>
            <div className="text-sm font-semibold text-gray-400 mt-1">
              {formatDateWithDayTR(entry.date)}
            </div>
          </div>

          {/* Key Metric Hero Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d]">
              <span className="text-[11px] text-gray-400 font-semibold uppercase">TOPLAM SATIŞ (CİRO)</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {formatCurrency(reg.totalSales)}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d]">
              <span className="text-[11px] text-gray-400 font-semibold uppercase">KASA GİDERLERİ</span>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {formatCurrency(reg.cashExpenses)}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d]">
              <span className="text-[11px] text-gray-400 font-semibold uppercase">GÜN SONU NAKİT KASA</span>
              <div className="text-2xl font-bold text-white mt-1">
                {formatCurrency(reg.actualCashInHand)}
              </div>
            </div>
          </div>

          {/* Detailed breakdown list */}
          <div className="bg-[#161b22] rounded-lg p-5 border border-[#30363d] space-y-3 text-xs">
            {entry.vegaReport.grossProductSales ? (
              <div className="flex justify-between py-1 border-b border-[#21262d]">
                <span className="text-gray-400">Brüt Ürün Satış Tutarı:</span>
                <strong className="text-gray-200 font-mono text-sm">{formatCurrency(entry.vegaReport.grossProductSales)}</strong>
              </div>
            ) : null}

            {entry.vegaReport.discountTotal || entry.vegaReport.discountAmount ? (
              <div className="flex justify-between py-1 border-b border-[#21262d]">
                <span className="text-rose-400 font-semibold">(-) Yapılan Toplam İskonto:</span>
                <strong className="text-rose-400 font-mono text-sm">
                  -{formatCurrency(entry.vegaReport.discountTotal || entry.vegaReport.discountAmount || 0)}
                </strong>
              </div>
            ) : null}

            {entry.vegaReport.openAccountTotal ? (
              <div className="flex justify-between py-1 border-b border-[#21262d]">
                <span className="text-amber-400 font-semibold">(-) Açık Hesap (Cari / Veresiye):</span>
                <strong className="text-amber-400 font-mono text-sm">-{formatCurrency(entry.vegaReport.openAccountTotal)}</strong>
              </div>
            ) : null}

            <div className="flex justify-between py-1 border-b border-[#21262d]">
              <span className="text-gray-400">Nakit Satış Hasılatı:</span>
              <strong className="text-gray-200 font-mono text-sm">{formatCurrency(reg.cashSales)}</strong>
            </div>

            <div className="flex justify-between py-1 border-b border-[#21262d]">
              <span className="text-gray-400">Kredi Kartı Satışları (Vega):</span>
              <strong className="text-blue-400 font-mono text-sm">{formatCurrency(reg.creditCardSales)}</strong>
            </div>

            <div className="flex justify-between py-1 border-b border-[#21262d]">
              <span className="text-gray-400">POS Cihazları Z Raporları Toplamı:</span>
              <strong className="text-blue-400 font-mono text-sm">{formatCurrency(reg.posTotal)}</strong>
            </div>

            <div className="flex justify-between py-1 border-b border-[#21262d]">
              <span className="text-gray-400">Kasadan Ödenen Günlük Giderler:</span>
              <strong className="text-amber-400 font-mono text-sm">-{formatCurrency(reg.cashExpenses)}</strong>
            </div>

            {reg.creditCardExpenses > 0 && (
              <div className="flex justify-between py-1 border-b border-[#21262d]">
                <span className="text-sky-300 font-medium">💳 Kredi & Kart Giderleri (Kasadan Düşmez):</span>
                <strong className="text-sky-400 font-mono text-sm">{formatCurrency(reg.creditCardExpenses)}</strong>
              </div>
            )}

            {reg.invoiceCashPayments > 0 && (
              <div className="flex justify-between py-1 border-b border-[#21262d]">
                <span className="text-gray-400">Kasadan Ödenen Tedarikçi Faturaları:</span>
                <strong className="text-purple-400 font-mono text-sm">-{formatCurrency(reg.invoiceCashPayments)}</strong>
              </div>
            )}

            {reg.cashWithdrawals > 0 && (
              <div className="flex justify-between py-1 border-b border-[#21262d]">
                <span className="text-gray-400">Kasadan Bankaya Yatırılan / Çekim:</span>
                <strong className="text-amber-400 font-mono text-sm">-{formatCurrency(reg.cashWithdrawals)}</strong>
              </div>
            )}

            {entry.vaultTransfer?.transferred && (
              <div className="flex justify-between py-1 border-b border-[#21262d]">
                <span className="text-amber-400 font-medium">Ana Kasaya Devredilen Nakit (Banknotlu):</span>
                <strong className="text-amber-300 font-mono text-sm">+{formatCurrency(entry.vaultTransfer.amount)}</strong>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* BÖLÜM 1: GİDERLER KARTI (Kategori, Ödeme Türü, Kalemler) */}
          {/* ======================================================== */}
          {hasExpenses && (
            <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#21262d] gap-2">
                <div className="flex items-center space-x-2">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-white text-sm uppercase tracking-wider">
                    Giderler ({dayExpenses.length} Harcama {dayCashInvoices.length > 0 ? `+ ${dayCashInvoices.length} Fatura` : ''})
                  </h4>
                </div>
                <div className="text-xs font-mono">
                  <span className="text-gray-400 mr-2">Toplam Gider:</span>
                  <span className="font-bold text-amber-400 text-sm">{formatCurrency(grandTotalGider)}</span>
                </div>
              </div>

              {/* Ödeme Türüne Göre Dağılım */}
              {paymentMethods.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase block">
                    Ödeme Türüne Göre Dağılım:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {paymentMethods.map((pm) => (
                      <div
                        key={pm.method}
                        className="p-2.5 rounded-lg bg-[#0d1117] border border-[#21262d] flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between gap-1 text-[11px] text-gray-300">
                          <span className="truncate">{pm.method}</span>
                          {pm.isNonCash && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-sky-950/60 text-sky-400 border border-sky-800/40 shrink-0">
                              Kasadan düşmez
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-xs text-white mt-1">
                          {formatCurrency(pm.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Kategoriye Göre Giderler & Açılır Kalemler */}
              {categoryList.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase block">
                    Kategoriye Göre Kalemler:
                  </span>
                  <div className="space-y-1.5">
                    {categoryList.map((cat) => {
                      const isCollapsed = !!collapsedCategories[cat.name];
                      return (
                        <div
                          key={cat.name}
                          className="rounded-lg bg-[#0d1117] border border-[#21262d] overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => toggleCategory(cat.name)}
                            className="w-full p-2.5 flex items-center justify-between hover:bg-[#21262d]/50 transition cursor-pointer text-left"
                          >
                            <div className="flex items-center space-x-2">
                              {isCollapsed ? (
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                              ) : (
                                <ChevronUp className="w-3.5 h-3.5 text-orange-400" />
                              )}
                              <span className="font-bold text-xs text-gray-200">{cat.name}</span>
                              <span className="text-[10px] text-gray-400">({cat.count} kayıt)</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold">
                                %{cat.percentage.toFixed(1)}
                              </span>
                            </div>
                            <span className="font-bold text-xs text-white">
                              {formatCurrency(cat.totalAmount)}
                            </span>
                          </button>

                          {!isCollapsed && (
                            <div className="px-3 pb-2.5 pt-1 space-y-1 border-t border-[#21262d]/60 bg-[#161b22]/40">
                              {cat.items.map((it) => {
                                const nonCash = !isCashExpenseMethod(it.paidBy);
                                return (
                                  <div
                                    key={it.id}
                                    className="flex items-center justify-between text-[11px] py-1 border-b border-[#21262d]/40 last:border-none"
                                  >
                                    <div className="flex items-center space-x-1.5 min-w-0 pr-2">
                                      <span className="text-gray-300 truncate">
                                        {it.description || cat.name}
                                      </span>
                                      <span className="text-gray-500 text-[10px] shrink-0">
                                        ({it.paidBy}
                                        {nonCash && ' • Kasadan düşmez'})
                                      </span>
                                    </div>
                                    <span className="font-mono text-gray-200 shrink-0 font-semibold">
                                      {formatCurrency(it.amount)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Kasadan Nakit Ödenen Faturalar */}
              {dayCashInvoices.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-[#21262d]">
                  <span className="text-[11px] text-purple-400 font-semibold uppercase block">
                    Kasadan Nakit Ödenen Faturalar:
                  </span>
                  <div className="space-y-1">
                    {dayCashInvoices.map((inv, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-[#0d1117] border border-[#21262d] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-3.5 h-3.5 text-purple-400" />
                          <span className="font-semibold text-gray-200">{inv.supplierName}</span>
                          {inv.invoiceNumber && (
                            <span className="text-[10px] text-gray-500 font-mono">({inv.invoiceNumber})</span>
                          )}
                        </div>
                        <strong className="text-purple-300 font-mono">
                          -{formatCurrency(inv.amount)}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* En altta Toplam Gider */}
              <div className="pt-2 border-t border-[#30363d] flex items-center justify-between text-xs font-bold">
                <span className="text-gray-300">
                  Toplam Gider (Kasa + Kart/Banka + Fatura Nakit):
                </span>
                <span className="text-amber-400 text-sm font-mono">
                  {formatCurrency(grandTotalGider)}
                </span>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* BÖLÜM 2: CARİ (AÇIK HESAP) KARTI */}
          {/* ======================================================== */}
          {hasOpenAccount && (
            <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#21262d] gap-2">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <h4 className="font-bold text-white text-sm uppercase tracking-wider">
                    Cari (Açık Hesap) Raporu
                  </h4>
                </div>

                {/* Kontrol Rozeti */}
                <div className="flex items-center space-x-1.5 text-xs">
                  <span className="text-gray-400">Vega / Cari Kontrolü:</span>
                  {isCariReconciled ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Uyumlu</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        Vega'da açık hesap {formatCurrency(vegaOpenAccount)}, cari kaydı {formatCurrency(todayTotalDebt)}, fark {formatCurrency(cariVegaDiff)}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* a) Bugünün Hareketleri */}
              {todayCustomers.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase block">
                    Bugünün Cari Hareketleri ({dayTransactions.length} İşlem):
                  </span>
                  <div className="space-y-1.5">
                    {todayCustomers.map((cust, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-[#0d1117] border border-[#21262d] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs"
                      >
                        <span className="font-bold text-gray-200">{cust.customerName}</span>
                        <div className="flex flex-wrap items-center gap-3">
                          {cust.debtTotal > 0 && (
                            <span className="text-rose-400 font-mono">
                              Borç (Veresiye): <strong>+{formatCurrency(cust.debtTotal)}</strong>
                            </span>
                          )}
                          {cust.paymentTotal > 0 && (
                            <span className="text-emerald-400 font-mono">
                              Tahsilat: <strong>-{formatCurrency(cust.paymentTotal)}</strong>{' '}
                              <span className="text-[10px] text-gray-400">
                                ({cust.transactions.filter((t) => t.type === 'payment').map((t) => t.paymentMethod || 'Nakit').join(', ')})
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-end gap-4 text-[11px] text-gray-400 pt-1 font-mono">
                    {todayTotalDebt > 0 && <span>Bugün Toplam Borç: <strong className="text-rose-400">{formatCurrency(todayTotalDebt)}</strong></span>}
                    {todayTotalPayment > 0 && <span>Bugün Toplam Tahsilat: <strong className="text-emerald-400">{formatCurrency(todayTotalPayment)}</strong></span>}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-[#0d1117] text-gray-400 text-xs text-center border border-[#21262d]">
                  Bugün için kaydedilmiş yeni bir cari borç veya tahsilat hareketi bulunmuyor.
                </div>
              )}

              {/* b) Güncel Cari Bakiyeler */}
              {customerBalances.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-[#21262d]">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase block">
                    Güncel Cari Bakiyeler (Alacak Listesi - {customerBalances.length} Kişi / Firma):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {customerBalances.map((c) => (
                      <div
                        key={c.id}
                        className="p-2 rounded bg-[#0d1117] border border-[#21262d] flex items-center justify-between text-xs"
                      >
                        <span className="text-gray-300 truncate pr-2">{c.name}</span>
                        <strong className="text-amber-400 font-mono shrink-0">
                          {formatCurrency(c.balance)}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-[#21262d] flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-300">Toplam Cari Alacak:</span>
                    <span className="text-emerald-400 text-sm font-mono">
                      {formatCurrency(totalOutstandingReceivables)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Audit Verification Result Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* POS vs Vega */}
            <div
              className={`p-4 rounded-lg border flex items-center justify-between ${
                reg.isNoVegaCardSales
                  ? 'bg-[#161b22] border-sky-500/30 text-sky-300'
                  : reg.isPosReconciled
                  ? 'bg-[#161b22] border-emerald-500/30 text-emerald-300'
                  : 'bg-[#161b22] border-rose-500/30 text-rose-300'
              }`}
            >
              <div>
                <span className="text-[11px] uppercase font-semibold text-gray-400">Vega / POS Kontrolü</span>
                <div className="font-bold text-sm mt-0.5">
                  {reg.isNoVegaCardSales
                    ? 'Kart satışı raporda yok, POS toplamı baz alındı'
                    : reg.isPosReconciled
                    ? '✓ UYUMLU (Tam Eşleşme)'
                    : `⚠ ${Math.abs(reg.posVegaDifference).toLocaleString('tr-TR')} ₺ FARK`}
                </div>
              </div>
              <div className="text-xl">
                {reg.isNoVegaCardSales ? 'ℹ' : reg.isPosReconciled ? '✓' : '⚠'}
              </div>
            </div>

            {/* Cash Balance */}
            <div
              className={`p-4 rounded-lg border flex items-center justify-between ${
                reg.isCashBalanced
                  ? 'bg-[#161b22] border-emerald-500/30 text-emerald-300'
                  : 'bg-[#161b22] border-rose-500/30 text-rose-300'
              }`}
            >
              <div>
                <span className="text-[11px] uppercase font-semibold text-gray-400">Kasa Sayım Kontrolü</span>
                <div className="font-bold text-sm mt-0.5">
                  {reg.isCashBalanced ? '✓ UYUMLU (Kasa Tam)' : `⚠ ${reg.cashDifference > 0 ? '+' : ''}${reg.cashDifference.toLocaleString('tr-TR')} ₺ FARK`}
                </div>
              </div>
              <div className="text-xl">{reg.isCashBalanced ? '✓' : '⚠'}</div>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-2 text-center text-gray-500 text-[11px]">
            Sistem Onayı: {entry.closedBy || profile.accountantName} • {new Date().toLocaleDateString('tr-TR')}
          </div>
        </div>

        {/* Modal Bottom Footer with Close and Back buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#30363d]">
          <div className="text-[11px] text-gray-400">
            Pencereyi kapatmak için dışarıya tıklayabilir veya <kbd className="px-1.5 py-0.5 bg-[#0d1117] border border-[#30363d] rounded text-[10px] text-gray-300">ESC</kbd> tuşuna basabilirsiniz.
          </div>
          <button
            id="boss-report-footer-close-btn"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#21262d] hover:bg-rose-950/50 text-gray-200 hover:text-rose-300 border border-[#30363d] hover:border-rose-800 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-2 shadow-sm"
          >
            <X className="w-4 h-4" />
            <span>Kapat ve Geri Dön</span>
          </button>
        </div>
      </div>
    </div>
  );
};
