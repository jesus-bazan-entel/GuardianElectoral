"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { compressImage, blobToDataUrl } from "@/lib/camera";
import { db, type LocalActa } from "@/lib/db/indexed-db";
import { useTenantContext } from "@/components/TenantProvider";
import Link from "next/link";

interface PhotoItem {
  blob: Blob;
  preview: string;
  name: string;
}

interface Top3Entry {
  party: string;
  votes: string;
}

export default function ActaUploadPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mesaId = decodeURIComponent(params.mesaId as string);
  const centroFromUrl = searchParams.get("centro") || "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { session } = useTenantContext();

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [top3, setTop3] = useState<Top3Entry[]>([
    { party: "", votes: "" },
    { party: "", votes: "" },
    { party: "", votes: "" },
  ]);
  const [nullVotes, setNullVotes] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [success, setSuccess] = useState(false);
  const [existingActa, setExistingActa] = useState<LocalActa | null>(null);
  const [existingPhotoCount, setExistingPhotoCount] = useState(0);

  useEffect(() => {
    db.actas.count().then(setSavedCount);
    loadExistingActa();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadExistingActa() {
    // Find existing acta for this mesa
    const actas = await db.actas.where("mesaId").equals(mesaId).reverse().sortBy("createdAt");
    if (actas.length > 0) {
      const acta = actas[0];
      setExistingActa(acta);

      // Load top3 data
      if (acta.top3Parties.length > 0) {
        const loaded: Top3Entry[] = [
          { party: "", votes: "" },
          { party: "", votes: "" },
          { party: "", votes: "" },
        ];
        acta.top3Parties.forEach((p, i) => {
          if (i < 3) {
            loaded[i] = { party: p.party, votes: String(p.votes) };
          }
        });
        setTop3(loaded);
      }

      if (acta.nullVotes) setNullVotes(String(acta.nullVotes));
      if (acta.notes) setNotes(acta.notes);

      // Load photos from IndexedDB
      const savedPhotos = await db.photos
        .where("actaLocalId")
        .equals(acta.localId!)
        .toArray();

      setExistingPhotoCount(savedPhotos.length);

      const photoItems: PhotoItem[] = [];
      for (const p of savedPhotos) {
        try {
          const preview = await blobToDataUrl(p.blob);
          photoItems.push({ blob: p.blob, preview, name: p.name });
        } catch {
          // Photo blob may be corrupted
        }
      }
      setPhotos(photoItems);
    }
  }

  async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        const compressed = await compressImage(file);
        const preview = await blobToDataUrl(compressed);
        setPhotos((prev) => [...prev, {
          blob: compressed,
          preview,
          name: `acta_${mesaId}_${Date.now()}.jpg`,
        }]);
      } catch (err) {
        console.error("Error comprimiendo foto:", err);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTop3(index: number, field: "party" | "votes", value: string) {
    setTop3((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function handleSubmit() {
    if (photos.length === 0) {
      setError("Debes agregar al menos una foto del acta");
      return;
    }

    const hasAnyTop3 = top3.some((entry) => entry.party.trim() && entry.votes.trim());
    if (!hasAnyTop3) {
      setError("Ingresa al menos el primer lugar del top 3");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (!session) throw new Error("No autenticado");

      const centroId = centroFromUrl || localStorage.getItem("ge_centro_votacion") || null;

      const top3Parsed = top3
        .filter((entry) => entry.party.trim() && entry.votes.trim())
        .map((entry, i) => ({
          party: entry.party.trim(),
          votes: parseInt(entry.votes) || 0,
          position: i + 1,
        }));

      const totalVotes = top3Parsed.reduce((sum, e) => sum + e.votes, 0) + (parseInt(nullVotes) || 0);

      // If editing existing acta, delete old one first
      if (existingActa?.localId) {
        await db.photos.where("actaLocalId").equals(existingActa.localId).delete();
        await db.actas.delete(existingActa.localId);
      }

      const actaId = await db.actas.add({
        userId: session.personero_id,
        mesaId,
        centroId,
        top3Parties: top3Parsed,
        totalVotes,
        nullVotes: parseInt(nullVotes) || null,
        notes: notes.trim() || null,
        status: "submitted",
        syncStatus: "pending",
        createdAt: new Date().toISOString(),
      });

      for (const photo of photos) {
        await db.photos.add({
          actaLocalId: actaId as number,
          blob: photo.blob,
          name: photo.name,
          syncStatus: "pending",
        });
      }

      setSavedCount((prev) => existingActa ? prev : prev + 1);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function getNextMesaId(): string {
    const num = parseInt(mesaId);
    if (!isNaN(num)) return String(num + 1).padStart(mesaId.length, "0");
    return "";
  }

  if (success) {
    const nextMesa = getNextMesaId();
    const centro = centroFromUrl || localStorage.getItem("ge_centro_votacion") || "";

    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Mesa {mesaId} guardada!</h2>
        <p className="text-sm text-gray-500 mt-1">Se sincronizará automáticamente</p>

        <div className="flex gap-4 mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-700">{savedCount}</p>
            <p className="text-xs text-gray-500">Actas hoy</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-guardian-gold">{savedCount * 15}</p>
            <p className="text-xs text-gray-500">Puntos</p>
          </div>
        </div>

        <div className="w-full max-w-xs mt-8 space-y-3">
          {nextMesa && (
            <Link href={`/acta/${encodeURIComponent(nextMesa)}?centro=${encodeURIComponent(centro)}`} className="block">
              <Button size="lg" className="w-full" variant="success">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Siguiente mesa: {nextMesa}
              </Button>
            </Link>
          )}
          <Link href="/acta" className="block">
            <Button size="lg" className="w-full" variant="secondary">
              Ver todas mis actas
            </Button>
          </Link>
          <Link href="/ranking" className="block">
            <Button size="lg" className="w-full" variant="ghost">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Ver ranking
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mesa {mesaId}</h1>
          <p className="text-sm text-gray-500">
            {centroFromUrl || "Fotografía el acta y registra resultados"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {existingActa && (
            <Badge variant={
              existingActa.syncStatus === "synced" ? "success" :
              existingActa.syncStatus === "error" ? "danger" : "warning"
            }>
              {existingActa.syncStatus === "synced" ? "Enviado" :
               existingActa.syncStatus === "error" ? "Error sync" : "Pendiente"}
            </Badge>
          )}
          <div className="text-right">
            <p className="text-xs text-gray-400">Actas hoy</p>
            <p className="text-lg font-bold text-primary-700">{savedCount}</p>
          </div>
        </div>
      </div>

      {/* Existing acta notice */}
      {existingActa && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-3 text-sm flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Acta existente cargada ({existingPhotoCount} foto{existingPhotoCount !== 1 ? "s" : ""}).
            Puedes editar y volver a guardar.
          </span>
        </div>
      )}

      {/* Photo Capture */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-3">Fotos del Acta</h3>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {photos.map((photo, index) => (
              <div key={index} className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100">
                <img src={photo.preview} alt={`Acta foto ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handlePhotoCapture}
          className="hidden"
        />

        <div className="flex gap-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.setAttribute("capture", "environment");
                fileInputRef.current.click();
              }
            }}
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Tomar Foto
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute("capture");
                fileInputRef.current.click();
              }
            }}
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Subir
          </Button>
        </div>

        <p className="text-xs text-gray-400 mt-2 text-center">
          {photos.length}/5 fotos - Las imágenes se comprimen automáticamente
        </p>
      </Card>

      {/* Top 3 Form */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-3">Top 3 - Resultados de Votación</h3>
        <div className="space-y-3">
          {top3.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 ${
                index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : "bg-amber-700"
              }`}>
                {index + 1}
              </div>
              <Input
                placeholder="Nombre del partido"
                value={entry.party}
                onChange={(e) => updateTop3(index, "party", e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Votos"
                value={entry.votes}
                onChange={(e) => updateTop3(index, "votes", e.target.value)}
                className="w-24"
                inputMode="numeric"
              />
            </div>
          ))}

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 shrink-0">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <span className="text-sm text-gray-600 flex-1">Votos nulos</span>
            <Input
              type="number"
              placeholder="Nulos"
              value={nullVotes}
              onChange={(e) => setNullVotes(e.target.value)}
              className="w-24"
              inputMode="numeric"
            />
          </div>
        </div>
      </Card>

      {/* Notes */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-2">Observaciones</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas adicionales sobre el acta (opcional)"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          rows={3}
          style={{ fontSize: "16px" }}
        />
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      <Button
        size="lg"
        className="w-full"
        onClick={handleSubmit}
        loading={saving}
      >
        {existingActa ? "Actualizar Acta" : "Guardar Acta"} de Mesa {mesaId}
      </Button>
    </div>
  );
}
