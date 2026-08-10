import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { monthNamesPt } from "@/lib/finance-data";

interface Props {
  month: number; // 1-12
  year: number;
  onChange: (month: number, year: number) => void;
}

export function PeriodSelector({ month, year, onChange }: Props) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);
  return (
    <div className="flex items-center gap-2">
      <Select value={String(month)} onValueChange={(v) => onChange(Number(v), year)}>
        <SelectTrigger className="w-[150px]">
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
      <Select value={String(year)} onValueChange={(v) => onChange(month, Number(v))}>
        <SelectTrigger className="w-[110px]">
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
    </div>
  );
}
