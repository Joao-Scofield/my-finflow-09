import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Car, Fuel, Loader2, LogOut, Plus, Receipt, Trash2, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { PeriodSelector } from "@/components/finance/PeriodSelector";
import { ThemeToggle } from "@/components/finance/ThemeToggle";
import { Login } from "@/components/finance/Login";
import {
  LazyCostCompositionChart,
  LazyCostPerKmChart,
  LazyVehicleComparisonChart,
} from "@/components/fleet/LazyFleetCharts";
import { costInMonth, kmInMonth, kmInMonthForVehicles } from "@/lib/fleet-metrics";
import { DashboardSkeleton } from "@/components/finance/Skeletons";
import {
  FixedCostDialog,
  FuelingDialog,
  MaintenanceDialog,
  VehicleDialog,
} from "@/components/fleet/FleetForms";
import { FinanceProvider } from "@/lib/finance-store";
import { FleetProvider, useFleet } from "@/lib/fleet-store";
import { ThemeProvider } from "@/lib/theme";
import { monthNamesPt } from "@/lib/finance-data";
import {
  fixedCostKindLabel,
  formatBRL,
  formatKm,
  fuelStats,
  maintenanceKindLabel,
  periodicityLabel,
  type Vehicle,
} from "@/lib/fleet-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/frota")({
  head: () => ({
    meta: [
      { title: "Frota — Custo por km e gestão de veículos" },
      {
        name: "description",
        content:
          "Controle abastecimentos, manutenções e custos fixos dos seus veículos e acompanhe o custo por km rodado.",
      },
      { property: "og:title", content: "Frota — Custo por km e gestão de veículos" },
      {
        property: "og:description",
        content:
          "Abastecimentos, consumo médio, manutenções, custos fixos e custo por km em um só painel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FleetRoute,
});

function FleetRoute() {
  return (
    <ThemeProvider>
      <AuthShell />
    </ThemeProvider>
  );
}

function AuthShell() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setAuthenticated(Boolean(data.user));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session?.user));
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (authenticated === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authenticated) return <Login onLoggedIn={() => setAuthenticated(true)} />;

  return (
    <FinanceProvider>
      <FleetProvider>
        <FleetPage />
      </FleetProvider>
    </FinanceProvider>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function FleetPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [vehicleId, setVehicleId] = useState<string>("all");
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [fuelOpen, setFuelOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);

  const {
    vehicles,
    fuelings,
    maintenances,
    fixedCosts,
    loading,
    deleteVehicle,
    deleteFueling,
    deleteMaintenance,
    deleteFixedCost,
  } = useFleet();

  const selected = vehicles.find((v) => v.id === vehicleId) ?? null;
  const scopedFuelings = selected ? fuelings.filter((f) => f.vehicleId === selected.id) : fuelings;
  const scopedMaint = selected ? maintenances.filter((m) => m.vehicleId === selected.id) : maintenances;
  const scopedCosts = selected ? fixedCosts.filter((c) => c.vehicleId === selected.id) : fixedCosts;

  const stats = useMemo(() => {
    const km = selected
      ? kmInMonth(scopedFuelings, year, month, selected.initialOdometer)
      : kmInMonthForVehicles(vehicles, fuelings, year, month);
    const { fuel, maint, fixed, total } = costInMonth(
      scopedFuelings,
      scopedMaint,
      scopedCosts,
      year,
      month,
    );
    const consumption = selected
      ? fuelStats(scopedFuelings, selected.initialOdometer).kmPerLiter
      : (() => {
          const values = vehicles
            .map(
              (v) =>
                fuelStats(
                  fuelings.filter((f) => f.vehicleId === v.id),
                  v.initialOdometer,
                ).kmPerLiter,
            )
            .filter((x) => x > 0);
          return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        })();
    return { km, fuel, maint, fixed, total, costPerKm: km > 0 ? total / km : 0, consumption };
  }, [scopedFuelings, scopedMaint, scopedCosts, month, year, selected, vehicles, fuelings]);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Car className="h-5 w-5" />
            </div>
            <nav className="flex items-center gap-0.5 overflow-x-auto">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">Painel</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/saldos">Saldos</Link>
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <Link to="/frota">Frota</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/lista">Lista</Link>
              </Button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <section className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Gestão de frota</p>
                <h1 className="text-xl font-semibold tracking-tight">
                  {monthNamesPt[month - 1]} / {year}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PeriodSelector
                  month={month}
                  year={year}
                  onChange={(m, y) => {
                    setMonth(m);
                    setYear(y);
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingVehicle(null);
                    setVehicleOpen(true);
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Veículo
                </Button>
                <Button onClick={() => setFuelOpen(true)} disabled={vehicles.length === 0}>
                  <Fuel className="mr-1 h-4 w-4" />
                  Abastecer
                </Button>
              </div>
            </section>

            {vehicles.length === 0 ? (
              <Card>
                <CardContent className="grid place-items-center gap-3 p-10 text-center">
                  <Car className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Nenhum veículo cadastrado</p>
                    <p className="text-sm text-muted-foreground">
                      Cadastre um veículo para começar a calcular o custo por km.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingVehicle(null);
                      setVehicleOpen(true);
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Cadastrar veículo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={vehicleId === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVehicleId("all")}
                  >
                    Todos
                  </Button>
                  {vehicles.map((v) => (
                    <Button
                      key={v.id}
                      variant={vehicleId === v.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVehicleId(v.id)}
                    >
                      <span
                        className="mr-2 h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: v.color }}
                      />
                      {v.name}
                    </Button>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <StatCard label="Km rodados no mês" value={formatKm(stats.km)} />
                  <StatCard label="Gasto no mês" value={formatBRL(stats.total)} />
                  <StatCard
                    label="Custo por km"
                    value={stats.costPerKm > 0 ? formatBRL(stats.costPerKm) : "—"}
                    hint="Combustível + manutenção + fixos"
                  />
                  <StatCard
                    label="Consumo médio"
                    value={stats.consumption > 0 ? `${stats.consumption.toFixed(1)} km/l` : "—"}
                  />
                  <StatCard
                    label="Combustível no mês"
                    value={formatBRL(stats.fuel)}
                    hint={`Manutenção ${formatBRL(stats.maint)} · Fixos ${formatBRL(stats.fixed)}`}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <LazyCostPerKmChart month={month} year={year} vehicle={selected} />
                  <LazyCostCompositionChart month={month} year={year} vehicle={selected} />
                </div>

                <LazyVehicleComparisonChart month={month} year={year} />

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Veículos</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {vehicles.map((v) => {
                      const s = fuelStats(
                        fuelings.filter((f) => f.vehicleId === v.id),
                        v.initialOdometer,
                      );
                      const vMaint = maintenances
                        .filter((m) => m.vehicleId === v.id)
                        .reduce((sum, m) => sum + m.amount, 0);
                      const totalCost = s.spent + vMaint;
                      const nextService = maintenances
                        .filter((m) => m.vehicleId === v.id && m.nextOdometer)
                        .sort((a, b) => (b.nextOdometer ?? 0) - (a.nextOdometer ?? 0))[0];
                      const due =
                        nextService?.nextOdometer && s.lastOdometer >= nextService.nextOdometer - 500;
                      return (
                        <div key={v.id} className="rounded-xl border p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 font-medium">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: v.color }}
                                />
                                <span className="truncate">{v.name}</span>
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {[v.brandModel, v.plate, v.year].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingVehicle(v);
                                  setVehicleOpen(true);
                                }}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Excluir veículo"
                                onClick={() => void deleteVehicle(v.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <dt className="text-xs text-muted-foreground">Odômetro</dt>
                              <dd className="tabular-nums">{formatKm(s.lastOdometer)}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-muted-foreground">Km rodados</dt>
                              <dd className="tabular-nums">{formatKm(s.km)}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-muted-foreground">Custo total</dt>
                              <dd className="tabular-nums">{formatBRL(totalCost)}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-muted-foreground">Custo/km</dt>
                              <dd className="tabular-nums">
                                {s.km > 0 ? formatBRL(totalCost / s.km) : "—"}
                              </dd>
                            </div>
                          </dl>
                          {due && (
                            <Badge variant="destructive" className="mt-3">
                              Revisão próxima ({formatKm(nextService!.nextOdometer!)})
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Tabs defaultValue="fuel">
                  <TabsList className="w-full justify-start overflow-x-auto">
                    <TabsTrigger value="fuel">Abastecimentos</TabsTrigger>
                    <TabsTrigger value="maint">Manutenções</TabsTrigger>
                    <TabsTrigger value="fixed">Custos fixos</TabsTrigger>
                  </TabsList>

                  <TabsContent value="fuel">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-base">Abastecimentos</CardTitle>
                        <Button size="sm" onClick={() => setFuelOpen(true)}>
                          <Fuel className="mr-1 h-4 w-4" />
                          Novo
                        </Button>
                      </CardHeader>
                      <CardContent className="overflow-x-auto px-3 sm:px-6">
                        <Table className="min-w-[720px]">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Veículo</TableHead>
                              <TableHead className="text-right">Odômetro</TableHead>
                              <TableHead className="text-right">Litros</TableHead>
                              <TableHead className="text-right">R$/l</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead>Posto</TableHead>
                              <TableHead />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {scopedFuelings.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground">
                                  Nenhum abastecimento registrado.
                                </TableCell>
                              </TableRow>
                            )}
                            {scopedFuelings.map((f) => (
                              <TableRow key={f.id}>
                                <TableCell>{f.date.split("-").reverse().join("/")}</TableCell>
                                <TableCell>
                                  {vehicles.find((v) => v.id === f.vehicleId)?.name ?? "—"}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatKm(f.odometer)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {f.liters.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatBRL(f.liters > 0 ? f.totalAmount / f.liters : 0)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatBRL(f.totalAmount)}
                                </TableCell>
                                <TableCell>{f.station || "—"}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Excluir abastecimento"
                                    onClick={() => void deleteFueling(f.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="maint">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-base">Manutenções e pneus</CardTitle>
                        <Button size="sm" onClick={() => setMaintOpen(true)}>
                          <Wrench className="mr-1 h-4 w-4" />
                          Nova
                        </Button>
                      </CardHeader>
                      <CardContent className="overflow-x-auto px-3 sm:px-6">
                        <Table className="min-w-[720px]">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Veículo</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead className="text-right">Odômetro</TableHead>
                              <TableHead className="text-right">Próxima</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                              <TableHead />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {scopedMaint.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground">
                                  Nenhuma manutenção registrada.
                                </TableCell>
                              </TableRow>
                            )}
                            {scopedMaint.map((m) => (
                              <TableRow key={m.id}>
                                <TableCell>{m.date.split("-").reverse().join("/")}</TableCell>
                                <TableCell>
                                  {vehicles.find((v) => v.id === m.vehicleId)?.name ?? "—"}
                                </TableCell>
                                <TableCell>{maintenanceKindLabel(m.kind)}</TableCell>
                                <TableCell className="max-w-56 truncate">{m.description || "—"}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatKm(m.odometer)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {m.nextOdometer ? formatKm(m.nextOdometer) : "—"}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatBRL(m.amount)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Excluir manutenção"
                                    onClick={() => void deleteMaintenance(m.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="fixed">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-base">Custos fixos</CardTitle>
                        <Button size="sm" onClick={() => setCostOpen(true)}>
                          <Receipt className="mr-1 h-4 w-4" />
                          Novo
                        </Button>
                      </CardHeader>
                      <CardContent className="overflow-x-auto px-3 sm:px-6">
                        <Table className="min-w-[720px]">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>Veículo</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Periodicidade</TableHead>
                              <TableHead>Início</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                              <TableHead />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {scopedCosts.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground">
                                  Nenhum custo fixo cadastrado.
                                </TableCell>
                              </TableRow>
                            )}
                            {scopedCosts.map((c) => (
                              <TableRow key={c.id}>
                                <TableCell>{c.name}</TableCell>
                                <TableCell>
                                  {vehicles.find((v) => v.id === c.vehicleId)?.name ?? "—"}
                                </TableCell>
                                <TableCell>{fixedCostKindLabel(c.kind)}</TableCell>
                                <TableCell>{periodicityLabel(c.periodicity)}</TableCell>
                                <TableCell>{c.startDate.split("-").reverse().join("/")}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatBRL(c.amount)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Excluir custo fixo"
                                    onClick={() => void deleteFixedCost(c.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        )}
      </main>

      <VehicleDialog open={vehicleOpen} onOpenChange={setVehicleOpen} editing={editingVehicle} />
      <FuelingDialog
        open={fuelOpen}
        onOpenChange={setFuelOpen}
        defaultVehicleId={selected?.id}
      />
      <MaintenanceDialog
        open={maintOpen}
        onOpenChange={setMaintOpen}
        defaultVehicleId={selected?.id}
      />
      <FixedCostDialog
        open={costOpen}
        onOpenChange={setCostOpen}
        defaultVehicleId={selected?.id}
      />
      <Toaster richColors position="top-right" />
    </div>
  );
}
