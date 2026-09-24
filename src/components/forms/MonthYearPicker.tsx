import { useState, useEffect, type ComponentPropsWithoutRef } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { sv, enGB } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { calendarSelectClassName } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseLocalDate } from "@/lib/localDate";

interface MonthYearPickerProps extends Omit<ComponentPropsWithoutRef<typeof Button>, 'value' | 'onChange'> {
  value?: string; // YYYY-MM-DD, stored as the first day of the selected month.
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  fromYear?: number;
  toYear?: number;
}

export function MonthYearPicker({
  value, onChange, placeholder, fromYear = 1960,
  toYear = new Date().getFullYear(), className, ...props
}: MonthYearPickerProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('sv') ? sv : enGB;
  const parsedValue = parseLocalDate(value);
  const valueYear = parsedValue?.getFullYear();
  const minYear = Math.min(fromYear, valueYear ?? fromYear);
  const maxYear = Math.max(toYear, valueYear ?? toYear);
  const currentYear = Math.min(maxYear, Math.max(minYear, valueYear ?? new Date().getFullYear()));
  const [open, setOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  useEffect(() => { setSelectedYear(currentYear); }, [value, currentYear]);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index);

  return (
    <Popover open={open} onOpenChange={next => { setOpen(next); if (next) setSelectedYear(currentYear); }}>
      <PopoverTrigger asChild>
        <Button {...props} type="button" variant="outline"
          className={cn("w-full justify-start text-left font-normal", !parsedValue && "text-muted-foreground", className)}>
          <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          {parsedValue ? format(parsedValue, 'LLLL yyyy', { locale }) : placeholder || t('datePicker.pickMonth')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align="start">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{t('datePicker.pickMonth')}</span>
          <select aria-label={t('datePicker.year')} className={calendarSelectClassName} value={selectedYear}
            onChange={event => setSelectedYear(Number(event.target.value))}>
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }, (_, month) => {
            const date = new Date(selectedYear, month, 1);
            const selected = valueYear === selectedYear && parsedValue?.getMonth() === month;
            return <Button key={month} type="button" variant={selected ? 'default' : 'ghost'} size="sm" className="h-9"
              aria-label={format(date, 'LLLL yyyy', { locale })} aria-pressed={selected}
              onClick={() => { onChange(`${selectedYear}-${String(month + 1).padStart(2, '0')}-01`); setOpen(false); }}>
              {format(date, 'LLL', { locale })}
            </Button>;
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
