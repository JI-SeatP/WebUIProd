import { useState } from "react";
import { format, parse } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  className?: string;
}

export function DatePicker({ value, onChange, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const { state } = useSession();
  const locale = state.language === "fr" ? fr : enUS;

  const date = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      onChange(format(day, "yyyy-MM-dd"));
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "touch-target w-[165px] justify-start text-left font-normal gap-2 text-[0.94rem] uppercase",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon size={16} />
          {date ? format(date, "dd MMM yyyy", { locale }).toUpperCase() : "—"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.3)]" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          locale={locale}
          className="p-4 [--cell-size:--spacing(10)]"
          classNames={{
            week: "flex w-full mt-3",
            day: "relative w-full h-full p-0.5 text-center select-none aspect-square data-[selected=true]:bg-[#aeffae] data-[selected=true]:rounded-md [&_button[data-selected-single=true]]:bg-transparent [&_button[data-selected-single=true]]:text-black [&_button[data-selected-single=true]]:font-bold",
            today: "bg-accent text-accent-foreground rounded-md",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
