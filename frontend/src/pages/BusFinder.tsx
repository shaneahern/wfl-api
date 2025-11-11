import { useState } from 'react';
import { useBuses } from '../hooks/useBuses';
import { useGeolocation } from '../hooks/useGeolocation';
import { BusSelector } from '../components/BusSelector';
import { BusMap } from '../components/BusMap';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyA_hsPlpwVhYZBBSkKqSrCpT0UlapoCT3E';

export function BusFinder() {
  const { buses, loading, error } = useBuses();
  const { position: userPosition } = useGeolocation();
  const [selectedBusNumber, setSelectedBusNumber] = useState('');
  const [busNumberInput, setBusNumberInput] = useState('');

  const selectedBus = buses.find((b) => b.busNumber === selectedBusNumber);

  const userLocation = userPosition
    ? { lat: userPosition.latitude, lng: userPosition.longitude }
    : null;

  const handleBusNumberSubmit = () => {
    if (busNumberInput.trim()) {
      const bus = buses.find((b) => b.busNumber === busNumberInput.trim());
      if (bus) {
        setSelectedBusNumber(bus.busNumber);
      }
    }
  };

  const openMapDirections = () => {
    if (!selectedBus || !selectedBus.main_street || !selectedBus.primary_cross_street) return;

    const address = `${selectedBus.main_street} and ${selectedBus.primary_cross_street}, San Francisco, CA`;
    const url = userLocation
      ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${encodeURIComponent(address)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    
    window.open(url, '_blank');
  };

  const getSideOfStreet = (mainStreet: string): string => {
    if (mainStreet === 'Folsom Street' || mainStreet === 'Bryant Street') {
      return ' (south side)';
    } else if (mainStreet === 'Harrison Street') {
      return ' (north side)';
    } else if (mainStreet === 'The Embarcadero') {
      return ' (west side)';
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-primary-700 mb-2">
            Walk for Life West Coast Bus Finder
          </h1>
          <p className="text-gray-600 mb-6">Find your bus location</p>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter your bus number:
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={busNumberInput}
                  onChange={(e) => setBusNumberInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleBusNumberSubmit()}
                  placeholder="e.g., 123"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={handleBusNumberSubmit}
                  className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  Find Bus
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or select from list:
              </label>
              <BusSelector
                buses={buses}
                selectedBusNumber={selectedBusNumber}
                onSelect={setSelectedBusNumber}
                loading={loading}
              />
            </div>

            {selectedBus && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Bus #{selectedBus.busNumber}
                  </h3>
                  {selectedBus.main_street && (
                    <p className="text-gray-700">
                      <strong>{selectedBus.main_street}{getSideOfStreet(selectedBus.main_street)}</strong>
                      {selectedBus.primary_cross_street && (
                        <>
                          {' '}between <strong>{selectedBus.primary_cross_street}</strong>
                          {selectedBus.secondary_cross_street && (
                            <> and <strong>{selectedBus.secondary_cross_street}</strong></>
                          )}
                        </>
                      )}
                    </p>
                  )}
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <BusMap
                    bus={selectedBus}
                    userLocation={userLocation}
                    apiKey={GOOGLE_MAPS_API_KEY}
                  />
                </div>

                {userLocation && (
                  <p className="text-sm text-gray-600 text-center">
                    A = your location, B = street intersection closest to your bus location
                  </p>
                )}

                <button
                  onClick={openMapDirections}
                  className="w-full px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  View directions in Maps app
                </button>
              </div>
            )}

            {!selectedBus && selectedBusNumber && (
              <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                Bus number {selectedBusNumber} not found. Select a different bus number below, or report to Walk for Life staff at the end of the walk for help.
              </div>
            )}

            <div className="border-t pt-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">Event Information</h2>
              <div className="space-y-2">
                <a
                  href="https://www.google.com/maps/d/viewer?mid=zuPB0NjRXYwo.kMAwxEo5ivQE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center"
                >
                  Map of All Parking Locations
                </a>
                <a
                  href="http://www.walkforlifewc.com/event-info/event-schedule/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center"
                >
                  Event Schedule
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
