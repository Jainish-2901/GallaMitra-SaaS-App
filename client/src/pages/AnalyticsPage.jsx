import React, { useContext, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../context/AppContext.jsx';
import { translations } from '../utils/translations.js';
import {
  BarChart3, Calendar, Award, CreditCard, Users, Wallet,
  TrendingUp, TrendingDown, Percent, ArrowUpRight, ArrowDownLeft,
  Scale, ShieldCheck, ArrowRight, TrendingUp as ProfitIcon
} from 'lucide-react';

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

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto px-1 pb-10">
        {/* Header Panel Skeleton */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-200" />
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded w-48" />
              <div className="h-3 bg-slate-200 rounded w-72" />
            </div>
          </div>
          <div className="h-8 w-44 bg-slate-200 rounded-2xl" />
        </div>

        {/* Main KPI Stats Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border border-slate-200 p-5 rounded-3xl shadow-2xs relative overflow-hidden animate-pulse space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-2 w-2/3">
                  <div className="h-2.5 bg-slate-200 rounded w-16" />
                  <div className="h-6 bg-slate-200 rounded w-28" />
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-200" />
              </div>
              <div className="h-3 bg-slate-200 rounded w-full pt-3 mt-4" />
            </div>
          ))}
        </div>

        {/* Dynamic Grouped Bar Chart Skeleton */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs animate-pulse space-y-6">
          <div className="flex items-center justify-between border-b pb-4 mb-6">
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded w-40" />
              <div className="h-2.5 bg-slate-200 rounded w-24" />
            </div>
            <div className="h-3 w-32 bg-slate-200 rounded" />
          </div>
          <div className="h-60 bg-slate-50 rounded-2xl flex items-end justify-around p-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex gap-1.5 items-end h-full w-8">
                <div className="bg-slate-200 rounded-t w-3" style={{ height: `${20 + i * 10}%` }} />
                <div className="bg-slate-200 rounded-t w-3" style={{ height: `${10 + i * 8}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const [timeRange, setTimeRange] = useState('all'); // '1d', '1w', '1m', '1y', 'all'
  const [hoveredBar, setHoveredBar] = useState(null); // { index, type: 'sales'|'expenses' }

  // 1. Time-Range Date Filters
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

  // 2. Compute Analytical Metrics
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
    return { inflow, outflow, net };
  }, [filteredReceipts]);

  // Payment Mode Distribution
  const paymentModeStats = useMemo(() => {
    let upi = 0, cash = 0, cheque = 0;
    filteredReceipts.forEach(r => {
      const amt = parseFloat(r.amount || 0);
      if (r.paymentMode === 'UPI') upi += amt;
      else if (r.paymentMode === 'CASH') cash += amt;
      else if (r.paymentMode === 'CHEQUE') cheque += amt;
    });
    const total = upi + cash + cheque;
    return {
      upi, cash, cheque, total,
      upiPercent: total > 0 ? (upi / total) * 100 : 0,
      cashPercent: total > 0 ? (cash / total) * 100 : 0,
      chequePercent: total > 0 ? (cheque / total) * 100 : 0
    };
  }, [filteredReceipts]);

  // 3. Top Partners & Dues Outstanding (Current snapshot or cumulative transactions)
  const partnerInsights = useMemo(() => {
    // Top Billed Customer (cumulative filtered invoices)
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

    // Top Paid Supplier (cumulative filtered purchases)
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

    // Highest Outstanding Customer (highest balance > 0)
    let highestOutstandingCust = null, maxCustBal = 0;
    customers.forEach(c => {
      const bal = parseFloat(c.balance || 0);
      if (bal > maxCustBal) {
        maxCustBal = bal;
        highestOutstandingCust = c;
      }
    });

    // Highest Payable Supplier (highest balance > 0)
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

  // 4. Dynamic Grouped Chart data
  const chartData = useMemo(() => {
    const now = new Date();
    const intervals = [];

    if (timeRange === '1d') {
      // Last 24 hours: 6 buckets of 4 hours
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
      // Last 7 days: 7 buckets of 1 day
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
      // Last 30 days: 5 buckets of 6 days
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
      // Last 12 months: 12 buckets of 1 month
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
      // 'all' time: Find all transaction boundaries and divide into 6 intervals
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
          label = `${String(hourStart).padStart(2, '0')}:00-${String(hourEnd).padStart(2, '0')}:00`;
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

  const maxVal = useMemo(() => {
    const peak = Math.max(...chartData.map(d => Math.max(d.sales, d.expenses)), 100);
    return peak * 1.1; // Add 10% breathing space at top
  }, [chartData]);

  const ranges = [
    { key: '1d', label: '1 Day' },
    { key: '1w', label: '1 Week' },
    { key: '1m', label: '1 Month' },
    { key: '1y', label: '1 Year' },
    { key: 'all', label: 'All' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-5xl mx-auto px-1 pb-10"
    >
      <style>{`
        .bar-group:hover .bar-tooltip { opacity: 1; transform: translateY(-6px) scale(1); }
        .progress-bar-glow { box-shadow: 0 0 8px var(--tw-shadow-color); }
      `}</style>

      {/* Header Panel */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0F172A]" />
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-50 text-slate-700 rounded-2xl border border-slate-100 flex-shrink-0">
            <BarChart3 size={24} className="text-slate-800" />
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
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
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
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono block">Gross Revenue</span>
              <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">₹{salesStats.gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100"><TrendingUp size={16} /></div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-500 font-bold">
            <span>Avg: ₹{salesStats.avg.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/invoice</span>
            <span className="font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">{salesStats.count} bills</span>
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
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-505 font-bold">
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
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-violet-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono block">Net Cash Flow</span>
              <h3 className={`text-2xl font-black font-mono mt-1 ${cashFlowStats.net >= 0 ? 'text-emerald-700' : 'text-rose-650'}`}>
                ₹{cashFlowStats.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl border border-violet-100"><Wallet size={16} /></div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-500 font-bold">
            <span className="text-emerald-600">In: +₹{cashFlowStats.inflow.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            <span className="text-rose-500">Out: -₹{cashFlowStats.outflow.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
        </motion.div>
      </div>

      {/* Dynamic Grouped Bar Chart */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs relative">
        <div className="flex items-center justify-between border-b pb-4 mb-6">
          <div>
            <h3 className="font-black text-sm text-slate-900">Sales vs Expenses Trajectory</h3>
            <p className="text-slate-400 text-[10px] font-mono mt-0.5">Chronologically bucketed activity values</p>
          </div>
          <div className="flex gap-4 text-[10px] font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-indigo-650 rounded" />
              <span className="text-slate-605">Gross Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded" />
              <span className="text-slate-605">Total Expenses</span>
            </div>
          </div>
        </div>

        {/* Grouped Bar Chart Core */}
        <div className="h-64 flex items-end justify-between gap-4 pt-8 pb-2 px-1 relative">
          {/* Horizontal Grid lines */}
          <div className="absolute inset-x-0 bottom-2 top-8 flex flex-col justify-between pointer-events-none border-b border-slate-100">
            <div className="w-full border-t border-slate-100" />
            <div className="w-full border-t border-slate-100" />
            <div className="w-full border-t border-slate-100" />
            <div className="w-full border-t border-slate-100" />
          </div>

          {chartData.map((d, idx) => {
            const salePct = (d.sales / maxVal) * 100;
            const expPct = (d.expenses / maxVal) * 100;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full relative z-10">
                <div className="flex-1 w-full flex items-end justify-center gap-1.5 sm:gap-2 px-1">
                  {/* Sales Bar */}
                  <div
                    onMouseEnter={() => setHoveredBar({ index: idx, type: 'sales' })}
                    onMouseLeave={() => setHoveredBar(null)}
                    className="flex-1 max-w-[24px] bg-indigo-650/85 hover:bg-indigo-650 rounded-t-lg transition-all duration-300 relative bar-group cursor-pointer"
                    style={{ height: `${Math.max(salePct, 3)}%` }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 pointer-events-none transition-all duration-200 transform scale-95 origin-bottom bar-tooltip z-20 bg-slate-900 text-white font-mono text-[9px] font-black py-1 px-2 rounded shadow-md whitespace-nowrap">
                      Sales: ₹{d.sales.toFixed(2)}
                    </div>
                  </div>

                  {/* Expenses Bar */}
                  <div
                    onMouseEnter={() => setHoveredBar({ index: idx, type: 'expenses' })}
                    onMouseLeave={() => setHoveredBar(null)}
                    className="flex-1 max-w-[24px] bg-amber-500/85 hover:bg-amber-500 rounded-t-lg transition-all duration-300 relative bar-group cursor-pointer"
                    style={{ height: `${Math.max(expPct, 3)}%` }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 pointer-events-none transition-all duration-200 transform scale-95 origin-bottom bar-tooltip z-20 bg-slate-900 text-white font-mono text-[9px] font-black py-1 px-2 rounded shadow-md whitespace-nowrap">
                      Expenses: ₹{d.expenses.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* X-Axis Label */}
                <div className="w-full text-center text-[9px] sm:text-[10px] font-bold text-slate-400 mt-2 truncate font-mono">
                  {d.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Downside Sections: Payment Modes vs Partners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Payment Modes & Cash Inflows */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="font-black text-sm text-slate-900">Payment Modes &amp; Cash Flow Split</h3>
            <p className="text-slate-400 text-[10px] font-mono mt-0.5">Voucher payment breakdowns in target period</p>
          </div>

          {/* Payment mode bars */}
          <div className="space-y-4">
            {/* Cash */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-650 flex items-center gap-1.5">💵 CASH</span>
                <span className="font-mono text-slate-900">₹{paymentModeStats.cash.toFixed(2)} ({paymentModeStats.cashPercent.toFixed(1)}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${paymentModeStats.cashPercent}%` }} />
              </div>
            </div>

            {/* UPI */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-650 flex items-center gap-1.5">📱 UPI / Net Banking</span>
                <span className="font-mono text-slate-900">₹{paymentModeStats.upi.toFixed(2)} ({paymentModeStats.upiPercent.toFixed(1)}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${paymentModeStats.upiPercent}%` }} />
              </div>
            </div>

            {/* Cheque */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-650 flex items-center gap-1.5">🏦 CHEQUE</span>
                <span className="font-mono text-slate-900">₹{paymentModeStats.cheque.toFixed(2)} ({paymentModeStats.chequePercent.toFixed(1)}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${paymentModeStats.chequePercent}%` }} />
              </div>
            </div>
          </div>

          {/* Cash Flow Balance Progress */}
          {(() => {
            const sumFlow = cashFlowStats.inflow + cashFlowStats.outflow;
            const inflowPct = sumFlow > 0 ? (cashFlowStats.inflow / sumFlow) * 100 : 50;
            const outflowPct = sumFlow > 0 ? (cashFlowStats.outflow / sumFlow) * 100 : 50;
            return (
              <div className="pt-4 border-t border-slate-50 space-y-3">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span className="text-emerald-600">Inflows (Receipts)</span>
                  <span className="text-rose-600">Outflows (Remitted)</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full flex overflow-hidden">
                  <div className="h-full bg-emerald-500/95 transition-all duration-500" style={{ width: `${inflowPct}%` }} />
                  <div className="h-full bg-rose-500/95 transition-all duration-500" style={{ width: `${outflowPct}%` }} />
                </div>
                <div className="flex justify-between text-[10px] font-mono font-black text-slate-600">
                  <span className="text-emerald-700">₹{cashFlowStats.inflow.toFixed(2)}</span>
                  <span className="text-rose-700">₹{cashFlowStats.outflow.toFixed(2)}</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right Column: Top Partners & Outstanding Dues */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between gap-6">
          <div>
            <h3 className="font-black text-sm text-slate-900 font-bold">Top Business Partners &amp; Dues</h3>
            <p className="text-slate-400 text-[10px] font-mono mt-0.5">Top performing and liability registry snapshots</p>
          </div>

          <div className="space-y-3.5 flex-1 flex flex-col justify-center">
            {/* Row 1: Top Customer */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 flex-shrink-0">
                  <Award size={15} />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Top Billed Customer</span>
                  <span className="font-black text-slate-900 text-xs">
                    {partnerInsights.topCustomer ? (partnerInsights.topCustomer.shopName || partnerInsights.topCustomer.name) : '—'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block font-mono">Volume</span>
                <span className="font-black text-slate-950 font-mono text-xs">₹{partnerInsights.topCustSales.toFixed(2)}</span>
              </div>
            </div>

            {/* Row 2: Top Supplier */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <Award size={15} />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Top Supplier Billing</span>
                  <span className="font-black text-slate-900 text-xs">
                    {partnerInsights.topSupplier ? (partnerInsights.topSupplier.shopName || partnerInsights.topSupplier.name) : '—'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block font-mono">Volume</span>
                <span className="font-black text-slate-950 font-mono text-xs">₹{partnerInsights.topSuppPurchases.toFixed(2)}</span>
              </div>
            </div>

            {/* Row 3: Highest Receivables */}
            <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <ArrowDownLeft size={16} />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Highest Outstanding</span>
                  <span className="font-black text-slate-900 text-xs">
                    {partnerInsights.highestOutstandingCust ? (partnerInsights.highestOutstandingCust.shopName || partnerInsights.highestOutstandingCust.name) : '—'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-650 block font-mono">To Take</span>
                <span className="font-black text-emerald-700 font-mono text-xs">₹{partnerInsights.maxCustBal.toFixed(2)}</span>
              </div>
            </div>

            {/* Row 4: Highest Liabilities */}
            <div className="flex items-center justify-between p-3.5 bg-rose-50/30 border border-rose-100/30 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                  <ArrowUpRight size={16} />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Highest Liability Dues</span>
                  <span className="font-black text-slate-900 text-xs">
                    {partnerInsights.highestPayableSupp ? (partnerInsights.highestPayableSupp.shopName || partnerInsights.highestPayableSupp.name) : '—'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-rose-500 block font-mono">To Give</span>
                <span className="font-black text-rose-700 font-mono text-xs">₹{partnerInsights.maxSuppBal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </motion.div>
  );
}
