import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Globe, Download, Star } from 'lucide-react';

export default function PWAInstallationSection() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        // 1. Capture the browser's native install prompt event
        const handleBeforeInstallPrompt = (e) => {
            console.log('🎯 beforeinstallprompt event fired by browser!');
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if the app is running as a standalone PWA already
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
        // 2. Fallback optimization check if deferredPrompt is missing
        if (!deferredPrompt) {
            alert(
                "💡 App Installation Step:\n\n" +
                "1. Click the 'Install' icon on the right side of Chrome's address bar (Top right).\n" +
                "2. If you are on Mobile, tap the 3 dots menu and select 'Add to Home Screen'.\n\n" +
                "If you don't see it, GallaMitra might already be installed!"
            );
            return;
        }

        // 3. Trigger the native installation prompt window
        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;
        console.log(`👤 User installation choice: ${outcome}`);

        if (outcome === 'accepted') {
            setIsInstallable(false);
            setDeferredPrompt(null);
        }
    };

    return (
        <section className="py-16 md:py-24 px-6 sm:px-12 bg-[#F8FAFC] overflow-hidden relative font-sans text-left flex items-center justify-center w-full border-t border-b border-slate-200/60">
            {/* Decorative Background Blob Match Hero Layer (Royal Blue Depth Blur) */}
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-[#2563EB]/5 rounded-full blur-3xl pointer-events-none -mr-32 hidden lg:block" />

            <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                {/* Left Info Pane */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="inline-flex items-center gap-2 bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full font-mono shadow-sm">
                        <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-ping" />
                        📟 NEW: Application ACCESS
                    </div>

                    <h2 className="text-4xl sm:text-5xl font-black text-[#0F172A] tracking-tight leading-none">
                        Manage Ledger Anywhere <br />
                        with our <span className="text-[#2563EB]">Native App</span>
                    </h2>

                    <p className="text-slate-500 text-sm sm:text-base font-semibold leading-relaxed max-w-xl opacity-90">
                        Don't let poor internet slow down your shop operations. Install our Web App on your Phone or Desktop to access your business ledgers and sync invoices seamlessly even on slow networks!
                    </p>

                    {/* Quick Metrics Icons Section */}
                    <div className="flex flex-wrap gap-8 pt-2">
                        <div className="flex items-center gap-3">
                            <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                                <Zap size={20} className="text-[#2563EB] fill-current" />
                            </div>
                            <div>
                                <h4 className="font-black text-[#0F172A] text-sm tracking-tight">Faster Speed</h4>
                                <p className="text-slate-400 text-xs font-bold font-mono mt-0.5">Loads instantly</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                                <Globe size={20} className="text-[#2563EB]" />
                            </div>
                            <div>
                                <h4 className="font-black text-[#0F172A] text-sm tracking-tight">Stay Updated</h4>
                                <p className="text-slate-400 text-xs font-bold font-mono mt-0.5">Internet is required</p>
                            </div>
                        </div>
                    </div>

                    {/* Instructions Sheet Block */}
                    <div className="bg-white border border-slate-200/80 p-6 rounded-2xl space-y-3 shadow-2xs max-w-xl">
                        <h5 className="font-black text-[#0F172A] text-sm flex items-center gap-2">
                            <span className="w-5 h-5 bg-[#2563EB]/10 text-[#2563EB] rounded-full flex items-center justify-center font-bold text-xs font-mono">i</span>
                            How to Install:
                        </h5>
                        <ul className="space-y-2.5 text-xs text-slate-500 font-semibold list-none pl-1 leading-relaxed">
                            <li className="flex items-start gap-1.5">
                                <span className="text-slate-400">•</span>
                                <span><strong className="text-slate-800">On Desktop:</strong> Look for the <strong className="text-[#0F172A]">"Install" icon</strong> on the right side of your Chrome address bar.</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                                <span className="text-slate-400">•</span>
                                <span><strong className="text-slate-800">On Mobile:</strong> Tap the browser settings menu and select <strong className="text-[#0F172A]">"Add to Home Screen"</strong>.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Right Glassmorphic Promotion Display Box (Matched with image_203cf5.png Glow Dynamics) */}
                <div className="lg:col-span-5 flex justify-center items-center w-full relative">
                    {/* Royal Blue Premium Aura Mask */}
                    <div className="absolute w-72 h-80 bg-[#2563EB]/10 rounded-full blur-3xl -z-10 opacity-70 pointer-events-none" />

                    <motion.div
                        whileHover={{ y: -5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="w-full max-w-[325px] bg-white border border-slate-200/80 rounded-[32px] p-8 text-center shadow-xl relative"
                        style={{ boxShadow: '0 25px 50px -12px rgba(37,99,235,0.08)' }}
                    >
                        <div className="w-24 h-24 bg-white border border-slate-100 rounded-3xl flex items-center justify-center mx-auto shadow-sm mb-5 overflow-hidden group">
                            <img
                                src="/favicon.png"
                                alt="GallaMitra Logo"
                                className="w-16 h-16 object-contain"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentNode.innerHTML = '<div class="text-3xl font-black text-[#2563EB] font-mono">₹</div>';
                                }}
                            />
                        </div>

                        <h3 className="text-lg font-black text-[#0F172A] tracking-tight">GallaMitra App</h3>
                        <p className="text-xs text-slate-400 font-bold font-mono mt-0.5 opacity-80">Your pocket shop ledger</p>

                        <div className="flex items-center justify-center gap-1 my-4">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={14} className="text-amber-400 fill-current" />
                            ))}
                        </div>

                        <div className="w-full border-t border-dashed border-slate-100 my-5" />

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handlePWAInstall}
                            className="w-full py-4 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-black text-xs rounded-2xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer tracking-wide"
                        >
                            <Download size={14} className={isInstallable ? "animate-bounce" : ""} />
                            {isInstallable ? "Get App Now" : "Install App"}
                        </motion.button>
                    </motion.div>
                </div>

            </div>
        </section>
    );
}