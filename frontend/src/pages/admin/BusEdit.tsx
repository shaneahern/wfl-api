import { useState, useEffect } from 'react';
import { useBuses } from '../../hooks/useBuses';
import { StreetSelector } from '../../components/StreetSelector';
import { api } from '../../services/api';

export function BusEdit() {
  const { buses, refetch } = useBuses();
  const [selectedBusId, setSelectedBusId] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [mainStreet, setMainStreet] = useState('');
  const [primaryCrossStreet, setPrimaryCrossStreet] = useState('');
  const [secondaryCrossStreet, setSecondaryCrossStreet] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (selectedBusId) {
      const bus = buses.find((b) => b.busNumber === selectedBusId);
      if (bus) {
        setBusNumber(bus.busNumber);
        setMainStreet(bus.main_street || '');
        setPrimaryCrossStreet(bus.primary_cross_street || '');
        setSecondaryCrossStreet(bus.secondary_cross_street || '');
      }
    } else {
      setBusNumber('');
      setMainStreet('');
      setPrimaryCrossStreet('');
      setSecondaryCrossStreet('');
    }
  }, [selectedBusId, buses]);

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
      
      setMessage({ type: 'success', text: 'Bus location updated successfully!' });
      setSelectedBusId('');
      refetch();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update bus location',
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
            Edit Bus Location
          </h1>
          <p className="text-gray-600 mb-6">Update existing bus location information</p>

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

          <div className="mb-6">
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
            <form onSubmit={handleSubmit} className="space-y-6">
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
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Bus Location'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
