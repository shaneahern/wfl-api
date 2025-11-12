import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBuses } from '../../hooks/useBuses';
import { AdminBusMap } from '../../components/AdminBusMap';
import { AdminNav } from '../../components/AdminNav';

// Google Maps API key must be set via VITE_GOOGLE_MAPS_API_KEY environment variable
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

type ViewMode = 'map' | 'list';

export function BusList() {
  const { buses, loading, error } = useBuses();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <p className="text-gray-600">Loading buses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700">
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-8">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-4 md:p-6">
          <AdminNav />
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-primary-700">All Bus Locations</h1>
          </div>

          {/* View Mode Toggle */}
          <div className="mb-4 md:mb-6 flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 md:px-4 py-2 font-medium transition-colors text-sm md:text-base ${
                viewMode === 'list'
                  ? 'border-b-2 border-primary-500 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 md:px-4 py-2 font-medium transition-colors text-sm md:text-base ${
                viewMode === 'map'
                  ? 'border-b-2 border-primary-500 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Map View
            </button>
          </div>

          {/* Map View */}
          {viewMode === 'map' && (
            <div className="mb-4 md:mb-6">
              {buses.length === 0 ? (
                <div className="h-[400px] md:h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500 text-sm md:text-base px-4">No buses registered yet. Add a bus to see it on the map.</p>
                </div>
              ) : (
                <div className="h-[400px] md:h-[600px] rounded-lg overflow-hidden relative">
                  <AdminBusMap buses={buses} apiKey={GOOGLE_MAPS_API_KEY || ''} />
                </div>
              )}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="space-y-2 max-h-[calc(100vh-250px)] md:max-h-[calc(100vh-300px)] overflow-y-auto">
              {buses.length === 0 ? (
                <p className="text-gray-500 text-center py-8 text-sm md:text-base">No buses registered yet.</p>
              ) : (
                buses.map((bus) => (
                  <div
                    key={bus.busNumber}
                    className="p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-primary-600 text-base md:text-lg">
                          Bus {bus.busNumber || 'N/A'}
                        </span>
                        <div className="mt-1 text-gray-700 text-sm md:text-base">
                          <strong>{bus.main_street || 'N/A'}</strong>
                          {bus.primary_cross_street && ` & ${bus.primary_cross_street}`}
                          {bus.secondary_cross_street && ` & ${bus.secondary_cross_street}`}
                        </div>
                      </div>
                      <Link
                        to={`/admin/edit?bus=${bus.busNumber}`}
                        className="px-3 py-1 text-xs md:text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 whitespace-nowrap"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
