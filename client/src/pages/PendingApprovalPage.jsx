import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { Clock, ShieldCheck, Mail, RefreshCw, LogOut, CheckCircle, Zap, Star } from 'lucide-react';
import { getPlanMeta } from '../sidebarConfig.js';
import { AppContext } from '../context/AppContext.jsx';

export default function PendingApprovalPage({ shop, onLogout, onRefresh }) {
  const { plans } = useContext(AppContext);
  const [checking, setChecking] = useState(false);
  const PLAN_META = getPlanMeta(plans);
  const plan = PLAN_META[shop?.plan] || { label: shop?.plan || 'Starter', price: '₹0', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };

  const handleCheck = async () => {
    setChecking(true);
    await onRefresh?.();
    setTimeout(() => setChecking(false), 1200);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #EFF6FF 0%, #F8FAFC 60%, #F0FDF4 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', fontFamily: 'Inter, sans-serif'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 520 }}
      >
        {/* Main card */}
        <div style={{
          background: '#fff', borderRadius: 28,
          border: '1px solid #E2E8F0',
          boxShadow: '0 10px 40px rgba(0,0,0,.08)',
          padding: '2.5rem', textAlign: 'center'
        }}>
          {/* Animated Clock Icon */}
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            style={{
              width: 72, height: 72,
              background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
              border: '2px solid #FDE68A',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}
          >
            <Clock size={32} color="#D97706" />
          </motion.div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A', marginBottom: 8 }}>
            Your Workspace Is Under Review
          </h1>
          <p style={{ fontSize: '.82rem', color: '#64748B', lineHeight: 1.6, fontWeight: 500, maxWidth: 380, margin: '0 auto 1.5rem' }}>
            Our team is reviewing your registration. You'll be able to log in and start working once approved — usually within <strong>a few hours</strong>.
          </p>

          {/* Shop info */}
          <div style={{
            background: '#F8FAFC', border: '1px solid #E2E8F0',
            borderRadius: 16, padding: '1rem 1.25rem',
            marginBottom: '1.25rem', textAlign: 'left'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                { label: 'Business Name', value: shop?.businessName || shop?.businessname },
                { label: 'Owner',         value: shop?.ownerName || shop?.ownername },
                { label: 'Email',         value: shop?.email },
                { label: 'Selected Plan', value: plan.label },
              ].map(row => (
                <div key={row.label}>
                  <p style={{ fontSize: '.6rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 2 }}>{row.label}</p>
                  <p style={{ fontSize: '.78rem', fontWeight: 700, color: '#1E293B' }}>{row.value || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Plan badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: plan.bg, border: `1px solid ${plan.border}`,
            borderRadius: 999, padding: '6px 16px',
            marginBottom: '1.5rem'
          }}>
            <ShieldCheck size={14} color={plan.color} />
            <span style={{ fontSize: '.72rem', fontWeight: 800, color: plan.color }}>
              {plan.label} Plan — {plan.price}
            </span>
          </div>

          {/* Status steps */}
          <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            {[
              { step: '1', label: 'Registration submitted', done: true },
              { step: '2', label: 'Admin review in progress', done: false, active: true },
              { step: '3', label: 'Account activated & ready', done: false },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: s.done ? '#059669' : s.active ? '#FEF3C7' : '#F1F5F9',
                  border: `2px solid ${s.done ? '#A7F3D0' : s.active ? '#FDE68A' : '#E2E8F0'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {s.done
                    ? <CheckCircle size={14} color="#fff" fill="#059669" />
                    : <span style={{ fontSize: '.65rem', fontWeight: 800, color: s.active ? '#D97706' : '#94A3B8' }}>{s.step}</span>
                  }
                </div>
                <p style={{ fontSize: '.78rem', fontWeight: s.active ? 700 : 600, color: s.active ? '#0F172A' : s.done ? '#059669' : '#94A3B8' }}>
                  {s.label}
                  {s.active && <span style={{ marginLeft: 6, fontSize: '.65rem', color: '#D97706' }}>← You are here</span>}
                </p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              id="pending-check-btn"
              onClick={handleCheck}
              disabled={checking}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: '#2563EB', border: 'none', borderRadius: 14,
                padding: '12px', fontSize: '.82rem', fontWeight: 800, color: '#fff',
                cursor: checking ? 'not-allowed' : 'pointer',
                opacity: checking ? .7 : 1,
                boxShadow: '0 4px 12px rgba(37,99,235,.3)',
                transition: 'all .2s'
              }}
            >
              <RefreshCw size={15} style={{ animation: checking ? 'spin 1s linear infinite' : 'none' }} />
              {checking ? 'Checking...' : 'Check Status'}
            </button>
            <button
              id="pending-logout-btn"
              onClick={onLogout}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: '#F1F5F9', border: '1px solid #E2E8F0',
                borderRadius: 14, padding: '12px', fontSize: '.82rem',
                fontWeight: 700, color: '#64748B', cursor: 'pointer'
              }}
            >
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', fontSize: '.68rem', color: '#94A3B8', marginTop: '1.25rem', fontWeight: 500 }}>
          📩 You'll receive an email at <strong>{shop?.email}</strong> once your account is approved.
        </p>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
