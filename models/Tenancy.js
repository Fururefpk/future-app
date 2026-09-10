'use strict';
const mongoose = require('mongoose');

const TenancySchema = new mongoose.Schema({
  property:    { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  tenant:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  landlord:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  monthlyRent: { type: Number, required: true, min: 0 },
  startDate:   { type: Date, default: null },
  endDate:     { type: Date, default: null },

  status: {
    type: String,
    enum: ['pending','approved','rejected','active','ended'],
    default: 'pending',
  },

  message: { type: String, trim: true, maxlength: 500, default: '' }, // tenant's request message

  decision: {
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    reason:    { type: String, default: null },
  },

  endedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  endedAt:    { type: Date, default: null },
  endReason:  { type: String, default: null },
}, { timestamps: true });

TenancySchema.index({ tenant: 1, status: 1 });
TenancySchema.index({ landlord: 1, status: 1 });
TenancySchema.index({ property: 1 });

module.exports = mongoose.model('Tenancy', TenancySchema);