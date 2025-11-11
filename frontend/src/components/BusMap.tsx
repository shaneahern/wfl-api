import { useMemo, useState, useEffect, useRef } from 'react';
import { GoogleMap, useLoadScript, DirectionsRenderer } from '@react-google-maps/api';
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
  mapId: 'DEMO_MAP_ID', // Required for AdvancedMarkerElement
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels.text',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

function MapContent({ bus, userLocation, map }: { bus: Bus | null; userLocation: { lat: number; lng: number } | null; map: google.maps.Map | null }) {
  const [busLocation, setBusLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const busMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

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
    
    // Use coordinates if available, otherwise geocode from address
    if (bus.latitude !== undefined && bus.longitude !== undefined) {
      // Use stored coordinates directly
      const locationObj = {
        lat: bus.latitude,
        lng: bus.longitude,
      };
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
      // Geocode from street address
      // Clean up street name (remove side indicators like "(west side)")
      const mainStreet = bus.main_street.replace(/\s*\([^)]*\)\s*/g, '').trim();
      const city = bus.city || 'San Francisco';
      const address = `${mainStreet} and ${bus.primary_cross_street}, ${city}, CA`;

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
    }
  }, [bus, userLocation]);

  // Update map center when bus location is found
  useEffect(() => {
    if (map && busLocation) {
      map.setCenter(busLocation);
    }
  }, [map, busLocation]);

  // Update markers when locations change
  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps || !google.maps.marker) {
      return;
    }

    // Clear existing markers
    if (busMarkerRef.current) {
      busMarkerRef.current.map = null;
      busMarkerRef.current = null;
    }
    if (userMarkerRef.current) {
      userMarkerRef.current.map = null;
      userMarkerRef.current = null;
    }

    // Create bus marker
    if (busLocation) {
      const busContent = document.createElement('div');
      busContent.className = 'marker-label';
      busContent.style.cssText = `
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
      busContent.textContent = 'B';

      busMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        position: busLocation,
        content: busContent,
        title: `Bus ${bus?.busNumber || ''} location`,
        map: map,
      });
    }

    // Create user location marker
    if (userLocation) {
      const userContent = document.createElement('div');
      userContent.className = 'marker-label';
      userContent.style.cssText = `
        background-color: #4285F4;
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
      userContent.textContent = 'A';

      userMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        position: userLocation,
        content: userContent,
        title: 'Your location',
        map: map,
      });
    }

    // Cleanup
    return () => {
      if (busMarkerRef.current) {
        busMarkerRef.current.map = null;
        busMarkerRef.current = null;
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.map = null;
        userMarkerRef.current = null;
      }
    };
  }, [busLocation, userLocation, map, bus]);

  return (
    <>
      {directions && <DirectionsRenderer directions={directions} />}
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
    libraries: ['marker'], // Required for AdvancedMarkerElement
  });
  const [map, setMap] = useState<google.maps.Map | null>(null);
  
  // Calculate initial center based on bus location if available
  const mapCenter = useMemo(() => {
    if (bus?.latitude !== undefined && bus?.longitude !== undefined) {
      return { lat: bus.latitude, lng: bus.longitude };
    }
    return defaultCenter;
  }, [bus]);

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

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={mapOptions.zoom}
        options={mapOptions}
        onLoad={(mapInstance) => {
          setMap(mapInstance);
        }}
      >
        {map && <MapContent bus={bus} userLocation={userLocation} map={map} />}
      </GoogleMap>
    </div>
  );
}
