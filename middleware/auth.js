/**
 * middleware/auth.js
 * JWT authentication, role-based authorization, and resource-ownership guards.
 * Every guard referenced across all route files is defined here.
 */

'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Inquiry = require('../models/Inquiry');
const Maintenance = require('../models/Maintenance');
const Tenancy = require('../models/Tenancy');

// ── Helpers ───────────────────────────────────────────────────────
const err = (res, status, message) => res.status(status).json({ success: false, message });

// ── protect ───────────────────────────────────────────────────────
/**
 * Verifies the Bearer JWT in Authorization header.
 * Attaches req.user on success.
 */
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return err(res, 401, 'Access denied: no token provided');

    const token = header.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      const msg = e.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
      return err(res, 401, msg);
    }

    const user = await User.findById(decoded.id).select('-password -refreshTokens').lean();
    if (!user) return err(res, 401, 'User no longer exists');
    if (user.isActive === false) return err(res, 403, 'Account is suspended');

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// ── authorize ─────────────────────────────────────────────────────
/**
 * Restricts access to specific roles.
 * Usage: authorize('admin') or authorize('landlord', 'admin')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return err(res, 401, 'Not authenticated');
  if (!roles.includes(req.user.role)) {
    return err(res, 403, `Role '${req.user.role}' is not authorized for this action`);
  }
  next();
};

// ── requireVerified ───────────────────────────────────────────────
/**
 * Requires the user to have completed identity verification
 * (Ghana Card + face enrollment both approved).
 */
const requireVerified = (req, res, next) => {
  if (!req.user) return err(res, 401, 'Not authenticated');
  const v = req.user.verification;
  if (!v || v.status !== 'verified') {
    return err(res, 403, 'Identity verification required to perform this action. Please verify your Ghana Card and face in Settings.');
  }
  next();
};

// ── requireInquiryParticipant ─────────────────────────────────────
/**
 * Ensures req.user is either the sender or the receiver of the inquiry,
 * or an admin. Used for inquiry replies.
 */
const requireInquiryParticipant = async (req, res, next) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id).lean();
    if (!inquiry) return err(res, 404, 'Inquiry not found');

    const userId = req.user._id.toString();
    const isParticipant =
      inquiry.sender?.toString() === userId ||
      inquiry.recipient?.toString() === userId ||
      req.user.role === 'admin';

    if (!isParticipant) return err(res, 403, 'Not authorized to reply to this inquiry');

    req.inquiry = inquiry;
    next();
  } catch (error) {
    next(error);
  }
};

// ── requireInquiryOwnerOrAdmin ────────────────────────────────────
/**
 * Ensures req.user is the inquiry sender or an admin.
 * Used for closing/deleting inquiries.
 */
const requireInquiryOwnerOrAdmin = async (req, res, next) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id).lean();
    if (!inquiry) return err(res, 404, 'Inquiry not found');

    const userId = req.user._id.toString();
    if (inquiry.sender?.toString() !== userId && req.user.role !== 'admin') {
      return err(res, 403, 'Only the inquiry sender or an admin can close it');
    }

    req.inquiry = inquiry;
    next();
  } catch (error) {
    next(error);
  }
};

// ── requireOwnerOrLandlord ────────────────────────────────────────
/**
 * For maintenance requests: the tenant who created it, the landlord
 * of the property, or an admin can access it.
 */
const requireOwnerOrLandlord = async (req, res, next) => {
  try {
    // For list routes (no :id), just check role
    if (!req.params.id) {
      if (!['tenant', 'landlord', 'admin'].includes(req.user.role)) {
        return err(res, 403, 'Not authorized');
      }
      return next();
    }

    const request = await Maintenance.findById(req.params.id)
      .populate('property', 'landlord')
      .lean();
    if (!request) return err(res, 404, 'Maintenance request not found');

    const userId = req.user._id.toString();
    const isOwner = request.tenant?.toString() === userId;
    const isLandlord = request.property?.landlord?.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isLandlord && !isAdmin) {
      return err(res, 403, 'Not authorized for this maintenance request');
    }

    req.maintenanceRequest = request;
    next();
  } catch (error) {
    next(error);
  }
};

// ── requireTenancyParticipant ─────────────────────────────────────
/**
 * Verifies the user is the tenant, the landlord, or an admin
 * for a given tenancy.
 */
const requireTenancyParticipant = async (req, res, next) => {
  try {
    const tenancy = await Tenancy.findById(req.params.id)
      .populate('property', 'landlord')
      .lean();
    if (!tenancy) return err(res, 404, 'Tenancy not found');

    const userId = req.user._id.toString();
    const isTenant = tenancy.tenant?.toString() === userId;
    const isLandlord = tenancy.property?.landlord?.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isTenant && !isLandlord && !isAdmin) {
      return err(res, 403, 'Not authorized to view this tenancy');
    }

    req.tenancy = tenancy;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  protect,
  authorize,
  requireVerified,
  requireInquiryParticipant,
  requireInquiryOwnerOrAdmin,
  requireOwnerOrLandlord,
  requireTenancyParticipant,
};