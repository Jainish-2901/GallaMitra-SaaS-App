import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext.jsx';
import { Lock, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function AdminLogin() {
  const { login } = useAdmin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(username, password);
    setLoading(false);
    if (!res.success) setError(res.error);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg)',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
        background: 'linear-gradient(145deg, #EFF6FF 0%, #F8FAFC 60%)',
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 24,
          border: '1px solid var(--border)',
          padding: '2.5rem',
          width: '100%',
          maxWidth: 420,
          boxShadow: 'var(--shadow-lg)',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: '1.25rem' }}>
              <div style={{
                width: 48, height: 48,
                background: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: 14,
                display: 'flex', alignItems: 'center', justify: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(15,23,42,0.05)',
                overflow: 'hidden',
                padding: '6px'
              }}>
                <img
                  src="/favicon.png"
                  alt="GallaMitra Admin Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={(e) => {
                    // Safe backend fallback node if server delays local image stream
                    e.target.style.display = 'none';
                    e.target.parentNode.innerHTML = '<div style="font-size: 1.5rem; font-weight: 900; color: #2563EB; font-family: monospace;">₹</div>';
                  }}
                />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h1 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text)', lineHeight: 1.2, tracking: '-0.02em' }}>GallaMitra</h1>
                <p style={{ fontSize: '.62rem', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '.08em', margin: 0, marginTop: '2px' }}>Admin Portal</p>
              </div>
            </div>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text)', marginBottom: 4 }}>
              Super Admin Access
            </h2>
            <p style={{ fontSize: '.75rem', color: 'var(--text-3)', fontWeight: 500 }}>
              Verify administrative credentials to log in.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              background: '#FFF1F2', border: '1px solid #FDA4AF',
              borderRadius: 12, padding: '10px 14px', marginBottom: '1.25rem',
              fontSize: '.75rem', fontWeight: 600, color: 'var(--rose)',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label className="label-sm" style={{ display: 'block', fontSize: '.7rem', fontWeight: 800, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                <input
                  id="admin-username-input"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  placeholder="admin"
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 12,
                    padding: '11px 14px 11px 42px',
                    fontSize: '.85rem', fontWeight: 700,
                    color: 'var(--text)',
                    outline: 'none',
                    transition: 'border .15s, box-shadow .15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.1)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            <div>
              <label className="label-sm" style={{ display: 'block', fontSize: '.7rem', fontWeight: 800, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                <input
                  id="admin-password-input"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 12,
                    padding: '11px 44px 11px 42px',
                    fontSize: '.85rem', fontWeight: 700,
                    color: 'var(--text)',
                    outline: 'none',
                    transition: 'border .15s, box-shadow .15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.1)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="admin-login-btn"
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? '#93C5FD' : 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                border: 'none', borderRadius: 14,
                padding: '13px',
                fontSize: '.85rem', fontWeight: 900, color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '.04em',
                boxShadow: loading ? 'none' : '0 4px 12px rgba(37,99,235,.35)',
                transition: 'all .2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: '0.5rem'
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  Authenticating...
                </>
              ) : (
                <>🔐 Access Admin Panel</>
              )}
            </button>
          </form>

          {/* Security note */}
          <div style={{ marginTop: '1.5rem', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <ShieldCheck size={14} color="#2563EB" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: '.68rem', color: '#1D4ED8', fontWeight: 600, lineHeight: 1.5 }}>
              All login events are logged. Password verification is executed using SHA-256 salted hashes.
            </p>
          </div>

          <p style={{ textAlign: 'center', fontSize: '.65rem', color: 'var(--text-3)', marginTop: '1.5rem', fontFamily: 'JetBrains Mono, monospace' }}>
            GallaMitra SaaS Platform • Admin Console v1.1
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
