import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdmin } from '../context/AdminContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Settings, Plus, Edit2, Trash2, CheckSquare, Square, Save, X, Crown, Sparkles, Shield } from 'lucide-react';

const TABS_REGISTRY = [
  { id: 'dashboard', label: 'Dashboard Overview', group: 'Overview' },
  { id: 'cust_list', label: 'Customer Management', group: 'Parties' },
  { id: 'supp_list', label: 'Supplier Registry', group: 'Parties' },
  { id: 'sale_ledger', label: 'Sale Ledger', group: 'Ledgers' },
  { id: 'sales_list', label: 'Sales Item Registry', group: 'Ledgers' },
  { id: 'purchase_ledger', label: 'Purchase Ledger', group: 'Ledgers' },
  { id: 'purchase_list', label: 'Purchase Item Registry', group: 'Ledgers' },
  { id: 'invoice_builder', label: 'Invoice Builder', group: 'Billing' },
  { id: 'invoice_list', label: 'Invoice List', group: 'Billing' },
  { id: 'payment_receipt', label: 'Payment Receipt', group: 'Billing' },
  { id: 'receipt_list', label: 'Payment Voucher List', group: 'Billing' },
  { id: 'purchase_bill', label: 'Purchase Bill Creator', group: 'Billing' },
  { id: 'pbill_list', label: 'Purchase Bill List', group: 'Billing' },
  { id: 'reports', label: 'Reports & CSV Export', group: 'Intelligence' },
  { id: 'analytics', label: 'Analytics & Charts', group: 'Intelligence' },
  { id: 'user_settings', label: 'Profile Settings', group: 'Settings' },
  { id: 'business_settings', label: 'Business Settings', group: 'Settings' },
];

