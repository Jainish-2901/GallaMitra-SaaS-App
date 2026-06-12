import React, { useState, useContext, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AppContext } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { translations } from '../utils/translations.js';
import SearchBar from '../components/SearchBar.jsx';
import { Phone, MessageSquare as WhatsApp, Share2, Plus, Trash2, Edit2, Eye, Loader2, X } from 'lucide-react';

export default function SupplierManagement({ openTxModal }) {
  const { activeShop, suppliers, addPartyRecord, removePartyRecord, fetchPortalShareLink, generateShortShareLink, loading } = useContext(AppContext);
  const toast = useToast();
  const activeLang = activeShop?.language || 'gu';
  const t = translations[activeLang] || translations.en;

  const [searchTerm, setSearchTerm] = useState('');
  const [pShopName, setPShopName] = useState('');
  const [pName, setPName] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pBillingAddress, setPBillingAddress] = useState('');
  const [pGstin, setPGstin] = useState('');
  const [pState, setPState] = useState('');
  const [pCreditLimit, setPCreditLimit] = useState('');
  const [pOpeningBalance, setPOpeningBalance] = useState('');

  // Modals visibility states
  const [viewingPartyId, setViewingPartyId] = useState(null);
  const [editingPartyId, setEditingPartyId] = useState(null);

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await addPartyRecord(pName, pPhone, 'supplier', {
      shopName: pShopName || null,
      email: pEmail || null, billingAddress: pBillingAddress || null,
      gstin: pGstin || null, state: pState || null,
      creditLimit: parseFloat(pCreditLimit || 0),
      openingBalance: parseFloat(pOpeningBalance || 0)
    });
    if (res?.success !== false) {
      toast.success(`Supplier "${pName}" added successfully!`);
      setPShopName(''); setPName(''); setPPhone(''); setPEmail(''); setPBillingAddress('');
      setPGstin(''); setPState(''); setPCreditLimit(''); setPOpeningBalance('');
    } else {
      toast.error('Failed to add supplier. Please retry.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}" from your supplier list?`)) return;
    await removePartyRecord(id, 'supplier');
    toast.success(`Supplier "${name}" removed.`);
  };

  const handleShare = async (id, name) => {
    const res = await fetchPortalShareLink(id, 'supplier');
    if (res.success && res.portalUrl) {
      navigator.clipboard.writeText(res.portalUrl);
      toast.info(`Public portal link for "${name}" copied to clipboard!`);
    } else {
      toast.error(res.error || 'Failed to generate portal link.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Add Form */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm h-fit">
        <h3 className="text-xs font-black text-slate-900 uppercase border-b pb-2 tracking-wider mb-4">{t.registerSupp}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Shop Name</label>
            <input type="text" value={pShopName} onChange={e => setPShopName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
              placeholder="e.g. Maruti Traders" />
          </div>
          {[
            { label: 'Supplier Name *', val: pName, set: setPName, type: 'text', ph: t.suppName, required: true },
            { label: 'Phone *', val: pPhone, set: setPPhone, type: 'text', ph: t.suppPhone, required: true },
            { label: 'Email', val: pEmail, set: setPEmail, type: 'email', ph: 'supplier@gmail.com' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{f.label}</label>
              <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} required={f.required}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold"
                placeholder={f.ph} />
            </div>
          ))}
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Billing Address</label>
            <textarea value={pBillingAddress} onChange={e => setPBillingAddress(e.target.value)} rows={1}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold resize-none"
              placeholder="Address..." />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">GSTIN</label>
              <input type="text" value={pGstin} onChange={e => setPGstin(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold" placeholder="GSTIN" />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">State</label>
              <input type="text" value={pState} onChange={e => setPState(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold" placeholder="Gujarat" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Credit Limit</label>
              <input type="number" value={pCreditLimit} onChange={e => setPCreditLimit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold" placeholder="50000" />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Opening Bal</label>
              <input type="number" value={pOpeningBalance} onChange={e => setPOpeningBalance(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold" placeholder="2500" />
            </div>
          </div>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md mt-1">
            {t.saveRegistry} ➕
          </button>
        </form>
      </div>

      {/* Supplier List */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} placeholder={t.filterSupp} />
        <div className="space-y-2 mt-4 max-h-[520px] overflow-y-auto pr-1">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-200" />
                    <div className="space-y-1">
                      <div className="h-3 bg-slate-200 rounded w-24" />
                      <div className="h-2 bg-slate-200 rounded w-16" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-4 bg-slate-200 rounded w-12" />
                    <div className="h-6 bg-slate-200 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-mono">No suppliers added yet.</div>
          ) : (
            filteredSuppliers.map(s => (
              <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border rounded-xl hover:border-slate-300 transition-all">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${parseFloat(s.balance || 0) >= 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-xs truncate">{s.name}</h4>
                    <p className="text-slate-400 text-[10px] font-mono"><Phone size={10} className="inline mr-0.5" />{s.phone || '—'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 sm:gap-3 pt-2.5 sm:pt-0 border-t border-slate-200/60 sm:border-t-0 w-full sm:w-auto">
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[9px] font-bold text-slate-400 block font-mono">{t.netPayable}</span>
                    <span className={`text-xs font-black font-mono ${parseFloat(s.balance || 0) >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ₹{Math.abs(parseFloat(s.balance || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                    <button onClick={() => setViewingPartyId(s.id)} className="bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border p-1.5 rounded-lg transition-all shadow-xs" title="View Profile">
                      <Eye size={12} />
                    </button>
                    <button onClick={() => setEditingPartyId(s.id)} className="bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border p-1.5 rounded-lg transition-all shadow-xs" title="Edit Profile">
                      <Edit2 size={12} />
                    </button>
                    <button onClick={async () => {
                      const shortRes = await generateShortShareLink({ partyId: s.id, role: 'supplier' });
                      if (!shortRes.success || !shortRes.shortUrl) { toast.error(shortRes.error || 'Failed to generate short share link.'); return; }
                      const text = `*${activeShop?.businessName}*\nSupplier: *${s.name}*\nView details: ${shortRes.shortUrl}`;
                      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                      window.open(url, '_blank');
                    }} className="bg-white hover:bg-green-50 text-slate-600 hover:text-green-600 border px-2 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all">
                      <Share2 size={11} /> <span className="hidden xs:inline">Share</span>
                    </button>
                    <button onClick={() => openTxModal(s.id, s.name, 'supplier')} className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-0.5 shadow-sm">
                      <Plus size={11} /> {t.entry}
                    </button>
                    <button onClick={() => handleDelete(s.id, s.name)} className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dynamic Profile Modals */}
      <ViewProfileModal isOpen={viewingPartyId !== null} onClose={() => setViewingPartyId(null)} partyId={viewingPartyId} role="supplier" t={t} />
      <EditPartyModal isOpen={editingPartyId !== null} onClose={() => setEditingPartyId(null)} partyId={editingPartyId} role="supplier" t={t} />
    </motion.div>
  );
}

// ─── HELPER VIEW COMPONENT FOR PROFILE ─────────────────────────────────────────
function ViewProfileModal({ isOpen, onClose, partyId, role, t }) {
  const { fetchPartyDetail } = useContext(AppContext);
  const [party, setParty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && partyId) {
      setLoading(true);
      fetchPartyDetail(partyId, role).then(res => {
        if (res && !res.error) {
          setParty(res);
        }
        setLoading(false);
      });
    }
  }, [isOpen, partyId, role]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
          <div>
            <h3 className="font-bold text-sm">
              {role === 'customer' ? 'Customer Profile' : 'Supplier Profile'}
            </h3>
            <p className="text-slate-400 text-[10px] font-mono mt-0.5">Registration & Billing Details</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" size={24} /></div>
          ) : !party ? (
            <div className="text-center text-xs text-slate-500 py-8 font-mono">Failed to load profile details.</div>
          ) : (
            <div className="space-y-3.5 text-xs text-slate-700">
              <div className="flex items-center gap-3 border-b pb-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-black flex items-center justify-center text-sm">
                  {(party.shopName || party.name)?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">{party.shopName || party.name}</h4>
                  {party.shopName && <p className="text-[10px] text-slate-500 font-bold">Contact Name: {party.name}</p>}
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">{role}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Phone</span>
                  <span className="font-bold text-slate-900">{party.phone || '—'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Email</span>
                  <span className="font-bold text-slate-900 break-all">{party.email || '—'}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Billing Address</span>
                <span className="font-semibold text-slate-800">{party.billingAddress || '—'}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">GSTIN</span>
                  <span className="font-mono font-bold text-slate-900">{party.gstin || '—'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">State</span>
                  <span className="font-bold text-slate-900">{party.state || '—'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Credit Limit</span>
                  <span className="font-mono font-bold text-slate-900">₹{parseFloat(party.creditLimit || 0).toFixed(2)}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Opening Balance</span>
                  <span className="font-mono font-bold text-slate-900">₹{parseFloat(party.openingBalance || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── HELPER EDIT COMPONENT FOR PROFILE ─────────────────────────────────────────
function EditPartyModal({ isOpen, onClose, partyId, role, t }) {
  const { fetchPartyDetail, updatePartyRecord } = useContext(AppContext);
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [shopName, setShopName] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [state, setState] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');

  useEffect(() => {
    if (isOpen && partyId) {
      setLoading(true);
      fetchPartyDetail(partyId, role).then(res => {
        if (res && !res.error) {
          setShopName(res.shopName || '');
          setName(res.name || '');
          setPhone(res.phone || '');
          setEmail(res.email || '');
          setBillingAddress(res.billingAddress || '');
          setGstin(res.gstin || '');
          setState(res.state || '');
          setCreditLimit(res.creditLimit || '');
          setOpeningBalance(res.openingBalance || '');
        }
        setLoading(false);
      });
    }
  }, [isOpen, partyId, role]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await updatePartyRecord(partyId, role, name, phone, {
      shopName: shopName || null,
      email: email || null,
      billingAddress: billingAddress || null,
      gstin: gstin || null,
      state: state || null,
      creditLimit: parseFloat(creditLimit || 0),
      openingBalance: parseFloat(openingBalance || 0)
    });
    setSubmitting(false);
    if (res.success) {
      toast.success('Profile updated successfully!');
      onClose();
    } else {
      toast.error(res.error || 'Failed to update profile.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
          <div>
            <h3 className="font-bold text-sm">
              {role === 'customer' ? 'Edit Customer Profile' : 'Edit Supplier Profile'}
            </h3>
            <p className="text-slate-400 text-[10px] font-mono mt-0.5">Fetch and update profile details dynamically</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" size={24} /></div>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Shop Name</label>
                  <input type="text" value={shopName} onChange={e => setShopName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Name *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone *</label>
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)} required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Billing Address</label>
                  <textarea value={billingAddress} onChange={e => setBillingAddress(e.target.value)} rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">GSTIN</label>
                    <input type="text" value={gstin} onChange={e => setGstin(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">State</label>
                    <input type="text" value={state} onChange={e => setState(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Credit Limit</label>
                    <input type="number" value={creditLimit} onChange={e => setCreditLimit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Opening Bal</label>
                    <input type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:bg-white text-slate-900 font-semibold" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-xs transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md flex items-center justify-center gap-1.5 transition-colors">
                  {submitting ? <Loader2 className="animate-spin" size={14} /> : 'Save Changes'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}