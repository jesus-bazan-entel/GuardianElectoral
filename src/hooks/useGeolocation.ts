"use client";

import { useState, useCallback } from "react";
import { getCurrentPosition } from "@/lib/geo";
import type { GeoPosition } from "@/types";

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPosition = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pos = await getCurrentPosition();
      setPosition(pos);
      return pos;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error de ubicación";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { position, loading, error, requestPosition };
}
