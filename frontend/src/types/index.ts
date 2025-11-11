// Types for bus data
export interface Bus {
  busNumber: string;
  main_street?: string;
  primary_cross_street?: string;
  secondary_cross_street?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
}

export interface StreetData {
  main_streets: string[];
  cross_streets: Record<string, string[]>;
  secondary_cross_streets: Record<string, string[]>;
}
