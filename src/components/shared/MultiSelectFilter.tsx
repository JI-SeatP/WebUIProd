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
  disabledValues?: Set<string>;
  /** Number of columns for the options list (default: 1) */
  columns?: number;
  /** Show a "Select All" toggle at the top of the list */
  showSelectAll?: boolean;
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  className,
  searchable = false,
  popoverWidth,
  disabledValues,
  columns = 1,
  showSelectAll = false,
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
          className={cn("touch-target gap-1.5 text-[0.96rem] uppercase shrink-0 px-5", className)}
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
        <div className={cn("max-h-[300px] overflow-auto p-1", columns >= 2 && "grid grid-cols-2 gap-x-2")}>
          {showSelectAll && filteredOptions.length > 1 && (
            <label
              className={cn(
                "flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted cursor-pointer border-b mb-1 pb-2 font-medium",
                columns >= 2 && "col-span-2"
              )}
            >
              <Checkbox
                checked={filteredOptions.every((opt) => selected.includes(opt.value))}
                onCheckedChange={(checked) => {
                  if (checked) {
                    const allValues = filteredOptions.map((opt) => opt.value);
                    onChange([...new Set([...selected, ...allValues])]);
                  } else {
                    const optValues = new Set(filteredOptions.map((opt) => opt.value));
                    onChange(selected.filter((v) => !optValues.has(v)));
                  }
                }}
              />
              <span className="text-sm">{t("actions.selectAll")}</span>
            </label>
          )}
          {filteredOptions.map((opt) => {
            const isDisabled = disabledValues?.has(opt.value);
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex items-center gap-2 px-2 py-2 rounded-md",
                  isDisabled ? "opacity-40 cursor-not-allowed" : "hover:bg-muted cursor-pointer"
                )}
              >
                <Checkbox
                  checked={selected.includes(opt.value)}
                  onCheckedChange={() => !isDisabled && handleToggle(opt.value)}
                  disabled={isDisabled}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            );
          })}
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
