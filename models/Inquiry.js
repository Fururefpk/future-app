'use strict';
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true, maxlength: 3000 },
  readBy:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

const InquirySchema = new mongoose.Schema({
  property:  { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  subject:   { type: String, required: true, trim: true, maxlength: 200 },

  status: { type: String, enum: ['open','closed'], default: 'open' },
  messages:    { type: [messageSchema], default: [] },
  isDeletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  closedAt: { type: Date, default: null },
  closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

InquirySchema.index({ sender: 1 });
InquirySchema.index({ recipient: 1 });
InquirySchema.index({ property: 1 });

module.exports = mongoose.model('Inquiry', InquirySchema);