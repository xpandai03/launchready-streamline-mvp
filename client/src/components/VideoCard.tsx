import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { Video, Calendar, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import type { Task } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface VideoCardProps {
  task: Task;
}

export function VideoCard({ task }: VideoCardProps) {
  const displayUrl = task.sourceVideoUrl.length > 60 
    ? task.sourceVideoUrl.substring(0, 60) + "..." 
    : task.sourceVideoUrl;

  return (
    <Link href={`/details/${task.id}`} data-testid={`link-video-${task.id}`}>
      <Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.25)] hover:bg-white/10 transition-all cursor-pointer rounded-xl" data-testid={`card-video-${task.id}`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center">
              <Video className="h-8 w-8 text-white/70" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-white truncate mb-1">
                    Video Processing Task
                  </h3>
                  <p className="text-sm text-white/70 font-mono truncate">
                    {displayUrl}
                  </p>
                </div>
                <StatusBadge status={task.status} />
              </div>

              <div className="flex items-center gap-4 mt-3 text-xs text-white/60">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</span>
                </div>
                {task.status === "ready" && task.outputId && (
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                    <span className="text-green-400 font-medium">Shorts generated</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
