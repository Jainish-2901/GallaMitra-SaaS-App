import React, { useState, useContext, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { AppContext } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { translations } from '../utils/translations.js';
import { History, PlusCircle, Plus, Loader2, Edit2, Trash2, X, Printer, FileDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function PurchaseLedger() {
  const { activeShop, suppliers, ledgerHistory, postManualLedgerEntry, editManualLedgerEntry, deleteManualLedgerEntry, generateShortShareLink, loading } = useContext(AppContext);
  const toast = useToast();
  const activeLang = activeShop?.language || 'gu';
  const t = translations[activeLang] || translations.en;

  const [mlPartyId, setMlPartyId] = useState('');
  const [mlType, setMlType] = useState('DEBIT');
  const [mlAmount, setMlAmount] = useState('');
  const [mlParticulars, setMlParticulars] = useState('');
  const [mlDate, setMlDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mlSubmitting, setMlSubmitting] = useState(false);

  const [filterSupplierId, setFilterSupplierId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const ledgerReportRef = useRef(null);

  // Edit states for manual ledger entries
  const [editingEntry, setEditingEntry] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editParticulars, setEditParticulars] = useState('');
  const [editType, setEditType] = useState('DEBIT');
  const [editDate, setEditDate] = useState('');

  const supplierLedger = useMemo(() => {
    return ledgerHistory.filter(l => l.supplierId !== null);
  }, [ledgerHistory]);

  const displayLedger = useMemo(() => {
    let list = supplierLedger;
    if (filterSupplierId) {
      list = supplierLedger.filter(l => l.supplierId === filterSupplierId);
    }
    const chronological = [...list].reverse();
    let running = 0;
    const computed = chronological.map(l => {
      const amt = parseFloat(l.amount || 0);
      if (l.type === 'CREDIT') running += amt;
      else running -= amt;
      return {
        ...l,
        computedRunningBalance: running
      };
    });
    const newestFirst = [...computed].reverse();
    let dateFiltered = newestFirst;
    if (startDate && endDate) {
      dateFiltered = newestFirst.filter(l => {
        const d = new Date(l.date).toISOString().split('T')[0];
        return d >= startDate && d <= endDate;
      });
    }
    return dateFiltered;
  }, [supplierLedger, filterSupplierId, startDate, endDate]);

  const handlePrintRef = async (ref, title) => {
    if (!ref?.current) return;
    setPrintLoading(true);
    try {
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const dataUrl = canvas.toDataURL('image/png');
      const win = window.open('', '_blank');
      win.document.write(`
        <html>
          <head><title>${title}</title></head>
          <body style="margin:0;display:flex;justify-content:center;">
            <img src="${dataUrl}" style="max-width:100%;height:auto;" onload="window.print();window.close();" />
          </body>
        </html>
      `);
      win.document.close();
    } catch (err) {
      console.error(err);
      toast.error('Print generation failed');
    }
    setPrintLoading(false);
  };

  const handleSaveRefAsPDF = async (ref, filename) => {
    if (!ref?.current) return;
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(filename);
    } catch (err) {
      console.error(err);
      toast.error('PDF generation failed');
    }
    setPdfLoading(false);
  };

  const LedgerReportPrint = () => {
    const selectedSupp = suppliers.find(s => s.id === filterSupplierId);
    const title = selectedSupp ? (selectedSupp.shopName || selectedSupp.name) : 'Master Purchase Ledger';
    
    return (
      <div ref={ledgerReportRef} style={{ background: '#fff', padding: '32px', fontFamily: 'Arial, sans-serif', width: '750px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', borderBottom: '2px solid #cbd5e1', paddingBottom: '20px' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: '20px', color: '#0f172a' }}>{activeShop?.businessName}</div>
            {activeShop?.address && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', maxWidth: '300px', lineHeight: '1.4', whiteSpace: 'pre-line' }}>{activeShop.address}</div>}
            {activeShop?.phone && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Tel: {activeShop.phone}</div>}
            {activeShop?.gstin && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>GSTIN: {activeShop.gstin}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Account Statement</div>
            <div style={{ fontWeight: 900, fontSize: '14px', color: '#0f172a' }}>{title}</div>
            {selectedSupp && (
              <>
                {selectedSupp.shopName && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Contact: {selectedSupp.name}</div>}
                {selectedSupp.phone && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Tel: {selectedSupp.phone}</div>}
                {selectedSupp.billingAddress && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', maxWidth: '250px' }}>{selectedSupp.billingAddress}</div>}
              </>
            )}
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px' }}>Generated: {new Date().toLocaleDateString('en-IN')}</div>
          </div>
        </div>

        {(startDate || endDate) && (
          <div style={{ marginBottom: '15px', fontSize: '11px', color: '#475569', fontWeight: 'bold' }}>
            Statement Period: {startDate ? new Date(startDate).toLocaleDateString('en-IN') : 'Beginning'} to {endDate ? new Date(endDate).toLocaleDateString('en-IN') : 'Present'}
          </div>
        )}

        {selectedSupp && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontWeight: 900, fontSize: '16px', color: '#0f172a', fontFamily: 'monospace' }}>{displayLedger.length}</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', textTransform: 'uppercase' }}>Total Entries</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontWeight: 900, fontSize: '16px', color: '#0f172a', fontFamily: 'monospace' }}>₹{Math.abs(parseFloat(selectedSupp.balance || 0)).toFixed(2)}</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', textTransform: 'uppercase' }}>Net Payable</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontWeight: 900, fontSize: '16px', color: '#0f172a', fontFamily: 'monospace' }}>{parseFloat(selectedSupp.balance || 0) >= 0 ? 'You Give' : 'You Get'}</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', textTransform: 'uppercase' }}>Status</div>
            </div>
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#0f172a', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>#</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Date</th>
              {!selectedSupp && <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Supplier</th>}
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Particulars</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>Type</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>Amount (₹)</th>
              {selectedSupp && <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>Running Balance</th>}
            </tr>
          </thead>
          <tbody>
            {displayLedger.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No transactions found for this period.</td></tr>
            ) : (
              [...displayLedger].reverse().map((l, idx) => {
                const amt = parseFloat(l.amount || 0);
                const runBal = l.computedRunningBalance;
                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding: '8px 10px', color: '#94a3b8', fontFamily: 'monospace' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 10px', color: '#64748b', fontFamily: 'monospace' }}>{new Date(l.date).toLocaleDateString('en-IN')}</td>
                    {!selectedSupp && (
                      <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#0f172a' }}>
                        {(() => { const s = suppliers.find(supp => supp.id === l.supplierId); return s?.shopName || s?.name || 'Supplier'; })()}
                      </td>
                    )}
                    <td style={{ padding: '8px 10px', color: '#0f172a', fontWeight: 600 }}>{l.particulars || '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ border: '1px solid #cbd5e1', padding: '1px 5px', borderRadius: '4px', fontSize: '8px', fontWeight: 800 }}>
                        {l.type}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: l.type === 'DEBIT' ? '#dc2626' : '#16a34a' }}>₹{amt.toFixed(2)}</td>
                    {selectedSupp && (
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>
                        ₹{Math.abs(runBal || 0).toFixed(2)} {runBal >= 0 ? 'Cr' : 'Dr'}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const startEditEntry = (entry) => {
    setEditingEntry(entry);
    setEditAmount(entry.amount);
    setEditParticulars(entry.particulars);
    setEditType(entry.type);
    setEditDate(new Date(entry.date).toISOString().split('T')[0]);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const res = await editManualLedgerEntry(editingEntry.id, {
      amount: parseFloat(editAmount),
      particulars: editParticulars,
      type: editType,
      date: editDate
    });
    if (res.success) {
      toast.success('Ledger entry updated and balances recalculated.');
      setEditingEntry(null);
    } else {
      toast.error('Failed to update ledger entry.');
    }
  };

  const handleDeleteEntry = async (id) => {
    if (window.confirm('Delete this ledger entry? Running balances will adjust.')) {
      const res = await deleteManualLedgerEntry(id);
      if (res.success) {
        toast.success('Ledger entry permanently deleted.');
      } else {
        toast.error('Failed to delete ledger entry.');
      }
    }
  };

  const handleShareWhatsApp = async (log) => {
    const linkRes = await generateShortShareLink({ partyId: log.supplierId, role: 'supplier', tab: 'ledger' });
    if (!linkRes.success || !linkRes.shortUrl) {
      toast.error(linkRes.error || 'Failed to generate portal link.');
      return;
    }
    const supplier = suppliers.find(s => s.id === log.supplierId);
    const dateStr = new Date(log.date).toLocaleDateString();
    const shortUrl = linkRes.shortUrl;
    let text = `*GallaMitra Supplier Ledger Entry Update*\n`;
    text += `🏢 Shop: *${activeShop?.businessName}*\n`;
    text += `👤 Supplier: *${supplier?.name || 'Supplier'}*\n`;
    text += `📅 Date: *${dateStr}*\n`;
    text += `📝 Particulars: *${log.particulars || '—'}*\n`;
    text += `🔄 Type: *${log.type === 'DEBIT' ? 'You Gave (Debit)' : 'You Got (Credit)'}*\n`;
    text += `💰 Amount: *₹${parseFloat(log.amount).toFixed(2)}*\n\n`;
    text += `🔗 View full ledger statement & receipts: ${shortUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mlPartyId) { toast.warning('Please select a supplier account!'); return; }
    setMlSubmitting(true);
    const res = await postManualLedgerEntry(parseFloat(mlAmount), mlType, mlParticulars, null, mlPartyId, mlDate);
    setMlSubmitting(false);
    if (res.success) {
      toast.success(`✅ Supplier ledger entry posted — ${mlType} ₹${mlAmount}`);
      setMlPartyId(''); setMlAmount(''); setMlParticulars(''); setMlDate(new Date().toISOString().split('T')[0]);
    } else {
      toast.error('Failed to post entry. Please retry.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Manual Entry Panel */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <PlusCircle size={16} className="text-emerald-600" />
          <div>
            <h3 className="text-sm font-black text-slate-900">Quick Manual Ledger Entry (Supplier)</h3>
            <p className="text-slate-500 text-[10px] mt-0.5 font-medium">Post a manual DEBIT or CREDIT against a supplier account</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Supplier Account</label>
            <select value={mlPartyId} onChange={e => setMlPartyId(e.target.value)} required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-medium text-slate-800">
              <option value="">-- Select Supplier --</option>
              {suppliers.filter(s => !s.isDeleted).map(s => <option key={s.id} value={s.id}>{s.shopName ? `${s.shopName} — ${s.name}` : s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Entry Type</label>
            <div className="flex bg-slate-100 border border-slate-200 p-0.5 rounded-xl">
              <button type="button" onClick={() => setMlType('DEBIT')}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${mlType === 'DEBIT' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500'}`}>
                {t.youGave || 'You Gave'}
              </button>
              <button type="button" onClick={() => setMlType('CREDIT')}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${mlType === 'CREDIT' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500'}`}>
                {t.youGot || 'You Got'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Entry Date</label>
            <input type="date" value={mlDate} onChange={e => setMlDate(e.target.value)} required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 text-slate-800 focus:bg-white" />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Amount (₹)</label>
            <input type="number" step="any" min="0" value={mlAmount} onChange={e => setMlAmount(e.target.value)} required
              placeholder="0.00" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white" />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Particulars</label>
            <input type="text" value={mlParticulars} onChange={e => setMlParticulars(e.target.value)} required
              placeholder="e.g. Payment made, opening balance..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 focus:bg-white font-semibold" />
          </div>
          <div>
            <button type="submit" disabled={mlSubmitting}
              className={`w-full font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all ${mlType === 'DEBIT' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
              {mlSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {t.commitEntryBtn || 'Post Entry'}
            </button>
          </div>
        </form>
      </div>

      {/* Purchase Ledger Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="border-b pb-3 mb-4">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <History size={18} className="text-slate-700" /> {t.purchaseLedgerTitle}
          </h2>
          <p className="text-slate-400 text-xs font-medium mt-0.5">Chronological vendor credit ledger footprint</p>
        </div>

        {/* Filter and Export Panel */}
        <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl mb-5 flex flex-wrap gap-4 items-end text-left">
          <div className="min-w-[180px] flex-1">
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter by Supplier</label>
            <select
              value={filterSupplierId}
              onChange={e => setFilterSupplierId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800"
            >
              <option value="">-- All Suppliers (Audit Master) --</option>
              {suppliers.filter(s => !s.isDeleted).map(s => (
                <option key={s.id} value={s.id}>{s.shopName ? `${s.shopName} — ${s.name}` : s.name}</option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none"
            />
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 w-full lg:w-auto justify-end">
            <button
              onClick={() => handlePrintRef(ledgerReportRef, filterSupplierId ? 'Supplier Statement' : 'Master Purchase Ledger')}
              disabled={printLoading}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              {printLoading ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />}
              Print
            </button>
            <button
              onClick={() => handleSaveRefAsPDF(ledgerReportRef, filterSupplierId ? `Statement_${filterSupplierId.slice(-6)}.pdf` : 'PurchaseLedgerMaster.pdf')}
              disabled={pdfLoading}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              {pdfLoading ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
              PDF
            </button>
            {(filterSupplierId || startDate || endDate) && (
              <button
                onClick={() => { setFilterSupplierId(''); setStartDate(''); setEndDate(''); }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-3 w-1/3">
                  <div className="w-8 h-8 rounded-lg bg-slate-200" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-2.5 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-slate-200 rounded w-20 hidden md:block" />
                <div className="h-3 bg-slate-200 rounded w-16 hidden md:block" />
                <div className="flex flex-col items-end gap-1.5">
                  <div className="h-3.5 bg-slate-200 rounded w-14" />
                  <div className="h-2 bg-slate-200 rounded w-8" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Desktop View Table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-mono text-[9px] uppercase tracking-wider border-b">
                    <th className="p-3">{t.date}</th>
                    <th className="p-3">{t.scope}</th>
                    <th className="p-3">{t.particulars}</th>
                    <th className="p-3 text-center">{t.type}</th>
                    <th className="p-3 text-right">{t.amount}</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {displayLedger.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-12 text-slate-400 font-mono">No supplier transactions registered yet.</td></tr>
                  ) : (
                    displayLedger.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono text-slate-400 text-[11px]">{new Date(log.date).toLocaleString()}</td>
                        <td className="p-3 font-bold text-slate-900">{(() => { const supp = suppliers.find(s => s.id === log.supplierId); return supp?.shopName || supp?.name || 'Supplier'; })()}</td>
                        <td className="p-3 text-slate-500 max-w-xs truncate">{log.particulars || '—'}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-block font-mono font-black px-2 py-0.5 rounded text-[9px] ${log.type === 'DEBIT' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {log.type}
                          </span>
                        </td>
                        <td className={`p-3 text-right font-mono font-black ${log.type === 'DEBIT' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          ₹{parseFloat(log.amount).toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleShareWhatsApp(log)}
                              className="p-1 text-emerald-600 hover:text-emerald-700 rounded transition-colors"
                              title="Share to WhatsApp"
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                            </button>
                            {!log.referenceId ? (
                              <>
                                <button
                                  onClick={() => startEditEntry(log)}
                                  className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                                  title="Edit Entry"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteEntry(log.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                  title="Delete Entry"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono italic">System</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View Card Grid */}
            <div className="block md:hidden space-y-3">
              {displayLedger.length === 0 ? (
                <div className="text-center py-10 font-mono text-slate-400 text-xs">
                  No supplier transactions registered yet.
                </div>
              ) : (
                displayLedger.map(log => {
                  const supp = suppliers.find(s => s.id === log.supplierId);
                  const supplierName = supp?.shopName || supp?.name || 'Supplier';
                  return (
                    <div key={log.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-2xs space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono text-slate-400">{new Date(log.date).toLocaleDateString()}</span>
                          <h4 className="font-bold text-slate-900 text-xs mt-0.5">{supplierName}</h4>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block font-mono font-black px-1.5 py-0.5 rounded text-[8px] uppercase ${log.type === 'DEBIT' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {log.type}
                          </span>
                          <span className={`block text-xs font-black font-mono mt-1 ${log.type === 'DEBIT' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            ₹{parseFloat(log.amount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 bg-white/65 border border-slate-100/50 p-2.5 rounded-xl">
                        <span className="font-bold text-slate-400 block text-[9px] uppercase tracking-wider">Particulars</span>
                        <span className="font-semibold text-slate-700">{log.particulars || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-400 font-mono">
                            {log.referenceId ? 'System Automated' : 'Manual Entry'}
                          </span>
                          <button
                            onClick={() => handleShareWhatsApp(log)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 rounded-lg transition-colors"
                            title="Share to WhatsApp"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </button>
                        </div>
                        {!log.referenceId && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditEntry(log)}
                              className="p-1.5 text-slate-500 bg-white border border-slate-200 rounded-lg hover:text-blue-600"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(log.id)}
                              className="p-1.5 text-rose-500 bg-rose-50 border border-rose-100 rounded-lg hover:text-rose-700"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Manual Entry Edit Sliding Modal Overlay */}
      {editingEntry && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-100">
            <div className="bg-[#0F172A] p-4 flex justify-between items-center text-white">
              <div>
                <h3 className="font-black text-sm">Edit Ledger Entry</h3>
                <p className="text-slate-400 text-[10px] font-mono mt-0.5">Modify manual transaction values and particulars</p>
              </div>
              <button
                onClick={() => setEditingEntry(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">Entry Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">Entry Type</label>
                <div className="flex bg-slate-100 border border-slate-200 p-0.5 rounded-xl">
                  <button type="button" onClick={() => setEditType('DEBIT')}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${editType === 'DEBIT' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500'}`}>
                    You Gave (DEBIT)
                  </button>
                  <button type="button" onClick={() => setEditType('CREDIT')}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${editType === 'CREDIT' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500'}`}>
                    You Got (CREDIT)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">Particulars</label>
                <input
                  type="text"
                  value={editParticulars}
                  onChange={e => setEditParticulars(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 font-semibold"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-5 rounded-xl text-xs"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden printable ledger report */}
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', zIndex: -1 }}>
        <LedgerReportPrint />
      </div>
    </motion.div>
  );
}
