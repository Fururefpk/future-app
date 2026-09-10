/**
 * routes/rent.js
 * Rent invoice generation, payment recording (Mobile Money + bank),
 * overdue reminders, and payment history.
 */

'use strict';

const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/rentController');
const { protect, authorize } = require('../middleware/auth');

// All rent routes require authentication
router.use(protect);

// ── Invoice — Tenant ──────────────────────────────────────────────

/**
 * GET /rent/me
 * Returns all invoices for the authenticated tenant.
 * ?status=paid|unpaid|overdue  ?page=1&limit=10
 */
router.get('/me', ctrl.myInvoices);

/**
 * GET /rent/invoices/:id
 * Single invoice detail with payment history.
 */
router.get('/invoices/:id', ctrl.getInvoice);

/**
 * GET /rent/invoices/:id/pdf
 * Stream a PDF version of the invoice for download/print.
 */
router.get('/invoices/:id/pdf', ctrl.downloadInvoicePDF);

// ── Invoice — Landlord / Admin ────────────────────────────────────

/**
 * GET /rent/invoices
 * All invoices for a landlord's properties, or platform-wide for admin.
 * ?propertyId=xxx  ?tenantId=xxx  ?status=paid|unpaid|overdue
 * ?from=2024-01-01  ?to=2024-12-31  ?page=1&limit=20
 */
router.get('/invoices', authorize('landlord', 'admin'), ctrl.listInvoices);

/**
 * POST /rent/invoices
 * Generate a new invoice (or batch of invoices for all active tenancies).
 * Body: { tenancyId, amount, dueDate, description? }
 *    or { batch: true } — auto-generates for all active tenancies
 */
router.post('/invoices', authorize('landlord', 'admin'), ctrl.generateInvoice);

/**
 * PUT /rent/invoices/:id
 * Edit an unpaid invoice (amount, due date, description).
 */
router.put('/invoices/:id', authorize('landlord', 'admin'), ctrl.updateInvoice);

/**
 * DELETE /rent/invoices/:id
 * Void/delete an invoice (only if unpaid).
 */
router.delete('/invoices/:id', authorize('landlord', 'admin'), ctrl.voidInvoice);

// ── Payments ──────────────────────────────────────────────────────

/**
 * POST /rent/invoices/:id/payments
 * Record a payment against an invoice.
 * Body: { method: 'momo'|'bank'|'cash', transactionRef, amount, paidAt? }
 * Uses an idempotency key (transactionRef) to prevent duplicate recordings.
 */
router.post('/invoices/:id/payments', ctrl.recordPayment);

/**
 * GET /rent/invoices/:id/payments
 * Payment history for a specific invoice.
 */
router.get('/invoices/:id/payments', ctrl.getPaymentHistory);

// ── Reminders & summaries ─────────────────────────────────────────

/**
 * GET /rent/reminders
 * Invoices due within the next N days for the current user.
 * ?days=7 (default 7)
 */
router.get('/reminders', ctrl.dueReminders);

/**
 * POST /rent/reminders/send
 * Manually trigger reminder emails/SMS for overdue invoices.
 * Admin or landlord only.
 */
router.post('/reminders/send', authorize('landlord', 'admin'), ctrl.sendReminders);

/**
 * GET /rent/summary
 * Revenue summary for a landlord or platform-wide for admin.
 * ?year=2024  ?propertyId=xxx
 */
router.get('/summary', authorize('landlord', 'admin'), ctrl.revenueSummary);

module.exports = router;