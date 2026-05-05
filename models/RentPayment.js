const mongoose = require('mongoose');

// Tracks rent invoices and payments. Supports rent due reminders and payment history.
// Solves: lack of rent due reminders, poor payment tracking.
const rentPaymentSchema = new mongoose.Schema({
  tenancy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenancy',
    required: true
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
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  // Period this invoice covers e.g. "2026-05"
  periodLabel: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidAt: Date,
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'partial'],
    default: 'pending'
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  method: {
    type: String,
    enum: ['cash', 'mobile_money', 'bank_transfer', 'card', 'other'],
    default: 'cash'
  },
  reference: String,
  notes: String
}, { timestamps: true });

rentPaymentSchema.index({ tenancy: 1, periodLabel: 1 }, { unique: true });
rentPaymentSchema.index({ tenant: 1, status: 1 });
rentPaymentSchema.index({ landlord: 1, dueDate: 1 });

// Helper to recompute status based on payment vs due date
rentPaymentSchema.methods.recomputeStatus = function () {
  if (this.amountPaid >= this.amount) {
    this.status = 'paid';
    if (!this.paidAt) this.paidAt = new Date();
  } else if (this.amountPaid > 0) {
    this.status = 'partial';
  } else if (this.dueDate && this.dueDate < new Date()) {
    this.status = 'overdue';
  } else {
    this.status = 'pending';
  }
};

module.exports = mongoose.model('RentPayment', rentPaymentSchema);
