import { supabase } from '@/integrations/supabase/client';

interface GeocodeResult {
  latitude: number | null;
  longitude: number | null;
  display_name: string | null;
  error?: string;
}

export async function geocodeAddress(
  street: string,
  city: string,
  state: string,
  zip: string
): Promise<GeocodeResult> {
  try {
    const { data, error } = await supabase.functions.invoke('geocode-address', {
      body: { street, city, state, zip },
    });

    if (error) {
      console.error('Geocoding error:', error);
      return { latitude: null, longitude: null, display_name: null, error: error.message };
    }

    return data as GeocodeResult;
  } catch (err: any) {
    console.error('Geocoding error:', err);
    return { latitude: null, longitude: null, display_name: null, error: err.message };
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number | null): string {
  if (distanceKm === null) return 'Unknown';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}
