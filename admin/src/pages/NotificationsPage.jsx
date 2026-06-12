import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdmin } from '../context/AdminContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  Bell, Mail, Send, Clock, Search, AlertCircle,
  RefreshCw, X
} from 'lucide-react';

export default function NotificationsPage() {
  const { fetchSentEmails, sendBroadcast } = useAdmin();
  const toast = useToast();

  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  // Composer State
  const [composerOpen, setComposerOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [sending, setSending] = useState(false);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'sent', 'failed', 'pending'
  const [selectedEmail, setSelectedEmail] = useState(null);

  const loadEmails = async () => {
    setLoading(true);
    const list = await fetchSentEmails();
    setEmails(list || []);
    setLoading(false);
  };

  useEffect(() => {
    loadEmails();
  }, [fetchSentEmails]);

  // Set the first email as selected when list loads, if none selected yet
  useEffect(() => {
    if (emails.length > 0 && !selectedEmail) {
      setSelectedEmail(emails[0]);
    }
  }, [emails, selectedEmail]);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !bodyText.trim()) {
      toast.warning('Please fill in subject and body text.');
      return;
    }
    setSending(true);
    const res = await sendBroadcast(subject, bodyText);
    setSending(false);
    if (res.success) {
      toast.success(res.message || 'Broadcast sent successfully!');
      setSubject('');
      setBodyText('');
      setComposerOpen(false);
      loadEmails();
    } else {
      toast.error(res.error || 'Failed to send broadcast.');
    }
  };

  // Filter outbox emails
  const filteredEmails = useMemo(() => {
    return emails.filter(m => {
      const matchesSearch =
        m.to?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.body?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'sent' && m.status === 'sent') ||
        (statusFilter === 'failed' && m.status === 'failed') ||
        (statusFilter === 'pending' && (!m.status || m.status === 'pending' || m.status === 'processing'));

      return matchesSearch && matchesStatus;
    });
  }, [emails, searchTerm, statusFilter]);

  const activeEmail = useMemo(() => {
    if (!selectedEmail) return null;
    const match = emails.find(m => m.id === selectedEmail.id);
    return match || selectedEmail;
  }, [selectedEmail, emails]);

  return (
    <div className="notifications-layout fade-in" style={{ width: '100%' }}>
      <style>{`
        .notifications-layout {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          min-height: calc(100vh - 120px);
        }
        .notifications-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .composer-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: var(--shadow-md);
        }
        .dual-pane {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 1.5rem;
          width: 100%;
          align-items: start;
        }
        .outbox-pane {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-height: 650px;
        }
        .outbox-list {
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 480px;
          padding-right: 4px;
        }
        .outbox-item {
          padding: 12px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--surface-2);
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-align: left;
        }
        .outbox-item:hover {
          background: var(--border);
          transform: translateX(2px);
        }
        .outbox-item.active {
          background: #EFF6FF;
          border-color: #BFDBFE;
          border-left: 4px solid #2563EB;
        }
        .viewer-pane {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          min-height: 520px;
        }
        .email-frame {
          border: 1px solid var(--border);
          border-radius: 14px;
          background: #FAFBFD;
          padding: 1.25rem;
          max-height: 280px;
          overflow-y: auto;
          font-family: 'Inter', sans-serif;
          color: var(--text-2);
          white-space: pre-wrap;
          line-height: 1.6;
          font-size: 0.82rem;
          border-top: 4px solid var(--border-2);
          word-break: break-word;
        }
        .diagnostic-alert {
          padding: 12px 14px;
          background: #FFF1F2;
          border: 1px solid #FDA4AF;
          border-radius: 12px;
          color: #E11D48;
          font-size: 0.75rem;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          text-align: left;
        }
        .rotate-loading {
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* Responsive Breakpoint Layers */
        @media (max-width: 960px) {
          .dual-pane {
            grid-template-columns: 1fr;
          }
          .outbox-pane {
            max-height: 420px;
          }
          .outbox-list {
            max-height: 260px;
          }
          .viewer-pane {
            min-height: auto;
          }
        }
      `}</style>

      {/* Header Panel */}
      <div className="notifications-header">
        <div>
          <h2 className="section-title" style={{ fontSize: '1.1rem', margin: 0 }}>Mailbox Diagnostic Outbox</h2>
          <p className="section-sub" style={{ margin: 0, marginTop: 2 }}>Audit logs of all system email alerts and platform announcement history</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn btn-sm btn-ghost"
            onClick={loadEmails}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: '10px', cursor: 'pointer' }}
          >
            <RefreshCw size={13} className={loading ? 'rotate-loading' : ''} />
            Refresh Log
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setComposerOpen(prev => !prev)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: '10px', cursor: 'pointer' }}
          >
            {composerOpen ? <X size={13} /> : <Bell size={13} />}
            {composerOpen ? 'Close Composer' : 'Compose Announcement'}
          </button>
        </div>
      </div>

      {/* Composer Slide Drawer */}
      <AnimatePresence>
        {composerOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="composer-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '14px', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Send size={14} color="#2563EB" />
                <strong style={{ fontSize: '.85rem', color: 'var(--text)' }}>Send Broadcast Announcement</strong>
              </div>
              <span style={{ fontSize: '.65rem', color: 'var(--text-3)', fontWeight: 800, fontFamily: 'monospace' }}>DISPATCHES TO ALL SIGNED UP MERCHANTS</span>
            </div>

            <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px', fontFamily: 'monospace' }}>Email Subject</label>
                  <input
                    className="search-input"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Scheduled GallaMitra System Maintenance Alert"
                    style={{ width: '100%', height: '40px', paddingLeft: '14px', borderRadius: '12px' }}
                    required
                    disabled={sending}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px', fontFamily: 'monospace' }}>Message Body</label>
                  <textarea
                    value={bodyText}
                    onChange={e => setBodyText(e.target.value)}
                    placeholder="Dear Merchant,&#10;&#10;We will be upgrading GallaMitra server nodes on...&#10;&#10;Best regards,&#10;GallaMitra Admin Operations"
                    style={{
                      width: '100%', minHeight: '130px', padding: '12px',
                      borderRadius: '12px', border: '1px solid var(--border)',
                      background: 'var(--surface)', fontSize: '.78rem',
                      fontFamily: 'inherit', color: 'var(--text)', outline: 'none',
                      lineHeight: '1.5', resize: 'vertical'
                    }}
                    required
                    disabled={sending}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', pt: '4px' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setComposerOpen(false)}
                  disabled={sending}
                  style={{ cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={sending}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 800 }}
                >
                  <Send size={13} />
                  {sending ? 'Broadcasting...' : 'Dispatch Broadcast'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dual Pane Panel System */}
      <div className="dual-pane">

        {/* Left Outbox Log Frame Container */}
        <div className="outbox-pane">
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search recipient or subject..."
              className="search-input"
              style={{ paddingLeft: '36px', background: 'var(--surface-2)', width: '100%', height: '38px', borderRadius: '10px' }}
            />
          </div>

          {/* Tab Filter Sliders */}
          <div style={{ display: 'flex', gap: '2px', background: 'var(--surface-2)', borderRadius: '10px', padding: '3px', border: '1px solid var(--border)' }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'sent', label: 'Sent' },
              { key: 'pending', label: 'Queue' },
              { key: 'failed', label: 'Failed' },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  flex: 1, border: 'none',
                  background: statusFilter === tab.key ? 'var(--surface)' : 'transparent',
                  boxShadow: statusFilter === tab.key ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                  padding: '6px 4px', borderRadius: '7px', fontSize: '.68rem',
                  strokeWidth: '2px',
                  fontWeight: 900, color: statusFilter === tab.key ? '#2563EB' : 'var(--text-3)', cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scroll List Track */}
          <div className="outbox-list">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} className="animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: '12px', height: '80px' }} />
                ))}
              </div>
            ) : filteredEmails.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
                <AlertCircle size={18} style={{ margin: '0 auto 6px', color: 'var(--text-3)' }} />
                <p style={{ fontSize: '.7rem', fontWeight: 700, margin: 0 }}>No matching outbox logs found</p>
              </div>
            ) : (
              filteredEmails.map((m, idx) => {
                const isActive = activeEmail && activeEmail.id === m.id;
                const dateStr = m.time ? new Date(m.time).toLocaleDateString('en-IN') : 'N/A';

                let badgeClass = 'bg-amber-50 text-amber-700 border border-amber-100';
                if (m.status === 'sent') badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                if (m.status === 'failed') badgeClass = 'bg-rose-50 text-rose-700 border border-rose-100';

                return (
                  <motion.div
                    key={m.id || idx}
                    whileTap={{ scale: 0.98 }}
                    className={`outbox-item ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedEmail(m)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider font-mono ${badgeClass}`}>
                        {m.status || 'Pending'}
                      </span>
                      <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-3)' }}>{dateStr}</span>
                    </div>
                    <strong style={{ fontSize: '.75rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', tracking: '-0.01em' }}>
                      {m.subject}
                    </strong>
                    <span style={{ fontSize: '.65rem', color: '#2563EB', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      To: {m.to}
                    </span>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Simulated Core Email Viewport */}
        <div className="viewer-pane">
          {activeEmail ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>

              {/* Header Box metadata row */}
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text)', margin: 0, tracking: '-0.02em', flex: '1 1 240px', textAlign: 'left' }}>
                    {activeEmail.subject}
                  </h3>

                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider font-mono ${activeEmail.status === 'sent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                      activeEmail.status === 'failed' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                    Status: {activeEmail.status || 'Queue'}
                  </span>
                </div>

                {/* Email address routing lists */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', marginTop: '14px', fontSize: '.72rem', textAlign: 'left' }}>
                  <span style={{ color: 'var(--text-3)', fontWeight: 700 }}>From:</span>
                  <span style={{ color: 'var(--text-2)', fontWeight: 700 }}>GallaMitra Operations &lt;noreply@gallamitra.com&gt;</span>

                  <span style={{ color: 'var(--text-3)', fontWeight: 700 }}>To:</span>
                  <span style={{ color: '#2563EB', fontWeight: 800, fontFamily: 'monospace', wordBreak: 'break-all' }}>{activeEmail.to}</span>

                  <span style={{ color: 'var(--text-3)', fontWeight: 700 }}>Date:</span>
                  <span style={{ color: 'var(--text-2)' }}>{activeEmail.time ? new Date(activeEmail.time).toLocaleString('en-IN') : 'N/A'}</span>
                </div>
              </div>

              {/* SMTP configuration diagnostics alerts */}
              {activeEmail.status === 'failed' && (
                <div className="diagnostic-alert">
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ fontSize: '.75rem', display: 'block', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.04em' }}>SMTP Transmission Failure</strong>
                    <p style={{ margin: '4px 0 0', lineHeight: '1.4', fontFamily: 'monospace', fontSize: '11px' }}>
                      {activeEmail.error || 'SMTP credentials mismatch or mail server handshake timeout.'}
                    </p>
                    <div style={{ marginTop: 8, background: 'rgba(225, 29, 72, 0.04)', padding: '6px 10px', borderRadius: '6px', fontSize: '.68rem', color: '#E11D48', border: '1px solid rgba(225, 29, 72, 0.1)' }}>
                      <strong>Tip:</strong> Navigate to Admin Settings, verify your primary SMTP configuration blocks, and confirm if dynamic OAuth tokens or Google App Passwords require re-auth loops.
                    </div>
                  </div>
                </div>
              )}

              {/* Message Block Rendering area with Code Stripping Utility */}
              <div style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px', fontFamily: 'monospace' }}>
                  ✉️ Email Message Body Preview (Clean Text)
                </span>
                <div className="email-frame">
                  {activeEmail.body ? (
                    activeEmail.body
                      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove CSS blocks
                      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove Script blocks
                      .replace(/<[^>]+>/g, ' ') // Strip HTML
                      .replace(/\s+/g, ' ') // Normalize spaces
                      .trim()
                  ) : (
                    <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>No message text content available.</span>
                  )}
                </div>
              </div>

              {/* Technical Audit Footer logs */}
              <div style={{ display: 'flex', gap: 16, fontSize: '.65rem', color: 'var(--text-3)', fontStyle: 'normal', fontWeight: 700, fontFamily: 'monospace', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <span>ID: {activeEmail.id}</span>
                <span>•</span>
                <span>ATTEMPTS: {activeEmail.attempts || 1}/3</span>
              </div>

            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, color: 'var(--text-3)', padding: '4rem 1.5rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                <Mail size={18} color="var(--text-3)" />
              </div>
              <strong style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>No Outbox Email Selected</strong>
              <p style={{ fontSize: '.7rem', textAlign: 'center', maxWidth: 230, lineHeight: 1.4, margin: 0 }}>
                Select any notification card from the outbox log list to display headers, content preview, and SMTP diagnostics logs.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}