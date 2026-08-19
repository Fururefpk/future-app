'use strict';
const User         = require('../models/User');
const Email        = require('../utils/email');
const {
  signAccessToken, signRefreshToken, verifyRefreshToken,
  generateOpaqueToken, hashToken, refreshExpiresAt,
} = require('../utils/tokenHelper');

const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  data });
const err = (res, msg, status = 400) => res.status(status).json({ success: false, message: msg });

// ── Register ───────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password, role } = req.body;
    if (!firstName || !lastName || !email || !phone || !password || !role)
      return err(res, 'All fields are required');

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return err(res, 'An account with this email already exists', 409);

    const allowedRoles = ['tenant', 'landlord'];
    if (!allowedRoles.includes(role)) return err(res, 'Invalid role');

    const user = await User.create({ firstName, lastName, email, phone, password, role });

    const verifyToken = generateOpaqueToken();
    user.emailVerificationToken        = hashToken(verifyToken);
    user.emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    await Email.verifyEmail(user, verifyToken).catch(() => {});

    const accessToken  = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    user.refreshTokens.push({ token: hashToken(refreshToken), expiresAt: refreshExpiresAt(), device: req.headers['user-agent']?.slice(0,80) });
    await user.save({ validateBeforeSave: false });

    ok(res, { accessToken, refreshToken, user }, 201);
  } catch (e) { next(e); }
};

// ── Login ──────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return err(res, 'Email and password are required');

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password +refreshTokens');
    if (!user || !(await user.comparePassword(password)))
      return err(res, 'Invalid email or password', 401);

    if (!user.isActive) return err(res, 'Your account has been suspended', 403);

    const creatorEmail = process.env.CREATOR_EMAIL?.toLowerCase().trim();
    if (creatorEmail && user.email === creatorEmail) {
      let creatorUpdated = false;
      if (!user.isCreator) {
        user.isCreator = true;
        creatorUpdated = true;
      }
      if (user.role !== 'admin') {
        user.role = 'admin';
        creatorUpdated = true;
      }
      if (!user.secondaryRoles?.includes('landlord')) {
        user.secondaryRoles = [...(user.secondaryRoles || []), 'landlord'];
        creatorUpdated = true;
      }
      if (user.verification?.status !== 'verified') {
        user.verification = {
          status:            'verified',
          ghanaCardVerified: true,
          faceVerified:      true,
        };
        creatorUpdated = true;
      }
      if (creatorUpdated) {
        await user.save({ validateBeforeSave: false });
      }
    }

    const accessToken  = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    // Prune expired tokens
    user.refreshTokens = user.refreshTokens.filter(t => t.expiresAt > new Date());
    user.refreshTokens.push({ token: hashToken(refreshToken), expiresAt: refreshExpiresAt(), device: req.headers['user-agent']?.slice(0,80) });
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    ok(res, { accessToken, refreshToken, user });
  } catch (e) { next(e); }
};

// ── Biometric login ────────────────────────────────────────────
exports.biometricLogin = async (req, res, next) => {
  try {
    const { userEmail, faceDescriptor } = req.body;
    if (!userEmail || !faceDescriptor) return err(res, 'Email and face descriptor required');

    const user = await User.findOne({ email: userEmail.toLowerCase() }).select('+biometric.faceDescriptor +refreshTokens');
    if (!user) return err(res, 'User not found', 404);
    if (!user.biometric?.faceDescriptor?.length) return err(res, 'No face enrolled for this account', 404);

    // Euclidean distance between descriptors
    const stored   = user.biometric.faceDescriptor;
    const incoming = faceDescriptor;
    if (stored.length !== incoming.length) return err(res, 'Invalid face descriptor', 400);

    const dist = Math.sqrt(stored.reduce((sum, v, i) => sum + (v - incoming[i]) ** 2, 0));
    const THRESHOLD = parseFloat(process.env.FACE_THRESHOLD || '0.6');
    if (dist > THRESHOLD) return err(res, 'Face not recognised', 401);

    const accessToken  = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    user.refreshTokens = user.refreshTokens.filter(t => t.expiresAt > new Date());
    user.refreshTokens.push({ token: hashToken(refreshToken), expiresAt: refreshExpiresAt() });
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    ok(res, { accessToken, refreshToken, user });
  } catch (e) { next(e); }
};

// ── Refresh access token ───────────────────────────────────────
exports.refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return err(res, 'Refresh token required', 401);

    let decoded;
    try { decoded = verifyRefreshToken(refreshToken); }
    catch { return err(res, 'Invalid or expired refresh token', 401); }

    const user = await User.findById(decoded.id).select('+refreshTokens');
    if (!user) return err(res, 'User not found', 401);

    const hashed = hashToken(refreshToken);
    const stored = user.refreshTokens.find(t => t.token === hashed && t.expiresAt > new Date());
    if (!stored) return err(res, 'Refresh token revoked or expired', 401);

    const newAccess = signAccessToken(user._id);
    ok(res, { accessToken: newAccess });
  } catch (e) { next(e); }
};

