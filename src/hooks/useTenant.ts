"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  type TenantInfo,
  type SessionInfo,
  getTenant,
  saveTenant,
  getSession,
  saveSession,
  clearSession,
  extractSlugFromHost,
} from "@/lib/tenant";

export function useTenant() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Load cached tenant and session
    const cachedTenant = getTenant();
    const cachedSession = getSession();
    if (cachedTenant) setTenant(cachedTenant);
    if (cachedSession) setSession(cachedSession);

    // Resolve tenant from domain
    resolveTenant();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function resolveTenant() {
    try {
      const host = window.location.hostname;
      const searchParams = new URLSearchParams(window.location.search);
      const tenantParam = searchParams.get("tenant");

      const domainOrSlug = tenantParam || extractSlugFromHost(host);

      const { data, error } = await supabase.rpc("get_tenant_by_domain", {
        p_domain: domainOrSlug,
      });

      if (error || !data) {
        // Try cached
        const cached = getTenant();
        if (cached) {
          setTenant(cached);
        }
      } else {
        const tenantData = data as unknown as TenantInfo;
        setTenant(tenantData);
        saveTenant(tenantData);
      }
    } catch {
      // Use cached
    } finally {
      setLoading(false);
    }
  }

  const login = useCallback(
    async (dni: string, pin: string): Promise<{ success: boolean; error?: string }> => {
      if (!tenant) return { success: false, error: "Organización no encontrada" };

      const { data, error } = await supabase.rpc("verify_personero_pin", {
        p_tenant_slug: tenant.slug,
        p_dni: dni,
        p_pin: pin,
      });

      if (error) return { success: false, error: error.message };

      const result = data as unknown as {
        success: boolean;
        error?: string;
        personero_id?: string;
        full_name?: string;
        role?: string;
        tenant_id?: string;
        tenant_name?: string;
      };

      if (!result.success) return { success: false, error: result.error };

      const sessionData: SessionInfo = {
        personero_id: result.personero_id!,
        full_name: result.full_name!,
        role: result.role!,
        tenant_id: result.tenant_id!,
        tenant_slug: tenant.slug,
      };

      saveSession(sessionData);
      setSession(sessionData);
      return { success: true };
    },
    [tenant, supabase]
  );

  const register = useCallback(
    async (data: {
      dni: string;
      full_name: string;
      phone?: string;
      pin: string;
    }): Promise<{ success: boolean; error?: string }> => {
      if (!tenant) return { success: false, error: "Organización no encontrada" };

      const { data: result, error } = await supabase.rpc("register_personero", {
        p_tenant_slug: tenant.slug,
        p_dni: data.dni,
        p_full_name: data.full_name,
        p_phone: data.phone || null,
        p_pin: data.pin,
      });

      if (error) return { success: false, error: error.message };

      const res = result as unknown as { success: boolean; error?: string };
      if (!res.success) return { success: false, error: res.error };

      return { success: true };
    },
    [tenant, supabase]
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  return {
    tenant,
    session,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!session,
  };
}
