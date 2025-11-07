/**
 * UGC Ad Preview Modal - Phase 4.6
 *
 * Full-screen modal for viewing and acting on AI-generated UGC ads
 * - Displays image or video preview
 * - Actions: Use for Video, Post, Schedule, Download
 * - Integrates with existing posting and scheduling flows
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertDescription } from './ui/alert';
import {
  Sparkles,
  Calendar,
  Download,
  Video as VideoIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MediaAsset {
  id: string;
  userId: string;
  provider: string;
  type: 'image' | 'video';
  prompt: string;
  referenceImageUrl?: string;
  status: 'processing' | 'ready' | 'error';
  taskId?: string;
  resultUrl?: string;
  resultUrls?: string[];
  errorMessage?: string;
  retryCount: number;
  metadata?: any;
  apiResponse?: any;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface UGCAdPreviewModalProps {
  asset: MediaAsset | null;
  onClose: () => void;
}

export function UGCAdPreviewModal({ asset, onClose }: UGCAdPreviewModalProps) {
  const [caption, setCaption] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [showPostFlow, setShowPostFlow] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (!asset) return null;

  // Robust URL extraction
  const getMediaUrl = (): string | null => {
    return (
      asset.resultUrl ||
      (asset as any).result_url ||
      asset.resultUrls?.[0] ||
      asset.metadata?.resultUrls?.[0] ||
      asset.metadata?.outputs?.[0]?.url ||
      asset.metadata?.resultUrl ||
      asset.apiResponse?.data?.resultUrl ||
      null
    );
  };

  const mediaUrl = getMediaUrl();

  // Use for Video mutation (image → video)
  const useForVideoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/ai/media/use-for-video', {
        sourceAssetId: asset.id,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/media'] });
      toast({
        title: 'Video generation started! 🎬',
        description: 'Check the gallery for your new video (usually 1-2 minutes).',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to start video generation',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  // Post mutation (reuses existing social posting)
  const postMutation = useMutation({
    mutationFn: async () => {
      let scheduledForUTC: string | undefined = undefined;

      if (isScheduled && scheduledDateTime) {
        const localDate = new Date(scheduledDateTime);
        scheduledForUTC = localDate.toISOString();
      }

      const response = await apiRequest('POST', '/api/social/post', {
        videoUrl: mediaUrl,
        platform: 'instagram',
        caption,
        ...(scheduledForUTC && { scheduledFor: scheduledForUTC }),
      });

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      toast({
        title: isScheduled ? 'Post scheduled! 🗓️' : 'Posted successfully! 🎉',
        description: isScheduled
          ? 'Your UGC ad will be posted at the scheduled time.'
          : 'Your UGC ad is now live on Instagram!',
      });
      setShowPostFlow(false);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to post',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const handleUseForVideo = () => {
    useForVideoMutation.mutate();
  };

  const handleShowPostFlow = () => {
    setShowPostFlow(true);
  };

  const handlePost = () => {
    postMutation.mutate();
  };

  const handleClose = () => {
    if (!postMutation.isPending && !useForVideoMutation.isPending) {
      setCaption('');
      setIsScheduled(false);
      setScheduledDateTime('');
      setShowPostFlow(false);
      postMutation.reset();
      useForVideoMutation.reset();
      onClose();
    }
  };

  const formatProviderName = (provider: string) => {
    const providerNames: Record<string, string> = {
      'kie-veo3': 'KIE Veo3',
      'kie-4o-image': 'KIE 4O Image',
      'kie-flux-kontext': 'KIE Flux Kontext',
      'gemini-flash': 'Gemini Flash',
    };
    return providerNames[provider] || provider;
  };

  return (
    <Dialog open={!!asset} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-black/95 backdrop-blur-md border-white/20 text-white">
        <DialogHeader className="border-b border-white/10 pb-4">
          <DialogTitle className="text-xl font-semibold">
            {asset.type === 'image' ? '📸 UGC Ad Image' : '🎬 UGC Ad Video'}
          </DialogTitle>
          <DialogDescription className="text-white/70">
            <div className="flex items-center gap-2 text-sm mt-2">
              <span>{formatProviderName(asset.provider)}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(asset.createdAt), { addSuffix: true })}</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Preview Section */}
        <div className="space-y-4">
          {/* Media Preview */}
          <div className="flex justify-center items-center bg-black/40 rounded-lg p-6">
            {asset.type === 'image' && mediaUrl ? (
              <img
                src={mediaUrl}
                alt={asset.prompt}
                className="max-h-[500px] rounded-lg shadow-xl object-contain"
              />
            ) : asset.type === 'video' && mediaUrl ? (
              <video
                src={mediaUrl}
                controls
                className="max-h-[500px] rounded-lg shadow-xl"
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <ImageIcon className="h-12 w-12 text-white/30 mb-3" />
                <p className="text-white/50">Media preview unavailable</p>
              </div>
            )}
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white/90">Original Prompt</Label>
            <p className="text-sm text-white/70 bg-white/5 border border-white/10 rounded-lg p-3">
              {asset.prompt}
            </p>
          </div>

          {/* Actions */}
          {!showPostFlow && (
            <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
              {/* Use for Video (only for images) */}
              {asset.type === 'image' && mediaUrl && (
                <Button
                  onClick={handleUseForVideo}
                  disabled={useForVideoMutation.isPending}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {useForVideoMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <VideoIcon className="h-4 w-4 mr-2" />
                      Use for Video
                    </>
                  )}
                </Button>
              )}

              {/* Post/Schedule (only for videos with URL) */}
              {asset.type === 'video' && mediaUrl && (
                <Button
                  onClick={handleShowPostFlow}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Post / Schedule
                </Button>
              )}

              {/* Download */}
              {mediaUrl && (
                <Button
                  asChild
                  variant="outline"
                  className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                  <a href={mediaUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
              )}
            </div>
          )}

          {/* Post Flow (caption + schedule) */}
          {showPostFlow && (
            <div className="space-y-4 border-t border-white/10 pt-4">
              {postMutation.isIdle && (
                <>
                  {/* Caption */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="caption" className="text-sm font-medium">
                        Caption (optional)
                      </Label>
                    </div>
                    <Textarea
                      id="caption"
                      placeholder="Add a caption for your post..."
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      maxLength={2200}
                      rows={4}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-none"
                      disabled={postMutation.isPending}
                    />
                    <p className="text-xs text-white/50">
                      {caption.length} / 2200 characters
                    </p>
                  </div>

                  {/* Schedule Toggle */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="schedule-post"
                        checked={isScheduled}
                        onCheckedChange={(checked) => setIsScheduled(checked === true)}
                        disabled={postMutation.isPending}
                      />
                      <Label
                        htmlFor="schedule-post"
                        className="text-sm font-medium cursor-pointer flex items-center gap-2"
                      >
                        <Calendar className="h-4 w-4" />
                        Schedule post for later
                      </Label>
                    </div>

                    {isScheduled && (
                      <div className="space-y-2 pl-6">
                        <Label htmlFor="scheduled-datetime" className="text-sm">
                          Select date and time
                        </Label>
                        <Input
                          id="scheduled-datetime"
                          type="datetime-local"
                          value={scheduledDateTime}
                          onChange={(e) => setScheduledDateTime(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                          disabled={postMutation.isPending}
                          className="w-full bg-white/10 border-white/20 text-white"
                        />
                        <p className="text-xs text-white/50">
                          Your post will be published at this time (converts to UTC automatically)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowPostFlow(false)}
                      variant="outline"
                      disabled={postMutation.isPending}
                      className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handlePost}
                      disabled={postMutation.isPending || (isScheduled && !scheduledDateTime)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {postMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isScheduled ? 'Scheduling...' : 'Posting...'}
                        </>
                      ) : (
                        <>
                          {isScheduled && <Calendar className="mr-2 h-4 w-4" />}
                          {isScheduled ? 'Schedule Post' : 'Post Now'}
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}

              {postMutation.isSuccess && (
                <Alert className="border-green-500 bg-green-500/20">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <AlertDescription>
                    <p className="font-medium text-white">
                      {isScheduled ? 'Post scheduled successfully!' : 'Posted successfully!'}
                    </p>
                    <p className="text-sm text-white/70 mt-1">
                      {isScheduled
                        ? 'Your UGC ad will be posted at the scheduled time.'
                        : 'Your UGC ad is now live on Instagram!'}
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {postMutation.isError && (
                <Alert className="border-red-500 bg-red-500/20">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription>
                    <p className="font-medium text-white">Failed to post</p>
                    <p className="text-sm text-white/70 mt-1">
                      {(postMutation.error as any)?.message || 'Please try again'}
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
