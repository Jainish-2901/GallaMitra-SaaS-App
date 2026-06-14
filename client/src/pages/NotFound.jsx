import React from 'react';
import { motion } from 'framer-motion';
import { FileQuestion, Home, ArrowLeft, HelpCircle } from 'lucide-react';

export default function NotFound() {
  const urlParams = new URLSearchParams(window.location.search);
  const reason = urlParams.get('reason');

  const getErrorMessage = () => {
    if (reason === 'invalid-link') {
      return {
        title: 'Sharing Link Expired or Invalid',
        desc: 'This portal sharing link is invalid, has expired, or the associated merchant account could not be resolved. Please ask the shop owner to share a fresh connection link.',
      };
    }
    return {
      title: 'Page Not Found',
      desc: 'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.',
    };
  };

  const { title, desc } = getErrorMessage();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden text-center"
      >
        {/* Decorative background blur blobs */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-150 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-150 rounded-full blur-3xl -ml-16 -mb-16 opacity-50 pointer-events-none" />

        {/* Big Graphic Icon */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner"
          >
            <FileQuestion size={40} className="text-blue-600" />
          </motion.div>
          <div className="absolute top-0 right-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-md border-2 border-white">
            404
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900">{title}</h2>
          <p className="text-slate-500 text-xs leading-relaxed max-w-sm mx-auto font-medium">
            {desc}
          </p>
        </div>

        {/* Brand Header */}
        <div className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-wide shadow-sm">
          Galla<span className="text-blue-400">Mitra</span>
        </div>

        {/* Buttons Action Grid */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Home size={14} /> Go to Dashboard / Home
          </button>

          <button
            onClick={handleGoBack}
            className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <ArrowLeft size={14} /> Go Back
          </button>

          <a
            href="mailto:jainishdabgar2901@gmail.com?subject=GallaMitra Support Inquiry"
            className="w-full bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-150 font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <HelpCircle size={12} /> Contact Platform Support
          </a>
        </div>
      </motion.div>
    </div>
  );
}
