CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_username_format CHECK (username ~ '^[a-z0-9_]{3,32}$'),
  CONSTRAINT profiles_display_name_length CHECK (char_length(display_name) BETWEEN 1 AND 80)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own profile" ON public.profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.finance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL,
  icon text NOT NULL DEFAULT 'Tag',
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finance_categories_name_length CHECK (char_length(name) BETWEEN 1 AND 80),
  CONSTRAINT finance_categories_color_length CHECK (char_length(color) BETWEEN 1 AND 40),
  CONSTRAINT finance_categories_icon_length CHECK (char_length(icon) BETWEEN 1 AND 80),
  UNIQUE (user_id, type, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_categories TO authenticated;
GRANT ALL ON public.finance_categories TO service_role;
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own categories" ON public.finance_categories
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own categories" ON public.finance_categories
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories" ON public.finance_categories
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories" ON public.finance_categories
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX finance_categories_user_type_idx ON public.finance_categories(user_id, type);
CREATE TRIGGER update_finance_categories_updated_at
  BEFORE UPDATE ON public.finance_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.finance_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES public.finance_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finance_subcategories_name_length CHECK (char_length(name) BETWEEN 1 AND 80),
  UNIQUE (category_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_subcategories TO authenticated;
GRANT ALL ON public.finance_subcategories TO service_role;
ALTER TABLE public.finance_subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own subcategories" ON public.finance_subcategories
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own subcategories" ON public.finance_subcategories
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.finance_categories c
      WHERE c.id = category_id AND c.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update their own subcategories" ON public.finance_subcategories
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.finance_categories c
      WHERE c.id = category_id AND c.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete their own subcategories" ON public.finance_subcategories
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX finance_subcategories_user_category_idx ON public.finance_subcategories(user_id, category_id);
CREATE TRIGGER update_finance_subcategories_updated_at
  BEFORE UPDATE ON public.finance_subcategories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  transaction_date date NOT NULL,
  category_id uuid NOT NULL REFERENCES public.finance_categories(id) ON DELETE RESTRICT,
  subcategory_id uuid REFERENCES public.finance_subcategories(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('paid', 'pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finance_transactions_description_length CHECK (char_length(description) <= 240)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_transactions TO authenticated;
GRANT ALL ON public.finance_transactions TO service_role;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transactions" ON public.finance_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transactions" ON public.finance_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.finance_categories c
      WHERE c.id = category_id AND c.user_id = auth.uid() AND c.type = finance_transactions.type
    )
    AND (
      subcategory_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.finance_subcategories s
        WHERE s.id = subcategory_id AND s.user_id = auth.uid() AND s.category_id = finance_transactions.category_id
      )
    )
  );
CREATE POLICY "Users can update their own transactions" ON public.finance_transactions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.finance_categories c
      WHERE c.id = category_id AND c.user_id = auth.uid() AND c.type = finance_transactions.type
    )
    AND (
      subcategory_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.finance_subcategories s
        WHERE s.id = subcategory_id AND s.user_id = auth.uid() AND s.category_id = finance_transactions.category_id
      )
    )
  );
CREATE POLICY "Users can delete their own transactions" ON public.finance_transactions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX finance_transactions_user_date_idx ON public.finance_transactions(user_id, transaction_date DESC);
CREATE INDEX finance_transactions_user_category_idx ON public.finance_transactions(user_id, category_id);
CREATE TRIGGER update_finance_transactions_updated_at
  BEFORE UPDATE ON public.finance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.finance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  keywords text[] NOT NULL DEFAULT ARRAY[]::text[],
  category_id uuid NOT NULL REFERENCES public.finance_categories(id) ON DELETE CASCADE,
  subcategory_id uuid REFERENCES public.finance_subcategories(id) ON DELETE SET NULL,
  priority integer NOT NULL DEFAULT 50,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finance_rules_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT finance_rules_keywords_not_empty CHECK (array_length(keywords, 1) IS NOT NULL),
  CONSTRAINT finance_rules_priority_range CHECK (priority BETWEEN 0 AND 999)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_rules TO authenticated;
GRANT ALL ON public.finance_rules TO service_role;
ALTER TABLE public.finance_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own rules" ON public.finance_rules
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own rules" ON public.finance_rules
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.finance_categories c
      WHERE c.id = category_id AND c.user_id = auth.uid()
    )
    AND (
      subcategory_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.finance_subcategories s
        WHERE s.id = subcategory_id AND s.user_id = auth.uid() AND s.category_id = finance_rules.category_id
      )
    )
  );
CREATE POLICY "Users can update their own rules" ON public.finance_rules
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.finance_categories c
      WHERE c.id = category_id AND c.user_id = auth.uid()
    )
    AND (
      subcategory_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.finance_subcategories s
        WHERE s.id = subcategory_id AND s.user_id = auth.uid() AND s.category_id = finance_rules.category_id
      )
    )
  );
CREATE POLICY "Users can delete their own rules" ON public.finance_rules
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX finance_rules_user_priority_idx ON public.finance_rules(user_id, priority DESC);
CREATE TRIGGER update_finance_rules_updated_at
  BEFORE UPDATE ON public.finance_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();