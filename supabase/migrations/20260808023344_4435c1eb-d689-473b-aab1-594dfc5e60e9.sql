CREATE TABLE public.shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  estimated_amount numeric NOT NULL DEFAULT 0,
  url text NOT NULL DEFAULT '',
  store text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  priority text NOT NULL DEFAULT 'media',
  category_id uuid REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'desejado',
  purchased_at date,
  transaction_id uuid REFERENCES public.finance_transactions(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_items TO authenticated;
GRANT ALL ON public.shopping_items TO service_role;

ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shopping items"
  ON public.shopping_items FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own shopping items"
  ON public.shopping_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own shopping items"
  ON public.shopping_items FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own shopping items"
  ON public.shopping_items FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_shopping_items_updated_at
  BEFORE UPDATE ON public.shopping_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX shopping_items_user_idx ON public.shopping_items (user_id, status, position);