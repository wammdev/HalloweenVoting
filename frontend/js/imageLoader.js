// Image Loader Utility
// Fetches images with proper headers to bypass ngrok warning page

/**
 * Load an image from the API with proper headers
 * @param {string} url - The image URL (should include API_BASE_URL)
 * @returns {Promise<string>} - Object URL that can be used in img src
 */
async function loadImageWithHeaders(url) {
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
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Error loading image:', error);
        // Return a placeholder or empty data URL
        return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" fill="%23999" font-size="12"%3EImage Error%3C/text%3E%3C/svg%3E';
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
