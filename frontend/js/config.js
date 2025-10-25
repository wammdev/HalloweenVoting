// API Configuration
// Update this with your ngrok URL when running the backend

// For local development
const LOCAL_API_URL = 'http://localhost:8000';

// For production (update with your ngrok URL)
// Example: const PRODUCTION_API_URL = 'https://abc123.ngrok.io';
const PRODUCTION_API_URL = 'https://highflying-camren-reserved.ngrok-free.dev';

// Automatically detect environment
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? LOCAL_API_URL
    : PRODUCTION_API_URL;

console.log('Using API URL:', API_BASE_URL);
