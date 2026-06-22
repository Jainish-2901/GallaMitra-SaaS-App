import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, UserPlus, LogIn, Laptop, Smartphone } from 'lucide-react';

export default function HeroSection({ onOpenRegister, onOpenLogin }) {
  const [stats, setStats] = useState({
    totalFirms: '500+',
    totalTransactions: '10K+',
    uptime: '99.9%'
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';
        const res = await fetch(`${backendUrl}/shops/public-stats`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setStats({
              totalFirms: data.totalFirms > 0 ? `${data.totalFirms}` : '0',
              totalTransactions: data.totalTransactions > 0 ? `${data.totalTransactions}` : '0',
              uptime: data.uptime || '99.9%'
            });
          }
        }
      } catch (err) {
        console.error('🚨 Error fetching live statistics:', err);
      }
    };
    fetchStats();
  }, []);
  return (
    <section className="relative overflow-hidden erp-grid-bg py-20 md:py-32 px-6 text-left">
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
              { label: 'Active Firms Connected', value: stats.totalFirms },
              { label: 'Total Live Transactions', value: stats.totalTransactions },
              { label: 'System Live Uptime', value: stats.uptime },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-xl font-black text-slate-900 font-mono tracking-tight">{stat.value}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 font-mono">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right Column: Premium Interacting Devices Canvas (Framer Floating Animation) */}
        <div className="lg:col-span-6 relative flex items-center justify-center min-h-[460px] md:min-h-[520px] select-none">
          
          {/* Glowing blobs inside container to match image pastel tone */}
          <div className="absolute top-10 right-10 w-[240px] h-[240px] bg-blue-300/30 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-[200px] h-[200px] bg-amber-200/20 rounded-full blur-[70px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] bg-indigo-300/20 rounded-full blur-[90px] pointer-events-none" />

          <div className="relative w-full max-w-[480px] h-[400px] md:h-[440px] flex items-center justify-center">
            
            {/* 1. TABLET MOCKUP (Background Device) */}
            <motion.div
              initial={{ opacity: 0, x: -30, y: 10, rotate: -2 }}
              animate={{ opacity: 1, x: 0, y: 0, rotate: -2 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute left-2 md:left-6 top-8 w-[320px] md:w-[385px] h-[220px] md:h-[265px] bg-white border border-slate-200/80 rounded-[24px] shadow-2xl z-10 overflow-hidden flex flex-col hover:shadow-blue-500/10 transition-shadow duration-300"
            >
              {/* Tablet Header Bar */}
              <div className="bg-slate-50/80 px-4 py-2.5 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                  <span className="text-[8px] font-mono font-bold text-slate-400 ml-2">
                    gallamitra.in/dashboard
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  </div>
                </div>
              </div>

              {/* Tablet Content Area */}
              <div className="p-4 flex-1 flex flex-col justify-between bg-white relative">
                {/* Metrics Pill Row */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">Store Revenue</p>
                    <p className="text-sm font-black text-slate-800 font-mono mt-0.5">₹1,84,320.00</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-500" /> +12.4%
                    </span>
                  </div>
                </div>

                {/* SVG Area Chart (Smooth Curve resembling the reference image) */}
                <div className="flex-1 w-full relative min-h-[90px] mt-2">
                  <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    
                    {/* Gridlines */}
                    <line x1="0" y1="20" x2="300" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="0" y1="50" x2="300" y2="50" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="0" y1="80" x2="300" y2="80" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

                    {/* Gradient Area Fill */}
                    <path
                      d="M 0 90 Q 30 75, 60 80 T 120 45 T 180 55 T 240 25 T 300 20 L 300 100 L 0 100 Z"
                      fill="url(#chartGradient)"
                    />
                    
                    {/* Line Stroke */}
                    <path
                      d="M 0 90 Q 30 75, 60 80 T 120 45 T 180 55 T 240 25 T 300 20"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Chart Dots */}
                    <circle cx="120" cy="45" r="3.5" fill="#10B981" stroke="white" strokeWidth="1.5" />
                    <circle cx="240" cy="25" r="3.5" fill="#10B981" stroke="white" strokeWidth="1.5" />
                  </svg>
                  
                  {/* Floating tooltip mock inside chart */}
                  <div className="absolute top-[20px] left-[105px] bg-slate-900 text-white text-[7px] font-bold px-1.5 py-0.5 rounded shadow-md pointer-events-none">
                    Sales Peak
                  </div>
                </div>

                {/* Sub features bar */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2">
                  <div className="flex items-center gap-4">
                    <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> GST Billing
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Auto-Ledger
                    </span>
                  </div>
                  <span className="text-[8px] font-mono font-bold text-slate-500">Updated: Just Now</span>
                </div>
              </div>
            </motion.div>

            {/* 2. SMARTPHONE MOCKUP (Foreground Device) */}
            <motion.div
              initial={{ opacity: 0, x: 30, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className="absolute right-2 md:right-8 bottom-4 w-[160px] md:w-[176px] h-[300px] md:h-[330px] bg-slate-950 border-[6px] border-slate-900 rounded-[36px] shadow-2xl z-30 overflow-hidden flex flex-col hover:scale-[1.02] transition-transform duration-300"
            >
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-18 h-3.5 bg-slate-900 rounded-b-xl z-50 flex items-center justify-center">
                <div className="w-8 h-1 bg-slate-800 rounded-full" />
              </div>

              {/* Mobile Viewport Screen */}
              <div className="w-full h-full bg-slate-50 rounded-[30px] overflow-hidden flex flex-col justify-between p-2.5 pt-4 relative">
                
                {/* Top Status Bar mock */}
                <div className="flex justify-between items-center px-1 text-[7px] font-black text-slate-400 font-mono mt-0.5">
                  <span>09:41</span>
                  <div className="flex items-center gap-0.5">
                    <Smartphone size={7} className="text-slate-400" />
                    <span>5G</span>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 mt-2.5 space-y-2 flex flex-col">
                  {/* Quick stats with bar graph */}
                  <div className="bg-white p-2 rounded-xl border border-slate-200/50 shadow-2xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-wide font-mono">Today's Transactions</p>
                        <p className="text-[10px] font-black text-slate-800 font-mono mt-0.5">₹14,280.00</p>
                      </div>
                      <span className="text-[6px] font-bold text-emerald-500 bg-emerald-50 px-1 py-0.2 rounded">+4.8%</span>
                    </div>

                    {/* Small vertical bar chart */}
                    <div className="h-9 flex items-end gap-1.5 justify-center pt-1.5">
                      {[30, 45, 60, 40, 75, 90, 85].map((val, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                          <div
                            className={`w-full rounded-t-xs transition-all ${
                              idx === 5 ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                            style={{ height: `${val}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transaction log items */}
                  <div className="flex-1 flex flex-col justify-center space-y-1.5">
                    <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest font-mono px-1">Recent Activity</p>
                    
                    {/* Item 1 */}
                    <div className="bg-white p-1.5 rounded-lg border border-slate-100 flex items-center justify-between shadow-3xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center">
                          <span className="text-[6px] font-bold text-blue-600 font-mono">IN</span>
                        </div>
                        <div>
                          <p className="text-[7px] font-black text-slate-700 leading-none">Rajesh Kumar</p>
                          <p className="text-[5px] font-bold text-slate-400 mt-0.5 font-mono">Invoice #1024</p>
                        </div>
                      </div>
                      <span className="text-[7px] font-black text-slate-800 font-mono">+₹4,500</span>
                    </div>

                    {/* Item 2 */}
                    <div className="bg-white p-1.5 rounded-lg border border-slate-100 flex items-center justify-between shadow-3xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-indigo-50 flex items-center justify-center">
                          <span className="text-[6px] font-bold text-indigo-600 font-mono">OUT</span>
                        </div>
                        <div>
                          <p className="text-[7px] font-black text-slate-700 leading-none">Anil Distributors</p>
                          <p className="text-[5px] font-bold text-slate-400 mt-0.5 font-mono">Purchase Bill #42</p>
                        </div>
                      </div>
                      <span className="text-[7px] font-black text-rose-600 font-mono">-₹2,800</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Green Call-to-action button to match image */}
                <div className="mt-auto pt-1">
                  <button className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[8px] font-black shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer text-center">
                    Deploy Live
                  </button>
                </div>
              </div>
            </motion.div>

            {/* 3. FLOATING BADGES & WIDGETS (with parallax floating motion) */}
            
            {/* Top Left App Badge */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-3 left-[30px] md:left-[50px] bg-white border border-slate-200/80 p-2 rounded-xl shadow-lg z-20 flex items-center justify-center"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
                <Star size={12} fill="currentColor" />
              </div>
            </motion.div>

            {/* Top Center Floating Bar Chart (Representing analytics widgets next to app badge) */}
            <motion.div
              animate={{ y: [0, 8, 0], x: [0, 3, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
              className="absolute -top-6 left-[180px] md:left-[210px] bg-white border border-slate-100 p-2.5 rounded-2xl shadow-xl z-20 flex items-end gap-1.5 h-14"
            >
              <div className="w-2.5 bg-blue-100 rounded-t-xs h-4" />
              <div className="w-2.5 bg-blue-300 rounded-t-xs h-7" />
              <div className="w-2.5 bg-blue-500 rounded-t-xs h-10" />
              <div className="w-2.5 bg-blue-600 rounded-t-xs h-6" />
            </motion.div>

            {/* Left Floating Badge 1 (Store Active) */}
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute left-[-24px] md:left-[-15px] top-[75px] bg-white/95 border border-slate-200/80 p-2 rounded-xl shadow-lg z-25 flex items-center gap-2 hover:scale-105 transition-transform"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 flex-shrink-0">
                ✓
              </div>
              <div className="text-left">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider font-mono leading-none">Auto sync</p>
                <p className="text-[9px] font-black text-slate-800 leading-tight">Live Terminal</p>
              </div>
            </motion.div>

            {/* Left Floating Badge 2 (Document Invoices) */}
            <motion.div
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-[-35px] md:left-[-25px] top-[140px] bg-white/95 border border-slate-200/80 p-2 rounded-xl shadow-lg z-25 flex items-center gap-2 hover:scale-105 transition-transform"
            >
              <div className="w-5 h-5 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 flex-shrink-0">
                📄
              </div>
              <div className="text-left">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider font-mono leading-none">Invoices</p>
                <p className="text-[9px] font-black text-slate-800 leading-tight">Digital Sync</p>
              </div>
            </motion.div>

            {/* Left Floating Badge 3 (Ledger Sync) */}
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              className="absolute left-[-20px] md:left-[-10px] top-[205px] bg-white/95 border border-slate-200/80 p-2 rounded-xl shadow-lg z-25 flex items-center gap-2 hover:scale-105 transition-transform"
            >
              <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 flex-shrink-0">
                📊
              </div>
              <div className="text-left">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider font-mono leading-none">Accounting</p>
                <p className="text-[9px] font-black text-slate-800 leading-tight">Ledger Sync</p>
              </div>
            </motion.div>

            {/* Right Overlapping Earnings Widget (Earnings 4,640.00) */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
              className="absolute right-[115px] md:right-[145px] top-[95px] md:top-[115px] bg-white border border-slate-200/80 p-2.5 rounded-xl shadow-xl z-35 flex items-center gap-2.5 w-[115px] md:w-[130px]"
            >
              <div className="text-left flex-1">
                <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest font-mono">Earnings</p>
                <p className="text-[11px] font-black text-slate-800 font-mono mt-0.5">₹4,640.00</p>
              </div>
              {/* Mini positive spark line chart */}
              <div className="w-8 h-4 flex-shrink-0">
                <svg className="w-full h-full" viewBox="0 0 30 15">
                  <path
                    d="M 0 12 L 8 10 L 15 5 L 22 7 L 30 1"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </motion.div>

            {/* Floating 3D Green Coin on the right */}
            <motion.div
              animate={{ y: [0, 9, 0], rotate: [0, 15, 0] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute right-[-15px] md:right-[-5px] top-[190px] w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full border-b-4 border-emerald-700 shadow-lg z-35 flex items-center justify-center text-white text-xs font-bold font-mono"
            >
              ₹
            </motion.div>

            {/* Floating 3D Orange Shapes on the left */}
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [0, -10, 0] }}
              transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              className="absolute left-[-32px] top-[110px] flex flex-col gap-0.5 z-10"
            >
              <div className="w-3.5 h-3.5 bg-amber-500 rounded-xs transform rotate-12 shadow-md" />
              <div className="w-2.5 h-2.5 bg-amber-600 rounded-xs transform -rotate-12 translate-x-1.5 shadow-sm" />
            </motion.div>

          </div>
        </div>

      </div>
    </section>
  );
}