"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useGeolocation } from "@/hooks/useGeolocation";
import { compressImage, blobToDataUrl } from "@/lib/camera";
import { db, type LocalIncident } from "@/lib/db/indexed-db";
import { useTenantContext } from "@/components/TenantProvider";

const CATEGORIES = [
  { value: "intimidation", label: "Intimidación", icon: "!!", color: "bg-red-100 text-red-800" },
  { value: "irregularity", label: "Irregularidad", icon: "?", color: "bg-yellow-100 text-yellow-800" },
  { value: "equipment_failure", label: "Falla de equipo", icon: "X", color: "bg-orange-100 text-orange-800" },
  { value: "other", label: "Otro", icon: "~", color: "bg-gray-100 text-gray-800" },
];

const SEVERITIES = [
  { value: "low", label: "Baja", color: "bg-blue-100 text-blue-800" },
  { value: "medium", label: "Media", color: "bg-yellow-100 text-yellow-800" },
  { value: "high", label: "Alta", color: "bg-orange-100 text-orange-800" },
  { value: "critical", label: "Crítica", color: "bg-red-100 text-red-800" },
];

export default function IncidentsPage() {
  const { position, requestPosition } = useGeolocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { session } = useTenantContext();

  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [mesaId, setMesaId] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<{ blob: Blob; preview: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [history, setHistory] = useState<LocalIncident[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    requestPosition();
    loadHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadHistory() {
    const items = await db.incidents.orderBy("createdAt").reverse().limit(20).toArray();
    setHistory(items);
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const compressed = await compressImage(file);
      const preview = await blobToDataUrl(compressed);
      setPhotos((prev) => [...prev, { blob: compressed, preview }]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!category || !description.trim()) return;
    setSaving(true);

    try {
      if (!session) throw new Error("No autenticado");

      const pos = await requestPosition();

      await db.incidents.add({
        userId: session.personero_id,
        mesaId: mesaId.trim() || null,
        category,
        description: description.trim(),
        lat: pos?.lat ?? position?.lat ?? null,
        lng: pos?.lng ?? position?.lng ?? null,
        severity,
        syncStatus: "pending",
        createdAt: new Date().toISOString(),
      });

      setSuccess(true);
      setCategory("");
      setSeverity("medium");
      setMesaId("");
      setDescription("");
      setPhotos([]);
      setShowForm(false);
      await loadHistory();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error al guardar incidente:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Incidentes</h1>
          <p className="text-sm text-gray-500">Reporta irregularidades electorales</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm">
            + Nuevo
          </Button>
        )}
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 text-center font-medium text-sm">
          Incidente reportado correctamente
        </div>
      )}

      {showForm && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3">Nuevo Incidente</h3>

          {/* Category */}
          <p className="text-sm font-medium text-gray-700 mb-2">Categoría</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`p-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                  category === cat.value
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Severity */}
          <p className="text-sm font-medium text-gray-700 mb-2">Severidad</p>
          <div className="flex gap-2 mb-4">
            {SEVERITIES.map((sev) => (
              <button
                key={sev.value}
                onClick={() => setSeverity(sev.value)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  severity === sev.value
                    ? sev.color + " ring-2 ring-offset-1 ring-primary-500"
                    : "bg-gray-50 text-gray-500"
                }`}
              >
                {sev.label}
              </button>
            ))}
          </div>

          <Input
            label="Mesa (opcional)"
            placeholder="Número de mesa"
            value={mesaId}
            onChange={(e) => setMesaId(e.target.value)}
            className="mb-3"
          />

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe lo que ocurrió..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              rows={3}
              style={{ fontSize: "16px" }}
            />
          </div>

          {/* Photos */}
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple onChange={handlePhoto} className="hidden" />
          {photos.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto">
              {photos.map((p, i) => (
                <img key={i} src={p.preview} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              ))}
            </div>
          )}
          <Button variant="secondary" size="sm" className="mb-4 w-full" onClick={() => fileInputRef.current?.click()}>
            Agregar foto de evidencia
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              variant="danger"
              onClick={handleSubmit}
              loading={saving}
              disabled={!category || !description.trim()}
            >
              Reportar
            </Button>
          </div>
        </Card>
      )}

      {/* History */}
      {history.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Historial</h3>
          {history.map((item) => (
            <Card key={item.localId}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={
                      item.severity === "critical" ? "danger" :
                      item.severity === "high" ? "warning" : "default"
                    }>
                      {CATEGORIES.find((c) => c.value === item.category)?.label || item.category}
                    </Badge>
                    <Badge variant={
                      item.severity === "critical" ? "danger" :
                      item.severity === "high" ? "warning" :
                      item.severity === "medium" ? "info" : "default"
                    }>
                      {SEVERITIES.find((s) => s.value === item.severity)?.label || item.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700">{item.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(item.createdAt).toLocaleString("es", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "short",
                    })}
                    {item.mesaId && ` - Mesa ${item.mesaId}`}
                  </p>
                </div>
                <Badge variant={item.syncStatus === "synced" ? "success" : item.syncStatus === "error" ? "danger" : "warning"}>
                  {item.syncStatus === "synced" ? "Sync" : item.syncStatus === "error" ? "Error" : "..."}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      ) : !showForm && (
        <div className="text-center py-12 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">No hay incidentes reportados</p>
          <p className="text-xs mt-1">Esperamos que no los haya</p>
        </div>
      )}
    </div>
  );
}
