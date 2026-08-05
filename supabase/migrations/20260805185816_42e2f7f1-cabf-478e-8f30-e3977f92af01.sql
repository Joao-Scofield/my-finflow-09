CREATE TABLE public.finance_recurrings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id UUID NOT NULL REFERENCES public.finance_categories(id) ON DELETE CASCADE,
  subcategory_id UUID REFERENCES public.finance_subcategories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.finance_accounts(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL DEFAULT 'other',
  day_of_month INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_recurrings TO authenticated;
GRANT ALL ON public.finance_recurrings TO service_role;

ALTER TABLE public.finance_recurrings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recurrings" ON public.finance_recurrings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recurrings" ON public.finance_recurrings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recurrings" ON public.finance_recurrings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recurrings" ON public.finance_recurrings FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_finance_recurrings_updated_at BEFORE UPDATE ON public.finance_recurrings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.finance_transactions ADD COLUMN recurring_id UUID REFERENCES public.finance_recurrings(id) ON DELETE SET NULL;

ALTER TABLE public.finance_transactions ADD COLUMN recurring_month TEXT;
CREATE UNIQUE INDEX finance_transactions_recurring_month_idx ON public.finance_transactions (recurring_id, recurring_month) WHERE recurring_id IS NOT NULL;