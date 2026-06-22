import React, { useContext, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../context/AppContext.jsx';
import { translations } from '../utils/translations.js';
import {
  BarChart3, Calendar, Award, CreditCard, Users, Wallet,
  TrendingUp, TrendingDown, Percent, ArrowUpRight, ArrowDownLeft,
  Scale, ShieldCheck, ArrowRight
} from 'lucide-react';
import {
  SalesExpensesChart,
  CashFlowAreaChart,
  PaymentModesDonut,
  ProfitGauge
} from '../components/CustomCharts.jsx';

export default function AnalyticsPage() {
  const {
    activeShop,
    invoices,
    purchaseBills,
    receipts,
    customers,
    suppliers,
    loading
  } = useContext(AppContext);

  const activeLang = activeShop?.language || 'gu';
  const t = translations[activeLang] || translations.en;

  const [timeRange, setTimeRange] = useState('all'); // '1d', '1w', '1m', '1y', 'all'

  // Time-Range Date Filters
  const minFilterDate = useMemo(() => {
    const now = new Date();
    if (timeRange === '1d') return now.getTime() - 24 * 60 * 60 * 1000;
    if (timeRange === '1w') return now.getTime() - 7 * 24 * 60 * 60 * 1000;
    if (timeRange === '1m') return now.getTime() - 30 * 24 * 60 * 60 * 1000;
    if (timeRange === '1y') return now.getTime() - 365 * 24 * 60 * 60 * 1000;
    return 0; // 'all'
  }, [timeRange]);

  // Filter lists based on selected range
  const filteredInvoices = useMemo(() => {
    if (timeRange === 'all') return invoices;
    return invoices.filter(i => new Date(i.date).getTime() >= minFilterDate);
  }, [invoices, minFilterDate, timeRange]);

  const filteredPurchaseBills = useMemo(() => {
    if (timeRange === 'all') return purchaseBills;
    return purchaseBills.filter(pb => new Date(pb.date).getTime() >= minFilterDate);
  }, [purchaseBills, minFilterDate, timeRange]);

  const filteredReceipts = useMemo(() => {
    if (timeRange === 'all') return receipts;
    return receipts.filter(r => new Date(r.date).getTime() >= minFilterDate);
  }, [receipts, minFilterDate, timeRange]);

  // Compute Analytical Metrics
  // Sales Metrics
  const salesStats = useMemo(() => {
    const gross = filteredInvoices.reduce((sum, i) => sum + parseFloat(i.grandTotal || 0), 0);
    const net = filteredInvoices.reduce((sum, i) => sum + parseFloat(i.subTotal || 0), 0);
    const discount = filteredInvoices.reduce((sum, i) => sum + parseFloat(i.discount || 0), 0);
    const count = filteredInvoices.length;
    const avg = count > 0 ? gross / count : 0;
    return { gross, net, discount, count, avg };
  }, [filteredInvoices]);

  // Expense Metrics
  const expenseStats = useMemo(() => {
    const gross = filteredPurchaseBills.reduce((sum, pb) => sum + parseFloat(pb.totalAmount || 0), 0);
    const count = filteredPurchaseBills.length;
    const avg = count > 0 ? gross / count : 0;
    return { gross, count, avg };
  }, [filteredPurchaseBills]);

  // Profitability
  const grossProfit = salesStats.gross - expenseStats.gross;
  const profitMargin = salesStats.gross > 0 ? (grossProfit / salesStats.gross) * 100 : 0;

  // Cash Flow Metrics
  const cashFlowStats = useMemo(() => {
    const inflow = filteredReceipts.reduce((sum, r) => sum + (r.customerId ? parseFloat(r.amount || 0) : 0), 0);
    const outflow = filteredReceipts.reduce((sum, r) => sum + (r.supplierId ? parseFloat(r.amount || 0) : 0), 0);
    const net = inflow - outflow;
    return { inflow, outflow, net, total: inflow + outflow };
  }, [filteredReceipts]);

  // Payment Mode Distribution
  const paymentModeStats = useMemo(() => {
    let upi = 0, cash = 0, cheque = 0, bank = 0, online = 0, card = 0;
    filteredReceipts.forEach(r => {
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
  }, [filteredReceipts]);

  // Top Partners & Dues Outstanding
  const partnerInsights = useMemo(() => {
    // Top Customer
    const customerSalesMap = {};
    filteredInvoices.forEach(i => {
      if (i.customerId) {
        customerSalesMap[i.customerId] = (customerSalesMap[i.customerId] || 0) + parseFloat(i.grandTotal || 0);
      }
    });
    let topCustId = '', topCustSales = 0;
    Object.entries(customerSalesMap).forEach(([id, amt]) => {
      if (amt > topCustSales) {
        topCustSales = amt;
        topCustId = id;
      }
    });
    const topCustomer = customers.find(c => c.id === topCustId);

    // Top Supplier
    const supplierPurchaseMap = {};
    filteredPurchaseBills.forEach(pb => {
      if (pb.supplierId) {
        supplierPurchaseMap[pb.supplierId] = (supplierPurchaseMap[pb.supplierId] || 0) + parseFloat(pb.totalAmount || 0);
      }
    });
    let topSuppId = '', topSuppPurchases = 0;
    Object.entries(supplierPurchaseMap).forEach(([id, amt]) => {
      if (amt > topSuppPurchases) {
        topSuppPurchases = amt;
        topSuppId = id;
      }
    });
    const topSupplier = suppliers.find(s => s.id === topSuppId);

    // Highest Outstanding Customer
    let highestOutstandingCust = null, maxCustBal = 0;
    customers.forEach(c => {
      const bal = parseFloat(c.balance || 0);
      if (bal > maxCustBal) {
        maxCustBal = bal;
        highestOutstandingCust = c;
      }
    });

    // Highest Payable Supplier
    let highestPayableSupp = null, maxSuppBal = 0;
    suppliers.forEach(s => {
      const bal = parseFloat(s.balance || 0);
      if (bal > maxSuppBal) {
        maxSuppBal = bal;
        highestPayableSupp = s;
      }
    });

    return {
      topCustomer, topCustSales,
      topSupplier, topSuppPurchases,
      highestOutstandingCust, maxCustBal,
      highestPayableSupp, maxSuppBal
    };
  }, [filteredInvoices, filteredPurchaseBills, customers, suppliers]);

  // Grouped Chart data
  const chartData = useMemo(() => {
    const now = new Date();
    const intervals = [];

    if (timeRange === '1d') {
      const filterMs = 24 * 60 * 60 * 1000;
      const bucketSize = 4 * 60 * 60 * 1000;
      const start = now.getTime() - filterMs;
      for (let i = 0; i < 6; i++) {
        const bStart = start + i * bucketSize;
        const bEnd = bStart + bucketSize;
        const hourStart = new Date(bStart).getHours();
        const hourEnd = new Date(bEnd).getHours();
        intervals.push({
          start: bStart,
          end: bEnd,
          label: `${String(hourStart).padStart(2, '0')}:00-${String(hourEnd).padStart(2, '0')}:00`
        });
      }
    } else if (timeRange === '1w') {
      const filterMs = 7 * 24 * 60 * 60 * 1000;
      const bucketSize = 24 * 60 * 60 * 1000;
      const start = now.getTime() - filterMs;
      for (let i = 0; i < 7; i++) {
        const bStart = start + i * bucketSize;
        const bEnd = bStart + bucketSize;
        const dateObj = new Date(bStart);
        intervals.push({
          start: bStart,
          end: bEnd,
          label: dateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
        });
      }
    } else if (timeRange === '1m') {
      const filterMs = 30 * 24 * 60 * 60 * 1000;
      const bucketSize = 6 * 24 * 60 * 60 * 1000;
      const start = now.getTime() - filterMs;
      for (let i = 0; i < 5; i++) {
        const bStart = start + i * bucketSize;
        const bEnd = bStart + bucketSize;
        const d1 = new Date(bStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        const d2 = new Date(bEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        intervals.push({
          start: bStart,
          end: bEnd,
          label: `${d1}-${d2}`
        });
      }
    } else if (timeRange === '1y') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const bStart = d.getTime();
        const bEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
        intervals.push({
          start: bStart,
          end: bEnd,
          label: d.toLocaleDateString('en-IN', { month: 'short' })
        });
      }
    } else {
      const allDates = [...invoices, ...purchaseBills].map(tx => new Date(tx.date).getTime());
      let start = allDates.length > 0 ? Math.min(...allDates) : now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000;
      let end = now.getTime();
      
      const spanMs = end - start;
      const oneDay = 24 * 60 * 60 * 1000;
      
      if (spanMs < oneDay) {
        const startDateObj = new Date(start);
        startDateObj.setHours(0, 0, 0, 0);
        start = startDateObj.getTime();
        
        const endDateObj = new Date(end);
        endDateObj.setHours(23, 59, 59, 999);
        end = endDateObj.getTime();
      }
      
      const updatedSpanMs = end - start;
      const bucketSize = updatedSpanMs / 6;
      
      for (let i = 0; i < 6; i++) {
        const bStart = start + i * bucketSize;
        const bEnd = bStart + bucketSize;
        const dateObj = new Date(bStart);
        
        let label;
        if (updatedSpanMs <= oneDay) {
          const hourStart = dateObj.getHours();
          const hourEnd = new Date(bEnd).getHours();
          label = `${String(hourStart).padStart(2, '0')}:05-${String(hourEnd).padStart(2, '0')}:05`;
        } else if (updatedSpanMs <= 365 * oneDay) {
          label = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        } else {
          label = dateObj.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        }
        
        intervals.push({
          start: bStart,
          end: bEnd,
          label
        });
      }
    }

    return intervals.map(bucket => {
      const bucketInvoices = invoices.filter(i => {
        const t = new Date(i.date).getTime();
        return t >= bucket.start && t < bucket.end;
      });
      const bucketBills = purchaseBills.filter(pb => {
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
  }, [invoices, purchaseBills, timeRange]);

  const ranges = [
    { key: '1d', label: '1 Day' },
    { key: '1w', label: '1 Week' },
    { key: '1m', label: '1 Month' },
    { key: '1y', label: '1 Year' },
    { key: 'all', label: 'All' },
  ];

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto px-1 pb-10">
        {/* Header Skeleton */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-pulse flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="h-12 bg-slate-100 rounded-2xl w-1/3" />
          <div className="h-8 bg-slate-100 rounded-xl w-40" />
        </div>

        {/* KPIs Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border border-slate-200 p-5 rounded-3xl h-24 animate-pulse" />
          ))}
        </div>

        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 h-64 animate-pulse" />
          <div className="bg-white border border-slate-200 rounded-3xl p-6 h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-6xl mx-auto px-1 pb-10"
    >
      {/* Header Panel */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#0F172A]" />
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-50 text-slate-700 rounded-2xl border border-slate-100 flex-shrink-0">
            <BarChart3 size={22} className="text-slate-800" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900">{t.analyticsTitle || 'Margins & Revenue Analytics'}</h1>
            <p className="text-slate-500 text-xs mt-0.5 max-w-md">
              {t.analyticsDesc || 'Visual insights into profit margins, sales trajectories, and asset distributions.'}
            </p>
          </div>
        </div>

        {/* Time Filter Controls */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 self-start md:self-auto flex-wrap gap-1">
          {ranges.map(r => (
            <button
              key={r.key}
              type="button"
              onClick={() => setTimeRange(r.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-205 ${
                timeRange === r.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-950 font-bold hover:bg-white/40'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Gross Sales */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white border border-slate-200 p-5 rounded-3xl shadow-2xs relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-600" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono block">Gross Revenue</span>
              <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">₹{salesStats.gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-2.5 bg-indigo-50 text-indigo-650 rounded-xl border border-indigo-100"><TrendingUp size={16} /></div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-500 font-bold">
            <span>Avg: ₹{salesStats.avg.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/invoice</span>
            <span className="font-mono bg-indigo-50 text-indigo-750 px-1.5 py-0.5 rounded">{salesStats.count} bills</span>
          </div>
        </motion.div>

        {/* KPI 2: Gross Expenses */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white border border-slate-200 p-5 rounded-3xl shadow-2xs relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono block">Total Expenses</span>
              <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">₹{expenseStats.gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100"><TrendingDown size={16} /></div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-500 font-bold">
            <span>Avg: ₹{expenseStats.avg.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/slip</span>
            <span className="font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{expenseStats.count} Slips</span>
          </div>
        </motion.div>

        {/* KPI 3: Operating Profit */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white border border-slate-200 p-5 rounded-3xl shadow-2xs relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono block">Operating Profit</span>
              <h3 className={`text-2xl font-black font-mono mt-1 ${grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                ₹{grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100"><Scale size={16} /></div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-500 font-bold">
            <span>Profit Margin:</span>
            <span className={`font-black ${grossProfit >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'} px-2 py-0.5 rounded font-mono`}>
              {profitMargin.toFixed(1)}%
            </span>
          </div>
        </motion.div>

        {/* KPI 4: Net Cash Flow */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white border border-slate-200 p-5 rounded-3xl shadow-2xs relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono block">Net Cash Flow</span>
              <h3 className={`text-2xl font-black font-mono mt-1 ${cashFlowStats.net >= 0 ? 'text-emerald-700' : 'text-rose-650'}`}>
                ₹{cashFlowStats.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100"><Wallet size={16} /></div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-500 font-bold">
            <span className="text-emerald-600">In: +₹{cashFlowStats.inflow.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            <span className="text-rose-500">Out: -₹{cashFlowStats.outflow.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
        </motion.div>
      </div>

      {/* Row 1 Charts: Bar Trajectory & Profit Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <SalesExpensesChart chartData={chartData} />
        </div>
        <div className="lg:col-span-4">
          <ProfitGauge profitMargin={profitMargin} grossProfit={grossProfit} />
        </div>
      </div>

      {/* Row 2 Charts: Cash Flow Line & Payment Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <CashFlowAreaChart chartData={chartData} />
        </div>
        <div className="lg:col-span-4">
          <PaymentModesDonut paymentModeStats={paymentModeStats} />
        </div>
      </div>

      {/* Downside Sections: Top Partners Summary */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
        <div>
          <h3 className="font-black text-sm text-slate-900">Workspace Partner Insights</h3>
          <p className="text-slate-400 text-[10px] font-mono mt-0.5">Top performing business profiles and liability ledger audits</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Top Customer */}
          <div className="flex flex-col justify-between p-4 bg-slate-50 border border-slate-200/50 rounded-2xl group hover:border-indigo-200 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 shrink-0">
                <Award size={14} />
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Top Customer</span>
            </div>
            <div className="mt-3">
              <p className="font-black text-slate-900 text-xs truncate">
                {partnerInsights.topCustomer ? (partnerInsights.topCustomer.shopName || partnerInsights.topCustomer.name) : '—'}
              </p>
              <p className="font-mono text-slate-500 font-bold text-[10px] mt-0.5">₹{partnerInsights.topCustSales.toLocaleString('en-IN', { maximumFractionDigits: 1 })} billed</p>
            </div>
          </div>

          {/* Top Supplier */}
          <div className="flex flex-col justify-between p-4 bg-slate-50 border border-slate-200/50 rounded-2xl group hover:border-amber-200 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <Award size={14} />
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Top Supplier</span>
            </div>
            <div className="mt-3">
              <p className="font-black text-slate-900 text-xs truncate">
                {partnerInsights.topSupplier ? (partnerInsights.topSupplier.shopName || partnerInsights.topSupplier.name) : '—'}
              </p>
              <p className="font-mono text-slate-500 font-bold text-[10px] mt-0.5">₹{partnerInsights.topSuppPurchases.toLocaleString('en-IN', { maximumFractionDigits: 1 })} paid</p>
            </div>
          </div>

          {/* Highest Outstanding Customer */}
          <div className="flex flex-col justify-between p-4 bg-slate-50 border border-slate-200/50 rounded-2xl group hover:border-emerald-250 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <ArrowDownLeft size={14} />
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Top Receivable</span>
            </div>
            <div className="mt-3">
              <p className="font-black text-slate-900 text-xs truncate">
                {partnerInsights.highestOutstandingCust ? (partnerInsights.highestOutstandingCust.shopName || partnerInsights.highestOutstandingCust.name) : '—'}
              </p>
              <p className="font-mono text-emerald-700 font-black text-[10px] mt-0.5">₹{partnerInsights.maxCustBal.toLocaleString('en-IN', { maximumFractionDigits: 1 })} to take</p>
            </div>
          </div>

          {/* Highest Liability Supplier */}
          <div className="flex flex-col justify-between p-4 bg-slate-50 border border-slate-200/50 rounded-2xl group hover:border-rose-200 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <ArrowUpRight size={14} />
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Top Liability</span>
            </div>
            <div className="mt-3">
              <p className="font-black text-slate-900 text-xs truncate">
                {partnerInsights.highestPayableSupp ? (partnerInsights.highestPayableSupp.shopName || partnerInsights.highestPayableSupp.name) : '—'}
              </p>
              <p className="font-mono text-rose-700 font-black text-[10px] mt-0.5">₹{partnerInsights.maxSuppBal.toLocaleString('en-IN', { maximumFractionDigits: 1 })} to give</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
