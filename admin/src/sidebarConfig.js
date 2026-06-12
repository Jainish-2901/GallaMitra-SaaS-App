import {
  LayoutDashboard,
  Store,
  Users,
  BarChart3,
  ShieldCheck,
  Settings,
  FileText,
  Activity,
  Database,
  Bell,
} from 'lucide-react';

export const adminSidebarTabs = [
  {
    group: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
      { id: 'stats',     label: 'Platform Stats', icon: BarChart3, badge: null },
    ],
  },
  {
    group: 'Tenant Management',
    items: [
      { id: 'shops',    label: 'Shop Tenants',    icon: Store, badge: 'tenants' },
      { id: 'users',    label: 'Owners Registry', icon: Users, badge: null },
    ],
  },
  {
    group: 'Monitoring',
    items: [
      { id: 'activity', label: 'Activity Log',    icon: Activity, badge: null },
      { id: 'audit',    label: 'Audit Trail',     icon: FileText, badge: null },
      { id: 'db',       label: 'DB Health',       icon: Database, badge: null },
    ],
  },
  {
    group: 'System',
    items: [
      { id: 'notifications', label: 'Notifications', icon: Bell, badge: null },
      { id: 'system',        label: 'System Info',   icon: ShieldCheck, badge: null },
      { id: 'settings',      label: 'Admin Settings', icon: Settings, badge: null },
    ],
  },
];
