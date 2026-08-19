'use strict';
const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  admin:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true, trim: true },
  target: {
    type: { type: String },
    id:   { type: mongoose.Schema.Types.ObjectId },
  },
  payload:   { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: null },
}, { timestamps: true });

AuditLogSchema.index({ admin: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);