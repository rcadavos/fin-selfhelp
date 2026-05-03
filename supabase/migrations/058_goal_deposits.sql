-- Add optional target amount to goal_entries
ALTER TABLE public.goal_entries
  ADD COLUMN IF NOT EXISTS target_amount numeric(12, 2) CHECK (target_amount IS NULL OR target_amount > 0);

-- Goal deposits / contributions table
CREATE TABLE IF NOT EXISTS public.goal_deposits (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id      uuid         NOT NULL REFERENCES public.goal_entries(id) ON DELETE CASCADE,
  profile_id   uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount       numeric(12, 2) NOT NULL CHECK (amount > 0),
  note         text,
  deposited_at date         NOT NULL DEFAULT CURRENT_DATE,
  created_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goal_deposits_goal_idx
  ON public.goal_deposits (goal_id, deposited_at DESC);

CREATE INDEX IF NOT EXISTS goal_deposits_profile_idx
  ON public.goal_deposits (profile_id);

ALTER TABLE public.goal_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goal_deposits_select_own" ON public.goal_deposits
  FOR SELECT USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "goal_deposits_insert_own" ON public.goal_deposits
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "goal_deposits_delete_own" ON public.goal_deposits
  FOR DELETE USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
