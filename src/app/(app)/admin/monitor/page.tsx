"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTenantContext } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import nextDynamic from "next/dynamic";

const MonitorMap = nextDynamic(() => import("@/components/MonitorMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Cargando mapa...</p>
    </div>
  ),
});

interface ActivePersonero {
  id: string;
  full_name: string;
  lat: number;
  lng: number;
  timestamp: string;
}

interface ActaInfo {
  mesa_id: string;
  centro_id: string | null;
  total_votes: number | null;
  created_at: string;
  personero_name?: string;
}

export default function MonitorPage() {
  const { tenant } = useTenantContext();
  const supabase = createClient();

  const [activePersoneros, setActivePersoneros] = useState<ActivePersonero[]>([]);
  const [recentActas, setRecentActas] = useState<ActaInfo[]>([]);
  const [totalPersoneros, setTotalPersoneros] = useState(0);
  const [totalMesas, setTotalMesas] = useState(0);
  const [mesasCubiertas, setMesasCubiertas] = useState(0);
  const [totalActas, setTotalActas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [showPanel, setShowPanel] = useState(false);

  const loadData = useCallback(async () => {
    const { data: checkinsData } = await supabase
      .from("checkins")
      .select("user_id, lat, lng, timestamp")
      .eq("type", "checkin")
      .not("lat", "is", null)
      .order("timestamp", { ascending: false })
      .limit(500);

    if (checkinsData) {
      const seen = new Set<string>();
      const unique: typeof checkinsData = [];
      for (const c of checkinsData) {
        if (!seen.has(c.user_id) && c.lat && c.lng) {
          seen.add(c.user_id);
          unique.push(c);
        }
      }
      const userIds = unique.map((c) => c.user_id);
      if (userIds.length > 0) {
        const { data: personeroData } = await supabase.from("personeros").select("id, full_name").in("id", userIds);
        const nameMap: Record<string, string> = {};
        personeroData?.forEach((p) => { nameMap[p.id] = p.full_name; });
        setActivePersoneros(unique.map((c) => ({
          id: c.user_id, full_name: nameMap[c.user_id] || "Personero",
          lat: c.lat!, lng: c.lng!, timestamp: c.timestamp,
        })));
      }
    }

    const { count: personerosCount } = await supabase.from("personeros").select("*", { count: "exact", head: true }).eq("is_registered", true);
    setTotalPersoneros(personerosCount || 0);

    const { data: actasData } = await supabase.from("actas").select("mesa_id, centro_id, total_votes, created_at, user_id").order("created_at", { ascending: false });
    if (actasData) {
      setTotalActas(actasData.length);
      setMesasCubiertas(new Set(actasData.map((a) => a.mesa_id)).size);
      const actaUserIds = Array.from(new Set(actasData.slice(0, 8).map((a) => a.user_id)));
      if (actaUserIds.length > 0) {
        const { data: ap } = await supabase.from("personeros").select("id, full_name").in("id", actaUserIds);
        const nm: Record<string, string> = {};
        ap?.forEach((p) => { nm[p.id] = p.full_name; });
        setRecentActas(actasData.slice(0, 8).map((a) => ({ ...a, personero_name: nm[a.user_id] || "Personero" })));
      }
    }

    const { data: distData } = await supabase.from("electoral_districts").select("total_mesas");
    if (distData) setTotalMesas(distData.reduce((s, d) => s + (d.total_mesas || 0), 0));

    setLastUpdate(new Date());
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const mapMarkers = activePersoneros.map((p) => ({
    id: `personero-${p.id}`, lat: p.lat, lng: p.lng, type: "personero" as const, color: "#2563eb",
    popup: `<div style="padding:4px;"><strong>${p.full_name}</strong><br/><span style="color:#22c55e;font-size:11px;">Activo</span><br/><span style="font-size:10px;color:#9ca3af;">${new Date(p.timestamp).toLocaleTimeString("es")}</span></div>`,
  }));

  const coveragePercent = totalMesas > 0 ? ((mesasCubiertas / totalMesas) * 100).toFixed(1) : "0";

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between z-20 safe-top">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-gray-900">Monitoreo en Vivo</h1>
              <span className="flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                EN VIVO
              </span>
            </div>
            <p className="text-[10px] text-gray-400">{lastUpdate.toLocaleTimeString("es")}</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={loadData} className="text-gray-400">
          <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </Button>
      </div>

      {/* KPI Strip - compact horizontal */}
      <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">{activePersoneros.length}<span className="text-[10px] text-gray-400 font-normal">/{totalPersoneros}</span></p>
              <p className="text-[9px] text-gray-400">Activos</p>
            </div>
          </div>

          <div className="w-px h-8 bg-gray-200" />

          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">{mesasCubiertas.toLocaleString()}<span className="text-[10px] text-gray-400 font-normal">/{totalMesas.toLocaleString()}</span></p>
              <p className="text-[9px] text-gray-400">Mesas</p>
            </div>
          </div>

          <div className="w-px h-8 bg-gray-200" />

          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">{totalActas}</p>
              <p className="text-[9px] text-gray-400">Actas</p>
            </div>
          </div>

          <div className="w-px h-8 bg-gray-200" />

          <div className="flex items-center gap-1.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${Number(coveragePercent) > 50 ? "bg-green-100" : "bg-red-100"}`}>
              <span className={`text-xs font-bold ${Number(coveragePercent) > 50 ? "text-green-600" : "text-red-600"}`}>%</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">{coveragePercent}%</p>
              <p className="text-[9px] text-gray-400">Cobertura</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {!loading && <MonitorMap markers={mapMarkers} />}

        {/* Legend - bottom right */}
        <div className="absolute bottom-20 right-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600 shadow-sm" style={{ boxShadow: "0 0 6px rgba(37,99,235,0.5)" }} />
            <span className="text-[11px] text-gray-600 font-medium">Personero activo ({activePersoneros.length})</span>
          </div>
        </div>

        {/* Activity toggle */}
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white text-gray-700 px-4 py-2.5 rounded-full shadow-lg border border-gray-200 text-xs font-semibold flex items-center gap-2"
        >
          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Actividad ({recentActas.length})
          <svg className={`w-3 h-3 transition-transform ${showPanel ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* Activity panel */}
        {showPanel && (
          <div className="absolute bottom-16 left-0 right-0 z-[999] max-h-[45vh] overflow-y-auto bg-white border-t border-gray-200 rounded-t-2xl shadow-2xl">
            <div className="p-4">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-900 mb-3">Actividad Reciente</h3>
              {recentActas.length === 0 ? (
                <p className="text-gray-400 text-xs text-center py-6">Sin actividad reciente</p>
              ) : (
                <div className="space-y-2">
                  {recentActas.map((acta, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-900 font-semibold truncate">
                          Mesa {acta.mesa_id}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {acta.personero_name} · {acta.total_votes?.toLocaleString()} votos
                        </p>
                      </div>
                      <p className="text-[10px] text-gray-400 shrink-0 font-medium">
                        {new Date(acta.created_at).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
