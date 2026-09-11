'use strict';
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const refreshTokenSchema = new mongoose.Schema({
  token:     { type: String, required: true },
  device:    { type: String, default: 'Unknown' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
}, { _id: false });

const passkeySchema = new mongoose.Schema({
  credentialId: { type: String, required: true },
  publicKey:    { type: String, required: true },
  counter:      { type: Number, default: 0 },
  createdAt:    { type: Date, default: Date.now },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true, maxlength: 50 },
  lastName:  { type: String, required: true, trim: true, maxlength: 50 },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:     { type: String, required: true, trim: true },
  password:  { type: String, required: true, select: false, minlength: 8 },
  role:      { type: String, enum: ['tenant', 'landlord', 'admin'], default: 'tenant' },
  avatar:    { type: String, default: null },

  isActive:      { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken:       { type: String, select: false },
  emailVerificationTokenExpires:{ type: Date,   select: false },

  passwordResetToken:   { type: String, select: false },
  passwordResetExpires: { type: Date,   select: false },

  verification: {
    status:             { type: String, enum: ['unverified','pending','verified','rejected'], default: 'unverified' },
    ghanaCardVerified:  { type: Boolean, default: false },
    faceVerified:       { type: Boolean, default: false },
    ghanaCardNumber:    { type: String, default: null },
    ghanaCardName:      { type: String, default: null },
    ghanaCardImageUrl:  { type: String, default: null },
    submittedAt:        { type: Date,   default: null },
    reviewedAt:         { type: Date,   default: null },
    reviewedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectionReason:    { type: String, default: null },
  },

  biometric: {
    faceDescriptor: { type: [Number], select: false, default: undefined },
    faceEnrolledAt: { type: Date, default: null },
  },

  notifications: {
    email:     { type: Boolean, default: true },
    sms:       { type: Boolean, default: true },
    push:      { type: Boolean, default: true },
    reminders: { type: Boolean, default: true },
  },

  twoFA: {
    enabled:     { type: Boolean, default: false },
    secret:      { type: String, select: false, default: null },
    backupCodes: { type: [String], select: false, default: [] },
  },

  passkeys:      [passkeySchema],
  refreshTokens: { type: [refreshTokenSchema], select: false },
  lastLoginAt:   { type: Date, default: null },
}, { timestamps: true });

// ── Indexes ────────────────────────────────────────────────────
UserSchema.index({ role: 1 });
UserSchema.index({ 'verification.status': 1 });

// ── Pre-save: hash password ────────────────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Instance method: compare password ─────────────────────────
UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ── Virtual: fullName ──────────────────────────────────────────
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ── toJSON: strip sensitive fields ────────────────────────────
UserSchema.set('toJSON', {
  virtuals: true,
  transform(_, ret) {
    delete ret.password;
    delete ret.refreshTokens;
    delete ret.emailVerificationToken;
    delete ret.passwordResetToken;
    delete ret.twoFA?.secret;
    delete ret.biometric?.faceDescriptor;
    return ret;
  },
});

module.exports = mongoose.model('User', UserSchema);