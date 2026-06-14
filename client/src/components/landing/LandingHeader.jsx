import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, UserPlus, LogIn, Download, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingHeader({ onOpenLogin, onOpenRegister }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPWAButton, setShowPWAButton] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // 1. Catch native PWA install hooks
  useEffect(() => {
    const handleInstallPrompt = (e) => {
      setDeferredPrompt(e);
      setShowPWAButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  // 2. Dispatch client history vectors manually
  const navigateTo = (page) => {
    setMobileMenuOpen(false); // Close mobile drawer on navigation
    if (page === 'landing') {
      navigate('/');
    } else {
      navigate(`/${page}`);
    }
  };

  const executePWAInstallation = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('⚡ GallaMitra binary shell registered on local device safely.');
    }
    setDeferredPrompt(null);
    setShowPWAButton(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-4 flex justify-between items-center shadow-xs">

        {/* Brand Group - Home Page Redirect View */}
        <div
          onClick={() => navigateTo('landing')}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none"
        >
          <div className="bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
            <img src="/logo.png" alt="GallaMitra Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 leading-none">GallaMitra</h1>
            <p className="text-[8px] sm:text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1 font-mono">SaaS Ledger Platform</p>
          </div>
        </div>

        {/* Desktop Corporate Nav Links */}
        <nav className="hidden lg:flex items-center gap-8 text-xs font-bold text-slate-600">
          <a href="#features" onClick={() => navigateTo('landing')} className="hover:text-blue-600 transition-colors tracking-wide relative group py-1">
            Features
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full" />
          </a>
          <a href="#about" onClick={() => navigateTo('landing')} className="hover:text-blue-600 transition-colors tracking-wide relative group py-1">
            About
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full" />
          </a>
          <a href="#pricing" onClick={() => navigateTo('landing')} className="hover:text-blue-600 transition-colors tracking-wide relative group py-1">
            Pricing
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full" />
          </a>

          <button onClick={() => navigateTo('privacy')} className="text-slate-500 hover:text-blue-600 transition-colors tracking-wide relative group py-1 font-bold">
            Privacy Policy
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full" />
          </button>
          <button onClick={() => navigateTo('terms')} className="text-slate-500 hover:text-blue-600 transition-colors tracking-wide relative group py-1 font-bold">
            Terms of Service
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full" />
          </button>
        </nav>

        {/* Action Panel Group */}
        <div className="flex items-center gap-2">

          {/* PWA Button Node */}
          <AnimatePresence>
            {showPWAButton && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={executePWAInstallation}
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-[11px] sm:text-xs px-2.5 sm:px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <Download size={13} className="animate-bounce" />
                <span className="hidden sm:inline">Install App</span>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Desktop Auth Trigger Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              id="landing-signin-btn"
              onClick={onOpenLogin}
              className="text-slate-700 hover:text-slate-900 font-bold text-xs px-4 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <LogIn size={13} /> Sign In
            </button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              id="landing-register-btn"
              onClick={onOpenRegister}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-500/25 flex items-center gap-1.5"
            >
              <UserPlus size={13} /> Start Free <ArrowRight size={12} />
            </motion.button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors lg:hidden"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* ANANIMATED MOBILE NAVIGATION DRAWER OVERLAY */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:hidden"
            />

            {/* Sidebar Slide-in Sheet */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="fixed top-[73px] bottom-0 right-0 w-full max-w-xs bg-white border-l border-slate-200 shadow-xl z-40 lg:hidden p-6 flex flex-col justify-between overflow-y-auto"
            >
              {/* Dynamic Action Link Trailing Grid */}
              <div className="space-y-6">
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">Navigation</span>
                  <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-800 py-2 block hover:text-blue-600">Features</a>
                  <a href="#about" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-800 py-2 block hover:text-blue-600">About</a>
                  <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-800 py-2 block hover:text-blue-600">Pricing</a>
                </div>

                <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">Legal Documents</span>
                  <button onClick={() => navigateTo('privacy')} className="text-left text-sm font-bold text-slate-600 py-2 block hover:text-blue-600">Privacy Policy</button>
                  <button onClick={() => navigateTo('terms')} className="text-left text-sm font-bold text-slate-600 py-2 block hover:text-blue-600">Terms of Service</button>
                </div>

                {/* Mobile Auth Management Slots */}
                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={() => { setMobileMenuOpen(false); onOpenLogin(); }}
                    className="w-full py-3 rounded-xl border border-slate-200 font-bold text-xs text-slate-800 text-center bg-slate-50/50 flex items-center justify-center gap-1.5"
                  >
                    <LogIn size={14} /> Sign In to System
                  </button>
                  <button
                    onClick={() => { setMobileMenuOpen(false); onOpenRegister(); }}
                    className="w-full py-3 rounded-xl bg-blue-600 font-black text-xs text-white text-center flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10"
                  >
                    <UserPlus size={14} /> Register Free Account
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}