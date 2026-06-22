import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Receipt, Loader2 } from 'lucide-react';

export default function PaymentReceiptGen({ t = {} }) {
    const { customers, suppliers, postPaymentReceipt } = useContext(AppContext);
    const toast = useToast();

    // Form states maps
    const [mode, setMode] = useState('customer'); // 'customer' or 'supplier'
    const [receiptNo, setReceiptNo] = useState(`REC-${Date.now().toString().slice(-6)}`);
    const [selectedEntityId, setSelectedEntityId] = useState('');
    const [amount, setAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('CASH'); // 'CASH', 'UPI', 'CHEQUE'
    const [remark, setRemark] = useState('');
    const [voucherDate, setVoucherDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState(false);

    const handleVoucherSubmission = async (e) => {
        e.preventDefault();
        if (!selectedEntityId) {
            toast.warning(t.chooseProfileError || 'Please designate a target account profile!');
            return;
        }

        setSubmitting(true);
        const targetCust = mode === 'customer' ? selectedEntityId : null;
        const targetSupp = mode === 'supplier' ? selectedEntityId : null;

        const response = await postPaymentReceipt(receiptNo, targetCust, targetSupp, parseFloat(amount), paymentMode, remark, voucherDate);
        setSubmitting(false);

        if (response.success) {
            toast.success(t.voucherSuccess || 'Payment voucher posted successfully! 💾');
            setReceiptNo(`REC-${Date.now().toString().slice(-6)}`);
            setAmount('');
            setRemark('');
            setSelectedEntityId('');
            setVoucherDate(new Date().toISOString().split('T')[0]);
        } else {
            toast.error('Failed to post payment voucher. Please retry.');
            setAmount('');
            setRemark('');
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm max-w-xl mx-auto space-y-5 animate-in fade-in duration-150">
            <div className="border-b pb-3">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                    <Receipt size={18} className="text-emerald-600" /> {t.paymentVoucherGen || "Payment Voucher Generator"}
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">{t.paymentVoucherDesc || "Post individual payment entries (UPI, Cash, or Cheque) cleanly into ledger sheets"}</p>
            </div>

            {/* Target Module Swapper */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                    type="button"
                    onClick={() => { setMode('customer'); setSelectedEntityId(''); }}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${mode === 'customer' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                >
                    {t.customerPayIn || "Customer Pay In"}
                </button>
                <button
                    type="button"
                    onClick={() => { setMode('supplier'); setSelectedEntityId(''); }}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${mode === 'supplier' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                >
                    {t.supplierPayOut || "Supplier Pay Out"}
                </button>
            </div>

            <form onSubmit={handleVoucherSubmission} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Voucher Date</label>
                        <input type="date" value={voucherDate} onChange={e => setVoucherDate(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white transition-all" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.voucherNoLabel || "Voucher Receipt Number"}</label>
                        <input type="text" value={receiptNo} onChange={e => setReceiptNo(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white transition-all" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.targetAccountProfile || "Target Account Profile"}</label>
                        <select
                            value={selectedEntityId}
                            onChange={e => setSelectedEntityId(e.target.value)}
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-400 focus:bg-white transition-all text-slate-800 font-medium"
                        >
                            <option value="">{t.chooseProfileCard || "-- Choose Profile Card --"}</option>
                            {mode === 'customer'
                                ? customers.filter(c => !c.isDeleted || c.id === selectedEntityId).map(c => <option key={c.id} value={c.id}>{c.shopName ? `${c.shopName} — ${c.name}` : c.name}</option>)
                                : suppliers.filter(s => !s.isDeleted || s.id === selectedEntityId).map(s => <option key={s.id} value={s.id}>{s.shopName ? `${s.shopName} — ${s.name}` : s.name}</option>)
                            }
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.amountRemitted || "Amount Remitted (₹)"}</label>
                        <input type="number" step="any" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none" placeholder="0.00" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.txMode || "Transaction Mode"}</label>
                        <select
                            value={paymentMode}
                            onChange={e => setPaymentMode(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-800 font-bold"
                        >
                            <option value="CASH">💵 CASH</option>
                            <option value="BANK">🏦 BANK</option>
                            <option value="ONLINE">🌐 ONLINE</option>
                            <option value="UPI">📱 UPI</option>
                            <option value="CARD">💳 CARD</option>
                            <option value="CHEQUE">📝 CHEQUE</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.voucherRemarks || "Voucher Description Remarks"}</label>
                    <input type="text" value={remark} onChange={e => setRemark(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" placeholder="e.g., received balance token adjustments" />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center tracking-wide"
                >
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : (t.saveVoucherBtn ? t.saveVoucherBtn.replace(" 💾", "") : "Save Payment Voucher") + " 💾"}
                </button>
            </form>
        </div>
    );
}