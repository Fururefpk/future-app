'use strict';
const User        = require('../models/User');
const Property    = require('../models/Property');
const Tenancy     = require('../models/Tenancy');
const Invoice     = require('../models/invoice');
const Inquiry     = require('../models/Inquiry');
const Maintenance = require('../models/Maintenance');
const Biometric   = require('../models/Biometric');
const AuditLog    = require('../models/AuditLog');
const Email       = require('../utils/email');
const { getDBHealth } = require('../config/database');

const ok  = (res, data, s = 200) => res.status(s).json({ success: true,  data });
const err = (res, msg,  s = 400) => res.status(s).json({ success: false, message: msg });

// ── Dashboard overview ─────────────────────────────────────────
exports.dashboard = async (req, res, next) => {
  try {
    const [
      totalUsers, totalLandlords, totalTenants,
      totalProperties, pendingProperties, approvedProperties,
      totalTenancies, activeTenancies,
      pendingVerifications,
      recentUsers, recentProperties,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'landlord', isActive: true }),
      User.countDocuments({ role: 'tenant',   isActive: true }),
      Property.countDocuments({ isDeleted: false }),
      Property.countDocuments({ status: 'pending',  isDeleted: false }),
      Property.countDocuments({ status: 'approved', isDeleted: false }),
      Tenancy.countDocuments(),
      Tenancy.countDocuments({ status: 'active' }),
      User.countDocuments({ 'verification.status': 'pending' }),
      User.find({ isActive: true }).sort('-createdAt').limit(5).select('firstName lastName email role createdAt verification.status').lean(),
      Property.find({ isDeleted: false }).sort('-createdAt').limit(5).populate('landlord','firstName lastName').select('name city status createdAt').lean(),
    ]);

    ok(res, {
      stats: {
        users:        { total: totalUsers, landlords: totalLandlords, tenants: totalTenants },
        properties:   { total: totalProperties, pending: pendingProperties, approved: approvedProperties },
        tenancies:    { total: totalTenancies, active: activeTenancies },
        verifications: { pending: pendingVerifications },
      },
      recentUsers,
      recentProperties,
    });
  } catch (e) { next(e); }
};

// ── Platform stats (time-series) ───────────────────────────────
exports.platformStats = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end   = to   ? new Date(to)   : new Date();

    const [newUsers, newProperties, newTenancies] = await Promise.all([
      User.countDocuments({     createdAt: { $gte: start, $lte: end } }),
      Property.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Tenancy.countDocuments({  createdAt: { $gte: start, $lte: end } }),
    ]);

    // Aggregate monthly sign-ups for chart
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    ok(res, { period: { from: start, to: end }, newUsers, newProperties, newTenancies, userGrowth });
  } catch (e) { next(e); }
};

// ── Recent activity feed ───────────────────────────────────────
exports.recentActivity = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const logs  = await AuditLog.find()
      .sort('-createdAt')
      .limit(limit)
      .populate('admin', 'firstName lastName')
      .lean();
    ok(res, { activity: logs });
  } catch (e) { next(e); }
};

// ── System health ──────────────────────────────────────────────
exports.systemHealth = async (req, res) => {
  const db = getDBHealth();
  ok(res, {
    status:      db.status === 'connected' ? 'healthy' : 'degraded',
    uptime:      Math.round(process.uptime()),
    memory:      process.memoryUsage(),
    nodeVersion: process.version,
    database:    db,
    timestamp:   new Date().toISOString(),
  });
};

// ── Properties: pending approval ──────────────────────────────
exports.pendingProperties = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [properties, total] = await Promise.all([
      Property.find({ status: 'pending', isDeleted: false })
        .populate('landlord', 'firstName lastName email phone verification.status')
        .sort('-createdAt').skip(skip).limit(Number(limit)).lean(),
      Property.countDocuments({ status: 'pending', isDeleted: false }),
    ]);
    ok(res, { properties, total });
  } catch (e) { next(e); }
};

// ── Properties: review (approve / reject) ─────────────────────
exports.reviewProperty = async (req, res, next) => {
  try {
    const { decision, reason } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
      return err(res, 'decision must be "approved" or "rejected"');
    }

    const property = await Property.findById(req.params.id)
      .populate('landlord', 'firstName lastName email');
    if (!property) return err(res, 'Property not found', 404);

    property.status          = decision;
    property.rejectionReason = decision === 'rejected' ? (reason || null) : null;
    property.approvedAt      = decision === 'approved' ? new Date() : null;
    property.approvedBy      = decision === 'approved' ? req.user._id : null;
    await property.save();

    await AuditLog.create({
      admin: req.user._id, action: `Property ${decision}`,
      target: property._id.toString(), details: reason || '',
    });

    // Notify landlord
    Email.propertyReview(property.landlord, property, decision, reason).catch(() => {});

    ok(res, { message: `Property ${decision}`, propertyId: property._id });
  } catch (e) { next(e); }
};

// ── Properties: list all ───────────────────────────────────────
exports.listAllProperties = async (req, res, next) => {
  try {
    const { status, city, page = 1, limit = 20 } = req.query;
    const query = { isDeleted: false };
    if (status) query.status = status;
    if (city)   query.city   = new RegExp(city, 'i');
    const skip = (Number(page) - 1) * Number(limit);
    const [properties, total] = await Promise.all([
      Property.find(query)
        .populate('landlord','firstName lastName email')
        .sort('-createdAt').skip(skip).limit(Number(limit)).lean(),
      Property.countDocuments(query),
    ]);
    ok(res, { properties, total });
  } catch (e) { next(e); }
};

