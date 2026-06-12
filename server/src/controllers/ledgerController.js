import { db } from '../db.js';
import { logActivity } from '../activityLogger.js';


// 1. Action: Create a Fresh Core Ledger Transaction Entry
export const createLedgerEntry = async (req, res) => {
    const { shopId, customerId, supplierId, particulars, type, amount, referenceId, date } = req.body;

    if (!shopId || !particulars || !type || !amount) {
        return res.status(400).json({ error: "Missing required core transactional parameter inputs!" });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN'); // Initialize safe database transaction block

        // Insert the finalized audit row matrix (temporarily 0 runningBalance, computed below)
        const newEntry = await client.query(
            `INSERT INTO "LedgerEntry" ("shopId", "customerId", "supplierId", "particulars", "type", "amount", "runningBalance", "referenceId", "date")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, NOW()))
       RETURNING *`,
            [shopId, customerId || null, supplierId || null, particulars, type, parseFloat(amount), 0.00, referenceId || null, date || null]
        );

        // Recalculate all running balances for the shop to maintain date-ordered mathematical correctness
        const allEntries = await client.query(
            `SELECT * FROM "LedgerEntry" WHERE "shopId" = $1 ORDER BY "date" ASC, "id" ASC`,
            [shopId]
        );

        let rollingBalance = 0;
        let createdEntryWithRecalculatedBalance = null;

        for (let row of allEntries.rows) {
            const rowAmount = parseFloat(row.amount);
            if (row.type === 'DEBIT') {
                rollingBalance += rowAmount;
            } else if (row.type === 'CREDIT') {
                rollingBalance -= rowAmount;
            }

            await client.query(
                `UPDATE "LedgerEntry" SET "runningBalance" = $1 WHERE "id" = $2`,
                [rollingBalance, row.id]
            );

            if (row.id === newEntry.rows[0].id) {
                createdEntryWithRecalculatedBalance = { ...row, runningBalance: rollingBalance };
            }
        }

        await client.query('COMMIT'); // Persist updates cleanly across table constraints
        await logActivity(shopId, 'LEDGER_ENTRY_CREATED', 'Owner', `Manual entry: ${particulars} (${type} ₹${amount})`);
        res.status(201).json(createdEntryWithRecalculatedBalance || newEntry.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK'); // Discard operational modifications if anything crashes
        console.error('🚨 Error processing core transaction entry:', error);
        res.status(500).json({ error: "Internal Transaction Error. Database state safely maintained." });
    } finally {
        client.release(); // Return socket memory block back to pool channel
    }
};

// 2. Action: 100% Manual Override Edit and Rollback Balance Pipeline
export const editLedgerEntry = async (req, res) => {
    const { id } = req.params; // Targeted entry token id
    const { particulars, type, amount, date } = req.body;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Fetch the target row instance before applying changes to capture old metrics
        const originalRow = await client.query(`SELECT * FROM "LedgerEntry" WHERE "id" = $1`, [id]);
        if (originalRow.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Target ledger footprint entry missing." });
        }

        // Update the record values and stamp the modification logs flag
        const updatedEntry = await client.query(
            `UPDATE "LedgerEntry"
            SET "particulars" = COALESCE($1, "particulars"),
            "type" = COALESCE($2, "type"),
            "amount" = COALESCE($3, "amount"),
            "date" = COALESCE($4, "date"),
            "isEdited" = TRUE,
            "lastEditedAt" = NOW()
            WHERE "id" = $5
            RETURNING *`,
            [particulars, type, amount ? parseFloat(amount) : null, date || null, id]
        );

        // 🚀 AUTOMATED LEDGER RECALCULATION LOOP PIPELINE
        // Fetch all subsequent tracking ledger items for this shop to trigger a smooth running update
        const shopId = originalRow.rows[0].shopId;
        const allEntries = await client.query(
            `SELECT * FROM "LedgerEntry" WHERE "shopId" = $1 ORDER BY "date" ASC, "id" ASC`,
            [shopId]
        );

        let rollingBalance = 0;
        for (let row of allEntries.rows) {
            const rowAmount = parseFloat(row.amount);
            if (row.type === 'DEBIT') {
                rollingBalance += rowAmount;
            } else if (row.type === 'CREDIT') {
                rollingBalance -= rowAmount;
            }

            // Re-write calculated state row balances instantly back to the cluster rows
            await client.query(
                `UPDATE "LedgerEntry" SET "runningBalance" = $1 WHERE "id" = $2`,
                [rollingBalance, row.id]
            );
        }

        await client.query('COMMIT');
        await logActivity(shopId, 'LEDGER_ENTRY_EDITED', 'Owner', `Ledger entry edited: ${particulars || originalRow.rows[0].particulars}`);
        res.json({ message: "Ledger updated & cascading recalculation completed!", entry: updatedEntry.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('🚨 Error processing automated ledger edit loop updates:', error);
        res.status(500).json({ error: "Internal Recalculation Engine Failure" });
    } finally {
        client.release();
    }
};

// 3. Action: Hard Manual Overriding Deletion with Cascading Balance Rollbacks
export const deleteLedgerEntry = async (req, res) => {
    const { id } = req.params;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const targetRow = await client.query(`SELECT * FROM "LedgerEntry" WHERE "id" = $1`, [id]);
        if (targetRow.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Ledger entry parameter row does not exist." });
        }

        const shopId = targetRow.rows[0].shopId;

        // Hard remove the specific column item from the row array logs
        await client.query(`DELETE FROM "LedgerEntry" WHERE "id" = $1`, [id]);

        // Re-trigger the linear flow recalculation sequence loop to recalibrate balances cleanly
        const remainingEntries = await client.query(
            `SELECT * FROM "LedgerEntry" WHERE "shopId" = $1 ORDER BY "date" ASC, "id" ASC`,
            [shopId]
        );

        let rollingBalance = 0;
        for (let row of remainingEntries.rows) {
            const rowAmount = parseFloat(row.amount);
            if (row.type === 'DEBIT') {
                rollingBalance += rowAmount;
            } else if (row.type === 'CREDIT') {
                rollingBalance -= rowAmount;
            }

            await client.query(
                `UPDATE "LedgerEntry" SET "runningBalance" = $1 WHERE "id" = $2`,
                [rollingBalance, row.id]
            );
        }

        await client.query('COMMIT');
        await logActivity(shopId, 'LEDGER_ENTRY_DELETED', 'Owner', `Ledger entry deleted: ${targetRow.rows[0].particulars}`);
        res.json({ message: "Entry permanently expunged. Audit balances successfully self-healed!" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('🚨 Operational failure inside ledger entry drop routine:', error);
        res.status(500).json({ error: "Internal Overriding Engine Failure" });
    } finally {
        client.release();
    }
};

// 4. Action: Fetch Chronological Mixed Feed Logs for Owners View
export const getMasterLedgerStream = async (req, res) => {
    const { shopId } = req.params;
    try {
        const result = await db.query(
            `SELECT * FROM "LedgerEntry" 
            WHERE "shopId" = $1 
            ORDER BY "date" DESC, "id" DESC`,
            [shopId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('🚨 Error fetching chronological master ledger feed:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};