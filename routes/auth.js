/**
 * routes/auth.js
 * Authentication routes: classic email/password, passkey (WebAuthn),
 * social OAuth, biometric login, token refresh, email verification,
 * password reset, and session management.
 *
 * Public routes  → no token required
 * Protected routes → require Bearer JWT via `protect` middleware
 */

'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// ── Rate limiters ──────────────────────────────────────────────────
/** Tight limiter for sensitive mutations (login, register, password reset) */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
  skipSuccessfulRequests: true, // only count failures
});

/** Looser limiter for token refresh (clients call this more frequently) */
const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  message: { success: false, message: 'Too many refresh requests. Slow down.' },
});

// ── Public — Classic email/password ──────────────────────────────
router.post('/register',       strictLimiter, authController.register);
router.post('/login',          strictLimiter, authController.login);

// ── Public — Passkey / WebAuthn ───────────────────────────────────
// Step 1: client requests a challenge from the server
router.post('/passkey/challenge',    strictLimiter, authController.passkeyChallenge);
// Step 2: client sends signed credential back for verification
router.post('/passkey/verify',       strictLimiter, authController.passkeyVerify);
// Register a new passkey for an existing account (protected)
router.post('/passkey/register',     protect, authController.passkeyRegister);

// ── Public — OAuth social login ───────────────────────────────────
// Redirect to provider
router.get('/oauth/:provider',          authController.oauthRedirect);
// Provider callback — exchanges code for tokens then redirects to frontend
router.get('/oauth/:provider/callback', authController.oauthCallback);

// ── Public — Biometric / face recognition ────────────────────────
router.post('/biometric-login', strictLimiter, authController.biometricLogin);

// ── Public — Token lifecycle ──────────────────────────────────────
router.post('/refresh-token',  refreshLimiter, authController.refreshAccessToken);

// ── Public — Email verification ───────────────────────────────────
router.get('/verify-email/:token', authController.verifyEmail);
// Re-send verification email (protected — user must be logged in)
router.post('/resend-verification', protect, strictLimiter, authController.resendVerificationEmail);

// ── Public — Password reset ───────────────────────────────────────
router.post('/forgot-password',        strictLimiter, authController.forgotPassword);
router.post('/reset-password/:token',  strictLimiter, authController.resetPassword);

// ── Protected — Session / profile ────────────────────────────────
router.post('/logout',  protect, authController.logout);
router.post('/logout-all', protect, authController.logoutAll);   // revoke ALL refresh tokens
router.get('/me',       protect, authController.getMe);           // current user profile
router.get('/sessions', protect, authController.getActiveSessions); // list active devices

module.exports = router;