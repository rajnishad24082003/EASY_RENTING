"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

export interface Coordinates {
  lat: number;
  lng: number;
}

/** One-shot browser geolocation lookup with friendly error toasts. */
export function useGeolocation() {
  const [locating, setLocating] = useState(false);

  const locate = useCallback((): Promise<Coordinates | null> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Location isn't available in this browser.");
      return Promise.resolve(null);
    }
    setLocating(true);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocating(false);
          resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => {
          setLocating(false);
          toast.error(
            error.code === error.PERMISSION_DENIED
              ? "Location permission denied. Enable it in your browser settings."
              : "Couldn't determine your location.",
          );
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
      );
    });
  }, []);

  return { locate, locating };
}
