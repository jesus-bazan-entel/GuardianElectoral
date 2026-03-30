import Dexie, { type EntityTable } from "dexie";

export interface LocalCheckin {
  localId?: number;
  remoteId?: string;
  userId: string;
  type: "checkin" | "checkout";
  lat: number | null;
  lng: number | null;
  accuracyMeters: number | null;
  timestamp: string;
  deviceInfo: Record<string, unknown> | null;
  syncStatus: "pending" | "syncing" | "synced" | "error";
  syncError?: string;
}

export interface LocalActa {
  localId?: number;
  remoteId?: string;
  userId: string;
  mesaId: string;
  centroId: string | null;
  top3Parties: { party: string; votes: number; position: number }[];
  totalVotes: number | null;
  nullVotes: number | null;
  notes: string | null;
  status: "draft" | "submitted";
  syncStatus: "pending" | "syncing" | "synced" | "error";
  syncError?: string;
  createdAt: string;
}

export interface LocalPhoto {
  localId?: number;
  actaLocalId: number;
  blob: Blob;
  name: string;
  remotePath?: string;
  syncStatus: "pending" | "syncing" | "synced" | "error";
}

export interface LocalIncident {
  localId?: number;
  remoteId?: string;
  userId: string;
  mesaId: string | null;
  category: string;
  description: string;
  lat: number | null;
  lng: number | null;
  severity: string;
  syncStatus: "pending" | "syncing" | "synced" | "error";
  syncError?: string;
  createdAt: string;
}

const db = new Dexie("GuardianElectoralDB") as Dexie & {
  checkins: EntityTable<LocalCheckin, "localId">;
  actas: EntityTable<LocalActa, "localId">;
  photos: EntityTable<LocalPhoto, "localId">;
  incidents: EntityTable<LocalIncident, "localId">;
};

db.version(1).stores({
  checkins: "++localId, userId, syncStatus, timestamp",
  actas: "++localId, userId, mesaId, syncStatus, createdAt",
  photos: "++localId, actaLocalId, syncStatus",
  incidents: "++localId, userId, syncStatus, createdAt",
});

export { db };
