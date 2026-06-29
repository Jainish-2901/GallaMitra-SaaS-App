import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, Loader2, Info, Upload, Paperclip, X, Check } from 'lucide-react';

export default function PurchaseBillEditModal({
  purchaseBill,
  suppliers,
  products,
  activeShop,
  onClose,
  onSave,
  toast,
  t = {}
}) {
  // ── Local form state (mirrors PurchaseBillCreator) ─────────────────────
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [items, setItems] = useState([]);
  const [isGstActive, setIsGstActive] = useState(false);
  const [gstMode, setGstMode] = useState('WITHOUT_GST');
  const [customTaxRate, setCustomTaxRate] = useState(18);
  const [slipDetails, setSlipDetails] = useState('');
  const [discount, setDiscount] = useState(0);
  const [customCharges, setCustomCharges] = useState([]);
  const [advancePayment, setAdvancePayment] = useState(0);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [attachedImgUrl, setAttachedImgUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [focusedRowIndex, setFocusedRowIndex] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Seed state from purchaseBill prop ──────────────────────────────────
  useEffect(() => {
    if (!purchaseBill) return;
    setBillNo(purchaseBill.billNo || '');
    setSelectedSupplierId(purchaseBill.supplierId || '');
    if (purchaseBill.date) {
      const d = new Date(purchaseBill.date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setBillDate(`${year}-${month}-${day}`);
    }
    setSlipDetails(purchaseBill.slipDetails || '');
    setAttachedImgUrl(purchaseBill.attachedImgUrl || '');
    setAdvancePayment(parseFloat(purchaseBill.advancePayment || 0));
    setPaymentMode(purchaseBill.paymentMode || 'CASH');

    let parsed = [];
    try {
      parsed = typeof purchaseBill.itemsJson === 'string' ? JSON.parse(purchaseBill.itemsJson) : (purchaseBill.itemsJson || []);
    } catch { parsed = []; }

    // In PurchaseBillCreator, metadata is saved as a row with rowType === 'metadata'
    const metadata = parsed.find(it => it.rowType === 'metadata') || {};
    const chargeRows = parsed.filter(it => it.rowType === 'charge');
    const itemRows = parsed.filter(it => it.rowType !== 'charge' && it.rowType !== 'metadata');

    setCustomTaxRate(parseFloat(metadata.taxRate || 0));
    setDiscount(parseFloat(metadata.discount || 0));
    // Support custom charges that were in parsed items
    setCustomCharges(chargeRows.map(cc => ({ name: cc.name, amount: cc.rate })));
    setItems(itemRows.length ? itemRows : [{ name: '', qty: 1, rate: '', rowType: 'item', productId: '' }]);

    const taxRateVal = parseFloat(metadata.taxRate || 0);
    if (taxRateVal > 0) { setIsGstActive(true); setGstMode('WITH_GST'); }
    else { setIsGstActive(false); setGstMode('WITHOUT_GST'); }
  }, [purchaseBill]);

  // ── GST auto-detect on supplier select ─────────────────────────────────
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
  useEffect(() => {
    if (selectedSupplier) {
      if (selectedSupplier.gstin && selectedSupplier.gstin.trim() !== '') {
        setIsGstActive(true); setGstMode('WITH_GST');
      } else {
        setIsGstActive(false); setGstMode('WITHOUT_GST');
      }
    }
  }, [selectedSupplierId, selectedSupplier]);

  // ── Totals calculation ─────────────────────────────────────────────────
  const lineTotal = item => parseFloat(item.qty || 1) * parseFloat(item.rate || 0);
  const subTotal = items.reduce((s, it) => s + lineTotal(it), 0);
  const discountValue = parseFloat(discount || 0);
  const extraChargesValue = customCharges.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
  const taxableValue = Math.max(subTotal + extraChargesValue, 0);
  const taxRate = (isGstActive && gstMode === 'WITH_GST') ? parseFloat(customTaxRate || 0) : 0;
  const taxAmount = taxableValue * (taxRate / 100);
  const grandTotal = Math.max(taxableValue + taxAmount - discountValue, 0);
  const cgstAmount = taxAmount / 2;
  const sgstAmount = taxAmount / 2;

  // ── Item row handlers ──────────────────────────────────────────────────
  const handleItemRowChange = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };
  const addNewItemRow = () => setItems([...items, { name: '', qty: 1, rate: '', rowType: 'item', productId: '' }]);
  const removeItemRow = index => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };

  // ── Attachment upload ──────────────────────────────────────────────────
  const uploadToCloudinary = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dopmlnvyg';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body: formData });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Upload failed'); }
    const data = await res.json();
    return data.secure_url;
  };
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    toast.info('Uploading attachment…');
    try {
      const url = await uploadToCloudinary(file);
      setAttachedImgUrl(url);
      toast.success('Attachment uploaded!');
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally { setUploadingFile(false); }
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupplierId) { toast.warning('Please select a supplier.'); return; }
    const hasEmpty = items.some(it => !it.name || String(it.name).trim() === '');
    if (hasEmpty) { toast.warning('Please fill in all item descriptions.'); return; }
    setSubmitting(true);

    const itemsArray = [
      ...items.map(it => ({
        productId: it.productId || null,
        name: it.name,
        qty: parseFloat(it.qty || 1),
        rate: parseFloat(it.rate || 0),
        rowType: 'item',
        lineTotal: parseFloat(it.qty || 1) * parseFloat(it.rate || 0)
      })),
      ...customCharges.map(cc => ({
        name: cc.name || 'Extra Charge',
        qty: 1,
        rate: parseFloat(cc.amount || 0),
        rowType: 'charge',
        lineTotal: parseFloat(cc.amount || 0)
      })),
      {
        rowType: 'metadata',
        subTotal,
        discount: discountValue,
        taxAmount,
        taxRate,
        miscCharges: extraChargesValue
      }
    ];

    await onSave({
      billNo,
      supplierId: selectedSupplierId,
      date: billDate,
      itemsArray,
      slipDetails,
      totalAmount: grandTotal,
      attachedImgUrl: attachedImgUrl || null,
      advancePayment: parseFloat(advancePayment || 0),
      paymentMode
    });
    setSubmitting(false);
  };

  if (!purchaseBill) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-start justify-center overflow-y-auto">
      <div className="min-h-screen w-full max-w-4xl mx-auto px-2 py-6">
        {/* Header bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl mb-4 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <FileText size={15} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 font-sans">Edit Purchase Bill {billNo}</h2>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Modify purchase bill details — same as creation form</p>
            </div>
          </div>
          {/* GST Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
              <button type="button" onClick={() => { setGstMode('WITH_GST'); setIsGstActive(true); }}
                className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${gstMode === 'WITH_GST' && isGstActive ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                With GST
              </button>
              <button type="button" onClick={() => { setGstMode('WITHOUT_GST'); setIsGstActive(false); }}
                className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${gstMode === 'WITHOUT_GST' && !isGstActive ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                Non-GST
              </button>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Purchase Bill Sheet form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-6 sm:p-10 md:p-12 space-y-8 relative overflow-hidden">
            {/* Color stripe */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-600" />

            {/* 1. Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-slate-200/80 pb-6">
              <div className="space-y-2.5 max-w-md">
                {activeShop?.logoUrl ? (
                  <img src={activeShop.logoUrl} alt="Logo" className="max-h-14 object-contain rounded-lg border border-slate-100 p-1 bg-white shadow-2xs mb-2" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm mb-2">
                    {(activeShop?.businessName || activeShop?.name || 'GM')[0].toUpperCase()}
                  </div>
                )}
                <h1 className="text-xl font-black text-slate-900 tracking-tight">{activeShop?.businessName || activeShop?.name || 'GallaMitra Merchant'}</h1>
                <div className="text-[11px] text-slate-500 font-semibold space-y-0.5 font-sans">
                  <p className="whitespace-pre-line">{activeShop?.address || 'Shop address not configured'}</p>
                  <p>Phone: <span className="text-slate-800">{activeShop?.businessPhone || activeShop?.phone || '—'}</span></p>
                  {activeShop?.businessEmail && <p>Email: <span className="text-slate-800">{activeShop.businessEmail}</span></p>}
                  {isGstActive && gstMode === 'WITH_GST' && activeShop?.gstin && (
                    <p className="mt-1.5 inline-block text-slate-700 px-2 py-0.5 rounded font-mono text-[10px] font-black">GSTIN: {activeShop.gstin}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end space-y-4 md:text-right w-full md:w-auto shrink-0">
                <span className="text-2xl font-black tracking-widest text-slate-400 uppercase font-mono">
                  {isGstActive && gstMode === 'WITH_GST' ? 'GST PURCHASE BILL' : 'NON-GST PURCHASE SLIP'}
                </span>
                <div className="grid grid-cols-2 md:flex md:flex-col gap-2.5 w-full text-xs font-semibold">
                  <div className="flex flex-col md:items-end">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 font-mono">Supplier Bill Number</span>
                    <input type="text" value={billNo} onChange={e => setBillNo(e.target.value)} required
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white w-full md:w-44" />
                  </div>
                  <div className="flex flex-col md:items-end">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 font-mono">Bill Date</span>
                    <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white w-full md:w-44" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Supplier Details / GST Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Select Supplier Registry Account</span>
                <select value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)} required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white font-bold text-slate-800">
                  <option value="">-- Choose Vendor --</option>
                  {suppliers.filter(s => !s.isDeleted || s.id === selectedSupplierId).map(s => (
                    <option key={s.id} value={s.id}>{s.shopName ? `${s.shopName} — ${s.name}` : s.name}</option>
                  ))}
                </select>
                {selectedSupplier ? (
                  <div className="text-[11px] text-slate-500 font-semibold space-y-1 p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl mt-2 leading-relaxed font-sans">
                    <h4 className="font-black text-slate-900 text-xs">{selectedSupplier.name}</h4>
                    {selectedSupplier.phone && <p>Phone: <span className="text-slate-800 font-mono">{selectedSupplier.phone}</span></p>}
                    <p>Address: <span className="text-slate-800 font-normal whitespace-pre-line">{selectedSupplier.billingAddress || 'N/A'}</span></p>
                    {selectedSupplier.gstin && (
                      <p className="mt-1 font-mono text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 inline-block px-1.5 py-0.5 rounded uppercase">GSTIN: {selectedSupplier.gstin}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider py-4 px-3 border border-dashed border-slate-200 rounded-xl text-center font-mono mt-2">Select supplier to display details</div>
                )}
              </div>
              <div className="space-y-3">
                {isGstActive && gstMode === 'WITH_GST' ? (
                  <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-4 space-y-2.5">
                    <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block font-mono">GST TAX CONFIGURATION</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24">
                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 font-mono">Tax Rate (%)</label>
                        <input type="number" value={customTaxRate} onChange={e => setCustomTaxRate(parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-emerald-250 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-450 text-center" />
                      </div>
                      <div className="flex flex-col text-[10px] font-mono text-slate-500 pt-3">
                        <span>CGST ({(customTaxRate / 2).toFixed(1)}%): <strong className="text-slate-800">₹{cgstAmount.toFixed(2)}</strong></span>
                        <span>SGST ({(customTaxRate / 2).toFixed(1)}%): <strong className="text-slate-800">₹{sgstAmount.toFixed(2)}</strong></span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-[11px] font-medium text-slate-500 flex items-start gap-2 font-sans">
                    <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <div><span className="font-bold text-slate-800 block">Non-GST Template Activated</span>No tax rows or CGST/SGST will be applied to this purchase bill.</div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Items Table */}
            <div className="space-y-3 pt-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono border-b pb-1.5">LINE ITEMS DESCRIPTION</span>

              {/* Mobile cards */}
              <div className="block md:hidden space-y-3">
                {items.map((item, index) => {
                  const lineTot = lineTotal(item);
                  return (
                    <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">Item {index + 1}</span>
                        <button type="button" onClick={() => removeItemRow(index)} disabled={items.length <= 1}
                          className="text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-30"><Trash2 size={13} /></button>
                      </div>
                      <div className="relative">
                        <input type="text" value={item.name}
                          onFocus={() => setFocusedRowIndex(index)}
                          onBlur={() => setTimeout(() => setFocusedRowIndex(null), 250)}
                          onChange={e => {
                            const val = e.target.value;
                            const updated = [...items];
                            const match = products.find(p => p.name.trim().toLowerCase() === val.trim().toLowerCase());
                            updated[index] = match
                              ? { ...updated[index], name: val, productId: String(match.id), rate: match.price || 0 }
                              : { ...updated[index], name: val, productId: '' };
                            setItems(updated);
                          }}
                          placeholder="Type product name or enter description..."
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                        />
                        {focusedRowIndex === index && (
                          <div className="absolute z-[9999] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto divide-y divide-slate-100">
                            {(() => {
                              const s = item.name.toLowerCase();
                              const f = products.filter(p => p.name.toLowerCase().includes(s) || (p.hsnCode && p.hsnCode.toLowerCase().includes(s)));
                              return f.length > 0 ? f.map(p => (
                                <button key={p.id} type="button" onMouseDown={() => {
                                  const upd = [...items]; upd[index] = { ...upd[index], productId: String(p.id), name: p.name, rate: p.price || 0 };
                                  setItems(upd); setFocusedRowIndex(null);
                                }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex justify-between items-center">
                                  <span className="font-bold text-slate-800">{p.name}</span>
                                  <span className="font-bold text-slate-900">₹{parseFloat(p.price || 0).toFixed(2)}</span>
                                </button>
                              )) : <div className="px-3 py-2 text-xs text-slate-400 text-center font-mono">No products found (will auto-create)</div>;
                            })()}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Qty</label>
                          <input type="number" min="0" step="any" value={item.qty} onChange={e => handleItemRowChange(index, 'qty', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-center font-mono font-bold focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Rate (₹)</label>
                          <input type="number" step="any" min="0" value={item.rate} onChange={e => handleItemRowChange(index, 'rate', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-right font-mono font-bold focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Amount</label>
                          <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1.5 text-xs text-right font-mono font-black text-slate-800">₹{lineTot.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block" style={{ overflowX: 'visible' }}>
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">
                      <th className="py-2.5 pl-1.5">Description</th>
                      <th className="py-2.5 text-center w-[80px]">Qty</th>
                      <th className="py-2.5 text-right w-[120px]">Rate (₹)</th>
                      <th className="py-2.5 text-right w-[125px]">Amount (₹)</th>
                      <th className="py-2.5 text-center w-[40px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                    {items.map((item, index) => {
                      const lineTot = lineTotal(item);
                      return (
                        <tr key={index} className="bg-transparent hover:bg-slate-50/55 transition-colors">
                          <td className="py-2 pl-1.5 pr-2.5" style={{ position: 'relative', overflow: 'visible' }}>
                            <div style={{ position: 'relative' }}>
                              <input type="text" value={item.name}
                                onFocus={() => setFocusedRowIndex(index)}
                                onBlur={() => setTimeout(() => setFocusedRowIndex(null), 250)}
                                onChange={e => {
                                  const val = e.target.value;
                                  const updated = [...items];
                                  const match = products.find(p => p.name.trim().toLowerCase() === val.trim().toLowerCase());
                                  updated[index] = match
                                    ? { ...updated[index], name: val, productId: String(match.id), rate: match.price || 0 }
                                    : { ...updated[index], name: val, productId: '' };
                                  setItems(updated);
                                }}
                                placeholder="Type product name or description..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 transition-all focus:outline-none focus:border-emerald-500 focus:bg-white"
                              />
                              {focusedRowIndex === index && (
                                <div style={{ position: 'absolute', zIndex: 9999, left: 0, right: 0, top: '100%', marginTop: '4px' }}
                                  className="bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                                  {(() => {
                                    const s = item.name.toLowerCase();
                                    const f = products.filter(p => p.name.toLowerCase().includes(s) || (p.hsnCode && p.hsnCode.toLowerCase().includes(s)));
                                    return f.length > 0 ? f.map(p => {
                                      const code = p.hsnCode ? `HSN: ${p.hsnCode}` : p.sacCode ? `SAC: ${p.sacCode}` : 'No Code';
                                      const stockText = p.sacCode ? 'Service' : `Stock: ${parseFloat(p.currentStock || 0)} ${p.uqc || 'NOS'}`;
                                      return (
                                        <button key={p.id} type="button" onMouseDown={() => {
                                          const upd = [...items]; upd[index] = { ...upd[index], productId: String(p.id), name: p.name, rate: p.price || 0 };
                                          setItems(upd); setFocusedRowIndex(null);
                                        }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex justify-between items-center">
                                          <div>
                                            <span className="font-bold text-slate-800 block">{p.name}</span>
                                            <span className="text-[10px] text-slate-400">{code} • {stockText}</span>
                                          </div>
                                          <span className="font-bold text-slate-900">₹{parseFloat(p.price || 0).toFixed(2)}</span>
                                        </button>
                                      );
                                    }) : <div className="px-3 py-2 text-xs text-slate-400 text-center font-mono">No products found (will auto-create)</div>;
                                  })()}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2 pr-2.5 text-center">
                            <input type="number" min="0" step="any" value={item.qty} onChange={e => handleItemRowChange(index, 'qty', e.target.value)} placeholder="Qty"
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-400 focus:bg-white rounded py-1 text-xs text-center font-mono font-bold text-slate-900 transition-all focus:outline-none" />
                          </td>
                          <td className="py-2 pr-2.5 relative">
                            <span className="absolute left-2 top-3 text-[10px] font-black pointer-events-none text-slate-400">₹</span>
                            <input type="number" step="any" min="0" value={item.rate} onChange={e => handleItemRowChange(index, 'rate', e.target.value)} placeholder="0.00"
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-400 focus:bg-white rounded pl-6 pr-2 py-1 text-xs text-right font-mono font-bold transition-all focus:outline-none text-slate-900" />
                          </td>
                          <td className="py-2 pr-1 text-right font-mono font-black text-xs text-slate-800">₹{lineTot.toFixed(2)}</td>
                          <td className="py-2 text-center">
                            <button type="button" onClick={() => removeItemRow(index)} disabled={items.length <= 1}
                              className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors disabled:opacity-30"><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add row button */}
              <div className="flex flex-wrap gap-2 pt-2.5 border-t border-slate-100">
                <button type="button" onClick={addNewItemRow}
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-700 hover:text-slate-900 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/80">
                  <Plus size={11} /> Add Item Line
                </button>
              </div>
            </div>

            {/* 4. Notes / Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-200/80">
              {/* Left: bank details / terms / remarks / attachment */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block font-mono">SLIP DETAILS / REMARKS</span>
                  <textarea value={slipDetails} onChange={e => setSlipDetails(e.target.value)}
                    placeholder="Supplier comments, delivery slip details, notes…" rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-slate-400 focus:bg-white text-slate-900 transition-all resize-none" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block font-mono">Attached Bill Copy / Photo Document</span>
                  {attachedImgUrl ? (
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Paperclip size={16} className="text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 truncate block">Attachment Uploaded</span>
                          <a href={attachedImgUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline truncate block">View Document ↗</a>
                        </div>
                      </div>
                      <button type="button" onClick={() => setAttachedImgUrl('')} className="text-slate-400 hover:text-rose-600 p-1"><X size={16} /></button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-400 rounded-xl p-4 cursor-pointer transition-all">
                      {uploadingFile ? (
                        <div className="flex flex-col items-center gap-1"><Loader2 className="animate-spin text-blue-600" size={20} /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Uploading…</span></div>
                      ) : (
                        <div className="flex flex-col items-center gap-1"><Upload size={20} className="text-slate-400" /><span className="text-xs font-bold text-slate-600">Choose File</span><span className="text-[9px] text-slate-400 font-semibold font-sans">PDF, Document, or Image</span></div>
                      )}
                      <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={handleFileChange} disabled={uploadingFile} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {/* Right: Totals panel */}
              <div className="flex flex-col justify-between space-y-6 md:text-right">
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3 font-mono text-[11px] text-slate-500">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-600">Subtotal:</span>
                    <span className="font-black text-xs text-slate-900">₹{subTotal.toFixed(2)}</span>
                  </div>

                  {/* Extra Charges */}
                  <div className="border-t border-slate-200/50 pt-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-600">Extra Charges (+):</span>
                      <button type="button" onClick={() => setCustomCharges([...customCharges, { name: '', amount: '' }])}
                        className="flex items-center gap-1 text-[9px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
                        <Plus size={10} /> Add Charge
                      </button>
                    </div>
                    {customCharges.map((cc, ccIdx) => (
                      <div key={ccIdx} className="flex justify-between items-center gap-2 pl-2">
                        <input type="text" placeholder="Charge Name" value={cc.name}
                          onChange={e => { const u = [...customCharges]; u[ccIdx].name = e.target.value; setCustomCharges(u); }}
                          className="flex-1 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-[10px] text-slate-800 font-bold focus:outline-none" />
                        <div className="relative w-28 shrink-0 flex items-center gap-1">
                          <span className="absolute left-2 text-slate-400">₹</span>
                          <input type="number" min="0" step="any" placeholder="0.00" value={cc.amount}
                            onChange={e => { const u = [...customCharges]; u[ccIdx].amount = e.target.value; setCustomCharges(u); }}
                            className="w-full bg-white border border-slate-200 rounded-md pl-4 pr-1 py-0.5 text-right text-[10px] text-slate-900 font-bold font-mono focus:outline-none" />
                          <button type="button" onClick={() => setCustomCharges(customCharges.filter((_, i) => i !== ccIdx))}
                            className="text-slate-400 hover:text-rose-600 p-0.5"><Trash2 size={11} /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* GST breakdown */}
                  {isGstActive && gstMode === 'WITH_GST' && (
                    <div className="space-y-2 border-t border-slate-200/50 pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-600">Tax Rate (%):</span>
                        <div className="relative w-28 shrink-0">
                          <input type="number" min="0" max="100" step="any" value={customTaxRate} onChange={e => setCustomTaxRate(parseFloat(e.target.value) || 0)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-right text-slate-900 font-bold font-mono focus:outline-none" />
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 pl-2"><span>CGST ({taxRate / 2}%):</span><span className="font-bold font-mono text-slate-700">₹{cgstAmount.toFixed(2)}</span></div>
                      <div className="flex justify-between text-[10px] text-slate-500 pl-2"><span>SGST ({taxRate / 2}%):</span><span className="font-bold font-mono text-slate-700">₹{sgstAmount.toFixed(2)}</span></div>
                      <div className="flex justify-between font-bold text-indigo-700 border-t border-indigo-100 pt-1.5 mt-1"><span>Total GST ({taxRate}%):</span><span className="font-mono">₹{taxAmount.toFixed(2)}</span></div>
                    </div>
                  )}

                  {/* Discount */}
                  <div className="flex justify-between items-center border-t border-slate-200/50 pt-2">
                    <span className="font-bold text-slate-600">Discount (−):</span>
                    <div className="relative w-28 shrink-0">
                      <span className="absolute left-2 top-1 text-slate-400">₹</span>
                      <input type="number" min="0" step="any" placeholder="0.00" value={discount} onChange={e => setDiscount(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg pl-5 pr-2 py-0.5 text-right text-slate-900 font-bold font-mono focus:outline-none" />
                    </div>
                  </div>

                  {/* Advance */}
                  <div className="flex justify-between items-center border-t border-slate-200/50 pt-2">
                    <span className="font-bold text-slate-600">Advance Payment (−):</span>
                    <div className="relative w-28 shrink-0">
                      <span className="absolute left-2 top-1 text-slate-400">₹</span>
                      <input type="number" min="0" step="any" placeholder="0.00" value={advancePayment} onChange={e => setAdvancePayment(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg pl-5 pr-2 py-0.5 text-right text-slate-900 font-bold font-mono focus:outline-none" />
                    </div>
                  </div>

                  {/* Payment Mode */}
                  {parseFloat(advancePayment || 0) > 0 && (
                    <div className="flex justify-between items-center border-t border-slate-200/50 pt-2">
                      <span className="font-bold text-slate-600">Payment Method:</span>
                      <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}
                        className="w-28 bg-white border border-slate-200 rounded-lg px-2 py-1 text-right text-slate-900 font-bold text-xs focus:outline-none">
                        {['CASH','BANK','ONLINE','UPI','CARD'].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Grand Total */}
                  <div className="border-t border-slate-200 pt-2.5 mt-2 flex justify-between items-baseline">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">Grand Total (Receivable)</span>
                    <span className={`text-sm font-bold ${grandTotal < 0 ? 'text-rose-600' : 'text-slate-950'}`}>{grandTotal < 0 ? '−' : ''}₹{Math.abs(grandTotal).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2.5 mt-2 flex justify-between items-baseline">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">Remaining Balance:</span>
                    <span className="text-xl font-black text-slate-950">₹{Math.max(0, grandTotal - parseFloat(advancePayment || 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose}
              className="bg-white hover:bg-slate-100 text-slate-700 font-bold py-3 px-6 rounded-2xl text-xs border border-slate-200 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-3 px-8 rounded-2xl text-xs flex items-center gap-2 transition-all shadow-md">
              {submitting ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />}
              Save Purchase Bill Changes 💾
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
