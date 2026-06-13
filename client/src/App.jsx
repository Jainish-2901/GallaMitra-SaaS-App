import React, { useState, useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route } from 'react-router-dom';
import { AppContext } from './context/AppContext.jsx';
import { translations } from './utils/translations.js';
import { ownerTabs } from './sidebarConfig.js';

// Route intercepts
import PublicPortal from './pages/PublicPortal.jsx';
import LandingPage from './pages/LandingPage.jsx';
import PendingApprovalView from './pages/PendingApprovalView.jsx';

// Layout Structural Nodes
import Sidebar from './components/layout/Sidebar.jsx';
import TopBar from './components/layout/TopBar.jsx';
import RegisterBusinessModal from './components/layout/RegisterBusinessModal.jsx';

// Owner Tab Pages
import OwnerDashboard from './pages/OwnerDashboard.jsx';
import CustomerManagement from './pages/CustomerManagement.jsx';
import SupplierManagement from './pages/SupplierManagement.jsx';
import SaleLedger from './pages/SaleLedger.jsx';
import PurchaseLedger from './pages/PurchaseLedger.jsx';
import ReportsExport from './pages/ReportsExport.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import UserSettings from './pages/UserSettings.jsx';
import BusinessSettings from './pages/BusinessSettings.jsx';

// Existing modular pages
import InvoiceBuilder from './pages/InvoiceBuilder.jsx';
import DocumentListsView from './pages/DocumentListsView.jsx';
import PaymentReceiptGen from './pages/PaymentReceiptGen.jsx';
import PurchaseBillCreator from './pages/PurchaseBillCreator.jsx';
import TransactionModal from './components/TransactionModal.jsx';

// Icons Bundle
import {
  LayoutDashboard, Users, PlusCircle, UserCheck, Menu, X, Calendar, LogOut, Plus, Store, Clock
} from 'lucide-react';

