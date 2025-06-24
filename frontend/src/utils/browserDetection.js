/**
 * Browser Detection Utility
 * Comprehensive browser detection with support for Brave, Chrome, Firefox, Edge, Safari, etc.
 */

/**
 * Detect browser information including name, version, and capabilities
 * Simple and reliable browser detection
 * @returns {Object} Browser information object
 */
export const detectBrowser = () => {
    const userAgent = navigator.userAgent;
    const vendor = navigator.vendor || '';
    const opera = window.opera;
    
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';
    let isSupported = false;
    
    // Simple browser detection based on user agent and vendor
    // Check for Edge first (before Chrome, since Edge also contains "Chrome" in UA)
    if (userAgent.includes('Edg/') || userAgent.includes('Edge/')) {
        browserName = 'Edge';
        const match = userAgent.match(/(?:Edg|Edge)\/(\d+\.\d+)/);
        browserVersion = match ? match[1] : 'Unknown';
        isSupported = true;
    }
    // Check for Chrome (most common case)
    else if (userAgent.includes('Chrome') && !userAgent.includes('Edge') && !userAgent.includes('OPR')) {
        browserName = 'Chrome';
        const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
        browserVersion = match ? match[1] : 'Unknown';
        isSupported = true;
    }
    // Check for Firefox
    else if (userAgent.includes('Firefox')) {
        browserName = 'Firefox';
        const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
        browserVersion = match ? match[1] : 'Unknown';
        isSupported = true;
    }
    // Check for Safari
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        browserName = 'Safari';
        const match = userAgent.match(/Version\/(\d+\.\d+)/);
        browserVersion = match ? match[1] : 'Unknown';
        isSupported = false; // Safari has limitations with some proctoring features
    }
    // Check for Internet Explorer
    else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
        browserName = 'Internet Explorer';
        const match = userAgent.match(/(?:MSIE |rv:)(\d+\.\d+)/);
        browserVersion = match ? match[1] : 'Unknown';
        isSupported = false; // IE is not supported
    }
    // Check for Opera
    else if (!!opera || userAgent.includes('OPR')) {
        browserName = 'Opera';
        const match = userAgent.match(/(?:Opera|OPR)\/(\d+\.\d+)/);
        browserVersion = match ? match[1] : 'Unknown';
        isSupported = false; // Opera has limitations
    }
    // Check for Brave (only if explicitly mentioned in user agent)
    else if (userAgent.includes('Brave')) {
        browserName = 'Brave';
        const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
        browserVersion = match ? `Brave (Chromium ${match[1]})` : 'Unknown';
        isSupported = false; // Brave is not supported for proctoring
    }
    
    return {
        name: browserName,
        version: browserVersion,
        userAgent: userAgent,
        vendor: vendor,
        isSupported: isSupported,
        fullInfo: `${browserName} ${browserVersion}`
    };
};

/**
 * Check if browser supports required proctoring features
 * @returns {Object} Feature support information
 */
export const checkBrowserCapabilities = () => {
    const capabilities = {
        mediaDevices: 'mediaDevices' in navigator,
        getUserMedia: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
        fullscreenAPI: 'requestFullscreen' in document.documentElement || 
                      'webkitRequestFullscreen' in document.documentElement ||
                      'mozRequestFullScreen' in document.documentElement ||
                      'msRequestFullscreen' in document.documentElement,
        webcamSupport: false,
        microphoneSupport: false,
        screenCapture: 'getDisplayMedia' in navigator.mediaDevices || false,
        webGL: !!window.WebGLRenderingContext,
        localStorage: typeof(Storage) !== 'undefined',
        sessionStorage: typeof(Storage) !== 'undefined',
        canvas: !!document.createElement('canvas').getContext
    };
    
    // Test webcam support
    if (capabilities.getUserMedia) {
        navigator.mediaDevices.enumerateDevices().then(devices => {
            capabilities.webcamSupport = devices.some(device => device.kind === 'videoinput');
            capabilities.microphoneSupport = devices.some(device => device.kind === 'audioinput');
        }).catch(() => {
            capabilities.webcamSupport = false;
            capabilities.microphoneSupport = false;
        });
    }
    
    return capabilities;
};

/**
 * Get minimum browser version requirements
 * @returns {Object} Minimum version requirements
 */
export const getMinimumBrowserVersions = () => {
    return {
        Chrome: '80.0',
        Firefox: '75.0',
        Edge: '80.0',
        Safari: '13.0' // Even though Safari is not fully supported
    };
};

