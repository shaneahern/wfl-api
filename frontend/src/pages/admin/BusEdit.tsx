import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBuses } from '../../hooks/useBuses';
import { useGeolocation } from '../../hooks/useGeolocation';
import { StreetSelector } from '../../components/StreetSelector';
import { EditableLocationMap } from '../../components/EditableLocationMap';
import { AdminNav } from '../../components/AdminNav';
import { api } from '../../services/api';
import { getDefaultEntryMode } from './Settings';

// Google Maps API key must be set via VITE_GOOGLE_MAPS_API_KEY environment variable
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

type EntryMode = 'manual' | 'location';

export function BusEdit() {
  const { buses, refetch } = useBuses();
  const { position: currentPosition, loading: geoLoading, getCurrentPosition, watchPosition, stopWatching } = useGeolocation();
  const [searchParams] = useSearchParams();
  const [selectedBusId, setSelectedBusId] = useState('');
  const [entryMode, setEntryMode] = useState<EntryMode>('location');
  const [busNumber, setBusNumber] = useState('');
  const [mainStreet, setMainStreet] = useState('');
  const [primaryCrossStreet, setPrimaryCrossStreet] = useState('');
  const [secondaryCrossStreet, setSecondaryCrossStreet] = useState('');
  const [busLocation, setBusLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [manualLocation, setManualLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [fullAddress, setFullAddress] = useState<string>('');
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
        
        // Determine entry mode based on available data
        // If bus has coordinates, default to location mode; otherwise manual
        if (bus.latitude !== undefined && bus.longitude !== undefined) {
          setEntryMode('location');
          setBusLocation({
            lat: bus.latitude,
            lng: bus.longitude,
          });
          setSelectedLocation({
            lat: bus.latitude,
            lng: bus.longitude,
          });
          // Also set manualLocation in case user switches to manual mode
          setManualLocation({
            lat: bus.latitude,
            lng: bus.longitude,
          });
        } else {
          // Default to manual mode if no coordinates
          setEntryMode('manual');
          setBusLocation(null);
          setSelectedLocation(null);
          setManualLocation(null);
        }
      }
    } else {
      setBusNumber('');
      setMainStreet('');
      setPrimaryCrossStreet('');
      setSecondaryCrossStreet('');
      setBusLocation(null);
      setSelectedLocation(null);
      setFullAddress('');
      setEntryMode(getDefaultEntryMode());
    }
  }, [selectedBusId, buses]);

  // Update selectedLocation when currentPosition changes in location mode
  // This ensures the map updates continuously as the user walks
  useEffect(() => {
    if (entryMode === 'location' && currentPosition && !busLocation) {
      setSelectedLocation({
        lat: currentPosition.latitude,
        lng: currentPosition.longitude,
      });
    }
  }, [entryMode, currentPosition, busLocation]);

  // Auto-get location when switching to location mode
  useEffect(() => {
    if (entryMode === 'location' && !currentPosition && !geoLoading && !busLocation) {
      getCurrentPosition();
    }
  }, [entryMode, currentPosition, geoLoading, busLocation, getCurrentPosition]);

  // Start continuous GPS tracking when in location mode - updates as user walks
  useEffect(() => {
    if (entryMode === 'location' && !busLocation) {
      // Start watching position - will update continuously as user moves
      watchPosition();
    } else {
      // Stop watching when switching away from location mode or when editing existing bus
      stopWatching();
    }
    
    // Cleanup: stop watching when component unmounts or mode changes
    return () => {
      stopWatching();
    };
  }, [entryMode, busLocation, watchPosition, stopWatching]);

  // Handle location mode - get current position when switching to location mode
  const handleLocationMode = () => {
    setEntryMode('location');
    if (!busLocation) {
      setSelectedLocation(null);
      setFullAddress('');
      if (!currentPosition) {
        getCurrentPosition();
      }
    }
  };

  // Handle geocode result from EditableLocationMap when pin is dragged
  const handleGeocodeResult = (result: {
    mainStreet?: string;
    primaryCrossStreet?: string;
    secondaryCrossStreet?: string;
    fullAddress: string;
    city?: string;
  }) => {
    setFullAddress(result.fullAddress);
    
    // Only update street fields in location mode (not manual mode)
    // In manual mode, user has explicitly selected streets, so don't overwrite them
    if (entryMode === 'location') {
      if (result.mainStreet) {
        setMainStreet(result.mainStreet);
      }
      if (result.primaryCrossStreet) {
        setPrimaryCrossStreet(result.primaryCrossStreet);
      }
      if (result.secondaryCrossStreet) {
        setSecondaryCrossStreet(result.secondaryCrossStreet);
      }
    }
    
    if (result.city) {
      setCity(result.city);
    }
  };

  // Geocode intersection when main street and primary cross street are selected in manual mode
  useEffect(() => {
    if (entryMode === 'manual' && mainStreet && primaryCrossStreet) {
      // Wait for Google Maps to be available
      const waitForGoogleMaps = (callback: () => void, maxAttempts = 50) => {
        if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
          callback();
        } else if (maxAttempts > 0) {
          setTimeout(() => waitForGoogleMaps(callback, maxAttempts - 1), 100);
        } else {
          // Timeout - use default SF location
          setManualLocation({ lat: 37.7749, lng: -122.4194 });
        }
      };

      waitForGoogleMaps(() => {
        const geocoder = new google.maps.Geocoder();
        const mainStreetClean = mainStreet.replace(/\s*\([^)]*\)\s*/g, '').trim();
        
        // Try "and" format first
        const addressToGeocode = `${mainStreetClean} and ${primaryCrossStreet}, San Francisco, CA`;
        
        geocoder.geocode({ address: addressToGeocode }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            setManualLocation({
              lat: location.lat(),
              lng: location.lng(),
            });
          } else {
            // Try alternative format with "&"
            const alternativeAddress = `${mainStreetClean} & ${primaryCrossStreet}, San Francisco, CA`;
            geocoder.geocode({ address: alternativeAddress }, (altResults, altStatus) => {
              if (altStatus === 'OK' && altResults && altResults[0]) {
                const location = altResults[0].geometry.location;
                setManualLocation({
                  lat: location.lat(),
                  lng: location.lng(),
                });
              } else {
                // If geocoding fails, use default SF location
                setManualLocation({ lat: 37.7749, lng: -122.4194 });
              }
            });
          }
        });
      });
    } else if (entryMode === 'manual' && (!mainStreet || !primaryCrossStreet)) {
      // Reset to SF center if streets are cleared
      setManualLocation(null);
    }
  }, [entryMode, mainStreet, primaryCrossStreet]);

  // Determine location to show on map
  // Default to San Francisco center if no location is available
  const defaultLocation = { lat: 37.7749, lng: -122.4194 }; // San Francisco center
  const mapLocation = entryMode === 'location' && selectedLocation
    ? selectedLocation
    : currentPosition
    ? { lat: currentPosition.latitude, lng: currentPosition.longitude }
    : busLocation || defaultLocation; // Use existing bus location if available, otherwise default

  const handleSubmit = async () => {
    if (!busNumber) {
      setMessage({ type: 'error', text: 'Bus number is required' });
      return;
    }

    // For location mode, require coordinates but not street address
    if (entryMode === 'location') {
      const locationToSave = selectedLocation || (currentPosition ? {
        lat: currentPosition.latitude,
        lng: currentPosition.longitude,
      } : null);
      
      if (!locationToSave) {
        setMessage({ type: 'error', text: 'Please select a location first' });
        return;
      }
    } else {
      // For manual mode, require main street
      if (!mainStreet) {
        setMessage({ type: 'error', text: 'Main street is required for manual entry' });
        return;
      }
    }

    setLoading(true);
    setMessage(null);

    try {
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

      // Add coordinates and city if saving from location mode or manual mode with map location
      if (entryMode === 'location') {
        // Use selectedLocation if available (user dragged pin), otherwise use currentPosition
        const locationToSave = selectedLocation || (currentPosition ? {
          lat: currentPosition.latitude,
          lng: currentPosition.longitude,
        } : null);
        
        if (locationToSave) {
          busData.latitude = locationToSave.lat;
          busData.longitude = locationToSave.lng;
          if (city) {
            busData.city = city;
          }
        }
      } else if (entryMode === 'manual' && manualLocation) {
        // For manual mode, use the location from the map if available
        busData.latitude = manualLocation.lat;
        busData.longitude = manualLocation.lng;
        if (city) {
          busData.city = city;
        }
      } else {
        // For manual entry without map location, geocode the address to get coordinates
        // Wait for Google Maps to be available (it will be loaded by EditableLocationMap if needed)
        const waitForGoogleMaps = (callback: () => void, maxAttempts = 50) => {
          if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
            callback();
          } else if (maxAttempts > 0) {
            setTimeout(() => waitForGoogleMaps(callback, maxAttempts - 1), 100);
          } else {
            // Timeout - save without coordinates
            api.saveBus(busData).then(() => {
              setSelectedBusId('');
              refetch();
              setLoading(false);
            }).catch((error) => {
              handleSubmitError(error);
            });
          }
        };
        
        if (mainStreet) {
          waitForGoogleMaps(() => {
            const geocoder = new google.maps.Geocoder();
            const mainStreetClean = mainStreet.replace(/\s*\([^)]*\)\s*/g, '').trim();
            const addressToGeocode = primaryCrossStreet 
              ? `${mainStreetClean} and ${primaryCrossStreet}, San Francisco, CA`
              : `${mainStreetClean}, San Francisco, CA`;
            
            geocoder.geocode({ address: addressToGeocode }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                const location = results[0].geometry.location;
                busData.latitude = location.lat();
                busData.longitude = location.lng();
              }
              
              // Save regardless of geocoding result
              api.saveBus(busData).then(() => {
                // Refresh GPS location if location mode was used
                if (entryMode === 'location') {
                  getCurrentPosition();
                }
                setSelectedBusId('');
                refetch();
                setLoading(false);
              }).catch((error) => {
                handleSubmitError(error);
              });
            });
          });
          return; // Early return - async geocoding will handle save
        }
      }

      await api.saveBus(busData);
      
      // Refresh GPS location if location mode was used - ensures map shows new current position
      // This is critical when entering multiple bus locations while walking (e.g., 50' apart)
      if (entryMode === 'location') {
        getCurrentPosition();
      }
      
      // Clear selection and refresh bus list
      setSelectedBusId('');
      refetch();
    } catch (error) {
      handleSubmitError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitError = (error: unknown) => {
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
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700">
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-4 md:p-6">
          <AdminNav />
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-primary-700">
              Edit Bus Location
            </h1>
            <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">Update existing bus location information</p>
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
                {/* Bus Number (read-only) */}
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

                {/* Tab Toggle */}
                <div className="mb-4 md:mb-6 flex gap-2 border-b border-gray-200">
                  <button
                    onClick={handleLocationMode}
                    className={`px-3 md:px-4 py-2 font-medium transition-colors text-sm md:text-base ${
                      entryMode === 'location'
                        ? 'border-b-2 border-primary-500 text-primary-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Use Map
                  </button>
                  <button
                    onClick={() => {
                      setEntryMode('manual');
                      setSelectedLocation(null);
                      setFullAddress('');
                      // Reset manualLocation if streets are not selected
                      if (!mainStreet || !primaryCrossStreet) {
                        setManualLocation(null);
                      }
                    }}
                    className={`px-3 md:px-4 py-2 font-medium transition-colors text-sm md:text-base ${
                      entryMode === 'manual'
                        ? 'border-b-2 border-primary-500 text-primary-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Manual Entry
                  </button>
                </div>

                {/* Manual Entry Mode */}
                {entryMode === 'manual' && (
                  <>
                    <StreetSelector
                      mainStreet={mainStreet}
                      primaryCrossStreet={primaryCrossStreet}
                      secondaryCrossStreet={secondaryCrossStreet}
                      onMainStreetChange={setMainStreet}
                      onPrimaryCrossStreetChange={setPrimaryCrossStreet}
                      onSecondaryCrossStreetChange={setSecondaryCrossStreet}
                    />
                    
                    {/* Map for manual entry - show when streets are selected */}
                    {mainStreet && primaryCrossStreet && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Location Map
                        </label>
                        <p className="text-xs text-gray-600 mb-2">
                          Pin shows the intersection. Drag it to adjust the precise location.
                        </p>
                        <div className="h-[300px] md:h-[400px]">
                          <EditableLocationMap
                            initialPosition={manualLocation || { lat: 37.7749, lng: -122.4194 }}
                            onPositionChange={(pos: { lat: number; lng: number }) => {
                              setManualLocation(pos);
                            }}
                            onGeocodeResult={handleGeocodeResult}
                            apiKey={GOOGLE_MAPS_API_KEY || ''}
                            height="100%"
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Show message when streets not selected */}
                    {(!mainStreet || !primaryCrossStreet) && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700">
                          Select a main street and primary cross street to see the map and set the precise location.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Location Mode */}
                {entryMode === 'location' && (
                  <div className="space-y-4">
                    <div>
                      {!currentPosition && !selectedLocation && !busLocation && (
                        <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs md:text-sm text-blue-700 mb-2">
                            💡 Map is showing San Francisco center. Click "Get Current Location" to use your location, or drag the pin to set a location.
                          </p>
                          <button
                            onClick={getCurrentPosition}
                            disabled={geoLoading}
                            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            {geoLoading ? 'Getting location...' : 'Get Current Location'}
                          </button>
                        </div>
                      )}
                      <p className="text-xs md:text-sm text-gray-600 mb-2">
                        Drag the pin to adjust the location. The address will be automatically detected.
                      </p>
                      <div className="h-[300px] md:h-[400px]">
                        <EditableLocationMap
                          initialPosition={mapLocation}
                          onPositionChange={(pos: { lat: number; lng: number }) => {
                            setSelectedLocation(pos);
                            setFullAddress('');
                          }}
                          onGeocodeResult={handleGeocodeResult}
                          apiKey={GOOGLE_MAPS_API_KEY || ''}
                          height="100%"
                        />
                      </div>
                    </div>
                    {fullAddress && (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-1">Detected Address:</p>
                        <p className="text-gray-900">{fullAddress}</p>
                        {mainStreet && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Main Street:</span> {mainStreet}
                            {primaryCrossStreet && (
                              <>
                                <br />
                                <span className="font-medium">Cross Street:</span> {primaryCrossStreet}
                              </>
                            )}
                            {secondaryCrossStreet && (
                              <>
                                <br />
                                <span className="font-medium">Secondary Cross Street:</span> {secondaryCrossStreet}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || (entryMode === 'location' && !selectedLocation && !currentPosition && !busLocation) || (entryMode === 'manual' && !mainStreet)}
                  className="w-full px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Bus Location'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
