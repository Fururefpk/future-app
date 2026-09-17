/**
 * config/database.js
 * MongoDB connection with retry logic, health checks, and graceful shutdown.
 */

'use strict';

const dns = require('dns');
const mongoose = require('mongoose');

// Fix MongoDB Atlas SRV resolution on local Node.js
dns.setServers(['8.8.8.8', '1.1.1.1']);



// ── Connection state ──────────────────────────────────────────────
let isConnected = false;
let hasConnectedOnce = false;
let connectionPromise = null;
let retryCount = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

// ── Options ───────────────────────────────────────────────────────
const MONGO_OPTIONS = {
  dbName: process.env.DB_NAME || 'future_properties',
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  w: 'majority',
};

// ── Event listeners ───────────────────────────────────────────────
function attachEvents() {
  mongoose.connection.on('connected', () => {
    isConnected = true;
    hasConnectedOnce = true;
    retryCount = 0;
    console.log(`✅ MongoDB connected → ${mongoose.connection.host}/${mongoose.connection.name}`);
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('⚠️  MongoDB disconnected');
    if (hasConnectedOnce && process.env.SERVERLESS !== '1') scheduleReconnect();
  });

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    console.error('❌ MongoDB error:', err.message);
  });

  process.on('SIGINT', gracefulShutdown('SIGINT'));
  process.on('SIGTERM', gracefulShutdown('SIGTERM'));
}

// ── Graceful shutdown ─────────────────────────────────────────────
function gracefulShutdown(signal) {
  return async () => {
    console.log(`\n${signal} received — closing MongoDB connection…`);
    await mongoose.connection.close();
    console.log('MongoDB connection closed. Exiting.');
    process.exit(0);
  };
}

// ── Reconnect ─────────────────────────────────────────────────────
function scheduleReconnect() {
  if (retryCount >= MAX_RETRIES) {
    console.error('❌ Max MongoDB reconnect attempts reached. Exiting.');
    process.exit(1);
  }
  retryCount++;
  const delay = RETRY_DELAY_MS * retryCount;
  console.log(`🔄 Reconnecting to MongoDB in ${delay / 1000}s (attempt ${retryCount}/${MAX_RETRIES})…`);
  setTimeout(connectDB, delay);
}

// ── Main connect ──────────────────────────────────────────────────
const connectDB = async () => {
  // In serverless environments, reuse an existing connection
  if (isConnected && mongoose.connection.readyState === 1) return;
  if (connectionPromise) return connectionPromise;

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  connectionPromise = (async () => {
    try {
      attachEvents();
      await mongoose.connect(process.env.MONGODB_URI, MONGO_OPTIONS);
    } catch (error) {
      console.error('❌ Initial MongoDB connection failed:', error.message);
      throw error;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
};

// ── Health check ──────────────────────────────────────────────────
const getDBHealth = () => ({
  status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  readyState: mongoose.connection.readyState,
  host: mongoose.connection.host || null,
  dbName: mongoose.connection.name || null,
  poolSize: mongoose.connection.poolSize || null,
});

module.exports = { connectDB, getDBHealth };