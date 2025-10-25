// Image Loader Utility
// Fetches images with proper headers to bypass ngrok warning page

// Cache for blob URLs to avoid re-fetching images
const imageCache = new Map();

/**
 * Load an image from the API with proper headers (with caching)
 * @param {string} url - The image URL (should include API_BASE_URL)
 * @returns {Promise<string>} - Object URL that can be used in img src
 */
async function loadImageWithHeaders(url) {
    // Check if image is already cached
    if (imageCache.has(url)) {
        return imageCache.get(url);
    }

    try {
        const response = await fetch(url, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load image: ${response.status}`);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        // Cache the blob URL for future use
        imageCache.set(url, blobUrl);

        return blobUrl;
    } catch (error) {
        console.error('Error loading image:', error);
        // Return a placeholder or empty data URL
        const errorUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" fill="%23999" font-size="12"%3EImage Error%3C/text%3E%3C/svg%3E';
        imageCache.set(url, errorUrl); // Cache error state too
        return errorUrl;
    }
}

/**
 * Load multiple images in parallel
 * @param {Array<string>} urls - Array of image URLs
 * @returns {Promise<Array<string>>} - Array of object URLs
 */
async function loadImagesWithHeaders(urls) {
    return Promise.all(urls.map(url => loadImageWithHeaders(url)));
}

/**
 * Create an img element with loaded blob URL
 * @param {string} url - The image URL
 * @param {string} alt - Alt text for the image
 * @param {string} className - Optional CSS class
 * @returns {Promise<HTMLImageElement>} - Image element with loaded src
 */
async function createImageElement(url, alt = '', className = '') {
    const img = document.createElement('img');
    img.alt = alt;
    if (className) {
        img.className = className;
    }

    // Show loading state
    img.style.opacity = '0.5';
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%232a2a2a" width="100" height="100"/%3E%3C/svg%3E';

    // Load the actual image
    const blobUrl = await loadImageWithHeaders(url);
    img.src = blobUrl;
    img.style.opacity = '1';

    return img;
}

/**
 * Preload images in the background to cache them
 * @param {Array<string>} urls - Array of image URLs to preload
 * @returns {Promise<void>}
 */
async function preloadImages(urls) {
    // Load all images in parallel without blocking
    const promises = urls.map(url =>
        loadImageWithHeaders(url).catch(err => {
            console.warn('Failed to preload image:', url, err);
        })
    );
    await Promise.all(promises);
}

/**
 * Clear the image cache (useful for testing or memory management)
 */
function clearImageCache() {
    // Revoke all blob URLs to free memory
    imageCache.forEach(url => {
        if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    });
    imageCache.clear();
}
