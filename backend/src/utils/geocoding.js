const axios = require('axios');

/**
 * Geocode an address using OpenStreetMap Nominatim (free service)
 */
const geocodeAddress = async (street, city, state, zip) => {
  try {
    const address = `${street}, ${city}, ${state} ${zip}`;
    const encodedAddress = encodeURIComponent(address);
    
    const url = `${process.env.GEOCODING_SERVICE_URL || 'https://nominatim.openstreetmap.org/search'}?q=${encodedAddress}&format=json&limit=1`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': process.env.GEOCODING_USER_AGENT || 'NovusGuard-AddressVerification/1.0',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    if (!response.data || response.data.length === 0) {
      return {
        latitude: null,
        longitude: null,
        displayName: null,
        error: 'Address not found'
      };
    }

    const result = response.data[0];

    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
      error: null
    };

  } catch (error) {
    console.error('Geocoding error:', error.message);
    return {
      latitude: null,
      longitude: null,
      displayName: null,
      error: error.message
    };
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Convert degrees to radians
 */
const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Check if current time is within verification window
 */
const isWithinVerificationWindow = (windowStart, windowEnd) => {
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  // Handle overnight windows (e.g., 22:00 - 04:00)
  if (windowStart > windowEnd) {
    return currentTime >= windowStart || currentTime <= windowEnd;
  }
  
  return currentTime >= windowStart && currentTime <= windowEnd;
};

module.exports = {
  geocodeAddress,
  calculateDistance,
  isWithinVerificationWindow
};