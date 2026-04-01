"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { useTenantContext } from "@/components/TenantProvider";
import Link from "next/link";

interface CenterRecord {
  department: string;
  province: string;
  district: string;
  name: string;
  address: string;
}

interface ImportResult {
  inserted: number;
  updated: number;
  errors: string[];
}

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function ImportarPage() {
  const { session } = useTenantContext();
  const supabase = createClient();

  const [records, setRecords] = useState<CenterRecord[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const isSuperAdmin = session?.role === "superadmin";

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setResult(null);
    setError(null);

    const selectedFiles = Array.from(files).slice(0, 5);
    const names: string[] = [];
    let allRecords: CenterRecord[] = [];
    let filesRead = 0;

    selectedFiles.forEach((file) => {
      names.push(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (!Array.isArray(data)) throw new Error(`${file.name}: debe contener un array JSON`);
          if (data.length > 0) {
            const first = data[0];
            if (!first.name || !first.department || !first.district) {
              throw new Error(`${file.name}: cada registro debe tener name, department, province, district, address`);
            }
            allRecords = [...allRecords, ...data];
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al leer archivo");
        }
        filesRead++;
        if (filesRead === selectedFiles.length) {
          setRecords(allRecords);
          setFileNames(names);
        }
      };
      reader.readAsText(file);
    });
  }

  async function handleImport() {
    if (records.length === 0) return;

    setImporting(true);
    setError(null);
    setResult(null);
    setProgress(0);

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];
    const batchSize = 20;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      for (const record of batch) {
        try {
          const dept = titleCase(record.department);
          const prov = titleCase(record.province);
          const dist = titleCase(record.district);

          // Try to find existing center by name similarity + district
          const { data: existing } = await supabase
            .from("voting_centers")
            .select("id, name")
            .ilike("district", dist)
            .ilike("department", dept)
            .ilike("name", `%${record.name.substring(0, 15)}%`)
            .limit(1);

          if (existing && existing.length > 0) {
            // Update existing
            await supabase
              .from("voting_centers")
              .update({
                name: record.name,
                address: record.address,
                province: prov,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing[0].id);
            updated++;
          } else {
            // Insert new
            const deptCode = record.department.substring(0, 3).toUpperCase();
            const code = `ONPE-${deptCode}-${String(inserted + 1).padStart(4, "0")}`;

            const { error: insertError } = await supabase
              .from("voting_centers")
              .insert({
                name: record.name,
                address: record.address,
                department: dept,
                province: prov,
                district: dist,
                code,
                total_voters: 0,
                total_tables: 0,
                is_active: true,
              });

            if (insertError) {
              errors.push(`${record.name}: ${insertError.message}`);
            } else {
              inserted++;
            }
          }
        } catch (err) {
          errors.push(`${record.name}: ${err instanceof Error ? err.message : "Error"}`);
        }
      }

      setProgress(Math.min(100, Math.round(((i + batchSize) / records.length) * 100)));
    }

    setResult({ inserted, updated, errors });
    setImporting(false);
    setProgress(100);
  }

  // Group records by district for preview
  const districtGroups: Record<string, number> = {};
  records.forEach((r) => {
    const key = `${r.district}, ${r.province}`;
    districtGroups[key] = (districtGroups[key] || 0) + 1;
  });

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm font-medium">Acceso restringido</p>
        <p className="text-xs mt-1">Solo el superadmin puede importar datos</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Importar Datos</h1>
        </div>
        <p className="text-sm text-gray-500 ml-7">Actualizar centros de votación desde archivos ONPE</p>
      </div>

      {/* Instructions */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-2">Formato del archivo</h3>
        <p className="text-xs text-gray-500 mb-3">Sube un archivo JSON con el formato de ONPE:</p>
        <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-600 overflow-x-auto">
          <pre>{`[
  {
    "department": "LIMA",
    "province": "LIMA",
    "district": "RIMAC",
    "name": "IE RICARDO BENTIN",
    "address": "AV. ALCAZAR 456"
  },
  ...
]`}</pre>
        </div>
      </Card>

      {/* Upload */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-3">Subir archivo JSON</h3>
        <label className="block">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-colors">
            <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {fileNames.length > 0 ? (
              <div>
                <p className="text-sm text-primary-700 font-medium">{fileNames.length} archivo{fileNames.length > 1 ? "s" : ""} seleccionado{fileNames.length > 1 ? "s" : ""}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{fileNames.join(", ")}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Toca para seleccionar hasta 5 archivos JSON</p>
            )}
          </div>
          <input
            type="file"
            accept=".json,application/json"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm">{error}</div>
      )}

      {/* Preview */}
      {records.length > 0 && !result && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Vista previa</h3>
            <Badge variant="info">{records.length} centros</Badge>
          </div>

          <div className="space-y-1.5 mb-4 max-h-40 overflow-y-auto">
            {Object.entries(districtGroups).map(([district, count]) => (
              <div key={district} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                <span className="text-gray-700">{district}</span>
                <span className="text-gray-500 font-medium">{count} centros</span>
              </div>
            ))}
          </div>

          <div className="text-xs text-gray-400 mb-3">
            Primeros 3 registros:
          </div>
          <div className="space-y-2 mb-4">
            {records.slice(0, 3).map((r, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-2.5 text-xs">
                <p className="font-medium text-gray-900">{r.name}</p>
                <p className="text-gray-500">{r.address}</p>
                <p className="text-gray-400">{r.district}, {r.province}, {r.department}</p>
              </div>
            ))}
          </div>

          {importing && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Importando...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleImport}
            loading={importing}
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Importar {records.length} centros de votación
          </Button>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card>
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Importación completada</h3>

            <div className="flex justify-center gap-6 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{result.inserted}</p>
                <p className="text-xs text-gray-500">Nuevos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
                <p className="text-xs text-gray-500">Actualizados</p>
              </div>
              {result.errors.length > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
                  <p className="text-xs text-gray-500">Errores</p>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="mt-4 text-left max-h-32 overflow-y-auto bg-red-50 rounded-lg p-3">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600">{err}</p>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => { setRecords([]); setResult(null); setFileNames([]); }}
              >
                Importar otro archivo
              </Button>
              <Link href="/admin" className="flex-1">
                <Button className="w-full">Volver al panel</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
