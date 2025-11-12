import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminNav } from '../../components/AdminNav';
import { useBuses } from '../../hooks/useBuses';

export function DeleteAllBuses() {
  const { buses, refetch } = useBuses();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleDeleteAll = async () => {
    if (!confirm(`Are you sure you want to delete ALL ${buses.length} buses? This action cannot be undone.`)) {
      return;
    }

    // Double confirmation - require typing "DELETE"
    const confirmation = prompt('This will permanently delete all bus data. Type "DELETE" (all caps) to confirm:');
    if (confirmation !== 'DELETE') {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

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
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete buses' }));
        const errorMessage = errorData.error || errorData.message || `Failed to delete buses (${response.status} ${response.statusText})`;
        console.error('Delete error:', { status: response.status, statusText: response.statusText, errorData });
        throw new Error(errorMessage);
      }

      await response.json(); // Read response but don't need to use it
      setSuccess(true);
      
      // Refresh the bus list
      await refetch();
      
      // Redirect to bus list after a short delay
      setTimeout(() => {
        navigate('/admin/list');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete buses');
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
            <h1 className="text-3xl font-bold text-primary-700">Delete All Buses</h1>
            <p className="text-gray-600 mt-2">Permanently delete all bus data from the database</p>
          </div>

          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-100 border border-red-400 text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 rounded-lg bg-green-100 border border-green-400 text-green-700">
              All buses have been deleted successfully. Redirecting...
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-yellow-800">Warning</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p className="mb-2">
                    This action will permanently delete <strong>all {buses.length} buses</strong> from the database.
                  </p>
                  <p>This action cannot be undone. Make sure you have a backup if needed.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleDeleteAll}
              disabled={loading || buses.length === 0}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Deleting...' : `Delete All ${buses.length} Buses`}
            </button>
            <button
              onClick={() => navigate('/admin/list')}
              disabled={loading}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>

          {buses.length === 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center text-gray-600">
              No buses to delete.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
