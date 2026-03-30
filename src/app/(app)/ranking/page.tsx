"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { db } from "@/lib/db/indexed-db";
import { createClient } from "@/lib/supabase/client";

interface RankingEntry {
  id: string;
  full_name: string;
  centro_votacion: string | null;
  mesas_cubiertas: number;
  total_actas: number;
  total_votos_registrados: number;
  puntos: number;
  posicion: number;
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [myStats, setMyStats] = useState({ mesas: 0, actas: 0, puntos: 0 });
  const [myPosition, setMyPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [useLocal, setUseLocal] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadRanking();
    loadLocalStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadLocalStats() {
    const actas = await db.actas.toArray();
    const uniqueMesas = new Set(actas.map((a) => a.mesaId)).size;
    const fullTop3 = actas.filter((a) => a.top3Parties.length >= 3).length;
    const puntos = uniqueMesas * 10 + actas.length * 5 + fullTop3 * 2;
    setMyStats({ mesas: uniqueMesas, actas: actas.length, puntos });
  }

  async function loadRanking() {
    try {
      const { data, error } = await supabase.rpc("get_party_ranking");
      if (error) throw error;

      if (data && data.length > 0) {
        setRanking(data);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const me = data.find((r: RankingEntry) => r.id === user.id);
          if (me) setMyPosition(me.posicion);
        }
      } else {
        setUseLocal(true);
      }
    } catch {
      setUseLocal(true);
    } finally {
      setLoading(false);
    }
  }

  function getMedalIcon(pos: number) {
    if (pos === 1) return "🥇";
    if (pos === 2) return "🥈";
    if (pos === 3) return "🥉";
    return `#${pos}`;
  }

  function getMotivationalMessage() {
    const { mesas } = myStats;
    if (mesas >= 10) return "Leyenda electoral! Eres imparable";
    if (mesas >= 7) return "Guardian estrella! Top performer";
    if (mesas >= 5) return "Excelente ritmo! Sigue asi";
    if (mesas >= 3) return "Buen trabajo! Cada mesa cuenta";
    if (mesas >= 1) return "Buen comienzo! A por mas mesas";
    return "Registra tu primera mesa para entrar al ranking";
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Ranking de Guardianes</h1>
        <p className="text-sm text-gray-500">Compite por cubrir más mesas y ganar premios</p>
      </div>

      {/* My Stats Card */}
      <Card className="bg-gradient-to-br from-primary-800 to-primary-900 text-white border-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-200 text-xs uppercase tracking-wide">Tu posición</p>
              <p className="text-4xl font-black mt-1">
                {myPosition ? getMedalIcon(myPosition) : "--"}
              </p>
            </div>
            <div className="text-right space-y-1">
              <div>
                <span className="text-primary-200 text-xs">Mesas </span>
                <span className="text-xl font-bold">{myStats.mesas}</span>
              </div>
              <div>
                <span className="text-primary-200 text-xs">Actas </span>
                <span className="text-xl font-bold">{myStats.actas}</span>
              </div>
              <div>
                <span className="text-primary-200 text-xs">Puntos </span>
                <span className="text-xl font-bold text-guardian-gold">{myStats.puntos}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-sm text-primary-100">{getMotivationalMessage()}</span>
            </div>
          </div>

          {/* Points breakdown */}
          <div className="mt-3 flex gap-2 flex-wrap">
            <span className="text-[10px] bg-white/10 px-2 py-1 rounded-full">+10 pts/mesa nueva</span>
            <span className="text-[10px] bg-white/10 px-2 py-1 rounded-full">+5 pts/acta enviada</span>
            <span className="text-[10px] bg-white/10 px-2 py-1 rounded-full">+2 pts top 3 completo</span>
          </div>
        </div>
      </Card>

      {/* Leaderboard */}
      <Card padding={false}>
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Tabla de posiciones</h3>
          <p className="text-xs text-gray-500">Guardianes del partido</p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <svg className="animate-spin h-8 w-8 mx-auto text-primary-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-500 mt-2">Cargando ranking...</p>
          </div>
        ) : useLocal ? (
          <div className="p-6 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 010-5.656" />
            </svg>
            <p className="text-sm text-gray-500">Ranking no disponible sin conexión</p>
            <p className="text-xs text-gray-400 mt-1">Tus puntos locales: <strong className="text-guardian-gold">{myStats.puntos}</strong></p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={loadRanking}>
              Reintentar
            </Button>
          </div>
        ) : ranking.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-gray-500">Aún no hay datos en el ranking</p>
            <p className="text-xs text-gray-400 mt-1">Sé el primero en registrar actas!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {ranking.map((entry) => (
              <div
                key={entry.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  myPosition && entry.posicion === myPosition ? "bg-primary-50" : ""
                }`}
              >
                {/* Position */}
                <div className="w-10 text-center">
                  {entry.posicion <= 3 ? (
                    <span className="text-2xl">{getMedalIcon(entry.posicion)}</span>
                  ) : (
                    <span className="text-lg font-bold text-gray-400">#{entry.posicion}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {entry.full_name}
                    {myPosition && entry.posicion === myPosition && (
                      <Badge variant="info" className="ml-2">Tú</Badge>
                    )}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{entry.mesas_cubiertas} mesa{entry.mesas_cubiertas !== 1 ? "s" : ""}</span>
                    <span>·</span>
                    <span>{entry.total_actas} acta{entry.total_actas !== 1 ? "s" : ""}</span>
                    {entry.centro_votacion && (
                      <>
                        <span>·</span>
                        <span className="truncate">{entry.centro_votacion}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Points */}
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-guardian-gold">{entry.puntos}</p>
                  <p className="text-[10px] text-gray-400">puntos</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Prize info */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-2">Sistema de premios</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg">
            <span className="text-2xl">🥇</span>
            <div>
              <p className="text-sm font-medium text-gray-900">1er lugar</p>
              <p className="text-xs text-gray-500">Mayor cantidad de mesas cubiertas</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
            <span className="text-2xl">🥈</span>
            <div>
              <p className="text-sm font-medium text-gray-900">2do lugar</p>
              <p className="text-xs text-gray-500">Destacado por su dedicación</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg">
            <span className="text-2xl">🥉</span>
            <div>
              <p className="text-sm font-medium text-gray-900">3er lugar</p>
              <p className="text-xs text-gray-500">Gran aporte al equipo</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">
          Mientras más mesas cubras, más alto llegas en el ranking
        </p>
      </Card>
    </div>
  );
}
