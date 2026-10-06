import L from "leaflet";

/** Rent label pin rendered as a DivIcon (avoids Leaflet's bundler-unfriendly default marker images). */
export function priceIcon(label: string, active: boolean): L.DivIcon {
  const span = document.createElement("span");
  span.className = "price-pin";
  span.dataset.active = String(active);
  span.textContent = label;
  return L.divIcon({ html: span, className: "", iconSize: [0, 0] });
}

export function locationIcon(): L.DivIcon {
  return L.divIcon({ html: '<span class="location-pin block"></span>', className: "", iconSize: [0, 0] });
}

export const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
