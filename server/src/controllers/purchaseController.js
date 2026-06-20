import { prisma } from '../utils/prisma.js';
import { logActivity } from '../activityLogger.js';
import { deleteFromCloudinary } from '../utils/cloudinary.js';

// 1. Action: Log a Fresh Supplier Purchase Bill and Append to Ledgers
export const createPurchaseBill = async (req, res) => {
    const { billNo, shopId, supplierId, itemsArray, attachedImgUrl, slipDetails, totalAmount } = req.body;

    if (!shopId || !supplierId || !totalAmount) {
        return res.status(400).json({ error: "Missing required parameters for purchase liability mapping!" });
    }

    try {
        const parsedAmount = parseFloat(totalAmount);
        let createdBill = null;

        await prisma.$transaction(async (tx) => {
            // A. Commit Purchase Bill registry metadata entry using JSONB formats
            createdBill = await tx.purchaseBill.create({
                data: {
                    billNo: billNo || null,
                    shopId,
                    supplierId,
                    itemsJson: itemsArray || [],
                    attachedImgUrl: attachedImgUrl || null,
                    slipDetails: slipDetails || null,
                    totalAmount: parsedAmount
                }
            });

            // B. Inject corresponding row entry into mixed ledger stream
            const lastLedgerRow = await tx.ledgerEntry.findFirst({
                where: { shopId },
                orderBy: [
                    { date: 'desc' },
                    { id: 'desc' }
                ],
                select: { runningBalance: true }
            });
            let runningBal = parseFloat(lastLedgerRow?.runningBalance || 0);
            runningBal -= parsedAmount; // Purchase bills increase your payable liability (CREDIT position status)

            await tx.ledgerEntry.create({
                data: {
                    shopId,
                    supplierId,
                    particulars: `Purchase Bill logged reference code #${billNo || 'N/A'}`,
                    type: 'CREDIT',
                    amount: parsedAmount,
                    runningBalance: runningBal,
                    referenceId: createdBill.id
                }
            });
        });

        await logActivity(shopId, 'PURCHASE_BILL_CREATED', 'Owner', `Purchase Bill #${billNo || 'N/A'} (₹${parsedAmount})`);
        res.status(201).json({ message: "Purchase bill logged safely", purchaseBill: createdBill });
    } catch (error) {
        console.error('🚨 Error processing purchase bill record matrix:', error);
        res.status(500).json({ error: "Internal Server Processing Error" });
    }
};

// 2. Action: Hard Purge Purchase Bill and Recalibrate Vendor Balances
export const deletePurchaseBill = async (req, res) => {
    const { id } = req.params;

    try {
        const billCheck = await prisma.purchaseBill.findUnique({
            where: { id }
        });
        if (!billCheck) {
            return res.status(404).json({ error: "Target purchase bill identifier not found." });
        }
        const shopId = billCheck.shopId;

        // If there was an attachment, remove it from Cloudinary
        if (billCheck.attachedImgUrl) {
            deleteFromCloudinary(billCheck.attachedImgUrl).catch(err => {
                console.error('[Cloudinary] Failed to delete attachment:', err);
            });
        }

        await prisma.$transaction(async (tx) => {
            await tx.purchaseBill.delete({
                where: { id }
            });
            await tx.ledgerEntry.deleteMany({
                where: { referenceId: id }
            });

            // Recalibrate running index balances sequence loop
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

        await logActivity(shopId, 'PURCHASE_BILL_DELETED', 'Owner', `Purchase Bill #${billCheck.billNo || 'N/A'} deleted`);
        res.json({ message: "Purchase bill removed and ledger files re-calculated successfully!" });
    } catch (error) {
        console.error('🚨 Error processing purchase bill deletion:', error);
        res.status(500).json({ error: "Internal Server Processing Error" });
    }
};

// 3. Action: View Purchase Bills Historical Index List
export const getShopPurchaseBillHistoryList = async (req, res) => {
    const { shopId } = req.params;
    try {
        const result = await prisma.purchaseBill.findMany({
            where: { shopId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(result);
    } catch (error) {
        console.error('🚨 Error pulling purchase bills history arrays:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 4. Action: 100% Override Edit on Purchase Bill and Recalculate App Dues Matrix
export const editPurchaseBill = async (req, res) => {
    const { id } = req.params;
    const { billNo, supplierId, date, itemsArray, slipDetails, totalAmount, attachedImgUrl } = req.body;

    try {
        const originalBill = await prisma.purchaseBill.findUnique({
            where: { id }
        });
        if (!originalBill) {
            return res.status(404).json({ error: "Target purchase bill identifier not found." });
        }

        const parsedAmount = parseFloat(totalAmount);
        const shopId = originalBill.shopId;
        const attachedImgUrlToSave = attachedImgUrl !== undefined ? (attachedImgUrl || null) : originalBill.attachedImgUrl;

        // If old attachment existed and is now replaced or deleted, remove it from Cloudinary
        if (originalBill.attachedImgUrl && originalBill.attachedImgUrl !== attachedImgUrlToSave) {
            deleteFromCloudinary(originalBill.attachedImgUrl).catch(err => {
                console.error('[Cloudinary] Failed to delete old attachment:', err);
            });
        }

        let updatedBill = null;

        await prisma.$transaction(async (tx) => {
            // A. Update PurchaseBill record
            updatedBill = await tx.purchaseBill.update({
                where: { id },
                data: {
                    billNo: billNo || undefined,
                    supplierId: supplierId || undefined,
                    date: date ? new Date(date) : undefined,
                    itemsJson: itemsArray || [],
                    slipDetails: slipDetails || null,
                    totalAmount: parsedAmount,
                    attachedImgUrl: attachedImgUrlToSave,
                    isEdited: true
                }
            });

            // B. Update corresponding LedgerEntry
            await tx.ledgerEntry.updateMany({
                where: { referenceId: id },
                data: {
                    supplierId: supplierId || undefined,
                    amount: parsedAmount,
                    particulars: `Purchase Bill logged reference code #${billNo || originalBill.billNo || 'N/A'}`,
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
        });

        await logActivity(shopId, 'PURCHASE_BILL_EDITED', 'Owner', `Purchase Bill #${billNo || originalBill.billNo || 'N/A'} updated (New Total: ₹${parsedAmount})`);
        res.json({ message: "Purchase bill updated and ledgers synced!", purchaseBill: updatedBill });
    } catch (error) {
        console.error('🚨 Error inside purchase bill editor pipeline:', error);
        res.status(500).json({ error: "Internal Server Processing Error" });
    }
};