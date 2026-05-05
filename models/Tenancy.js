const mongoose = require('mongoose');

// Links a tenant to a property under a landlord with lease terms.
// Solves: weak landlord-tenant trust, poor property status updates, central administration.
const tenancySchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  monthlyRent: {
    type: Number,
    required: true,
    min: 0
  },
  // Day of the month rent is due (1-28)
  dueDay: {
    type: Number,
    default: 1,
    min: 1,
    max: 28
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: Date,
  status: {
    type: String,
    enum: ['active', 'ended', 'terminated'],
    default: 'active'
  },
  // Lifecycle: tenant requests, landlord approves, then becomes active
  approvalStatus: {
    type: String,
    enum: ['pending', 'active', 'rejected'],
    default: 'pending'
  },
  notes: String
}, { timestamps: true });

tenancySchema.index({ tenant: 1, status: 1 });
tenancySchema.index({ landlord: 1, status: 1 });
tenancySchema.index({ property: 1 });

module.exports = mongoose.model('Tenancy', tenancySchema);
