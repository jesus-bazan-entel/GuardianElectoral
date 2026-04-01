"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useTenantContext } from "@/components/TenantProvider";
import Link from "next/link";

interface ClienteSummary {
  id: string;
  slug: string;
  nombre_cliente: string;
  candidato: string | null;
  cargo: string | null;
  alcance: string;
  distrito_electoral: string | null;
  plan: string;
  pagado: boolean;
  personeros_registrados: number;
  mesas_cubiertas: number;
  actas_subidas: number;
  dominio: string | null;
}

export default function AdminPage() {
  const { session, tenant, logout } = useTenantContext();
  const [clientes, setClientes] = useState<ClienteSummary[]>([]);
  const [stats, setStats] = useState({ totalCentros: 0, totalMesas: 0, totalElectores: 0 });
  const supabase = createClient();

  const isSuperAdmin = session?.role === "superadmin";

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    if (isSuperAdmin) {
      const { data: clientesData } = await supabase
        .from("admin_clientes")
        .select("*");
      if (clientesData) setClientes(clientesData);
    }

    const { data: distData } = await supabase
      .from("electoral_districts")
      .select("total_centros, total_mesas, total_electores");
    if (distData) {
      setStats({
        totalCentros: distData.reduce((s, d) => s + (d.total_centros || 0), 0),
        totalMesas: distData.reduce((s, d) => s + (d.total_mesas || 0), 0),
        totalElectores: distData.reduce((s, d) => s + (d.total_electores || 0), 0),
      });
    }
  }

  const totalPersoneros = clientes.reduce((s, c) => s + c.personeros_registrados, 0);
  const totalActas = clientes.reduce((s, c) => s + c.actas_subidas, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isSuperAdmin ? "Panel Superadmin" : "Panel Administrativo"}
          </h1>
          <p className="text-sm text-gray-500">
            {isSuperAdmin
              ? "Guardian Electoral - Plataforma global"
              : `${tenant?.candidate_name || tenant?.name || "Guardian Electoral"}`
            }
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="text-gray-400">
          Salir
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {isSuperAdmin && (
          <Card className="text-center">
            <p className="text-2xl font-bold text-primary-700">{clientes.length}</p>
            <p className="text-xs text-gray-500">Clientes activos</p>
          </Card>
        )}
        <Card className="text-center">
          <p className="text-2xl font-bold text-green-600">{isSuperAdmin ? totalPersoneros : "--"}</p>
          <p className="text-xs text-gray-500">Personeros</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-guardian-gold">{isSuperAdmin ? totalActas : "--"}</p>
          <p className="text-xs text-gray-500">Actas recibidas</p>
        </Card>
        {!isSuperAdmin && (
          <Card className="text-center">
            <p className="text-2xl font-bold text-gray-700">{stats.totalMesas.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Mesas del distrito</p>
          </Card>
        )}
      </div>

      {/* Monitor CTA */}
      <Link href="/admin/monitor">
        <Card className="bg-gradient-to-r from-gray-900 to-gray-800 text-white border-0 hover:shadow-xl transition-shadow cursor-pointer overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-lg">Monitoreo en Vivo</p>
                <p className="text-gray-400 text-xs">Mapa, personeros, cobertura en tiempo real</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Card>
      </Link>

      {/* Acciones */}
      <div className="grid grid-cols-2 gap-3">
        {/* Personeros - para admin y superadmin */}
        <Link href="/admin/personeros">
          <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
            <svg className="w-8 h-8 mx-auto text-green-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="font-semibold text-sm text-gray-900">Personeros</p>
            <p className="text-xs text-gray-500 mt-0.5">Activar y asignar centros</p>
          </Card>
        </Link>

        {/* Gestionar Clientes - SOLO SUPERADMIN */}
        {isSuperAdmin && (
          <Link href="/admin/clientes">
            <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
              <svg className="w-8 h-8 mx-auto text-primary-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="font-semibold text-sm text-gray-900">Gestionar Clientes</p>
              <p className="text-xs text-gray-500 mt-0.5">Candidatos y partidos</p>
            </Card>
          </Link>
        )}
        <Link href="/admin/actas">
          <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
            <svg className="w-8 h-8 mx-auto text-guardian-gold mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-semibold text-sm text-gray-900">Actas Recibidas</p>
            <p className="text-xs text-gray-500 mt-0.5">Resultados electorales</p>
          </Card>
        </Link>
        <Link href="/ranking">
          <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
            <svg className="w-8 h-8 mx-auto text-yellow-500 mb-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <p className="font-semibold text-sm text-gray-900">Ranking</p>
            <p className="text-xs text-gray-500 mt-0.5">Tabla de posiciones</p>
          </Card>
        </Link>
        {isSuperAdmin && (
          <Link href="/admin/importar">
            <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
              <svg className="w-8 h-8 mx-auto text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="font-semibold text-sm text-gray-900">Importar Datos</p>
              <p className="text-xs text-gray-500 mt-0.5">Centros de votación</p>
            </Card>
          </Link>
        )}
      </div>

      {/* Lista de clientes - SOLO SUPERADMIN */}
      {isSuperAdmin && clientes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Clientes registrados</h3>
          {clientes.map((c) => (
            <Link key={c.id} href="/admin/clientes">
              <Card className="hover:shadow-md transition-shadow cursor-pointer mb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{c.candidato || c.nombre_cliente}</p>
                    <p className="text-xs text-gray-500">{c.cargo || c.nombre_cliente}</p>
                    {c.distrito_electoral && (
                      <p className="text-xs text-primary-600 mt-0.5">{c.distrito_electoral}</p>
                    )}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{c.personeros_registrados} personeros</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{c.actas_subidas} actas</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{c.mesas_cubiertas} mesas</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={c.pagado ? "success" : "warning"}>
                      {c.pagado ? "Pagado" : "Pendiente"}
                    </Badge>
                    <Badge variant={c.alcance === "nacional" ? "info" : "default"}>
                      {c.alcance === "nacional" ? "Nacional" : "Distrital"}
                    </Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
