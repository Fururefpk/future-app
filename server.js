/**
 * server.js
 * Future Property Holdings — Express application entry point.
 *
 * Wires together: database, middleware stack, all route modules,
 * global error handler, and 404 fallback.
 *
 * Usage:
 *   node server.js                    — start locally
 *   SERVERLESS=1 node server.js       — Vercel (skips listen())
 */

'use strict';

require('dotenv').config();

const path           = require('path');
const express        = require('express');
const cors           = require('cors');
const helmet         = require('helmet');
const morgan         = require('morgan');
const compression    = require('compression');
const rateLimit      = require('express-rate-limit');
const mongoSanitize  = require('express-mongo-sanitize');
const xss            = require('xss-clean');

const { connectDB, getDBHealth } = require('./config/database');

// Route modules
const authRoutes        = require('./routes/auth');
const userRoutes        = require('./routes/users');
const propertyRoutes    = require('./routes/properties');
const tenancyRoutes     = require('./routes/tenancies');
const rentRoutes        = require('./routes/rent');
const maintenanceRoutes = require('./routes/maintenance');
const inquiryRoutes     = require('./routes/inquiries');
const biometricRoutes   = require('./routes/biometric');
const adminRoutes       = require('./routes/admin');
const analyticsRoutes   = require('./routes/analytics');
const supportRoutes     = require('./routes/support');

// ── App ────────────────────────────────────────────────────────────
const app = express();

// ── Trust proxy (Vercel / Render sit behind a reverse proxy) ──────
app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS ──────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return cb(null, true);
    if (
      ALLOWED_ORIGINS.includes(origin) ||
      /localhost/.test(origin) ||
      process.env.NODE_ENV === 'development'
    ) {
      return cb(null, true);
    }
    cb(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
}));

app.options('*', cors()); // preflight for all routes

// ── Body parsers ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static frontend assets ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Compression ───────────────────────────────────────────────────
app.use(compression());

// ── Sanitisation (NoSQL injection + XSS) ─────────────────────────
app.use(mongoSanitize());
app.use(xss());

// ── HTTP logging ──────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Global rate limiter (loose — individual routes add tighter ones) ──
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP' },
}));

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  success: true,
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development',
  database: getDBHealth(),
}));

// ── API routes ────────────────────────────────────────────────────
const API = '/api/v1';

app.use(`${API}/auth`,        authRoutes);
app.use(`${API}/users`,       userRoutes);
app.use(`${API}/properties`,  propertyRoutes);
app.use(`${API}/tenancies`,   tenancyRoutes);
app.use(`${API}/rent`,        rentRoutes);
app.use(`${API}/maintenance`, maintenanceRoutes);
app.use(`${API}/inquiries`,   inquiryRoutes);
app.use(`${API}/biometric`,   biometricRoutes);
app.use(`${API}/admin`,       adminRoutes);
app.use(`${API}/analytics`,   analyticsRoutes);
app.use(`${API}/support`,     supportRoutes);

// ── 404 handler ───────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({
  success: false,
  message: `Route ${req.method} ${req.originalUrl} not found`,
}));

// ── Global error handler ──────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(422).json({ success: false, message: messages.join(', ') });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ success: false, message: `${field} already exists` });
  }

  // Multer / file upload error
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: err.message });
  }

  // JWT / CORS errors surfaced as Error objects
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ── Database + server bootstrap ───────────────────────────────────
if (process.env.SERVERLESS !== '1') {
  const PORT = process.env.PORT || 5000;
  connectDB()
    .then(() => {
      app.listen(PORT, () =>
        console.log(`🚀 FPH API running on http://localhost:${PORT}${API}`),
      );
    })
    .catch((err) => {
      console.error('Failed to start server:', err.message);
      process.exit(1);
    });
} else {
  // Serverless: connect lazily on first request
  connectDB().catch(console.error);
}

module.exports = app;