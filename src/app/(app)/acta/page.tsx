"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { db, type LocalActa } from "@/lib/db/indexed-db";
import { useSync } from "@/hooks/useSync";
import { useTenantContext } from "@/components/TenantProvider";
import Link from "next/link";

export default function ActaListPage() {
  const { session } = useTenantContext();
  const [actas, setActas] = useState<LocalActa[]>([]);
  const [mesaId, setMesaId] = useState("");
  const [centroVotacion, setCentroVotacion] = useState("");
  const { pendingCount, syncing, isOnline, doSync } = useSync();

  useEffect(() => {
    loadActas();
    // Auto-fill from assigned centro, fallback to localStorage
    if (session?.assigned_centro) {
      setCentroVotacion(session.assigned_centro);
      localStorage.setItem("ge_centro_votacion", session.assigned_centro);
    } else {
      const saved = localStorage.getItem("ge_centro_votacion");
      if (saved) setCentroVotacion(saved);
    }
  }, [session?.assigned_centro]);

  async function loadActas() {
    const items = await db.actas.orderBy("createdAt").reverse().toArray();
    setActas(items);
  }

  function handleCentroChange(value: string) {
    setCentroVotacion(value);
    localStorage.setItem("ge_centro_votacion", value);
  }

  const mesasCubiertas = new Set(actas.map((a) => a.mesaId)).size;
  const lastMesaNum = actas.length > 0 ? parseInt(actas[0].mesaId) || 0 : 0;
  const suggestedNext = lastMesaNum > 0 ? String(lastMesaNum + 1).padStart(3, "0") : "";

  const pendingActas = actas.filter((a) => a.syncStatus === "pending");
  const errorActas = actas.filter((a) => a.syncStatus === "error");
  const syncedActas = actas.filter((a) => a.syncStatus === "synced");
  const unsyncedCount = pendingActas.length + errorActas.length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Actas de Votación</h1>
        <p className="text-sm text-gray-500">Registra las actas de cada mesa que cubras</p>
      </div>

      {/* ALERTA DE SINCRONIZACIÓN - Prominente cuando hay pendientes */}
      {unsyncedCount > 0 && (
        <Card
          className={`border-2 ${
            errorActas.length > 0
              ? "border-red-300 bg-red-50"
              : "border-amber-300 bg-amber-50"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
              errorActas.length > 0 ? "bg-red-100" : "bg-amber-100"
            }`}>
              {errorActas.length > 0 ? (
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-bold ${errorActas.length > 0 ? "text-red-800" : "text-amber-800"}`}>
                {errorActas.length > 0
                  ? `${errorActas.length} acta${errorActas.length > 1 ? "s" : ""} con error de envío`
                  : `${pendingActas.length} acta${pendingActas.length > 1 ? "s" : ""} sin enviar al servidor`
                }
              </p>
              <p className={`text-xs mt-0.5 ${errorActas.length > 0 ? "text-red-600" : "text-amber-600"}`}>
                {!isOnline
                  ? "Sin conexión a internet. Se enviarán al reconectar."
                  : errorActas.length > 0
                  ? "Hubo un problema al enviar. Toca para reintentar."
                  : "Las actas están guardadas en tu dispositivo. Envíalas al servidor."
                }
              </p>
              <Button
                size="md"
                variant={errorActas.length > 0 ? "danger" : "primary"}
                className="w-full mt-3"
                onClick={async () => {
                  // Reset errors to pending before syncing
                  for (const a of errorActas) {
                    await db.actas.update(a.localId!, { syncStatus: "pending", syncError: undefined });
                  }
                  await doSync();
                  await loadActas();
                }}
                loading={syncing}
                disabled={!isOnline}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {syncing
                  ? "Enviando..."
                  : isOnline
                  ? `Enviar ${unsyncedCount} acta${unsyncedCount > 1 ? "s" : ""} al servidor`
                  : "Sin conexión"
                }
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Confirmación cuando todo está sincronizado */}
      {actas.length > 0 && unsyncedCount === 0 && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
          <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-green-800">
            Todas las actas fueron enviadas al servidor correctamente
          </p>
        </div>
      )}

      {/* Progress Card */}
      <Card className="bg-gradient-to-r from-guardian-gold/90 to-yellow-600 text-white border-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-yellow-100 text-xs uppercase tracking-wide font-medium">Tu progreso</p>
            <p className="text-3xl font-bold mt-1">{mesasCubiertas}</p>
            <p className="text-yellow-100 text-sm">mesa{mesasCubiertas !== 1 ? "s" : ""} cubierta{mesasCubiertas !== 1 ? "s" : ""}</p>
          </div>
          <div className="text-right">
            <p className="text-yellow-100 text-xs">Puntos acumulados</p>
            <p className="text-2xl font-bold">{mesasCubiertas * 10 + actas.length * 5}</p>
            <p className="text-yellow-100 text-xs">+10 pts por mesa nueva</p>
          </div>
        </div>
      </Card>

      {/* Centro de Votación */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-2">Centro de Votación</h3>
        {session?.assigned_centro ? (
          <div className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-primary-800">{session.assigned_centro}</p>
            {session.assigned_mesa && (
              <p className="text-xs text-primary-600 mt-0.5">Mesa asignada: {session.assigned_mesa}</p>
            )}
          </div>
        ) : (
          <>
            <Input
              placeholder="Nombre del local (ej: IE San Martín)"
              value={centroVotacion}
              onChange={(e) => handleCentroChange(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Se recuerda para las próximas actas</p>
          </>
        )}
      </Card>

      {/* Nueva Mesa */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-3">Registrar nueva mesa</h3>
        <div className="flex gap-2">
          <Input
            placeholder="N° de mesa (ej: 001)"
            value={mesaId}
            onChange={(e) => setMesaId(e.target.value)}
            inputMode="numeric"
          />
          <Link href={mesaId.trim() ? `/acta/${encodeURIComponent(mesaId.trim())}?centro=${encodeURIComponent(centroVotacion)}` : "#"}>
            <Button disabled={!mesaId.trim()} className="whitespace-nowrap" size="lg">
              Ir
            </Button>
          </Link>
        </div>
        {actas.length > 0 && suggestedNext && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Siguiente mesa sugerida:</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setMesaId(suggestedNext)}
                className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors"
              >
                Mesa {suggestedNext}
              </button>
              {[1, 2, 3].map((offset) => {
                const num = String(lastMesaNum + offset + 1).padStart(3, "0");
                if (num === suggestedNext) return null;
                return (
                  <button
                    key={num}
                    onClick={() => setMesaId(num)}
                    className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-sm hover:bg-gray-100 transition-colors"
                  >
                    Mesa {num}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Lista de actas */}
      {actas.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Actas registradas ({actas.length})</h3>
            <div className="flex items-center gap-2">
              <Badge variant="success">{syncedActas.length} enviadas</Badge>
              <Badge variant="info">{mesasCubiertas} mesa{mesasCubiertas !== 1 ? "s" : ""}</Badge>
            </div>
          </div>
          {actas.map((acta) => (
            <Link key={acta.localId} href={`/acta/${encodeURIComponent(acta.mesaId)}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      acta.syncStatus === "synced" ? "bg-green-100" :
                      acta.syncStatus === "error" ? "bg-red-100" : "bg-amber-100"
                    }`}>
                      {acta.syncStatus === "synced" ? (
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : acta.syncStatus === "error" ? (
                        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Mesa {acta.mesaId}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(acta.createdAt).toLocaleString("es", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                      {acta.top3Parties.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {acta.top3Parties.map((p, i) => (
                            <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                              {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {p.party}: {p.votes}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge
                      variant={
                        acta.syncStatus === "synced" ? "success" :
                        acta.syncStatus === "error" ? "danger" : "warning"
                      }
                    >
                      {acta.syncStatus === "synced" ? "Enviada" : acta.syncStatus === "error" ? "Error" : "En dispositivo"}
                    </Badge>
                  </div>
                </div>
                {acta.syncStatus === "error" && (
                  <div className="mt-2 pt-2 border-t border-red-100">
                    <p className="text-xs text-red-600">
                      {acta.syncError || "Error al enviar. Usa el botón de arriba para reintentar."}
                    </p>
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      {actas.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">No hay actas registradas aún</p>
          <p className="text-xs mt-1">Cada mesa que cubras te suma puntos en el ranking!</p>
        </div>
      )}
    </div>
  );
}
