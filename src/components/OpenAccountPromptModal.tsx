import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  UserPlus,
  X,
  Check,
  AlertCircle,
  Phone,
  Building,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { OpenAccountCustomer, OpenAccountTransaction } from '../types';
import { formatCurrency, parseNumberInput } from '../utils/formatters';

interface OpenAccountPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  detectedAmount: number;
  customers: OpenAccountCustomer[];
  onSaveCustomer: (customer: OpenAccountCustomer) => void;
  onSaveTransaction: (tx: OpenAccountTransaction) => void;
  onSkip?: () => void;
}

export const OpenAccountPromptModal: React.FC<OpenAccountPromptModalProps> = ({
  isOpen,
  onClose,
  date,
  detectedAmount,
  customers = [],
  onSaveCustomer,
  onSaveTransaction,
  onSkip,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('new');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerCompany, setNewCustomerCompany] = useState('');
  const [amount, setAmount] = useState<number>(detectedAmount || 0);
  const [description, setDescription] = useState('');
  const [tableNo, setTableNo] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sync state when modal opens or detectedAmount changes
  useEffect(() => {
    if (isOpen) {
      setAmount(detectedAmount || 0);
      setDescription(`${date} Tarihli Vega Açık Hesap Satışı`);
      setError(null);
      if (customers.length > 0) {
        setSelectedCustomerId(customers[0].id);
      } else {
        setSelectedCustomerId('new');
      }
    }
  }, [isOpen, detectedAmount, date, customers]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validAmount = Number(amount) || 0;
    if (validAmount <= 0) {
      setError('Lütfen geçerli bir açık hesap tutarı giriniz.');
      return;
    }

    let customerId = selectedCustomerId;
    let customerName = '';

    if (selectedCustomerId === 'new') {
      const trimmedName = newCustomerName.trim();
      if (!trimmedName) {
        setError('Lütfen yeni müşteri / kişi adını giriniz.');
        return;
      }

      const newCust: OpenAccountCustomer = {
        id: `cust-${Date.now()}`,
        name: trimmedName,
        phone: newCustomerPhone.trim() || undefined,
        company: newCustomerCompany.trim() || undefined,
        notes: notes.trim() || undefined,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onSaveCustomer(newCust);
      customerId = newCust.id;
      customerName = newCust.name;
    } else {
      const existing = customers.find((c) => c.id === selectedCustomerId);
      if (!existing) {
        setError('Seçilen müşteri bulunamadı.');
        return;
      }
      customerName = existing.name;
    }

    // Create Open Account Debt Transaction
    const newTx: OpenAccountTransaction = {
      id: `tx-${Date.now()}`,
      customerId,
      customerName,
      date: date || new Date().toISOString().split('T')[0],
      type: 'debt',
      amount: validAmount,
      description: description.trim() || `${date} Vega Açık Hesap Satışı`,
      sourceDailyEntryDate: date,
      notes: tableNo.trim() ? `Masa: ${tableNo.trim()}` : undefined,
      createdAt: new Date().toISOString(),
    };

    onSaveTransaction(newTx);
    onClose();
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto font-sans cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#161b22] rounded-2xl border-2 border-orange-500/40 w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 my-6 cursor-default relative"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#21262d] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center space-x-3 border-b border-[#30363d] pb-3.5">
          <div className="p-3 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-white text-base sm:text-lg">
                Vega Açık Hesap / Cari Eşleme
              </h3>
              <span className="bg-orange-500/20 text-orange-300 text-xs px-2 py-0.5 rounded-md font-mono font-semibold border border-orange-500/30">
                Açık Hesap
              </span>
            </div>
            <p className="text-xs text-gray-300 font-mono mt-0.5">
              Vega raporunda tespit edilen açık hesabı bir kişiye bağlayın.
            </p>
          </div>
        </div>

        {/* Detected Amount Highlight */}
        <div className="p-3.5 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-center justify-between font-mono">
          <div>
            <span className="text-xs text-orange-400 font-bold uppercase block">
              Tespit Edilen Açık Hesap (Cari) Tutarı:
            </span>
            <span className="text-xs text-gray-300">
              {date} tarihli gün sonu raporundan
            </span>
          </div>
          <span className="text-xl font-bold text-orange-400">
            {formatCurrency(detectedAmount)}
          </span>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center space-x-2 font-mono">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-mono">
          {/* Customer Selection Option */}
          <div>
            <label className="block text-gray-300 font-bold mb-1.5 uppercase">
              Kime Borç Kaydedilecek? *
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setSelectedCustomerId('new')}
                className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition ${
                  selectedCustomerId === 'new'
                    ? 'bg-orange-500/20 border-orange-500 text-white font-bold'
                    : 'bg-[#0d1117] border-[#30363d] text-gray-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="truncate">➕ Yeni Kişi / Cari</span>
              </button>

              <button
                type="button"
                disabled={customers.length === 0}
                onClick={() => {
                  if (customers.length > 0) {
                    setSelectedCustomerId(customers[0].id);
                  }
                }}
                className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition ${
                  selectedCustomerId !== 'new'
                    ? 'bg-orange-500/20 border-orange-500 text-white font-bold'
                    : 'bg-[#0d1117] border-[#30363d] text-gray-400 hover:text-white'
                } ${customers.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <UserCheck className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="truncate">
                  {customers.length > 0 ? `Kayıtlı Müşteri (${customers.length})` : 'Kayıtlı Cari Yok'}
                </span>
              </button>
            </div>

            {selectedCustomerId !== 'new' && customers.length > 0 ? (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] focus:border-orange-500 rounded-xl px-3 py-2 text-white text-xs outline-hidden"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} {c.company ? `- ${c.company}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-2 bg-[#0d1117] p-3 rounded-xl border border-[#30363d]">
                <div>
                  <label className="block text-gray-400 text-[11px] mb-1">
                    Kişi / Müşteri / Firma Adı *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="örn: Ahmet Yılmaz, Av. Mehmet Bey, VIP Masa 4"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full bg-[#161b22] border border-[#30363d] focus:border-orange-500 rounded-lg px-3 py-2 text-white text-xs outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-400 text-[11px] mb-1 flex items-center space-x-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <span>Telefon (Opsiyonel)</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="05XX XXX XX XX"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className="w-full bg-[#161b22] border border-[#30363d] focus:border-orange-500 rounded-lg px-3 py-1.5 text-white text-xs outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-[11px] mb-1 flex items-center space-x-1">
                      <Building className="w-3 h-3 text-gray-400" />
                      <span>Firma / Şirket</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: ABC Lojistik"
                      value={newCustomerCompany}
                      onChange={(e) => setNewCustomerCompany(e.target.value)}
                      className="w-full bg-[#161b22] border border-[#30363d] focus:border-orange-500 rounded-lg px-3 py-1.5 text-white text-xs outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Amount & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-gray-300 font-bold mb-1 uppercase">
                Borç Tutarı (TL) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0d1117] border border-orange-500/50 rounded-xl px-3 py-2 text-orange-400 font-bold text-sm text-right outline-hidden"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-bold mb-1 uppercase">
                Masa / Adisyon No
              </label>
              <input
                type="text"
                placeholder="Örn: Masa 12, Adisyon #45"
                value={tableNo}
                onChange={(e) => setTableNo(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] focus:border-orange-500 rounded-xl px-3 py-2 text-white text-xs outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 font-bold mb-1 uppercase">
              Açıklama
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] focus:border-orange-500 rounded-xl px-3 py-2 text-white text-xs outline-hidden"
              placeholder="Açıklama yazınız..."
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#30363d] flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handleSkip}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#30363d] text-gray-400 hover:text-white hover:bg-[#21262d] transition text-xs font-semibold"
            >
              Şimdilik Atla
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition flex items-center justify-center space-x-2 text-xs shadow-lg shadow-orange-500/20"
            >
              <Check className="w-4 h-4" />
              <span>Açık Hesaba Kaydet ({formatCurrency(amount)})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
