import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AdminContext = createContext(null);

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be inside AdminProvider');
  return ctx;
};

const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || '/api';
const BASE_URL = {
  value: `${BACKEND_BASE}/shops`,
  toString() {
    return this.value;
  }
};

export function AdminProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('gm_admin_auth') === 'true';
  });
  
  const [token, setToken] = useState(() => {
    return localStorage.getItem('gm_admin_token') || '';
  });

  const [shops, setShops] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const initialBackend = import.meta.env.VITE_BACKEND_URL || '';
        const fetchUrl = initialBackend ? (initialBackend.endsWith('/api') ? `${initialBackend}/shops/public-config` : `${initialBackend}/api/shops/public-config`) : '/api/shops/public-config';
        const res = await fetch(fetchUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.backendUrl) {
            let cleanUrl = data.backendUrl.trim();
            if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
            BASE_URL.value = `${cleanUrl}/api/shops`;
          }
        }
      } catch (err) {
        console.error('🚨 Error fetching admin public config:', err);
      }
    };
    fetchConfig();
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('gm_admin_token', data.token);
        localStorage.setItem('gm_admin_auth', 'true');
        setToken(data.token);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: data.error || 'Invalid admin credentials.' };
    } catch (e) {
      return { success: false, error: 'Network error. Could not connect to backend.' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('gm_admin_auth');
    localStorage.removeItem('gm_admin_token');
    setIsAuthenticated(false);
    setToken('');
    setShops([]);
    setStats(null);
  }, []);

  const fetchShops = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/admin/list`, {
        headers: { 'x-admin-key': token }
      });
      const data = await res.json();
      if (data.success) setShops(data.shops || []);
    } catch (e) {
      setError('Failed to load shop tenants.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/admin/stats`, {
        headers: { 'x-admin-key': token }
      });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (e) {
      console.error('Stats fetch error:', e);
    }
  }, [token]);

  const toggleShopStatus = useCallback(async (shopId, currentStatus) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/shops/${shopId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        setShops(prev => prev.map(s => s.id === shopId ? { ...s, isactive: !currentStatus, status: !currentStatus ? 'active' : 'suspended' } : s));
      }
      return data;
    } catch (e) {
      return { success: false, error: 'Network error' };
    }
  }, [token]);

  const approveShop = useCallback(async (shopId, plan) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/shops/${shopId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ plan })
      });
      const data = await res.json();
      if (data.success) {
        setShops(prev => prev.map(s => s.id === shopId ? { ...s, status: 'active', isactive: true, plan: plan || s.plan } : s));
      }
      return data;
    } catch (e) {
      return { success: false, error: 'Network error' };
    }
  }, [token]);

  const rejectShop = useCallback(async (shopId, reason) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/shops/${shopId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (data.success) {
        setShops(prev => prev.map(s => s.id === shopId ? { ...s, status: 'rejected', isactive: false, rejectionreason: reason } : s));
      }
      return data;
    } catch (e) {
      return { success: false, error: 'Network error' };
    }
  }, [token]);

  const changeShopPlan = useCallback(async (shopId, plan) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/shops/${shopId}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ plan })
      });
      const data = await res.json();
      if (data.success) {
        setShops(prev => prev.map(s => s.id === shopId ? { ...s, plan } : s));
      }
      return data;
    } catch (e) {
      return { success: false, error: 'Network error' };
    }
  }, [token]);

  const updateShopPassword = useCallback(async (shopId, password) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/shops/${shopId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ password })
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Network error' };
    }
  }, [token]);

  const approvePlanChange = useCallback(async (shopId) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/shops/${shopId}/approve-plan`, {
        method: 'PATCH',
        headers: { 'x-admin-key': token }
      });
      const data = await res.json();
      if (data.success) {
        setShops(prev => prev.map(s => s.id === shopId ? data.shop : s));
      }
      return data;
    } catch (e) {
      return { success: false, error: 'Network error' };
    }
  }, [token]);

  const rejectPlanChange = useCallback(async (shopId, reason) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/shops/${shopId}/reject-plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (data.success) {
        setShops(prev => prev.map(s => s.id === shopId ? { ...s, planRequestStatus: 'rejected', requestedPlan: null } : s));
      }
      return data;
    } catch (e) {
      return { success: false, error: 'Network error' };
    }
  }, [token]);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/plans`);
      const data = await res.json();
      return data.success ? data.plans : [];
    } catch {
      return [];
    }
  }, []);

  const createPlan = useCallback(async (planData) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify(planData)
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, [token]);

  const updatePlan = useCallback(async (planId, planData) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify(planData)
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, [token]);

  const deletePlan = useCallback(async (planId) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/plans/${planId}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': token }
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, [token]);

  const fetchAdminSettings = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/admin/settings`, {
        headers: { 'x-admin-key': token }
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, [token]);

  const updateAdminSettings = useCallback(async (settingsData) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify(settingsData)
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, [token]);

  const testSmtpConnection = useCallback(async (smtpData) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/settings/test-smtp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify(smtpData)
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Network error testing SMTP connection' };
    }
  }, [token]);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/admin/activities`, {
        headers: { 'x-admin-key': token }
      });
      const data = await res.json();
      return data.success ? data.activities : [];
    } catch {
      return [];
    }
  }, [token]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/admin/audit-logs`, {
        headers: { 'x-admin-key': token }
      });
      const data = await res.json();
      return data.success ? data.logs : [];
    } catch {
      return [];
    }
  }, [token]);

  const fetchDbHealth = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/admin/db-health`, {
        headers: { 'x-admin-key': token }
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, [token]);

  const fetchSentEmails = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/admin/sent-emails`, {
        headers: { 'x-admin-key': token }
      });
      const data = await res.json();
      return data.success ? data.emails : [];
    } catch {
      return [];
    }
  }, [token]);

  const sendBroadcast = useCallback(async (subject, text) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': token },
        body: JSON.stringify({ subject, text })
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, [token]);

  const [installPrompt, setInstallPrompt] = useState(null);
  useEffect(() => {
    const handlePrompt = (e) => {
      // Do NOT call e.preventDefault() to avoid blocking browser's automatic install banner
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  const installApp = useCallback(async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchShops();
      fetchStats();
    }
  }, [isAuthenticated, token, fetchShops, fetchStats]);

  return (
    <AdminContext.Provider value={{
      isAuthenticated, login, logout,
      shops, stats, loading, error, token,
      fetchShops, fetchStats, toggleShopStatus,
      approveShop, rejectShop, changeShopPlan,
      updateShopPassword, approvePlanChange, rejectPlanChange,
      fetchPlans, createPlan, updatePlan, deletePlan,
      fetchAdminSettings, updateAdminSettings, testSmtpConnection,
      fetchActivities, fetchAuditLogs, fetchDbHealth, fetchSentEmails, sendBroadcast,
      installApp, isInstallable: !!installPrompt
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export default AdminContext;
