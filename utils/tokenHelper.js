'use strict';
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET          = process.env.JWT_SECRET;
const JWT_EXPIRES_IN      = process.env.JWT_EXPIRES_IN      || '15m';
const REFRESH_SECRET      = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
const REFRESH_EXPIRES_IN  = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

// ── Access token ───────────────────────────────────────────────
const signAccessToken = (userId) =>
  jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const verifyAccessToken = (token) =>
  jwt.verify(token, JWT_SECRET);

// ── Refresh token ──────────────────────────────────────────────
const signRefreshToken = (userId) =>
  jwt.sign({ id: userId }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });

const verifyRefreshToken = (token) =>
  jwt.verify(token, REFRESH_SECRET);

// ── Opaque token (email verify / password reset) ───────────────
const generateOpaqueToken = () => crypto.randomBytes(32).toString('hex');

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

// ── Cookie helper ──────────────────────────────────────────────
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
};

const setRefreshCookie = (res, token) =>
  res.cookie('refreshToken', token, COOKIE_OPTIONS);

const clearRefreshCookie = (res) =>
  res.clearCookie('refreshToken', COOKIE_OPTIONS);

// ── Expiry date ────────────────────────────────────────────────
const refreshExpiresAt = () =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

module.exports = {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateOpaqueToken,
  hashToken,
  setRefreshCookie,
  clearRefreshCookie,
  refreshExpiresAt,
};