/**
 * Check if current browser version meets minimum requirements
 * @param {string} browserName 
 * @param {string} browserVersion 
 * @returns {boolean}
 */
export const checkVersionCompatibility = (browserName, browserVersion) => {
    const minimumVersions = getMinimumBrowserVersions();
    const requiredVersion = minimumVersions[browserName];
    
    if (!requiredVersion) {
        return false; // Browser not in supported list
    }
    
    // Parse versions for comparison
    const parseVersion = (version) => {
        return version.split('.').map(num => parseInt(num, 10));
    };
    
    try {
        const currentVer = parseVersion(browserVersion);
        const requiredVer = parseVersion(requiredVersion);
        
        // Compare major version
        if (currentVer[0] > requiredVer[0]) return true;
        if (currentVer[0] < requiredVer[0]) return false;
        
        // Compare minor version if major versions are equal
        return currentVer[1] >= requiredVer[1];
    } catch (error) {
        console.error('Error comparing browser versions:', error);
        return false;
    }
};

/**
 * Get comprehensive browser compatibility report
 * @returns {Object} Complete compatibility report
 */
export const getBrowserCompatibilityReport = () => {
    const browserInfo = detectBrowser();
    const capabilities = checkBrowserCapabilities();
    const versionCheck = checkVersionCompatibility(browserInfo.name, browserInfo.version);
    
    const issues = [];
    const warnings = [];
    
    // Check for critical browser compatibility issues
    if (browserInfo.name === 'Safari') {
        issues.push('Safari has limited support for proctoring features. Some monitoring capabilities may not work properly');
    }
    
    if (browserInfo.name === 'Internet Explorer') {
        issues.push('Internet Explorer is not supported. Please use a modern browser (Chrome, Firefox, or Edge)');
    }
    
    if (browserInfo.name === 'Opera') {
        warnings.push('Opera browser may have compatibility issues with some proctoring features');
    }
    
    if (browserInfo.name === 'Brave') {
        issues.push('Brave browser is not supported for proctored tests due to privacy features that may interfere with monitoring');
    }
    
    // Check if browser is in the supported list
    if (!browserInfo.isSupported) {
        issues.push(`${browserInfo.name} is not a supported browser for proctoring. Please use Chrome, Firefox, or Edge`);
    }
    
    // Check version compatibility for supported browsers
    if (!versionCheck && browserInfo.isSupported) {
        issues.push(`${browserInfo.name} version ${browserInfo.version} may be outdated. Please update to the latest version for optimal performance`);
    }
    
    // Check essential capabilities
    if (!capabilities.getUserMedia) {
        issues.push('Your browser does not support camera and microphone access, which is required for proctoring');
    }
    
    if (!capabilities.fullscreenAPI) {
        warnings.push('Fullscreen API may not be fully supported, which could affect test security features');
    }
    
    if (!capabilities.webGL) {
        warnings.push('WebGL is not supported, which may affect some visual monitoring features');
    }
    
    if (!capabilities.localStorage) {
        warnings.push('Local storage is not supported, which may affect session management');
    }
    
    // Overall compatibility status
    const isCompatible = browserInfo.isSupported && 
                        versionCheck && 
                        capabilities.getUserMedia && 
                        issues.length === 0;
    
    return {
        browser: browserInfo,
        capabilities: capabilities,
        versionCheck: versionCheck,
        isCompatible: isCompatible,
        issues: issues,
        warnings: warnings,
        recommendation: isCompatible 
            ? 'Your browser is fully compatible with the proctoring system'
            : 'Please use Chrome, Firefox, or Edge (latest version) for the best proctoring experience'
    };
};

/**
 * Generate user-friendly browser compatibility message
 * @returns {Object} Message with type and text
 */
export const getBrowserCompatibilityMessage = () => {
    const report = getBrowserCompatibilityReport();
    
    if (report.isCompatible) {
        return {
            type: 'success',
            title: 'Browser Compatible',
            message: 'Your browser supports all required proctoring features.'
        };
    }
    
    if (report.issues.length > 0) {
        return {
            type: 'error',
            title: 'Browser Not Compatible',
            message: report.issues[0], // Show the first critical issue
            allIssues: report.issues,
            recommendation: report.recommendation
        };
    }
    
    if (report.warnings.length > 0) {
        return {
            type: 'warning',
            title: 'Browser Compatibility Warning',
            message: report.warnings[0],
            allWarnings: report.warnings
        };
    }
    
    return {
        type: 'info',
        title: 'Browser Check Complete',
        message: 'Browser compatibility checked successfully.'
    };
};
