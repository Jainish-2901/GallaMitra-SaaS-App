import React, { useState, useEffect } from 'react';
import { useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext.jsx';
import { translations } from '../../utils/translations.js';
import {
  Store, Plus, Calendar, Clock, Users, UserCheck,
  PlusCircle, FileCheck, Scroll, Receipt, ChevronDown, Menu
} from 'lucide-react';
import RegisterBusinessModal from './RegisterBusinessModal.jsx';

export default function TopBar({ activeTab, setActiveTab, setSearchTerm, isMobileMenuOpen, setIsMobileMenuOpen }) {
  const { activeShop, setActiveShop, workspaces, updateShopSettings, isInstallable, installApp } = useContext(AppContext);
  const activeLang = activeShop?.language || 'gu';
  const t = translations[activeLang] || translations.en;

  const [liveTime, setLiveTime] = useState(new Date());
  const [quickOpen, setQuickOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLangChange = async (e) => {
    await updateShopSettings({ language: e.target.value });
  };

  const handleSwitchWorkspace = (workspace) => {
    setActiveShop(workspace);
    localStorage.setItem('gm_session_tenant', JSON.stringify(workspace));
    setSwitcherOpen(false);
  };

  const quickActions = [
    { label: 'Create Invoice', tab: 'invoice_builder', actionKey: 'newInvoice', icon: PlusCircle },
    { label: 'Collect Cash', tab: 'payment_receipt', actionKey: 'collectCash', icon: Receipt },
    { label: 'Add Purchase', tab: 'purchase_bill', actionKey: 'addPurchase', icon: FileCheck },
    { label: 'Add Customer', tab: 'cust_list', actionKey: 'addCustomer', icon: Users },
    { label: 'Add Supplier', tab: 'supp_list', actionKey: 'addSupplier', icon: UserCheck },
    { label: 'Sales List', tab: 'sales_list', actionKey: 'salesList', icon: Scroll },
  ];

  const allowed = activeShop?.allowedTabs || [];
  const filteredQuickActions = quickActions.filter(act => allowed.includes(act.tab));

  const localeStr = activeLang === 'gu' ? 'gu-IN' : activeLang === 'hi' ? 'hi-IN' : 'en-US';

  const isMultiBusinessEnabled = activeShop?.allowMultiBusiness || workspaces.some(w => w.allowMultiBusiness || w.allowmultibusiness);
  const otherWorkspaces = workspaces.filter(w => w.id !== activeShop?.id);

  return (
    <header className="bg-white text-slate-900 px-4 py-3 sm:px-5 flex items-center justify-between gap-3 shrink-0 border-b border-slate-200 z-10 sticky top-0">
      {/* Shop Profile & Identity / Swappable Workspace Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex items-center justify-center shrink-0">
          {activeShop?.logoUrl ? (
            <img src={activeShop.logoUrl} alt="Logo" className="w-5 h-5 object-contain rounded" />
          ) : (
            <Store size={18} className="text-blue-600" />
          )}
        </div>
        
        {isMultiBusinessEnabled ? (
          <div className="relative min-w-0">
            <button
              onClick={() => setSwitcherOpen(o => !o)}
              className="flex items-center gap-1 hover:bg-slate-50 px-2 py-1.5 -mx-1.5 rounded-xl transition-colors text-left focus:outline-none min-w-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs sm:text-sm font-black text-slate-900 truncate max-w-[90px] xs:max-w-[120px] sm:max-w-none">{activeShop?.businessName}</h2>
                  <ChevronDown size={12} className="text-slate-400 shrink-0" />
                  <span className="hidden xs:inline-block text-[8px] px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full font-bold uppercase tracking-wider shrink-0">
                    ⚡ {activeShop?.plan}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-slate-500 font-semibold truncate">
                  <span className="hidden sm:inline">{activeShop?.ownerName}</span>
                  <span className="hidden sm:inline text-slate-300">•</span>
                  <span className="text-blue-600 font-black truncate">{t[activeTab] || activeTab.replace(/_/g, ' ').toUpperCase()}</span>
                </div>
              </div>
            </button>

            <AnimatePresence>
              {switcherOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setSwitcherOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 p-2 space-y-1"
                  >
                    <p className="text-[9px] font-black text-slate-400 px-3 py-1 uppercase tracking-wider">{t.switchBusiness || "Switch Business"}</p>
                    
                    {/* Active Shop */}
                    <div className="flex items-center justify-between px-3 py-2 bg-blue-50/50 border border-blue-100 rounded-xl text-left">
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-blue-800 truncate">{activeShop?.businessName}</p>
                        <p className="text-[9px] text-blue-600 font-semibold uppercase">{activeShop?.plan} (Current)</p>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500 shrink-0" />
                    </div>

                    {/* Other active shops */}
                    {otherWorkspaces.length > 0 && (
                      <div className="max-h-40 overflow-y-auto space-y-0.5 py-1">
                        {otherWorkspaces.map(w => (
                          <button
                            key={w.id}
                            onClick={() => handleSwitchWorkspace(w)}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-xl text-left transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-slate-700 truncate">{w.businessName}</p>
                              <p className="text-[9px] text-slate-400 font-semibold uppercase">{w.plan}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Plus register button */}
                    <button
                      onClick={() => { setModalOpen(true); setSwitcherOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 border border-dashed border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-left transition-colors text-xs font-bold mt-1"
                    >
                      <Plus size={14} className="text-slate-400" />
                      {t.addNewBusiness || "Add New Business"}
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs sm:text-sm font-black text-slate-900 truncate max-w-[100px] sm:max-w-none">{activeShop?.businessName}</h2>
              <span className="hidden xs:inline-block text-[8px] px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full font-bold uppercase tracking-wider shrink-0">
                ⚡ {activeShop?.plan}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-slate-500 font-semibold truncate">
              <span className="hidden sm:inline">{activeShop?.ownerName}</span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="text-blue-600 font-black truncate">{t[activeTab] || activeTab.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Add Business Action Button */}
        {isMultiBusinessEnabled && (
          <button
            id="topbar-add-business-btn"
            onClick={() => setModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-3.5 py-2 rounded-xl hidden sm:flex items-center gap-1.5 shadow-md transition-all active:scale-[0.98]"
          >
            <Plus size={14} /> <span>{t.addNewBusiness || "Add Business"}</span>
          </button>
        )}

        {/* Quick Entry Dropdown */}
        <div className="relative">
          <button
            id="topbar-quick-entry-btn"
            onClick={() => setQuickOpen(o => !o)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-[0.98]"
          >
            <Plus size={14} /> <span className="hidden sm:inline">{t.quickEntry || "Quick Entry"}</span>
          </button>
          <AnimatePresence>
            {quickOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setQuickOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 p-1.5"
                >
                  {filteredQuickActions.map((act, i) => {
                    const ActIcon = act.icon;
                    return (
                      <button
                        key={i}
                        id={`quick-action-${act.tab}`}
                        onClick={() => { setActiveTab(act.tab); setSearchTerm(''); setQuickOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors text-xs font-semibold"
                      >
                        <ActIcon size={14} className="text-slate-400" />
                        {t[act.actionKey] || act.label}
                      </button>
                    );
                  })}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* PWA Download Button */}
        {isInstallable && (
          <button
            onClick={installApp}
            className="hidden sm:inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all active:scale-[0.98]"
          >
            📲 Install App
          </button>
        )}

        {/* Language selector */}
        <select
          id="topbar-lang-select"
          value={activeLang}
          onChange={handleLangChange}
          className="hidden sm:block bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer hover:bg-slate-100 transition-colors"
        >
          <option value="en">English</option>
          <option value="gu">ગુજરાતી</option>
          <option value="hi">हिंदी</option>
        </select>

        {/* Live Clock */}
        <div className="hidden md:flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-xl text-xs font-mono text-slate-700">
          <div className="flex items-center gap-1.5 border-r border-slate-200 pr-3">
            <Calendar size={12} className="text-blue-600" />
            <span>{liveTime.toLocaleDateString(localeStr, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-emerald-600" />
            <span>{liveTime.toLocaleTimeString(localeStr, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>

        {/* Hamburger Menu Toggle for Mobile */}
        <button
          onClick={() => setIsMobileMenuOpen(prev => !prev)}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-xl transition-all active:scale-95"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Add New Business Modal */}
      <RegisterBusinessModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </header>
  );
}
