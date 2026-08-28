-- ---------------------------------------------------------------------------
-- Budget tool prototype (Tenant Money Compass — web version)
--
-- Purely additive: two new tables. Nothing existing is altered or removed.
--   budget_months  — one row per client per calendar month (income + rent)
--   budget_entries — the individual line items, each in one of the three
--                    TFS buckets: fixed / freely / unexpected
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.budget_months (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month          date        NOT NULL,               -- always the 1st of the month
  monthly_income numeric(12,2) NOT NULL DEFAULT 0 CHECK (monthly_income >= 0),
  rent_amount    numeric(12,2) NOT NULL DEFAULT 0 CHECK (rent_amount >= 0),
  created_at     timestamptz DEFAULT now() NOT NULL,
  updated_at     timestamptz DEFAULT now() NOT NULL,
  UNIQUE (client_id, month)
);

CREATE TABLE IF NOT EXISTS public.budget_entries (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_month_id uuid        NOT NULL REFERENCES public.budget_months(id) ON DELETE CASCADE,
  client_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bucket          text        NOT NULL CHECK (bucket IN ('fixed', 'freely', 'unexpected')),
  label           text        NOT NULL,
  amount          numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  sort_order      integer     NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS budget_entries_month_idx
  ON public.budget_entries (budget_month_id);

CREATE INDEX IF NOT EXISTS budget_months_client_idx
  ON public.budget_months (client_id, month DESC);

-- ---------------------------------------------------------------------------
-- Row level security — same shape as client_documents:
-- the person owns their own rows; coaches and admins can look but not change.
-- ---------------------------------------------------------------------------
ALTER TABLE public.budget_months  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_months_own"
  ON public.budget_months
  FOR ALL
  USING     (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "budget_months_coach_view"
  ON public.budget_months
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('coach', 'admin')
    )
  );

CREATE POLICY "budget_entries_own"
  ON public.budget_entries
  FOR ALL
  USING     (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "budget_entries_coach_view"
  ON public.budget_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('coach', 'admin')
    )
  );
