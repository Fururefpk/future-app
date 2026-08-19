'use strict';
const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
  sender:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, trim: true },
  isStaff: { type: Boolean, default: false },
}, { timestamps: true });

const SupportSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject:  { type: String, required: true, trim: true, maxlength: 200 },
  message:  { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['general', 'payment', 'verification', 'property', 'technical'],
    default: 'general',
  },
  status:   { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open', index: true },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  replies:  [ReplySchema],
  resolvedAt: { type: Date, default: null },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

SupportSchema.index({ user: 1, status: 1 });
SupportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Support', SupportSchema);