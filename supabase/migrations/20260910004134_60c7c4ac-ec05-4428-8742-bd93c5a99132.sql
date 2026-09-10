ALTER TABLE public.finance_transactions ADD COLUMN IF NOT EXISTS transfer_account_id uuid REFERENCES public.finance_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.finance_transactions ALTER COLUMN category_id DROP NOT NULL;
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.finance_transactions'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%type%' LOOP
    EXECUTE format('ALTER TABLE public.finance_transactions DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE public.finance_transactions ADD CONSTRAINT finance_transactions_type_check CHECK (type IN ('income','expense','transfer'));