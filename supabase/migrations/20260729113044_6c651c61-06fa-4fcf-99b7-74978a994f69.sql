CREATE TABLE public.finance_api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  token_prefix text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_api_tokens TO authenticated;
GRANT ALL ON public.finance_api_tokens TO service_role;

ALTER TABLE public.finance_api_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own api tokens"
ON public.finance_api_tokens FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own api tokens"
ON public.finance_api_tokens FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own api tokens"
ON public.finance_api_tokens FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own api tokens"
ON public.finance_api_tokens FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX finance_api_tokens_user_id_idx ON public.finance_api_tokens(user_id);

CREATE TRIGGER update_finance_api_tokens_updated_at
BEFORE UPDATE ON public.finance_api_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();