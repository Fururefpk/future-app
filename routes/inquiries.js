/**
 * routes/inquiries.js
 * Property inquiry messaging: create, reply, mark read, close, and archive.
 * Both parties (sender + recipient) must be verified for sensitive operations.
 */

'use strict';

const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/inquiryController');
const {
  protect,
  requireVerified,
  requireInquiryParticipant,
  requireInquiryOwnerOrAdmin,
} = require('../middleware/auth');

// All inquiry routes require authentication
router.use(protect);

// ── List / overview routes ────────────────────────────────────────

/**
 * GET /inquiries/me
 * Returns all inquiries the current user is involved in (sent or received).
 * ?status=open|closed  ?read=true|false  ?page=1&limit=20
 */
router.get('/me', ctrl.myInquiries);

/**
 * GET /inquiries/unread-count
 * Fast endpoint for the nav badge — returns { count: N }.
 */
router.get('/unread-count', ctrl.unreadCount);

// ── Single inquiry routes ─────────────────────────────────────────

/**
 * GET /inquiries/:id
 * Full inquiry thread with all replies.
 * Automatically marks unread messages as read for the current user.
 */
router.get('/:id', requireInquiryParticipant, ctrl.getInquiry);

/**
 * POST /inquiries
 * Send a new inquiry about a property.
 * Requires identity verification.
 * Body: { propertyId, subject, message }
 */
router.post('/', requireVerified, ctrl.createInquiry);

/**
 * POST /inquiries/:id/reply
 * Add a reply to an existing inquiry thread.
 * Only the sender or recipient can reply.
 * Body: { message }
 */
router.post('/:id/reply', requireInquiryParticipant, ctrl.replyInquiry);

/**
 * PATCH /inquiries/:id/read
 * Mark all messages in this thread as read for the current user.
 */
router.patch('/:id/read', requireInquiryParticipant, ctrl.markRead);

/**
 * PATCH /inquiries/:id/close
 * Close an inquiry thread — no further replies allowed.
 * Only the inquiry sender or an admin can close.
 */
router.patch('/:id/close', requireInquiryOwnerOrAdmin, ctrl.closeInquiry);

/**
 * DELETE /inquiries/:id
 * Soft-delete (archive) an inquiry.
 * Only the sender or an admin can delete.
 */
router.delete('/:id', requireInquiryOwnerOrAdmin, ctrl.deleteInquiry);

module.exports = router;