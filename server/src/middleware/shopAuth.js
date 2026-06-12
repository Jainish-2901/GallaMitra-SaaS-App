import { db } from '../db.js';
import { verifyShopToken } from '../utils/tokens.js';

const SAFE_SHOP_FIELDS = `
    id, "businessName", "ownerName", "email", "phone",
    "logoUrl", "signatureUrl", "address", "businessPhone", "businessEmail",
    "gstin", "state", "vpa", "isActive", "language",
    "plan", "status", "approvedAt", "subscriptionExpiresAt", "createdAt", "updatedAt",
    "requestedPlan", "planRequestStatus", "bankDetails", "invoiceTerms"
`;

export const shopAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : req.headers['x-shop-token'];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required. Please log in again.' });
    }

    try {
        const payload = verifyShopToken(token);
        const result = await db.query(
            `SELECT ${SAFE_SHOP_FIELDS} FROM "Shop"
             WHERE id = $1 AND "isActive" = TRUE AND "status" = 'active'`,
            [payload.shopId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Session expired or workspace inactive.' });
        }

        const shop = result.rows[0];
        const planRes = await db.query(
            'SELECT "allowedTabs", "allowMultiBusiness" FROM "Plan" WHERE id = $1',
            [shop.plan]
        );
        if (planRes.rows.length > 0) {
            shop.allowedTabs = planRes.rows[0].allowedTabs;
            shop.allowMultiBusiness = !!planRes.rows[0].allowMultiBusiness;
        } else {
            shop.allowedTabs = [
                'dashboard', 'cust_list', 'supp_list', 'sale_ledger',
                'purchase_ledger', 'payment_receipt', 'receipt_list', 'user_settings'
            ];
            shop.allowMultiBusiness = false;
        }

        req.shop = shop;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }
};

export const requireBodyShopId = (req, res, next) => {
    const shopId = req.body?.shopId;
    if (!shopId || shopId !== req.shop.id) {
        return res.status(403).json({ error: 'Forbidden: shop context mismatch.' });
    }
    next();
};

export const requireParamShopId = (req, res, next) => {
    const shopId = req.params?.shopId;
    if (!shopId || shopId !== req.shop.id) {
        return res.status(403).json({ error: 'Forbidden: shop context mismatch.' });
    }
    next();
};

export const requireParamShopIdAsId = (req, res, next) => {
    const shopId = req.params?.id;
    if (!shopId || shopId !== req.shop.id) {
        return res.status(403).json({ error: 'Forbidden: shop context mismatch.' });
    }
    next();
};

export const requireMatchingEmail = (req, res, next) => {
    const email = decodeURIComponent(req.params?.email || '').toLowerCase().trim();
    if (!email || email !== req.shop.email?.toLowerCase()) {
        return res.status(403).json({ error: 'Forbidden: email mismatch.' });
    }
    next();
};
