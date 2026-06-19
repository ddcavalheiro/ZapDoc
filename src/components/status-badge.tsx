import { cn } from "@/lib/utils";
import { STATUS_BADGE, STATUS_LABELS, type Status } from "@/lib/status";

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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        STATUS_BADGE[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
