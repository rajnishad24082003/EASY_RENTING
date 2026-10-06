"use client";

import { useEffect, useState } from "react";
import { apiFetchBlob } from "@/lib/api/client";

/**
 * Opens an access-controlled file (`/api/v1/files/private/...`) in a new tab. The file is fetched with the
 * bearer token, since a plain link can't carry it. The tab is opened synchronously to dodge popup blockers.
 */
export async function openProtectedFile(url: string): Promise<void> {
  const win = window.open("", "_blank");
  try {
    const objectUrl = URL.createObjectURL(await apiFetchBlob(url));
    if (win) win.location.href = objectUrl;
    else window.location.assign(objectUrl);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (error) {
    win?.close();
    throw error;
  }
}

/** Object URL for an access-controlled file, for inline previews. Revoked on unmount/change. */
export function useProtectedObjectUrl(url: string | null): { objectUrl: string | null; failed: boolean } {
  const [state, setState] = useState<{ url: string; objectUrl: string | null; failed: boolean } | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let created: string | null = null;
    apiFetchBlob(url)
      .then((blob) => {
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setState({ url, objectUrl: created, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ url, objectUrl: null, failed: true });
      });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [url]);

  return state && state.url === url
    ? { objectUrl: state.objectUrl, failed: state.failed }
    : { objectUrl: null, failed: false };
}
