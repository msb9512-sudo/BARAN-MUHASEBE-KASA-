import React, { useState, useEffect } from 'react';
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
  X,
  ArrowLeft,
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
      `🧾 *Kasa Giderleri Toplamı (Nakit):* -${reg.cashExpenses.toLocaleString('tr-TR')} ₺`,
      reg.creditCardExpenses > 0 ? `💳 *Kredi & Kart Giderleri (Kasadan Düşmez):* ${reg.creditCardExpenses.toLocaleString('tr-TR')} ₺` : '',
      reg.invoiceCashPayments ? `📦 *Kasadan Fatura Ödemesi:* -${reg.invoiceCashPayments.toLocaleString('tr-TR')} ₺` : '',
      reg.cashWithdrawals ? `🏦 *Bankaya Yatırılan / Çekim:* -${reg.cashWithdrawals.toLocaleString('tr-TR')} ₺` : '',
      `───────────────────────────`,
      `💼 *Önceki Günden Devir Kasa:* ${reg.openingCash.toLocaleString('tr-TR')} ₺`,
      `🎯 *Beklenen Nakit Kasa:* ${reg.expectedCash.toLocaleString('tr-TR')} ₺`,
      `💵 *GÜN SONU FİİLİ KASA:* ${reg.actualCashInHand.toLocaleString('tr-TR')} ₺`,
      entry.vaultTransfer?.transferred ? `🔐 *Ana Kasaya Devredilen Nakit:* ${entry.vaultTransfer.amount.toLocaleString('tr-TR')} ₺` : '',
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
    <div
      id="boss-report-backdrop"
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto font-mono cursor-pointer"
    >
      <div
        id="boss-report-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-2xl p-5 sm:p-7 shadow-2xl space-y-5 my-6 max-h-[90vh] overflow-y-auto cursor-default"
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

            {(entry.vegaReport.discountTotal || entry.vegaReport.discountAmount) ? (
              <div className="flex justify-between py-1 border-b border-[#21262d]">
                <span className="text-rose-400 font-semibold">(-) Yapılan Toplam İskonto:</span>
                <strong className="text-rose-400 font-mono text-sm">-{formatCurrency(entry.vegaReport.discountTotal || entry.vegaReport.discountAmount || 0)}</strong>
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

