"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useTenantContext } from "@/components/TenantProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PIN_LENGTH } from "@/lib/constants";

export default function RegisterPage() {
  const { tenant, register, loading: tenantLoading } = useTenantContext();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dni, setDni] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const primaryColor = tenant?.primary_color || "#1e40af";

  function handleNext() {
    setError(null);
    if (step === 1) {
      if (!dni.trim()) { setError("Ingresa tu DNI"); return; }
      if (!fullName.trim()) { setError("Ingresa tu nombre completo"); return; }
      setStep(2);
    } else if (step === 2) {
      if (pin.length !== PIN_LENGTH) { setError(`El PIN debe ser de ${PIN_LENGTH} dígitos`); return; }
      if (pin !== pinConfirm) { setError("Los PINs no coinciden"); return; }
      handleRegister();
    }
  }

  async function handleRegister() {
    setLoading(true);
    setError(null);

    const result = await register({
      dni: dni.trim(),
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
      pin,
    });

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || "Error al registrar");
    }
    setLoading(false);
  }

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: primaryColor }}>
        <svg className="animate-spin h-10 w-10 text-white" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: `linear-gradient(to bottom, ${primaryColor}, ${primaryColor}dd)` }}
      >
        <div className="w-full max-w-sm">
          <Card className="text-center">
            <div className="py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Registro exitoso!</h2>
              <p className="text-sm text-gray-500 mt-2">
                Bienvenido a <strong>{tenant?.name || "Guardian Electoral"}</strong>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                DNI: <strong>{dni}</strong> — Recuerda tu PIN de {PIN_LENGTH} dígitos
              </p>

              <Link href="/login">
                <Button className="w-full mt-6" size="lg">
                  Iniciar sesión
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: `linear-gradient(to bottom, ${primaryColor}, ${primaryColor}dd)` }}
    >
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-white">
            {tenant?.name || "Guardian Electoral"}
          </h1>
          <p className="text-white/60 text-sm mt-1">Registro de Personero</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= s ? "bg-white text-gray-900" : "bg-white/20 text-white/60"
                }`}
              >
                {step > s ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s
                )}
              </div>
              {s < 2 && <div className={`w-12 h-0.5 ${step > s ? "bg-white" : "bg-white/20"}`} />}
            </div>
          ))}
        </div>

        <Card>
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-lg font-semibold text-gray-900">Datos personales</h2>
                <p className="text-xs text-gray-500">Ingresa tu información</p>
              </div>

              <Input
                label="DNI (Documento Nacional de Identidad)"
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
                placeholder="Número de DNI"
                inputMode="numeric"
                maxLength={15}
                required
              />

              <Input
                label="Nombre completo"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Como aparece en tu DNI"
                autoComplete="name"
                required
              />

              <Input
                label="Teléfono (opcional)"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="999 999 999"
                inputMode="tel"
              />
            </div>
          )}

          {/* Step 2: PIN */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-lg font-semibold text-gray-900">Crea tu PIN</h2>
                <p className="text-xs text-gray-500">
                  {PIN_LENGTH} dígitos que usarás para ingresar
                </p>
              </div>

              <Input
                label="PIN (6 dígitos)"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))}
                placeholder="Ingresa 6 dígitos"
                inputMode="numeric"
                maxLength={PIN_LENGTH}
                autoFocus
              />

              <Input
                label="Confirmar PIN"
                type="password"
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))}
                placeholder="Repite los 6 dígitos"
                inputMode="numeric"
                maxLength={PIN_LENGTH}
                error={pinConfirm.length === PIN_LENGTH && pin !== pinConfirm ? "Los PINs no coinciden" : undefined}
              />

              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  <strong>Importante:</strong> Memoriza tu PIN. Lo necesitarás cada vez que ingreses a la app. No lo compartas con nadie.
                </p>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2.5 rounded-lg text-center mt-3">{error}</p>
          )}

          <div className="flex gap-2 mt-4">
            {step > 1 && (
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => { setStep((s) => (s - 1) as 1 | 2); setError(null); }}
              >
                Atrás
              </Button>
            )}
            <Button
              className="flex-1"
              size="lg"
              onClick={handleNext}
              loading={loading}
            >
              {step === 2 ? "Registrarme" : "Siguiente"}
            </Button>
          </div>

          <div className="text-center mt-4 pt-3 border-t border-gray-100">
            <Link href="/login" className="text-sm text-gray-500 hover:underline">
              Ya tengo cuenta — Iniciar sesión
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
