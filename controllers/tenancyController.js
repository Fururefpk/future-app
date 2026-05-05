const Tenancy = require('../models/Tenancy');
const Property = require('../models/Property');
const RentPayment = require('../models/RentPayment');

const isOwner = (val, userId) => String(val) === String(userId);

// Tenant requests a tenancy on a property
exports.requestTenancy = async (req, res) => {
  try {
    const { propertyId, monthlyRent, dueDay, startDate, endDate, notes } = req.body;
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    if (property.verificationStatus !== 'approved') {
      return res.status(400).json({ success: false, message: 'Property is not approved by admin' });
    }
    if (!property.isAvailable) {
      return res.status(400).json({ success: false, message: 'Property is not available' });
    }

    const tenancy = await Tenancy.create({
      property: property._id,
      landlord: property.landlord,
      tenant: req.user._id,
      monthlyRent: monthlyRent || property.price,
      dueDay: dueDay || 1,
      startDate: startDate || new Date(),
      endDate,
      notes,
      approvalStatus: 'pending',
      status: 'active'
    });

    res.status(201).json({ success: true, message: 'Tenancy requested', data: tenancy });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error requesting tenancy', error: e.message });
  }
};

// Landlord approves/rejects tenancy
exports.respondTenancy = async (req, res) => {
  try {
    const { decision, notes } = req.body; // 'active' or 'rejected'
    const tenancy = await Tenancy.findById(req.params.id).populate('property');
    if (!tenancy) return res.status(404).json({ success: false, message: 'Tenancy not found' });
    if (!isOwner(tenancy.landlord, req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (!['active', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'decision must be active or rejected' });
    }

    tenancy.approvalStatus = decision;
    if (notes) tenancy.notes = notes;
    await tenancy.save();

    // Mark the property unavailable when a tenancy is activated
    if (decision === 'active') {
      await Property.findByIdAndUpdate(tenancy.property._id, { isAvailable: false });
    }

    res.json({ success: true, message: `Tenancy ${decision}`, data: tenancy });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error updating tenancy', error: e.message });
  }
};

// End / terminate a tenancy
exports.endTenancy = async (req, res) => {
  try {
    const tenancy = await Tenancy.findById(req.params.id);
    if (!tenancy) return res.status(404).json({ success: false, message: 'Tenancy not found' });

    const isParty = isOwner(tenancy.landlord, req.user._id) || isOwner(tenancy.tenant, req.user._id);
    if (!isParty && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    tenancy.status = 'ended';
    tenancy.endDate = new Date();
    await tenancy.save();

    // Free the property again
    await Property.findByIdAndUpdate(tenancy.property, { isAvailable: true });

    res.json({ success: true, message: 'Tenancy ended', data: tenancy });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error ending tenancy', error: e.message });
  }
};

// List tenancies for current user (tenant or landlord)
exports.myTenancies = async (req, res) => {
  try {
    const filter = req.user.role === 'landlord'
      ? { landlord: req.user._id }
      : { tenant: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const tenancies = await Tenancy.find(filter)
      .populate('property', 'name address city price images')
      .populate('tenant', 'firstName lastName email phone')
      .populate('landlord', 'firstName lastName email phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: tenancies });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error fetching tenancies', error: e.message });
  }
};

exports.getTenancy = async (req, res) => {
  try {
    const tenancy = await Tenancy.findById(req.params.id)
      .populate('property')
      .populate('tenant', 'firstName lastName email phone')
      .populate('landlord', 'firstName lastName email phone');
    if (!tenancy) return res.status(404).json({ success: false, message: 'Tenancy not found' });

    const isParty = isOwner(tenancy.landlord._id, req.user._id) || isOwner(tenancy.tenant._id, req.user._id);
    if (!isParty && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, data: tenancy });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error', error: e.message });
  }
};
