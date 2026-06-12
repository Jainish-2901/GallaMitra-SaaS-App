import express from 'express';
import {
    createInvoice,
    editInvoice,
    deleteInvoice,
    getShopInvoiceHistoryList
} from '../controllers/invoiceController.js';
import { shopAuth, requireBodyShopId, requireParamShopId } from '../middleware/shopAuth.js';
import { requirePlanTab } from '../middleware/planGuard.js';
import { assertInvoiceAccess } from '../middleware/resourceAuth.js';

const router = express.Router();

router.post('/build', shopAuth, requireBodyShopId, requirePlanTab('invoice_builder'), createInvoice);
router.put('/alter/:id', shopAuth, requirePlanTab('invoice_builder'), assertInvoiceAccess, editInvoice);
router.delete('/purge/:id', shopAuth, requirePlanTab('invoice_builder'), assertInvoiceAccess, deleteInvoice);
router.get('/history/:shopId', shopAuth, requireParamShopId, requirePlanTab('invoice_list'), getShopInvoiceHistoryList);

export default router;
