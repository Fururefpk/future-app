const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Property name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    enum: ['Accra', 'Kumasi', 'Sekondi', 'Cape Coast', 'Takoradi', 'Tema', 'Tamale'],
    default: 'Accra'
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  rooms: {
    type: Number,
    default: 1,
    min: [1, 'Property must have at least 1 room']
  },
  bathrooms: {
    type: Number,
    default: 1,
    min: [1, 'Property must have at least 1 bathroom']
  },
  propertyType: {
    type: String,
    enum: ['apartment', 'house', 'studio', 'office', 'commercial'],
    default: 'apartment'
  },
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Landlord is required']
  },
  images: [{
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isAvailable: {
    type: Boolean,
    default: true
  },
  amenities: [String], // WiFi, AC, Kitchen, etc.
  rules: String, // House rules
  
  // Ratings and Reviews
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviews: [{
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Contact Info
  contactPhone: String,
  contactEmail: String,

  // Admin verification / approval workflow (problems: fake listings, weak verification, central control)
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  rejectionReason: String,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for common queries
propertySchema.index({ landlord: 1, createdAt: -1 });
propertySchema.index({ city: 1, isAvailable: 1 });
propertySchema.index({ price: 1 });

module.exports = mongoose.model('Property', propertySchema);
