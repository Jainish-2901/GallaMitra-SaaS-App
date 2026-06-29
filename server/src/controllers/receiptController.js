import { prisma } from '../utils/prisma.js';
import { logActivity } from '../activityLogger.js';

// 1. Action: Generate Independent Payment Voucher Receipt (Customer / Supplier Contexts)
export const createPaymentReceipt = async (req, res) => {
    const { receiptNo, shopId, customerId, supplierId, amount, paymentMode, remark, date } = req.body;

    if (!receiptNo || !shopId || !amount) {
        return res.status(400).json({ error: "Missing required metadata parameters for voucher mapping!" });
    }

    try {
        const parsedAmount = parseFloat(amount);
        let createdReceipt = null;

        await prisma.$transaction(async (tx) => {
            // A. Log the parent payment receipt entry node
            createdReceipt = await tx.paymentReceipt.create({
                data: {
                    receiptNo,
                    shopId,
                    customerId: customerId || null,
                    supplierId: supplierId || null,
                    amount: parsedAmount,
                    paymentMode: paymentMode || 'CASH',
                    remark: remark || null,
                    date: date ? new Date(date) : undefined
                }
            });

            // B. Calculate shadow ledger parameters
            const lastLedgerRow = await tx.ledgerEntry.findFirst({
                where: { shopId },
                orderBy: [
                    { date: 'desc' },
                    { id: 'desc' }
                ],
                select: { runningBalance: true }
            });
            let runningBal = parseFloat(lastLedgerRow?.runningBalance || 0);

            // Dynamic directional balance checking rules
            let transactionType = 'CREDIT';
            let particularsSummary = `Payment Voucher received from Customer via ${paymentMode || 'CASH'}. Code #${receiptNo}`;

            if (supplierId) {
                transactionType = 'DEBIT';
                particularsSummary = `Payment Voucher remitted to Supplier via ${paymentMode || 'CASH'}. Code #${receiptNo}`;
            }

            runningBal += (transactionType === 'DEBIT' ? parsedAmount : -parsedAmount);

            await tx.ledgerEntry.create({
                data: {
                    shopId,
                    customerId: customerId || null,
                    supplierId: supplierId || null,
                    particulars: particularsSummary,
                    type: transactionType,
                    amount: parsedAmount,
                    runningBalance: runningBal,
                    referenceId: createdReceipt.id,
                    date: date ? new Date(date) : undefined
                }
            });
        }, { maxWait: 10000, timeout: 30000 });

        await logActivity(shopId, 'PAYMENT_RECEIPT_CREATED', 'Owner', `Receipt #${receiptNo} (₹${parsedAmount})`);
        res.status(201).json({ message: "Voucher processed cleanly", receipt: createdReceipt });
    } catch (error) {
        console.error('🚨 Error processing independent payment receipt voucher:', error);
        res.status(500).json({ error: "Internal Server Processing Error" });
    }
};

// 2. Action: Hard Clear Voucher Log and Recalculate Timeline Tracks
export const deletePaymentReceipt = async (req, res) => {
    const { id } = req.params;

    try {
        const receiptCheck = await prisma.paymentReceipt.findUnique({
            where: { id }
        });
        if (!receiptCheck) {
            return res.status(404).json({ error: "Target voucher copy not active." });
        }
        const shopId = receiptCheck.shopId;

        await prisma.$transaction(async (tx) => {
            await tx.paymentReceipt.delete({
                where: { id }
            });
            await tx.ledgerEntry.deleteMany({
                where: { referenceId: id }
            });

            const remainingEntries = await tx.ledgerEntry.findMany({
                where: { shopId },
                orderBy: [
                    { date: 'asc' },
                    { id: 'asc' }
                ]
            });

            let rollingBalance = 0;
            for (let row of remainingEntries) {
                const amt = parseFloat(row.amount);
                rollingBalance += (row.type === 'DEBIT' ? amt : -amt);
                await tx.ledgerEntry.update({
                    where: { id: row.id },
                    data: { runningBalance: rollingBalance }
                });
            }
        }, { maxWait: 10000, timeout: 30000 });

        await logActivity(shopId, 'PAYMENT_RECEIPT_DELETED', 'Owner', `Receipt #${receiptCheck.receiptNo} deleted`);
        res.json({ message: "Payment voucher deleted and audit balances synced safely!" });
    } catch (error) {
        console.error('🚨 Error inside independent voucher purge routine:', error);
        res.status(500).json({ error: "Internal Server Processing Error" });
    }
};

