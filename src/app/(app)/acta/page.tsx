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

  useEffect(() => {
    loadActas();
  }, []);

  async function loadActas() {
    const items = await db.actas.orderBy("createdAt").reverse().toArray();
    setActas(items);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Actas de Votación</h1>
        <p className="text-sm text-gray-500">Registra y sube fotos de las actas</p>
      </div>

      {/* New Acta */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-3">Nueva Acta</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Número de mesa (ej: 001)"
            value={mesaId}
            onChange={(e) => setMesaId(e.target.value)}
          />
          <Link href={mesaId ? `/acta/${encodeURIComponent(mesaId)}` : "#"}>
            <Button disabled={!mesaId.trim()} className="whitespace-nowrap">
              Crear
            </Button>
          </Link>
        </div>
      </Card>

      {/* Existing Actas */}
      {actas.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Actas registradas</h3>
          {actas.map((acta) => (
            <Link key={acta.localId} href={`/acta/${encodeURIComponent(acta.mesaId)}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer mb-3">
                <div className="flex items-center justify-between">
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
                            {p.party}: {p.votes}
                          </span>
                        ))}
                      </div>
                    )}
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
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">No hay actas registradas</p>
          <p className="text-xs mt-1">Ingresa el número de mesa para comenzar</p>
        </div>
      )}
    </div>
  );
}
