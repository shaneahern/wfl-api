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

    const response = await fetch(`${API_BASE_URL}/wfl?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
    });
    
    // Parse JSON response - response body can only be read once
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      // If JSON parsing fails, it's an error
      if (!response.ok) {
        throw new Error(`Failed to save bus: ${response.statusText}`);
      }
      throw new Error('Invalid response from server');
    }
    
    // Check response status
    if (!response.ok) {
      // Response was not OK, but we got JSON
      const errorMessage = data?.message || data?.error || `Failed to save bus: ${response.statusText}`;
      throw new Error(errorMessage);
    }
    
    // Response is OK, check if save was successful
    // Be lenient with success check - could be boolean true or string "true"
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from server');
    }
    
    const isSuccess = data.success === true || data.success === "true" || data.success === 1;
    if (isSuccess) {
      // Success - component will refresh the list
      return;
    } else {
      // Response OK but success is not true - this shouldn't happen, but handle it
      // Don't throw the raw JSON, extract message or use generic error
      const errorMessage = data.message || data.error || 'Failed to save bus';
      throw new Error(errorMessage);
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
