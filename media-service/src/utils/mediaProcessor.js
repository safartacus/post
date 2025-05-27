const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Generate unique filename
const generateUniqueFilename = (originalFilename, prefix = '') => {
  const ext = path.extname(originalFilename);
  return `${prefix}${uuidv4()}${ext}`;
};

// Process image
const processImage = async (buffer, options = {}) => {
  const {
    width,
    height,
    quality = 80,
    format = 'jpeg'
  } = options;

  let processor = sharp(buffer);

  if (width || height) {
    processor = processor.resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true
    });
  }

  return processor
    .toFormat(format, { quality })
    .toBuffer();
};

// Generate thumbnail from image
const generateThumbnail = async (buffer, options = {}) => {
  const {
    width = 300,
    height = 200,
    quality = 80
  } = options;

  return sharp(buffer)
    .resize(width, height, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality })
    .toBuffer();
};

// Process video
const processVideo = async (inputPath, outputPath, options = {}) => {
  const {
    width = 1280,
    height = 720,
    bitrate = '2000k',
    audioBitrate = '128k'
  } = options;

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .size(`${width}x${height}`)
      .videoBitrate(bitrate)
      .audioBitrate(audioBitrate)
      .format('mp4')
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
};

// Generate video thumbnail
const generateVideoThumbnail = async (inputPath, outputPath, options = {}) => {
  const {
    width = 300,
    height = 200,
    timestamp = '00:00:01'
  } = options;

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: `${width}x${height}`
      })
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err));
  });
};

// Get video metadata
const getVideoMetadata = async (inputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata);
    });
  });
};

// Validate file type
const validateFileType = (mimetype, allowedTypes) => {
  return allowedTypes.includes(mimetype);
};

// Validate file size
const validateFileSize = (size, maxSize) => {
  return size <= maxSize;
};

module.exports = {
  generateUniqueFilename,
  processImage,
  generateThumbnail,
  processVideo,
  generateVideoThumbnail,
  getVideoMetadata,
  validateFileType,
  validateFileSize
}; 