#!/usr/bin/env node
/**
 * Bootstrap an admin user.
 * Usage:  MASTER_KEY=<your-secret> node scripts/create-admin.js
 *
 * Required env vars:
 *   MASTER_KEY          – must match the key you set in production
 *   MONGODB_URI         – your Mongo connection string
 *   BCRYPT_ROUNDS       – (optional, defaults to 12)
 */
require('dotenv').config();

const mongoose = require('mongoose');
const readline = require('readline');
const User = require('../models/User');

const MASTER_KEY = process.env.MASTER_KEY;
if (!MASTER_KEY) {
  console.error('❌  MASTER_KEY env var is required');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

(async () => {
  try {
    const key = await ask('Enter MASTER_KEY: ');
    if (key.trim() !== MASTER_KEY) {
      console.error('❌  Invalid MASTER_KEY');
      process.exit(1);
    }

    const firstName = (await ask('Admin first name: ')).trim() || 'Admin';
    const lastName  = (await ask('Admin last name: ')).trim() || 'User';
    const email     = (await ask('Admin email: ')).trim();
    const phone     = (await ask('Admin phone (+233XXXXXXXXX): ')).trim();
    const password  = (await ask('Admin password (min 8 chars): ')).trim();

    if (!email || !phone || !password) {
      console.error('❌  Email, phone, and password are required');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅  Connected to MongoDB');

    const existing = await User.findOne({ email });
    if (existing) {
      existing.role = 'admin';
      await existing.save();
      console.log('✅  Existing user promoted to admin:', email);
    } else {
      await User.create({
        firstName,
        lastName,
        email,
        phone,
        password,
        role: 'admin',
        isEmailVerified: true,
        isActive: true
      });
      console.log('✅  Admin account created:', email);
    }

    rl.close();
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌  Error:', err.message);
    rl.close();
    process.exit(1);
  }
})();
