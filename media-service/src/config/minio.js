const Minio = require('minio');
const dotenv = require('dotenv');

dotenv.config();

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: parseInt(process.env.MINIO_PORT, 10) || 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});


// Bucket names
const BUCKETS = {
  VIDEOS: 'videos',
  IMAGES: 'images',
  THUMBNAILS: 'thumbnails',
  AVATARS: 'avatars'
};

// Initialize buckets
const initializeBuckets = async () => {
  try {
    for (const bucket of Object.values(BUCKETS)) {
      const exists = await minioClient.bucketExists(bucket);
      if (!exists) {
        await minioClient.makeBucket(bucket, 'us-east-1');
        console.log(`Created bucket: ${bucket}`);
      }
    }
  } catch (error) {
    console.error('Error initializing buckets:', error);
    throw error;
  }
};

// Generate presigned URL for upload
const getPresignedUrl = async (bucket, objectName, expiry = 3600) => {
  try {
    return await minioClient.presignedPutObject(bucket, objectName, expiry);
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
};

// Generate presigned URL for download
const getPresignedDownloadUrl = async (bucket, objectName, expiry = 3600) => {
  try {
    return await minioClient.presignedGetObject(bucket, objectName, expiry);
  } catch (error) {
    console.error('Error generating presigned download URL:', error);
    throw error;
  }
};

// Delete object
const deleteObject = async (bucket, objectName) => {
  try {
    await minioClient.removeObject(bucket, objectName);
  } catch (error) {
    console.error('Error deleting object:', error);
    throw error;
  }
};

// List objects in bucket
const listObjects = async (bucket, prefix = '') => {
  try {
    const objects = [];
    const stream = minioClient.listObjects(bucket, prefix, true);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (obj) => objects.push(obj));
      stream.on('end', () => resolve(objects));
      stream.on('error', (err) => reject(err));
    });
  } catch (error) {
    console.error('Error listing objects:', error);
    throw error;
  }
};

module.exports = {
  minioClient,
  BUCKETS,
  initializeBuckets,
  getPresignedUrl,
  getPresignedDownloadUrl,
  deleteObject,
  listObjects
}; 