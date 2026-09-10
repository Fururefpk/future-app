'use strict';
const mongoose = require('mongoose');

/**
 * models/Biometric.js
 * Stores every Ghana Card submission and face enrollment attempt
 * as an audit trail. The live verification status lives on User.verification
 * but this model tracks history for admin review, appeals, and compliance.
 */

const BiometricSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', required: true, index: true,
  },

  // ── Ghana Card ─────────────────────────────────────────────
  ghanaCard: {
    number:   { type: String, trim: true, default: null },
    name:     { type: String, trim: true, default: null },
    imageUrl: { type: String, default: null },
    publicId: { type: String, default: null }, // Cloudinary
  },

  // ── Face descriptor (128-d vector from face-api.js) ────────
  faceDescriptor: {
    type: [Number],
    select: false,           // never returned in queries by default
    default: undefined,
  },
  faceEnrolledAt:  { type: Date, default: null },
  faceQuality:     { type: Number, min: 0, max: 100, default: null },

  // ── Verification status & review ───────────────────────────
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'override'],
    default: 'pending',
    index: true,
  },
  submittedAt:  { type: Date, default: Date.now },
  reviewedAt:   { type: Date, default: null },
  reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectionReason: { type: String, trim: true, default: null },
  overrideReason:  { type: String, trim: true, default: null },

  // ── Which fields were submitted in this record ──────────────
  submissionType: {
    type: String,
    enum: ['ghana_card', 'face', 'both'],
    default: 'ghana_card',
  },
}, { timestamps: true });

BiometricSchema.index({ user: 1, verificationStatus: 1 });
BiometricSchema.index({ verificationStatus: 1, submittedAt: -1 });

module.exports = mongoose.model('Biometric', BiometricSchema);