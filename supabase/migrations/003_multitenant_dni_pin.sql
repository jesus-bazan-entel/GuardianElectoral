-- Guardian Electoral - Migration 003: Multi-tenant + DNI/PIN Auth
-- Run this AFTER 002_ranking_multimesa.sql

-- ============================================
-- TENANTS (one per political party/client)
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,              -- 'partido-ejemplo'
  name TEXT NOT NULL,                     -- 'Partido Ejemplo'
  domain TEXT UNIQUE,                     -- 'guardian.partidoejemplo.com'
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e40af',   -- Hex color for branding
  secondary_color TEXT DEFAULT '#d97706',
  welcome_message TEXT DEFAULT 'Bienvenido, Guardian!',
  pin_prefix TEXT,                        -- Optional: party-specific PIN prefix
  max_personeros INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Everyone can read tenant info (needed for login screen branding)
CREATE POLICY "Tenants are publicly readable"
  ON tenants FOR SELECT
  USING (true);

-- ============================================
-- UPDATE PERSONEROS: add tenant_id + PIN auth
-- ============================================
ALTER TABLE personeros ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE personeros ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE personeros ADD COLUMN IF NOT EXISTS dni TEXT;
ALTER TABLE personeros ADD COLUMN IF NOT EXISTS is_registered BOOLEAN DEFAULT false;
ALTER TABLE personeros ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ;

-- Drop old unique constraint on cedula if exists, add composite unique
ALTER TABLE personeros DROP CONSTRAINT IF EXISTS personeros_cedula_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_personeros_tenant_dni ON personeros(tenant_id, dni);

-- Index for quick tenant lookups
CREATE INDEX IF NOT EXISTS idx_personeros_tenant ON personeros(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- ============================================
-- PIN AUTHENTICATION FUNCTIONS
-- ============================================

-- Hash a PIN using pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Register a new personero with DNI + PIN
CREATE OR REPLACE FUNCTION register_personero(
  p_tenant_slug TEXT,
  p_dni TEXT,
  p_full_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_pin TEXT DEFAULT NULL  -- 6-digit PIN
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_existing personeros%ROWTYPE;
  v_pin_hash TEXT;
  v_count INTEGER;
BEGIN
  -- Find tenant
  SELECT * INTO v_tenant FROM tenants WHERE slug = p_tenant_slug AND is_active = true;
  IF v_tenant IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organización no encontrada');
  END IF;

  -- Check max personeros
  SELECT COUNT(*) INTO v_count FROM personeros WHERE tenant_id = v_tenant.id;
  IF v_count >= v_tenant.max_personeros THEN
    RETURN jsonb_build_object('success', false, 'error', 'Límite de personeros alcanzado');
  END IF;

  -- Validate PIN format
  IF p_pin IS NOT NULL AND length(p_pin) != 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'El PIN debe ser de 6 dígitos');
  END IF;

  -- Check if DNI already registered for this tenant
  SELECT * INTO v_existing FROM personeros
    WHERE tenant_id = v_tenant.id AND dni = p_dni;

  IF v_existing IS NOT NULL AND v_existing.is_registered THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este DNI ya está registrado');
  END IF;

  -- Hash PIN
  IF p_pin IS NOT NULL THEN
    v_pin_hash := crypt(p_pin, gen_salt('bf'));
  END IF;

  -- Insert or update personero
  IF v_existing IS NOT NULL THEN
    UPDATE personeros SET
      full_name = p_full_name,
      phone = p_phone,
      pin_hash = v_pin_hash,
      is_registered = true,
      registered_at = now()
    WHERE id = v_existing.id;
  ELSE
    INSERT INTO personeros (id, tenant_id, dni, full_name, phone, pin_hash, role, is_active, is_registered, registered_at)
    VALUES (gen_random_uuid(), v_tenant.id, p_dni, p_full_name, p_phone, v_pin_hash, 'watcher', true, true, now());
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Registro exitoso',
    'tenant_name', v_tenant.name
  );
END;
$$;

