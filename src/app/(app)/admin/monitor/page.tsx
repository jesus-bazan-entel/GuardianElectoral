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

interface PersoneroOnMap {
  id: string;
  full_name: string;
  dni: string;
  has_checkin: boolean;
  lat: number;
  lng: number;
  centro_name: string | null;
  checkin_time: string | null;
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

  const [personerosOnMap, setPersonerosOnMap] = useState<PersoneroOnMap[]>([]);
  const [recentActas, setRecentActas] = useState<ActaInfo[]>([]);
  const [totalPersoneros, setTotalPersoneros] = useState(0);
  const [totalMesas, setTotalMesas] = useState(0);

  // Search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PersoneroOnMap[]>([]);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [mesasCubiertas, setMesasCubiertas] = useState(0);
  const [totalActas, setTotalActas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [showPanel, setShowPanel] = useState(false);

  const loadData = useCallback(async () => {
    // 1. Get all ACTIVE personeros with their assigned center coordinates
    const { data: activePersoneros } = await supabase
      .from("personeros")
      .select("id, full_name, dni, assigned_centro, assigned_voting_center_id")
      .eq("is_active", true)
      .eq("is_registered", true)
      .eq("role", "watcher");

    // 2. Get latest checkin per personero
    const { data: checkinsData } = await supabase
      .from("checkins")
      .select("user_id, lat, lng, timestamp")
      .eq("type", "checkin")
      .not("lat", "is", null)
      .order("timestamp", { ascending: false })
      .limit(1000);

    // Build checkin map: user_id → latest checkin
    const checkinMap: Record<string, { lat: number; lng: number; timestamp: string }> = {};
    if (checkinsData) {
      for (const c of checkinsData) {
        if (!checkinMap[c.user_id] && c.lat && c.lng) {
          checkinMap[c.user_id] = { lat: c.lat, lng: c.lng, timestamp: c.timestamp };
        }
      }
    }

    // 3. Get voting center coordinates for personeros WITHOUT checkin
    const centerIds = new Set<string>();
    activePersoneros?.forEach((p) => {
      if (!checkinMap[p.id] && p.assigned_voting_center_id) {
        centerIds.add(p.assigned_voting_center_id);
      }
    });

    const centerCoords: Record<string, { lat: number; lng: number; name: string }> = {};
    if (centerIds.size > 0) {
      const { data: centersData } = await supabase
        .from("voting_centers")
        .select("id, name, latitude, longitude")
        .in("id", Array.from(centerIds));
      centersData?.forEach((c) => {
        if (c.latitude && c.longitude) {
          centerCoords[c.id] = { lat: Number(c.latitude), lng: Number(c.longitude), name: c.name };
        }
      });
    }

    // 4. Build personeros on map
    const mapped: PersoneroOnMap[] = [];
    activePersoneros?.forEach((p) => {
      const checkin = checkinMap[p.id];
      if (checkin) {
        // Has checkin → blue pin at checkin location
        mapped.push({
          id: p.id,
          full_name: p.full_name,
          dni: p.dni,
          has_checkin: true,
          lat: checkin.lat,
          lng: checkin.lng,
          centro_name: p.assigned_centro,
          checkin_time: checkin.timestamp,
        });
      } else if (p.assigned_voting_center_id && centerCoords[p.assigned_voting_center_id]) {
        // No checkin but has center → red pin at center location
        const center = centerCoords[p.assigned_voting_center_id];
        mapped.push({
          id: p.id,
          full_name: p.full_name,
          dni: p.dni,
          has_checkin: false,
          lat: center.lat,
          lng: center.lng,
          centro_name: center.name,
          checkin_time: null,
        });
      }
    });
    setPersonerosOnMap(mapped);
    setTotalPersoneros(activePersoneros?.length || 0);

    // 5. Actas stats
    const { data: actasData } = await supabase
      .from("actas")
      .select("mesa_id, centro_id, total_votes, created_at, user_id")
      .order("created_at", { ascending: false });
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

    // 6. Total mesas
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

  // Search personeros AND locations
  const [locationResults, setLocationResults] = useState<{ name: string; type: string; field: string }[]>([]);

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); setLocationResults([]); return; }
    const q = query.toLowerCase();

    // Search personeros
    const personeroResults = personerosOnMap.filter(
      (p) => p.full_name.toLowerCase().includes(q) || p.dni.includes(q) || (p.centro_name && p.centro_name.toLowerCase().includes(q))
    );
    setSearchResults(personeroResults);

    // Search locations (departments, provinces, districts)
    const { data: locData } = await supabase
      .from("voting_centers")
      .select("department, province, district")
      .or(`department.ilike.%${query}%,province.ilike.%${query}%,district.ilike.%${query}%`)
      .limit(50);

    if (locData) {
      const seen = new Set<string>();
      const locs: { name: string; type: string; field: string }[] = [];
      locData.forEach((d) => {
        if (d.department.toLowerCase().includes(q) && !seen.has(`dep-${d.department}`)) {
          seen.add(`dep-${d.department}`);
          locs.push({ name: d.department, type: "Departamento", field: "department" });
        }
        if (d.province.toLowerCase().includes(q) && !seen.has(`prov-${d.province}`)) {
          seen.add(`prov-${d.province}`);
          locs.push({ name: `${d.province}, ${d.department}`, type: "Provincia", field: "province" });
        }
        if (d.district.toLowerCase().includes(q) && !seen.has(`dist-${d.district}-${d.province}`)) {
          seen.add(`dist-${d.district}-${d.province}`);
          locs.push({ name: `${d.district}, ${d.province}`, type: "Distrito", field: "district" });
        }
      });
      setLocationResults(locs.slice(0, 8));
    }
  }

