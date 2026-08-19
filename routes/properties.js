/**
 * routes/properties.js
 * Property listings: public browsing, landlord management, image uploads,
 * featured toggles, and admin approval workflow.
 */

'use strict';

const express = require('express');
const router = express.Router();

const propertyController = require('../controllers/propertyController');
const { protect, authorize } = require('../middleware/auth');
const { propertyUploader } = require('../middleware/upload');

// ── Public routes (no auth needed) ───────────────────────────────

/**
 * GET /properties
 * Full-text search + filters: ?city=Accra&type=apartment&minPrice=1000
 * &maxPrice=5000&beds=3&baths=2&page=1&limit=12&sort=price_asc
 */
router.get('/', propertyController.getAllProperties);

/**
 * GET /properties/featured
 * Returns admin-curated featured listings (used on the landing page).
 */
router.get('/featured', propertyController.getFeaturedProperties);

/**
 * GET /properties/cities
 * Returns distinct cities that have at least one approved listing.
 */
router.get('/cities', propertyController.getAvailableCities);

/**
 * GET /properties/user/:userId
 * Returns all approved listings for a specific landlord (public profile).
 */
router.get('/user/:userId', propertyController.getLandlordProperties);

/**
 * GET /properties/:id
 * Single property detail — increments view count.
 */
router.get('/:id', propertyController.getPropertyById);

// ── Protected — Landlord / Admin ──────────────────────────────────

/**
 * POST /properties
 * Create a new listing. Accepts up to 8 images.
 * Status defaults to 'pending' — an admin must approve before it's public.
 */
router.post(
  '/',
  protect,
  authorize('landlord', 'admin'),
  propertyUploader.array('images', 8),
  propertyController.createProperty,
);

/**
 * PUT /properties/:id
 * Update listing details (landlord: own properties only; admin: any).
 * Accepts new images alongside the updated fields.
 */
router.put(
  '/:id',
  protect,
  propertyUploader.array('images', 8),
  propertyController.updateProperty,
);

/**
 * DELETE /properties/:id
 * Soft-deletes the listing. Landlord can only delete own properties.
 */
router.delete('/:id', protect, propertyController.deleteProperty);

/**
 * PATCH /properties/:id/images
 * Remove a specific image by its Cloudinary public_id.
 */
router.patch('/:id/images', protect, propertyController.removeImage);

/**
 * PATCH /properties/:id/featured
 * Admin-only: toggle the featured flag.
 */
router.patch('/:id/featured', protect, authorize('admin'), propertyController.toggleFeatured);

/**
 * GET /properties/:id/inquiries
 * Returns all inquiries for this property (landlord or admin only).
 */
router.get('/:id/inquiries', protect, authorize('landlord', 'admin'), propertyController.getPropertyInquiries);

/**
 * GET /properties/:id/stats
 * View count, inquiry count, tenancy count for a property (owner/admin).
 */
router.get('/:id/stats', protect, propertyController.getPropertyStats);

module.exports = router;