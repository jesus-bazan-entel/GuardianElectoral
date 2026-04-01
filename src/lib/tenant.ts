export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  welcome_message: string;
  candidate_name: string | null;
  candidate_position: string | null;
}

export interface SessionInfo {
  personero_id: string;
  full_name: string;
  role: string;
  tenant_id: string;
  tenant_slug: string;
  assigned_centro: string | null;
  assigned_mesa: string | null;
}

const SESSION_KEY = "ge_session";
const TENANT_KEY = "ge_tenant";

export function saveSession(session: SessionInfo) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): SessionInfo | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function saveTenant(tenant: TenantInfo) {
  localStorage.setItem(TENANT_KEY, JSON.stringify(tenant));
}

export function getTenant(): TenantInfo | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(TENANT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function extractSlugFromHost(host: string): string {
  // Priority 1: Full custom domain match (resolved by Supabase function)
  // Priority 2: Subdomain pattern: {slug}.guardian-electoral.com
  // Priority 3: Query param ?tenant=slug (dev mode)
  // Priority 4: localhost default → 'demo'

  const hostname = host.split(":")[0]; // Remove port

  // Check subdomain pattern
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    // e.g., "partidox.guardian-electoral.com" → "partidox"
    return parts[0];
  }

  // Full domain → pass it to the Supabase function to resolve
  if (!hostname.includes("localhost") && !hostname.includes("127.0.0.1")) {
    return hostname;
  }

  return "demo";
}
