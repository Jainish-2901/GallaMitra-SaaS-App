import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import http from 'http'; // Node internal HTTP module for self-ping loops
import https from 'https'; // Node internal HTTPS module for deployed environments
import dns from 'dns';

// Force Node to prefer IPv4 DNS resolution over IPv6 globally
dns.setDefaultResultOrder('ipv4first');
import { initDatabase } from './initDb.js';
import { prisma } from './utils/prisma.js';
import shopRoutes from './routes/shopRoutes.js';
import partyRoutes from './routes/partyRoutes.js';
import ledgerRoutes from './routes/ledgerRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import transactionalRoutes from './routes/transactionalRoutes.js';
import productRoutes from './routes/productRoutes.js';
import { processSubscriptionChecks } from './controllers/shopController.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
    `${process.env.FRONTEND_URL || 'http://localhost:5173'},${process.env.ADMIN_URL || 'http://localhost:5001'}`)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '2mb' }));

// Global Rate Limiter to prevent brute force and DOS request spam
const globalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 300, // Limit each IP to 300 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP. Please try again in a minute.' }
});

app.use('/api', globalLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please try again later.' }
});

app.use('/api/shops/login', authLimiter);
app.use('/api/shops/register', authLimiter);
app.use('/api/shops/forgot-password', authLimiter);
app.use('/api/shops/reset-password', authLimiter);
app.use('/api/shops/admin/login', authLimiter);

app.use('/api/shops', shopRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/ledgers', ledgerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/transactions', transactionalRoutes);
app.use('/api/products', productRoutes);

app.get('/s/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const link = await prisma.sharedLinks.findUnique({
            where: { id }
        });
        if (link) {
            res.redirect(link.fullUrl);
        } else {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            res.redirect(`${frontendUrl}/not-found?reason=invalid-link`);
        }
    } catch (err) {
        console.error('Error in short link redirect:', err);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/not-found?reason=invalid-link`);
    }
});

app.post('/api/share/create', async (req, res) => {
    const { id, fullUrl } = req.body;
    if (!id || !fullUrl) {
        return res.status(400).json({ error: 'ID and fullUrl are required' });
    }
    try {
        const existing = await prisma.sharedLinks.findFirst({
            where: { fullUrl }
        });
        if (existing) {
            return res.json({ success: true, id: existing.id });
        }
        await prisma.sharedLinks.upsert({
            where: { id },
            update: { fullUrl },
            create: { id, fullUrl }
        });
        res.json({ success: true, id });
    } catch (err) {
        console.error('Error saving short link:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/', (req, res) => {
    res.json({ message: 'GallaMitra API is running', timestamp: new Date() });
});

// =========================================================================
// 🚀 0 BUFFERING DELAY SELF-PING ENGINE (Render Free Tier Keep-Alive)
// =========================================================================
const keepServerAlive = () => {
    // We target Render environment configuration. If process env has backend url, use it.
    const serverUrl = process.env.BACKEND_URL;
    if (!serverUrl) {
        console.log('ℹ️ Local development detected. Self-ping loop suspended.');
        return;
    }

    console.log(`📡 Initializing GallaMitra Auto-Wakeup Loop target: ${serverUrl}`);

    // Fires request every 10 minutes (10 * 60 * 1000 ms)
    setInterval(() => {
        const client = serverUrl.startsWith('https') ? https : http;

        client.get(serverUrl, (res) => {
            console.log(`⚡ Self-Ping successful! Status Code: ${res.statusCode} — Keeping Server awake.`);
        }).on('error', (err) => {
            console.error('⚠️ Keep-alive ping dispatch failed:', err.message);
        });
    }, 10 * 60 * 1000);
};

const startServer = async () => {
    await initDatabase();

    const server = app.listen(PORT, () => {
        console.log(`GallaMitra Backend running on port ${PORT}`);

        // Trigger self-ping worker loop once server cluster successfully attaches
        keepServerAlive();

        // Run initial subscription checks on startup, then every 12 hours
        console.log('⏰ Starting periodic subscription warning/expiry check worker...');
        processSubscriptionChecks().catch((err) => {
            console.error('Error running initial subscription checks:', err);
        });
        setInterval(() => {
            console.log('⏰ Running scheduled subscription warning/expiry check worker...');
            processSubscriptionChecks().catch((err) => {
                console.error('Error running scheduled subscription checks:', err);
            });
        }, 12 * 60 * 60 * 1000); // 12 hours
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use.`);
            process.exit(1);
        } else {
            console.error('Server error:', err);
            process.exit(1);
        }
    });

    const shutdown = () => {
        server.close(() => {
            console.log('Server shut down cleanly.');
            process.exit(0);
        });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
};

startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});