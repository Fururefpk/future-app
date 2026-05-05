const mongoose = require('mongoose');

// Threaded inquiries from tenants to landlords on a specific property.
// Solves: weak landlord-tenant communication workflow.
const inquirySchema = new mongoose.Schema({
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
  subject: { type: String, default: 'Property inquiry' },
  status: {
    type: String,
    enum: ['open', 'replied', 'closed'],
    default: 'open'
  },
  messages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

inquirySchema.index({ landlord: 1, status: 1 });
inquirySchema.index({ tenant: 1, status: 1 });
inquirySchema.index({ property: 1 });

module.exports = mongoose.model('Inquiry', inquirySchema);
