import { CloudRain, Snowflake } from "lucide-react";
import { cn } from "cn";
import type { Nowcast } from "@/lib/nowcast";

/**
 * "Rain starting in 20 min" — the next two hours of precipitation, in the one
 * sentence that changes what you put on.
 *
 * The Today card and the forecast hero both say it, so they say it the same
 * way: same icon rule, same wording, one place to change either.
 */
export function NowcastLine({
  nowcast,
  className,
}: {
  nowcast: Nowcast;
  className?: string;
}) {
  const Icon = nowcast.kind === "snow" ? Snowflake : CloudRain;
  return (
    <div className={cn("flex items-center gap-1.5 font-medium", className)}>
      <Icon className="size-4 shrink-0" strokeWidth={2} />
      {nowcast.text}
    </div>
  );
}
