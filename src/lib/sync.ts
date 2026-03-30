import { db } from "./db/indexed-db";
import { createClient } from "./supabase/client";

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);

  // Common Supabase errors translated to Spanish
  if (msg.includes("JWT")) return "Sesión expirada. Cierra sesión e ingresa de nuevo.";
  if (msg.includes("violates row-level security"))
    return "Sin permisos para guardar. Contacta al administrador.";
  if (msg.includes("violates foreign key"))
    return "Tu usuario no está registrado en el servidor. Regístrate de nuevo.";
  if (msg.includes("duplicate key"))
    return "Este registro ya existe en el servidor.";
  if (msg.includes("Bucket not found") || msg.includes("bucket"))
    return "El almacenamiento de fotos no está configurado. Contacta al administrador.";
  if (msg.includes("Payload too large") || msg.includes("413"))
    return "La foto es demasiado grande. Intenta con una foto más pequeña.";
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("network"))
    return "Sin conexión a internet. Se reintentará automáticamente.";
  if (msg.includes("new row violates"))
    return "Error de validación en el servidor. Contacta al administrador.";

  return `Error del servidor: ${msg.slice(0, 100)}`;
}

export async function syncPendingCheckins() {
  const supabase = createClient();
  const pending = await db.checkins
    .where("syncStatus")
    .equals("pending")
    .toArray();

  for (const checkin of pending) {
    try {
      await db.checkins.update(checkin.localId!, { syncStatus: "syncing" });

      const { error } = await supabase.from("checkins").insert({
        user_id: checkin.userId,
        type: checkin.type,
        lat: checkin.lat,
        lng: checkin.lng,
        accuracy_meters: checkin.accuracyMeters,
        timestamp: checkin.timestamp,
        device_info: checkin.deviceInfo,
      });

      if (error) throw error;

      await db.checkins.update(checkin.localId!, { syncStatus: "synced" });
    } catch (err) {
      await db.checkins.update(checkin.localId!, {
        syncStatus: "error",
        syncError: friendlyError(err),
      });
    }
  }
}

export async function syncPendingActas() {
  const supabase = createClient();
  const pending = await db.actas
    .where("syncStatus")
    .equals("pending")
    .toArray();

  for (const acta of pending) {
    try {
      await db.actas.update(acta.localId!, { syncStatus: "syncing" });

      // Upload photos first
      const photos = await db.photos
        .where("actaLocalId")
        .equals(acta.localId!)
        .toArray();

      const uploadedPaths: string[] = [];

      for (const photo of photos) {
        await db.photos.update(photo.localId!, { syncStatus: "syncing" });

        const filePath = `${acta.userId}/${acta.mesaId}/${Date.now()}_${photo.name}`;
        const { error: uploadError } = await supabase.storage
          .from("acta-photos")
          .upload(filePath, photo.blob, {
            contentType: "image/jpeg",
          });

        if (uploadError) throw uploadError;

        uploadedPaths.push(filePath);
        await db.photos.update(photo.localId!, {
          syncStatus: "synced",
          remotePath: filePath,
        });
      }

      // Insert acta record
      const { error } = await supabase.from("actas").insert({
        user_id: acta.userId,
        mesa_id: acta.mesaId,
        centro_id: acta.centroId,
        photos: uploadedPaths,
        top3_parties: acta.top3Parties,
        total_votes: acta.totalVotes,
        null_votes: acta.nullVotes,
        notes: acta.notes,
        status: "submitted",
      });

      if (error) throw error;

      await db.actas.update(acta.localId!, { syncStatus: "synced" });
    } catch (err) {
      await db.actas.update(acta.localId!, {
        syncStatus: "error",
        syncError: friendlyError(err),
      });
    }
  }
}

export async function syncPendingIncidents() {
  const supabase = createClient();
  const pending = await db.incidents
    .where("syncStatus")
    .equals("pending")
    .toArray();

  for (const incident of pending) {
    try {
      await db.incidents.update(incident.localId!, { syncStatus: "syncing" });

      const { error } = await supabase.from("incidents").insert({
        user_id: incident.userId,
        mesa_id: incident.mesaId,
        category: incident.category,
        description: incident.description,
        lat: incident.lat,
        lng: incident.lng,
        severity: incident.severity,
      });

      if (error) throw error;

      await db.incidents.update(incident.localId!, { syncStatus: "synced" });
    } catch (err) {
      await db.incidents.update(incident.localId!, {
        syncStatus: "error",
        syncError: friendlyError(err),
      });
    }
  }
}

export async function syncAll() {
  await Promise.allSettled([
    syncPendingCheckins(),
    syncPendingActas(),
    syncPendingIncidents(),
  ]);
}

export async function retryErrors() {
  // Reset all errors back to pending for retry
  const errorActas = await db.actas.where("syncStatus").equals("error").toArray();
  for (const acta of errorActas) {
    await db.actas.update(acta.localId!, { syncStatus: "pending", syncError: undefined });
  }
  const errorCheckins = await db.checkins.where("syncStatus").equals("error").toArray();
  for (const c of errorCheckins) {
    await db.checkins.update(c.localId!, { syncStatus: "pending", syncError: undefined });
  }
  const errorIncidents = await db.incidents.where("syncStatus").equals("error").toArray();
  for (const i of errorIncidents) {
    await db.incidents.update(i.localId!, { syncStatus: "pending", syncError: undefined });
  }
}

export async function getPendingCount(): Promise<number> {
  const [checkins, actas, incidents] = await Promise.all([
    db.checkins.where("syncStatus").equals("pending").count(),
    db.actas.where("syncStatus").equals("pending").count(),
    db.incidents.where("syncStatus").equals("pending").count(),
  ]);
  return checkins + actas + incidents;
}

export async function getErrorCount(): Promise<number> {
  const [checkins, actas, incidents] = await Promise.all([
    db.checkins.where("syncStatus").equals("error").count(),
    db.actas.where("syncStatus").equals("error").count(),
    db.incidents.where("syncStatus").equals("error").count(),
  ]);
  return checkins + actas + incidents;
}
