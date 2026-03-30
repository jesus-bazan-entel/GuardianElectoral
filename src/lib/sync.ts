import { db } from "./db/indexed-db";
import { createClient } from "./supabase/client";

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
        syncError: err instanceof Error ? err.message : "Error desconocido",
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
        syncError: err instanceof Error ? err.message : "Error desconocido",
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
        syncError: err instanceof Error ? err.message : "Error desconocido",
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

export async function getPendingCount(): Promise<number> {
  const [checkins, actas, incidents] = await Promise.all([
    db.checkins.where("syncStatus").equals("pending").count(),
    db.actas.where("syncStatus").equals("pending").count(),
    db.incidents.where("syncStatus").equals("pending").count(),
  ]);
  return checkins + actas + incidents;
}
