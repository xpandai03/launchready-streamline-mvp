import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      label: "Pending",
      variant: "secondary" as const,
      className: "bg-chart-2/10 text-chart-2 border-chart-2/20",
    },
    processing: {
      icon: Loader2,
      label: "Processing",
      variant: "secondary" as const,
      className: "bg-chart-4/10 text-chart-4 border-chart-4/20",
      animate: true,
    },
    complete: {
      icon: CheckCircle2,
      label: "Complete",
      variant: "secondary" as const,
      className: "bg-chart-3/10 text-chart-3 border-chart-3/20",
    },
    error: {
      icon: XCircle,
      label: "Failed",
      variant: "secondary" as const,
      className: "bg-chart-5/10 text-chart-5 border-chart-5/20",
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`gap-1.5 ${config.className} ${className || ""}`} data-testid={`badge-status-${status}`}>
      <Icon className={`h-3 w-3 ${config.animate ? "animate-spin" : ""}`} />
      <span className="text-xs font-medium">{config.label}</span>
    </Badge>
  );
}
