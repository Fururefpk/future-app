'use strict';
const User       = require('../models/User');
const Biometric  = require('../models/Biometric');
const AuditLog   = require('../models/AuditLog');
const Email      = require('../utils/email');
const { deleteCloudinaryImage } = require('../middleware/upload');

const ok  = (res, data, s = 200) => res.status(s).json({ success: true,  data });
const err = (res, msg,  s = 400) => res.status(s).json({ success: false, message: msg });

// ── Enroll face ────────────────────────────────────────────────
exports.enrollFace = async (req, res, next) => {
  try {
    const { faceDescriptor, imageQuality } = req.body;
    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length < 128) {
      return err(res, 'Valid 128-dimensional face descriptor required');
    }

    const user = await User.findById(req.user._id);
    user.biometric = {
      faceDescriptor,
      faceEnrolledAt: new Date(),
    };

    // Update verification status
    const wasGhanaVerified = user.verification?.ghanaCardVerified;
    user.verification.faceVerified = true;
    if (wasGhanaVerified) {
      user.verification.status = 'verified';
    } else {
      user.verification.status = 'pending';
    }
    await user.save({ validateBeforeSave: false });

    // Save audit record
    await Biometric.create({
      user:           user._id,
      faceDescriptor,
      faceEnrolledAt: new Date(),
      faceQuality:    imageQuality || null,
      submissionType: 'face',
      verificationStatus: wasGhanaVerified ? 'approved' : 'pending',
    });

    ok(res, { message: 'Face enrolled successfully', faceVerified: true });
  } catch (e) { next(e); }
};

// ── Re-enroll face ─────────────────────────────────────────────
exports.reenrollFace = async (req, res, next) => {
  try {
    const { faceDescriptor } = req.body;
    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length < 128) {
      return err(res, 'Valid 128-dimensional face descriptor required');
    }

    const user = await User.findById(req.user._id).select('+biometric.faceDescriptor');
    user.biometric = { faceDescriptor, faceEnrolledAt: new Date() };
    await user.save({ validateBeforeSave: false });

    ok(res, { message: 'Face re-enrolled successfully' });
  } catch (e) { next(e); }
};

// ── Delete face data ───────────────────────────────────────────
exports.deleteFaceData = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.biometric = { faceDescriptor: undefined, faceEnrolledAt: null };
    user.verification.faceVerified = false;
    if (user.verification.status === 'verified') user.verification.status = 'pending';
    await user.save({ validateBeforeSave: false });

    ok(res, { message: 'Face data removed' });
  } catch (e) { next(e); }
};

// ── Verify Ghana Card ──────────────────────────────────────────
exports.verifyGhanaCard = async (req, res, next) => {
  try {
    const { ghanaCardNumber, ghanaCardName } = req.body;

    if (!ghanaCardNumber || !/^GHA-[0-9]{9}-[0-9]$/.test(ghanaCardNumber.trim())) {
      return err(res, 'Invalid Ghana Card number. Expected format: GHA-XXXXXXXXX-X');
    }
    if (!ghanaCardName?.trim()) {
      return err(res, 'Full name on card is required');
    }

    const user = await User.findById(req.user._id);

    // Update user verification fields
    user.verification.ghanaCardNumber  = ghanaCardNumber.trim();
    user.verification.ghanaCardName    = ghanaCardName.trim();
    user.verification.submittedAt      = new Date();
    user.verification.ghanaCardImageUrl = req.file?.path || null;

    // Don't auto-approve — mark pending for admin review
    if (user.verification.status === 'unverified') {
      user.verification.status = 'pending';
    }
    await user.save({ validateBeforeSave: false });

    // Save audit record
    await Biometric.create({
      user:           user._id,
      ghanaCard: {
        number:   ghanaCardNumber.trim(),
        name:     ghanaCardName.trim(),
        imageUrl: req.file?.path  || null,
        publicId: req.file?.filename || null,
      },
      submissionType:     'ghana_card',
      verificationStatus: 'pending',
    });

    // Notify admins (fire-and-forget)
    Email.adminNewVerification(user).catch(() => {});

    ok(res, {
      message: 'Ghana Card submitted for review. You\'ll be notified when approved.',
      status:  'pending',
    });
  } catch (e) { next(e); }
};

