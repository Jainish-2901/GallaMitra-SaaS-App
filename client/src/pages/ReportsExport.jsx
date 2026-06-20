import React, { useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { AppContext } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { translations } from '../utils/translations.js';
import { FileDigit, Users, Layers, Download, CheckCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function ReportsExport() {
  const { activeShop, ledgerHistory, customers, suppliers } = useContext(AppContext);
  const toast = useToast();
  const activeLang = activeShop?.language || 'gu';
  const t = translations[activeLang] || translations.en;

  const [filterType, setFilterType] = useState('all'); // 'all', 'customer', 'supplier'
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const cleanCSVVal = (val) => {
    if (val === null || val === undefined) return '';
    const s = String(val).trim();
    if (s === '—' || s === '-' || s === 'undefined' || s === 'null') return '';
    return s;
  };

  const getFilteredEntries = () => {
    let base = ledgerHistory;
    if (filterType === 'customer') {
      base = base.filter(l => l.customerId === selectedPartyId);
    } else if (filterType === 'supplier') {
      base = base.filter(l => l.supplierId === selectedPartyId);
    }
    if (startDate) {
      const sd = new Date(startDate);
      base = base.filter(l => new Date(l.date) >= sd);
    }
    if (endDate) {
      const ed = new Date(endDate);
      base = base.filter(l => new Date(l.date) <= ed);
    }
    return base;
  };

  const filteredEntries = getFilteredEntries();

  const handleExportCSV = () => {
    let filteredLedgers = [];
    let party = null;
    let statementFor = 'All Parties';
    let balance = 0;
    
    if (filterType === 'customer') {
      if (!selectedPartyId) {
        toast.warning('Please select a customer target profile!');
        return;
      }
      party = customers.find(c => c.id === selectedPartyId);
      if (!party) return;
      filteredLedgers = filteredEntries;
      statementFor = party.shopName || party.name;
      balance = parseFloat(party.balance || 0);
    } else if (filterType === 'supplier') {
      if (!selectedPartyId) {
        toast.warning('Please select a supplier target profile!');
        return;
      }
      party = suppliers.find(s => s.id === selectedPartyId);
      if (!party) return;
      filteredLedgers = filteredEntries;
      statementFor = party.shopName || party.name;
      balance = parseFloat(party.balance || 0);
    } else {
      filteredLedgers = filteredEntries;
    }

    if (!filteredLedgers.length) {
      toast.info('No ledger entries recorded for this selection context.');
      return;
    }

    // Sort oldest to newest to compute running balance chronologically
    const chronological = [...filteredLedgers].reverse();
    let running = 0;

    const rows = chronological.map(l => {
      const amt = parseFloat(l.amount || 0);
      let runBal = 0;
      let drCrLabel = 'Dr';
      
      if (filterType === 'customer') {
        if (l.type === 'DEBIT') running += amt;
        else running -= amt;
        runBal = running;
        drCrLabel = runBal >= 0 ? 'Dr' : 'Cr';
      } else if (filterType === 'supplier') {
        if (l.type === 'CREDIT') running += amt;
        else running -= amt;
        runBal = running;
        drCrLabel = runBal >= 0 ? 'Cr' : 'Dr';
      } else {
        runBal = parseFloat(l.runningBalance || 0);
        drCrLabel = runBal >= 0 ? 'Dr' : 'Cr';
      }

      return [
        new Date(l.date).toLocaleDateString('en-IN'),
        l.particulars || '—',
        l.type,
        amt.toFixed(2),
        Math.abs(runBal).toFixed(2),
        drCrLabel,
      ];
    });

    const isOwed = balance > 0;
    const balanceStr = filterType === 'all' 
      ? 'N/A' 
      : `Rs.${Math.abs(balance).toFixed(2)} ${filterType === 'customer' ? (isOwed ? 'Dr' : 'Cr') : (isOwed ? 'Cr' : 'Dr')}`;

    const businessInfo = [
      [`Business Name`, cleanCSVVal(activeShop?.businessName)],
      [`Business Phone`, cleanCSVVal(activeShop?.phone || activeShop?.businessPhone)],
      [`Business Email`, cleanCSVVal(activeShop?.businessEmail)],
      [`Business GSTIN`, cleanCSVVal(activeShop?.gstin)],
      [`Business Address`, cleanCSVVal(activeShop?.address)],
      [`Statement For`, cleanCSVVal(statementFor)],
      [`Party Contact`, party ? cleanCSVVal(party.name) : ''],
      [`Party Phone`, party ? cleanCSVVal(party.phone) : ''],
      [`Party GSTIN`, party ? cleanCSVVal(party.gstin) : ''],
      [`Party Email`, party ? cleanCSVVal(party.email) : ''],
      [`Party Address`, party ? cleanCSVVal(party.billingAddress) : ''],
      [`Outstanding Balance`, balanceStr],
      [`Export Date`, new Date().toLocaleDateString('en-IN')],
      [],
      ['Date', 'Particulars', 'Type', 'Amount (INR)', 'Running Balance', 'Dr/Cr'],
      ...rows,
    ];

    const csvContent = businessInfo.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const filename = `${filterType === 'all' ? 'master' : (party?.shopName || party?.name || 'statement')}_ledger_${new Date().toISOString().split('T')[0]}.csv`;
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: filename,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Professional CSV Audit Ledger downloaded successfully! 💾');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        {/* Paper visual element */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900" />
        
        <div className="flex flex-col items-center max-w-lg mx-auto space-y-6">
          <div className="p-4 bg-slate-50 text-slate-400 rounded-full relative">
            <FileDigit size={32} className="text-slate-700" />
          </div>
          <div className="text-center">
            <h2 className="text-base font-black text-slate-900">{t.reportsTitle || 'Financial Reports Auditing'}</h2>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">
              {t.reportsDesc || 'Export beautifully formatted account statement ledger logs directly to CSV spreadsheet format.'}
            </p>
          </div>

          {/* Premium Selector Controls */}
          <div className="w-full flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 shrink-0">
            <button
              type="button"
              onClick={() => { setFilterType('all'); setSelectedPartyId(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${filterType === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 font-semibold'
                }`}
            >
              All Ledger
            </button>
            <button
              type="button"
              onClick={() => { setFilterType('customer'); setSelectedPartyId(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${filterType === 'customer'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 font-semibold'
                }`}
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => { setFilterType('supplier'); setSelectedPartyId(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${filterType === 'supplier'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 font-semibold'
                }`}
            >
              Supplier
            </button>
          </div>

          {/* Conditional Target Party Selection */}
          {filterType === 'customer' && (
            <div className="w-full space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Select Billed Customer</label>
              <select
                value={selectedPartyId}
                onChange={e => setSelectedPartyId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-bold text-slate-800"
              >
                <option value="">-- Choose Target Customer Profile --</option>
                {customers.filter(c => !c.isDeleted || c.id === selectedPartyId).map(c => (
                  <option key={c.id} value={c.id}>
                    {c.shopName ? `${c.shopName} (${c.name})` : c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {filterType === 'supplier' && (
            <div className="w-full space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Select Target Supplier</label>
              <select
                value={selectedPartyId}
                onChange={e => setSelectedPartyId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-bold text-slate-800"
              >
                <option value="">-- Choose Target Supplier Profile --</option>
                {suppliers.filter(s => !s.isDeleted || s.id === selectedPartyId).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.shopName ? `${s.shopName} (${s.name})` : s.name} {s.phone ? `(${s.phone})` : ''}
                  </option>
                ))}
              </select>
          </div>
          )}

            {/* Date range filters */}
            <div className="w-full flex space-x-2 mt-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-600 mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-600 mb-1">End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          <div className="w-full pt-2 space-y-3">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold flex items-center justify-between">
              <span className="text-slate-600">Matching ledger entries:</span>
              <span className="font-mono font-black text-slate-900 bg-slate-200/50 px-2 py-0.5 rounded">
                {filteredEntries.length} rows
              </span>
            </div>
            
            <button
              onClick={handleExportCSV}
              disabled={filterType !== 'all' && !selectedPartyId}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl text-xs transition-all tracking-wider uppercase flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <Download size={14} /> Export CSV Audit Ledger File 💾
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
