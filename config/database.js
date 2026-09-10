/**
 * config/database.js
 * MongoDB connection with retry logic, health checks, and graceful shutdown.
 */

'use strict';

const mongoose = require('mongoose');

// ── Connection state ──────────────────────────────────────────────
let isConnected = false;
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
    retryCount = 0;
    console.log(`✅ MongoDB connected → ${mongoose.connection.host}/${mongoose.connection.name}`);
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('⚠️  MongoDB disconnected');
    if (process.env.SERVERLESS !== '1') scheduleReconnect();
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

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    attachEvents();
    await mongoose.connect(process.env.MONGODB_URI, MONGO_OPTIONS);
  } catch (error) {
    console.error('❌ Initial MongoDB connection failed:', error.message);
    if (process.env.SERVERLESS !== '1') scheduleReconnect();
    else throw error; // let Vercel surface the cold-start failure
  }
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