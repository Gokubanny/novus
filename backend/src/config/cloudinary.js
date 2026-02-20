const cloudinary = require('cloudinary').v2;

// ─────────────────────────────────────────────────────────────────────────────
// Cloudinary Configuration — Version 2.0
//
// Required environment variables (add to your .env file):
//   CLOUDINARY_CLOUD_NAME=your_cloud_name
//   CLOUDINARY_API_KEY=your_api_key
//   CLOUDINARY_API_SECRET=your_api_secret
//
// Images are organised into folders per employee for easy management:
//   novusguard/inspections/{employeeId}/front_view
//   novusguard/inspections/{employeeId}/gate_view
//   novusguard/inspections/{employeeId}/street_view
//   novusguard/inspections/{employeeId}/additional
// ─────────────────────────────────────────────────────────────────────────────

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true  // Always use HTTPS URLs
});

// ── VALIDATION ────────────────────────────────────────────────────────────────
// Warn loudly at startup if credentials are missing rather than failing
// silently on the first upload attempt.
const validateCloudinaryConfig = () => {
  const missing = [];

  if (!process.env.CLOUDINARY_CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME');
  if (!process.env.CLOUDINARY_API_KEY)    missing.push('CLOUDINARY_API_KEY');
  if (!process.env.CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET');

  if (missing.length > 0) {
    console.warn(`⚠ Cloudinary: Missing environment variables: ${missing.join(', ')}`);
    console.warn('⚠ Image uploads will fail until these are set.');
  } else {
    console.log('✓ Cloudinary configured successfully');
  }
};

// ── UPLOAD HELPER ─────────────────────────────────────────────────────────────
// Uploads a single file buffer to Cloudinary.
// Used by the upload middleware when multer stores files in memory.
//
// @param {Buffer}  fileBuffer   - File data from multer memoryStorage
// @param {string}  employeeId   - Used to organise files into subfolders
// @param {string}  imageType    - One of: frontView, gateView, streetView, additional
// @param {string}  mimeType     - e.g. 'image/jpeg' — passed to Cloudinary
// @returns {Promise<object>}    - Cloudinary upload result (includes secure_url)
//
const uploadToCloudinary = (fileBuffer, employeeId, imageType, mimeType) => {
  return new Promise((resolve, reject) => {
    // Map imageType to a Cloudinary subfolder name
    const folderMap = {
      frontView:        'front_view',
      gateView:         'gate_view',
      streetView:       'street_view',
      additionalImages: 'additional'
    };

    const folder = `novusguard/inspections/${employeeId}/${folderMap[imageType] || 'additional'}`;

    // Use upload_stream so we can pipe a Buffer directly without writing to disk
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // Auto-format and auto-quality keep file sizes small without manual config
        fetch_format:  'auto',
        quality:       'auto',
        // Tag images for easy bulk operations in the Cloudinary dashboard
        tags: ['novusguard', 'inspection', employeeId, imageType]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    // Write the buffer into the stream
    uploadStream.end(fileBuffer);
  });
};

// ── DELETE HELPER ─────────────────────────────────────────────────────────────
// Removes an image from Cloudinary by its public_id.
// Useful when an employee re-submits and we need to clean up old images.
//
// @param {string} publicId - Cloudinary public_id extracted from the stored URL
// @returns {Promise<object>}
//
const deleteFromCloudinary = (publicId) => {
  return cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
};

module.exports = {
  cloudinary,
  validateCloudinaryConfig,
  uploadToCloudinary,
  deleteFromCloudinary
};