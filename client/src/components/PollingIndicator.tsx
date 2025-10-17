export function PollingIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="indicator-polling">
      <div className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
      </div>
      <span>Auto-updating...</span>
    </div>
  );
}
