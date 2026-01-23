import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MonthYearPickerProps {
  value?: string; // YYYY-MM-DD format
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  fromYear?: number;
  toYear?: number;
  disabled?: boolean;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function MonthYearPicker({
  value,
  onChange,
  placeholder = "Pick a date",
  fromYear = 1960,
  toYear = new Date().getFullYear(),
  disabled = false,
}: MonthYearPickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"month" | "year">("month");
  
  // Parse the current value
  const parsedValue = useMemo(() => {
    if (!value) return { year: new Date().getFullYear(), month: new Date().getMonth() };
    const date = new Date(value);
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
    };
  }, [value]);
  
  const [selectedYear, setSelectedYear] = useState(parsedValue.year);
  const [selectedMonth, setSelectedMonth] = useState(parsedValue.month);
  
  // Generate years array
  const years = useMemo(() => {
    const result = [];
    for (let y = toYear; y >= fromYear; y--) {
      result.push(y);
    }
    return result;
  }, [fromYear, toYear]);
  
  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setView("month");
  };
  
  const handleMonthSelect = (monthIndex: number) => {
    setSelectedMonth(monthIndex);
    // Create date as first of month in YYYY-MM-DD format
    const dateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    onChange(dateStr);
    setOpen(false);
  };
  
  const displayValue = useMemo(() => {
    if (!value) return null;
    const date = new Date(value);
    return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }, [value]);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-3 pointer-events-auto">
          {/* Header with year selector */}
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              className="font-semibold"
              onClick={() => setView(view === "year" ? "month" : "year")}
            >
              {view === "month" ? selectedYear : "Select Year"}
            </Button>
          </div>
          
          {view === "year" ? (
            <ScrollArea className="h-[240px]">
              <div className="grid grid-cols-3 gap-2 p-1">
                {years.map((year) => (
                  <Button
                    key={year}
                    variant={year === selectedYear ? "default" : "ghost"}
                    size="sm"
                    className="h-9"
                    onClick={() => handleYearSelect(year)}
                  >
                    {year}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {MONTHS.map((month, index) => (
                <Button
                  key={month}
                  variant={
                    value && parsedValue.year === selectedYear && parsedValue.month === index
                      ? "default"
                      : "ghost"
                  }
                  size="sm"
                  className="h-9"
                  onClick={() => handleMonthSelect(index)}
                >
                  {month.slice(0, 3)}
                </Button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
