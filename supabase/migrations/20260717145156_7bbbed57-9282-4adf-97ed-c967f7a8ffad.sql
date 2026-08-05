
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cuisine TEXT,
  diet TEXT,
  servings INTEGER,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  difficulty TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  tips JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_type TEXT NOT NULL,
  source_input JSONB,
  liked BOOLEAN NOT NULL DEFAULT false,
  saved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recipes" ON public.recipes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recipes" ON public.recipes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recipes" ON public.recipes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own recipes" ON public.recipes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX recipes_user_liked_idx ON public.recipes(user_id, liked) WHERE liked = true;
CREATE INDEX recipes_user_saved_idx ON public.recipes(user_id, saved) WHERE saved = true;
CREATE INDEX recipes_user_created_idx ON public.recipes(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
