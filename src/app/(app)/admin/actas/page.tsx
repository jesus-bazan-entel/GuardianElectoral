"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface ActaRecord {
  id: string;
  mesa_id: string;
  centro_id: string | null;
  top3_parties: { party: string; votes: number; position: number }[];
  total_votes: number | null;
  null_votes: number | null;
  photos: string[];
  status: string;
  notes: string | null;
  created_at: string;
  user_id: string;
}

interface PersoneroInfo {
  id: string;
  full_name: string;
  dni: string;
}

export default function AdminActasPage() {
  const supabase = createClient();
  const [actas, setActas] = useState<ActaRecord[]>([]);
  const [personeros, setPersoneros] = useState<Record<string, PersoneroInfo>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "submitted" | "verified">("all");

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true);

    const { data: actasData } = await supabase
      .from("actas")
      .select("*")
      .order("created_at", { ascending: false });

    if (actasData) {
      setActas(actasData);

      // Load personero info
      const userIds = Array.from(new Set(actasData.map((a) => a.user_id)));
      if (userIds.length > 0) {
        const { data: pData } = await supabase
          .from("personeros")
          .select("id, full_name, dni")
          .in("id", userIds);
        if (pData) {
          const map: Record<string, PersoneroInfo> = {};
          pData.forEach((p) => { map[p.id] = p; });
          setPersoneros(map);
        }
      }
    }

    setLoading(false);
  }

  const filteredActas = filter === "all" ? actas : actas.filter((a) => a.status === filter);
  const mesasCubiertas = new Set(actas.map((a) => a.mesa_id)).size;
  const totalVotos = actas.reduce((s, a) => s + (a.total_votes || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Actas Recibidas</h1>
          </div>
          <p className="text-sm text-gray-500 ml-7">Actas enviadas por los personeros</p>
        </div>
        <Button size="sm" variant="ghost" onClick={loadData} loading={loading}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <p className="text-2xl font-bold text-primary-700">{actas.length}</p>
          <p className="text-[10px] text-gray-500">Actas recibidas</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-guardian-gold">{mesasCubiertas}</p>
          <p className="text-[10px] text-gray-500">Mesas cubiertas</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-green-600">{totalVotos.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500">Votos registrados</p>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {[
          { key: "all", label: "Todas", count: actas.length },
          { key: "submitted", label: "Enviadas", count: actas.filter((a) => a.status === "submitted").length },
          { key: "verified", label: "Verificadas", count: actas.filter((a) => a.status === "verified").length },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-primary-100 text-primary-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-8">
          <svg className="animate-spin h-8 w-8 mx-auto text-primary-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-500 mt-2">Cargando actas...</p>
        </div>
      ) : filteredActas.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">
            {filter === "all" ? "No hay actas recibidas aún" : "No hay actas con este filtro"}
          </p>
          <p className="text-xs mt-1">Las actas aparecen aquí cuando los personeros las envían</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActas.map((acta) => {
            const personero = personeros[acta.user_id];
            return (
              <Card key={acta.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                        <span className="text-primary-700 font-bold text-xs">{acta.mesa_id}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Mesa {acta.mesa_id}</p>
                        <p className="text-xs text-gray-500">
                          {personero ? `${personero.full_name} (${personero.dni})` : "Personero"}
                        </p>
                      </div>
                    </div>

                    {acta.centro_id && (
                      <p className="text-xs text-gray-400 mt-1 ml-12">{acta.centro_id}</p>
                    )}

                    {/* Top 3 */}
                    {acta.top3_parties && acta.top3_parties.length > 0 && (
                      <div className="mt-2 ml-12 space-y-1">
                        {acta.top3_parties.map((p, i) => (
                          <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                              <span className="text-sm text-gray-700">{p.party}</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">{p.votes?.toLocaleString()}</span>
                          </div>
                        ))}
                        {acta.null_votes != null && acta.null_votes > 0 && (
                          <div className="flex items-center justify-between px-3 py-1">
                            <span className="text-xs text-gray-400">Votos nulos</span>
                            <span className="text-xs text-gray-500">{acta.null_votes}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between px-3 py-1 border-t border-gray-100">
                          <span className="text-xs font-medium text-gray-600">Total</span>
                          <span className="text-sm font-bold text-primary-700">{acta.total_votes?.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {/* Fotos */}
                    {acta.photos && acta.photos.length > 0 && (
                      <div className="mt-2 ml-12">
                        <p className="text-xs text-gray-500">{acta.photos.length} foto{acta.photos.length > 1 ? "s" : ""} adjunta{acta.photos.length > 1 ? "s" : ""}</p>
                      </div>
                    )}

                    {acta.notes && (
                      <p className="text-xs text-gray-400 mt-1 ml-12 italic">&ldquo;{acta.notes}&rdquo;</p>
                    )}

                    <p className="text-[10px] text-gray-400 mt-2 ml-12">
                      {new Date(acta.created_at).toLocaleString("es", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <Badge
                    variant={
                      acta.status === "verified" ? "success" :
                      acta.status === "disputed" ? "danger" :
                      acta.status === "submitted" ? "info" : "default"
                    }
                    className="shrink-0"
                  >
                    {acta.status === "verified" ? "Verificada" :
                     acta.status === "disputed" ? "Disputada" :
                     acta.status === "submitted" ? "Recibida" : acta.status}
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
