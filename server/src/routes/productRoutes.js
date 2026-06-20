import express from 'express';
import {
    createProduct,
    getProducts,
    updateProduct,
    deleteProduct
} from '../controllers/productController.js';
import { shopAuth, requireBodyShopId, requireParamShopId } from '../middleware/shopAuth.js';
import { assertProductAccess } from '../middleware/resourceAuth.js';

const router = express.Router();

router.post('/create', shopAuth, requireBodyShopId, createProduct);
router.get('/list/:shopId', shopAuth, requireParamShopId, getProducts);
router.put('/update/:id', shopAuth, assertProductAccess, updateProduct);
router.delete('/remove/:id', shopAuth, assertProductAccess, deleteProduct);

export default router;
