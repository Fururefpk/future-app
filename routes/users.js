/**
 * routes/users.js
 * User profile management: update details, avatar, password,
 * notification preferences, account deletion, and admin user management.
 */

'use strict';

const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { avatarUploader } = require('../middleware/upload');

// ── Public routes ─────────────────────────────────────────────────

/**
 * GET /users/:id
 * Public profile (name, avatar, role, verified badge).
 * No sensitive data exposed.
 */
router.get('/:id', userController.getUserPublicProfile);

// ── Protected — Own account ───────────────────────────────────────

/**
 * GET /users/profile/me
 * Full profile of the authenticated user.
 */
router.get('/profile/me', protect, userController.getMyProfile);

/**
 * PUT /users/profile
 * Update own profile: firstName, lastName, phone, city.
 */
router.put('/profile', protect, userController.updateProfile);

/**
 * PUT /users/avatar
 * Upload or replace profile avatar.
 * Multipart form-data, field name: "avatar".
 */
router.put(
  '/avatar',
  protect,
  avatarUploader.single('avatar'),
  userController.updateAvatar,
);

/**
 * PUT /users/password
 * Change password. Requires currentPassword + newPassword.
 */
router.put('/password', protect, userController.changePassword);

/**
 * PUT /users/notifications
 * Update notification preferences.
 * Body: { email: bool, sms: bool, push: bool, reminders: bool }
 */
router.put('/notifications', protect, userController.updateNotificationPreferences);

/**
 * POST /users/2fa/setup
 * Generate a TOTP QR code to link an authenticator app.
 */
router.post('/2fa/setup', protect, userController.setup2FA);

/**
 * POST /users/2fa/verify
 * Confirm a TOTP code to activate 2FA on the account.
 * Body: { code: '123456' }
 */
router.post('/2fa/verify', protect, userController.verify2FA);

/**
 * DELETE /users/2fa
 * Disable two-factor authentication.
 */
router.delete('/2fa', protect, userController.disable2FA);

/**
 * DELETE /users/account
 * Permanently delete own account (GDPR / data erasure).
 * Requires password confirmation.
 */
router.delete('/account', protect, userController.deleteAccount);

// ── Protected — Admin only ────────────────────────────────────────

/**
 * GET /users
 * Paginated list of all users.
 * ?role=tenant|landlord|admin  ?verified=true|false
 * ?search=email  ?page=1&limit=20
 */
router.get('/', protect, authorize('admin'), userController.getAllUsers);

/**
 * GET /users/stats/overview
 * Platform-wide user statistics (counts by role, verification rate, etc.).
 */
router.get('/stats/overview', protect, authorize('admin'), userController.getUserStats);

/**
 * PATCH /users/:id/role
 * Change a user's role (admin only).
 * Body: { role: 'tenant'|'landlord'|'admin' }
 */
router.patch('/:id/role', protect, authorize('admin'), userController.changeUserRole);

module.exports = router;