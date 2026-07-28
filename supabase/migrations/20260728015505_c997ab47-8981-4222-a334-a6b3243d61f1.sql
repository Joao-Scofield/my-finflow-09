ALTER TABLE public.finance_transactions
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'outro';

ALTER TABLE public.finance_transactions
  ADD CONSTRAINT finance_transactions_payment_method_check
  CHECK (payment_method IN ('pix','credito','debito','dinheiro','vr','va','boleto','transferencia','investimento','outro'));

CREATE TABLE public.finance_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'outro',
  balance numeric NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6366f1',
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT finance_accounts_kind_check CHECK (kind IN ('dinheiro','conta_corrente','poupanca','investimento','carteira_digital','vr','outro'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_accounts TO authenticated;
GRANT ALL ON public.finance_accounts TO service_role;

ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own accounts" ON public.finance_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own accounts" ON public.finance_accounts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own accounts" ON public.finance_accounts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own accounts" ON public.finance_accounts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_finance_accounts_updated_at
  BEFORE UPDATE ON public.finance_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DELETE FROM public.finance_transactions;