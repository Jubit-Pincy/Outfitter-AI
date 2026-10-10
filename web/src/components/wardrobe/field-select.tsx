"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** A borderless select that reads as editable text in a care-label row. */
export function FieldSelect({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className="h-auto rounded-none border-0 border-b border-transparent bg-transparent px-0 py-0.5 text-[14.5px] font-medium shadow-none transition-colors hover:border-b-ink focus-visible:border-b-ink focus-visible:ring-0"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
