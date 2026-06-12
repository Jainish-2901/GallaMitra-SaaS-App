import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Search, Store, Phone, Mail, Calendar, ShieldAlert, CheckCircle2, Ban, XCircle, ArrowUpRight, Check, X } from 'lucide-react';

export default function ShopsPage() {
  const { 
    shops, toggleShopStatus, approveShop, rejectShop, changeShopPlan, fetchPlans,
    updateShopPassword, approvePlanChange, rejectPlanChange, loading
  } = useAdmin();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | active | pending | suspended | rejected
  const [availablePlans, setAvailablePlans] = useState([]);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // New States for Password Editing and Plan Upgrades
  const [editingPasswordShopId, setEditingPasswordShopId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rejectPlanShopId, setRejectPlanShopId] = useState(null);
  const [rejectPlanReason, setRejectPlanReason] = useState('');
  const [targetRequestedPlan, setTargetRequestedPlan] = useState('');

  // Fetch plans to populate selectors
  useEffect(() => {
    fetchPlans().then(setAvailablePlans);
  }, [fetchPlans]);

  const handleUpdatePassword = async (id) => {
    if (!newPassword || newPassword.length < 6) {
      toast.warning('Password must be at least 6 characters.');
      return;
    }
    const res = await updateShopPassword(id, newPassword);
    if (res.success) {
      toast.success('Password updated successfully!');
      setEditingPasswordShopId(null);
      setNewPassword('');
      setShowPassword(false);
    } else {
      toast.error(res.error || 'Failed to update password.');
    }
  };

  const handleApprovePlanChange = async (id, planId) => {
    const res = await approvePlanChange(id);
    if (res.success) {
      toast.success(`Plan changed to "${planId}" approved successfully!`);
    } else {
      toast.error(res.error || 'Failed to approve plan change.');
    }
  };

  const handleRejectPlanChangeSubmit = async (e) => {
    e.preventDefault();
    if (!rejectPlanReason.trim()) { toast.warning('Please enter a rejection reason.'); return; }
    const res = await rejectPlanChange(rejectPlanShopId, rejectPlanReason);
    if (res.success) {
      toast.success('Plan upgrade request rejected.');
      setRejectPlanShopId(null);
      setRejectPlanReason('');
      setTargetRequestedPlan('');
    } else {
      toast.error(res.error || 'Failed to reject plan request.');
    }
  };

  const filtered = shops.filter(s => {
    const matchSearch =
      s.businessname?.toLowerCase().includes(search.toLowerCase()) ||
      s.ownername?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase());

    const status = s.status || 'active';

    if (filter === 'active') return matchSearch && s.isactive !== false && status === 'active';
    if (filter === 'suspended') return matchSearch && (s.isactive === false || status === 'suspended');
    if (filter === 'pending') return matchSearch && status === 'pending';
    if (filter === 'rejected') return matchSearch && status === 'rejected';

    return matchSearch;
  });

  const handleApprove = async (id, planId) => {
    const res = await approveShop(id, planId);
    if (res.success) {
      toast.success('Shop approved successfully!');
    } else {
      toast.error(res.error || 'Failed to approve shop.');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) { toast.warning('Please enter a rejection reason.'); return; }
    const res = await rejectShop(rejectId, rejectReason);
    if (res.success) {
      toast.success('Shop rejected.');
      setRejectId(null);
      setRejectReason('');
    } else {
      toast.error(res.error || 'Failed to reject shop.');
    }
  };

  const handlePlanChange = async (id, planId) => {
    const res = await changeShopPlan(id, planId);
    if (res.success) {
      toast.success(`Plan updated to "${planId}" successfully!`);
    } else {
      toast.error(res.error || 'Failed to update plan.');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const res = await toggleShopStatus(id, currentStatus);
    if (res.success) {
      toast.success(`Shop ${!currentStatus ? 'activated' : 'suspended'} successfully!`);
    } else {
      toast.error(res.error || 'Failed to toggle shop status.');
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header + Filters */}
      <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="section-title">Shop Tenant Registry</p>
          <p className="section-sub">{shops.length} total registered businesses on the platform</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {['all', 'active', 'pending', 'suspended', 'rejected'].map(f => (
            <button
              key={f}
              id={`filter-${f}`}
              onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              style={{ textTransform: 'capitalize' }}
            >
              {f} ({
                f === 'all' ? shops.length :
                f === 'active' ? shops.filter(s => s.isactive !== false && s.status === 'active').length :
                f === 'pending' ? shops.filter(s => s.status === 'pending').length :
                f === 'suspended' ? shops.filter(s => s.isactive === false || s.status === 'suspended').length :
                shops.filter(s => s.status === 'rejected').length
              })
            </button>
          ))}
        </div>
      </div>

      {/* Pending Plan Upgrade Requests Banner */}
      {shops.some(s => s.planrequeststatus === 'pending') && (
        <div className="card card-pad fade-in" style={{ border: '1px solid #FCD34D', background: '#FEF3C7', borderRadius: 'var(--radius)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ fontWeight: 800, fontSize: '.85rem', color: '#B45309', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <ShieldAlert size={16} /> Pending Plan Upgrade Requests Require Attention
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {shops.filter(s => s.planrequeststatus === 'pending').map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>{s.businessname}</span>
                    <span style={{ color: 'var(--text-3)', fontSize: '.7rem', marginLeft: '6px' }}>({s.ownername})</span>
                    <div style={{ marginTop: '4px', fontSize: '.72rem', fontWeight: 650, color: 'var(--text-2)' }}>
                      Current Plan: <span className="badge badge-blue">{s.plan}</span> ➔ Requested: <span className="badge badge-amber">{s.requestedplan}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleApprovePlanChange(s.id, s.requestedplan)}
                      className="btn btn-sm btn-success"
                      style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Check size={11} /> Approve Upgrade
                    </button>
                    <button
                      onClick={() => {
                        setRejectPlanShopId(s.id);
                        setTargetRequestedPlan(s.requestedplan);
                        setRejectPlanReason('');
                      }}
                      className="btn btn-sm btn-danger"
                      style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <X size={11} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Plan Upgrade Rejection Reason Form */}
      {rejectPlanShopId && (
        <div className="card card-pad fade-in" style={{ border: '2px solid #F43F5E', background: '#FFF1F2' }}>
          <form onSubmit={handleRejectPlanChangeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontWeight: 800, fontSize: '.85rem', color: '#9F1239', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <ShieldAlert size={16} /> Specify Plan Upgrade Rejection Reason (for {shops.find(s => s.id === rejectPlanShopId)?.businessname})
            </p>
            <input
              type="text"
              className="search-input"
              value={rejectPlanReason}
              onChange={e => setRejectPlanReason(e.target.value)}
              placeholder="e.g. Upgrade payment has not been received or confirmed."
              style={{ background: '#fff', border: '1px solid #FDA4AF' }}
              required
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-sm btn-danger">Confirm Reject Plan</button>
              <button type="button" onClick={() => { setRejectPlanShopId(null); setRejectPlanReason(''); setTargetRequestedPlan(''); }} className="btn btn-sm btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="search-wrap" style={{ maxWidth: 400 }}>
        <Search size={14} className="search-icon" />
        <input
          id="shops-search"
          className="search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, owner or email..."
        />
      </div>

      {/* Rejection Reason Input Modal/Panel */}
      {rejectId && (
        <div className="card card-pad" style={{ border: '2px solid #F43F5E', background: '#FFF1F2' }}>
          <form onSubmit={handleRejectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontWeight: 800, fontSize: '.85rem', color: '#9F1239', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldAlert size={16} /> Specify Rejection Reason
            </p>
            <input
              type="text"
              className="search-input"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete business documents or invalid contact details."
              style={{ background: '#fff', border: '1px solid #FDA4AF' }}
              required
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-sm btn-danger">Confirm Reject</button>
              <button type="button" onClick={() => setRejectId(null)} className="btn btn-sm btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }} className="animate-pulse">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '25%' }}>
                  <div style={{ width: '28px', height: '28px', background: 'var(--border-2)', borderRadius: 8 }}></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ width: '120px', height: '12px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                    <div style={{ width: '60px', height: '8px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '20%' }}>
                  <div style={{ width: '80px', height: '10px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                  <div style={{ width: '100px', height: '8px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                </div>
                <div style={{ width: '15%', height: '12px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                <div style={{ width: '10%', height: '12px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                <div style={{ width: '10%', height: '12px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                <div style={{ width: '10%', height: '16px', background: 'var(--border-2)', borderRadius: 4 }}></div>
                <div style={{ width: '10%', height: '28px', background: 'var(--border-2)', borderRadius: 6 }}></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="desktop-only-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Owner Details</th>
                    <th>Registered On</th>
                    <th>Selected Plan</th>
                    <th>Subscription Expiry</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
                        No matching tenants found.
                      </td>
                    </tr>
                  ) : filtered.map(shop => {
                    const isShopActive = shop.isactive !== false && shop.status === 'active';
                    const status = shop.status || 'active';
                    return (
                      <tr key={shop.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, display: 'flex', alignItems: 'center', justifycontent: 'center', flexShrink: 0 }}>
                              <Store size={13} color="#2563EB" />
                            </div>
                            <div>
                              <span style={{ fontWeight: 700, color: 'var(--text)' }}>{shop.businessname}</span>
                              <p className="mono" style={{ fontSize: '.6rem', color: 'var(--text-3)' }}>ID: {shop.id?.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <p style={{ fontWeight: 600, fontSize: '.78rem', margin: 0 }}>{shop.ownername}</p>
                          <p style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-3)', fontSize: '.68rem', margin: '2px 0 0' }}><Mail size={10} /> {shop.email}</p>
                          {shop.phone && <p style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-3)', fontSize: '.68rem', margin: '2px 0 0' }}><Phone size={10} /> {shop.phone}</p>}
                          
                          {/* Password View & Update Inline Field */}
                          <div style={{ marginTop: '8px', borderTop: '1px dashed var(--border)', paddingTop: '6px' }}>
                            {editingPasswordShopId === shop.id ? (
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                  <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="New password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    style={{
                                      fontSize: '.7rem',
                                      padding: '4px 28px 4px 6px',
                                      borderRadius: '6px',
                                      border: '1px solid var(--border)',
                                      background: 'var(--surface)',
                                      width: '120px'
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                      position: 'absolute',
                                      right: '6px',
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontSize: '.7rem',
                                      padding: 0,
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                  >
                                    {showPassword ? '👁️' : '🙈'}
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleUpdatePassword(shop.id)}
                                  className="btn btn-sm btn-success"
                                  style={{ padding: '4px 8px', fontSize: '.65rem', borderRadius: '6px' }}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingPasswordShopId(null);
                                    setNewPassword('');
                                    setShowPassword(false);
                                  }}
                                  className="btn btn-sm btn-ghost"
                                  style={{ padding: '4px 8px', fontSize: '.65rem', borderRadius: '6px' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingPasswordShopId(shop.id);
                                  setNewPassword('');
                                  setShowPassword(false);
                                }}
                                className="btn btn-ghost"
                                style={{
                                  padding: '2px 6px',
                                  fontSize: '.68rem',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: 'var(--blue)',
                                  background: 'var(--blue-light)',
                                  border: '1px solid var(--blue-mid)',
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                                }}
                              >
                                🔑 Update Password
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-2)', fontSize: '.72rem', fontWeight: 650 }}>
                            <Calendar size={12} />
                            {shop.createdat 
                              ? new Date(shop.createdat).toLocaleDateString('en-IN') 
                              : 'N/A'}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '.7rem', color: '#4F46E5' }}>
                              ⚡ {shop.plan}
                            </span>
                            {shop.planrequeststatus === 'pending' && (
                              <div style={{
                                background: '#FEF3C7',
                                border: '1px solid #F59E0B',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                marginTop: '4px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                              }}>
                                <span style={{ fontSize: '.62rem', fontWeight: 800, color: '#D97706' }}>
                                  ⚠️ REQ: {shop.requestedplan?.toUpperCase()}
                                </span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    onClick={() => handleApprovePlanChange(shop.id, shop.requestedplan)}
                                    className="btn btn-success"
                                    style={{ padding: '2px 4px', fontSize: '.6rem', borderRadius: '4px' }}
                                    title="Approve Upgrade"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRejectPlanShopId(shop.id);
                                      setTargetRequestedPlan(shop.requestedplan);
                                      setRejectPlanReason('');
                                    }}
                                    className="btn btn-danger"
                                    style={{ padding: '2px 4px', fontSize: '.6rem', borderRadius: '4px' }}
                                    title="Reject Upgrade"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            )}
                            {/* Plan override selection */}
                            {isShopActive && shop.planrequeststatus !== 'pending' && (
                              <select
                                value={shop.plan}
                                onChange={(e) => handlePlanChange(shop.id, e.target.value)}
                                style={{ fontSize: '.65rem', padding: '2px 4px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)' }}
                              >
                                {availablePlans.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-2)', fontSize: '.72rem', fontWeight: 650 }}>
                            <Calendar size={12} />
                            {shop.subscriptionexpiresat 
                              ? new Date(shop.subscriptionexpiresat).toLocaleDateString('en-IN') 
                              : 'Unlimited (Free)'}
                          </div>
                        </td>
                        <td>
                          {status === 'pending' && <span className="badge badge-amber">● Pending Review</span>}
                          {status === 'rejected' && (
                            <span className="badge badge-red" title={shop.rejectionreason}>
                              ● Rejected
                            </span>
                          )}
                          {status === 'active' && isShopActive && <span className="badge badge-green">● Active</span>}
                          {status === 'suspended' && <span className="badge badge-red">● Suspended</span>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '.4rem' }}>
                            {status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(shop.id, shop.plan)}
                                  className="btn btn-sm btn-success"
                                  style={{ display: 'flex', alignItems: 'center', gap: 2 }}
                                >
                                  <Check size={11} /> Approve
                                </button>
                                <button
                                  onClick={() => { setRejectId(shop.id); setRejectReason(''); }}
                                  className="btn btn-sm btn-danger"
                                  style={{ display: 'flex', alignItems: 'center', gap: 2 }}
                                >
                                  <X size={11} /> Reject
                                </button>
                              </>
                            )}
                            {status !== 'pending' && status !== 'rejected' && (
                              <button
                                id={`toggle-shop-${shop.id}`}
                                onClick={() => handleToggleStatus(shop.id, status === 'active')}
                                className={`btn btn-sm ${status === 'active' ? 'btn-danger' : 'btn-success'}`}
                              >
                                {status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                            )}
                            {status === 'rejected' && (
                              <button
                                onClick={() => handleApprove(shop.id, shop.plan)}
                                className="btn btn-sm btn-success"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mobile-only-card-list">
              {filtered.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)', fontSize: '0.78rem' }}>No matching tenants found.</p>
              ) : filtered.map(shop => {
                const isShopActive = shop.isactive !== false && shop.status === 'active';
                const status = shop.status || 'active';
                return (
                  <div key={shop.id} className="mobile-card" style={{ gap: '0.65rem' }}>
                    <div className="mobile-card-row" style={{ borderBottom: '1px dashed var(--border)', paddingBottom: '6px', marginBottom: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Store size={14} className="text-blue-600" />
                        <span className="mobile-card-title">{shop.businessname}</span>
                      </div>
                      <div>
                        {status === 'pending' && <span className="badge badge-amber" style={{ fontSize: '0.6rem' }}>Pending Review</span>}
                        {status === 'rejected' && <span className="badge badge-red" style={{ fontSize: '0.6rem' }} title={shop.rejectionreason}>Rejected</span>}
                        {status === 'active' && isShopActive && <span className="badge badge-green" style={{ fontSize: '0.6rem' }}>Active</span>}
                        {status === 'suspended' && <span className="badge badge-red" style={{ fontSize: '0.6rem' }}>Suspended</span>}
                      </div>
                    </div>
                    
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Owner</span>
                      <span className="mobile-card-value">{shop.ownername}</span>
                    </div>

                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Contact</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-2)' }}>{shop.email}</span>
                        {shop.phone && <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{shop.phone}</span>}
                      </div>
                    </div>

                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Registered</span>
                      <span className="mobile-card-value">
                        {shop.createdat ? new Date(shop.createdat).toLocaleDateString('en-IN') : 'N/A'}
                      </span>
                    </div>

                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Active Plan</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '.7rem', color: '#4F46E5' }}>
                          ⚡ {shop.plan}
                        </span>
                        {shop.planrequeststatus === 'pending' && (
                          <div style={{
                            background: '#FEF3C7',
                            border: '1px solid #F59E0B',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            marginTop: '2px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            alignItems: 'flex-end'
                          }}>
                            <span style={{ fontSize: '.62rem', fontWeight: 800, color: '#D97706' }}>
                              ⚠️ REQ: {shop.requestedplan?.toUpperCase()}
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => handleApprovePlanChange(shop.id, shop.requestedplan)}
                                className="btn btn-success"
                                style={{ padding: '2px 4px', fontSize: '.6rem', borderRadius: '4px' }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setRejectPlanShopId(shop.id);
                                  setTargetRequestedPlan(shop.requestedplan);
                                  setRejectPlanReason('');
                                }}
                                className="btn btn-danger"
                                style={{ padding: '2px 4px', fontSize: '.6rem', borderRadius: '4px' }}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                        {isShopActive && shop.planrequeststatus !== 'pending' && (
                          <select
                            value={shop.plan}
                            onChange={(e) => handlePlanChange(shop.id, e.target.value)}
                            style={{ fontSize: '.65rem', padding: '2px 4px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)' }}
                          >
                            {availablePlans.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Expires At</span>
                      <span className="mobile-card-value">
                        {shop.subscriptionexpiresat ? new Date(shop.subscriptionexpiresat).toLocaleDateString('en-IN') : 'Unlimited (Free)'}
                      </span>
                    </div>

                    <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      {/* Password reset */}
                      <div>
                        {editingPasswordShopId === shop.id ? (
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input
                              type={showPassword ? "text" : "password"}
                              placeholder="New password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              style={{ fontSize: '.7rem', padding: '4px 6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', width: '90px' }}
                            />
                            <button
                              onClick={() => handleUpdatePassword(shop.id)}
                              className="btn btn-success"
                              style={{ padding: '4px 6px', fontSize: '.65rem', borderRadius: '6px' }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingPasswordShopId(null); setNewPassword(''); }}
                              className="btn btn-ghost"
                              style={{ padding: '4px 6px', fontSize: '.65rem', borderRadius: '6px' }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingPasswordShopId(shop.id); setNewPassword(''); }}
                            className="btn btn-ghost"
                            style={{ padding: '4px 8px', fontSize: '.68rem', fontWeight: 600, color: 'var(--blue)', background: 'var(--blue-light)', border: '1px solid var(--blue-mid)', borderRadius: '6px' }}
                          >
                            🔑 Password
                          </button>
                        )}
                      </div>

                      {/* Approval / Suspend actions */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(shop.id, shop.plan)}
                              className="btn btn-sm btn-success"
                              style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 8px', fontSize: '0.68rem' }}
                            >
                              <Check size={11} /> Approve
                            </button>
                            <button
                              onClick={() => { setRejectId(shop.id); setRejectReason(''); }}
                              className="btn btn-sm btn-danger"
                              style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 8px', fontSize: '0.68rem' }}
                            >
                              <X size={11} /> Reject
                            </button>
                          </>
                        )}
                        {status !== 'pending' && status !== 'rejected' && (
                          <button
                            onClick={() => handleToggleStatus(shop.id, status === 'active')}
                            className={`btn btn-sm ${status === 'active' ? 'btn-danger' : 'btn-success'}`}
                            style={{ padding: '4px 10px', fontSize: '0.68rem' }}
                          >
                            {status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                        {status === 'rejected' && (
                          <button
                            onClick={() => handleApprove(shop.id, shop.plan)}
                            className="btn btn-sm btn-success"
                            style={{ padding: '4px 10px', fontSize: '0.68rem' }}
                          >
                            Approve
                          </button>
                        )}
                      </div>
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
