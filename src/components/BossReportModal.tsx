import React, { useState } from 'react';
import {
  Copy,
  Check,
  Printer,
  Share2,
  Download,
  Building2,
  Calendar,
  Wallet,
  CreditCard,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { DailyEntry, CashExpense, Invoice } from '../types';
import { formatCurrency, formatDateTR, formatDateWithDayTR } from '../utils/formatters';
import { calculateDailyRegister } from '../utils/calculations';
import { RestaurantProfile } from '../utils/storage';

interface BossReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: DailyEntry;
  expenses: CashExpense[];
  invoices: Invoice[];
  profile: RestaurantProfile;
}

export const BossReportModal: React.FC<BossReportModalProps> = ({
  isOpen,
  onClose,
  entry,
  expenses,
  invoices,
  profile,
}) => {
  const [copied, setCopied] = useState(false);
  const reg = calculateDailyRegister(entry, expenses, invoices);

  if (!isOpen) return null;

  // Generate plain text for WhatsApp / SMS
  const generateWhatsAppText = () => {
    const lines = [
      `📊 *${(profile.companyTitle || profile.name).toUpperCase()}*`,
      profile.branch ? `📍 *${profile.branch}*` : '',
      profile.taxNumber ? `🏢 *VKN: ${profile.taxNumber}*` : '',
      `📅 *${formatDateTR(entry.date)} GÜNLÜK KASA VE SATIŞ RAPORU*`,
      `───────────────────────────`,
      `💰 *TOPLAM SATIŞ (CİRO):* ${reg.totalSales.toLocaleString('tr-TR')} ₺`,
      `💵 *Nakit Satış:* ${reg.cashSales.toLocaleString('tr-TR')} ₺`,
      `💳 *Kredi Kartı Satış:* ${reg.creditCardSales.toLocaleString('tr-TR')} ₺`,
      entry.vegaReport.otherSales ? `🎟 *Yemek Kartı / Cari:* ${entry.vegaReport.otherSales.toLocaleString('tr-TR')} ₺` : '',
      `───────────────────────────`,
      `🧾 *Kasa Giderleri Toplamı:* -${reg.cashExpenses.toLocaleString('tr-TR')} ₺`,
      reg.invoiceCashPayments ? `📦 *Kasadan Fatura Ödemesi:* -${reg.invoiceCashPayments.toLocaleString('tr-TR')} ₺` : '',
      reg.cashWithdrawals ? `🏦 *Bankaya Yatırılan / Çekim:* -${reg.cashWithdrawals.toLocaleString('tr-TR')} ₺` : '',
      `───────────────────────────`,
      `💼 *Önceki Günden Devir Kasa:* ${reg.openingCash.toLocaleString('tr-TR')} ₺`,
      `🎯 *Beklenen Nakit Kasa:* ${reg.expectedCash.toLocaleString('tr-TR')} ₺`,
      `💵 *GÜN SONU FİİLİ KASA:* ${reg.actualCashInHand.toLocaleString('tr-TR')} ₺`,
      `───────────────────────────`,
      `🔍 *DENETİM VE KONTROL:*`,
      `• *Vega / POS Kontrol:* ${reg.isPosReconciled ? '✓ UYUMLU (Fark Yok)' : `⚠ ${Math.abs(reg.posVegaDifference).toLocaleString('tr-TR')} ₺ FARK VAR`}`,
      `• *Kasa Mutabakatı:* ${reg.isCashBalanced ? '✓ UYUMLU (Fark Yok)' : `⚠ ${reg.cashDifference > 0 ? '+' : ''}${reg.cashDifference.toLocaleString('tr-TR')} ₺ KASA FARKI`}`,
      entry.notes ? `\n📝 *Not:* ${entry.notes}` : '',
      `\n_Raporu Hazırlayan: ${entry.closedBy || profile.accountantName}_`,
    ].filter(Boolean);

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto font-mono">
      <div className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-2xl p-6 sm:p-8 shadow-2xl space-y-6 my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#30363d] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold text-xl">
              👔
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">
                Patrona Gönderilecek Günlük Kasa Raporu
              </h3>
              <p className="text-xs text-gray-400">
                Sade, net ve yönetici için optimize edilmiş günlük finansal özet kartı
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
          <div className="text-xs text-gray-400 font-medium">
            Raporu tek tuşla WhatsApp veya Telegram ile paylaşabilirsiniz:
          </div>

          <div className="flex items-center space-x-2">
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
              <span className="text-gray-400">Önceki Günden Devreden Kasa:</span>
              <strong className="text-gray-200 font-mono text-sm">{formatCurrency(reg.openingCash)}</strong>
            </div>

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
          </div>

          {/* Audit Verification Result Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* POS vs Vega */}
            <div
              className={`p-4 rounded-lg border flex items-center justify-between ${
                reg.isPosReconciled
                  ? 'bg-[#161b22] border-emerald-500/30 text-emerald-300'
                  : 'bg-[#161b22] border-rose-500/30 text-rose-300'
              }`}
            >
              <div>
                <span className="text-[11px] uppercase font-semibold text-gray-400">Vega / POS Kontrolü</span>
                <div className="font-bold text-sm mt-0.5">
                  {reg.isPosReconciled ? '✓ UYUMLU (Tam Eşleşme)' : `⚠ ${Math.abs(reg.posVegaDifference).toLocaleString('tr-TR')} ₺ FARK`}
                </div>
              </div>
              <div className="text-xl">
                {reg.isPosReconciled ? '✓' : '⚠'}
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
              <div className="text-xl">
                {reg.isCashBalanced ? '✓' : '⚠'}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-2 text-center text-gray-500 text-[11px]">
            Sistem Onayı: {entry.closedBy || profile.accountantName} • {new Date().toLocaleDateString('tr-TR')}
          </div>
        </div>

      </div>
    </div>
  );
};
