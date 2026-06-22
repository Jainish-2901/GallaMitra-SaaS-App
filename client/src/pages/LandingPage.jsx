import React, { useState, useContext, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, User, TrendingUp, FileText } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { AppContext } from '../context/AppContext.jsx';

import LandingHeader from '../components/landing/LandingHeader.jsx';
import LandingFooter from '../components/landing/LandingFooter.jsx';
import HeroSection from '../components/landing/HeroSection.jsx';
import FeaturesGrid from '../components/landing/FeaturesGrid.jsx';
import AboutSection from '../components/landing/AboutSection.jsx';
import TestimonialsSection from '../components/landing/TestimonialsSection.jsx';
import LoginForm from '../components/landing/LoginForm.jsx';
import RegisterForm from '../components/landing/RegisterForm.jsx';
import PWAInstallationSection from '../components/landing/PWAInstallationSection.jsx'; // Fixed import routing reference

import PrivacyPolicy from './PrivacyPolicy.jsx';
import TermsOfService from './TermsOfService.jsx';

export default function LandingPage() {
  const { plans } = useContext(AppContext);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const location = useLocation();

  const viewPage = location.pathname === '/privacy' ? 'privacy' : location.pathname === '/terms' ? 'terms' : 'landing';

  useEffect(() => {
    if (localStorage.getItem('gm_deleted_only_business') === 'true') {
      localStorage.removeItem('gm_deleted_only_business');
      setMode('register');
      setModalOpen(true);
    }
  }, []);

  const openLogin = () => { setMode('login'); setModalOpen(true); };
  const openRegister = () => { setMode('register'); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const modalTitle = mode === 'login' ? 'Sign In to Workspace' : 'Create Free Workspace';

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans overflow-x-hidden">
      <LandingHeader onOpenLogin={openLogin} onOpenRegister={openRegister} />

      <main className="flex-1">
        {viewPage === 'landing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <HeroSection onOpenRegister={openRegister} onOpenLogin={openLogin} />
            <FeaturesGrid />
            <AboutSection />
            <TestimonialsSection />

            {/* 🚀 INTEGRATED NATIVE PWA ACCESS TRIGGER MODULE CONTAINER */}
            <PWAInstallationSection />

            {/* Pricing Section Grid Canvas */}
            <section id="pricing" className="py-24 px-4 sm:px-6 text-center erp-grid-bg border-t border-slate-200/60 relative overflow-hidden">
              <div className="max-w-6xl mx-auto space-y-4">
                <p className="text-xs font-black uppercase tracking-widest text-blue-600 font-mono">Workspace Pricing</p>
                <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">Simple, transparent deployment plans</h3>
                <p className="text-slate-500 text-xs sm:text-sm font-medium">Packages allocated and structured dynamically by platform admin panels.</p>

                {/* Highly Responsive Fluid Pricing Grid Framework */}
                <div className="grid gap-6 sm:gap-8 pt-12 justify-center grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto w-full">
                  {((plans && plans.length > 0 ? plans : [
                    { id: 'starter', name: 'Starter Tier', price: 0, billingCycle: 'free', features: ['Dashboard & Overview', 'Customers & Suppliers', 'Sale & Purchase Ledger', 'Payment Receipts'] },
                    { id: 'growth', name: 'Growth Tier', price: 149, billingCycle: 'monthly', features: ['Invoice Builder', 'Purchase Bill Creator', 'Document Lists', 'Business Settings'] },
                    { id: 'professional', name: 'Premium Tier', price: 299, billingCycle: 'monthly', features: ['Reports & CSV Export', 'Analytics & Charts', 'Priority Support'] },
                  ]) || []).map((tier, index) => {
                    const priceNum = parseFloat(tier.price);
                    
                    const tierIdx = index >= 0 ? index : 0;
                    const config = [
                      {
                        icon: User,
                        iconClass: 'text-slate-600 bg-slate-100 border-slate-200',
                        ribbonText: 'Starter plan',
                        ribbonBg: 'bg-amber-500',
                        priceClass: 'text-orange-500',
                        btnClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10',
                        cardClass: 'border-slate-200/80 shadow-xs hover:border-slate-300',
                        featuresHeader: 'See Offer plan'
                      },
                      {
                        icon: TrendingUp,
                        iconClass: 'text-emerald-600 bg-emerald-50 border-emerald-200',
                        ribbonText: 'Growth plan',
                        ribbonBg: 'bg-emerald-500',
                        priceClass: 'text-blue-600',
                        btnClass: 'bg-slate-900 hover:bg-slate-800 text-white',
                        cardClass: 'border-blue-600 ring-4 ring-blue-600/5 shadow-xl relative scale-[1.01]',
                        featuresHeader: 'See Offer plan'
                      },
                      {
                        icon: FileText,
                        iconClass: 'text-rose-600 bg-rose-50 border-rose-200',
                        ribbonText: 'Scale plan',
                        ribbonBg: 'bg-amber-500',
                        priceClass: 'text-emerald-500',
                        btnClass: 'bg-slate-900 hover:bg-slate-800 text-white',
                        cardClass: 'border-slate-200/80 shadow-xs hover:border-slate-300',
                        featuresHeader: 'Free Offer plans'
                      }
                    ][tierIdx % 3];

                    const featuresArray = Array.isArray(tier.features) ? tier.features : (typeof tier.features === 'string' ? JSON.parse(tier.features) : []);
                    return (
                      <div 
                        key={tier.id || tier.name} 
                        className={`p-6 sm:p-8 rounded-3xl border text-left hover:shadow-xl transition-all flex flex-col justify-between min-h-[460px] w-full active:scale-[0.99] relative overflow-hidden bg-white ${config.cardClass}`}
                      >
                        {/* Diagonal Corner Ribbon Badge */}
                        <div className="absolute top-0 right-0 overflow-hidden w-24 h-24 pointer-events-none">
                          <div className={`absolute top-4 -right-8 w-28 py-1 text-[7px] font-black text-center text-white uppercase tracking-wider transform rotate-45 shadow-xs ${config.ribbonBg}`}>
                            {tier.name}
                          </div>
                        </div>

                        <div>
                          {/* Left-Aligned Header Box with Icon */}
                          <div className="flex items-center gap-3 mb-6">
                            <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${config.iconClass} shrink-0`}>
                              <config.icon size={20} strokeWidth={1.5} />
                            </div>
                            <div className="overflow-hidden">
                              <h4 className="font-black text-slate-900 text-sm tracking-tight truncate">{tier.name}</h4>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono mt-0.5">GallaMitra Tier</p>
                            </div>
                          </div>

                          {/* Large Colored Price display */}
                          <div className="mb-6">
                            <p className={`text-3xl font-black font-mono tracking-tight ${config.priceClass}`}>
                              ₹{priceNum.toFixed(0)}
                            </p>
                            <p className="text-[9px] font-black text-slate-400 uppercase font-mono mt-0.5 tracking-wider">
                              {tier.billingCycle === 'free' ? 'Free (₹0.00)' : `Billed / ${tier.billingCycle}`}
                            </p>
                          </div>

                          {/* Sub heading title for features list */}
                          <p className="font-black text-slate-800 text-[10px] mb-3.5 tracking-tight uppercase font-mono">
                            {config.featuresHeader}
                          </p>

                          <ul className="space-y-3.5 mb-8">
                            {featuresArray.map(f => (
                              <li key={f} className="text-[11px] font-bold flex items-start gap-2 text-slate-600 leading-tight">
                                <span className="text-emerald-500 font-black flex-shrink-0">✓</span>
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          onClick={openRegister}
                          className={`w-full py-3.5 px-4 rounded-xl text-xs font-black text-center transition-all shadow-2xs cursor-pointer ${config.btnClass}`}
                        >
                          Start Now
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {viewPage === 'privacy' && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><PrivacyPolicy /></motion.div>}
        {viewPage === 'terms' && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><TermsOfService /></motion.div>}
      </main>

      <LandingFooter />

      {/* Global Interface Auth Modal Layout Sheet */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50" onClick={closeModal} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden border border-slate-100 flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">{modalTitle}</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase font-mono mt-0.5 tracking-wider">Secure Access Panel</p>
                  </div>
                  <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all cursor-pointer"><X size={15} /></button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[75vh]">
                  {mode === 'login' ? <LoginForm onSwitchToRegister={() => setMode('register')} onClose={closeModal} /> : <RegisterForm onSwitchToLogin={() => setMode('login')} onClose={closeModal} />}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}