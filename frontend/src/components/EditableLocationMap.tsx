import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useLoadScript } from '@react-google-maps/api';

interface EditableLocationMapProps {
  initialPosition: { lat: number; lng: number } | null;
  onPositionChange: (position: { lat: number; lng: number }) => void;
  onGeocodeResult?: (result: {
    mainStreet?: string;
    primaryCrossStreet?: string;
    secondaryCrossStreet?: string;
    fullAddress: string;
  }) => void;
  apiKey: string;
  height?: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

const mapOptions = {
  zoom: 16,
  mapId: 'DEMO_MAP_ID', // Required for AdvancedMarkerElement
  // Note: styles are controlled via cloud console when mapId is present
};

// Move libraries array outside component to prevent unnecessary reloads
const libraries: ('marker')[] = ['marker'];

function MapContent({
  position,
  onPositionChange,
  onGeocodeResult,
  map,
}: {
  position: { lat: number; lng: number };
  onPositionChange: (pos: { lat: number; lng: number }) => void;
  onGeocodeResult?: (result: {
    mainStreet?: string;
    primaryCrossStreet?: string;
    secondaryCrossStreet?: string;
    fullAddress: string;
  }) => void;
  map: google.maps.Map | null;
}) {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodedAddress, setGeocodedAddress] = useState<string>('');
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  const reverseGeocode = useCallback(
    (lat: number, lng: number) => {
      if (typeof google === 'undefined' || !google.maps) {
        return;
      }

      setIsGeocoding(true);
      const geocoder = new google.maps.Geocoder();

      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        setIsGeocoding(false);

        if (status === 'OK' && results && results[0]) {
          const result = results[0];
          const addressComponents = result.address_components || [];
          const fullAddress = result.formatted_address || '';

          setGeocodedAddress(fullAddress);

          // Extract street information from address components
          let mainStreet: string | undefined;
          let primaryCrossStreet: string | undefined;
          let secondaryCrossStreet: string | undefined;
          let city: string | undefined;

          // Find city
          const cityComponent = addressComponents.find((ac) =>
            ac.types.includes('locality')
          );
          if (cityComponent) {
            city = cityComponent.long_name;
          } else {
            // Fallback: try to extract from formatted address
            const cityMatch = fullAddress.match(/, ([^,]+), CA/);
            if (cityMatch) {
              city = cityMatch[1].trim();
            }
          }

          // Find route (street name)
          const route = addressComponents.find((ac) =>
            ac.types.includes('route')
          );
          if (route) {
            mainStreet = route.long_name;
          }

          // Try to find nearby streets by checking for multiple route components
          const routes = addressComponents.filter((ac) =>
            ac.types.includes('route')
          );

          if (routes.length >= 2) {
            // Multiple routes found - likely an intersection
            mainStreet = routes[0].long_name;
            primaryCrossStreet = routes[1].long_name;
            if (routes.length >= 3) {
              secondaryCrossStreet = routes[2].long_name;
            }
          } else if (fullAddress.includes(' & ')) {
            // Address contains " & " indicating intersection
            const parts = fullAddress.split(' & ');
            if (parts.length >= 2) {
              mainStreet = parts[0].trim();
              primaryCrossStreet = parts[1].split(',')[0].trim();
            }
          }

          if (onGeocodeResult) {
            onGeocodeResult({
              mainStreet,
              primaryCrossStreet,
              secondaryCrossStreet,
              fullAddress,
              city,
            });
          }
        } else {
          setGeocodedAddress('Could not determine address');
        }
      });
    },
    [onGeocodeResult]
  );

  // Create and update marker
  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps || !google.maps.marker) {
      return;
    }

    // Clear existing marker
    if (markerRef.current) {
      markerRef.current.map = null;
      markerRef.current = null;
    }

    // Create marker content
    const content = document.createElement('div');
    content.className = 'marker-label';
    content.style.cssText = `
      background-color: #4285F4;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 3px solid #137333;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 20px;
      cursor: move;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    `;
    content.textContent = '📍';

    // Create draggable marker
    const marker = new google.maps.marker.AdvancedMarkerElement({
      position: position,
      content: content,
      title: 'Drag to adjust location',
      map: map,
      gmpDraggable: true, // Enable dragging
    });

    markerRef.current = marker;

    // Add drag end listener
    marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const newPosition = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        };
        onPositionChange(newPosition);
        reverseGeocode(newPosition.lat, newPosition.lng);
      }
    });

    // Cleanup
    return () => {
      if (markerRef.current) {
        google.maps.event.clearInstanceListeners(markerRef.current);
        markerRef.current.map = null;
        markerRef.current = null;
      }
    };
  }, [map, position, onPositionChange, reverseGeocode]);

  // Initial geocoding when position is set
  useEffect(() => {
    if (position) {
      reverseGeocode(position.lat, position.lng);
    }
  }, [position.lat, position.lng, reverseGeocode]); // Re-geocode when position changes

  return (
    <>
      {isGeocoding && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 pointer-events-none">
          <p className="text-gray-600">Looking up address...</p>
        </div>
      )}
      {geocodedAddress && !isGeocoding && (
        <div className="absolute bottom-4 left-4 right-4 p-3 bg-white rounded-lg shadow-lg z-10">
          <p className="text-sm text-gray-600">
            <strong>Address:</strong> {geocodedAddress}
          </p>
        </div>
      )}
    </>
  );
}

export function EditableLocationMap({
  initialPosition,
  onPositionChange,
  onGeocodeResult,
  apiKey,
  height = '400px',
}: EditableLocationMapProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
    libraries, // Required for AdvancedMarkerElement
  });
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialPosition
  );

  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
    }
  }, [initialPosition]);

  if (!apiKey) {
    return (
      <div
        className="w-full bg-gray-200 flex items-center justify-center rounded-lg"
        style={{ height }}
      >
        <p className="text-gray-500">Google Maps API key not configured</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="w-full bg-gray-200 flex items-center justify-center rounded-lg"
        style={{ height }}
      >
        <p className="text-red-500">Error loading Google Maps</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="w-full bg-gray-200 flex items-center justify-center rounded-lg"
        style={{ height }}
      >
        <p className="text-gray-600">Loading Google Maps...</p>
      </div>
    );
  }

  if (!position) {
    return (
      <div
        className="w-full bg-gray-200 flex items-center justify-center rounded-lg"
        style={{ height }}
      >
        <p className="text-gray-500">No location provided</p>
      </div>
    );
  }

  const mapStyle = { ...mapContainerStyle, height };

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={mapStyle}
        center={position}
        zoom={mapOptions.zoom}
        options={mapOptions}
        onLoad={(mapInstance) => {
          setMap(mapInstance);
        }}
      >
        <MapContent
          position={position}
          onPositionChange={(newPos) => {
            setPosition(newPos);
            onPositionChange(newPos);
          }}
          onGeocodeResult={onGeocodeResult}
          map={map}
        />
      </GoogleMap>
    </div>
  );
}
