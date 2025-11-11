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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-6">
          <AdminNav />
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-primary-700">All Bus Locations</h1>
          </div>

          {/* View Mode Toggle */}
          <div className="mb-6 flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 font-medium transition-colors ${
                viewMode === 'list'
                  ? 'border-b-2 border-primary-500 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 font-medium transition-colors ${
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
            <div className="mb-6">
              {buses.length === 0 ? (
                <div className="h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">No buses registered yet. Add a bus to see it on the map.</p>
                </div>
              ) : (
                <div className="h-[600px] rounded-lg overflow-hidden relative">
                  <AdminBusMap buses={buses} apiKey={GOOGLE_MAPS_API_KEY || ''} />
                </div>
              )}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {buses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No buses registered yet.</p>
              ) : (
                buses.map((bus) => (
                  <div
                    key={bus.busNumber}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-semibold text-primary-600 text-lg">
                          Bus {bus.busNumber || 'N/A'}
                        </span>
                        <div className="mt-1 text-gray-700">
                          <strong>{bus.main_street || 'N/A'}</strong>
                          {bus.primary_cross_street && ` & ${bus.primary_cross_street}`}
                          {bus.secondary_cross_street && ` & ${bus.secondary_cross_street}`}
                        </div>
                      </div>
                      <Link
                        to={`/admin/edit?bus=${bus.busNumber}`}
                        className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
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
