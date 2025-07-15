/**
 * Keyboard Shortcuts Blocking Feature Module
 * 
 * This module handles keyboard shortcuts blocking and violation logging.
 * It can be used independently in other applications.
 * 
 * Dependencies:
 * - React
 * - API service
 * 
 * Usage:
 *   import { useKeyboardShortcutsBlocking, KeyboardShortcutsWarning } from './features/proctoring/keyboard_shortcuts_blocking';
 *   
 *   // Use the hook in a component
 *   const { isBlocked, violations, logViolation } = useKeyboardShortcutsBlocking(sessionId);
 *   
 *   // Display warning component
 *   <KeyboardShortcutsWarning isBlocked={isBlocked} />
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api/api';

// List of restricted keyboard shortcuts
const RESTRICTED_SHORTCUTS = [
    'Ctrl+C', 'Ctrl+V', 'Ctrl+X', 'Ctrl+A', 'Ctrl+Z', 'Ctrl+Y',
    'Alt+Tab', 'Alt+F4', 'F5', 'F11', 'F12',
    'Ctrl+Shift+I', 'Ctrl+Shift+J', 'Ctrl+Shift+C',
    'Ctrl+U', 'Ctrl+S', 'Ctrl+P', 'Ctrl+O', 'Ctrl+N',
    'PrintScreen', 'PrtScn'
];

/**
 * Hook for monitoring keyboard shortcuts blocking
 * @param {number} sessionId - The test session ID
 * @returns {object} - Keyboard shortcuts blocking monitoring state and functions
 */
export const useKeyboardShortcutsBlocking = (sessionId) => {
    const [isBlocked, setIsBlocked] = useState(false);
    const [violations, setViolations] = useState([]);
    const [lastViolation, setLastViolation] = useState(null);
    const [isMonitoring, setIsMonitoring] = useState(false);

    // Check if a key combination is restricted
    const isRestrictedShortcut = useCallback((event) => {
        const keys = [];
        
        if (event.ctrlKey) keys.push('Ctrl');
        if (event.altKey) keys.push('Alt');
        if (event.shiftKey) keys.push('Shift');
        if (event.metaKey) keys.push('Meta');
        
        if (event.key && event.key !== 'Control' && event.key !== 'Alt' && event.key !== 'Shift' && event.key !== 'Meta') {
            keys.push(event.key.toUpperCase());
        }
        
        const combination = keys.join('+');
        return RESTRICTED_SHORTCUTS.includes(combination);
    }, []);

    // Log a keyboard shortcut violation
    const logViolation = useCallback(async (keyCombination, screenshotPath = null, additionalInfo = null) => {
        try {
            const response = await api.post('/api/proctoring/keyboard-shortcuts/violation', {
                session_id: sessionId,
                key_combination: keyCombination,
                screenshot_path: screenshotPath,
                additional_info: additionalInfo
            });
            
            setLastViolation(response.data);
            setViolations(prev => [response.data, ...prev]);
            
            console.warn('Keyboard shortcut violation logged:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error logging keyboard shortcut violation:', error);
            throw error;
        }
    }, [sessionId]);

    // Get session violations
    const getViolations = useCallback(async () => {
        try {
            const response = await api.get(`/api/proctoring/keyboard-shortcuts/session/${sessionId}/violations`);
            setViolations(response.data);
            return response.data;
        } catch (error) {
            console.error('Error getting keyboard shortcut violations:', error);
            throw error;
        }
    }, [sessionId]);

    // Get keyboard shortcuts status
    const getStatus = useCallback(async () => {
        try {
            const response = await api.get(`/api/proctoring/keyboard-shortcuts/session/${sessionId}/status`);
            setIsBlocked(response.data.is_blocked);
            setLastViolation(response.data.last_violation);
            return response.data;
        } catch (error) {
            console.error('Error getting keyboard shortcuts status:', error);
            throw error;
        }
    }, [sessionId]);

    // Start monitoring keyboard shortcuts
    const startMonitoring = useCallback(() => {
        setIsMonitoring(true);
        
        // Handle keyboard events
        const handleKeyDown = (event) => {
            if (isRestrictedShortcut(event)) {
                event.preventDefault();
                event.stopPropagation();
                
                const keys = [];
                if (event.ctrlKey) keys.push('Ctrl');
                if (event.altKey) keys.push('Alt');
                if (event.shiftKey) keys.push('Shift');
                if (event.metaKey) keys.push('Meta');
                if (event.key && event.key !== 'Control' && event.key !== 'Alt' && event.key !== 'Shift' && event.key !== 'Meta') {
                    keys.push(event.key.toUpperCase());
                }
                
                const combination = keys.join('+');
                logViolation(combination, null, 'Restricted keyboard shortcut detected');
                
                // Show visual feedback
                setIsBlocked(true);
                setTimeout(() => setIsBlocked(false), 2000);
            }
        };

        // Add event listeners
        document.addEventListener('keydown', handleKeyDown, true);

        // Return cleanup function
        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [isRestrictedShortcut, logViolation]);

    // Stop monitoring
    const stopMonitoring = useCallback(() => {
        setIsMonitoring(false);
    }, []);

    // Initialize monitoring when sessionId changes
    useEffect(() => {
        if (sessionId && !isMonitoring) {
            const cleanup = startMonitoring();
            return cleanup;
        }
    }, [sessionId, isMonitoring, startMonitoring]);

    // Get initial status
    useEffect(() => {
        if (sessionId) {
            getStatus();
            getViolations();
        }
    }, [sessionId, getStatus, getViolations]);

    return {
        isBlocked,
        violations,
        lastViolation,
        isMonitoring,
        logViolation,
        getViolations,
        getStatus,
        startMonitoring,
        stopMonitoring,
        isRestrictedShortcut
    };
};

/**
 * Keyboard Shortcuts Warning Component
 * @param {object} props - Component props
 * @param {boolean} props.isBlocked - Whether a shortcut was recently blocked
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} - Warning component
 */
export const KeyboardShortcutsWarning = ({ isBlocked, className = '' }) => {
    if (!isBlocked) return null;

    return (
        <div className={`fixed top-4 right-1/2 transform translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 ${className}`}>
            <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">Keyboard Shortcut Blocked!</span>
            </div>
            <p className="text-sm mt-1">This keyboard shortcut is not allowed during the test.</p>
        </div>
    );
};

/**
 * Keyboard Shortcuts Status Component
 * @param {object} props - Component props
 * @param {boolean} props.isBlocked - Whether shortcuts are currently blocked
 * @param {number} props.violationCount - Number of violations
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} - Status component
 */
export const KeyboardShortcutsStatus = ({ isBlocked, violationCount = 0, className = '' }) => {
    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            <div className={`w-3 h-3 rounded-full ${!isBlocked ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
                Keyboard Shortcuts: {isBlocked ? 'Blocked' : 'Allowed'}
            </span>
            {violationCount > 0 && (
                <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                    {violationCount} blocked
                </span>
            )}
        </div>
    );
};

// Export all components and hooks
export default {
    useKeyboardShortcutsBlocking,
    KeyboardShortcutsWarning,
    KeyboardShortcutsStatus,
    RESTRICTED_SHORTCUTS
}; 