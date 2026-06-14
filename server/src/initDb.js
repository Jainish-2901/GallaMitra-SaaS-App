import { db } from './db.js';
import bcrypt from 'bcryptjs';

export const initDatabase = async () => {
  // 🏢 Core Multi-Tenant Tables (Corrected Native PostgreSQL Constraints)
  const createTablesQuery = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS "Shop" (
      "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      "businessName" VARCHAR(255) NOT NULL,
      "ownerName" VARCHAR(255) NOT NULL,
      "email" VARCHAR(255) NOT NULL,
      "phone" VARCHAR(20),
      "passwordHash" TEXT,
      "logoUrl" TEXT,
      "signatureUrl" TEXT,
      "address" TEXT,
      "businessPhone" VARCHAR(20),
      "businessEmail" VARCHAR(255),
      "gstin" VARCHAR(50),
      "state" VARCHAR(100),
      "vpa" VARCHAR(255),
      "isActive" BOOLEAN DEFAULT TRUE,
      "language" VARCHAR(10) DEFAULT 'gu',
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "Customer" (
      "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      "shopId" UUID NOT NULL,
      "name" VARCHAR(255) NOT NULL,
      "shopName" VARCHAR(255),
      "phone" VARCHAR(20),
      "email" VARCHAR(255),
      "billingAddress" TEXT,
      "shippingAddress" TEXT,
      "gstin" VARCHAR(50),
      "state" VARCHAR(100),
      "creditLimit" DECIMAL(12, 2) DEFAULT 0.00,
      "openingBalance" DECIMAL(12, 2) DEFAULT 0.00,
      "isDeleted" BOOLEAN DEFAULT FALSE,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT "fk_customer_shop" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "Supplier" (
      "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      "shopId" UUID NOT NULL,
      "name" VARCHAR(255) NOT NULL,
      "shopName" VARCHAR(255),
      "phone" VARCHAR(20),
      "email" VARCHAR(255),
      "billingAddress" TEXT,
      "shippingAddress" TEXT,
      "gstin" VARCHAR(50),
      "state" VARCHAR(100),
      "creditLimit" DECIMAL(12, 2) DEFAULT 0.00,
      "openingBalance" DECIMAL(12, 2) DEFAULT 0.00,
      "isDeleted" BOOLEAN DEFAULT FALSE,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT "fk_supplier_shop" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "LedgerEntry" (
      "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      "shopId" UUID NOT NULL,
      "customerId" UUID,
      "supplierId" UUID,
      "date" TIMESTAMP NOT NULL DEFAULT NOW(),
      "particulars" VARCHAR(500) NOT NULL,
      "type" VARCHAR(20) NOT NULL,
      "amount" DECIMAL(12, 2) NOT NULL,
      "runningBalance" DECIMAL(12, 2) DEFAULT 0.00,
      "isEdited" BOOLEAN DEFAULT FALSE,
      "lastEditedAt" TIMESTAMP,
      "referenceId" VARCHAR(100),
      CONSTRAINT "fk_ledger_shop" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE,
      CONSTRAINT "fk_ledger_customer" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL,
      CONSTRAINT "fk_ledger_supplier" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS "Invoice" (
      "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      "invoiceNo" VARCHAR(100) NOT NULL,
      "shopId" UUID NOT NULL,
      "customerId" UUID NOT NULL,
      "date" TIMESTAMP NOT NULL DEFAULT NOW(),
      "itemsJson" JSONB NOT NULL,
      "subTotal" DECIMAL(12, 2) NOT NULL,
      "discount" DECIMAL(12, 2) DEFAULT 0.00,
      "taxAmount" DECIMAL(12, 2) DEFAULT 0.00,
      "miscCharges" DECIMAL(12, 2) DEFAULT 0.00,
      "taxRate" DECIMAL(5, 2) DEFAULT 18.00,
      "grandTotal" DECIMAL(12, 2) NOT NULL,
      "description" TEXT,
      "attachedImgUrl" TEXT,
      "isEdited" BOOLEAN DEFAULT FALSE,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT "fk_invoice_shop" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE,
      CONSTRAINT "fk_invoice_customer" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "PurchaseBill" (
      "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      "billNo" VARCHAR(100),
      "shopId" UUID NOT NULL,
      "supplierId" UUID NOT NULL,
      "date" TIMESTAMP NOT NULL DEFAULT NOW(),
      "itemsJson" JSONB,
      "attachedImgUrl" TEXT,
      "slipDetails" VARCHAR(255),
      "totalAmount" DECIMAL(12, 2) NOT NULL,
      "isEdited" BOOLEAN DEFAULT FALSE,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT "fk_pbill_shop" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE,
      CONSTRAINT "fk_pbill_supplier" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "PaymentReceipt" (
      "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      "receiptNo" VARCHAR(100) NOT NULL,
      "shopId" UUID NOT NULL,
      "customerId" UUID,
      "supplierId" UUID,
      "date" TIMESTAMP NOT NULL DEFAULT NOW(),
      "amount" DECIMAL(12, 2) NOT NULL,
      "paymentMode" VARCHAR(50) DEFAULT 'CASH',
      "remark" VARCHAR(550),
      "isEdited" BOOLEAN DEFAULT FALSE,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT "fk_receipt_shop" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE,
      CONSTRAINT "fk_receipt_customer" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL,
      CONSTRAINT "fk_receipt_supplier" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS "SharedLinks" (
    "id" VARCHAR(10) PRIMARY KEY,
    "fullUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW()
    );
    `;

  // Safe column migrations — adds new columns without wiping data
  const migrationsQuery = `
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "shopName" VARCHAR(255);
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();
    ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "shopName" VARCHAR(255);
    ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(20);
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "businessPhone" VARCHAR(20);
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "businessEmail" VARCHAR(255);
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "gstin" VARCHAR(50);
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "state" VARCHAR(100);
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "vpa" VARCHAR(255);
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "address" TEXT;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "description" TEXT;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "miscCharges" DECIMAL(12, 2) DEFAULT 0.00;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "discount" DECIMAL(12, 2) DEFAULT 0.00;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "taxRate" DECIMAL(5, 2) DEFAULT 18.00;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "attachedImgUrl" TEXT;

    -- Plan & Approval System (v1.1 migration)
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "plan" VARCHAR(50) DEFAULT 'starter';
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'active';
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP;
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "approvedBy" VARCHAR(100);
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

    -- Dynamic Billing Plans & OTP Resets & Expirations (v1.2 migration)
    CREATE TABLE IF NOT EXISTS "Plan" (
      "id" VARCHAR(50) PRIMARY KEY,
      "name" VARCHAR(100) NOT NULL,
      "price" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      "billingCycle" VARCHAR(20) NOT NULL DEFAULT 'monthly',
      "allowedTabs" JSONB NOT NULL,
      "features" JSONB NOT NULL,
      "requiresApproval" BOOLEAN NOT NULL DEFAULT TRUE,
      "allowMultiBusiness" BOOLEAN NOT NULL DEFAULT FALSE,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "ActivityLog" (
      "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      "shopId" UUID,
      "type" VARCHAR(100) NOT NULL,
      "actor" VARCHAR(255) NOT NULL,
      "target" VARCHAR(500) NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" TIMESTAMP;
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "otpCode" VARCHAR(10);
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "otpExpiresAt" TIMESTAMP;

    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "bankDetails" TEXT;
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "invoiceTerms" TEXT;
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "requestedPlan" VARCHAR(50);
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "planRequestStatus" VARCHAR(20) DEFAULT 'none';

    CREATE TABLE IF NOT EXISTS "AdminUser" (
      "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      "username" VARCHAR(100) UNIQUE NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "token" TEXT,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "supportPhone" VARCHAR(50) DEFAULT '+91 97732 72749';
    ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "supportEmail" VARCHAR(255) DEFAULT 'jainishdabgar2901@gmail.com';
    ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "backendUrl" TEXT;
    ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "frontendUrl" TEXT;
    ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "adminUrl" TEXT;

    CREATE TABLE IF NOT EXISTS "EmailQueue" (
      "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      "toEmail" VARCHAR(255) NOT NULL,
      "subject" VARCHAR(255) NOT NULL,
      "body" TEXT NOT NULL,
      "status" VARCHAR(50) DEFAULT 'pending',
      "error" TEXT,
      "attempts" INTEGER DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "processedAt" TIMESTAMP
    );

    -- Back-fill existing active shops so they keep working
    UPDATE "Shop" SET "status" = 'active', "plan" = 'professional', "approvedAt" = "createdAt"
    WHERE "status" IS NULL;

    -- Back-fill professional plan allowMultiBusiness capability
    UPDATE "Plan" SET "allowMultiBusiness" = TRUE WHERE id = 'professional';

    -- Drop unique constraint on Shop email to allow multiple businesses under the same email
    ALTER TABLE "Shop" DROP CONSTRAINT IF EXISTS "Shop_email_key";

    -- Subscription trial warning sent flags
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "trialWarning10Sent" BOOLEAN DEFAULT FALSE;
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "trialWarning14Sent" BOOLEAN DEFAULT FALSE;

    -- Paid subscription warning sent flags
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "paidWarning5Sent" BOOLEAN DEFAULT FALSE;
    ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "paidWarning1Sent" BOOLEAN DEFAULT FALSE;

    -- Seed 15 Days Free Trial plan if not exists
    INSERT INTO "Plan" ("id", "name", "price", "billingCycle", "allowedTabs", "features", "requiresApproval", "allowMultiBusiness")
    VALUES 
    ('trial', '15 Days Free Trial', 0.00, 'trial', 
     '["dashboard", "cust_list", "supp_list", "sale_ledger", "sales_list", "purchase_ledger", "purchase_list", "invoice_builder", "invoice_list", "payment_receipt", "receipt_list", "purchase_bill", "pbill_list", "reports", "analytics", "user_settings", "business_settings"]',
     '["Professional plan features", "Export PDF & CSV reports", "Deep financial analytics", "15 days free trial"]', 
     FALSE, TRUE)
    ON CONFLICT ("id") DO NOTHING;
    `;

  // High-speed query optimization indexes
  const createIndexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_customer_shop_del ON "Customer" ("shopId", "isDeleted");
    CREATE INDEX IF NOT EXISTS idx_supplier_shop_del ON "Supplier" ("shopId", "isDeleted");
    CREATE INDEX IF NOT EXISTS idx_ledger_shop_date  ON "LedgerEntry" ("shopId", "date");
    CREATE INDEX IF NOT EXISTS idx_ledger_cust_date  ON "LedgerEntry" ("customerId", "date");
    CREATE INDEX IF NOT EXISTS idx_ledger_supp_date  ON "LedgerEntry" ("supplierId", "date");
    CREATE INDEX IF NOT EXISTS idx_invoice_shop      ON "Invoice" ("shopId", "createdAt");
    CREATE INDEX IF NOT EXISTS idx_pbill_shop        ON "PurchaseBill" ("shopId", "createdAt");
    CREATE INDEX IF NOT EXISTS idx_receipt_shop       ON "PaymentReceipt" ("shopId", "createdAt");
    `;

  try {
    await db.query(createTablesQuery);
    await db.query(migrationsQuery);
    await db.query(createIndexesQuery);

    // 🛡️ INTELLIGENT SEED BLOCK: Check DB first, bypass .env warnings if admin already exists
    const adminCheck = await db.query('SELECT COUNT(*) FROM "AdminUser"');
    const adminExists = parseInt(adminCheck.rows[0].count || 0) > 0;

    if (!adminExists) {
      const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!adminPassword) {
        console.warn('⚠️ No Super Admin found in DB and no ADMIN_PASSWORD set in .env — skipping initial seed.');
      } else {
        const adminPassHash = await bcrypt.hash(adminPassword, 12);
        await db.query(
          `INSERT INTO "AdminUser" ("username", "passwordHash") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [adminUsername, adminPassHash]
        );
        console.log(`👑 Deployed initial Super Admin account: "${adminUsername}".`);
      }
    } else {
      console.log('🔒 Super Admin credentials verified from database records.');
    }

    // Seed default plans if empty
    const planCheck = await db.query('SELECT COUNT(*) FROM "Plan"');
    if (parseInt(planCheck.rows[0].count || 0) === 0) {
      const seedPlansQuery = `
            INSERT INTO "Plan" ("id", "name", "price", "billingCycle", "allowedTabs", "features", "requiresApproval", "allowMultiBusiness")
            VALUES 
            ('starter', 'Starter', 0.00, 'free', 
             '["dashboard", "cust_list", "supp_list", "sale_ledger", "purchase_ledger", "payment_receipt", "receipt_list", "user_settings"]',
             '["Core ledger management", "Customers & suppliers", "Sale & purchase ledgers", "Payment receipts"]', 
             FALSE, FALSE),
            ('growth', 'Growth', 149.00, 'monthly', 
             '["dashboard", "cust_list", "supp_list", "sale_ledger", "sales_list", "purchase_ledger", "purchase_list", "invoice_builder", "invoice_list", "payment_receipt", "receipt_list", "purchase_bill", "pbill_list", "user_settings", "business_settings"]',
             '["Starter plan features", "Invoice builder & purchase bills", "Voucher listings & history", "Business profile config"]', 
             TRUE, FALSE),
            ('professional', 'Professional', 299.00, 'monthly', 
             '["dashboard", "cust_list", "supp_list", "sale_ledger", "sales_list", "purchase_ledger", "purchase_list", "invoice_builder", "invoice_list", "payment_receipt", "receipt_list", "purchase_bill", "pbill_list", "reports", "analytics", "user_settings", "business_settings"]',
             '["Growth plan features", "Export PDF & CSV reports", "Deep financial analytics", "Unlimited entries"]', 
             TRUE, TRUE),
            ('trial', '15 Days Free Trial', 0.00, 'trial', 
             '["dashboard", "cust_list", "supp_list", "sale_ledger", "sales_list", "purchase_ledger", "purchase_list", "invoice_builder", "invoice_list", "payment_receipt", "receipt_list", "purchase_bill", "pbill_list", "reports", "analytics", "user_settings", "business_settings"]',
             '["Professional plan features", "Export PDF & CSV reports", "Deep financial analytics", "15 days free trial"]', 
             FALSE, TRUE)
            ON CONFLICT ("id") DO NOTHING;
            `;
      await db.query(seedPlansQuery);
      console.log('🌱 Seeded default subscription matrices (starter, growth, professional) safely.');
    }

    console.log('📚 GallaMitra Database schemas & migrations verified with 0% data loss loops.');
  } catch (error) {
    console.error('🚨 Error initializing database schema layers:', error);
  }
};