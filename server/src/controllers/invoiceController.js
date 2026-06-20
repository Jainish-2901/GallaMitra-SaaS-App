import { prisma } from '../utils/prisma.js';
import { logActivity } from '../activityLogger.js';
import { deleteFromCloudinary } from '../utils/cloudinary.js';

// 1. Action: Compile a Fresh Sales Invoice and Inject to Ledger Stream
export const createInvoice = async (req, res) => {
    const {
        invoiceNo, shopId, customerId, itemsArray,
        subTotal, taxAmount, miscCharges, taxRate, grandTotal, description, discount, attachedImgUrl
    } = req.body;

    if (!invoiceNo || !shopId || !customerId || !itemsArray || subTotal === undefined || grandTotal === undefined) {
        return res.status(400).json({ error: "Missing required core parameters for invoice mapping!" });
    }

    try {
        const parsedSubTotal = parseFloat(subTotal);
        const parsedTaxAmount = parseFloat(taxAmount || 0);
        const parsedMiscCharges = parseFloat(miscCharges || 0);
        const parsedTaxRate = parseFloat(taxRate || 0);
        const parsedGrandTotal = parseFloat(grandTotal);
        const parsedDiscount = parseFloat(discount || 0);

        let createdInvoice = null;

        await prisma.$transaction(async (tx) => {
            // A. Commit Invoice Document Metadata using JSON/JSONB
            createdInvoice = await tx.invoice.create({
                data: {
                    invoiceNo,
                    shopId,
                    customerId,
                    itemsJson: itemsArray,
                    subTotal: parsedSubTotal,
                    taxAmount: parsedTaxAmount,
                    miscCharges: parsedMiscCharges,
                    taxRate: parsedTaxRate,
                    grandTotal: parsedGrandTotal,
                    description: description || null,
                    discount: parsedDiscount,
                    attachedImgUrl: attachedImgUrl || null
                }
            });

            // B. Inject corresponding row entry into mixed ledger stream instantly
            const lastLedgerRow = await tx.ledgerEntry.findFirst({
                where: { shopId },
                orderBy: [
                    { date: 'desc' },
                    { id: 'desc' }
                ],
                select: { runningBalance: true }
            });

            let runningBal = parseFloat(lastLedgerRow?.runningBalance || 0);
            runningBal += parsedGrandTotal; // Invoice adds to total receivables balance status

            await tx.ledgerEntry.create({
                data: {
                    shopId,
                    customerId,
                    particulars: `Sales Invoice generated reference tracking code #${invoiceNo}`,
                    type: 'DEBIT',
                    amount: parsedGrandTotal,
                    runningBalance: runningBal,
                    referenceId: createdInvoice.id
                }
            });
        });

        await logActivity(shopId, 'INVOICE_CREATED', 'Owner', `Sales Invoice #${invoiceNo} (₹${parsedGrandTotal})`);
        res.status(201).json({ message: "Invoice processed smoothly", invoice: createdInvoice });
    } catch (error) {
        console.error('🚨 Error processing corporate invoice record matrix:', error);
        res.status(500).json({ error: "Unique validation rule mismatch or server error. Invoice aborted safely." });
    }
};

