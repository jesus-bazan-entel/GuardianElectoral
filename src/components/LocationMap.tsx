"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoPosition } from "@/types";

interface LocationMapProps {
  position: GeoPosition;
  onPositionChange: (pos: GeoPosition) => void;
  accuracy?: number;
}

export default function LocationMap({ position, onPositionChange, accuracy }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);

  useEffect(() => {
    // Dynamic import of leaflet (client-only)
    import("leaflet").then((leaflet) => {
      setL(leaflet.default || leaflet);
    });
  }, []);

  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;

    // Fix default icon paths for webpack
    const proto = L.Icon.Default.prototype;
    if ("_getIconUrl" in proto) {
      delete (proto as never)["_getIconUrl"];
    }
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(mapRef.current, {
      center: [position.lat, position.lng],
      zoom: 17,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Accuracy circle
    if (accuracy) {
      L.circle([position.lat, position.lng], {
        radius: accuracy,
        color: "#3b82f6",
        fillColor: "#3b82f6",
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(map);
    }

    // Draggable marker
    const marker = L.marker([position.lat, position.lng], {
      draggable: true,
      autoPan: true,
    }).addTo(map);

    marker.bindPopup("Arrastra para ajustar tu ubicación").openPopup();

    marker.on("dragend", () => {
      const latlng = marker.getLatLng();
      onPositionChange({
        lat: latlng.lat,
        lng: latlng.lng,
        accuracy: 0, // Manual adjustment = perfect accuracy
      });
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;
    setLoaded(true);

    // Force map to recalculate size
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [L]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update marker when position changes externally
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current && loaded) {
      markerRef.current.setLatLng([position.lat, position.lng]);
      mapInstanceRef.current.setView([position.lat, position.lng], mapInstanceRef.current.getZoom());
    }
  }, [position.lat, position.lng, loaded]);

  return (
    <div className="relative">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div
        ref={mapRef}
        className="w-full h-52 rounded-xl overflow-hidden border border-gray-200 z-0"
      />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl">
          <p className="text-sm text-gray-500">Cargando mapa...</p>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-1.5 text-center">
        Arrastra el marcador para ajustar tu ubicación exacta
      </p>
    </div>
  );
}
