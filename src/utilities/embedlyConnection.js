import axios from 'axios';
import { 
    EMBEDLY_API_KEY, 
    EMBEDLY_BASE_URL, 
    EMBEDLY_STAGING_KEY,
    EMBEDLY_ORGANIZATION_ID,
    EMBEDLY_NIN_KYC_KEY 
} from '../config/env.js';

// Create Embedly API instance
export const embedlyAPI = axios.create({
    baseURL: EMBEDLY_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'API-KEY': process.env.NODE_ENV === 'production' ? EMBEDLY_API_KEY : EMBEDLY_STAGING_KEY
    }
});

// Create separate instance for NIN KYC operations
export const embedlyKYCAPI = axios.create({
    baseURL: EMBEDLY_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'API-KEY': EMBEDLY_NIN_KYC_KEY
    }
});

// Add request interceptor for logging
embedlyAPI.interceptors.request.use(
    (config) => {
        console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`);
        return config;
    },
    (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
embedlyAPI.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        console.error('API Error:', error.response?.data || error.message);
        
        // Handle common Embedly API errors
        if (error.response?.status === 401) {
            throw new Error('Invalid API key or authentication failed');
        } else if (error.response?.status === 404) {
            throw new Error('Requested resource not found');
        } else if (error.response?.status >= 500) {
            throw new Error('Server error occurred. Please try again later');
        }
        
        throw error;
    }
);

// Apply same interceptors to KYC API
embedlyKYCAPI.interceptors.request.use(embedlyAPI.interceptors.request.handlers[0].fulfilled);
embedlyKYCAPI.interceptors.response.use(
    embedlyAPI.interceptors.response.handlers[0].fulfilled,
    embedlyAPI.interceptors.response.handlers[0].rejected
);

export { EMBEDLY_ORGANIZATION_ID };