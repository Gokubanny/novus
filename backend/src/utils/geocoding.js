const axios = require('axios');

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
      return { latitude: null, longitude: null, displayName: null, error: 'Address not found' };
    }
    const result = response.data[0];
    return { latitude: parseFloat(result.lat), longitude: parseFloat(result.lon), displayName: result.display_name, error: null };
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return { latitude: null, longitude: null, displayName: null, error: error.message };
  }
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

const toRad = (degrees) => degrees * (Math.PI / 180);

const isWithinVerificationWindow = (windowStart, windowEnd, clientTime = null) => {
  let currentTime;
  if (clientTime && /^\d{2}:\d{2}$/.test(clientTime)) {
    currentTime = clientTime;
  } else {
    const now = new Date();
    currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }
  if (windowStart > windowEnd) {
    return currentTime >= windowStart || currentTime <= windowEnd;
  }
  return currentTime >= windowStart && currentTime <= windowEnd;
};

/**
 * Format a distance in kilometres into a human-readable string.
 * Used by EmployeeDetail.tsx to display GPS distance results.
 *
 * Examples:
 *   0.08  → "80 m"
 *   0.5   → "500 m"
 *   1.2   → "1.2 km"
 */
export const formatDistance = (distanceKm: number | null | undefined): string => {
  if (distanceKm === null || distanceKm === undefined) return 'Unknown';
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
};

module.exports = {
  geocodeAddress,
  calculateDistance,
  isWithinVerificationWindow,
  formatDistance
};