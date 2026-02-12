import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different markers
const expectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const actualIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface VerificationMapProps {
  expectedLatitude?: number | null;
  expectedLongitude?: number | null;
  actualLatitude?: number | null;
  actualLongitude?: number | null;
  submittedAddress?: string;
  distanceKm?: number | null;
  distanceFlagged?: boolean | null;
}

// Component to fit bounds when markers change
const FitBounds = ({ 
  expectedLatitude, 
  expectedLongitude, 
  actualLatitude, 
  actualLongitude 
}: { 
  expectedLatitude?: number | null;
  expectedLongitude?: number | null;
  actualLatitude?: number | null;
  actualLongitude?: number | null;
}) => {
  const map = useMap();

  useEffect(() => {
    const bounds: L.LatLngBoundsExpression = [];
    
    if (expectedLatitude && expectedLongitude) {
      bounds.push([expectedLatitude, expectedLongitude]);
    }
    if (actualLatitude && actualLongitude) {
      bounds.push([actualLatitude, actualLongitude]);
    }

    if (bounds.length === 2) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0] as L.LatLngExpression, 15);
    }
  }, [map, expectedLatitude, expectedLongitude, actualLatitude, actualLongitude]);

  return null;
};

const VerificationMap = ({
  expectedLatitude,
  expectedLongitude,
  actualLatitude,
  actualLongitude,
  submittedAddress,
  distanceKm,
  distanceFlagged
}: VerificationMapProps) => {
  const hasExpected = expectedLatitude != null && expectedLongitude != null;
  const hasActual = actualLatitude != null && actualLongitude != null;

  if (!hasExpected && !hasActual) {
    return (
      <div className="h-[300px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">No location data available</p>
      </div>
    );
  }

  // Default center - use expected if available, otherwise actual
  const center: [number, number] = hasExpected 
    ? [expectedLatitude!, expectedLongitude!]
    : [actualLatitude!, actualLongitude!];

  return (
    <div className="space-y-3">
      <div className="h-[300px] rounded-lg overflow-hidden border">
        <MapContainer
          center={center}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <FitBounds 
            expectedLatitude={expectedLatitude}
            expectedLongitude={expectedLongitude}
            actualLatitude={actualLatitude}
            actualLongitude={actualLongitude}
          />

          {hasExpected && (
            <Marker position={[expectedLatitude!, expectedLongitude!]} icon={expectedIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold" style={{ color: '#16a34a' }}>📍 Submitted Address</p>
                  {submittedAddress && <p className="mt-1">{submittedAddress}</p>}
                </div>
              </Popup>
            </Marker>
          )}

          {hasActual && (
            <Marker position={[actualLatitude!, actualLongitude!]} icon={actualIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold" style={{ color: distanceFlagged ? '#dc2626' : '#2563eb' }}>
                    📍 Actual GPS Location
                  </p>
                  {distanceKm != null && (
                    <p className="mt-1">
                      Distance: {distanceKm.toFixed(2)} km
                      {distanceFlagged && <span style={{ color: '#dc2626' }} className="ml-1">(Flagged)</span>}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {hasExpected && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-success" />
            <span>Submitted Address (Expected)</span>
          </div>
        )}
        {hasActual && (
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full ${distanceFlagged ? 'bg-destructive' : 'bg-primary'}`} />
            <span>Actual GPS Location {distanceFlagged && '(Flagged)'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificationMap;
