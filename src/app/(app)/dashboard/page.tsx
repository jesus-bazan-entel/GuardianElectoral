"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useSync } from "@/hooks/useSync";
import { db } from "@/lib/db/indexed-db";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const { pendingCount, syncing, isOnline, doSync } = useSync();
  const [lastCheckin, setLastCheckin] = useState<{ type: string; timestamp: string } | null>(null);
  const [actaCount, setActaCount] = useState(0);
  const [userName, setUserName] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: personero } = await supabase
          .from("personeros")
          .select("full_name, assigned_mesa, assigned_centro")
          .eq("id", user.id)
          .single();
        if (personero) setUserName(personero.full_name);
      }

      // Get last checkin from local DB
      const checkins = await db.checkins.orderBy("timestamp").reverse().limit(1).toArray();
      if (checkins.length > 0) {
        setLastCheckin({ type: checkins[0].type, timestamp: checkins[0].timestamp });
      }

      // Count actas
      const count = await db.actas.count();
      setActaCount(count);
    }
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isCheckedIn = lastCheckin?.type === "checkin";

  return (
    <div className="space-y-4">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Hola{userName ? `, ${userName}` : ""}
        </h1>
        <p className="text-sm text-gray-500">Panel de control del personero</p>
      </div>

      {/* Status Card */}
      <Card className="bg-gradient-to-r from-primary-700 to-primary-800 text-white border-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-200 text-sm">Estado actual</p>
            <p className="text-lg font-bold mt-0.5">
              {isCheckedIn ? "En servicio" : "Fuera de servicio"}
            </p>
            {lastCheckin && (
              <p className="text-primary-200 text-xs mt-1">
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

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/checkin">
          <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
            <svg className="w-8 h-8 mx-auto text-primary-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="font-semibold text-sm text-gray-900">Check-in/out</p>
            <p className="text-xs text-gray-500 mt-0.5">Registra tu asistencia</p>
          </Card>
        </Link>

        <Link href="/acta">
          <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
            <svg className="w-8 h-8 mx-auto text-guardian-gold mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="font-semibold text-sm text-gray-900">Cargar Acta</p>
            <p className="text-xs text-gray-500 mt-0.5">{actaCount} acta{actaCount !== 1 ? "s" : ""} registrada{actaCount !== 1 ? "s" : ""}</p>
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
