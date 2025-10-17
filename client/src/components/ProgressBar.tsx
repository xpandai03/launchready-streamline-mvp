import { Progress } from "@/components/ui/progress";

interface ProgressBarProps {
  status: string;
  className?: string;
}

export function ProgressBar({ status, className }: ProgressBarProps) {
  const progressMap: Record<string, number> = {
    pending: 10,
    processing: 50,
    complete: 100,
    error: 0,
  };

  const progress = progressMap[status] || 0;
  const colorClass = status === "error" ? "bg-chart-5" : status === "complete" ? "bg-chart-3" : "bg-chart-4";

  return (
    <div className={className}>
      <Progress value={progress} className="h-2" indicatorClassName={colorClass} />
    </div>
  );
}
