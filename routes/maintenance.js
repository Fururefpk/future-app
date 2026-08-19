/**
 * routes/maintenance.js
 * Maintenance request lifecycle: submit, update status, add images,
 * assign technician, and rate completed work.
 */

'use strict';

const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/maintenanceController');
const {
  protect,
  requireVerified,
  requireOwnerOrLandlord,
} = require('../middleware/auth');
const { propertyUploader } = require('../middleware/upload');

// All maintenance routes require authentication
router.use(protect);

// ── List routes ───────────────────────────────────────────────────

/**
 * GET /maintenance/me
 * - Tenant: their own requests
 * - Landlord: requests on their properties
 * - Admin: all requests
 * ?status=open|in_progress|completed|cancelled
 * ?priority=low|medium|high|emergency
 * ?propertyId=xxx  ?page=1&limit=20
 */
router.get('/me', requireOwnerOrLandlord, ctrl.myRequests);

/**
 * GET /maintenance/stats
 * Summary stats for a landlord or admin (open count, avg resolution time).
 */
router.get('/stats', ctrl.maintenanceStats);

// ── Single request routes ─────────────────────────────────────────

/**
 * GET /maintenance/:id
 * Full detail of a maintenance request. Participant check is inside controller.
 */
router.get('/:id', ctrl.getRequest);

/**
 * POST /maintenance
 * Submit a new maintenance request.
 * Requires identity verification.
 * Accepts up to 5 images showing the issue.
 * Body: { propertyId, title, description, priority: 'low'|'medium'|'high'|'emergency' }
 */
router.post(
  '/',
  requireVerified,
  propertyUploader.array('images', 5),
  ctrl.createRequest,
);

/**
 * PATCH /maintenance/:id
 * Update status, notes, or assigned technician.
 * Tenant can update description/images while status is 'open'.
 * Landlord/admin can update status, assign technician, add notes.
 * Body: {
 *   status?: 'open'|'in_progress'|'completed'|'cancelled',
 *   technicianName?: string,
 *   technicianPhone?: string,
 *   scheduledAt?: ISO date,
 *   notes?: string
 * }
 */
router.patch('/:id', requireOwnerOrLandlord, ctrl.updateRequest);

/**
 * POST /maintenance/:id/images
 * Add images to an existing request (open or in_progress only).
 */
router.post(
  '/:id/images',
  requireOwnerOrLandlord,
  propertyUploader.array('images', 5),
  ctrl.addImages,
);

/**
 * DELETE /maintenance/:id/images/:imageId
 * Remove a specific image from a request.
 */
router.delete('/:id/images/:imageId', requireOwnerOrLandlord, ctrl.removeImage);

/**
 * POST /maintenance/:id/rating
 * Tenant rates a completed request (1–5 stars + comment).
 * Body: { rating: 1-5, comment?: string }
 */
router.post('/:id/rating', ctrl.rateRequest);

module.exports = router;