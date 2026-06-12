import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext.jsx';
import AdminSidebar from './AdminSidebar.jsx';
import AdminTopBar from './AdminTopBar.jsx';

// Tab Pages
import DashboardPage  from '../pages/DashboardPage.jsx';
import ShopsPage      from '../pages/ShopsPage.jsx';
import UsersPage      from '../pages/UsersPage.jsx';
import StatsPage      from '../pages/StatsPage.jsx';
import ActivityPage   from '../pages/ActivityPage.jsx';
import SystemPage     from '../pages/SystemPage.jsx';

// Dynamic Completed Pages
import AuditTrailPage     from '../pages/AuditTrailPage.jsx';
import DbHealthPage       from '../pages/DbHealthPage.jsx';
import NotificationsPage  from '../pages/NotificationsPage.jsx';
import AdminSettingsPage  from '../pages/AdminSettingsPage.jsx';

// Lucide Icons for Bottom Nav and More Grid
import {
  LayoutDashboard,
  Store,
  Users,
  BarChart3,
  Menu,
  Activity,
  FileText,
  Database,
  Bell,
  ShieldCheck,
  Settings
} from 'lucide-react';

export default function AdminPanel() {
  const { fetchShops, fetchStats } = useAdmin();
  const [activeTab, setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tab') || 'dashboard';
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      setActiveTab(urlParams.get('tab') || 'dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const changeTab = (tabId) => {
    setActiveTab(tabId);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    window.history.pushState(null, '', url.pathname + url.search);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchShops();
    await fetchStats();
    setRefreshing(false);
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':     return <DashboardPage />;
      case 'shops':         return <ShopsPage />;
      case 'users':         return <UsersPage />;
      case 'stats':         return <StatsPage />;
      case 'activity':      return <ActivityPage />;
      case 'system':        return <SystemPage />;
      case 'audit':         return <AuditTrailPage />;
      case 'db':            return <DbHealthPage />;
      case 'notifications': return <NotificationsPage />;
      case 'settings':      return <AdminSettingsPage />;
      case 'more':          return <MoreTabsView setActiveTab={changeTab} />;
      default:              return <DashboardPage />;
    }
  };

  const mobileNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'shops',     label: 'Shops',     icon: Store },
    { id: 'users',     label: 'Users',     icon: Users },
    { id: 'stats',     label: 'Stats',     icon: BarChart3 },
    { id: 'more',      label: 'More',      icon: Menu }
  ];

  return (
    <div className="admin-shell">
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={changeTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Right: TopBar + Content */}
      <div className="admin-content">
        <AdminTopBar
          activeTab={activeTab}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        />
        <main className="admin-main">
          {renderPage()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="admin-bottom-nav">
        {mobileNavItems.map(item => {
          const IconComp = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => changeTab(item.id)}
              className={`admin-bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <IconComp size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MoreTabsView({ setActiveTab }) {
  const groups = [
    {
      group: 'Monitoring',
      items: [
        { id: 'activity', label: 'Activity Log', icon: Activity },
        { id: 'audit',    label: 'Audit Trail',  icon: FileText },
        { id: 'db',       label: 'DB Health',    icon: Database }
      ]
    },
    {
      group: 'System',
      items: [
        { id: 'notifications', label: 'Notifications',  icon: Bell },
        { id: 'system',        label: 'System Info',    icon: ShieldCheck },
        { id: 'settings',      label: 'Admin Settings', icon: Settings }
      ]
    }
  ];

  return (
    <div className="more-grid-container fade-in">
      <div className="card card-pad" style={{ borderLeft: '4px solid var(--blue)' }}>
        <h2 className="section-title">All Admin Controls</h2>
        <p className="section-sub">Explore monitoring logs, database health and system configurations</p>
      </div>

      {groups.map((group) => (
        <div key={group.group} className="more-group-section">
          <span className="more-group-label">{group.group}</span>
          <div className="more-grid">
            {group.items.map((item) => {
              const TabIcon = item.icon;
              return (
                <button
                  key={item.id}
                  id={`more-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className="more-grid-item"
                >
                  <div className="more-grid-icon-wrap">
                    <TabIcon size={18} />
                  </div>
                  <div className="more-grid-info">
                    <span className="more-grid-title">{item.label}</span>
                    <span className="more-grid-desc">System</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
