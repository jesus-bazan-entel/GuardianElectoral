"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface ElectoralDistrict {
  id: string;
  code: string;
  name: string;
  department: string;
  diputados: number;
  senadores: number;
  total_centros: number;
  total_mesas: number;
  total_electores: number;
}

interface Tenant {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  candidate_name: string | null;
  candidate_position: string | null;
  scope_type: string;
  electoral_district_id: string | null;
  plan_type: string;
  max_personeros: number;
  max_mesas: number;
  primary_color: string;
  secondary_color: string;
  welcome_message: string;
  contact_phone: string | null;
  contact_email: string | null;
  is_paid: boolean;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export default function ClientesPage() {
  const supabase = createClient();
  const [districts, setDistricts] = useState<ElectoralDistrict[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [candidateName, setCandidateName] = useState("");
  const [candidatePosition, setCandidatePosition] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [scopeType, setScopeType] = useState<"distrital" | "nacional">("distrital");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1e40af");
  const [secondaryColor, setSecondaryColor] = useState("#d97706");
  const [maxPersoneros, setMaxPersoneros] = useState("200");
  const [isPaid, setIsPaid] = useState(false);
  const [expiresAt, setExpiresAt] = useState("2026-10-15");

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    const { data: distData } = await supabase
      .from("electoral_districts")
      .select("*")
      .order("name");
    if (distData) setDistricts(distData);

    const { data: tenantData } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });
    if (tenantData) setTenants(tenantData);
  }

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function loadTenantForEdit(t: Tenant) {
    setEditingId(t.id);
    setCandidateName(t.candidate_name || "");
    setCandidatePosition(t.candidate_position || "");
    setCampaignName(t.name);
    setScopeType((t.scope_type as "distrital" | "nacional") || "distrital");
    setSelectedDistrict(t.electoral_district_id || "");
    setContactPhone(t.contact_phone || "");
    setContactEmail(t.contact_email || "");
    setPrimaryColor(t.primary_color || "#1e40af");
    setSecondaryColor(t.secondary_color || "#d97706");
    setMaxPersoneros(String(t.max_personeros || 200));
    setIsPaid(t.is_paid || false);
    setExpiresAt(t.expires_at ? t.expires_at.split("T")[0] : "2026-10-15");
    setShowForm(true);
    setError(null);
  }

  async function handleSubmit() {
    if (!candidateName.trim() || !campaignName.trim()) {
      setError("Nombre del candidato y nombre de campaña son requeridos");
      return;
    }
    if (scopeType === "distrital" && !selectedDistrict) {
      setError("Selecciona un distrito electoral");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const slug = generateSlug(candidateName);
      const domain = `${slug}.guardian-electoral.com`;

      const district = districts.find((d) => d.id === selectedDistrict);
      const maxMesas = scopeType === "nacional"
        ? 90265
        : (district?.total_mesas || 5000);

      const tenantData = {
        name: campaignName.trim(),
        candidate_name: candidateName.trim(),
        candidate_position: candidatePosition.trim() || null,
        scope_type: scopeType,
        electoral_district_id: scopeType === "distrital" ? selectedDistrict : null,
        plan_type: scopeType,
        max_personeros: parseInt(maxPersoneros) || 200,
        max_mesas: maxMesas,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        welcome_message: `Bienvenido al equipo de ${candidateName.trim()}!`,
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
        is_paid: isPaid,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      if (editingId) {
        // UPDATE
        const { error: updateError } = await supabase
          .from("tenants")
          .update(tenantData)
          .eq("id", editingId);
        if (updateError) throw updateError;
        setSuccess(`Cliente "${candidateName}" actualizado correctamente`);
      } else {
        // INSERT
        const { error: insertError } = await supabase.from("tenants").insert({
          ...tenantData,
          slug,
          domain,
          is_active: true,
        });
        if (insertError) throw insertError;
        setSuccess(`Cliente "${candidateName}" registrado. Dominio: ${domain}`);
      }

      setShowForm(false);
      resetForm();
      await loadData();

      setTimeout(() => setSuccess(null), 8000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setCandidateName("");
    setCandidatePosition("");
    setCampaignName("");
    setScopeType("distrital");
    setSelectedDistrict("");
    setContactPhone("");
    setContactEmail("");
    setPrimaryColor("#1e40af");
    setSecondaryColor("#d97706");
    setMaxPersoneros("200");
    setIsPaid(false);
    setExpiresAt("2026-10-15");
  }

  const selectedDistrictInfo = districts.find((d) => d.id === selectedDistrict);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Gestión de Clientes</h1>
          </div>
          <p className="text-sm text-gray-500 ml-7">Alta y gestión de candidatos</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm">
            + Nuevo
          </Button>
        )}
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 text-sm">
          {success}
        </div>
      )}

      {/* Formulario de alta */}
      {showForm && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">
            {editingId ? "Editar Candidato" : "Registrar Nuevo Candidato"}
          </h3>

          <div className="space-y-4">
            {/* Datos del candidato */}
            <Input
              label="Nombre del candidato"
              value={candidateName}
              onChange={(e) => {
                setCandidateName(e.target.value);
                if (!campaignName) setCampaignName(`Campaña ${e.target.value} 2026`);
              }}
              placeholder="Ej: Carlos Rodríguez"
              required
            />

            <Input
              label="Cargo al que postula"
              value={candidatePosition}
              onChange={(e) => setCandidatePosition(e.target.value)}
              placeholder="Ej: Diputado por Arequipa"
            />

            <Input
              label="Nombre de la campaña"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Ej: Campaña Rodríguez 2026"
              required
            />

            {/* Alcance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alcance</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setScopeType("distrital")}
                  className={`p-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                    scopeType === "distrital"
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-200 bg-white text-gray-600"
                  }`}
                >
                  Distrital
                  <p className="text-xs font-normal mt-0.5 opacity-70">1 distrito electoral</p>
                </button>
                <button
                  onClick={() => { setScopeType("nacional"); setSelectedDistrict(""); }}
                  className={`p-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                    scopeType === "nacional"
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-200 bg-white text-gray-600"
                  }`}
                >
                  Nacional
                  <p className="text-xs font-normal mt-0.5 opacity-70">27 distritos</p>
                </button>
              </div>
            </div>

            {/* Selector de distrito */}
            {scopeType === "distrital" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distrito Electoral
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  style={{ fontSize: "16px" }}
                >
                  <option value="">Selecciona un distrito...</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.diputados} dip. / {d.senadores} sen. ({d.total_mesas?.toLocaleString() || 0} mesas)
                    </option>
                  ))}
                </select>

                {selectedDistrictInfo && (
                  <div className="mt-2 bg-blue-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-blue-900">{selectedDistrictInfo.name}</p>
                    <div className="flex gap-3 mt-1 text-xs text-blue-700">
                      <span>{selectedDistrictInfo.total_centros?.toLocaleString()} centros</span>
                      <span>{selectedDistrictInfo.total_mesas?.toLocaleString()} mesas</span>
                      <span>{selectedDistrictInfo.total_electores?.toLocaleString()} electores</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Contacto */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Teléfono"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="999 888 777"
                inputMode="tel"
              />
              <Input
                label="Email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="candidato@email.com"
              />
            </div>

            {/* Límites */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Máx. personeros"
                type="number"
                value={maxPersoneros}
                onChange={(e) => setMaxPersoneros(e.target.value)}
                inputMode="numeric"
              />
              <Input
                label="Vencimiento"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            {/* Colores */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Colores de marca</label>
              <div className="flex gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <span className="text-xs text-gray-500">Principal</span>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <span className="text-xs text-gray-500">Secundario</span>
                </div>
              </div>
            </div>

            {/* Pagado */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Pago confirmado</span>
            </label>

            {/* Preview del dominio */}
            {candidateName && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Dominio asignado:</p>
                <p className="text-sm font-medium text-primary-700">
                  {generateSlug(candidateName)}.guardian-electoral.com
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => { setShowForm(false); resetForm(); setError(null); }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                loading={saving}
              >
                {editingId ? "Guardar Cambios" : "Registrar Candidato"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Lista de clientes */}
      {tenants.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Candidatos registrados ({tenants.length})</h3>
          {tenants.map((t) => (
            <Card
              key={t.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => loadTenantForEdit(t)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: t.primary_color }}
                    />
                    <p className="font-semibold text-gray-900">
                      {t.candidate_name || t.name}
                    </p>
                  </div>
                  {t.candidate_position && (
                    <p className="text-xs text-gray-500 ml-6">{t.candidate_position}</p>
                  )}
                  <p className="text-xs text-primary-600 ml-6 mt-0.5">{t.domain}</p>
                  <div className="flex gap-2 mt-2 ml-6 flex-wrap">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      Máx {t.max_personeros} personeros
                    </span>
                    {t.contact_phone && (
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {t.contact_phone}
                      </span>
                    )}
                    {t.expires_at && (
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        Vence: {new Date(t.expires_at).toLocaleDateString("es")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant={t.is_paid ? "success" : "warning"}>
                    {t.is_paid ? "Pagado" : "Pendiente"}
                  </Badge>
                  <Badge variant={t.is_active ? "success" : "danger"}>
                    {t.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                  <Badge variant={t.scope_type === "nacional" ? "info" : "default"}>
                    {t.scope_type === "nacional" ? "Nacional" : "Distrital"}
                  </Badge>
                  <span className="text-[10px] text-gray-400 mt-1">Toca para editar</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