  function flyToPersonero(p: PersoneroOnMap) {
    setFlyTo({ lat: p.lat, lng: p.lng, zoom: 16 });
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    setLocationResults([]);
  }

  async function zoomToLocation(type: "peru" | "department" | "province" | "district", name?: string) {
    if (type === "peru") {
      setFlyTo({ lat: -9.19, lng: -75.015, zoom: 6 });
      setShowSearch(false);
      return;
    }
    if (!name) return;

    // Extract just the first part if "District, Province" format
    const searchName = name.split(",")[0].trim();
    const field = type === "department" ? "department" : type === "province" ? "province" : "district";
    const { data } = await supabase
      .from("voting_centers")
      .select("latitude, longitude")
      .ilike(field, `%${searchName}%`)
      .not("latitude", "is", null)
      .limit(200);

    if (data && data.length > 0) {
      const lats = data.map((d) => Number(d.latitude)).filter(Boolean);
      const lngs = data.map((d) => Number(d.longitude)).filter(Boolean);
      if (lats.length > 0) {
        const avgLat = lats.reduce((s, v) => s + v, 0) / lats.length;
        const avgLng = lngs.reduce((s, v) => s + v, 0) / lngs.length;
        const zoomLevel = type === "department" ? 8 : type === "province" ? 10 : 13;
        setFlyTo({ lat: avgLat, lng: avgLng, zoom: zoomLevel });
      }
    }
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    setLocationResults([]);
  }

  const checkedInCount = personerosOnMap.filter((p) => p.has_checkin).length;
  const notCheckedInCount = personerosOnMap.filter((p) => !p.has_checkin).length;