// 2. Action: 100% Override Edit on Invoice and Recalculate App Dues Matrix
export const editInvoice = async (req, res) => {
    const { id } = req.params;
    const { invoiceNo, customerId, date, itemsArray, subTotal, taxAmount, miscCharges, taxRate, grandTotal, description, discount, attachedImgUrl } = req.body;

    try {
        const originalInvoice = await prisma.invoice.findUnique({
            where: { id }
        });
        if (!originalInvoice) {
            return res.status(404).json({ error: "Target invoice file not tracked." });
        }

        const parsedSubTotal = parseFloat(subTotal);
        const parsedTaxAmount = parseFloat(taxAmount || 0);
        const parsedMiscCharges = parseFloat(miscCharges || 0);
        const parsedTaxRate = parseFloat(taxRate || 0);
        const parsedGrandTotal = parseFloat(grandTotal);
        const parsedDiscount = parseFloat(discount || 0);
        const shopId = originalInvoice.shopId;

        const attachedImgUrlToSave = attachedImgUrl !== undefined ? (attachedImgUrl || null) : originalInvoice.attachedImgUrl;

        // If old attachment existed and is now replaced or deleted, remove it from Cloudinary
        if (originalInvoice.attachedImgUrl && originalInvoice.attachedImgUrl !== attachedImgUrlToSave) {
            deleteFromCloudinary(originalInvoice.attachedImgUrl).catch(err => {
                console.error('[Cloudinary] Failed to delete old attachment:', err);
            });
        }

        let updatedInvoice = null;

        await prisma.$transaction(async (tx) => {
            // Update target core database line properties maps
            updatedInvoice = await tx.invoice.update({
                where: { id },
                data: {
                    invoiceNo: invoiceNo || undefined,
                    customerId: customerId || undefined,
                    date: date ? new Date(date) : undefined,
                    itemsJson: itemsArray,
                    subTotal: parsedSubTotal,
                    taxAmount: parsedTaxAmount,
                    miscCharges: parsedMiscCharges,
                    taxRate: parsedTaxRate,
                    grandTotal: parsedGrandTotal,
                    description: description || null,
                    discount: parsedDiscount,
                    attachedImgUrl: attachedImgUrlToSave,
                    isEdited: true
                }
            });

            // Update corresponding link rows inside ledger stream instantly
            // We use updateMany here since referenceId points to the invoice id (and customerId updates conditionally)
            await tx.ledgerEntry.updateMany({
                where: { referenceId: id },
                data: {
                    customerId: customerId || undefined,
                    amount: parsedGrandTotal,
                    particulars: `Sales Invoice generated reference tracking code #${invoiceNo || originalInvoice.invoiceNo}`,
                    date: date ? new Date(date) : undefined,
                    isEdited: true,
                    lastEditedAt: new Date()
                }
            });

            // Trigger complete cascading pipeline recalibration across table rows to sync balances
            const allEntries = await tx.ledgerEntry.findMany({
                where: { shopId },
                orderBy: [
                    { date: 'asc' },
                    { id: 'asc' }
                ]
            });

            let rollingBalance = 0;
            for (let row of allEntries) {
                const amt = parseFloat(row.amount);
                rollingBalance += (row.type === 'DEBIT' ? amt : -amt);
                await tx.ledgerEntry.update({
                    where: { id: row.id },
                    data: { runningBalance: rollingBalance }
                });
            }
        });

        await logActivity(shopId, 'INVOICE_EDITED', 'Owner', `Sales Invoice #${originalInvoice.invoiceNo} updated (New Total: ₹${parsedGrandTotal})`);
        res.json({ message: "Invoice metadata modified and ledgers synced!", invoice: updatedInvoice });
    } catch (error) {
        console.error('🚨 Error inside invoice editor pipeline segment:', error);
        res.status(500).json({ error: "Internal Server Processing Error" });
    }
};

// 3. Action: Hard Purge Invoice Document and Cascade Balance Recalibrations
export const deleteInvoice = async (req, res) => {
    const { id } = req.params;

    try {
        const invoiceCheck = await prisma.invoice.findUnique({
            where: { id }
        });
        if (!invoiceCheck) {
            return res.status(404).json({ error: "Invoice identity mapping code not tracking inside core clusters." });
        }
        const shopId = invoiceCheck.shopId;

        // If there was an attachment, remove it from Cloudinary
        if (invoiceCheck.attachedImgUrl) {
            deleteFromCloudinary(invoiceCheck.attachedImgUrl).catch(err => {
                console.error('[Cloudinary] Failed to delete attachment:', err);
            });
        }

        await prisma.$transaction(async (tx) => {
            // Wipe out parent mapping invoice document entry node
            await tx.invoice.delete({
                where: { id }
            });
            // Drop connected shadow ledger footprint references tracking lines
            await tx.ledgerEntry.deleteMany({
                where: { referenceId: id }
            });

            // Recalibrate running index balances across matching remaining ledger timelines
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
        });

        await logActivity(shopId, 'INVOICE_DELETED', 'Owner', `Sales Invoice #${invoiceCheck.invoiceNo} deleted`);
        res.json({ message: "Invoice permanently expunged. Financial dues recalculated automatically!" });
    } catch (error) {
        console.error('🚨 Operational crash processing invoice removal routines:', error);
        res.status(500).json({ error: "Internal Server Processing Error" });
    }
};

// 4. Action: View Invoices Historical View Sheets Log for Specific Shop
export const getShopInvoiceHistoryList = async (req, res) => {
    const { shopId } = req.params;
    try {
        const result = await prisma.invoice.findMany({
            where: { shopId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(result);
    } catch (error) {
        console.error('🚨 Error pulling tracking invoices index arrays:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};