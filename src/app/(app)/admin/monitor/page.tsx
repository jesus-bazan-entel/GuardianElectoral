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
    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
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
    // Load active personeros (latest checkin per user with GPS)
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
        const { data: personeroData } = await supabase
          .from("personeros")
          .select("id, full_name")
          .in("id", userIds);

        const nameMap: Record<string, string> = {};
        personeroData?.forEach((p) => { nameMap[p.id] = p.full_name; });

        setActivePersoneros(unique.map((c) => ({
          id: c.user_id,
          full_name: nameMap[c.user_id] || "Personero",
          lat: c.lat!,
          lng: c.lng!,
          timestamp: c.timestamp,
        })));
      }
    }

    // Stats
    const { count: personerosCount } = await supabase
      .from("personeros")
      .select("*", { count: "exact", head: true })
      .eq("is_registered", true);
    setTotalPersoneros(personerosCount || 0);

    const { data: actasData } = await supabase
      .from("actas")
      .select("mesa_id, centro_id, total_votes, created_at, user_id")
      .order("created_at", { ascending: false });

    if (actasData) {
      setTotalActas(actasData.length);
      const uniqueMesas = new Set(actasData.map((a) => a.mesa_id));
      setMesasCubiertas(uniqueMesas.size);

      const actaUserIds = Array.from(new Set(actasData.slice(0, 10).map((a) => a.user_id)));
      if (actaUserIds.length > 0) {
        const { data: actaPersoneros } = await supabase
          .from("personeros")
          .select("id, full_name")
          .in("id", actaUserIds);
        const actaNameMap: Record<string, string> = {};
        actaPersoneros?.forEach((p) => { actaNameMap[p.id] = p.full_name; });

        setRecentActas(actasData.slice(0, 10).map((a) => ({
          ...a,
          personero_name: actaNameMap[a.user_id] || "Personero",
        })));
      }
    }

    const { data: distData } = await supabase
      .from("electoral_districts")
      .select("total_mesas");
    if (distData) {
      setTotalMesas(distData.reduce((s, d) => s + (d.total_mesas || 0), 0));
    }

    setLastUpdate(new Date());
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Only show personero markers (not all 10K centers)
  const mapMarkers = activePersoneros.map((p) => ({
    id: `personero-${p.id}`,
    lat: p.lat,
    lng: p.lng,
    type: "personero" as const,
    color: "#22c55e",
    popup: `
      <div style="padding: 4px;">
        <strong style="font-size: 13px;">${p.full_name}</strong><br/>
        <span style="color: #22c55e; font-size: 11px;">Activo</span><br/>
        <span style="font-size: 10px; color: #9ca3af;">${new Date(p.timestamp).toLocaleTimeString("es")}</span>
      </div>
    `,
  }));

  const coveragePercent = totalMesas > 0 ? ((mesasCubiertas / totalMesas) * 100).toFixed(1) : "0";

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-4 py-2 flex items-center justify-between z-20 safe-top">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-sm font-bold text-white">Monitoreo en Tiempo Real</h1>
            <p className="text-[10px] text-gray-400">
              {tenant?.name || "Guardian Electoral"} · {lastUpdate.toLocaleTimeString("es")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-green-400 font-medium">EN VIVO</span>
          <Button size="sm" variant="ghost" onClick={loadData} className="text-gray-400 hover:text-white ml-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {!loading && <MonitorMap markers={mapMarkers} />}

        {/* KPI Cards - Floating over map */}
        <div className="absolute top-3 left-3 right-3 z-[1000] pointer-events-none">
          <div className="grid grid-cols-4 gap-2 pointer-events-auto">
            <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-2.5 border border-gray-700/50 shadow-lg">
              <p className="text-[9px] text-gray-400 uppercase tracking-wider">Personeros</p>
              <p className="text-xl font-black text-white leading-tight">{activePersoneros.length}</p>
              <p className="text-[9px] text-gray-500">de {totalPersoneros}</p>
            </div>
            <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-2.5 border border-gray-700/50 shadow-lg">
              <p className="text-[9px] text-gray-400 uppercase tracking-wider">Mesas</p>
              <p className="text-xl font-black text-blue-400 leading-tight">{mesasCubiertas.toLocaleString()}</p>
              <p className="text-[9px] text-gray-500">de {totalMesas.toLocaleString()}</p>
            </div>
            <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-2.5 border border-gray-700/50 shadow-lg">
              <p className="text-[9px] text-gray-400 uppercase tracking-wider">Actas</p>
              <p className="text-xl font-black text-amber-400 leading-tight">{totalActas}</p>
              <p className="text-[9px] text-gray-500">recibidas</p>
            </div>
            <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-2.5 border border-gray-700/50 shadow-lg">
              <p className="text-[9px] text-gray-400 uppercase tracking-wider">Cobertura</p>
              <p className="text-xl font-black text-green-400 leading-tight">{coveragePercent}%</p>
              <p className="text-[9px] text-gray-500">del total</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-24 right-3 z-[1000] bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 border border-gray-700/50 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-gray-300">Personero activo ({activePersoneros.length})</span>
          </div>
        </div>

        {/* Activity panel toggle */}
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-gray-800/90 backdrop-blur-sm text-white px-4 py-2 rounded-full border border-gray-700/50 text-xs font-medium flex items-center gap-2 shadow-lg"
        >
          <svg className={`w-4 h-4 transition-transform ${showPanel ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
          Actividad reciente ({recentActas.length})
        </button>

        {/* Activity panel */}
        {showPanel && (
          <div className="absolute bottom-16 left-0 right-0 z-[999] max-h-[40vh] overflow-y-auto bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 rounded-t-2xl shadow-2xl">
            <div className="p-4">
              <h3 className="text-sm font-bold text-white mb-3">Actividad Reciente</h3>
              {recentActas.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-4">No hay actividad reciente</p>
              ) : (
                <div className="space-y-2">
                  {recentActas.map((acta, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-medium truncate">
                          Mesa {acta.mesa_id} — {acta.personero_name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {acta.total_votes?.toLocaleString()} votos · {acta.centro_id || ""}
                        </p>
                      </div>
                      <p className="text-[10px] text-gray-500 shrink-0">
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
