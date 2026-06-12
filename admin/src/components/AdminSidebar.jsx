import React from 'react';
import { useAdmin } from '../context/AdminContext.jsx';
import { adminSidebarTabs } from '../sidebarConfig.js';
import { ShieldCheck, LogOut } from 'lucide-react';

export default function AdminSidebar({ activeTab, setActiveTab, isOpen, onClose }) {
  const { shops, logout } = useAdmin();

  // Dynamic badge values
  const getBadge = (id) => {
    if (id === 'shops') return shops.length || null;
    return null;
  };

  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon" style={{ background: '#fff', overflow: 'hidden', padding: 2 }}>
          <img src="/favicon.png" alt="GallaMitra Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div>
          <h1>GallaMitra</h1>
          <span>Super Admin</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {adminSidebarTabs.map((group) => (
          <div key={group.group}>
            <p className="sidebar-group-label">{group.group}</p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const badgeVal = getBadge(item.id);
              return (
                <button
                  key={item.id}
                  id={`sidebar-${item.id}`}
                  onClick={() => { setActiveTab(item.id); if (onClose) onClose(); }}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                  {badgeVal && (
                    <span className="sidebar-badge">{badgeVal}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer / Logout */}
      <div className="sidebar-footer">
        <button
          id="sidebar-logout-btn"
          onClick={() => { logout(); if (onClose) onClose(); }}
          className="sidebar-item"
          style={{ width: '100%', color: '#E11D48' }}
        >
          <LogOut size={15} style={{ color: '#E11D48' }} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
