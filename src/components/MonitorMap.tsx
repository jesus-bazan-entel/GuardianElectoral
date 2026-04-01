"use client";

import { useEffect, useRef, useState } from "react";

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: "center" | "personero";
  color: string;
  popup?: string;
  data?: Record<string, unknown>;
}

interface MonitorMapProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  flyTo?: { lat: number; lng: number; zoom: number } | null;
  onMarkerClick?: (marker: MapMarker) => void;
}

export default function MonitorMap({ markers, center = [-9.19, -75.015], zoom = 6, flyTo, onMarkerClick }: MonitorMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    import("leaflet").then((leaflet) => {
      setL(leaflet.default || leaflet);
    });
  }, []);

  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;

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
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Light map tiles for better visibility
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Zoom control on right side
    L.control.zoom({ position: "topright" }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;
    setLoaded(true);

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, [L]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers when data changes
  useEffect(() => {
    if (!L || !markersLayerRef.current || !loaded) return;

    markersLayerRef.current.clearLayers();

    markers.forEach((m) => {
      if (!m.lat || !m.lng) return;

      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="
          width: ${m.type === "center" ? "12px" : "16px"};
          height: ${m.type === "center" ? "12px" : "16px"};
          background: ${m.color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          ${m.type === "personero" ? "animation: pulse 2s infinite;" : ""}
        "></div>`,
        iconSize: [m.type === "center" ? 12 : 16, m.type === "center" ? 12 : 16],
        iconAnchor: [m.type === "center" ? 6 : 8, m.type === "center" ? 6 : 8],
      });

      const marker = L.marker([m.lat, m.lng], { icon }).addTo(markersLayerRef.current!);

      if (m.popup) {
        marker.bindPopup(`
          <div style="font-family: system-ui; min-width: 180px;">
            ${m.popup}
          </div>
        `);
      }

      if (onMarkerClick) {
        marker.on("click", () => onMarkerClick(m));
      }
    });
  }, [markers, L, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // FlyTo when requested
  useEffect(() => {
    if (!mapInstanceRef.current || !loaded || !flyTo) return;
    mapInstanceRef.current.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom, { duration: 1.5 });
  }, [flyTo?.lat, flyTo?.lng, flyTo?.zoom, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fit bounds when markers change (only if many markers, otherwise keep initial view)
  useEffect(() => {
    if (!L || !mapInstanceRef.current || !loaded || markers.length === 0) return;

    const validMarkers = markers.filter((m) => m.lat && m.lng);
    if (validMarkers.length > 3) {
      const bounds = L.latLngBounds(validMarkers.map((m) => [m.lat, m.lng]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
    // For 1-3 markers, keep the initial center/zoom (Peru view)
  }, [markers.length, L, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.8; }
        }
        .custom-marker { background: none !important; border: none !important; }
        .leaflet-popup-content-wrapper { border-radius: 12px; }
      `}</style>
      <div ref={mapRef} className="w-full h-full" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 mx-auto text-blue-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-400 text-sm mt-2">Cargando mapa...</p>
          </div>
        </div>
      )}
    </>
  );
}
