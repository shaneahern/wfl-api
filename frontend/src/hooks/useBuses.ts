import { useState, useEffect } from 'react';
import type { Bus } from '../types';
import { api } from '../services/api';

export function useBuses() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBuses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getBuses();
      setBuses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch buses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
  }, []);

  return { buses, loading, error, refetch: fetchBuses };
}
