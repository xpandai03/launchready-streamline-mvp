import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";

interface VideoPreviewProps {
  src: string;
  title?: string;
  className?: string;
}

export function VideoPreview({ src, title, className = "" }: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);

  const handlePlayPause = () => {
    if (!videoRef) return;
    
    if (isPlaying) {
      videoRef.pause();
    } else {
      videoRef.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleMuteToggle = () => {
    if (!videoRef) return;
    videoRef.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleFullscreen = () => {
    if (!videoRef) return;
    if (videoRef.requestFullscreen) {
      videoRef.requestFullscreen();
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
  };

  return (
    <div className={`relative group ${className}`}>
      <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden relative">
        <video
          ref={setVideoRef}
          src={src}
          className="w-full h-full object-contain"
          muted={isMuted}
          playsInline
          onEnded={handleVideoEnd}
          data-testid="video-preview"
        />
        
        {/* Controls overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            onClick={handlePlayPause}
            className="h-16 w-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm"
            data-testid="button-play-pause"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8 text-white" />
            ) : (
              <Play className="h-8 w-8 text-white ml-1" />
            )}
          </Button>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-between gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleMuteToggle}
              className="h-8 w-8 hover:bg-white/20"
              data-testid="button-mute-toggle"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-white" />
              ) : (
                <Volume2 className="h-4 w-4 text-white" />
              )}
            </Button>
            
            <Button
              size="icon"
              variant="ghost"
              onClick={handleFullscreen}
              className="h-8 w-8 hover:bg-white/20"
              data-testid="button-fullscreen"
            >
              <Maximize className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>

        {/* Title overlay (top left) */}
        {title && (
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
            <p className="text-sm text-white font-medium line-clamp-1">{title}</p>
          </div>
        )}
      </div>
    </div>
  );
}
