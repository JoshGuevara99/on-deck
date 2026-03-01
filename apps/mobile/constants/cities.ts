export interface CityOption {
  city: string;   // value sent to the API filter
  label: string;  // display string e.g. "Austin, TX"
  lat?: number;   // undefined for custom-typed cities (map won't re-center)
  lng?: number;
}

export const PRESET_CITIES: CityOption[] = [
  { city: 'Austin',      label: 'Austin, TX',       lat: 30.2672,  lng: -97.7431  },
  { city: 'New York',    label: 'New York, NY',      lat: 40.7128,  lng: -74.0060  },
  { city: 'Brooklyn',    label: 'Brooklyn, NY',      lat: 40.6782,  lng: -73.9442  },
  { city: 'Nashville',   label: 'Nashville, TN',     lat: 36.1627,  lng: -86.7816  },
  { city: 'Los Angeles', label: 'Los Angeles, CA',   lat: 34.0522,  lng: -118.2437 },
  { city: 'Chicago',     label: 'Chicago, IL',       lat: 41.8781,  lng: -87.6298  },
  { city: 'Denver',      label: 'Denver, CO',        lat: 39.7392,  lng: -104.9903 },
  { city: 'Seattle',     label: 'Seattle, WA',       lat: 47.6062,  lng: -122.3321 },
  { city: 'Portland',    label: 'Portland, OR',      lat: 45.5051,  lng: -122.6750 },
  { city: 'Atlanta',     label: 'Atlanta, GA',       lat: 33.7490,  lng: -84.3880  },
];

export const DEFAULT_CITY = PRESET_CITIES[0]; // Austin, TX
