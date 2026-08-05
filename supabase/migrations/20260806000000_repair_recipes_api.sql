-- Repair an existing recipes table after a partial migration and refresh
-- PostgREST's schema cache. This migration is safe to run more than once.

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;

DROP POLICY IF EXISTS "Users can view own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can insert own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can update own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can delete own recipes" ON public.recipes;

CREATE POLICY "Users can view own recipes"
  ON public.recipes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipes"
  ON public.recipes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes"
  ON public.recipes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes"
  ON public.recipes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS recipes_user_liked_idx
  ON public.recipes(user_id, liked) WHERE liked = true;
CREATE INDEX IF NOT EXISTS recipes_user_saved_idx
  ON public.recipes(user_id, saved) WHERE saved = true;
CREATE INDEX IF NOT EXISTS recipes_user_created_idx
  ON public.recipes(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_recipes_updated_at ON public.recipes;
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
