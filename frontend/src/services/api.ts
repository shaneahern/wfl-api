import type { Bus, StreetData } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = {
  /**
   * Get all buses
   */
  async getBuses(): Promise<Bus[]> {
    const response = await fetch(`${API_BASE_URL}/wfl`);
    if (!response.ok) {
      throw new Error(`Failed to fetch buses: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Create or update a bus
   */
  async saveBus(bus: {
    busNumber: string;
    main_street?: string;
    primary_cross_street?: string;
    secondary_cross_street?: string;
  }): Promise<void> {
    const params = new URLSearchParams();
    params.append('busNumber', bus.busNumber);
    if (bus.main_street) params.append('main_street', bus.main_street);
    if (bus.primary_cross_street) params.append('primary_cross_street', bus.primary_cross_street);
    if (bus.secondary_cross_street) params.append('secondary_cross_street', bus.secondary_cross_street);

    const response = await fetch(`${API_BASE_URL}/wfl?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to save bus: ${response.statusText}`);
    }
    // If it's a redirect, that's fine - the backend handles it
    if (response.redirected) {
      window.location.href = response.url;
    }
  },

  /**
   * Get street data for dropdowns
   */
  async getStreets(): Promise<StreetData> {
    const response = await fetch(`${API_BASE_URL}/streets`);
    if (!response.ok) {
      throw new Error(`Failed to fetch streets: ${response.statusText}`);
    }
    return response.json();
  },
};
