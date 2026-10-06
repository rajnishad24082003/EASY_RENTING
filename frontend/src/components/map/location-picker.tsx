"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { DEFAULT_MAP_CENTER } from "@/lib/constants";
import { locationIcon, OSM_ATTRIBUTION, OSM_TILE_URL } from "./leaflet-utils";

export interface LatLng {
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
  /** Re-centres the map when it changes (e.g. after picking a locality). */
  focus: (LatLng & { zoom: number }) | null;
}

function ClickToPlace({ onChange }: Pick<LocationPickerProps, "onChange">) {
  useMapEvents({ click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function FocusController({ focus }: Pick<LocationPickerProps, "focus">) {
  const map = useMap();
  const lat = focus?.lat;
  const lng = focus?.lng;
  const zoom = focus?.zoom;
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) map.flyTo([lat, lng], zoom ?? 15, { duration: 0.6 });
  }, [map, lat, lng, zoom]);
  return null;
}

/** Click anywhere or drag the pin to set coordinates (load via next/dynamic with ssr: false). */
export default function LocationPicker({ value, onChange, focus }: LocationPickerProps) {
  const center: [number, number] = value
    ? [value.lat, value.lng]
    : [DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude];
  return (
    <MapContainer center={center} zoom={value ? 15 : 11} className="size-full" aria-label="Pick the property location">
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      <ClickToPlace onChange={onChange} />
      <FocusController focus={focus} />
      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={locationIcon()}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const { lat, lng } = e.target.getLatLng();
              onChange({ lat, lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
