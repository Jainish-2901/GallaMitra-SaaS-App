import {
    LayoutDashboard, Users, UserCheck, History, Scroll, FileSpreadsheet,
    FileCheck, FileDigit, PlusCircle, Layers, Receipt, Landmark,
    BarChart3, Settings, Lock
} from 'lucide-react';

// Helper to read cached plans from localStorage for fallback
const getCachedPlans = () => {
    try {
        const cached = localStorage.getItem('gm_plans');
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (e) {
        // Safe check for environment without localStorage
    }
    return null;
};

const buildPlanMeta = (plansList) => {
    if (!plansList || plansList.length === 0) return null;
    return plansList.reduce((acc, plan) => {
        const priceNum = parseFloat(plan.price || 0);
        const isFree = priceNum === 0;
        const isPremium = priceNum >= 200;
        let featuresArr = [];
        try {
            featuresArr = Array.isArray(plan.features) ? plan.features : (typeof plan.features === 'string' ? JSON.parse(plan.features || '[]') : []);
        } catch {
            featuresArr = [];
        }

        acc[plan.id] = {
            label: plan.name,
            price: isFree ? '₹0' : `₹${priceNum}/${plan.billingCycle === 'yearly' ? 'yr' : plan.billingCycle === 'trial' ? 'trial' : plan.billingCycle === '3_months' ? '3mo' : plan.billingCycle === '6_months' ? '6mo' : 'mo'}`,
            color: isFree ? '#059669' : isPremium ? '#7C3AED' : '#2563EB',
            bg: isFree ? '#ECFDF5' : isPremium ? '#F5F3FF' : '#EFF6FF',
            border: isFree ? '#A7F3D0' : isPremium ? '#DDD6FE' : '#BFDBFE',
            desc: featuresArr.join(', '),
        };
        return acc;
    }, {});
};

const buildPlanTabs = (plansList) => {
    if (!plansList || plansList.length === 0) return null;
    return plansList.reduce((acc, plan) => {
        let tabsArr = [];
        try {
            tabsArr = Array.isArray(plan.allowedTabs) ? plan.allowedTabs : (typeof plan.allowedTabs === 'string' ? JSON.parse(plan.allowedTabs || '[]') : []);
        } catch {
            tabsArr = [];
        }
        acc[plan.id] = tabsArr;
        return acc;
    }, {});
};

const cachedPlans = getCachedPlans();
const fallbackMeta = buildPlanMeta(cachedPlans);
const fallbackTabs = buildPlanTabs(cachedPlans);

// ─── PLAN DEFINITIONS (DEFAULT FALLBACKS) ──────────────────────────────────────
const DEFAULT_PLAN_META = fallbackMeta || {
    starter: {
        label: 'Starter',
        price: '₹0',
        color: '#059669',
        bg: '#ECFDF5',
        border: '#A7F3D0',
        desc: 'Free forever — Core ledger management',
    },
    growth: {
        label: 'Growth',
        price: '₹199/mo',
        color: '#2563EB',
        bg: '#EFF6FF',
        border: '#BFDBFE',
        desc: 'Invoices, purchase bills & document history',
    },
    professional: {
        label: 'Professional',
        price: '₹3999/yr',
        color: '#7C3AED',
        bg: '#F5F3FF',
        border: '#DDD6FE',
        desc: 'Full analytics, CSV reports & unlimited access',
    },
};

const DEFAULT_PLAN_TABS = fallbackTabs || {
    starter: [
        'dashboard', 'cust_list', 'supp_list',
        'sale_ledger', 'purchase_ledger',
        'payment_receipt', 'receipt_list',
        'user_settings'
    ],
    growth: [
        'dashboard', 'cust_list', 'supp_list',
        'sale_ledger', 'sales_list',
        'purchase_ledger', 'purchase_list',
        'invoice_builder', 'invoice_list',
        'payment_receipt', 'receipt_list',
        'purchase_bill', 'pbill_list',
        'user_settings', 'business_settings'
    ],
    professional: [
        'dashboard', 'cust_list', 'supp_list',
        'sale_ledger', 'sales_list',
        'purchase_ledger', 'purchase_list',
        'invoice_builder', 'invoice_list',
        'payment_receipt', 'receipt_list',
        'purchase_bill', 'pbill_list',
        'reports', 'analytics',
        'user_settings', 'business_settings'
    ],
};

// ─── DYNAMIC PLAN HELPERS (processes database fetched plans) ────────────────────
export const getPlanMeta = (plansList) => {
    if (!plansList || plansList.length === 0) return DEFAULT_PLAN_META;
    return plansList.reduce((acc, plan) => {
        const priceNum = parseFloat(plan.price || 0);
        const isFree = priceNum === 0;
        const isPremium = priceNum >= 200;
        let featuresArr = [];
        try {
            featuresArr = Array.isArray(plan.features) ? plan.features : (typeof plan.features === 'string' ? JSON.parse(plan.features || '[]') : []);
        } catch {
            featuresArr = [];
        }

        acc[plan.id] = {
            label: plan.name,
            price: isFree ? '₹0' : `₹${priceNum}/${plan.billingCycle === 'yearly' ? 'yr' : plan.billingCycle === 'trial' ? 'trial' : plan.billingCycle === '3_months' ? '3mo' : plan.billingCycle === '6_months' ? '6mo' : 'mo'}`,
            color: isFree ? '#059669' : isPremium ? '#7C3AED' : '#2563EB',
            bg: isFree ? '#ECFDF5' : isPremium ? '#F5F3FF' : '#EFF6FF',
            border: isFree ? '#A7F3D0' : isPremium ? '#DDD6FE' : '#BFDBFE',
            desc: featuresArr.join(', '),
        };
        return acc;
    }, {});
};

export const getPlanTabs = (plansList) => {
    if (!plansList || plansList.length === 0) return DEFAULT_PLAN_TABS;
    return plansList.reduce((acc, plan) => {
        let tabsArr = [];
        try {
            tabsArr = Array.isArray(plan.allowedTabs) ? plan.allowedTabs : (typeof plan.allowedTabs === 'string' ? JSON.parse(plan.allowedTabs || '[]') : []);
        } catch {
            tabsArr = [];
        }
        acc[plan.id] = tabsArr;
        return acc;
    }, {});
};

// ─── FULL TAB REGISTRY ─────────────────────────────────────────────────────────
// plan: minimum plan required to access this tab
export const ownerTabs = [
    // ── Always visible ──────────────────────────────────────────────────────
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard, group: 'Overview', plan: 'starter' },

    // ── Customers & Suppliers ───────────────────────────────────────────────
    { id: 'cust_list', label: 'Customer Management', icon: Users, group: 'Parties', plan: 'starter' },
    { id: 'supp_list', label: 'Supplier Registry', icon: UserCheck, group: 'Parties', plan: 'starter' },

    // ── Ledgers ─────────────────────────────────────────────────────────────
    { id: 'sale_ledger', label: 'Sale Ledger', icon: History, group: 'Ledgers', plan: 'starter' },
    { id: 'sales_list', label: 'Sales Item Registry', icon: Scroll, group: 'Ledgers', plan: 'growth' },
    { id: 'purchase_ledger', label: 'Purchase Ledger', icon: FileSpreadsheet, group: 'Ledgers', plan: 'starter' },
    { id: 'purchase_list', label: 'Purchase Item Registry', icon: FileCheck, group: 'Ledgers', plan: 'growth' },

    // ── Billing ─────────────────────────────────────────────────────────────
    { id: 'invoice_builder', label: 'Invoice Builder', icon: PlusCircle, group: 'Billing', plan: 'growth' },
    { id: 'invoice_list', label: 'Invoice List', icon: Layers, group: 'Billing', plan: 'growth' },
    { id: 'payment_receipt', label: 'Payment Receipt', icon: Receipt, group: 'Billing', plan: 'starter' },
    { id: 'receipt_list', label: 'Payment Voucher List', icon: Layers, group: 'Billing', plan: 'starter' },
    { id: 'purchase_bill', label: 'Purchase Bill Creator', icon: PlusCircle, group: 'Billing', plan: 'growth' },
    { id: 'pbill_list', label: 'Purchase Bill List', icon: Layers, group: 'Billing', plan: 'growth' },

    // ── Reports & Analytics ─────────────────────────────────────────────────
    { id: 'reports', label: 'Reports & CSV Export', icon: FileDigit, group: 'Intelligence', plan: 'professional' },
    { id: 'analytics', label: 'Analytics & Charts', icon: BarChart3, group: 'Intelligence', plan: 'professional' },

    // ── Settings ────────────────────────────────────────────────────────────
    { id: 'user_settings', label: 'Profile Settings', icon: Settings, group: 'Settings', plan: 'starter' },
    { id: 'business_settings', label: 'Business Settings', icon: Settings, group: 'Settings', plan: 'growth' },
];

// ─── CUSTOMER / SUPPLIER PORTALS ────────────────────────────────────────────────
export const customerTabs = [
    { id: 'cust_portal_dash', label: 'Dues Dashboard', icon: LayoutDashboard },
    { id: 'cust_portal_ledger', label: 'My Purchase Ledger', icon: History },
    { id: 'cust_portal_receipts', label: 'Payment History', icon: Receipt },
    { id: 'cust_portal_invoices', label: 'Invoices Copies', icon: Layers },
];

export const supplierTabs = [
    { id: 'supp_portal_dash', label: 'Receivables Monitor', icon: LayoutDashboard },
    { id: 'supp_portal_ledger', label: 'My Sales Ledger', icon: History },
    { id: 'supp_portal_receipts', label: 'Payments Remitted', icon: Receipt },
    { id: 'supp_portal_invoices', label: 'Inventory Receipts', icon: Layers },
];