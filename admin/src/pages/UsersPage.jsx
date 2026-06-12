import React from 'react';
import { useAdmin } from '../context/AdminContext.jsx';
import { Users, Mail, Phone, Calendar, Hash } from 'lucide-react';

export default function UsersPage() {
  const { shops, loading } = useAdmin();

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card card-pad">
        <p className="section-title">Owners Registry</p>
        <p className="section-sub">All registered shop owner accounts on the platform</p>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }} className="animate-pulse">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '12px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '25%' }}>
                  <div style={{ width: '30px', height: '30px', background: 'var(--border-2)', borderRadius: '50%' }}></div>
                  <div style={{ width: '120px', height: '12px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                </div>
                <div style={{ width: '120px', height: '12px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                <div style={{ width: '150px', height: '12px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                <div style={{ width: '100px', height: '12px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                <div style={{ width: '85px', height: '12px', background: 'var(--border-2)', borderRadius: 4 }}></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="desktop-only-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Owner Name</th>
                    <th>Business Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {shops.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>No owners registered.</td></tr>
                  ) : shops.map((shop, i) => (
                    <tr key={shop.id}>
                      <td className="mono" style={{ color: 'var(--text-3)', fontSize: '.7rem' }}>{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 30, height: 30, background: '#EFF6FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '.75rem', color: '#2563EB', border: '1px solid #BFDBFE', flexShrink: 0 }}>
                            {shop.ownername?.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{shop.ownername}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-2)' }}>{shop.businessname}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-3)', fontSize: '.72rem' }}>
                          <Mail size={12} /> {shop.email}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-3)', fontSize: '.72rem' }}>
                          <Phone size={12} /> {shop.phone || '—'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-3)', fontSize: '.72rem' }}>
                          <Calendar size={12} />
                          {shop.createdat ? new Date(shop.createdat).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-only-card-list">
              {shops.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)', fontSize: '0.78rem' }}>No owners registered.</p>
              ) : shops.map((shop, i) => (
                <div key={shop.id} className="mobile-card">
                  <div className="mobile-card-row" style={{ borderBottom: '1px dashed var(--border)', paddingBottom: '6px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, background: '#EFF6FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '.7rem', color: '#2563EB', border: '1px solid #BFDBFE', flexShrink: 0 }}>
                        {shop.ownername?.charAt(0).toUpperCase()}
                      </div>
                      <span className="mobile-card-title">{shop.ownername}</span>
                    </div>
                    <span className="mono" style={{ color: 'var(--text-3)', fontSize: '0.65rem' }}>#{i + 1}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Business</span>
                    <span className="mobile-card-value">{shop.businessname}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Email</span>
                    <span className="mobile-card-value mono" style={{ fontSize: '0.68rem' }}>{shop.email}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Phone</span>
                    <span className="mobile-card-value">{shop.phone || '—'}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Joined</span>
                    <span className="mobile-card-value">
                      {shop.createdat ? new Date(shop.createdat).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )
        }
      </div>
    </div>
  );
}
