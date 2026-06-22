import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  BarChart3, 
  Zap, 
  ShieldCheck, 
  Store, 
  Star, 
  FileText, 
  Bell 
} from 'lucide-react';

const features = [
  {
    icon: Users,
    badgeText: '₹',
    badgeColor: 'bg-emerald-500',
    title: 'Customer & Supplier CRUDs',
    desc: 'Manage detailed profiles with GSTIN, addresses, credit limits and opening balances.'
  },
  {
    icon: BarChart3,
    badgeText: '₹',
    badgeColor: 'bg-emerald-500',
    title: 'Mixed Ledger System',
    desc: 'Credit/Debit entries per party. CSV export, invoice PDF attachment, running balance view.'
  },
  {
    icon: Zap,
    badgeText: '✓',
    badgeColor: 'bg-emerald-400',
    title: 'Invoice Builder',
    desc: 'GST/Non-GST auto-detect, discounts, charges, taxes — print-ready with instant ledger sync.'
  },
  {
    icon: ShieldCheck,
    badgeText: '✓',
    badgeColor: 'bg-emerald-500',
    title: 'Password Protected',
    desc: 'Each workspace secured with industry-grade encryption models. Stay securely logged in loop.'
  },
  {
    icon: Store,
    badgeText: '₹',
    badgeColor: 'bg-emerald-500',
    title: 'Multi-Business Management',
    desc: 'One account, multiple firms. Switch workspaces freely with separate operational ledger isolation.'
  },
  {
    icon: Star,
    badgeText: '✓',
    badgeColor: 'bg-blue-500',
    title: 'Public Pass Portal',
    desc: 'Share customer-facing statement links via WhatsApp. Features native UPI QR parameters.'
  },
  {
    icon: FileText,
    badgeText: '↓',
    badgeColor: 'bg-blue-500',
    title: 'Purchase Bill Tracking',
    desc: 'Record incoming vendor invoices with image attachments and automated balance syncing paths.'
  },
  {
    icon: Bell,
    badgeText: '⚙',
    badgeColor: 'bg-blue-500',
    title: 'Real-time Action Feedback',
    desc: 'Every ledger movement triggers instant feedback actions. Zero workflow friction or delays.'
  }
];

export default function FeaturesGrid() {
  const [activeCard, setActiveCard] = useState(0);

  return (
    <section id="features" className="py-20 md:py-28 px-4 sm:px-6 erp-grid-bg-white border-y border-slate-200/60 relative overflow-hidden">
      
      {/* Background Soft Glow to resemble the reference image */}
      <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-red-100/30 rounded-full blur-[90px] pointer-events-none -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-[300px] h-[300px] bg-emerald-100/30 rounded-full blur-[90px] pointer-events-none -translate-y-1/2" />

      <div className="max-w-6xl mx-auto relative z-10">

        {/* Section Header */}
        <div className="text-center mb-16 space-y-3">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-black uppercase tracking-widest text-blue-600 font-mono"
          >
            Balance & Ledger Anywhere
          </motion.p>
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight"
          >
            Everything your enterprise demands
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 text-xs sm:text-sm font-medium max-w-xl mx-auto leading-relaxed"
          >
            Remote & manage ledgers dynamically from any device. Seamlessly integrate statements with customers, suppliers, and business partners.
          </motion.p>
        </div>

        {/* Responsive Flex/Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => {
            const FIcon = f.icon;
            const isActive = activeCard === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                onMouseEnter={() => setActiveCard(i)}
                className={`bg-white border-2 rounded-[24px] p-6 sm:p-7 transition-all duration-300 flex flex-col items-center text-center justify-between min-h-[220px] cursor-pointer hover:shadow-lg ${
                  isActive
                    ? 'border-blue-600 shadow-xl shadow-blue-500/5 ring-4 ring-blue-600/5 scale-[1.02]'
                    : 'border-slate-200/80 hover:border-blue-600/50 shadow-xs'
                }`}
              >
                <div className="w-full flex flex-col items-center">
                  {/* Icon Wrapper matching reference image (centered, relative badge) */}
                  <div className="relative w-14 h-14 mb-5 flex items-center justify-center text-slate-700 bg-slate-50 rounded-2xl border border-slate-100 shadow-2xs">
                    <FIcon size={26} strokeWidth={1.5} />
                    <div className={`absolute -top-1.5 -right-1.5 w-5.5 h-5.5 rounded-full ${f.badgeColor} border-2 border-white flex items-center justify-center text-white text-[9px] font-black shadow-xs`}>
                      {f.badgeText}
                    </div>
                  </div>
                  
                  <h4 className="font-black text-slate-900 text-sm mb-3.5 tracking-tight leading-tight">{f.title}</h4>
                  <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed font-semibold">{f.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}