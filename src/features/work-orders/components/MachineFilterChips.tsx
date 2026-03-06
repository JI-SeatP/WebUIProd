import { useEffect, useRef, useState } from "react";
import { apiGet } from "@/api/client";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import type { Machine } from "@/types/machine";

interface MachineFilterChipsProps {
  departement?: number;
  selectedMachines: number[];
  onMachinesChange: (machines: number[]) => void;
  language: "fr" | "en";
}

export function MachineFilterChips({
  departement,
  selectedMachines,
  onMachinesChange,
  language,
}: MachineFilterChipsProps) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const defaultApplied = useRef(false);

  useEffect(() => {
    const params = departement ? `?departement=${departement}` : "";
    apiGet<Machine[]>(`getMachines.cfm${params}`).then((res) => {
      if (res.success) {
        const filtered = res.data.filter((m) => m.MACODE !== "PRESS_NS");
        setMachines(filtered);

        // On initial load only: pre-select Cell 1 machines (FMCODE starts with "C1_")
        if (!defaultApplied.current && selectedMachines.length === 0) {
          defaultApplied.current = true;
          const cell1 = filtered
            .filter((m) => m.FMCODE.toUpperCase().startsWith("C1_"))
            .map((m) => m.MASEQ);
          if (cell1.length > 0) onMachinesChange(cell1);
        }
      }
    });
  }, [departement]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = (maseq: number) => {
    if (selectedMachines.includes(maseq)) {
      onMachinesChange(selectedMachines.filter((id) => id !== maseq));
    } else {
      onMachinesChange([...selectedMachines, maseq]);
    }
  };

  if (machines.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {machines.map((machine) => {
        const isSelected = selectedMachines.includes(machine.MASEQ);
        const label =
          language === "fr" ? machine.MADESC_P : machine.MADESC_S;

        return (
          <Toggle
            key={machine.MASEQ}
            pressed={isSelected}
            onPressedChange={() => handleToggle(machine.MASEQ)}
            className={cn(
              "min-h-[40px] px-3 text-sm font-medium whitespace-normal text-left leading-tight",
              isSelected && "bg-primary text-primary-foreground"
            )}
          >
            <div>
              <div className="font-semibold">{machine.MACODE}</div>
              <div className="text-xs opacity-80 break-words">{label}</div>
            </div>
          </Toggle>
        );
      })}
    </div>
  );
}