export default function AdminSettingsPage() {
  const { fetchPlans, createPlan, updatePlan, deletePlan, fetchAdminSettings, updateAdminSettings } = useAdmin();
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null);

  // Platform Support contacts & URLs
  const [supportPhone, setSupportPhone] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [backendUrl, setBackendUrl] = useState('');
  const [frontendUrl, setFrontendUrl] = useState('');
  const [adminUrl, setAdminUrl] = useState('');
  const [savingSupport, setSavingSupport] = useState(false);

  // Edit / Create Form fields
  const [planId, setPlanId] = useState('');
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('0');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedTabs, setSelectedTabs] = useState([]);
  const [featuresText, setFeaturesText] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [allowMultiBusiness, setAllowMultiBusiness] = useState(false);

  const loadPlans = async () => {
    setLoading(true);
    const list = await fetchPlans();
    setPlans(list);
    setLoading(false);
  };

  const loadSupportSettings = async () => {
    try {
      const res = await fetchAdminSettings();
      if (res && res.success) {
        setSupportPhone(res.supportPhone || '');
        setSupportEmail(res.supportEmail || '');
        setBackendUrl(res.backendUrl || '');
        setFrontendUrl(res.frontendUrl || '');
        setAdminUrl(res.adminUrl || '');
      }
    } catch { }
  };

  useEffect(() => {
    loadPlans();
    loadSupportSettings();
  }, [fetchPlans, fetchAdminSettings]);

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    if (!supportPhone.trim() || !supportEmail.trim()) {
      toast.warning('Support phone and support email are required.');
      return;
    }
    setSavingSupport(true);
    const res = await updateAdminSettings({ supportPhone, supportEmail });
    setSavingSupport(false);
    if (res.success) {
      toast.success('Support contacts updated successfully!');
    } else {
      toast.error(res.error || 'Failed to update support settings.');
    }
  };

  const handleEditClick = (plan) => {
    setEditingPlan(plan);
    setPlanId(plan.id);
    setPlanName(plan.name);
    setPlanPrice(plan.price.toString());
    setBillingCycle(plan.billingCycle || plan.billingcycle);
    setSelectedTabs(typeof plan.allowedTabs === 'string' ? JSON.parse(plan.allowedTabs) : (plan.allowedTabs || []));
    setFeaturesText(Array.isArray(plan.features) ? plan.features.join('\n') : (typeof plan.features === 'string' ? JSON.parse(plan.features).join('\n') : ''));
    setRequiresApproval(plan.requiresApproval !== false && plan.requiresapproval !== false);
    setAllowMultiBusiness(plan.allowMultiBusiness === true || plan.allowmultibusiness === true);
  };

  const handleNewClick = () => {
    setEditingPlan('new');
    setPlanId('');
    setPlanName('');
    setPlanPrice('0');
    setBillingCycle('monthly');
    setSelectedTabs(['dashboard', 'user_settings']);
    setFeaturesText('');
    setRequiresApproval(true);
    setAllowMultiBusiness(false);
  };

  const handleToggleTab = (tabId) => {
    setSelectedTabs(prev =>
      prev.includes(tabId) ? prev.filter(t => t !== tabId) : [...prev, tabId]
    );
  };

  const handleDelete = async (id) => {
    const res = await deletePlan(id);
    if (res.success) {
      toast.success('Plan deleted successfully.');
      loadPlans();
    } else {
      toast.error(res.error || 'Failed to delete plan.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!planId.trim() || !planName.trim()) { toast.warning('Plan ID and Name are required.'); return; }

    const featuresArray = featuresText.split('\n').map(f => f.trim()).filter(Boolean);
    const planPayload = {
      id: planId.trim().toLowerCase(),
      name: planName.trim(),
      price: parseFloat(planPrice || '0'),
      billingCycle,
      allowedTabs: selectedTabs,
      features: featuresArray,
      requiresApproval,
      allowMultiBusiness
    };

    if (editingPlan === 'new') {
      const res = await createPlan(planPayload);
      if (res.success) {
        toast.success('Plan created successfully!');
        setEditingPlan(null);
        loadPlans();
      } else {
        toast.error(res.error || 'Failed to create plan.');
      }
    } else {
      const res = await updatePlan(editingPlan.id, planPayload);
      if (res.success) {
        toast.success('Plan updated successfully!');
        setEditingPlan(null);
        loadPlans();
      } else {
        toast.error(res.error || 'Failed to update plan.');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}
    >

      {/* Dynamic Header Node */}
      <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Settings size={18} color="#2563EB" style={{ flexShrink: 0 }} />
          <div>
            <p className="section-title" style={{ margin: 0 }}>Plans & Feature Permissions</p>
            <p className="section-sub" style={{ margin: 0, marginTop: 2 }}>CRUD billing plans and toggle allowed modules/tabs dynamically</p>
          </div>
        </div>
        {!editingPlan && (
          <button className="btn btn-sm btn-primary" onClick={handleNewClick} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Plus size={14} /> Add New Plan
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {editingPlan ? (
          /* ==========================================
             3. MOBILE FLUID EDIT / CREATE FORM PANEL 
             ========================================== */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card card-pad"
            style={{ width: '100%' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '1.5rem', gap: '1rem' }}>
              <p style={{ fontWeight: 900, fontSize: '.9rem', color: 'var(--text)', margin: 0, tracking: '-0.02em' }}>
                {editingPlan === 'new' ? '🆕 Create a Custom Billing Plan' : `⚙️ Modify Plan: ${editingPlan.name}`}
              </p>
              <button className="btn btn-sm btn-ghost" onClick={() => setEditingPlan(null)} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <X size={14} /> <span style={{ display: 'inline-block' }}>Close</span>
              </button>
            </div>

            {/* Smart Wrapping Form Grid */}
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>

              {/* Left Column: Basics configurations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.05em', marginBottom: '6px', fontFamily: 'monospace' }}>Plan ID / Unique Key</label>
                  <input
                    className="search-input"
                    value={planId}
                    onChange={e => setPlanId(e.target.value)}
                    placeholder="e.g. platinum_pack"
                    required
                    disabled={editingPlan !== 'new'}
                    style={{ width: '100%', height: '40px', borderRadius: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.05em', marginBottom: '6px', fontFamily: 'monospace' }}>Display Name</label>
                  <input
                    className="search-input"
                    value={planName}
                    onChange={e => setPlanName(e.target.value)}
                    placeholder="e.g. Platinum Plus"
                    required
                    style={{ width: '100%', height: '40px', borderRadius: '12px' }}
                  />
                </div>

                {/* Subinner Split Row Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.05em', marginBottom: '6px', fontFamily: 'monospace' }}>Price (₹)</label>
                    <input
                      type="number"
                      className="search-input"
                      value={planPrice}
                      onChange={e => setPlanPrice(e.target.value)}
                      placeholder="e.g. 599"
                      required
                      style={{ width: '100%', height: '40px', borderRadius: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.05em', marginBottom: '6px', fontFamily: 'monospace' }}>Billing Cycle</label>
                    <select
                      value={billingCycle}
                      onChange={e => setBillingCycle(e.target.value)}
                      style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)', fontSize: '.8rem', color: 'var(--text)', outline: 'none' }}
                    >
                      <option value="free">Free / Forever</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.05em', marginBottom: '6px', fontFamily: 'monospace' }}>Plan Features (One per line)</label>
                  <textarea
                    value={featuresText}
                    onChange={e => setFeaturesText(e.target.value)}
                    placeholder="e.g.&#10;Everything in Starter pack&#10;Real-time dashboard&#10;Priority WhatsApp sync loops"
                    style={{ width: '100%', minHeight: '110px', padding: '12px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)', fontSize: '.78rem', color: 'var(--text)', outline: 'none', lineHeight: '1.4' }}
                    required
                  />
                </div>

                {/* Secure Checkbox Layout Assemblies */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '.75rem', fontWeight: 700, color: 'var(--text-2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={requiresApproval}
                      onChange={e => setRequiresApproval(e.target.checked)}
                      style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid var(--border)', flexShrink: 0, marginTop: '1px' }}
                    />
                    <span>Requires Admin approval/review process on tenant registration</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '.75rem', fontWeight: 700, color: 'var(--text-2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={allowMultiBusiness}
                      onChange={e => setAllowMultiBusiness(e.target.checked)}
                      style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid var(--border)', flexShrink: 0, marginTop: '1px' }}
                    />
                    <span>Allow Multi-Business Management (Switch workspaces safely)</span>
                  </label>
                </div>

                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', padding: '12px 16px', borderRadius: '12px', marginTop: '12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800 }}>
                  <Save size={15} /> Save Plan Configuration
                </button>
              </div>

              {/* Right Column: Allowed Tab Permissions checklist cluster */}
              <div className="card" style={{ padding: '16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '20px', maxHeight: '460px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontWeight: 900, fontSize: '.78rem', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '8px', margin: 0, fontFamily: 'monospace' }}>
                  🛡️ Tab Permissions Grid ({selectedTabs.length} selected)
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {TABS_REGISTRY.map(tab => {
                    const hasTab = selectedTabs.includes(tab.id);
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleToggleTab(tab.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px', background: hasTab ? '#fff' : 'transparent',
                          border: `1px solid ${hasTab ? '#BFDBFE' : 'transparent'}`,
                          borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                          transition: 'all .15s ease', width: '100%'
                        }}
                      >
                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                          {hasTab ? <CheckSquare size={16} color="#2563EB" /> : <Square size={16} color="#94A3B8" />}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: '.75rem', fontWeight: 800, color: hasTab ? '#1E40AF' : 'var(--text-2)', margin: 0, truncate: true }}>
                            {tab.label}
                          </p>
                          <span style={{ fontSize: '.58rem', color: 'var(--text-3)', background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 4, fontWeight: 700, marginTop: '2px', display: 'inline-block' }}>
                            {tab.group} • {tab.id}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>
          </motion.div>
        ) : (
          /* ==========================================
             4. PLAN LIST RECTANGULAR CARDS RESPONSIVE
             ========================================== */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.25rem', width: '100%' }}
          >
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="card card-pad animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: `4px solid var(--border-2)`, height: '230px', background: 'var(--surface)' }} />
              ))
            ) : plans.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-3)', gridColumn: '1/-1', padding: '3rem', fontSize: '0.8rem', fontStyle: 'italic' }}>No dynamic plans configured in database yet.</p>
            ) : (
              plans.map(p => {
                const features = Array.isArray(p.features) ? p.features : (typeof p.features === 'string' ? JSON.parse(p.features) : []);
                const allowedTabs = typeof p.allowedTabs === 'string' ? JSON.parse(p.allowedTabs) : (p.allowedTabs || []);

                // Beautiful layout tag setups
                let color = '#2563EB';
                let PlanIcon = Sparkles;
                if (p.id === 'starter') { color = '#059669'; PlanIcon = Shield; }
                if (p.id === 'professional' || p.id === 'premium') { color = '#7C3AED'; PlanIcon = Crown; }

                return (
                  <motion.div
                    key={p.id}
                    whileHover={{ y: -3 }}
                    className="card card-pad"
                    style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', borderTop: `4px solid ${color}`, minHeight: '320px', justifyContent: 'space-between' }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontSize: '.58rem', background: '#F1F5F9', border: '1px solid var(--border)', color: 'var(--text-3)', padding: '2px 6px', borderRadius: '6px', textTransform: 'uppercase', fontWeight: 800, fontFamily: 'monospace' }}>
                            KEY: {p.id}
                          </span>
                          <h4 style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--text)', margin: '6px 0 0', tracking: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <PlanIcon size={16} style={{ color: color, flexShrink: 0 }} /> {p.name}
                          </h4>
                        </div>
                        <span style={{ fontSize: '1.2rem', fontWeight: 900, color: color, fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                          ₹{parseFloat(p.price).toFixed(0)}<span style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontStyle: 'normal' }}>/{p.billingCycle === 'free' ? 'free' : p.billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                        </span>
                      </div>

                      <p style={{ fontSize: '.68rem', color: 'var(--text-3)', margin: '8px 0', fontWeight: 700, display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        <span style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>{p.requiresApproval ? '🕐 Manual Review' : '🚀 Auto-Approve'}</span>
                        <span style={{ color: 'var(--border)' }}>•</span>
                        <span style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>{(p.allowMultiBusiness || p.allowmultibusiness) ? '🏢 Multi-Firm' : '👤 Single-Firm'}</span>
                      </p>

                      {/* Allowed items tags ribbon */}
                      <p style={{ mountaineering: 'true', fontWeight: 900, fontSize: '.7rem', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.02em', margin: '12px 0 4px' }}>Allowed Modules ({allowedTabs.length}):</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '4px 0 8px', maxHeight: '75px', overflowY: 'auto', paddingRight: '2px' }}>
                        {allowedTabs.map(t => (
                          <span key={t} style={{ fontSize: '.58rem', background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', padding: '2px 5px', borderRadius: 4, fontWeight: 700, fontFamily: 'monospace' }}>
                            {t}
                          </span>
                        ))}
                      </div>

                      <p style={{ fontWeight: 900, fontSize: '.7rem', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.02em', margin: '12px 0 4px' }}>Included Features:</p>
                      <ul style={{ paddingLeft: '14px', margin: '4px 0 12px', fontSize: '.68rem', color: 'var(--text-3)', fontWeight: 650, display: 'flex', flexDirection: 'column', gap: 4, lineHeight: '1.3' }}>
                        {features.map((f, i) => (
                          <li key={i} style={{ wordBreak: 'break-word' }}>{f}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '8px' }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => handleEditClick(p)} style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center', cursor: 'pointer', fontWeight: 700 }}>
                        <Edit2 size={12} /> Edit Plan
                      </button>
                      {!['starter', 'growth', 'professional'].includes(p.id) && (
                        <button className="btn btn-sm btn-danger-ghost" onClick={() => handleDelete(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', cursor: 'pointer' }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==========================================
         5. SUPPORT CONTACTS CONFIGURATION FORM
         ========================================== */}
      {!editingPlan && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card card-pad"
          style={{ marginTop: '0.5rem', borderTop: '4px solid #2563EB', width: '100%' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            <Settings size={15} color="#2563EB" />
            <p style={{ fontWeight: 900, fontSize: '.88rem', color: 'var(--text)', margin: 0 }}>Platform Support Contacts (Dynamic Config)</p>
          </div>

          <form onSubmit={handleSupportSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.15rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.05em', marginBottom: '6px', fontFamily: 'monospace' }}>Support Telephone Number</label>
              <input
                className="search-input"
                value={supportPhone}
                onChange={e => setSupportPhone(e.target.value)}
                placeholder="e.g. +91 97732 72749"
                required
                style={{ width: '100%', height: '40px', borderRadius: '12px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.05em', marginBottom: '6px', fontFamily: 'monospace' }}>Support Email Address</label>
              <input
                type="email"
                className="search-input"
                value={supportEmail}
                onChange={e => setSupportEmail(e.target.value)}
                placeholder="e.g. jainishdabgar2901@gmail.com"
                required
                style={{ width: '100%', height: '40px', borderRadius: '12px' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button type="submit" disabled={savingSupport} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, height: '40px', padding: '0 20px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>
                <Save size={14} /> {savingSupport ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

    </motion.div>
  );
}