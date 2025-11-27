import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Video, Sparkles, ListVideo } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { LimitReachedDialog } from "@/components/LimitReachedDialog";
import { WaveBackground } from "@/components/ui/wave-background";

// Slider configuration constants
const CLIP_COUNT_CONFIG = {
  min: 1,
  max: 10,
  default: 3,
} as const;

const DURATION_CONFIG = {
  min: 1,
  max: 180,
  default: 30,
} as const;

export default function HomePage() {
  const [urls, setUrls] = useState("");
  const [email, setEmail] = useState("");

  const [targetClipCount, setTargetClipCount] = useState<number>(CLIP_COUNT_CONFIG.default);
  const [minimumDuration, setMinimumDuration] = useState<number>(DURATION_CONFIG.default);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    setLocation("/ai-studio")
  }, [])
  const processVideoMutation = useMutation({
    mutationFn: async ({
      videoUrl,
      email,
      targetClipCount,
      minimumDuration
    }: {
      videoUrl: string;
      email: string;
      targetClipCount: number;
      minimumDuration: number;
    }) => {
      const response = await apiRequest("POST", "/api/process-video-advanced", {
        url: videoUrl,
        email: email || undefined,
        targetClipCount,
        minimumDuration,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      console.log(data);
      toast({
        title: "Processing Started",
        description:
          "Your video is being converted. This may take several minutes.",
      });

      setUrls("");
      setEmail("");
      setTimeout(() => {
        setLocation(`/details/${data.taskId}`);
      }, 1000);
    },
    onError: (error: any) => {
      // Check if error is due to usage limits
      const errorMessage = error.message || "";
      if (errorMessage.toLowerCase().includes("limit") ||
        errorMessage.toLowerCase().includes("free tier")) {
        setShowLimitDialog(true);
        return;
      }

      toast({
        title: "Error",
        description: errorMessage || "Failed to start processing. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!urls.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a video URL.",
        variant: "destructive",
      });
      return;
    }

    const url = urls.trim();

    // Validate URL
    if (!url.match(/^https?:\/\/.+/)) {
      toast({
        title: "Invalid URL",
        description: "Please use a valid HTTP/HTTPS URL.",
        variant: "destructive",
      });
      return;
    }

    processVideoMutation.mutate({
      videoUrl: url,
      email: email.trim(),
      targetClipCount,
      minimumDuration
    });
  };

  return (
    <div className="min-h-screen w-full bg-black overflow-hidden relative">
      <WaveBackground />

      {/* Content overlay */}
      <div className="relative z-50 min-h-screen flex items-center justify-center px-4 pt-32 pb-12">
        <div className="w-full max-w-2xl mt-8">
          {/* Form Card with Glass-morphism */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl" data-testid="card-url-input">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-2">
                <Video className="h-5 w-5 text-blue-400" />
                Submit Video URL
              </h2>
              <p className="text-gray-300/70 text-sm">
                Enter a YouTube or video URL to generate viral-ready short clips
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="video-url" className="text-white">Video URL</Label>
                <Input
                  id="video-url"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  className="text-base font-mono bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-500"
                  data-testid="input-video-url"
                />
                <p className="text-xs text-gray-400">
                  Supports YouTube, S3, Google Cloud Storage, and public HTTP/HTTPS URLs
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email (Optional)</Label>
                <input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-9 w-full rounded-md border bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-500 px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  data-testid="input-email"
                />
                <p className="text-xs text-gray-400">
                  We'll notify you when your video is ready
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="clip-count" className="text-white">Target Clip Count</Label>
                  <span className="text-sm font-medium text-white" data-testid="text-clip-count">
                    {targetClipCount}
                  </span>
                </div>
                <Slider
                  id="clip-count"
                  min={CLIP_COUNT_CONFIG.min}
                  max={CLIP_COUNT_CONFIG.max}
                  step={1}
                  value={[targetClipCount]}
                  onValueChange={(values) => setTargetClipCount(values[0])}
                  data-testid="slider-clip-count"
                  className="[&_[role=slider]]:bg-blue-500"
                />
                <p className="text-xs text-gray-400">
                  Number of short clips to generate ({CLIP_COUNT_CONFIG.min}-{CLIP_COUNT_CONFIG.max})
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="min-duration" className="text-white">Minimum Duration</Label>
                  <span className="text-sm font-medium text-white" data-testid="text-min-duration">
                    {minimumDuration}s
                  </span>
                </div>
                <Slider
                  id="min-duration"
                  min={DURATION_CONFIG.min}
                  max={DURATION_CONFIG.max}
                  step={1}
                  value={[minimumDuration]}
                  onValueChange={(values) => setMinimumDuration(values[0])}
                  data-testid="slider-min-duration"
                  className="[&_[role=slider]]:bg-blue-500"
                />
                <p className="text-xs text-gray-400">
                  Minimum clip length in seconds ({DURATION_CONFIG.min}-{DURATION_CONFIG.max}s)
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white"
                disabled={processVideoMutation.isPending}
                data-testid="button-submit-urls"
              >
                {processVideoMutation.isPending ? (
                  <>Processing Video...</>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Convert to Shorts
                  </>
                )}
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full h-12 text-base bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white"
                data-testid="button-view-videos"
              >
                <Link href="/videos">
                  <ListVideo className="h-5 w-5 mr-2" />
                  View All Videos
                </Link>
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Limit Reached Dialog */}
      <LimitReachedDialog
        open={showLimitDialog}
        onOpenChange={setShowLimitDialog}
        limitType="video"
        current={3}
        limit={3}
      />
    </div>
  );
}
