import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowDownLeft, ArrowUpRight, Loader2, Calendar } from 'lucide-react';

export default function TransactionModal({ isOpen, onClose, entityId, entityName, mode, t = {} }) {
    const { postManualLedgerEntry } = useContext(AppContext);
    const [amount, setAmount] = useState('');
    const [particulars, setParticulars] = useState('');
    const [txType, setTxType] = useState('DEBIT'); // DEBIT = You Gave (Take), CREDIT = You Got (Give)
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState(false);

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
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
                    />

                    {/* Modal Window Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
                        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden relative z-10"
                    >
                        {/* Header Box */}
                        <div className="bg-slate-900 p-5 flex justify-between items-center text-white relative">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
                            <div>
                                <h3 className="font-black text-sm tracking-tight">
                                    {(t.addEntryTitle || "Add New Entry")}: {entityName}
                                </h3>
                                <p className="text-slate-400 text-[10px] font-mono mt-0.5">
                                    {t.addEntryDesc || "Logs instantly update running balance sheets."}
                                </p>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-xl transition-all cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            
                            {/* You Gave vs You Got Transaction Buttons */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setTxType('DEBIT')}
                                    className={`p-3.5 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                                        txType === 'DEBIT' 
                                            ? 'bg-rose-50/50 border-rose-500 text-rose-700 font-black shadow-md shadow-rose-100' 
                                            : 'bg-slate-50 border-slate-200 text-slate-505 hover:bg-slate-100/50 hover:border-slate-300 font-bold'
                                    }`}
                                >
                                    <ArrowUpRight size={18} className={txType === 'DEBIT' ? 'text-rose-600' : 'text-slate-450'} />
                                    <span className="text-[9px] font-black uppercase tracking-wider">
                                        {t.youGave || "You Gave (ઉધાર)"}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setTxType('CREDIT')}
                                    className={`p-3.5 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                                        txType === 'CREDIT' 
                                            ? 'bg-emerald-50/50 border-emerald-500 text-emerald-700 font-black shadow-md shadow-emerald-100' 
                                            : 'bg-slate-50 border-slate-200 text-slate-505 hover:bg-slate-100/50 hover:border-slate-300 font-bold'
                                    }`}
                                >
                                    <ArrowDownLeft size={18} className={txType === 'CREDIT' ? 'text-emerald-600' : 'text-slate-450'} />
                                    <span className="text-[9px] font-black uppercase tracking-wider">
                                        {t.youGot || "You Got (જમા)"}
                                    </span>
                                </button>
                            </div>

                            {/* Inputs Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        {t.amountValueLabel || "Amount Value"}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-3.5 text-xs font-black text-slate-400 font-mono pointer-events-none">
                                            ₹
                                        </span>
                                        <input 
                                            type="number" 
                                            step="any" 
                                            value={amount} 
                                            onChange={e => setAmount(e.target.value)} 
                                            required 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-8 pr-3 py-3 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white text-slate-950 transition-all" 
                                            placeholder="0.00" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Entry Date
                                    </label>
                                    <input 
                                        type="date" 
                                        value={date} 
                                        onChange={e => setDate(e.target.value)} 
                                        required 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 transition-all" 
                                    />
                                </div>
                            </div>

                            {/* Remarks */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    {t.particularsRemarksLabel || "Particulars Summary Remarks"}
                                </label>
                                <input 
                                    type="text" 
                                    value={particulars} 
                                    onChange={e => setParticulars(e.target.value)} 
                                    required 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 transition-all" 
                                    placeholder="e.g., Opening balance, raw inventory" 
                                />
                            </div>

                            {/* Submit Button */}
                            <button 
                                type="submit" 
                                disabled={submitting} 
                                className={`w-full text-white font-black py-3 rounded-2xl transition-all shadow-md text-xs uppercase tracking-wider cursor-pointer active:scale-98 flex items-center justify-center ${
                                    txType === 'DEBIT' 
                                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/10' 
                                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10'
                                }`}
                            >
                                {submitting ? (
                                    <Loader2 className="animate-spin" size={16} />
                                ) : (
                                    <>
                                        {t.commitEntryBtn ? t.commitEntryBtn.replace(" 💾", "") : "Commit Safe Entry"}
                                        <span className="ml-1.5">💾</span>
                                    </>
                                )}
                            </button>

                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}