import React from 'react';
import { ShieldCheck, Eye, Lock, Globe, RefreshCw } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="pt-24 pb-10 mb-1 px-4 sm:px-6 max-w-4xl mx-auto space-y-8 bg-slate-50/30 min-h-screen">
      <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-md space-y-8">

        {/* Header Block */}
        <div className="border-b border-slate-100 pb-6 space-y-2 text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100 shadow-xs">
            <ShieldCheck size={24} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Privacy Policy</h2>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-mono">Last Updated: June 14, 2026</p>
        </div>

        {/* Content Matrix */}
        <div className="space-y-6 text-sm text-slate-600 leading-relaxed font-semibold">
          <p>
            Welcome to GallaMitra ("we," "our," or "us"). GallaMitra operates as a multi-tenant SaaS Billing & Ledger Management Platform designed to assist local businesses and shop owners across India in managing their financial accounts under high-performance infrastructure configurations.
          </p>

          {/* 1. Data Collection */}
          <div className="space-y-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 tracking-tight">
              <Eye size={18} className="text-blue-600" /> 1. Information We Securely Collect
            </h3>
            <p className="text-slate-500 text-xs md:text-sm">
              To provide your workspace, we collect user-provided details via Google OAuth sync, including business name, owner name, verified email addresses, phone numbers, state, business address, digital sign strings, and optional GSTIN/VPA parameters. We log transaction histories, sales invoices, purchase bills, and manual ledger entries on your behalf. Additionally, we track subscription metadata, plan statuses (Starter, Growth, Trial, Professional), billing cycles (Monthly, Yearly, 3-Month, 6-Month), and email dispatch flags to manage trial notices, countdown triggers, and automatic warnings.
            </p>
          </div>

          {/* 2. Security Infrastructure */}
          <div className="space-y-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 tracking-tight">
              <Lock size={18} className="text-blue-600" /> 2. Database Clusters & Zero-Buffer Storage
            </h3>
            <p className="text-slate-500 text-xs md:text-sm">
              Your business records, transactional assets, and canvas signature matrices are securely isolated within managed cloud serverless PostgreSQL database clusters (Neon DB). Utilizing specialized server-side indexes, your metrics are delivered with absolute 0 Buffering Delay, visible exclusively to authorized operators attached to your multi-tenant shop token.
            </p>
          </div>

          {/* 3. Non-Cascade Retention Safeguard */}
          <div className="space-y-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 tracking-tight">
              <RefreshCw size={18} className="text-blue-600" /> 3. Deletion, Downgrade & Workspace Inheritance Policy
            </h3>
            <p className="text-slate-505 text-xs md:text-sm font-semibold">
              To protect financial audit transparency, GallaMitra enforces a strict non-cascade deletion safeguard. If a customer or supplier profile is manually purged from your lists, related historical transactional lines and ledger logs are securely preserved in the architecture logs to keep aggregate firm balances balanced and uncorrupted. Under our parent-child subscription model, any sub-businesses created under an existing owner email inherit the plan, active status, and expiration duration of the parent workspace. Furthermore, upon expiration of the 15-day Free Trial or any paid plan, the platform automatically transitions the shop account to the Starter Plan. No business metadata, invoices, ledger entries, or customer details are deleted or lost during this downgrade sequence.
            </p>
          </div>

          {/* 4. Public Pass Channels */}
          <div className="space-y-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 tracking-tight">
              <Globe size={18} className="text-blue-600" /> 4. Sharing & Public Ledger Portals
            </h3>
            <p className="text-slate-505 text-xs md:text-sm font-semibold">
              GallaMitra gives operators the power to distribute guess-proof public link identifiers to customers and suppliers via WhatsApp triggers. These public pass portals grant real-time, read-only balance lookups, support PWA (Progressive Web App) shortcut prompts for saving the portal to a device home screen, and cache the active portal URL in local storage (`gm_last_public_portal_url`) to enable seamless, direct redirection to the client statement when the installed application is launched. Memory metrics are preserved by linking assets directly via link strings instead of third-party personal drive accounts.
            </p>
          </div>

          {/* 5. Contact Node */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-base font-black text-slate-900 tracking-tight">5. Workspace Support Desk</h3>
            <p className="text-slate-500 text-xs md:text-sm">
              If you require administrative terminal maintenance, permanent signature purges, or workspace clearing parameters, reach out directly to the core engineering desk: <a href="mailto:jainishdabgar2901@gmail.com" className="text-blue-600 hover:underline">jainishdabgar2901@gmail.com</a>.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}