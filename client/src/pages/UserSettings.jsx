import React, { useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { AppContext } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { translations } from '../utils/translations.js';
import { 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Star, 
  Zap, 
  Crown, 
  Globe, 
  Building2, 
  User, 
  Mail, 
  Fingerprint, 
  Sparkles,
  Check
} from 'lucide-react';

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
    if (id === 'starter') return 'text-emerald-600 bg-emerald-50 border-emerald-250';
    if (id === 'growth') return 'text-blue-600 bg-blue-50 border-blue-250';
    return 'text-purple-600 bg-purple-50 border-purple-250';
  };

  const getPlanGradient = (id) => {
    if (id === 'starter') return 'from-emerald-500/10 to-teal-500/5 border-emerald-200/60 text-emerald-950';
    if (id === 'growth') return 'from-blue-500/10 to-cyan-500/5 border-blue-200/60 text-blue-950';
    return 'from-purple-500/10 to-pink-500/5 border-purple-200/60 text-purple-950';
  };

  const getPlanBadgeColor = (id) => {
    if (id === 'starter') return 'text-emerald-700 bg-emerald-100 border-emerald-200';
    if (id === 'growth') return 'text-blue-700 bg-blue-100 border-blue-200';
    return 'text-purple-700 bg-purple-100 border-purple-200';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-6xl mx-auto space-y-6 pb-12"
    >
      {/* Title Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">{t.userSettingsTitle}</h2>
          <p className="text-slate-500 text-xs mt-0.5 font-semibold">
            Manage language preferences, workspace metadata, and subscription service tiers.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-2xl self-start sm:self-center">
          <ShieldCheck size={14} className="text-blue-500" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 font-mono">
            Secure Admin Dashboard
          </span>
        </div>
      </div>

      {/* Main Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Profile & Localization */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card 1: Localization Settings */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <Globe size={16} className="text-slate-500" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                {t.selectLang}
              </h3>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Globe className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                  id="user-settings-lang"
                  value={activeLang}
                  onChange={handleLangChange}
                  className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                >
                  <option value="en">English (US)</option>
                  <option value="gu">ગુજરાતી (Gujarati)</option>
                  <option value="hi">हिंदी (Hindi)</option>
                </select>
                <div className="absolute right-3.5 top-4 pointer-events-none text-slate-500 font-mono text-[9px] font-bold">
                  ▼
                </div>
              </div>

              {/* Status Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-black text-slate-700 flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  Active Language: <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 font-black font-mono">{activeLang.toUpperCase()}</span>
                </p>
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                  Toggling language immediately updates translations across all dashboard items, lists, and ledger labels.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Workspace Details Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <Building2 size={16} className="text-slate-500" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Workspace Metadata
              </h3>
            </div>
            
            <div className="space-y-3.5">
              {[
                { label: 'Business Name', value: activeShop?.businessName, icon: Building2 },
                { label: 'Owner Name', value: activeShop?.ownerName, icon: User },
                { label: 'Registered Email', value: activeShop?.email, icon: Mail },
                { label: 'Workspace ID', value: activeShop?.id, icon: Fingerprint, isMono: true },
              ].map(row => {
                const Icon = row.icon;
                return (
                  <div 
                    key={row.label} 
                    className="flex flex-col gap-1.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/50 hover:border-slate-300 hover:bg-slate-100/30 transition-all group"
                  >
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Icon size={12} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                      {row.label}
                    </span>
                    <span className={`text-xs font-bold text-slate-800 ${row.isMono ? 'font-mono break-all text-slate-500' : ''}`}>
                      {row.value || '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Subscription & Upgrade Card */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Active Subscription Hero Banner */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Active Subscription</h3>
                <p className="text-slate-400 text-[11px] font-semibold mt-0.5">Your current service tier & billing lifecycle status</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getPlanBadgeColor(activeShop?.plan)}`}>
                {activeShop?.plan || 'starter'} Active
              </div>
            </div>

            {/* Plan Info Hero Banner */}
            <div className={`rounded-2xl border p-5 bg-gradient-to-br ${getPlanGradient(activeShop?.plan)} flex items-center justify-between gap-4 relative overflow-hidden`}>
              {/* Ambient Background Glow Effect inside the card */}
              <div className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full bg-current opacity-[0.03] blur-xl pointer-events-none" />

              <div className="flex items-center gap-4 relative z-10">
                <div className={`p-3.5 rounded-xl bg-white/90 shadow-xs border border-white flex items-center justify-center`}>
                  {React.createElement(getPlanIcon(activeShop?.plan), { 
                    size: 24, 
                    className: activeShop?.plan === 'starter' ? 'text-emerald-600' : activeShop?.plan === 'growth' ? 'text-blue-600' : 'text-purple-600' 
                  })}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-60">Current Plan Tier</p>
                  <h4 className="text-lg font-black tracking-tight uppercase mt-0.5">
                    {activeShop?.plan ? activeShop.plan : 'Starter'} Package
                  </h4>
                </div>
              </div>

              {/* Verified Account Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/60 border border-white/80 text-[9px] font-black uppercase tracking-wider shadow-xs">
                <Sparkles size={11} className="text-amber-500 animate-pulse" />
                Verified Workspace
              </div>
            </div>

            {/* Expiry & Request Status Metric Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-100 p-4 rounded-2xl bg-slate-50 flex items-center gap-3 hover:bg-slate-100/50 transition-colors">
                <Calendar size={18} className="text-blue-500 shrink-0" />
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Expiration Date</p>
                  <p className="text-xs font-black text-slate-800 mt-0.5">
                    {activeShop?.subscriptionExpiresAt 
                      ? new Date(activeShop.subscriptionExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) 
                      : 'Unlimited (Free)'}
                  </p>
                </div>
              </div>
              <div className="border border-slate-100 p-4 rounded-2xl bg-slate-50 flex items-center gap-3 hover:bg-slate-100/50 transition-colors">
                <Clock size={18} className="text-emerald-500 shrink-0" />
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Request Status</p>
                  <p className="text-xs font-black text-slate-800 uppercase mt-0.5">
                    {activeShop?.planRequestStatus === 'pending' ? 'Pending Review' : 'No Pending Requests'}
                  </p>
                </div>
              </div>
            </div>

            {/* Warning notification banner for pending requests */}
            {activeShop?.planRequestStatus === 'pending' && (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start"
              >
                <Clock size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-black text-amber-800">Plan Change Pending Approval</p>
                  <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed font-semibold">
                    Your request to change plan to <strong className="uppercase">"{activeShop.requestedPlan}"</strong> is currently pending Super Admin review. You will receive an email once the request has been approved.
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Card 2: Upgrade Paths Packages Grid */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Available Subscription Packages
              </h3>
              <p className="text-slate-400 text-[11px] font-semibold mt-0.5">
                Choose a plan and request workspace feature expansions
              </p>
            </div>

            <div className="space-y-4">
              {plans.map((p) => {
                const PlanIcon = getPlanIcon(p.id);
                const isCurrent = p.id === activeShop?.plan;
                const isPendingThis = activeShop?.planRequestStatus === 'pending' && activeShop?.requestedPlan === p.id;
                
                const priceNum = parseFloat(p.price);
                const features = Array.isArray(p.features) ? p.features : (typeof p.features === 'string' ? JSON.parse(p.features) : []);

                return (
                  <div 
                    key={p.id}
                    className={`border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all duration-300 relative overflow-hidden group ${
                      isCurrent 
                        ? 'border-blue-300 bg-blue-50/20' 
                        : isPendingThis
                          ? 'border-amber-300 bg-amber-50/20'
                          : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50/40 shadow-xs hover:shadow-sm'
                    }`}
                  >
                    {/* Ambient subtle color border strip */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all ${
                      isCurrent ? 'bg-blue-500' : isPendingThis ? 'bg-amber-500' : 'bg-transparent group-hover:bg-slate-355'
                    }`} />

                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${getPlanColor(p.id)}`}>
                        <PlanIcon size={18} />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <p className="text-sm font-black text-slate-900">{p.name}</p>
                          <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/50">
                            ₹{priceNum.toFixed(0)}/{p.billingCycle === 'free' ? 'free' : p.billingCycle === 'trial' ? 'trial' : p.billingCycle === 'monthly' ? 'mo' : p.billingCycle === '3_months' ? '3 mo' : p.billingCycle === '6_months' ? '6 mo' : p.billingCycle === 'yearly' ? 'yr' : p.billingCycle}
                          </span>
                        </div>
                        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                          {features.map((f, fidx) => (
                            <li key={fidx} className="text-[10px] font-semibold text-slate-500 flex items-center gap-1.5">
                              <span className="text-emerald-500 bg-emerald-50 rounded-full p-0.5 border border-emerald-100 flex items-center justify-center shrink-0">
                                <Check size={8} strokeWidth={3} />
                              </span>
                              <span className="truncate max-w-[140px]" title={f}>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center mt-3 md:mt-0">
                      {isCurrent ? (
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-100 border border-blue-200 px-4 py-2 rounded-xl block text-center w-full md:w-auto shadow-xs">
                          Active
                        </span>
                      ) : isPendingThis ? (
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200 px-4 py-2 rounded-xl block text-center w-full md:w-auto animate-pulse">
                          Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRequestPlan(p.id)}
                          disabled={activeShop?.planRequestStatus === 'pending' || requestingId === p.id}
                          className={`w-full md:w-auto px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-center transition-all ${
                            activeShop?.planRequestStatus === 'pending'
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                              : requestingId === p.id
                                ? 'bg-blue-300 text-white cursor-wait'
                                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-98'
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

        </div>

      </div>
    </motion.div>
  );
}

