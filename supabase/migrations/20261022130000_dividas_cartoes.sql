CREATE TABLE public.finance_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  closing_day integer NOT NULL,
  due_day integer NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT finance_cards_name_length CHECK (char_length(name) BETWEEN 1 AND 80),
  CONSTRAINT finance_cards_closing_day_check CHECK (closing_day BETWEEN 1 AND 31),
  CONSTRAINT finance_cards_due_day_check CHECK (due_day BETWEEN 1 AND 31)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_cards TO authenticated;
GRANT ALL ON public.finance_cards TO service_role;

ALTER TABLE public.finance_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cards" ON public.finance_cards FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cards" ON public.finance_cards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cards" ON public.finance_cards FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cards" ON public.finance_cards FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_finance_cards_updated_at
BEFORE UPDATE ON public.finance_cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.finance_debts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  installment_amount numeric(14,2) NOT NULL CHECK (installment_amount > 0),
  installments_total integer NOT NULL CHECK (installments_total >= 1),
  installments_paid integer NOT NULL DEFAULT 0,
  first_due_date date NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT finance_debts_name_length CHECK (char_length(name) BETWEEN 1 AND 80),
  CONSTRAINT finance_debts_paid_range CHECK (installments_paid >= 0 AND installments_paid <= installments_total)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_debts TO authenticated;
GRANT ALL ON public.finance_debts TO service_role;

ALTER TABLE public.finance_debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own debts" ON public.finance_debts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own debts" ON public.finance_debts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own debts" ON public.finance_debts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own debts" ON public.finance_debts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_finance_debts_updated_at
BEFORE UPDATE ON public.finance_debts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.finance_card_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  card_id uuid NOT NULL REFERENCES public.finance_cards(id) ON DELETE CASCADE,
  invoice_month text NOT NULL,
  paid_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT finance_card_invoices_month_format CHECK (invoice_month ~ '^\d{4}-\d{2}$'),
  UNIQUE (card_id, invoice_month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_card_invoices TO authenticated;
GRANT ALL ON public.finance_card_invoices TO service_role;

ALTER TABLE public.finance_card_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own card invoices" ON public.finance_card_invoices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own card invoices" ON public.finance_card_invoices FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own card invoices" ON public.finance_card_invoices FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own card invoices" ON public.finance_card_invoices FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.finance_transactions
  ADD COLUMN card_id uuid REFERENCES public.finance_cards(id) ON DELETE SET NULL;

CREATE INDEX finance_transactions_card_idx ON public.finance_transactions (card_id) WHERE card_id IS NOT NULL;
