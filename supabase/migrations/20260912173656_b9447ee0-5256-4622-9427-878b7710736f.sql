CREATE TABLE public.finance_bills (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  recurring boolean NOT NULL DEFAULT false,
  notify_days_before integer NOT NULL DEFAULT 3,
  category_id uuid REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.finance_accounts(id) ON DELETE SET NULL,
  payment_method text NOT NULL DEFAULT 'outro',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  paid_at date,
  transaction_id uuid REFERENCES public.finance_transactions(id) ON DELETE SET NULL,
  last_notified_for date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT finance_bills_status_check CHECK (status IN ('pending','paid')),
  CONSTRAINT finance_bills_notify_days_check CHECK (notify_days_before >= 0 AND notify_days_before <= 60)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_bills TO authenticated;
GRANT ALL ON public.finance_bills TO service_role;

ALTER TABLE public.finance_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bills" ON public.finance_bills FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bills" ON public.finance_bills FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bills" ON public.finance_bills FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bills" ON public.finance_bills FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX finance_bills_user_due_idx ON public.finance_bills (user_id, due_date);

CREATE TRIGGER update_finance_bills_updated_at
BEFORE UPDATE ON public.finance_bills
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();