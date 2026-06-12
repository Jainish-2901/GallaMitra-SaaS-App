import express from 'express';
import {
    createParty,
    getActiveParties,
    softDeleteParty,
    getPartyDetail,
    updateParty,
    getCustomerPublicProfile,
    getSupplierPublicProfile,
    getPortalShareToken
} from '../controllers/partyController.js';
import { shopAuth, requireBodyShopId, requireParamShopId } from '../middleware/shopAuth.js';
import { assertPartyAccessFromQuery } from '../middleware/resourceAuth.js';

const router = express.Router();

router.post('/create', shopAuth, requireBodyShopId, createParty);
router.get('/list/:shopId', shopAuth, requireParamShopId, getActiveParties);
router.get('/detail/:id', shopAuth, assertPartyAccessFromQuery, getPartyDetail);
router.put('/update/:id', shopAuth, assertPartyAccessFromQuery, updateParty);
router.delete('/remove/:id', shopAuth, assertPartyAccessFromQuery, softDeleteParty);
router.get('/portal-token/:id', shopAuth, assertPartyAccessFromQuery, getPortalShareToken);

router.get('/public/customer/:id', getCustomerPublicProfile);
router.get('/public/supplier/:id', getSupplierPublicProfile);

export default router;
