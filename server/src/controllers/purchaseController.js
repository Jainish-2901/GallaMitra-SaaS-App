import { db } from '../db.js';
import { logActivity } from '../activityLogger.js';


// 1. Action: Log a Fresh Supplier Purchase Bill and Append to Ledgers
export const createPurchaseBill = async (req, res) => {
    const { billNo, shopId, supplierId, itemsArray, attachedImgUrl, slipDetails, totalAmount } = req.body;

    if (!shopId || !supplierId || !totalAmount) {
        return res.status(400).json({ error: "Missing required parameters for purchase liability mapping!" });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const parsedAmount = parseFloat(totalAmount);

        // A. Commit Purchase Bill registry metadata entry using JSONB formats
        const billResult = await client.query(
            `INSERT INTO "PurchaseBill" ("billNo", "shopId", "supplierId", "itemsJson", "attachedImgUrl", "slipDetails", "totalAmount")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [billNo || null, shopId, supplierId, JSON.stringify(itemsArray || []), attachedImgUrl || null, slipDetails || null, parsedAmount]
        );

        const billId = billResult.rows[0].id;

        // B. Inject corresponding row entry into mixed ledger stream to update supplier dues balance
        const lastLedgerRow = await client.query(
            `SELECT "runningBalance" FROM "LedgerEntry" WHERE "shopId" = $1 ORDER BY "date" DESC, "id" DESC LIMIT 1`,
            [shopId]
        );
        let runningBal = parseFloat(lastLedgerRow.rows[0]?.runningBalance || 0);
        runningBal -= parsedAmount; // Purchase bills increase your payable liability (CREDIT position status)

        await client.query(
            `INSERT INTO "LedgerEntry" ("shopId", "supplierId", "particulars", "type", "amount", "runningBalance", "referenceId")
       VALUES ($1, $2, $3, 'CREDIT', $4, $5, $6)`,
            [shopId, supplierId, `Purchase Bill logged reference code #${billNo || 'N/A'}`, parsedAmount, runningBal, billId]
        );

        await client.query('COMMIT');
        await logActivity(shopId, 'PURCHASE_BILL_CREATED', 'Owner', `Purchase Bill #${billNo || 'N/A'} (₹${parsedAmount})`);
        res.status(201).json({ message: "Purchase bill logged safely", purchaseBill: billResult.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('🚨 Error processing purchase bill record matrix:', error);
        res.status(500).json({ error: "Internal Server Processing Error" });
    } finally {
        client.release();
    }
};

// 2. Action: Hard Purge Purchase Bill and Recalibrate Vendor Balances
export const deletePurchaseBill = async (req, res) => {
    const { id } = req.params;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const billCheck = await client.query(`SELECT * FROM "PurchaseBill" WHERE "id" = $1`, [id]);
        if (billCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Target purchase bill identifier not found." });
        }
        const shopId = billCheck.rows[0].shopId;

        await client.query(`DELETE FROM "PurchaseBill" WHERE "id" = $1`, [id]);
        await client.query(`DELETE FROM "LedgerEntry" WHERE "referenceId" = $1`, [id]);

        // Recalibrate running index balances sequence loop
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
        await logActivity(shopId, 'PURCHASE_BILL_DELETED', 'Owner', `Purchase Bill #${billCheck.rows[0].billNo || 'N/A'} deleted`);
        res.json({ message: "Purchase bill removed and ledger files re-calculated successfully!" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('🚨 Operational crash processing purchase bill deletion:', error);
        res.status(500).json({ error: "Internal Server Processing Error" });
    } finally {
        client.release();
    }
};

// 3. Action: View Purchase Bills Historical Index List
export const getShopPurchaseBillHistoryList = async (req, res) => {
    const { shopId } = req.params;
    try {
        const result = await db.query(
            `SELECT * FROM "PurchaseBill" WHERE "shopId" = $1 ORDER BY "createdAt" DESC`,
            [shopId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('🚨 Error pulling purchase bills history arrays:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 4. Action: 100% Override Edit on Purchase Bill and Recalculate App Dues Matrix
export const editPurchaseBill = async (req, res) => {
    const { id } = req.params;
    const { billNo, supplierId, date, itemsArray, slipDetails, totalAmount, attachedImgUrl } = req.body;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const originalBill = await client.query(`SELECT * FROM "PurchaseBill" WHERE "id" = $1`, [id]);
        if (originalBill.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Target purchase bill identifier not found." });
        }

        const parsedAmount = parseFloat(totalAmount);
        const shopId = originalBill.rows[0].shopId;

        const attachedImgUrlToSave = attachedImgUrl !== undefined ? (attachedImgUrl || null) : originalBill.rows[0].attachedImgUrl;

        // A. Update PurchaseBill record
        const updatedBill = await client.query(
            `UPDATE "PurchaseBill"
             SET "billNo" = COALESCE($1, "billNo"),
                 "supplierId" = COALESCE($2, "supplierId"),
                 "date" = COALESCE($3, "date"),
                 "itemsJson" = $4,
                 "slipDetails" = COALESCE($5, "slipDetails"),
                 "totalAmount" = $6,
                 "attachedImgUrl" = $7,
                 "isEdited" = TRUE
             WHERE "id" = $8
             RETURNING *`,
            [
                billNo || null,
                supplierId || null,
                date || null,
                JSON.stringify(itemsArray || []),
                slipDetails || null,
                parsedAmount,
                attachedImgUrlToSave,
                id
            ]
        );

        // B. Update corresponding LedgerEntry
        await client.query(
            `UPDATE "LedgerEntry"
             SET "supplierId" = COALESCE($1, "supplierId"),
                 "amount" = $2,
                 "particulars" = $3,
                 "date" = COALESCE($4, "date"),
                 "isEdited" = TRUE,
                 "lastEditedAt" = NOW()
             WHERE "referenceId" = $5`,
            [
                supplierId || null,
                parsedAmount,
                `Purchase Bill logged reference code #${billNo || originalBill.rows[0].billNo || 'N/A'}`,
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
        await logActivity(shopId, 'PURCHASE_BILL_EDITED', 'Owner', `Purchase Bill #${billNo || originalBill.rows[0].billNo || 'N/A'} updated (New Total: ₹${parsedAmount})`);
        res.json({ message: "Purchase bill updated and ledgers synced!", purchaseBill: updatedBill.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('🚨 Error inside purchase bill editor pipeline:', error);
        res.status(500).json({ error: "Internal Server Processing Error" });
    } finally {
        client.release();
    }
};