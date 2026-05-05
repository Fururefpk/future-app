require('dotenv').config();
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const biometricRoutes = require('./routes/biometric');
const propertyRoutes = require('./routes/properties');
const userRoutes = require('./routes/users');
const tenancyRoutes = require('./routes/tenancies');
const rentRoutes = require('./routes/rent');
const maintenanceRoutes = require('./routes/maintenance');
const inquiryRoutes = require('./routes/inquiries');
const adminRoutes = require('./routes/admin');

// Initialize Express app
const app = express();

// Middleware - Security
app.use(helmet());
app.use(compression());

// Middleware - CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware - Body Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/biometric', biometricRoutes);
app.use('/api/v1/properties', propertyRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/tenancies', tenancyRoutes);
app.use('/api/v1/rent', rentRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/inquiries', inquiryRoutes);
app.use('/api/v1/admin', adminRoutes);

// Static files: root index.html is the marketing SPA; /public serves only assets (no auto-index)
const path = require('path');
app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use(express.static(__dirname, { index: false, extensions: ['html'] }));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    success: false,
    message: message,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Database Connection (cached for serverless re-use on Vercel)
let dbPromise = null;
function connectDB() {
  if (dbPromise) return dbPromise;
  if (!process.env.MONGODB_URI) {
    console.warn('⚠ MONGODB_URI not set — skipping DB connection');
    return Promise.resolve();
  }
  dbPromise = mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✓ MongoDB connected successfully'))
    .catch(err => {
      console.error('✗ MongoDB connection error:', err.message);
      dbPromise = null;
      throw err;
    });
  return dbPromise;
}
app.use(async (req, res, next) => {
  try { await connectDB(); next(); } catch (e) { next(); }
});

// Server Setup — only start a listener when NOT running on Vercel serverless
const PORT = process.env.PORT || 5000;
let server;

if (process.env.VERCEL || process.env.SERVERLESS) {
  // Exported app is invoked as a serverless function
  console.log('✓ Running in serverless mode — app exported, no listener bound');
} else if (process.env.USE_HTTPS === 'true') {
  // HTTPS Server
  try {
    const privateKey = fs.readFileSync(process.env.SSL_KEY_PATH, 'utf8');
    const certificate = fs.readFileSync(process.env.SSL_CERT_PATH, 'utf8');
    const credentials = { key: privateKey, cert: certificate };
    
    server = https.createServer(credentials, app);
    
    server.listen(PORT, process.env.HOST || '0.0.0.0', () => {
      console.log(`\n✓ HTTPS Server running on https://${process.env.HOST || 'localhost'}:${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ API Base URL: ${process.env.API_BASE_URL}`);
    });
  } catch (err) {
    console.error('✗ SSL certificate error:', err.message);
    console.log('Falling back to HTTP server...');
    
    server = http.createServer(app);
    server.listen(PORT, process.env.HOST || '0.0.0.0', () => {
      console.log(`\n⚠ HTTP Server running on http://${process.env.HOST || 'localhost'}:${PORT}`);
      console.log('WARNING: Running on HTTP instead of HTTPS. Not recommended for production.');
    });
  }
} else {
  // HTTP Server (development only)
  server = http.createServer(app);
  
  server.listen(PORT, process.env.HOST || '0.0.0.0', () => {
    console.log(`\n⚠ HTTP Server running on http://${process.env.HOST || 'localhost'}:${PORT}`);
    console.log('WARNING: Running on HTTP. Use HTTPS in production.');
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  if (server) server.close(() => console.log('Server closed'));
  try { await mongoose.connection.close(); console.log('MongoDB connection closed'); } catch (_) {}
  process.exit(0);
});

module.exports = app;
