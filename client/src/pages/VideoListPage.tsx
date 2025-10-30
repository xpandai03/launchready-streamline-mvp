import { useQuery } from "@tanstack/react-query";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Plus, Video, Loader2 } from "lucide-react";
import { Link } from "wouter";
import type { Task } from "@shared/schema";

export default function VideoListPage() {
  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/videos"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-400">Loading videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-6 md:px-8 pt-24 pb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-white mb-2">
              Video Processing
            </h1>
            <p className="text-gray-400">
              Track and manage your video-to-shorts conversions
            </p>
          </div>
          <Button asChild data-testid="button-new-video">
            <Link href="/">
              <Plus className="h-5 w-5 mr-2" />
              New Video
            </Link>
          </Button>
        </div>

        {!tasks || tasks.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-state">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 mb-6">
              <Video className="h-10 w-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-medium text-white mb-2">
              No videos yet
            </h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Get started by submitting your first video URL to create viral shorts
            </p>
            <Button asChild data-testid="button-get-started">
              <Link href="/">
                <Plus className="h-5 w-5 mr-2" />
                Submit First Video
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4" data-testid="list-videos">
            {tasks.map((task) => (
              <VideoCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