// 3. Action: Pull Comprehensive Voucher Collections List History
export const getShopReceiptHistoryList = async (req, res) => {
    const { shopId } = req.params;
    try {
        const result = await prisma.paymentReceipt.findMany({
            where: { shopId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(result);
    } catch (error) {
        console.error('🚨 Error pulling receipt history arrays:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 4. Action: Override/Edit Payment Receipt and recalculate ledger running balances
export const editPaymentReceipt = async (req, res) => {
    const { id } = req.params;
    const { receiptNo, customerId, supplierId, amount, paymentMode, remark, date } = req.body;

    try {
        const originalReceipt = await prisma.paymentReceipt.findUnique({
            where: { id }
        });
        if (!originalReceipt) {
            return res.status(404).json({ error: "Target payment receipt identity mapping not found." });
        }

        const parsedAmount = parseFloat(amount);
        const shopId = originalReceipt.shopId;

        let updatedReceipt = null;

        await prisma.$transaction(async (tx) => {
            // A. Update PaymentReceipt table
            updatedReceipt = await tx.paymentReceipt.update({
                where: { id },
                data: {
                    receiptNo: receiptNo || undefined,
                    customerId: customerId || null,
                    supplierId: supplierId || null,
                    amount: parsedAmount,
                    paymentMode: paymentMode || undefined,
                    remark: remark || null,
                    date: date ? new Date(date) : undefined,
                    isEdited: true
                }
            });

            // B. Update corresponding LedgerEntry
            let transactionType = 'CREDIT';
            let particularsSummary = `Payment Voucher received from Customer via ${paymentMode || originalReceipt.paymentMode}. Code #${receiptNo || originalReceipt.receiptNo}`;

            if (supplierId || (!customerId && originalReceipt.supplierId)) {
                transactionType = 'DEBIT';
                particularsSummary = `Payment Voucher remitted to Supplier via ${paymentMode || originalReceipt.paymentMode}. Code #${receiptNo || originalReceipt.receiptNo}`;
            }

            await tx.ledgerEntry.updateMany({
                where: { referenceId: id },
                data: {
                    customerId: customerId || null,
                    supplierId: supplierId || null,
                    amount: parsedAmount,
                    type: transactionType,
                    particulars: particularsSummary,
                    date: date ? new Date(date) : undefined,
                    isEdited: true,
                    lastEditedAt: new Date()
                }
            });

            // C. Recalculate running balance cascades for this shop
            const remainingEntries = await tx.ledgerEntry.findMany({
                where: { shopId },
                orderBy: [
                    { date: 'asc' },
                    { id: 'asc' }
                ]
            });
            let rollingBalance = 0;
            for (let row of remainingEntries) {
                const amt = parseFloat(row.amount);
                rollingBalance += (row.type === 'DEBIT' ? amt : -amt);
                await tx.ledgerEntry.update({
                    where: { id: row.id },
                    data: { runningBalance: rollingBalance }
                });
            }
        }, { maxWait: 10000, timeout: 30000 });

        await logActivity(shopId, 'PAYMENT_RECEIPT_EDITED', 'Owner', `Receipt #${receiptNo || originalReceipt.receiptNo} updated (New Amount: ₹${parsedAmount})`);
        res.json({ message: "Payment receipt updated and ledgers synced!", receipt: updatedReceipt });
    } catch (error) {
        console.error('🚨 Error inside payment receipt editor pipeline:', error);
        res.status(500).json({ error: "Internal Server Processing Error" });
    }
};