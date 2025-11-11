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
    latitude?: number;
    longitude?: number;
    city?: string;
  }): Promise<void> {
    const params = new URLSearchParams();
    params.append('busNumber', bus.busNumber);
    if (bus.main_street) params.append('main_street', bus.main_street);
    if (bus.primary_cross_street) params.append('primary_cross_street', bus.primary_cross_street);
    if (bus.secondary_cross_street) params.append('secondary_cross_street', bus.secondary_cross_street);
    if (bus.latitude !== undefined) params.append('latitude', bus.latitude.toString());
    if (bus.longitude !== undefined) params.append('longitude', bus.longitude.toString());
    if (bus.city) params.append('city', bus.city);

    const response = await fetch(`${API_BASE_URL}/wfl?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
    });
    
    // Check response headers and body
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response ok:', response.ok, 'status:', response.status);
    
    // Read response as text first to see what we're actually getting
    const responseText = await response.text();
    console.log('Response text:', responseText);
    console.log('Response text length:', responseText.length);
    
    // Parse JSON response
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : null;
      console.log('Save bus response:', { status: response.status, statusText: response.statusText, data });
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError, 'Response text:', responseText);
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
    console.log('Checking response data:', { data, type: typeof data, isObject: typeof data === 'object', hasSuccess: 'success' in (data || {}) });
    if (!data || typeof data !== 'object') {
      console.error('Invalid data format:', { data, type: typeof data });
      throw new Error('Invalid response format from server');
    }
    
    const isSuccess = data.success === true || data.success === "true" || data.success === 1;
    console.log('Success check:', { isSuccess, successValue: data.success, successType: typeof data.success });
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
