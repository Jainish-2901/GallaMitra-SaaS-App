import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext.jsx';
import {
  Activity, Clock, User, Store, Plus, Trash2, Edit2, FileText,
  Receipt, Database, ShieldAlert, Key, HelpCircle
} from 'lucide-react';

// Maps activity type to an icon and styling configuration
const getActivityStyle = (type) => {
  const t = type || '';
  if (t.includes('REGISTERED')) return { icon: Store, color: '#2563EB', bg: '#EFF6FF' };
  if (t.includes('APPROVED')) return { icon: Store, color: '#059669', bg: '#ECFDF5' };
  if (t.includes('SUSPENDED') || t.includes('REJECTED')) return { icon: ShieldAlert, color: '#E11D48', bg: '#FFF1F2' };
  if (t.includes('INVOICE_CREATED')) return { icon: Plus, color: '#059669', bg: '#ECFDF5' };
  if (t.includes('INVOICE_DELETED')) return { icon: Trash2, color: '#E11D48', bg: '#FFF1F2' };
  if (t.includes('INVOICE_EDITED')) return { icon: Edit2, color: '#D97706', bg: '#FFFBEB' };
  if (t.includes('CUSTOMER') || t.includes('SUPPLIER')) return { icon: User, color: '#7C3AED', bg: '#F5F3FF' };
  if (t.includes('RECEIPT')) return { icon: Receipt, color: '#0891B2', bg: '#ECFEFF' };
  if (t.includes('PURCHASE')) return { icon: FileText, color: '#0F172A', bg: '#F1F5F9' };
  if (t.includes('LEDGER') || t.includes('MANUAL')) return { icon: Database, color: '#D97706', bg: '#FFFBEB' };
  if (t.includes('PASSWORD') || t.includes('OTP')) return { icon: Key, color: '#4F46E5', bg: '#EEF2FF' };

  return { icon: HelpCircle, color: '#64748B', bg: '#F8FAFC' };
};

export default function ActivityPage() {
  const { fetchActivities } = useAdmin();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const data = await fetchActivities();
    setActivities(data);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, [fetchActivities]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={18} color="#2563EB" />
          <div>
            <p className="section-title">Platform Activity Log</p>
            <p className="section-sub">Real-time stream of operations logged by SaaS tenants (last 100 entries)</p>
          </div>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={reload} disabled={loading}>
          {loading ? 'Refreshing...' : 'Force Refresh'}
        </button>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }} className="animate-pulse">
            {[1, 2, 3, 4, 5].map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', gap: '1rem', paddingBottom: '1.5rem',
                  borderLeft: i < 4 ? '2px solid var(--border)' : 'none',
                  marginLeft: '20px', paddingLeft: '1.25rem', position: 'relative',
                }}
              >
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute', left: -21, top: 0,
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'var(--border-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                </div>
                <div style={{ paddingTop: 6, flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ width: '150px', height: '12px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                      <div style={{ width: '250px', height: '10px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                      <div style={{ width: '100px', height: '8px', background: 'var(--border-2)', borderRadius: 4, marginTop: 4 }}></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, width: '80px' }}>
                      <div style={{ width: '60px', height: '10px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                      <div style={{ width: '40px', height: '8px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>
            No tenant actions logged in database yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {activities.map((ev, i) => {
              const { icon: EvIcon, color, bg } = getActivityStyle(ev.type);
              const date = new Date(ev.createdat || ev.createdAt);
              const mins = Math.round((Date.now() - date.getTime()) / 60000);

              let timeLabel = '';
              if (mins < 1) timeLabel = 'Just now';
              else if (mins < 60) timeLabel = `${mins}m ago`;
              else if (mins < 24 * 60) timeLabel = `${Math.round(mins / 60)}h ago`;
              else timeLabel = date.toLocaleDateString('en-IN');

              return (
                <div
                  key={ev.id}
                  style={{
                    display: 'flex', gap: '1rem', paddingBottom: '1.5rem',
                    borderLeft: i < activities.length - 1 ? '2px solid var(--border)' : 'none',
                    marginLeft: '20px', paddingLeft: '1.25rem', position: 'relative',
                  }}
                >
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute', left: -21, top: 0,
                    width: 38, height: 38, borderRadius: '50%',
                    background: bg, border: `2px solid ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <EvIcon size={16} color={color} />
                  </div>

                  <div style={{ paddingTop: 6, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
                      <div>
                        <p style={{ fontSize: '.75rem', fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>
                          {ev.type?.replace(/_/g, ' ')}
                        </p>
                        <p style={{ fontSize: '.72rem', color: 'var(--text-3)', fontWeight: 650 }}>{ev.target}</p>
                        <span style={{ fontSize: '.65rem', color: 'var(--text-3)', background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4, display: 'inline-block', marginTop: 4 }}>
                          Tenant: <strong style={{ color: 'var(--text-2)' }}>{ev.businessname || 'System'}</strong>
                        </span>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-3)', fontSize: '.65rem', fontWeight: 600 }}>
                          <Clock size={11} />
                          {timeLabel}
                        </div>
                        <span className="badge badge-blue" style={{ marginTop: 4 }}>{ev.actor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
