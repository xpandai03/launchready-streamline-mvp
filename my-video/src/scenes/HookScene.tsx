/**
 * HookScene - Attention-grabbing intro
 *
 * Displays hero product image with bold, animated text
 * to capture viewer attention in the first 3-5 seconds.
 */

import React from 'react';
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from 'remotion';
import type { HookSceneProps } from '../types/UGCSceneProps';

export const HookScene: React.FC<HookSceneProps> = ({
  productImage,
  hookText,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Image scale animation - subtle zoom in
  const imageScale = interpolate(frame, [0, durationInFrames], [1, 1.08], {
    easing: Easing.out(Easing.ease),
  });

  // Text animation with spring physics
  const textProgress = spring({
    frame: frame - 8, // Delay text by ~0.25s
    fps,
    config: {
      damping: 15,
      stiffness: 100,
      mass: 0.8,
    },
  });

  const textScale = interpolate(textProgress, [0, 1], [0.8, 1]);
  const textOpacity = interpolate(textProgress, [0, 1], [0, 1]);
  const textY = interpolate(textProgress, [0, 1], [30, 0]);

  // Pulsing effect for the hook text
  const pulseFrame = (frame - 30) % 60; // Start pulsing after initial animation
  const pulseScale =
    frame > 30
      ? interpolate(pulseFrame, [0, 30, 60], [1, 1.02, 1], {
          easing: Easing.inOut(Easing.ease),
        })
      : 1;

  // Background flash effect at start
  const flashOpacity = interpolate(frame, [0, 8], [0.3, 0], {
    extrapolateRight: 'clamp',
  });

  // Exit fade
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp' }
  );

  return (
    <AbsoluteFill className="bg-black" style={{ opacity: exitOpacity }}>
      {/* Hero product image */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        <Img
          src={productImage}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${imageScale})`,
          }}
        />
      </AbsoluteFill>

      {/* Dark overlay for text contrast */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* Flash effect */}
      <AbsoluteFill
        style={{
          backgroundColor: 'white',
          opacity: flashOpacity,
        }}
      />

      {/* Hook text */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 40px',
        }}
      >
        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px) scale(${textScale * pulseScale})`,
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              color: 'white',
              fontSize: 64,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 2,
              textShadow: '0 4px 30px rgba(0,0,0,0.9)',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {hookText}
          </h1>
        </div>
      </AbsoluteFill>

      {/* Decorative elements */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 120,
        }}
      >
        <div
          style={{
            opacity: textOpacity * 0.8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {/* Animated arrow down indicator */}
          <div
            style={{
              color: 'white',
              fontSize: 32,
              animation: 'bounce 1s infinite',
              transform: `translateY(${Math.sin((frame / fps) * 4) * 5}px)`,
            }}
          >
            ↓
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default HookScene;
