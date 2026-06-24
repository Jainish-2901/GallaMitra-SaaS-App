import React, { useState, useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Building2, User, Mail, Phone, Lock, Eye, EyeOff,
  ShieldCheck, CheckCircle, Star, Zap, Crown, ArrowRight, ArrowLeft, Clock
} from 'lucide-react';
import { AppContext } from '../../context/AppContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

// ─── Plan selection step ───────────────────────────────────────────────────────
function PlanCard({ plan, selected, onSelect, index }) {
  const isPaid = parseFloat(plan.price) > 0;
  
  // Custom styles depending on plan price range
  let color = '#2563EB'; // Blue (Growth/Default)
  let bg = '#EFF6FF';
  let border = '#BFDBFE';
  
  if (parseFloat(plan.price) === 0) {
    color = '#059669'; // Emerald (Starter/Free)
    bg = '#ECFDF5';
    border = '#A7F3D0';
  } else if (parseFloat(plan.price) >= 200) {
    color = '#7C3AED'; // Purple (Professional/Premium)
    bg = '#F5F3FF';
    border = '#DDD6FE';
  }

  const icons = [Star, Zap, Crown];
  const Icon = icons[index % icons.length] || Crown;

  const features = Array.isArray(plan.features) ? plan.features : (typeof plan.features === 'string' ? JSON.parse(plan.features) : []);

  return (
    <button
      type="button"
      id={`plan-${plan.id}`}
      onClick={() => onSelect(plan.id)}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: selected ? bg : '#F8FAFC',
        border: `2px solid ${selected ? color : '#E2E8F0'}`,
        borderRadius: 16, padding: '1rem',
        transition: 'all .15s',
        boxShadow: selected ? `0 4px 14px ${color}20` : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 34, height: 34, background: selected ? color : '#E2E8F0', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={17} color={selected ? '#fff' : '#94A3B8'} />
        </div>
        <div>
          <p style={{ fontSize: '.82rem', fontWeight: 900, color: selected ? color : '#334155' }}>{plan.name}</p>
          <p style={{ fontSize: '.68rem', fontWeight: 800, color: selected ? color : '#94A3B8' }}>
            ₹{parseFloat(plan.price).toFixed(0)}{plan.billingCycle === 'free' ? ' (Free)' : (plan.billingCycle === 'trial' ? ' (15 Days Trial)' : `/${plan.billingCycle === 'yearly' ? 'yr' : plan.billingCycle === '3_months' ? '3mo' : plan.billingCycle === '6_months' ? '6mo' : 'mo'}`)}
          </p>
        </div>
        {selected && <CheckCircle size={16} color={color} style={{ marginLeft: 'auto' }} />}
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {features.map(f => (
          <li key={f} style={{ fontSize: '.65rem', fontWeight: 600, color: selected ? color : '#64748B', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <span style={{ color: selected ? color : '#CBD5E1' }}>✓</span> {f}
          </li>
        ))}
      </ul>
    </button>
  );
}

// ─── Main multi-step form ──────────────────────────────────────────────────────
export default function RegisterForm({ onSwitchToLogin, onClose }) {
  const { registerShopOwner, loading, plans } = useContext(AppContext);
  const toast = useToast();

  const [step, setStep] = useState(1); // 1 = plan select, 2 = details
  const [selectedPlan, setSelectedPlan] = useState('starter');

  const [bizName, setBizName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const passwordMismatch = confirm.length > 0 && password !== confirm;

  // Auto-select first plan when loaded
  useEffect(() => {
    if (plans && plans.length > 0 && !plans.find(p => p.id === selectedPlan)) {
      setSelectedPlan(plans[0].id);
    }
  }, [plans, selectedPlan]);

  const activePlanObj = plans?.find(p => p.id === selectedPlan) || {
    id: 'starter', name: 'Starter', price: 0, billingCycle: 'free', requiresApproval: false
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    const res = await registerShopOwner(bizName.trim(), ownerName.trim(), email.trim(), phone.trim(), password, selectedPlan);
    if (res.success) {
      if (res.pending) {
        toast.info(`Registration submitted! Your workspace is under review. 🕐`);
      } else {
        toast.success(`Workspace "${res.shop?.businessName || bizName}" created! 🎉`);
      }
      onClose?.();
    } else {
      setError(res.error || 'Registration failed. Please try again.');
      toast.error(res.error || 'Registration failed');
    }
  };

  // Dynamic values for selected plan details
  const activePlanIsPaid = parseFloat(activePlanObj.price) > 0;
  let activePlanColor = '#2563EB';
  let activePlanBg = '#EFF6FF';
  let activePlanBorder = '#BFDBFE';
  if (parseFloat(activePlanObj.price) === 0) {
    activePlanColor = '#059669';
    activePlanBg = '#ECFDF5';
    activePlanBorder = '#A7F3D0';
  } else if (parseFloat(activePlanObj.price) >= 200) {
    activePlanColor = '#7C3AED';
    activePlanBg = '#F5F3FF';
    activePlanBorder = '#DDD6FE';
  }

  const renderSelectedPrice = `₹${parseFloat(activePlanObj.price).toFixed(0)}${activePlanObj.billingCycle === 'free' ? ' (Free)' : (activePlanObj.billingCycle === 'trial' ? ' (15 Days Trial)' : `/${activePlanObj.billingCycle === 'yearly' ? 'yr' : activePlanObj.billingCycle === '3_months' ? '3mo' : activePlanObj.billingCycle === '6_months' ? '6mo' : 'mo'}`)}`;

  return (
    <div>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
        {[
          { n: 1, label: 'Choose Plan' },
          { n: 2, label: 'Your Details' },
        ].map((s, i) => (
          <React.Fragment key={s.n}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: step >= s.n ? '#2563EB' : '#E2E8F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {step > s.n
                  ? <CheckCircle size={14} color="#fff" fill="#2563EB" />
                  : <span style={{ fontSize: '.65rem', fontWeight: 900, color: step >= s.n ? '#fff' : '#94A3B8' }}>{s.n}</span>
                }
              </div>
              <span style={{ fontSize: '.7rem', fontWeight: step === s.n ? 800 : 600, color: step === s.n ? '#0F172A' : '#94A3B8' }}>{s.label}</span>
            </div>
            {i === 0 && <div style={{ flex: 1, height: 2, background: step > 1 ? '#2563EB' : '#E2E8F0', borderRadius: 999 }} />}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── STEP 1: Plan Selection ── */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <p style={{ fontSize: '.72rem', fontWeight: 700, color: '#64748B', marginBottom: '1rem' }}>
              Choose the plan that fits your business. You can upgrade anytime.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginBottom: '1rem' }}>
              {(plans && plans.length > 0 ? plans : [
                { id: 'starter', name: 'Starter', price: 0, billingCycle: 'free', features: ['Dashboard & Overview', 'Customers & Suppliers'] }
              ]).map((plan, idx) => (
                <PlanCard key={plan.id} plan={plan} selected={selectedPlan === plan.id} onSelect={setSelectedPlan} index={idx} />
              ))}
            </div>

            {/* Approval notice */}
            <div style={{ background: activePlanObj.requiresApproval ? '#FFFBEB' : '#ECFDF5', border: `1px solid ${activePlanObj.requiresApproval ? '#FDE68A' : '#A7F3D0'}`, borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: '1rem' }}>
              <Clock size={14} color={activePlanObj.requiresApproval ? '#D97706' : '#059669'} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: '.68rem', color: activePlanObj.requiresApproval ? '#92400E' : '#047857', fontWeight: 600, lineHeight: 1.5 }}>
                {activePlanObj.requiresApproval ? (
                  <>
                    <strong>Plan requires review.</strong> After registration, the admin team reviews your account and approves it. You will receive an email verification code.
                  </>
                ) : (
                  <>
                    <strong>Instant Access!</strong> This plan does not require administrator approval. You can access all ledger modules immediately after signing up!
                  </>
                )}
              </p>
            </div>

            <button
              type="button"
              id="plan-next-btn"
              onClick={() => setStep(2)}
              style={{
                width: '100%', background: '#2563EB', border: 'none', borderRadius: 14,
                padding: '12px', fontSize: '.85rem', fontWeight: 900, color: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 12px rgba(37,99,235,.3)'
              }}
            >
              Continue with {activePlanObj.name} <ArrowRight size={16} />
            </button>

            <p className="text-center text-xs text-slate-500 font-medium" style={{ marginTop: '.75rem', textAlign: 'center', fontSize: '.75rem', color: '#94A3B8' }}>
              Already have a workspace?{' '}
              <button type="button" onClick={onSwitchToLogin} style={{ color: '#2563EB', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                Sign in →
              </button>
            </p>
          </motion.div>
        )}

        {/* ── STEP 2: Details Form ── */}
        {step === 2 && (
          <motion.form key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleRegister}>

            {/* Error Banner */}
            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2"
                style={{ marginBottom: '1rem' }}
              >
                <span>⚠️</span> {error}
              </motion.div>
            )}

            {/* Selected plan chip */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: activePlanBg, border: `1px solid ${activePlanBorder}`, borderRadius: 999, padding: '4px 12px' }}>
                <ShieldCheck size={12} color={activePlanColor} />
                <span style={{ fontSize: '.65rem', fontWeight: 800, color: activePlanColor }}>
                  {activePlanObj.name} — {renderSelectedPrice}
                </span>
              </div>
              <button type="button" onClick={() => setStep(1)} style={{ fontSize: '.65rem', fontWeight: 700, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ArrowLeft size={11} /> Change
              </button>
            </div>

            <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {/* Business Name + Owner Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.6rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Business Name *</label>
                  <div style={{ position: 'relative' }}>
                    <Building2 size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                    <input id="reg-biz-name" type="text" required value={bizName} onChange={e => setBizName(e.target.value)} placeholder="My Shop" autocomplete="organization"
                      style={{ width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 12, paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, fontSize: '.78rem', fontWeight: 600, color: '#1E293B', outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.6rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Owner Name *</label>
                  <div style={{ position: 'relative' }}>
                    <User size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                    <input id="reg-owner-name" type="text" required value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Your Name" autocomplete="name"
                      style={{ width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 12, paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, fontSize: '.78rem', fontWeight: 600, color: '#1E293B', outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '.6rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Email *</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input id="reg-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="owner@example.com" autocomplete="email"
                    style={{ width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 12, paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, fontSize: '.8rem', fontWeight: 600, color: '#1E293B', outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label style={{ display: 'block', fontSize: '.6rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Mobile</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input id="reg-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" autocomplete="tel"
                    style={{ width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 12, paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, fontSize: '.8rem', fontWeight: 600, color: '#1E293B', outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>

              {/* Password grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.6rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Password *</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                    <input id="reg-password" type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 chars" autocomplete="new-password"
                      style={{ width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 12, paddingLeft: 34, paddingRight: 34, paddingTop: 9, paddingBottom: 9, fontSize: '.78rem', fontWeight: 600, color: '#1E293B', outline: 'none', fontFamily: 'inherit' }} />
                    <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                      {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.6rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Confirm *</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                    <input id="reg-confirm" type={showPass ? 'text' : 'password'} required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter" autocomplete="new-password"
                      style={{ width: '100%', background: '#F8FAFC', border: `1.5px solid ${passwordMismatch ? '#F43F5E' : '#E2E8F0'}`, borderRadius: 12, paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, fontSize: '.78rem', fontWeight: 600, color: passwordMismatch ? '#E11D48' : '#1E293B', outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                  {passwordMismatch && <p style={{ fontSize: '.6rem', color: '#E11D48', fontWeight: 700, marginTop: 3 }}>Don't match</p>}
                </div>
              </div>

              {/* Security note */}
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <ShieldCheck size={14} color="#2563EB" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '.65rem', color: '#1D4ED8', fontWeight: 600 }}>Password hashed with bcrypt-12 — never stored in plain text.</p>
              </div>
            </div>

            <button
              id="reg-submit-btn"
              type="submit"
              disabled={loading || passwordMismatch}
              style={{
                marginTop: '1rem', width: '100%',
                background: loading || passwordMismatch ? '#93C5FD' : '#2563EB',
                border: 'none', borderRadius: 14, padding: '13px',
                fontSize: '.85rem', fontWeight: 900, color: '#fff',
                cursor: loading || passwordMismatch ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 12px rgba(37,99,235,.25)'
              }}
            >
              {loading ? (
                <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }} /> Submitting...</>
              ) : activePlanObj.requiresApproval ? (
                <><UserPlus size={15} /> Submit for Review</>
              ) : (
                <><UserPlus size={15} /> Register & Access Workspace</>
              )}
            </button>

            <p style={{ textAlign: 'center', fontSize: '.72rem', color: '#94A3B8', marginTop: '.75rem' }}>
              Already have a workspace?{' '}
              <button type="button" onClick={onSwitchToLogin} style={{ color: '#2563EB', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>Sign in →</button>
            </p>
          </motion.form>
        )}
      </AnimatePresence>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
