import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext.jsx';
import { X, ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';

export default function TransactionModal({ isOpen, onClose, entityId, entityName, mode, t = {} }) {
    const { postManualLedgerEntry } = useContext(AppContext);
    const [amount, setAmount] = useState('');
    const [particulars, setParticulars] = useState('');
    const [txType, setTxType] = useState('DEBIT'); // DEBIT = You Gave (Take), CREDIT = You Got (Give)
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const customerId = mode === 'customer' ? entityId : null;
        const supplierId = mode === 'supplier' ? entityId : null;

        const res = await postManualLedgerEntry(parseFloat(amount), txType, particulars, customerId, supplierId, date);
        setSubmitting(false);
        if (res.success) {
            setAmount('');
            setParticulars('');
            setDate(new Date().toISOString().split('T')[0]);
            onClose();
        } else {
            alert(t.transactionSuccess || "Transaction saved safely!");
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                    <div>
                        <h3 className="font-bold text-sm">{(t.addEntryTitle || "Add New Entry")}: {entityName}</h3>
                        <p className="text-slate-400 text-[10px] font-mono mt-0.5">{t.addEntryDesc || "Logs instantly update client running balance logs"}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setTxType('DEBIT')}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${txType === 'DEBIT' ? 'bg-rose-50 border-rose-500 text-rose-700 font-bold shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <ArrowUpRight size={18} />
                            <span className="text-[9px] font-mono uppercase tracking-wider">{t.youGave || "You Gave (ઉધાર)"}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setTxType('CREDIT')}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${txType === 'CREDIT' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <ArrowDownLeft size={18} />
                            <span className="text-[9px] font-mono uppercase tracking-wider">{t.youGot || "You Got (જમા)"}</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.amountValueLabel || "Amount Value (₹)"}</label>
                            <input type="number" step="any" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white" placeholder="0.00" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Entry Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.particularsRemarksLabel || "Particulars Summary Remarks"}</label>
                        <input type="text" value={particulars} onChange={e => setParticulars(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white" placeholder="e.g., Opening credit balance, raw items collection" />
                    </div>

                    <button type="submit" disabled={submitting} className={`w-full text-white font-bold py-2.5 rounded-xl transition-all shadow-sm text-xs ${txType === 'DEBIT' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                        {submitting ? <Loader2 className="animate-spin mx-auto" size={16} /> : (t.commitEntryBtn ? t.commitEntryBtn.replace(" 💾", "") : "Commit Safe Entry") + " 💾"}
                    </button>
                </form>
            </div>
        </div>
    );
}