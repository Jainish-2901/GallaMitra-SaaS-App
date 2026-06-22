import React, { useContext, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AppContext } from '../context/AppContext.jsx';
import { translations } from '../utils/translations.js';
import AnalyticsCards from '../components/AnalyticsCards.jsx';
import {
  PlusCircle, Receipt, FileCheck, Users, UserCheck, Scroll,
  History, FileSpreadsheet, Layers, FileDigit, BarChart3, Settings,
  Package
} from 'lucide-react';
import { SalesExpensesChart, PaymentModesDonut, ProfitGauge } from '../components/CustomCharts.jsx';

export default function OwnerDashboard({ setActiveTab, setSearchTerm }) {
  const { 
    activeShop, 
    customers, 
    suppliers, 
    invoices, 
    purchaseBills, 
    receipts, 
    loading 
  } = useContext(AppContext);

  const activeLang = activeShop?.language || 'gu';
  const t = translations[activeLang] || translations.en;

  // 1. Compute Monthly Trajectory (Last 6 Months) for dashboard preview
  const chartData = useMemo(() => {
    const now = new Date();
    const intervals = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const bStart = d.getTime();
      const bEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      intervals.push({
        start: bStart,
        end: bEnd,
        label: d.toLocaleDateString('en-IN', { month: 'short' })
      });
    }

    return intervals.map(bucket => {
      const bucketInvoices = (invoices || []).filter(i => {
        const t = new Date(i.date).getTime();
        return t >= bucket.start && t < bucket.end;
      });
      const bucketBills = (purchaseBills || []).filter(pb => {
        const t = new Date(pb.date).getTime();
        return t >= bucket.start && t < bucket.end;
      });

      const sales = bucketInvoices.reduce((sum, i) => sum + parseFloat(i.grandTotal || 0), 0);
      const expenses = bucketBills.reduce((sum, pb) => sum + parseFloat(pb.totalAmount || 0), 0);

      return {
        label: bucket.label,
        sales,
        expenses
      };
    });
  }, [invoices, purchaseBills]);

  // 2. Compute Payment Distribution
  const paymentModeStats = useMemo(() => {
    let upi = 0, cash = 0, cheque = 0, bank = 0, online = 0, card = 0;
    (receipts || []).forEach(r => {
      const amt = parseFloat(r.amount || 0);
      const mode = (r.paymentMode || '').toUpperCase();
      if (mode === 'UPI') upi += amt;
      else if (mode === 'CASH') cash += amt;
      else if (mode === 'CHEQUE') cheque += amt;
      else if (mode === 'BANK') bank += amt;
      else if (mode === 'ONLINE') online += amt;
      else if (mode === 'CARD') card += amt;
    });
    const total = upi + cash + cheque + bank + online + card;
    return {
      upi, cash, cheque, bank, online, card, total,
      upiPercent: total > 0 ? (upi / total) * 100 : 0,
      cashPercent: total > 0 ? (cash / total) * 100 : 0,
      chequePercent: total > 0 ? (cheque / total) * 100 : 0,
      bankPercent: total > 0 ? (bank / total) * 100 : 0,
      onlinePercent: total > 0 ? (online / total) * 100 : 0,
      cardPercent: total > 0 ? (card / total) * 100 : 0
    };
  }, [receipts]);

  // 3. Compute Profit Stats
  const profitStats = useMemo(() => {
    const grossSales = (invoices || []).reduce((sum, i) => sum + parseFloat(i.grandTotal || 0), 0);
    const grossExpenses = (purchaseBills || []).reduce((sum, pb) => sum + parseFloat(pb.totalAmount || 0), 0);
    const profit = grossSales - grossExpenses;
    const margin = grossSales > 0 ? (profit / grossSales) * 100 : 0;
    return { gross: profit, margin };
  }, [invoices, purchaseBills]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Welcome Card Skeleton */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex justify-between items-center animate-pulse">
          <div className="space-y-2">
            <div className="h-5 bg-slate-200 rounded w-48" />
            <div className="h-3 bg-slate-200 rounded w-64" />
          </div>
          <div className="hidden md:block h-10 w-24 bg-slate-200 rounded" />
        </div>

        {/* Analytics Summary Cards Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-xs animate-pulse">
              <div className="space-y-3 w-2/3">
                <div className="h-3 bg-slate-200 rounded w-28" />
                <div className="h-7 bg-slate-200 rounded w-36" />
                <div className="h-2.5 bg-slate-200 rounded w-44" />
              </div>
              <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
            </div>
          ))}
        </div>

        {/* Quick Operations Hub Skeleton */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs animate-pulse">
          <div className="h-3 bg-slate-200 rounded w-32 mb-4" />
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 bg-slate-50 h-16 space-y-2">
                <div className="w-5 h-5 rounded-full bg-slate-200" />
                <div className="h-2.5 bg-slate-200 rounded w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const quickBtns = [
    { label: 'New Invoice', tab: 'invoice_builder', actionKey: 'newInvoice', color: 'bg-blue-50 text-blue-600 border-blue-200/50 hover:bg-blue-100/50', icon: PlusCircle },
    { label: 'Collect Cash', tab: 'payment_receipt', actionKey: 'collectCash', color: 'bg-emerald-50 text-emerald-700 border-emerald-200/50 hover:bg-emerald-100/50', icon: Receipt },
    { label: 'Add Purchase', tab: 'purchase_bill', actionKey: 'addPurchase', color: 'bg-indigo-50 text-indigo-700 border-indigo-200/50 hover:bg-indigo-100/50', icon: FileCheck },
    { label: 'Add Customer', tab: 'cust_list', actionKey: 'addCustomer', color: 'bg-cyan-50 text-cyan-700 border-cyan-200/50 hover:bg-cyan-100/50', icon: Users },
    { label: 'Add Supplier', tab: 'supp_list', actionKey: 'addSupplier', color: 'bg-amber-50 text-amber-700 border-amber-200/50 hover:bg-amber-100/50', icon: UserCheck },
    { label: 'Sales List', tab: 'sales_list', actionKey: 'salesList', color: 'bg-rose-50 text-rose-700 border-rose-200/50 hover:bg-rose-100/50', icon: Scroll },
    { label: 'Sale Ledger', tab: 'sale_ledger', actionKey: 'saleLedger', color: 'bg-amber-50 text-amber-800 border-amber-200/50 hover:bg-amber-100/50', icon: History },
    { label: 'Purchase Ledger', tab: 'purchase_ledger', actionKey: 'purchaseLedger', color: 'bg-emerald-50 text-emerald-800 border-emerald-200/50 hover:bg-emerald-100/50', icon: FileSpreadsheet },
    { label: 'Invoice History', tab: 'invoice_list', actionKey: 'invoiceHistory', color: 'bg-sky-50 text-sky-800 border-sky-200/50 hover:bg-sky-100/50', icon: Layers },
    { label: 'Receipt History', tab: 'receipt_list', actionKey: 'receiptHistory', color: 'bg-violet-50 text-violet-850 border-violet-200/50 hover:bg-violet-100/50', icon: Layers },
    { label: 'Purchase Bills', tab: 'pbill_list', actionKey: 'purchaseBills', color: 'bg-purple-50 text-purple-800 border-purple-200/50 hover:bg-purple-100/50', icon: Layers },
    { label: 'Purchases List', tab: 'purchase_list', actionKey: 'purchasesList', color: 'bg-orange-50 text-orange-850 border-orange-200/50 hover:bg-orange-100/50', icon: Scroll },
    { label: 'CSV Reports', tab: 'reports', actionKey: 'csvReports', color: 'bg-orange-50 text-orange-850 border-orange-200/50 hover:bg-orange-100/50', icon: FileDigit },
    { label: 'Analytics', tab: 'analytics', actionKey: 'analytics', color: 'bg-pink-50 text-pink-850 border-pink-200/50 hover:bg-pink-100/50', icon: BarChart3 },
    { label: 'Products & Services', tab: 'product_list', actionKey: 'product_list', color: 'bg-emerald-50 text-emerald-850 border-emerald-200/50 hover:bg-emerald-100/50', icon: Package },
    { label: 'Profile', tab: 'user_settings', actionKey: 'profile', color: 'bg-slate-50 text-slate-800 border-slate-200/50 hover:bg-slate-100/50', icon: Settings },
    { label: 'Business Config', tab: 'business_settings', actionKey: 'businessConfig', color: 'bg-teal-50 text-teal-800 border-teal-200/50 hover:bg-teal-100/50', icon: Settings },
  ];

  const allowed = activeShop?.allowedTabs || [];
  const filteredQuickBtns = quickBtns.filter(btn => allowed.includes(btn.tab));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex justify-between items-center">
        <div>
          <h2 className="text-lg font-black text-slate-900">{t.welcome}, {activeShop?.ownerName}! 👋</h2>
          <p className="text-slate-500 text-xs mt-0.5">{t.syncStatus}</p>
        </div>
        {activeShop?.signatureUrl && (
          <div className="hidden md:block text-right">
            <span className="text-[8px] font-mono font-black text-slate-400 uppercase tracking-widest block">{t.savedSignature || "Saved Signature"}</span>
            <img src={activeShop.signatureUrl} alt="Signature" className="h-10 object-contain ml-auto mt-1 border border-dashed rounded bg-slate-50 p-1" />
          </div>
        )}
      </div>

      {/* Analytics Summary Cards */}
      <AnalyticsCards customers={customers} suppliers={suppliers} activeLang={activeLang} translations={translations} />

      {/* Quick Operations Hub */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono block mb-4">{t.quickOpsHub || "Quick Operations Hub"}</span>
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {filteredQuickBtns.map((btn, i) => {
            const BtnIcon = btn.icon;
            return (
              <button
                key={i}
                id={`dashboard-quick-${btn.tab}`}
                onClick={() => { setActiveTab(btn.tab); setSearchTerm(''); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all hover:scale-[1.02] active:scale-[0.98] ${btn.color}`}
              >
                <BtnIcon size={18} className="mb-1.5" />
                <span className="text-[9px] font-black uppercase tracking-tight leading-none truncate w-full">{t[btn.actionKey] || btn.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Embedded Real-time Business Analytics Charts */}
      {allowed.includes('analytics') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <BarChart3 size={16} className="text-slate-500" />
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Business Analytics Overview</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <SalesExpensesChart chartData={chartData} height={200} />
            </div>
            <div className="lg:col-span-4">
              <ProfitGauge profitMargin={profitStats.margin} grossProfit={profitStats.gross} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <PaymentModesDonut paymentModeStats={paymentModeStats} />
            </div>
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h4 className="font-black text-sm text-slate-900 tracking-tight">Active Financial Summary</h4>
                <p className="text-slate-400 text-[10px] font-mono mt-0.5">Workspace accounting ledger performance snapshot</p>
              </div>

              <div className="grid grid-cols-2 gap-4 my-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Gross Sales Volume</p>
                  <p className="text-base font-black text-slate-950 mt-1 font-mono">
                    ₹{(invoices || []).reduce((sum, i) => sum + parseFloat(i.grandTotal || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Gross Purchase Expenses</p>
                  <p className="text-base font-black text-slate-950 mt-1 font-mono">
                    ₹{(purchaseBills || []).reduce((sum, pb) => sum + parseFloat(pb.totalAmount || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 font-semibold leading-relaxed border-t border-slate-100 pt-3">
                Detailed monthly analysis is available under the <button onClick={() => setActiveTab('analytics')} className="text-blue-600 hover:text-blue-700 font-bold underline">Analytics tab</button>.
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
