#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');

const DEMO_PASSWORD = process.env.SEED_PASSWORD;
const DEMO_EMAIL = process.env.SEED_LANDLORD_EMAIL || 'landlord.demo@example.com';
const TENANT_EMAIL = process.env.SEED_TENANT_EMAIL || 'tenant.demo@example.com';

function assertSafeToSeed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed while NODE_ENV=production');
  }
  if (process.env.SEED_CONFIRM !== 'I_UNDERSTAND') {
    throw new Error('Set SEED_CONFIRM=I_UNDERSTAND to enable demo seeding');
  }
  if (!DEMO_PASSWORD || DEMO_PASSWORD.length < 8) {
    throw new Error('Set SEED_PASSWORD to a password with at least 8 characters');
  }
}

async function upsertUser(email, profile) {
  let user = await User.findOne({ email });
  if (!user) user = new User({ email, ...profile, password: DEMO_PASSWORD });
  else Object.assign(user, profile);
  await user.save();
  return user;
}

async function main() {
  assertSafeToSeed();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME || 'future_properties',
  });

  const landlord = await upsertUser(DEMO_EMAIL, {
    firstName: 'Demo',
    lastName: 'Landlord',
    phone: '+233200000001',
    role: 'landlord',
    emailVerified: true,
  });
  await upsertUser(TENANT_EMAIL, {
    firstName: 'Demo',
    lastName: 'Tenant',
    phone: '+233200000002',
    role: 'tenant',
    emailVerified: true,
  });

  await Property.findOneAndUpdate(
    { name: 'Demo Accra Apartment', landlord: landlord._id },
    {
      name: 'Demo Accra Apartment',
      description: 'Seeded listing for local development and QA.',
      address: '12 Independence Avenue',
      city: 'Accra',
      region: 'Greater Accra',
      propertyType: 'apartment',
      price: 2500,
      rooms: 2,
      bathrooms: 2,
      amenities: ['water', 'parking'],
      landlord: landlord._id,
      status: 'approved',
      featured: true,
      isDeleted: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log(`Seed complete. Landlord: ${DEMO_EMAIL}; tenant: ${TENANT_EMAIL}`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(`Seed failed: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
