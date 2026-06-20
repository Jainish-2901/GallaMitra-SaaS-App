import { prisma } from '../utils/prisma.js';

const assertBelongsToShop = async (res, shopId, resourceShopId) => {
    if (!resourceShopId) {
        res.status(404).json({ error: 'Resource not found.' });
        return false;
    }
    if (resourceShopId !== shopId) {
        res.status(403).json({ error: 'Forbidden: resource does not belong to your workspace.' });
        return false;
    }
    return true;
};

export const assertPartyAccess = (role) => async (req, res, next) => {
    const { id } = req.params;
    const model = role === 'supplier' ? prisma.supplier : prisma.customer;
    try {
        const result = await model.findFirst({
            where: { id, isDeleted: false },
            select: { shopId: true }
        });
        if (!result) {
            return res.status(404).json({ error: 'Profile not found or inactive.' });
        }
        if (!(await assertBelongsToShop(res, req.shop.id, result.shopId))) return;
        next();
    } catch (error) {
        console.error('Party access check error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const assertLedgerAccess = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await prisma.ledgerEntry.findUnique({
            where: { id },
            select: { shopId: true }
        });
        if (!result) {
            return res.status(404).json({ error: 'Ledger entry not found.' });
        }
        if (!(await assertBelongsToShop(res, req.shop.id, result.shopId))) return;
        next();
    } catch (error) {
        console.error('Ledger access check error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const assertInvoiceAccess = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await prisma.invoice.findUnique({
            where: { id },
            select: { shopId: true }
        });
        if (!result) {
            return res.status(404).json({ error: 'Invoice not found.' });
        }
        if (!(await assertBelongsToShop(res, req.shop.id, result.shopId))) return;
        next();
    } catch (error) {
        console.error('Invoice access check error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const assertPurchaseBillAccess = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await prisma.purchaseBill.findUnique({
            where: { id },
            select: { shopId: true }
        });
        if (!result) {
            return res.status(404).json({ error: 'Purchase bill not found.' });
        }
        if (!(await assertBelongsToShop(res, req.shop.id, result.shopId))) return;
        next();
    } catch (error) {
        console.error('Purchase bill access check error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const assertPartyAccessFromQuery = async (req, res, next) => {
    const role = req.query.role === 'supplier' ? 'supplier' : 'customer';
    return assertPartyAccess(role)(req, res, next);
};

export const assertReceiptAccess = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await prisma.paymentReceipt.findUnique({
            where: { id },
            select: { shopId: true }
        });
        if (!result) {
            return res.status(404).json({ error: 'Payment receipt not found.' });
        }
        if (!(await assertBelongsToShop(res, req.shop.id, result.shopId))) return;
        next();
    } catch (error) {
        console.error('Receipt access check error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
