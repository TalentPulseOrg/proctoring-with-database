// Error handling utilities for the frontend

// Custom error class for API errors
export class APIError extends Error {
    constructor(message, code, additionalInfo = {}) {
        super(message);
        this.name = 'APIError';
        this.code = code;
        this.additionalInfo = additionalInfo;
    }
}

// Error codes mapping
export const ErrorCodes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTH_ERROR: 'AUTH_ERROR',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    SERVER_ERROR: 'SERVER_ERROR',
    EMPTY_FILE: 'EMPTY_FILE',
    INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
    SAVE_FAILED: 'SAVE_FAILED',
    UPLOAD_FAILED: 'UPLOAD_FAILED',
    ID_PHOTO_NOT_FOUND: 'ID_PHOTO_NOT_FOUND',
    VERIFICATION_FAILED: 'VERIFICATION_FAILED',
    LIVENESS_CHECK_FAILED: 'LIVENESS_CHECK_FAILED'
};

// User-friendly error messages
export const ErrorMessages = {
    [ErrorCodes.VALIDATION_ERROR]: 'Please check your input and try again',
    [ErrorCodes.AUTH_ERROR]: 'Authentication failed. Please try logging in again',
    [ErrorCodes.FORBIDDEN]: 'You do not have permission to perform this action',
    [ErrorCodes.NOT_FOUND]: 'The requested resource was not found',
    [ErrorCodes.SERVER_ERROR]: 'An unexpected error occurred. Please try again later',
    [ErrorCodes.EMPTY_FILE]: 'Please select a file to upload',
    [ErrorCodes.INVALID_FILE_TYPE]: 'Please upload a valid image file',
    [ErrorCodes.SAVE_FAILED]: 'Failed to save the file. Please try again',
    [ErrorCodes.UPLOAD_FAILED]: 'Failed to upload the file. Please try again',
    [ErrorCodes.ID_PHOTO_NOT_FOUND]: 'ID photo not found. Please upload your ID photo first',
    [ErrorCodes.VERIFICATION_FAILED]: 'Face verification failed. Please try again',
    [ErrorCodes.LIVENESS_CHECK_FAILED]: 'Liveness check failed. Please ensure you are a real person'
};

// Function to handle API errors
export const handleAPIError = (error) => {
    if (error instanceof APIError) {
        return {
            message: ErrorMessages[error.code] || error.message,
            code: error.code,
            additionalInfo: error.additionalInfo
        };
    }

    // Handle network errors
    if (!error.response) {
        return {
            message: 'Network error. Please check your internet connection',
            code: 'NETWORK_ERROR'
        };
    }

    // Handle API response errors
    const { data } = error.response;
    if (data && data.error) {
        return {
            message: ErrorMessages[data.error.code] || data.error.message,
            code: data.error.code,
            additionalInfo: data.error.additional_info
        };
    }

    // Handle unknown errors
    return {
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR'
    };
};

// Function to handle file validation
export const validateFile = (file, allowedTypes = ['image/jpeg', 'image/png']) => {
    if (!file) {
        throw new APIError('No file selected', ErrorCodes.EMPTY_FILE);
    }

    if (!allowedTypes.includes(file.type)) {
        throw new APIError('Invalid file type', ErrorCodes.INVALID_FILE_TYPE);
    }

    return true;
};

// Function to handle API response
export const handleAPIResponse = (response) => {
    if (response.data && response.data.error) {
        throw new APIError(
            response.data.error.message,
            response.data.error.code,
            response.data.error.additional_info
        );
    }
    return response.data;
}; 