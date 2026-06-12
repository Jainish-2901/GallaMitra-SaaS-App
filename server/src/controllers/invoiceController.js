import { db } from '../db.js';
import { logActivity } from '../activityLogger.js';


// 1. Action: Compile a Fresh Sales Invoice and Inject to Ledger Stream
export const createInvoice = async (req, res) => {
    const {
        invoiceNo, shopId, customerId, itemsArray,
        subTotal, taxAmount, miscCharges, taxRate, grandTotal, description, discount, attachedImgUrl
    } = req.body;

    if (!invoiceNo || !shopId || !customerId || !itemsArray || subTotal === undefined || grandTotal === undefined) {
        return res.status(400).json({ error: "Missing required core parameters for invoice mapping!" });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN'); // Initialize transactional boundary safety block

        const parsedSubTotal = parseFloat(subTotal);
        const parsedTaxAmount = parseFloat(taxAmount || 0);
        const parsedMiscCharges = parseFloat(miscCharges || 0);
        const parsedTaxRate = parseFloat(taxRate || 0);
        const parsedGrandTotal = parseFloat(grandTotal);
        const parsedDiscount = parseFloat(discount || 0);

        // A. Commit Invoice Document Metadata to PostgreSQL Engine using JSONB formats
        const invoiceResult = await client.query(
            `INSERT INTO "Invoice" (
                "invoiceNo", "shopId", "customerId", "itemsJson", 
                "subTotal", "taxAmount", "miscCharges", "taxRate", "grandTotal", "description", "discount", "attachedImgUrl"
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`,
            [
                invoiceNo, shopId, customerId, JSON.stringify(itemsArray),
                parsedSubTotal, parsedTaxAmount, parsedMiscCharges, parsedTaxRate, parsedGrandTotal, description || null, parsedDiscount, attachedImgUrl || null
            ]
        );

        const invoiceId = invoiceResult.rows[0].id;

        // B. Inject corresponding row entry into mixed ledger stream instantly to update customer dues position
        const lastLedgerRow = await client.query(
            `SELECT "runningBalance" FROM "LedgerEntry" WHERE "shopId" = $1 ORDER BY "date" DESC, "id" DESC LIMIT 1`,
            [shopId]
        );
        let runningBal = parseFloat(lastLedgerRow.rows[0]?.runningBalance || 0);
        runningBal += parsedGrandTotal; // Invoice adds to total receivables balance status

        await client.query(
            `INSERT INTO "LedgerEntry" ("shopId", "customerId", "particulars", "type", "amount", "runningBalance", "referenceId")
        VALUES ($1, $2, $3, 'DEBIT', $4, $5, $6)`,
            [shopId, customerId, `Sales Invoice generated reference tracking code #${invoiceNo}`, parsedGrandTotal, runningBal, invoiceId]
        );

        await client.query('COMMIT'); // Persist atomic modifications safely
        await logActivity(shopId, 'INVOICE_CREATED', 'Owner', `Sales Invoice #${invoiceNo} (₹${parsedGrandTotal})`);
        res.status(201).json({ message: "Invoice processed smoothly", invoice: invoiceResult.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK'); // Discard operational writes if duplicate constraint fields trigger a crash
        console.error('🚨 Error processing corporate invoice record matrix:', error);
        res.status(500).json({ error: "Unique validation rule mismatch or server error. Invoice aborted safely." });
    } finally {
        client.release();
    }
};

// 2. Action: 100% Override Edit on Invoice and Recalculate App Dues Matrix
export const editInvoice = async (req, res) => {
    const { id } = req.params;
    const { invoiceNo, customerId, date, itemsArray, subTotal, taxAmount, miscCharges, taxRate, grandTotal, description, discount, attachedImgUrl } = req.body;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const originalInvoice = await client.query(`SELECT * FROM "Invoice" WHERE "id" = $1`, [id]);
        if (originalInvoice.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Target invoice file not tracked." });
        }

        const parsedSubTotal = parseFloat(subTotal);
        const parsedTaxAmount = parseFloat(taxAmount || 0);
        const parsedMiscCharges = parseFloat(miscCharges || 0);
        const parsedTaxRate = parseFloat(taxRate || 0);
        const parsedGrandTotal = parseFloat(grandTotal);
        const parsedDiscount = parseFloat(discount || 0);
        const shopId = originalInvoice.rows[0].shopId;

        const attachedImgUrlToSave = attachedImgUrl !== undefined ? (attachedImgUrl || null) : originalInvoice.rows[0].attachedImgUrl;

        // Update target core database line properties maps
        const updatedInvoice = await client.query(
            `UPDATE "Invoice"
        SET "invoiceNo" = COALESCE($1, "invoiceNo"),
            "customerId" = COALESCE($2, "customerId"),
            "date" = COALESCE($3, "date"),
            "itemsJson" = $4,
            "subTotal" = $5,
            "taxAmount" = $6, 
            "miscCharges" = $7,
            "taxRate" = $8,
            "grandTotal" = $9,
            "description" = $10,
            "discount" = $11,
            "attachedImgUrl" = $12,
            "isEdited" = TRUE
        WHERE "id" = $13
        RETURNING *`,
            [
                invoiceNo || null,
                customerId || null,
                date || null,
                JSON.stringify(itemsArray),
                parsedSubTotal,
                parsedTaxAmount,
                parsedMiscCharges,
                parsedTaxRate,
                parsedGrandTotal,
                description || null,
                parsedDiscount,
                attachedImgUrlToSave,
                id
            ]
        );

        // Update corresponding link rows inside ledger stream instantly
        await client.query(
            `UPDATE "LedgerEntry"
        SET "customerId" = COALESCE($1, "customerId"),
            "amount" = $2,
            "particulars" = $3,
            "date" = COALESCE($4, "date"),
            "isEdited" = TRUE,
            "lastEditedAt" = NOW()
        WHERE "referenceId" = $5`,
            [
                customerId || null,
                parsedGrandTotal,
                `Sales Invoice generated reference tracking code #${invoiceNo || originalInvoice.rows[0].invoiceNo}`,
                date || null,
                id
            ]
        );

        // Trigger complete cascading pipeline recalibration across table rows to sync balances
        const allEntries = await client.query(
            `SELECT * FROM "LedgerEntry" WHERE "shopId" = $1 ORDER BY "date" ASC, "id" ASC`,
            [shopId]
        );
        let rollingBalance = 0;
        for (let row of allEntries.rows) {
            const amt = parseFloat(row.amount);
            rollingBalance += (row.type === 'DEBIT' ? amt : -amt);
            await client.query(`UPDATE "LedgerEntry" SET "runningBalance" = $1 WHERE "id" = $2`, [rollingBalance, row.id]);
        }

        await client.query('COMMIT');
        await logActivity(shopId, 'INVOICE_EDITED', 'Owner', `Sales Invoice #${originalInvoice.rows[0].invoiceNo} updated (New Total: ₹${parsedGrandTotal})`);
        res.json({ message: "Invoice metadata modified and ledgers synced!", invoice: updatedInvoice.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('🚨 Error inside invoice editor pipeline segment:', error);
        res.status(500).json({ error: "Internal Server Processing Error" });
    } finally {
        client.release();
    }
};

// 3. Action: Hard Purge Invoice Document and Cascade Balance Recalibrations
export const deleteInvoice = async (req, res) => {
    const { id } = req.params;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const invoiceCheck = await client.query(`SELECT * FROM "Invoice" WHERE "id" = $1`, [id]);
        if (invoiceCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Invoice identity mapping code not tracking inside core clusters." });
        }
        const shopId = invoiceCheck.rows[0].shopId;

        // Wipe out parent mapping invoice document entry node
        await client.query(`DELETE FROM "Invoice" WHERE "id" = $1`, [id]);
        // Drop connected shadow ledger footprint references tracking lines
        await client.query(`DELETE FROM "LedgerEntry" WHERE "referenceId" = $1`, [id]);

        // Recalibrate running index balances across matching remaining ledger timelines 
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
        await logActivity(shopId, 'INVOICE_DELETED', 'Owner', `Sales Invoice #${invoiceCheck.rows[0].invoiceNo} deleted`);
        res.json({ message: "Invoice permanently expunged. Financial dues recalculated automatically!" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('🚨 Operational crash processing invoice removal routines:', error);
        res.status(500).json({ error: "Internal Server Processing Error" });
    } finally {
        client.release();
    }
};

// 4. Action: View Invoices Historical View Sheets Log for Specific Shop
export const getShopInvoiceHistoryList = async (req, res) => {
    const { shopId } = req.params;
    try {
        const result = await db.query(
            `SELECT * FROM "Invoice" WHERE "shopId" = $1 ORDER BY "createdAt" DESC`,
            [shopId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('🚨 Error pulling tracking invoices index arrays:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};