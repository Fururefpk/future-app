/**
 * api/index.js  (or vercel entry point)
 * Vercel serverless adapter for the Express app.
 *
 * Vercel invokes this file for every request. We warm up the database
 * connection on the first invocation and reuse it for the lifetime of
 * the function container (warm starts share the mongoose connection pool).
 */

'use strict';

process.env.SERVERLESS = '1';

const { connectDB } = require('../config/database');
const app = require('../server');

// Kick off the DB connection immediately so it's ready for the first request.
// connectDB() is idempotent — safe to call multiple times.
connectDB().catch((err) => {
  console.error('Vercel cold-start DB connection failed:', err.message);
});

module.exports = app;