  // Build map markers
  const mapMarkers = personerosOnMap.map((p) => ({
    id: `personero-${p.id}`,
    lat: p.lat,
    lng: p.lng,
    type: "personero" as const,
    color: p.has_checkin ? "#2563eb" : "#dc2626",
    popup: `
      <div style="padding:4px;min-width:160px;">
        <strong style="font-size:13px;">${p.full_name}</strong><br/>
        <span style="font-size:11px;color:#6b7280;">DNI: ${p.dni}</span><br/>
        ${p.centro_name ? `<span style="font-size:11px;color:#6b7280;">${p.centro_name}</span><br/>` : ""}
        <span style="font-size:11px;font-weight:600;color:${p.has_checkin ? "#2563eb" : "#dc2626"};">
          ${p.has_checkin ? `Check-in: ${new Date(p.checkin_time!).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}` : "Sin check-in"}
        </span>
      </div>
    `,
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

      {/* KPI Strip */}
      <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">{checkedInCount}</p>
              <p className="text-[9px] text-gray-400">Presentes</p>
            </div>
          </div>

          <div className="w-px h-8 bg-gray-200" />

          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-red-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">{notCheckedInCount}</p>
              <p className="text-[9px] text-gray-400">Ausentes</p>
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
              <p className="text-sm font-bold text-gray-900 leading-none">{mesasCubiertas}<span className="text-[10px] text-gray-400 font-normal">/{totalMesas.toLocaleString()}</span></p>
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

          <div className="text-right">
            <p className="text-sm font-bold text-green-600 leading-none">{coveragePercent}%</p>
            <p className="text-[9px] text-gray-400">Cobertura</p>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {!loading && (
          <MonitorMap
            markers={mapMarkers}
            center={[-9.19, -75.015]}
            zoom={6}
            flyTo={flyTo}
          />
        )}

        {/* Search button */}
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="absolute top-3 left-3 z-[1000] bg-white text-gray-700 w-10 h-10 rounded-xl shadow-lg border border-gray-200 flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Reset zoom button */}
        <button
          onClick={() => setFlyTo({ lat: -9.19, lng: -75.015, zoom: 6 })}
          className="absolute top-16 left-3 z-[1000] bg-white text-gray-500 w-10 h-10 rounded-xl shadow-lg border border-gray-200 flex items-center justify-center"
          title="Ver todo Perú"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
          </svg>
        </button>

        {/* Search panel */}
        {showSearch && (
          <div className="absolute top-3 left-16 right-3 z-[1000] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar personero por nombre, DNI o centro..."
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                style={{ fontSize: "16px" }}
                autoFocus
              />
            </div>

            {/* Quick location zoom */}
            <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
              <button onClick={() => zoomToLocation("peru")} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md hover:bg-gray-200">
                Perú
              </button>
              {["Lima", "Arequipa", "Cusco", "Piura", "La Libertad", "Junin", "Callao"].map((dep) => (
                <button
                  key={dep}
                  onClick={() => zoomToLocation("department", dep)}
                  className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-md hover:bg-blue-100"
                >
                  {dep}
                </button>
              ))}
            </div>

            {/* Location results */}
            {locationResults.length > 0 && (
              <div className="border-t border-gray-100">
                <p className="text-[10px] text-gray-400 px-3 pt-2 uppercase tracking-wider font-semibold">Ubicaciones</p>
                {locationResults.map((loc, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const type = loc.field as "department" | "province" | "district";
                      zoomToLocation(type, loc.name.split(",")[0].trim());
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-gray-900">{loc.name}</p>
                      <p className="text-[10px] text-gray-400">{loc.type}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Personero results */}
            {searchResults.length > 0 && (
              <div className="border-t border-gray-100">
                <p className="text-[10px] text-gray-400 px-3 pt-2 uppercase tracking-wider font-semibold">Personeros</p>
                <div className="max-h-48 overflow-y-auto">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => flyToPersonero(p)}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${p.has_checkin ? "bg-blue-600" : "bg-red-600"}`} />
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{p.full_name}</p>
                        <p className="text-[10px] text-gray-500">
                          DNI: {p.dni} · {p.centro_name || "Sin centro"}
                          {p.has_checkin ? " · Con check-in" : " · Sin check-in"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
                </div>
              </div>
            )}

            {searchQuery.length >= 2 && searchResults.length === 0 && locationResults.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">Sin resultados para &ldquo;{searchQuery}&rdquo;</p>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-20 right-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2.5 shadow-md border border-gray-200">
          <p className="text-[10px] text-gray-500 font-semibold mb-1.5 uppercase tracking-wider">Personeros</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-blue-600 shadow-sm" />
            <span className="text-[11px] text-gray-600">Con check-in ({checkedInCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600 shadow-sm" />
            <span className="text-[11px] text-gray-600">Sin check-in ({notCheckedInCount})</span>
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
                        <p className="text-xs text-gray-900 font-semibold truncate">Mesa {acta.mesa_id}</p>
                        <p className="text-[10px] text-gray-500 truncate">{acta.personero_name} · {acta.total_votes?.toLocaleString()} votos</p>
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
