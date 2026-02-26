import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Search } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  searchable?: boolean;
  popoverWidth?: string;
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  className,
  searchable = false,
  popoverWidth,
}: MultiSelectFilterProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchable || !search) return options;
    const term = search.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(term));
  }, [options, search, searchable]);

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("touch-target gap-1.5 text-sm shrink-0 px-5", className)}
        >
          {selected.length === 1
            ? options.find((o) => o.value === selected[0])?.label ?? label
            : label}
          {selected.length > 1 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs ml-0.5">
              {selected.length}
            </Badge>
          )}
          <ChevronDown size={14} className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0", popoverWidth ?? (searchable ? "w-[300px]" : "w-[220px]"))} align="start">
        {searchable && (
          <div className="p-2 border-b">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                className="h-8 pl-8 text-sm"
                placeholder={t("actions.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        )}
        <div className="max-h-[300px] overflow-auto p-1">
          {filteredOptions.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(opt.value)}
                onCheckedChange={() => handleToggle(opt.value)}
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <div className="border-t p-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={handleClear}
            >
              {t("actions.cancel")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
