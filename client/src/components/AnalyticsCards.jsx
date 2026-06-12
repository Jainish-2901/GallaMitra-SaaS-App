import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';

export default function AnalyticsCards({ customers, suppliers, activeLang, translations }) {
  // Receivables (Total to Take): Positive customer balances + Absolute value of negative supplier balances
  const custTake = customers.reduce((sum, c) => sum + (parseFloat(c.balance || 0) > 0 ? parseFloat(c.balance) : 0), 0);
  const suppTake = suppliers.reduce((sum, s) => sum + (parseFloat(s.balance || 0) < 0 ? Math.abs(parseFloat(s.balance)) : 0), 0);
  const totalToTake = custTake + suppTake;

  // Payables (Total to Give): Positive supplier balances + Absolute value of negative customer balances
  const suppGive = suppliers.reduce((sum, s) => sum + (parseFloat(s.balance || 0) > 0 ? parseFloat(s.balance) : 0), 0);
  const custGive = customers.reduce((sum, c) => sum + (parseFloat(c.balance || 0) < 0 ? Math.abs(parseFloat(c.balance)) : 0), 0);
  const totalToGive = suppGive + custGive;

  const netBookValue = totalToTake - totalToGive;

  const t = translations[activeLang] || translations.en;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
      
      {/* Receivables Card */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-md transition-all">
        <div>
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest font-mono">
            {t.totalToTake || 'Total To Take (લેવાના પૈસા)'}
          </span>
          <p className="text-3xl font-black text-emerald-700 font-mono mt-1">₹{totalToTake.toFixed(2)}</p>
          <span className="text-[9px] text-emerald-700/85 font-semibold block mt-1">
            {(t.receivablesCount || "Receivables from {count} customer profiles").replace("{count}", customers.filter(c => parseFloat(c.balance || 0) > 0).length)}
          </span>
        </div>
        <div className="p-3.5 bg-emerald-500/10 text-emerald-700 rounded-xl border border-emerald-200"><ArrowDownLeft size={22} /></div>
      </div>

      {/* Payables Card */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-md transition-all">
        <div>
          <span className="text-[10px] font-bold text-red-800 uppercase tracking-widest font-mono">
            {t.totalToGive || 'Total To Give (આપવાના પૈસા)'}
          </span>
          <p className="text-3xl font-black text-red-750 font-mono mt-1">₹{totalToGive.toFixed(2)}</p>
          <span className="text-[9px] text-red-700/85 font-semibold block mt-1">
            {(t.payablesCount || "Payables to {count} suppliers").replace("{count}", suppliers.filter(s => parseFloat(s.balance || 0) > 0).length)}
          </span>
        </div>
        <div className="p-3.5 bg-red-500/10 text-red-700 rounded-xl border border-red-200"><ArrowUpRight size={22} /></div>
      </div>

      {/* Net Position Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-md transition-all">
        <div>
          <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest font-mono">
            {t.netCashFlow || 'Net Cash Flow'}
          </span>
          <p className={`text-3xl font-black font-mono mt-1 ${netBookValue >= 0 ? 'text-emerald-700' : 'text-red-750'}`}>
            ₹{netBookValue.toFixed(2)}
          </p>
          <span className="text-[9px] text-slate-700/85 font-semibold block mt-1">
            {netBookValue >= 0 ? (t.netPositiveCredit || 'Net positive credit books') : (t.netLiabilitiesOutstanding || 'Net liabilities outstanding')}
          </span>
        </div>
        <div className="p-3.5 bg-slate-500/10 text-slate-650 rounded-xl border border-slate-200"><Scale size={22} /></div>
      </div>

    </div>
  );
}