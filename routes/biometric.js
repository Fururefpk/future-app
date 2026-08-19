/**
 * routes/biometric.js
 * Ghana Card verification and face biometric enrollment.
 * All routes require authentication — verification is a post-login action.
 */

'use strict';

const express = require('express');
const router = express.Router();

const biometricController = require('../controllers/biometricController');
const { protect, authorize } = require('../middleware/auth');
const { ghanaCardUploader } = require('../middleware/upload');

// All biometric routes require a valid session
router.use(protect);

// ── Ghana Card verification ───────────────────────────────────────

/**
 * POST /biometric/verify-ghana-card
 * Submit Ghana Card details + optional photo for admin review.
 * Cloudinary stores the card image; number goes to the verification queue.
 * Body (multipart): { ghanaCardNumber, ghanaCardName } + optional file "cardImage"
 */
router.post(
  '/verify-ghana-card',
  ghanaCardUploader.single('cardImage'),
  biometricController.verifyGhanaCard,
);

// ── Face enrollment ───────────────────────────────────────────────

/**
 * POST /biometric/enroll-face
 * Submit the 128-d face descriptor captured by face-api.js on the client.
 * Body: { faceDescriptor: number[128], imageQuality: number }
 */
router.post('/enroll-face', biometricController.enrollFace);

/**
 * POST /biometric/re-enroll-face
 * Replace an existing face descriptor (e.g. after appearance change).
 * Requires the old face descriptor for a liveness match, or admin override.
 */
router.post('/re-enroll-face', biometricController.reenrollFace);

/**
 * DELETE /biometric/face
 * Remove biometric face data from the account.
 * Resets face verification status to unverified.
 */
router.delete('/face', biometricController.deleteFaceData);

// ── Status & history ──────────────────────────────────────────────

/**
 * GET /biometric/status
 * Returns the current verification status for the authenticated user:
 * { ghanaCardStatus, faceStatus, overallStatus, submittedAt, reviewedAt }
 */
router.get('/status', biometricController.getBiometricStatus);

/**
 * GET /biometric/history
 * Audit log of all verification attempts (submitted, approved, rejected).
 */
router.get('/history', biometricController.getVerificationHistory);

// ── Admin routes ──────────────────────────────────────────────────

/**
 * GET /biometric/queue
 * Admin: list all pending Ghana Card verifications awaiting review.
 * ?status=pending|approved|rejected  ?page=1&limit=20
 */
router.get('/queue', authorize('admin'), biometricController.getVerificationQueue);

/**
 * PATCH /biometric/queue/:userId/decision
 * Admin: approve or reject a Ghana Card submission.
 * Body: { decision: 'approved'|'rejected', reason?: string }
 */
router.patch(
  '/queue/:userId/decision',
  authorize('admin'),
  biometricController.reviewVerification,
);

/**
 * POST /biometric/queue/:userId/override
 * Admin: manually mark a user as fully verified (bypass queue).
 * Body: { reason: string }
 */
router.post(
  '/queue/:userId/override',
  authorize('admin'),
  biometricController.adminOverrideVerification,
);

module.exports = router;