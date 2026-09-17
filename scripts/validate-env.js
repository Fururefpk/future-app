#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { validateEnvironment, RECOMMENDED_ENV_KEYS } = require('../config/env');

const missing = validateEnvironment(process.env);
const missingRecommended = RECOMMENDED_ENV_KEYS.filter((name) => !process.env[name]);

if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Database: ${process.env.DB_NAME || 'future_properties'}`);
console.log(`Required variables: ${missing.length === 0 ? '3/3' : '0/3'} present`);
if (missingRecommended.length) {
  console.warn(`Recommended variables missing: ${missingRecommended.join(', ')}`);
}
console.log('Environment validation passed.');
