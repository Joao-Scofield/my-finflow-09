-- Aviso por e-mail de contas foi removido do escopo: apagar os campos ligados a ele.
ALTER TABLE public.finance_bills DROP CONSTRAINT IF EXISTS finance_bills_notify_days_check;
ALTER TABLE public.finance_bills DROP COLUMN IF EXISTS notify_days_before;
ALTER TABLE public.finance_bills DROP COLUMN IF EXISTS last_notified_for;