export default function App() {
  const { activeShop, pendingShop, loading, workspaces, setActiveShop, updateShopSettings, terminateSessionLogout, installApp, isInstallable } = useContext(AppContext);

  // ─── Local State Configurations ──────────────────────────────────────────
  const [activeTab, _setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tab') || 'dashboard';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [businessModalOpen, setBusinessModalOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState({ id: null, name: '', mode: 'customer' });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [liveTime, setLiveTime] = useState(new Date());
  const [wasLoggedIn, setWasLoggedIn] = useState(!!activeShop);

  const setActiveTab = (tabId) => {
    _setActiveTab(tabId);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    window.history.pushState(null, '', url.pathname + url.search);
  };

  useEffect(() => {
    if (activeShop && !wasLoggedIn) {
      setActiveTab('dashboard');
      setWasLoggedIn(true);
    } else if (!activeShop && wasLoggedIn) {
      setWasLoggedIn(false);
    }
  }, [activeShop, wasLoggedIn]);

  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      _setActiveTab(urlParams.get('tab') || 'dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Live Clock effect for mobile nodes
  useEffect(() => {
    const interval = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ─── SaaS Guard Layer: Dynamic Verification ──────────────────────────
  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'more') return;
    if (activeShop && activeShop.allowedTabs && !activeShop.allowedTabs.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, activeShop]);

  // ─── PWA Standalone Redirect Check ───────────────────────────────────────
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const hasMerchantToken = !!localStorage.getItem('gm_shop_token');
  const lastPortalUrl = localStorage.getItem('gm_last_public_portal_url');
  const isAtPortal = window.location.pathname.includes('/public-portal') || window.location.search.includes('type=');

  if (isStandalone && !hasMerchantToken && lastPortalUrl && !isAtPortal) {
    window.location.replace(lastPortalUrl);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-xs font-mono tracking-widest animate-pulse">REDIRECTING TO SECURE PORTAL...</p>
      </div>
    );
  }

  // ─── URL Route Intercepts ───────────────────────────────────────────────
  if (window.location.pathname.startsWith('/s/')) {
    const parts = window.location.pathname.split('/');
    const shortId = parts[parts.length - 1];
    const backendBase = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api').replace('/api', '');
    window.location.href = `${backendBase}/s/${shortId}`;
    return null;
  }

  if (window.location.pathname.includes('/public-portal') || window.location.search.includes('type=')) {
    return <PublicPortal />;
  }

  // ─── Guard Layout: Loading Skeletons ─────────────────────────────────────
  if (loading && !activeShop && !pendingShop) {
    return (
      <Routes>
        <Route path="/privacy" element={<LandingPage />} />
        <Route path="/terms" element={<LandingPage />} />
        <Route path="*" element={
          <div className="h-screen w-full bg-[#F8FAFC] flex flex-col font-sans overflow-hidden">
            <div className="bg-white border-b border-slate-200 h-16 w-full flex items-center justify-between px-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-200 rounded-xl" />
                <div className="h-4 bg-slate-200 rounded w-24" />
              </div>
              <div className="h-8 bg-slate-100 rounded-xl w-64 hidden md:block" />
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-slate-200 rounded-full" />
                <div className="w-20 h-8 bg-slate-200 rounded-xl" />
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="w-64 bg-white border-r border-slate-200 p-4 hidden md:block space-y-4 animate-pulse">
                <div className="h-10 bg-slate-150 rounded-xl" />
                <div className="h-10 bg-slate-100 rounded-xl" />
                <div className="h-10 bg-slate-100 rounded-xl" />
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                <div className="bg-white rounded-2xl p-6 border h-24 animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white border rounded-2xl animate-pulse" />)}
                </div>
              </div>
            </div>
          </div>
        } />
      </Routes>
    );
  }

  if (!activeShop && pendingShop) {
    return (
      <Routes>
        <Route path="/privacy" element={<LandingPage />} />
        <Route path="/terms" element={<LandingPage />} />
        <Route path="*" element={<PendingApprovalView />} />
      </Routes>
    );
  }

  if (!activeShop) {
    return (
      <Routes>
        <Route path="/privacy" element={<LandingPage />} />
        <Route path="/terms" element={<LandingPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    );
  }

  // ─── Global Translation Directives ───────────────────────────────────────
  const activeLang = activeShop.language || 'gu';
  const t = translations[activeLang] || translations.en;

  // ─── Responsive Nav Arrays ──────────────────────────────────────────────
  const mobileNavItems = [
    { id: 'home', label: 'Home', icon: LayoutDashboard, tab: 'dashboard' },
    { id: 'customers', label: 'Customers', icon: Users, tab: 'cust_list' },
    { id: 'invoice', label: 'Invoice', icon: PlusCircle, tab: 'invoice_builder' },
    { id: 'suppliers', label: 'Suppliers', icon: Users, tab: 'supp_list' },
    { id: 'more', label: 'More', icon: Menu, tab: 'more' },
  ];

  // Determine which mobile navigation items to display based on the selected plan
  const allowedTabs = activeShop?.allowedTabs || [];
  const showInvoice = allowedTabs.includes('invoice_builder');
  const filteredMobileNavItems = mobileNavItems.filter(item => {
    if (item.id === 'invoice') {
      return showInvoice; // show invoice tab only if plan permits
    }
    return true; // always show other tabs
  });

  const openTxModal = (id, name, mode) => {
    setSelectedParty({ id, name, mode });
    setModalOpen(true);
  };

  const isMultiBusinessEnabled = activeShop?.allowMultiBusiness || workspaces?.some(w => w.allowMultiBusiness || w.allowmultibusiness);
  // Derive allowed tabs directly from activeShop without separate variable
  const allowedTabsList = ownerTabs.filter(tab => tab.id === 'dashboard' || (activeShop?.allowedTabs || []).includes(tab.id));
  const drawerTabs = allowedTabsList; // Show all allowed tabs in mobile drawer
  const localeStr = activeLang === 'gu' ? 'gu-IN' : activeLang === 'hi' ? 'hi-IN' : 'en-US';

  const handleLangChange = async (e) => {
    await updateShopSettings({ language: e.target.value });
  };

  return (
    <Routes>
      <Route path="/privacy" element={<LandingPage />} />
      <Route path="/terms" element={<LandingPage />} />
      <Route path="*" element={
        <div className="h-screen w-full bg-[#F8FAFC] flex flex-col font-sans overflow-hidden select-none">

          {/* Structural Layout Components */}
          <TopBar activeTab={activeTab} setActiveTab={setActiveTab} setSearchTerm={setSearchTerm} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

          <div className="flex-1 flex overflow-hidden">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} setSearchTerm={setSearchTerm} />

            <main className="flex-1 overflow-y-auto p-4 md:p-7 pb-24 md:pb-8">
              {activeTab === 'dashboard' && <OwnerDashboard setActiveTab={setActiveTab} setSearchTerm={setSearchTerm} />}
              {activeTab === 'cust_list' && <CustomerManagement openTxModal={openTxModal} />}
              {activeTab === 'supp_list' && <SupplierManagement openTxModal={openTxModal} />}
              {activeTab === 'sale_ledger' && <SaleLedger />}
              {activeTab === 'purchase_ledger' && <PurchaseLedger />}
              {activeTab === 'sales_list' && <SalesList t={t} />}
              {activeTab === 'purchase_list' && <PurchaseList t={t} />}
              {activeTab === 'invoice_builder' && <InvoiceBuilder t={t} />}
              {activeTab === 'invoice_list' && <DocumentListsView mode="invoices" t={t} />}
              {activeTab === 'payment_receipt' && <PaymentReceiptGen t={t} />}
              {activeTab === 'receipt_list' && <DocumentListsView mode="receipts" t={t} />}
              {activeTab === 'purchase_bill' && <PurchaseBillCreator t={t} />}
              {activeTab === 'pbill_list' && <DocumentListsView mode="purchase_bills" t={t} />}
              {activeTab === 'reports' && <ReportsExport />}
              {activeTab === 'analytics' && <AnalyticsPage />}
              {activeTab === 'user_settings' && <UserSettings />}
              {activeTab === 'business_settings' && <BusinessSettings />}
              {activeTab === 'more' && <MoreTabsView setActiveTab={setActiveTab} ownerTabs={ownerTabs} allowedTabs={allowedTabs} t={t} />}
            </main>
          </div>

          {/* Mobile Nav Bar */}
          <div className="md:hidden bg-white border-t border-slate-200 h-16 fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 shadow-md">
            {filteredMobileNavItems.map(item => {
              const IconComp = item.icon;
              const isActive = activeTab === item.tab;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.tab); setSearchTerm(''); setIsMobileMenuOpen(false); }}
                  className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-xl transition-all cursor-pointer ${isActive ? 'text-blue-600 bg-blue-50/50 font-bold' : 'text-slate-500 font-semibold'}`}
                >
                  <IconComp size={isActive ? 18 : 16} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                  <span className="text-[9px] truncate max-w-[64px] tracking-tight">{t[item.id] || item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Slide-out Drawer */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden no-print" />
                <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }} className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 shadow-2xl flex flex-col md:hidden no-print">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="bg-slate-50 border p-2 rounded-xl shrink-0">
                        {activeShop?.logoUrl ? <img src={activeShop.logoUrl} alt="Logo" className="w-5 h-5 object-contain rounded" /> : <Store size={18} className="text-blue-600" />}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-black text-slate-900 truncate">{activeShop?.businessName}</h2>
                        <span className="inline-block text-[9px] px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full font-bold uppercase tracking-wider mt-0.5">⚡ {activeShop?.plan}</span>
                      </div>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all shrink-0 cursor-pointer"><X size={16} /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Trial Expiry Countdown Widget for Mobile */}
                    {activeShop?.plan === 'trial' && (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-blue-600 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Free Trial</span>
                          </div>
                          <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-mono">
                            {(() => {
                              const expires = activeShop?.subscriptionExpiresAt;
                              if (!expires) return '15 Days Left';
                              const left = Math.ceil((new Date(expires) - new Date()) / (1000 * 60 * 60 * 24));
                              const days = left > 0 ? left : 0;
                              return `${days} ${days === 1 ? 'day' : 'days'} left`;
                            })()}
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        {(() => {
                          const expires = activeShop?.subscriptionExpiresAt;
                          if (!expires) return null;
                          const left = Math.ceil((new Date(expires) - new Date()) / (1000 * 60 * 60 * 24));
                          const daysLeft = left > 0 ? left : 0;
                          const daysUsed = Math.max(0, Math.min(15, 15 - daysLeft));
                          const percent = Math.round((daysUsed / 15) * 100);
                          return (
                            <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                            </div>
                          );
                        })()}

                        <button
                          onClick={() => {
                            setActiveTab('user_settings');
                            setSearchTerm('');
                            setIsMobileMenuOpen(false);
                          }}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all text-center cursor-pointer"
                        >
                          Upgrade Now
                        </button>
                      </div>
                    )}

                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex justify-between items-center text-xs font-mono text-slate-700">
                      <span className="font-bold flex items-center gap-1.5"><Calendar size={13} className="text-blue-600" /> Date:</span>
                      <span>{liveTime.toLocaleDateString(localeStr, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Select Language</label>
                      <select value={activeLang} onChange={handleLangChange} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black rounded-xl px-3 py-2.5 outline-none cursor-pointer hover:bg-slate-100 transition-colors">
                        <option value="en">English</option>
                        <option value="gu">ગુજરાતી</option>
                        <option value="hi">हिंदी</option>
                      </select>
                    </div>

                    {/* Plan-based sidebar tabs scrollable */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono mb-1.5">Business Menu</span>
                      <nav className="space-y-1">
                        {drawerTabs.map(tab => {
                          const TabIcon = tab.icon;
                          const isActive = activeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => { setActiveTab(tab.id); setSearchTerm(''); setIsMobileMenuOpen(false); }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-[#0F172A] text-white shadow-sm'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              <TabIcon size={14} className={isActive ? 'text-blue-400' : 'text-slate-400'} />
                              <span className="truncate">{t[tab.id] || tab.label}</span>
                            </button>
                          );
                        })}
                      </nav>
                    </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50/65 space-y-2">
                    {isInstallable && (
                      <button onClick={() => { installApp(); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs shadow-sm cursor-pointer">📲 Download App</button>
                    )}
                    {isMultiBusinessEnabled && (
                      <button onClick={() => { setBusinessModalOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2 rounded-xl text-xs cursor-pointer"><Plus size={13} /> {t.addNewBusiness || "Add New Business"}</button>
                    )}
                    <button onClick={() => { terminateSessionLogout(); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 font-bold py-2.5 rounded-xl text-xs cursor-pointer"><LogOut size={13} /> {t.closeSession}</button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <TransactionModal isOpen={modalOpen} onClose={() => setModalOpen(false)} entityId={selectedParty.id} entityName={selectedParty.name} mode={selectedParty.mode} t={t} />
          <RegisterBusinessModal isOpen={businessModalOpen} onClose={() => setBusinessModalOpen(false)} />
        </div>
      } />
    </Routes>
  );
}

// ─── Inline components — tables ──────────────────────────────────────────
import { useContext as useCtx } from 'react';
import { FileSpreadsheet, Search } from 'lucide-react';

function SalesList({ t }) {
  const { invoices, customers } = useCtx(AppContext);
  const [search, setSearch] = useState('');

  const items = [];
  invoices.forEach(inv => {
    const cust = customers.find(c => c.id === inv.customerId);
    let arr = [];
    try { arr = typeof inv.itemsJson === 'string' ? JSON.parse(inv.itemsJson) : inv.itemsJson; } catch { }
    if (Array.isArray(arr)) arr.forEach(it => items.push({
      date: inv.date, invoiceNo: inv.invoiceNo, customerName: cust?.name || 'Walk-in', itemName: it.name, qty: it.qty, rate: it.rate, total: parseFloat(it.qty) * parseFloat(it.rate)
    }));
  });
  const filtered = items.filter(i => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    
    const dateObj = new Date(i.date);
    const dateStrDefault = dateObj.toLocaleDateString().toLowerCase();
    const dateStrIN = dateObj.toLocaleDateString('en-IN').toLowerCase();
    const dateStrMonths = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase();
    const dateStrFullMonth = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase();
    const dateRaw = dateObj.toISOString().toLowerCase();
    
    const invoiceNo = (i.invoiceNo || '').toLowerCase();
    const customerName = (i.customerName || '').toLowerCase();
    const itemName = (i.itemName || '').toLowerCase();
    const qty = String(i.qty).toLowerCase();
    const rate = String(i.rate).toLowerCase();
    const total = String(i.total).toLowerCase();
    const formattedTotal = `₹${parseFloat(i.total).toFixed(2)}`.toLowerCase();
    const formattedRate = `₹${parseFloat(i.rate).toFixed(2)}`.toLowerCase();

    return (
      dateStrDefault.includes(term) ||
      dateStrIN.includes(term) ||
      dateStrMonths.includes(term) ||
      dateStrFullMonth.includes(term) ||
      dateRaw.includes(term) ||
      invoiceNo.includes(term) ||
      customerName.includes(term) ||
      itemName.includes(term) ||
      qty.includes(term) ||
      rate.includes(term) ||
      total.includes(term) ||
      formattedRate.includes(term) ||
      formattedTotal.includes(term)
    );
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-left">
      <div className="border-b pb-3 mb-4 flex justify-between items-center gap-4 flex-wrap">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2"><FileSpreadsheet size={18} className="text-blue-600" /> {t.salesListTitle}</h2>
        <div className="relative w-56">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.filterSales} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none" />
          <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
        </div>
      </div>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead><tr className="bg-slate-50 text-slate-600 font-mono text-[9px] uppercase tracking-wider border-b"><th className="p-3">{t.date}</th><th className="p-3">{t.invoiceNo}</th><th className="p-3">Customer</th><th className="p-3">{t.itemName}</th><th className="p-3 text-center">{t.qty}</th><th className="p-3 text-right">{t.rate}</th><th className="p-3 text-right">{t.total}</th></tr></thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
            {filtered.length === 0 ? <tr><td colSpan="7" className="text-center py-12 text-slate-400 font-mono">No items match.</td></tr>
              : filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="p-3 font-mono text-slate-400">{new Date(item.date).toLocaleDateString()}</td>
                  <td className="p-3 font-mono text-blue-600 font-black">{item.invoiceNo}</td>
                  <td className="p-3 font-black text-slate-900">{item.customerName}</td>
                  <td className="p-3 text-slate-500">{item.itemName}</td>
                  <td className="p-3 text-center font-mono">{item.qty}</td>
                  <td className="p-3 text-right font-mono">₹{parseFloat(item.rate).toFixed(2)}</td>
                  <td className="p-3 text-right font-mono font-black text-slate-900">₹{item.total.toFixed(2)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function PurchaseList({ t }) {
  const { purchaseBills, suppliers } = useCtx(AppContext);
  const [search, setSearch] = useState('');

  const items = [];
  purchaseBills.forEach(pb => {
    const supp = suppliers.find(s => s.id === pb.supplierId);
    let arr = [];
    try { arr = typeof pb.itemsJson === 'string' ? JSON.parse(pb.itemsJson) : pb.itemsJson; } catch { }
    if (Array.isArray(arr)) arr.forEach(it => items.push({
      date: pb.date, billNo: pb.billNo || 'N/A', supplierName: supp?.name || 'N/A', itemName: it.name, qty: it.qty, rate: it.rate, total: parseFloat(it.qty) * parseFloat(it.rate)
    }));
  });
  const filtered = items.filter(i => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    
    const dateObj = new Date(i.date);
    const dateStrDefault = dateObj.toLocaleDateString().toLowerCase();
    const dateStrIN = dateObj.toLocaleDateString('en-IN').toLowerCase();
    const dateStrMonths = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase();
    const dateStrFullMonth = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase();
    const dateRaw = dateObj.toISOString().toLowerCase();
    
    const billNo = (i.billNo || '').toLowerCase();
    const supplierName = (i.supplierName || '').toLowerCase();
    const itemName = (i.itemName || '').toLowerCase();
    const qty = String(i.qty).toLowerCase();
    const rate = String(i.rate).toLowerCase();
    const total = String(i.total).toLowerCase();
    const formattedTotal = `₹${parseFloat(i.total).toFixed(2)}`.toLowerCase();
    const formattedRate = `₹${parseFloat(i.rate).toFixed(2)}`.toLowerCase();

    return (
      dateStrDefault.includes(term) ||
      dateStrIN.includes(term) ||
      dateStrMonths.includes(term) ||
      dateStrFullMonth.includes(term) ||
      dateRaw.includes(term) ||
      billNo.includes(term) ||
      supplierName.includes(term) ||
      itemName.includes(term) ||
      qty.includes(term) ||
      rate.includes(term) ||
      total.includes(term) ||
      formattedRate.includes(term) ||
      formattedTotal.includes(term)
    );
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-left">
      <div className="border-b pb-3 mb-4 flex justify-between items-center gap-4 flex-wrap">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2"><FileSpreadsheet size={18} className="text-emerald-600" /> {t.purchaseListTitle}</h2>
        <div className="relative w-56">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.filterPurchases} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none" />
          <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
        </div>
      </div>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead><tr className="bg-slate-50 text-slate-600 font-mono text-[9px] uppercase tracking-wider border-b"><th className="p-3">{t.date}</th><th className="p-3">{t.billNo}</th><th className="p-3">Supplier</th><th className="p-3">{t.itemName}</th><th className="p-3 text-center">{t.qty}</th><th className="p-3 text-right">{t.rate}</th><th className="p-3 text-right">{t.total}</th></tr></thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
            {filtered.length === 0 ? <tr><td colSpan="7" className="text-center py-12 text-slate-400 font-mono">No purchased items found.</td></tr>
              : filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="p-3 font-mono text-slate-400">{new Date(item.date).toLocaleDateString()}</td>
                  <td className="p-3 font-mono font-bold text-slate-800">{item.billNo}</td>
                  <td className="p-3 font-black text-slate-900">{item.supplierName}</td>
                  <td className="p-3 text-slate-500">{item.itemName}</td>
                  <td className="p-3 text-center font-mono">{item.qty}</td>
                  <td className="p-3 text-right font-mono">₹{parseFloat(item.rate).toFixed(2)}</td>
                  <td className="p-3 text-right font-mono font-black text-slate-900">₹{item.total.toFixed(2)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function MoreTabsView({ setActiveTab, ownerTabs, allowedTabs, t }) {
  const groups = {};
  ownerTabs.forEach(tab => {
    if (tab.id === 'dashboard' || tab.id === 'more') return;
    const groupName = tab.group || 'General';
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(tab);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20 text-left">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <h2 className="text-base font-black text-slate-900">{t.allWorkspaceFunctions || "All Workspace Functions"}</h2>
        <p className="text-slate-500 text-xs mt-0.5 font-semibold">{t.explorePlanPages || "Explore all available pages under your active subscription plan"}</p>
      </div>

      {Object.entries(groups).map(([groupName, tabs]) => (
        <div key={groupName} className="space-y-2.5">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono px-1">{groupName}</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tabs.map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { if (allowedTabs.includes(tab.id)) setActiveTab(tab.id); }}
                  className={`flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl text-left transition-all active:scale-[0.98] shadow-xs ${allowedTabs.includes(tab.id) ? 'hover:border-slate-300 hover:bg-slate-50 cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                  <div className="bg-slate-50 border p-2.5 rounded-xl shrink-0">
                    <TabIcon size={18} className="text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-900 text-xs truncate">{t[tab.id] || tab.label}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase font-mono mt-0.5 tracking-wider">{t.tabMode || "Tab Mode"}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </motion.div>
  );
}