import axios from 'axios';

/**
 * Geocode an address using OpenStreetMap Nominatim (free service)
 */
export const geocodeAddress = async (street: string, city: string, state: string, zip: string) => {
  try {
    const address = `${street}, ${city}, ${state} ${zip}`;
    const encodedAddress = encodeURIComponent(address);
    
    const url = `${process.env.VITE_GEOCODING_SERVICE_URL || 'https://nominatim.openstreetmap.org/search'}?q=${encodedAddress}&format=json&limit=1`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': process.env.VITE_GEOCODING_USER_AGENT || 'NovusGuard-AddressVerification/1.0',
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

  } catch (error: any) {
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
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100;
};

/**
 * Convert degrees to radians
 */
const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Format distance in kilometers to a readable string
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted distance string (e.g., "1.5 km", "500 m")
 */
export const formatDistance = (distanceKm: number | null | undefined): string => {
  if (distanceKm == null) return 'Unknown';
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(2)} km`;
};

/**
 * Check if current time is within verification window.
 *
 * @param {string} windowStart   - "HH:MM" (24-hour)
 * @param {string} windowEnd     - "HH:MM" (24-hour)
 * @param {string|null} clientTime - Employee's local time as "HH:MM", sent from
 *   the browser. The backend server runs in UTC; employees are in Nigeria (WAT,
 *   UTC+1). Passing the browser's local time avoids a 1-hour offset that causes
 *   the window check to fail. Falls back to server time only if not provided.
 */
export const isWithinVerificationWindow = (windowStart: string, windowEnd: string, clientTime: string | null = null): boolean => {
  let currentTime: string;

  if (clientTime && /^\d{2}:\d{2}$/.test(clientTime)) {
    currentTime = clientTime;
  } else {
    const now = new Date();
    currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  // Handle overnight windows (e.g., 22:00 - 04:00)
  if (windowStart > windowEnd) {
    return currentTime >= windowStart || currentTime <= windowEnd;
  }

  return currentTime >= windowStart && currentTime <= windowEnd;
};