const Inquiry = require('../models/Inquiry');
const Property = require('../models/Property');

const isOwner = (val, userId) => String(val) === String(userId);

// Tenant starts an inquiry on a property
exports.createInquiry = async (req, res) => {
  try {
    const { propertyId, subject, body } = req.body;
    if (!propertyId || !body) {
      return res.status(400).json({ success: false, message: 'propertyId and body required' });
    }
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const inquiry = await Inquiry.create({
      property: property._id,
      landlord: property.landlord,
      tenant: req.user._id,
      subject: subject || `Inquiry on ${property.name}`,
      messages: [{ sender: req.user._id, body }]
    });

    res.status(201).json({ success: true, data: inquiry });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error creating inquiry', error: e.message });
  }
};

// Reply to an inquiry (tenant or landlord party)
exports.replyInquiry = async (req, res) => {
  try {
    const { body } = req.body;
    if (!body) return res.status(400).json({ success: false, message: 'body required' });

    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, message: 'Not found' });

    const isParty = isOwner(inquiry.landlord, req.user._id) || isOwner(inquiry.tenant, req.user._id);
    if (!isParty && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    inquiry.messages.push({ sender: req.user._id, body });
    inquiry.status = isOwner(inquiry.landlord, req.user._id) ? 'replied' : 'open';
    await inquiry.save();

    res.json({ success: true, data: inquiry });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error', error: e.message });
  }
};

// List my inquiries (tenant or landlord)
exports.myInquiries = async (req, res) => {
  try {
    const filter = req.user.role === 'landlord'
      ? { landlord: req.user._id }
      : { tenant: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const list = await Inquiry.find(filter)
      .populate('property', 'name address city')
      .populate('tenant', 'firstName lastName email')
      .populate('landlord', 'firstName lastName email')
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error', error: e.message });
  }
};

exports.getInquiry = async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id)
      .populate('property', 'name address city')
      .populate('tenant', 'firstName lastName email phone')
      .populate('landlord', 'firstName lastName email phone')
      .populate('messages.sender', 'firstName lastName role');
    if (!inquiry) return res.status(404).json({ success: false, message: 'Not found' });

    const isParty = isOwner(inquiry.landlord._id, req.user._id) || isOwner(inquiry.tenant._id, req.user._id);
    if (!isParty && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, data: inquiry });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error', error: e.message });
  }
};

exports.closeInquiry = async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, message: 'Not found' });
    const isParty = isOwner(inquiry.landlord, req.user._id) || isOwner(inquiry.tenant, req.user._id);
    if (!isParty && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    inquiry.status = 'closed';
    await inquiry.save();
    res.json({ success: true, data: inquiry });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error', error: e.message });
  }
};
