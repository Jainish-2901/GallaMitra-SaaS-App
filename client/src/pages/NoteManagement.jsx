import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import {
    PlusCircle, Trash2, Printer, FileDown, Search, ArrowRightLeft,
    FileText, Calendar, User, ShoppingBag, Landmark, ArrowLeft, Loader2, Edit
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { translations } from '../utils/translations';

export default function NoteManagement({ mode }) {
    const toast = useToast();
    const {
        activeShop, customers, suppliers, invoices, purchaseBills,
        creditNotes, debitNotes, postCreditNote, deleteCreditNote,
        postDebitNote, deleteDebitNote, updateCreditNote, updateDebitNote
    } = useContext(AppContext);

    const [editingNoteId, setEditingNoteId] = useState(null);

    const activeLang = activeShop?.language || 'gu';
    const t = translations[activeLang] || translations.en;

    const isCredit = mode === 'credit';
    const notesList = isCredit ? creditNotes : debitNotes;
    const partiesList = isCredit ? customers : suppliers;

    // Form states
    const [noteNo, setNoteNo] = useState('');
    const [selectedPartyId, setSelectedPartyId] = useState('');
    const [selectedDocId, setSelectedDocId] = useState('');
    const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
    const [docDate, setDocDate] = useState('');
    const [noteType, setNoteType] = useState('RETURN'); // 'RETURN' | 'RATE_DIFFERENCE'
    
    // Product selection from document
    const [docItems, setDocItems] = useState([]);
    const [selectedItemName, setSelectedItemName] = useState('');
    const [selectedItemProductId, setSelectedItemProductId] = useState('');
    
    // Values
    const [qty, setQty] = useState('');
    const [price, setPrice] = useState('');
    const [directAmount, setDirectAmount] = useState('');
    const [remark, setRemark] = useState('');
    const [saving, setSaving] = useState(false);

    // Filter/Search states
    const [searchQuery, setSearchQuery] = useState('');
    
    // Print/View States
    const [selectedNoteForView, setSelectedNoteForView] = useState(null);
    const [printLoading, setPrintLoading] = useState(false);
    const printRef = useRef(null);

    // Auto-generate note number
    useEffect(() => {
        if (editingNoteId) return;
        const prefix = isCredit ? 'CN' : 'DN';
        const num = Math.floor(100000 + Math.random() * 900000);
        setNoteNo(`${prefix}-${num}`);
    }, [mode, notesList, editingNoteId]);

    // Reset when mode changes
    useEffect(() => {
        setEditingNoteId(null);
        setSelectedPartyId('');
        setSelectedDocId('');
        setDocItems([]);
        setSelectedItemName('');
        setSelectedItemProductId('');
        setQty('');
        setPrice('');
        setDirectAmount('');
        setRemark('');
    }, [mode]);

    // Filter documents based on selected party
    const filteredDocs = isCredit
        ? invoices.filter(inv => inv.customerId === selectedPartyId)
        : purchaseBills.filter(pb => pb.supplierId === selectedPartyId);

    // Handle document change to fetch items and date
    const handleDocChange = (docId) => {
        setSelectedDocId(docId);
        setSelectedItemName('');
        setSelectedItemProductId('');
        setQty('');
        setPrice('');
        setDirectAmount('');

        if (!docId) {
            setDocDate('');
            setDocItems([]);
            return;
        }

        const doc = filteredDocs.find(d => d.id === docId);
        if (doc) {
            setDocDate(new Date(doc.date).toISOString().split('T')[0]);
            try {
                const parsedItems = typeof doc.itemsJson === 'string' ? JSON.parse(doc.itemsJson) : doc.itemsJson;
                setDocItems(Array.isArray(parsedItems) ? parsedItems : []);
            } catch (e) {
                setDocItems([]);
            }
        }
    };

    // Handle product selection to prefill price
    const handleProductChange = (prodName) => {
        setSelectedItemName(prodName);
        if (!prodName) {
            setSelectedItemProductId('');
            setPrice('');
            return;
        }

        const matchedItem = docItems.find(item => item.name === prodName);
        if (matchedItem) {
            setSelectedItemProductId(matchedItem.productId || '');
            setPrice(matchedItem.rate || matchedItem.price || '');
        }
    };

    // Calculate dynamic total amount
    const calculateTotalAmount = () => {
        if (noteType === 'RATE_DIFFERENCE') {
            return parseFloat(directAmount || 0);
        }
        return parseFloat(qty || 0) * parseFloat(price || 0);
    };

    const handleSaveNote = async (e) => {
        e.preventDefault();
        if (!selectedPartyId) {
            toast.error(t.chooseProfileError || 'Select a party account!');
            return;
        }

        const noteAmount = calculateTotalAmount();
        if (noteAmount <= 0) {
            toast.error('Note amount must be greater than zero!');
            return;
        }

        if (noteType === 'RETURN' && !selectedItemName) {
            toast.error('Please select a product/service to return.');
            return;
        }

        setSaving(true);
        const notePayload = {
            noteNo,
            customerId: isCredit ? selectedPartyId : undefined,
            supplierId: !isCredit ? selectedPartyId : undefined,
            invoiceId: isCredit ? (selectedDocId || undefined) : undefined,
            purchaseBillId: !isCredit ? (selectedDocId || undefined) : undefined,
            date: noteDate,
            invoiceDate: docDate || undefined,
            type: noteType,
            productId: selectedItemProductId || undefined,
            productName: selectedItemName || undefined,
            qty: noteType === 'RETURN' ? parseFloat(qty) : null,
            price: noteType === 'RETURN' ? parseFloat(price) : null,
            amount: noteAmount,
            remark
        };

        const res = editingNoteId
            ? (isCredit ? await updateCreditNote(editingNoteId, notePayload) : await updateDebitNote(editingNoteId, notePayload))
            : (isCredit ? await postCreditNote(notePayload) : await postDebitNote(notePayload));

        setSaving(false);

        if (res.success) {
            toast.success(`${isCredit ? 'Credit' : 'Debit'} Note ${editingNoteId ? 'updated' : 'saved'} successfully!`);
            cancelEdit();
        } else {
            toast.error(res.error || `Failed to ${editingNoteId ? 'update' : 'save'} note.`);
        }
    };

    const handleDeleteNote = async (id) => {
        if (!window.confirm(`Are you sure you want to permanently delete this ${isCredit ? 'Credit' : 'Debit'} Note? This will reverse ledger and stock balances.`)) return;
        
        const res = isCredit
            ? await deleteCreditNote(id)
            : await deleteDebitNote(id);

        if (res.success) {
            toast.success('Note deleted and balances reversed successfully.');
            if (editingNoteId === id) {
                cancelEdit();
            }
        } else {
            toast.error('Failed to delete note.');
        }
    };

    const startEditNote = (note) => {
        setEditingNoteId(note.id);
        setNoteNo(note.noteNo);
        setSelectedPartyId(isCredit ? note.customerId : note.supplierId);
        
        const docId = isCredit ? note.invoiceId || '' : note.purchaseBillId || '';
        setSelectedDocId(docId);
        
        setNoteDate(new Date(note.date).toISOString().split('T')[0]);
        setDocDate(note.invoiceDate ? new Date(note.invoiceDate).toISOString().split('T')[0] : '');
        setNoteType(note.type);
        
        // Find document items
        const allDocs = isCredit ? invoices : purchaseBills;
        const matchedDoc = allDocs.find(d => d.id === docId);
        if (matchedDoc) {
            try {
                const parsedItems = typeof matchedDoc.itemsJson === 'string' ? JSON.parse(matchedDoc.itemsJson) : matchedDoc.itemsJson;
                setDocItems(Array.isArray(parsedItems) ? parsedItems : []);
            } catch (e) {
                setDocItems([]);
            }
        } else {
            setDocItems([]);
        }
        
        setSelectedItemName(note.productName || '');
        setSelectedItemProductId(note.productId || '');
        setQty(note.qty ? note.qty.toString() : '');
        setPrice(note.price ? note.price.toString() : '');
        setDirectAmount(note.amount ? note.amount.toString() : '');
        setRemark(note.remark || '');
    };

    const cancelEdit = () => {
        setEditingNoteId(null);
        const prefix = isCredit ? 'CN' : 'DN';
        const num = Math.floor(100000 + Math.random() * 900000);
        setNoteNo(`${prefix}-${num}`);
        
        setSelectedPartyId('');
        setSelectedDocId('');
        setDocItems([]);
        setSelectedItemName('');
        setSelectedItemProductId('');
        setQty('');
        setPrice('');
        setDirectAmount('');
        setRemark('');
    };

    // Filtered list for search
    const filteredNotes = notesList.filter(note => {
        const partyName = isCredit ? note.customer?.name : note.supplier?.name;
        return (
            note.noteNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (partyName && partyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (note.remark && note.remark.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    });

    // Print helper
    const handlePrint = async () => {
        if (!printRef.current) return;
        setPrintLoading(true);
        try {
            const canvas = await html2canvas(printRef.current, { scale: 2 });
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head><title>Print ${isCredit ? 'Credit' : 'Debit'} Note #${selectedNoteForView?.noteNo}</title></head>
                <body style="margin:0;display:flex;justify-content:center;align-items:center;background:#f3f4f6;padding:20px;">
                    <img src="${canvas.toDataURL('image/png')}" style="max-width:100%;height:auto;box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" onload="window.print();window.close();" />
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (e) {
            console.error('Error generating print view:', e);
            toast.error('Print generation failed');
        }
        setPrintLoading(false);
    };

    // Download PDF helper
    const handleDownloadPDF = async () => {
        if (!printRef.current) return;
        setPrintLoading(true);
        try {
            const canvas = await html2canvas(printRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            
            const imgWidth = 210; // A4 Width in mm
            const pageHeight = 297; // A4 Height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`${isCredit ? 'Credit' : 'Debit'}_Note_${selectedNoteForView?.noteNo}.pdf`);
            toast.success('PDF downloaded successfully!');
        } catch (e) {
            console.error('Error exporting PDF:', e);
            toast.error('PDF export failed');
        }
        setPrintLoading(false);
    };

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <FileText className="text-blue-600" size={22} />
                        {isCredit ? 'Credit Note (Sales Return)' : 'Debit Note (Purchase Return)'}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        {isCredit 
                            ? 'Adjust customer ledger balances for returns and rate differences' 
                            : 'Adjust vendor liability balances for returns and purchase rate differences'}
                    </p>
                </div>
                <div className="mt-3 md:mt-0 flex gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                        {isCredit ? 'Customer Scope' : 'Supplier Scope'}
                    </span>
                </div>
            </div>

            {/* Main content split panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* CREATE NOTE FORM */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                            {editingNoteId ? <Edit className="text-amber-600" size={18} /> : <PlusCircle className="text-blue-600" size={18} />}
                            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                {editingNoteId ? 'Edit Note Entry' : 'Create New Entry'}
                            </h2>
                        </div>
                        {editingNoteId && (
                            <button
                                type="button"
                                onClick={cancelEdit}
                                className="text-[10px] font-black uppercase tracking-wider text-rose-600 hover:text-rose-700 cursor-pointer"
                            >
                                Cancel Edit
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSaveNote} className="space-y-3.5">
                        
                        {/* Note No & Date */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                    Note Number
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={noteNo}
                                    onChange={(e) => setNoteNo(e.target.value)}
                                    className="w-full text-xs font-mono font-bold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                    Adjustment Date
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={noteDate}
                                    onChange={(e) => setNoteDate(e.target.value)}
                                    className="w-full text-xs font-bold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                                />
                            </div>
                        </div>

                        {/* Party Selection */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                {isCredit ? 'Select Customer' : 'Select Supplier'}
                            </label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <select
                                    required
                                    value={selectedPartyId}
                                    onChange={(e) => {
                                        setSelectedPartyId(e.target.value);
                                        handleDocChange('');
                                    }}
                                    className="w-full text-xs font-bold pl-9.5 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 appearance-none"
                                >
                                    <option value="">{isCredit ? '-- Select Customer Account --' : '-- Select Supplier Account --'}</option>
                                    {partiesList.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.shopName ? `${p.shopName} — ${p.name}` : p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Invoice Selection */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                {isCredit ? 'Select Sales Invoice' : 'Select Purchase Bill'}
                            </label>
                            <div className="relative">
                                <ShoppingBag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <select
                                    value={selectedDocId}
                                    onChange={(e) => handleDocChange(e.target.value)}
                                    disabled={!selectedPartyId}
                                    className="w-full text-xs font-bold pl-9.5 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 appearance-none disabled:opacity-50"
                                >
                                    <option value="">-- Optional: Link to Document --</option>
                                    {filteredDocs.map(d => (
                                        <option key={d.id} value={d.id}>
                                            {isCredit ? `Inv #${d.invoiceNo}` : `Bill #${d.billNo || 'N/A'}`} - ₹{parseFloat(isCredit ? d.grandTotal : d.totalAmount).toFixed(2)} ({new Date(d.date).toLocaleDateString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Invoice/Bill Date */}
                        {docDate && (
                            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-2.5 text-[10px] font-medium text-blue-700 flex items-center gap-2">
                                <Calendar size={12} />
                                Original Document Date: <span className="font-bold">{new Date(docDate).toLocaleDateString()}</span>
                            </div>
                        )}

                        {/* Note Type Selector */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                                Adjustment Action Type
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setNoteType('RETURN')}
                                    className={`py-2 px-3 text-xs font-black rounded-xl tracking-wide border transition-all ${noteType === 'RETURN'
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    Inventory Return
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNoteType('RATE_DIFFERENCE')}
                                    className={`py-2 px-3 text-xs font-black rounded-xl tracking-wide border transition-all ${noteType === 'RATE_DIFFERENCE'
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    Rate Difference
                                </button>
                            </div>
                        </div>

                        {/* Product Selection */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                Product / Service
                            </label>
                            <select
                                required={noteType === 'RETURN'}
                                value={selectedItemName}
                                onChange={(e) => handleProductChange(e.target.value)}
                                disabled={!selectedDocId}
                                className="w-full text-xs font-bold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 appearance-none disabled:opacity-50"
                            >
                                <option value="">-- Select Product/Service --</option>
                                {docItems.map((item, idx) => (
                                    <option key={idx} value={item.name}>
                                        {item.name} ({t.qtyLabel || 'Qty'}: {item.qty}, {t.rateLabel || 'Rate'}: ₹{item.rate})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Dynamic Input Values */}
                        {noteType === 'RETURN' ? (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                        Return Quantity
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0.01"
                                        step="any"
                                        placeholder="0.00"
                                        value={qty}
                                        onChange={(e) => setQty(e.target.value)}
                                        className="w-full text-xs font-bold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                        Unit Return Price
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0.01"
                                        step="any"
                                        placeholder="0.00"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-full text-xs font-bold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                    Direct Rate Difference Amount (₹)
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0.01"
                                    step="any"
                                    placeholder="0.00"
                                    value={directAmount}
                                    onChange={(e) => setDirectAmount(e.target.value)}
                                    className="w-full text-xs font-bold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                                />
                            </div>
                        )}

                        {/* Remark */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                Reason / Remarks / Description
                            </label>
                            <textarea
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                placeholder="E.g. Damaged inventory return, Billing rate calculation error..."
                                rows="2"
                                className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                            />
                        </div>

                        {/* Dynamic Grand Total Card */}
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Note Value</span>
                            <span className="text-sm font-black text-slate-800">
                                ₹{calculateTotalAmount().toFixed(2)}
                            </span>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-2 cursor-pointer py-3 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-sm focus:outline-none disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : editingNoteId ? <Edit size={14} /> : <PlusCircle size={14} />}
                            {saving ? 'Processing...' : editingNoteId ? 'Update Note & Post Balances' : 'Save Note & Post Balances'}
                        </button>
                    </form>
                </div>

                {/* NOTES LOG LISTING */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col min-h-[450px]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                        <div className="flex items-center gap-2">
                            <ArrowRightLeft className="text-blue-600" size={18} />
                            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                Documents Log History
                            </h2>
                        </div>
                        {/* Search Input */}
                        <div className="relative w-full sm:w-48">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                            <input
                                type="text"
                                placeholder="Search logs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full text-[10px] pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-700 font-medium"
                            />
                        </div>
                    </div>

                    {/* Table listing */}
                    <div className="flex-1 overflow-x-auto mt-4">
                        <table className="w-full text-[11px] text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-400 font-black uppercase tracking-wider">
                                    <th className="py-2.5 px-2">Note No.</th>
                                    <th className="py-2.5 px-2">Date</th>
                                    <th className="py-2.5 px-2">Party</th>
                                    <th className="py-2.5 px-2">Type</th>
                                    <th className="py-2.5 px-2 text-right">Amount</th>
                                    <th className="py-2.5 px-2 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                                {filteredNotes.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-10 text-slate-400 font-bold">
                                            No adjustment records logged yet.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredNotes.map(note => {
                                        const partyName = isCredit ? note.customer?.name : note.supplier?.name;
                                        return (
                                            <tr key={note.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3 px-2 font-mono font-bold text-slate-900">{note.noteNo}</td>
                                                <td className="py-3 px-2 text-slate-500">{new Date(note.date).toLocaleDateString()}</td>
                                                <td className="py-3 px-2 font-semibold text-slate-800">{partyName || 'Deleted Party'}</td>
                                                <td className="py-3 px-2">
                                                    <span className={`inline-flex px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md ${note.type === 'RETURN' 
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                                                    }`}>
                                                        {note.type === 'RETURN' ? 'Return' : 'Rate Diff'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 font-black text-slate-900 text-right">₹{parseFloat(note.amount).toFixed(2)}</td>
                                                <td className="py-3 px-2">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => setSelectedNoteForView(note)}
                                                            title="Print/View slip"
                                                            className="p-1 hover:bg-slate-100 text-blue-600 rounded-lg cursor-pointer"
                                                        >
                                                            <Printer size={13} />
                                                        </button>
                                                        <button
                                                            onClick={() => startEditNote(note)}
                                                            title="Edit note"
                                                            className="p-1 hover:bg-slate-100 text-amber-600 rounded-lg cursor-pointer"
                                                        >
                                                            <Edit size={13} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteNote(note.id)}
                                                            title="Delete note"
                                                            className="p-1 hover:bg-red-50 text-red-600 rounded-lg cursor-pointer"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* PRINT/SLIP MODAL OVERLAY */}
            {selectedNoteForView && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-100 border border-slate-200 rounded-3xl p-5 shadow-xl max-w-lg w-full space-y-4">
                        
                        {/* Modal Action Controls */}
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                            <button
                                onClick={() => setSelectedNoteForView(null)}
                                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors"
                            >
                                <ArrowLeft size={13} /> Close Window
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrint}
                                    disabled={printLoading}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
                                >
                                    {printLoading ? <Loader2 size={11} className="animate-spin" /> : <Printer size={11} />}
                                    Print
                                </button>
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={printLoading}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
                                >
                                    {printLoading ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
                                    Export PDF
                                </button>
                            </div>
                        </div>

                        {/* Printable container (standard dimensions) */}
                        <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm overflow-hidden" ref={printRef} style={{ width: '420px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                            <div className="space-y-4 text-slate-800">
                                
                                {/* Company Header */}
                                <div className="text-center border-b border-slate-200 pb-3">
                                    {activeShop?.logoUrl ? (
                                        <img src={activeShop.logoUrl} alt="Logo" className="h-10 mx-auto mb-2 object-contain" />
                                    ) : (
                                        <StoreIcon size={24} className="mx-auto mb-1 text-slate-600" />
                                    )}
                                    <h3 className="text-sm font-black uppercase text-slate-900 leading-tight">
                                        {activeShop?.businessName || 'GallaMitra Business'}
                                    </h3>
                                    <p className="text-[9px] text-slate-500 font-medium leading-normal mt-0.5">
                                        {activeShop?.address || 'No Address registered'}<br />
                                        GSTIN: {activeShop?.gstin || 'N/A'} | Phone: {activeShop?.businessPhone || activeShop?.phone || 'N/A'}
                                    </p>
                                </div>

                                {/* Title Flag */}
                                <div className="text-center bg-[#0F172A] text-white py-1 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                    {isCredit ? 'Credit Note' : 'Debit Note'} (Adjustment Slip)
                                </div>

                                {/* Metadata Grid */}
                                <div className="grid grid-cols-2 gap-4 text-[9px] border-b border-slate-100 pb-3 font-medium">
                                    <div className="space-y-1">
                                        <div>Note Number: <span className="font-bold">{selectedNoteForView.noteNo}</span></div>
                                        <div>Date: <span className="font-bold">{new Date(selectedNoteForView.date).toLocaleDateString()}</span></div>
                                        <div>Linked Doc: <span className="font-bold">
                                            {isCredit 
                                                ? (selectedNoteForView.invoice?.invoiceNo ? `Sales Invoice #${selectedNoteForView.invoice.invoiceNo}` : 'None')
                                                : (selectedNoteForView.purchaseBill?.billNo ? `Purchase Bill #${selectedNoteForView.purchaseBill.billNo}` : 'None')
                                            }
                                        </span></div>
                                    </div>
                                    <div className="space-y-1">
                                        <div>Scope: <span className="font-bold uppercase">{isCredit ? 'Customer' : 'Supplier'} Adjustment</span></div>
                                        <div>Account Name: <span className="font-bold">{isCredit ? selectedNoteForView.customer?.name : selectedNoteForView.supplier?.name}</span></div>
                                        <div>Mobile No: <span className="font-bold">{isCredit ? selectedNoteForView.customer?.phone : selectedNoteForView.supplier?.phone || 'N/A'}</span></div>
                                    </div>
                                </div>

                                {/* Product details display */}
                                <div className="space-y-2 border-b border-slate-100 pb-3">
                                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Adjustment Items</div>
                                    
                                    <div className="bg-slate-50 rounded-xl p-2.5 text-[9px] font-medium border border-slate-100 space-y-1.5">
                                        <div className="flex justify-between items-center text-slate-900">
                                            <span className="font-black">{selectedNoteForView.productName || 'Adjustment Service/Product'}</span>
                                            <span className="font-black text-[10px] text-slate-900">
                                                ₹{parseFloat(selectedNoteForView.amount).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="text-slate-500 text-[8px] flex gap-3">
                                            <span>Type: <strong className="uppercase text-slate-700">{selectedNoteForView.type === 'RETURN' ? 'Inventory Return' : 'Price Adjustment'}</strong></span>
                                            {selectedNoteForView.type === 'RETURN' && (
                                                <>
                                                    <span>Qty: <strong>{parseFloat(selectedNoteForView.qty).toFixed(2)}</strong></span>
                                                    <span>Rate: <strong>₹{parseFloat(selectedNoteForView.price).toFixed(2)}</strong></span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Remarks & Signature */}
                                <div className="grid grid-cols-2 gap-4 text-[9px] font-medium pt-1">
                                    <div>
                                        <div className="text-slate-400 font-black uppercase tracking-wider text-[8px] mb-1">Remarks</div>
                                        <p className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 text-[8px] italic leading-relaxed min-h-[40px]">
                                            {selectedNoteForView.remark || 'No description notes.'}
                                        </p>
                                    </div>
                                    <div className="text-right flex flex-col justify-between items-end">
                                        <div>
                                            <div className="text-slate-400 font-black uppercase tracking-wider text-[8px]">Authorization</div>
                                            {activeShop?.signatureUrl ? (
                                                <img src={activeShop.signatureUrl} alt="Signature" className="h-6 mt-1 object-contain inline-block" />
                                            ) : (
                                                <div className="h-6 mt-1" />
                                            )}
                                        </div>
                                        <span className="text-[8px] font-black text-slate-800 uppercase tracking-wide">
                                            Authorized Signatory
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Simple internal icon fallback for Company header
function StoreIcon(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
            <path d="M2 7h20" />
            <path d="M10 12v3" />
            <path d="M14 12v3" />
        </svg>
    );
}
