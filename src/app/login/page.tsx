"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useTenantContext } from "@/components/TenantProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PIN_LENGTH } from "@/lib/constants";

export default function LoginPage() {
  const { tenant, login, loading: tenantLoading } = useTenantContext();
  const [dni, setDni] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!dni.trim() || pin.length !== PIN_LENGTH) return;

    setLoading(true);
    setError(null);

    const result = await login(dni.trim(), pin);
    if (result.success) {
      // Check if there's a redirect URL saved (e.g. from /monitor)
      const redirect = localStorage.getItem("ge_redirect_after_login");
      if (redirect) {
        localStorage.removeItem("ge_redirect_after_login");
        router.push(redirect);
      } else {
        router.push("/dashboard");
      }
    } else {
      setError(result.error || "Error al iniciar sesión");
    }
    setLoading(false);
  }

  const primaryColor = tenant?.primary_color || "#1e40af";
  const hasCandidateInfo = !!tenant?.candidate_name;

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: primaryColor }}>
        <div className="text-white text-center">
          <svg className="animate-spin h-10 w-10 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm opacity-75">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg_login.jpeg')" }}
      />
      {/* Dark overlay for readability */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(to bottom, ${primaryColor}cc, ${primaryColor}ee)` }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          {tenant?.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="w-20 h-20 mx-auto mb-4 rounded-2xl object-contain bg-white/10 backdrop-blur-sm p-2"
            />
          ) : (
            <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
          )}

          {hasCandidateInfo ? (
            <>
              <h1 className="text-2xl font-bold text-white">{tenant.candidate_name}</h1>
              {tenant.candidate_position && (
                <p className="text-white/80 text-sm mt-0.5">{tenant.candidate_position}</p>
              )}
              <p className="text-white/50 text-xs mt-1">{tenant.name}</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white">
                {tenant?.name || "Guardian Electoral"}
              </h1>
              <p className="text-white/60 mt-1 text-sm">
                {tenant?.welcome_message || "Control electoral en tiempo real"}
              </p>
            </>
          )}
        </div>

        {/* Login Form */}
        <Card className="backdrop-blur-sm bg-white/95">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-lg font-semibold text-gray-900">Iniciar Sesión</h2>
              <p className="text-sm text-gray-500">Ingresa tu DNI y PIN de 6 dígitos</p>
            </div>

            <Input
              label="DNI"
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
              placeholder="Número de DNI"
              required
              inputMode="numeric"
              autoComplete="username"
              maxLength={15}
            />

            <Input
              label="PIN de acceso"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))}
              placeholder="Ingresa tu PIN de 6 dígitos"
              inputMode="numeric"
              maxLength={PIN_LENGTH}
              autoComplete="one-time-code"
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2.5 rounded-lg text-center">{error}</p>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
              disabled={!dni.trim() || pin.length !== PIN_LENGTH}
            >
              Ingresar
            </Button>

            <div className="text-center pt-2 border-t border-gray-100">
              <p className="text-sm text-gray-500">Primera vez?</p>
              <Link
                href="/register"
                className="text-sm font-semibold hover:underline"
                style={{ color: primaryColor }}
              >
                Registrarme como personero
              </Link>
            </div>
          </form>
        </Card>

        <p className="text-white/30 text-xs text-center mt-6">
          Elecciones 2026 - Guardian Electoral v1.0
        </p>
      </div>
    </div>
  );
}
