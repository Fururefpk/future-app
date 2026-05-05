const MaintenanceRequest = require('../models/MaintenanceRequest');
const Tenancy = require('../models/Tenancy');
const Property = require('../models/Property');

const isOwner = (val, userId) => String(val) === String(userId);

// Tenant creates a maintenance request
exports.createRequest = async (req, res) => {
  try {
    const { propertyId, tenancyId, title, description, category, priority, images } = req.body;

    let property, tenancy;
    if (tenancyId) {
      tenancy = await Tenancy.findById(tenancyId);
      if (!tenancy) return res.status(404).json({ success: false, message: 'Tenancy not found' });
      if (!isOwner(tenancy.tenant, req.user._id)) {
        return res.status(403).json({ success: false, message: 'Not your tenancy' });
      }
      property = await Property.findById(tenancy.property);
    } else if (propertyId) {
      property = await Property.findById(propertyId);
      if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
      tenancy = await Tenancy.findOne({
        property: property._id,
        tenant: req.user._id,
        status: 'active',
        approvalStatus: 'active'
      });
      if (!tenancy) {
        return res.status(403).json({ success: false, message: 'Active tenancy required to file maintenance' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'propertyId or tenancyId is required' });
    }

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'title and description required' });
    }

    const request = await MaintenanceRequest.create({
      property: property._id,
      tenancy: tenancy._id,
      tenant: req.user._id,
      landlord: property.landlord,
      title,
      description,
      category,
      priority,
      images
    });

    res.status(201).json({ success: true, data: request });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error creating request', error: e.message });
  }
};

// List requests for current user (tenant, landlord, or admin)
exports.myRequests = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'landlord') filter.landlord = req.user._id;
    else if (req.user.role === 'tenant') filter.tenant = req.user._id;
    if (req.query.status) filter.status = req.query.status;

    const list = await MaintenanceRequest.find(filter)
      .populate('property', 'name address')
      .populate('tenant', 'firstName lastName')
      .populate('landlord', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error', error: e.message });
  }
};

// Update status / respond
exports.updateRequest = async (req, res) => {
  try {
    const { status, response } = req.body;
    const request = await MaintenanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });

    const isParty = isOwner(request.landlord, req.user._id) || isOwner(request.tenant, req.user._id);
    if (!isParty && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (status) {
      const allowed = ['open', 'in_progress', 'resolved', 'closed', 'rejected'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      // Tenants may only close their own request
      if (req.user.role === 'tenant' && !['closed'].includes(status)) {
        return res.status(403).json({ success: false, message: 'Tenants can only close their requests' });
      }
      request.status = status;
      if (status === 'resolved') request.resolvedAt = new Date();
    }
    if (response) {
      request.responses.push({ by: req.user._id, message: response });
    }

    await request.save();
    res.json({ success: true, data: request });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error', error: e.message });
  }
};
