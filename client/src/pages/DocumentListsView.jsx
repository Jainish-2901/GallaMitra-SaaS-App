import React, { useContext, useState, useRef } from 'react';
import { AppContext } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Layers, ArrowDownLeft, ArrowUpRight, Trash2, Edit2, X, Plus, Eye, Printer, FileDown, Hash, Calendar, CreditCard, FileText, Info, Building2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function DocumentListsView({ mode, t = {} }) {
  const { activeShop, invoices, receipts, purchaseBills, deleteInvoice, editInvoice, deletePaymentReceipt, deletePurchaseBill, customers, suppliers, editPurchaseBill, editPaymentReceipt, fetchPortalShareLink, generateShortShareLink, loading } = useContext(AppContext);
  const toast = useToast();

  // Invoice Edit state variables
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [editInvoiceNo, setEditInvoiceNo] = useState('');
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTaxRate, setEditTaxRate] = useState(18);
  const [editMiscCharges, setEditMiscCharges] = useState(0);
  const [editDiscount, setEditDiscount] = useState(0);
  const [editDescription, setEditDescription] = useState('');

  // Purchase Bill Edit state variables
  const [editingPurchaseBill, setEditingPurchaseBill] = useState(null);
  const [editPbBillNo, setEditPbBillNo] = useState('');
  const [editPbSupplierId, setEditPbSupplierId] = useState('');
  const [editPbDate, setEditPbDate] = useState('');
  const [editPbSlipDetails, setEditPbSlipDetails] = useState('');
  const [editPbTotalAmount, setEditPbTotalAmount] = useState(0);
  const [editPbItems, setEditPbItems] = useState([]);
  const [editPbTaxRate, setEditPbTaxRate] = useState(0);
  const [editPbDiscount, setEditPbDiscount] = useState(0);
  const [editPbMiscCharges, setEditPbMiscCharges] = useState(0);

  // Receipt Edit state variables
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [editReceiptNo, setEditReceiptNo] = useState('');
  const [editReceiptCustomerId, setEditReceiptCustomerId] = useState('');
  const [editReceiptSupplierId, setEditReceiptSupplierId] = useState('');
  const [editReceiptDate, setEditReceiptDate] = useState('');
  const [editReceiptAmount, setEditReceiptAmount] = useState(0);
  const [editReceiptPaymentMode, setEditReceiptPaymentMode] = useState('Cash');
  const [editReceiptRemark, setEditReceiptRemark] = useState('');

  // Preview & Printing state and refs
  const invoicePrintRef = useRef(null);
  const receiptPrintRef = useRef(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const captureElement = async (ref) => {
    if (!ref?.current) return null;
    return await html2canvas(ref.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
  };

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

  const parseItems = (doc) => {
    try {
      return typeof doc.itemsJson === 'string' ? JSON.parse(doc.itemsJson) : (doc.itemsJson || []);
    } catch {
      return [];
    }
  };

  // ── RECEIPT PRINT BODY ──────────────────────────────────────────────────────
  const ReceiptPrintBody = ({ receipt }) => {
    const party = receipt ? (receipt.customerId ? customers.find(c => c.id === receipt.customerId) : suppliers.find(s => s.id === receipt.supplierId)) : null;

    return (
      <div ref={receiptPrintRef} style={{ background: '#fff', padding: '32px', fontFamily: 'Arial, sans-serif', maxWidth: '480px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px dashed #e2e8f0', paddingBottom: '20px' }}>
          {activeShop?.logoUrl && <img src={activeShop.logoUrl} alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', margin: '0 auto 10px', display: 'block' }} />}
          <div style={{ fontWeight: 900, fontSize: '18px', color: '#0f172a' }}>{activeShop?.businessName}</div>
          {activeShop?.address && <div style={{ fontSize: '11px', color: '#64748b' }}>{activeShop.address}</div>}
          {activeShop?.phone && <div style={{ fontSize: '11px', color: '#64748b' }}>Tel: {activeShop.phone}</div>}
          {activeShop?.gstin && <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>GSTIN: {activeShop.gstin}</div>}
          <div style={{ marginTop: '10px', fontSize: '13px', fontWeight: 900, letterSpacing: '0.15em', color: '#1d4ed8', textTransform: 'uppercase' }}>Payment Receipt</div>
        </div>
        {/* Receipt Details */}
        <div style={{ marginBottom: '20px' }}>
          {[
            ['Receipt No.', `#${receipt?.receiptNo}`],
            ['Date', receipt ? new Date(receipt.date).toLocaleString('en-IN') : ''],
            ['Party Name', party?.shopName || party?.name || '—'],
            ['Payment Mode', receipt?.paymentMode],
            receipt?.remark ? ['Remark', receipt.remark] : null,
          ].filter(Boolean).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
              <span style={{ color: '#64748b' }}>{k}</span>
              <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: k === 'Receipt No.' ? 'monospace' : 'inherit' }}>{v}</span>
            </div>
          ))}
        </div>
        {/* Amount */}
        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '18px', textAlign: 'center', margin: '20px 0' }}>
          <div style={{ color: '#64748b', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Amount</div>
          <div style={{ color: '#0f172a', fontWeight: 900, fontSize: '28px', fontFamily: 'monospace', marginTop: '4px' }}>₹{receipt ? parseFloat(receipt.amount).toFixed(2) : '0.00'}</div>
        </div>
        {/* Signature */}
        {activeShop?.signatureUrl && (
          <div style={{ textAlign: 'right', marginTop: '20px' }}>
            <img src={activeShop.signatureUrl} alt="Signature" style={{ height: '36px', objectFit: 'contain' }} />
            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>Authorized Signature</div>
          </div>
        )}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px', color: '#94a3b8' }}>Powered by GallaMitra</div>
      </div>
    );
  };

  const InvoicePrintBody = ({ doc }) => {
    if (!doc) return null;
    const items = parseItems(doc);
    const productItems = items.filter(it => it.rowType === 'item' || (it.rowType !== 'charge' && it.rowType !== 'metadata'));
    const chargeItems = items.filter(it => it.rowType === 'charge');
    const isInvoice = doc.type === 'invoice';
    
    // Fallback/Extract from metadata for purchase bills
    const metadata = items.find(it => it.rowType === 'metadata') || {};

    const subTotalVal = parseFloat(isInvoice ? (doc.subTotal || 0) : (metadata.subTotal || doc.totalAmount || 0));
    const taxRateVal = parseFloat(isInvoice ? (doc.taxRate || 0) : (metadata.taxRate || 0));
    const taxAmountVal = parseFloat(isInvoice ? (doc.taxAmount || 0) : (metadata.taxAmount || 0));
    const miscChargesVal = parseFloat(isInvoice ? (doc.miscCharges || 0) : (metadata.miscCharges || 0));
    const discountVal = parseFloat(isInvoice ? (doc.discount || 0) : (metadata.discount || 0));
    const grandTotalVal = parseFloat(isInvoice ? (doc.grandTotal || 0) : (doc.totalAmount || 0));

    // CGST & SGST calculations
    const cgstRate = (taxRateVal / 2).toFixed(1);
    const sgstRate = (taxRateVal / 2).toFixed(1);
    const cgstAmount = (taxAmountVal / 2).toFixed(2);
    const sgstAmount = (taxAmountVal / 2).toFixed(2);

    const party = isInvoice ? customers.find(c => c.id === doc.customerId) : suppliers.find(s => s.id === doc.supplierId);

    return (
      <div ref={invoicePrintRef} style={{ background: '#fff', padding: '40px', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '800px', border: '1px solid #e2e8f0', position: 'relative' }}>
        {/* Top Accent Line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', backgroundColor: '#f8fafc' }} />

        {/* 1. Header: Logo & Shop Details on Left, Title & Invoice details on Right */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {activeShop?.logoUrl ? (
              <img src={activeShop.logoUrl} alt="Logo" style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #e2e8f0', padding: '2px', backgroundColor: '#fff' }} />
            ) : (
              <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: 'linear-gradient(135deg,#f8fafc,#e5e7eb)', display: 'flex', alignItems: 'center', justify: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: '26px' }}>{(activeShop?.businessName || 'G')[0]}</span>
              </div>
            )}
            <div>
              <h2 style={{ fontWeight: 900, fontSize: '20px', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>{activeShop?.businessName}</h2>
              {activeShop?.address && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', maxWidth: '300px', lineHeight: '1.4' }}>{activeShop.address}</div>}
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                {activeShop?.phone || activeShop?.businessPhone ? `Phone: ${activeShop.phone || activeShop.businessPhone}` : ''}
                {activeShop?.businessEmail ? ` | Email: ${activeShop.businessEmail}` : ''}
              </div>
              {activeShop?.gstin && (
                <div style={{ marginTop: '6px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#475569', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
                    GSTIN: {activeShop.gstin}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ padding: '6px 14px', background: '#f8fafc', color: '#0f172a', borderRadius: '8px', fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', display: 'inline-block', textTransform: 'uppercase' }}>
              {isInvoice ? (taxAmountVal > 0 ? 'TAX INVOICE' : 'BILL OF SUPPLY') : 'PURCHASE SLIP'}
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
              {isInvoice ? 'Billed To' : 'Supplier Details'}
            </div>
            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>{party?.shopName || party?.name || 'Unknown'}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', lineHeight: '1.5' }}>
              {party?.shopName && <div>Contact: {party.name}</div>}
              {party?.phone && <div>Phone: <span style={{ color: '#0f172a', fontFamily: 'monospace' }}>{party.phone}</span></div>}
              {party?.email && <div>Email: {party.email}</div>}
              {party?.billingAddress && <div>Address: {party.billingAddress}</div>}
              {party?.state && <div>State: {party.state}</div>}
              {party?.gstin && (
                <div style={{ marginTop: '6px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#065f46', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: '6px', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                    GSTIN: {party.gstin}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '24px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#0f172a' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700, borderRadius: '8px 0 0 8px' }}>#</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700 }}>Item Description</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: 700 }}>Qty</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>Rate</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: 700, borderRadius: '0 8px 8px 0' }}>Amount</th>
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
            {activeShop?.bankDetails && (
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', fontSize: '9px', marginBottom: '3px' }}>Bank Details</span>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '8px', fontFamily: 'monospace', color: '#334155', whiteSpace: 'pre-wrap' }}>
                  {activeShop.bankDetails}
                </div>
              </div>
            )}
            {activeShop?.invoiceTerms && (
              <div>
                <span style={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', fontSize: '9px', marginBottom: '3px' }}>Terms &amp; Conditions</span>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '8px', color: '#334155', whiteSpace: 'pre-wrap' }}>
                  {activeShop.invoiceTerms}
                </div>
              </div>
            )}
          </div>

          {/* Totals panel */}
          <div style={{ width: '280px', shrink: 0 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', fontSize: '11px', fontFamily: 'monospace' }}>
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

              {taxAmountVal > 0 && (
                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '10px' }}>
                    <span>CGST ({cgstRate}%):</span>
                    <span style={{ color: '#334155' }}>₹{cgstAmount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '10px', marginTop: '3px' }}>
                    <span>SGST ({sgstRate}%):</span>
                    <span style={{ color: '#334155' }}>₹{sgstAmount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4f46e5', fontWeight: 700, fontSize: '10px', marginTop: '3px' }}>
                    <span>Total GST ({taxRateVal}%):</span>
                    <span>₹{taxAmountVal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {discountVal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '4px', color: '#e11d48' }}>
                  <span>Discount (−):</span>
                  <span>-₹{discountVal.toFixed(2)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #cbd5e1', paddingTop: '10px', marginTop: '8px', fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>
                <span>Grand Total:</span>
                <span>₹{grandTotalVal.toFixed(2)}</span>
              </div>
            </div>

            {/* Signature Block */}
            {activeShop?.signatureUrl && (
              <div style={{ marginTop: '24px', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <img src={activeShop.signatureUrl} alt="Signature" style={{ height: '44px', objectFit: 'contain', marginBottom: '4px' }} />
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

  const startEditInvoice = (inv) => {
    setEditingInvoice(inv);
    setEditInvoiceNo(inv.invoiceNo);
    setEditCustomerId(inv.customerId);
    setEditDate(new Date(inv.date).toISOString().split('T')[0]);
    setEditTaxRate(parseFloat(inv.taxRate || 0));
    setEditMiscCharges(parseFloat(inv.miscCharges || 0));
    setEditDiscount(parseFloat(inv.discount || 0));
    setEditDescription(inv.description || '');
    try {
      const parsedItems = typeof inv.itemsJson === 'string' ? JSON.parse(inv.itemsJson) : inv.itemsJson;
      setEditItems(Array.isArray(parsedItems) ? parsedItems : []);
    } catch (e) {
      setEditItems([]);
    }
  };

  const handleEditRowChange = (index, field, value) => {
    const updated = [...editItems];
    updated[index][field] = value;
    setEditItems(updated);
  };

  const addEditRow = () => {
    setEditItems([...editItems, { name: '', qty: 1, rate: 0 }]);
  };

  const removeEditRow = (index) => {
    if (editItems.length > 1) {
      setEditItems(editItems.filter((_, i) => i !== index));
    }
  };

  const calculateEditSubtotal = () => {
    return editItems.reduce((sum, item) => sum + (parseFloat(item.qty || 0) * parseFloat(item.rate || 0)), 0);
  };

  const calculateEditGrandTotal = () => {
    const subtotal = calculateEditSubtotal();
    const taxAmount = subtotal * (parseFloat(editTaxRate || 0) / 100);
    const grand = subtotal + taxAmount + parseFloat(editMiscCharges || 0) - parseFloat(editDiscount || 0);
    return Math.max(0, grand);
  };

  const handleSaveInvoiceEdit = async (e) => {
    e.preventDefault();
    const subVal = calculateEditSubtotal();
    const taxVal = parseFloat(editTaxRate || 0);
    const taxAmtVal = subVal * (taxVal / 100);
    const miscVal = parseFloat(editMiscCharges || 0);
    const discVal = parseFloat(editDiscount || 0);
    const grandVal = Math.max(0, subVal + taxAmtVal + miscVal - discVal);

    const res = await editInvoice(editingInvoice.id, {
      invoiceNo: editInvoiceNo,
      customerId: editCustomerId,
      date: editDate,
      itemsArray: editItems,
      subTotal: subVal,
      taxAmount: taxAmtVal,
      taxRate: taxVal,
      miscCharges: miscVal,
      discount: discVal,
      grandTotal: grandVal,
      description: editDescription
    });
    if (res.success) {
      toast.success(t.editInvoiceSuccess || 'Invoice edited and ledger balances recalculated!');
      setEditingInvoice(null);
    } else {
      toast.error(t.editInvoiceError || 'Failed to modify invoice.');
    }
  };

  // Receipt Edit handlers
  const startEditReceipt = (r) => {
    setEditingReceipt(r);
    setEditReceiptNo(r.receiptNo);
    setEditReceiptCustomerId(r.customerId || '');
    setEditReceiptSupplierId(r.supplierId || '');
    setEditReceiptDate(new Date(r.date).toISOString().split('T')[0]);
    setEditReceiptAmount(r.amount);
    setEditReceiptPaymentMode(r.paymentMode);
    setEditReceiptRemark(r.remark || '');
  };

  const handleSaveReceiptEdit = async (e) => {
    e.preventDefault();
    const res = await editPaymentReceipt(editingReceipt.id, {
      receiptNo: editReceiptNo,
      customerId: editReceiptCustomerId || null,
      supplierId: editReceiptSupplierId || null,
      amount: parseFloat(editReceiptAmount) || 0,
      paymentMode: editReceiptPaymentMode,
      remark: editReceiptRemark,
      date: editReceiptDate
    });
    if (res.success) {
      toast.success('Payment voucher edited and ledger balances recalculated!');
      setEditingReceipt(null);
    } else {
      toast.error('Failed to modify payment voucher.');
    }
  };

  // Purchase Bill Edit handlers
  const startEditPurchaseBill = (pb) => {
    setEditingPurchaseBill(pb);
    setEditPbBillNo(pb.billNo || '');
    setEditPbSupplierId(pb.supplierId);
    setEditPbDate(new Date(pb.date).toISOString().split('T')[0]);
    setEditPbSlipDetails(pb.slipDetails || '');
    setEditPbTotalAmount(parseFloat(pb.totalAmount || 0));
    try {
      const parsedItems = typeof pb.itemsJson === 'string' ? JSON.parse(pb.itemsJson) : pb.itemsJson;
      if (Array.isArray(parsedItems)) {
        // filter out metadata
        const metadata = parsedItems.find(it => it.rowType === 'metadata') || {};
        setEditPbTaxRate(parseFloat(metadata.taxRate || 0));
        setEditPbDiscount(parseFloat(metadata.discount || 0));
        setEditPbMiscCharges(parseFloat(metadata.miscCharges || 0));
        setEditPbItems(parsedItems.filter(it => it.rowType !== 'metadata'));
      } else {
        setEditPbItems([]);
        setEditPbTaxRate(0);
        setEditPbDiscount(0);
        setEditPbMiscCharges(0);
      }
    } catch (e) {
      setEditPbItems([]);
      setEditPbTaxRate(0);
      setEditPbDiscount(0);
      setEditPbMiscCharges(0);
    }
  };

  const handleEditPbRowChange = (index, field, value) => {
    const updated = [...editPbItems];
    updated[index][field] = value;
    setEditPbItems(updated);
  };

  const addEditPbRow = () => {
    setEditPbItems([...editPbItems, { name: '', qty: 1, rate: 0 }]);
  };

  const removeEditPbRow = (index) => {
    if (editPbItems.length > 1) {
      setEditPbItems(editPbItems.filter((_, i) => i !== index));
    }
  };

  const calculateEditPbSubtotal = () => {
    return editPbItems.reduce((sum, item) => sum + (parseFloat(item.qty || 0) * parseFloat(item.rate || 0)), 0);
  };

  const calculateEditPbTotal = () => {
    const subtotal = calculateEditPbSubtotal();
    const taxableValue = Math.max(subtotal + parseFloat(editPbMiscCharges || 0), 0);
    const taxAmount = taxableValue * (parseFloat(editPbTaxRate || 0) / 100);
    const grand = taxableValue + taxAmount - parseFloat(editPbDiscount || 0);
    return Math.max(0, grand);
  };

  const handleSavePurchaseBillEdit = async (e) => {
    e.preventDefault();
    const subtotal = calculateEditPbSubtotal();
    const misc = parseFloat(editPbMiscCharges || 0);
    const taxRateVal = parseFloat(editPbTaxRate || 0);
    const discountVal = parseFloat(editPbDiscount || 0);
    
    const taxableValue = Math.max(subtotal + misc, 0);
    const taxAmountVal = taxableValue * (taxRateVal / 100);
    const grandTotalVal = Math.max(taxableValue + taxAmountVal - discountVal, 0);

    const itemsToSave = [
      ...editPbItems.map(it => ({
        name: it.name,
        qty: parseFloat(it.qty || 1),
        rate: parseFloat(it.rate || 0),
        rowType: 'item',
        lineTotal: parseFloat(it.qty || 1) * parseFloat(it.rate || 0)
      })),
      {
        rowType: 'metadata',
        subTotal: subtotal,
        discount: discountVal,
        taxAmount: taxAmountVal,
        taxRate: taxRateVal,
        miscCharges: misc
      }
    ];

    const res = await editPurchaseBill(editingPurchaseBill.id, {
      billNo: editPbBillNo,
      supplierId: editPbSupplierId,
      date: editPbDate,
      itemsArray: itemsToSave,
      slipDetails: editPbSlipDetails,
      totalAmount: grandTotalVal
    });
    if (res.success) {
      toast.success('Purchase bill edited and supplier ledgers recalculated!');
      setEditingPurchaseBill(null);
    } else {
      toast.error('Failed to modify purchase bill.');
    }
  };

  // WhatsApp sharing handlers
  const handleShareWhatsApp = async (doc) => {
    const isInvoice = doc.type === 'invoice';
    const role = isInvoice ? 'customer' : 'supplier';
    const partyId = isInvoice ? doc.customerId : doc.supplierId;
    const shortRes = await generateShortShareLink({ partyId, role, docId: doc.id });
    if (!shortRes.success || !shortRes.shortUrl) {
      toast.error(shortRes.error || 'Failed to generate short share link.');
      return;
    }
    const portalLink = shortRes.shortUrl;
    const party = isInvoice ? customers.find(c => c.id === doc.customerId) : suppliers.find(s => s.id === doc.supplierId);
    let text = '';
    if (isInvoice) {
      text = `*Invoice #${doc.invoiceNo}*\n`;
      text += `Shop: *${activeShop?.businessName}*\n`;
      text += `Customer: *${party?.name || 'Valued Customer'}*\n`;
      text += `Date: *${new Date(doc.date).toLocaleDateString()}*\n`;
      text += `Grand Total: *₹${parseFloat(doc.grandTotal).toFixed(2)}*\n\n`;
      text += `Please check details on the portal: ${portalLink}`;
    } else {
      text = `*Purchase Bill #${doc.billNo || 'N/A'}*\n`;
      text += `Shop: *${activeShop?.businessName}*\n`;
      text += `Supplier: *${party?.name || 'N/A'}*\n`;
      text += `Date: *${new Date(doc.date).toLocaleDateString()}*\n`;
      text += `Total Amount: *₹${parseFloat(doc.totalAmount).toFixed(2)}*\n\n`;
      text += `Please check details on the portal: ${portalLink}`;
    }
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShareReceiptWhatsApp = async (receipt) => {
    const typeLabel = receipt.customerId ? 'customer' : 'supplier';
    const partyId = receipt.customerId || receipt.supplierId;
    const shortRes = await generateShortShareLink({ partyId, role: typeLabel, receiptId: receipt.id });
    if (!shortRes.success || !shortRes.shortUrl) {
      toast.error(shortRes.error || 'Failed to generate short share link.');
      return;
    }
    const portalLink = shortRes.shortUrl;
    const party = receipt.customerId ? customers.find(c => c.id === receipt.customerId) : suppliers.find(s => s.id === receipt.supplierId);
    let text = `*Payment Receipt #${receipt.receiptNo}*\n`;
    text += `Shop: *${activeShop?.businessName}*\n`;
    text += `Received From: *${party?.name || '—'}*\n`;
    text += `Date: *${new Date(receipt.date).toLocaleDateString()}*\n`;
    text += `Amount: *₹${parseFloat(receipt.amount).toFixed(2)}*\n`;
    text += `Payment Mode: *${receipt.paymentMode}*\n\n`;
    text += `Please check details on the portal: ${portalLink}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDeleteInvoice = async (id) => {
    if (window.confirm(t.deleteInvoiceConfirm || 'Delete this invoice? Ledger balances will update.')) {
      const res = await deleteInvoice(id);
      if (res.success) {
        toast.success(t.deleteInvoiceSuccess || 'Invoice permanently removed.');
      } else {
        toast.error(t.deleteInvoiceError || 'Failed to delete invoice.');
      }
    }
  };

  const handleDeleteReceipt = async (id) => {
    if (window.confirm(t.deleteReceiptConfirm || 'Delete this payment voucher? Ledger will self-heal.')) {
      const res = await deletePaymentReceipt(id);
      if (res.success) {
        toast.success(t.deleteReceiptSuccess || 'Payment voucher deleted.');
      } else {
        toast.error(t.deleteReceiptError || 'Failed to delete voucher.');
      }
    }
  };

  const handleDeletePurchaseBill = async (id) => {
    if (window.confirm(t.deletePurchaseConfirm || 'Delete this purchase bill? Supplier ledger will adjust.')) {
      const res = await deletePurchaseBill(id);
      if (res.success) {
        toast.success(t.deletePurchaseSuccess || 'Purchase bill removed.');
      } else {
        toast.error(t.deletePurchaseError || 'Failed to delete purchase bill.');
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex-1 animate-in fade-in duration-150">
      
      {/* Title */}
      <div className="border-b pb-3 mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-1.5">
            <Layers size={18} className="text-slate-700" />
            {mode === 'invoices' && (t.salesInvoicesArchive || "Sales Invoices Archive List")}
            {mode === 'receipts' && (t.finalizedPaymentVouchers || "Finalized Payment Voucher Index")}
            {mode === 'purchase_bills' && (t.historicalPurchaseSlips || "Historical Purchase Slips List")}
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">{t.reportsDesc || "Chronological repository tracking structural business metadata logs"}</p>
        </div>
        <span className="text-[10px] font-mono bg-slate-100 px-3 py-1 rounded-md text-slate-700 font-bold uppercase">
          {mode === 'invoices' && (t.invoices || 'invoices')}
          {mode === 'receipts' && (t.receipts || 'receipts')}
          {mode === 'purchase_bills' && (t.purchaseBills || 'purchase bills')}
        </span>
      </div>

      {mode === 'invoices' && (
          loading ? (
            <ListSkeleton />
          ) : (
            <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-mono text-[10px] border-b uppercase tracking-wider">
                    <th className="p-3">{t.invoiceNumberCol || "Invoice Number"}</th>
                    <th className="p-3">{t.customerProfileCol || "Customer Profile"}</th>
                    <th className="p-3">{t.dateCol || "Date"}</th>
                    <th className="p-3 text-right">{t.subtotalCol || "Subtotal"}</th>
                    <th className="p-3 text-right">{t.taxCol || "Tax"}</th>
                    <th className="p-3 text-right">Misc</th>
                    <th className="p-3 text-right">{t.grandTotalCol || "Grand Total"}</th>
                    <th className="p-3 text-center">{t.actionsCol || "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-10 font-mono text-slate-400">
                        No sales invoices initialized under this tenant folder.
                      </td>
                    </tr>
                  ) : (
                    invoices.map(i => {
                      const customer = customers.find(c => c.id === i.customerId);
                      return (
                        <tr key={i.id} className="hover:bg-slate-50/50">
                          <td className="p-3 text-blue-600 font-bold font-mono">
                            {i.invoiceNo}
                            {i.isEdited && <span className="ml-1 text-[8px] bg-amber-50 text-amber-600 px-1 rounded">Edited</span>}
                          </td>
                          <td className="p-3 font-semibold text-slate-900">{customer?.name || 'Unknown customer'}</td>
                          <td className="p-3 text-slate-450">{new Date(i.date).toLocaleDateString()}</td>
                          <td className="p-3 text-right font-mono">₹{parseFloat(i.subTotal).toFixed(2)}</td>
                          <td className="p-3 text-right font-mono text-slate-500">
                            ₹{parseFloat(i.taxAmount).toFixed(2)} <span className="text-[9px] font-mono text-slate-400">({parseFloat(i.taxRate || 0)}%)</span>
                          </td>
                          <td className="p-3 text-right font-mono text-slate-500">₹{parseFloat(i.miscCharges || 0).toFixed(2)}</td>
                          <td className="p-3 text-right font-mono font-black text-slate-950">₹{parseFloat(i.grandTotal).toFixed(2)}</td>
                          <td className="p-3 text-center flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedDoc({ type: 'invoice', ...i })}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                              title="View Invoice"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleShareWhatsApp({ type: 'invoice', ...i })}
                              className="p-1 text-emerald-600 hover:text-emerald-700 rounded transition-colors"
                              title="Share to WhatsApp"
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => { setSelectedDoc({ type: 'invoice', ...i }); setTimeout(() => handlePrintRef(invoicePrintRef, `Invoice #${i.invoiceNo}`), 300); }}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                              title="Print Invoice"
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              onClick={() => { setSelectedDoc({ type: 'invoice', ...i }); setTimeout(() => handleSaveRefAsPDF(invoicePrintRef, `Invoice_${i.invoiceNo}.pdf`), 300); }}
                              className="p-1 text-slate-400 hover:text-emerald-600 rounded transition-colors"
                              title="Save PDF"
                            >
                              <FileDown size={14} />
                            </button>
                            <button
                              onClick={() => startEditInvoice(i)}
                              className="p-1 text-slate-400 hover:text-blue-650 rounded transition-colors"
                              title="Edit Invoice"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(i.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Delete Invoice"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {invoices.length === 0 ? (
                <div className="text-center py-10 font-mono text-slate-400 text-xs">
                  No sales invoices initialized under this tenant folder.
                </div>
              ) : (
                invoices.map(i => {
                  const customer = customers.find(c => c.id === i.customerId);
                  return (
                    <div key={i.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-2xs space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-blue-600 font-mono">#{i.invoiceNo}</span>
                          {i.isEdited && <span className="ml-1 text-[8px] bg-amber-50 text-amber-600 px-1 rounded">Edited</span>}
                          <h4 className="font-bold text-slate-900 text-xs mt-0.5">{customer?.name || 'Unknown customer'}</h4>
                        </div>
                        <span className="text-xs font-black text-slate-950 font-mono">₹{parseFloat(i.grandTotal).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                        <span>Date: {new Date(i.date).toLocaleDateString()}</span>
                        <span>Subtotal: ₹{parseFloat(i.subTotal).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                        {/* WhatsApp Sharing Button */}
                        <button
                          onClick={() => handleShareWhatsApp({ type: 'invoice', ...i })}
                          className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          WhatsApp
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedDoc({ type: 'invoice', ...i })}
                            className="p-1.5 text-slate-500 bg-white border border-slate-200 rounded-lg hover:text-blue-600 hover:bg-slate-50"
                            title="View"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={() => { setSelectedDoc({ type: 'invoice', ...i }); setTimeout(() => handlePrintRef(invoicePrintRef, `Invoice #${i.invoiceNo}`), 300); }}
                            className="p-1.5 text-slate-500 bg-white border border-slate-200 rounded-lg hover:text-indigo-600 hover:bg-slate-50"
                            title="Print"
                          >
                            <Printer size={12} />
                          </button>
                          <button
                            onClick={() => { setSelectedDoc({ type: 'invoice', ...i }); setTimeout(() => handleSaveRefAsPDF(invoicePrintRef, `Invoice_${i.invoiceNo}.pdf`), 300); }}
                            className="p-1.5 text-slate-500 bg-white border border-slate-200 rounded-lg hover:text-emerald-600 hover:bg-slate-50"
                            title="PDF"
                          >
                            <FileDown size={12} />
                          </button>
                          <button
                            onClick={() => startEditInvoice(i)}
                            className="p-1.5 text-slate-500 bg-white border border-slate-200 rounded-lg hover:text-blue-600 hover:bg-slate-50"
                            title="Edit"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(i.id)}
                            className="p-1.5 text-rose-500 bg-rose-50 border border-rose-100 rounded-lg hover:text-rose-700 hover:bg-rose-100"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            </>
          )
      )}

      {mode === 'receipts' && (
          loading ? (
            <ListSkeleton />
          ) : (
            <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-mono text-[10px] border-b uppercase tracking-wider">
                    <th className="p-3">Receipt No</th>
                    <th className="p-3">Party Name</th>
                    <th className="p-3">Scope</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Payment Mode</th>
                    <th className="p-3">Remark</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {receipts.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-10 font-mono text-slate-400">
                        No payment vouchers tracked yet.
                      </td>
                    </tr>
                  ) : (
                    receipts.map(r => {
                      const customer = customers.find(c => c.id === r.customerId);
                      const supplier = suppliers.find(s => s.id === r.supplierId);
                      const partyName = r.customerId ? (customer?.name || 'N/A') : (supplier?.name || 'N/A');
                      const roleLabel = r.customerId ? 'Customer' : 'Supplier';
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                          <td className="p-3 text-blue-600 font-bold font-mono">
                            #{r.receiptNo}
                            {r.isEdited && <span className="ml-1 text-[8px] bg-amber-50 text-amber-600 px-1 rounded">Edited</span>}
                          </td>
                          <td className="p-3 font-semibold text-slate-900">{partyName}</td>
                          <td className="p-3 text-slate-500 font-semibold">{roleLabel}</td>
                          <td className="p-3 text-slate-450">{new Date(r.date).toLocaleDateString()}</td>
                          <td className="p-3"><span className="text-blue-600 font-bold">{r.paymentMode}</span></td>
                          <td className="p-3 text-slate-500 italic truncate max-w-xs">{r.remark || '—'}</td>
                          <td className="p-3 text-right font-mono font-black text-emerald-600">₹{parseFloat(r.amount).toFixed(2)}</td>
                          <td className="p-3 text-center flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedReceipt(r)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                              title="View Receipt"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleShareReceiptWhatsApp(r)}
                              className="p-1 text-emerald-600 hover:text-emerald-700 rounded transition-colors"
                              title="Share to WhatsApp"
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => { setSelectedReceipt(r); setTimeout(() => handlePrintRef(receiptPrintRef, `Receipt #${r.receiptNo}`), 300); }}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                              title="Print Receipt"
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              onClick={() => { setSelectedReceipt(r); setTimeout(() => handleSaveRefAsPDF(receiptPrintRef, `Receipt_${r.receiptNo}.pdf`), 300); }}
                              className="p-1 text-slate-400 hover:text-emerald-600 rounded transition-colors"
                              title="Save PDF"
                            >
                              <FileDown size={14} />
                            </button>
                            <button
                              onClick={() => startEditReceipt(r)}
                              className="p-1 text-slate-400 hover:text-blue-650 rounded transition-colors"
                              title="Edit Receipt"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteReceipt(r.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Delete Receipt"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {receipts.length === 0 ? (
                <div className="text-center py-10 font-mono text-slate-400 text-xs">
                  No payment vouchers tracked yet.
                </div>
              ) : (
                receipts.map(r => {
                  const customer = customers.find(c => c.id === r.customerId);
                  const supplier = suppliers.find(s => s.id === r.supplierId);
                  const partyName = r.customerId ? (customer?.name || 'N/A') : (supplier?.name || 'N/A');
                  const roleLabel = r.customerId ? 'Customer' : 'Supplier';
                  return (
                    <div key={r.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-2xs space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-blue-600 font-mono">#{r.receiptNo}</span>
                          {r.isEdited && <span className="ml-1 text-[8px] bg-amber-50 text-amber-600 px-1 rounded">Edited</span>}
                          <h4 className="font-bold text-slate-900 text-xs mt-0.5">{partyName}</h4>
                          <span className="text-[10px] text-slate-400">({roleLabel})</span>
                        </div>
                        <span className="text-xs font-black text-emerald-600 font-mono">₹{parseFloat(r.amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                        <span>Date: {new Date(r.date).toLocaleDateString()}</span>
                        <span>Mode: {r.paymentMode}</span>
                      </div>
                      {r.remark && <p className="text-slate-550 text-[10px] italic mt-1 font-medium">Note: {r.remark}</p>}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                        <button
                          onClick={() => handleShareReceiptWhatsApp(r)}
                          className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          WhatsApp
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedReceipt(r)}
                            className="p-1.5 text-slate-500 bg-white border border-slate-200 rounded-lg hover:text-blue-600 hover:bg-slate-50"
                            title="View"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={() => { setSelectedReceipt(r); setTimeout(() => handlePrintRef(receiptPrintRef, `Receipt #${r.receiptNo}`), 300); }}
                            className="p-1.5 text-slate-500 bg-white border border-slate-200 rounded-lg hover:text-indigo-600 hover:bg-slate-50"
                            title="Print"
                          >
                            <Printer size={12} />
                          </button>
                          <button
                            onClick={() => { setSelectedReceipt(r); setTimeout(() => handleSaveRefAsPDF(receiptPrintRef, `Receipt_${r.receiptNo}.pdf`), 300); }}
                            className="p-1.5 text-slate-500 bg-white border border-slate-200 rounded-lg hover:text-emerald-600 hover:bg-slate-50"
                            title="PDF"
                          >
                            <FileDown size={12} />
                          </button>
                          <button
                            onClick={() => startEditReceipt(r)}
                            className="p-1.5 text-slate-500 bg-white border border-slate-200 rounded-lg hover:text-blue-600 hover:bg-slate-50"
                            title="Edit"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteReceipt(r.id)}
                            className="p-1.5 text-rose-500 bg-rose-50 border border-rose-100 rounded-lg hover:text-rose-700 hover:bg-rose-100"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            </>
          )
        )}

        {mode === 'purchase_bills' && (
          loading ? (
            <ListSkeleton />
          ) : (
            <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-mono text-[10px] border-b uppercase tracking-wider">
                    <th className="p-3">Bill Number</th>
                    <th className="p-3">Supplier Name</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Remarks</th>
                    <th className="p-3 text-right">Total Amount</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {purchaseBills.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-10 font-mono text-slate-400">
                        No purchase bills tracked yet.
                      </td>
                    </tr>
                  ) : (
                    purchaseBills.map(pb => {
                      const supplier = suppliers.find(s => s.id === pb.supplierId);
                      return (
                        <tr key={pb.id} className="hover:bg-slate-50/50">
                          <td className="p-3 text-blue-600 font-bold font-mono">
                            #{pb.billNo || 'N/A'}
                            {pb.isEdited && <span className="ml-1 text-[8px] bg-amber-50 text-amber-600 px-1 rounded">Edited</span>}
                          </td>
                          <td className="p-3 font-semibold text-slate-900">{supplier?.name || 'N/A'}</td>
                          <td className="p-3 text-slate-450">{new Date(pb.date).toLocaleDateString()}</td>
                          <td className="p-3 text-slate-500 truncate max-w-xs">{pb.slipDetails || '—'}</td>
                          <td className="p-3 text-right font-mono font-black text-slate-900">₹{parseFloat(pb.totalAmount).toFixed(2)}</td>
                          <td className="p-3 text-center flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedDoc({ type: 'purchase_bill', ...pb })}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                              title="View Purchase Bill"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleShareWhatsApp({ type: 'purchase_bill', ...pb })}
                              className="p-1 text-emerald-600 hover:text-emerald-700 rounded transition-colors"
                              title="Share to WhatsApp"
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => { setSelectedDoc({ type: 'purchase_bill', ...pb }); setTimeout(() => handlePrintRef(invoicePrintRef, `Slip #${pb.billNo || 'N/A'}`), 300); }}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                              title="Print Purchase Bill"
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              onClick={() => { setSelectedDoc({ type: 'purchase_bill', ...pb }); setTimeout(() => handleSaveRefAsPDF(invoicePrintRef, `PurchaseSlip_${pb.billNo || 'N/A'}.pdf`), 300); }}
                              className="p-1 text-slate-400 hover:text-emerald-600 rounded transition-colors"
                              title="Save PDF"
                            >
                              <FileDown size={14} />
                            </button>
                            <button
                              onClick={() => startEditPurchaseBill(pb)}
                              className="p-1 text-slate-400 hover:text-blue-650 rounded transition-colors"
                              title="Edit Purchase Bill"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeletePurchaseBill(pb.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Delete Purchase Bill"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {purchaseBills.length === 0 ? (
                <div className="text-center py-10 font-mono text-slate-400 text-xs">
                  No purchase bills tracked yet.
                </div>
              ) : (
                purchaseBills.map(pb => {
                  const supplier = suppliers.find(s => s.id === pb.supplierId);
                  return (
                    <div key={pb.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-2xs space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-blue-600 font-mono">#{pb.billNo || 'N/A'}</span>
                          {pb.isEdited && <span className="ml-1 text-[8px] bg-amber-50 text-amber-600 px-1 rounded">Edited</span>}
                          <h4 className="font-bold text-slate-900 text-xs mt-0.5">{supplier?.name || 'N/A'}</h4>
                        </div>
                        <span className="text-xs font-black text-slate-955 font-mono">₹{parseFloat(pb.totalAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                        <span>Date: {new Date(pb.date).toLocaleDateString()}</span>
                      </div>
                      {pb.slipDetails && <p className="text-slate-500 text-[10px] mt-1">Remark: {pb.slipDetails}</p>}
                      {pb.attachedImgUrl && (
                        <p className="text-[10px] text-blue-600 font-mono mt-0.5 truncate max-w-xs">
                          Attached: <a href={pb.attachedImgUrl} target="_blank" rel="noreferrer" className="underline">View Image</a>
                        </p>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                        <button
                          onClick={() => handleShareWhatsApp({ type: 'purchase_bill', ...pb })}
                          className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          WhatsApp
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedDoc({ type: 'purchase_bill', ...pb })}
                            className="p-1.5 text-slate-550 bg-white border border-slate-200 rounded-lg hover:text-blue-600 hover:bg-slate-50"
                            title="View"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={() => { setSelectedDoc({ type: 'purchase_bill', ...pb }); setTimeout(() => handlePrintRef(invoicePrintRef, `Slip #${pb.billNo || 'N/A'}`), 300); }}
                            className="p-1.5 text-slate-555 bg-white border border-slate-200 rounded-lg hover:text-indigo-600 hover:bg-slate-50"
                            title="Print"
                          >
                            <Printer size={12} />
                          </button>
                          <button
                            onClick={() => { setSelectedDoc({ type: 'purchase_bill', ...pb }); setTimeout(() => handleSaveRefAsPDF(invoicePrintRef, `PurchaseSlip_${pb.billNo || 'N/A'}.pdf`), 300); }}
                            className="p-1.5 text-slate-550 bg-white border border-slate-200 rounded-lg hover:text-emerald-600 hover:bg-slate-50"
                            title="PDF"
                          >
                            <FileDown size={12} />
                          </button>
                          <button
                            onClick={() => startEditPurchaseBill(pb)}
                            className="p-1.5 text-slate-500 bg-white border border-slate-200 rounded-lg hover:text-blue-600 hover:bg-slate-50"
                            title="Edit"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeletePurchaseBill(pb.id)}
                            className="p-1.5 text-rose-500 bg-rose-50 border border-rose-100 rounded-lg hover:text-rose-700 hover:bg-rose-100"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            </>
          )
        )}

      {/* Invoice Edit Sliding Modal Overlay */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#f8fafc] p-4 flex justify-between items-center text-[#0f172a]">
              <div>
                <h3 className="font-black text-sm">{t.editInvoiceTitle || "Edit Invoice"} {editInvoiceNo}</h3>
                <p className="text-slate-400 text-[10px] font-mono mt-0.5">{t.editInvoiceDesc || "Update quantities, rates, and descriptions in real-time"}</p>
              </div>
              <button
                onClick={() => setEditingInvoice(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveInvoiceEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={editInvoiceNo}
                    onChange={e => setEditInvoiceNo(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Customer Account</label>
                  <select
                    value={editCustomerId}
                    onChange={e => setEditCustomerId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 font-semibold"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">{t.itemizedBillingRows || "Invoice Line Items"}</label>
                
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                  {editItems.map((item, index) => (
                    <div key={index} className="flex gap-2.5 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => handleEditRowChange(index, 'name', e.target.value)}
                        required
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold"
                        placeholder="Item Description"
                      />
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={e => handleEditRowChange(index, 'qty', parseInt(e.target.value) || 0)}
                        required
                        className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-center font-mono"
                      />
                      <input
                        type="number"
                        step="any"
                        value={item.rate}
                        onChange={e => handleEditRowChange(index, 'rate', parseFloat(e.target.value) || 0)}
                        required
                        className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-right font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => removeEditRow(index)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addEditRow}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700"
                >
                  <Plus size={12} /> {t.addLineItem || "Add Line Item"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tax Rate (GST %)</label>
                  <select
                    value={editTaxRate}
                    onChange={e => setEditTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 font-semibold"
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Misc Charges (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editMiscCharges}
                    onChange={e => setEditMiscCharges(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editDiscount}
                    onChange={e => setEditDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Remarks</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 resize-none font-semibold"
                  placeholder="Additional remarks or details..."
                />
              </div>

              {/* Recalculated total preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex justify-between items-center text-xs font-mono">
                <div className="text-slate-500 space-y-0.5">
                  <div>New Subtotal: <span className="text-slate-900 font-bold">₹{calculateEditSubtotal().toFixed(2)}</span></div>
                  <div>Tax Amount ({editTaxRate}%): <span className="text-slate-900 font-bold">₹{(calculateEditSubtotal() * (editTaxRate / 100)).toFixed(2)}</span></div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Recalculated Grand Total</span>
                  <span className="text-sm font-black text-slate-950">₹{calculateEditGrandTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs"
                >
                  {t.cancelBtn || "Cancel"}
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-5 rounded-xl text-xs"
                >
                  {t.applyChangesBtn || "Apply Override Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Bill Edit Sliding Modal Overlay */}
      {editingPurchaseBill && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#f8fafc] p-4 flex justify-between items-center text-[#0f172a]">
              <div>
                <h3 className="font-black text-sm">Edit Purchase Bill {editPbBillNo}</h3>
                <p className="text-slate-400 text-[10px] font-mono mt-0.5">Update supplier details, billing amounts, and items list</p>
              </div>
              <button
                onClick={() => setEditingPurchaseBill(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePurchaseBillEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bill Number</label>
                  <input
                    type="text"
                    value={editPbBillNo}
                    onChange={e => setEditPbBillNo(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bill Date</label>
                  <input
                    type="date"
                    value={editPbDate}
                    onChange={e => setEditPbDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Supplier Account</label>
                  <select
                    value={editPbSupplierId}
                    onChange={e => setEditPbSupplierId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 font-semibold"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Bill Line Items (Optional)</label>
                
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                  {editPbItems.length === 0 ? (
                    <div className="text-[10px] text-slate-400 font-mono py-1.5 text-center bg-slate-50 rounded-xl border border-dashed">
                      No itemized list. Bill total is managed manually below.
                    </div>
                  ) : editPbItems.map((item, index) => (
                    <div key={index} className="flex gap-2.5 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => handleEditPbRowChange(index, 'name', e.target.value)}
                        required
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold"
                        placeholder="Item Description"
                      />
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={e => handleEditPbRowChange(index, 'qty', parseInt(e.target.value) || 0)}
                        required
                        className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-center font-mono"
                      />
                      <input
                        type="number"
                        step="any"
                        value={item.rate}
                        onChange={e => handleEditPbRowChange(index, 'rate', parseFloat(e.target.value) || 0)}
                        required
                        className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-right font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => removeEditPbRow(index)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addEditPbRow}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700"
                >
                  <Plus size={12} /> Add Line Item
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tax Rate (GST %)</label>
                  <select
                    value={editPbTaxRate}
                    onChange={e => setEditPbTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 font-semibold"
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Misc Charges (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editPbMiscCharges}
                    onChange={e => setEditPbMiscCharges(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editPbDiscount}
                    onChange={e => setEditPbDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Slip Details / Remarks</label>
                <textarea
                  value={editPbSlipDetails}
                  onChange={e => setEditPbSlipDetails(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 resize-none font-semibold"
                  placeholder="Slip details, tracking notes..."
                />
              </div>

              {/* Recalculated total preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex justify-between items-center text-xs font-mono">
                <div className="text-slate-500 space-y-0.5">
                  <div>New Subtotal: <span className="text-slate-900 font-bold">₹{calculateEditPbSubtotal().toFixed(2)}</span></div>
                  <div>Tax Amount ({editPbTaxRate}%): <span className="text-slate-900 font-bold">₹{((calculateEditPbSubtotal() + parseFloat(editPbMiscCharges || 0)) * (editPbTaxRate / 100)).toFixed(2)}</span></div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Recalculated Grand Total</span>
                  <span className="text-sm font-black text-slate-950">₹{calculateEditPbTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingPurchaseBill(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-5 rounded-xl text-xs"
                >
                  Apply Override Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Edit Sliding Modal Overlay */}
      {editingReceipt && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#f8fafc] p-4 flex justify-between items-center text-[#0f172a]">
              <div>
                <h3 className="font-black text-sm">Edit Payment Receipt</h3>
                <p className="text-slate-400 text-[10px] font-mono mt-0.5">Modify amount, payment mode, date and remarks</p>
              </div>
              <button
                onClick={() => setEditingReceipt(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveReceiptEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Receipt Number</label>
                  <input
                    type="text"
                    value={editReceiptNo}
                    onChange={e => setEditReceiptNo(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Receipt Date</label>
                  <input
                    type="date"
                    value={editReceiptDate}
                    onChange={e => setEditReceiptDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {editingReceipt.customerId ? 'Customer Account' : 'Supplier Account'}
                </label>
                {editingReceipt.customerId ? (
                  <select
                    value={editReceiptCustomerId}
                    onChange={e => setEditReceiptCustomerId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 font-semibold"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={editReceiptSupplierId}
                    onChange={e => setEditReceiptSupplierId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 font-semibold"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editReceiptAmount}
                    onChange={e => setEditReceiptAmount(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Payment Mode</label>
                  <select
                    value={editReceiptPaymentMode}
                    onChange={e => setEditReceiptPaymentMode(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 font-semibold"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Remarks</label>
                <textarea
                  value={editReceiptRemark}
                  onChange={e => setEditReceiptRemark(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 resize-none font-semibold"
                  placeholder="Additional remarks or details..."
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingReceipt(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-5 rounded-xl text-xs"
                >
                  Apply Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* ─── Receipt View Modal ──────────────────────────────────────────────── */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedReceipt(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)' }}>
              <div>
                <h3 className="font-black text-white text-sm">Payment Receipt</h3>
                <p className="text-emerald-300 text-[10px] font-mono font-bold">Voucher #{selectedReceipt.receiptNo}</p>
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
                {activeShop?.logoUrl && <img src={activeShop.logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-cover mx-auto mb-2 border border-slate-200" />}
                <p className="font-black text-slate-900 text-base">{activeShop?.businessName}</p>
                {activeShop?.address && <p className="text-slate-400 text-[10px] mt-0.5">{activeShop.address}</p>}
                {activeShop?.phone && <p className="text-slate-400 text-[10px]">Tel: {activeShop.phone}</p>}
              </div>
              {/* Details */}
              <div className="space-y-2.5">
                {(() => {
                  const party = selectedReceipt.customerId ? customers.find(c => c.id === selectedReceipt.customerId) : suppliers.find(s => s.id === selectedReceipt.supplierId);
                  return [
                    ['Receipt No.', `#${selectedReceipt.receiptNo}`, Hash],
                    ['Date', new Date(selectedReceipt.date).toLocaleString('en-IN'), Calendar],
                    ['Party Name', party?.shopName || party?.name || '—', Building2],
                    ['Payment Mode', selectedReceipt.paymentMode, CreditCard],
                    selectedReceipt.remark ? ['Remark', selectedReceipt.remark, FileText] : null,
                  ].filter(Boolean).map(([k, v, Icon]) => (
                    <div key={k} className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <Icon size={11} className="text-slate-400" /> {k}
                      </div>
                      <span className="font-bold text-slate-900 text-xs font-mono">{v}</span>
                    </div>
                  ));
                })()}
              </div>
              {/* Amount */}
              <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)' }}>
                <p className="text-emerald-300 text-[10px] font-mono uppercase tracking-wider font-bold">Amount Received</p>
                <p className="text-white font-black text-3xl font-mono mt-1 font-bold">₹{parseFloat(selectedReceipt.amount).toFixed(2)}</p>
              </div>
              {/* Signature */}
              {activeShop?.signatureUrl && (
                <div className="flex flex-col items-end">
                  <p className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">Authorized Signature</p>
                  <img src={activeShop.signatureUrl} alt="Signature" className="h-10 object-contain mt-1 border border-slate-100 rounded-lg p-0.5 bg-slate-50" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Invoice / Document View Modal ──────────────────────────────────── */}
      {selectedDoc && (() => {
        const items = parseItems(selectedDoc);
        const productItems = items.filter(it => it.rowType === 'item' || (it.rowType !== 'charge' && it.rowType !== 'metadata'));
        const chargeItems = items.filter(it => it.rowType === 'charge');
        const isInvoice = selectedDoc.type === 'invoice';

        // Fallback/Extract from metadata for purchase bills
        const metadata = items.find(it => it.rowType === 'metadata') || {};

        const subTotalVal = parseFloat(isInvoice ? (selectedDoc.subTotal || 0) : (metadata.subTotal || selectedDoc.totalAmount || 0));
        const taxRateVal = parseFloat(isInvoice ? (selectedDoc.taxRate || 0) : (metadata.taxRate || 0));
        const taxAmountVal = parseFloat(isInvoice ? (selectedDoc.taxAmount || 0) : (metadata.taxAmount || 0));
        const miscChargesVal = parseFloat(isInvoice ? (selectedDoc.miscCharges || 0) : (metadata.miscCharges || 0));
        const discountVal = parseFloat(isInvoice ? (selectedDoc.discount || 0) : (metadata.discount || 0));
        const grandTotalVal = parseFloat(isInvoice ? (selectedDoc.grandTotal || 0) : (selectedDoc.totalAmount || 0));
        const cgstRate = (taxRateVal / 2).toFixed(1);
        const sgstRate = (taxRateVal / 2).toFixed(1);
        const cgstAmount = (taxAmountVal / 2).toFixed(2);
        const sgstAmount = (taxAmountVal / 2).toFixed(2);
        const party = isInvoice ? customers.find(c => c.id === selectedDoc.customerId) : suppliers.find(s => s.id === selectedDoc.supplierId);

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedDoc(null)}>
            <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
              {/* Subtle accent bar at top */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900" />
              
              {/* Header */}
              <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100 mt-1.5">
                <div>
                  <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase leading-none font-mono">
                    {isInvoice ? (taxAmountVal > 0 ? 'TAX INVOICE' : 'BILL OF SUPPLY') : 'PURCHASE SLIP'}
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
                    {activeShop?.logoUrl ? (
                      <img src={activeShop.logoUrl} alt="Logo" className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-2xs p-0.5 bg-white" />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg" style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
                        {(activeShop?.businessName || 'G')[0]}
                      </div>
                    )}
                    <div>
                      <h2 className="text-base font-black text-slate-900 leading-tight">{activeShop?.businessName}</h2>
                      {activeShop?.address && <p className="text-slate-400 font-mono text-[9px] mt-0.5 leading-relaxed">{activeShop.address}</p>}
                      <div className="text-slate-400 text-[9px] mt-0.5">
                        {activeShop?.phone && <span>Tel: {activeShop.phone}</span>}
                        {activeShop?.businessEmail && <span> | Email: {activeShop.businessEmail}</span>}
                      </div>
                    </div>
                  </div>
                  {activeShop?.gstin && (
                    <div className="md:text-right">
                      <span className="inline-block bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[9px] font-black px-2 py-0.5 rounded uppercase">
                        GSTIN: {activeShop.gstin}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Bill To */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-[8px] text-slate-400 font-mono font-bold uppercase tracking-wider mb-2">{isInvoice ? 'Billed To' : 'Supplier Details'}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 leading-relaxed">
                    <div>
                      <p className="font-black text-slate-900 text-sm">{party?.shopName || party?.name || 'Unknown'}</p>
                      {party?.shopName && <p className="text-slate-505 text-[10px] mt-0.5 font-bold">Contact: {party.name}</p>}
                      {party?.phone && <p className="text-slate-500 font-mono text-[10px]">Phone: {party.phone}</p>}
                      {party?.email && <p className="text-slate-500 text-[10px]">Email: {party.email}</p>}
                    </div>
                    <div className="md:text-right">
                      {party?.billingAddress && <p className="text-slate-500 text-[10px]">{party.billingAddress}</p>}
                      {party?.state && <p className="text-slate-500 text-[10px]">State: {party.state}</p>}
                      {party?.gstin && (
                        <p className="mt-1">
                          <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                            GSTIN: {party.gstin}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Items */}
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
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] text-slate-655 leading-relaxed font-semibold">
                          {selectedDoc.description}
                        </div>
                      </div>
                    )}
                    {activeShop?.bankDetails && (
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Bank Details</span>
                        <div className="bg-slate-50 border border-slate-155 rounded-xl p-3 text-[10px] text-slate-655 leading-relaxed font-semibold whitespace-pre-wrap font-mono font-bold">
                          {activeShop.bankDetails}
                        </div>
                      </div>
                    )}
                    {activeShop?.invoiceTerms && (
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Terms &amp; Conditions</span>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] text-slate-655 leading-relaxed font-semibold whitespace-pre-wrap font-sans">
                          {activeShop.invoiceTerms}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Calculations & Signature */}
                  <div className="w-full md:w-72 shrink-0 space-y-4">
                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2.5 font-mono text-[10.5px] text-slate-500">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-655">Subtotal:</span>
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

                      {taxAmountVal > 0 && (
                        <div className="space-y-1.5 border-t border-slate-200 pt-2 mt-2">
                          <div className="flex justify-between items-center text-[9.5px]">
                            <span>CGST ({cgstRate}%):</span>
                            <span className="font-bold text-slate-700">₹{cgstAmount}</span>
                          </div>
                          <div className="flex justify-between items-center text-[9.5px]">
                            <span>SGST ({sgstRate}%):</span>
                            <span style={{ fontWeight: 700, color: '#334155' }}>₹{sgstAmount}</span>
                          </div>
                          <div className="flex justify-between items-center text-[9.5px] text-indigo-650 font-bold font-black">
                            <span>Total GST ({taxRateVal}%):</span>
                            <span>₹{taxAmountVal.toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {discountVal > 0 && (
                        <div className="flex justify-between items-center border-t border-slate-200 pt-2 mt-2 text-rose-600">
                          <span className="font-bold">Discount (−):</span>
                          <span className="font-black font-mono">₹{discountVal.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center border-t border-slate-900 pt-2.5 mt-2.5 text-xs text-slate-955 font-black">
                        <span>Grand Total:</span>
                        <span>₹{grandTotalVal.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Signature */}
                    {activeShop?.signatureUrl && (
                      <div className="flex flex-col items-end">
                        <p className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">Authorized Signature</p>
                        <img src={activeShop.signatureUrl} alt="Signature" className="h-10 object-contain mt-1 border border-slate-100 rounded-lg p-0.5 bg-slate-50" />
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

function ListSkeleton() {
  return (
    <div className="space-y-3 mt-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex items-center gap-3 w-1/3">
            <div className="w-9 h-9 rounded-xl bg-slate-200" />
            <div className="space-y-2 flex-1">
              <div className="h-3.5 bg-slate-200 rounded w-3/4" />
              <div className="h-2.5 bg-slate-200 rounded w-1/2" />
            </div>
          </div>
          <div className="h-3 bg-slate-200 rounded w-20 hidden md:block" />
          <div className="h-3 bg-slate-200 rounded w-16 hidden md:block" />
          <div className="flex flex-col items-end gap-1.5">
            <div className="h-4 bg-slate-200 rounded w-16" />
            <div className="h-2 bg-slate-200 rounded w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}