import React from 'react';
import { motion } from 'framer-motion';
import { useAdmin } from '../context/AdminContext.jsx';
import {
  Store, Users, FileText, Database, TrendingUp, Activity,
  BarChart3, PieChart
} from 'lucide-react';

export default function StatsPage() {
  const { shops, stats, loading } = useAdmin();

  // ==========================================
  // 1. NATIVE THEMED SKELETON LOADING
  // ==========================================
  if (loading) {
    return (
      <div className="fade-in animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* KPI Cards Skeleton */}
        <div className="grid-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="stat-card" style={{ background: 'var(--surface)' }}>
              <div className="stat-icon" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}></div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ width: '80px', height: '10px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                <div style={{ width: '40px', height: '16px', background: 'var(--border-2)', borderRadius: 4 }}></div>
              </div>
            </div>
          ))}
        </div>
        {/* Chart Skeleton */}
        <div className="card card-pad" style={{ background: 'var(--surface)', height: '220px' }}></div>
        {/* Status Breakdown Skeleton */}
        <div className="card card-pad" style={{ background: 'var(--surface)', height: '150px' }}></div>
      </div>
    );
  }

  const items = [
    { label: 'Registered Shops', value: stats?.totalShops ?? shops.length, icon: Store, color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Total Customers', value: stats?.totalCustomers ?? '—', icon: Users, color: '#7C3AED', bg: '#F5F3FF' },
    { label: 'Total Suppliers', value: stats?.totalSuppliers ?? '—', icon: Activity, color: '#0891B2', bg: '#ECFEFF' },
    { label: 'Total Invoices', value: stats?.totalInvoices ?? '—', icon: FileText, color: '#D97706', bg: '#FFFBEB' },
    { label: 'Ledger Entries', value: stats?.totalLedger ?? '—', icon: Database, color: '#059669', bg: '#ECFDF5' },
    { label: 'Purchase Bills', value: stats?.totalPurchaseBills ?? '—', icon: TrendingUp, color: '#E11D48', bg: '#FFF1F2' },
  ];

  // Compute weekly activity track
  const barData = [45, 72, 58, 91, 67, 84, 79];

  // Framer Motion Animation Settings
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.03 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}
    >

      {/* KPI Cards Framework Row */}
      <div className="grid-3">
        {items.map(it => {
          const SIcon = it.icon;
          return (
            <motion.div
              key={it.label}
              variants={cardVariants}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              className="stat-card"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              <div className="stat-icon" style={{ background: it.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <SIcon size={20} color={it.color} />
              </div>
              <div>
                <p className="stat-label" style={{ margin: 0 }}>{it.label}</p>
                <p className="stat-value" style={{ color: it.color, margin: 0, marginTop: 2 }}>{it.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Interactive Bar Chart Section */}
      <div className="card card-pad" style={{ width: '100%', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
          <BarChart3 size={18} color="#2563EB" />
          <div>
            <p className="section-title" style={{ margin: 0 }}>Weekly Platform Activity</p>
            <p className="section-sub" style={{ margin: 0, marginTop: 2 }}>Simulated weekly transaction volume trend across firms</p>
          </div>
        </div>

        {/* Fixed Flex Container Gap Specification using standard Tailwind classes along with style overrides */}
        <div className="gap-1.5 sm:gap-2" style={{ display: 'flex', alignItems: 'flex-end', height: 150, padding: '0 4px', width: '100%' }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
            <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>

              {/* Animated Interactive Bar */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${barData[idx]}%` }}
                transition={{ duration: 0.6, delay: idx * 0.04, ease: 'easeOut' }}
                whileHover={{ scaleX: 1.05, filter: 'brightness(0.95)' }}
                style={{
                  width: '100%',
                  borderRadius: '6px 6px 0 0',
                  background: idx === 3 ? '#2563EB' : '#BFDBFE',
                  cursor: 'pointer',
                  minHeight: 8,
                }}
                title={`${day}: ${barData[idx]}%`}
              />
              <span style={{ fontSize: '.6rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tenant Status Breakdown Section */}
      <div className="card card-pad" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
          <PieChart size={18} color="#2563EB" />
          <p className="section-title" style={{ margin: 0 }}>Tenant Status Breakdown</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%' }}>
          {[
            { label: 'Active Tenants', value: shops.filter(s => s.isactive !== false).length, color: '#059669', bg: '#ECFDF5', border: '1px solid #A7F3D0' },
            { label: 'Suspended Tenants', value: shops.filter(s => s.isactive === false).length, color: '#E11D48', bg: '#FFF1F2', border: '1px solid #FDA4AF' },
            { label: 'Total Registered', value: shops.length, color: '#2563EB', bg: '#EFF6FF', border: '1px solid #BFDBFE' },
          ].map(row => (
            <motion.div
              key={row.label}
              whileHover={{ y: -2 }}
              style={{
                background: row.bg,
                border: row.border,
                borderRadius: 16,
                padding: '1rem 1.25rem',
                flex: '1 1 calc(33.333% - 1rem)',
                minWidth: 150,
                boxShadow: 'var(--shadow-xs)'
              }}
            >
              <p style={{ fontSize: '.6rem', fontWeight: 900, color: row.color, textTransform: 'uppercase', letterSpacing: '.08em', margin: 0, marginBottom: 4, fontFamily: 'monospace' }}>{row.label}</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 900, color: row.color, fontFamily: 'JetBrains Mono, monospace', margin: 0, tracking: '-0.03em' }}>{row.value}</p>
            </motion.div>
          ))}
        </div>
      </div>

    </motion.div>
  );
}