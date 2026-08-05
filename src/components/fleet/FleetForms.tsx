import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFinance } from "@/lib/finance-store";
import { paymentMethods, type PaymentMethod } from "@/lib/finance-data";
import { useFleet, type FinancePosting } from "@/lib/fleet-store";
import {
  fixedCostKinds,
  fleetPalette,
  fuelTypes,
  maintenanceKinds,
  periodicities,
  type FixedCostKind,
  type FuelType,
  type MaintenanceKind,
  type Periodicity,
  type Vehicle,
} from "@/lib/fleet-data";

const today = () => new Date().toISOString().slice(0, 10);

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function PostingFields({
  posting,
  onChange,
}: {
  posting: FinancePosting;
  onChange: (p: FinancePosting) => void;
}) {
  const { accounts } = useFinance();
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <label className="flex items-start gap-2 text-sm">
        <Checkbox
          checked={posting.post}
          onCheckedChange={(v) => onChange({ ...posting, post: Boolean(v) })}
          className="mt-0.5"
        />
        <span>
          Lançar no financeiro
          <span className="block text-xs text-muted-foreground">
            Cria uma saída em Frota e desconta do saldo escolhido.
          </span>
        </span>
      </label>
      {posting.post && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Saldo / conta">
            <Select
              value={posting.accountId ?? ""}
              onValueChange={(v) => onChange({ ...posting, accountId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Forma de pagamento">
            <Select
              value={posting.paymentMethod ?? "outro"}
              onValueChange={(v) => onChange({ ...posting, paymentMethod: v as PaymentMethod })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}
    </div>
  );
}

export function VehicleDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: Vehicle | null;
}) {
  const { addVehicle, updateVehicle } = useFleet();
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [brandModel, setBrandModel] = useState("");
  const [year, setYear] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("flex");
  const [odometer, setOdometer] = useState("0");
  const [color, setColor] = useState(fleetPalette[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setPlate(editing?.plate ?? "");
    setBrandModel(editing?.brandModel ?? "");
    setYear(editing?.year ? String(editing.year) : "");
    setFuelType(editing?.fuelType ?? "flex");
    setOdometer(String(editing?.initialOdometer ?? 0));
    setColor(editing?.color ?? fleetPalette[0]);
  }, [open, editing]);

  async function submit() {
    if (!name.trim()) {
      toast.error("Informe o nome do veículo.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        plate: plate.trim().toUpperCase(),
        brandModel: brandModel.trim(),
        year: year ? Number(year) : undefined,
        fuelType,
        initialOdometer: Number(odometer) || 0,
        color,
      };
      if (editing) await updateVehicle(editing.id, payload);
      else await addVehicle(payload);
      toast.success(editing ? "Veículo atualizado." : "Veículo cadastrado.");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível salvar o veículo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar veículo" : "Novo veículo"}</DialogTitle>
          <DialogDescription>Dados básicos usados no cálculo de custo por km.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome / apelido">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Onix branco" />
          </Field>
          <Field label="Placa">
            <Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="ABC1D23" />
          </Field>
          <Field label="Marca / modelo">
            <Input
              value={brandModel}
              onChange={(e) => setBrandModel(e.target.value)}
              placeholder="Chevrolet Onix 1.0"
            />
          </Field>
          <Field label="Ano">
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2020"
            />
          </Field>
          <Field label="Combustível">
            <Select value={fuelType} onValueChange={(v) => setFuelType(v as FuelType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fuelTypes.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Odômetro inicial (km)">
            <Input
              type="number"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Cor">
              <div className="flex flex-wrap gap-2">
                {fleetPalette.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Cor ${c}`}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                      color === c ? "scale-110 border-foreground" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VehicleSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { vehicles } = useFleet();
  return (
    <Field label="Veículo">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {vehicles.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function FuelingDialog({
  open,
  onOpenChange,
  defaultVehicleId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultVehicleId?: string;
}) {
  const { addFueling, vehicles } = useFleet();
  const [vehicleId, setVehicleId] = useState(defaultVehicleId ?? "");
  const [date, setDate] = useState(today());
  const [odometer, setOdometer] = useState("");
  const [liters, setLiters] = useState("");
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [total, setTotal] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("gasolina");
  const [station, setStation] = useState("");
  const [fullTank, setFullTank] = useState(true);
  const [posting, setPosting] = useState<FinancePosting>({ post: false, paymentMethod: "credito" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVehicleId(defaultVehicleId ?? vehicles[0]?.id ?? "");
    setDate(today());
    setOdometer("");
    setLiters("");
    setPricePerLiter("");
    setTotal("");
    setStation("");
    setFullTank(true);
    setPosting({ post: false, paymentMethod: "credito" });
  }, [open, defaultVehicleId, vehicles]);

  function syncFromPrice(price: string, lit: string) {
    const p = Number(price.replace(",", "."));
    const l = Number(lit.replace(",", "."));
    if (p > 0 && l > 0) setTotal((p * l).toFixed(2));
  }

  async function submit() {
    const l = Number(liters.replace(",", "."));
    const t = Number(total.replace(",", "."));
    const od = Number(odometer.replace(",", "."));
    if (!vehicleId) return toast.error("Selecione o veículo.");
    if (!(l > 0)) return toast.error("Informe os litros.");
    if (!(t > 0)) return toast.error("Informe o valor total.");
    if (!(od > 0)) return toast.error("Informe o odômetro.");
    if (posting.post && !posting.accountId) return toast.error("Escolha o saldo para o lançamento.");

    setSaving(true);
    try {
      await addFueling(
        {
          vehicleId,
          date,
          odometer: od,
          liters: l,
          totalAmount: t,
          fuelType,
          station: station.trim(),
          fullTank,
          notes: "",
        },
        posting,
      );
      toast.success("Abastecimento registrado.");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível salvar o abastecimento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo abastecimento</DialogTitle>
          <DialogDescription>Base para consumo (km/l) e custo por km.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <VehicleSelect value={vehicleId} onChange={setVehicleId} />
          <Field label="Data">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Odômetro (km)">
            <Input value={odometer} onChange={(e) => setOdometer(e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Litros">
            <Input
              value={liters}
              onChange={(e) => {
                setLiters(e.target.value);
                syncFromPrice(pricePerLiter, e.target.value);
              }}
              inputMode="decimal"
            />
          </Field>
          <Field label="Preço por litro (R$)">
            <Input
              value={pricePerLiter}
              onChange={(e) => {
                setPricePerLiter(e.target.value);
                syncFromPrice(e.target.value, liters);
              }}
              inputMode="decimal"
            />
          </Field>
          <Field label="Valor total (R$)">
            <Input value={total} onChange={(e) => setTotal(e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Combustível">
            <Select value={fuelType} onValueChange={(v) => setFuelType(v as FuelType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fuelTypes.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Posto">
            <Input value={station} onChange={(e) => setStation(e.target.value)} placeholder="Posto Ipiranga" />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox checked={fullTank} onCheckedChange={(v) => setFullTank(Boolean(v))} />
            Tanque cheio
          </label>
          <div className="sm:col-span-2">
            <PostingFields posting={posting} onChange={setPosting} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MaintenanceDialog({
  open,
  onOpenChange,
  defaultVehicleId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultVehicleId?: string;
}) {
  const { addMaintenance, vehicles } = useFleet();
  const [vehicleId, setVehicleId] = useState(defaultVehicleId ?? "");
  const [date, setDate] = useState(today());
  const [odometer, setOdometer] = useState("");
  const [kind, setKind] = useState<MaintenanceKind>("revisao");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [nextOdometer, setNextOdometer] = useState("");
  const [posting, setPosting] = useState<FinancePosting>({ post: false, paymentMethod: "credito" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVehicleId(defaultVehicleId ?? vehicles[0]?.id ?? "");
    setDate(today());
    setOdometer("");
    setKind("revisao");
    setDescription("");
    setAmount("");
    setNextOdometer("");
    setPosting({ post: false, paymentMethod: "credito" });
  }, [open, defaultVehicleId, vehicles]);

  async function submit() {
    const value = Number(amount.replace(",", "."));
    if (!vehicleId) return toast.error("Selecione o veículo.");
    if (!(value > 0)) return toast.error("Informe o valor.");
    if (posting.post && !posting.accountId) return toast.error("Escolha o saldo para o lançamento.");
    setSaving(true);
    try {
      await addMaintenance(
        {
          vehicleId,
          date,
          odometer: Number(odometer.replace(",", ".")) || 0,
          kind,
          description: description.trim(),
          amount: value,
          nextOdometer: nextOdometer ? Number(nextOdometer.replace(",", ".")) : undefined,
        },
        posting,
      );
      toast.success("Manutenção registrada.");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível salvar a manutenção.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova manutenção</DialogTitle>
          <DialogDescription>Revisões, óleo, pneus, freios e reparos.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <VehicleSelect value={vehicleId} onChange={setVehicleId} />
          <Field label="Data">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Tipo">
            <Select value={kind} onValueChange={(v) => setKind(v as MaintenanceKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {maintenanceKinds.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Valor (R$)">
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Odômetro (km)">
            <Input value={odometer} onChange={(e) => setOdometer(e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Próxima revisão em (km)">
            <Input
              value={nextOdometer}
              onChange={(e) => setNextOdometer(e.target.value)}
              inputMode="decimal"
              placeholder="Opcional"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Descrição">
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Troca de óleo e filtros"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <PostingFields posting={posting} onChange={setPosting} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FixedCostDialog({
  open,
  onOpenChange,
  defaultVehicleId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultVehicleId?: string;
}) {
  const { addFixedCost, vehicles } = useFleet();
  const [vehicleId, setVehicleId] = useState(defaultVehicleId ?? "");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<FixedCostKind>("ipva");
  const [amount, setAmount] = useState("");
  const [periodicity, setPeriodicity] = useState<Periodicity>("anual");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState("");
  const [posting, setPosting] = useState<FinancePosting>({ post: false, paymentMethod: "boleto" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVehicleId(defaultVehicleId ?? vehicles[0]?.id ?? "");
    setName("");
    setKind("ipva");
    setAmount("");
    setPeriodicity("anual");
    setStartDate(today());
    setEndDate("");
    setPosting({ post: false, paymentMethod: "boleto" });
  }, [open, defaultVehicleId, vehicles]);

  async function submit() {
    const value = Number(amount.replace(",", "."));
    if (!vehicleId) return toast.error("Selecione o veículo.");
    if (!name.trim()) return toast.error("Informe o nome do custo.");
    if (!(value > 0)) return toast.error("Informe o valor.");
    if (posting.post && !posting.accountId) return toast.error("Escolha o saldo para o lançamento.");
    setSaving(true);
    try {
      await addFixedCost(
        {
          vehicleId,
          name: name.trim(),
          kind,
          amount: value,
          periodicity,
          startDate,
          endDate: endDate || undefined,
        },
        posting,
      );
      toast.success("Custo fixo cadastrado.");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível salvar o custo fixo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo custo fixo</DialogTitle>
          <DialogDescription>IPVA, seguro, licenciamento, financiamento.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <VehicleSelect value={vehicleId} onChange={setVehicleId} />
          <Field label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="IPVA 2026" />
          </Field>
          <Field label="Tipo">
            <Select value={kind} onValueChange={(v) => setKind(v as FixedCostKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fixedCostKinds.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Valor (R$)">
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Periodicidade">
            <Select value={periodicity} onValueChange={(v) => setPeriodicity(v as Periodicity)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodicities.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Início">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Fim (opcional)">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <PostingFields posting={posting} onChange={setPosting} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
