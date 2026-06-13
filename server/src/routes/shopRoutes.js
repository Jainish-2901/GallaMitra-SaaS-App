import express from 'express';
import {
    registerShop,
    loginShop,
    loginOrCreateShop,
    updateShopSettings,
    getAdminShops,
    toggleShopStatus,
    approveShop,
    rejectShop,
    changeShopPlan,
    getAdminStats,
    inspectShopWorkspace,
    adminAuth,
    getPlans,
    createPlan,
    updatePlan,
    deletePlan,
    getAdminActivities,
    getAdminAuditLogs,
    getAdminDbHealth,
    getAdminSentEmails,
    broadcastEmail,
    requestPasswordResetOtp,
    resetPasswordWithOtp,
    loginAdmin,
    updateShopPasswordFromAdmin,
    requestPlanChange,
    approvePlanChange,
    rejectPlanChange,
    getShopProfile,
    getMyWorkspaces,
    getShopStatus,
    getAdminSettings,
    updateAdminSettings,
    getPublicConfig,
    getPublicStats,
    deleteShopWorkspace
} from '../controllers/shopController.js';
import { shopAuth, requireBodyShopId, requireParamShopIdAsId, requireMatchingEmail } from '../middleware/shopAuth.js';

const router = express.Router();

router.get('/public-config', getPublicConfig);
router.get('/public-stats', getPublicStats);
router.get('/plans', getPlans);

router.post('/register', registerShop);
router.post('/login', loginShop);
router.post('/forgot-password', requestPasswordResetOtp);
router.post('/reset-password', resetPasswordWithOtp);
router.post('/login-gate', loginOrCreateShop);
router.get('/status/:id', getShopStatus);

router.post('/request-plan', shopAuth, requireBodyShopId, requestPlanChange);
router.get('/profile/:id', shopAuth, requireParamShopIdAsId, getShopProfile);
router.get('/my-workspaces/:email', shopAuth, requireMatchingEmail, getMyWorkspaces);
router.put('/settings', shopAuth, requireBodyShopId, updateShopSettings);
router.delete('/:id', shopAuth, requireParamShopIdAsId, deleteShopWorkspace);

router.post('/admin/login', loginAdmin);
router.get('/admin/list', adminAuth, getAdminShops);
router.get('/admin/stats', adminAuth, getAdminStats);
router.get('/admin/settings', adminAuth, getAdminSettings);
router.post('/admin/settings', adminAuth, updateAdminSettings);
router.get('/admin/inspect/:id', adminAuth, inspectShopWorkspace);
router.patch('/admin/shops/:id/status', adminAuth, toggleShopStatus);
router.patch('/admin/shops/:id/approve', adminAuth, approveShop);
router.patch('/admin/shops/:id/reject', adminAuth, rejectShop);
router.patch('/admin/shops/:id/plan', adminAuth, changeShopPlan);
router.patch('/admin/shops/:id/approve-plan', adminAuth, approvePlanChange);
router.patch('/admin/shops/:id/reject-plan', adminAuth, rejectPlanChange);
router.put('/admin/shops/:id/password', adminAuth, updateShopPasswordFromAdmin);

router.post('/admin/plans', adminAuth, createPlan);
router.put('/admin/plans/:id', adminAuth, updatePlan);
router.delete('/admin/plans/:id', adminAuth, deletePlan);

router.get('/admin/activities', adminAuth, getAdminActivities);
router.get('/admin/audit-logs', adminAuth, getAdminAuditLogs);
router.get('/admin/db-health', adminAuth, getAdminDbHealth);
router.get('/admin/sent-emails', adminAuth, getAdminSentEmails);
router.post('/admin/broadcast', adminAuth, broadcastEmail);

router.put('/admin/toggle-status/:id', adminAuth, toggleShopStatus);

export default router;
