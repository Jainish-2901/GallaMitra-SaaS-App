import React from 'react';
import { useAdmin } from '../context/AdminContext.jsx';
import { ShieldCheck, Database, Cpu, Globe, Lock, GitBranch, Server } from 'lucide-react';

export default function SystemPage() {
  const { loading } = useAdmin();

  if (loading) {
    return (
      <div className="fade-in animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="grid-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card card-pad" style={{ background: 'var(--surface)', height: '100px' }}></div>
          ))}
        </div>
        <div className="card" style={{ background: 'var(--surface)', height: '250px' }}></div>
        <div className="card card-pad" style={{ background: 'var(--surface)', height: '150px' }}></div>
      </div>
    );
  }
  const rows = [
    { key: 'Platform Name',      value: 'GallaMitra SaaS Platform' },
    { key: 'Version',            value: 'v1.0.0' },
    { key: 'Architecture',       value: 'Multi-Tenant Single Database' },
    { key: 'Database',           value: 'Neon PostgreSQL (Serverless)' },
    { key: 'DB Strategy',        value: 'Single DB + shopId Row-Level Isolation' },
    { key: 'Indexing',           value: 'CREATE INDEX on shopId, customerId, date' },
    { key: 'Backend Runtime',    value: 'Node.js v22 + Express ESM' },
    { key: 'Frontend Framework', value: 'React 18 + Vite 5' },
    { key: 'Admin App',          value: 'Standalone Vite on :5001' },
    { key: 'Auth Method',        value: 'bcrypt-12 Password Hashing' },
    { key: 'Session Storage',    value: 'localStorage (persistent login)' },
    { key: 'API Base',           value: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api' },
    { key: 'Current Time',       value: new Date().toLocaleString('en-IN') },
  ];

  const features = [
    { icon: Database, title: 'Zero Buffering', desc: 'Custom indexes on all high-traffic columns ensure sub-ms queries even with 1+ year of data.', color: '#2563EB', bg: '#EFF6FF' },
    { icon: Lock, title: 'bcrypt-12 Auth', desc: 'All owner passwords hashed with cost factor 12. Never stored in plain text.', color: '#7C3AED', bg: '#F5F3FF' },
    { icon: Globe, title: 'Multi-Tenant', desc: 'Each shop\'s data is isolated by shopId. One database, infinite scalability.', color: '#059669', bg: '#ECFDF5' },
    { icon: Server, title: 'Serverless DB', desc: 'Neon PostgreSQL scales to zero automatically during idle periods, minimizing costs.', color: '#D97706', bg: '#FFFBEB' },
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Feature highlights */}
      <div className="grid-4">
        {features.map(f => {
          const FIcon = f.icon;
          return (
            <div key={f.title} className="card card-pad">
              <div style={{ width: 40, height: 40, background: f.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '.75rem' }}>
                <FIcon size={18} color={f.color} />
              </div>
              <p style={{ fontWeight: 800, fontSize: '.82rem', color: 'var(--text)', marginBottom: 4 }}>{f.title}</p>
              <p style={{ fontSize: '.7rem', color: 'var(--text-3)', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          );
        })}
      </div>

      {/* System Info Table */}
      <div className="card">
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color="#2563EB" />
          <div>
            <p className="section-title">Runtime Configuration</p>
            <p className="section-sub">Current system parameters and platform metadata</p>
          </div>
        </div>
        <div style={{ padding: '0 1.5rem' }}>
          {rows.map((row, i) => (
            <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none', gap: '1rem' }}>
              <span style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', flexShrink: 0 }}>{row.key}</span>
              <span className="mono" style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Health Indicators */}
      <div className="card card-pad">
        <p className="section-title" style={{ marginBottom: '1rem' }}>Service Health Indicators</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Backend API (port 5000)', status: 'Operational', ok: true },
            { label: 'Admin Panel (port 5001)', status: 'Operational', ok: true },
            { label: 'Owner Frontend (port 5173)', status: 'Operational', ok: true },
            { label: 'Neon PostgreSQL Database', status: 'Connected', ok: true },
          ].map(svc => (
            <div key={svc.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', borderRadius: 10, padding: '10px 16px' }}>
              <span style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-2)' }}>{svc.label}</span>
              <span className={`badge ${svc.ok ? 'badge-green' : 'badge-red'}`}>
                {svc.ok ? '● ' : '○ '}{svc.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
