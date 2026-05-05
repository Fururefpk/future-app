const Property = require('../models/Property');

// @desc    Get all properties
// @route   GET /api/v1/properties
// @access  Public
exports.getAllProperties = async (req, res) => {
  try {
    const { page = 1, limit = 10, city, type, minPrice, maxPrice } = req.query;

    let query = { isAvailable: true, verificationStatus: 'approved' };

    if (city) query.city = city;
    if (type) query.propertyType = type;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const properties = await Property.find(query)
      .populate('landlord', 'firstName lastName phone email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Property.countDocuments(query);

    res.status(200).json({
      success: true,
      data: properties,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching properties',
      error: error.message
    });
  }
};

// @desc    Get property by ID
// @route   GET /api/v1/properties/:id
// @access  Public
exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('landlord', 'firstName lastName phone email profileImage');

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    res.status(200).json({
      success: true,
      data: property
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching property',
      error: error.message
    });
  }
};

// @desc    Create new property (Landlord only)
// @route   POST /api/v1/properties
// @access  Private
exports.createProperty = async (req, res) => {
  try {
    // Check if user is landlord
    if (req.user.role !== 'landlord') {
      return res.status(403).json({
        success: false,
        message: 'Only landlords can create properties'
      });
    }

    // Enforce Ghana Card + face verification before listing (anti-fake-listing safeguard)
    const bio = req.user.biometric || {};
    if (!bio.faceEnrolled || !bio.ghanaCardVerified) {
      return res.status(403).json({
        success: false,
        message: 'Verification required: enroll your face and verify your Ghana Card before listing a property.'
      });
    }

    const { name, description, address, city, price, rooms, bathrooms, propertyType, images } = req.body;

    if (!name || !address || !city || !price || !propertyType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const property = new Property({
      name,
      description,
      address,
      city,
      price,
      rooms,
      bathrooms,
      propertyType,
      images,
      landlord: req.user._id,
      isAvailable: true
    });

    await property.save();

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating property',
      error: error.message
    });
  }
};

// @desc    Update property
// @route   PUT /api/v1/properties/:id
// @access  Private
exports.updateProperty = async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check ownership
    if (property.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this property'
      });
    }

    // Update allowed fields
    const { name, description, address, city, price, rooms, bathrooms, images, isAvailable } = req.body;

    if (name) property.name = name;
    if (description) property.description = description;
    if (address) property.address = address;
    if (city) property.city = city;
    if (price) property.price = price;
    if (rooms) property.rooms = rooms;
    if (bathrooms) property.bathrooms = bathrooms;
    if (images) property.images = images;
    if (isAvailable !== undefined) property.isAvailable = isAvailable;

    property.updatedAt = new Date();
    await property.save();

    res.status(200).json({
      success: true,
      message: 'Property updated successfully',
      data: property
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating property',
      error: error.message
    });
  }
};

// @desc    Delete property
// @route   DELETE /api/v1/properties/:id
// @access  Private
exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check ownership
    if (property.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this property'
      });
    }

    await Property.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting property',
      error: error.message
    });
  }
};

// @desc    Get landlord's properties
// @route   GET /api/v1/properties/user/:userId
// @access  Public
exports.getLandlordProperties = async (req, res) => {
  try {
    const properties = await Property.find({ landlord: req.params.userId })
      .populate('landlord', 'firstName lastName phone email');

    res.status(200).json({
      success: true,
      data: properties
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching properties',
      error: error.message
    });
  }
};
