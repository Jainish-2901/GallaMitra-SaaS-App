import React from 'react';
import { motion } from 'framer-motion';
import { Store, Shield, Sparkles, Smartphone, CheckCircle, Heart } from 'lucide-react';

const coreValues = [
  { icon: Store, title: 'What does GallaMitra mean?', desc: '"Galla" tracks the traditional core cash drawer counter box, and "Mitra" names a trusted friend. This platform serves as your digitizing accounting ally.', color: 'text-blue-600 bg-blue-50 border-blue-200/60' },
  { icon: Shield, title: 'Tenant Isolation Architecture', desc: 'All credential nodes and data blocks are isolated with high-tier transactional boundaries keeping metrics completely secure.', color: 'text-emerald-600 bg-emerald-50 border-emerald-200/60' },
  { icon: Sparkles, title: 'Dynamic SaaS Matrix', desc: 'System administrators manage subscription levels flexibly, unlocking interface access parameters on the fly.', color: 'text-purple-600 bg-purple-50 border-purple-200/60' },
  { icon: Smartphone, title: 'Zero Search Friction Flow', desc: 'Tailored for fast operation cycles under intense physical conditions. High-contrast typography optimized for immediate lookup actions.', color: 'text-amber-600 bg-amber-50 border-amber-200/60' },
];

export default function AboutSection() {
  return (
    <section id="about" className="py-24 bg-white px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Left Summary Text Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-mono">
              <Heart size={10} className="fill-blue-600 text-blue-600" /> Executive Statement
            </div>

            <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-tight md:text-4xl">
              Bridging corporate compliance with local management workflows
            </h3>

            <p className="text-slate-500 text-xs md:text-sm font-semibold leading-relaxed">
              GallaMitra solves data tracking overheads cleanly. Instead of enforcing complex ERP configurations, we deploy unified operational canvases engineered to synchronize information loops across endpoints securely.
            </p>

            <div className="space-y-3.5 pt-2">
              {[
                { title: 'Isolated Workspace Clusters:', color: 'text-blue-600', checkColor: 'text-blue-500', text: 'Register once to dispatch and supervise separate business accounts independently.' },
                { title: 'Access Route Interception:', color: 'text-emerald-600', checkColor: 'text-emerald-500', text: 'Portals adapt dashboard access layouts automatically mapped to active service configurations.' },
                { title: 'Public Pass Generation Channels:', color: 'text-purple-600', checkColor: 'text-purple-500', text: 'Distribute secure statement links with dynamic VPA codes for effortless accounts processing.' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle size={16} className={`${item.checkColor} mt-0.5 flex-shrink-0`} />
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                    <strong className={item.color}>{item.title}</strong> {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Core System Cards Layout */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {coreValues.map((val, idx) => {
              const ValIcon = val.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.06 }}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-all group hover:border-slate-300 flex flex-col justify-between"
                >
                  <div>
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${val.color}`}>
                      <ValIcon size={18} />
                    </div>
                    <h4 className="font-black text-slate-900 text-xs mb-2 tracking-tight uppercase leading-tight font-mono">
                      {val.title}
                    </h4>
                    <p className="text-slate-500 text-[11px] leading-relaxed font-semibold">
                      {val.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}