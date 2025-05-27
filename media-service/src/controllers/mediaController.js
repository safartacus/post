const Media = require('../models/Media');
const { Kafka } = require('kafkajs');
const {
  BUCKETS,
  getPresignedUrl,
  getPresignedDownloadUrl,
  deleteObject
} = require('../config/minio');
const {
  generateUniqueFilename,
  processImage,
  generateThumbnail,
  processVideo,
  generateVideoThumbnail,
  getVideoMetadata,
  validateFileType,
  validateFileSize
} = require('../utils/mediaProcessor');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const Redis = require('redis');

const kafka = new Kafka({
  clientId: 'media-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();

// Initialize Redis client
const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.connect().catch(console.error);

// Get upload URL
const getUploadUrl = async (req, res) => {
  try {
    const { type, originalName, tags, isPublic } = req.body;
    const allowedTypes = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/quicktime', 'video/webm'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
    };

    if (!allowedTypes[type]) {
      return res.status(400).json({ message: 'Invalid media type' });
    }

    const ext = path.extname(originalName);
    const key = generateUniqueFilename(originalName, `${type}/`);
    const bucket = BUCKETS[type.toUpperCase() + 'S'];

    const url = await getPresignedUrl(bucket, key);

    // Create media record
    const media = new Media({
      type,
      bucket,
      key,
      originalName,
      owner: req.user.id,
      tags: tags || [],
      isPublic: isPublic || false
    });

    await media.save();

    res.json({
      uploadUrl: url,
      key,
      bucket,
      mediaId: media._id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Process uploaded media
const processMedia = async (req, res) => {
  try {
    const { type, key, bucket, originalName, mimeType, size, mediaId } = req.body;

    // Validate file type and size
    const allowedTypes = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/quicktime', 'video/webm'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
    };

    const maxSizes = {
      image: 10 * 1024 * 1024, // 10MB
      video: 500 * 1024 * 1024, // 500MB
      audio: 50 * 1024 * 1024 // 50MB
    };

    if (!validateFileType(mimeType, allowedTypes[type])) {
      return res.status(400).json({ message: 'Invalid file type' });
    }

    if (!validateFileSize(size, maxSizes[type])) {
      return res.status(400).json({ message: 'File too large' });
    }

    const media = await Media.findById(mediaId);
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }

    if (media.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Process media based on type
    if (type === 'image') {
      // Process image and generate thumbnail
      const tempPath = path.join(os.tmpdir(), key);
      const thumbnailKey = `thumbnails/${path.basename(key)}`;

      // Download from MinIO
      const stream = await minioClient.getObject(bucket, key);
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      // Process image
      const processedBuffer = await processImage(buffer, {
        width: 1920,
        height: 1080,
        quality: 80,
        format: 'jpeg'
      });
      await fs.writeFile(tempPath, processedBuffer);

      // Generate thumbnail
      const thumbnailBuffer = await generateThumbnail(buffer, {
        width: 300,
        height: 200,
        quality: 80
      });
      await minioClient.putObject(BUCKETS.THUMBNAILS, thumbnailKey, thumbnailBuffer);

      // Update media record
      media.status = 'ready';
      media.mimeType = mimeType;
      media.size = size;
      media.metadata = {
        width: 1920,
        height: 1080,
        format: 'jpeg'
      };
      media.thumbnail = {
        bucket: BUCKETS.THUMBNAILS,
        key: thumbnailKey
      };
      await media.save();

      // Clean up
      await fs.unlink(tempPath);

      // Send event to Kafka
      await producer.send({
        topic: 'media-processed',
        messages: [
          { value: JSON.stringify(media) }
        ]
      });
    } else if (type === 'video') {
      // Process video and generate thumbnail
      const tempPath = path.join(os.tmpdir(), key);
      const thumbnailKey = `thumbnails/${path.basename(key, path.extname(key))}.jpg`;

      // Download from MinIO
      const stream = await minioClient.getObject(bucket, key);
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      await fs.writeFile(tempPath, Buffer.concat(chunks));

      // Get video metadata
      const metadata = await getVideoMetadata(tempPath);
      media.metadata = {
        width: metadata.streams[0].width,
        height: metadata.streams[0].height,
        duration: metadata.format.duration,
        format: metadata.format.format_name,
        bitrate: metadata.format.bit_rate,
        codec: metadata.streams[0].codec_name,
        fps: metadata.streams[0].r_frame_rate,
        channels: metadata.streams[0].channels,
        sampleRate: metadata.streams[0].sample_rate
      };

      // Process video
      const processedPath = path.join(os.tmpdir(), `processed_${key}`);
      await processVideo(tempPath, processedPath, {
        width: 1920,
        height: 1080,
        bitrate: '2000k',
        audioBitrate: '128k'
      });

      // Generate thumbnail
      const thumbnailPath = path.join(os.tmpdir(), thumbnailKey);
      await generateVideoThumbnail(tempPath, thumbnailPath, {
        width: 300,
        height: 200,
        timestamp: '00:00:01'
      });

      // Upload processed video and thumbnail
      await minioClient.fPutObject(bucket, key, processedPath);
      await minioClient.fPutObject(BUCKETS.THUMBNAILS, thumbnailKey, thumbnailPath);

      // Update media record
      media.status = 'ready';
      media.mimeType = mimeType;
      media.size = size;
      media.thumbnail = {
        bucket: BUCKETS.THUMBNAILS,
        key: thumbnailKey
      };
      await media.save();

      // Clean up temporary files
      await fs.unlink(tempPath);
      await fs.unlink(processedPath);
      await fs.unlink(thumbnailPath);

      // Send event to Kafka
      await producer.send({
        topic: 'media-processed',
        messages: [
          { value: JSON.stringify(media) }
        ]
      });
    }

    res.json(media);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get media info
const getMediaInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `media:${id}`;

    // Try to get from cache
    const cachedMedia = await redis.get(cacheKey);
    if (cachedMedia) {
      return res.json(JSON.parse(cachedMedia));
    }

    const media = await Media.findById(id);
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }

    if (!media.isPublic && media.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const url = await getPresignedDownloadUrl(media.bucket, media.key);
    const thumbnailUrl = media.thumbnail
      ? await getPresignedDownloadUrl(media.thumbnail.bucket, media.thumbnail.key)
      : null;

    const mediaInfo = {
      ...media.toJSON(),
      url,
      thumbnailUrl
    };

    // Cache for 1 hour
    await redis.set(cacheKey, JSON.stringify(mediaInfo), {
      EX: 3600
    });

    // Increment view count
    media.views += 1;
    await media.save();

    res.json(mediaInfo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete media
const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const media = await Media.findById(id);

    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }

    if (media.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete from MinIO
    await deleteObject(media.bucket, media.key);
    if (media.thumbnail) {
      await deleteObject(media.thumbnail.bucket, media.thumbnail.key);
    }

    // Delete from database
    await media.remove();

    // Delete from cache
    await redis.del(`media:${id}`);

    // Send event to Kafka
    await producer.send({
      topic: 'media-deleted',
      messages: [
        { value: JSON.stringify({ id }) }
      ]
    });

    res.json({ message: 'Media deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update media
const updateMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const { tags, isPublic } = req.body;

    const media = await Media.findById(id);
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }

    if (media.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (tags) media.tags = tags;
    if (typeof isPublic === 'boolean') media.isPublic = isPublic;

    await media.save();

    // Update cache
    const cacheKey = `media:${id}`;
    await redis.del(cacheKey);

    res.json(media);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUploadUrl,
  processMedia,
  getMediaInfo,
  deleteMedia,
  updateMedia
}; 