-- Verify DNI + PIN login
CREATE OR REPLACE FUNCTION verify_personero_pin(
  p_tenant_slug TEXT,
  p_dni TEXT,
  p_pin TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_personero personeros%ROWTYPE;
BEGIN
  -- Find tenant
  SELECT * INTO v_tenant FROM tenants WHERE slug = p_tenant_slug AND is_active = true;
  IF v_tenant IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organización no encontrada');
  END IF;

  -- Find personero
  SELECT * INTO v_personero FROM personeros
    WHERE tenant_id = v_tenant.id AND dni = p_dni AND is_registered = true AND is_active = true;

  IF v_personero IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'DNI no registrado');
  END IF;

  -- Verify PIN
  IF v_personero.pin_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tiene PIN configurado. Regístrese nuevamente.');
  END IF;

  IF v_personero.pin_hash != crypt(p_pin, v_personero.pin_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'PIN incorrecto');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'personero_id', v_personero.id,
    'full_name', v_personero.full_name,
    'role', v_personero.role,
    'tenant_id', v_tenant.id,
    'tenant_name', v_tenant.name
  );
END;
$$;

-- Get tenant by domain
CREATE OR REPLACE FUNCTION get_tenant_by_domain(p_domain TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
BEGIN
  SELECT * INTO v_tenant FROM tenants
    WHERE (domain = p_domain OR slug = p_domain) AND is_active = true;

  IF v_tenant IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_tenant.id,
    'slug', v_tenant.slug,
    'name', v_tenant.name,
    'domain', v_tenant.domain,
    'logo_url', v_tenant.logo_url,
    'primary_color', v_tenant.primary_color,
    'secondary_color', v_tenant.secondary_color,
    'welcome_message', v_tenant.welcome_message
  );
END;
$$;

-- Update ranking function to be tenant-aware
CREATE OR REPLACE FUNCTION get_party_ranking(p_tenant_slug TEXT DEFAULT NULL, p_party_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  centro_votacion TEXT,
  mesas_cubiertas BIGINT,
  total_actas BIGINT,
  total_votos_registrados BIGINT,
  puntos BIGINT,
  posicion BIGINT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.id,
    p.full_name,
    p.centro_votacion,
    COUNT(DISTINCT a.mesa_id) AS mesas_cubiertas,
    COUNT(a.id) AS total_actas,
    COALESCE(SUM(a.total_votes), 0) AS total_votos_registrados,
    (COUNT(DISTINCT a.mesa_id) * 10) +
    (COUNT(a.id) * 5) +
    (COUNT(CASE WHEN jsonb_array_length(a.top3_parties) >= 3 THEN 1 END) * 2) AS puntos,
    ROW_NUMBER() OVER (
      ORDER BY
        (COUNT(DISTINCT a.mesa_id) * 10) +
        (COUNT(a.id) * 5) +
        (COUNT(CASE WHEN jsonb_array_length(a.top3_parties) >= 3 THEN 1 END) * 2) DESC
    ) AS posicion
  FROM personeros p
  LEFT JOIN actas a ON a.user_id = p.id AND a.status IN ('submitted', 'verified')
  WHERE p.is_active = true
    AND (p_tenant_slug IS NULL OR p.tenant_id = (SELECT id FROM tenants WHERE slug = p_tenant_slug))
    AND (p_party_id IS NULL OR p.party_id = p_party_id)
  GROUP BY p.id, p.full_name, p.centro_votacion
  ORDER BY puntos DESC;
$$;

-- Grant execute to anon (needed for login/register before auth)
GRANT EXECUTE ON FUNCTION register_personero TO anon;
GRANT EXECUTE ON FUNCTION verify_personero_pin TO anon;
GRANT EXECUTE ON FUNCTION get_tenant_by_domain TO anon;
GRANT EXECUTE ON FUNCTION get_party_ranking TO anon;
GRANT EXECUTE ON FUNCTION get_party_ranking TO authenticated;

-- ============================================
-- SEED: Example tenant for testing
-- ============================================
-- INSERT INTO tenants (slug, name, domain, primary_color, secondary_color, welcome_message)
-- VALUES ('demo', 'Partido Demo', 'demo.guardian-electoral.com', '#1e40af', '#d97706', 'Bienvenido al Partido Demo!');
