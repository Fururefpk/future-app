/**
 * utils/seedCreator.js
 *
 * On every server start, ensures the platform creator account exists.
 * The creator has simultaneous admin + landlord access and bypasses
 * all role restrictions.
 *
 * Configure via environment variables:
 *   CREATOR_EMAIL      — the email to log in with
 *   CREATOR_PASSWORD   — the password
 *   CREATOR_FIRST_NAME — first name (default: Emmanuel)
 *   CREATOR_LAST_NAME  — last name  (default: Gyapong)
 */

'use strict';

const bcrypt = require('bcryptjs');
const User   = require('../models/User');

const seedCreator = async () => {
  const email     = process.env.CREATOR_EMAIL || 'emmanuelboadi761@gmail.com';
  const password  = process.env.CREATOR_PASSWORD || 'Peekay@427';
  const firstName = process.env.CREATOR_FIRST_NAME || 'Emmanuel';
  const lastName  = process.env.CREATOR_LAST_NAME  || 'Gyapong';

  if (!email || !password) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('ℹ Creator seed skipped — CREATOR_EMAIL / CREATOR_PASSWORD not set in .env');
    }
    return;
  }

  try {
    let creator = await User.findOne({ email: email.toLowerCase() });

    if (!creator) {
      // First run — create the account
      const hashed = await bcrypt.hash(password, 12);
      creator = await User.create({
        firstName,
        lastName,
        email:          email.toLowerCase(),
        phone:          process.env.CREATOR_PHONE || '0200000000',
        password:       hashed,
        role:           'admin',          // primary role shown in UI
        secondaryRoles: ['landlord'],     // also a landlord
        isCreator:      true,
        isActive:       true,
        verification: {
          status:           'verified',   // auto-verified
          ghanaCardVerified: true,
          faceVerified:      true,
        },
      });
      console.log(`Creator account created: ${email}`);
    } else {
      // Subsequent runs — ensure flags are up to date
      let changed = false;

      if (!creator.isCreator) {
        creator.isCreator = true;
        changed = true;
      }
      if (creator.role !== 'admin') {
        creator.role = 'admin';
        changed = true;
      }
      if (!creator.secondaryRoles?.includes('landlord')) {
        creator.secondaryRoles = [...(creator.secondaryRoles || []), 'landlord'];
        changed = true;
      }
      if (creator.verification?.status !== 'verified') {
        creator.verification = {
          status:            'verified',
          ghanaCardVerified: true,
          faceVerified:      true,
        };
        changed = true;
      }
      if (changed) {
        await creator.save({ validateBeforeSave: false });
        console.log(`Creator account updated: ${email}`);
      } else {
        console.log(`Creator account OK: ${email}`);
      }
    }
  } catch (err) {
    console.error('seedCreator error:', err.message);
  }
};

module.exports = seedCreator;