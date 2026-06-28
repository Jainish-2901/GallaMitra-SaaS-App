import express from 'express';
import {
    createCreditNote,
    getCreditNotes,
    deleteCreditNote,
    updateCreditNote,
    createDebitNote,
    getDebitNotes,
    deleteDebitNote,
    updateDebitNote
} from '../controllers/noteController.js';
import { shopAuth, requireBodyShopId, requireParamShopId } from '../middleware/shopAuth.js';

const router = express.Router();

// Credit Notes routing
router.post('/credit/create', shopAuth, requireBodyShopId, createCreditNote);
router.get('/credit/list/:shopId', shopAuth, requireParamShopId, getCreditNotes);
router.delete('/credit/remove/:id', shopAuth, deleteCreditNote);
router.put('/credit/update/:id', shopAuth, updateCreditNote);

// Debit Notes routing
router.post('/debit/create', shopAuth, requireBodyShopId, createDebitNote);
router.get('/debit/list/:shopId', shopAuth, requireParamShopId, getDebitNotes);
router.delete('/debit/remove/:id', shopAuth, deleteDebitNote);
router.put('/debit/update/:id', shopAuth, updateDebitNote);

export default router;
