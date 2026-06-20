import { prisma } from '../utils/prisma.js';
import { verifyShopToken } from '../utils/tokens.js';

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
        const shop = await prisma.shop.findFirst({
            where: {
                id: payload.shopId,
                isActive: true,
                status: 'active'
            }
        });

        if (!shop) {
            return res.status(401).json({ error: 'Session expired or workspace inactive.' });
        }

        // Clean password hash and OTP fields
        delete shop.passwordHash;
        delete shop.otpCode;
        delete shop.otpExpiresAt;

        const plan = await prisma.plan.findUnique({
            where: { id: shop.plan || '' }
        });

        if (plan) {
            shop.allowedTabs = plan.allowedTabs;
            shop.allowMultiBusiness = !!plan.allowMultiBusiness;
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
