import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBuses } from '../../hooks/useBuses';
import { StreetSelector } from '../../components/StreetSelector';
import { EditableLocationMap } from '../../components/EditableLocationMap';
import { AdminNav } from '../../components/AdminNav';
import { api } from '../../services/api';

// Google Maps API key must be set via VITE_GOOGLE_MAPS_API_KEY environment variable
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export function BusEdit() {
  const { buses, refetch } = useBuses();
  const [searchParams] = useSearchParams();
  const [selectedBusId, setSelectedBusId] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [mainStreet, setMainStreet] = useState('');
  const [primaryCrossStreet, setPrimaryCrossStreet] = useState('');
  const [secondaryCrossStreet, setSecondaryCrossStreet] = useState('');
  const [busLocation, setBusLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [city, setCity] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error'; text: string } | null>(null);

  // Set selected bus from URL parameter if present
  useEffect(() => {
    const busParam = searchParams.get('bus');
    if (busParam) {
      setSelectedBusId(busParam);
    }
  }, [searchParams]);

  // Update form fields when bus is selected
  useEffect(() => {
    if (selectedBusId) {
      const bus = buses.find((b) => b.busNumber === selectedBusId);
      if (bus) {
        setBusNumber(bus.busNumber);
        setMainStreet(bus.main_street || '');
        setPrimaryCrossStreet(bus.primary_cross_street || '');
        setSecondaryCrossStreet(bus.secondary_cross_street || '');
        setCity(bus.city || '');
        
        // Use coordinates if available, otherwise geocode from address
        if (bus.latitude !== undefined && bus.longitude !== undefined) {
          // Use stored coordinates directly
          setBusLocation({
            lat: bus.latitude,
            lng: bus.longitude,
          });
        } else if (bus.main_street && bus.primary_cross_street) {
          // Geocode bus location for map display
          const geocodeBusLocation = () => {
            if (typeof google !== 'undefined' && google.maps) {
              const geocoder = new google.maps.Geocoder();
              const mainStreet = bus.main_street!.replace(/\s*\([^)]*\)\s*/g, '').trim();
              const city = bus.city || 'San Francisco';
              
              // If secondary_cross_street exists, use primary_cross_street and secondary_cross_street as the intersection
              // Otherwise, use main_street and primary_cross_street
              let address: string;
              if (bus.secondary_cross_street && bus.primary_cross_street) {
                address = `${bus.primary_cross_street} and ${bus.secondary_cross_street}, ${city}, CA`;
              } else {
                address = `${mainStreet} and ${bus.primary_cross_street}, ${city}, CA`;
              }
              
              geocoder.geocode({ address }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                  const location = results[0].geometry.location;
                  setBusLocation({
                    lat: location.lat(),
                    lng: location.lng(),
                  });
                } else {
                  // If geocoding fails, set a default location (SF area)
                  setBusLocation({
                    lat: 37.788257,
                    lng: -122.397373,
                  });
                }
              });
            } else {
              // Wait for google.maps to load
              const checkGoogle = setInterval(() => {
                if (typeof google !== 'undefined' && google.maps) {
                  clearInterval(checkGoogle);
                  geocodeBusLocation();
                }
              }, 100);
              
              // Cleanup interval after 5 seconds
              setTimeout(() => clearInterval(checkGoogle), 5000);
            }
          };
          
          geocodeBusLocation();
        } else {
          // No street info, set default location
          setBusLocation({
            lat: 37.788257,
            lng: -122.397373,
          });
        }
      }
    } else {
      setBusNumber('');
      setMainStreet('');
      setPrimaryCrossStreet('');
      setSecondaryCrossStreet('');
      setBusLocation(null);
    }
  }, [selectedBusId, buses]);

  // Handle geocode result from EditableLocationMap when pin is dragged
  const handleGeocodeResult = (result: {
    mainStreet?: string;
    primaryCrossStreet?: string;
    secondaryCrossStreet?: string;
    fullAddress: string;
    city?: string;
  }) => {
    if (result.mainStreet) {
      setMainStreet(result.mainStreet);
    }
    if (result.primaryCrossStreet) {
      setPrimaryCrossStreet(result.primaryCrossStreet);
    }
    if (result.secondaryCrossStreet) {
      setSecondaryCrossStreet(result.secondaryCrossStreet);
    }
    if (result.city) {
      setCity(result.city);
    }
  };

  const handleSubmit = async () => {
    if (!busNumber || !mainStreet) {
      setMessage({ type: 'error', text: 'Bus number and main street are required' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Include coordinates and city if busLocation is set (pin was dragged)
      const busData: {
        busNumber: string;
        main_street?: string;
        primary_cross_street?: string;
        secondary_cross_street?: string;
        latitude?: number;
        longitude?: number;
        city?: string;
      } = {
        busNumber,
        main_street: mainStreet,
        primary_cross_street: primaryCrossStreet || undefined,
        secondary_cross_street: secondaryCrossStreet || undefined,
      };

      // Add coordinates and city if location was set (from map)
      if (busLocation) {
        busData.latitude = busLocation.lat;
        busData.longitude = busLocation.lng;
        if (city) {
          busData.city = city;
        }
      }

      await api.saveBus(busData);
      
      // Clear selection and refresh bus list
      setSelectedBusId('');
      refetch();
    } catch (error) {
      // Extract error message and sanitize to prevent displaying raw JSON
      let errorMessage = 'Failed to update bus location';
      
      if (error instanceof Error) {
        const rawMessage = error.message.trim();
        
        // Check if error message is JSON and sanitize it
        if (rawMessage.startsWith('{') || rawMessage.startsWith('[')) {
          try {
            const parsed = JSON.parse(rawMessage);
            errorMessage = parsed.message || 'Failed to update bus location. Please try again.';
          } catch {
            errorMessage = 'Failed to update bus location. Please try again.';
          }
        } else if (rawMessage.includes('"success"') || rawMessage.includes('"message"')) {
          errorMessage = 'Failed to update bus location. Please try again.';
        } else {
          errorMessage = rawMessage;
        }
      }
      
      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
          <AdminNav />
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-primary-700">
              Edit Bus Location
            </h1>
            <p className="text-gray-600 mt-2">Update existing bus location information</p>
          </div>

          {message && (
            <div className="mb-4 p-4 rounded-lg bg-red-100 border border-red-400 text-red-700">
              {(() => {
                // Final safety check - never display raw JSON
                const text = message.text;
                const trimmed = text.trim();
                if (trimmed.startsWith('{') || trimmed.startsWith('[') || 
                    text.includes('"success"') || text.includes('"message"')) {
                  return 'Failed to update bus location. Please try again.';
                }
                return text;
              })()}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Bus to Edit
              </label>
              <select
                value={selectedBusId}
                onChange={(e) => setSelectedBusId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">-- Select Bus --</option>
                {buses.map((bus) => {
                  const displayText = bus.primary_cross_street
                    ? `Bus #${bus.busNumber} on ${bus.main_street} between ${bus.primary_cross_street}${bus.secondary_cross_street ? ` and ${bus.secondary_cross_street}` : ''}`
                    : `Bus #${bus.busNumber} on ${bus.main_street || 'Unknown'}`;
                  return (
                    <option key={bus.busNumber} value={bus.busNumber}>
                      {displayText}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedBusId && (
              <>
                {/* Map with draggable pin - always show when bus is selected */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bus Location (drag pin to adjust)
                  </label>
                  {busLocation ? (
                    <>
                      <EditableLocationMap
                        initialPosition={busLocation}
                        onPositionChange={(newPosition) => {
                          setBusLocation(newPosition);
                        }}
                        onGeocodeResult={handleGeocodeResult}
                        apiKey={GOOGLE_MAPS_API_KEY || ''}
                        height="400px"
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        Drag the pin to change the location. Street fields will update automatically.
                      </p>
                    </>
                  ) : (
                    <div className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500">Loading map...</p>
                    </div>
                  )}
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bus Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={busNumber}
                      disabled
                      className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                    />
                  </div>

                  <StreetSelector
                    mainStreet={mainStreet}
                    primaryCrossStreet={primaryCrossStreet}
                    secondaryCrossStreet={secondaryCrossStreet}
                    onMainStreetChange={setMainStreet}
                    onPrimaryCrossStreetChange={setPrimaryCrossStreet}
                    onSecondaryCrossStreetChange={setSecondaryCrossStreet}
                  />

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Updating...' : 'Update Bus Location'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
