import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Clipboard,
  Check,
  AlertCircle,
  Sparkles,
  FileText,
  Layers,
  ArrowRight,
  Wallet,
  CreditCard,
  Receipt,
  FileCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { DailyEntry, CashExpense, Invoice } from '../types';
import { formatCurrency, parseNumberInput } from '../utils/formatters';
import { extractTextFromPdf, parseReportText, ParsedPdfReport } from '../utils/pdfParser';
import { calculateDailyRegister, getDailyCashExpenses, getDailyInvoiceCashPayments } from '../utils/calculations';

interface VegaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEntry: DailyEntry;
  onApplyImport: (updated: DailyEntry) => void;
  expenses?: CashExpense[];
  invoices?: Invoice[];
  onOpenAccountDetected?: (amount: number, date: string) => void;
}

export const VegaImportModal: React.FC<VegaImportModalProps> = ({
  isOpen,
  onClose,
  currentEntry,
  onApplyImport,
  expenses = [],
  invoices = [],
  onOpenAccountDetected,
}) => {
  const [activeTab, setActiveTab] = useState<'pdf' | 'excel' | 'paste'>('pdf');
  const [pasteText, setPasteText] = useState('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [parsedData, setParsedData] = useState<Partial<DailyEntry['vegaReport']> | null>(null);
  const [parsedGroups, setParsedGroups] = useState<DailyEntry['vegaGroups']>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Process raw text through universal parser
  const processReportText = (text: string, sourceName?: string) => {
    const parsed: ParsedPdfReport = parseReportText(text);

    const vegaReport: Partial<DailyEntry['vegaReport']> = {
      totalSales: parsed.totalSales,
      grossProductSales: parsed.grossProductSales,
      cashSales: parsed.cashSales,
      creditCardSales: parsed.creditCardSales,
      otherSales: parsed.otherSales,
      discountAmount: parsed.discountAmount,
      discountTotal: parsed.discountTotal,
      openAccountTotal: parsed.openAccountTotal,
      openTablesTotal: parsed.openTablesTotal,
      kasaGelirGiderTotal: parsed.kasaGelirGiderTotal,
      complimentaryAmount: parsed.complimentaryAmount,
      cancelledAmount: parsed.cancelledAmount,
      tableCount: parsed.tableCount,
      guestCount: parsed.guestCount,
    };

    setParsedData(vegaReport);
    setParsedGroups(parsed.groups);
    setFileName(sourceName || null);
    
    const totalItems = (parsed.groups || []).reduce((s, g) => s + (g.items ? g.items.length : 0), 0);
    setStatusMessage(
      `✓ ${sourceName ? `"${sourceName}"` : 'Rapor'} başarıyla okundu! ${parsed.groups.length} ürün grubu, ${totalItems} alt ürün kalemi ve satış toplamları ayrıştırıldı.`
    );
  };

  // Handle PDF Upload
  const handlePdfUpload = async (file: File) => {
    setIsLoadingFile(true);
    setStatusMessage('PDF dosyası taranıyor ve ürün grupları ayrıştırılıyor...');
    try {
      const buffer = await file.arrayBuffer();
      const text = await extractTextFromPdf(buffer);
      if (!text || text.trim().length === 0) {
        throw new Error('PDF dosyasından metin çıkartılamadı (Taranmış görsel PDF olabilir).');
      }
      processReportText(text, file.name);
    } catch (err: any) {
      console.error('PDF parsing error', err);
      setStatusMessage(`Hata: ${err?.message || 'PDF dosyası okunurken sorun oluştu.'}`);
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Handle Excel Upload
  const handleExcelUpload = (file: File) => {
    setIsLoadingFile(true);
    setStatusMessage('Excel tablosu taranıyor...');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Convert rows to plain text lines
        const plainText = rows
          .map((row) => (Array.isArray(row) ? row.filter(Boolean).join('  ') : ''))
          .join('\n');

        processReportText(plainText, file.name);
      } catch (err) {
        setStatusMessage('Excel dosyası okunurken hata oluştu. Lütfen dosya formatını kontrol ediniz.');
      } finally {
        setIsLoadingFile(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      handlePdfUpload(file);
    } else {
      handleExcelUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      setActiveTab('pdf');
      handlePdfUpload(file);
    } else {
      setActiveTab('excel');
      handleExcelUpload(file);
    }
  };

  // Handle manual paste text
  const handleParsePasteText = () => {
    if (!pasteText.trim()) return;
    processReportText(pasteText, 'Yapıştırılan Metin');
  };

  // Compute live preview of calculations with the newly parsed data
  const previewTotalSales = parsedData?.totalSales ?? currentEntry.vegaReport?.totalSales ?? 0;
  const previewCCSales = parsedData?.creditCardSales ?? currentEntry.vegaReport?.creditCardSales ?? 0;
  const previewOtherSales = parsedData?.otherSales ?? currentEntry.vegaReport?.otherSales ?? 0;
  const previewGrossSales = parsedData?.grossProductSales ?? (parsedGroups.length > 0 ? parsedGroups.reduce((a, b) => a + b.amount, 0) : previewTotalSales);
  const previewDiscount = parsedData?.discountTotal ?? parsedData?.discountAmount ?? currentEntry.vegaReport?.discountTotal ?? currentEntry.vegaReport?.discountAmount ?? 0;
  const previewOpenAccount = parsedData?.openAccountTotal ?? currentEntry.vegaReport?.openAccountTotal ?? 0;
  
  // Computed cash sales: if cashSales is not explicitly found, infer total - CC
  const previewCashSales =
    parsedData?.cashSales !== undefined && parsedData.cashSales > 0
      ? parsedData.cashSales
      : Math.max(0, previewTotalSales - previewCCSales - previewOtherSales);

  const dailyCashExpenses = getDailyCashExpenses(expenses, currentEntry.date);
  const dailyInvoiceCash = getDailyInvoiceCashPayments(invoices, currentEntry.date);
  const openingCash = Number(currentEntry.openingCash) || 0;
  const withdrawals = (currentEntry.cashWithdrawals || []).reduce((s, w) => s + (Number(w.amount) || 0), 0);

  const totalCashOutflow = dailyCashExpenses + dailyInvoiceCash + withdrawals;
  // Otomatik hesaplanan beklenen net nakit kasa
  const calculatedRemainingCash = openingCash + previewCashSales - totalCashOutflow;

  const handleApply = (autoSetActualCash: boolean = true) => {
    if (!parsedData && parsedGroups.length === 0) return;

    const finalCashSales =
      parsedData?.cashSales !== undefined && parsedData.cashSales > 0
        ? parsedData.cashSales
        : Math.max(0, previewTotalSales - previewCCSales - previewOtherSales);

    const updatedVega = {
      ...currentEntry.vegaReport,
      ...(parsedData || {}),
      grossProductSales: previewGrossSales,
      discountTotal: previewDiscount,
      discountAmount: previewDiscount,
      openAccountTotal: previewOpenAccount,
      totalSales: previewTotalSales,
      cashSales: finalCashSales,
      creditCardSales: previewCCSales,
      otherSales: previewOtherSales,
    };

    const finalEntry: DailyEntry = {
      ...currentEntry,
      vegaReport: updatedVega,
      vegaGroups: parsedGroups.length > 0 ? parsedGroups : currentEntry.vegaGroups,
      // If user wants, automatically set actual cash to the remaining calculated cash
      actualCashInHand: autoSetActualCash ? calculatedRemainingCash : currentEntry.actualCashInHand,
      updatedAt: new Date().toISOString(),
    };

    onApplyImport(finalEntry);
    onClose();

    if (previewOpenAccount > 0 && onOpenAccountDetected) {
      setTimeout(() => {
        onOpenAccountDetected(previewOpenAccount, currentEntry.date);
      }, 200);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto font-sans cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-6 max-h-[90vh] overflow-y-auto cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base font-mono">
                Grup & Vega Satış Raporu Yükleme
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                PDF grup raporunu yükleyin, sistem satışları ve kalan nakiti otomatik hesaplasın.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg font-bold cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center space-x-2 border-b border-[#30363d] pb-2 text-xs font-mono font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'pdf'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-gray-400 hover:bg-[#21262d] hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>PDF Grup Raporu Yükle</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('excel')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'excel'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-gray-400 hover:bg-[#21262d] hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel / CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-gray-400 hover:bg-[#21262d] hover:text-white'
            }`}
          >
            <Clipboard className="w-4 h-4" />
            <span>Metin Kopyala - Yapıştır</span>
          </button>
        </div>

        {/* Tab 1 & 2: PDF & Excel Upload Box */}
        {(activeTab === 'pdf' || activeTab === 'excel') && (
          <div className="space-y-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 ${
                dragOver
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-[#30363d] hover:border-orange-500/60 bg-[#0d1117]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={activeTab === 'pdf' ? '.pdf,application/pdf' : '.xlsx,.xls,.csv'}
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="p-3 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                {activeTab === 'pdf' ? <FileText className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
              </div>

              <div>
                <p className="text-xs font-bold text-white font-mono">
                  {activeTab === 'pdf'
                    ? 'PDF Grup Raporunu buraya sürükleyin veya tıklayıp seçin'
                    : 'Excel (.xlsx / .csv) dosyasını buraya sürükleyin veya tıklayın'}
                </p>
                <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                  Vega Şefim, Protel, SambaPOS vb. restoran yazılımlarından alınan grup satış dökümleri
                </p>
              </div>

              {isLoadingFile && (
                <div className="flex items-center space-x-2 text-xs text-orange-400 font-mono pt-2 animate-pulse">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Dosya taranıyor ve gruplar ayrıştırılıyor...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Paste Box */}
        {activeTab === 'paste' && (
          <div className="space-y-2.5">
            <label className="block text-xs font-mono font-semibold text-gray-300">
              Vega Rapor Metnini Buraya Yapıştırın:
            </label>
            <textarea
              rows={5}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Örn:&#10;YİYECEK: 85.400,00 TL&#10;İÇECEK: 32.100,00 TL&#10;TATLI: 14.500,00 TL&#10;TOPLAM SATIŞ: 132.000,00 TL&#10;KREDİ KARTI: 95.000,00 TL"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleParsePasteText}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-mono font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Metni Çözümle & Ayrıştır</span>
              </button>
            </div>
          </div>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-lg border text-xs font-mono flex items-center space-x-2 ${
              statusMessage.startsWith('✓')
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
                : statusMessage.startsWith('Hata')
                ? 'bg-rose-950/30 border-rose-500/30 text-rose-400'
                : 'bg-orange-950/30 border-orange-500/30 text-orange-300'
            }`}
          >
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* PARSED RESULTS & AUTOMATIC CASH CALCULATION PREVIEW */}
        {(parsedData || parsedGroups.length > 0) && (
          <div className="space-y-4 pt-2 border-t border-[#30363d]">
            {/* Top Stat Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
              <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg">
                <span className="text-gray-400 text-[10px] uppercase block">Brüt Ürün Satış</span>
                <span className="text-base font-bold text-white mt-0.5 block">
                  {formatCurrency(previewGrossSales)}
                </span>
              </div>

              <div className="p-3 bg-rose-950/20 border border-rose-500/40 rounded-lg">
                <span className="text-rose-400 text-[10px] uppercase font-bold block">(-) Toplam İskonto</span>
                <span className="text-base font-bold text-rose-400 mt-0.5 block">
                  -{formatCurrency(previewDiscount)}
                </span>
              </div>

              <div className="p-3 bg-amber-950/20 border border-amber-500/40 rounded-lg">
                <span className="text-amber-400 text-[10px] uppercase font-bold block">(-) Açık Hesap (Cari)</span>
                <span className="text-base font-bold text-amber-400 mt-0.5 block">
                  -{formatCurrency(previewOpenAccount)}
                </span>
              </div>

              <div className="p-3 bg-emerald-950/20 border border-emerald-500/40 rounded-lg">
                <span className="text-emerald-400 text-[10px] uppercase font-bold block">(=) Net Ciro (Genel Kasa)</span>
                <span className="text-base font-bold text-emerald-400 mt-0.5 block">
                  {formatCurrency(previewTotalSales)}
                </span>
              </div>
            </div>

            {previewOpenAccount > 0 && (
              <div className="p-3 bg-orange-500/15 border border-orange-500/40 rounded-xl flex items-center justify-between font-mono text-xs text-orange-300">
                <div className="flex items-center space-x-2">
                  <span className="text-base">📌</span>
                  <span>
                    Vega raporunda <strong>{formatCurrency(previewOpenAccount)}</strong> Açık Hesap tespit edildi. Kaydettikten sonra bunu bir kişiye / masaya bağlayabileceksiniz.
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2.5 font-mono text-xs">
              <div className="p-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg">
                <span className="text-gray-400 text-[10px] uppercase block">Kredi Kartı / POS</span>
                <span className="text-sm font-bold text-sky-400 mt-0.5 block">
                  {formatCurrency(previewCCSales)}
                </span>
              </div>

              <div className="p-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg">
                <span className="text-gray-400 text-[10px] uppercase block">Nakit Satış</span>
                <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                  {formatCurrency(previewCashSales)}
                </span>
              </div>

              <div className="p-2.5 bg-orange-950/20 border border-orange-500/30 rounded-lg">
                <span className="text-orange-400 text-[10px] font-bold uppercase block">Kalan Net Kasa</span>
                <span className="text-sm font-bold text-orange-400 mt-0.5 block">
                  {formatCurrency(calculatedRemainingCash)}
                </span>
              </div>
            </div>

            {/* Live Cash Flow Formula Breakdown */}
            <div className="p-3.5 rounded-xl bg-[#0d1117] border border-orange-500/30 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-orange-400 font-bold border-b border-[#30363d] pb-1.5">
                <span className="flex items-center space-x-1.5">
                  <Wallet className="w-4 h-4" />
                  <span>Otomatik Kasa Hesabı ve Kalan Nakit Formülü</span>
                </span>
                <span className="text-[11px] text-gray-400 font-normal">
                  {currentEntry.date}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-400">+ Devreden Açılış Kasası:</span>
                  <span className="font-semibold text-white">{formatCurrency(openingCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">+ PDF'ten Gelen Nakit Satış:</span>
                  <span className="font-semibold text-emerald-400">+{formatCurrency(previewCashSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">- Günlük Kasa Giderleri ({expenses.filter(e => e.isActive && e.date === currentEntry.date && e.paidBy === 'Kasa').length} adet):</span>
                  <span className="font-semibold text-rose-400">-{formatCurrency(dailyCashExpenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">- Kasadan Fatura Ödemeleri:</span>
                  <span className="font-semibold text-rose-400">-{formatCurrency(dailyInvoiceCash)}</span>
                </div>
                {withdrawals > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">- Kasadan Çekilen / Bankaya:</span>
                    <span className="font-semibold text-rose-400">-{formatCurrency(withdrawals)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-[#30363d] pt-2 flex items-center justify-between">
                <span className="text-xs font-bold text-white">
                  = GÜN SONU KASADA OLMASI GEREKEN NAKİT:
                </span>
                <span className="text-sm font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded border border-orange-500/30">
                  {formatCurrency(calculatedRemainingCash)}
                </span>
              </div>
            </div>

            {/* Extracted Groups List */}
            {parsedGroups.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-gray-300">
                  <span className="font-bold flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-orange-400" />
                    <span>Ayrıştırılan Ürün Grupları ({parsedGroups.length} Grup):</span>
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Grup Toplamı: {formatCurrency(parsedGroups.reduce((a, b) => a + b.amount, 0))}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-[#0d1117] rounded-lg border border-[#30363d] font-mono text-xs">
                  {parsedGroups.map((grp, idx) => (
                    <div
                      key={grp.id || idx}
                      className="p-2 rounded bg-[#161b22] border border-[#30363d] flex items-center justify-between"
                    >
                      <span className="text-gray-200 truncate pr-2 font-medium">
                        {grp.name}
                      </span>
                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-white block">
                          {formatCurrency(grp.amount)}
                        </span>
                        {grp.percentage ? (
                          <span className="text-[10px] text-orange-400">
                            %{grp.percentage}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#30363d] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-lg text-xs font-mono cursor-pointer transition"
              >
                Vazgeç
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleApply(false)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-white rounded-lg text-xs font-mono font-semibold transition cursor-pointer"
                  title="Sadece satış rakamlarını aktarır"
                >
                  Sadece Satışları Aktar
                </button>

                <button
                  type="button"
                  onClick={() => handleApply(true)}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-mono font-bold shadow-lg transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Kalan Nakiti ve Grupları Kaydet</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
