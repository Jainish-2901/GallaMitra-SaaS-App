import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext.jsx';
import { FileText, Clock, Settings, UserCheck, ShieldAlert } from 'lucide-react';

export default function AuditTrailPage() {
  const { fetchAuditLogs } = useAdmin();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    const data = await fetchAuditLogs();
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, [fetchAuditLogs]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={18} color="#2563EB" />
          <div>
            <p className="section-title">Administrative Audit Trail</p>
            <p className="section-sub">Chronological history of platform management actions by Super Admin</p>
          </div>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={loadLogs} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Logs'}
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }} className="animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px', alignItems: 'center' }}>
                <div style={{ width: '120px', height: '12px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                <div style={{ width: '80px', height: '12px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                <div style={{ width: '100px', height: '12px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                <div style={{ flex: 1, marginLeft: '2rem', height: '12px', background: 'var(--border-2)', borderRadius: 4 }}></div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
            No administrative logs recorded.
          </div>
        ) : (
          <>
            <div className="desktop-only-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action Type</th>
                    <th>Target Event Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const date = new Date(log.createdat || log.createdAt);
                    return (
                      <tr key={log.id}>
                        <td className="mono" style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>
                          {date.toLocaleString('en-IN')}
                        </td>
                        <td style={{ fontWeight: 800 }}>
                          <span className="badge badge-blue">{log.actor}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, fontSize: '.72rem', textTransform: 'uppercase', color: '#1E293B' }}>
                            {log.type?.replace('ADMIN_', '')?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, fontSize: '.75rem', color: 'var(--text)' }}>
                          {log.target}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mobile-only-card-list">
              {logs.map(log => {
                const date = new Date(log.createdat || log.createdAt);
                return (
                  <div key={log.id} className="mobile-card">
                    <div className="mobile-card-row" style={{ borderBottom: '1px dashed var(--border)', paddingBottom: '6px', marginBottom: '4px' }}>
                      <span className="mobile-card-title" style={{ textTransform: 'uppercase', color: '#1E293B', fontSize: '0.72rem' }}>
                        {log.type?.replace('ADMIN_', '')?.replace(/_/g, ' ')}
                      </span>
                      <span className="badge badge-blue" style={{ fontSize: '0.6rem' }}>{log.actor}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Timestamp</span>
                      <span className="mobile-card-value mono" style={{ fontSize: '0.68rem' }}>{date.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="mobile-card-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', marginTop: '4px' }}>
                      <span className="mobile-card-label">Details</span>
                      <span className="mobile-card-value" style={{ fontSize: '0.75rem', lineHeight: '1.4', textAlign: 'left' }}>{log.target}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
