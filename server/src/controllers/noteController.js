import { prisma } from '../utils/prisma.js';
import { logActivity } from '../activityLogger.js';

// Helper to recalculate running balances for all ledger entries in a shop
const recalculateShopLedger = async (tx, shopId) => {
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
};

// ─── CREDIT NOTES (CUSTOMER SIDE) ──────────────────────────────────────────

export const createCreditNote = async (req, res) => {
    const {
        noteNo, shopId, customerId, invoiceId, date, invoiceDate,
        type, productId, productName, qty, price, amount, remark
    } = req.body;

    if (!noteNo || !shopId || !customerId || !type || amount === undefined) {
        return res.status(400).json({ error: "Missing required Credit Note parameters!" });
    }

    try {
        let createdNote = null;

        await prisma.$transaction(async (tx) => {
            // 1. Create Credit Note record
            createdNote = await tx.creditNote.create({
                data: {
                    noteNo,
                    shopId,
                    customerId,
                    invoiceId: invoiceId || null,
                    date: date ? new Date(date) : new Date(),
                    invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
                    type,
                    productId: productId || null,
                    productName: productName || null,
                    qty: qty ? parseFloat(qty) : null,
                    price: price ? parseFloat(price) : null,
                    amount: parseFloat(amount),
                    remark: remark || null
                }
            });

            // 2. Adjust Product Inventory (ONLY for RETURN type)
            if (type === 'RETURN' && productId) {
                await tx.product.update({
                    where: { id: productId },
                    data: {
                        currentStock: {
                            increment: parseFloat(qty) // Returned item goes back to inventory
                        }
                    }
                });
            }

            // 3. Create Corresponding CREDIT Ledger Entry for Customer
            await tx.ledgerEntry.create({
                data: {
                    shopId,
                    customerId,
                    particulars: type === 'RETURN' 
                        ? `Sales Return Credit Note #${noteNo}`
                        : `Rate Difference Credit Note #${noteNo}`,
                    type: 'CREDIT',
                    amount: parseFloat(amount),
                    runningBalance: 0.00,
                    referenceId: createdNote.id,
                    date: date ? new Date(date) : new Date()
                }
            });

            // 4. Recalculate ledger balances
            await recalculateShopLedger(tx, shopId);
        }, { maxWait: 10000, timeout: 30000 });

        await logActivity(shopId, 'CREDIT_NOTE_CREATED', 'Owner', `Credit Note #${noteNo} (₹${amount}) created for customer.`);
        res.status(201).json({ success: true, note: createdNote });
    } catch (error) {
        console.error('🚨 Error creating Credit Note:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getCreditNotes = async (req, res) => {
    const { shopId } = req.params;
    try {
        const notes = await prisma.creditNote.findMany({
            where: { shopId },
            include: {
                customer: { select: { name: true, phone: true } },
                invoice: { select: { invoiceNo: true } }
            },
            orderBy: { date: 'desc' }
        });
        res.json({ success: true, notes });
    } catch (error) {
        console.error('🚨 Error fetching Credit Notes:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deleteCreditNote = async (req, res) => {
    const { id } = req.params;
    try {
        const note = await prisma.creditNote.findUnique({
            where: { id }
        });

        if (!note) {
            return res.status(404).json({ error: "Credit Note not found." });
        }

        await prisma.$transaction(async (tx) => {
            // 1. Revert Inventory Stock Adjustment (ONLY for RETURN type)
            if (note.type === 'RETURN' && note.productId && note.qty) {
                await tx.product.update({
                    where: { id: note.productId },
                    data: {
                        currentStock: {
                            decrement: parseFloat(note.qty) // Deduct returned items from stock
                        }
                    }
                });
            }

            // 2. Delete corresponding Ledger Entry
            await tx.ledgerEntry.deleteMany({
                where: { referenceId: id }
            });

            // 3. Delete the Credit Note
            await tx.creditNote.delete({
                where: { id }
            });

            // 4. Recalculate ledger balances
            await recalculateShopLedger(tx, note.shopId);
        }, { maxWait: 10000, timeout: 30000 });

        await logActivity(note.shopId, 'CREDIT_NOTE_DELETED', 'Owner', `Credit Note #${note.noteNo} deleted.`);
        res.json({ success: true, message: "Credit Note deleted successfully." });
    } catch (error) {
        console.error('🚨 Error deleting Credit Note:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// ─── DEBIT NOTES (SUPPLIER SIDE) ───────────────────────────────────────────

export const createDebitNote = async (req, res) => {
    const {
        noteNo, shopId, supplierId, purchaseBillId, date, invoiceDate,
        type, productId, productName, qty, price, amount, remark
    } = req.body;

    if (!noteNo || !shopId || !supplierId || !type || amount === undefined) {
        return res.status(400).json({ error: "Missing required Debit Note parameters!" });
    }

    try {
        let createdNote = null;

        await prisma.$transaction(async (tx) => {
            // 1. Create Debit Note record
            createdNote = await tx.debitNote.create({
                data: {
                    noteNo,
                    shopId,
                    supplierId,
                    purchaseBillId: purchaseBillId || null,
                    date: date ? new Date(date) : new Date(),
                    invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
                    type,
                    productId: productId || null,
                    productName: productName || null,
                    qty: qty ? parseFloat(qty) : null,
                    price: price ? parseFloat(price) : null,
                    amount: parseFloat(amount),
                    remark: remark || null
                }
            });

            // 2. Adjust Product Inventory (ONLY for RETURN type)
            if (type === 'RETURN' && productId) {
                await tx.product.update({
                    where: { id: productId },
                    data: {
                        currentStock: {
                            decrement: parseFloat(qty) // Items sent back to supplier decrease our stock
                        }
                    }
                });
            }

            // 3. Create Corresponding DEBIT Ledger Entry for Supplier
            await tx.ledgerEntry.create({
                data: {
                    shopId,
                    supplierId,
                    particulars: type === 'RETURN' 
                        ? `Purchase Return Debit Note #${noteNo}`
                        : `Rate Difference Debit Note #${noteNo}`,
                    type: 'DEBIT',
                    amount: parseFloat(amount),
                    runningBalance: 0.00,
                    referenceId: createdNote.id,
                    date: date ? new Date(date) : new Date()
                }
            });

            // 4. Recalculate ledger balances
            await recalculateShopLedger(tx, shopId);
        }, { maxWait: 10000, timeout: 30000 });

        await logActivity(shopId, 'DEBIT_NOTE_CREATED', 'Owner', `Debit Note #${noteNo} (₹${amount}) created for supplier.`);
        res.status(201).json({ success: true, note: createdNote });
    } catch (error) {
        console.error('🚨 Error creating Debit Note:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getDebitNotes = async (req, res) => {
    const { shopId } = req.params;
    try {
        const notes = await prisma.debitNote.findMany({
            where: { shopId },
            include: {
                supplier: { select: { name: true, phone: true } },
                purchaseBill: { select: { billNo: true } }
            },
            orderBy: { date: 'desc' }
        });
        res.json({ success: true, notes });
    } catch (error) {
        console.error('🚨 Error fetching Debit Notes:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deleteDebitNote = async (req, res) => {
    const { id } = req.params;
    try {
        const note = await prisma.debitNote.findUnique({
            where: { id }
        });

        if (!note) {
            return res.status(404).json({ error: "Debit Note not found." });
        }

        await prisma.$transaction(async (tx) => {
            // 1. Revert Inventory Stock Adjustment (ONLY for RETURN type)
            if (note.type === 'RETURN' && note.productId && note.qty) {
                await tx.product.update({
                    where: { id: note.productId },
                    data: {
                        currentStock: {
                            increment: parseFloat(note.qty) // Put items back into our stock
                        }
                    }
                });
            }

            // 2. Delete corresponding Ledger Entry
            await tx.ledgerEntry.deleteMany({
                where: { referenceId: id }
            });

            // 3. Delete the Debit Note
            await tx.debitNote.delete({
                where: { id }
            });

            // 4. Recalculate ledger balances
            await recalculateShopLedger(tx, note.shopId);
        }, { maxWait: 10000, timeout: 30000 });

        await logActivity(note.shopId, 'DEBIT_NOTE_DELETED', 'Owner', `Debit Note #${note.noteNo} deleted.`);
        res.json({ success: true, message: "Debit Note deleted successfully." });
    } catch (error) {
        console.error('🚨 Error deleting Debit Note:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updateCreditNote = async (req, res) => {
    const { id } = req.params;
    const {
        noteNo, customerId, invoiceId, date, invoiceDate,
        type, productId, productName, qty, price, amount, remark
    } = req.body;

    try {
        const oldNote = await prisma.creditNote.findUnique({
            where: { id }
        });

        if (!oldNote) {
            return res.status(404).json({ error: "Credit Note not found." });
        }

        let updatedNote = null;

        await prisma.$transaction(async (tx) => {
            // 1. Revert Old Inventory Stock Adjustment (ONLY if old type was RETURN)
            if (oldNote.type === 'RETURN' && oldNote.productId && oldNote.qty) {
                await tx.product.update({
                    where: { id: oldNote.productId },
                    data: {
                        currentStock: {
                            decrement: parseFloat(oldNote.qty)
                        }
                    }
                });
            }

            // 2. Apply New Inventory Stock Adjustment (ONLY if new type is RETURN)
            if (type === 'RETURN' && productId && qty) {
                await tx.product.update({
                    where: { id: productId },
                    data: {
                        currentStock: {
                            increment: parseFloat(qty)
                        }
                    }
                });
            }

            // 3. Update Credit Note record
            updatedNote = await tx.creditNote.update({
                where: { id },
                data: {
                    noteNo,
                    customerId,
                    invoiceId: invoiceId || null,
                    date: date ? new Date(date) : new Date(),
                    invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
                    type,
                    productId: productId || null,
                    productName: productName || null,
                    qty: qty ? parseFloat(qty) : null,
                    price: price ? parseFloat(price) : null,
                    amount: parseFloat(amount),
                    remark: remark || null
                }
            });

            // 4. Update Corresponding Ledger Entry
            await tx.ledgerEntry.updateMany({
                where: { referenceId: id },
                data: {
                    customerId,
                    particulars: type === 'RETURN' 
                        ? `Sales Return Credit Note #${noteNo}`
                        : `Rate Difference Credit Note #${noteNo}`,
                    amount: parseFloat(amount),
                    date: date ? new Date(date) : new Date()
                }
            });

            // 5. Recalculate ledger balances
            await recalculateShopLedger(tx, oldNote.shopId);
        }, { maxWait: 10000, timeout: 30000 });

        await logActivity(oldNote.shopId, 'CREDIT_NOTE_UPDATED', 'Owner', `Credit Note #${noteNo} (₹${amount}) updated.`);
        res.json({ success: true, note: updatedNote });
    } catch (error) {
        console.error('🚨 Error updating Credit Note:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updateDebitNote = async (req, res) => {
    const { id } = req.params;
    const {
        noteNo, supplierId, purchaseBillId, date, invoiceDate,
        type, productId, productName, qty, price, amount, remark
    } = req.body;

    try {
        const oldNote = await prisma.debitNote.findUnique({
            where: { id }
        });

        if (!oldNote) {
            return res.status(404).json({ error: "Debit Note not found." });
        }

        let updatedNote = null;

        await prisma.$transaction(async (tx) => {
            // 1. Revert Old Inventory Stock Adjustment (ONLY if old type was RETURN)
            if (oldNote.type === 'RETURN' && oldNote.productId && oldNote.qty) {
                await tx.product.update({
                    where: { id: oldNote.productId },
                    data: {
                        currentStock: {
                            increment: parseFloat(oldNote.qty)
                        }
                    }
                });
            }

            // 2. Apply New Inventory Stock Adjustment (ONLY if new type is RETURN)
            if (type === 'RETURN' && productId && qty) {
                await tx.product.update({
                    where: { id: productId },
                    data: {
                        currentStock: {
                            decrement: parseFloat(qty)
                        }
                    }
                });
            }

            // 3. Update Debit Note record
            updatedNote = await tx.debitNote.update({
                where: { id },
                data: {
                    noteNo,
                    supplierId,
                    purchaseBillId: purchaseBillId || null,
                    date: date ? new Date(date) : new Date(),
                    invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
                    type,
                    productId: productId || null,
                    productName: productName || null,
                    qty: qty ? parseFloat(qty) : null,
                    price: price ? parseFloat(price) : null,
                    amount: parseFloat(amount),
                    remark: remark || null
                }
            });

            // 4. Update Corresponding Ledger Entry
            await tx.ledgerEntry.updateMany({
                where: { referenceId: id },
                data: {
                    supplierId,
                    particulars: type === 'RETURN' 
                        ? `Purchase Return Debit Note #${noteNo}`
                        : `Rate Difference Debit Note #${noteNo}`,
                    amount: parseFloat(amount),
                    date: date ? new Date(date) : new Date()
                }
            });

            // 5. Recalculate ledger balances
            await recalculateShopLedger(tx, oldNote.shopId);
        }, { maxWait: 10000, timeout: 30000 });

        await logActivity(oldNote.shopId, 'DEBIT_NOTE_UPDATED', 'Owner', `Debit Note #${noteNo} (₹${amount}) updated.`);
        res.json({ success: true, note: updatedNote });
    } catch (error) {
        console.error('🚨 Error updating Debit Note:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
