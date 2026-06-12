import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext.jsx';
import { Database, Activity, HardDrive, Cpu, ShieldCheck } from 'lucide-react';

export default function DbHealthPage() {
  const { fetchDbHealth } = useAdmin();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadHealth = async () => {
    setLoading(true);
    setError(null);
    const data = await fetchDbHealth();
    if (data && data.success) {
      setHealth(data);
    } else {
      setError((data && data.error) || 'Unable to establish direct session with database cluster. Check connection string inside backend .env.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadHealth();
  }, [fetchDbHealth]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={18} color="#2563EB" />
          <div>
            <p className="section-title">Database Storage & Latency health</p>
            <p className="section-sub">Active row allocations and Neon serverless storage footprint metrics</p>
          </div>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={loadHealth} disabled={loading}>
          {loading ? 'Analyzing...' : 'Re-Run Diagnostics'}
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Quick Metrics Skeleton */}
          <div className="grid-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--surface)' }}>
                <div style={{ width: 42, height: 42, background: 'var(--surface-2)', borderRadius: 12 }}></div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ width: '60px', height: '10px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                  <div style={{ width: '90px', height: '16px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                </div>
              </div>
            ))}
          </div>
          {/* Table skeleton */}
          <div className="card" style={{ background: 'var(--surface)' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: '150px', height: '12px', background: 'var(--border-2)', borderRadius: 4 }}></div>
            </div>
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  <div style={{ width: '120px', height: '12px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                  <div style={{ width: '80px', height: '12px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                  <div style={{ width: '60px', height: '12px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="card card-pad" style={{ textAlign: 'center', color: '#E11D48', fontWeight: 600 }}>
          🚨 {error}
        </div>
      ) : (
        <>
          {/* Quick Metrics */}
          <div className="grid-4">
            <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 42, height: 42, background: '#EFF6FF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HardDrive size={18} color="#2563EB" />
              </div>
              <div>
                <p style={{ fontSize: '.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Database Size</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text)', margin: '2px 0 0' }}>{health.dbSize}</p>
              </div>
            </div>

            <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 42, height: 42, background: '#ECFDF5', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={18} color="#059669" />
              </div>
              <div>
                <p style={{ fontSize: '.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Query Latency</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 900, color: '#059669', margin: '2px 0 0' }}>{health.dbLatency}</p>
              </div>
            </div>

            <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 42, height: 42, background: '#F5F3FF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Cpu size={18} color="#7C3AED" />
              </div>
              <div>
                <p style={{ fontSize: '.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Target Database</p>
                <p style={{ fontSize: '.85rem', fontWeight: 900, color: 'var(--text)', margin: '5px 0 0', fontFamily: 'mono' }}>{health.dbName}</p>
              </div>
            </div>

            <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 42, height: 42, background: '#ECFEFF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={18} color="#0891B2" />
              </div>
              <div>
                <p style={{ fontSize: '.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>Tenant Indexing</p>
                <p style={{ fontSize: '.85rem', fontWeight: 900, color: '#0891B2', margin: '5px 0 0' }}>Safe / Optimised</p>
              </div>
            </div>
          </div>

          {/* Table list */}
          <div className="card">
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 800, fontSize: '.85rem', color: 'var(--text)' }}>Table Row Allocation Sizing</p>
            </div>
            <div className="desktop-only-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Table Entity Name</th>
                    <th>Row Allocation Count</th>
                    <th>Total Table Sizing (with indexes)</th>
                  </tr>
                </thead>
                <tbody>
                  {health.tables?.map(t => (
                    <tr key={t.name}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '.8rem', color: '#4F46E5' }}>
                        "{t.name}"
                      </td>
                      <td style={{ fontWeight: 800, fontSize: '.82rem' }}>
                        {t.rows.toLocaleString()} rows
                      </td>
                      <td className="mono" style={{ fontSize: '.78rem', color: 'var(--text-2)', fontWeight: 650 }}>
                        {t.size}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-only-card-list">
              {health.tables?.map(t => (
                <div key={t.name} className="mobile-card">
                  <div className="mobile-card-row" style={{ borderBottom: '1px dashed var(--border)', paddingBottom: '6px', marginBottom: '4px' }}>
                    <span className="mobile-card-title" style={{ fontFamily: 'monospace', color: '#4F46E5', fontSize: '0.8rem' }}>"{t.name}"</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Row Count</span>
                    <span className="mobile-card-value">{t.rows.toLocaleString()} rows</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Total Sizing</span>
                    <span className="mobile-card-value mono">{t.size}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
