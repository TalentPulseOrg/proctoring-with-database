import { API_BASE_URL } from '../config';

/**
 * Convert a database image path to a full URL that can be used in the frontend
 * 
 * @param {string} imagePath - The image path from the database (could be URL path or filesystem path)
 * @returns {string} Full URL to the image
 */
export const getImageUrl = (imagePath) => {
    if (!imagePath) {
        return null;
    }
    
    // If it's already a full URL (starts with http or https), return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    
    // If it's a URL path starting with /media, convert to full URL
    if (imagePath.startsWith('/media/')) {
        // Use the file endpoint to serve the file
        const relativePath = imagePath.replace('/media/', '');
        return `${API_BASE_URL}/api/media/file/${relativePath}`;
    }
    
    // If it has media/ without the leading slash
    if (imagePath.startsWith('media/')) {
        const relativePath = imagePath.replace('media/', '');
        return `${API_BASE_URL}/api/media/file/${relativePath}`;
    }
    
    // If it's a filepath that contains specific directories we know about
    const knownDirs = ['id_photos', 'webcam_photos', 'screenshots', 'suspicious_snapshots'];
    for (const dir of knownDirs) {
        if (imagePath.includes(dir)) {
            // Extract the relevant part of the path
            const parts = imagePath.split(dir);
            const relativePath = dir + parts[1].replace(/\\/g, '/');
            return `${API_BASE_URL}/api/media/file/${relativePath}`;
        }
    }
    
    // If it's just a filename, assume it's in the media root
    if (!imagePath.includes('/') && !imagePath.includes('\\')) {
        return `${API_BASE_URL}/api/media/file/${imagePath}`;
    }
    
    // Default: Try to use the path as is with the media API
    return `${API_BASE_URL}/api/media/file/${imagePath.replace(/\\/g, '/')}`;
};

/**
 * Check if an image URL is valid and exists
 * 
 * @param {string} url - The image URL to check
 * @returns {Promise<boolean>} True if the image exists and is accessible
 */
export const checkImageExists = async (url) => {
    if (!url) return false;
    
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        console.error('Error checking image URL:', error);
        return false;
    }
};

/**
 * Get a placeholder image URL when the actual image is not available
 * 
 * @param {string} type - The type of placeholder (profile, screenshot, etc.)
 * @returns {string} URL to a placeholder image
 */
export const getPlaceholderImage = (type) => {
    const placeholders = {
        profile: '/assets/placeholder-profile.png',
        screenshot: '/assets/placeholder-screenshot.png',
        webcam: '/assets/placeholder-webcam.png',
        default: '/assets/placeholder-image.png'
    };
    
    return placeholders[type] || placeholders.default;
}; 