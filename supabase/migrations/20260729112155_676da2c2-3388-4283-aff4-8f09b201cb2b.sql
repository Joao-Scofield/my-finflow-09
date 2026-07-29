ALTER TABLE public.finance_transactions ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.finance_accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS finance_transactions_account_id_idx ON public.finance_transactions(account_id);

DROP POLICY IF EXISTS "Users can create their own transactions" ON public.finance_transactions;
CREATE POLICY "Users can create their own transactions"
ON public.finance_transactions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.finance_categories c WHERE c.id = category_id AND c.user_id = auth.uid() AND c.type = finance_transactions.type)
  AND (subcategory_id IS NULL OR EXISTS (SELECT 1 FROM public.finance_subcategories s WHERE s.id = subcategory_id AND s.user_id = auth.uid() AND s.category_id = finance_transactions.category_id))
  AND (account_id IS NULL OR EXISTS (SELECT 1 FROM public.finance_accounts a WHERE a.id = account_id AND a.user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Users can update their own transactions" ON public.finance_transactions;
CREATE POLICY "Users can update their own transactions"
ON public.finance_transactions FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.finance_categories c WHERE c.id = category_id AND c.user_id = auth.uid() AND c.type = finance_transactions.type)
  AND (subcategory_id IS NULL OR EXISTS (SELECT 1 FROM public.finance_subcategories s WHERE s.id = subcategory_id AND s.user_id = auth.uid() AND s.category_id = finance_transactions.category_id))
  AND (account_id IS NULL OR EXISTS (SELECT 1 FROM public.finance_accounts a WHERE a.id = account_id AND a.user_id = auth.uid()))
);