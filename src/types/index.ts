export interface Personero {
  id: string;
  full_name: string;
  cedula: string;
  phone: string | null;
  party_id: string | null;
  assigned_centro: string | null;
  assigned_mesa: string | null;
  role: "watcher" | "coordinator" | "admin";
  is_active: boolean;
  created_at: string;
}

export interface CheckIn {
  id: string;
  user_id: string;
  type: "checkin" | "checkout";
  lat: number | null;
  lng: number | null;
  accuracy_meters: number | null;
  timestamp: string;
  device_info: Record<string, unknown> | null;
  synced_at: string | null;
}

export interface Top3Entry {
  party: string;
  votes: number;
  position: 1 | 2 | 3;
}

export interface Acta {
  id: string;
  user_id: string;
  mesa_id: string;
  centro_id: string | null;
  photos: string[];
  top3_parties: Top3Entry[];
  total_votes: number | null;
  null_votes: number | null;
  notes: string | null;
  status: "draft" | "submitted" | "verified" | "disputed";
  created_at: string;
  synced_at: string | null;
}

export interface Incident {
  id: string;
  user_id: string;
  mesa_id: string | null;
  category: "intimidation" | "irregularity" | "equipment_failure" | "other";
  description: string;
  photos: string[];
  lat: number | null;
  lng: number | null;
  severity: "low" | "medium" | "high" | "critical";
  created_at: string;
  synced_at: string | null;
}

export interface Party {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  logo_url: string | null;
  sort_order: number;
}

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface SyncQueueItem {
  localId?: number;
  table: string;
  data: Record<string, unknown>;
  photos?: { blob: Blob; name: string }[];
  syncStatus: "pending" | "syncing" | "synced" | "error";
  syncError?: string;
  createdAt: string;
}
