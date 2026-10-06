"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { locationIcon, OSM_ATTRIBUTION, OSM_TILE_URL } from "./leaflet-utils";

/** Static single-pin map (load via next/dynamic with ssr: false). */
export default function LocationMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      scrollWheelZoom={false}
      className="size-full"
      aria-label="Property location map"
    >
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      <Marker position={[latitude, longitude]} icon={locationIcon()} />
    </MapContainer>
  );
}
