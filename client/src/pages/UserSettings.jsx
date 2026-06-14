import React, { useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { AppContext } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { translations } from '../utils/translations.js';
import { ShieldCheck, Calendar, Clock, Star, Zap, Crown } from 'lucide-react';

export default function UserSettings() {
  const { activeShop, updateShopSettings, plans, requestPlanChange } = useContext(AppContext);
  const toast = useToast();
  const activeLang = activeShop?.language || 'gu';
  const t = translations[activeLang] || translations.en;
  
  const [requestingId, setRequestingId] = useState(null);

  const handleLangChange = async (e) => {
    const newLang = e.target.value;
    const res = await updateShopSettings({ language: newLang });
    if (res?.success !== false) {
      toast.success('Language preference updated!');
    }
  };

  const handleRequestPlan = async (planId) => {
    setRequestingId(planId);
    const res = await requestPlanChange(planId);
    setRequestingId(null);
    if (res.success) {
      toast.success(`Request for plan upgrade submitted successfully! 🚀`);
    } else {
      toast.error(res.error || 'Failed to request plan change.');
    }
  };

  // Plan styling details
  const getPlanIcon = (id) => {
    if (id === 'starter') return Star;
    if (id === 'growth') return Zap;
    return Crown;
  };

  const getPlanColor = (id) => {
    if (id === 'starter') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (id === 'growth') return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-purple-600 bg-purple-50 border-purple-200';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">
      
      {/* Profile & Localization */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="border-b pb-3">
          <h2 className="text-base font-black text-slate-900">{t.userSettingsTitle}</h2>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">Switch language templates and localization settings instantly</p>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t.selectLang}</label>
          <select
            id="user-settings-lang"
            value={activeLang}
            onChange={handleLangChange}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          >
            <option value="en">English (US)</option>
            <option value="gu">ગુજરાતી (Gujarati)</option>
            <option value="hi">हिंदी (Hindi)</option>
          </select>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
          <p className="text-xs font-semibold text-slate-600">
            Current localization: <span className="text-slate-950 font-black">{activeLang.toUpperCase()}</span>
          </p>
          <p className="text-[11px] text-slate-400 font-normal leading-relaxed">
            Toggling language immediately updates translations across all dashboard items and ledger labels.
          </p>
        </div>

        {/* Workspace Info */}
        <div className="border-t pt-4 space-y-2">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Workspace Info</h3>
          {[
            { label: 'Business Name', value: activeShop?.businessName },
            { label: 'Owner Name', value: activeShop?.ownerName },
            { label: 'Registered Email', value: activeShop?.email },
            { label: 'Workspace ID', value: activeShop?.id },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{row.label}</span>
              <span className="text-xs font-bold text-slate-900 font-mono">{row.value || '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subscription Pricing Upgrade Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="border-b pb-3 flex justify-between items-center">
          <div>
            <h2 className="text-base font-black text-slate-900">Subscription & Plan Upgrades</h2>
            <p className="text-slate-500 text-xs mt-0.5 font-medium">Manage your subscription package and request workspace upgrades</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${getPlanColor(activeShop?.plan)}`}>
            {activeShop?.plan} active
          </div>
        </div>

        {/* Expiry / Billing Cycle Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/50 flex items-center gap-3">
            <Calendar size={18} className="text-blue-500" />
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Expiration Date</p>
              <p className="text-xs font-bold text-slate-800">
                {activeShop?.subscriptionExpiresAt 
                  ? new Date(activeShop.subscriptionExpiresAt).toLocaleDateString('en-IN') 
                  : 'Unlimited (Free)'}
              </p>
            </div>
          </div>
          <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/50 flex items-center gap-3">
            <Clock size={18} className="text-emerald-500" />
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Request Status</p>
              <p className="text-xs font-bold text-slate-800 uppercase">
                {activeShop?.planRequestStatus === 'pending' ? 'Pending Review' : 'No Pending Requests'}
              </p>
            </div>
          </div>
        </div>

        {/* Warning notification banner for pending requests */}
        {activeShop?.planRequestStatus === 'pending' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
            <Clock size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-black text-amber-800">Plan Change Pending Approval</p>
              <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed font-semibold">
                Your request to change plan to <strong className="uppercase">"{activeShop.requestedPlan}"</strong> is currently pending Super Admin review. You will receive an email once the request has been approved.
              </p>
            </div>
          </div>
        )}

        {/* Upgrade Paths Grid */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Available Subscription Packages</h3>
          {plans.map((p, idx) => {
            const PlanIcon = getPlanIcon(p.id);
            const isCurrent = p.id === activeShop?.plan;
            const isPendingThis = activeShop?.planRequestStatus === 'pending' && activeShop?.requestedPlan === p.id;
            
            const priceNum = parseFloat(p.price);
            const features = Array.isArray(p.features) ? p.features : (typeof p.features === 'string' ? JSON.parse(p.features) : []);

            return (
              <div 
                key={p.id}
                className={`border p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  isCurrent 
                    ? 'border-blue-200 bg-blue-50/10' 
                    : isPendingThis
                      ? 'border-amber-200 bg-amber-50/10'
                      : 'border-slate-100 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg border flex items-center justify-center flex-shrink-0 ${getPlanColor(p.id)}`}>
                    <PlanIcon size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black text-slate-900">{p.name}</p>
                      <span className="text-[10px] font-bold text-slate-500">
                        ₹{priceNum.toFixed(0)}/{p.billingCycle === 'free' ? 'free' : p.billingCycle === 'trial' ? 'trial' : p.billingCycle === 'monthly' ? 'mo' : p.billingCycle === '3_months' ? '3 mo' : p.billingCycle === '6_months' ? '6 mo' : p.billingCycle === 'yearly' ? 'yr' : p.billingCycle}
                      </span>
                    </div>
                    <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      {features.map((f, fidx) => (
                        <li key={fidx} className="text-[9px] font-semibold text-slate-400 flex items-center gap-1">
                          <span className="text-emerald-500">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {isCurrent ? (
                    <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl block text-center">
                      Current Plan
                    </span>
                  ) : isPendingThis ? (
                    <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl block text-center animate-pulse">
                      Pending Approval
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRequestPlan(p.id)}
                      disabled={activeShop?.planRequestStatus === 'pending' || requestingId === p.id}
                      className={`w-full sm:w-auto px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-center transition-all ${
                        activeShop?.planRequestStatus === 'pending'
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : requestingId === p.id
                            ? 'bg-blue-300 text-white cursor-wait'
                            : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                      }`}
                    >
                      {requestingId === p.id ? 'Submitting...' : 'Request Plan'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
