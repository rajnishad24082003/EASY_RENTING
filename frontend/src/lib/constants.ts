export interface City {
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  tagline: string;
}

export const CITIES: readonly City[] = [
  {
    name: "Bengaluru",
    state: "Karnataka",
    latitude: 12.9716,
    longitude: 77.5946,
    tagline: "Koramangala, HSR, Indiranagar…",
  },
  { name: "Mumbai", state: "Maharashtra", latitude: 19.076, longitude: 72.8777, tagline: "Andheri, Powai, Bandra…" },
  { name: "Pune", state: "Maharashtra", latitude: 18.5204, longitude: 73.8567, tagline: "Hinjewadi, Baner, Kharadi…" },
];

export const DEFAULT_MAP_CENTER = { latitude: CITIES[0].latitude, longitude: CITIES[0].longitude };

export function findCity(name: string | undefined): City | undefined {
  if (!name) return undefined;
  const needle = name.trim().toLowerCase();
  return CITIES.find((city) => city.name.toLowerCase() === needle);
}
