const Property = require('../models/Property');
const User = require('../models/User');
const Tenancy = require('../models/Tenancy');
const RentPayment = require('../models/RentPayment');
const MaintenanceRequest = require('../models/MaintenanceRequest');

// Admin: list properties pending review
exports.pendingProperties = async (req, res) => {
  try {
    const list = await Property.find({ verificationStatus: 'pending' })
      .populate('landlord', 'firstName lastName email phone biometric.ghanaCardVerified biometric.faceEnrolled')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: list.length, data: list });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error', error: e.message });
  }
};

// Admin: approve / reject property
exports.reviewProperty = async (req, res) => {
  try {
    const { decision, reason } = req.body; // 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'decision must be approved or rejected' });
    }
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    property.verificationStatus = decision;
    property.verifiedBy = req.user._id;
    property.verifiedAt = new Date();
    if (decision === 'rejected') property.rejectionReason = reason || 'Did not meet listing requirements';
    await property.save();

    res.json({ success: true, message: `Property ${decision}`, data: property });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error', error: e.message });
  }
};

// Admin: list users with verification info
exports.listUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.verified === 'true') {
      filter['biometric.faceEnrolled'] = true;
      filter['biometric.ghanaCardVerified'] = true;
    } else if (req.query.verified === 'false') {
      filter.$or = [
        { 'biometric.faceEnrolled': { $ne: true } },
        { 'biometric.ghanaCardVerified': { $ne: true } }
      ];
    }
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users.map(u => u.getPublicProfile()) });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error', error: e.message });
  }
};

// Admin: activate / deactivate a user
exports.setUserActive = async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !!isActive;
    await user.save();
    res.json({ success: true, data: user.getPublicProfile() });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error', error: e.message });
  }
};

// Admin: dashboard stats
exports.dashboard = async (req, res) => {
  try {
    const [users, landlords, tenants, props, approved, pending,
           tenancies, activeTenancies, overdueRent, openMaintenance] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'landlord' }),
      User.countDocuments({ role: 'tenant' }),
      Property.countDocuments(),
      Property.countDocuments({ verificationStatus: 'approved' }),
      Property.countDocuments({ verificationStatus: 'pending' }),
      Tenancy.countDocuments(),
      Tenancy.countDocuments({ status: 'active', approvalStatus: 'active' }),
      RentPayment.countDocuments({ status: { $in: ['overdue', 'partial'] } }),
      MaintenanceRequest.countDocuments({ status: { $in: ['open', 'in_progress'] } })
    ]);

    res.json({
      success: true,
      data: {
        users, landlords, tenants,
        properties: { total: props, approved, pending },
        tenancies: { total: tenancies, active: activeTenancies },
        rent: { overdueOrPartial: overdueRent },
        maintenance: { openOrInProgress: openMaintenance }
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error', error: e.message });
  }
};
