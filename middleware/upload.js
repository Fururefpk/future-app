/**
 * middleware/upload.js
 * Multer + Cloudinary upload middleware for properties, Ghana Card, and avatars.
 */

'use strict';

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
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
  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder: `fph/${folder}`,
      allowed_formats: allowedFormats,
      transformation: folder === 'properties'
        ? [{ width: 1200, height: 800, crop: 'limit', quality: 'auto:good' }]
        : folder === 'avatars'
        ? [{ width: 200, height: 200, crop: 'fill', gravity: 'face', quality: 'auto' }]
        : [{ width: 1600, height: 1000, crop: 'limit', quality: 'auto' }],
      public_id: `${folder}_${req.user?._id || 'anon'}_${Date.now()}`,
    }),
  });

  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'), false);
      }
      cb(null, true);
    },
  });
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