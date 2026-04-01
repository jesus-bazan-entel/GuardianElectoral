"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useSync } from "@/hooks/useSync";
import { db } from "@/lib/db/indexed-db";
import { useTenantContext } from "@/components/TenantProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const { pendingCount, syncing, isOnline, doSync } = useSync();
  const { session, tenant, logout } = useTenantContext();
  const router = useRouter();

  const isAdmin = session?.role === "admin" || session?.role === "coordinator" || session?.role === "superadmin";

  // Redirect admin to admin panel
  useEffect(() => {
    if (isAdmin) {
      router.replace("/admin");
    }
  }, [isAdmin, router]);

  const [lastCheckin, setLastCheckin] = useState<{ type: string; timestamp: string } | null>(null);
  const [actaCount, setActaCount] = useState(0);
  const [mesaCount, setMesaCount] = useState(0);
  const [puntos, setPuntos] = useState(0);

  useEffect(() => {
    async function loadData() {
      const checkins = await db.checkins.orderBy("timestamp").reverse().limit(1).toArray();
      if (checkins.length > 0) {
        setLastCheckin({ type: checkins[0].type, timestamp: checkins[0].timestamp });
      }

      const actas = await db.actas.toArray();
      setActaCount(actas.length);
      const uniqueMesas = new Set(actas.map((a) => a.mesaId)).size;
      setMesaCount(uniqueMesas);
      const fullTop3 = actas.filter((a) => a.top3Parties.length >= 3).length;
      setPuntos(uniqueMesas * 10 + actas.length * 5 + fullTop3 * 2);
    }
    loadData();
  }, []);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const isCheckedIn = lastCheckin?.type === "checkin";

  return (
    <div className="space-y-4">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Hola{session ? `, ${session.full_name}` : ""}
        </h1>
        <p className="text-sm text-gray-500">
          {tenant?.name || "Guardian Electoral"}
        </p>
        {session?.assigned_centro && (
          <p className="text-xs text-primary-600 mt-0.5">
            Centro: {session.assigned_centro}
            {session.assigned_mesa && ` · Mesa: ${session.assigned_mesa}`}
          </p>
        )}
      </div>

      {/* Status Card */}
      <Card
        className="text-white border-0"
        style={{ background: `linear-gradient(to right, ${tenant?.primary_color || "#1d4ed8"}, ${tenant?.primary_color || "#1d4ed8"}cc)` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm">Estado actual</p>
            <p className="text-lg font-bold mt-0.5">
              {isCheckedIn ? "Presente en centro de votación" : "Aún no registra asistencia"}
            </p>
            {lastCheckin && (
              <p className="text-white/60 text-xs mt-1">
                Último {lastCheckin.type === "checkin" ? "ingreso" : "salida"}:{" "}
                {new Date(lastCheckin.timestamp).toLocaleTimeString("es")}
              </p>
            )}
          </div>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isCheckedIn ? "bg-green-500/20" : "bg-red-500/20"}`}>
            <div className={`w-8 h-8 rounded-full ${isCheckedIn ? "bg-green-400" : "bg-red-400"}`} />
          </div>
        </div>
      </Card>

      {/* Progress Card */}
      <Card
        className="text-white border-0"
        style={{ background: `linear-gradient(to right, ${tenant?.secondary_color || "#d97706"}ee, ${tenant?.secondary_color || "#d97706"})` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div>
              <p className="text-white/70 text-xs">Tu progreso</p>
              <p className="text-lg font-bold">{puntos} puntos</p>
              <p className="text-white/70 text-xs">{mesaCount} mesa{mesaCount !== 1 ? "s" : ""} · {actaCount} acta{actaCount !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/checkin">
          <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: tenant?.primary_color || "#2563eb" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="font-semibold text-sm text-gray-900">Check-in/out</p>
            <p className="text-xs text-gray-500 mt-0.5">Registra tu asistencia</p>
          </Card>
        </Link>

        <Link href="/acta">
          <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: tenant?.secondary_color || "#d97706" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="font-semibold text-sm text-gray-900">Cargar Acta</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {actaCount} acta{actaCount !== 1 ? "s" : ""} · {mesaCount} mesa{mesaCount !== 1 ? "s" : ""}
            </p>
          </Card>
        </Link>

        <Link href="/incidents">
          <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
            <svg className="w-8 h-8 mx-auto text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="font-semibold text-sm text-gray-900">Incidentes</p>
            <p className="text-xs text-gray-500 mt-0.5">Reportar irregularidades</p>
          </Card>
        </Link>

        <Card className="text-center">
          <div className="flex flex-col items-center">
            <Badge variant={isOnline ? "success" : "danger"} className="mb-2">
              {isOnline ? "En línea" : "Sin conexión"}
            </Badge>
            <p className="font-semibold text-sm text-gray-900">Sincronización</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {pendingCount > 0 ? `${pendingCount} pendiente${pendingCount > 1 ? "s" : ""}` : "Todo sincronizado"}
            </p>
            {pendingCount > 0 && isOnline && (
              <Button size="sm" variant="ghost" onClick={doSync} loading={syncing} className="mt-2 text-xs">
                Sincronizar
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Logout */}
      <Button variant="ghost" className="w-full text-gray-500" onClick={handleLogout}>
        Cerrar Sesión
      </Button>
    </div>
  );
}
