import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Mail, Shield, Phone, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingFooter() {
  const navigate = useNavigate();
  const navigateTo = (page) => {
    if (page === 'landing') {
      navigate('/');
    } else {
      navigate(`/${page}`);
    }
  };

  return (
    <motion.footer
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="border-t border-slate-200 bg-white text-slate-800"
    >
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">

        {/* Left Core Brand Column (Spans 5 Columns) */}
        <div className="md:col-span-5 space-y-4">
          <div
            onClick={() => navigateTo('landing')}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="bg-white border border-slate-200 p-1 w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <img src="/logo.png" alt="GallaMitra Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-slate-900 text-base tracking-tight transition-colors group-hover:text-blue-600">GallaMitra SaaS</span>
          </div>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed max-w-sm">
            A high-performance Multi-Tenant ledger and invoicing engine built explicitly to optimize retail accounting loops with absolute 0 Buffering Delay metrics.
          </p>

          {/* Legal Document Quick Access Anchors with clean hover scales */}
          <div className="flex items-center gap-4 pt-1.5 text-xs font-bold text-slate-400">
            <button onClick={() => navigateTo('privacy')} className="hover:text-blue-600 transition-colors hover:scale-102 active:scale-98">Privacy Policy</button>
            <span className="text-slate-200 select-none">•</span>
            <button onClick={() => navigateTo('terms')} className="hover:text-blue-600 transition-colors hover:scale-102 active:scale-98">Terms of Service</button>
          </div>
        </div>

        {/* Right Creator Blueprint Column (Spans 7 Columns) */}
        <div className="md:col-span-7 bg-slate-50 border border-slate-200 p-6 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-6 transition-all hover:shadow-xs hover:border-slate-300">

          {/* Engineering Credentials & Native Action Triggers */}
          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono flex items-center gap-1.5">
                <Shield size={12} className="text-blue-600" /> Full-Stack Architect
              </span>
              <h4 className="font-black text-slate-900 text-sm tracking-tight">Jainish Dabgar</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed font-semibold">
                Specialized in scaling transactional web architectures, relational PostgreSQL databases, and high-contrast professional layout contexts.
              </p>
            </div>

            {/* ⚡ ACTIVE ACTION TRIGGERS WITH HOVER SLIDES */}
            <div className="space-y-2 pt-1 text-[11px] font-bold text-slate-600 font-mono">

              {/* Call Trigger */}
              <a
                href="tel:+919773272749"
                className="flex items-center gap-2.5 transition-all duration-250 hover:text-blue-600 hover:translate-x-1 w-fit group"
              >
                <Phone size={12} className="text-slate-400 transition-colors group-hover:text-blue-500" />
                <span>+91 97732 72749</span>
              </a>

              {/* Mailto Trigger */}
              <a
                href="mailto:jainishdabgar2901@gmail.com"
                className="flex items-center gap-2.5 transition-all duration-250 hover:text-blue-600 hover:translate-x-1 w-fit group"
              >
                <Mail size={12} className="text-slate-400 transition-colors group-hover:text-blue-500" />
                <span>jainishdabgar2901@gmail.com</span>
              </a>

              {/* Maps Location Open Trigger */}
              <a
                href="https://maps.google.com/?q=Ahmedabad,Gujarat,India"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 transition-all duration-250 hover:text-blue-600 hover:translate-x-1 w-fit group"
              >
                <MapPin size={12} className="text-slate-400 transition-colors group-hover:text-blue-500" />
                <span>Ahmedabad, Gujarat, India</span>
              </a>

            </div>
          </div>

          {/* Social Profiles & Developer Connect */}
          <div className="space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">Connect & Follow</span>
              <p className="text-slate-500 text-[11px] font-semibold font-mono">Status: Open for Full-Stack Opportunities</p>
            </div>

            {/* Interactive Icon Ribbon with Custom Brand Hover Colors */}
            <div className="flex items-center gap-2.5">

              {/* GitHub Profile */}
              <motion.a
                href="https://github.com/Jainish-2901"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub Profile"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                className="w-9 h-9 bg-white border border-slate-200 text-slate-500 rounded-xl flex items-center justify-center transition-all shadow-2xs hover:text-white hover:bg-slate-900 hover:border-slate-900"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
                </svg>
              </motion.a>

              {/* LinkedIn Network */}
              <motion.a
                href="https://www.linkedin.com/in/jainish-dabgar-87474a320/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn Network"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                className="w-9 h-9 bg-white border border-slate-200 text-slate-500 rounded-xl flex items-center justify-center transition-all shadow-2xs hover:text-white hover:bg-[#0077B5] hover:border-[#0077B5]"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </motion.a>

              {/* Live Developer Portfolio */}
              <motion.a
                href="https://jainishdabgar.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Developer Portfolio"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                className="w-9 h-9 bg-white border border-slate-200 text-slate-500 rounded-xl flex items-center justify-center transition-all shadow-2xs hover:text-white hover:bg-blue-600 hover:border-blue-600"
              >
                <Globe size={15} />
              </motion.a>

              {/* Direct Mail ID */}
              <motion.a
                href="mailto:jainishdabgar2901@gmail.com"
                aria-label="Direct Email Link"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                className="w-9 h-9 bg-white border border-slate-200 text-slate-500 rounded-xl flex items-center justify-center transition-all shadow-2xs hover:text-white hover:bg-rose-600 hover:border-rose-600"
              >
                <Mail size={15} />
              </motion.a>

            </div>
          </div>

        </div>
      </div>

      {/* Baseline Bottom Bar Sheet */}
      <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-2 text-center sm:text-left text-slate-400">
        <p className="text-[11px] font-bold font-mono">
          © {new Date().getFullYear()} GallaMitra Platform. All rights reserved.
        </p>

        {/* 👑 STRICT PROTECTED LINE: NEVER REPLACED OR MODIFIED */}
        <p className="text-[11px] font-bold font-mono text-slate-600 flex items-center gap-1 justify-center">
          Engineered with ❤️ by Jainish Dabgar
        </p>
      </div>
    </motion.footer>
  );
}