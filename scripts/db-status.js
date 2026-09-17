#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const mongoose = require('mongoose');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');

  const started = Date.now();
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME || 'future_properties',
    serverSelectionTimeoutMS: 5000,
  });

  console.log(JSON.stringify({
    status: 'connected',
    host: mongoose.connection.host,
    dbName: mongoose.connection.name,
    latencyMs: Date.now() - started,
  }, null, 2));
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(`Database check failed: ${error.message}`);
  process.exitCode = 1;
});
