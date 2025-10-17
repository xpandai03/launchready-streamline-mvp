import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, Sparkles, Zap, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createVideoMutation = useMutation({
    mutationFn: async (sourceVideoUrl: string) => {
      const response = await apiRequest("POST", "/api/videos", { sourceVideoUrl });
      return response as { taskId: string; status: string };
    },
    onSuccess: (data) => {
      toast({
        title: "Processing Started",
        description: "Your video is being analyzed to create viral shorts.",
      });
      setLocation(`/details/${data.taskId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start processing. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a video URL to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!url.match(/^https?:\/\/.+/)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid HTTP/HTTPS URL.",
        variant: "destructive",
      });
      return;
    }

    createVideoMutation.mutate(url);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Video className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            YouTube to Shorts Converter
          </h1>
          <p className="text-muted-foreground">
            Transform your long-form videos into viral-ready shorts with AI-powered analysis
          </p>
        </div>

        <Card data-testid="card-url-input">
          <CardHeader>
            <CardTitle>Submit Video URL</CardTitle>
            <CardDescription>
              Enter a YouTube URL or direct video link to generate short clips
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="video-url">Video URL</Label>
                <Input
                  id="video-url"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-12 text-base"
                  data-testid="input-video-url"
                />
                <p className="text-xs text-muted-foreground">
                  Supports YouTube, S3, Google Cloud Storage, and public HTTP/HTTPS URLs
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={createVideoMutation.isPending}
                data-testid="button-submit-url"
              >
                {createVideoMutation.isPending ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate Shorts
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-card border border-card-border">
            <Zap className="h-6 w-6 text-primary mx-auto mb-2" />
            <h3 className="text-sm font-medium text-foreground mb-1">AI-Powered</h3>
            <p className="text-xs text-muted-foreground">Automatic clip selection</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-card border border-card-border">
            <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
            <h3 className="text-sm font-medium text-foreground mb-1">Virality Score</h3>
            <p className="text-xs text-muted-foreground">Ranked by engagement potential</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-card border border-card-border">
            <Video className="h-6 w-6 text-primary mx-auto mb-2" />
            <h3 className="text-sm font-medium text-foreground mb-1">Export Ready</h3>
            <p className="text-xs text-muted-foreground">Download in high quality</p>
          </div>
        </div>
      </div>
    </div>
  );
}
