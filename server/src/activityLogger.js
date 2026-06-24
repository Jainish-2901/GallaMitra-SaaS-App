import { prisma } from './utils/prisma.js';

const ALLOWED_TYPES = [
    'SHOP_REGISTERED',
    'SHOP_LOGIN',
    'ADMIN_LOGIN',
    'SHOP_DELETED',
    'SHOP_LOGOUT',
    'ADMIN_SHOP_DELETED',
    'SHOP_WORKSPACE_DELETED'
];

/**
 * Log an activity event to the database
 * @param {string|null} shopId - Shop tenant UUID (null for admin/system level events)
 * @param {string} type - Event type (e.g. 'INVOICE_CREATED', 'SHOP_APPROVED')
 * @param {string} actor - Actor name (e.g. 'Owner', 'System', 'Admin')
 * @param {string} target - Details of the action target (e.g. 'INV-001 - ₹2500')
 */
export const logActivity = async (shopId, type, actor, target) => {
    if (!ALLOWED_TYPES.includes(type)) {
        // Skip database insertion to save storage, but still log to console for debugging
        console.log(`ℹ️ [Skipped DB Log] Activity: [${type}] by ${actor} on ${target}`);
        return;
    }

    try {
        await prisma.activityLog.create({
            data: {
                shopId: shopId || null,
                type,
                actor,
                target
            }
        });
        console.log(`📝 Logged Activity: [${type}] by ${actor} on ${target}`);
    } catch (error) {
        console.error('🚨 Error saving activity log:', error);
    }
};
