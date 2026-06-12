import { db } from '../db.js';
import bcrypt from 'bcryptjs';
import { sendNotificationEmail, generateHtmlEmail, getSupportContacts } from '../emailService.js';
import { logActivity } from '../activityLogger.js';
import { signShopToken } from '../utils/tokens.js';
import fs from 'fs';
import path from 'path';

// ─── ADMIN AUTHENTICATION MIDDLEWARE ───────────────────────────────────────────
export const adminAuth = async (req, res, next) => {
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey) {
        return res.status(401).json({ error: 'Unauthorized: Admin session key required.' });
    }
    try {
        const result = await db.query('SELECT id, username FROM "AdminUser" WHERE "token" = $1', [adminKey]);
        if (result.rows.length > 0) {
            req.admin = result.rows[0];
            return next();
        }
        return res.status(401).json({ error: 'Unauthorized: Invalid admin session.' });
    } catch (error) {
        console.error('🚨 Admin auth error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const SAFE_SHOP_FIELDS = `
    id, "businessName", "ownerName", "email", "phone",
    "logoUrl", "signatureUrl", "address", "businessPhone", "businessEmail",
    "gstin", "state", "vpa", "isActive", "language",
    "plan", "status", "approvedAt", "subscriptionExpiresAt", "createdAt", "updatedAt"
`;

// Helper: Calculate Expiration Date
const calculateExpiryDate = (billingCycle) => {
    const now = new Date();
    if (billingCycle === 'monthly') {
        return new Date(now.setDate(now.getDate() + 30));
    } else if (billingCycle === 'yearly') {
        return new Date(now.setDate(now.getDate() + 365));
    }
    return null; // free plans do not expire
};

// ─── DYNAMIC PLANS CRUD (PUBLIC & ADMIN) ───────────────────────────────────────
// GET /api/shops/plans
export const getPlans = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM "Plan" ORDER BY price ASC');
        res.json({ success: true, plans: result.rows });
    } catch (error) {
        console.error('🚨 Error fetching plans:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// POST /api/shops/admin/plans
export const createPlan = async (req, res) => {
    const { id, name, price, billingCycle, allowedTabs, features, requiresApproval, allowMultiBusiness } = req.body;
    if (!id || !name || price === undefined || !billingCycle || !allowedTabs || !features) {
        return res.status(400).json({ error: 'All plan parameters are required.' });
    }
    try {
        const existing = await db.query('SELECT id FROM "Plan" WHERE id = $1', [id.trim().toLowerCase()]);
        if (existing.rows.length > 0) return res.status(409).json({ error: 'Plan ID already exists.' });

        const result = await db.query(
            `INSERT INTO "Plan" ("id", "name", "price", "billingCycle", "allowedTabs", "features", "requiresApproval", "allowMultiBusiness")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [id.trim().toLowerCase(), name.trim(), parseFloat(price), billingCycle, JSON.stringify(allowedTabs), JSON.stringify(features), !!requiresApproval, !!allowMultiBusiness]
        );

        await logActivity(null, 'ADMIN_PLAN_CREATED', 'Admin', `Created plan '${name}' (${id})`);
        res.status(201).json({ success: true, plan: result.rows[0] });
    } catch (error) {
        console.error('🚨 Error creating plan:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// PUT /api/shops/admin/plans/:id
export const updatePlan = async (req, res) => {
    const { id } = req.params;
    const { name, price, billingCycle, allowedTabs, features, requiresApproval, allowMultiBusiness } = req.body;
    try {
        const result = await db.query(
            `UPDATE "Plan"
             SET "name" = COALESCE($1, "name"),
                 "price" = COALESCE($2, "price"),
                 "billingCycle" = COALESCE($3, "billingCycle"),
                 "allowedTabs" = COALESCE($4, "allowedTabs"),
                 "features" = COALESCE($5, "features"),
                 "requiresApproval" = COALESCE($6, "requiresApproval"),
                 "allowMultiBusiness" = COALESCE($7, "allowMultiBusiness"),
                 "updatedAt" = NOW()
             WHERE id = $8 RETURNING *`,
            [name, price !== undefined ? parseFloat(price) : null, billingCycle, allowedTabs ? JSON.stringify(allowedTabs) : null, features ? JSON.stringify(features) : null, requiresApproval, allowMultiBusiness, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Plan not found.' });

        await logActivity(null, 'ADMIN_PLAN_UPDATED', 'Admin', `Updated plan '${name || id}'`);
        res.json({ success: true, plan: result.rows[0] });
    } catch (error) {
        console.error('🚨 Error updating plan:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// DELETE /api/shops/admin/plans/:id
export const deletePlan = async (req, res) => {
    const { id } = req.params;
    if (['starter', 'growth', 'professional'].includes(id)) {
        return res.status(400).json({ error: 'Cannot delete core system plans.' });
    }
    try {
        const result = await db.query('DELETE FROM "Plan" WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Plan not found.' });

        await logActivity(null, 'ADMIN_PLAN_DELETED', 'Admin', `Deleted plan ID '${id}'`);
        res.json({ success: true, message: 'Plan deleted successfully.' });
    } catch (error) {
        console.error('🚨 Error deleting plan:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── OWNER REGISTRATION ────────────────────────────────────────────────────────
// POST /api/shops/register
export const registerShop = async (req, res) => {
    const { businessName, ownerName, email, phone, password, plan = 'starter' } = req.body;

    if (!businessName || !ownerName || !email) {
        return res.status(400).json({ error: 'Business name, owner name, and email are all required.' });
    }

    try {
        // Fetch plan to verify and check requiresApproval
        const planRes = await db.query('SELECT * FROM "Plan" WHERE id = $1', [plan]);
        if (planRes.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid plan selected.' });
        }
        const planDetails = planRes.rows[0];

        // Clean up any rejected shops with the same email and businessName to allow re-registration
        await db.query(
            `DELETE FROM "Shop" WHERE LOWER("email") = $1 AND "businessName" = $2 AND "status" = 'rejected'`,
            [email.toLowerCase().trim(), businessName.trim()]
        );

        const existing = await db.query(
            `SELECT id FROM "Shop" WHERE "email" = $1 AND "businessName" = $2`,
            [email.toLowerCase().trim(), businessName.trim()]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'A workspace with this business name and email already exists. Please log in instead.' });
        }

        let passwordHash = '';
        if (!password) {
            const existingOwner = await db.query('SELECT "passwordHash" FROM "Shop" WHERE LOWER("email") = $1 AND "passwordHash" IS NOT NULL LIMIT 1', [email.toLowerCase().trim()]);
            if (existingOwner.rows.length === 0) {
                return res.status(400).json({ error: 'Password is required to register a new account.' });
            }
            passwordHash = existingOwner.rows[0].passwordHash;
        } else {
            if (password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
            }
            passwordHash = await bcrypt.hash(password, 12);
        }
        
        // Auto-approve if requiresApproval is false
        const directApprove = !planDetails.requiresApproval;
        const status = directApprove ? 'active' : 'pending';
        const isActive = directApprove;
        const expiryDate = calculateExpiryDate(planDetails.billingCycle);

        const newShop = await db.query(
            `INSERT INTO "Shop" ("businessName", "ownerName", "email", "phone", "passwordHash", "plan", "status", "isActive", "subscriptionExpiresAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING ${SAFE_SHOP_FIELDS}`,
             [businessName.trim(), ownerName.trim(), email.toLowerCase().trim(), phone || null, passwordHash, plan, status, isActive, expiryDate]
        );

        const shop = newShop.rows[0];

        // Fetch admin support contact details dynamically
        const { supportPhone, supportEmail, frontendUrl, adminUrl } = await getSupportContacts();

        // Send Email Notification
        const registerSubject = directApprove ? 'Welcome to GallaMitra! Workspace Ready' : 'GallaMitra Workspace Registration Under Review';
        const registerBody = directApprove
            ? `Hello ${ownerName},\nThank you for registering. Your workspace "${businessName}" under the "${planDetails.name}" plan has been automatically approved and is ready!\nYou can access your panel immediately: ${frontendUrl}/login\n\nBest regards,\nGallaMitra Team`
            : `Hello ${ownerName},\nYour workspace registration for "${businessName}" under the "${planDetails.name}" plan has been submitted and is currently under review.\nWe will notify you as soon as the administrator approves your request.\n\nBest regards,\nGallaMitra Team`;

        const userHtml = generateHtmlEmail({
            title: directApprove ? 'Welcome to GallaMitra! 🎉' : 'Registration Under Review 🕐',
            greeting: `Hello ${ownerName},`,
            leadText: directApprove
                ? `Thank you for registering. Your workspace "${businessName}" under the "${planDetails.name}" plan has been automatically approved and is ready!`
                : `Your workspace registration for "${businessName}" under the "${planDetails.name}" plan has been submitted and is currently under review. We will notify you as soon as the administrator approves your request.`,
            details: [
                { label: 'Business Name', value: businessName },
                { label: 'Selected Plan', value: planDetails.name },
                { label: 'Status', value: directApprove ? 'Active' : 'Pending Approval' }
            ],
            actionUrl: directApprove ? frontendUrl : undefined,
            actionText: directApprove ? 'Go to Dashboard' : undefined,
            supportPhone,
            supportEmail
        });

        await sendNotificationEmail(email.toLowerCase().trim(), registerSubject, registerBody, userHtml);

        // Notify Super Admin of new shop registration
        const adminSubject = `🚨 New Shop Registered: ${businessName}`;
        const adminBody = `Hello Admin,\n\nA new shop workspace has been registered on GallaMitra.\n\nBusiness Name: ${businessName}\nOwner Name: ${ownerName}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nPlan Selected: ${planDetails.name}\nStatus: ${status}\n\nPlease review this shop workspace in the admin dashboard.\n\nBest regards,\nGallaMitra System`;

        const adminHtml = generateHtmlEmail({
            title: '🚨 New Shop Registered',
            greeting: 'Hello Admin,',
            leadText: `A new shop workspace has been registered on GallaMitra and is currently ${status.toUpperCase()}.`,
            details: [
                { label: 'Business Name', value: businessName },
                { label: 'Owner Name', value: ownerName },
                { label: 'Email', value: email },
                { label: 'Phone', value: phone || 'N/A' },
                { label: 'Plan Selected', value: planDetails.name },
                { label: 'Status', value: status.toUpperCase() }
            ],
            actionUrl: `${adminUrl}/?tab=shops`,
            actionText: 'Review Workspace',
            supportPhone,
            supportEmail
        });

        await sendNotificationEmail(supportEmail, adminSubject, adminBody, adminHtml);

        await logActivity(shop.id, 'SHOP_REGISTERED', 'Owner', `${businessName} registered (Plan: ${planDetails.name})`);

        const response = {
            message: directApprove ? 'Registration successful!' : 'Registration submitted. Your workspace is under review.',
            shop,
            pending: !directApprove
        };
        if (directApprove) {
            response.token = signShopToken(shop);
        }
        return res.status(201).json(response);
    } catch (error) {
        console.error('🚨 Error in registerShop:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── OWNER LOGIN ───────────────────────────────────────────────────────────────
// POST /api/shops/login
export const loginShop = async (req, res) => {
    const { email, password, businessName } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        let query = `SELECT * FROM "Shop" WHERE "email" = $1`;
        const params = [email.toLowerCase().trim()];

        if (businessName) {
            query += ` AND "businessName" = $2`;
            params.push(businessName.trim());
        }

        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No workspace found with this email address.' });
        }

        // Multiple shops — ask user to pick one
        if (result.rows.length > 1 && !businessName) {
            return res.status(200).json({
                message: 'Multiple workspaces found',
                shops: result.rows.map(s => ({
                    id: s.id,
                    businessName: s.businessName,
                    ownerName: s.ownerName,
                    email: s.email,
                    isActive: s.isActive,
                    status: s.status,
                    plan: s.plan
                }))
            });
        }

        const shop = result.rows[0];

        // Subscription Expiration Check
        if (shop.subscriptionExpiresAt && new Date() > new Date(shop.subscriptionExpiresAt)) {
            if (shop.status === 'active') {
                await db.query('UPDATE "Shop" SET "status" = \'suspended\', "isActive" = FALSE WHERE id = $1', [shop.id]);
                shop.status = 'suspended';
                shop.isActive = false;

                const { supportPhone, supportEmail } = await getSupportContacts();

                // Send Subscription Expired Email
                const expirySubject = 'GallaMitra Account Status Update: Subscription Expired';
                const expiryBody = `Hello ${shop.ownerName},\nYour subscription for GallaMitra workspace "${shop.businessName}" has expired on ${new Date(shop.subscriptionExpiresAt).toLocaleDateString()}.\nConsequently, your account has been temporarily suspended. Please contact the platform administrator to renew your billing package.`;
                
                const expiryHtml = generateHtmlEmail({
                    title: 'Account Status Update: Subscription Expired ⚠️',
                    greeting: `Hello ${shop.ownerName},`,
                    leadText: `Your subscription for GallaMitra workspace "${shop.businessName}" has expired on ${new Date(shop.subscriptionExpiresAt).toLocaleDateString('en-IN')}. Consequently, your account has been temporarily suspended.`,
                    details: [
                        { label: 'Workspace Name', value: shop.businessName },
                        { label: 'Expiry Date', value: new Date(shop.subscriptionExpiresAt).toLocaleDateString('en-IN') },
                        { label: 'Account Status', value: 'Suspended' }
                    ],
                    supportPhone,
                    supportEmail
                });

                await sendNotificationEmail(shop.email, expirySubject, expiryBody, expiryHtml);
                await logActivity(shop.id, 'SHOP_SUSPENDED_BY_EXPIRATION', 'System', 'Subscription expired');
            }
            return res.status(403).json({ error: 'Your subscription has expired. Please contact the administrator to renew.' });
        }

        // Status checks
        if (shop.status === 'pending') {
            return res.status(403).json({
                error: 'Your workspace is under review. Please wait for admin approval.',
                status: 'pending',
                shopId: shop.id,
                businessName: shop.businessName,
                plan: shop.plan
            });
        }
        if (shop.status === 'rejected') {
            return res.status(403).json({
                error: `Your registration was rejected. Reason: ${shop.rejectionReason || 'Contact support.'}`,
                status: 'rejected'
            });
        }
        if (!shop.isActive || shop.status === 'suspended') {
            return res.status(403).json({ error: 'Your workspace has been suspended. Please contact support.' });
        }

        const isPasswordValid = await bcrypt.compare(password, shop.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Incorrect password. Please try again.' });
        }

        const { passwordHash: _, ...safeShop } = shop;
        
        // Fetch Allowed Tabs dynamically from Plan table
        const planRes = await db.query('SELECT "allowedTabs", "allowMultiBusiness" FROM "Plan" WHERE id = $1', [safeShop.plan]);
        if (planRes.rows.length > 0) {
            safeShop.allowedTabs = planRes.rows[0].allowedTabs;
            safeShop.allowMultiBusiness = !!planRes.rows[0].allowMultiBusiness;
        } else {
            safeShop.allowedTabs = [
                'dashboard', 'cust_list', 'supp_list', 'sale_ledger',
                'purchase_ledger', 'payment_receipt', 'receipt_list', 'user_settings'
            ]; // starter fallback
            safeShop.allowMultiBusiness = false;
        }

        await logActivity(shop.id, 'SHOP_LOGIN', 'Owner', 'Logged into workspace');
        return res.status(200).json({
            message: 'Login successful',
            shop: safeShop,
            token: signShopToken(safeShop)
        });
    } catch (error) {
        console.error('🚨 Error in loginShop:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── FORGOT / RESET PASSWORD FLOW ──────────────────────────────────────────────
// POST /api/shops/forgot-password
export const requestPasswordResetOtp = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    try {
        const normalizedEmail = email.toLowerCase().trim();
        const result = await db.query('SELECT id, "ownerName" FROM "Shop" WHERE "email" = $1 LIMIT 1', [normalizedEmail]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No workspace found with this email address.' });
        }
        const shop = result.rows[0];

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        await db.query(
            'UPDATE "Shop" SET "otpCode" = $1, "otpExpiresAt" = $2 WHERE LOWER("email") = $3',
            [otp, expires, normalizedEmail]
        );

        const { supportPhone, supportEmail } = await getSupportContacts();

        // Send OTP email
        const subject = 'GallaMitra Password Reset Verification Code';
        const body = `Hello ${shop.ownerName},\nYou requested a password reset. Your 6-digit verification OTP code is: ${otp}\nThis code is valid for 10 minutes.`;

        const otpHtml = generateHtmlEmail({
            title: 'Password Reset Verification Code 🔑',
            greeting: `Hello ${shop.ownerName},`,
            leadText: `You requested a password reset for your GallaMitra workspace. Use the verification code below to set a new password.`,
            details: [
                { label: 'Verification Code', value: otp },
                { label: 'Expires In', value: '10 Minutes' }
            ],
            supportPhone,
            supportEmail
        });

        await sendNotificationEmail(email, subject, body, otpHtml);
        await logActivity(shop.id, 'PASSWORD_RESET_OTP_REQUESTED', 'Owner', `OTP requested for ${email}`);

        res.json({ success: true, message: 'Password reset OTP has been sent to your email.' });
    } catch (error) {
        console.error('🚨 Error requesting reset OTP:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// POST /api/shops/reset-password
export const resetPasswordWithOtp = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: 'Email, OTP code and new password are required.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    try {
        const normalizedEmail = email.toLowerCase().trim();
        const result = await db.query(
            `SELECT id, "ownerName", "otpCode", "otpExpiresAt"
             FROM "Shop" WHERE LOWER("email") = $1`,
            [normalizedEmail]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Shop not found.' });

        const shop = result.rows[0];
        if (!shop.otpCode || shop.otpCode !== otp || new Date() > new Date(shop.otpExpiresAt)) {
            return res.status(400).json({ error: 'Invalid or expired OTP code.' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await db.query(
            `UPDATE "Shop"
             SET "passwordHash" = $1, "otpCode" = NULL, "otpExpiresAt" = NULL, "updatedAt" = NOW()
             WHERE LOWER("email") = $2`,
            [passwordHash, normalizedEmail]
        );

        const { supportPhone, supportEmail, frontendUrl } = await getSupportContacts();

        // Send confirmation email
        const subject = 'GallaMitra Account Status Update: Password Reset Successful';
        const body = `Hello ${shop.ownerName},\nYour GallaMitra password has been reset successfully. You can now log into your workspace with your new credentials.`;

        const resetHtml = generateHtmlEmail({
            title: 'Account Status Update: Password Reset Successful ✅',
            greeting: `Hello ${shop.ownerName},`,
            leadText: `Your GallaMitra workspace password has been reset successfully. You can now log in with your new credentials.`,
            details: [
                { label: 'Account Email', value: email },
                { label: 'Status', value: 'Password Updated' }
            ],
            actionUrl: `${frontendUrl}/login`,
            actionText: 'Login to Workspace',
            supportPhone,
            supportEmail
        });

        await sendNotificationEmail(email, subject, body, resetHtml);
        await logActivity(shop.id, 'PASSWORD_RESET_SUCCESSFUL', 'Owner', 'Password updated successfully');

        res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
    } catch (error) {
        console.error('🚨 Error resetting password:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── UPDATE SHOP SETTINGS ──────────────────────────────────────────────────────
export const updateShopSettings = async (req, res) => {
    const {
        shopId, logoUrl, signatureUrl, language,
        address, businessPhone, businessEmail,
        gstin, state, vpa, ownerName, businessName
    } = req.body;

    try {
        const finalLogoUrl = req.body.hasOwnProperty('logoUrl') ? logoUrl : 'UNTOUCHED';
        const finalSignatureUrl = req.body.hasOwnProperty('signatureUrl') ? signatureUrl : 'UNTOUCHED';

        const updatedShop = await db.query(
            `UPDATE "Shop"
             SET "logoUrl"        = CASE WHEN $1 = 'UNTOUCHED' THEN "logoUrl" ELSE $1 END,
                 "signatureUrl"   = CASE WHEN $2 = 'UNTOUCHED' THEN "signatureUrl" ELSE $2 END,
                 "language"       = COALESCE($3,  "language"),
                 "address"        = COALESCE($4,  "address"),
                 "businessPhone"  = COALESCE($5,  "businessPhone"),
                 "businessEmail"  = COALESCE($6,  "businessEmail"),
                 "gstin"          = COALESCE($7,  "gstin"),
                 "state"          = COALESCE($8,  "state"),
                 "vpa"            = COALESCE($9,  "vpa"),
                 "ownerName"      = COALESCE($10, "ownerName"),
                 "businessName"   = COALESCE($11, "businessName"),
                 "updatedAt"      = NOW()
             WHERE "id" = $12
             RETURNING ${SAFE_SHOP_FIELDS}`,
            [finalLogoUrl, finalSignatureUrl, language, address, businessPhone, businessEmail,
             gstin, state, vpa, ownerName, businessName, shopId]
        );

        if (updatedShop.rows.length === 0) {
            return res.status(404).json({ error: 'Shop not found' });
        }

        const shop = updatedShop.rows[0];
        
        const planRes = await db.query('SELECT "allowedTabs" FROM "Plan" WHERE id = $1', [shop.plan]);
        shop.allowedTabs = planRes.rows.length > 0 ? planRes.rows[0].allowedTabs : [];

        await logActivity(shopId, 'SETTINGS_UPDATED', 'Owner', 'Business profile settings modified');
        res.json({ message: 'Settings synced', shop });
    } catch (error) {
        console.error('🚨 Error updating shop settings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── ADMIN: LIST ALL SHOPS ────────────────────────────────────────────────────
export const getAdminShops = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, "businessName" as businessname, "ownerName" as ownername, "email", "phone",
                    "isActive" as isactive, "language", "plan", "status",
                    "approvedAt" as approvedat, "approvedBy" as approvedby, "rejectionReason" as rejectionreason,
                    "subscriptionExpiresAt" as subscriptionexpiresat, "createdAt" as createdat, "updatedAt" as updatedat,
                    "requestedPlan" as requestedplan, "planRequestStatus" as planrequeststatus
             FROM "Shop" ORDER BY "createdAt" DESC`
        );
        res.json({ success: true, shops: result.rows });
    } catch (error) {
        console.error('🚨 Error fetching admin shops:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── ADMIN: TOGGLE SHOP isActive STATUS ──────────────────────────────────────
export const toggleShopStatus = async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    try {
        const status = isActive ? 'active' : 'suspended';
        const result = await db.query(
            `UPDATE "Shop" SET "isActive" = $1, "status" = $2, "updatedAt" = NOW()
             WHERE id = $3 RETURNING id, "ownerName" as ownername, "businessName" as businessname, "email", "isActive" as isactive, "status"`,
            [isActive, status, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Shop not found' });
        const shop = result.rows[0];

        const { supportPhone, supportEmail, frontendUrl } = await getSupportContacts();

        // Send Email Notice
        const subject = `GallaMitra Account Status Update: ${isActive ? 'Activated' : 'Suspended'}`;
        const body = `Hello ${shop.ownername},\nYour GallaMitra workspace "${shop.businessname}" has been ${isActive ? 'reactivated' : 'suspended'} by the platform administrator.`;
        
        const toggleHtml = generateHtmlEmail({
            title: `Account Status Update: ${isActive ? 'Activated 🎉' : 'Suspended ⚠️'}`,
            greeting: `Hello ${shop.ownername},`,
            leadText: isActive 
                ? `Your GallaMitra workspace "${shop.businessname}" has been reactivated by the platform administrator. You can now log back in.`
                : `Your GallaMitra workspace "${shop.businessname}" has been temporarily suspended by the platform administrator. Access has been blocked.`,
            details: [
                { label: 'Workspace Name', value: shop.businessname },
                { label: 'Account Status', value: isActive ? 'Active' : 'Suspended' }
            ],
            actionUrl: isActive ? `${frontendUrl}/login` : undefined,
            actionText: isActive ? 'Login to Workspace' : undefined,
            supportPhone,
            supportEmail
        });

        await sendNotificationEmail(shop.email, subject, body, toggleHtml);
        await logActivity(id, isActive ? 'SHOP_ACTIVATED' : 'SHOP_SUSPENDED', 'Admin', `Status updated by Admin`);
        await logActivity(null, isActive ? 'ADMIN_SHOP_ACTIVATED' : 'ADMIN_SHOP_SUSPENDED', 'Admin', `Updated shop '${shop.businessname}' to ${status}`);

        res.json({ success: true, shop });
    } catch (error) {
        console.error('🚨 Error toggling shop status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── ADMIN: APPROVE SHOP ───────────────────────────────────────────────────────
export const approveShop = async (req, res) => {
    const { id } = req.params;
    const { plan } = req.body; // admin can override plan
    try {
        const shopRes = await db.query('SELECT * FROM "Shop" WHERE id = $1', [id]);
        if (shopRes.rows.length === 0) return res.status(404).json({ error: 'Shop not found' });
        const shop = shopRes.rows[0];

        const targetPlan = plan || shop.plan;
        const planRes = await db.query('SELECT * FROM "Plan" WHERE id = $1', [targetPlan]);
        const planDetails = planRes.rows[0] || { billingCycle: 'free', name: 'Starter' };

        const expiryDate = calculateExpiryDate(planDetails.billingCycle);

        const result = await db.query(
            `UPDATE "Shop"
             SET "status" = 'active', "isActive" = TRUE,
                 "plan" = $1,
                 "approvedAt" = NOW(), "approvedBy" = 'super_admin',
                 "rejectionReason" = NULL, "subscriptionExpiresAt" = $2, "updatedAt" = NOW()
             WHERE id = $3
             RETURNING ${SAFE_SHOP_FIELDS}`,
            [targetPlan, expiryDate, id]
        );

        const { supportPhone, supportEmail, frontendUrl } = await getSupportContacts();

        // Send approval email
        const subject = 'GallaMitra Account Status Update: APPROVED! 🎉';
        const body = `Hello ${shop.ownerName},\nYour GallaMitra workspace "${shop.businessName}" has been approved by the administrator!\nYou can now log in and manage your ledger under the "${planDetails.name}" plan.\n${expiryDate ? `Your current billing period is active until: ${new Date(expiryDate).toLocaleDateString()}` : 'Your plan is free forever.'}\n\nLog in here: ${frontendUrl}/login\n\nBest regards,\nGallaMitra Team`;

        const approvalHtml = generateHtmlEmail({
            title: 'Account Status Update: APPROVED! 🎉',
            greeting: `Hello ${shop.ownerName},`,
            leadText: `Your GallaMitra workspace "${shop.businessName}" has been approved by the administrator! You can now log in and manage your ledger.`,
            details: [
                { label: 'Workspace Name', value: shop.businessName },
                { label: 'Active Plan', value: planDetails.name },
                { label: 'Billing Period', value: expiryDate ? `Active until ${new Date(expiryDate).toLocaleDateString('en-IN')}` : 'Free Forever' }
            ],
            actionUrl: `${frontendUrl}/login`,
            actionText: 'Login to Workspace',
            supportPhone,
            supportEmail
        });

        await sendNotificationEmail(shop.email, subject, body, approvalHtml);
        await logActivity(id, 'SHOP_APPROVED', 'Admin', `Approved under plan ${planDetails.name}`);
        await logActivity(null, 'ADMIN_SHOP_APPROVED', 'Admin', `Approved shop '${shop.businessName}' under plan ${planDetails.name}`);

        res.json({ success: true, message: 'Shop approved successfully', shop: result.rows[0] });
    } catch (error) {
        console.error('🚨 Error approving shop:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── ADMIN: REJECT SHOP ────────────────────────────────────────────────────────
export const rejectShop = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    try {
        const shopRes = await db.query('SELECT * FROM "Shop" WHERE id = $1', [id]);
        if (shopRes.rows.length === 0) return res.status(404).json({ error: 'Shop not found' });
        const shop = shopRes.rows[0];

        const result = await db.query(
            `UPDATE "Shop"
             SET "status" = 'rejected', "isActive" = FALSE,
                 "rejectionReason" = $1, "updatedAt" = NOW()
             WHERE id = $2
             RETURNING id, "status", "rejectionReason"`,
            [reason || 'Registration rejected by admin.', id]
        );

        const { supportPhone, supportEmail } = await getSupportContacts();

        // Send rejection email
        const subject = 'GallaMitra Account Status Update: Rejected';
        const body = `Hello ${shop.ownerName},\nWe regret to inform you that your registration for workspace "${shop.businessName}" has been rejected.\nReason for rejection: ${reason || 'Contact administrator for details.'}`;

        const rejectionHtml = generateHtmlEmail({
            title: 'Account Status Update: Rejected ❌',
            greeting: `Hello ${shop.ownerName},`,
            leadText: `We regret to inform you that your registration request for GallaMitra has been rejected.`,
            details: [
                { label: 'Workspace Name', value: shop.businessName },
                { label: 'Rejection Reason', value: reason || 'Registration details could not be verified.' }
            ],
            supportPhone,
            supportEmail
        });

        await sendNotificationEmail(shop.email, subject, body, rejectionHtml);
        await logActivity(id, 'SHOP_REJECTED', 'Admin', reason);
        await logActivity(null, 'ADMIN_SHOP_REJECTED', 'Admin', `Rejected shop '${shop.businessName}'`);

        res.json({ success: true, message: 'Shop rejected', shop: result.rows[0] });
    } catch (error) {
        console.error('🚨 Error rejecting shop:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── ADMIN: CHANGE SHOP PLAN ──────────────────────────────────────────────────
export const changeShopPlan = async (req, res) => {
    const { id } = req.params;
    const { plan } = req.body;

    try {
        const planRes = await db.query('SELECT * FROM "Plan" WHERE id = $1', [plan]);
        if (planRes.rows.length === 0) return res.status(400).json({ error: 'Invalid plan.' });
        const planDetails = planRes.rows[0];

        const shopRes = await db.query('SELECT * FROM "Shop" WHERE id = $1', [id]);
        if (shopRes.rows.length === 0) return res.status(404).json({ error: 'Shop not found' });
        const shop = shopRes.rows[0];

        const expiryDate = calculateExpiryDate(planDetails.billingCycle);

        const result = await db.query(
            `UPDATE "Shop" 
             SET "plan" = $1, "subscriptionExpiresAt" = $2, "updatedAt" = NOW()
             WHERE id = $3
             RETURNING ${SAFE_SHOP_FIELDS}`,
            [plan, expiryDate, id]
        );

        const updatedShop = result.rows[0];
        updatedShop.allowedTabs = planDetails.allowedTabs;

        const { supportPhone, supportEmail, frontendUrl } = await getSupportContacts();

        // Send confirmation email
        const subject = 'GallaMitra Account Status Update: Plan Changed';
        const body = `Hello ${shop.ownerName},\nYour GallaMitra workspace "${shop.businessName}" plan has been changed to "${planDetails.name}" by the administrator.\nYour new subscription period is active until: ${expiryDate ? new Date(expiryDate).toLocaleDateString() : 'Unlimited (Free)'}.`;

        const planChangeHtml = generateHtmlEmail({
            title: 'Account Status Update: Plan Changed ⚙️',
            greeting: `Hello ${shop.ownerName},`,
            leadText: `Your GallaMitra workspace plan has been updated by the administrator.`,
            details: [
                { label: 'Workspace Name', value: shop.businessName },
                { label: 'New Plan Package', value: planDetails.name },
                { label: 'Expiry Date', value: expiryDate ? new Date(expiryDate).toLocaleDateString('en-IN') : 'Unlimited (Free)' }
            ],
            actionUrl: frontendUrl,
            actionText: 'Go to Workspace',
            supportPhone,
            supportEmail
        });

        await sendNotificationEmail(shop.email, subject, body, planChangeHtml);
        await logActivity(id, 'SHOP_PLAN_CHANGED', 'Admin', `Plan changed to ${planDetails.name}`);
        await logActivity(null, 'ADMIN_SHOP_PLAN_CHANGED', 'Admin', `Changed plan of shop '${shop.businessName}' to ${planDetails.name}`);

        res.json({ success: true, message: `Plan updated to ${planDetails.name}`, shop: updatedShop });
    } catch (error) {
        console.error('🚨 Error changing plan:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── ADMIN: PLATFORM STATS ────────────────────────────────────────────────────
export const getAdminStats = async (req, res) => {
    try {
        const [total, active, pending, rejected, customers, suppliers, invoices, ledger, purchases] = await Promise.all([
            db.query('SELECT COUNT(*) FROM "Shop"'),
            db.query(`SELECT COUNT(*) FROM "Shop" WHERE "status" = 'active'`),
            db.query(`SELECT COUNT(*) FROM "Shop" WHERE "status" = 'pending'`),
            db.query(`SELECT COUNT(*) FROM "Shop" WHERE "status" = 'rejected'`),
            db.query('SELECT COUNT(*) FROM "Customer" WHERE "isDeleted" = FALSE'),
            db.query('SELECT COUNT(*) FROM "Supplier" WHERE "isDeleted" = FALSE'),
            db.query('SELECT COUNT(*) FROM "Invoice"'),
            db.query('SELECT COUNT(*) FROM "LedgerEntry"'),
            db.query('SELECT COUNT(*) FROM "PurchaseBill"'),
        ]);

        res.json({
            success: true,
            stats: {
                totalShops:        parseInt(total.rows[0].count || 0),
                activeShops:       parseInt(active.rows[0].count || 0),
                pendingShops:      parseInt(pending.rows[0].count || 0),
                rejectedShops:     parseInt(rejected.rows[0].count || 0),
                totalCustomers:    parseInt(customers.rows[0].count || 0),
                totalSuppliers:    parseInt(suppliers.rows[0].count || 0),
                totalInvoices:     parseInt(invoices.rows[0].count || 0),
                totalLedger:       parseInt(ledger.rows[0].count || 0),
                totalPurchaseBills:parseInt(purchases.rows[0].count || 0),
            }
        });
    } catch (error) {
        console.error('🚨 Error fetching admin stats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── ADMIN: INSPECT SHOP WORKSPACE ───────────────────────────────────────────
export const inspectShopWorkspace = async (req, res) => {
    const { id } = req.params;
    try {
        const [custRes, suppRes, invRes, recRes, pbRes, ledRes] = await Promise.all([
            db.query('SELECT COUNT(*) FROM "Customer" WHERE "shopId" = $1 AND "isDeleted" = FALSE', [id]),
            db.query('SELECT COUNT(*) FROM "Supplier" WHERE "shopId" = $1 AND "isDeleted" = FALSE', [id]),
            db.query('SELECT COUNT(*), COALESCE(SUM("grandTotal"), 0) as total FROM "Invoice" WHERE "shopId" = $1', [id]),
            db.query('SELECT COUNT(*), COALESCE(SUM("amount"), 0) as total FROM "PaymentReceipt" WHERE "shopId" = $1', [id]),
            db.query('SELECT COUNT(*), COALESCE(SUM("totalAmount"), 0) as total FROM "PurchaseBill" WHERE "shopId" = $1', [id]),
            db.query('SELECT COUNT(*) FROM "LedgerEntry" WHERE "shopId" = $1', [id])
        ]);

        res.json({
            customersCount:     parseInt(custRes.rows[0].count || 0),
            suppliersCount:     parseInt(suppRes.rows[0].count || 0),
            invoicesCount:      parseInt(invRes.rows[0].count || 0),
            invoicesTotal:      parseFloat(invRes.rows[0].total || 0),
            receiptsCount:      parseInt(recRes.rows[0].count || 0),
            receiptsTotal:      parseFloat(recRes.rows[0].total || 0),
            purchaseBillsCount: parseInt(pbRes.rows[0].count || 0),
            purchaseBillsTotal: parseFloat(pbRes.rows[0].total || 0),
            ledgerEntriesCount: parseInt(ledRes.rows[0].count || 0)
        });
    } catch (error) {
        console.error('🚨 Error inspecting shop workspace:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── ADMIN: MONITORING & LOGS ENDPOINTS ────────────────────────────────────────
// GET /api/shops/admin/activities (Tenant events)
export const getAdminActivities = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT a.*, s."businessName" as businessname 
             FROM "ActivityLog" a 
             LEFT JOIN "Shop" s ON a."shopId" = s.id 
             WHERE a."shopId" IS NOT NULL 
             ORDER BY a."createdAt" DESC LIMIT 100`
        );
        res.json({ success: true, activities: result.rows });
    } catch (error) {
        console.error('🚨 Error fetching admin activities:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// GET /api/shops/admin/audit-logs (System events)
export const getAdminAuditLogs = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM "ActivityLog" 
             WHERE "shopId" IS NULL 
             ORDER BY "createdAt" DESC LIMIT 100`
        );
        res.json({ success: true, logs: result.rows });
    } catch (error) {
        console.error('🚨 Error fetching admin audit logs:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// GET /api/shops/admin/db-health
export const getAdminDbHealth = async (req, res) => {
    try {
        const start = Date.now();
        const latencyRes = await db.query('SELECT 1');
        const dbLatency = Date.now() - start;

        const sizeRes = await db.query(`
            SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `);
        const dbSize = sizeRes.rows[0]?.size || 'N/A';

        const tables = ["Shop", "Customer", "Supplier", "LedgerEntry", "Invoice", "PurchaseBill", "PaymentReceipt", "Plan", "ActivityLog"];
        const tablesDetails = [];

        for (const t of tables) {
            const rowCount = await db.query(`SELECT COUNT(*) FROM "${t}"`);
            const tableSize = await db.query(`SELECT pg_size_pretty(pg_total_relation_size('"${t}"')) as size`);
            tablesDetails.push({
                name: t,
                rows: parseInt(rowCount.rows[0].count || 0),
                size: tableSize.rows[0]?.size || 'N/A'
            });
        }

        res.json({
            success: true,
            dbName: process.env.DB_DISPLAY_NAME || 'gallamitra_production',
            dbSize,
            dbLatency: `${dbLatency}ms`,
            tables: tablesDetails
        });
    } catch (error) {
        console.error('🚨 Error fetching admin db health:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// GET /api/shops/admin/sent-emails
export const getAdminSentEmails = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM "EmailQueue" ORDER BY "createdAt" DESC LIMIT 100');
        const list = result.rows.map(row => ({
            id: row.id,
            time: row.createdAt,
            to: row.toEmail,
            subject: row.subject,
            body: row.body,
            status: row.status,
            error: row.error,
            attempts: row.attempts
        }));
        res.json({ success: true, emails: list });
    } catch (error) {
        console.error('🚨 Error fetching email queue logs:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// POST /api/shops/admin/broadcast
export const broadcastEmail = async (req, res) => {
    const { subject, text } = req.body;
    if (!subject || !text) return res.status(400).json({ error: 'Subject and body text are required.' });

    try {
        const shopsRes = await db.query('SELECT email, "ownerName" FROM "Shop" WHERE "isActive" = TRUE AND "status" = \'active\'');
        const activeShops = shopsRes.rows;

        const { supportPhone, supportEmail } = await getSupportContacts();

        for (const shop of activeShops) {
            const customizedBody = `Hello ${shop.ownerName},\n\n${text}\n\nBest regards,\nGallaMitra Platform Announcement`;
            
            const broadcastHtml = generateHtmlEmail({
                title: 'Platform Announcement 📢',
                greeting: `Hello ${shop.ownerName},`,
                leadText: text,
                supportPhone,
                supportEmail
            });

            await sendNotificationEmail(shop.email, subject, customizedBody, broadcastHtml);
        }

        await logActivity(null, 'ADMIN_BROADCAST_SENT', 'Admin', `Broadcasted to ${activeShops.length} active shops: "${subject}"`);
        res.json({ success: true, message: `Successfully broadcasted notification email to ${activeShops.length} active shops.` });
    } catch (error) {
        console.error('🚨 Error sending admin broadcast:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Backward-compat aliases
export const loginOrCreateShop = async (req, res) => {
    return res.status(410).json({ error: 'This endpoint is deprecated. Use /register or /login.' });
};

// ─── ADMIN: LOGIN DYNAMIC USER ────────────────────────────────────────────────
export const loginAdmin = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
    try {
        const result = await db.query('SELECT * FROM "AdminUser" WHERE "username" = $1', [username.trim().toLowerCase()]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid admin credentials.' });
        }
        const admin = result.rows[0];
        
        const isMatch = await bcrypt.compare(password, admin.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid admin credentials.' });
        }
        
        const crypto = await import('crypto');
        const token = 'Admin-Token-' + crypto.randomBytes(24).toString('hex');
        
        await db.query('UPDATE "AdminUser" SET "token" = $1 WHERE id = $2', [token, admin.id]);
        
        await logActivity(null, 'ADMIN_LOGIN', 'Admin', `Super Admin logged in from portal`);
        
        res.json({ success: true, token });
    } catch (error) {
        console.error('🚨 Error in admin login:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── ADMIN: RESET TENANT OWNER PASSWORD ─────────────────────────────────────────
export const updateShopPasswordFromAdmin = async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    try {
        const passwordHash = await bcrypt.hash(password, 12);
        const result = await db.query(
            `UPDATE "Shop" SET "passwordHash" = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING id, "businessName"`,
            [passwordHash, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Shop not found' });
        
        await logActivity(id, 'ADMIN_SHOP_PASSWORD_UPDATED', 'Admin', `Password reset by administrator`);
        res.json({ success: true, message: 'Shop owner password updated successfully.' });
    } catch (error) {
        console.error('🚨 Error updating shop password:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── OWNER: REQUEST PLAN CHANGE ────────────────────────────────────────────────
export const requestPlanChange = async (req, res) => {
    const { shopId, planId } = req.body;
    if (!shopId || !planId) {
        return res.status(400).json({ error: 'Shop ID and target Plan ID are required.' });
    }
    try {
        const planRes = await db.query('SELECT * FROM "Plan" WHERE id = $1', [planId]);
        if (planRes.rows.length === 0) return res.status(400).json({ error: 'Invalid plan selected.' });
        const requestedPlanDetails = planRes.rows[0];

        // Fetch full shop details for email notification
        const shopRes = await db.query('SELECT * FROM "Shop" WHERE id = $1', [shopId]);
        if (shopRes.rows.length === 0) return res.status(404).json({ error: 'Shop workspace not found.' });
        const shop = shopRes.rows[0];

        // Fetch current plan name
        const currentPlanRes = await db.query('SELECT name FROM "Plan" WHERE id = $1', [shop.plan]);
        const currentPlanName = currentPlanRes.rows[0]?.name || shop.plan;

        const result = await db.query(
            `UPDATE "Shop" 
             SET "requestedPlan" = $1, "planRequestStatus" = 'pending', "updatedAt" = NOW() 
             WHERE id = $2 
             RETURNING id, "plan", "requestedPlan", "planRequestStatus"`,
            [planId, shopId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Shop workspace not found.' });

        const { supportPhone, supportEmail, adminUrl } = await getSupportContacts();

        // ── Notify Super Admin about plan change request ──
        const adminSubject = `📋 Plan Change Request: ${shop.businessName} → ${requestedPlanDetails.name}`;
        const adminBody = `Hello Admin,\n\nAn owner has submitted a plan change request on GallaMitra and requires your review.\n\nBusiness Name: ${shop.businessName}\nOwner Name: ${shop.ownerName}\nEmail: ${shop.email}\nPhone: ${shop.phone || 'N/A'}\nCurrent Plan: ${currentPlanName}\nRequested Plan: ${requestedPlanDetails.name}\n\nPlease review this request in the admin dashboard.\n\nBest regards,\nGallaMitra System`;

        const adminHtml = generateHtmlEmail({
            title: '📋 Plan Change Request Received',
            greeting: 'Hello Admin,',
            leadText: `An owner has submitted a plan change request on GallaMitra. Please review and approve or reject it from the admin dashboard.`,
            details: [
                { label: 'Business Name', value: shop.businessName },
                { label: 'Owner Name', value: shop.ownerName },
                { label: 'Email', value: shop.email },
                { label: 'Phone', value: shop.phone || 'N/A' },
                { label: 'Current Plan', value: currentPlanName },
                { label: 'Requested Plan', value: requestedPlanDetails.name },
                { label: 'Request Status', value: 'PENDING REVIEW' }
            ],
            actionUrl: `${adminUrl}/?tab=shops`,
            actionText: 'Review Plan Request',
            supportPhone,
            supportEmail
        });

        await sendNotificationEmail(supportEmail, adminSubject, adminBody, adminHtml);

        await logActivity(shopId, 'SHOP_PLAN_REQUESTED', 'Owner', `Requested plan upgrade to ${requestedPlanDetails.name}`);
        res.json({ success: true, message: 'Plan upgrade request submitted for review.', shop: result.rows[0] });
    } catch (error) {
        console.error('🚨 Error requesting plan change:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── ADMIN: APPROVE PLAN CHANGE ────────────────────────────────────────────────
export const approvePlanChange = async (req, res) => {
    const { id } = req.params;
    try {
        const shopRes = await db.query('SELECT * FROM "Shop" WHERE id = $1', [id]);
        if (shopRes.rows.length === 0) return res.status(404).json({ error: 'Shop not found' });
        const shop = shopRes.rows[0];
        
        if (shop.planRequestStatus !== 'pending' || !shop.requestedPlan) {
            return res.status(400).json({ error: 'No pending plan change request found for this shop.' });
        }
        
        const planRes = await db.query('SELECT * FROM "Plan" WHERE id = $1', [shop.requestedPlan]);
        if (planRes.rows.length === 0) return res.status(400).json({ error: 'Invalid target plan.' });
        const planDetails = planRes.rows[0];
        
        const expiryDate = calculateExpiryDate(planDetails.billingCycle);
        
        const result = await db.query(
            `UPDATE "Shop"
             SET "plan" = $1, "subscriptionExpiresAt" = $2,
                 "requestedPlan" = NULL, "planRequestStatus" = 'none',
                 "status" = 'active', "isActive" = TRUE, "updatedAt" = NOW()
             WHERE id = $3
             RETURNING ${SAFE_SHOP_FIELDS}`,
            [shop.requestedPlan, expiryDate, id]
        );
        
        const updatedShop = result.rows[0];
        updatedShop.allowedTabs = planDetails.allowedTabs;
        
        const { supportPhone, supportEmail, frontendUrl } = await getSupportContacts();

        // Send approval email
        const subject = `GallaMitra Plan Upgrade Approved: ${planDetails.name} 🎉`;
        const body = `Hello ${shop.ownerName},\nYour request to change your plan to "${planDetails.name}" for workspace "${shop.businessName}" has been APPROVED by the administrator!\nYour new billing/subscription features are active now.\n${expiryDate ? `Your plan is active until: ${new Date(expiryDate).toLocaleDateString()}` : 'Your plan has no expiration (Free).'}`;
        
        const planUpgradeHtml = generateHtmlEmail({
            title: 'Plan Upgrade Approved! 🎉',
            greeting: `Hello ${shop.ownerName},`,
            leadText: `Your request to change your plan to "${planDetails.name}" for workspace "${shop.businessName}" has been APPROVED by the administrator! Your new billing/subscription features are active now.`,
            details: [
                { label: 'Workspace Name', value: shop.businessName },
                { label: 'Approved Plan', value: planDetails.name },
                { label: 'Expiry Date', value: expiryDate ? new Date(expiryDate).toLocaleDateString('en-IN') : 'Unlimited (Free)' }
            ],
            actionUrl: frontendUrl,
            actionText: 'Go to Dashboard',
            supportPhone,
            supportEmail
        });

        await sendNotificationEmail(shop.email, subject, body, planUpgradeHtml);
        await logActivity(id, 'SHOP_PLAN_APPROVED', 'Admin', `Plan changed to ${planDetails.name}`);
        await logActivity(null, 'ADMIN_PLAN_REQUEST_APPROVED', 'Admin', `Approved plan change for '${shop.businessName}' to ${planDetails.name}`);

        res.json({ success: true, message: `Plan request approved. New plan: ${planDetails.name}`, shop: updatedShop });
    } catch (error) {
        console.error('🚨 Error approving plan change:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── ADMIN: REJECT PLAN CHANGE ────────────────────────────────────────────────
export const rejectPlanChange = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    try {
        const shopRes = await db.query('SELECT * FROM "Shop" WHERE id = $1', [id]);
        if (shopRes.rows.length === 0) return res.status(404).json({ error: 'Shop not found' });
        const shop = shopRes.rows[0];
        
        if (shop.planRequestStatus !== 'pending' || !shop.requestedPlan) {
            return res.status(400).json({ error: 'No pending plan change request found.' });
        }
        
        const planRes = await db.query('SELECT name FROM "Plan" WHERE id = $1', [shop.requestedPlan]);
        const planName = planRes.rows[0]?.name || shop.requestedPlan;
        
        await db.query(
            `UPDATE "Shop"
             SET "requestedPlan" = NULL, "planRequestStatus" = 'rejected', "updatedAt" = NOW()
             WHERE id = $1`,
            [id]
        );
        
        const { supportPhone, supportEmail } = await getSupportContacts();

        // Send rejection email
        const subject = 'GallaMitra Plan Upgrade Request Rejected';
        const body = `Hello ${shop.ownerName},\nWe regret to inform you that your request to change your plan to "${planName}" for workspace "${shop.businessName}" has been rejected by the administrator.\nReason: ${reason || 'Subscription details could not be verified.'}`;
        
        const planUpgradeRejectHtml = generateHtmlEmail({
            title: 'Plan Upgrade Request Rejected ❌',
            greeting: `Hello ${shop.ownerName},`,
            leadText: `We regret to inform you that your request to upgrade to the "${planName}" plan for workspace "${shop.businessName}" has been rejected by the administrator.`,
            details: [
                { label: 'Workspace Name', value: shop.businessName },
                { label: 'Requested Plan', value: planName },
                { label: 'Rejection Reason', value: reason || 'Subscription details could not be verified.' }
            ],
            supportPhone,
            supportEmail
        });

        await sendNotificationEmail(shop.email, subject, body, planUpgradeRejectHtml);
        await logActivity(id, 'SHOP_PLAN_REJECTED', 'Admin', `Upgrade to ${planName} rejected. Reason: ${reason}`);
        await logActivity(null, 'ADMIN_PLAN_REQUEST_REJECTED', 'Admin', `Rejected plan upgrade request for '${shop.businessName}'`);
        
        res.json({ success: true, message: 'Plan request rejected.' });
    } catch (error) {
        console.error('🚨 Error rejecting plan change:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── OWNER: FETCH SHOP PROFILE DETAILS ─────────────────────────────────────────
export const getShopProfile = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            `SELECT id, "businessName" as businessname, "ownerName" as ownername, "email", "phone",
                    "logoUrl" as logourl, "signatureUrl" as signatureurl, "address", "businessPhone" as businessphone,
                    "businessEmail" as businessemail, "gstin", "state", "vpa", "isActive" as isactive, "language",
                    "plan", "status", "approvedAt" as approvedat, "subscriptionExpiresAt" as subscriptionexpiresat,
                    "requestedPlan" as requestedplan, "planRequestStatus" as planrequeststatus,
                    "bankDetails" as bankdetails, "invoiceTerms" as invoiceterms
             FROM "Shop" WHERE id = $1`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Shop not found' });
        
        const shop = result.rows[0];
        
        const mappedShop = {
            id: shop.id,
            businessName: shop.businessname,
            ownerName: shop.ownername,
            email: shop.email,
            phone: shop.phone,
            logoUrl: shop.logourl,
            signatureUrl: shop.signatureurl,
            address: shop.address,
            businessPhone: shop.businessphone,
            businessEmail: shop.businessemail,
            gstin: shop.gstin,
            state: shop.state,
            vpa: shop.vpa,
            isActive: shop.isactive,
            language: shop.language,
            plan: shop.plan,
            status: shop.status,
            approvedAt: shop.approvedat,
            subscriptionExpiresAt: shop.subscriptionexpiresat,
            requestedPlan: shop.requestedplan,
            planRequestStatus: shop.planrequeststatus,
            bankDetails: shop.bankdetails,
            invoiceTerms: shop.invoiceterms
        };

        const planRes = await db.query('SELECT "allowedTabs", "allowMultiBusiness" FROM "Plan" WHERE id = $1', [shop.plan]);
        mappedShop.allowedTabs = planRes.rows.length > 0 ? planRes.rows[0].allowedTabs : [];
        mappedShop.allowMultiBusiness = planRes.rows.length > 0 ? !!planRes.rows[0].allowMultiBusiness : false;

        res.json({ success: true, shop: mappedShop });
    } catch (error) {
        console.error('🚨 Error fetching shop profile:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── OWNER: GET ALL REGISTERED WORKSPACES BY EMAIL ────────────────────────────
export const getMyWorkspaces = async (req, res) => {
    const { email } = req.params;
    if (!email) {
        return res.status(400).json({ error: 'Email parameter is required.' });
    }
    try {
        const result = await db.query(
            `SELECT s.id, s."businessName" as businessname, s."ownerName" as ownername, s."email", s."phone",
                    s."plan", s."status", s."isActive" as isactive, s."subscriptionExpiresAt" as subscriptionexpiresat,
                    p."allowMultiBusiness" as allowmultibusiness
             FROM "Shop" s
             LEFT JOIN "Plan" p ON s.plan = p.id
             WHERE LOWER(s."email") = $1 AND s."status" = 'active' AND s."isActive" = TRUE
             ORDER BY s."businessName" ASC`,
            [email.toLowerCase().trim()]
        );
        
        const shops = result.rows.map(s => ({
            id: s.id,
            businessName: s.businessname,
            ownerName: s.ownername,
            email: s.email,
            phone: s.phone,
            plan: s.plan,
            status: s.status,
            isActive: s.isactive,
            subscriptionExpiresAt: s.subscriptionexpiresat,
            allowMultiBusiness: !!s.allowmultibusiness
        }));

        res.json({ success: true, shops });
    } catch (error) {
        console.error('🚨 Error fetching workspaces:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── PUBLIC: GET SHOP STATUS & ADMIN SUPPORT CONTACTS ─────────────────────────
export const getShopStatus = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            `SELECT id, "businessName" as businessname, "ownerName" as ownername, "email", "phone",
                    "logoUrl" as logourl, "signatureUrl" as signatureurl, "address", "businessPhone" as businessphone,
                    "businessEmail" as businessemail, "gstin", "state", "vpa", "isActive" as isactive, "language",
                    "plan", "status", "approvedAt" as approvedat, "subscriptionExpiresAt" as subscriptionexpiresat,
                    "requestedPlan" as requestedplan, "planRequestStatus" as planrequeststatus,
                    "bankDetails" as bankdetails, "invoiceTerms" as invoiceterms
             FROM "Shop" WHERE id = $1`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Shop not found' });
        
        const shop = result.rows[0];
        const mappedShop = {
            id: shop.id,
            businessName: shop.businessname,
            ownerName: shop.ownername,
            email: shop.email,
            phone: shop.phone,
            logoUrl: shop.logourl,
            signatureUrl: shop.signatureurl,
            address: shop.address,
            businessPhone: shop.businessphone,
            businessEmail: shop.businessemail,
            gstin: shop.gstin,
            state: shop.state,
            vpa: shop.vpa,
            isActive: shop.isactive,
            language: shop.language,
            plan: shop.plan,
            status: shop.status,
            approvedAt: shop.approvedat,
            subscriptionExpiresAt: shop.subscriptionexpiresat,
            requestedPlan: shop.requestedplan,
            planRequestStatus: shop.planrequeststatus,
            bankDetails: shop.bankdetails,
            invoiceTerms: shop.invoiceterms
        };

        const planRes = await db.query('SELECT "allowedTabs", "allowMultiBusiness" FROM "Plan" WHERE id = $1', [shop.plan]);
        mappedShop.allowedTabs = planRes.rows.length > 0 ? planRes.rows[0].allowedTabs : [];
        mappedShop.allowMultiBusiness = planRes.rows.length > 0 ? !!planRes.rows[0].allowMultiBusiness : false;

        // Fetch support contact details dynamically from first AdminUser record
        const adminRes = await db.query('SELECT "supportPhone" as supportphone, "supportEmail" as supportemail FROM "AdminUser" LIMIT 1');
        const supportPhone = adminRes.rows.length > 0 ? adminRes.rows[0].supportphone : '+91 97732 72749';
        const supportEmail = adminRes.rows.length > 0 ? adminRes.rows[0].supportemail : 'jainishdabgar2901@gmail.com';

        const response = {
            success: true,
            status: shop.status,
            shop: mappedShop,
            supportPhone,
            supportEmail
        };
        if (shop.status === 'active' && shop.isactive) {
            response.token = signShopToken(mappedShop);
        }
        res.json(response);
    } catch (error) {
        console.error('🚨 Error fetching shop status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── ADMIN: GET SETTINGS ───────────────────────────────────────────────────────
export const getAdminSettings = async (req, res) => {
    try {
        const adminRes = await db.query('SELECT "supportPhone" as supportphone, "supportEmail" as supportemail FROM "AdminUser" WHERE id = $1', [req.admin.id]);
        let supportPhone = '+91 97732 72749';
        let supportEmail = 'jainishdabgar2901@gmail.com';
        if (adminRes.rows.length > 0) {
            supportPhone = adminRes.rows[0].supportphone || supportPhone;
            supportEmail = adminRes.rows[0].supportemail || supportEmail;
        } else {
            const fallbackRes = await db.query('SELECT "supportPhone" as supportphone, "supportEmail" as supportemail FROM "AdminUser" LIMIT 1');
            if (fallbackRes.rows.length > 0) {
                supportPhone = fallbackRes.rows[0].supportphone || supportPhone;
                supportEmail = fallbackRes.rows[0].supportemail || supportEmail;
            }
        }
        res.json({
            success: true,
            supportPhone,
            supportEmail,
            backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
            frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
            adminUrl: process.env.ADMIN_URL || 'http://localhost:5001'
        });
    } catch (error) {
        console.error('🚨 Error getting admin settings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── ADMIN: UPDATE SETTINGS ────────────────────────────────────────────────────
export const updateAdminSettings = async (req, res) => {
    const { supportPhone, supportEmail } = req.body;
    if (!supportPhone || !supportEmail) {
        return res.status(400).json({ error: 'Support phone and support email are both required.' });
    }
    try {
        await db.query(
            'UPDATE "AdminUser" SET "supportPhone" = $1, "supportEmail" = $2 WHERE id = $3',
            [
                supportPhone.trim(), 
                supportEmail.trim().toLowerCase(), 
                req.admin.id
            ]
        );
        res.json({ success: true, message: 'Platform support settings updated successfully.' });
    } catch (error) {
        console.error('🚨 Error updating admin settings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── PUBLIC: GET PLATFORM SETTINGS ─────────────────────────────────────────────
export const getPublicConfig = async (req, res) => {
    try {
        const result = await db.query('SELECT "supportPhone" as supportphone, "supportEmail" as supportemail FROM "AdminUser" LIMIT 1');
        let supportPhone = '+91 97732 72749';
        let supportEmail = 'jainishdabgar2901@gmail.com';
        if (result.rows.length > 0) {
            supportPhone = result.rows[0].supportphone || supportPhone;
            supportEmail = result.rows[0].supportemail || supportEmail;
        }
        res.json({
            success: true,
            supportPhone,
            supportEmail,
            backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
            frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
            adminUrl: process.env.ADMIN_URL || 'http://localhost:5001'
        });
    } catch (error) {
        console.error('🚨 Error getting public config:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── OWNER: DELETE SHOP WORKSPACE ──────────────────────────────────────────────
export const deleteShopWorkspace = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ error: 'Shop ID is required.' });
    }
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        await client.query('DELETE FROM "ActivityLog" WHERE "shopId" = $1', [id]);
        const result = await client.query(
            'DELETE FROM "Shop" WHERE id = $1 RETURNING "businessName"',
            [id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Shop workspace not found.' });
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `Workspace "${result.rows[0].businessName}" deleted successfully.` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('🚨 Error deleting shop workspace:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
};