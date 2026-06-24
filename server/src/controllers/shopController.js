import bcrypt from 'bcryptjs';
import { sendNotificationEmail, generateHtmlEmail, getSupportContacts } from '../emailService.js';
import { logActivity } from '../activityLogger.js';
import { signShopToken } from '../utils/tokens.js';
import fs from 'fs';
import path from 'path';
import { prisma } from '../utils/prisma.js';

// ─── ADMIN AUTHENTICATION MIDDLEWARE ───────────────────────────────────────────
export const adminAuth = async (req, res, next) => {
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey) {
        return res.status(401).json({ error: 'Unauthorized: Admin session key required.' });
    }
    try {
        const admin = await prisma.adminUser.findFirst({
            where: { token: adminKey },
            select: { id: true, username: true }
        });
        if (admin) {
            req.admin = admin;
            return next();
        }
        return res.status(401).json({ error: 'Unauthorized: Invalid admin session.' });
    } catch (error) {
        console.error('🚨 Admin auth error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Helper: safe shop field mapper
const toSafeShop = (shop) => {
    if (!shop) return null;
    return {
        id: shop.id,
        businessName: shop.businessName,
        ownerName: shop.ownerName,
        email: shop.email,
        phone: shop.phone,
        logoUrl: shop.logoUrl,
        signatureUrl: shop.signatureUrl,
        address: shop.address,
        businessPhone: shop.businessPhone,
        businessEmail: shop.businessEmail,
        gstin: shop.gstin,
        state: shop.state,
        vpa: shop.vpa,
        isActive: shop.isActive,
        language: shop.language,
        plan: shop.plan,
        status: shop.status,
        approvedAt: shop.approvedAt,
        subscriptionExpiresAt: shop.subscriptionExpiresAt,
        createdAt: shop.createdAt,
        updatedAt: shop.updatedAt
    };
};

// Helper: Calculate Expiration Date
const calculateExpiryDate = (billingCycle) => {
    const now = new Date();
    if (billingCycle === 'monthly') {
        return new Date(now.setDate(now.getDate() + 30));
    } else if (billingCycle === '3_months') {
        return new Date(now.setMonth(now.getMonth() + 3));
    } else if (billingCycle === '6_months') {
        return new Date(now.setMonth(now.getMonth() + 6));
    } else if (billingCycle === 'yearly') {
        return new Date(now.setDate(now.getDate() + 365));
    } else if (billingCycle === 'trial' || billingCycle === 'free_trial') {
        return new Date(now.setDate(now.getDate() + 15));
    }
    return null; // free plans do not expire
};

// ─── DYNAMIC PLANS CRUD (PUBLIC & ADMIN) ───────────────────────────────────────
// GET /api/shops/plans
export const getPlans = async (req, res) => {
    try {
        const plans = await prisma.plan.findMany({
            orderBy: { price: 'asc' }
        });
        res.json({ success: true, plans });
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
        const existing = await prisma.plan.findUnique({
            where: { id: id.trim().toLowerCase() },
            select: { id: true }
        });
        if (existing) return res.status(409).json({ error: 'Plan ID already exists.' });

        const plan = await prisma.plan.create({
            data: {
                id: id.trim().toLowerCase(),
                name: name.trim(),
                price: parseFloat(price),
                billingCycle,
                allowedTabs: allowedTabs,
                features: features,
                requiresApproval: !!requiresApproval,
                allowMultiBusiness: !!allowMultiBusiness
            }
        });

        await logActivity(null, 'ADMIN_PLAN_CREATED', 'Admin', `Created plan '${name}' (${id})`);
        res.status(201).json({ success: true, plan });
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
        const existing = await prisma.plan.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Plan not found.' });

        const data = {};
        if (name !== undefined) data.name = name.trim();
        if (price !== undefined) data.price = parseFloat(price);
        if (billingCycle !== undefined) data.billingCycle = billingCycle;
        if (allowedTabs !== undefined) data.allowedTabs = allowedTabs;
        if (features !== undefined) data.features = features;
        if (requiresApproval !== undefined) data.requiresApproval = !!requiresApproval;
        if (allowMultiBusiness !== undefined) data.allowMultiBusiness = !!allowMultiBusiness;
        data.updatedAt = new Date();

        const plan = await prisma.plan.update({
            where: { id },
            data
        });

        await logActivity(null, 'ADMIN_PLAN_UPDATED', 'Admin', `Updated plan '${name || id}'`);
        res.json({ success: true, plan });
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
        const existing = await prisma.plan.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Plan not found.' });

        await prisma.plan.delete({ where: { id } });

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
        const planDetails = await prisma.plan.findUnique({ where: { id: plan } });
        if (!planDetails) {
            return res.status(400).json({ error: 'Invalid plan selected.' });
        }

        // Clean up any rejected shops with the same email and businessName to allow re-registration
        await prisma.shop.deleteMany({
            where: {
                email: { equals: email.toLowerCase().trim(), mode: 'insensitive' },
                businessName: businessName.trim(),
                status: 'rejected'
            }
        });

        const existing = await prisma.shop.findFirst({
            where: {
                email: { equals: email.toLowerCase().trim(), mode: 'insensitive' },
                businessName: businessName.trim()
            },
            select: { id: true }
        });
        if (existing) {
            return res.status(409).json({ error: 'A workspace with this business name and email already exists. Please log in instead.' });
        }

        let passwordHash = '';
        if (!password) {
            const existingOwner = await prisma.shop.findFirst({
                where: {
                    email: { equals: email.toLowerCase().trim(), mode: 'insensitive' },
                    passwordHash: { not: null }
                },
                select: { passwordHash: true }
            });
            if (!existingOwner) {
                return res.status(400).json({ error: 'Password is required to register a new account.' });
            }
            passwordHash = existingOwner.passwordHash;
        } else {
            if (password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
            }
            passwordHash = await bcrypt.hash(password, 12);
        }
        
        // Check for existing shop (parent-child logic)
        const existingShops = await prisma.shop.findMany({
            where: {
                email: { equals: email.toLowerCase().trim(), mode: 'insensitive' },
                status: { not: 'rejected' }
            },
            orderBy: { createdAt: 'asc' },
            take: 1
        });

        let finalPlan = plan;
        let status = !planDetails.requiresApproval ? 'active' : 'pending';
        let isActive = !planDetails.requiresApproval;
        let expiryDate = calculateExpiryDate(planDetails.billingCycle);

        if (existingShops.length > 0) {
            const parent = existingShops[0];
            finalPlan = parent.plan;
            status = parent.status;
            isActive = parent.isActive;
            expiryDate = parent.subscriptionExpiresAt;
        }

        const directApprove = status === 'active';

        // Fetch planDetails for finalPlan (for emails and logs)
        const finalPlanRes = await prisma.plan.findUnique({ where: { id: finalPlan } });
        const finalPlanDetails = finalPlanRes || planDetails;

        const shop = await prisma.shop.create({
            data: {
                businessName: businessName.trim(),
                ownerName: ownerName.trim(),
                email: email.toLowerCase().trim(),
                phone: phone || null,
                passwordHash,
                plan: finalPlan,
                status,
                isActive,
                subscriptionExpiresAt: expiryDate
            }
        });

        const safeShop = toSafeShop(shop);

        // Fetch admin support contact details dynamically
        const { supportPhone, supportEmail, frontendUrl, adminUrl } = await getSupportContacts();

        // Send Email Notification
        const registerSubject = directApprove ? 'Welcome to GallaMitra! Workspace Ready' : 'GallaMitra Workspace Registration Under Review';
        const registerBody = directApprove
            ? `Hello ${ownerName},\nThank you for registering. Your workspace "${businessName}" under the "${finalPlanDetails.name}" plan has been automatically approved and is ready!\nYou can access your panel immediately: ${frontendUrl}/login\n\nBest regards,\nGallaMitra Team`
            : `Hello ${ownerName},\nYour workspace registration for "${businessName}" under the "${finalPlanDetails.name}" plan has been submitted and is currently under review.\nWe will notify you as soon as the administrator approves your request.\n\nBest regards,\nGallaMitra Team`;

        const userHtml = generateHtmlEmail({
            title: directApprove ? 'Welcome to GallaMitra! 🎉' : 'Registration Under Review 🕐',
            greeting: `Hello ${ownerName},`,
            leadText: directApprove
                ? `Thank you for registering. Your workspace "${businessName}" under the "${finalPlanDetails.name}" plan has been automatically approved and is ready!`
                : `Your workspace registration for "${businessName}" under the "${finalPlanDetails.name}" plan has been submitted and is currently under review. We will notify you as soon as the administrator approves your request.`,
            details: [
                { label: 'Business Name', value: businessName },
                { label: 'Selected Plan', value: finalPlanDetails.name },
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
        const adminBody = `Hello Admin,\n\nA new shop workspace has been registered on GallaMitra.\n\nBusiness Name: ${businessName}\nOwner Name: ${ownerName}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nPlan Selected: ${finalPlanDetails.name}\nStatus: ${status}\n\nPlease review this shop workspace in the admin dashboard.\n\nBest regards,\nGallaMitra System`;

        const adminHtml = generateHtmlEmail({
            title: '🚨 New Shop Registered',
            greeting: 'Hello Admin,',
            leadText: `A new shop workspace has been registered on GallaMitra and is currently ${status.toUpperCase()}.`,
            details: [
                { label: 'Business Name', value: businessName },
                { label: 'Owner Name', value: ownerName },
                { label: 'Email', value: email },
                { label: 'Phone', value: phone || 'N/A' },
                { label: 'Plan Selected', value: finalPlanDetails.name },
                { label: 'Status', value: status.toUpperCase() }
            ],
            actionUrl: `${adminUrl}/?tab=shops`,
            actionText: 'Review Workspace',
            supportPhone,
            supportEmail
        });

        await sendNotificationEmail(supportEmail, adminSubject, adminBody, adminHtml);

        await logActivity(shop.id, 'SHOP_REGISTERED', 'Owner', `${businessName} registered (Plan: ${finalPlanDetails.name})`);

        const response = {
            message: directApprove ? 'Registration successful!' : 'Registration submitted. Your workspace is under review.',
            shop: safeShop,
            pending: !directApprove
        };
        if (directApprove) {
            response.token = signShopToken(safeShop);
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
        const where = { email: { equals: email.toLowerCase().trim(), mode: 'insensitive' } };
        if (businessName) {
            where.businessName = businessName.trim();
        }

        const shops = await prisma.shop.findMany({ where });

        if (shops.length === 0) {
            return res.status(404).json({ error: 'No workspace found with this email address.' });
        }

        // Multiple shops — ask user to pick one
        if (shops.length > 1 && !businessName) {
            return res.status(200).json({
                message: 'Multiple workspaces found',
                shops: shops.map(s => ({
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

        const shop = shops[0];

        // Subscription Expiration Check
        if (shop.subscriptionExpiresAt && new Date() > new Date(shop.subscriptionExpiresAt)) {
            if (shop.plan === 'trial') {
                // Trial expired -> auto downgrade to starter, keep active, do not block login
                await prisma.shop.update({
                    where: { id: shop.id },
                    data: {
                        plan: 'starter',
                        subscriptionExpiresAt: null,
                        trialWarning10Sent: false,
                        trialWarning14Sent: false,
                        updatedAt: new Date()
                    }
                });
                shop.plan = 'starter';
                shop.subscriptionExpiresAt = null;

                // Send downgrade email immediately
                const subject = 'Your GallaMitra Free Trial Has Expired';
                const body = `Hello ${shop.ownerName},\n\nYour 15-day free trial for workspace "${shop.businessName}" has expired.\n\nWe have automatically shifted your workspace to the free Starter plan. Your existing data (ledger entries, invoices, customers, suppliers) is safe and nothing has been deleted. You can upgrade to the Professional plan at any time to regain access to advanced features like reports, analytics, and billing slips.\n\nBest regards,\nGallaMitra Team`;

                const html = generateHtmlEmail({
                    title: 'Trial Expired - Workspace Downgraded ℹ️',
                    greeting: `Hello ${shop.ownerName},`,
                    leadText: `Your 15-day free trial for GallaMitra workspace "${shop.businessName}" has expired. We have automatically transitioned your account to the free Starter plan so you can continue your work without losing any data.`,
                    details: [
                        { label: 'Workspace Name', value: shop.businessName },
                        { label: 'New Plan', value: 'Starter (Free)' },
                        { label: 'Data Status', value: 'All Data Safe' }
                    ],
                    supportPhone: '+91 97732 72749',
                    supportEmail: 'jainishdabgar2901@gmail.com'
                });

                await sendNotificationEmail(shop.email, subject, body, html);
                await logActivity(shop.id, 'SHOP_TRIAL_EXPIRED_DOWNGRADED', 'System', 'Trial expired, downgraded to starter during login');
            } else {
                if (shop.status === 'active') {
                    await prisma.shop.update({
                        where: { id: shop.id },
                        data: {
                            status: 'suspended',
                            isActive: false,
                            updatedAt: new Date()
                        }
                    });
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

        const safeShop = toSafeShop(shop);
        
        // Fetch Allowed Tabs dynamically from Plan table
        const planDetails = await prisma.plan.findUnique({
            where: { id: safeShop.plan },
            select: { allowedTabs: true, allowMultiBusiness: true }
        });

        if (planDetails) {
            safeShop.allowedTabs = planDetails.allowedTabs;
            safeShop.allowMultiBusiness = !!planDetails.allowMultiBusiness;
        } else {
            safeShop.allowedTabs = [
                'dashboard', 'cust_list', 'supp_list', 'product_list', 'sale_ledger',
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
        const shop = await prisma.shop.findFirst({
            where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
            select: { id: true, ownerName: true }
        });
        if (!shop) {
            return res.status(404).json({ error: 'No workspace found with this email address.' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        await prisma.shop.updateMany({
            where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
            data: {
                otpCode: otp,
                otpExpiresAt: expires
            }
        });

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
        const shops = await prisma.shop.findMany({
            where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
            select: { id: true, ownerName: true, otpCode: true, otpExpiresAt: true }
        });
        if (shops.length === 0) return res.status(404).json({ error: 'Shop not found.' });

        const shop = shops[0];
        if (!shop.otpCode || shop.otpCode !== otp || new Date() > new Date(shop.otpExpiresAt)) {
            return res.status(400).json({ error: 'Invalid or expired OTP code.' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await prisma.shop.updateMany({
            where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
            data: {
                passwordHash,
                otpCode: null,
                otpExpiresAt: null,
                updatedAt: new Date()
            }
        });

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
        const existing = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!existing) {
            return res.status(404).json({ error: 'Shop not found' });
        }

        const data = {};
        if (logoUrl !== undefined && logoUrl !== 'UNTOUCHED') data.logoUrl = logoUrl;
        if (signatureUrl !== undefined && signatureUrl !== 'UNTOUCHED') data.signatureUrl = signatureUrl;
        if (language !== undefined && language !== null) data.language = language;
        if (address !== undefined && address !== null) data.address = address;
        if (businessPhone !== undefined && businessPhone !== null) data.businessPhone = businessPhone;
        if (businessEmail !== undefined && businessEmail !== null) data.businessEmail = businessEmail;
        if (gstin !== undefined && gstin !== null) data.gstin = gstin;
        if (state !== undefined && state !== null) data.state = state;
        if (vpa !== undefined && vpa !== null) data.vpa = vpa;
        if (ownerName !== undefined && ownerName !== null) data.ownerName = ownerName;
        if (businessName !== undefined && businessName !== null) data.businessName = businessName;
        data.updatedAt = new Date();

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data
        });

        const shop = toSafeShop(updatedShop);
        
        const planRes = await prisma.plan.findUnique({
            where: { id: shop.plan },
            select: { allowedTabs: true }
        });
        shop.allowedTabs = planRes ? planRes.allowedTabs : [];

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
        const shops = await prisma.shop.findMany({
            orderBy: { createdAt: 'desc' }
        });
        const mappedShops = shops.map(s => ({
            id: s.id,
            businessname: s.businessName,
            ownername: s.ownerName,
            email: s.email,
            phone: s.phone,
            isactive: s.isActive,
            language: s.language,
            plan: s.plan,
            status: s.status,
            approvedat: s.approvedAt,
            approvedby: s.approvedBy,
            rejectionreason: s.rejectionReason,
            subscriptionexpiresat: s.subscriptionExpiresAt,
            createdat: s.createdAt,
            updatedat: s.updatedAt,
            requestedplan: s.requestedPlan,
            planrequeststatus: s.planRequestStatus
        }));
        res.json({ success: true, shops: mappedShops });
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
        const existing = await prisma.shop.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Shop not found' });

        const status = isActive ? 'active' : 'suspended';
        const data = {
            isActive,
            status,
            updatedAt: new Date()
        };
        if (isActive === true) {
            data.trialWarning10Sent = false;
            data.trialWarning14Sent = false;
            data.paidWarning5Sent = false;
            data.paidWarning1Sent = false;
        }

        const shop = await prisma.shop.update({
            where: { id },
            data
        });

        const mappedShop = {
            id: shop.id,
            ownername: shop.ownerName,
            businessname: shop.businessName,
            email: shop.email,
            isactive: shop.isActive,
            status: shop.status
        };

        const { supportPhone, supportEmail, frontendUrl } = await getSupportContacts();

        // Send Email Notice
        const subject = `GallaMitra Account Status Update: ${isActive ? 'Activated' : 'Suspended'}`;
        const body = `Hello ${shop.ownerName},\nYour GallaMitra workspace "${shop.businessName}" has been ${isActive ? 'reactivated' : 'suspended'} by the platform administrator.`;
        
        const toggleHtml = generateHtmlEmail({
            title: `Account Status Update: ${isActive ? 'Activated 🎉' : 'Suspended ⚠️'}`,
            greeting: `Hello ${shop.ownerName},`,
            leadText: isActive 
                ? `Your GallaMitra workspace "${shop.businessName}" has been reactivated by the platform administrator. You can now log back in.`
                : `Your GallaMitra workspace "${shop.businessName}" has been temporarily suspended by the platform administrator. Access has been blocked.`,
            details: [
                { label: 'Workspace Name', value: shop.businessName },
                { label: 'Account Status', value: isActive ? 'Active' : 'Suspended' }
            ],
            actionUrl: isActive ? `${frontendUrl}/login` : undefined,
            actionText: isActive ? 'Login to Workspace' : undefined,
            supportPhone,
            supportEmail
        });

        await sendNotificationEmail(shop.email, subject, body, toggleHtml);
        await logActivity(id, isActive ? 'SHOP_ACTIVATED' : 'SHOP_SUSPENDED', 'Admin', `Status updated by Admin`);
        await logActivity(null, isActive ? 'ADMIN_SHOP_ACTIVATED' : 'ADMIN_SHOP_SUSPENDED', 'Admin', `Updated shop '${shop.businessName}' to ${status}`);

        res.json({ success: true, shop: mappedShop });
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
        const shop = await prisma.shop.findUnique({ where: { id } });
        if (!shop) return res.status(404).json({ error: 'Shop not found' });

        const targetPlan = plan || shop.plan;
        const planDetails = await prisma.plan.findUnique({ where: { id: targetPlan } });
        const planDetailsObj = planDetails || { billingCycle: 'free', name: 'Starter' };

        const expiryDate = calculateExpiryDate(planDetailsObj.billingCycle);

        const updatedShop = await prisma.shop.update({
            where: { id },
            data: {
                status: 'active',
                isActive: true,
                plan: targetPlan,
                approvedAt: new Date(),
                approvedBy: 'super_admin',
                rejectionReason: null,
                subscriptionExpiresAt: expiryDate,
                trialWarning10Sent: false,
                trialWarning14Sent: false,
                paidWarning5Sent: false,
                paidWarning1Sent: false,
                updatedAt: new Date()
            }
        });

        const { supportPhone, supportEmail, frontendUrl } = await getSupportContacts();

        // Send approval email
        const subject = 'GallaMitra Account Status Update: APPROVED! 🎉';
        const body = `Hello ${shop.ownerName},\nYour GallaMitra workspace "${shop.businessName}" has been approved by the administrator!\nYou can now log in and manage your ledger under the "${planDetailsObj.name}" plan.\n${expiryDate ? `Your current billing period is active until: ${new Date(expiryDate).toLocaleDateString()}` : 'Your plan is free forever.'}\n\nLog in here: ${frontendUrl}/login\n\nBest regards,\nGallaMitra Team`;

        const approvalHtml = generateHtmlEmail({
            title: 'Account Status Update: APPROVED! 🎉',
            greeting: `Hello ${shop.ownerName},`,
            leadText: `Your GallaMitra workspace "${shop.businessName}" has been approved by the administrator! You can now log in and manage your ledger.`,
            details: [
                { label: 'Workspace Name', value: shop.businessName },
                { label: 'Active Plan', value: planDetailsObj.name },
                { label: 'Billing Period', value: expiryDate ? `Active until ${new Date(expiryDate).toLocaleDateString('en-IN')}` : 'Free Forever' }
            ],
            actionUrl: `${frontendUrl}/login`,
            actionText: 'Login to Workspace',
            supportPhone,
            supportEmail
        });

        await sendNotificationEmail(shop.email, subject, body, approvalHtml);
        await logActivity(id, 'SHOP_APPROVED', 'Admin', `Approved under plan ${planDetailsObj.name}`);
        await logActivity(null, 'ADMIN_SHOP_APPROVED', 'Admin', `Approved shop '${shop.businessName}' under plan ${planDetailsObj.name}`);

        res.json({ success: true, message: 'Shop approved successfully', shop: toSafeShop(updatedShop) });
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
        const shop = await prisma.shop.findUnique({ where: { id } });
        if (!shop) return res.status(404).json({ error: 'Shop not found' });

        const updatedShop = await prisma.shop.update({
            where: { id },
            data: {
                status: 'rejected',
                isActive: false,
                rejectionReason: reason || 'Registration rejected by admin.',
                updatedAt: new Date()
            }
        });

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

        res.json({
            success: true,
            message: 'Shop rejected',
            shop: {
                id: updatedShop.id,
                status: updatedShop.status,
                rejectionReason: updatedShop.rejectionReason
            }
        });
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
        const planDetails = await prisma.plan.findUnique({ where: { id: plan } });
        if (!planDetails) return res.status(400).json({ error: 'Invalid plan.' });

        const shop = await prisma.shop.findUnique({ where: { id } });
        if (!shop) return res.status(404).json({ error: 'Shop not found' });

        const expiryDate = calculateExpiryDate(planDetails.billingCycle);

        const updatedShop = await prisma.shop.update({
            where: { id },
            data: {
                plan,
                subscriptionExpiresAt: expiryDate,
                trialWarning10Sent: false,
                trialWarning14Sent: false,
                paidWarning5Sent: false,
                paidWarning1Sent: false,
                updatedAt: new Date()
            }
        });

        const safeShop = toSafeShop(updatedShop);
        safeShop.allowedTabs = planDetails.allowedTabs;

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

        res.json({ success: true, message: `Plan updated to ${planDetails.name}`, shop: safeShop });
    } catch (error) {
        console.error('🚨 Error changing plan:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── ADMIN: PLATFORM STATS ────────────────────────────────────────────────────
export const getAdminStats = async (req, res) => {
    try {
        const [total, active, pending, rejected, customers, suppliers, invoices, ledger, purchases] = await Promise.all([
            prisma.shop.count(),
            prisma.shop.count({ where: { status: 'active' } }),
            prisma.shop.count({ where: { status: 'pending' } }),
            prisma.shop.count({ where: { status: 'rejected' } }),
            prisma.customer.count({ where: { isDeleted: false } }),
            prisma.supplier.count({ where: { isDeleted: false } }),
            prisma.invoice.count(),
            prisma.ledgerEntry.count(),
            prisma.purchaseBill.count()
        ]);

        res.json({
            success: true,
            stats: {
                totalShops:        total,
                activeShops:       active,
                pendingShops:      pending,
                rejectedShops:     rejected,
                totalCustomers:    customers,
                totalSuppliers:    suppliers,
                totalInvoices:     invoices,
                totalLedger:       ledger,
                totalPurchaseBills:purchases,
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
        const [custCount, suppCount, invAgg, recAgg, pbAgg, ledCount] = await Promise.all([
            prisma.customer.count({ where: { shopId: id, isDeleted: false } }),
            prisma.supplier.count({ where: { shopId: id, isDeleted: false } }),
            prisma.invoice.aggregate({
                where: { shopId: id },
                _count: true,
                _sum: { grandTotal: true }
            }),
            prisma.paymentReceipt.aggregate({
                where: { shopId: id },
                _count: true,
                _sum: { amount: true }
            }),
            prisma.purchaseBill.aggregate({
                where: { shopId: id },
                _count: true,
                _sum: { totalAmount: true }
            }),
            prisma.ledgerEntry.count({ where: { shopId: id } })
        ]);

        res.json({
            customersCount:     custCount,
            suppliersCount:     suppCount,
            invoicesCount:      invAgg._count || 0,
            invoicesTotal:      parseFloat(invAgg._sum.grandTotal || 0),
            receiptsCount:      recAgg._count || 0,
            receiptsTotal:      parseFloat(recAgg._sum.amount || 0),
            purchaseBillsCount: pbAgg._count || 0,
            purchaseBillsTotal: parseFloat(pbAgg._sum.totalAmount || 0),
            ledgerEntriesCount: ledCount
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
        const activities = await prisma.activityLog.findMany({
            where: { shopId: { not: null } },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { shop: { select: { businessName: true } } }
        });
        const mappedActivities = activities.map(a => ({
            id: a.id,
            shopId: a.shopId,
            type: a.type,
            actor: a.actor,
            target: a.target,
            createdAt: a.createdAt,
            businessname: a.shop?.businessName || null
        }));
        res.json({ success: true, activities: mappedActivities });
    } catch (error) {
        console.error('🚨 Error fetching admin activities:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// GET /api/shops/admin/audit-logs (System events)
export const getAdminAuditLogs = async (req, res) => {
    try {
        const logs = await prisma.activityLog.findMany({
            where: { shopId: null },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json({ success: true, logs });
    } catch (error) {
        console.error('🚨 Error fetching admin audit logs:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// GET /api/shops/admin/db-health
export const getAdminDbHealth = async (req, res) => {
    try {
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const dbLatency = Date.now() - start;

        const sizeRes = await prisma.$queryRaw`
            SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `;
        const dbSize = sizeRes[0]?.size || 'N/A';

        const tables = ["Shop", "Customer", "Supplier", "LedgerEntry", "Invoice", "PurchaseBill", "PaymentReceipt", "Plan", "ActivityLog"];
        const tablesDetails = [];

        for (const t of tables) {
            const rowCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*) FROM "${t}"`);
            const tableSize = await prisma.$queryRawUnsafe(`SELECT pg_size_pretty(pg_total_relation_size('"${t}"')) as size`);
            tablesDetails.push({
                name: t,
                rows: Number(rowCount[0]?.count || 0),
                size: tableSize[0]?.size || 'N/A'
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
        const emails = await prisma.emailQueue.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        const list = emails.map(row => ({
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
        const activeShops = await prisma.shop.findMany({
            where: { isActive: true, status: 'active' },
            select: { email: true, ownerName: true }
        });

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
        const admin = await prisma.adminUser.findUnique({
            where: { username: username.trim().toLowerCase() }
        });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid admin credentials.' });
        }
        
        const isMatch = await bcrypt.compare(password, admin.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid admin credentials.' });
        }
        
        const crypto = await import('crypto');
        const token = 'Admin-Token-' + crypto.randomBytes(24).toString('hex');
        
        await prisma.adminUser.update({
            where: { id: admin.id },
            data: { token }
        });
        
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
        const shop = await prisma.shop.findUnique({ where: { id } });
        if (!shop) return res.status(404).json({ error: 'Shop not found' });

        const passwordHash = await bcrypt.hash(password, 12);
        await prisma.shop.update({
            where: { id },
            data: {
                passwordHash,
                updatedAt: new Date()
            }
        });
        
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
        const requestedPlanDetails = await prisma.plan.findUnique({ where: { id: planId } });
        if (!requestedPlanDetails) return res.status(400).json({ error: 'Invalid plan selected.' });

        // Fetch full shop details for email notification
        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop) return res.status(404).json({ error: 'Shop workspace not found.' });

        // Fetch current plan name
        const currentPlanRes = await prisma.plan.findUnique({
            where: { id: shop.plan },
            select: { name: true }
        });
        const currentPlanName = currentPlanRes?.name || shop.plan;

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: {
                requestedPlan: planId,
                planRequestStatus: 'pending',
                updatedAt: new Date()
            }
        });

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
        
        const mappedShop = {
            id: updatedShop.id,
            plan: updatedShop.plan,
            requestedPlan: updatedShop.requestedPlan,
            planRequestStatus: updatedShop.planRequestStatus
        };
        res.json({ success: true, message: 'Plan upgrade request submitted for review.', shop: mappedShop });
    } catch (error) {
        console.error('🚨 Error requesting plan change:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── ADMIN: APPROVE PLAN CHANGE ────────────────────────────────────────────────
export const approvePlanChange = async (req, res) => {
    const { id } = req.params;
    try {
        const shop = await prisma.shop.findUnique({ where: { id } });
        if (!shop) return res.status(404).json({ error: 'Shop not found' });
        
        if (shop.planRequestStatus !== 'pending' || !shop.requestedPlan) {
            return res.status(400).json({ error: 'No pending plan change request found for this shop.' });
        }
        
        const planDetails = await prisma.plan.findUnique({ where: { id: shop.requestedPlan } });
        if (!planDetails) return res.status(400).json({ error: 'Invalid target plan.' });
        
        const expiryDate = calculateExpiryDate(planDetails.billingCycle);
        
        const updatedShop = await prisma.shop.update({
            where: { id },
            data: {
                plan: shop.requestedPlan,
                subscriptionExpiresAt: expiryDate,
                requestedPlan: null,
                planRequestStatus: 'none',
                status: 'active',
                isActive: true,
                trialWarning10Sent: false,
                trialWarning14Sent: false,
                paidWarning5Sent: false,
                paidWarning1Sent: false,
                updatedAt: new Date()
            }
        });
        
        const safeShop = toSafeShop(updatedShop);
        safeShop.allowedTabs = planDetails.allowedTabs;
        
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

        res.json({ success: true, message: `Plan request approved. New plan: ${planDetails.name}`, shop: safeShop });
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
        const shop = await prisma.shop.findUnique({ where: { id } });
        if (!shop) return res.status(404).json({ error: 'Shop not found' });
        
        if (shop.planRequestStatus !== 'pending' || !shop.requestedPlan) {
            return res.status(400).json({ error: 'No pending plan change request found.' });
        }
        
        const planRes = await prisma.plan.findUnique({
            where: { id: shop.requestedPlan },
            select: { name: true }
        });
        const planName = planRes?.name || shop.requestedPlan;
        
        await prisma.shop.update({
            where: { id },
            data: {
                requestedPlan: null,
                planRequestStatus: 'rejected',
                updatedAt: new Date()
            }
        });
        
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
        const shop = await prisma.shop.findUnique({ where: { id } });
        if (!shop) return res.status(404).json({ error: 'Shop not found' });

        const mappedShop = {
            id: shop.id,
            businessName: shop.businessName,
            ownerName: shop.ownerName,
            email: shop.email,
            phone: shop.phone,
            logoUrl: shop.logoUrl,
            signatureUrl: shop.signatureUrl,
            address: shop.address,
            businessPhone: shop.businessPhone,
            businessEmail: shop.businessEmail,
            gstin: shop.gstin,
            state: shop.state,
            vpa: shop.vpa,
            isActive: shop.isActive,
            language: shop.language,
            plan: shop.plan,
            status: shop.status,
            approvedAt: shop.approvedAt,
            subscriptionExpiresAt: shop.subscriptionExpiresAt,
            requestedPlan: shop.requestedPlan,
            planRequestStatus: shop.planRequestStatus,
            bankDetails: shop.bankDetails,
            invoiceTerms: shop.invoiceTerms
        };

        const planRes = await prisma.plan.findUnique({
            where: { id: shop.plan },
            select: { allowedTabs: true, allowMultiBusiness: true }
        });
        mappedShop.allowedTabs = planRes ? planRes.allowedTabs : [];
        mappedShop.allowMultiBusiness = planRes ? !!planRes.allowMultiBusiness : false;

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
        const activeShops = await prisma.shop.findMany({
            where: {
                email: { equals: email.toLowerCase().trim(), mode: 'insensitive' },
                status: 'active',
                isActive: true
            },
            orderBy: { businessName: 'asc' }
        });

        const planIds = [...new Set(activeShops.map(s => s.plan).filter(Boolean))];
        const plans = await prisma.plan.findMany({
            where: { id: { in: planIds } },
            select: { id: true, allowMultiBusiness: true }
        });
        const planMap = new Map(plans.map(p => [p.id, p.allowMultiBusiness]));
        
        const shops = activeShops.map(s => ({
            id: s.id,
            businessName: s.businessName,
            ownerName: s.ownerName,
            email: s.email,
            phone: s.phone,
            plan: s.plan,
            status: s.status,
            isActive: s.isActive,
            subscriptionExpiresAt: s.subscriptionExpiresAt,
            allowMultiBusiness: !!planMap.get(s.plan)
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
        const shop = await prisma.shop.findUnique({ where: { id } });
        if (!shop) return res.status(404).json({ error: 'Shop not found' });

        const mappedShop = {
            id: shop.id,
            businessName: shop.businessName,
            ownerName: shop.ownerName,
            email: shop.email,
            phone: shop.phone,
            logoUrl: shop.logoUrl,
            signatureUrl: shop.signatureUrl,
            address: shop.address,
            businessPhone: shop.businessPhone,
            businessEmail: shop.businessEmail,
            gstin: shop.gstin,
            state: shop.state,
            vpa: shop.vpa,
            isActive: shop.isActive,
            language: shop.language,
            plan: shop.plan,
            status: shop.status,
            approvedAt: shop.approvedAt,
            subscriptionExpiresAt: shop.subscriptionExpiresAt,
            requestedPlan: shop.requestedPlan,
            planRequestStatus: shop.planRequestStatus,
            bankDetails: shop.bankDetails,
            invoiceTerms: shop.invoiceTerms
        };

        const planRes = await prisma.plan.findUnique({
            where: { id: shop.plan },
            select: { allowedTabs: true, allowMultiBusiness: true }
        });
        mappedShop.allowedTabs = planRes ? planRes.allowedTabs : [];
        mappedShop.allowMultiBusiness = planRes ? !!planRes.allowMultiBusiness : false;

        const adminRes = await prisma.adminUser.findFirst({
            select: { supportPhone: true, supportEmail: true }
        });
        const supportPhone = adminRes?.supportPhone || '+91 97732 72749';
        const supportEmail = adminRes?.supportEmail || 'jainishdabgar2901@gmail.com';

        const response = {
            success: true,
            status: shop.status,
            shop: mappedShop,
            supportPhone,
            supportEmail
        };
        if (shop.status === 'active' && shop.isActive) {
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
        const adminRes = await prisma.adminUser.findUnique({
            where: { id: req.admin.id },
            select: { supportPhone: true, supportEmail: true }
        });
        let supportPhone = '+91 97732 72749';
        let supportEmail = 'jainishdabgar2901@gmail.com';
        if (adminRes) {
            supportPhone = adminRes.supportPhone || supportPhone;
            supportEmail = adminRes.supportEmail || supportEmail;
        } else {
            const fallbackRes = await prisma.adminUser.findFirst({
                select: { supportPhone: true, supportEmail: true }
            });
            if (fallbackRes) {
                supportPhone = fallbackRes.supportPhone || supportPhone;
                supportEmail = fallbackRes.supportEmail || supportEmail;
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
        await prisma.adminUser.update({
            where: { id: req.admin.id },
            data: {
                supportPhone: supportPhone.trim(),
                supportEmail: supportEmail.trim().toLowerCase()
            }
        });
        res.json({ success: true, message: 'Platform support settings updated successfully.' });
    } catch (error) {
        console.error('🚨 Error updating admin settings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── PUBLIC: GET PLATFORM SETTINGS ─────────────────────────────────────────────
export const getPublicConfig = async (req, res) => {
    try {
        const result = await prisma.adminUser.findFirst({
            select: { supportPhone: true, supportEmail: true }
        });
        let supportPhone = '+91 97732 72749';
        let supportEmail = 'jainishdabgar2901@gmail.com';
        if (result) {
            supportPhone = result.supportPhone || supportPhone;
            supportEmail = result.supportEmail || supportEmail;
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
    try {
        const deletedShop = await prisma.$transaction(async (tx) => {
            await tx.activityLog.deleteMany({ where: { shopId: id } });
            
            const shop = await tx.shop.findUnique({ where: { id } });
            if (!shop) return null;

            await tx.shop.delete({ where: { id } });
            return shop;
        });

        if (!deletedShop) {
            return res.status(404).json({ error: 'Shop workspace not found.' });
        }

        await logActivity(null, 'SHOP_DELETED', 'Owner', `Workspace "${deletedShop.businessName}" (${deletedShop.email}) deleted successfully`);

        res.json({ success: true, message: `Workspace "${deletedShop.businessName}" deleted successfully.` });
    } catch (error) {
        console.error('🚨 Error deleting shop workspace:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── PUBLIC: GET SYSTEM STATUS STATISTICS ──────────────────────────────────────
export const getPublicStats = async (req, res) => {
    try {
        const [activeShopsCount, ledgerCount, invoiceCount, purchaseCount, receiptCount] = await Promise.all([
            prisma.shop.count({ where: { status: 'active' } }),
            prisma.ledgerEntry.count(),
            prisma.invoice.count(),
            prisma.purchaseBill.count(),
            prisma.paymentReceipt.count()
        ]);

        const totalTxCount = ledgerCount + invoiceCount + purchaseCount + receiptCount;

        res.json({
            success: true,
            totalFirms: activeShopsCount,
            totalTransactions: totalTxCount,
            uptime: '99.9%'
        });
    } catch (error) {
        console.error('🚨 Error fetching public stats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// ─── PERIODIC SUBSCRIPTION CHECKS & WARNING EMAILS WORKER ───────────────────────────────────────
export const processSubscriptionChecks = async () => {
    try {
        const now = new Date();

        // 1. Check for warning emails (10th day: 5 days remaining; 14th day: 1 day remaining)
        const shops = await prisma.shop.findMany({
            where: {
                plan: 'trial',
                status: 'active',
                isActive: true,
                subscriptionExpiresAt: { not: null }
            },
            select: {
                id: true,
                ownerName: true,
                businessName: true,
                email: true,
                subscriptionExpiresAt: true,
                trialWarning10Sent: true,
                trialWarning14Sent: true
            }
        });

        const { supportPhone, supportEmail } = await getSupportContacts();

        for (const shop of shops) {
            const expiryDate = new Date(shop.subscriptionExpiresAt);
            const msDiff = expiryDate.getTime() - now.getTime();
            const daysLeft = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

            if (daysLeft === 5 && !shop.trialWarning10Sent) {
                // Send 10th-day warning email (5 days left)
                const subject = 'Your GallaMitra Free Trial Expires in 5 Days';
                const body = `Hello ${shop.ownerName},\n\nYour 15-day free trial for workspace "${shop.businessName}" will expire in 5 days (on ${expiryDate.toLocaleDateString('en-IN')}).\n\nPlease upgrade to the Professional plan to keep access to all professional features. If you do not upgrade, you will be automatically moved to the free Starter plan when the trial ends, with no data lost.\n\nBest regards,\nGallaMitra Team`;
                
                const html = generateHtmlEmail({
                    title: 'Trial Expiring in 5 Days ⏳',
                    greeting: `Hello ${shop.ownerName},`,
                    leadText: `Your 15-day free trial for GallaMitra workspace "${shop.businessName}" will expire in 5 days.`,
                    details: [
                        { label: 'Workspace Name', value: shop.businessName },
                        { label: 'Expiry Date', value: expiryDate.toLocaleDateString('en-IN') },
                        { label: 'Status', value: '5 Days Remaining' }
                    ],
                    supportPhone,
                    supportEmail
                });

                await sendNotificationEmail(shop.email, subject, body, html);
                await prisma.shop.update({
                    where: { id: shop.id },
                    data: { trialWarning10Sent: true }
                });
                console.log(`[Subscription Worker] Sent 10th-day trial warning to ${shop.email}`);
            } else if (daysLeft === 1 && !shop.trialWarning14Sent) {
                // Send 14th-day warning email (1 day left)
                const subject = 'Your GallaMitra Free Trial Expires Tomorrow!';
                const body = `Hello ${shop.ownerName},\n\nYour 15-day free trial for workspace "${shop.businessName}" will expire tomorrow (on ${expiryDate.toLocaleDateString('en-IN')}).\n\nPlease upgrade to the Professional plan to keep access to all professional features. If you do not upgrade, you will be automatically moved to the free Starter plan tomorrow, with no data lost.\n\nBest regards,\nGallaMitra Team`;
                
                const html = generateHtmlEmail({
                    title: 'Trial Expiring Tomorrow ⏳',
                    greeting: `Hello ${shop.ownerName},`,
                    leadText: `Your 15-day free trial for GallaMitra workspace "${shop.businessName}" will expire tomorrow.`,
                    details: [
                        { label: 'Workspace Name', value: shop.businessName },
                        { label: 'Expiry Date', value: expiryDate.toLocaleDateString('en-IN') },
                        { label: 'Status', value: '1 Day Remaining' }
                    ],
                    supportPhone,
                    supportEmail
                });

                await sendNotificationEmail(shop.email, subject, body, html);
                await prisma.shop.update({
                    where: { id: shop.id },
                    data: { trialWarning14Sent: true }
                });
                console.log(`[Subscription Worker] Sent 14th-day trial warning to ${shop.email}`);
            }
        }

        // 1B. Check for warning emails for paid plans (5 days remaining; 1 day remaining)
        const paidShops = await prisma.shop.findMany({
            where: {
                plan: { notIn: ['starter', 'trial'] },
                status: 'active',
                isActive: true,
                subscriptionExpiresAt: { not: null }
            },
            select: {
                id: true,
                ownerName: true,
                businessName: true,
                email: true,
                subscriptionExpiresAt: true,
                paidWarning5Sent: true,
                paidWarning1Sent: true,
                plan: true
            }
        });

        for (const shop of paidShops) {
            const expiryDate = new Date(shop.subscriptionExpiresAt);
            const msDiff = expiryDate.getTime() - now.getTime();
            const daysLeft = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

            if (daysLeft === 5 && !shop.paidWarning5Sent) {
                // Send 5-days remaining warning email
                const subject = `Your GallaMitra Subscription for "${shop.businessName}" Expires in 5 Days`;
                const body = `Hello ${shop.ownerName},\n\nYour subscription for workspace "${shop.businessName}" will expire in 5 days (on ${expiryDate.toLocaleDateString('en-IN')}).\n\nPlease renew your subscription to maintain continuous access to your business ledger, invoices, and analytics.\n\nBest regards,\nGallaMitra Team`;
                
                const html = generateHtmlEmail({
                    title: 'Subscription Expiring in 5 Days ⏳',
                    greeting: `Hello ${shop.ownerName},`,
                    leadText: `Your subscription for GallaMitra workspace "${shop.businessName}" will expire in 5 days.`,
                    details: [
                        { label: 'Workspace Name', value: shop.businessName },
                        { label: 'Expiry Date', value: expiryDate.toLocaleDateString('en-IN') },
                        { label: 'Status', value: '5 Days Remaining' }
                    ],
                    supportPhone,
                    supportEmail
                });

                await sendNotificationEmail(shop.email, subject, body, html);
                await prisma.shop.update({
                    where: { id: shop.id },
                    data: { paidWarning5Sent: true }
                });
                console.log(`[Subscription Worker] Sent 5-day paid warning to ${shop.email}`);
            } else if (daysLeft === 1 && !shop.paidWarning1Sent) {
                // Send 1-day remaining warning email
                const subject = `Urgent: Your GallaMitra Subscription for "${shop.businessName}" Expires Tomorrow!`;
                const body = `Hello ${shop.ownerName},\n\nYour subscription for workspace "${shop.businessName}" will expire tomorrow (on ${expiryDate.toLocaleDateString('en-IN')}).\n\nPlease renew your subscription today to avoid account suspension and keep managing your billing ledgers without interruption.\n\nBest regards,\nGallaMitra Team`;
                
                const html = generateHtmlEmail({
                    title: 'Subscription Expiring Tomorrow ⏳',
                    greeting: `Hello ${shop.ownerName},`,
                    leadText: `Your subscription for GallaMitra workspace "${shop.businessName}" will expire tomorrow. Renew today to prevent service interruption.`,
                    details: [
                        { label: 'Workspace Name', value: shop.businessName },
                        { label: 'Expiry Date', value: expiryDate.toLocaleDateString('en-IN') },
                        { label: 'Status', value: '1 Day Remaining' }
                    ],
                    supportPhone,
                    supportEmail
                });

                await sendNotificationEmail(shop.email, subject, body, html);
                await prisma.shop.update({
                    where: { id: shop.id },
                    data: { paidWarning1Sent: true }
                });
                console.log(`[Subscription Worker] Sent 1-day paid warning to ${shop.email}`);
            }
        }

        // 2. Check for expired trial plans -> downgrade to 'starter'
        const expiredTrials = await prisma.shop.findMany({
            where: {
                plan: 'trial',
                subscriptionExpiresAt: { lt: now }
            },
            select: {
                id: true,
                ownerName: true,
                businessName: true,
                email: true,
                subscriptionExpiresAt: true
            }
        });

        for (const shop of expiredTrials) {
            // Downgrade to 'starter' plan (free plan) and clear subscriptionExpiresAt
            await prisma.shop.update({
                where: { id: shop.id },
                data: {
                    plan: 'starter',
                    subscriptionExpiresAt: null,
                    trialWarning10Sent: false,
                    trialWarning14Sent: false,
                    paidWarning5Sent: false,
                    paidWarning1Sent: false,
                    updatedAt: new Date()
                }
            });

            // Send Expired / Downgrade Email
            const subject = 'Your GallaMitra Free Trial Has Expired';
            const body = `Hello ${shop.ownerName},\n\nYour 15-day free trial for workspace "${shop.businessName}" has expired.\n\nWe have automatically shifted your workspace to the free Starter plan. Your existing data (ledger entries, invoices, customers, suppliers) is safe and nothing has been deleted. You can upgrade to the Professional plan at any time to regain access to advanced features like reports, analytics, and billing slips.\n\nBest regards,\nGallaMitra Team`;

            const html = generateHtmlEmail({
                title: 'Trial Expired - Workspace Downgraded ℹ️',
                greeting: `Hello ${shop.ownerName},`,
                leadText: `Your 15-day free trial for GallaMitra workspace "${shop.businessName}" has expired. We have automatically transitioned your account to the free Starter plan so you can continue your work without losing any data.`,
                details: [
                    { label: 'Workspace Name', value: shop.businessName },
                    { label: 'New Plan', value: 'Starter (Free)' },
                    { label: 'Data Status', value: 'All Data Safe' }
                ],
                supportPhone,
                supportEmail
            });

            await sendNotificationEmail(shop.email, subject, body, html);
            await logActivity(shop.id, 'SHOP_TRIAL_EXPIRED_DOWNGRADED', 'System', 'Trial expired, downgraded to starter');
            console.log(`[Subscription Worker] Downgraded trial shop ${shop.email} to starter`);
        }

        // 3. Check for expired paid plans (growth, professional, etc.) -> suspend them
        const expiredPaidShops = await prisma.shop.findMany({
            where: {
                plan: { notIn: ['starter', 'trial'] },
                status: 'active',
                subscriptionExpiresAt: { lt: now }
            },
            select: {
                id: true,
                ownerName: true,
                businessName: true,
                email: true,
                subscriptionExpiresAt: true
            }
        });

        for (const shop of expiredPaidShops) {
            await prisma.shop.update({
                where: { id: shop.id },
                data: {
                    status: 'suspended',
                    isActive: false,
                    trialWarning10Sent: false,
                    trialWarning14Sent: false,
                    paidWarning5Sent: false,
                    paidWarning1Sent: false,
                    updatedAt: new Date()
                }
            });
            
            // Send Paid Expiration Email
            const subject = 'GallaMitra Account Status Update: Subscription Expired';
            const body = `Hello ${shop.ownerName},\n\nYour subscription for GallaMitra workspace "${shop.businessName}" has expired on ${new Date(shop.subscriptionExpiresAt).toLocaleDateString('en-IN')}.\n\nConsequently, your account has been temporarily suspended. Please contact the platform administrator to renew your billing package.`;

            const html = generateHtmlEmail({
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

            await sendNotificationEmail(shop.email, subject, body, html);
            await logActivity(shop.id, 'SHOP_SUSPENDED_BY_EXPIRATION', 'System', 'Subscription expired');
            console.log(`[Subscription Worker] Suspended paid shop ${shop.email} due to subscription expiration`);
        }

    } catch (error) {
        console.error('Error in processSubscriptionChecks worker:', error);
    }
};

// GET /api/shops/workspace-data/:shopId
export const getWorkspaceData = async (req, res) => {
    const { shopId } = req.params;

    try {
        const [customers, suppliers, ledgers, invoices, purchaseBills, receipts, products] = await Promise.all([
            // Customers
            prisma.$queryRaw`
                SELECT c.*, 
                  COALESCE((SELECT SUM(CASE WHEN l.type = 'DEBIT' THEN l.amount ELSE -l.amount END) FROM "LedgerEntry" l WHERE l."customerId" = c.id), 0.00) AS balance
                FROM "Customer" c
                WHERE c."shopId" = ${shopId}::uuid
                ORDER BY c."createdAt" DESC
            `,
            // Suppliers
            prisma.$queryRaw`
                SELECT s.*, 
                  COALESCE((SELECT SUM(CASE WHEN l.type = 'CREDIT' THEN l.amount ELSE -l.amount END) FROM "LedgerEntry" l WHERE l."supplierId" = s.id), 0.00) AS balance
                FROM "Supplier" s
                WHERE s."shopId" = ${shopId}::uuid
                ORDER BY s."createdAt" DESC
            `,
            // Ledger entries
            prisma.ledgerEntry.findMany({
                where: { shopId },
                orderBy: [
                    { date: 'desc' },
                    { id: 'desc' }
                ]
            }),
            // Invoices
            prisma.invoice.findMany({
                where: { shopId },
                orderBy: { createdAt: 'desc' }
            }),
            // Purchase bills
            prisma.purchaseBill.findMany({
                where: { shopId },
                orderBy: { createdAt: 'desc' }
            }),
            // Receipts
            prisma.paymentReceipt.findMany({
                where: { shopId },
                orderBy: { createdAt: 'desc' }
            }),
            // Products
            prisma.product.findMany({
                where: { shopId },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        res.json({
            customers,
            suppliers,
            ledgers,
            invoices,
            purchaseBills,
            receipts,
            products
        });
    } catch (error) {
        console.error('🚨 Error fetching consolidated workspace data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// POST /api/shops/logout
export const logoutShop = async (req, res) => {
    try {
        if (req.shop) {
            await logActivity(req.shop.id, 'SHOP_LOGOUT', 'Owner', `Logged out of workspace: ${req.shop.businessName}`);
        }
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('🚨 Error in logoutShop:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};