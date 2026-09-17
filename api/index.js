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

// Wait for the database before handling a request so cold starts cannot race
// queries against a connection that is still being established.
module.exports = async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (err) {
    console.error('Vercel database connection failed:', err.message);
    return res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable',
    });
  }
};