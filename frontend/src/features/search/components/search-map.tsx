"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { OSM_ATTRIBUTION, OSM_TILE_URL, priceIcon } from "@/components/map/leaflet-utils";
import { Button } from "@/components/ui/button";
import type { MapPinDto } from "@/lib/api/types";
import { DEFAULT_MAP_CENTER, findCity } from "@/lib/constants";
import { bhkLabel, formatINR, formatINRCompact } from "@/lib/format";
import { RADIUS_MAX_KM, RADIUS_MIN_KM } from "../filters";

export interface SearchMapProps {
  pins: MapPinDto[];
  geo: { lat: number; lng: number; radiusKm: number } | null;
  city?: string;
  activeId: string | null;
  onSearchArea: (area: { lat: number; lng: number; radiusKm: number }) => void;
}

/** Serialisable description of what the viewport should show; changes only when the search does. */
function fitTarget({ pins, geo, city }: Pick<SearchMapProps, "pins" | "geo" | "city">): string {
  if (geo) return `circle:${geo.lat}:${geo.lng}:${geo.radiusKm}`;
  if (pins.length > 0) {
    const lats = pins.map((p) => p.latitude);
    const lngs = pins.map((p) => p.longitude);
    return `bounds:${Math.min(...lats)}:${Math.min(...lngs)}:${Math.max(...lats)}:${Math.max(...lngs)}`;
  }
  return city ? `city:${city}` : "none";
}

function ViewportController({ target, programmaticRef }: { target: string; programmaticRef: RefObject<boolean> }) {
  const map = useMap();
  useEffect(() => {
    const [kind, ...rest] = target.split(":");
    const n = rest.map(Number);
    programmaticRef.current = true;
    if (kind === "circle") {
      map.fitBounds(L.latLng(n[0], n[1]).toBounds(n[2] * 2000), { padding: [24, 24] });
    } else if (kind === "bounds") {
      map.fitBounds(L.latLngBounds([n[0], n[1]], [n[2], n[3]]), { padding: [40, 40], maxZoom: 15 });
    } else if (kind === "city") {
      const c = findCity(rest.join(":"));
      if (c) map.setView([c.latitude, c.longitude], 12);
    } else {
      programmaticRef.current = false;
    }
  }, [map, target, programmaticRef]);
  return null;
}

function MoveListener({
  onUserMove,
  programmaticRef,
}: {
  onUserMove: () => void;
  programmaticRef: RefObject<boolean>;
}) {
  useMapEvents({
    moveend: () => {
      if (programmaticRef.current) {
        programmaticRef.current = false;
        return;
      }
      onUserMove();
    },
  });
  return null;
}

function SearchAreaButton({ onSearchArea, onDone }: Pick<SearchMapProps, "onSearchArea"> & { onDone: () => void }) {
  const map = useMap();
  return (
    <div className="absolute top-3 left-1/2 z-[1000] -translate-x-1/2">
      <Button
        variant="secondary"
        size="sm"
        className="rounded-full shadow-lg"
        onClick={() => {
          const center = map.getCenter();
          const bounds = map.getBounds();
          const halfWidthKm = map.distance(center, L.latLng(center.lat, bounds.getEast())) / 1000;
          const halfHeightKm = map.distance(center, L.latLng(bounds.getNorth(), center.lng)) / 1000;
          const radius = Math.min(halfWidthKm, halfHeightKm);
          const radiusKm = Math.min(RADIUS_MAX_KM, Math.max(RADIUS_MIN_KM, Math.round(radius * 2) / 2));
          onSearchArea({ lat: center.lat, lng: center.lng, radiusKm });
          onDone();
        }}
      >
        <Search aria-hidden /> Search this area
      </Button>
    </div>
  );
}

export default function SearchMap({ pins, geo, city, activeId, onSearchArea }: SearchMapProps) {
  const programmaticRef = useRef(true);
  const [moved, setMoved] = useState(false);
  const [initialCenter] = useState<[number, number]>(() => {
    if (geo) return [geo.lat, geo.lng];
    const c = findCity(city);
    return c ? [c.latitude, c.longitude] : [DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude];
  });

  return (
    <MapContainer center={initialCenter} zoom={12} scrollWheelZoom className="size-full" aria-label="Map of results">
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      <ViewportController target={fitTarget({ pins, geo, city })} programmaticRef={programmaticRef} />
      <MoveListener onUserMove={() => setMoved(true)} programmaticRef={programmaticRef} />
      {moved && <SearchAreaButton onSearchArea={onSearchArea} onDone={() => setMoved(false)} />}
      {geo && (
        <Circle
          center={[geo.lat, geo.lng]}
          radius={geo.radiusKm * 1000}
          pathOptions={{ color: "#e5484d", weight: 1.5, fillOpacity: 0.06 }}
        />
      )}
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          position={[pin.latitude, pin.longitude]}
          icon={priceIcon(formatINRCompact(pin.rent), pin.id === activeId)}
          zIndexOffset={pin.id === activeId ? 1000 : 0}
        >
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">
                {formatINR(pin.rent)}/mo · {bhkLabel(pin.bhk)}
              </p>
              <p className="line-clamp-2 text-xs text-zinc-600">{pin.title}</p>
              <Link href={`/properties/${pin.id}`} className="text-xs font-medium text-brand-700">
                View details →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
