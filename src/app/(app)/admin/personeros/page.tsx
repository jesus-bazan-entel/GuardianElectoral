"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { useTenantContext } from "@/components/TenantProvider";
import Link from "next/link";

interface Personero {
  id: string;
  full_name: string;
  dni: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  is_registered: boolean;
  assigned_centro: string | null;
  assigned_voting_center_id: string | null;
  assigned_mesa: string | null;
  registered_at: string | null;
  created_at: string;
}

interface VotingCenter {
  id: string;
  name: string;
  code: string;
  district: string;
  province: string;
  department: string;
  total_tables: number;
}

export default function PersonerosAdminPage() {
  const { session } = useTenantContext();
  const supabase = createClient();

  const [personeros, setPersoneros] = useState<Personero[]>([]);
  const [centers, setCenters] = useState<VotingCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "active">("pending");
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [selectedCenter, setSelectedCenter] = useState("");
  const [selectedMesa, setSelectedMesa] = useState("");
  const [centerSearch, setCenterSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true);
    const { data: pData } = await supabase
      .from("personeros")
      .select("*")
      .eq("is_registered", true)
      .order("created_at", { ascending: false });
    if (pData) setPersoneros(pData);
    setLoading(false);
  }

  async function searchCenters(query: string) {
    setCenterSearch(query);
    if (query.length < 2) { setCenters([]); return; }
    const { data } = await supabase
      .from("voting_centers")
      .select("id, name, code, district, province, department, total_tables")
      .or(`name.ilike.%${query}%,code.ilike.%${query}%,district.ilike.%${query}%`)
      .limit(10);
    if (data) setCenters(data);
  }

  async function handleActivate(personeroId: string) {
    if (!selectedCenter) {
      setError("Selecciona un centro de votación");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("activate_personero", {
        p_personero_id: personeroId,
        p_voting_center_id: selectedCenter,
        p_assigned_mesa: selectedMesa.trim() || null,
      });
      if (rpcError) throw rpcError;
      const result = data as unknown as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error);
      setSuccess("Personero activado correctamente");
      setActivatingId(null);
      setSelectedCenter("");
      setSelectedMesa("");
      setCenterSearch("");
      setCenters([]);
      await loadData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al activar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(personeroId: string) {
    await supabase.from("personeros").update({ is_active: false }).eq("id", personeroId);
    await loadData();
  }

  const filteredPersoneros = filter === "all" ? personeros
    : filter === "pending" ? personeros.filter((p) => !p.is_active)
    : personeros.filter((p) => p.is_active);

  const pendingCount = personeros.filter((p) => !p.is_active).length;
  const activeCount = personeros.filter((p) => p.is_active).length;

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
            <h1 className="text-xl font-bold text-gray-900">Personeros</h1>
          </div>
          <p className="text-sm text-gray-500 ml-7">Activar y asignar centros de votación</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="warning">{pendingCount} pendiente{pendingCount > 1 ? "s" : ""}</Badge>
        )}
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 text-sm">{success}</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <p className="text-2xl font-bold text-gray-900">{personeros.length}</p>
          <p className="text-[10px] text-gray-500">Total registrados</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          <p className="text-[10px] text-gray-500">Activos</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-[10px] text-gray-500">Pendientes</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { key: "pending", label: "Pendientes", count: pendingCount },
          { key: "active", label: "Activos", count: activeCount },
          { key: "all", label: "Todos", count: personeros.length },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-8">
          <svg className="animate-spin h-8 w-8 mx-auto text-primary-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : filteredPersoneros.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">No hay personeros {filter === "pending" ? "pendientes" : filter === "active" ? "activos" : ""}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPersoneros.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{p.full_name}</p>
                  <p className="text-xs text-gray-500">DNI: {p.dni}{p.phone ? ` · ${p.phone}` : ""}</p>
                  {p.assigned_centro && (
                    <p className="text-xs text-primary-600 mt-1">
                      Centro: {p.assigned_centro}
                    </p>
                  )}
                  {p.assigned_mesa && (
                    <p className="text-xs text-gray-400">Mesa: {p.assigned_mesa}</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    Registro: {p.registered_at ? new Date(p.registered_at).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant={p.is_active ? "success" : "warning"}>
                    {p.is_active ? "Activo" : "Pendiente"}
                  </Badge>
                  {p.is_active && !p.assigned_voting_center_id && (
                    <Badge variant="danger">Sin centro</Badge>
                  )}
                  {p.is_active ? (
                    <div className="flex flex-col items-end gap-0.5 mt-1">
                      {!p.assigned_voting_center_id && (
                        <button
                          onClick={() => {
                            setActivatingId(activatingId === p.id ? null : p.id);
                            setSelectedCenter("");
                            setSelectedMesa("");
                            setCenterSearch("");
                            setCenters([]);
                            setError(null);
                          }}
                          className="text-xs text-primary-600 font-semibold hover:underline"
                        >
                          {activatingId === p.id ? "Cancelar" : "Asignar centro"}
                        </button>
                      )}
                      {p.assigned_voting_center_id && (
                        <button
                          onClick={() => {
                            setActivatingId(activatingId === p.id ? null : p.id);
                            setSelectedCenter("");
                            setSelectedMesa("");
                            setCenterSearch("");
                            setCenters([]);
                            setError(null);
                          }}
                          className="text-[10px] text-gray-500 hover:underline"
                        >
                          {activatingId === p.id ? "Cancelar" : "Cambiar centro"}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeactivate(p.id)}
                        className="text-[10px] text-red-500 hover:underline"
                      >
                        Desactivar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setActivatingId(activatingId === p.id ? null : p.id);
                        setSelectedCenter("");
                        setSelectedMesa("");
                        setCenterSearch("");
                        setCenters([]);
                        setError(null);
                      }}
                      className="text-xs text-primary-600 font-semibold hover:underline mt-1"
                    >
                      {activatingId === p.id ? "Cancelar" : "Activar"}
                    </button>
                  )}
                </div>
              </div>

              {/* Activation form */}
              {activatingId === p.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  <p className="text-xs font-semibold text-gray-700">Asignar centro de votación</p>

                  <Input
                    placeholder="Buscar centro por nombre, código o distrito..."
                    value={centerSearch}
                    onChange={(e) => searchCenters(e.target.value)}
                  />

                  {centers.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                      {centers.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCenter(c.id);
                            setCenterSearch(c.name);
                            setCenters([]);
                          }}
                          className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors ${
                            selectedCenter === c.id ? "bg-blue-50" : ""
                          }`}
                        >
                          <p className="text-xs font-medium text-gray-900">{c.name}</p>
                          <p className="text-[10px] text-gray-500">
                            {c.district}, {c.province} · {c.total_tables} mesas · Cód: {c.code}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedCenter && (
                    <div className="bg-blue-50 rounded-lg p-2.5">
                      <p className="text-xs text-blue-800 font-medium">Centro seleccionado: {centerSearch}</p>
                    </div>
                  )}

                  <Input
                    label="Mesa asignada (opcional)"
                    placeholder="Número de mesa"
                    value={selectedMesa}
                    onChange={(e) => setSelectedMesa(e.target.value)}
                    inputMode="numeric"
                  />

                  <Button
                    className="w-full"
                    onClick={() => handleActivate(p.id)}
                    loading={saving}
                    disabled={!selectedCenter}
                  >
                    {p.is_active ? "Guardar centro asignado" : "Activar y asignar centro"}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
