import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminNav } from '../../components/AdminNav';
import { useBuses } from '../../hooks/useBuses';

type EntryMode = 'manual' | 'location';

const SETTINGS_STORAGE_KEY = 'adminSettings';

interface AdminSettings {
  defaultEntryMode: EntryMode;
}

const defaultSettings: AdminSettings = {
  defaultEntryMode: 'location',
};

function getSettings(): AdminSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return defaultSettings;
}

function saveSettings(settings: AdminSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

export function Settings() {
  const { buses, refetch } = useBuses();
  const [settings, setSettings] = useState<AdminSettings>(getSettings());
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Load settings on mount
    setSettings(getSettings());
  }, []);

  const handleDefaultEntryModeChange = (mode: EntryMode) => {
    const newSettings = { ...settings, defaultEntryMode: mode };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Are you sure you want to delete ALL ${buses.length} buses? This action cannot be undone.`)) {
      return;
    }

    // Double confirmation - require typing "DELETE"
    const confirmation = prompt('This will permanently delete all bus data. Type "DELETE" (all caps) to confirm:');
    if (confirmation !== 'DELETE') {
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);
    setDeleteSuccess(false);

    try {
      const authHeader = sessionStorage.getItem('adminAuth');
      if (!authHeader) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/admin/delete-all-buses', {
        method: 'DELETE',
        headers: {
          Authorization: authHeader,
        },
        credentials: 'omit',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete buses' }));
        const errorMessage = errorData.error || errorData.message || `Failed to delete buses (${response.status} ${response.statusText})`;
        console.error('Delete error:', { status: response.status, statusText: response.statusText, errorData });
        throw new Error(errorMessage);
      }

      await response.json();
      setDeleteSuccess(true);
      
      // Refresh the bus list
      await refetch();
      
      // Redirect to bus list after a short delay
      setTimeout(() => {
        navigate('/admin/list');
      }, 2000);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete buses');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700">
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-4 md:p-6">
          <AdminNav />
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-primary-700">Settings</h1>
            <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">Manage admin preferences</p>
          </div>

          <div className="space-y-6">
            {/* Default Entry Mode Setting */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3">Default Entry Mode</h2>
              <p className="text-sm md:text-base text-gray-600 mb-4">
                Choose the default mode when adding a new bus location.
              </p>
              <div className="space-y-2">
                <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="defaultEntryMode"
                    value="location"
                    checked={settings.defaultEntryMode === 'location'}
                    onChange={() => handleDefaultEntryModeChange('location')}
                    className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Use Current Location</div>
                    <div className="text-sm text-gray-500">Automatically use your device's GPS location</div>
                  </div>
                </label>
                <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="defaultEntryMode"
                    value="manual"
                    checked={settings.defaultEntryMode === 'manual'}
                    onChange={() => handleDefaultEntryModeChange('manual')}
                    className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Manual Entry</div>
                    <div className="text-sm text-gray-500">Enter street addresses manually</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Delete All Buses Section */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-lg md:text-xl font-semibold text-red-700 mb-3">Danger Zone</h2>
              
              {deleteError && (
                <div className="mb-4 p-3 md:p-4 rounded-lg bg-red-100 border border-red-400 text-red-700 text-sm md:text-base">
                  {deleteError}
                </div>
              )}

              {deleteSuccess && (
                <div className="mb-4 p-3 md:p-4 rounded-lg bg-green-100 border border-green-400 text-green-700 text-sm md:text-base">
                  All buses have been deleted successfully. Redirecting...
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 md:p-6 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 md:h-6 md:w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-base md:text-lg font-medium text-yellow-800">Warning</h3>
                    <div className="mt-2 text-xs md:text-sm text-yellow-700">
                      <p className="mb-2">
                        This action will permanently delete <strong>all {buses.length} buses</strong> from the database.
                      </p>
                      <p>This action cannot be undone. Make sure you have a backup if needed.</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDeleteAll}
                disabled={deleteLoading || buses.length === 0}
                className="w-full px-4 md:px-6 py-2 md:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
              >
                {deleteLoading ? 'Deleting...' : `Delete All ${buses.length} Buses`}
              </button>

              {buses.length === 0 && (
                <div className="mt-4 p-3 md:p-4 bg-gray-50 rounded-lg text-center text-gray-600 text-sm md:text-base">
                  No buses to delete.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export function to get default entry mode for use in other components
export function getDefaultEntryMode(): EntryMode {
  return getSettings().defaultEntryMode;
}
