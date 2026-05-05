const mongoose = require('mongoose');

// Tenants log issues; landlords/admins track and resolve.
// Solves: no proper maintenance request management.
const maintenanceSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  tenancy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenancy'
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['plumbing', 'electrical', 'structural', 'appliance', 'pest', 'security', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed', 'rejected'],
    default: 'open'
  },
  images: [{ url: String, uploadedAt: { type: Date, default: Date.now } }],
  responses: [{
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    createdAt: { type: Date, default: Date.now }
  }],
  resolvedAt: Date
}, { timestamps: true });

maintenanceSchema.index({ landlord: 1, status: 1 });
maintenanceSchema.index({ tenant: 1, status: 1 });
maintenanceSchema.index({ property: 1 });

module.exports = mongoose.model('MaintenanceRequest', maintenanceSchema);
