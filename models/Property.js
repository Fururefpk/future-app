'use strict';
const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url:      { type: String, required: true },
  publicId: { type: String, required: true },
}, { _id: false });

const PropertySchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  address:     { type: String, required: true, trim: true },
  city:        { type: String, required: true, trim: true },
  region:      { type: String, trim: true, default: '' },

  propertyType: {
    type: String,
    enum: ['apartment','house','studio','office','commercial'],
    default: 'apartment',
  },

  price:     { type: Number, required: true, min: 0 },   // monthly rent GH₵
  rooms:     { type: Number, default: 1, min: 0 },       // bedrooms
  bathrooms: { type: Number, default: 1, min: 1 },
  amenities: { type: [String], default: [] },

  images:   { type: [imageSchema], default: [] },
  landlord: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  status:          { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  rejectionReason: { type: String, default: null },
  approvedAt:      { type: Date, default: null },
  approvedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  featured:  { type: Boolean, default: false },
  viewCount: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

PropertySchema.index({ landlord: 1 });
PropertySchema.index({ status: 1, isDeleted: 1 });
PropertySchema.index({ city: 1, propertyType: 1, price: 1 });
PropertySchema.index({ featured: 1, status: 1 });
PropertySchema.index({ name: 'text', description: 'text', address: 'text', city: 'text' });

module.exports = mongoose.model('Property', PropertySchema);