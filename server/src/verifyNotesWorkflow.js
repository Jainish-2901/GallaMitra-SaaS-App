import { prisma } from './utils/prisma.js';
import { createCreditNote, deleteCreditNote, updateCreditNote, createDebitNote, deleteDebitNote, updateDebitNote } from './controllers/noteController.js';
import { getCustomerPublicProfile, getSupplierPublicProfile } from './controllers/partyController.js';
import { signPortalToken } from './utils/tokens.js';
import { initDatabase } from './initDb.js';

const runTests = async () => {
    console.log('🧪 Starting GallaMitra Credit/Debit Note Integration Workflow Verification tests...');
    
    // Ensure DB tables exist
    await initDatabase();
    
    let testShop = null;
    let testCustomer = null;
    let testSupplier = null;
    let testProduct = null;
    
    try {
        // ─── 1. SETUP TEST ENTITIES ──────────────────────────────────────────
        console.log('📦 Setting up test entities...');
        testShop = await prisma.shop.create({
            data: {
                businessName: 'Test Automation Shop',
                ownerName: 'Test Runner',
                email: `test_shop_${Date.now()}@example.com`,
                plan: 'growth',
                status: 'active'
            }
        });
        
        testCustomer = await prisma.customer.create({
            data: {
                shopId: testShop.id,
                name: 'Test Customer',
                phone: '9999999999',
                openingBalance: 0.00
            }
        });

        testSupplier = await prisma.supplier.create({
            data: {
                shopId: testShop.id,
                name: 'Test Supplier',
                phone: '8888888888',
                openingBalance: 0.00
            }
        });

        testProduct = await prisma.product.create({
            data: {
                shopId: testShop.id,
                name: 'Test Product',
                price: 100.00,
                currentStock: 10.00,
                averageCostPrice: 80.00
            }
        });
        
        console.log(`✅ Test Shop created: ${testShop.id}`);
        console.log(`✅ Test Customer created: ${testCustomer.id}`);
        console.log(`✅ Test Supplier created: ${testSupplier.id}`);
        console.log(`✅ Test Product created: ${testProduct.id} (Initial Stock: 10)`);

        // Helper to construct mock Express response
        const mockResponse = () => {
            const res = {
                statusCode: 200,
                body: null,
                status: (code) => {
                    res.statusCode = code;
                    return res;
                },
                json: (data) => {
                    res.body = data;
                    return res;
                }
            };
            return res;
        };

        // Helper to verify stock levels
        const verifyStock = async (expected) => {
            const prod = await prisma.product.findUnique({ where: { id: testProduct.id } });
            const current = parseFloat(prod.currentStock);
            if (current !== expected) {
                throw new Error(`Stock mismatch: expected ${expected}, got ${current}`);
            }
            console.log(`   └─ Stock verified: ${current} (Expected: ${expected})`);
        };

        // ─── 2. CREATE CREDIT NOTE (Sales Return) ──────────────────────────
        console.log('📝 Creating Credit Note (Sales Return of 2 items)...');
        const cnReq = {
            body: {
                noteNo: `CN-${Math.floor(10000 + Math.random() * 90000)}`,
                shopId: testShop.id,
                customerId: testCustomer.id,
                type: 'RETURN',
                productId: testProduct.id,
                productName: testProduct.name,
                qty: 2.00,
                price: 100.00,
                amount: 200.00,
                remark: 'Test Customer Return'
            }
        };
        const cnRes = mockResponse();
        await createCreditNote(cnReq, cnRes);

        if (cnRes.statusCode !== 201 || !cnRes.body.success) {
            throw new Error(`Failed to create Credit Note: ${JSON.stringify(cnRes.body)}`);
        }
        const createdCN = cnRes.body.note;
        console.log(`✅ Credit Note created successfully: ${createdCN.noteNo}`);

        // Verify stock incremented (10 + 2 = 12)
        await verifyStock(12.00);

        // Verify Customer Ledger Entry (type CREDIT)
        const cnLedger = await prisma.ledgerEntry.findFirst({
            where: { referenceId: createdCN.id }
        });
        if (!cnLedger || cnLedger.type !== 'CREDIT' || parseFloat(cnLedger.amount) !== 200.00) {
            throw new Error(`Ledger entry missing or invalid: ${JSON.stringify(cnLedger)}`);
        }
        console.log('   └─ Customer ledger entry verified (CREDIT, ₹200)');

        // ─── 3. CREATE DEBIT NOTE (Purchase Return) ──────────────────────────
        console.log('📝 Creating Debit Note (Purchase Return of 3 items)...');
        const dnReq = {
            body: {
                noteNo: `DN-${Math.floor(10000 + Math.random() * 90000)}`,
                shopId: testShop.id,
                supplierId: testSupplier.id,
                type: 'RETURN',
                productId: testProduct.id,
                productName: testProduct.name,
                qty: 3.00,
                price: 80.00,
                amount: 240.00,
                remark: 'Test Supplier Return'
            }
        };
        const dnRes = mockResponse();
        await createDebitNote(dnReq, dnRes);

        if (dnRes.statusCode !== 201 || !dnRes.body.success) {
            throw new Error(`Failed to create Debit Note: ${JSON.stringify(dnRes.body)}`);
        }
        const createdDN = dnRes.body.note;
        console.log(`✅ Debit Note created successfully: ${createdDN.noteNo}`);

        // Verify stock decremented (12 - 3 = 9)
        await verifyStock(9.00);

        // Verify Supplier Ledger Entry (type DEBIT)
        const dnLedger = await prisma.ledgerEntry.findFirst({
            where: { referenceId: createdDN.id }
        });
        if (!dnLedger || dnLedger.type !== 'DEBIT' || parseFloat(dnLedger.amount) !== 240.00) {
            throw new Error(`Ledger entry missing or invalid: ${JSON.stringify(dnLedger)}`);
        }
        console.log('   └─ Supplier ledger entry verified (DEBIT, ₹240)');

        // ─── 3.5. UPDATE CREDIT & DEBIT NOTES (Verify Stock & Ledger adjustment) ───
        console.log('📝 Updating Credit Note (Sales Return from 2 to 4 items)...');
        const updateCnReq = {
            params: { id: createdCN.id },
            body: {
                noteNo: createdCN.noteNo,
                customerId: testCustomer.id,
                type: 'RETURN',
                productId: testProduct.id,
                productName: testProduct.name,
                qty: 4.00,
                price: 100.00,
                amount: 400.00,
                remark: 'Updated Test Customer Return'
            }
        };
        const updateCnRes = mockResponse();
        await updateCreditNote(updateCnReq, updateCnRes);
        if (updateCnRes.statusCode !== 200 || !updateCnRes.body.success) {
            throw new Error(`Failed to update Credit Note: ${JSON.stringify(updateCnRes.body)}`);
        }
        // Stock: starts at 9. Reverting old CN (-2) => 7. Applying new CN (+4) => 11.
        await verifyStock(11.00);

        // Verify updated ledger entry amount (₹400)
        const cnLedgerUpdated = await prisma.ledgerEntry.findFirst({
            where: { referenceId: createdCN.id }
        });
        if (!cnLedgerUpdated || parseFloat(cnLedgerUpdated.amount) !== 400.00) {
            throw new Error(`Updated Ledger entry amount invalid: ${JSON.stringify(cnLedgerUpdated)}`);
        }
        console.log('   └─ Customer updated ledger entry verified (CREDIT, ₹400)');

        console.log('📝 Updating Debit Note (Purchase Return from 3 to 1 items)...');
        const updateDnReq = {
            params: { id: createdDN.id },
            body: {
                noteNo: createdDN.noteNo,
                supplierId: testSupplier.id,
                type: 'RETURN',
                productId: testProduct.id,
                productName: testProduct.name,
                qty: 1.00,
                price: 80.00,
                amount: 80.00,
                remark: 'Updated Test Supplier Return'
            }
        };
        const updateDnRes = mockResponse();
        await updateDebitNote(updateDnReq, updateDnRes);
        if (updateDnRes.statusCode !== 200 || !updateDnRes.body.success) {
            throw new Error(`Failed to update Debit Note: ${JSON.stringify(updateDnRes.body)}`);
        }
        // Stock: starts at 11. Reverting old DN (+3) => 14. Applying new DN (-1) => 13.
        await verifyStock(13.00);

        // Verify updated ledger entry amount (₹80)
        const dnLedgerUpdated = await prisma.ledgerEntry.findFirst({
            where: { referenceId: createdDN.id }
        });
        if (!dnLedgerUpdated || parseFloat(dnLedgerUpdated.amount) !== 80.00) {
            throw new Error(`Updated Ledger entry amount invalid: ${JSON.stringify(dnLedgerUpdated)}`);
        }
        console.log('   └─ Supplier updated ledger entry verified (DEBIT, ₹80)');

        // ─── 4. VERIFY PUBLIC PORTAL PROFILE ENDPOINTS ───────────────────────
        console.log('🌐 Simulating Public Customer Portal loading...');
        const customerToken = signPortalToken(testCustomer.id, 'customer', testShop.id);
        const pubCustReq = {
            params: { id: testCustomer.id },
            query: { token: customerToken }
        };
        const pubCustRes = mockResponse();
        await getCustomerPublicProfile(pubCustReq, pubCustRes);

        if (pubCustRes.statusCode !== 200 || !pubCustRes.body.creditNotes) {
            throw new Error(`Failed to fetch public customer portal data: ${JSON.stringify(pubCustRes.body)}`);
        }
        const publicCN = pubCustRes.body.creditNotes.find(n => n.id === createdCN.id);
        if (!publicCN || publicCN.noteNo !== createdCN.noteNo || parseFloat(publicCN.amount) !== 400.00) {
            throw new Error('Credit Note not exposed or not updated in Public Customer Portal payload');
        }
        console.log('   └─ Verified Credit Note exists and is updated in Public Portal customer payload!');

        console.log('🌐 Simulating Public Supplier Portal loading...');
        const supplierToken = signPortalToken(testSupplier.id, 'supplier', testShop.id);
        const pubSuppReq = {
            params: { id: testSupplier.id },
            query: { token: supplierToken }
        };
        const pubSuppRes = mockResponse();
        await getSupplierPublicProfile(pubSuppReq, pubSuppRes);

        if (pubSuppRes.statusCode !== 200 || !pubSuppRes.body.debitNotes) {
            throw new Error(`Failed to fetch public supplier portal data: ${JSON.stringify(pubSuppRes.body)}`);
        }
        const publicDN = pubSuppRes.body.debitNotes.find(n => n.id === createdDN.id);
        if (!publicDN || publicDN.noteNo !== createdDN.noteNo || parseFloat(publicDN.amount) !== 80.00) {
            throw new Error('Debit Note not exposed or not updated in Public Supplier Portal payload');
        }
        console.log('   └─ Verified Debit Note exists and is updated in Public Portal supplier payload!');

        // ─── 5. ROLLBACK / DELETIONS ─────────────────────────────────────────
        console.log('🗑️ Rolling back Debit Note (Verify stock restoration)...');
        const delDnReq = { params: { id: createdDN.id } };
        const delDnRes = mockResponse();
        await deleteDebitNote(delDnReq, delDnRes);

        if (delDnRes.statusCode !== 200 || !delDnRes.body.success) {
            throw new Error(`Failed to delete Debit Note: ${JSON.stringify(delDnRes.body)}`);
        }
        // Stock should revert (13 + 1 = 14)
        await verifyStock(14.00);

        console.log('🗑️ Rolling back Credit Note (Verify stock restoration)...');
        const delCnReq = { params: { id: createdCN.id } };
        const delCnRes = mockResponse();
        await deleteCreditNote(delCnReq, delCnRes);

        if (delCnRes.statusCode !== 200 || !delCnRes.body.success) {
            throw new Error(`Failed to delete Credit Note: ${JSON.stringify(delCnRes.body)}`);
        }
        // Stock should revert (14 - 4 = 10)
        await verifyStock(10.00);

        console.log('🎉 Integration Workflow Verification succeeded completely!');
    } catch (err) {
        console.error('❌ Integration Workflow Verification failed:');
        console.error(err);
        process.exitCode = 1;
    } finally {
        // ─── 6. TEARDOWN ─────────────────────────────────────────────────────
        console.log('🧹 Cleaning up test database records...');
        try {
            if (testProduct) await prisma.product.deleteMany({ where: { shopId: testShop.id } });
            if (testCustomer) await prisma.customer.deleteMany({ where: { shopId: testShop.id } });
            if (testSupplier) await prisma.supplier.deleteMany({ where: { shopId: testShop.id } });
            if (testShop) await prisma.shop.delete({ where: { id: testShop.id } });
            console.log('✨ Cleanup complete. Database is in initial state.');
        } catch (e) {
            console.error('🚨 Teardown cleanup failed:', e);
        }
    }
};

runTests();
