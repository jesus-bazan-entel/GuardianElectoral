"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
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
  const [clientes, setClientes] = useState<ClienteSummary[]>([]);
  const [stats, setStats] = useState({ totalCentros: 0, totalMesas: 0, totalElectores: 0 });
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    const { data: clientesData } = await supabase
      .from("admin_clientes")
      .select("*");
    if (clientesData) setClientes(clientesData);

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
          <h1 className="text-xl font-bold text-gray-900">Panel Administrativo</h1>
          <p className="text-sm text-gray-500">Guardian Electoral - Gestión de clientes</p>
        </div>
      </div>

      {/* Stats generales */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-2xl font-bold text-primary-700">{clientes.length}</p>
          <p className="text-xs text-gray-500">Clientes activos</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-green-600">{totalPersoneros}</p>
          <p className="text-xs text-gray-500">Personeros totales</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-guardian-gold">{totalActas}</p>
          <p className="text-xs text-gray-500">Actas subidas</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-gray-700">{stats.totalMesas.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Mesas nacionales</p>
        </Card>
      </div>

      {/* Acciones */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/admin/clientes">
          <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
            <svg className="w-8 h-8 mx-auto text-primary-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="font-semibold text-sm text-gray-900">Gestionar Clientes</p>
            <p className="text-xs text-gray-500 mt-0.5">Alta de candidatos</p>
          </Card>
        </Link>
        <Link href="/admin/actas">
          <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
            <svg className="w-8 h-8 mx-auto text-guardian-gold mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-semibold text-sm text-gray-900">Actas Recibidas</p>
            <p className="text-xs text-gray-500 mt-0.5">Resultados electorales</p>
          </Card>
        </Link>
      </div>

      {/* Lista de clientes */}
      {clientes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Clientes registrados</h3>
          {clientes.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{c.candidato || c.nombre_cliente}</p>
                  <p className="text-xs text-gray-500">{c.cargo || c.nombre_cliente}</p>
                  {c.distrito_electoral && (
                    <p className="text-xs text-primary-600 mt-0.5">{c.distrito_electoral}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{c.personeros_registrados} personeros</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{c.actas_subidas} actas</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{c.mesas_cubiertas} mesas</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={c.pagado ? "success" : "warning"}>
                    {c.pagado ? "Pagado" : "Pendiente"}
                  </Badge>
                  <Badge variant={c.alcance === "nacional" ? "info" : "default"}>
                    {c.alcance === "nacional" ? "Nacional" : "Distrital"}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
