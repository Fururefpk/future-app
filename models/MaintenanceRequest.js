'use strict';
const mongoose = require('mongoose');

const MaintenanceSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  tenant:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  title:       { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },

  priority: { type: String, enum: ['low','medium','high','emergency'], default: 'medium' },
  status:   { type: String, enum: ['open','in_progress','completed','cancelled'], default: 'open' },

  images: [{
    url:      { type: String, required: true },
    publicId: { type: String, required: true },
  }],

  technicianName:  { type: String, default: null },
  technicianPhone: { type: String, default: null },
  scheduledAt:     { type: Date,   default: null },
  notes:           { type: String, default: '' },

  rating: {
    score:   { type: Number, min: 1, max: 5, default: null },
    comment: { type: String, default: null },
    ratedAt: { type: Date,   default: null },
  },

  completedAt: { type: Date, default: null },
}, { timestamps: true });

MaintenanceSchema.index({ property: 1, status: 1 });
MaintenanceSchema.index({ tenant: 1 });

module.exports = mongoose.model('Maintenance', MaintenanceSchema);