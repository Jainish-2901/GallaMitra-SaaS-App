import { db } from '../db.js';
import { logActivity } from '../activityLogger.js';


// 1. Action: Generate Independent Payment Voucher Receipt (Customer / Supplier Contexts)
export const createPaymentReceipt = async (req, res) => {
    const { receiptNo, shopId, customerId, supplierId, amount, paymentMode, remark } = req.body;

    if (!receiptNo || !shopId || !amount) {
        return res.status(400).json({ error: "Missing required metadata parameters for voucher mapping!" });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const parsedAmount = parseFloat(amount);

        // A. Log the parent payment receipt entry node
        const receiptResult = await client.query(
            `INSERT INTO "PaymentReceipt" ("receiptNo", "shopId", "customerId", "supplierId", "amount", "paymentMode", "remark")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [receiptNo, shopId, customerId || null, supplierId || null, parsedAmount, paymentMode || 'CASH', remark || null]
        );

        const receiptId = receiptResult.rows[0].id;

        // B. Calculate shadow ledger parameters
        const lastLedgerRow = await client.query(
            `SELECT "runningBalance" FROM "LedgerEntry" WHERE "shopId" = $1 ORDER BY "date" DESC, "id" DESC LIMIT 1`,
            [shopId]
        );
        let runningBal = parseFloat(lastLedgerRow.rows[0]?.runningBalance || 0);

        // Dynamic directional balance checking rules
        // Customer paying you reduces aggregate dues (CREDIT entry)
        // You paying a supplier reduces your total liability (DEBIT entry)
        let transactionType = 'CREDIT';
        let particularsSummary = `Payment Voucher received from Customer via ${paymentMode}. Code #${receiptNo}`;

        if (supplierId) {
            transactionType = 'DEBIT';
            particularsSummary = `Payment Voucher remitted to Supplier via ${paymentMode}. Code #${receiptNo}`;
        }

        runningBal += (transactionType === 'DEBIT' ? parsedAmount : -parsedAmount);

        await client.query(
            `INSERT INTO "LedgerEntry" ("shopId", "customerId", "supplierId", "particulars", "type", "amount", "runningBalance", "referenceId")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [shopId, customerId || null, supplierId || null, particularsSummary, transactionType, parsedAmount, runningBal, receiptId]
        );

        await client.query('COMMIT');
        await logActivity(shopId, 'PAYMENT_RECEIPT_CREATED', 'Owner', `Receipt #${receiptNo} (₹${parsedAmount})`);
        res.status(201).json({ message: "Voucher processed cleanly", receipt: receiptResult.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('🚨 Error processing independent payment receipt voucher:', error);
        res.status(500).json({ error: "Internal Server Processing Error" });
    } finally {
        client.release();
    }
};

// 2. Action: Hard Clear Voucher Log and Recalculate Timeline Tracks
export const deletePaymentReceipt = async (req, res) => {
    const { id } = req.params;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const receiptCheck = await client.query(`SELECT * FROM "PaymentReceipt" WHERE "id" = $1`, [id]);
        if (receiptCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Target voucher copy not active." });
        }
        const shopId = receiptCheck.rows[0].shopId;

        await client.query(`DELETE FROM "PaymentReceipt" WHERE "id" = $1`, [id]);
        await client.query(`DELETE FROM "LedgerEntry" WHERE "referenceId" = $1`, [id]);

        const remainingEntries = await client.query(
            `SELECT * FROM "LedgerEntry" WHERE "shopId" = $1 ORDER BY "date" ASC, "id" ASC`,
            [shopId]
        );
        let rollingBalance = 0;
        for (let row of remainingEntries.rows) {
            const amt = parseFloat(row.amount);
            rollingBalance += (row.type === 'DEBIT' ? amt : -amt);
            await client.query(`UPDATE "LedgerEntry" SET "runningBalance" = $1 WHERE "id" = $2`, [rollingBalance, row.id]);
        }

        await client.query('COMMIT');
        await logActivity(shopId, 'PAYMENT_RECEIPT_DELETED', 'Owner', `Receipt #${receiptCheck.rows[0].receiptNo} deleted`);
        res.json({ message: "Payment voucher deleted and audit balances synced safely!" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('🚨 Error inside independent voucher purge routine:', error);
        res.status(500).json({ error: "Internal Server Processing Error" });
    } finally {
        client.release();
    }
};

// 3. Action: Pull Comprehensive Voucher Collections List History
export const getShopReceiptHistoryList = async (req, res) => {
    const { shopId } = req.params;
    try {
        const result = await db.query(
            `SELECT * FROM "PaymentReceipt" WHERE "shopId" = $1 ORDER BY "createdAt" DESC`,
            [shopId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('🚨 Error pulling receipt history arrays:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 4. Action: Override/Edit Payment Receipt and recalculate ledger running balances
export const editPaymentReceipt = async (req, res) => {
    const { id } = req.params;
    const { receiptNo, customerId, supplierId, amount, paymentMode, remark, date } = req.body;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const originalReceipt = await client.query(`SELECT * FROM "PaymentReceipt" WHERE "id" = $1`, [id]);
        if (originalReceipt.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Target payment receipt identity mapping not found." });
        }

        const parsedAmount = parseFloat(amount);
        const shopId = originalReceipt.rows[0].shopId;

        // A. Update PaymentReceipt table
        const updatedReceipt = await client.query(
            `UPDATE "PaymentReceipt"
             SET "receiptNo" = COALESCE($1, "receiptNo"),
                 "customerId" = COALESCE($2, "customerId"),
                 "supplierId" = COALESCE($3, "supplierId"),
                 "amount" = $4,
                 "paymentMode" = COALESCE($5, "paymentMode"),
                 "remark" = COALESCE($6, "remark"),
                 "date" = COALESCE($7, "date"),
                 "isEdited" = TRUE
             WHERE "id" = $8
             RETURNING *`,
            [
                receiptNo || null,
                customerId || null,
                supplierId || null,
                parsedAmount,
                paymentMode || null,
                remark || null,
                date || null,
                id
            ]
        );

        // B. Update corresponding LedgerEntry
        let transactionType = 'CREDIT';
        let particularsSummary = `Payment Voucher received from Customer via ${paymentMode || originalReceipt.rows[0].paymentMode}. Code #${receiptNo || originalReceipt.rows[0].receiptNo}`;

        if (supplierId || (!customerId && originalReceipt.rows[0].supplierId)) {
            transactionType = 'DEBIT';
            particularsSummary = `Payment Voucher remitted to Supplier via ${paymentMode || originalReceipt.rows[0].paymentMode}. Code #${receiptNo || originalReceipt.rows[0].receiptNo}`;
        }

        await client.query(
            `UPDATE "LedgerEntry"
             SET "customerId" = COALESCE($1, "customerId"),
                 "supplierId" = COALESCE($2, "supplierId"),
                 "amount" = $3,
                 "type" = $4,
                 "particulars" = $5,
                 "date" = COALESCE($6, "date"),
                 "isEdited" = TRUE,
                 "lastEditedAt" = NOW()
             WHERE "referenceId" = $7`,
            [
                customerId || null,
                supplierId || null,
                parsedAmount,
                transactionType,
                particularsSummary,
                date || null,
                id
            ]
        );

        // C. Recalculate running balance cascades for this shop
        const remainingEntries = await client.query(
            `SELECT * FROM "LedgerEntry" WHERE "shopId" = $1 ORDER BY "date" ASC, "id" ASC`,
            [shopId]
        );
        let rollingBalance = 0;
        for (let row of remainingEntries.rows) {
            const amt = parseFloat(row.amount);
            rollingBalance += (row.type === 'DEBIT' ? amt : -amt);
            await client.query(`UPDATE "LedgerEntry" SET "runningBalance" = $1 WHERE "id" = $2`, [rollingBalance, row.id]);
        }

        await client.query('COMMIT');
        await logActivity(shopId, 'PAYMENT_RECEIPT_EDITED', 'Owner', `Receipt #${receiptNo || originalReceipt.rows[0].receiptNo} updated (New Amount: ₹${parsedAmount})`);
        res.json({ message: "Payment receipt updated and ledgers synced!", receipt: updatedReceipt.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('🚨 Error inside payment receipt editor pipeline:', error);
        res.status(500).json({ error: "Internal Server Processing Error" });
    } finally {
        client.release();
    }
};