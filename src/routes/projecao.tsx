import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LineChart as LineIcon, Loader2, Plus, Trash2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/layout/AppHeader";
import { Login } from "@/components/finance/Login";
import { BalancesSkeleton } from "@/components/finance/Skeletons";
import { FinanceProvider, useFinance } from "@/lib/finance-store";
import { ThemeProvider } from "@/lib/theme";
import { usePrivacy } from "@/lib/privacy";
import { formatBRL, monthNamesPt } from "@/lib/finance-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/projecao")({
  head: () => ({
    meta: [
      { title: "Projeção — Simule seus ganhos e gastos futuros" },
      {
        name: "description",
        content:
          "Configure receitas e despesas esperadas, simule aumentos, cortes e gastos extras e veja seu saldo nos próximos 6 ou 12 meses.",
      },
      { property: "og:title", content: "Projeção — Simule seus ganhos e gastos futuros" },
      {
        property: "og:description",
        content: "Simulação de saldo futuro com cenários de aumento, corte e gastos extras.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectionRoute,
});

interface Line_ {
  id: string;
  name: string;
  amount: number;
}
interface ExpenseLine extends Line_ {
  categoryId: string | null;
}
interface Raise {
  id: string;
  month: string; // YYYY-MM
  amount: number;
}
interface Cut {
  id: string;
  categoryId: string;
  percent: number;
}
interface Extra {
  id: string;
  month: string;
  name: string;
  amount: number;
  type: "income" | "expense";
}
interface ProjectionConfig {
  startBalance: number | null;
  horizon: 6 | 12;
  incomes: Line_[];
  expenses: ExpenseLine[];
  raises: Raise[];
  cuts: Cut[];
  extras: Extra[];
}

const emptyConfig: ProjectionConfig = {
  startBalance: null,
  horizon: 12,
  incomes: [],
  expenses: [],
  raises: [],
  cuts: [],
  extras: [],
};

const uid = () => Math.random().toString(36).slice(2, 10);

function futureMonths(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { key, label: `${monthNamesPt[d.getMonth()].slice(0, 3)}/${String(d.getFullYear()).slice(2)}` };
  });
}

function ProjectionRoute() {
  return (
    <ThemeProvider>
      <AuthShell />
    </ThemeProvider>
  );
}

function AuthShell() {
  usePrivacy();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => mounted && setAuthenticated(Boolean(data.user)));
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setAuthenticated(Boolean(s?.user)));
    return () => {
      mounted = false;
      l.subscription.unsubscribe();
    };
  }, []);
  if (authenticated === null)
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  if (!authenticated) return <Login onLoggedIn={() => setAuthenticated(true)} />;
  return (
    <FinanceProvider>
      <ProjectionPage />
    </FinanceProvider>
  );
}

function useProjectionConfig() {
  const [config, setConfig] = useState<ProjectionConfig>(emptyConfig);
  const [loaded, setLoaded] = useState(false);
  const prefsRef = useRef<Record<string, unknown>>({});
  const userRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      userRef.current = u.user.id;
      const { data } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("user_id", u.user.id)
        .maybeSingle();
      const prefs = (data?.preferences as Record<string, unknown>) ?? {};
      prefsRef.current = prefs;
      if (prefs.projection) setConfig({ ...emptyConfig, ...(prefs.projection as ProjectionConfig) });
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded || !userRef.current) return;
    const t = setTimeout(async () => {
      const next = { ...prefsRef.current, projection: config };
      prefsRef.current = next;
      await supabase
        .from("profiles")
        .update({ preferences: JSON.parse(JSON.stringify(next)) })
        .eq("user_id", userRef.current!);
    }, 700);
    return () => clearTimeout(t);
  }, [config, loaded]);

  return { config, setConfig, loaded };
}

const tooltipStyle = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--popover-foreground)",
  },
  itemStyle: { color: "var(--popover-foreground)" },
  labelStyle: { color: "var(--popover-foreground)" },
};
const axis = {
  stroke: "var(--muted-foreground)",
  fontSize: 12,
  tick: { fill: "var(--muted-foreground)" },
};
const kFmt = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v));

