import React, { createContext, useState, useEffect } from 'react';
import { getCookie, setCookie, eraseCookie } from '../utils/cookies.js';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [activeShop, setActiveShop] = useState(() => {
        const savedSession = getCookie('gm_session_tenant');
        try {
            return (savedSession && savedSession !== 'undefined') ? JSON.parse(savedSession) : null;
        } catch (error) {
            console.error('🚨 Corrupted local session detected. Purging...', error);
            eraseCookie('gm_session_tenant');
            return null;
        }
    });

    // pendingShop: set when user registered but not yet approved
    const [pendingShop, setPendingShop] = useState(() => {
        const saved = localStorage.getItem('gm_pending_shop');
        try { return saved ? JSON.parse(saved) : null; } catch { return null; }
    });

    const [customers, setCustomers] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [ledgerHistory, setLedgerHistory] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [purchaseBills, setPurchaseBills] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [plans, setPlans] = useState([]);
    const [workspaces, setWorkspaces] = useState([]);
    const [products, setProducts] = useState([]);
    const [creditNotes, setCreditNotes] = useState([]);
    const [debitNotes, setDebitNotes] = useState([]);
    const [loading, setLoading] = useState(false);

    const [backendApiUrl, setBackendApiUrl] = useState(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api');
    const [platformUrls, setPlatformUrls] = useState({ backendUrl: '', frontendUrl: '', adminUrl: '' });
    const BACKEND_URL = backendApiUrl;

    const getAuthHeaders = () => {
        const token = getCookie('gm_shop_token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
    };

    const handleSessionExpiry = (response) => {
        if (response.status === 401) {
            eraseCookie('gm_shop_token');
            eraseCookie('gm_session_tenant');
            setActiveShop(null);
        }
        return response;
    };

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const initialBackend = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';
                const res = await fetch(`${initialBackend}/shops/public-config`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        if (data.backendUrl) {
                            let cleanUrl = data.backendUrl.trim();
                            if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
                            setBackendApiUrl(`${cleanUrl}/api`);
                        }
                        setPlatformUrls({
                            backendUrl: data.backendUrl || '',
                            frontendUrl: data.frontendUrl || '',
                            adminUrl: data.adminUrl || ''
                        });
                    }
                }
            } catch (err) {
                console.error('🚨 Error fetching public config:', err);
            }
        };
        fetchConfig();
    }, []);

    // 1A. Register new shop owner with plan
    const registerShopOwner = async (businessName, ownerName, email, phone, password, plan = 'starter') => {
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/shops/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessName, ownerName, email, phone, password, plan })
            });
            const data = await response.json();
            if (response.ok) {
                if (data.pending) {
                    // Store pending shop for the waiting screen
                    localStorage.setItem('gm_pending_shop', JSON.stringify(data.shop));
                    setPendingShop(data.shop);
                    return { success: true, shop: data.shop, pending: true };
                }
                if (data.token) setCookie('gm_shop_token', data.token);
                setActiveShop(data.shop);
                setCookie('gm_session_tenant', JSON.stringify(data.shop));
                return { success: true, shop: data.shop };
            }
            return { success: false, error: data.error };
        } catch (error) {
            return { success: false, error: 'Server cluster unreachable' };
        } finally {
            setLoading(false);
        }
    };

    // 1B. Login existing owner with email + password
    const loginShopOwner = async (email, password, businessName) => {
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/shops/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, businessName })
            });
            const data = await response.json();
            if (response.ok) {
                if (data.shops) {
                    return { success: true, shops: data.shops };
                }
                if (data.token) setCookie('gm_shop_token', data.token);
                setActiveShop(data.shop);
                setCookie('gm_session_tenant', JSON.stringify(data.shop));
                return { success: true, shop: data.shop };
            }
            // Handle special statuses
            if (data.status === 'pending') {
                const pendingData = { businessName: data.businessName, id: data.shopId, email, plan: data.plan, status: 'pending' };
                localStorage.setItem('gm_pending_shop', JSON.stringify(pendingData));
                setPendingShop(pendingData);
                return { success: false, pending: true, error: data.error };
            }
            return { success: false, error: data.error };
        } catch (error) {
            return { success: false, error: 'Server cluster unreachable' };
        } finally {
            setLoading(false);
        }
    };

    // Logout clear utility handler
    const terminateSessionLogout = () => {
        const token = getCookie('gm_shop_token');
        if (token && activeShop?.id) {
            fetch(`${BACKEND_URL}/shops/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }).catch(err => console.error('🚨 Error registering server logout:', err));
        }

        eraseCookie('gm_shop_token');
        eraseCookie('gm_session_tenant');
        localStorage.removeItem('gm_pending_shop');
        setActiveShop(null);
        setPendingShop(null);
        setCustomers([]);
        setSuppliers([]);
        setLedgerHistory([]);
        setProducts([]);
    };

    // Check if a pending shop got approved (re-try login)
    const checkApprovalStatus = async () => {
        if (!pendingShop?.id) return { approved: false };
        try {
            const statusRes = await fetch(`${BACKEND_URL}/shops/status/${pendingShop.id}`);
            if (statusRes.ok) {
                const data = await statusRes.json();
                if (data.status === 'active') {
                    localStorage.removeItem('gm_pending_shop');
                    setPendingShop(null);
                    if (data.token) setCookie('gm_shop_token', data.token);
                    setActiveShop(data.shop);
                    setCookie('gm_session_tenant', JSON.stringify(data.shop));
                    return { approved: true, shop: data.shop };
                }
                return { approved: false, status: data.status, supportPhone: data.supportPhone, supportEmail: data.supportEmail };
            }
        } catch (err) {
            console.error('Error checking approval status:', err);
        }
        return { approved: false };
    };

    // 2. Comprehensive Workspace Synchronization Layer
    const fetchAllWorkspaceData = async (shopId) => {
        if (!shopId) return;
        setLoading(true);
        try {
            const headers = getAuthHeaders();
            const response = await fetch(`${BACKEND_URL}/shops/workspace-data/${shopId}`, { headers });
            handleSessionExpiry(response);

            if (response.ok) {
                const data = await response.json();
                setCustomers(data.customers || []);
                setSuppliers(data.suppliers || []);
                setLedgerHistory(data.ledgers || []);
                setInvoices(data.invoices || []);
                setPurchaseBills(data.purchaseBills || []);
                setReceipts(data.receipts || []);
                setProducts(data.products || []);
                setCreditNotes(data.creditNotes || []);
                setDebitNotes(data.debitNotes || []);
            }
        } catch (error) {
            console.error('🚨 Workspace sync crash:', error);
        } finally {
            setLoading(false);
        }
    };

    // 3. Create New Party Record (Customer/Supplier)
    const addPartyRecord = async (name, phone, role, extraDetails = {}) => {
        if (!activeShop) return { success: false, error: 'Session context lost' };
        try {
            const response = await fetch(`${BACKEND_URL}/parties/create`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ shopId: activeShop.id, name, phone, role, ...extraDetails })
            });
            const newParty = await response.json();
            if (response.ok) {
                if (role === 'customer') setCustomers(prev => [newParty, ...prev]);
                else setSuppliers(prev => [newParty, ...prev]);
                // Trigger workspace reload to immediately update ledger/balances correctly (especially for opening balance ledger entry)
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true };
            }
            return { success: false, error: newParty.error };
        } catch (error) {
            return { success: false, error: 'Server error' };
        }
    };

    // 3.5. Update Existing Party Record (Customer/Supplier)
    const updatePartyRecord = async (id, role, name, phone, extraDetails = {}) => {
        if (!activeShop) return { success: false, error: 'Session context lost' };
        try {
            const response = await fetch(`${BACKEND_URL}/parties/update/${id}?role=${role}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ name, phone, ...extraDetails })
            });
            const updatedParty = await response.json();
            if (response.ok) {
                if (role === 'customer') {
                    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updatedParty } : c));
                } else {
                    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updatedParty } : s));
                }
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true, party: updatedParty };
            }
            return { success: false, error: updatedParty.error };
        } catch (error) {
            return { success: false, error: 'Server error updating party profile' };
        }
    };

    // 3.6. Fetch single party details from database
    const fetchPartyDetail = async (id, role) => {
        try {
            const response = await fetch(`${BACKEND_URL}/parties/detail/${id}?role=${role}`, { headers: getAuthHeaders() });
            handleSessionExpiry(response);
            if (response.ok) {
                return await response.json();
            }
            const err = await response.json();
            return { error: err.error || 'Failed to fetch details' };
        } catch (error) {
            return { error: 'Network error fetching details' };
        }
    };

    // 4. Safe Soft-Delete Party Profiles
    const removePartyRecord = async (id, role) => {
        try {
            const response = await fetch(`${BACKEND_URL}/parties/remove/${id}?role=${role}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            handleSessionExpiry(response);
            if (response.ok) {
                if (role === 'customer') setCustomers(prev => prev.filter(c => c.id !== id));
                else setSuppliers(prev => prev.filter(s => s.id !== id));
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            return { success: false };
        }
    };

    // 4.5. Products & Services CRUD
    const addProductRecord = async (name, price, description, extraDetails = {}) => {
        if (!activeShop) return { success: false, error: 'Session context lost' };
        try {
            const response = await fetch(`${BACKEND_URL}/products/create`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ shopId: activeShop.id, name, price: parseFloat(price || 0), description, ...extraDetails })
            });
            const data = await response.json();
            if (response.ok) {
                setProducts(prev => [data, ...prev]);
                return { success: true, product: data };
            }
            return { success: false, error: data.error };
        } catch (error) {
            return { success: false, error: 'Server error' };
        }
    };

    const updateProductRecord = async (id, name, price, description, extraDetails = {}) => {
        if (!activeShop) return { success: false, error: 'Session context lost' };
        try {
            const response = await fetch(`${BACKEND_URL}/products/update/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ name, price: parseFloat(price || 0), description, ...extraDetails })
            });
            const data = await response.json();
            if (response.ok) {
                setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
                return { success: true, product: data };
            }
            return { success: false, error: data.error };
        } catch (error) {
            return { success: false, error: 'Server error' };
        }
    };

    const removeProductRecord = async (id) => {
        if (!activeShop) return { success: false, error: 'Session context lost' };
        try {
            const response = await fetch(`${BACKEND_URL}/products/remove/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            const data = await response.json();
            if (response.ok) {
                setProducts(prev => prev.filter(p => p.id !== id));
                return { success: true };
            }
            return { success: false, error: data.error };
        } catch (error) {
            return { success: false, error: 'Server error' };
        }
    };

    // 5. Build Fresh Dynamic Invoices
    const postInvoice = async (invoiceData) => {
        try {
            const response = await fetch(`${BACKEND_URL}/invoices/build`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ shopId: activeShop.id, ...invoiceData })
            });
            if (response.ok) {
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true };
            }
            const err = await response.json();
            return { success: false, error: err.error };
        } catch (error) {
            return { success: false, error: 'Invoice broadcast failed' };
        }
    };

    // 6. Post Independent Cash/UPI Payment Receipts
    const postPaymentReceipt = async (receiptNo, customerId, supplierId, amount, paymentMode, remark, date) => {
        try {
            const response = await fetch(`${BACKEND_URL}/transactions/receipt/build`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ receiptNo, shopId: activeShop.id, customerId, supplierId, amount, paymentMode, remark, date })
            });
            if (response.ok) {
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            return { success: false, error: 'Voucher broadcast failed' };
        }
    };

    // 7. Post Fresh Direct Ledger Entries (GIVE/TAKE overrides)
    const postManualLedgerEntry = async (amount, type, particulars, customerId, supplierId, date) => {
        try {
            const response = await fetch(`${BACKEND_URL}/ledgers/entry`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ shopId: activeShop.id, customerId, supplierId, particulars, type, amount, date })
            });
            if (response.ok) {
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            return { success: false };
        }
    };

    // 8. Delete Invoice
    const deleteInvoice = async (id) => {
        try {
            const response = await fetch(`${BACKEND_URL}/invoices/purge/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            handleSessionExpiry(response);
            if (response.ok) {
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            return { success: false };
        }
    };

    // 9. Edit Invoice
    const editInvoice = async (id, invoiceData) => {
        try {
            const response = await fetch(`${BACKEND_URL}/invoices/alter/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ ...invoiceData })
            });
            if (response.ok) {
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            return { success: false };
        }
    };

    // 10. Delete Payment Receipt
    const deletePaymentReceipt = async (id) => {
        try {
            const response = await fetch(`${BACKEND_URL}/transactions/receipt/purge/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            handleSessionExpiry(response);
            if (response.ok) {
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            return { success: false };
        }
    };

    // Edit Payment Receipt
    const editPaymentReceipt = async (id, receiptData) => {
        try {
            const response = await fetch(`${BACKEND_URL}/transactions/receipt/alter/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ ...receiptData })
            });
            if (response.ok) {
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            return { success: false };
        }
    };

    const postPurchaseBill = async (billNo, supplierId, itemsArray, totalAmount, slipDetails, attachedImgUrl, advancePayment, paymentMode) => {
        try {
            const response = await fetch(`${BACKEND_URL}/transactions/purchase/build`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ billNo, shopId: activeShop.id, supplierId, itemsArray, totalAmount, slipDetails, attachedImgUrl, advancePayment, paymentMode })
            });
            if (response.ok) {
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            return { success: false, error: 'Purchase bill broadcast failed' };
        }
    };

    // 12. Delete Purchase Bill
    const deletePurchaseBill = async (id) => {
        try {
            const response = await fetch(`${BACKEND_URL}/transactions/purchase/purge/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            handleSessionExpiry(response);
            if (response.ok) {
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            return { success: false };
        }
    };

    // 12.5. Credit/Debit Notes Operations
    const postCreditNote = async (noteData) => {
        try {
            const response = await fetch(`${BACKEND_URL}/notes/credit/create`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ shopId: activeShop.id, ...noteData })
            });
            if (response.ok) {
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true };
            }
            const err = await response.json();
            return { success: false, error: err.error };
        } catch (error) {
            return { success: false, error: 'Credit Note save failed' };
        }
    };

    const deleteCreditNote = async (id) => {
        try {
            const response = await fetch(`${BACKEND_URL}/notes/credit/remove/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            handleSessionExpiry(response);
            if (response.ok) {
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            return { success: false };
        }
    };

    const postDebitNote = async (noteData) => {
        try {
            const response = await fetch(`${BACKEND_URL}/notes/debit/create`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ shopId: activeShop.id, ...noteData })
            });
            if (response.ok) {
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true };
            }
            const err = await response.json();
            return { success: false, error: err.error };
        } catch (error) {
            return { success: false, error: 'Debit Note save failed' };
        }
    };

    const deleteDebitNote = async (id) => {
        try {
            const response = await fetch(`${BACKEND_URL}/notes/debit/remove/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            handleSessionExpiry(response);
            if (response.ok) {
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            return { success: false };
        }
    };

    const updateCreditNote = async (id, noteData) => {
        try {
            const response = await fetch(`${BACKEND_URL}/notes/credit/update/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ shopId: activeShop.id, ...noteData })
            });
            handleSessionExpiry(response);
            if (response.ok) {
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true };
            }
            const err = await response.json();
            return { success: false, error: err.error };
        } catch (error) {
            return { success: false, error: 'Credit Note update failed' };
        }
    };

    const updateDebitNote = async (id, noteData) => {
        try {
            const response = await fetch(`${BACKEND_URL}/notes/debit/update/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ shopId: activeShop.id, ...noteData })
            });
            handleSessionExpiry(response);
            if (response.ok) {
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true };
            }
            const err = await response.json();
            return { success: false, error: err.error };
        } catch (error) {
            return { success: false, error: 'Debit Note update failed' };
        }
    };

    // 13. Update Shop Settings
    const updateShopSettings = async (settings) => {
        // Optimistic UI state sync with 0 Buffering Delay
        if (activeShop) {
            const tempShop = {
                ...activeShop,
                ...settings
            };
            setActiveShop(tempShop);
            setCookie('gm_session_tenant', JSON.stringify(tempShop));
        }

        try {
            const response = await fetch(`${BACKEND_URL}/shops/settings`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ shopId: activeShop.id, ...settings })
            });
            const data = await response.json();
            if (response.ok) {
                setActiveShop(data.shop);
                setCookie('gm_session_tenant', JSON.stringify(data.shop));
                return { success: true, shop: data.shop };
            }
            return { success: false, error: data.error };
        } catch (error) {
            return { success: false, error: 'Server error updating settings' };
        }
    };

    const fetchPortalShareLink = async (id, role = 'customer') => {
        try {
            const response = await fetch(
                `${BACKEND_URL}/parties/portal-token/${id}?role=${role}`,
                { headers: getAuthHeaders() }
            );
            handleSessionExpiry(response);
            const data = await response.json();
            if (response.ok && data.success) {
                let portalUrl = data.portalUrl;
                try {
                    const parsedUrl = new URL(portalUrl);
                    const currentOrigin = window.location.origin;
                    portalUrl = `${currentOrigin}${parsedUrl.pathname}${parsedUrl.search}`;
                } catch (e) {
                    console.error("Error patching portal URL domain:", e);
                }
                return { success: true, portalUrl, token: data.token };
            }
            return { success: false, error: data.error || 'Failed to generate portal link.' };
        } catch (error) {
            return { success: false, error: 'Network error generating portal link.' };
        }
    };

    const generateShortShareLink = async ({ partyId, role, tab = '', docId = '', receiptId = '' }) => {
        try {
            const response = await fetch(
                `${BACKEND_URL}/parties/portal-token/${partyId}?role=${role}`,
                { headers: getAuthHeaders() }
            );
            handleSessionExpiry(response);
            const data = await response.json();
            if (!response.ok || !data.success) {
                return { success: false, error: data.error || 'Failed to generate portal link.' };
            }

            const shareId = data.shareId;
            const frontendBase = window.location.origin;
            let shortUrl = `${frontendBase}/s/${shareId}`;

            const params = [];
            if (tab) params.push(`tab=${tab}`);
            if (docId) params.push(`docId=${docId}`);
            if (receiptId) params.push(`receiptId=${receiptId}`);

            if (params.length > 0) {
                shortUrl += `?${params.join('&')}`;
            }

            let fullUrl = data.portalUrl;
            if (tab) fullUrl += `&tab=${tab}`;
            if (docId) fullUrl += `&docId=${docId}`;
            if (receiptId) fullUrl += `&receiptId=${receiptId}`;

            return { success: true, shortUrl, fullUrl };
        } catch (error) {
            console.error('Error generating short share link:', error);
            return { success: false, error: 'Network error generating share link.' };
        }
    };

    const fetchPublicCustomer = async (id, token) => {
        if (!token) return { error: 'Portal access token is required.' };
        const res = await fetch(`${BACKEND_URL}/parties/public/customer/${id}?token=${encodeURIComponent(token)}`);
        return await res.json();
    };

    const fetchPublicSupplier = async (id, token) => {
        if (!token) return { error: 'Portal access token is required.' };
        const res = await fetch(`${BACKEND_URL}/parties/public/supplier/${id}?token=${encodeURIComponent(token)}`);
        return await res.json();
    };

    const fetchPlans = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/shops/plans`);
            const data = await res.json();
            if (data.success) {
                setPlans(data.plans || []);
                return data.plans;
            }
        } catch (error) {
            console.error('Error fetching plans:', error);
        }
        return [];
    };

    const requestForgotPasswordOtp = async (email) => {
        try {
            const res = await fetch(`${BACKEND_URL}/shops/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            return await res.json();
        } catch (error) {
            return { success: false, error: 'Network connection failure.' };
        }
    };

    const submitResetPassword = async (email, otp, newPassword) => {
        try {
            const res = await fetch(`${BACKEND_URL}/shops/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword })
            });
            return await res.json();
        } catch (error) {
            return { success: false, error: 'Network connection failure.' };
        }
    };

    const requestPlanChange = async (planId) => {
        if (!activeShop) return { success: false, error: 'Session context lost' };
        try {
            const response = await fetch(`${BACKEND_URL}/shops/request-plan`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ shopId: activeShop.id, planId })
            });
            const data = await response.json();
            if (response.ok) {
                const tempShop = {
                    ...activeShop,
                    requestedPlan: planId,
                    planRequestStatus: 'pending'
                };
                setActiveShop(tempShop);
                setCookie('gm_session_tenant', JSON.stringify(tempShop));
                return { success: true };
            }
            return { success: false, error: data.error || 'Failed to submit plan request' };
        } catch (error) {
            return { success: false, error: 'Server cluster unreachable' };
        }
    };

    const fetchMyWorkspaces = async (email) => {
        if (!email) return [];
        try {
            const response = await fetch(`${BACKEND_URL}/shops/my-workspaces/${encodeURIComponent(email)}`, {
                headers: getAuthHeaders()
            });
            handleSessionExpiry(response);
            const data = await response.json();
            if (response.ok && data.success) {
                setWorkspaces(data.shops || []);
                return data.shops;
            }
        } catch (error) {
            console.error('🚨 Error fetching workspaces:', error);
        }
        return [];
    };

    // Switch to another workspace owned by the same email — gets a fresh JWT token
    const switchWorkspace = async (targetShopId) => {
        if (!targetShopId) return { success: false, error: 'No target workspace' };
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/shops/switch-workspace`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ targetShopId })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                if (data.token) setCookie('gm_shop_token', data.token);
                setActiveShop(data.shop);
                setCookie('gm_session_tenant', JSON.stringify(data.shop));
                await fetchAllWorkspaceData(data.shop.id);
                return { success: true, shop: data.shop };
            }
            return { success: false, error: data.error || 'Failed to switch workspace.' };
        } catch (error) {
            console.error('🚨 Error switching workspace:', error);
            return { success: false, error: 'Server cluster unreachable' };
        } finally {
            setLoading(false);
        }
    };

    // PWA Prompt Capturer
    const [installPrompt, setInstallPrompt] = useState(null);
    useEffect(() => {
        const handlePrompt = (e) => {
            // Do NOT call e.preventDefault() to avoid blocking browser's automatic installation prompts
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handlePrompt);
        return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
    }, []);

    const installApp = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setInstallPrompt(null);
        }
    };

    // Edit Purchase Bill
    const editPurchaseBill = async (id, billData) => {
        try {
            const response = await fetch(`${BACKEND_URL}/transactions/purchase/alter/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ ...billData })
            });
            if (response.ok) {
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            return { success: false };
        }
    };

    // Edit Manual Ledger Entry
    const editManualLedgerEntry = async (id, entryData) => {
        try {
            const response = await fetch(`${BACKEND_URL}/ledgers/update/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ ...entryData })
            });
            if (response.ok) {
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            return { success: false };
        }
    };

    // Delete Manual Ledger Entry
    const deleteManualLedgerEntry = async (id) => {
        try {
            const response = await fetch(`${BACKEND_URL}/ledgers/purge/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            handleSessionExpiry(response);
            if (response.ok) {
                await fetchAllWorkspaceData(activeShop.id);
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            return { success: false };
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    useEffect(() => {
        const savedShop = getCookie('gm_session_tenant');
        const savedToken = getCookie('gm_shop_token');
        if (savedShop && savedShop !== 'undefined' && !savedToken) {
            eraseCookie('gm_session_tenant');
            setActiveShop(null);
        }
    }, []);

    const refreshActiveShopProfile = async (shopId) => {
        if (!shopId) return;
        try {
            const res = await fetch(`${BACKEND_URL}/shops/profile/${shopId}`, { headers: getAuthHeaders() });
            handleSessionExpiry(res);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.shop) {
                    const cachedStr = getCookie('gm_session_tenant');
                    const newStr = JSON.stringify(data.shop);
                    if (cachedStr !== newStr) {
                        setActiveShop(data.shop);
                        setCookie('gm_session_tenant', newStr);
                    }
                }
            }
        } catch (error) {
            console.error('🚨 Error refreshing active shop profile:', error);
        }
    };

    const deleteBusinessWorkspace = async (shopId) => {
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/shops/${shopId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            handleSessionExpiry(response);
            const data = await response.json();
            if (response.ok && data.success) {
                const remaining = workspaces.filter(w => w.id !== shopId);
                setWorkspaces(remaining);

                if (remaining.length > 0) {
                    const nextActive = remaining[0];
                    // Use switchWorkspace to get a fresh token for the next workspace
                    const switchRes = await switchWorkspace(nextActive.id);
                    if (!switchRes.success) {
                        // Fallback: set directly (may cause 403 on next API call)
                        setActiveShop(nextActive);
                        setCookie('gm_session_tenant', JSON.stringify(nextActive));
                    }
                    return { success: true, remaining: true, message: `Workspace deleted successfully. Switched to "${nextActive.businessName}".` };
                } else {
                    localStorage.setItem('gm_deleted_only_business', 'true');
                    terminateSessionLogout();
                    return { success: true, remaining: false, message: 'Workspace deleted successfully.' };
                }
            }
            return { success: false, error: data.error || 'Failed to delete workspace.' };
        } catch (error) {
            console.error('🚨 Error deleting workspace:', error);
            return { success: false, error: 'Server cluster unreachable' };
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeShop?.id) {
            refreshActiveShopProfile(activeShop.id);
            fetchAllWorkspaceData(activeShop.id);
            if (activeShop.email) {
                fetchMyWorkspaces(activeShop.email);
            }
        }
    }, [activeShop?.id]);

    return (
        <AppContext.Provider value={{
            activeShop, setActiveShop, pendingShop, setPendingShop, checkApprovalStatus, workspaces, fetchMyWorkspaces, customers, suppliers, ledgerHistory, invoices, purchaseBills, receipts, products, loading, plans,
            registerShopOwner, loginShopOwner, terminateSessionLogout,
            addPartyRecord, removePartyRecord, updatePartyRecord, fetchPartyDetail, postManualLedgerEntry,
            postInvoice, postPaymentReceipt, deleteInvoice, editInvoice, deletePaymentReceipt, postPurchaseBill,
            deletePurchaseBill, updateShopSettings, fetchPortalShareLink, generateShortShareLink,
            fetchPublicCustomer, fetchPublicSupplier, fetchPlans, requestForgotPasswordOtp, submitResetPassword,
            requestPlanChange, installApp, isInstallable: !!installPrompt, editPurchaseBill, editManualLedgerEntry, deleteManualLedgerEntry,
            editPaymentReceipt, triggerReload: () => fetchAllWorkspaceData(activeShop?.id),
            deleteBusinessWorkspace, platformUrls, switchWorkspace,
            addProductRecord, updateProductRecord, removeProductRecord,
            creditNotes, debitNotes, postCreditNote, deleteCreditNote, postDebitNote, deleteDebitNote, updateCreditNote, updateDebitNote
        }}>
            {children}
        </AppContext.Provider>
    );
};