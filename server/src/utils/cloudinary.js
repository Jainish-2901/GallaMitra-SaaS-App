import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dmhk8m7sa',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Extracts public_id from Cloudinary URL
 * @param {string} url - The Cloudinary asset URL
 * @returns {string|null} - The public_id of the asset or null if not valid
 */
export const extractPublicId = (url) => {
  if (!url) return null;
  // Format: https://res.cloudinary.com/cloud_name/image/upload/v123456789/folder/public_id.jpg
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex === -1) return null;
  
  let remainingParts = parts.slice(uploadIndex + 1);
  if (remainingParts[0] && /^v\d+$/.test(remainingParts[0])) {
    remainingParts = remainingParts.slice(1);
  }
  
  const publicIdWithExtension = remainingParts.join('/');
  const lastDotIndex = publicIdWithExtension.lastIndexOf('.');
  if (lastDotIndex === -1) return publicIdWithExtension;
  return publicIdWithExtension.substring(0, lastDotIndex);
};

/**
 * Detects the resource_type of an asset based on Cloudinary folder path structure
 * @param {string} url - The Cloudinary asset URL
 * @returns {string} - The resource type ('image', 'raw', 'video')
 */
export const getResourceType = (url) => {
  if (!url) return 'image';
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex > 0) {
    const type = parts[uploadIndex - 1];
    if (['image', 'raw', 'video'].includes(type)) {
      return type;
    }
  }
  return 'image';
};

/**
 * Delete an asset from Cloudinary storage
 * @param {string} url - The Cloudinary asset URL
 * @returns {Promise<any>}
 */
export const deleteFromCloudinary = async (url) => {
  if (!url) return null;
  
  // Exclude placeholder, local or non-Cloudinary URLs
  if (!url.includes('cloudinary.com')) return null;

  try {
    const publicId = extractPublicId(url);
    const resourceType = getResourceType(url);
    if (!publicId) return null;

    console.log(`[Cloudinary] Deleting asset: publicId=${publicId}, resourceType=${resourceType}`);
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true
    });
    console.log('[Cloudinary] Deletion result:', result);
    return result;
  } catch (error) {
    console.error('[Cloudinary] Deletion error:', error);
    throw error;
  }
};
