import { prisma } from '../utils/prisma.js';
import { logActivity } from '../activityLogger.js';

// 1. Action: Create a Fresh Core Ledger Transaction Entry
export const createLedgerEntry = async (req, res) => {
    const { shopId, customerId, supplierId, particulars, type, amount, referenceId, date } = req.body;

    if (!shopId || !particulars || !type || !amount) {
        return res.status(400).json({ error: "Missing required core transactional parameter inputs!" });
    }

    try {
        let createdEntryWithRecalculatedBalance = null;

        await prisma.$transaction(async (tx) => {
            const newEntry = await tx.ledgerEntry.create({
                data: {
                    shopId,
                    customerId: customerId || null,
                    supplierId: supplierId || null,
                    particulars,
                    type,
                    amount: parseFloat(amount),
                    runningBalance: 0.00,
                    referenceId: referenceId || null,
                    date: date ? new Date(date) : new Date()
                }
            });

            // Recalculate all running balances for the shop to maintain date-ordered mathematical correctness
            const allEntries = await tx.ledgerEntry.findMany({
                where: { shopId },
                orderBy: [
                    { date: 'asc' },
                    { id: 'asc' }
                ]
            });

            let rollingBalance = 0;

            for (let row of allEntries) {
                const rowAmount = parseFloat(row.amount);
                if (row.type === 'DEBIT') {
                    rollingBalance += rowAmount;
                } else if (row.type === 'CREDIT') {
                    rollingBalance -= rowAmount;
                }

                await tx.ledgerEntry.update({
                    where: { id: row.id },
                    data: { runningBalance: rollingBalance }
                });

                if (row.id === newEntry.id) {
                    createdEntryWithRecalculatedBalance = { ...row, runningBalance: rollingBalance };
                }
            }
        }, { maxWait: 10000, timeout: 30000 });

        await logActivity(shopId, 'LEDGER_ENTRY_CREATED', 'Owner', `Manual entry: ${particulars} (${type} ₹${amount})`);
        res.status(201).json(createdEntryWithRecalculatedBalance);
    } catch (error) {
        console.error('🚨 Error processing core transaction entry:', error);
        res.status(500).json({ error: "Internal Transaction Error. Database state safely maintained." });
    }
};

// 2. Action: 100% Manual Override Edit and Rollback Balance Pipeline
export const editLedgerEntry = async (req, res) => {
    const { id } = req.params;
    const { particulars, type, amount, date } = req.body;

    try {
        const originalRow = await prisma.ledgerEntry.findUnique({
            where: { id }
        });
        if (!originalRow) {
            return res.status(404).json({ error: "Target ledger footprint entry missing." });
        }

        const shopId = originalRow.shopId;
        let updatedEntry = null;

        await prisma.$transaction(async (tx) => {
            updatedEntry = await tx.ledgerEntry.update({
                where: { id },
                data: {
                    particulars: particulars !== undefined ? particulars : undefined,
                    type: type !== undefined ? type : undefined,
                    amount: amount !== undefined ? parseFloat(amount) : undefined,
                    date: date ? new Date(date) : undefined,
                    isEdited: true,
                    lastEditedAt: new Date()
                }
            });

            // AUTOMATED LEDGER RECALCULATION LOOP PIPELINE
            const allEntries = await tx.ledgerEntry.findMany({
                where: { shopId },
                orderBy: [
                    { date: 'asc' },
                    { id: 'asc' }
                ]
            });

            let rollingBalance = 0;
            for (let row of allEntries) {
                const rowAmount = parseFloat(row.amount);
                if (row.type === 'DEBIT') {
                    rollingBalance += rowAmount;
                } else if (row.type === 'CREDIT') {
                    rollingBalance -= rowAmount;
                }

                await tx.ledgerEntry.update({
                    where: { id: row.id },
                    data: { runningBalance: rollingBalance }
                });
            }
        }, { maxWait: 10000, timeout: 30000 });

        await logActivity(shopId, 'LEDGER_ENTRY_EDITED', 'Owner', `Ledger entry edited: ${particulars || originalRow.particulars}`);
        res.json({ message: "Ledger updated & cascading recalculation completed!", entry: updatedEntry });
    } catch (error) {
        console.error('🚨 Error processing automated ledger edit loop updates:', error);
        res.status(500).json({ error: "Internal Recalculation Engine Failure" });
    }
};

// 3. Action: Hard Manual Overriding Deletion with Cascading Balance Rollbacks
export const deleteLedgerEntry = async (req, res) => {
    const { id } = req.params;

    try {
        const targetRow = await prisma.ledgerEntry.findUnique({
            where: { id }
        });
        if (!targetRow) {
            return res.status(404).json({ error: "Ledger entry parameter row does not exist." });
        }

        const shopId = targetRow.shopId;

        await prisma.$transaction(async (tx) => {
            // Hard remove the specific column item from the row array logs
            await tx.ledgerEntry.delete({
                where: { id }
            });

            // Re-trigger the linear flow recalculation sequence loop to recalibrate balances cleanly
            const remainingEntries = await tx.ledgerEntry.findMany({
                where: { shopId },
                orderBy: [
                    { date: 'asc' },
                    { id: 'asc' }
                ]
            });

            let rollingBalance = 0;
            for (let row of remainingEntries) {
                const rowAmount = parseFloat(row.amount);
                if (row.type === 'DEBIT') {
                    rollingBalance += rowAmount;
                } else if (row.type === 'CREDIT') {
                    rollingBalance -= rowAmount;
                }

                await tx.ledgerEntry.update({
                    where: { id: row.id },
                    data: { runningBalance: rollingBalance }
                });
            }
        }, { maxWait: 10000, timeout: 30000 });

        await logActivity(shopId, 'LEDGER_ENTRY_DELETED', 'Owner', `Ledger entry deleted: ${targetRow.particulars}`);
        res.json({ message: "Entry permanently expunged. Audit balances successfully self-healed!" });
    } catch (error) {
        console.error('🚨 Operational failure inside ledger entry drop routine:', error);
        res.status(500).json({ error: "Internal Overriding Engine Failure" });
    }
};

// 4. Action: Fetch Chronological Mixed Feed Logs for Owners View
export const getMasterLedgerStream = async (req, res) => {
    const { shopId } = req.params;
    try {
        const result = await prisma.ledgerEntry.findMany({
            where: { shopId },
            orderBy: [
                { date: 'desc' },
                { id: 'desc' }
            ]
        });
        res.json(result);
    } catch (error) {
        console.error('🚨 Error fetching chronological master ledger feed:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};