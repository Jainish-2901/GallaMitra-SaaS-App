import React from 'react';
import { FileText, Award, AlertCircle, HelpCircle, Smartphone } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="pt-24 pb-10 mb-1 px-4 sm:px-6 max-w-4xl mx-auto space-y-8 bg-slate-50/30 min-h-screen">
      <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-md space-y-8">

        {/* Header Block */}
        <div className="border-b border-slate-100 pb-6 space-y-2 text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100 shadow-xs">
            <FileText size={24} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Terms of Service</h2>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-mono">Last Updated: June 20, 2026</p>
        </div>

        {/* Content Matrix */}
        <div className="space-y-6 text-sm text-slate-600 leading-relaxed font-semibold">
          <p>
            By initializing a workspace, signing in with Google OAuth credentials, or interacting with any multi-tenant modules hosted under the GallaMitra system ecosystem, you implicitly accept these structural operational terms.
          </p>

          {/* 1. Tenant Lifecycle */}
          <div className="space-y-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 tracking-tight">
              <Award size={18} className="text-blue-600" /> 1. Workspace Allocation & Trial Plan Terms
            </h3>
            <p className="text-slate-505 text-xs md:text-sm font-semibold">
              New business owner registrations are automatically allocated a 15-day Free Trial of the Professional tier features. Advanced paid tier accesses require approval sequences by global platform operators. Under our parent-child workspace inheritance model, any additional sub-businesses or workspaces registered under an existing account automatically inherit the plan, active status, and remaining subscription duration of the parent workspace, bypassing new plan selection and separate administrative approval. Trial plans last exactly 15 days, after which accounts are automatically shifted to the Starter tier. Platform operators support monthly, yearly, 3-month, 6-month, and trial billing cycles, and reserve total infrastructure rights to intercept, modify, or terminate any workspace tier if transactional patterns violate platform integrity.
            </p>
          </div>

          {/* 2. Operations & Fair Use */}
          <div className="space-y-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 tracking-tight">
              <AlertCircle size={18} className="text-blue-600" /> 2. Live Smart-Fetch Calculation Policy
            </h3>
            <p className="text-slate-500 text-xs md:text-sm">
              GallaMitra processes values, taxes, and dynamic accounting totals based on raw inputs provided by the operator. The invoicing engine uses automated context lookups to separate GST and Non-GST records on the fly. These modules serve as tools for internal business optimization and do not substitute for official certified accounting records.
            </p>
          </div>

          {/* 3. PWA Capabilities */}
          <div className="space-y-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 tracking-tight">
              <Smartphone size={18} className="text-blue-600" /> 3. Progressive Web App (PWA) Sync & Portal Shortcuts
            </h3>
            <p className="text-slate-505 text-xs md:text-sm font-semibold">
              Our PWA provides quick-action shortcuts and stores structural asset frames locally to speed up rendering. We also offer dynamic PWA installation prompts for customers and suppliers inside their public portal. By assigning a unique, parameterized start URL and web manifest, the browser installs each portal as a separate standalone application, allowing fast future reference to that specific statement directly on launching the app. All active balance adjustments, voucher generations, and invoice builds are strictly online operations and require active internet handshakes to commit edits safely to central database clusters.
            </p>
          </div>

          {/* 4. Administration Adjustments */}
          <div className="space-y-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 tracking-tight">
              <HelpCircle size={18} className="text-blue-600" /> 4. Package Allocation Changes
            </h3>
            <p className="text-slate-500 text-xs md:text-sm">
              Platform administration retains explicit operational authority to alter system layout constraints, subscription parameters, and active tab rules dynamically. Allocated workspace subscriptions are processed on a final, non-refundable structural deployment track.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}