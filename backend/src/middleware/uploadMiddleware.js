const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const uploadDirectory = path.resolve(__dirname, '../../uploads/service-requests');
fs.mkdirSync(uploadDirectory, { recursive: true });

const extensionsByMimeType = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const uploadServiceRequestImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(request, file, callback) {
    if (!extensionsByMimeType[file.mimetype]) {
      callback(new Error('Only JPEG, PNG, and WebP images are allowed.'));
      return;
    }
    callback(null, true);
  },
}).single('image');

function handleServiceRequestImageUpload(request, response, next) {
  uploadServiceRequestImage(request, response, (error) => {
    if (!error) {
      if (
        typeof request.body.latitude === 'string' &&
        request.body.latitude.trim()
      ) {
        request.body.latitude = Number(request.body.latitude);
      }
      if (
        typeof request.body.longitude === 'string' &&
        request.body.longitude.trim()
      ) {
        request.body.longitude = Number(request.body.longitude);
      }
      next();
      return;
    }

    const isTooLarge =
      error instanceof multer.MulterError &&
      error.code === 'LIMIT_FILE_SIZE';
    response.status(isTooLarge ? 413 : 400).json({
      success: false,
      message: isTooLarge
        ? 'The selected image must be 5 MB or smaller.'
        : error.message || 'Unable to upload the selected image.',
    });
  });
}

async function saveServiceRequestImage(file) {
  if (!file) {
    return null;
  }
  const filename = `${crypto.randomUUID()}${extensionsByMimeType[file.mimetype]}`;
  await fs.promises.writeFile(path.join(uploadDirectory, filename), file.buffer);
  return `/uploads/service-requests/${filename}`;
}

async function removeServiceRequestImage(imageUrl) {
  if (!imageUrl) {
    return;
  }
  await fs.promises
    .unlink(path.join(uploadDirectory, path.basename(imageUrl)))
    .catch(() => {});
}

module.exports = {
  handleServiceRequestImageUpload,
  removeServiceRequestImage,
  saveServiceRequestImage,
};
