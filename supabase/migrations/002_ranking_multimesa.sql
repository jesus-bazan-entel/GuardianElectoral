-- Guardian Electoral - Migration 002: Ranking & Multi-mesa support
-- Run this AFTER 001_initial_schema.sql

-- Add centro_votacion field to personeros for location grouping
ALTER TABLE personeros ADD COLUMN IF NOT EXISTS centro_votacion TEXT;

-- Ranking view: counts mesas per personero (for leaderboard)
CREATE OR REPLACE VIEW ranking_personeros AS
SELECT
  p.id,
  p.full_name,
  p.cedula,
  p.party_id,
  p.assigned_centro,
  p.centro_votacion,
  COUNT(DISTINCT a.mesa_id) AS mesas_cubiertas,
  COUNT(a.id) AS total_actas,
  COALESCE(SUM(a.total_votes), 0) AS total_votos_registrados,
  MAX(a.created_at) AS ultima_acta,
  -- Points system: 10 pts per mesa covered, 5 pts per acta with photos, 2 bonus if has top3
  (COUNT(DISTINCT a.mesa_id) * 10) +
  (COUNT(a.id) * 5) +
  (COUNT(CASE WHEN jsonb_array_length(a.top3_parties) >= 3 THEN 1 END) * 2) AS puntos
FROM personeros p
LEFT JOIN actas a ON a.user_id = p.id AND a.status IN ('submitted', 'verified')
WHERE p.is_active = true
GROUP BY p.id, p.full_name, p.cedula, p.party_id, p.assigned_centro, p.centro_votacion
ORDER BY puntos DESC;

-- Allow authenticated users to read the ranking (it's a leaderboard)
-- Views inherit the RLS of underlying tables, but we need a function for cross-user access
CREATE OR REPLACE FUNCTION get_party_ranking(p_party_id UUID DEFAULT NULL)
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
    AND (p_party_id IS NULL OR p.party_id = p_party_id)
  GROUP BY p.id, p.full_name, p.centro_votacion
  ORDER BY puntos DESC;
$$;

-- Allow all authenticated users to call the ranking function
GRANT EXECUTE ON FUNCTION get_party_ranking TO authenticated;
