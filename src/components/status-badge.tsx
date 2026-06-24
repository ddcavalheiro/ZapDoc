import { cn } from "@/lib/utils";
import {
  STATUS_BADGE,
  STATUS_COLOR,
  STATUS_LABELS,
  type Status,
} from "@/lib/status";

export function StatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        STATUS_BADGE[status],
        className,
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: STATUS_COLOR[status] }}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
