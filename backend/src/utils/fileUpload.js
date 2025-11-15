/**
 * File Upload Configuration
 * Handles image uploads using Multer and Sharp
 */

const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Create uploads directory if it doesn't exist
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const IMAGES_DIR = path.join(UPLOAD_DIR, 'images');

async function ensureUploadDir() {
  try {
    await fs.mkdir(IMAGES_DIR, { recursive: true });
    console.log(`✅ Upload directory ready: ${IMAGES_DIR}`);
  } catch (error) {
    if (error.code === 'EACCES') {
      console.error(`❌ Permission denied creating upload directory: ${IMAGES_DIR}`);
      console.error('   This is likely a volume mount permission issue.');
      console.error('   The app will continue, but image uploads may fail.');
      console.error('   Fix: Run "chmod -R 777 ./backend/uploads" on host or rebuild container.');
    } else if (error.code === 'EEXIST') {
      // Directory already exists, that's fine
      console.log(`✅ Upload directory exists: ${IMAGES_DIR}`);
    } else {
      console.error('Error creating upload directory:', error);
    }
  }
}

// Initialize upload directory
ensureUploadDir();

// Multer configuration
const storage = multer.memoryStorage(); // Store in memory for processing with Sharp

const fileFilter = (req, file, cb) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/jpg').split(',');

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, and PNG images are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  },
  fileFilter: fileFilter
});

/**
 * Process and save uploaded image
 * @param {Buffer} buffer - Image buffer from multer
 * @param {string} repairId - Repair ID for filename
 * @returns {Promise<string>} Saved file path
 */
async function processAndSaveImage(buffer, repairId) {
  try {
    // Generate filename
    const filename = `${repairId}_${uuidv4()}.jpg`;
    const filepath = path.join(IMAGES_DIR, filename);

    // Process image with Sharp
    // - Resize to max 1920x1920 (maintain aspect ratio)
    // - Convert to JPEG
    // - Optimize quality
    await sharp(buffer)
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 85,
        progressive: true
      })
      .toFile(filepath);

    // Return relative URL path
    return `/uploads/images/${filename}`;
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error('Failed to process image');
  }
}

/**
 * Process base64 image data
 * @param {string} base64Data - Base64 encoded image
 * @param {string} repairId - Repair ID for filename
 * @returns {Promise<string>} Saved file path
 */
async function processBase64Image(base64Data, repairId) {
  try {
    // Remove data URL prefix if present
    const base64String = base64Data.includes(',')
      ? base64Data.split(',')[1]
      : base64Data;

    // Convert base64 to buffer
    const buffer = Buffer.from(base64String, 'base64');

    // Process and save
    return await processAndSaveImage(buffer, repairId);
  } catch (error) {
    console.error('Error processing base64 image:', error);
    throw new Error('Failed to process base64 image');
  }
}

/**
 * Delete image file
 * @param {string} imageUrl - Image URL to delete
 * @returns {Promise<boolean>} Success status
 */
async function deleteImage(imageUrl) {
  try {
    if (!imageUrl) return false;

    // Extract filename from URL
    const filename = path.basename(imageUrl);
    const filepath = path.join(IMAGES_DIR, filename);

    await fs.unlink(filepath);
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}

module.exports = {
  upload,
  processAndSaveImage,
  processBase64Image,
  deleteImage,
  IMAGES_DIR
};
