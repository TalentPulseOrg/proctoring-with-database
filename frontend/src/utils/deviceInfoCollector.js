/**
 * Device Information Collector for Proctor Permission Logs
 * Collects browser, OS, time, and location information
 */

// Helper function to get browser name and version from user agent
const getBrowserInfo = () => {
  const userAgent = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';

  // Chrome
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browserName = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
    if (match) browserVersion = match[1];
  }
  // Firefox
  else if (userAgent.includes('Firefox')) {
    browserName = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  }
  // Safari
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserName = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  }
  // Edge
  else if (userAgent.includes('Edg')) {
    browserName = 'Edge';
    const match = userAgent.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/);
    if (match) browserVersion = match[1];
  }

  return { browserName, browserVersion };
};

// Helper function to get OS information
const getOSInfo = () => {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  let osName = 'Unknown';
  let osVersion = 'Unknown';
  let architecture = 'Unknown';

  // Windows
  if (userAgent.includes('Windows')) {
    osName = 'Windows';
    const match = userAgent.match(/Windows NT (\d+\.\d+)/);
    if (match) {
      const version = match[1];
      if (version === '10.0') osVersion = '10';
      else if (version === '6.3') osVersion = '8.1';
      else if (version === '6.2') osVersion = '8';
      else if (version === '6.1') osVersion = '7';
      else osVersion = version;
    }
    architecture = userAgent.includes('WOW64') || userAgent.includes('Win64') ? 'x64' : 'x86';
  }
  // macOS
  else if (userAgent.includes('Mac OS X')) {
    osName = 'macOS';
    const match = userAgent.match(/Mac OS X (\d+_\d+)/);
    if (match) {
      const version = match[1].replace('_', '.');
      osVersion = version;
    }
    architecture = userAgent.includes('Intel') ? 'x64' : 'ARM64';
  }
  // Linux
  else if (userAgent.includes('Linux')) {
    osName = 'Linux';
    osVersion = 'Unknown';
    architecture = userAgent.includes('x86_64') ? 'x64' : 'Unknown';
  }
  // iOS
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    osName = 'iOS';
    const match = userAgent.match(/OS (\d+_\d+)/);
    if (match) {
      const version = match[1].replace('_', '.');
      osVersion = version;
    }
    architecture = 'ARM64';
  }
  // Android
  else if (userAgent.includes('Android')) {
    osName = 'Android';
    const match = userAgent.match(/Android (\d+\.\d+)/);
    if (match) osVersion = match[1];
    architecture = 'ARM64';
  }

  return { osName, osVersion, architecture };
};

// Helper function to get time information in IST
const getTimeInfo = () => {
  const now = new Date();
  
  // Convert to IST (UTC+5:30)
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  
  return {
    timezone: 'IST (UTC+5:30)',
    currentTime: istTime.toISOString(),
    localTime: istTime.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  };
};

// Helper function to reverse geocode coordinates to get city and country
const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }
    
    const data = await response.json();
    
    if (data.address) {
      return {
        city: data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown',
        country: data.address.country || 'Unknown',
        state: data.address.state || 'Unknown'
      };
    }
    
    return { city: 'Unknown', country: 'Unknown', state: 'Unknown' };
  } catch (error) {
    console.warn('Reverse geocoding failed:', error);
    return { city: 'Unknown', country: 'Unknown', state: 'Unknown' };
  }
};

// Helper function to get location information (with user consent)
const getLocationInfo = async () => {
  if (!navigator.geolocation) {
    return { error: 'Geolocation not supported' };
  }

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 5000,
        enableHighAccuracy: false,
        maximumAge: 60000 // Cache for 1 minute
      });
    });

    // Get reverse geocoded location data
    const locationData = await reverseGeocode(
      position.coords.latitude, 
      position.coords.longitude
    );

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      city: locationData.city,
      country: locationData.country,
      state: locationData.state
    };
  } catch (error) {
    return { error: error.message };
  }
};

/**
 * Collect comprehensive device information
 * @param {boolean} includeLocation - Whether to include location data (requires user consent)
 * @returns {Object} Device information object
 */
export const collectDeviceInfo = async (includeLocation = true) => {
  const browserInfo = getBrowserInfo();
  const osInfo = getOSInfo();
  const timeInfo = getTimeInfo();

  const deviceInfo = {
    browser: {
      platform: navigator.platform,
      browserName: browserInfo.browserName,
      browserVersion: browserInfo.browserVersion
    },
    os: {
      name: osInfo.osName,
      version: osInfo.osVersion,
      architecture: osInfo.architecture
    },
    time: {
      timezone: timeInfo.timezone,
      currentTime: timeInfo.currentTime,
      localTime: timeInfo.localTime
    }
  };

  // Always try to get location data
  try {
    const locationInfo = await getLocationInfo();
    if (!locationInfo.error) {
      deviceInfo.location = {
        latitude: locationInfo.latitude,
        longitude: locationInfo.longitude,
        accuracy: locationInfo.accuracy,
        city: locationInfo.city,
        country: locationInfo.country,
        state: locationInfo.state
      };
    } else {
      deviceInfo.location = { 
        error: locationInfo.error,
        city: 'Location not available',
        country: 'Location not available'
      };
    }
  } catch (error) {
    deviceInfo.location = { 
      error: 'Location collection failed',
      city: 'Location not available',
      country: 'Location not available'
    };
  }

  return deviceInfo;
};

/**
 * Collect device info without location (for immediate use)
 * @returns {Object} Device information object without location
 */
export const collectDeviceInfoSync = () => {
  const browserInfo = getBrowserInfo();
  const osInfo = getOSInfo();
  const timeInfo = getTimeInfo();

  return {
    browser: {
      platform: navigator.platform,
      browserName: browserInfo.browserName,
      browserVersion: browserInfo.browserVersion
    },
    os: {
      name: osInfo.osName,
      version: osInfo.osVersion,
      architecture: osInfo.architecture
    },
    time: {
      timezone: timeInfo.timezone,
      currentTime: timeInfo.currentTime,
      localTime: timeInfo.localTime
    },
    location: {
      city: 'Location not available',
      country: 'Location not available'
    }
  };
}; 