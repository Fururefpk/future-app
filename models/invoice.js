'use strict';
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  method:         { type: String, enum: ['momo','bank','cash','card'], required: true },
  transactionRef: { type: String, trim: true, default: null },
  amount:         { type: Number, required: true, min: 0 },
  paidAt:         { type: Date, default: Date.now },
  recordedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  notes:          { type: String, default: '' },
}, { timestamps: true });

const InvoiceSchema = new mongoose.Schema({
  tenancy:     { type: mongoose.Schema.Types.ObjectId, ref: 'Tenancy',  required: true },
  property:    { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  tenant:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  landlord:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  amount:      { type: Number, required: true, min: 0 },
  dueDate:     { type: Date, required: true },
  description: { type: String, default: 'Monthly Rent' },

  status: {
    type: String,
    enum: ['unpaid','paid','overdue','voided'],
    default: 'unpaid',
  },

  payments:   { type: [paymentSchema], default: [] },
  paidAmount: { type: Number, default: 0 },
  paidAt:     { type: Date, default: null },

  isVoided:  { type: Boolean, default: false },
  voidedAt:  { type: Date, default: null },
  voidedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  reminderSentAt: { type: Date, default: null },
}, { timestamps: true });

InvoiceSchema.index({ tenant: 1, status: 1 });
InvoiceSchema.index({ landlord: 1, status: 1 });
InvoiceSchema.index({ dueDate: 1, status: 1 });
InvoiceSchema.index({ 'payments.transactionRef': 1 }, { sparse: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);
