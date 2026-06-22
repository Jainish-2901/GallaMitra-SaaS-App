import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Globe, 
  Download, 
  Star, 
  Smartphone, 
  Info, 
  X, 
  Plus, 
  Menu, 
  ChevronDown, 
  Scale, 
  Users, 
  FileText, 
  Briefcase 
} from 'lucide-react';

export default function PWAInstallationSection() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            console.log('🎯 beforeinstallprompt event fired by browser!');
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            setIsInstallable(false);
        }

        window.addEventListener('appinstalled', () => {
            setIsInstallable(false);
            setDeferredPrompt(null);
            console.log('⚡ GallaMitra application wrapper installed successfully.');
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handlePWAInstall = async () => {
        if (!deferredPrompt) {
            setShowToast(true);
            return;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstallable(false);
            setDeferredPrompt(null);
        }
    };

    return (
        <section className="py-20 md:py-28 px-6 sm:px-12 erp-grid-bg overflow-hidden relative font-sans text-left flex items-center justify-center w-full border-t border-b border-slate-200/60">
            {/* Glowing background circles */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-300/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-10 right-10 w-[300px] h-[300px] bg-emerald-200/10 rounded-full blur-[90px] pointer-events-none" />

            <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">

                {/* Left Info Pane matching design layout */}
                <div className="lg:col-span-6 space-y-6">
                    <div className="space-y-4">
                        <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                            Manage Ledger Anywhere
                        </h2>
                        <h3 className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight">
                            Sync transactions instantly, access offline
                        </h3>
                    </div>

                    <p className="text-slate-500 text-xs sm:text-sm font-semibold leading-relaxed max-w-xl">
                        Access your ledger records, invoices, and supplier details on the go, even when offline. A lightweight application experience that keeps your business moving with zero buffering delays or synchronization friction.
                    </p>

                    {/* Left side actions (Buttons side-by-side) */}
                    <div className="flex flex-wrap gap-4 pt-2">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handlePWAInstall}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                        >
                            <Download size={14} className={isInstallable ? "animate-bounce" : ""} />
                            Get App Now
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowToast(true)}
                            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-8 py-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                        >
                            <Info size={14} />
                            Install Guide
                        </motion.button>
                    </div>

                    {/* Quick Features List in smaller details */}
                    <div className="flex flex-wrap gap-6 pt-4 border-t border-slate-200/60 max-w-xl">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Fast Offline Access
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Automatic Sync
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> High-Contrast Lookup
                        </div>
                    </div>
                </div>

                {/* Right side smartphones mockup matching the image */}
                <div className="lg:col-span-6 relative flex items-center justify-center min-h-[380px] md:min-h-[440px] select-none">
                    
                    {/* Glowing blue back aura */}
                    <div className="absolute w-64 h-64 bg-blue-500/10 rounded-full blur-3xl opacity-60 pointer-events-none" />

                    <div className="relative w-full max-w-[380px] h-[340px] flex items-center justify-center">

                        {/* Left tilted phone (Showing Sidebar from screenshot 2) */}
                        <motion.div
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute left-2 md:left-4 top-10 w-[135px] md:w-[150px] h-[230px] md:h-[260px] bg-slate-950 border-[5px] border-slate-900 rounded-[28px] shadow-xl z-10 overflow-hidden flex flex-col transform rotate-[-8deg] hover:rotate-[-4deg] transition-transform duration-300 relative"
                        >
                            {/* Notch */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-2.5 bg-slate-900 rounded-b-lg z-50" />
                            
                            {/* Dark overlay behind sidebar */}
                            <div className="bg-black/25 absolute inset-0 z-10 rounded-[24px]" />

                            {/* Sidebar Container */}
                            <div className="bg-white w-[84%] h-full absolute left-0 top-0 z-20 rounded-l-[24px] flex flex-col justify-between py-2.5 px-2 border-r border-slate-200">
                                
                                <div className="space-y-2 flex-1 flex flex-col">
                                    {/* Sidebar Header */}
                                    <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5 mt-2">
                                        <div className="w-5 h-5 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-[8px] font-black text-blue-600 font-mono shrink-0">
                                            GM
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-[7px] font-black text-slate-800 truncate leading-none">Jitendrakumar Manharlal C...</p>
                                            <span className="text-[4.5px] font-black bg-blue-50 border border-blue-200/60 text-blue-600 rounded-sm px-1.5 py-0.2 mt-0.5 inline-block uppercase font-mono scale-[0.9] origin-left">
                                                ⚡ PROFESSIONAL
                                            </span>
                                        </div>
                                    </div>

                                    {/* Date display & Select Language Dropdown */}
                                    <div className="space-y-1.5">
                                        <div className="bg-slate-50 border border-slate-100 rounded p-1 text-[5px] font-bold text-slate-500 flex items-center gap-1">
                                            📅 Date: <span className="text-slate-800">Mon, Jun 22</span>
                                        </div>
                                        <div>
                                            <p className="text-[4.5px] font-black text-slate-400 uppercase font-mono tracking-widest">Select Language</p>
                                            <div className="w-full border border-slate-200 rounded px-1 py-0.5 text-[5px] text-slate-700 font-bold bg-white flex items-center justify-between mt-0.5">
                                                English <ChevronDown size={6} className="text-slate-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Menu Items */}
                                    <div className="space-y-1 flex-1 mt-1 text-slate-600 font-semibold overflow-y-hidden">
                                        {[
                                            { icon: Briefcase, label: 'Dashboard Overview' },
                                            { icon: Users, label: 'Customer Management' },
                                            { icon: Users, label: 'Supplier Registry' },
                                            { icon: FileText, label: 'Products & Services' },
                                            { icon: FileText, label: 'Sale Ledger Reporting' }
                                        ].map((m, i) => {
                                            const MIcon = m.icon;
                                            return (
                                                <div key={i} className="flex items-center gap-1.5 py-0.5 px-1 hover:bg-slate-50 rounded transition-all">
                                                    <MIcon size={7} className="text-slate-400 shrink-0" />
                                                    <span className="text-[5.5px] truncate">{m.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Sidebar bottom Action button */}
                                <div className="mt-auto border-t border-slate-100 pt-1.5 space-y-1">
                                    <button 
                                        onClick={handlePWAInstall}
                                        className="w-full py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[5px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-[0.98]"
                                    >
                                        📲 Download App
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Right slightly tilted phone overlapping the left one (Showing Dashboard from screenshot 1) */}
                        <motion.div
                            animate={{ y: [0, 6, 0] }}
                            transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                            className="absolute left-[125px] md:left-[155px] top-2 w-[150px] md:w-[165px] h-[260px] md:h-[295px] bg-slate-950 border-[5px] border-slate-900 rounded-[32px] shadow-2xl z-20 overflow-hidden flex flex-col transform rotate-[2deg] hover:rotate-[0deg] transition-transform duration-300"
                        >
                            {/* Notch */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-900 rounded-b-lg z-50" />
                            
                            {/* Screen */}
                            <div className="w-full h-full bg-slate-50/70 rounded-[28px] overflow-hidden flex flex-col justify-between p-2 pt-3.5 relative">
                                
                                {/* Header */}
                                <div className="border-b border-slate-200/50 pb-1 mt-1 flex justify-between items-center px-1 font-sans">
                                    <div className="flex items-center gap-1">
                                        <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-[7px] font-black text-white font-mono shrink-0">GM</div>
                                        <div className="text-left leading-none">
                                            <p className="text-[5.5px] font-black text-slate-800">Jitendrakum...</p>
                                            <p className="text-[4.5px] text-blue-500 font-bold font-mono">Dashboard Overview</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-3.5 h-3.5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[8px] font-bold">+</div>
                                        <div className="w-3.5 h-3.5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 text-[8px]"><Menu size={6} /></div>
                                    </div>
                                </div>

                                {/* Content area */}
                                <div className="space-y-1.5 flex-1 mt-2.5 overflow-hidden flex flex-col text-left">
                                    
                                    {/* Welcome Card */}
                                    <div className="bg-white border border-slate-200/50 p-1.5 rounded-xl shadow-3xs leading-tight">
                                        <h4 className="text-[6.5px] font-black text-slate-800">Welcome back, Jainish Dabgar! 👋</h4>
                                        <p className="text-[4.5px] text-slate-400 mt-0.5 leading-none">System status: active and synced with 0 Buffering Delay.</p>
                                    </div>

                                    {/* Green Card (TOTAL TO TAKE) */}
                                    <div className="bg-emerald-50/50 border border-emerald-100 p-1.5 rounded-xl flex items-center justify-between shadow-3xs">
                                        <div className="leading-tight">
                                            <p className="text-[4.5px] font-black text-emerald-600 uppercase font-mono">TOTAL TO TAKE (લેવાના પૈસા)</p>
                                            <p className="text-[10px] font-black text-emerald-700 font-mono mt-0.5">₹1320.00</p>
                                            <p className="text-[4px] text-slate-400 font-semibold mt-0.5">Receivables from 1 customer profiles</p>
                                        </div>
                                        <div className="w-4 h-4 rounded bg-emerald-100 flex items-center justify-center text-emerald-600 text-[8px] font-bold">↘</div>
                                    </div>

                                    {/* Red Card (TOTAL TO GIVE) */}
                                    <div className="bg-rose-50/50 border border-rose-100 p-1.5 rounded-xl flex items-center justify-between shadow-3xs">
                                        <div className="leading-tight">
                                            <p className="text-[4.5px] font-black text-rose-600 uppercase font-mono">TOTAL TO GIVE (આપવાના પૈસા)</p>
                                            <p className="text-[10px] font-black text-rose-700 font-mono mt-0.5">₹0.00</p>
                                            <p className="text-[4px] text-slate-400 font-semibold mt-0.5">Payables to 0 suppliers</p>
                                        </div>
                                        <div className="w-4 h-4 rounded bg-rose-100 flex items-center justify-center text-rose-600 text-[8px] font-bold">↗</div>
                                    </div>

                                    {/* Blue Card (NET CASH FLOW) */}
                                    <div className="bg-blue-50/50 border border-blue-100 p-1.5 rounded-xl flex items-center justify-between shadow-3xs">
                                        <div className="leading-tight">
                                            <p className="text-[4.5px] font-black text-blue-600 uppercase font-mono">NET CASH FLOW</p>
                                            <p className="text-[10px] font-black text-emerald-700 font-mono mt-0.5">₹1320.00</p>
                                            <p className="text-[4px] text-slate-400 font-semibold mt-0.5">Net positive credit books</p>
                                        </div>
                                        <div className="w-4 h-4 rounded bg-slate-100 flex items-center justify-center text-slate-600"><Scale size={8} /></div>
                                    </div>

                                    {/* Quick operations */}
                                    <div className="flex gap-1 mt-0.5 font-sans scale-[0.95] origin-left">
                                        <div className="flex-1 py-1 rounded bg-blue-50 border border-blue-100 text-[4.5px] font-black text-blue-600 flex items-center justify-center gap-0.5">
                                            ➕ NEW INVOICE
                                        </div>
                                        <div className="flex-1 py-1 rounded bg-emerald-50 border border-emerald-100 text-[4.5px] font-black text-emerald-600 flex items-center justify-center gap-0.5">
                                            💵 COLLECT CASH
                                        </div>
                                    </div>

                                </div>

                                {/* Bottom Nav bar matching Screenshot 1 */}
                                <div className="mt-auto border-t border-slate-150 py-1 bg-white flex justify-around items-center -mx-2.5 -mb-2.5 rounded-b-[28px] text-[4.5px] font-bold text-slate-400">
                                    <div className="text-blue-600 flex flex-col items-center gap-0.2 text-[4px]"><div className="w-1.5 h-1.5 bg-blue-600 rounded-sm" />Home</div>
                                    <div className="flex flex-col items-center gap-0.2 text-[4px]">Customers</div>
                                    <div className="flex flex-col items-center gap-0.2 text-[4px]">Invoice</div>
                                    <div className="flex flex-col items-center gap-0.2 text-[4px]">Suppliers</div>
                                    <div className="flex flex-col items-center gap-0.2 text-[4px]">More</div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Floating Green Rupee Coin on the far right */}
                        <motion.div
                            animate={{ y: [0, -8, 0], rotate: [0, -15, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                            className="absolute right-0 top-1/2 w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full border-b-4 border-emerald-700 shadow-lg z-30 flex items-center justify-center text-white text-xs font-bold font-mono"
                        >
                            ₹
                        </motion.div>

                        {/* Floating Status Check badge on the left of left phone */}
                        <motion.div
                            animate={{ y: [0, 8, 0] }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                            className="absolute left-[-10px] top-1/2 bg-white/95 border border-slate-200/80 px-2 py-1.5 rounded-xl shadow-lg z-30 flex items-center gap-1.5 hover:scale-105 transition-transform"
                        >
                            <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[8px] font-bold">✓</span>
                            <span className="text-[8px] font-black text-slate-700 leading-none">Syncing</span>
                        </motion.div>

                    </div>
                </div>

            </div>

            {/* Custom Toast Installation Guide */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                        className="fixed bottom-6 right-6 z-50 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-3xl shadow-2xl p-5"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="text-sm font-black text-slate-900 tracking-tight">App Installation Guide</h4>
                                <p className="text-[9px] font-black text-slate-400 uppercase font-mono mt-0.5 tracking-wider">GallaMitra Setup</p>
                            </div>
                            <button
                                onClick={() => setShowToast(false)}
                                className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        </div>
                        
                        <div className="space-y-3.5 text-xs">
                            <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex items-start gap-2.5">
                                <Smartphone size={16} className="text-blue-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-black text-slate-800 text-[11px]">Mobile Devices</p>
                                    <p className="text-slate-500 text-[10px] leading-relaxed mt-0.5">
                                        Tap the browser's menu button (3 dots on Chrome/Android, Share icon on Safari/iOS) and select <strong className="text-slate-700">"Add to Home Screen"</strong>.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex items-start gap-2.5">
                                <Download size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-black text-slate-800 text-[11px]">Desktop Chrome / Edge</p>
                                    <p className="text-slate-500 text-[10px] leading-relaxed mt-0.5">
                                        Look for the <strong className="text-slate-700">Install icon</strong> (computer screen with a down arrow) in the right side of the address bar.
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <button
                            onClick={handlePWAInstall}
                            className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer text-center"
                        >
                            Trigger Install Prompt
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}