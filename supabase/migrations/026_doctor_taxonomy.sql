-- ================================================================
-- 026_doctor_taxonomy.sql
-- Symptom/condition tags for doctors (many-to-many)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.taxonomy_items (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('symptom', 'condition')),
  sort_order  INT  NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.doctor_taxonomy (
  doctor_id    UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
  taxonomy_id  TEXT NOT NULL REFERENCES public.taxonomy_items(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (doctor_id, taxonomy_id)
);

CREATE INDEX IF NOT EXISTS idx_doctor_taxonomy_taxonomy
  ON public.doctor_taxonomy (taxonomy_id);

ALTER TABLE public.taxonomy_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_taxonomy ENABLE ROW LEVEL SECURITY;

-- Everyone can read the taxonomy catalog.
CREATE POLICY "public_read_taxonomy_items"
  ON public.taxonomy_items FOR SELECT
  USING (is_active = TRUE);

-- Everyone can read doctor tags (for public discovery).
CREATE POLICY "public_read_doctor_taxonomy"
  ON public.doctor_taxonomy FOR SELECT
  USING (TRUE);

-- Doctors manage tags on their own profile; admins manage all.
CREATE POLICY "doctors_manage_own_taxonomy"
  ON public.doctor_taxonomy FOR ALL TO authenticated
  USING (
    doctor_id IN (
      SELECT id FROM public.doctor_profiles WHERE user_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    doctor_id IN (
      SELECT id FROM public.doctor_profiles WHERE user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ── Seed unified 16-item taxonomy (matches landing page) ────────

INSERT INTO public.taxonomy_items (id, label, kind, sort_order) VALUES
  ('anxiety-depression', 'Anxiety / Depression', 'symptom', 1),
  ('stress-burnout', 'Stress / Burnout', 'symptom', 2),
  ('sleep-issues', 'Sleep Issues', 'symptom', 3),
  ('panic-attacks', 'Panic Attacks', 'symptom', 4),
  ('relationship', 'Relationship Issues', 'symptom', 5),
  ('grief', 'Grief & Loss', 'symptom', 6),
  ('ocd', 'OCD', 'symptom', 7),
  ('adhd', 'ADHD', 'symptom', 8),
  ('depression', 'Depression', 'condition', 9),
  ('anxiety-disorder', 'Anxiety Disorder', 'condition', 10),
  ('bipolar', 'Bipolar Disorder', 'condition', 11),
  ('ptsd', 'PTSD', 'condition', 12),
  ('schizophrenia', 'Schizophrenia', 'condition', 13),
  ('eating-disorder', 'Eating Disorders', 'condition', 14),
  ('addiction', 'Addiction', 'condition', 15),
  ('insomnia', 'Insomnia', 'condition', 16)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  kind = EXCLUDED.kind,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE;

-- ── Replace doctor tags atomically ──────────────────────────────

CREATE OR REPLACE FUNCTION public.set_doctor_taxonomy(
  p_doctor_id UUID,
  p_tag_ids   TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tag TEXT;
BEGIN
  IF NOT (
    public.is_admin()
    OR p_doctor_id IN (
      SELECT id FROM public.doctor_profiles WHERE user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to update doctor taxonomy tags';
  END IF;

  DELETE FROM public.doctor_taxonomy WHERE doctor_id = p_doctor_id;

  IF p_tag_ids IS NULL OR array_length(p_tag_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  FOREACH v_tag IN ARRAY p_tag_ids LOOP
    IF EXISTS (SELECT 1 FROM public.taxonomy_items WHERE id = v_tag AND is_active) THEN
      INSERT INTO public.doctor_taxonomy (doctor_id, taxonomy_id)
      VALUES (p_doctor_id, v_tag)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_doctor_taxonomy(UUID, TEXT[])
  TO authenticated;

-- ── Sync tags from signup metadata ──────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_doctor_taxonomy_from_meta(
  p_user_id UUID,
  p_meta    JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doctor_id UUID;
  v_tags TEXT[];
BEGIN
  IF jsonb_typeof(p_meta->'taxonomy_tags') <> 'array' THEN
    RETURN;
  END IF;

  SELECT ARRAY_AGG(value::TEXT)
  INTO v_tags
  FROM jsonb_array_elements_text(p_meta->'taxonomy_tags');

  IF v_tags IS NULL OR array_length(v_tags, 1) IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_doctor_id
  FROM public.doctor_profiles
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_doctor_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.doctor_taxonomy WHERE doctor_id = v_doctor_id;

  INSERT INTO public.doctor_taxonomy (doctor_id, taxonomy_id)
  SELECT v_doctor_id, t.id
  FROM public.taxonomy_items t
  WHERE t.id = ANY(v_tags) AND t.is_active = TRUE
  ON CONFLICT DO NOTHING;
END;
$$;

-- ── Extend signup trigger to persist taxonomy tags ──────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb;
  signup_role user_role;
  exp_years int;
  consult_fee numeric(10,2);
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  signup_role := COALESCE(meta->>'role', 'patient')::user_role;
  IF signup_role NOT IN ('patient', 'doctor') THEN
    signup_role := 'patient';
  END IF;

  exp_years := GREATEST(0, COALESCE(NULLIF(meta->>'experience_years', '')::int, 0));
  consult_fee := COALESCE(NULLIF(meta->>'consultation_fee', '')::numeric, 0);

  INSERT INTO public.profiles (
    id, email, full_name, phone, city, role, account_status, is_active
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, meta->>'email'),
    COALESCE(NULLIF(meta->>'full_name', ''), split_part(COALESCE(NEW.email, ''), '@', 1)),
    NULLIF(meta->>'phone', ''),
    NULLIF(meta->>'city', ''),
    signup_role,
    'pending',
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    city = COALESCE(EXCLUDED.city, profiles.city),
    updated_at = NOW();

  IF signup_role = 'doctor' AND NULLIF(meta->>'pmdc_number', '') IS NOT NULL THEN
    INSERT INTO public.doctor_profiles (
      user_id, status, specialization, qualification, experience_years,
      pmdc_number, bio, consultation_fee, cities
    ) VALUES (
      NEW.id,
      'pending',
      COALESCE(NULLIF(meta->>'specialization', ''), 'Psychologist'),
      ARRAY[COALESCE(NULLIF(meta->>'qualification', ''), 'MBBS')],
      exp_years,
      meta->>'pmdc_number',
      NULLIF(meta->>'bio', ''),
      consult_fee,
      CASE
        WHEN NULLIF(meta->>'city', '') IS NOT NULL THEN ARRAY[meta->>'city']
        ELSE NULL
      END
    )
    ON CONFLICT (user_id) DO NOTHING;

    PERFORM public.sync_doctor_taxonomy_from_meta(NEW.id, meta);
  END IF;

  RETURN NEW;
END;
$$;
