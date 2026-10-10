import { Briefcase, Dumbbell, Send, Smile, UtensilsCrossed } from "lucide-react";
import type { SlotKind } from "@/lib/types";

const ICONS = {
  Gym: Dumbbell,
  Office: Briefcase,
  Casual: Smile,
  "Dinner out": UtensilsCrossed,
  Travel: Send,
} as const;

export const SLOT_KINDS: SlotKind[] = [
  "Gym",
  "Office",
  "Casual",
  "Dinner out",
  "Travel",
];

export function KindIcon({
  kind,
  className = "size-[15px]",
}: {
  kind: SlotKind;
  className?: string;
}) {
  const Icon = ICONS[kind] ?? Smile;
  return <Icon className={className} strokeWidth={1.6} aria-hidden />;
}
