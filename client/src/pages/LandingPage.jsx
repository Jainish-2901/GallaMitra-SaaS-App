import React, { useState, useContext, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { AppContext } from '../context/AppContext.jsx';

import LandingHeader from '../components/landing/LandingHeader.jsx';
import LandingFooter from '../components/landing/LandingFooter.jsx';
import HeroSection from '../components/landing/HeroSection.jsx';
import FeaturesGrid from '../components/landing/FeaturesGrid.jsx';
import AboutSection from '../components/landing/AboutSection.jsx';
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

            {/* 🚀 INTEGRATED NATIVE PWA ACCESS TRIGGER MODULE CONTAINER */}
            <PWAInstallationSection />

            {/* Pricing Section Grid Canvas */}
            <section id="pricing" className="py-24 px-4 sm:px-6 text-center bg-[#F8FAFC] border-t border-slate-200/60">
              <div className="max-w-6xl mx-auto space-y-4">
                <p className="text-xs font-black uppercase tracking-widest text-blue-600 font-mono">Workspace Pricing</p>
                <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">Simple, transparent deployment plans</h3>
                <p className="text-slate-500 text-xs sm:text-sm font-medium">Packages allocated and structured dynamically by platform admin panels.</p>

                {/* Highly Responsive Fluid Pricing Grid Framework */}
                <div className="grid gap-6 sm:gap-8 pt-12 justify-center grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto w-full">
                  {(plans && plans.length > 0 ? plans : [
                    { id: 'starter', name: 'Starter Tier', price: 0, billingCycle: 'free', features: ['Dashboard & Overview', 'Customers & Suppliers', 'Sale & Purchase Ledger', 'Payment Receipts'] },
                    { id: 'growth', name: 'Growth Tier', price: 149, billingCycle: 'monthly', features: ['Invoice Builder', 'Purchase Bill Creator', 'Document Lists', 'Business Settings'] },
                    { id: 'professional', name: 'Premium Tier', price: 299, billingCycle: 'monthly', features: ['Reports & CSV Export', 'Analytics & Charts', 'Priority Support'] },
                  ]).map(tier => {
                    const priceNum = parseFloat(tier.price);
                    const isFree = priceNum === 0;
                    const isPremium = priceNum >= 200;

                    let accentCheck = 'text-blue-500', cardClass = 'bg-white border-slate-200';

                    if (isFree) {
                      accentCheck = 'text-emerald-500'; cardClass = 'bg-white border-slate-200/80 shadow-2xs';
                    } else if (isPremium) {
                      accentCheck = 'text-blue-600'; cardClass = 'bg-white border-blue-200 shadow-md shadow-blue-500/5 relative ring-4 ring-blue-600/5';
                    }

                    const featuresArray = Array.isArray(tier.features) ? tier.features : (typeof tier.features === 'string' ? JSON.parse(tier.features) : []);
                    return (
                      <div key={tier.id || tier.name} className={`p-6 sm:p-8 rounded-3xl border text-left hover:shadow-xl transition-all hover:scale-[1.01] flex flex-col justify-between min-h-[440px] w-full active:scale-[0.99] ${cardClass}`}>
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] font-black uppercase tracking-widest font-mono text-slate-400">{tier.name}</p>
                            {isPremium && <span className="bg-blue-50 text-blue-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">Popular Choice</span>}
                          </div>
                          <p className="text-3xl sm:text-4xl font-black mb-6 font-mono text-slate-900">
                            ₹{priceNum.toFixed(0)}
                            <span className="text-xs font-semibold text-slate-400 font-sans">
                              {tier.billingCycle === 'free' ? ' (Free)' : `/${tier.billingCycle === 'yearly' ? 'yr' : 'mo'}`}
                            </span>
                          </p>
                          <ul className="space-y-3.5 mb-8">
                            {featuresArray.map(f => (
                              <li key={f} className="text-[11px] font-bold flex items-start gap-2.5 text-slate-600 leading-tight">
                                <span className={`${accentCheck} font-black flex-shrink-0 mt-0.5`}>✓</span>
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          onClick={openRegister}
                          className={`w-full py-3.5 px-4 rounded-xl text-xs font-black text-center transition-all shadow-2xs cursor-pointer ${isPremium ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10' : 'bg-slate-900 hover:bg-slate-800 text-white'
                            }`}
                        >
                          Deploy Workspace
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