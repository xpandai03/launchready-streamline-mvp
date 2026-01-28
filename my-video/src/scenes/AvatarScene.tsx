/**
 * AvatarScene - Optional KIE-generated avatar clip
 *
 * Plays a pre-generated avatar video from KIE (Veo3).
 * If no avatar URL is provided, renders nothing (duration should be 0).
 * Audio is embedded in the avatar clip itself.
 */

import React from 'react';
import {
  AbsoluteFill,
  OffthreadVideo,
  useCurrentFrame,
  interpolate,
} from 'remotion';
import type { AvatarSceneProps } from '../types/UGCSceneProps';

export const AvatarScene: React.FC<AvatarSceneProps> = ({
  avatarVideoUrl,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  // If no avatar URL or duration is 0, render nothing
  if (!avatarVideoUrl || durationInFrames === 0) {
    return null;
  }

  // Fade in/out transitions
  const fadeInDuration = 10; // ~0.33s
  const fadeOutDuration = 10;

  const opacity = interpolate(
    frame,
    [0, fadeInDuration, durationInFrames - fadeOutDuration, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Subtle scale animation
  const scale = interpolate(
    frame,
    [0, fadeInDuration, durationInFrames - fadeOutDuration, durationInFrames],
    [1.02, 1, 1, 1.02],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill
      className="bg-black"
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Avatar video - audio is embedded in the clip */}
      <OffthreadVideo
        src={avatarVideoUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale})`,
        }}
      />

      {/* Subtle vignette overlay */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.3) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default AvatarScene;
