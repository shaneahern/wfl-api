import { useMemo, useState, useEffect } from 'react';
import { GoogleMap, useLoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';
import type { Bus } from '../types';

interface BusMapProps {
  bus: Bus | null;
  userLocation: { lat: number; lng: number } | null;
  apiKey: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

const defaultCenter = {
  lat: 37.788257,
  lng: -122.397373,
};

const mapOptions = {
  zoom: 14,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels.text',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

function MapContent({ bus, userLocation }: { bus: Bus | null; userLocation: { lat: number; lng: number } | null }) {
  const [busLocation, setBusLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Reset state when bus changes
    setBusLocation(null);
    setDirections(null);
    
    if (!bus || !bus.main_street || !bus.primary_cross_street) {
      return;
    }

    // Wait for google.maps to be available
    if (typeof google === 'undefined' || !google.maps) {
      return;
    }

    setLoading(true);
    const geocoder = new google.maps.Geocoder();
    
    // Clean up street name (remove side indicators like "(west side)")
    const mainStreet = bus.main_street.replace(/\s*\([^)]*\)\s*/g, '').trim();
    const address = `${mainStreet} and ${bus.primary_cross_street}, San Francisco, CA`;

    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();
        const locationObj = { lat, lng };
        setBusLocation(locationObj);

        // Calculate directions if user location is available
        if (userLocation) {
          const directionsService = new google.maps.DirectionsService();
          directionsService.route(
            {
              origin: userLocation,
              destination: locationObj,
              travelMode: google.maps.TravelMode.WALKING,
            },
            (result, directionsStatus) => {
              if (directionsStatus === 'OK' && result) {
                setDirections(result);
              }
              setLoading(false);
            }
          );
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
  }, [bus, userLocation]);

  const mapCenter = useMemo(() => {
    return busLocation || defaultCenter;
  }, [busLocation]);

  return (
    <>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={mapOptions.zoom}
        options={mapOptions}
      >
        {busLocation && (
          <Marker 
            position={busLocation} 
            label="B"
            title={`Bus ${bus?.busNumber || ''} location`}
          />
        )}
        {userLocation && (
          <Marker 
            position={userLocation} 
            label="A"
            title="Your location"
          />
        )}
        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <p className="text-gray-600">Loading map...</p>
        </div>
      )}
    </>
  );
}

export function BusMap({ bus, userLocation, apiKey }: BusMapProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
  });

  if (!apiKey) {
    return (
      <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
        <p className="text-gray-500">Google Maps API key not configured</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
        <p className="text-red-500">Error loading Google Maps</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
        <p className="text-gray-600">Loading Google Maps...</p>
      </div>
    );
  }

  return <MapContent bus={bus} userLocation={userLocation} />;
}
