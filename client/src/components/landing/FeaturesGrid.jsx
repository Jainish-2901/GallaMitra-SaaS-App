import React from 'react';
import { motion } from 'framer-motion';
import { Users, BarChart3, Zap, ShieldCheck, Store, Star, FileText, Bell } from 'lucide-react';

const features = [
  { icon: Users, title: 'Customer & Supplier CRUDs', desc: 'Manage detailed profiles with GSTIN, addresses, credit limits and opening balances.', color: 'text-blue-600 bg-blue-50 border-blue-100' },
  { icon: BarChart3, title: 'Mixed Ledger System', desc: 'Credit/Debit entries per party. CSV export, invoice PDF attachment, running balance view.', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  { icon: Zap, title: 'Invoice Builder', desc: 'GST/Non-GST auto-detect, discounts, charges, taxes — print-ready with instant ledger sync.', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  { icon: ShieldCheck, title: 'Password Protected', desc: 'Each workspace secured with industry-grade encryption models. Stay securely logged in loop.', color: 'text-violet-600 bg-violet-50 border-violet-100' },
  { icon: Store, title: 'Multi-Business Management', desc: 'One account, multiple firms. Switch workspaces freely with separate operational ledger isolation.', color: 'text-cyan-600 bg-cyan-50 border-cyan-100' },
  { icon: Star, title: 'Public Pass Portal', desc: 'Share customer-facing statement links via WhatsApp. Features native UPI QR parameters.', color: 'text-rose-600 bg-rose-50 border-rose-100' },
  { icon: FileText, title: 'Purchase Bill Tracking', desc: 'Record incoming vendor invoices with image attachments and automated balance syncing paths.', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
  { icon: Bell, title: 'Real-time Action Feedback', desc: 'Every ledger movement triggers instant feedback actions. Zero workflow friction or delays.', color: 'text-orange-600 bg-orange-50 border-orange-100' },
];

export default function FeaturesGrid() {
  return (
    <section id="features" className="py-20 md:py-28 px-4 sm:px-6 bg-[#F8FAFC] border-y border-slate-200/60">
      <div className="max-w-6xl mx-auto">

        {/* Section Header */}
        <div className="text-center mb-16 space-y-3">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-black uppercase tracking-widest text-blue-600 font-mono"
          >
            Platform Integration
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
            className="text-slate-500 text-xs sm:text-sm font-medium max-w-lg mx-auto leading-relaxed"
          >
            Engineered from scratch utilizing zero inventory parameters — fully optimized for rapid response speeds and absolute mobile fluid layouts.
          </motion.p>
        </div>

        {/* Responsive Flex/Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {features.map((f, i) => {
            const FIcon = f.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                whileHover={{ y: -4, shadow: "0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05)" }}
                className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 transition-all hover:border-slate-300/80 flex flex-col justify-between active:scale-[0.99]"
              >
                <div>
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-5 shadow-2xs ${f.color}`}>
                    <FIcon size={20} />
                  </div>
                  <h4 className="font-black text-slate-900 text-sm mb-2 tracking-tight leading-tight">{f.title}</h4>
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