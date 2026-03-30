"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useGeolocation } from "@/hooks/useGeolocation";
import { db, type LocalCheckin } from "@/lib/db/indexed-db";
import { useTenantContext } from "@/components/TenantProvider";
import type { GeoPosition } from "@/types";
import nextDynamic from "next/dynamic";

// Dynamic import - Leaflet doesn't work server-side
const LocationMap = nextDynamic(() => import("@/components/LocationMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-52 rounded-xl bg-gray-100 flex items-center justify-center">
      <p className="text-sm text-gray-400">Cargando mapa...</p>
    </div>
  ),
});

export default function CheckinPage() {
  const { position, loading: geoLoading, error: geoError, requestPosition } = useGeolocation();
  const { session } = useTenantContext();
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [lastAction, setLastAction] = useState<LocalCheckin | null>(null);
  const [history, setHistory] = useState<LocalCheckin[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState<GeoPosition | null>(null);

  useEffect(() => {
    requestPosition();
    loadHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When GPS position is obtained, set it as adjusted position too
  useEffect(() => {
    if (position && !adjustedPosition) {
      setAdjustedPosition(position);
    }
  }, [position]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadHistory() {
    const items = await db.checkins.orderBy("timestamp").reverse().limit(10).toArray();
    setHistory(items);
    if (items.length > 0) setLastAction(items[0]);
  }

  const isCheckedIn = lastAction?.type === "checkin";

  // The position to use: adjusted (if user moved marker) or GPS
  const finalPosition = adjustedPosition || position;
  const wasManuallyAdjusted = adjustedPosition && position &&
    (adjustedPosition.lat !== position.lat || adjustedPosition.lng !== position.lng);

  async function handleCheckin(type: "checkin" | "checkout") {
    setCheckinLoading(true);
    setSuccess(null);

    try {
      // Get fresh GPS if no position yet
      let pos = finalPosition;
      if (!pos) {
        pos = await requestPosition();
      }
      if (!session) throw new Error("No autenticado");

      const record: LocalCheckin = {
        userId: session.personero_id,
        type,
        lat: pos?.lat ?? null,
        lng: pos?.lng ?? null,
        accuracyMeters: wasManuallyAdjusted ? 0 : (pos?.accuracy ?? null),
        timestamp: new Date().toISOString(),
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          manuallyAdjusted: !!wasManuallyAdjusted,
        },
        syncStatus: "pending",
      };

      await db.checkins.add(record);
      await loadHistory();
      setSuccess(type === "checkin" ? "Check-in registrado" : "Check-out registrado");

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error en check-in:", err);
    } finally {
      setCheckinLoading(false);
    }
  }

  function handleMapPositionChange(newPos: GeoPosition) {
    setAdjustedPosition(newPos);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Check-in / Check-out</h1>
        <p className="text-sm text-gray-500">Registra tu llegada y salida con ubicación GPS</p>
      </div>

      {/* GPS Status */}
      <Card>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${position ? "bg-green-100" : geoError ? "bg-red-100" : "bg-gray-100"}`}>
            <svg className={`w-5 h-5 ${position ? "text-green-600" : geoError ? "text-red-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {geoLoading ? "Obteniendo ubicación..." : position ? "Ubicación obtenida" : "GPS no disponible"}
            </p>
            {finalPosition && (
              <p className="text-xs text-gray-500 truncate">
                {finalPosition.lat.toFixed(6)}, {finalPosition.lng.toFixed(6)}
                {wasManuallyAdjusted ? " (ajustada)" : ` (±${Math.round(finalPosition.accuracy)}m)`}
              </p>
            )}
            {geoError && <p className="text-xs text-red-600">{geoError}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {position && (
              <button
                onClick={() => setShowMap(!showMap)}
                className={`p-2 rounded-lg transition-colors ${showMap ? "bg-primary-100 text-primary-700" : "text-gray-400 hover:bg-gray-100"}`}
                title="Ver en mapa"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </button>
            )}
            <button onClick={requestPosition} disabled={geoLoading} className="p-2 text-primary-600 hover:bg-gray-100 rounded-lg">
              <svg className={`w-5 h-5 ${geoLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Map */}
        {showMap && finalPosition && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <LocationMap
              position={finalPosition}
              onPositionChange={handleMapPositionChange}
              accuracy={wasManuallyAdjusted ? undefined : finalPosition.accuracy}
            />
            {wasManuallyAdjusted && (
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-primary-600 font-medium">
                  Ubicación ajustada manualmente
                </p>
                <button
                  onClick={() => { if (position) setAdjustedPosition(position); }}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Restaurar GPS
                </button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 text-center font-medium text-sm animate-pulse">
          {success}
        </div>
      )}

      {/* Big Action Buttons */}
      <div className="grid grid-cols-1 gap-4">
        <Button
          size="xl"
          variant="success"
          className="w-full h-28 text-2xl rounded-2xl shadow-lg"
          onClick={() => handleCheckin("checkin")}
          loading={checkinLoading}
          disabled={isCheckedIn}
        >
          <div className="flex flex-col items-center">
            <svg className="w-10 h-10 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            CHECK-IN
          </div>
        </Button>

        <Button
          size="xl"
          variant="danger"
          className="w-full h-28 text-2xl rounded-2xl shadow-lg"
          onClick={() => handleCheckin("checkout")}
          loading={checkinLoading}
          disabled={!isCheckedIn}
        >
          <div className="flex flex-col items-center">
            <svg className="w-10 h-10 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            CHECK-OUT
          </div>
        </Button>
      </div>

      {isCheckedIn && (
        <p className="text-center text-sm text-green-600 font-medium">
          Actualmente registrado como presente
        </p>
      )}
      {!isCheckedIn && lastAction && (
        <p className="text-center text-sm text-gray-500">
          Registra tu ingreso para iniciar
        </p>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3">Historial reciente</h3>
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.localId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <Badge variant={item.type === "checkin" ? "success" : "danger"}>
                    {item.type === "checkin" ? "Ingreso" : "Salida"}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {new Date(item.timestamp).toLocaleString("es", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
                <Badge variant={item.syncStatus === "synced" ? "success" : item.syncStatus === "error" ? "danger" : "warning"}>
                  {item.syncStatus === "synced" ? "Sync" : item.syncStatus === "error" ? "Error" : "Pendiente"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
