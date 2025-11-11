import { useLoadScript, GoogleMap } from '@react-google-maps/api';
import { useEffect, useRef, useState } from 'react';

interface ReadOnlyMapProps {
  position: { lat: number; lng: number };
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

export function ReadOnlyMap({ position, apiKey, height = '400px' }: ReadOnlyMapProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
    libraries, // Required for AdvancedMarkerElement
  });
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  const mapStyle = { ...mapContainerStyle, height };

  // Create marker when map is loaded
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
      background-color: #EA4335;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 2px solid #137333;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
    `;
    content.textContent = '📍';

    // Create marker
    const marker = new google.maps.marker.AdvancedMarkerElement({
      position: position,
      content: content,
      title: 'Bus location',
      map: map,
    });

    markerRef.current = marker;

    // Cleanup
    return () => {
      if (markerRef.current) {
        markerRef.current.map = null;
        markerRef.current = null;
      }
    };
  }, [map, position]);

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

  return (
    <GoogleMap
      mapContainerStyle={mapStyle}
      center={position}
      zoom={mapOptions.zoom}
      options={mapOptions}
      onLoad={(mapInstance) => {
        setMap(mapInstance);
      }}
    />
  );
}
