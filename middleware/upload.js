/**
 * middleware/upload.js
 * Multer + Cloudinary upload middleware for properties, Ghana Card, and avatars.
 */

'use strict';

const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// ── Cloudinary config (reads from .env) ───────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Shared allowed formats ────────────────────────────────────────
const IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ── Factory: build a multer instance for a given Cloudinary folder ─
function makeUploader(folder, maxFiles = 1, allowedFormats = IMAGE_FORMATS) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'), false);
      }
      const extension = file.originalname.split('.').pop()?.toLowerCase();
      if (!allowedFormats.includes(extension)) {
        return cb(new Error(`Allowed image formats: ${allowedFormats.join(', ')}`), false);
      }
      cb(null, true);
    },
  });

  const uploadToCloudinary = async (req, res, next) => {
    try {
      const files = req.files || (req.file ? [req.file] : []);
      await Promise.all(files.map(async (file, index) => {
        const publicId = `${folder}_${req.user?._id || 'anon'}_${Date.now()}_${index}`;
        const transformation = folder === 'properties'
          ? [{ width: 1200, height: 800, crop: 'limit', quality: 'auto:good' }]
          : folder === 'avatars'
          ? [{ width: 200, height: 200, crop: 'fill', gravity: 'face', quality: 'auto' }]
          : [{ width: 1600, height: 1000, crop: 'limit', quality: 'auto' }];

        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({
            folder: `fph/${folder}`,
            public_id: publicId,
            resource_type: 'image',
            transformation,
          }, (error, value) => error ? reject(error) : resolve(value));
          stream.end(file.buffer);
        });

        file.path = result.secure_url;
        file.filename = result.public_id;
      }));
      next();
    } catch (error) {
      next(error);
    }
  };

  return {
    array: (field, count = maxFiles) => [upload.array(field, count), uploadToCloudinary],
    single: (field) => [upload.single(field), uploadToCloudinary],
  };
}

// ── Specialised uploaders ─────────────────────────────────────────
const propertyUploader  = makeUploader('properties', 8);   // up to 8 property images
const ghanaCardUploader = makeUploader('ghana-cards', 2);  // front + back
const avatarUploader    = makeUploader('avatars', 1);

// ── Cloudinary delete helper ──────────────────────────────────────
const deleteCloudinaryImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
  }
};

module.exports = {
  propertyUploader,
  ghanaCardUploader,
  avatarUploader,
  deleteCloudinaryImage,
  cloudinary,
};