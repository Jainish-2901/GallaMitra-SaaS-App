import express from 'express';
import {
    createPurchaseBill,
    editPurchaseBill,
    deletePurchaseBill,
    getShopPurchaseBillHistoryList
} from '../controllers/purchaseController.js';
import {
    createPaymentReceipt,
    editPaymentReceipt,
    deletePaymentReceipt,
    getShopReceiptHistoryList
} from '../controllers/receiptController.js';
import { shopAuth, requireBodyShopId, requireParamShopId } from '../middleware/shopAuth.js';
import { requirePlanTab } from '../middleware/planGuard.js';
import { assertPurchaseBillAccess, assertReceiptAccess } from '../middleware/resourceAuth.js';

const router = express.Router();

router.post('/purchase/build', shopAuth, requireBodyShopId, requirePlanTab('purchase_bill'), createPurchaseBill);
router.put('/purchase/alter/:id', shopAuth, requirePlanTab('purchase_bill'), assertPurchaseBillAccess, editPurchaseBill);
router.delete('/purchase/purge/:id', shopAuth, requirePlanTab('purchase_bill'), assertPurchaseBillAccess, deletePurchaseBill);
router.get('/purchase/history/:shopId', shopAuth, requireParamShopId, requirePlanTab('pbill_list'), getShopPurchaseBillHistoryList);

router.post('/receipt/build', shopAuth, requireBodyShopId, requirePlanTab('payment_receipt'), createPaymentReceipt);
router.put('/receipt/alter/:id', shopAuth, requirePlanTab('payment_receipt'), assertReceiptAccess, editPaymentReceipt);
router.delete('/receipt/purge/:id', shopAuth, requirePlanTab('payment_receipt'), assertReceiptAccess, deletePaymentReceipt);
router.get('/receipt/history/:shopId', shopAuth, requireParamShopId, requirePlanTab('receipt_list'), getShopReceiptHistoryList);

export default router;
