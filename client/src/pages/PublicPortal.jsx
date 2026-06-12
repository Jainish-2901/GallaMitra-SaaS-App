import React, { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../context/AppContext.jsx';
import {
  Phone, ArrowUpRight, ArrowDownLeft, Store, Download, Printer,
  FileText, X, Eye, TrendingUp, CreditCard, CheckCircle, Clock,
  Wallet, Receipt, BookOpen, AlertCircle, Shield, FileDown,
  ChevronRight, BarChart3, Hash, Calendar, Building2, MapPin,
  Banknote, Package
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function PublicPortal() {
  const { fetchPublicCustomer, fetchPublicSupplier } = useContext(AppContext);

  const urlParams = new URLSearchParams(window.location.search);
  const portalType = urlParams.get('type') || 'customer';
  const entityId = urlParams.get('id');
  const portalToken = urlParams.get('token');

  const [portalData, setPortalData] = useState(null);
  const [activeTab, setActiveTab] = useState('dash');
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const ledgerReportRef = useRef(null);
  const receiptPrintRef = useRef(null);
  const invoicePrintRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      if (!entityId || !portalToken) {
        setPortalData({ error: 'Invalid or missing portal access link. Please request a new link from the shop owner.' });
        setLoading(false);
        return;
      }
      const result = portalType === 'customer'
        ? await fetchPublicCustomer(entityId, portalToken)
        : await fetchPublicSupplier(entityId, portalToken);
      setPortalData(result);
      setLoading(false);
    };
    load();
  }, [entityId, portalType, portalToken]);

  const profile = portalType === 'customer' ? portalData?.customer : portalData?.supplier;
  const balance = parseFloat(profile?.balance || 0);
  const isOwed = balance > 0;
  const ledgers = portalData?.ledgers || [];

  const computedLedgers = React.useMemo(() => {
    if (!ledgers || ledgers.length === 0) return [];

    // Sort oldest to newest to compute running balance chronologically
    const chronological = [...ledgers].reverse();
    let running = 0;

    const computed = chronological.map(l => {
      const amt = parseFloat(l.amount || 0);
      if (portalType === 'customer') {
        if (l.type === 'DEBIT') running += amt;
        else running -= amt;
      } else {
        if (l.type === 'CREDIT') running += amt;
        else running -= amt;
      }
      return {
        ...l,
        computedRunningBalance: running
      };
    });

    // Filter by date range if specified
    let filtered = computed;
    if (startDate && endDate) {
      filtered = computed.filter(l => {
        const d = new Date(l.date).toISOString().split('T')[0];
        return d >= startDate && d <= endDate;
      });
    }

    // Return newest first (descending) for standard UI rendering
    return filtered.reverse();
  }, [ledgers, portalType, startDate, endDate]);

  useEffect(() => {
    if (profile) {
      document.title = profile.shopName || profile.name || 'GallaMitra Portal';
    }
  }, [profile]);

  useEffect(() => {
    if (!loading && portalData) {
      const urlParams = new URLSearchParams(window.location.search);
      const docId = urlParams.get('docId');
      const receiptId = urlParams.get('receiptId');

      if (docId) {
        if (portalType === 'customer' && portalData.invoices) {
          const inv = portalData.invoices.find(i => String(i.id) === String(docId));
          if (inv) {
            setSelectedDoc({ type: 'invoice', ...inv });
          }
        } else if (portalType === 'supplier' && portalData.purchaseBills) {
          const pb = portalData.purchaseBills.find(p => String(p.id) === String(docId));
          if (pb) {
            setSelectedDoc({ type: 'purchase_bill', ...pb });
          }
        }
      }

      if (receiptId && portalData.receipts) {
        const rec = portalData.receipts.find(r => String(r.id) === String(receiptId));
        if (rec) {
          setSelectedReceipt(rec);
        }
      }
    }
  }, [loading, portalData, portalType]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-xs font-mono tracking-widest animate-pulse">SYNCHRONIZING SECURE CHANNEL...</p>
      </div>
    );
  }

  if (!portalData || portalData.error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-slate-50">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
          <AlertCircle size={28} className="text-rose-600" />
        </div>
        <h2 className="text-slate-900 font-black text-lg">Portal Unavailable</h2>
        <p className="text-slate-500 text-sm text-center max-w-xs leading-relaxed">
          This link has expired, is invalid, or the account could not be found.
        </p>
      </div>
    );
  }

  const tabs = portalType === 'customer'
    ? [
      { id: 'dash', label: 'Overview', icon: TrendingUp },
      { id: 'ledger', label: 'Ledger', icon: BookOpen },
      { id: 'receipts', label: 'Payments', icon: Wallet },
      { id: 'invoices', label: 'Invoices', icon: Receipt },
    ]
    : [
      { id: 'dash', label: 'Overview', icon: TrendingUp },
      { id: 'ledger', label: 'Ledger', icon: BookOpen },
      { id: 'receipts', label: 'Remitted', icon: Wallet },
      { id: 'invoices', label: 'Slips', icon: Receipt },
    ];

  // ── CSV Export (rich) ───────────────────────────────────────────────────────
  const cleanCSVVal = (val) => {
    if (val === null || val === undefined) return '';
    const s = String(val).trim();
    if (s === '—' || s === '-' || s === 'undefined' || s === 'null') return '';
    return s;
  };

  const handleExportCSV = () => {
    if (!startDate || !endDate) {
      alert('Please select starting & ending date first!');
      return;
    }
    if (!computedLedgers.length) return;

    // Export chronologically for natural reading order (oldest first)
    const rows = [...computedLedgers].reverse().map(l => {
      const amt = parseFloat(l.amount || 0);
      const runBal = l.computedRunningBalance;
      const drCrLabel = portalType === 'customer'
        ? (runBal >= 0 ? 'Dr' : 'Cr')
        : (runBal >= 0 ? 'Cr' : 'Dr');
      return [
        new Date(l.date).toLocaleDateString('en-IN'),
        l.particulars || '—',
        l.type,
        amt.toFixed(2),
        Math.abs(runBal).toFixed(2),
        drCrLabel,
      ];
    });

    const businessInfo = [
      [`Business Name`, cleanCSVVal(profile?.businessName)],
      [`Business Phone`, cleanCSVVal(profile?.businessPhone || profile?.shopPhone)],
      [`Business Email`, cleanCSVVal(profile?.businessEmail)],
      [`Business GSTIN`, cleanCSVVal(profile?.shopGstin)],
      [`Business Address`, cleanCSVVal(profile?.shopAddress)],
      [`Statement For`, cleanCSVVal(profile?.shopName || profile?.name)],
      [`Party Contact`, profile?.shopName ? cleanCSVVal(profile?.name) : ''],
      [`Party Phone`, cleanCSVVal(profile?.phone)],
      [`Party GSTIN`, cleanCSVVal(profile?.gstin)],
      [`Party Email`, cleanCSVVal(profile?.email)],
      [`Party Address`, cleanCSVVal(profile?.billingAddress)],
      [`Outstanding Balance`, `Rs.${Math.abs(balance).toFixed(2)} ${isOwed ? 'Dr' : 'Cr'}`],
      [`Export Date`, new Date().toLocaleDateString('en-IN')],
      [],
      ['Date', 'Particulars', 'Type', 'Amount (INR)', 'Running Balance', 'Dr/Cr'],
      ...rows,
    ];

    const csvContent = businessInfo.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `${profile?.shopName || profile?.name || 'statement'}_ledger_${new Date().toISOString().split('T')[0]}.csv`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Capture element as canvas → image ──────────────────────────────────────
  const captureElement = async (ref) => {
    if (!ref?.current) return null;
    return await html2canvas(ref.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
  };

  // ── Print ledger report via html2canvas ────────────────────────────────────
  const handlePrintLedger = async () => {
    if (!startDate || !endDate) {
      alert('Please select starting & ending date first!');
      return;
    }
    setPrintLoading(true);
    try {
      const canvas = await captureElement(ledgerReportRef);
      if (!canvas) return;
      const win = window.open('', '_blank');
      win.document.write(`
        <html><head><title>Ledger Report — ${profile?.shopName || profile?.name}</title>
        <style>body{margin:0;padding:0;background:#fff}img{max-width:100%;height:auto}</style>
        </head><body>
        <img src="${canvas.toDataURL('image/png')}" onload="window.print();window.close();" />
        </body></html>
      `);
      win.document.close();
    } finally {
      setPrintLoading(false);
    }
  };

  // ── Save ledger as PDF ─────────────────────────────────────────────────────
  const handleSavePDF = async () => {
    if (!startDate || !endDate) {
      alert('Please select starting & ending date first!');
      return;
    }
    setPdfLoading(true);
    try {
      const canvas = await captureElement(ledgerReportRef);
      if (!canvas) return;
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;

      let yOffset = 0;
      const pageH = pdf.internal.pageSize.getHeight();
      while (yOffset < pdfH) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfW, pdfH);
        yOffset += pageH;
      }
      pdf.save(`${profile?.shopName || profile?.name || 'ledger'}_statement_${new Date().toISOString().split('T')[0]}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Print a modal ref ───────────────────────────────────────────────────────
  const handlePrintRef = async (ref, title) => {
    const canvas = await captureElement(ref);
    if (!canvas) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>${title}</title>
      <style>body{margin:0;padding:0;background:#fff}img{max-width:100%;height:auto}</style>
      </head><body>
      <img src="${canvas.toDataURL('image/png')}" onload="window.print();window.close();" />
      </body></html>
    `);
    win.document.close();
  };

  // ── Save a modal ref as PDF ─────────────────────────────────────────────────
  const handleSaveRefAsPDF = async (ref, filename) => {
    const canvas = await captureElement(ref);
    if (!canvas) return;
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = (canvas.height * pdfW) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
    pdf.save(filename);
  };

  // ── Parse invoice items ─────────────────────────────────────────────────────
  const parseItems = (doc) => {
    try { return typeof doc.itemsJson === 'string' ? JSON.parse(doc.itemsJson) : (doc.itemsJson || []); } catch { return []; }
  };

  // ── LEDGER REPORT: printable panel ─────────────────────────────────────────
  const LedgerReport = () => {
    return (
      <div ref={ledgerReportRef} style={{ background: '#fff', padding: '32px', fontFamily: 'Arial, sans-serif', maxWidth: '800px' }}>
        {/* Business Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', borderBottom: '2px solid #cbd5e1', paddingBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {profile?.logoUrl ? (
              <img src={profile.logoUrl} alt="Logo" style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
            ) : (
              <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#0f172a', fontWeight: 900, fontSize: '22px' }}>{(profile?.businessName || 'G')[0]}</span>
              </div>
            )}
            <div>
              <div style={{ fontWeight: 900, fontSize: '18px', color: '#0f172a' }}>{profile?.businessName}</div>
              {profile?.shopAddress && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{profile.shopAddress}</div>}
              {profile?.shopPhone && <div style={{ fontSize: '11px', color: '#64748b' }}>Tel: {profile.shopPhone}</div>}
              {profile?.shopGstin && <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>GSTIN: {profile.shopGstin}</div>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Account Statement</div>
            <div style={{ fontWeight: 900, fontSize: '14px', color: '#0f172a' }}>{profile?.shopName || profile?.name}</div>
            {profile?.shopName && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Contact: {profile?.name}</div>}
            {profile?.phone && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{profile.phone}</div>}
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>Generated: {new Date().toLocaleDateString('en-IN')}</div>
          </div>
        </div>

        {/* Balance Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Entries', val: computedLedgers.length },
            { label: 'Outstanding', val: `₹${Math.abs(balance).toFixed(2)}` },
            { label: 'Status', val: isOwed ? 'Due' : 'Cleared' },
          ].map(s => (
            <div key={s.label} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontWeight: 900, fontSize: '18px', color: '#0f172a', fontFamily: 'monospace' }}>{s.val}</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Ledger Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#0f172a', borderBottom: '2px solid #cbd5e1' }}>
              {['#', 'Date', 'Particulars', 'Type', 'Amount (₹)', 'Running Balance'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Amount (₹)' || h === 'Running Balance' ? 'right' : 'left', fontWeight: 700, fontSize: '10px', letterSpacing: '0.04em', color: '#0f172a' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!computedLedgers.length ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No transactions found.</td></tr>
            ) : computedLedgers.map((l, idx) => {
              const amt = parseFloat(l.amount || 0);
              const isDebit = l.type === 'DEBIT';
              const runBal = l.computedRunningBalance;
              const drCrLabel = portalType === 'customer'
                ? (runBal >= 0 ? 'Dr' : 'Cr')
                : (runBal >= 0 ? 'Cr' : 'Dr');
              return (
                <tr key={l.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '9px 12px', color: '#94a3b8', fontFamily: 'monospace', fontSize: '10px' }}>{idx + 1}</td>
                  <td style={{ padding: '9px 12px', color: '#64748b', fontFamily: 'monospace' }}>{new Date(l.date).toLocaleDateString('en-IN')}</td>
                  <td style={{ padding: '9px 12px', color: '#0f172a', fontWeight: 600 }}>{l.particulars || '—'}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ border: '1px solid #cbd5e1', color: '#0f172a', background: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 800, fontFamily: 'monospace' }}>
                      {l.type}
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>₹{amt.toFixed(2)}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                    ₹{Math.abs(runBal).toFixed(2)} <span style={{ fontSize: '9px', fontWeight: 700 }}>{drCrLabel}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
              <td colSpan="4" style={{ padding: '12px', color: '#0f172a', fontWeight: 700, fontSize: '11px' }}>Closing Balance</td>
              <td colSpan="2" style={{ padding: '12px', textAlign: 'right', color: '#0f172a', fontFamily: 'monospace', fontWeight: 900, fontSize: '13px' }}>
                ₹{Math.abs(balance).toFixed(2)} {isOwed ? 'Dr' : 'Cr'}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Footer */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>Powered by GallaMitra Platform</div>
          {profile?.shopSignatureUrl && (
            <div style={{ textAlign: 'right' }}>
              <img src={profile.shopSignatureUrl} alt="Signature" style={{ height: '36px', objectFit: 'contain' }} />
              <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>Authorized Signature</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── RECEIPT PRINT BODY ──────────────────────────────────────────────────────
  const ReceiptPrintBody = ({ receipt }) => (
    <div ref={receiptPrintRef} style={{ background: '#fff', padding: '32px', fontFamily: 'Arial, sans-serif', maxWidth: '480px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px dashed #e2e8f0', paddingBottom: '20px' }}>
        {profile?.logoUrl && <img src={profile.logoUrl} alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', margin: '0 auto 10px', display: 'block' }} />}
        <div style={{ fontWeight: 900, fontSize: '18px', color: '#0f172a' }}>{profile?.businessName}</div>
        {profile?.shopAddress && <div style={{ fontSize: '11px', color: '#64748b' }}>{profile.shopAddress}</div>}
        {profile?.shopPhone && <div style={{ fontSize: '11px', color: '#64748b' }}>Tel: {profile.shopPhone}</div>}
        {profile?.shopGstin && <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>GSTIN: {profile.shopGstin}</div>}
        <div style={{ marginTop: '10px', fontSize: '13px', fontWeight: 900, letterSpacing: '0.15em', color: '#0f172a', textTransform: 'uppercase' }}>Payment Receipt</div>
      </div>
      {/* Receipt Details */}
      <div style={{ marginBottom: '20px' }}>
        {[
          ['Receipt No.', `#${receipt.receiptNo}`],
          ['Date', new Date(receipt.date).toLocaleString('en-IN')],
          ['Received From', profile?.shopName || profile?.name],
          ['Payment Mode', receipt.paymentMode],
          receipt.remark ? ['Remark', receipt.remark] : null,
        ].filter(Boolean).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
            <span style={{ color: '#64748b' }}>{k}</span>
            <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: k === 'Receipt No.' ? 'monospace' : 'inherit' }}>{v}</span>
          </div>
        ))}
      </div>
      {/* Amount */}
      <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '18px', textAlign: 'center', margin: '20px 0' }}>
        <div style={{ color: '#64748b', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Amount Received</div>
        <div style={{ color: '#0f172a', fontWeight: 900, fontSize: '28px', fontFamily: 'monospace', marginTop: '4px' }}>₹{parseFloat(receipt.amount).toFixed(2)}</div>
      </div>
      {/* Signature */}
      {profile?.shopSignatureUrl && (
        <div style={{ textAlign: 'right', marginTop: '20px' }}>
          <img src={profile.shopSignatureUrl} alt="Signature" style={{ height: '36px', objectFit: 'contain' }} />
          <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>Authorized Signature</div>
        </div>
      )}
      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px', color: '#94a3b8' }}>Powered by GallaMitra</div>
    </div>
  );

  // ── INVOICE PRINT BODY ──────────────────────────────────────────────────────
  const InvoicePrintBody = ({ doc }) => {
    const items = parseItems(doc);
    const productItems = items.filter(it => it.rowType === 'item' || !it.rowType);
    const chargeItems = items.filter(it => it.rowType === 'charge');
    const isInvoice = doc.type === 'invoice';
    const subTotalVal = parseFloat(isInvoice ? (doc.subTotal || 0) : (doc.totalAmount || 0));
    const taxRateVal = parseFloat(doc.taxRate || 0);
    const taxAmountVal = parseFloat(doc.taxAmount || 0);
    const miscChargesVal = parseFloat(doc.miscCharges || 0);
    const grandTotalVal = parseFloat(isInvoice ? (doc.grandTotal || 0) : (doc.totalAmount || 0));

    // CGST & SGST calculations
    const cgstRate = (taxRateVal / 2).toFixed(1);
    const sgstRate = (taxRateVal / 2).toFixed(1);
    const cgstAmount = (taxAmountVal / 2).toFixed(2);
    const sgstAmount = (taxAmountVal / 2).toFixed(2);

    // Dynamic Seller & Buyer details based on document type
    const sellerName = isInvoice ? profile?.businessName : (profile?.shopName || profile?.name);
    const sellerAddress = isInvoice ? profile?.shopAddress : profile?.billingAddress;
    const sellerPhone = isInvoice ? (profile?.businessPhone || profile?.shopPhone) : profile?.phone;
    const sellerEmail = isInvoice ? profile?.businessEmail : profile?.email;
    const sellerGstin = isInvoice ? profile?.shopGstin : profile?.gstin;
    const sellerLogoUrl = isInvoice ? profile?.logoUrl : null;

    const buyerName = isInvoice ? (profile?.shopName || profile?.name) : profile?.businessName;
    const buyerAddress = isInvoice ? profile?.billingAddress : profile?.shopAddress;
    const buyerPhone = isInvoice ? profile?.phone : (profile?.businessPhone || profile?.shopPhone);
    const buyerEmail = isInvoice ? profile?.email : profile?.businessEmail;
    const buyerGstin = isInvoice ? profile?.gstin : profile?.shopGstin;
    const buyerState = isInvoice ? profile?.state : profile?.shopState || profile?.state;

    return (
      <div ref={invoicePrintRef} style={{ background: '#fff', padding: '40px', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '800px', border: '1px solid #e2e8f0', position: 'relative' }}>
        {/* Top Accent Line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', backgroundColor: '#cbd5e1' }} />

        {/* 1. Header: Logo & Shop Details on Left, Title & Invoice details on Right */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {sellerLogoUrl ? (
              <img src={sellerLogoUrl} alt="Logo" style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #e2e8f0', padding: '2px', backgroundColor: '#fff' }} />
            ) : (
              <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justify: 'center' }}>
                <span style={{ color: '#0f172a', fontWeight: 900, fontSize: '26px' }}>{(sellerName || 'G')[0]}</span>
              </div>
            )}
            <div>
              <h2 style={{ fontWeight: 900, fontSize: '20px', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>{sellerName}</h2>
              {sellerAddress && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', maxWidth: '300px', lineHeight: '1.4' }}>{sellerAddress}</div>}
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                {sellerPhone ? `Phone: ${sellerPhone}` : ''}
                {sellerEmail ? ` | Email: ${sellerEmail}` : ''}
              </div>
              {!isInvoice && profile?.shopName && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Contact: {profile.name}</div>}
              {sellerGstin && (
                <div style={{ marginTop: '6px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#475569', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
                    GSTIN: {sellerGstin}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ padding: '6px 14px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', display: 'inline-block', textTransform: 'uppercase' }}>
              {isInvoice ? (taxAmountVal > 0 ? 'TAX INVOICE' : 'BILL OF SUPPLY') : 'PURCHASE INVOICE'}
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: '12px 0 4px', fontFamily: 'monospace' }}>
              #{isInvoice ? doc.invoiceNo : (doc.billNo || 'N/A')}
            </h3>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Date: {new Date(doc.date).toLocaleDateString('en-IN')}</div>
          </div>
        </div>

        {/* 2. Client Details (BILL TO) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '24px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontFamily: 'monospace' }}>
              {isInvoice ? 'Billed To' : 'Recipient (Billed To)'}
            </div>
            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>{buyerName}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', lineHeight: '1.5' }}>
              {isInvoice && profile?.shopName && <div>Contact: {profile.name}</div>}
              {buyerPhone && <div>Phone: <span style={{ color: '#0f172a', fontFamily: 'monospace' }}>{buyerPhone}</span></div>}
              {buyerEmail && <div>Email: {buyerEmail}</div>}
              {buyerAddress && <div>Address: {buyerAddress}</div>}
              {buyerState && <div>State: {buyerState}</div>}
              {buyerGstin && (
                <div style={{ marginTop: '6px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#0f172a', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '6px', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                    GSTIN: {buyerGstin}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '24px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#0f172a', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700, borderRadius: '8px 0 0 8px', color: '#0f172a' }}>#</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>Item Description</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>Qty</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>Rate</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: 700, borderRadius: '0 8px 8px 0', color: '#0f172a' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {productItems.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontStyle: 'italic' }}>No items mapped.</td></tr>
            ) : productItems.map((item, idx) => {
              const qty = parseFloat(item.qty || 0), rate = parseFloat(item.rate || 0);
              return (
                <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>{idx + 1}</td>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>{item.name}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'monospace' }}>{qty}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>₹{rate.toFixed(2)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>₹{(qty * rate).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 4. Notes/Bank & Totals Grid */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px' }}>
          {/* Notes, Bank Details and Terms */}
          <div style={{ flex: 1, fontSize: '10px', color: '#64748b' }}>
            {doc.description && (
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', fontSize: '9px', marginBottom: '3px' }}>Remarks</span>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '8px', color: '#334155' }}>
                  {doc.description}
                </div>
              </div>
            )}
            {profile?.shopBankDetails && (
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', fontSize: '9px', marginBottom: '3px' }}>Bank Details</span>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '8px', fontFamily: 'monospace', color: '#334155', whiteSpace: 'pre-wrap' }}>
                  {profile.shopBankDetails}
                </div>
              </div>
            )}
            {profile?.shopInvoiceTerms && (
              <div>
                <span style={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', fontSize: '9px', marginBottom: '3px' }}>Terms &amp; Conditions</span>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '8px', color: '#334155', whiteSpace: 'pre-wrap' }}>
                  {profile.shopInvoiceTerms}
                </div>
              </div>
            )}
          </div>

          {/* Totals panel */}
          <div style={{ width: '280px', shrink: 0 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px', fontSize: '11px', fontFamily: 'monospace' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', color: '#64748b' }}>
                <span>Sub-Total:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{subTotalVal.toFixed(2)}</span>
              </div>

              {chargeItems.length > 0 ? (
                chargeItems.map((cc, ccIdx) => (
                  <div key={ccIdx} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '4px', color: '#64748b' }}>
                    <span>{cc.name}:</span>
                    <span style={{ color: '#334155', fontWeight: 700 }}>₹{parseFloat(cc.lineTotal || cc.rate || 0).toFixed(2)}</span>
                  </div>
                ))
              ) : miscChargesVal !== 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '4px', color: '#64748b' }}>
                  <span>Misc Charges:</span>
                  <span style={{ color: '#334155', fontWeight: 700 }}>₹{miscChargesVal.toFixed(2)}</span>
                </div>
              ) : null}

              {isInvoice && taxAmountVal > 0 && (
                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '10px' }}>
                    <span>CGST ({cgstRate}%):</span>
                    <span style={{ color: '#334155' }}>₹{cgstAmount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '10px', marginTop: '3px' }}>
                    <span>SGST ({sgstRate}%):</span>
                    <span style={{ color: '#334155' }}>₹{sgstAmount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700, fontSize: '10px', marginTop: '3px' }}>
                    <span>Total GST ({taxRateVal}%):</span>
                    <span>₹{taxAmountVal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {isInvoice && parseFloat(doc.discount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '4px', color: '#0f172a' }}>
                  <span>Discount (−):</span>
                  <span>-₹{parseFloat(doc.discount).toFixed(2)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #cbd5e1', paddingTop: '10px', marginTop: '8px', fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>
                <span>Grand Total:</span>
                <span>₹{grandTotalVal.toFixed(2)}</span>
              </div>
            </div>

            {/* Signature Block */}
            {profile?.shopSignatureUrl && (
              <div style={{ marginTop: '24px', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <img src={profile.shopSignatureUrl} alt="Signature" style={{ height: '44px', objectFit: 'contain', marginBottom: '4px' }} />
                <div style={{ borderTop: '1px solid #cbd5e1', width: '150px' }} />
                <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Authorized Signatory</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontSize: '9px', color: '#94a3b8', textAlign: 'center' }}>
          Thank you for your business! · Powered by GallaMitra
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: '#F1F5F9' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.35s ease both; }
        @keyframes tabPop { from { transform:scale(0.85); opacity:0; } to { transform:scale(1); opacity:1; } }
        .tab-pop { animation: tabPop 0.2s cubic-bezier(0.34,1.56,0.64,1) both; }
        .card-hover { transition: all 0.2s ease; }
        .card-hover:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
      `}</style>

      {/* Hidden printable ledger report */}
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '900px', zIndex: -1 }}>
        <LedgerReport />
      </div>

      {/* Hidden receipt print body (only when selectedReceipt active) */}
      {selectedReceipt && (
        <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '550px', zIndex: -1 }}>
          <ReceiptPrintBody receipt={selectedReceipt} />
        </div>
      )}

      {/* Hidden invoice print body (only when selectedDoc active) */}
      {selectedDoc && (
        <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '750px', zIndex: -1 }}>
          <InvoicePrintBody doc={selectedDoc} />
        </div>
      )}

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {profile?.logoUrl ? (
              <img src={profile.logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm" />
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
                <Store size={18} className="text-white" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] font-black tracking-[0.15em] text-blue-600 uppercase font-mono">
                  {portalType === 'customer' ? 'Customer Portal' : 'Supplier Portal'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              </div>
              <h1 className="text-slate-900 font-black text-sm leading-tight truncate">{profile?.businessName || 'GallaMitra Merchant'}</h1>
              <p className="text-slate-400 text-[10px] font-mono mt-0.5 flex items-center gap-1">
                <Phone size={9} /> {profile?.shopPhone || '—'}
              </p>
            </div>
          </div>
          {/* Desktop nav */}
          <nav className="hidden md:flex gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black tracking-wide transition-all whitespace-nowrap ${activeTab === id ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-white/70'
                  }`}>
                <Icon size={11} />{label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ─── Main ───────────────────────────────────────────────────────────── */}
      <main className="max-w-4xl w-full mx-auto px-4 py-6 pb-28 md:pb-8 flex-1 flex flex-col gap-5">

        {/* ══ OVERVIEW ══ */}
        {activeTab === 'dash' && (
          <div className="fade-up space-y-4">
            {/* Profile card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                {(profile?.shopName || profile?.name)?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-slate-900 font-black text-base truncate">{profile?.shopName || profile?.name}</h2>
                {profile?.shopName && (
                  <p className="text-slate-500 text-[10px] font-semibold mt-0.5">Contact: {profile?.name}</p>
                )}
                <p className="text-slate-500 text-[11px] font-mono flex items-center gap-1 mt-0.5">
                  <Phone size={10} /> {profile?.phone || 'No contact logged'}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                <Shield size={10} /> Verified
              </div>
            </div>

            {/* Balance card */}
            <div className={`rounded-2xl p-6 border shadow-sm relative overflow-hidden ${isOwed ? 'bg-rose-600 border-rose-500' : 'bg-emerald-600 border-emerald-500'}`}>
              <div className="absolute right-0 top-0 w-48 h-48 rounded-full opacity-10" style={{ background: 'white', transform: 'translate(30%,-30%)' }} />
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-[10px] font-black uppercase tracking-widest font-mono">
                      {portalType === 'customer' ? 'Outstanding Balance Due' : 'Receivable Amount'}
                    </p>
                    <p className="text-white font-black text-4xl mt-2 font-mono">
                      ₹{Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-white/70 text-xs font-semibold mt-2">
                      Status: <span className="text-white font-black">{isOwed ? 'Outstanding' : 'Cleared ✓'}</span>
                    </p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                    {isOwed ? <ArrowUpRight size={28} className="text-white" /> : <ArrowDownLeft size={28} className="text-white" />}
                  </div>
                </div>
                <p className="text-white/60 text-[10px] font-mono mt-3">
                  {portalType === 'customer'
                    ? (isOwed ? 'તમારે ચૂકવવાના બાકી છે' : 'ચુકવણી પૂર્ણ — ધન્યવાદ!')
                    : (isOwed ? 'તમારે મળવાના બાકી છે' : 'બધી ચૂકવણી પ્રાપ્ત')}
                </p>
              </div>
            </div>

            {/* UPI QR (only customer with dues) */}
            {portalType === 'customer' && isOwed && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                  <CreditCard size={14} className="text-blue-600" />
                  <h3 className="font-black text-sm text-slate-900">Pay Instantly via UPI</h3>
                </div>
                <div className="p-5 flex flex-col md:flex-row items-center gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="space-y-2 text-[11px] font-mono">
                      {[
                        ['Payee', profile?.businessName],
                        ['UPI ID', profile?.vpa || 'Not set'],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between p-2 bg-slate-50 rounded-lg">
                          <span className="text-slate-500">{k}</span>
                          <span className="font-bold text-slate-900">{v}</span>
                        </div>
                      ))}
                      <div className="flex justify-between p-2 bg-rose-50 rounded-lg border border-rose-100">
                        <span className="text-rose-500 font-bold">Amount Due</span>
                        <span className="font-black text-rose-700">₹{balance.toFixed(2)}</span>
                      </div>
                    </div>
                    <p className="text-slate-400 text-[10px]">Scan QR or use UPI ID with any payment app.</p>
                  </div>
                  <div className="shrink-0 p-3 bg-slate-50 border rounded-2xl shadow-inner">
                    {profile?.vpa ? (
                      <>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                            `upi://pay?pa=${profile.vpa}&pn=${encodeURIComponent(profile.businessName || 'Merchant')}&am=${balance.toFixed(2)}&cu=INR&tn=Invoice+Payment`
                          )}`}
                          alt="UPI QR" className="w-44 h-44 object-contain rounded-xl border bg-white"
                        />
                        <p className="text-center text-[9px] font-mono text-slate-400 mt-2 tracking-wider">BHIM · GPay · Paytm · PhonePe</p>
                      </>
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center text-center p-4 text-[10px] text-slate-400 border-2 border-dashed rounded-xl bg-white">
                        UPI not configured by merchant
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Ledger Entries', value: ledgers.length, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Invoices', value: (portalType === 'customer' ? portalData.invoices : portalData.purchaseBills)?.length || 0, color: 'text-violet-600', bg: 'bg-violet-50' },
                { label: 'Payments', value: portalData.receipts?.length || 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-white text-center shadow-sm`}>
                  <p className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</p>
                  <p className="text-slate-500 text-[10px] font-bold mt-1 uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ LEDGER TAB ══ */}
        {activeTab === 'ledger' && (
          <div className="fade-up space-y-4">
            {/* Action bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600">From:</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-slate-300 rounded px-1 py-0.5 text-xs" />
                <label className="text-xs text-slate-600">To:</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-slate-300 rounded px-1 py-0.5 text-xs" />
              </div>
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-blue-600" />
                <h3 className="font-black text-sm text-slate-900">
                  {portalType === 'customer' ? 'Purchase Ledger' : 'Sales Ledger'}
                </h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{ledgers.length} entries</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold rounded-xl transition-all shadow-sm">
                  <Download size={11} /> Export CSV
                </button>
                <button onClick={handlePrintLedger} disabled={printLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-xl transition-all shadow-sm disabled:opacity-60">
                  <Printer size={11} /> {printLoading ? 'Preparing...' : 'Print Report'}
                </button>
                <button onClick={handleSavePDF} disabled={pdfLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold rounded-xl transition-all shadow-sm disabled:opacity-60">
                  <FileDown size={11} /> {pdfLoading ? 'Generating...' : 'Save as PDF'}
                </button>
              </div>
            </div>

            {/* Balance chip */}
            <div className={`flex items-center justify-between px-5 py-3 rounded-2xl border shadow-sm ${isOwed ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <span className="text-xs font-bold text-slate-600">Closing Balance</span>
              <span className={`font-black font-mono text-base ${isOwed ? 'text-rose-700' : 'text-emerald-700'}`}>
                ₹{Math.abs(balance).toFixed(2)} <span className="text-[10px]">{isOwed ? 'Dr' : 'Cr'}</span>
              </span>
            </div>

            {/* DESKTOP: Table view */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-mono text-[9px] uppercase tracking-wider border-b border-slate-100">
                      <th className="px-5 py-3">#</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Particulars</th>
                      <th className="px-5 py-3 text-center">Type</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {!computedLedgers.length ? (
                      <tr><td colSpan="6" className="text-center py-12 text-slate-400 font-mono text-xs">No transactions found.</td></tr>
                    ) : (
                      computedLedgers.map((l, idx) => {
                        const amt = parseFloat(l.amount || 0);
                        const runBal = l.computedRunningBalance;
                        const drCrLabel = portalType === 'customer'
                          ? (runBal >= 0 ? 'Dr' : 'Cr')
                          : (runBal >= 0 ? 'Cr' : 'Dr');
                        return (
                          <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-3 text-slate-300 font-mono text-[10px]">{idx + 1}</td>
                            <td className="px-5 py-3 text-slate-400 font-mono">{new Date(l.date).toLocaleDateString('en-IN')}</td>
                            <td className="px-5 py-3 text-slate-900 font-semibold">{l.particulars || '—'}</td>
                            <td className="px-5 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-black text-[9px] font-mono ${l.type === 'DEBIT' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {l.type === 'DEBIT' ? <ArrowUpRight size={9} /> : <ArrowDownLeft size={9} />}
                                {l.type}
                              </span>
                            </td>
                            <td className={`px-5 py-3 text-right font-black font-mono ${l.type === 'DEBIT' ? 'text-rose-600' : 'text-emerald-600'}`}>
                              ₹{amt.toFixed(2)}
                            </td>
                            <td className={`px-5 py-3 text-right font-mono font-bold text-xs ${drCrLabel === 'Dr' ? 'text-rose-600' : 'text-emerald-650'}`}>
                              ₹{Math.abs(runBal).toFixed(2)}<span className="text-[9px] ml-0.5">{drCrLabel}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MOBILE: Card view */}
            <div className="md:hidden space-y-3">
              {!computedLedgers.length ? (
                <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-sm">
                  <BookOpen size={28} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-xs font-mono">No transactions found.</p>
                </div>
              ) : (
                computedLedgers.map((l, idx) => {
                  const amt = parseFloat(l.amount || 0);
                  const isDebit = l.type === 'DEBIT';
                  const runBal = l.computedRunningBalance;
                  const drCrLabel = portalType === 'customer'
                    ? (runBal >= 0 ? 'Dr' : 'Cr')
                    : (runBal >= 0 ? 'Cr' : 'Dr');
                  return (
                    <div key={l.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 card-hover">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDebit ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                            {isDebit ? <ArrowUpRight size={16} className="text-rose-500" /> : <ArrowDownLeft size={16} className="text-emerald-500" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs leading-tight">{l.particulars || '—'}</p>
                            <p className="text-slate-400 text-[10px] font-mono mt-0.5 flex items-center gap-1">
                              <Calendar size={9} /> {new Date(l.date).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-black text-[9px] font-mono shrink-0 ${isDebit ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                          {l.type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Amount</p>
                          <p className={`font-black font-mono text-base mt-0.5 ${isDebit ? 'text-rose-600' : 'text-emerald-600'}`}>
                            ₹{amt.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Balance</p>
                          <p className={`font-bold font-mono text-sm mt-0.5 ${drCrLabel === 'Dr' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            ₹{Math.abs(runBal).toFixed(2)} <span className="text-[9px]">{drCrLabel}</span>
                          </p>
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                          <span className="text-[9px] font-black text-slate-400">#{idx + 1}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ══ PAYMENTS / RECEIPTS ══ */}
        {activeTab === 'receipts' && (
          <div className="fade-up bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Wallet size={15} className="text-emerald-600" />
              <h3 className="font-black text-sm text-slate-900">
                {portalType === 'customer' ? 'Payment History' : 'Remitted Payments'}
              </h3>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{portalData.receipts?.length || 0}</span>
            </div>
            <div className="p-4 space-y-3">
              {!portalData.receipts?.length ? (
                <div className="text-center py-12 text-slate-400 font-mono text-xs">No payment records found.</div>
              ) : portalData.receipts.map(r => (
                <div key={r.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 card-hover">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle size={17} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs">Voucher #{r.receiptNo}</p>
                        <p className="text-slate-400 text-[10px] font-mono mt-0.5 flex items-center gap-1">
                          <Clock size={9} /> {new Date(r.date).toLocaleString('en-IN')}
                        </p>
                        <span className="inline-block mt-1 text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{r.paymentMode}</span>
                        {r.remark && <p className="text-slate-400 text-[10px] italic mt-1">"{r.remark}"</p>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-base font-black font-mono text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 block">
                        ₹{parseFloat(r.amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {/* Receipt Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedReceipt(r)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 text-[10px] font-bold rounded-xl transition-all">
                      <Eye size={11} /> View
                    </button>
                    <button
                      onClick={() => { setSelectedReceipt(r); setTimeout(() => handlePrintRef(receiptPrintRef, `Receipt #${r.receiptNo}`), 300); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded-xl transition-all">
                      <Printer size={11} /> Print
                    </button>
                    <button
                      onClick={() => { setSelectedReceipt(r); setTimeout(() => handleSaveRefAsPDF(receiptPrintRef, `Receipt_${r.receiptNo}.pdf`), 300); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-violet-50 border border-violet-100 hover:bg-violet-100 text-violet-700 text-[10px] font-bold rounded-xl transition-all">
                      <FileDown size={11} /> PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ INVOICES / PURCHASE BILLS ══ */}
        {activeTab === 'invoices' && (
          <div className="fade-up bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Receipt size={15} className="text-violet-600" />
              <h3 className="font-black text-sm text-slate-900">
                {portalType === 'customer' ? 'Sales Invoices' : 'Purchase Slips'}
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {portalType === 'customer' ? (
                !portalData.invoices?.length ? (
                  <div className="text-center py-12 text-slate-400 font-mono text-xs">No invoices issued yet.</div>
                ) : portalData.invoices.map(i => (
                  <div key={i.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 card-hover">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                          <FileText size={16} className="text-violet-600" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-xs">Invoice #{i.invoiceNo}</p>
                          <p className="text-slate-400 text-[10px] font-mono mt-0.5 flex items-center gap-1">
                            <Calendar size={9} /> {new Date(i.date).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                      </div>
                      <span className="text-base font-black font-mono text-slate-900">₹{parseFloat(i.grandTotal).toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setSelectedDoc({ type: 'invoice', ...i })}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 text-[10px] font-bold rounded-xl transition-all">
                        <Eye size={11} /> View
                      </button>
                      <button
                        onClick={() => { setSelectedDoc({ type: 'invoice', ...i }); setTimeout(() => handlePrintRef(invoicePrintRef, `Invoice #${i.invoiceNo}`), 300); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded-xl transition-all">
                        <Printer size={11} /> Print
                      </button>
                      <button
                        onClick={() => { setSelectedDoc({ type: 'invoice', ...i }); setTimeout(() => handleSaveRefAsPDF(invoicePrintRef, `Invoice_${i.invoiceNo}.pdf`), 300); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-violet-50 border border-violet-100 hover:bg-violet-100 text-violet-700 text-[10px] font-bold rounded-xl transition-all">
                        <FileDown size={11} /> PDF
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                !portalData.purchaseBills?.length ? (
                  <div className="text-center py-12 text-slate-400 font-mono text-xs">No purchase slips logged.</div>
                ) : portalData.purchaseBills.map(pb => (
                  <div key={pb.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 card-hover">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                          <FileText size={16} className="text-violet-600" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-xs">Slip #{pb.billNo || 'N/A'}</p>
                          <p className="text-slate-400 text-[10px] font-mono mt-0.5 flex items-center gap-1">
                            <Calendar size={9} /> {new Date(pb.date).toLocaleDateString('en-IN')}
                          </p>
                          {pb.attachedImgUrl && (
                            <a href={pb.attachedImgUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 underline block mt-1">
                              View attachment
                            </a>
                          )}
                        </div>
                      </div>
                      <span className="text-base font-black font-mono text-slate-900">₹{parseFloat(pb.totalAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setSelectedDoc({ type: 'purchase_bill', ...pb })}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 text-[10px] font-bold rounded-xl transition-all">
                        <Eye size={11} /> View
                      </button>
                      <button
                        onClick={() => { setSelectedDoc({ type: 'purchase_bill', ...pb }); setTimeout(() => handlePrintRef(invoicePrintRef, `Slip #${pb.billNo || 'N/A'}`), 300); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded-xl transition-all">
                        <Printer size={11} /> Print
                      </button>
                      <button
                        onClick={() => { setSelectedDoc({ type: 'purchase_bill', ...pb }); setTimeout(() => handleSaveRefAsPDF(invoicePrintRef, `PurchaseSlip_${pb.billNo || 'N/A'}.pdf`), 300); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-violet-50 border border-violet-100 hover:bg-violet-100 text-violet-700 text-[10px] font-bold rounded-xl transition-all">
                        <FileDown size={11} /> PDF
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="py-4 text-center text-[10px] font-mono text-slate-400 border-t border-slate-200 bg-white">
        <span className="flex items-center justify-center gap-1.5">
          <Shield size={10} /> Secured &amp; verified by <strong className="text-slate-600">GallaMitra</strong> Platform
        </span>
      </footer>

      {/* ─── Mobile Bottom Tab Bar ───────────────────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.07)]">
        <div className="flex items-stretch h-16">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button key={id} id={`portal-mobile-nav-${id}`} onClick={() => setActiveTab(id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 transition-all ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50' : ''}`}>
                  <Icon size={isActive ? 19 : 17} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className={`text-[9px] font-black tracking-tight leading-none ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{label}</span>
                {isActive && <span className="w-8 h-0.5 rounded-full bg-blue-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Receipt View Modal ──────────────────────────────────────────────── */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedReceipt(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)' }}>
              <div>
                <h3 className="font-black text-white text-sm">Payment Receipt</h3>
                <p className="text-emerald-300 text-[10px] font-mono">Voucher #{selectedReceipt.receiptNo}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handlePrintRef(receiptPrintRef, `Receipt #${selectedReceipt.receiptNo}`)}
                  className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition-all">
                  <Printer size={12} />
                </button>
                <button onClick={() => handleSaveRefAsPDF(receiptPrintRef, `Receipt_${selectedReceipt.receiptNo}.pdf`)}
                  className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition-all">
                  <FileDown size={12} />
                </button>
                <button onClick={() => setSelectedReceipt(null)}
                  className="p-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-300 rounded-xl transition-all">
                  <X size={12} />
                </button>
              </div>
            </div>
            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Business */}
              <div className="text-center pb-4 border-b border-dashed border-slate-200">
                {profile?.logoUrl && <img src={profile.logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-cover mx-auto mb-2 border border-slate-200" />}
                <p className="font-black text-slate-900 text-base">{profile?.businessName}</p>
                {profile?.shopAddress && <p className="text-slate-400 text-[10px] mt-0.5">{profile.shopAddress}</p>}
                {profile?.shopPhone && <p className="text-slate-400 text-[10px]">Tel: {profile.shopPhone}</p>}
              </div>
              {/* Details */}
              <div className="space-y-2.5">
                {[
                  ['Receipt No.', `#${selectedReceipt.receiptNo}`, Hash],
                  ['Date', new Date(selectedReceipt.date).toLocaleString('en-IN'), Calendar],
                  ['Received From', profile?.shopName || profile?.name, Building2],
                  ['Payment Mode', selectedReceipt.paymentMode, CreditCard],
                  selectedReceipt.remark ? ['Remark', selectedReceipt.remark, FileText] : null,
                ].filter(Boolean).map(([k, v, Icon]) => (
                  <div key={k} className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <Icon size={11} className="text-slate-450" /> {k}
                    </div>
                    <span className="font-bold text-slate-900 text-xs font-mono">{v}</span>
                  </div>
                ))}
              </div>
              {/* Amount */}
              <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)' }}>
                <p className="text-emerald-300 text-[10px] font-mono uppercase tracking-wider font-bold">Amount Received</p>
                <p className="text-white font-black text-3xl font-mono mt-1 font-bold">₹{parseFloat(selectedReceipt.amount).toFixed(2)}</p>
              </div>
              {/* Signature */}
              {profile?.shopSignatureUrl && (
                <div className="flex flex-col items-end">
                  <p className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">Authorized Signature</p>
                  <img src={profile.shopSignatureUrl} alt="Signature" className="h-10 object-contain mt-1 border border-slate-100 rounded-lg p-0.5 bg-slate-50" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Invoice / Document View Modal ──────────────────────────────────── */}
      {selectedDoc && (() => {
        const items = parseItems(selectedDoc);
        const productItems = items.filter(it => it.rowType === 'item' || !it.rowType);
        const chargeItems = items.filter(it => it.rowType === 'charge');
        const isInvoice = selectedDoc.type === 'invoice';
        const subTotalVal = parseFloat(isInvoice ? (selectedDoc.subTotal || 0) : (selectedDoc.totalAmount || 0));
        const taxRateVal = parseFloat(selectedDoc.taxRate || 0);
        const taxAmountVal = parseFloat(selectedDoc.taxAmount || 0);
        const miscChargesVal = parseFloat(selectedDoc.miscCharges || 0);
        const grandTotalVal = parseFloat(isInvoice ? (selectedDoc.grandTotal || 0) : (selectedDoc.totalAmount || 0));

        // CGST & SGST calculations
        const cgstRate = (taxRateVal / 2).toFixed(1);
        const sgstRate = (taxRateVal / 2).toFixed(1);
        const cgstAmount = (taxAmountVal / 2).toFixed(2);
        const sgstAmount = (taxAmountVal / 2).toFixed(2);

        // Dynamic Seller & Buyer details based on document type
        const sellerName = isInvoice ? profile?.businessName : (profile?.shopName || profile?.name);
        const sellerAddress = isInvoice ? profile?.shopAddress : profile?.billingAddress;
        const sellerPhone = isInvoice ? (profile?.businessPhone || profile?.shopPhone) : profile?.phone;
        const sellerEmail = isInvoice ? profile?.businessEmail : profile?.email;
        const sellerGstin = isInvoice ? profile?.shopGstin : profile?.gstin;
        const sellerLogoUrl = isInvoice ? profile?.logoUrl : null;

        const buyerName = isInvoice ? (profile?.shopName || profile?.name) : profile?.businessName;
        const buyerAddress = isInvoice ? profile?.billingAddress : profile?.shopAddress;
        const buyerPhone = isInvoice ? profile?.phone : (profile?.businessPhone || profile?.shopPhone);
        const buyerEmail = isInvoice ? profile?.email : profile?.businessEmail;
        const buyerGstin = isInvoice ? profile?.gstin : profile?.shopGstin;
        const buyerState = isInvoice ? profile?.state : profile?.shopState || profile?.state;

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedDoc(null)}>
            <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
              {/* Subtle accent bar at top */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900" />

              {/* Header */}
              <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100 mt-1.5">
                <div>
                  <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase leading-none font-mono">
                    {isInvoice ? (taxAmountVal > 0 ? 'TAX INVOICE' : 'BILL OF SUPPLY') : 'PURCHASE INVOICE'}
                  </span>
                  <h3 className="font-black text-slate-900 text-base mt-1">
                    {isInvoice ? `Invoice #${selectedDoc.invoiceNo}` : `Purchase Slip #${selectedDoc.billNo || 'N/A'}`}
                  </h3>
                  <p className="text-slate-400 text-[10px] font-mono mt-0.5">{new Date(selectedDoc.date).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handlePrintRef(invoicePrintRef, isInvoice ? `Invoice #${selectedDoc.invoiceNo}` : `Slip #${selectedDoc.billNo}`)}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-bold">
                    <Printer size={13} /> Print
                  </button>
                  <button onClick={() => handleSaveRefAsPDF(invoicePrintRef, isInvoice ? `Invoice_${selectedDoc.invoiceNo}.pdf` : `Slip_${selectedDoc.billNo || 'N/A'}.pdf`)}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-bold">
                    <FileDown size={13} /> PDF
                  </button>
                  <button onClick={() => setSelectedDoc(null)}
                    className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all">
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-slate-800">
                {/* 1. Logo & Business info */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    {sellerLogoUrl ? (
                      <img src={sellerLogoUrl} alt="Logo" className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-2xs p-0.5 bg-white" />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg" style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
                        {(sellerName || 'G')[0]}
                      </div>
                    )}
                    <div>
                      <h2 className="text-base font-black text-slate-900 leading-tight">{sellerName}</h2>
                      {sellerAddress && <p className="text-slate-400 font-mono text-[9px] mt-0.5 leading-relaxed">{sellerAddress}</p>}
                      <div className="text-slate-400 text-[9px] mt-0.5">
                        {sellerPhone && <span>Tel: {sellerPhone}</span>}
                        {sellerEmail && <span> | Email: {sellerEmail}</span>}
                      </div>
                      {!isInvoice && profile?.shopName && <div className="text-slate-400 text-[9px] mt-0.5 font-bold">Contact: {profile.name}</div>}
                    </div>
                  </div>
                  {sellerGstin && (
                    <div className="md:text-right">
                      <span className="inline-block bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[9px] font-black px-2 py-0.5 rounded uppercase">
                        GSTIN: {sellerGstin}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Bill To */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-[8px] text-slate-400 font-mono font-bold uppercase tracking-wider mb-2">{isInvoice ? 'Billed To' : 'Recipient (Billed To)'}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 leading-relaxed">
                    <div>
                      <p className="font-black text-slate-900 text-sm">{buyerName}</p>
                      {isInvoice && profile?.shopName && <p className="text-slate-505 text-[10px] mt-0.5 font-bold">Contact: {profile.name}</p>}
                      {buyerPhone && <p className="text-slate-500 font-mono text-[10px]">Phone: {buyerPhone}</p>}
                      {buyerEmail && <p className="text-slate-500 text-[10px]">Email: {buyerEmail}</p>}
                    </div>
                    <div className="md:text-right">
                      {buyerAddress && <p className="text-slate-500 text-[10px]">{buyerAddress}</p>}
                      {buyerState && <p className="text-slate-500 text-[10px]">State: {buyerState}</p>}
                      {buyerGstin && (
                        <p className="mt-1">
                          <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                            GSTIN: {buyerGstin}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-650 font-mono text-[8px] uppercase tracking-wider border-b">
                        <th className="p-3 w-8">#</th>
                        <th className="p-3">Item Description</th>
                        <th className="p-3 text-center w-16">Qty</th>
                        <th className="p-3 text-right w-24">Rate</th>
                        <th className="p-3 text-right w-28">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {productItems.length === 0 ? (
                        <tr><td colSpan="5" className="text-center py-8 text-slate-400 italic font-mono font-bold">No items mapped.</td></tr>
                      ) : productItems.map((item, idx) => {
                        const qty = parseFloat(item.qty || 0), rate = parseFloat(item.rate || 0);
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 text-slate-450 font-mono">{idx + 1}</td>
                            <td className="p-3 font-semibold text-slate-900">{item.name}</td>
                            <td className="p-3 text-center font-mono">{qty}</td>
                            <td className="p-3 text-right font-mono">₹{rate.toFixed(2)}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900">₹{(qty * rate).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 4. Totals and Notes block */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 pt-2">
                  {/* Left Column: Remarks / Bank / Terms */}
                  <div className="flex-1 w-full space-y-4">
                    {selectedDoc.description && (
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Remarks</span>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] text-slate-650 leading-relaxed font-semibold">
                          {selectedDoc.description}
                        </div>
                      </div>
                    )}
                    {profile.shopBankDetails && (
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Bank Details</span>
                        <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-[10px] text-slate-655 leading-relaxed font-semibold whitespace-pre-wrap font-mono font-bold">
                          {profile.shopBankDetails}
                        </div>
                      </div>
                    )}
                    {profile.shopInvoiceTerms && (
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Terms &amp; Conditions</span>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] text-slate-655 leading-relaxed font-semibold whitespace-pre-wrap">
                          {profile.shopInvoiceTerms}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Calculations & Signature */}
                  <div className="w-full md:w-72 shrink-0 space-y-4">
                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2.5 font-mono text-[10.5px] text-slate-500">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-650">Subtotal:</span>
                        <span className="font-black text-slate-900">₹{subTotalVal.toFixed(2)}</span>
                      </div>

                      {chargeItems.length > 0 ? (
                        chargeItems.map((cc, ccIdx) => (
                          <div key={ccIdx} className="flex justify-between items-center border-t border-slate-200 pt-2 mt-2">
                            <span className="font-bold text-slate-650">{cc.name}:</span>
                            <span className="font-bold text-slate-800">₹{parseFloat(cc.lineTotal || cc.rate || 0).toFixed(2)}</span>
                          </div>
                        ))
                      ) : miscChargesVal !== 0 ? (
                        <div className="flex justify-between items-center border-t border-slate-200 pt-2 mt-2">
                          <span className="font-bold text-slate-650">Misc Charges:</span>
                          <span className="font-bold text-slate-800">₹{miscChargesVal.toFixed(2)}</span>
                        </div>
                      ) : null}

                      {isInvoice && taxAmountVal > 0 && (
                        <div className="space-y-1.5 border-t border-slate-200 pt-2 mt-2">
                          <div className="flex justify-between items-center text-[9.5px]">
                            <span>CGST ({cgstRate}%):</span>
                            <span className="font-bold text-slate-700">₹{cgstAmount}</span>
                          </div>
                          <div className="flex justify-between items-center text-[9.5px]">
                            <span>SGST ({sgstRate}%):</span>
                            <span className="font-bold text-slate-700">₹{sgstAmount}</span>
                          </div>
                          <div className="flex justify-between items-center text-[9.5px] text-indigo-600 font-bold font-black">
                            <span>Total GST ({taxRateVal}%):</span>
                            <span>₹{taxAmountVal.toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {isInvoice && parseFloat(selectedDoc.discount || 0) > 0 && (
                        <div className="flex justify-between items-center border-t border-slate-200 pt-2 mt-2 text-rose-600">
                          <span className="font-bold">Discount (−):</span>
                          <span className="font-black font-mono">₹{parseFloat(selectedDoc.discount).toFixed(2)}</span>
                        </div>
                      )}

                      <div className="border-t-2 border-slate-900 pt-2.5 mt-2 flex justify-between items-baseline">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">Grand Total</span>
                        <span className="text-base font-black text-slate-950">₹{grandTotalVal.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Sign signatory */}
                    {profile.shopSignatureUrl && (
                      <div className="flex flex-col items-center md:items-end w-full">
                        <div className="flex flex-col items-center">
                          <img src={profile.shopSignatureUrl} alt="Signature" className="max-h-12 object-contain bg-white p-0.5 border border-slate-100 rounded-lg shadow-2xs" />
                          <div className="border-t border-slate-300 w-32 mt-1.5" />
                          <p className="text-[8px] font-mono text-slate-400 font-bold uppercase tracking-widest mt-1">Authorized Signatory</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}