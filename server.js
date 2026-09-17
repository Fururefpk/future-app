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

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const path           = require('path');
const express        = require('express');
const cors           = require('cors');
const helmet         = require('helmet');
const morgan         = require('morgan');
const compression    = require('compression');
const rateLimit      = require('express-rate-limit');
const mongoSanitize  = require('express-mongo-sanitize');
const cleanXss        = require('xss-clean/lib/xss').clean;

const { validateEnvironment } = require('./config/env');
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
app.disable('x-powered-by');

if (process.env.NODE_ENV !== 'test' && process.env.SERVERLESS !== '1') {
  const missing = validateEnvironment(process.env);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// ── Trust proxy (Vercel / Render sit behind a reverse proxy) ──────
app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────────────────
// The frontend currently uses inline event handlers extensively (onclick, onchange, etc.),
// so the CSP must explicitly allow them while still keeping the rest of the app restricted.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com", 'data:'],
      connectSrc: ["'self'", 'https:', 'wss:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
    },
  },
}));

// ── CORS ──────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [process.env.ALLOWED_ORIGINS, process.env.CORS_ORIGIN]
  .filter(Boolean)
  .join(',')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);

    const isLocalOrigin = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(origin);
    const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);

    if (process.env.NODE_ENV === 'production') {
      if (isAllowedOrigin) return cb(null, true);
      return cb(new Error(`CORS: origin '${origin}' not allowed`));
    }

    if (isAllowedOrigin || isLocalOrigin) {
      return cb(null, true);
    }

    cb(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
};

app.use(cors(corsOptions));

app.options(/.*/, cors(corsOptions)); // preflight for all routes

// ── Body parsers ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static frontend assets ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ── Compression ───────────────────────────────────────────────────
app.use(compression());

// ── Sanitisation (NoSQL injection + XSS) ─────────────────────────
app.use((req, res, next) => {
  ['body', 'params', 'headers', 'query'].forEach((key) => {
    if (req[key]) mongoSanitize.sanitize(req[key]);
  });
  next();
});
app.use((req, res, next) => {
  const sanitize = (value) => {
    if (typeof value === 'string') return cleanXss(value);
    if (Array.isArray(value)) return value.map(sanitize);
    if (value && typeof value === 'object') {
      Object.keys(value).forEach((key) => { value[key] = sanitize(value[key]); });
    }
    return value;
  };

  ['body', 'params', 'query'].forEach((key) => {
    if (req[key]) sanitize(req[key]);
  });
  next();
});

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
  status: 'OK',
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
if (process.env.NODE_ENV !== 'test' && process.env.SERVERLESS !== '1') {
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
} else if (process.env.NODE_ENV !== 'test') {
  // Vercel's adapter awaits connectDB before forwarding each request.
}

module.exports = app;