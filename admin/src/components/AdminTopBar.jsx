import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext.jsx';
import { adminSidebarTabs } from '../sidebarConfig.js';
import { RefreshCw, Clock, ShieldCheck, Menu } from 'lucide-react';

export default function AdminTopBar({ activeTab, onRefresh, refreshing, onToggleSidebar }) {
  const { installApp, isInstallable } = useAdmin();
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Resolve active tab label from sidebarConfig
  const activeLabel = activeTab === 'more'
    ? 'More Controls'
    : adminSidebarTabs
        .flatMap(g => g.items)
        .find(item => item.id === activeTab)?.label || 'Dashboard';

  return (
    <header className="admin-topbar">
      {/* Mobile Toggle & Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
        <button
          onClick={onToggleSidebar}
          className="btn btn-ghost btn-sm mobile-menu-toggle"
          style={{ padding: '6px', borderRadius: '8px' }}
        >
          <Menu size={18} />
        </button>
        <div>
          <p className="topbar-title">{activeLabel}</p>
          <p className="topbar-meta hide-mobile">GallaMitra Admin Console — Control Layer</p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="topbar-right">
        {/* PWA Download Button */}
        {isInstallable && (
          <button
            onClick={installApp}
            className="btn btn-primary btn-sm"
            style={{ fontSize: '.68rem', padding: '6px 12px' }}
          >
            📲 Install App
          </button>
        )}

        {/* Admin Badge */}
        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '5px 12px' }}>
          <ShieldCheck size={13} color="#2563EB" />
          <span style={{ fontSize: '.65rem', fontStyle: 'normal', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Super Admin
          </span>
        </div>

        {/* Live clock & Date */}
        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 10, padding: '5px 12px' }}>
          <Clock size={13} color="#94A3B8" />
          <span className="mono" style={{ fontSize: '.68rem', fontWeight: 700, color: '#475569' }}>
            {liveTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} — {liveTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Refresh Button */}
        <button
          id="topbar-refresh-btn"
          onClick={onRefresh}
          disabled={refreshing}
          className="btn btn-ghost btn-sm"
        >
          <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          <span className="hide-mobile">Refresh</span>
        </button>
      </div>
    </header>
  );
}
