const RentPayment = require('../models/RentPayment');
const Tenancy = require('../models/Tenancy');

const isOwner = (val, userId) => String(val) === String(userId);
const periodOf = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Generate / upsert an invoice for a given tenancy + period
// Body: { tenancyId, periodLabel?, dueDate? }
exports.generateInvoice = async (req, res) => {
  try {
    const { tenancyId, periodLabel, dueDate } = req.body;
    const tenancy = await Tenancy.findById(tenancyId);
    if (!tenancy) return res.status(404).json({ success: false, message: 'Tenancy not found' });
    if (!isOwner(tenancy.landlord, req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const period = periodLabel || periodOf(new Date());
    let due;
    if (dueDate) {
      due = new Date(dueDate);
    } else {
      const [y, m] = period.split('-').map(Number);
      due = new Date(y, m - 1, tenancy.dueDay || 1);
    }

    let invoice = await RentPayment.findOne({ tenancy: tenancy._id, periodLabel: period });
    if (invoice) {
      return res.status(200).json({ success: true, message: 'Invoice already exists', data: invoice });
    }
    invoice = await RentPayment.create({
      tenancy: tenancy._id,
      tenant: tenancy.tenant,
      landlord: tenancy.landlord,
      property: tenancy.property,
      periodLabel: period,
      amount: tenancy.monthlyRent,
      dueDate: due
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error generating invoice', error: e.message });
  }
};

// Record a payment against an invoice
// Body: { amount, method?, reference?, notes? }
exports.recordPayment = async (req, res) => {
  try {
    const { amount, method, reference, notes } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }
    const invoice = await RentPayment.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const isParty = isOwner(invoice.landlord, req.user._id) || isOwner(invoice.tenant, req.user._id);
    if (!isParty && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    invoice.amountPaid = (invoice.amountPaid || 0) + Number(amount);
    if (method) invoice.method = method;
    if (reference) invoice.reference = reference;
    if (notes) invoice.notes = notes;
    invoice.recomputeStatus();
    await invoice.save();

    res.json({ success: true, message: 'Payment recorded', data: invoice });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error recording payment', error: e.message });
  }
};

// List my invoices (as tenant or landlord)
exports.myInvoices = async (req, res) => {
  try {
    const role = req.user.role;
    const filter = role === 'landlord' ? { landlord: req.user._id } : { tenant: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const invoices = await RentPayment.find(filter)
      .populate('property', 'name address city')
      .populate('tenant', 'firstName lastName email')
      .populate('landlord', 'firstName lastName email')
      .sort({ dueDate: -1 });

    // Refresh statuses lazily for accurate "overdue"
    invoices.forEach(inv => inv.recomputeStatus());

    res.json({ success: true, data: invoices });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error', error: e.message });
  }
};

// Rent due reminders: invoices that are pending/overdue within a window (default next 7 days or already overdue)
exports.dueReminders = async (req, res) => {
  try {
    const days = Number(req.query.days || 7);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const filter = {
      status: { $in: ['pending', 'overdue', 'partial'] },
      dueDate: { $lte: cutoff }
    };
    if (req.user.role === 'landlord') filter.landlord = req.user._id;
    else if (req.user.role === 'tenant') filter.tenant = req.user._id;

    const invoices = await RentPayment.find(filter)
      .populate('property', 'name address')
      .populate('tenant', 'firstName lastName email phone')
      .populate('landlord', 'firstName lastName email phone')
      .sort({ dueDate: 1 });

    invoices.forEach(inv => inv.recomputeStatus());

    const reminders = invoices.map(inv => ({
      invoiceId: inv._id,
      property: inv.property,
      tenant: inv.tenant,
      landlord: inv.landlord,
      periodLabel: inv.periodLabel,
      amountDue: Math.max(0, inv.amount - (inv.amountPaid || 0)),
      dueDate: inv.dueDate,
      status: inv.status,
      daysUntilDue: Math.ceil((new Date(inv.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
    }));

    res.json({ success: true, count: reminders.length, data: reminders });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error', error: e.message });
  }
};
