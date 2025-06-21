// API configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Authentication configuration
export const AUTH_TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY || 'auth_token';
export const USER_DATA_KEY = import.meta.env.VITE_USER_DATA_KEY || 'user_data';

// Application settings
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Proctoring & Test System';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

// Media settings
export const MEDIA_URL = `${API_BASE_URL}/media`;
export const DEFAULT_AVATAR = import.meta.env.VITE_DEFAULT_AVATAR || '/assets/default-avatar.png';

// Feature flags
export const FEATURES = {
    FACE_VERIFICATION: import.meta.env.VITE_FACE_VERIFICATION === 'true' || true,
    SCREEN_MONITORING: import.meta.env.VITE_SCREEN_MONITORING === 'true' || true,
    BEHAVIORAL_ANALYSIS: import.meta.env.VITE_BEHAVIORAL_ANALYSIS === 'true' || true
};

export const TEST_CONFIG = {
  MAX_WARNINGS: Number(import.meta.env.VITE_MAX_WARNINGS) || 3,
  WARNING_COOLDOWN: Number(import.meta.env.VITE_WARNING_COOLDOWN) || 30000, // 30 seconds
  FACE_DETECTION_INTERVAL: Number(import.meta.env.VITE_FACE_DETECTION_INTERVAL) || 1000, // 1 second
};

export const PROCTORING_CONFIG = {
  FACE_DETECTION: {
    CONFIDENCE_THRESHOLD: Number(import.meta.env.VITE_CONFIDENCE_THRESHOLD) || 0.8,
    MIN_FACE_SIZE: Number(import.meta.env.VITE_MIN_FACE_SIZE) || 100,
    MAX_FACE_SIZE: Number(import.meta.env.VITE_MAX_FACE_SIZE) || 400
  },
}; 