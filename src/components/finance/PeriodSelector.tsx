import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { monthNamesPt } from "@/lib/finance-data";

export interface PeriodRange {
  startMonth: number; // 1-12
  startYear: number;
  endMonth: number; // 1-12
  endYear: number;
}

interface Props {
  value: PeriodRange;
  onChange: (range: PeriodRange) => void;
}

const key = (m: number, y: number) => y * 12 + (m - 1);

export function PeriodSelector({ value, onChange }: Props) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

  function update(patch: Partial<PeriodRange>) {
    const next = { ...value, ...patch };
    // mantém o início sempre antes ou igual ao fim
    if (key(next.startMonth, next.startYear) > key(next.endMonth, next.endYear)) {
      if (patch.startMonth !== undefined || patch.startYear !== undefined) {
        next.endMonth = next.startMonth;
        next.endYear = next.startYear;
      } else {
        next.startMonth = next.endMonth;
        next.startYear = next.endYear;
      }
    }
    onChange(next);
  }

  function currentMonth() {
    const now = new Date();
    onChange({
      startMonth: now.getMonth() + 1,
      startYear: now.getFullYear(),
      endMonth: now.getMonth() + 1,
      endYear: now.getFullYear(),
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">De</span>
      <Select
        value={String(value.startMonth)}
        onValueChange={(v) => update({ startMonth: Number(v) })}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {monthNamesPt.map((name, i) => (
            <SelectItem key={i} value={String(i + 1)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(value.startYear)}
        onValueChange={(v) => update({ startYear: Number(v) })}
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-xs text-muted-foreground">até</span>
      <Select value={String(value.endMonth)} onValueChange={(v) => update({ endMonth: Number(v) })}>
        <SelectTrigger className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {monthNamesPt.map((name, i) => (
            <SelectItem key={i} value={String(i + 1)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(value.endYear)} onValueChange={(v) => update({ endYear: Number(v) })}>
        <SelectTrigger className="w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={currentMonth}>
        Mês atual
      </Button>
    </div>
  );
}
