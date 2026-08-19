/**
 * routes/tenancies.js
 * Tenancy lifecycle: request, approve/reject, end, and history.
 * Tenants need identity verification before they can request a tenancy.
 */

'use strict';

const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/tenancyController');
const {
  protect,
  requireVerified,
  authorize,
  requireTenancyParticipant,
} = require('../middleware/auth');

// All tenancy routes require authentication
router.use(protect);

// ── Tenant routes ─────────────────────────────────────────────────

/**
 * GET /tenancies/me
 * Returns the authenticated user's tenancies.
 * ?status=active|pending|ended|rejected  — optional filter
 * ?page=1&limit=10                        — pagination
 */
router.get('/me', ctrl.myTenancies);

/**
 * POST /tenancies
 * Request a tenancy for a property.
 * Requires full identity verification (Ghana Card + face).
 */
router.post('/', requireVerified, ctrl.requestTenancy);

// ── Shared (participant) routes ───────────────────────────────────

/**
 * GET /tenancies/:id
 * Fetch a single tenancy. Accessible by the tenant, the landlord, or an admin.
 */
router.get('/:id', requireTenancyParticipant, ctrl.getTenancy);

/**
 * PATCH /tenancies/:id/end
 * End an active tenancy. Tenant ends their own; landlord/admin can end any.
 */
router.patch('/:id/end', requireTenancyParticipant, ctrl.endTenancy);

// ── Landlord / Admin routes ───────────────────────────────────────

/**
 * GET /tenancies
 * List all tenancies for a landlord's properties.
 * Admins see all tenancies platform-wide.
 * ?status=pending|active|ended  ?propertyId=xxx  ?page=1&limit=20
 */
router.get('/', authorize('landlord', 'admin'), ctrl.listTenancies);

/**
 * PATCH /tenancies/:id/decision
 * Approve or reject a pending tenancy request.
 * Body: { decision: 'approved' | 'rejected', reason?: string }
 */
router.patch('/:id/decision', authorize('landlord', 'admin'), ctrl.respondTenancy);

/**
 * POST /tenancies/bulk-decision
 * Bulk approve or reject multiple tenancy requests.
 * Body: { ids: string[], decision: 'approved' | 'rejected' }
 */
router.post('/bulk-decision', authorize('landlord', 'admin'), ctrl.bulkDecision);

module.exports = router;