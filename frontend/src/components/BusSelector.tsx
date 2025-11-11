import type { Bus } from '../types';

interface BusSelectorProps {
  buses: Bus[];
  selectedBusNumber: string;
  onSelect: (busNumber: string) => void;
  loading?: boolean;
}

export function BusSelector({ buses, selectedBusNumber, onSelect, loading }: BusSelectorProps) {
  if (loading) {
    return (
      <div className="w-full p-4 text-center text-gray-500">
        Loading buses...
      </div>
    );
  }

  return (
    <select
      value={selectedBusNumber}
      onChange={(e) => onSelect(e.target.value)}
      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
    >
      <option value="">Select your bus number</option>
      {buses.map((bus) => {
        const displayText = bus.primary_cross_street
          ? `Bus #${bus.busNumber} - on ${bus.main_street} and ${bus.primary_cross_street}`
          : `Bus #${bus.busNumber} - on ${bus.main_street || 'Unknown'}`;
        return (
          <option key={bus.busNumber} value={bus.busNumber}>
            {displayText}
          </option>
        );
      })}
    </select>
  );
}
