import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { AppContext } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Clock, Phone, Mail, LogOut, CheckCircle, RefreshCw, UserCheck } from 'lucide-react';

export default function PendingApprovalView() {
  const { pendingShop, checkApprovalStatus, terminateSessionLogout } = useContext(AppContext);
  const toast = useToast();
  
  const [checking, setChecking] = useState(false);
  const [dynPhone, setDynPhone] = useState(pendingShop?.supportPhone || '+91 97732 72749');
  const [dynEmail, setDynEmail] = useState(pendingShop?.supportEmail || 'jainishdabgar2901@gmail.com');

  const runCheck = async () => {
    setChecking(true);
    try {
      const res = await checkApprovalStatus();
      if (res && res.approved) {
        toast.success("Congratulations! Your workspace has been approved! 🎉");
      } else {
        toast.info("Your workspace is still under review. You can call the administrator to expedite approval.");
        if (res && res.supportPhone) setDynPhone(res.supportPhone);
        if (res && res.supportEmail) setDynEmail(res.supportEmail);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not reach server. Please retry.");
    } finally {
      setChecking(false);
    }
  };

  // Run status check on mount to update phone/email if they were changed dynamically
  useEffect(() => {
    const initCheck = async () => {
      try {
        const res = await checkApprovalStatus();
        if (res) {
          if (res.supportPhone) setDynPhone(res.supportPhone);
          if (res.supportEmail) setDynEmail(res.supportEmail);
        }
      } catch {}
    };
    initCheck();
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden"
      >
        {/* Decorative background blur blobs */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-150 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-150 rounded-full blur-3xl -ml-16 -mb-16 opacity-50 pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-black tracking-wide shadow-sm mb-4">
            Galla<span className="text-blue-400">Mitra</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">Workspace Under Review</h2>
          <p className="text-slate-500 text-xs mt-1 font-medium">Your account requires administrator verification before logging in.</p>
        </div>

        {/* Request Details Block */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-semibold uppercase font-mono text-[9px] tracking-wider">Business Name</span>
            <span className="font-bold text-slate-800">{pendingShop?.businessName}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-semibold uppercase font-mono text-[9px] tracking-wider">Requested Plan</span>
            <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full font-bold uppercase tracking-wider text-[10px]">
              ⚡ {pendingShop?.plan}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-semibold uppercase font-mono text-[9px] tracking-wider">Request Status</span>
            <span className="inline-flex items-center gap-1 font-bold text-amber-600">
              <Clock size={12} className="animate-spin text-amber-500" style={{ animationDuration: '3s' }} /> Pending Approval
            </span>
          </div>
        </div>

        {/* Support/Admin Contact Card */}
        <div className="border border-slate-200/80 rounded-2xl p-5 bg-white space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <UserCheck size={16} className="text-blue-600" />
            <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">Super Admin Support Desk</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <Phone size={14} className="text-blue-500" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase font-mono">Telephone</p>
                <p className="font-bold text-slate-700">{dynPhone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <Mail size={14} className="text-blue-500" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase font-mono">Support Email</p>
                <p className="font-bold text-slate-700 truncate max-w-[200px]">{dynEmail}</p>
              </div>
            </div>
          </div>

          {/* Call Now Trigger Button */}
          <a
            href={`tel:${dynPhone.replace(/\s+/g, '')}`}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Phone size={14} /> Call Now
          </a>
        </div>

        {/* Buttons Action Grid */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={runCheck}
            disabled={checking}
            className="w-full bg-slate-905 hover:bg-slate-800 text-white border border-slate-900 hover:border-slate-800 font-bold py-2.5 rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: '#0f172a' }}
          >
            <RefreshCw size={13} className={checking ? "animate-spin" : ""} /> Check Status / Re-verify
          </button>
          
          <button
            onClick={terminateSessionLogout}
            className="w-full bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={13} /> Cancel & Return to Landing
          </button>
        </div>
      </motion.div>
    </div>
  );
}
