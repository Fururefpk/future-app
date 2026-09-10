'use strict';
const Property = require('../models/Property');
const Inquiry  = require('../models/Inquiry');
const { deleteCloudinaryImage } = require('../middleware/upload');

const ok  = (res, data, status = 200) => res.status(status).json({ success: true, data });
const err = (res, msg, status = 400) => res.status(status).json({ success: false, message: msg });

// ── Get all (with search + filters + pagination) ───────────────
exports.getAllProperties = async (req, res, next) => {
  try {
    const { city, type, minPrice, maxPrice, beds, baths, search, sort, page = 1, limit = 12 } = req.query;
    const query = { status: 'approved', isDeleted: false };

    if (city)     query.city         = new RegExp(city, 'i');
    if (type)     query.propertyType = type;
    if (minPrice || maxPrice) query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
    if (beds)     query.rooms       = { $gte: Number(beds) };
    if (baths)    query.bathrooms   = { $gte: Number(baths) };
    if (search)   query.$text       = { $search: search };

    const sortMap = { price_asc:'-featured price', price_desc:'-featured -price', newest:'-featured -createdAt', oldest:'createdAt' };
    const sortStr = sortMap[sort] || '-featured -createdAt';

    const skip  = (Number(page) - 1) * Number(limit);
    const [properties, total] = await Promise.all([
      Property.find(query).sort(sortStr).skip(skip).limit(Number(limit)).populate('landlord','firstName lastName avatar').lean(),
      Property.countDocuments(query),
    ]);

    ok(res, { properties, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) { next(e); }
};

// ── Featured ───────────────────────────────────────────────────
exports.getFeaturedProperties = async (req, res, next) => {
  try {
    const properties = await Property.find({ status:'approved', featured:true, isDeleted:false })
      .sort('-updatedAt').limit(8).populate('landlord','firstName lastName').lean();
    ok(res, { properties });
  } catch (e) { next(e); }
};

// ── Available cities ───────────────────────────────────────────
exports.getAvailableCities = async (req, res, next) => {
  try {
    const cities = await Property.distinct('city', { status:'approved', isDeleted:false });
    ok(res, { cities: cities.sort() });
  } catch (e) { next(e); }
};

// ── Single property ────────────────────────────────────────────
exports.getPropertyById = async (req, res, next) => {
  try {
    const property = await Property.findOne({ _id: req.params.id, isDeleted: false })
      .populate('landlord','firstName lastName avatar phone').lean();
    if (!property) return err(res, 'Property not found', 404);
    await Property.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    ok(res, { property });
  } catch (e) { next(e); }
};

// ── Landlord's properties ──────────────────────────────────────
exports.getLandlordProperties = async (req, res, next) => {
  try {
    const query = { landlord: req.params.userId, isDeleted: false };
    if (!req.user || (req.user._id.toString() !== req.params.userId && req.user.role !== 'admin'))
      query.status = 'approved';
    const properties = await Property.find(query).sort('-createdAt').lean();
    ok(res, { properties });
  } catch (e) { next(e); }
};

// ── Create ─────────────────────────────────────────────────────
exports.createProperty = async (req, res, next) => {
  try {
    const { name, address, city, region, price, propertyType, rooms, bathrooms, description, amenities } = req.body;
    if (!name || !address || !city || !price) return err(res, 'name, address, city, price are required');

    const images = (req.files || []).map(f => ({ url: f.path, publicId: f.filename }));
    const property = await Property.create({
      name, address, city, region, price: Number(price),
      propertyType: propertyType || 'apartment',
      rooms: Number(rooms) || 1, bathrooms: Number(bathrooms) || 1,
      description, amenities: amenities ? JSON.parse(amenities) : [],
      images, landlord: req.user._id,
    });
    ok(res, { property }, 201);
  } catch (e) { next(e); }
};

// ── Update ─────────────────────────────────────────────────────
exports.updateProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property || property.isDeleted) return err(res, 'Property not found', 404);
    if (property.landlord.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return err(res, 'Not authorised', 403);

    const allowed = ['name','address','city','region','price','propertyType','rooms','bathrooms','description','amenities'];
    allowed.forEach(k => { if (req.body[k] !== undefined) property[k] = req.body[k]; });

    const newImages = (req.files || []).map(f => ({ url: f.path, publicId: f.filename }));
    property.images.push(...newImages);
    if (property.status !== 'pending') property.status = 'pending'; // re-review on edit

    await property.save();
    ok(res, { property });
  } catch (e) { next(e); }
};

// ── Delete ─────────────────────────────────────────────────────
exports.deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return err(res, 'Property not found', 404);
    if (property.landlord.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return err(res, 'Not authorised', 403);
    property.isDeleted = true;
    await property.save();
    ok(res, { message: 'Property deleted' });
  } catch (e) { next(e); }
};

// ── Remove image ───────────────────────────────────────────────
exports.removeImage = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return err(res, 'Property not found', 404);
    if (property.landlord.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return err(res, 'Not authorised', 403);

    const { publicId } = req.body;
    const img = property.images.find(i => i.publicId === publicId);
    if (img) await deleteCloudinaryImage(publicId);
    property.images = property.images.filter(i => i.publicId !== publicId);
    await property.save();
    ok(res, { property });
  } catch (e) { next(e); }
};

// ── Toggle featured ────────────────────────────────────────────
exports.toggleFeatured = async (req, res, next) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id, [{ $set: { featured: { $not: '$featured' } } }], { new: true });
    if (!property) return err(res, 'Property not found', 404);
    ok(res, { property });
  } catch (e) { next(e); }
};

// ── Stats ──────────────────────────────────────────────────────
exports.getPropertyStats = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id).lean();
    if (!property) return err(res, 'Property not found', 404);
    if (property.landlord.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return err(res, 'Not authorised', 403);
    const inquiries = await Inquiry.countDocuments({ property: req.params.id });
    ok(res, { viewCount: property.viewCount, inquiries });
  } catch (e) { next(e); }
};

// ── Property inquiries ─────────────────────────────────────────
exports.getPropertyInquiries = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [inquiries, total] = await Promise.all([
      Inquiry.find({ property: req.params.id })
        .populate('sender','firstName lastName avatar')
        .sort('-updatedAt').skip(skip).limit(Number(limit)).lean(),
      Inquiry.countDocuments({ property: req.params.id }),
    ]);
    ok(res, { inquiries, total });
  } catch (e) { next(e); }
};