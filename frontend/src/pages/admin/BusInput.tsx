import { useState } from 'react';
import { useBuses } from '../../hooks/useBuses';
import { StreetSelector } from '../../components/StreetSelector';
import { api } from '../../services/api';

export function BusInput() {
  const { buses, refetch } = useBuses();
  const [busNumber, setBusNumber] = useState('');
  const [mainStreet, setMainStreet] = useState('');
  const [primaryCrossStreet, setPrimaryCrossStreet] = useState('');
  const [secondaryCrossStreet, setSecondaryCrossStreet] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error'; text: string } | null>(null);

  // Get available bus numbers (1-225 excluding existing)
  const existingBusNumbers = new Set(buses.map((b) => b.busNumber));
  const availableBusNumbers = Array.from({ length: 225 }, (_, i) => i + 1)
    .filter((num) => !existingBusNumbers.has(num.toString()))
    .map((num) => num.toString());

  const handleSubmit = async () => {
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
      
      // Clear form and refresh bus list (no success message)
      setBusNumber('');
      setMainStreet('');
      setPrimaryCrossStreet('');
      setSecondaryCrossStreet('');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-primary-700 mb-2">
            WFL Bus Finder Admin
          </h1>
          <p className="text-gray-600 mb-6">Enter bus location information</p>

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
                type="button"
                onClick={handleSubmit}
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
          </div>

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
