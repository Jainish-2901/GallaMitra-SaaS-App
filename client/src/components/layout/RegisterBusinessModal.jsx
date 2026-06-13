import React, { useState, useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Store, User, Phone, Sparkles, Building } from 'lucide-react';
import { AppContext } from '../../context/AppContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export default function RegisterBusinessModal({ isOpen, onClose }) {
  const { activeShop, plans, registerShopOwner, fetchMyWorkspaces } = useContext(AppContext);
  const toast = useToast();

  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState(activeShop?.ownerName || '');
  const [phone, setPhone] = useState(activeShop?.phone || '');
  const [plan, setPlan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Dynamically set default plan when modal opens or plans load
  useEffect(() => {
    if (isOpen && plans.length > 0 && !plan) {
      setPlan(plans[0].id);
    }
  }, [isOpen, plans, plan]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!businessName.trim()) {
      return setError('Business Name is required.');
    }
    if (!ownerName.trim()) {
      return setError('Owner Name is required.');
    }

    setSubmitting(true);
    try {
      const email = activeShop.email;
      const res = await registerShopOwner(
        businessName.trim(),
        ownerName.trim(),
        email,
        phone.trim(),
        '', // Omit password, backend clones it from existing email records
        plan
      );

      if (res.success) {
        if (res.pending) {
          toast.info('New business registration submitted. It requires administrator approval.');
        } else {
          toast.success(`New business "${businessName}" registered successfully!`);
        }
        
        // Refresh the list of workspaces
        await fetchMyWorkspaces(email);
        onClose();
        
        // Clear form
        setBusinessName('');
      } else {
        setError(res.error || 'Registration failed.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white relative">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-all"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Building size={20} />
              </div>
              <div>
                <h3 className="font-black text-base">Add New Business</h3>
                <p className="text-xs text-blue-100 font-semibold mt-0.5">Register another workspace under your account</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            {/* Business Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Business / Shop Name
              </label>
              <div className="relative">
                <Store size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="e.g. Gallamitra Store 2"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Owner Name & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Owner Name
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    placeholder="Owner's Name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Phone number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Email (Read Only representation) */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Linked Email Address (Fixed)
              </label>
              <div className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-xs font-semibold">
                {activeShop?.email}
              </div>
            </div>

            {/* Select Billing Plan */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Billing Package Plan
              </label>
              <div className="grid grid-cols-3 gap-2">
                {plans.map(p => {
                  const isSelected = plan === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlan(p.id)}
                      className={`p-2.5 border rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 text-blue-700 font-bold'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-650 font-semibold'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-black tracking-wider">{p.name}</span>
                      <span className="text-[10px] font-mono mt-0.5">
                        ₹{parseFloat(p.price).toFixed(0)}
                        {p.billingCycle?.toLowerCase() === 'free'
                          ? ' (Free)'
                          : (p.billingCycle?.toLowerCase() === 'trial'
                            ? ' (15 Days Trial)'
                            : `/${p.billingCycle?.toLowerCase() === 'yearly' || p.billingCycle?.toLowerCase() === 'yr' ? 'yr' : 'mo'}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-black px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-[0.98]"
              >
                {submitting ? 'Creating...' : <><Sparkles size={13} /> Add Business</>}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
