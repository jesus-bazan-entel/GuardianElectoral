"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { db, type LocalActa } from "@/lib/db/indexed-db";
import Link from "next/link";

export default function ActaListPage() {
  const [actas, setActas] = useState<LocalActa[]>([]);
  const [mesaId, setMesaId] = useState("");
  const [centroVotacion, setCentroVotacion] = useState("");

  useEffect(() => {
    loadActas();
    // Load saved centro from localStorage
    const saved = localStorage.getItem("ge_centro_votacion");
    if (saved) setCentroVotacion(saved);
  }, []);

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Actas de Votación</h1>
        <p className="text-sm text-gray-500">Registra las actas de cada mesa que cubras</p>
      </div>

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
        {mesasCubiertas > 0 && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-yellow-200" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-sm text-yellow-100">
                {mesasCubiertas >= 5
                  ? "Excelente trabajo! Eres un guardian estrella"
                  : mesasCubiertas >= 3
                  ? "Buen ritmo! Sigue sumando mesas"
                  : "Cada mesa cuenta para el ranking!"}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Centro de Votación */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-2">Centro de Votación</h3>
        <Input
          placeholder="Nombre del local (ej: IE San Martín)"
          value={centroVotacion}
          onChange={(e) => handleCentroChange(e.target.value)}
        />
        <p className="text-xs text-gray-400 mt-1">Se recuerda para las próximas actas</p>
      </Card>

      {/* Nueva Mesa - Quick Entry */}
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

        {/* Quick suggestions */}
        {actas.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Siguiente mesa sugerida:</p>
            <div className="flex gap-2 flex-wrap">
              {suggestedNext && (
                <button
                  onClick={() => setMesaId(suggestedNext)}
                  className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors"
                >
                  Mesa {suggestedNext}
                </button>
              )}
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

      {/* Existing Actas */}
      {actas.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Actas registradas ({actas.length})</h3>
            <Badge variant="info">{mesasCubiertas} mesa{mesasCubiertas !== 1 ? "s" : ""}</Badge>
          </div>
          {actas.map((acta) => (
            <Link key={acta.localId} href={`/acta/${encodeURIComponent(acta.mesaId)}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-primary-700 font-bold text-sm">{acta.mesaId}</span>
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
                        <div className="flex gap-1 mt-1">
                          {acta.top3Parties.map((p, i) => (
                            <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                              {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {p.party}: {p.votes}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant={
                        acta.syncStatus === "synced" ? "success" :
                        acta.syncStatus === "error" ? "danger" : "warning"
                      }
                    >
                      {acta.syncStatus === "synced" ? "Enviado" : acta.syncStatus === "error" ? "Error" : "Pendiente"}
                    </Badge>
                  </div>
                </div>
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