// ── Properties: force remove ───────────────────────────────────
exports.removeProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return err(res, 'Property not found', 404);
    property.isDeleted = true;
    await property.save();
    await AuditLog.create({ admin: req.user._id, action: 'Property Removed', target: req.params.id });
    ok(res, { message: 'Property removed' });
  } catch (e) { next(e); }
};

// ── Users: list all ────────────────────────────────────────────
exports.listUsers = async (req, res, next) => {
  try {
    const { role, verified, active, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (role)   query.role     = role;
    if (active  !== undefined) query.isActive = active === 'true';
    if (verified === 'true')  query['verification.status'] = 'verified';
    if (verified === 'false') query['verification.status'] = { $ne: 'verified' };
    if (search) {
      query.$or = [
        { email:     new RegExp(search, 'i') },
        { firstName: new RegExp(search, 'i') },
        { lastName:  new RegExp(search, 'i') },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query).sort('-createdAt').skip(skip).limit(Number(limit)).lean(),
      User.countDocuments(query),
    ]);
    ok(res, { users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) { next(e); }
};

// ── Users: detail ──────────────────────────────────────────────
exports.getUserDetail = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return err(res, 'User not found', 404);
    const [properties, tenancies, verifications] = await Promise.all([
      Property.find({ landlord: user._id, isDeleted: false }).select('name city status').lean(),
      Tenancy.find({ tenant: user._id }).populate('property','name city').lean(),
      Biometric.find({ user: user._id }).select('-faceDescriptor').sort('-submittedAt').lean(),
    ]);
    ok(res, { user, properties, tenancies, verifications });
  } catch (e) { next(e); }
};

// ── Users: suspend / activate ──────────────────────────────────
exports.setUserActive = async (req, res, next) => {
  try {
    const { active, reason } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: Boolean(active) },
      { new: true }
    );
    if (!user) return err(res, 'User not found', 404);
    await AuditLog.create({
      admin: req.user._id,
      action: active ? 'User Activated' : 'User Suspended',
      target: req.params.id, details: reason || '',
    });
    // Notify user
    Email.accountStatusChanged(user, active, reason).catch(() => {});
    ok(res, { message: `User ${active ? 'activated' : 'suspended'}`, userId: user._id });
  } catch (e) { next(e); }
};

// ── Users: change role ─────────────────────────────────────────
exports.changeUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['tenant','landlord','admin'].includes(role)) return err(res, 'Invalid role');
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return err(res, 'User not found', 404);
    await AuditLog.create({ admin: req.user._id, action: 'Role Changed', target: req.params.id, details: role });
    ok(res, { message: 'Role updated', user });
  } catch (e) { next(e); }
};

// ── Users: bulk action ─────────────────────────────────────────
exports.bulkUserAction = async (req, res, next) => {
  try {
    const { ids, action, payload } = req.body;
    if (!ids?.length || !action) return err(res, 'ids and action required');

    let result;
    if (action === 'suspend') {
      result = await User.updateMany({ _id: { $in: ids } }, { isActive: false });
    } else if (action === 'activate') {
      result = await User.updateMany({ _id: { $in: ids } }, { isActive: true });
    } else if (action === 'notify') {
      // Fire notification emails (fire-and-forget)
      const users = await User.find({ _id: { $in: ids } }).lean();
      users.forEach(u => Email.bulkNotification(u, payload?.message).catch(() => {}));
      result = { modifiedCount: users.length };
    } else {
      return err(res, 'Unknown action');
    }

    await AuditLog.create({
      admin: req.user._id, action: `Bulk ${action}`,
      target: ids.join(',').slice(0, 200), details: `${result.modifiedCount || ids.length} users`,
    });

    ok(res, { message: `Bulk ${action} completed`, affected: result.modifiedCount || ids.length });
  } catch (e) { next(e); }
};

// ── Verifications: pending queue ───────────────────────────────
exports.pendingVerifications = async (req, res, next) => {
  try {
    const users = await User.find({ 'verification.status': 'pending' })
      .select('firstName lastName email phone verification createdAt')
      .sort('-verification.submittedAt')
      .lean();
    ok(res, { users, total: users.length });
  } catch (e) { next(e); }
};

// ── Verifications: stats ───────────────────────────────────────
exports.verificationStats = async (req, res, next) => {
  try {
    const [unverified, pending, verified, rejected] = await Promise.all([
      User.countDocuments({ 'verification.status': 'unverified' }),
      User.countDocuments({ 'verification.status': 'pending'    }),
      User.countDocuments({ 'verification.status': 'verified'   }),
      User.countDocuments({ 'verification.status': 'rejected'   }),
    ]);
    ok(res, { unverified, pending, verified, rejected, total: unverified+pending+verified+rejected });
  } catch (e) { next(e); }
};

// ── Audit log ──────────────────────────────────────────────────
exports.auditLog = async (req, res, next) => {
  try {
    const { adminId, action, from, to, page = 1, limit = 50 } = req.query;
    const query = {};
    if (adminId) query.admin  = adminId;
    if (action)  query.action = new RegExp(action, 'i');
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to)   query.createdAt.$lte = new Date(to);
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(query).populate('admin','firstName lastName').sort('-createdAt').skip(skip).limit(Number(limit)).lean(),
      AuditLog.countDocuments(query),
    ]);
    ok(res, { logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) { next(e); }
};