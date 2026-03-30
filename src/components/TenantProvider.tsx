"use client";

import { createContext, useContext } from "react";
import { useTenant } from "@/hooks/useTenant";
import type { TenantInfo, SessionInfo } from "@/lib/tenant";

interface TenantContextValue {
  tenant: TenantInfo | null;
  session: SessionInfo | null;
  loading: boolean;
  login: (dni: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { dni: string; full_name: string; phone?: string; pin: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const value = useTenant();

  return (
    <TenantContext.Provider value={value}>
      {/* Inject tenant branding as CSS variables */}
      {value.tenant && (
        <style>{`
          :root {
            --tenant-primary: ${value.tenant.primary_color};
            --tenant-secondary: ${value.tenant.secondary_color};
          }
        `}</style>
      )}
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenantContext must be used within TenantProvider");
  return ctx;
}
