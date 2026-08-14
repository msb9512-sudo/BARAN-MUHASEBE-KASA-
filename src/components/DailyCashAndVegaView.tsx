import React, { useState, useRef } from 'react';
import {
  Wallet,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Info,
  Layers,
  Save,
  HelpCircle,
  Upload,
  Receipt,
  FileText,
  FileCheck,
  Check,
  RefreshCw,
  Calculator,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { DailyEntry, CashExpense, Invoice, PosDevice, PosZReportItem, CashWithdrawalItem } from '../types';
import { formatCurrency, parseNumberInput, formatDateTR } from '../utils/formatters';
import { calculateDailyRegister, getPosTotal } from '../utils/calculations';
import { extractTextFromPdf, parseReportText } from '../utils/pdfParser';

interface DailyCashAndVegaViewProps {
  selectedDate?: string;
  currentEntry: DailyEntry;
  onUpdateEntry: (updated: DailyEntry) => void;
  posDevices?: PosDevice[];
  expenses: CashExpense[];
  invoices: Invoice[];
  onOpenVegaImport?: () => void;
  onOpenBossReport?: () => void;
  onOpenQuickImport?: () => void;
  onOpenNewExpense?: () => void;
  onOpenNewInvoice?: () => void;
  onNavigate?: (tab: string) => void;
}

export const DailyCashAndVegaView: React.FC<DailyCashAndVegaViewProps> = ({
  selectedDate,
  currentEntry,
  onUpdateEntry,
  posDevices,
  expenses,
  invoices,
  onOpenVegaImport,
  onOpenBossReport,
  onOpenQuickImport,
  onOpenNewExpense,
  onOpenNewInvoice,
  onNavigate,
}) => {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [expandedVegaGroups, setExpandedVegaGroups] = useState<Record<string, boolean>>({});
  const directPdfInputRef = useRef<HTMLInputElement>(null);

  const toggleVegaGroup = (id: string) => {
    setExpandedVegaGroups(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAllVegaGroups = () => {
    const all: Record<string, boolean> = {};
    (currentEntry.vegaGroups || []).forEach(g => {
      all[g.id] = true;
    });
    setExpandedVegaGroups(all);
  };

  const collapseAllVegaGroups = () => {
    setExpandedVegaGroups({});
  };

  const reg = calculateDailyRegister(currentEntry, expenses, invoices);
  const handleImportClick = onOpenVegaImport || onOpenQuickImport || (() => {});

  // Direct PDF Drop / Upload Handler
  const handleDirectPdfFile = async (file: File) => {
    setIsProcessingPdf(true);
    setPdfSuccessMessage(null);

    try {
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        const buffer = await file.arrayBuffer();
        const rawText = await extractTextFromPdf(buffer);
        if (!rawText || rawText.trim().length === 0) {
          throw new Error('PDF dosyasından metin çıkartılamadı.');
        }

        const parsed = parseReportText(rawText);

        const totalSales = parsed.totalSales || 0;
        const grossSales = parsed.grossProductSales || totalSales;
        const discountTotal = parsed.discountAmount || 0;
        const openAccountTotal = parsed.openAccountTotal || 0;
        const ccSales = parsed.creditCardSales || 0;
        const otherSales = parsed.otherSales || 0;
        // Nakit = Ciro - Kart - Diğer (veya raporda doğrudan yazan nakit)
        const autoCash =
          parsed.cashSales > 0
            ? parsed.cashSales
            : Math.max(0, totalSales - ccSales - otherSales);

        // Kasa giderleri ve faturaları hesaba katarak kalan nakiti hesapla
        const openingCash = Number(currentEntry.openingCash) || 0;
        const totalOutflow = reg.totalCashOutflow;
        const autoRemainingCash = openingCash + autoCash - totalOutflow;

        const updatedVega = {
          ...currentEntry.vegaReport,
          grossProductSales: grossSales,
          discountTotal: discountTotal,
          discountAmount: discountTotal,
          openAccountTotal: openAccountTotal,
          totalSales: totalSales,
          cashSales: autoCash,
          creditCardSales: ccSales,
          otherSales: otherSales,
          complimentaryAmount: parsed.complimentaryAmount || currentEntry.vegaReport.complimentaryAmount,
          cancelledAmount: parsed.cancelledAmount || currentEntry.vegaReport.cancelledAmount,
          tableCount: parsed.tableCount || currentEntry.vegaReport.tableCount,
          guestCount: parsed.guestCount || currentEntry.vegaReport.guestCount,
        };

        // If parsed posBreakdown exists, update posReports
        let updatedPosReports = currentEntry.posReports;
        if (parsed.posBreakdown && parsed.posBreakdown.length > 0) {
          updatedPosReports = parsed.posBreakdown.map((item, idx) => ({
            id: `pos-${Date.now()}-${idx}`,
            posDeviceId: `pos-dev-${idx}`,
            posDeviceName: item.name,
            bankName: item.name,
            creditCardTotal: item.amount,
            zNumber: '',
            slipCount: 0,
          }));
        }

        const updatedEntry: DailyEntry = {
          ...currentEntry,
          vegaReport: updatedVega,
          vegaGroups: parsed.groups && parsed.groups.length > 0 ? parsed.groups : currentEntry.vegaGroups,
          posReports: updatedPosReports,
          actualCashInHand: autoRemainingCash, // Otomatik kalan nakite eşitler
          updatedAt: new Date().toISOString(),
        };

        const totalItemsParsed = (parsed.groups || []).reduce((s, g) => s + (g.items ? g.items.length : 0), 0);

        // Auto-expand all groups on PDF import
        if (parsed.groups && parsed.groups.length > 0) {
          const autoExp: Record<string, boolean> = {};
          parsed.groups.forEach((g) => {
            autoExp[g.id] = true;
          });
          setExpandedVegaGroups(autoExp);
        }

        onUpdateEntry(updatedEntry);
        setPdfSuccessMessage(
          `✓ PDF Grup Raporu Başarıyla Okundu! ${parsed.groups.length} ürün grubu (${totalItemsParsed > 0 ? `${totalItemsParsed} adet münferit ürün kalemi` : ''}) ayrıştırıldı. Toplam İskonto (-${formatCurrency(discountTotal)}) otomatik düşüldü ve kalan net nakit ${formatCurrency(
            autoRemainingCash
          )} olarak hesaplandı.`
        );
      } else {
        // Trigger modal for excel/other
        handleImportClick();
      }
    } catch (err: any) {
      console.error('PDF Read Error', err);
      alert('PDF okunurken bir hata oluştu. Lütfen dosyanın taranmış metin içerdiğinden emin olunuz veya İçe Aktar penceresini kullanınız.');
    } finally {
      setIsProcessingPdf(false);
    }
  };

  // Sync remaining calculated cash to actual cash in hand
  const handleSyncToActualCash = () => {
    onUpdateEntry({
      ...currentEntry,
      actualCashInHand: reg.expectedCash,
      updatedAt: new Date().toISOString(),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Auto-calculate cash sales from Total Sales minus POS/CC sales
  const handleAutoComputeCashFromSales = () => {
    const total = Number(currentEntry.vegaReport.totalSales) || 0;
    const cc = reg.posTotal > 0 ? reg.posTotal : (Number(currentEntry.vegaReport.creditCardSales) || 0);
    const other = Number(currentEntry.vegaReport.otherSales) || 0;
    const autoCash = Math.max(0, total - cc - other);

    const openingCash = Number(currentEntry.openingCash) || 0;
    const autoRemainingCash = openingCash + autoCash - reg.totalCashOutflow;

    onUpdateEntry({
      ...currentEntry,
      vegaReport: {
        ...currentEntry.vegaReport,
        cashSales: autoCash,
        creditCardSales: cc,
      },
      actualCashInHand: autoRemainingCash,
      updatedAt: new Date().toISOString(),
    });
  };

  // Vega field updater
  const handleVegaChange = (field: string, val: string | number) => {
    const num = typeof val === 'number' ? val : parseNumberInput(val);
    const currentVega = currentEntry.vegaReport;
    const posTotal = getPosTotal(currentEntry.posReports);
    const effectiveCC = posTotal > 0 ? posTotal : (field === 'creditCardSales' ? num : (Number(currentVega.creditCardSales) || 0));
    const other = field === 'otherSales' ? num : (Number(currentVega.otherSales) || 0);

    const updatedVega = {
      ...currentVega,
      [field]: num,
    };

    // Auto calculate cash sales or total sales when fields change
    if (field === 'totalSales') {
      // Toplam Net Satış değiştiğinde Kredi Kartı / POS düşülüp Nakit Satış otomatik hesaplanır
      updatedVega.cashSales = Math.max(0, num - effectiveCC - other);
    } else if (field === 'creditCardSales') {
      const total = Number(currentVega.totalSales) || 0;
      if (total > 0) {
        updatedVega.cashSales = Math.max(0, total - num - other);
      } else {
        updatedVega.totalSales = (Number(currentVega.cashSales) || 0) + num + other;
      }
    } else if (field === 'cashSales') {
      updatedVega.totalSales = num + effectiveCC + other;
    } else if (field === 'otherSales') {
      const total = Number(currentVega.totalSales) || 0;
      if (total > 0) {
        updatedVega.cashSales = Math.max(0, total - effectiveCC - num);
      }
    }

    const calculatedCashSales = updatedVega.cashSales ?? (Math.max(0, (Number(updatedVega.totalSales) || 0) - effectiveCC - other));
    const openingCash = Number(currentEntry.openingCash) || 0;
    const autoRemainingCash = openingCash + calculatedCashSales - reg.totalCashOutflow;

    onUpdateEntry({
      ...currentEntry,
      vegaReport: updatedVega,
      actualCashInHand: autoRemainingCash,
      updatedAt: new Date().toISOString(),
    });
  };

  // POS Z report list updater
  const handlePosChange = (index: number, field: keyof PosZReportItem, val: any) => {
    const updatedPos = [...currentEntry.posReports];
    updatedPos[index] = {
      ...updatedPos[index],
      [field]: field === 'creditCardTotal' || field === 'refundTotal' || field === 'slipCount' ? parseNumberInput(val) : val,
    };

    // Calculate total of all POS credit cards
    const newPosTotal = updatedPos.reduce((sum, item) => sum + (Number(item.creditCardTotal) || 0), 0);
    const totalSales = Number(currentEntry.vegaReport.totalSales) || 0;
    const otherSales = Number(currentEntry.vegaReport.otherSales) || 0;
    
    // Auto-calculate Cash Sales: Total Sales (Ciro) - POS Total - Other Sales
    const autoCashSales = Math.max(0, totalSales - newPosTotal - otherSales);

    // Auto-calculate expected remaining cash in hand
    const openingCash = Number(currentEntry.openingCash) || 0;
    const autoRemainingCash = openingCash + autoCashSales - reg.totalCashOutflow;

    onUpdateEntry({
      ...currentEntry,
      posReports: updatedPos,
      vegaReport: {
        ...currentEntry.vegaReport,
        creditCardSales: newPosTotal,
        cashSales: autoCashSales,
      },
      actualCashInHand: autoRemainingCash,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddPosDevice = () => {
    const newPosItem: PosZReportItem = {
      id: `pos-rep-${Date.now()}`,
      posDeviceId: `custom-pos-${Date.now()}`,
      posDeviceName: `POS ${currentEntry.posReports.length + 1} (Ek Cihaz)`,
      bankName: 'Banka POS',
      zNumber: '',
      creditCardTotal: 0,
      slipCount: 0,
    };
    onUpdateEntry({
      ...currentEntry,
      posReports: [...currentEntry.posReports, newPosItem],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRemovePos = (index: number) => {
    const updatedPos = currentEntry.posReports.filter((_, i) => i !== index);
    const newPosTotal = updatedPos.reduce((sum, item) => sum + (Number(item.creditCardTotal) || 0), 0);
    const totalSales = Number(currentEntry.vegaReport.totalSales) || 0;
    const otherSales = Number(currentEntry.vegaReport.otherSales) || 0;
    const autoCashSales = Math.max(0, totalSales - newPosTotal - otherSales);
    const openingCash = Number(currentEntry.openingCash) || 0;
    const autoRemainingCash = openingCash + autoCashSales - reg.totalCashOutflow;

    onUpdateEntry({
      ...currentEntry,
      posReports: updatedPos,
      vegaReport: {
        ...currentEntry.vegaReport,
        creditCardSales: newPosTotal,
        cashSales: autoCashSales,
      },
      actualCashInHand: autoRemainingCash,
      updatedAt: new Date().toISOString(),
    });
  };

  // Cash withdrawal updater
  const handleAddWithdrawal = () => {
    const newWithdrawal: CashWithdrawalItem = {
      id: `cw-${Date.now()}`,
      description: 'Bankaya Yatırılan Nakit',
      amount: 0,
      target: 'Banka Hesabına Yatırılan',
    };
    onUpdateEntry({
      ...currentEntry,
      cashWithdrawals: [...(currentEntry.cashWithdrawals || []), newWithdrawal],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateWithdrawal = (index: number, field: keyof CashWithdrawalItem, val: any) => {
    const items = [...(currentEntry.cashWithdrawals || [])];
    items[index] = {
      ...items[index],
      [field]: field === 'amount' ? parseNumberInput(val) : val,
    };
    onUpdateEntry({
      ...currentEntry,
      cashWithdrawals: items,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRemoveWithdrawal = (index: number) => {
    const items = (currentEntry.cashWithdrawals || []).filter((_, i) => i !== index);
    onUpdateEntry({
      ...currentEntry,
      cashWithdrawals: items,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. TOP HEADER & DIRECT PDF DROP ZONE */}
      <div className="bg-[#161b22] p-4 sm:p-5 rounded-xl border border-[#30363d] shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-orange-500 uppercase tracking-wider mb-0.5 font-mono">
              <Wallet className="w-4 h-4" />
              <span>GÜNLÜK KASA & PDF GRUP RAPORU YÖNETİMİ</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {formatDateTR(currentEntry.date)} Kasa & Hasılat Girişi
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Grup raporunu PDF olarak yükleyin; Z raporları ve giderler düşülerek kalan nakit otomatik hesaplansın.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => directPdfInputRef.current?.click()}
              className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-md transition cursor-pointer font-mono"
            >
              <FileText className="w-4 h-4" />
              <span>PDF Raporu Yükle</span>
            </button>

            <button
              onClick={handleImportClick}
              className="flex items-center space-x-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-semibold px-3 py-2 rounded-lg border border-[#30363d] transition cursor-pointer font-mono"
            >
              <Upload className="w-3.5 h-3.5 text-orange-400" />
              <span>Excel / Metin</span>
            </button>

            <button
              onClick={handleSave}
              className="flex items-center space-x-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition cursor-pointer font-mono"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveSuccess ? 'Kaydedildi ✓' : 'Kaydet'}</span>
            </button>
          </div>
        </div>

        {/* DRAG & DROP QUICK BANNER FOR PDF GROUP REPORT */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleDirectPdfFile(file);
          }}
          onClick={() => directPdfInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 sm:p-5 transition cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isDragOver
              ? 'border-orange-500 bg-orange-500/10'
              : 'border-[#30363d] hover:border-orange-500/50 bg-[#0d1117]'
          }`}
        >
          <input
            ref={directPdfInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleDirectPdfFile(f);
            }}
            className="hidden"
          />

          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex-shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white font-mono">
                  Vega / POS Grup Raporu PDF Dosyasını Buraya Sürükleyin
                </span>
                <span className="text-[10px] bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded border border-orange-500/30">
                  Otomatik Hesaplama
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                PDF dosyasını bırakın; sistem ürün gruplarını okur, Z raporu ve kasa giderlerini düşerek <strong className="text-orange-400 font-semibold">kalan net nakiti</strong> anında çıkartır.
              </p>
            </div>
          </div>

          <div className="flex-shrink-0">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-xs font-mono font-semibold text-gray-300 hover:text-white">
              {isProcessingPdf ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400" />
                  <span>PDF Taranıyor...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-orange-400" />
                  <span>PDF Seç veya Sürükle</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Success Alert */}
        {pdfSuccessMessage && (
          <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{pdfSuccessMessage}</span>
            </div>
            <button
              onClick={() => setPdfSuccessMessage(null)}
              className="text-gray-400 hover:text-white font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 2. PROMINENT AUTOMATIC CASH CALCULATION & STATUS BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono">
        <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl shadow-md">
          <span className="text-[11px] text-gray-400 uppercase font-semibold block">1. Toplam Ciro (PDF / Vega)</span>
          <div className="text-xl font-bold text-white mt-1">
            {formatCurrency(reg.totalSales)}
          </div>
          <span className="text-[10px] text-gray-500 block mt-0.5">Grup raporu toplam hasılatı</span>
        </div>

        <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl shadow-md">
          <span className="text-[11px] text-gray-400 uppercase font-semibold block">2. Kredi Kartı / POS Z Toplamı</span>
          <div className="text-xl font-bold text-sky-400 mt-1">
            {formatCurrency(reg.posTotal > 0 ? reg.posTotal : reg.creditCardSales)}
          </div>
          <span className="text-[10px] text-sky-400/80 block mt-0.5">Terminallerden çekilen tutar</span>
        </div>

        <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl shadow-md">
          <span className="text-[11px] text-gray-400 uppercase font-semibold block">3. Çıkan Kasa Gider & Fatura</span>
          <div className="text-xl font-bold text-rose-400 mt-1">
            -{formatCurrency(reg.totalCashOutflow)}
          </div>
          <span className="text-[10px] text-gray-500 block mt-0.5">Giderler + Fatura nakit çıkışları</span>
        </div>

        <div className="p-4 bg-orange-950/25 border-2 border-orange-500/50 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-orange-400 uppercase font-bold tracking-wider">
              OTOMATİK KALAN NET NAKİT
            </span>
            <button
              onClick={handleSyncToActualCash}
              title="Kalan nakiti fiili kasa sayımı ile eşitle"
              className="text-[10px] bg-orange-600/80 hover:bg-orange-600 text-white font-bold px-2 py-0.5 rounded transition cursor-pointer"
            >
              Eşitle ✓
            </button>
          </div>
          <div className="text-2xl font-bold text-orange-400 mt-1">
            {formatCurrency(reg.expectedCash)}
          </div>
          <span className="text-[10px] text-gray-300 block mt-0.5">
            Devir + Nakit - (Giderler + Fatura)
          </span>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Vega Satışları & Ürün Grupları & POS Z Raporları (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section A: Vega / PDF Satış Raporu */}
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3.5">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm font-mono">
                    Grup Raporu Satışları & Hasılat
                  </h3>
                  <span className="text-xs text-gray-400 font-mono">
                    PDF'ten aktarılan veya otomatik hesaplanan satış dağılımı
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAutoComputeCashFromSales}
                className="text-xs font-mono text-orange-400 hover:text-orange-300 flex items-center space-x-1 border border-orange-500/30 px-2.5 py-1 rounded bg-orange-500/10 cursor-pointer"
                title="Cirodan kredi kartı ve diğer satışları düşerek nakit hasılatı otomatik hesaplar"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Nakit = Ciro - POS</span>
              </button>
            </div>

            {/* Top breakdown formula: Brüt - İskonto = Net Ciro */}
            {(currentEntry.vegaReport.grossProductSales || currentEntry.vegaReport.discountAmount || currentEntry.vegaReport.discountTotal) ? (
              <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs">
                <div className="flex justify-between sm:block">
                  <span className="text-gray-400 text-[10px] uppercase block">Brüt Ürün Satışı:</span>
                  <span className="font-bold text-white text-sm">
                    {formatCurrency(currentEntry.vegaReport.grossProductSales || currentEntry.vegaReport.totalSales)}
                  </span>
                </div>

                <div className="flex justify-between sm:block">
                  <span className="text-rose-400 text-[10px] uppercase font-bold block">(-) Düşülen İskonto:</span>
                  <span className="font-bold text-rose-400 text-sm">
                    -{formatCurrency(currentEntry.vegaReport.discountTotal || currentEntry.vegaReport.discountAmount || 0)}
                  </span>
                </div>

                <div className="flex justify-between sm:block">
                  <span className="text-emerald-400 text-[10px] uppercase font-bold block">(=) Net Genel Kasa:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {formatCurrency(currentEntry.vegaReport.totalSales)}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Toplam Satış Ciro */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 font-mono">
                  Toplam Net Satış (Ciro) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={currentEntry.vegaReport.totalSales || ''}
                    onChange={(e) => handleVegaChange('totalSales', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm font-mono font-bold text-white focus:border-orange-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs text-gray-500 font-bold font-mono">₺</span>
                </div>
              </div>

              {/* Credit Card Sales */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 font-mono">
                  Kredi Kartı Satış *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={currentEntry.vegaReport.creditCardSales || ''}
                    onChange={(e) => handleVegaChange('creditCardSales', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm font-mono font-bold text-sky-400 focus:border-sky-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs text-sky-400 font-bold font-mono">₺</span>
                </div>
              </div>

              {/* Cash Sales (Auto inferred or manual) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-300 font-mono">
                    Nakit Satış Hasılatı
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono">Otomatik</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={currentEntry.vegaReport.cashSales || ''}
                    onChange={(e) => handleVegaChange('cashSales', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm font-mono font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs text-emerald-400 font-bold font-mono">₺</span>
                </div>
              </div>
            </div>

            {/* Live Formula Banner: Net Satış - Kredi Ödemeleri = Kalan Nakit Hasılat */}
            <div className="p-3 bg-[#0d1117] rounded-xl border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-start sm:items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-gray-200 font-bold flex items-center space-x-1.5">
                    <span>Kredi Düşüldükten Sonra Kalan Nakit Hasılat:</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {formatCurrency(reg.cashSales)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Net Ciro ({formatCurrency(reg.totalSales)}) - Kredi Kartı/POS ({formatCurrency(reg.posTotal > 0 ? reg.posTotal : reg.creditCardSales)})
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0 bg-[#161b22] px-3 py-1.5 rounded-lg border border-orange-500/30">
                <span className="text-[11px] text-gray-400">Kalan Net Kasa:</span>
                <span className="text-orange-400 font-bold text-sm">
                  {formatCurrency(reg.expectedCash)}
                </span>
              </div>
            </div>

            {/* Extracted Product Groups Accordion View */}
            {currentEntry.vegaGroups && currentEntry.vegaGroups.length > 0 && (
              <div className="pt-4 border-t border-[#30363d] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-200 flex items-center space-x-1.5">
                      <Layers className="w-4 h-4 text-orange-400" />
                      <span>Ürün Grupları & Satış Kalemleri ({currentEntry.vegaGroups.length} Grup):</span>
                    </span>
                    <span className="text-[11px] text-gray-400">
                      (Açmak/kapatmak için kategoriye tıklayın)
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={expandAllVegaGroups}
                      className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-[11px] rounded border border-[#30363d] transition cursor-pointer"
                    >
                      Tümünü Aç
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllVegaGroups}
                      className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-[11px] rounded border border-[#30363d] transition cursor-pointer"
                    >
                      Tümünü Kapat
                    </button>
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => onNavigate('groups')}
                        className="text-orange-400 hover:text-orange-300 underline font-semibold text-[11px] ml-1 cursor-pointer"
                      >
                        Tam Rapor Ekranı →
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 font-mono">
                  {currentEntry.vegaGroups.map((grp, idx) => {
                    const isExpanded = !!expandedVegaGroups[grp.id];
                    const items = grp.items || [];
                    const totalQty = items.length > 0
                      ? items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)
                      : (Number(grp.itemCount) || 0);
                    const totalAmount = items.length > 0
                      ? (items.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0) || (Number(grp.amount) || 0))
                      : (Number(grp.amount) || 0);

                    return (
                      <div
                        key={grp.id || idx}
                        className="bg-[#0d1117] rounded-lg border border-[#30363d] overflow-hidden transition-all duration-200"
                      >
                        {/* Group Header Row - Clickable */}
                        <div
                          onClick={() => toggleVegaGroup(grp.id)}
                          className={`p-3 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition select-none ${
                            isExpanded ? 'bg-[#1c2128] border-b border-[#30363d]' : 'hover:bg-[#161b22]'
                          }`}
                        >
                          {/* Group Name & Badge */}
                          <div className="flex items-center space-x-2.5">
                            <span className="text-gray-400 flex items-center justify-center">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-orange-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                              )}
                            </span>
                            <span className="text-white font-bold text-xs uppercase tracking-wider">
                              {grp.name}
                            </span>
                            <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded font-semibold">
                              {items.length > 0 ? `${items.length} Kalem` : `${totalQty} Adet`}
                            </span>
                          </div>

                          {/* Group Summary: Total Sold Quantity & Total Sales Amount */}
                          <div className="flex items-center space-x-3 text-xs pl-6 sm:pl-0">
                            <div className="flex items-center space-x-1.5 bg-[#161b22] px-2.5 py-1 rounded border border-[#30363d]">
                              <span className="text-gray-400 text-[11px]">Toplam Satış:</span>
                              <span className="text-sky-400 font-bold">{totalQty} Adet</span>
                            </div>

                            <div className="flex items-center space-x-1.5 bg-[#161b22] px-2.5 py-1 rounded border border-[#30363d]">
                              <span className="text-gray-400 text-[11px]">Toplam Tutar:</span>
                              <span className="text-emerald-400 font-bold">{formatCurrency(totalAmount)}</span>
                            </div>

                            {grp.percentage ? (
                              <span className="text-[11px] text-orange-400 font-semibold hidden md:inline-block">
                                %{grp.percentage} Pay
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Collapsible Sub-Items Table */}
                        {isExpanded && (
                          <div className="p-3 bg-[#0d1117] text-xs space-y-2">
                            {items.length === 0 ? (
                              <div className="text-center py-2.5 text-gray-500 text-[11px]">
                                Bu grupta listelenmiş alt ürün bulunmuyor. Toplam satış adedi: <strong>{totalQty} Adet</strong>, Tutar: <strong>{formatCurrency(totalAmount)}</strong>
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="text-gray-500 border-b border-[#30363d]/80 pb-1.5 text-[10px] uppercase font-semibold">
                                      <th className="py-1.5 px-2">#</th>
                                      <th className="py-1.5 px-2">Satılan Ürün</th>
                                      <th className="py-1.5 px-2 text-right">Satılan Adet</th>
                                      <th className="py-1.5 px-2 text-right">Birim Fiyat</th>
                                      <th className="py-1.5 px-2 text-right">Toplam Tutar</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#30363d]/40">
                                    {items.map((item, itemIdx) => (
                                      <tr key={item.id || itemIdx} className="hover:bg-[#161b22]/60 transition">
                                        <td className="py-1.5 px-2 text-gray-500 text-[11px]">
                                          {itemIdx + 1}
                                        </td>
                                        <td className="py-1.5 px-2 font-medium text-gray-200">
                                          {item.name}
                                        </td>
                                        <td className="py-1.5 px-2 text-right font-bold text-sky-400">
                                          {item.quantity} Ad.
                                        </td>
                                        <td className="py-1.5 px-2 text-right text-gray-300 font-mono">
                                          {formatCurrency(item.unitPrice)}
                                        </td>
                                        <td className="py-1.5 px-2 text-right font-bold text-emerald-400 font-mono">
                                          {formatCurrency(item.totalPrice)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Subtotal Summary Footer for the Group */}
                            <div className="pt-2 border-t border-[#30363d] flex items-center justify-between text-[11px] text-gray-400">
                              <span><strong>{grp.name}</strong> Alt Kalemleri ({items.length} Çeşit):</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-sky-400 font-semibold">{totalQty} Adet</span>
                                <span>•</span>
                                <span className="text-emerald-400 font-bold text-xs">{formatCurrency(totalAmount)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Overall Vega Groups & Products Total Summary Bar */}
                {(() => {
                  const allGroupsTotalQty = currentEntry.vegaGroups.reduce(
                    (sum, g) =>
                      sum +
                      (g.items && g.items.length > 0
                        ? g.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)
                        : Number(g.itemCount) || 0),
                    0
                  );
                  const allGroupsTotalAmount = currentEntry.vegaGroups.reduce(
                    (sum, g) =>
                      sum +
                      (g.items && g.items.length > 0
                        ? g.items.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0)
                        : Number(g.amount) || 0),
                    0
                  );
                  const allGroupsItemsCount = currentEntry.vegaGroups.reduce(
                    (sum, g) => sum + (g.items ? g.items.length : 0),
                    0
                  );
                  const discountVal =
                    currentEntry.vegaReport.discountTotal || currentEntry.vegaReport.discountAmount || 0;
                  const netVal = currentEntry.vegaReport.totalSales || Math.max(0, allGroupsTotalAmount - discountVal);

                  return (
                    <div className="mt-3 p-3.5 bg-[#161b22] rounded-lg border border-orange-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono shadow-md">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
                        <span className="text-gray-200 font-bold uppercase tracking-wider">
                          Tüm Gruplar Toplamı ({currentEntry.vegaGroups.length} Grup
                          {allGroupsItemsCount > 0 ? `, ${allGroupsItemsCount} Kalem` : ''}):
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center space-x-1.5 bg-[#0d1117] px-2.5 py-1 rounded border border-[#30363d]">
                          <span className="text-gray-400 text-[11px]">Toplam Satılan:</span>
                          <span className="text-sky-400 font-bold">{allGroupsTotalQty} Adet</span>
                        </div>

                        <div className="flex items-center space-x-1.5 bg-[#0d1117] px-2.5 py-1 rounded border border-[#30363d]">
                          <span className="text-gray-400 text-[11px]">Brüt Ürün Cirosu:</span>
                          <span className="text-white font-bold">{formatCurrency(allGroupsTotalAmount)}</span>
                        </div>

                        {discountVal > 0 && (
                          <div className="flex items-center space-x-1.5 bg-rose-950/30 px-2.5 py-1 rounded border border-rose-500/30">
                            <span className="text-rose-400 text-[11px]">İskonto:</span>
                            <span className="text-rose-400 font-bold">-{formatCurrency(discountVal)}</span>
                          </div>
                        )}

                        <div className="flex items-center space-x-1.5 bg-emerald-950/30 px-2.5 py-1 rounded border border-emerald-500/40">
                          <span className="text-emerald-400 text-[11px]">Net Genel Kasa:</span>
                          <span className="text-emerald-400 font-bold text-sm">{formatCurrency(netVal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Section B: POS Cihazları Z Raporları */}
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3.5 mb-4">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm font-mono">
                    POS Cihazları Z Raporları
                  </h3>
                  <span className="text-xs text-gray-400 font-mono">
                    Tüm banka terminallerinin gün sonu Z raporu tutarları
                  </span>
                </div>
              </div>

              <button
                onClick={handleAddPosDevice}
                className="flex items-center space-x-1 text-xs bg-[#21262d] hover:bg-[#30363d] text-sky-400 font-semibold px-2.5 py-1.5 rounded-lg border border-[#30363d] transition cursor-pointer font-mono"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ POS Ekle</span>
              </button>
            </div>

            <div className="space-y-3">
              {currentEntry.posReports.map((pos, index) => (
                <div
                  key={pos.id || index}
                  className="bg-[#0d1117] p-3.5 rounded-lg border border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono"
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      value={pos.posDeviceName}
                      onChange={(e) => handlePosChange(index, 'posDeviceName', e.target.value)}
                      className="font-bold text-xs text-gray-200 bg-transparent border-b border-transparent hover:border-[#30363d] focus:border-sky-500 focus:outline-none w-full"
                    />
                    <div className="flex items-center space-x-2 mt-1.5">
                      <span className="text-[11px] text-gray-500">Z No:</span>
                      <input
                        type="text"
                        value={pos.zNumber || ''}
                        onChange={(e) => handlePosChange(index, 'zNumber', e.target.value)}
                        placeholder="0084"
                        className="bg-[#161b22] border border-[#30363d] rounded px-2 py-0.5 text-xs text-gray-200 w-20 font-mono focus:border-sky-500 focus:outline-none"
                      />
                      <span className="text-[11px] text-gray-500">Fiş Adet:</span>
                      <input
                        type="number"
                        value={pos.slipCount || ''}
                        onChange={(e) => handlePosChange(index, 'slipCount', e.target.value)}
                        placeholder="0"
                        className="bg-[#161b22] border border-[#30363d] rounded px-2 py-0.5 text-xs text-gray-200 w-16 font-mono focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="relative w-36">
                      <input
                        type="number"
                        step="0.01"
                        value={pos.creditCardTotal || ''}
                        onChange={(e) => handlePosChange(index, 'creditCardTotal', e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-sky-400 text-right pr-6 focus:border-sky-500 focus:outline-none"
                      />
                      <span className="absolute right-2 top-2 text-xs text-sky-400 font-bold font-mono">₺</span>
                    </div>

                    {currentEntry.posReports.length > 1 && (
                      <button
                        onClick={() => handleRemovePos(index)}
                        className="p-1.5 text-gray-500 hover:text-rose-400 rounded transition cursor-pointer"
                        title="POS Kaydını Kaldır"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* POS Total Summary Bar */}
            <div className="mt-4 pt-3 border-t border-[#30363d] flex items-center justify-between font-mono">
              <span className="text-xs font-semibold text-gray-400">
                TOPLAM POS Z RAPORLARI ({currentEntry.posReports.length} Cihaz):
              </span>
              <strong className="text-lg font-bold text-sky-400">
                {formatCurrency(reg.posTotal)}
              </strong>
            </div>
          </div>
        </div>

        {/* Right Column: Günlük Nakit Kasa Hesabı & Kalan Nakit (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3.5">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm font-mono">
                    Otomatik Kasa Hesabı
                  </h3>
                  <span className="text-xs text-gray-400 font-mono">
                    Devir + Nakit Gelir - (Giderler + Fatura)
                  </span>
                </div>
              </div>
            </div>

            {/* Step-by-Step Flow */}
            <div className="space-y-3 text-xs font-mono">
              {/* 1. Opening Cash */}
              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] flex items-center justify-between">
                <div>
                  <span className="font-semibold text-gray-300">
                    Önceki Günden Devir Kasa
                  </span>
                  <p className="text-[10px] text-gray-500">Güne başlanan nakit</p>
                </div>
                <div className="relative w-28">
                  <input
                    type="number"
                    step="0.01"
                    value={currentEntry.openingCash || ''}
                    onChange={(e) =>
                      onUpdateEntry({
                        ...currentEntry,
                        openingCash: parseNumberInput(e.target.value),
                        updatedAt: new Date().toISOString(),
                      })
                    }
                    placeholder="0.00"
                    className="w-full bg-[#161b22] border border-[#30363d] rounded px-2.5 py-1 text-xs font-mono font-bold text-right pr-5 text-white focus:border-orange-500 focus:outline-none"
                  />
                  <span className="absolute right-2 top-1.5 text-gray-500 font-bold">₺</span>
                </div>
              </div>

              {/* 2. Cash Sales from Report */}
              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] flex items-center justify-between">
                <div>
                  <span className="font-semibold text-emerald-400">
                    (+) Günlük Nakit Satış Hasılatı
                  </span>
                  <p className="text-[10px] text-gray-500">Grup Raporu Nakit Geliri</p>
                </div>
                <span className="text-sm font-bold text-emerald-400">
                  +{formatCurrency(reg.cashSales)}
                </span>
              </div>

              {/* 3. Cash Expenses */}
              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-semibold text-amber-400">
                      (-) Kasadan Ödenen Giderler
                    </span>
                    {onOpenNewExpense && (
                      <button
                        onClick={onOpenNewExpense}
                        className="text-[10px] text-amber-400/80 hover:text-amber-300 underline"
                      >
                        +Ekle
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Manav, personel avansı, temizlik vb.
                  </p>
                </div>
                <span className="text-sm font-bold text-amber-400">
                  -{formatCurrency(reg.cashExpenses)}
                </span>
              </div>

              {/* 4. Invoice Cash Payments */}
              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-semibold text-purple-400">
                      (-) Kasadan Fatura Ödemeleri
                    </span>
                    {onOpenNewInvoice && (
                      <button
                        onClick={onOpenNewInvoice}
                        className="text-[10px] text-purple-400/80 hover:text-purple-300 underline"
                      >
                        +Fatura
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Kasadan nakit ödenen tedarikçi faturaları
                  </p>
                </div>
                <span className="text-sm font-bold text-purple-400">
                  -{formatCurrency(reg.invoiceCashPayments)}
                </span>
              </div>

              {/* 5. Bank / Cash Withdrawals */}
              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-300">
                    (-) Kasadan Bankaya Yatırılan / Çekim
                  </span>
                  <button
                    onClick={handleAddWithdrawal}
                    className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold hover:underline cursor-pointer"
                  >
                    + Çekim Ekle
                  </button>
                </div>

                {currentEntry.cashWithdrawals?.map((w, idx) => (
                  <div key={w.id || idx} className="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      value={w.description}
                      onChange={(e) => handleUpdateWithdrawal(idx, 'description', e.target.value)}
                      placeholder="Bankaya Yatırılan"
                      className="bg-[#161b22] border border-[#30363d] rounded px-2 py-0.5 text-xs text-gray-200 flex-1 focus:border-orange-500 focus:outline-none"
                    />
                    <div className="relative w-24">
                      <input
                        type="number"
                        step="0.01"
                        value={w.amount || ''}
                        onChange={(e) => handleUpdateWithdrawal(idx, 'amount', e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-0.5 text-xs font-bold text-right pr-4 text-white focus:border-orange-500 focus:outline-none"
                      />
                      <span className="absolute right-1 top-0.5 text-[10px] text-gray-500">₺</span>
                    </div>
                    <button
                      onClick={() => handleRemoveWithdrawal(idx)}
                      className="text-gray-500 hover:text-rose-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {(!currentEntry.cashWithdrawals || currentEntry.cashWithdrawals.length === 0) && (
                  <p className="text-[10px] text-gray-500">Bankaya yatırılan nakit kaydı yok.</p>
                )}
              </div>

              {/* 6. Expected Cash (OTOMATİK KALAN NAKİT) */}
              <div className="bg-orange-950/30 text-white p-3.5 rounded-xl border border-orange-500/40 flex items-center justify-between">
                <div>
                  <span className="text-xs text-orange-400 font-bold uppercase tracking-wide">
                    (=) BEKLENEN / KALAN NAKİT KASA:
                  </span>
                  <p className="text-[10px] text-gray-400">Giderler düşüldükten sonra kalan tutar</p>
                </div>
                <span className="text-xl font-bold text-orange-400">
                  {formatCurrency(reg.expectedCash)}
                </span>
              </div>

              {/* 7. Actual Counted Cash & Quick Sync Button */}
              <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-white font-mono uppercase">
                    (Fiili) Sayılan Kasa Tutarı *
                  </label>
                  <button
                    type="button"
                    onClick={handleSyncToActualCash}
                    className="text-[11px] font-mono text-orange-400 hover:text-orange-300 font-bold underline cursor-pointer"
                  >
                    Kalan Nakiti Yaz ({formatCurrency(reg.expectedCash)})
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={currentEntry.actualCashInHand || ''}
                    onChange={(e) =>
                      onUpdateEntry({
                        ...currentEntry,
                        actualCashInHand: parseNumberInput(e.target.value),
                        updatedAt: new Date().toISOString(),
                      })
                    }
                    placeholder="Fiziki sayılan kasa..."
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2.5 text-base font-mono font-bold text-white text-right pr-8 focus:border-orange-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-3 text-sm text-orange-500 font-bold font-mono">₺</span>
                </div>
              </div>

              {/* 8. Kasa Denkliği Durumu */}
              <div
                className={`p-3.5 rounded-xl border text-center transition ${
                  reg.isCashBalanced
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-rose-950/20 border-rose-500/40 text-rose-400'
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider">
                  {reg.isCashBalanced
                    ? '✓ KASA TAM DENK (FARK YOK)'
                    : reg.cashDifference > 0
                    ? `⚠ KASA FAZLASI: +${formatCurrency(reg.cashDifference)}`
                    : `⚠ KASA AÇIĞI: ${formatCurrency(reg.cashDifference)}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
