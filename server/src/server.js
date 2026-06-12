import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import http from 'http'; // Node internal HTTP module for self-ping loops
import https from 'https'; // Node internal HTTPS module for deployed environments
import { initDatabase } from './initDb.js';
import { db } from './db.js';
import shopRoutes from './routes/shopRoutes.js';
import partyRoutes from './routes/partyRoutes.js';
import ledgerRoutes from './routes/ledgerRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import transactionalRoutes from './routes/transactionalRoutes.js';

const app = express();
app.disable('x-powered-by');
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

app.get('/s/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT "fullUrl" FROM "SharedLinks" WHERE id = $1', [id]);
        if (result.rows.length > 0) {
            res.redirect(result.rows[0].fullUrl);
        } else {
            res.status(404).send('Invalid Link');
        }
    } catch (err) {
        console.error('Error in short link redirect:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/api/share/create', async (req, res) => {
    const { id, fullUrl } = req.body;
    if (!id || !fullUrl) {
        return res.status(400).json({ error: 'ID and fullUrl are required' });
    }
    try {
        await db.query(
            'INSERT INTO "SharedLinks" (id, "fullUrl") VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET "fullUrl" = $2',
            [id, fullUrl]
        );
        res.json({ success: true });
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