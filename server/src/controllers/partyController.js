import { db } from '../db.js';
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
    const table = role === 'supplier' ? 'Supplier' : 'Customer';

    try {
        const result = await db.query(
            `SELECT id, "shopId" FROM "${table}" WHERE id = $1 AND "isDeleted" = FALSE`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Profile not found or inactive.' });
        }
        if (result.rows[0].shopId !== req.shop.id) {
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


// 1. Core Create Action Wrapper for Parties (with full multi-fields)
export const createParty = async (req, res) => {
    const {
        shopId, name, shopName, phone, role,
        email, billingAddress, shippingAddress,
        gstin, state, creditLimit, openingBalance
    } = req.body; // role can be 'customer' or 'supplier'

    if (!shopId || !name) {
        return res.status(400).json({ error: "Shop ID and Profile Name are required fields!" });
    }

    const targetTable = role === 'supplier' ? 'Supplier' : 'Customer';

    try {
        const result = await db.query(
            `INSERT INTO "${targetTable}" (
                "shopId", "name", "shopName", "phone", "email", 
                "billingAddress", "shippingAddress", "gstin", "state", 
                "creditLimit", "openingBalance"
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                shopId, name, shopName || null, phone || null, email || null,
                billingAddress || null, shippingAddress || null,
                gstin || null, state || null,
                parseFloat(creditLimit || 0.00), parseFloat(openingBalance || 0.00)
            ]
        );

        const party = result.rows[0];
        const openBal = parseFloat(openingBalance || 0);
        if (openBal !== 0) {
            // For customer: positive opening balance means they owe us (DEBIT), negative means we owe them (CREDIT)
            // For supplier: positive opening balance means we owe them (CREDIT), negative means they owe us (DEBIT)
            const isCustomer = role !== 'supplier';
            let entryType = '';
            if (isCustomer) {
                entryType = openBal > 0 ? 'DEBIT' : 'CREDIT';
            } else {
                entryType = openBal > 0 ? 'CREDIT' : 'DEBIT';
            }

            await db.query(
                `INSERT INTO "LedgerEntry" ("shopId", "${isCustomer ? 'customerId' : 'supplierId'}", "particulars", "type", "amount", "date")
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [shopId, party.id, 'Opening Balance', entryType, Math.abs(openBal)]
            );
        }

        const actionType = role === 'supplier' ? 'SUPPLIER_ADDED' : 'CUSTOMER_ADDED';
        await logActivity(shopId, actionType, 'Owner', `${name} added as a ${role}`);

        res.status(201).json(party);
    } catch (error) {
        console.error(`🚨 Error adding item to ${targetTable}:`, error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 2. Fetch Active Non-Deleted Parties per Tenant Stream
export const getActiveParties = async (req, res) => {
    const { shopId } = req.params;
    const { role } = req.query; // 'customer' or 'supplier'

    try {
        let queryStr = '';
        if (role === 'supplier') {
            queryStr = `
                SELECT s.*, 
                  COALESCE((SELECT SUM(CASE WHEN l.type = 'CREDIT' THEN l.amount ELSE -l.amount END) FROM "LedgerEntry" l WHERE l."supplierId" = s.id), 0.00) AS balance
                FROM "Supplier" s
                WHERE s."shopId" = $1 AND s."isDeleted" = FALSE 
                ORDER BY s."createdAt" DESC
            `;
        } else {
            queryStr = `
                SELECT c.*, 
                  COALESCE((SELECT SUM(CASE WHEN l.type = 'DEBIT' THEN l.amount ELSE -l.amount END) FROM "LedgerEntry" l WHERE l."customerId" = c.id), 0.00) AS balance
                FROM "Customer" c
                WHERE c."shopId" = $1 AND c."isDeleted" = FALSE 
                ORDER BY c."createdAt" DESC
            `;
        }

        const result = await db.query(queryStr, [shopId]);
        res.json(result.rows);
    } catch (error) {
        console.error(`🚨 Error fetching active list for role ${role}:`, error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 3. Strict Soft-Delete Logic for Parties to Retain Historical Integrity
export const softDeleteParty = async (req, res) => {
    const { id } = req.params;
    const { role } = req.query; // 'customer' or 'supplier'
    const targetTable = role === 'supplier' ? 'Supplier' : 'Customer';

    try {
        const patchResult = await db.query(
            `UPDATE "${targetTable}"
       SET "isDeleted" = TRUE
       WHERE "id" = $1
       RETURNING *`,
            [id]
        );

        if (patchResult.rows.length === 0) {
            return res.status(404).json({ error: "Target registry profile record not active" });
        }

        const party = patchResult.rows[0];
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
        // 1. Fetch Customer Info & Shop Details (with banking, print details)
        const customerQuery = await db.query(
            `SELECT c.*, s."businessName", s."phone" as "shopPhone", s."logoUrl", s."vpa", s."address" as "shopAddress",
               s."businessPhone", s."businessEmail", s."gstin" as "shopGstin", s."state" as "shopState", s."signatureUrl" as "shopSignatureUrl",
               s."bankDetails" as "shopBankDetails", s."invoiceTerms" as "shopInvoiceTerms",
               COALESCE((SELECT SUM(CASE WHEN l.type = 'DEBIT' THEN l.amount ELSE -l.amount END) FROM "LedgerEntry" l WHERE l."customerId" = c.id), 0.00) AS balance 
               FROM "Customer" c
               JOIN "Shop" s ON c."shopId" = s."id"
               WHERE c."id" = $1 AND c."isDeleted" = FALSE`,
            [id]
        );

        if (customerQuery.rows.length === 0) {
            return res.status(404).json({ error: "Customer profile not found or inactive." });
        }

        // 2. Fetch Personalized Ledger Timeline
        const ledgerQuery = await db.query(
            `SELECT * FROM "LedgerEntry" WHERE "customerId" = $1 ORDER BY "date" DESC`,
            [id]
        );

        // 3. Fetch Invoices Copies
        const invoiceQuery = await db.query(
            `SELECT * FROM "Invoice" WHERE "customerId" = $1 ORDER BY "date" DESC`,
            [id]
        );

        // 4. Fetch Completed Vouchers Payment Receipts
        const receiptQuery = await db.query(
            `SELECT * FROM "PaymentReceipt" WHERE "customerId" = $1 ORDER BY "date" DESC`,
            [id]
        );

        res.json({
            customer: customerQuery.rows[0],
            ledgers: ledgerQuery.rows[0] ? ledgerQuery.rows : [],
            invoices: invoiceQuery.rows ? invoiceQuery.rows : [],
            receipts: receiptQuery.rows ? receiptQuery.rows : []
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
        const supplierQuery = await db.query(
            `SELECT s.*, sh."businessName", sh."phone" as "shopPhone", sh."logoUrl", sh."vpa", sh."address" as "shopAddress",
               sh."businessPhone", sh."businessEmail", sh."gstin" as "shopGstin", sh."state" as "shopState", sh."signatureUrl" as "shopSignatureUrl",
               sh."bankDetails" as "shopBankDetails", sh."invoiceTerms" as "shopInvoiceTerms",
               COALESCE((SELECT SUM(CASE WHEN l.type = 'CREDIT' THEN l.amount ELSE -l.amount END) FROM "LedgerEntry" l WHERE l."supplierId" = s.id), 0.00) AS balance
               FROM "Supplier" s
               JOIN "Shop" sh ON s."shopId" = sh."id"
               WHERE s."id" = $1 AND s."isDeleted" = FALSE`,
            [id]
        );

        if (supplierQuery.rows.length === 0) {
            return res.status(404).json({ error: "Supplier profile not found or inactive." });
        }

        const ledgerQuery = await db.query(
            `SELECT * FROM "LedgerEntry" WHERE "supplierId" = $1 ORDER BY "date" DESC`,
            [id]
        );

        const pBillQuery = await db.query(
            `SELECT * FROM "PurchaseBill" WHERE "supplierId" = $1 ORDER BY "date" DESC`,
            [id]
        );

        const receiptQuery = await db.query(
            `SELECT * FROM "PaymentReceipt" WHERE "supplierId" = $1 ORDER BY "date" DESC`,
            [id]
        );

        res.json({
            supplier: supplierQuery.rows[0],
            ledgers: ledgerQuery.rows[0] ? ledgerQuery.rows : [],
            purchaseBills: pBillQuery.rows ? pBillQuery.rows : [],
            receipts: receiptQuery.rows ? receiptQuery.rows : []
        });
    } catch (error) {
        console.error('🚨 Error fetching public supplier portal metadata:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 4. Fetch Single Party Full Details (GET /api/parties/detail/:id)
export const getPartyDetail = async (req, res) => {
    const { id } = req.params;
    const { role } = req.query;
    const targetTable = role === 'supplier' ? 'Supplier' : 'Customer';

    try {
        const result = await db.query(
            `SELECT * FROM "${targetTable}" WHERE "id" = $1 AND "isDeleted" = FALSE`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Profile not found or inactive" });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(`🚨 Error fetching details for ${targetTable}:`, error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 5. Update Party Registry (PUT /api/parties/update/:id)
export const updateParty = async (req, res) => {
    const { id } = req.params;
    const { role } = req.query;
    const {
        name, shopName, phone, email, billingAddress, shippingAddress,
        gstin, state, creditLimit, openingBalance
    } = req.body;

    const targetTable = role === 'supplier' ? 'Supplier' : 'Customer';

    try {
        const result = await db.query(
            `UPDATE "${targetTable}"
             SET "name" = COALESCE($1, "name"),
                 "phone" = COALESCE($2, "phone"),
                 "email" = COALESCE($3, "email"),
                 "billingAddress" = COALESCE($4, "billingAddress"),
                 "shippingAddress" = COALESCE($5, "shippingAddress"),
                 "gstin" = COALESCE($6, "gstin"),
                 "state" = COALESCE($7, "state"),
                 "creditLimit" = COALESCE($8, "creditLimit"),
                 "openingBalance" = COALESCE($9, "openingBalance"),
                 "shopName" = COALESCE($11, "shopName"),
                 "updatedAt" = NOW()
             WHERE "id" = $10 RETURNING *`,
            [
                name, phone, email, billingAddress, shippingAddress,
                gstin, state, creditLimit !== undefined ? parseFloat(creditLimit) : null,
                openingBalance !== undefined ? parseFloat(openingBalance) : null, id,
                shopName !== undefined ? shopName : null
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Profile not found or inactive" });
        }

        const party = result.rows[0];

        if (openingBalance !== undefined) {
            const openBal = parseFloat(openingBalance || 0);
            const isCustomer = role !== 'supplier';
            let entryType = '';
            if (isCustomer) {
                entryType = openBal > 0 ? 'DEBIT' : 'CREDIT';
            } else {
                entryType = openBal > 0 ? 'CREDIT' : 'DEBIT';
            }

            const checkLedger = await db.query(
                `SELECT id FROM "LedgerEntry" WHERE "${isCustomer ? 'customerId' : 'supplierId'}" = $1 AND "particulars" = 'Opening Balance'`,
                [id]
            );

            if (checkLedger.rows.length > 0) {
                if (openBal === 0) {
                    await db.query(`DELETE FROM "LedgerEntry" WHERE id = $1`, [checkLedger.rows[0].id]);
                } else {
                    await db.query(
                        `UPDATE "LedgerEntry" SET "type" = $1, "amount" = $2 WHERE id = $3`,
                        [entryType, Math.abs(openBal), checkLedger.rows[0].id]
                    );
                }
            } else if (openBal !== 0) {
                await db.query(
                    `INSERT INTO "LedgerEntry" ("shopId", "${isCustomer ? 'customerId' : 'supplierId'}", "particulars", "type", "amount", "date")
                     VALUES ($1, $2, $3, $4, $5, NOW())`,
                    [party.shopId, id, 'Opening Balance', entryType, Math.abs(openBal)]
                );
            }
        }

        const actionType = role === 'supplier' ? 'SUPPLIER_UPDATED' : 'CUSTOMER_UPDATED';
        await logActivity(party.shopId, actionType, 'Owner', `Updated profile of ${name} (${role})`);

        res.json(party);
    } catch (error) {
        console.error(`🚨 Error updating ${targetTable}:`, error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};