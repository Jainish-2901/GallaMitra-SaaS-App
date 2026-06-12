import express from 'express';
import {
    createLedgerEntry,
    editLedgerEntry,
    deleteLedgerEntry,
    getMasterLedgerStream
} from '../controllers/ledgerController.js';
import { shopAuth, requireBodyShopId, requireParamShopId } from '../middleware/shopAuth.js';
import { assertLedgerAccess } from '../middleware/resourceAuth.js';

const router = express.Router();

router.post('/entry', shopAuth, requireBodyShopId, createLedgerEntry);
router.put('/update/:id', shopAuth, assertLedgerAccess, editLedgerEntry);
router.delete('/purge/:id', shopAuth, assertLedgerAccess, deleteLedgerEntry);
router.get('/stream/:shopId', shopAuth, requireParamShopId, getMasterLedgerStream);
export default router;
