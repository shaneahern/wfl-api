import { useState, useEffect, useRef } from 'react';
import { GoogleMap, useLoadScript } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import type { Bus } from '../types';

interface AdminBusMapProps {
  buses: Bus[];
  apiKey: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 37.788257,
  lng: -122.397373,
};

const mapOptions = {
  zoom: 14,
  mapId: 'DEMO_MAP_ID', // Required for AdvancedMarkerElement
  // Note: styles are controlled via cloud console when mapId is present
};

// Move libraries array outside component to prevent unnecessary reloads
const libraries: ('marker')[] = ['marker'];

interface BusLocation {
  bus: Bus;
  position: { lat: number; lng: number };
  originalPosition: { lat: number; lng: number }; // Store original position for clustering
}

// Calculate offset position to spread markers
function calculateOffsetPosition(
  basePosition: { lat: number; lng: number },
  index: number,
  total: number
): { lat: number; lng: number } {
  // Spread markers in a circle pattern
  const angle = (index / total) * 2 * Math.PI;
  const radius = 0.00015; // ~15 meters in degrees
  
  return {
    lat: basePosition.lat + radius * Math.cos(angle),
    lng: basePosition.lng + radius * Math.sin(angle),
  };
}

function MapContent({ buses, map }: { buses: Bus[]; map: google.maps.Map }) {
  const [busLocations, setBusLocations] = useState<BusLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const originalPositionsRef = useRef<Map<google.maps.marker.AdvancedMarkerElement, { lat: number; lng: number }>>(new Map());

  useEffect(() => {
    if (typeof google === 'undefined' || !google.maps || !map) {
      return;
    }

    if (buses.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const geocoder = new google.maps.Geocoder();
    const locations: BusLocation[] = [];
    let completed = 0;

    buses.forEach((bus) => {
      // If bus has coordinates, use them directly
      if (bus.latitude !== undefined && bus.longitude !== undefined) {
        completed++;
        locations.push({
          bus,
          position: {
            lat: bus.latitude,
            lng: bus.longitude,
          },
          originalPosition: {
            lat: bus.latitude,
            lng: bus.longitude,
          },
        });
        
        if (completed === buses.length) {
          setBusLocations(locations);
          setLoading(false);
        }
        return;
      }

      // Otherwise, geocode from street address
      if (!bus.main_street || !bus.primary_cross_street) {
        completed++;
        if (completed === buses.length) {
          setBusLocations(locations);
          setLoading(false);
        }
        return;
      }

      // Clean up street name (remove side indicators like "(west side)")
      const mainStreet = bus.main_street.replace(/\s*\([^)]*\)\s*/g, '').trim();
      // Use city from bus data if available, otherwise default to San Francisco
      const city = bus.city || 'San Francisco';
      
      // The intersection is always main_street and primary_cross_street
      // Secondary cross street is additional context, not part of the intersection
      const address = bus.primary_cross_street
        ? `${mainStreet} and ${bus.primary_cross_street}, ${city}, CA`
        : `${mainStreet}, ${city}, CA`;

      geocoder.geocode({ address }, (results, status) => {
        completed++;
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          const position = {
            lat: location.lat(),
            lng: location.lng(),
          };
          locations.push({
            bus,
            position,
            originalPosition: position,
          });
        }

        if (completed === buses.length) {
          setBusLocations(locations);
          setLoading(false);
        }
      });
    });
  }, [buses, map]);

  // Update markers when locations change
  useEffect(() => {
    if (!map || busLocations.length === 0 || typeof google === 'undefined') {
      return;
    }

    // Clear existing markers and clusterer
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }
    markersRef.current.forEach(marker => marker.map = null);
    markersRef.current = [];
    originalPositionsRef.current.clear();

    // Create markers at their original positions (for clustering to work properly)
    // We'll spread them out when clusters are clicked or when zoomed in
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];
    
    busLocations.forEach((loc) => {
      // Create a custom HTML element for the marker
      const content = document.createElement('div');
      content.className = 'marker-label';
      content.style.cssText = `
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
        font-size: 12px;
      `;
      content.textContent = loc.bus.busNumber || '';

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: loc.originalPosition, // Use original position for clustering
        content: content,
        title: `Bus ${loc.bus.busNumber}: ${loc.bus.main_street} & ${loc.bus.primary_cross_street}`,
        map: null, // Don't add to map yet, clusterer will handle it
      });
      originalPositionsRef.current.set(marker, loc.originalPosition);
      markers.push(marker);
    });

    markersRef.current = markers;

    // Create clusterer with custom click handler
    if (markers.length > 0) {
      const clusterer = new MarkerClusterer({
        map,
        markers,
      });

      // Handle cluster click - expand and spread markers
      // Note: MarkerClusterer uses google.maps.event for event listeners
      if (typeof google !== 'undefined' && google.maps && google.maps.event) {
        google.maps.event.addListener(clusterer, 'clusterclick', (cluster: { markers: google.maps.marker.AdvancedMarkerElement[]; position: google.maps.LatLng | null }) => {
          const clusterMarkers = cluster.markers || [];
          
          if (clusterMarkers.length > 1) {
            // Get current zoom level
            const currentZoom = map.getZoom() || 14;
            
            // Zoom in to see individual markers
            map.setZoom(Math.min(currentZoom + 2, 18));
            
            // Center on cluster
            const clusterCenter = cluster.position;
            if (clusterCenter) {
              map.setCenter(clusterCenter);
            }
            
            // Spread out markers that are at the same original location
            const markerGroups = new Map<string, google.maps.marker.AdvancedMarkerElement[]>();
            
            clusterMarkers.forEach((marker: google.maps.marker.AdvancedMarkerElement) => {
              const originalPos = originalPositionsRef.current.get(marker);
              if (originalPos) {
                const key = `${originalPos.lat.toFixed(6)},${originalPos.lng.toFixed(6)}`;
                if (!markerGroups.has(key)) {
                  markerGroups.set(key, []);
                }
                markerGroups.get(key)!.push(marker);
              }
            });
            
            // Apply offsets to markers at same location
            markerGroups.forEach((markerGroup) => {
              if (markerGroup.length > 1) {
                markerGroup.forEach((marker, index) => {
                  const originalPos = originalPositionsRef.current.get(marker);
                  if (originalPos) {
                    const offsetPos = calculateOffsetPosition(
                      originalPos,
                      index,
                      markerGroup.length
                    );
                    marker.position = offsetPos;
                  }
                });
              }
            });
          } else if (clusterMarkers.length === 1) {
            // Single marker - just zoom in and center
            const currentZoom = map.getZoom() || 14;
            map.setZoom(Math.min(currentZoom + 2, 18));
            const marker = clusterMarkers[0];
            if (marker && marker.position) {
              const pos = marker.position;
              const latLng = typeof pos === 'object' && 'lat' in pos 
                ? pos 
                : { lat: (pos as google.maps.LatLng).lat(), lng: (pos as google.maps.LatLng).lng() };
              map.setCenter(latLng);
            }
          }
        });
      }

      clustererRef.current = clusterer;

      // Also handle zoom changes to spread markers when zoomed in enough
      const spreadMarkersOnZoom = () => {
        const currentZoom = map.getZoom() || 14;
        const currentMarkers = markersRef.current;
        
        // Only spread markers when zoomed in enough (zoom level 16+)
        if (currentZoom >= 16) {
          // Group markers by original position
          const markerGroups = new Map<string, google.maps.marker.AdvancedMarkerElement[]>();
          
          currentMarkers.forEach((marker) => {
            const originalPos = originalPositionsRef.current.get(marker);
            if (originalPos) {
              const key = `${originalPos.lat.toFixed(6)},${originalPos.lng.toFixed(6)}`;
              if (!markerGroups.has(key)) {
                markerGroups.set(key, []);
              }
              markerGroups.get(key)!.push(marker);
            }
          });
          
          // Spread out markers at same location
          markerGroups.forEach((markerGroup) => {
            if (markerGroup.length > 1) {
              markerGroup.forEach((marker, index) => {
                const originalPos = originalPositionsRef.current.get(marker);
                if (originalPos) {
                  const offsetPos = calculateOffsetPosition(
                    originalPos,
                    index,
                    markerGroup.length
                  );
                  marker.position = offsetPos;
                }
              });
            }
          });
        } else {
          // Reset to original positions when zoomed out
          currentMarkers.forEach((marker) => {
            const originalPos = originalPositionsRef.current.get(marker);
            if (originalPos) {
              marker.position = originalPos;
            }
          });
        }
      };

      // Listen to zoom changes
      let zoomListener: google.maps.MapsEventListener | null = null;
      if (typeof google !== 'undefined' && google.maps && google.maps.event) {
        zoomListener = google.maps.event.addListener(map, 'zoom_changed', spreadMarkersOnZoom);
      }

      // Cleanup
      return () => {
        if (zoomListener && typeof google !== 'undefined' && google.maps && google.maps.event) {
          google.maps.event.removeListener(zoomListener);
        }
        const currentClusterer = clustererRef.current;
        const currentMarkers = [...markersRef.current];
        
        if (currentClusterer) {
          currentClusterer.clearMarkers();
        }
        currentMarkers.forEach(marker => marker.map = null);
        markersRef.current = [];
        originalPositionsRef.current.clear();
      };
    } else {
      // Cleanup when no markers
      return () => {
        const currentClusterer = clustererRef.current;
        const currentMarkers = [...markersRef.current];
        
        if (currentClusterer) {
          currentClusterer.clearMarkers();
        }
        currentMarkers.forEach(marker => marker.map = null);
        markersRef.current = [];
        originalPositionsRef.current.clear();
      };
    }
  }, [busLocations, map]);

  // Update map center when locations are loaded
  useEffect(() => {
    if (!map || busLocations.length === 0) {
      return;
    }

    // Calculate center of all bus locations
    const avgLat = busLocations.reduce((sum, loc) => sum + loc.position.lat, 0) / busLocations.length;
    const avgLng = busLocations.reduce((sum, loc) => sum + loc.position.lng, 0) / busLocations.length;
    
    map.setCenter({ lat: avgLat, lng: avgLng });
  }, [busLocations, map]);

  return (
    <>
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <p className="text-gray-600">Loading bus locations...</p>
        </div>
      )}
    </>
  );
}

export function AdminBusMap({ buses, apiKey }: AdminBusMapProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
    libraries, // Required for AdvancedMarkerElement
  });
  const [map, setMap] = useState<google.maps.Map | null>(null);

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg">
        <p className="text-gray-600">Loading Google Maps...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg">
        <p className="text-red-500">Error loading Google Maps</p>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg">
        <p className="text-gray-500">Google Maps API key not configured</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={mapOptions.zoom}
        options={mapOptions}
        onLoad={(mapInstance) => {
          setMap(mapInstance);
        }}
      >
        {map && <MapContent buses={buses} map={map} />}
      </GoogleMap>
    </div>
  );
}
