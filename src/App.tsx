import React, { useState, useEffect } from 'react';
import {
  loadAppState,
  saveAppState,
  resetToSampleData,
  AppState,
  RestaurantProfile,
} from './utils/storage';
import { DailyEntry, CashExpense, Invoice, PosDevice, ExpenseCategory } from './types';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { DailyCashAndVegaView } from './components/DailyCashAndVegaView';
import { VegaGroupReportView } from './components/VegaGroupReportView';
import { CashExpensesView } from './components/CashExpensesView';
import { InvoicesView } from './components/InvoicesView';
import { DailyClosingView } from './components/DailyClosingView';
import { MonthlyReportView } from './components/MonthlyReportView';
import { BossReportModal } from './components/BossReportModal';
import { VegaImportModal } from './components/VegaImportModal';
import { SettingsModal } from './components/SettingsModal';
import { SettingsView } from './components/SettingsView';
import { getTodayIsoDate } from './utils/formatters';

export function App() {
  // Main State loaded from localStorage
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'daily' | 'groups' | 'expenses' | 'invoices' | 'closing' | 'monthly' | 'settings'
  >('dashboard');
  
  const [selectedDate, setSelectedDate] = useState<string>(
    () => appState.currentSelectedDate || getTodayIsoDate()
  );

  // Modals state
  const [isBossReportOpen, setIsBossReportOpen] = useState(false);
  const [isVegaImportOpen, setIsVegaImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Persist state to localStorage on update
  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  // Ensure current entry exists for selected date
  const getCurrentEntry = (date: string): DailyEntry => {
    if (appState.entries[date]) {
      return appState.entries[date];
    }

    // Default clean entry if date is new
    return {
      id: `entry-${date}`,
      date,
      status: 'draft',
      openingCash: 0,
      actualCashInHand: 0,
      cashWithdrawals: [],
      notes: '',
      vegaReport: {
        totalSales: 0,
        cashSales: 0,
        creditCardSales: 0,
        otherSales: 0,
        cancelledAmount: 0,
        complimentaryAmount: 0,
        discountAmount: 0,
        tableCount: 0,
        guestCount: 0,
      },
      posReports: appState.posDevices.map((pos) => ({
        id: `pos-${pos.id}-${date}`,
        posDeviceId: pos.id,
        posDeviceName: pos.name,
        bankName: pos.bankName,
        creditCardTotal: 0,
      })),
      vegaGroups: [
        { id: '1', name: 'Yiyecek Grubu', amount: 0, percentage: 0 },
        { id: '2', name: 'Sıcak İçecekler', amount: 0, percentage: 0 },
        { id: '3', name: 'Soğuk İçecekler & Meşrubat', amount: 0, percentage: 0 },
        { id: '4', name: 'Tatlı & Dondurma', amount: 0, percentage: 0 },
        { id: '5', name: 'Alkollü İçecekler', amount: 0, percentage: 0 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const currentEntry = getCurrentEntry(selectedDate);

  // Handlers for Entry Updates
  const handleUpdateEntry = (updated: DailyEntry) => {
    setAppState((prev) => ({
      ...prev,
      entries: {
        ...prev.entries,
        [updated.date]: updated,
      },
    }));
  };

  // Expenses Handlers
  const handleAddExpense = (expenseData: Omit<CashExpense, 'id' | 'createdAt'>) => {
    const newExpense: CashExpense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAppState((prev) => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
    }));
  };

  const handleUpdateExpense = (updated: CashExpense) => {
    setAppState((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) => (e.id === updated.id ? updated : e)),
    }));
  };

  const handleDeleteExpense = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
  };

  // Invoices Handlers
  const handleAddInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt'>) => {
    const newInvoice: Invoice = {
      ...invoiceData,
      id: `inv-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAppState((prev) => ({
      ...prev,
      invoices: [newInvoice, ...prev.invoices],
    }));
  };

  const handleUpdateInvoice = (updated: Invoice) => {
    setAppState((prev) => ({
      ...prev,
      invoices: prev.invoices.map((i) => (i.id === updated.id ? updated : i)),
    }));
  };

  const handleDeleteInvoice = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      invoices: prev.invoices.filter((i) => i.id !== id),
    }));
  };

  const handleAddPayment = (invoiceId: string, paymentData: any) => {
    setAppState((prev) => {
      const updatedInvoices = prev.invoices.map((inv) => {
        if (inv.id !== invoiceId) return inv;

        const newPayment = {
          ...paymentData,
          id: `pmt-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };

        const newPayments = [...inv.payments, newPayment];
        const totalPaid = newPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        
        let newStatus: Invoice['paymentStatus'] = 'unpaid';
        if (totalPaid >= inv.totalAmount) newStatus = 'paid';
        else if (totalPaid > 0) newStatus = 'partial';

        return {
          ...inv,
          payments: newPayments,
          paymentStatus: newStatus,
        };
      });

      return {
        ...prev,
        invoices: updatedInvoices,
      };
    });
  };

  // Settings & Profile Handlers
  const handleUpdatePosDevices = (devices: PosDevice[]) => {
    setAppState((prev) => ({ ...prev, posDevices: devices }));
  };

  const handleUpdateCategories = (categories: ExpenseCategory[]) => {
    setAppState((prev) => ({ ...prev, categories }));
  };

  const handleUpdateProfile = (profile: RestaurantProfile) => {
    setAppState((prev) => ({ ...prev, profile }));
  };

  const handleResetData = () => {
    const sample = resetToSampleData();
    setAppState(sample);
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-gray-200 flex flex-col font-sans antialiased selection:bg-orange-500 selection:text-white">
      {/* Top Main Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedDate={selectedDate}
        setSelectedDate={(date) => {
          setSelectedDate(date);
          setAppState((prev) => ({ ...prev, currentSelectedDate: date }));
        }}
        onOpenBossReport={() => setIsBossReportOpen(true)}
        onOpenVegaImport={() => setIsVegaImportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        profile={appState.profile}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            selectedDate={selectedDate}
            currentEntry={currentEntry}
            expenses={appState.expenses}
            invoices={appState.invoices}
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenBossReport={() => setIsBossReportOpen(true)}
            onOpenVegaImport={() => setIsVegaImportOpen(true)}
          />
        )}

        {activeTab === 'daily' && (
          <DailyCashAndVegaView
            selectedDate={selectedDate}
            currentEntry={currentEntry}
            onUpdateEntry={handleUpdateEntry}
            expenses={appState.expenses}
            invoices={appState.invoices}
            posDevices={appState.posDevices}
            onOpenVegaImport={() => setIsVegaImportOpen(true)}
            onOpenBossReport={() => setIsBossReportOpen(true)}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'groups' && (
          <VegaGroupReportView
            currentEntry={currentEntry}
            onUpdateEntry={handleUpdateEntry}
            onOpenVegaImport={() => setIsVegaImportOpen(true)}
          />
        )}

        {activeTab === 'expenses' && (
          <CashExpensesView
            selectedDate={selectedDate}
            expenses={appState.expenses}
            categories={appState.categories}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoicesView
            selectedDate={selectedDate}
            invoices={appState.invoices}
            onAddInvoice={handleAddInvoice}
            onUpdateInvoice={handleUpdateInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onAddPayment={handleAddPayment}
          />
        )}

        {activeTab === 'closing' && (
          <DailyClosingView
            currentEntry={currentEntry}
            onUpdateEntry={handleUpdateEntry}
            expenses={appState.expenses}
            invoices={appState.invoices}
            onOpenBossReport={() => setIsBossReportOpen(true)}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlyReportView
            entries={appState.entries}
            expenses={appState.expenses}
            invoices={appState.invoices}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setActiveTab('daily');
            }}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            posDevices={appState.posDevices}
            onUpdatePosDevices={handleUpdatePosDevices}
            categories={appState.categories}
            onUpdateCategories={handleUpdateCategories}
            profile={appState.profile}
            onUpdateProfile={handleUpdateProfile}
            onResetData={handleResetData}
          />
        )}
      </main>

      {/* Footer info */}
      <footer className="border-t border-[#30363d] bg-[#0d1117] py-3.5 px-4 text-center text-xs text-gray-400 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
            <strong className="text-gray-200">
              {appState.profile.companyTitle || appState.profile.name}
            </strong>
            {appState.profile.taxNumber && (
              <span>• VKN: {appState.profile.taxNumber}</span>
            )}
          </div>
          <div>
            Nakit Akışı Formülü: <span className="font-mono font-semibold text-orange-400">Devir + Gelirler - Giderler = Gün Sonu Kasa</span>
          </div>
        </div>
      </footer>

      {/* Boss Report Modal */}
      <BossReportModal
        isOpen={isBossReportOpen}
        onClose={() => setIsBossReportOpen(false)}
        entry={currentEntry}
        expenses={appState.expenses}
        invoices={appState.invoices}
        profile={appState.profile}
      />

      {/* Vega Report Import Modal */}
      <VegaImportModal
        isOpen={isVegaImportOpen}
        onClose={() => setIsVegaImportOpen(false)}
        currentEntry={currentEntry}
        onApplyImport={handleUpdateEntry}
        expenses={appState.expenses}
        invoices={appState.invoices}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        posDevices={appState.posDevices}
        onUpdatePosDevices={handleUpdatePosDevices}
        categories={appState.categories}
        onUpdateCategories={handleUpdateCategories}
        profile={appState.profile}
        onUpdateProfile={handleUpdateProfile}
        onResetData={handleResetData}
      />
    </div>
  );
}

export default App;
