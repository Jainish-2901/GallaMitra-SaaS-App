import { db } from './db.js';

/**
 * Log an activity event to the database
 * @param {string|null} shopId - Shop tenant UUID (null for admin/system level events)
 * @param {string} type - Event type (e.g. 'INVOICE_CREATED', 'SHOP_APPROVED')
 * @param {string} actor - Actor name (e.g. 'Owner', 'System', 'Admin')
 * @param {string} target - Details of the action target (e.g. 'INV-001 - ₹2500')
 */
export const logActivity = async (shopId, type, actor, target) => {
    try {
        await db.query(
            `INSERT INTO "ActivityLog" ("shopId", "type", "actor", "target", "createdAt")
             VALUES ($1, $2, $3, $4, NOW())`,
            [shopId || null, type, actor, target]
        );
        console.log(`📝 Logged Activity: [${type}] by ${actor} on ${target}`);
    } catch (error) {
        console.error('🚨 Error saving activity log:', error);
    }
};
