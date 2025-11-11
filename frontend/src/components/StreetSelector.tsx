import { useState, useEffect } from 'react';
import type { StreetData } from '../types';
import { api } from '../services/api';

interface StreetSelectorProps {
  mainStreet: string;
  primaryCrossStreet: string;
  secondaryCrossStreet: string;
  onMainStreetChange: (street: string) => void;
  onPrimaryCrossStreetChange: (street: string) => void;
  onSecondaryCrossStreetChange: (street: string) => void;
  disabled?: boolean;
}

export function StreetSelector({
  mainStreet,
  primaryCrossStreet,
  secondaryCrossStreet,
  onMainStreetChange,
  onPrimaryCrossStreetChange,
  onSecondaryCrossStreetChange,
  disabled = false,
}: StreetSelectorProps) {
  const [streetData, setStreetData] = useState<StreetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStreets()
      .then(setStreetData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Reset secondary cross street when main or primary changes
    if (secondaryCrossStreet) {
      onSecondaryCrossStreetChange('');
    }
  }, [mainStreet, primaryCrossStreet]);

  if (loading || !streetData) {
    return <div className="text-gray-500">Loading streets...</div>;
  }

  const primaryOptions = mainStreet && streetData.cross_streets[mainStreet]
    ? streetData.cross_streets[mainStreet]
    : [];

  // Get secondary cross street options
  const getSecondaryOptions = (): string[] => {
    if (!primaryCrossStreet) return [];
    
    // Try specific match first: main_street|primary_cross_street
    const specificKey = `${mainStreet}|${primaryCrossStreet}`;
    if (streetData.secondary_cross_streets[specificKey]) {
      return streetData.secondary_cross_streets[specificKey];
    }
    
    // Try wildcard match: *|primary_cross_street
    const wildcardKey = `*|${primaryCrossStreet}`;
    if (streetData.secondary_cross_streets[wildcardKey]) {
      return streetData.secondary_cross_streets[wildcardKey];
    }
    
    return [];
  };

  const secondaryOptions = getSecondaryOptions();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Main Street <span className="text-red-500">*</span>
        </label>
        <select
          value={mainStreet}
          onChange={(e) => onMainStreetChange(e.target.value)}
          disabled={disabled}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">-- Select Main Street --</option>
          {streetData.main_streets.map((street) => (
            <option key={street} value={street}>
              {street}
            </option>
          ))}
        </select>
      </div>

      {mainStreet && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary Cross Street
          </label>
          <select
            value={primaryCrossStreet}
            onChange={(e) => onPrimaryCrossStreetChange(e.target.value)}
            disabled={disabled}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">-- Select Cross Street --</option>
            {primaryOptions.map((street) => (
              <option key={street} value={street}>
                {street}
              </option>
            ))}
          </select>
        </div>
      )}

      {primaryCrossStreet && secondaryOptions.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Secondary Cross Street
          </label>
          <select
            value={secondaryCrossStreet}
            onChange={(e) => onSecondaryCrossStreetChange(e.target.value)}
            disabled={disabled}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">-- Select Cross Street --</option>
            {secondaryOptions.map((street) => (
              <option key={street} value={street}>
                {street}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
