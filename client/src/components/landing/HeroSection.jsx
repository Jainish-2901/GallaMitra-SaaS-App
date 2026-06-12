import React from 'react';
import { motion } from 'framer-motion';
import { Star, UserPlus, LogIn, Laptop, Smartphone } from 'lucide-react';

export default function HeroSection({ onOpenRegister, onOpenLogin }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 py-20 md:py-32 px-6 text-left">
      {/* Premium Ambient Light Flares */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

        {/* Left Typography Column with staggered animations */}
        <div className="lg:col-span-6 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider font-mono"
          >
            <Star size={12} fill="currentColor" /> Multi-Tenant SaaS Workspace
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-[52px] font-black text-slate-900 leading-tight tracking-tight"
          >
            Don't just audit, build a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Smart Platform
            </span>{' '}
            for your shop!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-slate-500 font-medium text-sm md:text-base leading-relaxed max-w-xl"
          >
            Experience instant loading operations with absolute 0 Buffering Delay metrics. Manage multi-firm transactions, digital invoicing parameters, and stream automated ledger history updates flawlessly.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 pt-2"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              id="hero-register-btn"
              onClick={onOpenRegister}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
            >
              <UserPlus size={15} /> Create Free Workspace
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              id="hero-login-btn"
              onClick={onOpenLogin}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-8 py-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              <LogIn size={15} /> Sign In to Workspace
            </motion.button>
          </motion.div>

          {/* Live System Statistics Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex items-center gap-8 pt-6 border-t border-slate-200"
          >
            {[
              { label: 'Active Firms Connected', value: '500+' },
              { label: 'Transactions Daily', value: '10K+' },
              { label: 'System Live Uptime', value: '99.9%' },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-xl font-black text-slate-900 font-mono tracking-tight">{stat.value}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 font-mono">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right Column: Premium Interacting Devices Canvas (Framer Floating Animation) */}
        <div className="lg:col-span-6 relative flex items-center justify-center min-h-[380px] md:min-h-[460px]">
          {/* Main Desktop Interface Showcase */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="w-full max-w-[460px] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl relative z-10"
          >
            <div className="bg-slate-50 px-3 py-2.5 flex items-center gap-1.5 border-b border-slate-200">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <span className="text-[9px] font-mono font-bold text-slate-400 ml-2 select-none flex items-center gap-1">
                <Laptop size={10} /> gallamitra.in/workspace-root
              </span>
            </div>
            {/* Mock Dashboard Layout */}
            <div className="p-5 bg-white h-64 flex flex-col justify-between">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <div className="w-28 h-4 bg-slate-100 rounded-md animate-pulse" />
                <div className="w-16 h-4 bg-blue-50 border border-blue-100 rounded-md" />
              </div>
              <div className="grid grid-cols-3 gap-3 my-auto">
                <div className="h-16 bg-emerald-50/50 border border-emerald-100 rounded-xl p-2 flex flex-col justify-between"><div className="w-8 h-2 bg-emerald-200 rounded" /><div className="w-16 h-4 bg-emerald-500 rounded" /></div>
                <div className="h-16 bg-rose-50/50 border border-rose-100 rounded-xl p-2 flex flex-col justify-between"><div className="w-8 h-2 bg-rose-200 rounded" /><div className="w-16 h-4 bg-rose-500 rounded" /></div>
                <div className="h-16 bg-blue-50/50 border border-blue-100 rounded-xl p-2 flex flex-col justify-between"><div className="w-8 h-2 bg-blue-200 rounded" /><div className="w-16 h-4 bg-blue-500 rounded" /></div>
              </div>
              <div className="w-full h-16 bg-slate-50 border border-slate-150 rounded-xl p-3 space-y-2">
                <div className="w-full h-2 bg-slate-200 rounded" />
                <div className="w-3/4 h-2 bg-slate-200 rounded" />
              </div>
            </div>
          </motion.div>

          {/* Mobile Overlay Interface Showcase (Banking App Action Hub Flow) */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="w-36 h-76 bg-slate-900 border-4 border-slate-800 rounded-3xl overflow-hidden shadow-2xl absolute -bottom-4 right-2 md:right-8 z-20 p-1.5 flex flex-col justify-between"
          >
            <div className="w-full h-full bg-white rounded-2xl overflow-hidden flex flex-col justify-between p-2">
              <div className="w-full flex justify-between items-center border-b border-slate-100 pb-2 mt-1">
                <div className="w-12 h-2 bg-slate-200 rounded" />
                <Smartphone size={10} className="text-slate-400" />
              </div>
              <div className="grid grid-cols-2 gap-1.5 my-auto">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-11 bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center justify-center gap-1 shadow-2xs">
                    <div className="w-4 h-4 bg-blue-500/10 rounded-md" />
                    <div className="w-7 h-1 bg-slate-300 rounded" />
                  </div>
                ))}
              </div>
              <div className="w-full h-7 bg-slate-900 rounded-lg flex items-center justify-center"><div className="w-10 h-1 bg-white/20 rounded" /></div>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}