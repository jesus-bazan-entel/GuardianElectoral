-- Guardian Electoral - Database Schema
-- Run this in your Supabase SQL editor

-- Parties table
CREATE TABLE IF NOT EXISTS parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  color TEXT DEFAULT '#6b7280',
  logo_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Personeros table (extends auth.users)
CREATE TABLE IF NOT EXISTS personeros (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  cedula TEXT UNIQUE,
  phone TEXT,
  party_id UUID REFERENCES parties(id),
  assigned_centro TEXT,
  assigned_mesa TEXT,
  role TEXT NOT NULL DEFAULT 'watcher' CHECK (role IN ('watcher', 'coordinator', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Check-ins table
CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES personeros(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('checkin', 'checkout')),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  accuracy_meters DOUBLE PRECISION,
  timestamp TIMESTAMPTZ DEFAULT now(),
  device_info JSONB,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- Actas table
CREATE TABLE IF NOT EXISTS actas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES personeros(id) ON DELETE CASCADE,
  mesa_id TEXT NOT NULL,
  centro_id TEXT,
  photos TEXT[] DEFAULT '{}',
  top3_parties JSONB NOT NULL DEFAULT '[]',
  total_votes INTEGER,
  null_votes INTEGER,
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'verified', 'disputed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES personeros(id) ON DELETE CASCADE,
  mesa_id TEXT,
  category TEXT NOT NULL CHECK (category IN ('intimidation', 'irregularity', 'equipment_failure', 'other')),
  description TEXT NOT NULL,
  photos TEXT[] DEFAULT '{}',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_checkins_user ON checkins(user_id);
CREATE INDEX idx_checkins_timestamp ON checkins(timestamp DESC);
CREATE INDEX idx_actas_user ON actas(user_id);
CREATE INDEX idx_actas_mesa ON actas(mesa_id);
CREATE INDEX idx_incidents_user ON incidents(user_id);
CREATE INDEX idx_incidents_severity ON incidents(severity);

-- Row Level Security
ALTER TABLE personeros ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE actas ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;

-- Parties: readable by all authenticated users
CREATE POLICY "Parties are viewable by authenticated users"
  ON parties FOR SELECT
  TO authenticated
  USING (true);

-- Personeros: users can read their own profile, admins can read all
CREATE POLICY "Users can view own profile"
  ON personeros FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON personeros FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personeros WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON personeros FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Checkins: users can insert/read their own
CREATE POLICY "Users can insert own checkins"
  ON checkins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own checkins"
  ON checkins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all checkins"
  ON checkins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personeros WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- Actas: users can insert/read their own
CREATE POLICY "Users can insert own actas"
  ON actas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own actas"
  ON actas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own actas"
  ON actas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all actas"
  ON actas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personeros WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- Incidents: users can insert/read their own
CREATE POLICY "Users can insert own incidents"
  ON incidents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own incidents"
  ON incidents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all incidents"
  ON incidents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personeros WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- Storage bucket for acta photos (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('acta-photos', 'acta-photos', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('incident-photos', 'incident-photos', false);

-- Storage policies
-- CREATE POLICY "Users can upload acta photos"
--   ON storage.objects FOR INSERT
--   TO authenticated
--   WITH CHECK (bucket_id = 'acta-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- CREATE POLICY "Users can view own acta photos"
--   ON storage.objects FOR SELECT
--   TO authenticated
--   USING (bucket_id = 'acta-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
