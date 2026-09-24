import { dateLocale } from "@/lib/locale";
import { forwardRef, useState, type ComponentPropsWithoutRef } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps extends Omit<ComponentPropsWithoutRef<typeof Button>, 'value' | 'onChange'> {
  value?: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
  fromYear?: number;
  toYear?: number;
}

export const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(
  { value, onChange, placeholder, fromYear = 1960, toYear = new Date().getFullYear() + 10, className, ...props }, ref,
) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const locale = dateLocale(i18n.language);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button {...props} ref={ref} type="button" variant="outline"
          className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground", className)}>
          <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          {value ? format(value, 'PPP', { locale }) : placeholder || t('datePicker.pickDate')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} defaultMonth={value} required initialFocus
          fromYear={Math.min(fromYear, value?.getFullYear() ?? fromYear)}
          toYear={Math.max(toYear, value?.getFullYear() ?? toYear)}
          onSelect={date => { if (date) { onChange(date); setOpen(false); } }} />
      </PopoverContent>
    </Popover>
  );
});