// ── Get verification status ────────────────────────────────────
exports.getBiometricStatus = async (req, res) => {
  const v = req.user.verification || {};
  ok(res, {
    ghanaCardStatus: v.ghanaCardVerified  ? 'verified'   : (v.submittedAt ? 'pending' : 'not_submitted'),
    faceStatus:      v.faceVerified       ? 'enrolled'   : 'not_enrolled',
    overallStatus:   v.status             || 'unverified',
    submittedAt:     v.submittedAt        || null,
    reviewedAt:      v.reviewedAt         || null,
    rejectionReason: v.rejectionReason    || null,
  });
};

// ── Verification history ───────────────────────────────────────
exports.getVerificationHistory = async (req, res, next) => {
  try {
    const records = await Biometric.find({ user: req.user._id })
      .select('-faceDescriptor')
      .sort('-submittedAt')
      .populate('reviewedBy', 'firstName lastName')
      .lean();
    ok(res, { records });
  } catch (e) { next(e); }
};

// ── ADMIN: Get verification queue ──────────────────────────────
exports.getVerificationQueue = async (req, res, next) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const query = { verificationStatus: status };
    const skip  = (Number(page) - 1) * Number(limit);

    const [records, total] = await Promise.all([
      Biometric.find(query)
        .select('-faceDescriptor')
        .populate('user', 'firstName lastName email phone')
        .populate('reviewedBy', 'firstName lastName')
        .sort('-submittedAt')
        .skip(skip).limit(Number(limit))
        .lean(),
      Biometric.countDocuments(query),
    ]);
    ok(res, { records, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) { next(e); }
};

// ── ADMIN: Review a Ghana Card submission ──────────────────────
exports.reviewVerification = async (req, res, next) => {
  try {
    const { decision, reason } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
      return err(res, 'decision must be "approved" or "rejected"');
    }

    const user = await User.findById(req.params.userId);
    if (!user) return err(res, 'User not found', 404);

    user.verification.ghanaCardVerified = decision === 'approved';
    user.verification.reviewedAt        = new Date();
    user.verification.reviewedBy        = req.user._id;
    user.verification.rejectionReason   = decision === 'rejected' ? (reason || null) : null;

    if (decision === 'approved' && user.verification.faceVerified) {
      user.verification.status = 'verified';
    } else if (decision === 'approved') {
      user.verification.status = 'pending';
    } else {
      user.verification.status = 'unverified';
    }
    await user.save({ validateBeforeSave: false });

    // Update latest Biometric record for this user
    await Biometric.findOneAndUpdate(
      { user: user._id, verificationStatus: 'pending' },
      { verificationStatus: decision, reviewedAt: new Date(), reviewedBy: req.user._id, rejectionReason: reason || null },
      { sort: '-submittedAt' }
    );

    // Audit log
    await AuditLog.create({
      admin:  req.user._id,
      action: `Ghana Card ${decision}`,
      target: user._id.toString(),
      details: reason || '',
    });

    // Notify user
    if (decision === 'approved') Email.verificationApproved(user).catch(() => {});
    else                         Email.verificationRejected(user, reason).catch(() => {});

    ok(res, { message: `Ghana Card ${decision}`, userId: user._id });
  } catch (e) { next(e); }
};

// ── ADMIN: Override — manually mark user verified ──────────────
exports.adminOverrideVerification = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return err(res, 'A reason is required for admin override');

    const user = await User.findById(req.params.userId);
    if (!user) return err(res, 'User not found', 404);

    user.verification.status            = 'verified';
    user.verification.ghanaCardVerified = true;
    user.verification.faceVerified      = true;
    user.verification.reviewedAt        = new Date();
    user.verification.reviewedBy        = req.user._id;
    await user.save({ validateBeforeSave: false });

    await AuditLog.create({
      admin: req.user._id, action: 'Admin Verification Override',
      target: user._id.toString(), details: reason,
    });

    ok(res, { message: 'User manually verified', userId: user._id });
  } catch (e) { next(e); }
};