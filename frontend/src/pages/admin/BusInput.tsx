import { useState, useEffect } from 'react';
import { useBuses } from '../../hooks/useBuses';
import { useGeolocation } from '../../hooks/useGeolocation';
import { StreetSelector } from '../../components/StreetSelector';
import { EditableLocationMap } from '../../components/EditableLocationMap';
import { ReadOnlyMap } from '../../components/ReadOnlyMap';
import { AdminNav } from '../../components/AdminNav';
import { api } from '../../services/api';
import { getDefaultEntryMode } from './Settings';

// Google Maps API key must be set via VITE_GOOGLE_MAPS_API_KEY environment variable
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

type EntryMode = 'manual' | 'location';

export function BusInput() {
  const { buses, refetch } = useBuses();
  const { position: currentPosition, loading: geoLoading, getCurrentPosition, watchPosition, stopWatching } = useGeolocation();
  
  // Initialize entry mode from settings
  const [entryMode, setEntryMode] = useState<EntryMode>(getDefaultEntryMode());
  const [busNumber, setBusNumber] = useState('');
  const [mainStreet, setMainStreet] = useState('');
  const [primaryCrossStreet, setPrimaryCrossStreet] = useState('');
  const [secondaryCrossStreet, setSecondaryCrossStreet] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [manualLocation, setManualLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [city, setCity] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error'; text: string } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedBusLocation, setSavedBusLocation] = useState<{
    busNumber: string;
    location: { lat: number; lng: number };
    address: string;
  } | null>(null);

  // Update entry mode from settings when component mounts (only if no bus selected)
  useEffect(() => {
    const defaultMode = getDefaultEntryMode();
    // Only update if we haven't selected a bus number yet (fresh state)
    if (!busNumber) {
      setEntryMode(defaultMode);
    }
  }, [busNumber]);

  // Get available bus numbers (1-225 excluding existing)
  const existingBusNumbers = new Set(buses.map((b) => b.busNumber));
  const availableBusNumbers = Array.from({ length: 225 }, (_, i) => i + 1)
    .filter((num) => !existingBusNumbers.has(num.toString()))
    .map((num) => num.toString());

  // Update selectedLocation when currentPosition changes in location mode
  // This ensures the map updates continuously as the user walks
  useEffect(() => {
    if (entryMode === 'location' && currentPosition) {
      setSelectedLocation({
        lat: currentPosition.latitude,
        lng: currentPosition.longitude,
      });
    }
  }, [entryMode, currentPosition]);

  // Auto-get location when switching to location mode
  useEffect(() => {
    if (entryMode === 'location' && !currentPosition && !geoLoading) {
      getCurrentPosition();
    }
  }, [entryMode, currentPosition, geoLoading, getCurrentPosition]);

  // Start continuous GPS tracking when in location mode - updates as user walks
  useEffect(() => {
    if (entryMode === 'location') {
      // Start watching position - will update continuously as user moves
      watchPosition();
    } else {
      // Stop watching when switching away from location mode
      stopWatching();
    }
    
    // Cleanup: stop watching when component unmounts or mode changes
    return () => {
      stopWatching();
    };
  }, [entryMode, watchPosition, stopWatching]);

  // Handle location mode - get current position when switching to location mode
  const handleLocationMode = () => {
    setEntryMode('location');
    setSelectedLocation(null);
    setFullAddress('');
    if (!currentPosition) {
      getCurrentPosition();
    }
  };

  // Store full address for display
  const [fullAddress, setFullAddress] = useState<string>('');

  // Handle geocode result from EditableLocationMap
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
      // If manual location is set (from map), use it; otherwise geocode will happen on submit
    }

    setLoading(true);
    setMessage(null);

    try {
      // If saving from current location, include coordinates and city
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
      }

      await api.saveBus(busData);
      
      // Prepare address string for display - format matches geocoding format
      let addressString: string;
      if (entryMode === 'location') {
        // For location mode, use fullAddress from geocoding if available
        // Otherwise construct from coordinates
        if (fullAddress) {
          addressString = fullAddress;
        } else {
          // Fallback: use coordinates or a generic message
          const locationForAddress = selectedLocation || (currentPosition ? {
            lat: currentPosition.latitude,
            lng: currentPosition.longitude,
          } : null);
          addressString = locationForAddress 
            ? `Location: ${locationForAddress.lat.toFixed(6)}, ${locationForAddress.lng.toFixed(6)}`
            : 'Current location';
        }
      } else {
        // For manual entry, use street-based address
        if (fullAddress) {
          addressString = fullAddress;
        } else if (secondaryCrossStreet && primaryCrossStreet) {
          addressString = `${mainStreet} between ${primaryCrossStreet} and ${secondaryCrossStreet}`;
        } else if (primaryCrossStreet) {
          addressString = `${mainStreet} at ${primaryCrossStreet}`;
        } else {
          addressString = mainStreet || 'Address not available';
        }
      }
      
      // Get location for confirmation modal and show modal
      if (entryMode === 'location') {
        // Use coordinates from location mode - show modal immediately
        const locationForModal = selectedLocation || (currentPosition ? {
          lat: currentPosition.latitude,
          lng: currentPosition.longitude,
        } : null);
        
        console.log('Location mode save:', { 
          locationForModal, 
          selectedLocation, 
          currentPosition, 
          addressString,
          fullAddress 
        });
        
        if (locationForModal) {
          setSavedBusLocation({
            busNumber,
            location: locationForModal,
            address: addressString,
          });
          setShowSuccessModal(true);
          console.log('Modal should be showing now');
        } else {
          console.error('No location available for modal:', { selectedLocation, currentPosition });
        }
      } else {
        // For manual entry, geocode the address to get coordinates
        // Always use "San Francisco" since the street selector only contains SF streets
        // Wait for Google Maps to be available (it will be loaded by EditableLocationMap if needed)
        const waitForGoogleMaps = (callback: () => void, maxAttempts = 50) => {
          if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
            callback();
          } else if (maxAttempts > 0) {
            setTimeout(() => waitForGoogleMaps(callback, maxAttempts - 1), 100);
          } else {
            // Timeout - show modal with default location
            setSavedBusLocation({
              busNumber,
              location: { lat: 37.7749, lng: -122.4194 },
              address: addressString,
            });
            setShowSuccessModal(true);
          }
        };
        
        if (mainStreet) {
          waitForGoogleMaps(() => {
            const geocoder = new google.maps.Geocoder();
            const mainStreetClean = mainStreet.replace(/\s*\([^)]*\)\s*/g, '').trim();
            // Always use San Francisco for manual entry - street selector is SF-only
            // For geocoding, always use the intersection of main street and primary cross street
            // Try "and" format first, as it's more commonly recognized
            const addressToGeocode = primaryCrossStreet 
              ? `${mainStreetClean} and ${primaryCrossStreet}, San Francisco, CA`
              : `${mainStreetClean}, San Francisco, CA`;
            
            console.log('Geocoding address:', addressToGeocode);
            
            geocoder.geocode({ address: addressToGeocode }, (results, status) => {
              console.log('Geocoding result:', { status, results: results?.[0]?.formatted_address });
              
              if (status === 'OK' && results && results[0]) {
                const location = results[0].geometry.location;
                const geocodedLocation = {
                  lat: location.lat(),
                  lng: location.lng(),
                };
                
                console.log('Geocoded location:', geocodedLocation);
                
                setSavedBusLocation({
                  busNumber,
                  location: geocodedLocation,
                  address: addressString, // Use our formatted address string, not geocoded result
                });
                setShowSuccessModal(true);
              } else {
                // Geocoding failed, try alternative format with "&"
                console.warn('First geocoding attempt failed, trying alternative format...');
                const alternativeAddress = primaryCrossStreet 
                  ? `${mainStreetClean} & ${primaryCrossStreet}, San Francisco, CA`
                  : `${mainStreetClean}, San Francisco, CA`;
                
                geocoder.geocode({ address: alternativeAddress }, (altResults, altStatus) => {
                  console.log('Alternative geocoding result:', { status: altStatus, results: altResults?.[0]?.formatted_address });
                  
                  if (altStatus === 'OK' && altResults && altResults[0]) {
                    const location = altResults[0].geometry.location;
                    const geocodedLocation = {
                      lat: location.lat(),
                      lng: location.lng(),
                    };
                    
                    console.log('Geocoded location (alternative):', geocodedLocation);
                    
                    setSavedBusLocation({
                      busNumber,
                      location: geocodedLocation,
                      address: addressString, // Use our formatted address string, not geocoded result
                    });
                    setShowSuccessModal(true);
                  } else {
                    // Both attempts failed, show modal with default location
                    console.error('Geocoding failed:', { status, altStatus, address: addressToGeocode, alternativeAddress });
                    setSavedBusLocation({
                      busNumber,
                      location: { lat: 37.7749, lng: -122.4194 }, // Default SF location
                      address: addressString,
                    });
                    setShowSuccessModal(true);
                  }
                });
              }
            });
          });
        } else {
          // No main street, show modal with default location
          setSavedBusLocation({
            busNumber,
            location: { lat: 37.7749, lng: -122.4194 }, // Default SF location
            address: addressString,
          });
          setShowSuccessModal(true);
        }
      }
      
      // Clear form and refresh bus list
      setBusNumber('');
      setMainStreet('');
      setPrimaryCrossStreet('');
      setSecondaryCrossStreet('');
      setSelectedLocation(null);
      setManualLocation(null);
      setCity('');
      setFullAddress('');
      
      // Refresh GPS location if location mode was used - ensures map shows new current position
      // This is critical when entering multiple bus locations while walking (e.g., 50' apart)
      // The map needs to refresh to show the updated GPS position after moving
      if (entryMode === 'location') {
        getCurrentPosition();
      }
      
      // Reset to default entry mode from settings
      setEntryMode(getDefaultEntryMode());
      refetch();
    } catch (error) {
      // Extract error message and sanitize to prevent displaying raw JSON
      let errorMessage = 'Failed to save bus location';
      
      if (error instanceof Error) {
        const rawMessage = error.message.trim();
        
        // Check if error message is JSON and sanitize it
        if (rawMessage.startsWith('{') || rawMessage.startsWith('[')) {
          try {
            const parsed = JSON.parse(rawMessage);
            errorMessage = parsed.message || 'Failed to save bus location. Please try again.';
          } catch {
            errorMessage = 'Failed to save bus location. Please try again.';
          }
        } else if (rawMessage.includes('"success"') || rawMessage.includes('"message"')) {
          errorMessage = 'Failed to save bus location. Please try again.';
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

  // Determine location to show on map
  // Default to San Francisco center if no location is available
  const defaultLocation = { lat: 37.7749, lng: -122.4194 }; // San Francisco center
  const mapLocation = entryMode === 'location' && selectedLocation
    ? selectedLocation
    : currentPosition
    ? { lat: currentPosition.latitude, lng: currentPosition.longitude }
    : defaultLocation; // Always provide a location so map can display

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700">
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-4 md:p-6">
          <AdminNav />
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-primary-700">
              Add New Bus Location
            </h1>
            <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">Enter bus location information</p>
          </div>

          {/* Bus Number Selection */}
          <div className="mb-4 md:mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bus Number <span className="text-red-500">*</span>
            </label>
            <select
              value={busNumber}
              onChange={(e) => setBusNumber(e.target.value)}
              required
              className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm md:text-base"
            >
              <option value="">-- Select Bus Number --</option>
              {availableBusNumbers.map((num) => (
                <option key={num} value={num}>
                  Bus #{num}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs md:text-sm text-gray-500">
              Only buses without existing locations are shown
            </p>
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
              Use Current Location
            </button>
            <button
              onClick={() => {
                setEntryMode('manual');
                setSelectedLocation(null);
                setManualLocation(null);
                setFullAddress('');
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

          {message && (
            <div className="mb-4 p-4 rounded-lg bg-red-100 border border-red-400 text-red-700">
              {(() => {
                // Final safety check - never display raw JSON
                const text = message.text;
                const trimmed = text.trim();
                if (trimmed.startsWith('{') || trimmed.startsWith('[') || 
                    text.includes('"success"') || text.includes('"message"')) {
                  return 'Failed to save bus location. Please try again.';
                }
                return text;
              })()}
            </div>
          )}

          <div className="space-y-6">
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
                  disabled={!busNumber}
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
            {entryMode === 'location' && busNumber && (
              <div className="space-y-4">
                <div>
                  {!currentPosition && !selectedLocation && (
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
            
            {/* Show message when bus number not selected */}
            {entryMode === 'location' && !busNumber && (
              <div className="p-8 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600">Please select a bus number to see the map</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || (entryMode === 'location' && !selectedLocation && !currentPosition)}
                className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Bus Location'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && savedBusLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-primary-700">
                  ✅ Bus {savedBusLocation.busNumber} Saved Successfully!
                </h2>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSavedBusLocation(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  <strong>Address:</strong> {savedBusLocation.address}
                </p>
              </div>
              
              <div className="h-[400px] rounded-lg overflow-hidden mb-4 border border-gray-200">
                <ReadOnlyMap
                  position={savedBusLocation.location}
                  apiKey={GOOGLE_MAPS_API_KEY || ''}
                  height="400px"
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSavedBusLocation(null);
                  }}
                  className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
