CREATE TABLE public.fleet_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  plate TEXT NOT NULL DEFAULT '',
  brand_model TEXT NOT NULL DEFAULT '',
  year INTEGER,
  fuel_type TEXT NOT NULL DEFAULT 'gasolina',
  initial_odometer NUMERIC NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6366f1',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_vehicles TO authenticated;
GRANT ALL ON public.fleet_vehicles TO service_role;
ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vehicles" ON public.fleet_vehicles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own vehicles" ON public.fleet_vehicles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vehicles" ON public.fleet_vehicles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vehicles" ON public.fleet_vehicles FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_fleet_vehicles_updated_at BEFORE UPDATE ON public.fleet_vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fleet_fuelings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES public.fleet_vehicles(id) ON DELETE CASCADE,
  fueling_date DATE NOT NULL,
  odometer NUMERIC NOT NULL,
  liters NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  fuel_type TEXT NOT NULL DEFAULT 'gasolina',
  station TEXT NOT NULL DEFAULT '',
  full_tank BOOLEAN NOT NULL DEFAULT true,
  notes TEXT NOT NULL DEFAULT '',
  transaction_id UUID REFERENCES public.finance_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_fuelings TO authenticated;
GRANT ALL ON public.fleet_fuelings TO service_role;
ALTER TABLE public.fleet_fuelings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fuelings" ON public.fleet_fuelings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own fuelings" ON public.fleet_fuelings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.fleet_vehicles v WHERE v.id = vehicle_id AND v.user_id = auth.uid()));
CREATE POLICY "Users can update their own fuelings" ON public.fleet_fuelings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.fleet_vehicles v WHERE v.id = vehicle_id AND v.user_id = auth.uid()));
CREATE POLICY "Users can delete their own fuelings" ON public.fleet_fuelings FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_fleet_fuelings_updated_at BEFORE UPDATE ON public.fleet_fuelings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fleet_maintenances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES public.fleet_vehicles(id) ON DELETE CASCADE,
  maintenance_date DATE NOT NULL,
  odometer NUMERIC NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'revisao',
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  next_odometer NUMERIC,
  transaction_id UUID REFERENCES public.finance_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_maintenances TO authenticated;
GRANT ALL ON public.fleet_maintenances TO service_role;
ALTER TABLE public.fleet_maintenances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own maintenances" ON public.fleet_maintenances FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own maintenances" ON public.fleet_maintenances FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.fleet_vehicles v WHERE v.id = vehicle_id AND v.user_id = auth.uid()));
CREATE POLICY "Users can update their own maintenances" ON public.fleet_maintenances FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.fleet_vehicles v WHERE v.id = vehicle_id AND v.user_id = auth.uid()));
CREATE POLICY "Users can delete their own maintenances" ON public.fleet_maintenances FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_fleet_maintenances_updated_at BEFORE UPDATE ON public.fleet_maintenances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fleet_fixed_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES public.fleet_vehicles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'outro',
  amount NUMERIC NOT NULL DEFAULT 0,
  periodicity TEXT NOT NULL DEFAULT 'mensal',
  start_date DATE NOT NULL,
  end_date DATE,
  transaction_id UUID REFERENCES public.finance_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_fixed_costs TO authenticated;
GRANT ALL ON public.fleet_fixed_costs TO service_role;
ALTER TABLE public.fleet_fixed_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fixed costs" ON public.fleet_fixed_costs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own fixed costs" ON public.fleet_fixed_costs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.fleet_vehicles v WHERE v.id = vehicle_id AND v.user_id = auth.uid()));
CREATE POLICY "Users can update their own fixed costs" ON public.fleet_fixed_costs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.fleet_vehicles v WHERE v.id = vehicle_id AND v.user_id = auth.uid()));
CREATE POLICY "Users can delete their own fixed costs" ON public.fleet_fixed_costs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_fleet_fixed_costs_updated_at BEFORE UPDATE ON public.fleet_fixed_costs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_fleet_fuelings_vehicle ON public.fleet_fuelings(vehicle_id, fueling_date);
CREATE INDEX idx_fleet_maintenances_vehicle ON public.fleet_maintenances(vehicle_id, maintenance_date);
CREATE INDEX idx_fleet_fixed_costs_vehicle ON public.fleet_fixed_costs(vehicle_id);