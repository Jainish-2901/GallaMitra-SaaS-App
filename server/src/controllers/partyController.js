import { prisma } from '../utils/prisma.js';
import { logActivity } from '../activityLogger.js';
import { verifyPortalToken, signPortalToken } from '../utils/tokens.js';

const validatePortalAccess = (req, res, expectedRole, partyId) => {
    const { token } = req.query;
    if (!token) {
        res.status(401).json({ error: 'Portal access token is required.' });
        return null;
    }
    try {
        const payload = verifyPortalToken(token);
        if (payload.role !== expectedRole || payload.partyId !== partyId) {
            res.status(403).json({ error: 'Invalid portal access token.' });
            return null;
        }
        return payload;
    } catch {
        res.status(401).json({ error: 'Invalid or expired portal access token.' });
        return null;
    }
};

export const getPortalShareToken = async (req, res) => {
    const { id } = req.params;
    const role = req.query.role === 'supplier' ? 'supplier' : 'customer';
    const model = role === 'supplier' ? prisma.supplier : prisma.customer;

    try {
        const party = await model.findFirst({
            where: { id, isDeleted: false },
            select: { id: true, shopId: true }
        });
        if (!party) {
            return res.status(404).json({ error: 'Profile not found or inactive.' });
        }
        if (party.shopId !== req.shop.id) {
            return res.status(403).json({ error: 'Forbidden.' });
        }

        const portalToken = signPortalToken(id, role, req.shop.id);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const portalUrl = `${frontendUrl}/public-portal?type=${role}&id=${id}&token=${portalToken}`;

        res.json({ success: true, token: portalToken, portalUrl });
    } catch (error) {
        console.error('Error generating portal token:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 1. Core Create Action Wrapper for Parties
export const createParty = async (req, res) => {
    const {
        shopId, name, shopName, phone, role,
        email, billingAddress, shippingAddress,
        gstin, state, creditLimit, openingBalance
    } = req.body;

    if (!shopId || !name) {
        return res.status(400).json({ error: "Shop ID and Profile Name are required fields!" });
    }

    const model = role === 'supplier' ? prisma.supplier : prisma.customer;

    try {
        const party = await model.create({
            data: {
                shopId,
                name,
                shopName: shopName || null,
                phone: phone || null,
                email: email || null,
                billingAddress: billingAddress || null,
                shippingAddress: shippingAddress || null,
                gstin: gstin || null,
                state: state || null,
                creditLimit: parseFloat(creditLimit || 0.00),
                openingBalance: parseFloat(openingBalance || 0.00)
            }
        });

        const openBal = parseFloat(openingBalance || 0);
        if (openBal !== 0) {
            const isCustomer = role !== 'supplier';
            let entryType = '';
            if (isCustomer) {
                entryType = openBal > 0 ? 'DEBIT' : 'CREDIT';
            } else {
                entryType = openBal > 0 ? 'CREDIT' : 'DEBIT';
            }

            await prisma.ledgerEntry.create({
                data: {
                    shopId,
                    customerId: isCustomer ? party.id : null,
                    supplierId: !isCustomer ? party.id : null,
                    particulars: 'Opening Balance',
                    type: entryType,
                    amount: Math.abs(openBal)
                }
            });
        }

        const actionType = role === 'supplier' ? 'SUPPLIER_ADDED' : 'CUSTOMER_ADDED';
        await logActivity(shopId, actionType, 'Owner', `${name} added as a ${role}`);

        res.status(201).json(party);
    } catch (error) {
        console.error(`🚨 Error adding item to party model:`, error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 2. Fetch Active Non-Deleted Parties per Tenant Stream
export const getActiveParties = async (req, res) => {
    const { shopId } = req.params;
    const { role } = req.query;

    try {
        let result = [];
        if (role === 'supplier') {
            result = await prisma.$queryRaw`
                SELECT s.*, 
                  COALESCE((SELECT SUM(CASE WHEN l.type = 'CREDIT' THEN l.amount ELSE -l.amount END) FROM "LedgerEntry" l WHERE l."supplierId" = s.id), 0.00) AS balance
                FROM "Supplier" s
                WHERE s."shopId" = ${shopId}::uuid AND s."isDeleted" = FALSE 
                ORDER BY s."createdAt" DESC
            `;
        } else {
            result = await prisma.$queryRaw`
                SELECT c.*, 
                  COALESCE((SELECT SUM(CASE WHEN l.type = 'DEBIT' THEN l.amount ELSE -l.amount END) FROM "LedgerEntry" l WHERE l."customerId" = c.id), 0.00) AS balance
                FROM "Customer" c
                WHERE c."shopId" = ${shopId}::uuid AND c."isDeleted" = FALSE 
                ORDER BY c."createdAt" DESC
            `;
        }
        res.json(result);
    } catch (error) {
        console.error(`🚨 Error fetching active list for role ${role}:`, error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 3. Strict Soft-Delete Logic for Parties to Retain Historical Integrity
export const softDeleteParty = async (req, res) => {
    const { id } = req.params;
    const { role } = req.query;
    const model = role === 'supplier' ? prisma.supplier : prisma.customer;

    try {
        const existing = await model.findUnique({
            where: { id }
        });
        if (!existing) {
            return res.status(404).json({ error: "Target registry profile record not active" });
        }

        const party = await model.update({
            where: { id },
            data: { isDeleted: true }
        });

        const actionType = role === 'supplier' ? 'SUPPLIER_REMOVED' : 'CUSTOMER_REMOVED';
        await logActivity(party.shopId, actionType, 'Owner', `${party.name} (${role}) removed from list`);

        res.json({ message: "Profile hidden from lists safely. Historical ledgers intact." });
    } catch (error) {
        console.error('🚨 Soft delete action failed:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Fetch Single Customer Public Profile & Transactions (Read-Only)
export const getCustomerPublicProfile = async (req, res) => {
    const { id } = req.params;

    if (!validatePortalAccess(req, res, 'customer', id)) return;

    try {
        // 1. Fetch Customer Info & Shop Details
        const customerQuery = await prisma.$queryRaw`
            SELECT c.*, s."businessName", s."phone" as "shopPhone", s."logoUrl", s."vpa", s."address" as "shopAddress",
               s."businessPhone", s."businessEmail", s."gstin" as "shopGstin", s."state" as "shopState", s."signatureUrl" as "shopSignatureUrl",
               s."bankDetails" as "shopBankDetails", s."invoiceTerms" as "shopInvoiceTerms",
               COALESCE((SELECT SUM(CASE WHEN l.type = 'DEBIT' THEN l.amount ELSE -l.amount END) FROM "LedgerEntry" l WHERE l."customerId" = c.id), 0.00) AS balance 
            FROM "Customer" c
            JOIN "Shop" s ON c."shopId" = s."id"
            WHERE c."id" = ${id}::uuid AND c."isDeleted" = FALSE
        `;

        if (!customerQuery || customerQuery.length === 0) {
            return res.status(404).json({ error: "Customer profile not found or inactive." });
        }

        // 2. Fetch Personalized Ledger Timeline
        const ledgers = await prisma.ledgerEntry.findMany({
            where: { customerId: id },
            orderBy: { date: 'desc' }
        });

        // 3. Fetch Invoices Copies
        const invoices = await prisma.invoice.findMany({
            where: { customerId: id },
            orderBy: { date: 'desc' }
        });

        // 4. Fetch Completed Vouchers Payment Receipts
        const receipts = await prisma.paymentReceipt.findMany({
            where: { customerId: id },
            orderBy: { date: 'desc' }
        });

        res.json({
            customer: customerQuery[0],
            ledgers: ledgers || [],
            invoices: invoices || [],
            receipts: receipts || []
        });
    } catch (error) {
        console.error('🚨 Error fetching public customer portal metadata:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Fetch Single Supplier Public Profile & Transactions (Read-Only)
export const getSupplierPublicProfile = async (req, res) => {
    const { id } = req.params;

    if (!validatePortalAccess(req, res, 'supplier', id)) return;

    try {
        const supplierQuery = await prisma.$queryRaw`
            SELECT s.*, sh."businessName", sh."phone" as "shopPhone", sh."logoUrl", sh."vpa", sh."address" as "shopAddress",
               sh."businessPhone", sh."businessEmail", sh."gstin" as "shopGstin", sh."state" as "shopState", sh."signatureUrl" as "shopSignatureUrl",
               sh."bankDetails" as "shopBankDetails", sh."invoiceTerms" as "shopInvoiceTerms",
               COALESCE((SELECT SUM(CASE WHEN l.type = 'CREDIT' THEN l.amount ELSE -l.amount END) FROM "LedgerEntry" l WHERE l."supplierId" = s.id), 0.00) AS balance
            FROM "Supplier" s
            JOIN "Shop" sh ON s."shopId" = sh."id"
            WHERE s."id" = ${id}::uuid AND s."isDeleted" = FALSE
        `;

        if (!supplierQuery || supplierQuery.length === 0) {
            return res.status(404).json({ error: "Supplier profile not found or inactive." });
        }

        const ledgers = await prisma.ledgerEntry.findMany({
            where: { supplierId: id },
            orderBy: { date: 'desc' }
        });

        const purchaseBills = await prisma.purchaseBill.findMany({
            where: { supplierId: id },
            orderBy: { date: 'desc' }
        });

        const receipts = await prisma.paymentReceipt.findMany({
            where: { supplierId: id },
            orderBy: { date: 'desc' }
        });

        res.json({
            supplier: supplierQuery[0],
            ledgers: ledgers || [],
            purchaseBills: purchaseBills || [],
            receipts: receipts || []
        });
    } catch (error) {
        console.error('🚨 Error fetching public supplier portal metadata:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 4. Fetch Single Party Full Details
export const getPartyDetail = async (req, res) => {
    const { id } = req.params;
    const { role } = req.query;
    const model = role === 'supplier' ? prisma.supplier : prisma.customer;

    try {
        const party = await model.findFirst({
            where: { id, isDeleted: false }
        });
        if (!party) {
            return res.status(404).json({ error: "Profile not found or inactive" });
        }
        res.json(party);
    } catch (error) {
        console.error(`🚨 Error fetching details for party:`, error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 5. Update Party Registry
export const updateParty = async (req, res) => {
    const { id } = req.params;
    const { role } = req.query;
    const {
        name, shopName, phone, email, billingAddress, shippingAddress,
        gstin, state, creditLimit, openingBalance
    } = req.body;

    const model = role === 'supplier' ? prisma.supplier : prisma.customer;

    try {
        const existing = await model.findUnique({
            where: { id }
        });
        if (!existing) {
            return res.status(404).json({ error: "Profile not found or inactive" });
        }

        const party = await model.update({
            where: { id },
            data: {
                name: name !== undefined ? name : undefined,
                phone: phone !== undefined ? phone : undefined,
                email: email !== undefined ? email : undefined,
                billingAddress: billingAddress !== undefined ? billingAddress : undefined,
                shippingAddress: shippingAddress !== undefined ? shippingAddress : undefined,
                gstin: gstin !== undefined ? gstin : undefined,
                state: state !== undefined ? state : undefined,
                creditLimit: creditLimit !== undefined ? parseFloat(creditLimit) : undefined,
                openingBalance: openingBalance !== undefined ? parseFloat(openingBalance) : undefined,
                shopName: shopName !== undefined ? shopName : undefined,
                updatedAt: new Date()
            }
        });

        if (openingBalance !== undefined) {
            const openBal = parseFloat(openingBalance || 0);
            const isCustomer = role !== 'supplier';
            let entryType = '';
            if (isCustomer) {
                entryType = openBal > 0 ? 'DEBIT' : 'CREDIT';
            } else {
                entryType = openBal > 0 ? 'CREDIT' : 'DEBIT';
            }

            const checkLedger = await prisma.ledgerEntry.findFirst({
                where: {
                    customerId: isCustomer ? id : undefined,
                    supplierId: !isCustomer ? id : undefined,
                    particulars: 'Opening Balance'
                }
            });

            if (checkLedger) {
                if (openBal === 0) {
                    await prisma.ledgerEntry.delete({
                        where: { id: checkLedger.id }
                    });
                } else {
                    await prisma.ledgerEntry.update({
                        where: { id: checkLedger.id },
                        data: {
                            type: entryType,
                            amount: Math.abs(openBal)
                        }
                    });
                }
            } else if (openBal !== 0) {
                await prisma.ledgerEntry.create({
                    data: {
                        shopId: party.shopId,
                        customerId: isCustomer ? id : null,
                        supplierId: !isCustomer ? id : null,
                        particulars: 'Opening Balance',
                        type: entryType,
                        amount: Math.abs(openBal)
                    }
                });
            }
        }

        const actionType = role === 'supplier' ? 'SUPPLIER_UPDATED' : 'CUSTOMER_UPDATED';
        await logActivity(party.shopId, actionType, 'Owner', `Updated profile of ${name || party.name} (${role})`);

        res.json(party);
    } catch (error) {
        console.error(`🚨 Error updating party registry:`, error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};