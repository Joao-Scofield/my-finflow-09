DROP POLICY "Users can create their own transactions" ON public.finance_transactions;
DROP POLICY "Users can update their own transactions" ON public.finance_transactions;

CREATE POLICY "Users can create their own transactions" ON public.finance_transactions
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id
  AND (
    (type = 'transfer' AND category_id IS NULL AND subcategory_id IS NULL
      AND account_id IS NOT NULL AND transfer_account_id IS NOT NULL AND account_id <> transfer_account_id
      AND EXISTS (SELECT 1 FROM public.finance_accounts a WHERE a.id = transfer_account_id AND a.user_id = auth.uid()))
    OR
    (type <> 'transfer' AND EXISTS (SELECT 1 FROM public.finance_categories c WHERE c.id = category_id AND c.user_id = auth.uid() AND c.type = finance_transactions.type)
      AND (subcategory_id IS NULL OR EXISTS (SELECT 1 FROM public.finance_subcategories s WHERE s.id = subcategory_id AND s.user_id = auth.uid() AND s.category_id = finance_transactions.category_id)))
  )
  AND (account_id IS NULL OR EXISTS (SELECT 1 FROM public.finance_accounts a WHERE a.id = account_id AND a.user_id = auth.uid()))
);

CREATE POLICY "Users can update their own transactions" ON public.finance_transactions
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (
  auth.uid() = user_id
  AND (
    (type = 'transfer' AND category_id IS NULL AND subcategory_id IS NULL
      AND account_id IS NOT NULL AND transfer_account_id IS NOT NULL AND account_id <> transfer_account_id
      AND EXISTS (SELECT 1 FROM public.finance_accounts a WHERE a.id = transfer_account_id AND a.user_id = auth.uid()))
    OR
    (type <> 'transfer' AND EXISTS (SELECT 1 FROM public.finance_categories c WHERE c.id = category_id AND c.user_id = auth.uid() AND c.type = finance_transactions.type)
      AND (subcategory_id IS NULL OR EXISTS (SELECT 1 FROM public.finance_subcategories s WHERE s.id = subcategory_id AND s.user_id = auth.uid() AND s.category_id = finance_transactions.category_id)))
  )
  AND (account_id IS NULL OR EXISTS (SELECT 1 FROM public.finance_accounts a WHERE a.id = account_id AND a.user_id = auth.uid()))
);