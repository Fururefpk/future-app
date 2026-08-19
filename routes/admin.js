/**
 * routes/admin.js
 * Admin-only control panel routes.
 * All routes require authentication + 'admin' role.
 */

'use strict';

const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// Apply auth guards to every route in this file
router.use(protect);
router.use(authorize('admin'));

// ── Dashboard & Analytics ─────────────────────────────────────────

/**
 * GET /admin/dashboard
 * Platform overview: user counts, property counts, revenue, recent activity.
 */
router.get('/dashboard', ctrl.dashboard);

/**
 * GET /admin/stats
 * Detailed time-series stats.
 * ?from=2024-01-01  ?to=2024-12-31  ?interval=month|week|day
 */
router.get('/stats', ctrl.platformStats);

/**
 * GET /admin/activity
 * Recent platform-wide activity log (registrations, approvals, payments).
 * ?limit=50
 */
router.get('/activity', ctrl.recentActivity);

/**
 * GET /admin/health
 * System health: DB status, queue lengths, uptime.
 */
router.get('/health', ctrl.systemHealth);

// ── Property Management ───────────────────────────────────────────

/**
 * GET /admin/properties/pending
 * Properties awaiting approval.
 * ?page=1&limit=20
 */
router.get('/properties/pending', ctrl.pendingProperties);

/**
 * PATCH /admin/properties/:id/review
 * Approve or reject a property listing.
 * Body: { decision: 'approved'|'rejected', reason?: string }
 */
router.patch('/properties/:id/review', ctrl.reviewProperty);

/**
 * GET /admin/properties
 * All properties with filters.
 * ?status=pending|approved|rejected  ?city=Accra  ?page=1&limit=20
 */
router.get('/properties', ctrl.listAllProperties);

/**
 * DELETE /admin/properties/:id
 * Force-remove a property (e.g. policy violation).
 */
router.delete('/properties/:id', ctrl.removeProperty);

// ── User Management ───────────────────────────────────────────────

/**
 * GET /admin/users
 * Paginated user list with filters.
 * ?role=tenant|landlord|admin  ?verified=true|false  ?active=true|false
 * ?search=name_or_email  ?page=1&limit=20
 */
router.get('/users', ctrl.listUsers);

/**
 * GET /admin/users/:id
 * Full user profile including verification history.
 */
router.get('/users/:id', ctrl.getUserDetail);

/**
 * PATCH /admin/users/:id/active
 * Suspend or reactivate a user account.
 * Body: { active: true|false, reason?: string }
 */
router.patch('/users/:id/active', ctrl.setUserActive);

/**
 * PATCH /admin/users/:id/role
 * Change a user's role.
 * Body: { role: 'tenant'|'landlord'|'admin' }
 */
router.patch('/users/:id/role', ctrl.changeUserRole);

/**
 * POST /admin/users/bulk-action
 * Bulk suspend, activate, or send notifications.
 * Body: { ids: string[], action: 'suspend'|'activate'|'notify', payload?: object }
 */
router.post('/users/bulk-action', ctrl.bulkUserAction);

// ── Verification Queue ────────────────────────────────────────────

/**
 * GET /admin/verifications/pending
 * Ghana Card submissions awaiting review.
 */
router.get('/verifications/pending', ctrl.pendingVerifications);

/**
 * GET /admin/verifications/stats
 * Verification funnel stats (submitted, approved, rejected, avg time).
 */
router.get('/verifications/stats', ctrl.verificationStats);

// ── Audit Log ─────────────────────────────────────────────────────

/**
 * GET /admin/audit-log
 * Full admin action audit trail.
 * ?adminId=xxx  ?action=approval|suspension  ?from=date  ?to=date
 * ?page=1&limit=50
 */
router.get('/audit-log', ctrl.auditLog);

module.exports = router;