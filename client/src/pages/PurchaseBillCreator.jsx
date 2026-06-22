import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Plus, Trash2, FileText, Loader2, Info, Tag, Percent, Zap, ChevronDown, Camera, Upload, Paperclip, X } from 'lucide-react';

export default function PurchaseBillCreator({ t = {} }) {
  const { activeShop, suppliers, postPurchaseBill, products } = useContext(AppContext);
  const toast = useToast();

  // Form states
  const [billNo, setBillNo] = useState(`BILL-${Date.now().toString().slice(-6)}`);
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  
  // Each item: { name, qty, rate, rowType, productId? }
  const [items, setItems] = useState([{ name: '', qty: 1, rate: '', rowType: 'item', productId: '' }]);
  const [isGstActive, setIsGstActive] = useState(false);
  const [gstMode, setGstMode] = useState('WITHOUT_GST');
  const [customTaxRate, setCustomTaxRate] = useState(18);
  const [slipDetails, setSlipDetails] = useState('');
  const [attachedImgUrl, setAttachedImgUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [discount, setDiscount] = useState('');
  const [customCharges, setCustomCharges] = useState([]);
  const [useProduct, setUseProduct] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const uploadToCloudinary = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dopmlnvyg';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default';
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error?.message || 'Upload failed');
    }
    
    const data = await res.json();
    return data.secure_url;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    toast.info('Uploading file attachment to Cloudinary...');
    try {
      const url = await uploadToCloudinary(file);
      setAttachedImgUrl(url);
      toast.success('Attachment uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploadingFile(false);
    }
  };

  // Selected supplier profile tracking
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  // Smart-Fetch GST Awareness hook
  useEffect(() => {
    if (selectedSupplier) {
      if (selectedSupplier.gstin && selectedSupplier.gstin.trim() !== '') {
        setIsGstActive(true);
        setGstMode('WITH_GST');
      } else {
        setIsGstActive(false);
        setGstMode('WITHOUT_GST');
      }
    } else {
      setIsGstActive(false);
      setGstMode('WITHOUT_GST');
    }
  }, [selectedSupplierId, selectedSupplier]);

  // Handle dynamic row changes
  const handleItemRowChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const addNewItemRow = () => {
    setItems([...items, { name: '', qty: 1, rate: '', rowType: 'item', productId: '' }]);
  };

  const removeItemRow = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const lineTotal = (item) => {
    return parseFloat(item.qty || 1) * parseFloat(item.rate || 0);
  };

  const subTotal = items.reduce((sum, item) => sum + lineTotal(item), 0);

  const discountValue = parseFloat(discount || 0);
  const extraChargesValue = customCharges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const taxableValue = Math.max(subTotal + extraChargesValue, 0);

  // GST Tax only applied on taxable base
  const taxRate = (isGstActive && gstMode === 'WITH_GST') ? parseFloat(customTaxRate || 0) : 0;
  const taxAmount = taxableValue * (taxRate / 100);
  const grandTotal = Math.max(taxableValue + taxAmount - discountValue, 0);

  const cgstAmount = taxAmount / 2;
  const sgstAmount = taxAmount / 2;

  const handleBillSubmission = async (e) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast.warning(t.selectSupplierError || 'Please designate a target supplier profile!');
      return;
    }
    const hasEmptyItem = items.some(it => !it.name || String(it.name).trim() === '');
    if (hasEmptyItem) {
      toast.warning('Please fill in all item descriptions before submitting.');
      return;
    }

    setSubmitting(true);

    const itemsToSave = [
      ...items.map(it => ({
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

    const response = await postPurchaseBill(
      billNo,
      selectedSupplierId,
      itemsToSave,
      grandTotal,
      slipDetails,
      attachedImgUrl
    );
    setSubmitting(false);

    if (response.success) {
      toast.success(t.purchaseBillSuccess || 'Purchase bill logged and supplier ledger updated! 📦');
      setBillNo(`BILL-${Date.now().toString().slice(-6)}`);
      setBillDate(new Date().toISOString().split('T')[0]);
      setItems([{ name: '', qty: 1, rate: '', rowType: 'item', productId: '' }]);
      setDiscount('');
      setCustomCharges([]);
      setSlipDetails('');
      setAttachedImgUrl('');
      setSelectedSupplierId('');
    } else {
      toast.error(`Failed to post purchase bill: ${response.error || 'Unknown error'}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150 p-2 sm:p-4">
      {/* GST Type Selection Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <FileText size={18} className="text-emerald-600" />
            {t.purchaseBillCreator || "Purchase Bill Creator"}
          </h2>
          <p className="text-slate-500 text-[11px] mt-0.5 font-medium font-sans">
            {t.purchaseBillDesc || "Record incoming vendor financial invoices and audit inventory additions"}
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 shrink-0">
          <button
            type="button"
            onClick={() => { setGstMode('WITH_GST'); setIsGstActive(true); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${gstMode === 'WITH_GST' && isGstActive
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 font-semibold'
              }`}
          >
            With GST
          </button>
          <button
            type="button"
            onClick={() => { setGstMode('WITHOUT_GST'); setIsGstActive(false); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${gstMode === 'WITHOUT_GST' && !isGstActive
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 font-semibold'
              }`}
          >
            Non-GST
          </button>
        </div>
      </div>

      <form onSubmit={handleBillSubmission} className="space-y-6">
        {/* Real Invoice Sheet Container */}
        <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-6 sm:p-10 md:p-12 space-y-8 relative overflow-hidden">
          {/* Subtle paper layout top element */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-600" />

          {/* 1. Header: Logo & Business details on Left, Metadata on Right */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-slate-200/80 pb-6">
            {/* Business info */}
            <div className="space-y-2.5 max-w-md">
              {activeShop?.logoUrl ? (
                <img
                  src={activeShop.logoUrl}
                  alt="Shop Logo"
                  className="max-h-14 object-contain rounded-lg border border-slate-100 p-1 bg-white shadow-2xs mb-2"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm mb-2">
                  {(activeShop?.businessName || activeShop?.name || 'GM')[0].toUpperCase()}
                </div>
              )}
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                {activeShop?.businessName || activeShop?.name || 'GallaMitra Merchant'}
              </h1>
              <div className="text-[11px] text-slate-500 font-semibold space-y-0.5 leading-relaxed font-sans">
                <p className="whitespace-pre-line">{activeShop?.address || 'Shop address not configured'}</p>
                <p>Phone: <span className="text-slate-800">{activeShop?.businessPhone || activeShop?.phone || '—'}</span></p>
                {activeShop?.businessEmail && <p>Email: <span className="text-slate-800">{activeShop.businessEmail}</span></p>}
                {isGstActive && gstMode === 'WITH_GST' && activeShop?.gstin && (
                  <p className="mt-1.5 inline-block bg-slate-105 text-slate-700 px-2 py-0.5 rounded font-mono text-[10px] font-black">
                    GSTIN: {activeShop.gstin}
                  </p>
                )}
              </div>
            </div>

            {/* Bill metadata (Bill No, Date, etc.) */}
            <div className="flex flex-col items-start md:items-end space-y-4 md:text-right w-full md:w-auto shrink-0">
              <span className="text-2xl font-black tracking-widest text-slate-400 uppercase leading-none font-mono">
                {isGstActive && gstMode === 'WITH_GST' ? 'GST PURCHASE BILL' : 'NON-GST PURCHASE SLIP'}
              </span>

              <div className="grid grid-cols-2 md:flex md:flex-col gap-2.5 w-full text-xs font-semibold">
                <div className="flex flex-col md:items-end">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 font-mono">
                    {t.supplierBillNo || "Supplier Bill Number"}
                  </span>
                  <input
                    type="text"
                    value={billNo}
                    onChange={e => setBillNo(e.target.value)}
                    required
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-left md:text-right w-full md:w-44"
                  />
                </div>
                <div className="flex flex-col md:items-end">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 font-mono">
                    Bill Date
                  </span>
                  <input
                    type="date"
                    value={billDate}
                    onChange={e => setBillDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-left md:text-right w-full md:w-44"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Supplier Details (Select Supplier Registry Account) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                {t.selectSupplierAccount || "Select Supplier Registry Account"}
              </span>
              <div className="w-full">
                <select
                  value={selectedSupplierId}
                  onChange={e => setSelectedSupplierId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white font-bold text-slate-800"
                >
                  <option value="">{t.chooseVendor || "-- Choose Vendor --"}</option>
                  {suppliers.filter(s => !s.isDeleted || s.id === selectedSupplierId).map(s => (
                    <option key={s.id} value={s.id}>{s.shopName ? `${s.shopName} — ${s.name}` : s.name}</option>
                  ))}
                </select>
              </div>

              {selectedSupplier ? (
                <div className="text-[11px] text-slate-500 font-semibold space-y-1 p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl mt-2 leading-relaxed font-sans">
                  <h4 className="font-black text-slate-900 text-xs">{selectedSupplier.name}</h4>
                  {selectedSupplier.phone && <p>Phone: <span className="text-slate-800 font-mono">{selectedSupplier.phone}</span></p>}
                  {selectedSupplier.email && <p>Email: <span className="text-slate-800">{selectedSupplier.email}</span></p>}
                  <p>Billing Address: <span className="text-slate-800 font-normal whitespace-pre-line">{selectedSupplier.billingAddress || 'No Address Listed'}</span></p>
                  {selectedSupplier.state && <p>State: <span className="text-slate-800">{selectedSupplier.state}</span></p>}
                  {selectedSupplier.gstin && (
                    <p className="mt-1 font-mono text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 inline-block px-1.5 py-0.5 rounded uppercase">
                      GSTIN: {selectedSupplier.gstin}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider py-4 px-3 border border-dashed border-slate-200 rounded-xl text-center font-mono mt-2 bg-slate-50/20">
                  Select supplier profile to display vendor details
                </div>
              )}
            </div>

            {/* Smart Context & Custom Tax Rate Panel */}
            <div className="space-y-3">
              {isGstActive && gstMode === 'WITH_GST' ? (
                <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-4 space-y-2.5">
                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block font-mono">
                    GST TAX CONFIGURATION
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-24">
                      <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 font-mono">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        value={customTaxRate}
                        onChange={e => setCustomTaxRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-emerald-250 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-400 focus:bg-white text-center"
                      />
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
                  <div>
                    <span className="font-bold text-slate-800 block">Non-GST Template Activated</span>
                    No tax rows or CGST/SGST breakdowns will be added to this purchase bill or applied to the grand total.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Items Table */}
          <div className="flex items-center mb-2">
            <label className="text-xs font-semibold mr-2" htmlFor="useProductTogglePB">Use Product List</label>
            <input
              id="useProductTogglePB"
              type="checkbox"
              checked={useProduct}
              onChange={e => setUseProduct(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
            />
          </div>
          <div className="space-y-3 pt-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono border-b pb-1.5">
              {t.inventoryPurchaseRows || "Inventory Item purchase Rows"}
            </span>
            <div className="overflow-x-auto min-w-full">
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
                        {/* Description */}
                         <td className="py-2 pl-1.5 pr-2.5">
                           {useProduct ? (
                             <>
                               <select
                                 value={item.productId || ''}
                                 onChange={(e) => {
                                   const val = e.target.value;
                                   if (val) {
                                     const prod = products.find(p => String(p.id) === String(val));
                                     if (prod) {
                                       const updated = [...items];
                                       updated[index] = { ...updated[index], productId: val, name: prod.name, rate: prod.price || 0 };
                                       setItems(updated);
                                     }
                                   } else {
                                     const updated = [...items];
                                     updated[index] = { ...updated[index], productId: '', name: '', rate: 0 };
                                     setItems(updated);
                                   }
                                 }}
                                 className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-sans focus:outline-none text-slate-655 mb-1.5 block font-bold cursor-pointer"
                               >
                                 <option value="">-- Select Product --</option>
                                 {products.map(p => (
                                   <option key={p.id} value={String(p.id)}>{p.name} (₹{parseFloat(p.price || 0).toFixed(2)})</option>
                                 ))}
                               </select>
                               {item.name && (
                                 <span className="block mt-0.5 text-xs font-semibold text-slate-700">{item.name}</span>
                               )}
                             </>
                           ) : (
                              <input
                                type="text"
                                value={item.name}
                                onChange={e => handleItemRowChange(index, 'name', e.target.value)}
                                required
                                placeholder={t.inventoryItemDetails || "Inventory Item / Service details"}
                                className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-400 focus:bg-white rounded px-2 py-1 text-xs font-semibold text-slate-900 transition-all focus:outline-none"
                              />
                           )}
                         </td>

                        {/* Qty */}
                        <td className="py-2 pr-2.5 text-center">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.qty}
                            onChange={e => handleItemRowChange(index, 'qty', e.target.value)}
                            placeholder="Qty"
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-400 focus:bg-white rounded py-1 text-xs text-center font-mono font-bold text-slate-900 transition-all focus:outline-none"
                          />
                        </td>

                        {/* Rate */}
                        <td className="py-2 pr-2.5 relative">
                          <span className="absolute left-2 top-3 text-[10px] font-black pointer-events-none text-slate-400">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={item.rate}
                            onChange={e => handleItemRowChange(index, 'rate', e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-400 focus:bg-white rounded pl-6 pr-2 py-1 text-xs text-right font-mono font-bold transition-all focus:outline-none text-slate-900"
                          />
                        </td>

                        {/* Amount */}
                        <td className="py-2 pr-1 text-right font-mono font-black text-xs text-slate-800">
                          ₹{lineTot.toFixed(2)}
                        </td>

                        {/* Delete */}
                        <td className="py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            disabled={items.length <= 1}
                            className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors disabled:opacity-30"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick Add Row Actions */}
            <div className="flex flex-wrap gap-2 pt-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={addNewItemRow}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-700 hover:text-slate-900 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/80"
              >
                <Plus size={11} /> {t.addPurchaseRow || "Add Purchase Row"}
              </button>
            </div>
          </div>

          {/* 4. Notes & Terms & Signature & Totals Sheet */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-200/80">
            {/* Left Column: Bank info, terms, and local remarks input */}
            <div className="space-y-4">
              {/* Bank details info card */}
              {activeShop?.bankDetails && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block font-mono">
                    BANK ACCOUNT DETAILS
                  </span>
                  <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 text-[10px] font-mono font-semibold text-slate-600 leading-relaxed whitespace-pre-line text-left">
                    {activeShop.bankDetails}
                  </div>
                </div>
              )}

              {/* Invoice print terms card */}
              {activeShop?.invoiceTerms && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block font-mono">
                    TERMS & CONDITIONS
                  </span>
                  <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 text-[10px] font-sans text-slate-500 font-medium leading-relaxed whitespace-pre-line text-left">
                    {activeShop.invoiceTerms}
                  </div>
                </div>
              )}

              {/* Remarks/Notes */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block font-mono">
                  {t.slipRemarks || "Slip Description / Remarks"}
                </span>
                <input
                  type="text"
                  value={slipDetails}
                  onChange={e => setSlipDetails(e.target.value)}
                  placeholder="batch 4 additions, warehouse cargo delivery..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-slate-400 focus:bg-white text-slate-900 transition-all"
                />
              </div>

              {/* File Attachment Upload */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block font-mono">
                  {t.attachedBillPath || "Attached Bill Copy / Photo Document"}
                </span>
                {attachedImgUrl ? (
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Paperclip size={16} className="text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 truncate block">Attachment Uploaded</span>
                        <a
                          href={attachedImgUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-blue-600 font-bold hover:underline block truncate"
                        >
                          View Document ↗
                        </a>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedImgUrl('')}
                      className="text-slate-455 hover:text-rose-600 transition-colors p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-400 rounded-xl p-4 cursor-pointer transition-all">
                    {uploadingFile ? (
                      <div className="flex flex-col items-center gap-1">
                        <Loader2 className="animate-spin text-blue-600" size={20} />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Uploading to Cloudinary...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload size={20} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">Choose File to Upload</span>
                        <span className="text-[9px] text-slate-400 font-semibold font-sans">PDF, Document, or Image</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={handleFileChange}
                      disabled={uploadingFile}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Right Column: Totals details & Signature image */}
            <div className="flex flex-col justify-between space-y-6 md:text-right">
              {/* Totals panel sheet */}
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4.5 space-y-3 font-mono text-[11px] text-slate-500 text-left md:text-right">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-655">{t.purchaseSubtotal || "Purchase Subtotal"}:</span>
                  <span className="font-black text-xs text-slate-900">
                    ₹{subTotal.toFixed(2)}
                  </span>
                </div>

                {/* Extra Charges Section */}
                <div className="border-t border-slate-200/50 pt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-655">Extra Charges (+):</span>
                    <button
                      type="button"
                      onClick={() => setCustomCharges([...customCharges, { name: '', amount: '' }])}
                      className="flex items-center gap-1 text-[9px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5"
                    >
                      <Plus size={10} /> Add Charge
                    </button>
                  </div>

                  {customCharges.map((cc, ccIdx) => (
                    <div key={ccIdx} className="flex justify-between items-center gap-2 pl-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Charge Name (e.g. Delivery)"
                          value={cc.name}
                          onChange={e => {
                            const updated = [...customCharges];
                            updated[ccIdx].name = e.target.value;
                            setCustomCharges(updated);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-[10px] text-slate-800 font-bold focus:outline-none focus:border-slate-400"
                        />
                      </div>
                      <div className="relative w-28 shrink-0 flex items-center gap-1">
                        <span className="absolute left-2 text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          value={cc.amount}
                          onChange={e => {
                            const updated = [...customCharges];
                            updated[ccIdx].amount = e.target.value;
                            setCustomCharges(updated);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-md pl-4 pr-1 py-0.5 text-right text-[10px] text-slate-900 font-bold font-mono focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomCharges(customCharges.filter((_, i) => i !== ccIdx))}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-0.5"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {isGstActive && gstMode === 'WITH_GST' && (
                  <div className="space-y-2 border-t border-slate-200/50 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-655 flex items-center gap-1">Custom Tax Rate (%):</span>
                      <div className="relative w-28 shrink-0">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          placeholder="18"
                          value={customTaxRate}
                          onChange={e => setCustomTaxRate(parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-right text-slate-900 font-bold font-mono focus:outline-none focus:border-slate-450 focus:ring-1 focus:ring-slate-450"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 pl-2">
                      <span>CGST ({(taxRate / 2)}%):</span>
                      <span className="font-bold font-mono text-slate-700">₹{cgstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 pl-2">
                      <span>SGST ({(taxRate / 2)}%):</span>
                      <span className="font-bold font-mono text-slate-700">₹{sgstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-emerald-700 border-t border-emerald-100 pt-1.5 mt-1">
                      <span>Total GST Added ({taxRate}%):</span>
                      <span className="font-mono">₹{taxAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-slate-200/50 pt-2">
                  <span className="font-bold text-slate-655 flex items-center gap-1">Discount (−):</span>
                  <div className="relative w-28 shrink-0">
                    <span className="absolute left-2 top-1 text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={discount}
                      onChange={e => setDiscount(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-5 pr-2 py-0.5 text-right text-slate-900 font-bold font-mono focus:outline-none focus:border-slate-450 focus:ring-1 focus:ring-slate-450"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-2.5 mt-2 flex justify-between items-baseline">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">
                    {t.totalLiabilityPayable || "Total Liability (Payable)"}
                  </span>
                  <span className={`text-xl font-black ${grandTotal < 0 ? 'text-rose-600' : 'text-slate-950'}`}>
                    {grandTotal < 0 ? '−' : ''}₹{Math.abs(grandTotal).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Signature representation */}
              <div className="space-y-2 flex flex-col items-center md:items-end w-full">
                {activeShop?.signatureUrl && (
                  <div className="flex flex-col items-center">
                    <img
                      src={activeShop.signatureUrl}
                      alt="Authorized Signature"
                      className="max-h-12 object-contain bg-white p-0.5 rounded shadow-2xs"
                    />
                    <div className="border-t border-slate-350 w-36 mt-1" />
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                      Authorized Signatory
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Global Save Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center transition-all shadow-md hover:shadow-lg active:scale-[0.995] gap-2"
        >
          {submitting ? <Loader2 className="animate-spin" size={16} /> : null}
          {(t.recordPurchaseBillBtn ? t.recordPurchaseBillBtn.replace(" 💾", "") : "Record Purchase Bill & Balances") + " 💾"}
        </button>
      </form>
    </div>
  );
}