function ProjectionPage() {
  const { accounts, categories, loading } = useFinance();
  const { config, setConfig, loaded } = useProjectionConfig();
  const months = useMemo(() => futureMonths(config.horizon), [config.horizon]);
  const allMonths = useMemo(() => futureMonths(12), []);
  const expenseCats = categories.filter((c) => c.type === "expense");
  const accountsTotal = accounts.reduce((s, a) => s + a.balance, 0);
  const startBalance = config.startBalance ?? accountsTotal;

  const update = (patch: Partial<ProjectionConfig>) => setConfig((c) => ({ ...c, ...patch }));

  const data = useMemo(() => {
    const baseIncome = config.incomes.reduce((s, l) => s + (l.amount || 0), 0);
    let baseBal = startBalance;
    let scenBal = startBalance;
    return months.map((m) => {
      const baseExpense = config.expenses.reduce((s, l) => s + (l.amount || 0), 0);
      const raise = config.raises.filter((r) => r.month <= m.key).reduce((s, r) => s + (r.amount || 0), 0);
      const scenExpense = config.expenses.reduce((s, l) => {
        const cut = config.cuts.find((c) => c.categoryId && c.categoryId === l.categoryId);
        return s + (l.amount || 0) * (1 - (cut ? Math.min(100, cut.percent || 0) : 0) / 100);
      }, 0);
      const extras = config.extras.filter((e) => e.month === m.key);
      const extraIn = extras.filter((e) => e.type === "income").reduce((s, e) => s + (e.amount || 0), 0);
      const extraOut = extras.filter((e) => e.type === "expense").reduce((s, e) => s + (e.amount || 0), 0);
      const income = baseIncome + raise + extraIn;
      const expense = scenExpense + extraOut;
      baseBal += baseIncome - baseExpense;
      scenBal += income - expense;
      return {
        name: m.label,
        Receitas: Math.round(income * 100) / 100,
        Despesas: Math.round(expense * 100) / 100,
        "Sem cenários": Math.round(baseBal * 100) / 100,
        "Com cenários": Math.round(scenBal * 100) / 100,
      };
    });
  }, [config, months, startBalance]);

  const last = data[data.length - 1];
  const totals = data.reduce((a, d) => ({ i: a.i + d.Receitas, e: a.e + d.Despesas }), { i: 0, e: 0 });
  const lowest = data.reduce((min, d) => (d["Com cenários"] < min["Com cenários"] ? d : min), data[0]);

  if (loading || !loaded)
    return (
      <div className="min-h-screen bg-background">
        <AppHeader icon={LineIcon} active="/projecao" />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <BalancesSkeleton />
        </main>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader icon={LineIcon} active="/projecao" />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-semibold">Projeção</h1>
            <p className="text-sm text-muted-foreground">
              Digite quanto espera ganhar e gastar por mês e simule cenários.
            </p>
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Saldo inicial</p>
              <Input
                type="number"
                className="w-36"
                value={startBalance}
                onChange={(e) => update({ startBalance: Number(e.target.value) })}
              />
            </div>
            <Select value={String(config.horizon)} onValueChange={(v) => update({ horizon: Number(v) as 6 | 12 })}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">12 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={`Saldo em ${last?.name ?? ""}`} value={formatBRL(last?.["Com cenários"] ?? startBalance)} />
          <Stat label="Receitas no período" value={formatBRL(totals.i)} />
          <Stat label="Despesas no período" value={formatBRL(totals.e)} />
          <Stat
            label="Mês mais apertado"
            value={lowest ? formatBRL(lowest["Com cenários"]) : "—"}
            hint={lowest?.name}
            danger={!!lowest && lowest["Com cenários"] < 0}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução do saldo</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" {...axis} />
                  <YAxis {...axis} tickFormatter={kFmt} />
                  <Tooltip formatter={(v: number) => formatBRL(Number(v))} {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span style={{ color: "var(--foreground)" }}>{v}</span>} />
                  <Line type="monotone" dataKey="Sem cenários" stroke="var(--muted-foreground)" strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="Com cenários" stroke="var(--primary)" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receitas vs Despesas por mês</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" {...axis} />
                  <YAxis {...axis} tickFormatter={kFmt} />
                  <Tooltip formatter={(v: number) => formatBRL(Number(v))} {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span style={{ color: "var(--foreground)" }}>{v}</span>} />
                  <Bar dataKey="Receitas" fill="var(--income)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Despesas" fill="var(--expense)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section
            title="Receitas mensais"
            onAdd={() => update({ incomes: [...config.incomes, { id: uid(), name: "", amount: 0 }] })}
            empty="Ex.: Salário, freelas."
            count={config.incomes.length}
          >
            {config.incomes.map((l) => (
              <Row key={l.id} onRemove={() => update({ incomes: config.incomes.filter((x) => x.id !== l.id) })}>
                <Input placeholder="Nome" value={l.name} onChange={(e) => update({ incomes: config.incomes.map((x) => (x.id === l.id ? { ...x, name: e.target.value } : x)) })} />
                <Money value={l.amount} onChange={(v) => update({ incomes: config.incomes.map((x) => (x.id === l.id ? { ...x, amount: v } : x)) })} />
              </Row>
            ))}
          </Section>

          <Section
            title="Despesas mensais"
            onAdd={() => update({ expenses: [...config.expenses, { id: uid(), name: "", amount: 0, categoryId: null }] })}
            empty="Ex.: Aluguel, mercado, lazer."
            count={config.expenses.length}
          >
            {config.expenses.map((l) => (
              <Row key={l.id} onRemove={() => update({ expenses: config.expenses.filter((x) => x.id !== l.id) })}>
                <Input placeholder="Nome" value={l.name} onChange={(e) => update({ expenses: config.expenses.map((x) => (x.id === l.id ? { ...x, name: e.target.value } : x)) })} />
                <CatSelect cats={expenseCats} value={l.categoryId} onChange={(v) => update({ expenses: config.expenses.map((x) => (x.id === l.id ? { ...x, categoryId: v } : x)) })} />
                <Money value={l.amount} onChange={(v) => update({ expenses: config.expenses.map((x) => (x.id === l.id ? { ...x, amount: v } : x)) })} />
              </Row>
            ))}
          </Section>

          <Section
            title="Aumento de salário"
            onAdd={() => update({ raises: [...config.raises, { id: uid(), month: allMonths[0].key, amount: 0 }] })}
            empty="Valor a mais por mês a partir de um mês."
            count={config.raises.length}
          >
            {config.raises.map((r) => (
              <Row key={r.id} onRemove={() => update({ raises: config.raises.filter((x) => x.id !== r.id) })}>
                <MonthSelect months={allMonths} value={r.month} prefix="A partir de " onChange={(v) => update({ raises: config.raises.map((x) => (x.id === r.id ? { ...x, month: v } : x)) })} />
                <Money value={r.amount} onChange={(v) => update({ raises: config.raises.map((x) => (x.id === r.id ? { ...x, amount: v } : x)) })} />
              </Row>
            ))}
          </Section>

          <Section
            title="Cortar categoria"
            onAdd={() => update({ cuts: [...config.cuts, { id: uid(), categoryId: expenseCats[0]?.id ?? "", percent: 10 }] })}
            empty="Reduz em % as despesas daquela categoria."
            count={config.cuts.length}
          >
            {config.cuts.map((c) => (
              <Row key={c.id} onRemove={() => update({ cuts: config.cuts.filter((x) => x.id !== c.id) })}>
                <CatSelect cats={expenseCats} value={c.categoryId} onChange={(v) => update({ cuts: config.cuts.map((x) => (x.id === c.id ? { ...x, categoryId: v ?? "" } : x)) })} />
                <div className="flex items-center gap-1">
                  <Input type="number" className="w-20" value={c.percent} onChange={(e) => update({ cuts: config.cuts.map((x) => (x.id === c.id ? { ...x, percent: Number(e.target.value) } : x)) })} />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </Row>
            ))}
          </Section>

          <div className="lg:col-span-2">
            <Section
              title="Gastos ou ganhos extras"
              onAdd={() => update({ extras: [...config.extras, { id: uid(), month: allMonths[0].key, name: "", amount: 0, type: "expense" }] })}
              empty="Ex.: viagem em dezembro, 13º salário."
              count={config.extras.length}
            >
              {config.extras.map((e) => {
                const set = (p: Partial<Extra>) => update({ extras: config.extras.map((x) => (x.id === e.id ? { ...x, ...p } : x)) });
                return (
                  <Row key={e.id} onRemove={() => update({ extras: config.extras.filter((x) => x.id !== e.id) })}>
                    <Input placeholder="Descrição" value={e.name} onChange={(ev) => set({ name: ev.target.value })} />
                    <Select value={e.type} onValueChange={(v) => set({ type: v as Extra["type"] })}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Gasto</SelectItem>
                        <SelectItem value="income">Ganho</SelectItem>
                      </SelectContent>
                    </Select>
                    <MonthSelect months={allMonths} value={e.month} onChange={(v) => set({ month: v })} />
                    <Money value={e.amount} onChange={(v) => set({ amount: v })} />
                  </Row>
                );
              })}
            </Section>
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Stat({ label, value, hint, danger }: { label: string; value: string; hint?: string; danger?: boolean }) {
  return (
    <Card className="bento-card">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-semibold tabular-nums ${danger ? "text-destructive" : ""}`}>{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Section({ title, onAdd, empty, count, children }: { title: string; onAdd: () => void; empty: string; count: number; children: React.ReactNode }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {count === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : children}
      </CardContent>
    </Card>
  );
}

function Row({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
      {children}
      <Button size="icon" variant="ghost" onClick={onRemove} aria-label="Remover">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Money({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Input
      type="number"
      step="0.01"
      className="w-32 shrink-0"
      placeholder="R$"
      value={value || ""}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

function CatSelect({ cats, value, onChange }: { cats: { id: string; name: string }[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <Select value={value ?? "none"} onValueChange={(v) => onChange(v === "none" ? null : v)}>
      <SelectTrigger className="w-40 shrink-0"><SelectValue placeholder="Categoria" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sem categoria</SelectItem>
        {cats.map((c) => (
          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MonthSelect({ months, value, onChange, prefix = "" }: { months: { key: string; label: string }[]; value: string; onChange: (v: string) => void; prefix?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40 shrink-0"><SelectValue /></SelectTrigger>
      <SelectContent>
        {months.map((m) => (
          <SelectItem key={m.key} value={m.key}>{prefix}{m.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
