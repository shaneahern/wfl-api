import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBuses } from '../../hooks/useBuses';
import { StreetSelector } from '../../components/StreetSelector';
import { api } from '../../services/api';

export function BusInput() {
  const { buses, refetch } = useBuses();
  const [searchParams, setSearchParams] = useSearchParams();
  const [busNumber, setBusNumber] = useState('');
  const [mainStreet, setMainStreet] = useState('');
  const [primaryCrossStreet, setPrimaryCrossStreet] = useState('');
  const [secondaryCrossStreet, setSecondaryCrossStreet] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check for saved parameter in URL
  useEffect(() => {
    if (searchParams.get('saved') === 'true') {
      setMessage({ type: 'success', text: 'Bus location saved successfully!' });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Get available bus numbers (1-225 excluding existing)
  const existingBusNumbers = new Set(buses.map((b) => b.busNumber));
  const availableBusNumbers = Array.from({ length: 225 }, (_, i) => i + 1)
    .filter((num) => !existingBusNumbers.has(num.toString()))
    .map((num) => num.toString());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!busNumber || !mainStreet) {
      setMessage({ type: 'error', text: 'Bus number and main street are required' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await api.saveBus({
        busNumber,
        main_street: mainStreet,
        primary_cross_street: primaryCrossStreet || undefined,
        secondary_cross_street: secondaryCrossStreet || undefined,
      });
      
      setMessage({ type: 'success', text: 'Bus location saved successfully!' });
      setBusNumber('');
      setMainStreet('');
      setPrimaryCrossStreet('');
      setSecondaryCrossStreet('');
      refetch();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save bus location',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-primary-700 mb-2">
            WFL Bus Finder Admin
          </h1>
          <p className="text-gray-600 mb-6">Enter bus location information</p>

          {message && (
            <div
              className={`mb-4 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-100 border border-green-400 text-green-700'
                  : 'bg-red-100 border border-red-400 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bus Number <span className="text-red-500">*</span>
              </label>
              <select
                value={busNumber}
                onChange={(e) => setBusNumber(e.target.value)}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">-- Select Bus Number --</option>
                {availableBusNumbers.map((num) => (
                  <option key={num} value={num}>
                    Bus #{num}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Only buses without existing locations are shown
              </p>
            </div>

            <StreetSelector
              mainStreet={mainStreet}
              primaryCrossStreet={primaryCrossStreet}
              secondaryCrossStreet={secondaryCrossStreet}
              onMainStreetChange={setMainStreet}
              onPrimaryCrossStreetChange={setPrimaryCrossStreet}
              onSecondaryCrossStreetChange={setSecondaryCrossStreet}
              disabled={!busNumber}
            />

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Bus Location'}
              </button>
              <button
                type="button"
                onClick={refetch}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Refresh List
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Current Buses</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {buses.length === 0 ? (
                <p className="text-gray-500">No buses registered yet.</p>
              ) : (
                buses.map((bus) => (
                  <div
                    key={bus.busNumber}
                    className="p-3 bg-gray-50 rounded-lg text-sm"
                  >
                    <span className="font-semibold text-primary-600">
                      Bus {bus.busNumber || 'N/A'}
                    </span>
                    <br />
                    <strong>{bus.main_street || 'N/A'}</strong>
                    {bus.primary_cross_street && ` & ${bus.primary_cross_street}`}
                    {bus.secondary_cross_street && ` & ${bus.secondary_cross_street}`}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
