import type { GeoPosition } from "@/types";

export function getCurrentPosition(
  timeoutMs = 10000
): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalización no disponible en este dispositivo"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("Permiso de ubicación denegado. Activa el GPS en los ajustes."));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("Ubicación no disponible. Verifica tu GPS."));
            break;
          case error.TIMEOUT:
            reject(new Error("Tiempo de espera agotado obteniendo ubicación."));
            break;
          default:
            reject(new Error("Error desconocido al obtener ubicación."));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 30000,
      }
    );
  });
}