// ── Logout ─────────────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const user = await User.findById(req.user._id).select('+refreshTokens');
      if (user) {
        const hashed = hashToken(refreshToken);
        user.refreshTokens = user.refreshTokens.filter(t => t.token !== hashed);
        await user.save({ validateBeforeSave: false });
      }
    }
    ok(res, { message: 'Logged out successfully' });
  } catch (e) { next(e); }
};

// ── Logout all sessions ────────────────────────────────────────
exports.logoutAll = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $set: { refreshTokens: [] } });
    ok(res, { message: 'All sessions revoked' });
  } catch (e) { next(e); }
};

// ── Get current user ───────────────────────────────────────────
exports.getMe = async (req, res) => ok(res, { user: req.user });

// ── Get active sessions ────────────────────────────────────────
exports.getActiveSessions = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+refreshTokens');
    const sessions = (user.refreshTokens || [])
      .filter(t => t.expiresAt > new Date())
      .map(({ device, createdAt, expiresAt }) => ({ device, createdAt, expiresAt }));
    ok(res, { sessions });
  } catch (e) { next(e); }
};

// ── Forgot password ────────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase() });
    // Always respond 200 to prevent email enumeration
    if (!user) return ok(res, { message: 'If that email exists, a reset link has been sent.' });

    const raw = generateOpaqueToken();
    user.passwordResetToken   = hashToken(raw);
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    await Email.passwordReset(user, raw).catch(() => {});
    ok(res, { message: 'If that email exists, a reset link has been sent.' });
  } catch (e) { next(e); }
};

// ── Reset password ─────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) return err(res, 'Password must be at least 8 characters');

    const hashed = hashToken(req.params.token);
    const user   = await User.findOne({
      passwordResetToken:   hashed,
      passwordResetExpires: { $gt: new Date() },
    }).select('+password');

    if (!user) return err(res, 'Reset link is invalid or has expired', 400);

    user.password             = password;
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens        = []; // invalidate all sessions
    await user.save();

    ok(res, { message: 'Password updated. Please log in again.' });
  } catch (e) { next(e); }
};

// ── Verify email ───────────────────────────────────────────────
exports.verifyEmail = async (req, res, next) => {
  try {
    const hashed = hashToken(req.params.token);
    const user   = await User.findOne({
      emailVerificationToken:        hashed,
      emailVerificationTokenExpires: { $gt: new Date() },
    });
    if (!user) return err(res, 'Verification link is invalid or has expired', 400);

    user.emailVerified                = true;
    user.emailVerificationToken        = undefined;
    user.emailVerificationTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });

    ok(res, { message: 'Email verified successfully.' });
  } catch (e) { next(e); }
};

// ── Resend verification email ──────────────────────────────────
exports.resendVerificationEmail = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.emailVerified) return ok(res, { message: 'Email is already verified.' });
    const raw  = generateOpaqueToken();
    user.emailVerificationToken        = hashToken(raw);
    user.emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    await Email.verifyEmail(user, raw).catch(() => {});
    ok(res, { message: 'Verification email resent.' });
  } catch (e) { next(e); }
};

// ── Passkey: challenge ─────────────────────────────────────────
exports.passkeyChallenge = async (req, res) => {
  const challenge = require('crypto').randomBytes(32).toString('base64');
  ok(res, { challenge });
};

// ── Passkey: verify ────────────────────────────────────────────
exports.passkeyVerify = async (req, res, next) => {
  try {
    const { email, credentialId } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() }).select('+refreshTokens');
    if (!user) return err(res, 'User not found', 404);

    const pk = user.passkeys?.find(p => p.credentialId === credentialId);
    if (!pk) return err(res, 'Passkey not registered for this account', 401);

    pk.counter++;
    const accessToken  = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    user.refreshTokens.push({ token: hashToken(refreshToken), expiresAt: refreshExpiresAt() });
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    ok(res, { accessToken, refreshToken, user });
  } catch (e) { next(e); }
};

// ── Passkey: register new credential ──────────────────────────
exports.passkeyRegister = async (req, res, next) => {
  try {
    const { credentialId, publicKey } = req.body;
    if (!credentialId || !publicKey) return err(res, 'credentialId and publicKey required');
    const user = await User.findById(req.user._id);
    user.passkeys.push({ credentialId, publicKey, counter: 0 });
    await user.save({ validateBeforeSave: false });
    ok(res, { message: 'Passkey registered.' });
  } catch (e) { next(e); }
};

// ── OAuth (stub — expand with passport.js if needed) ──────────
exports.oauthRedirect = (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL || '/'}?error=oauth_not_configured`);
};
exports.oauthCallback = (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL || '/'}?error=oauth_not_configured`);
};