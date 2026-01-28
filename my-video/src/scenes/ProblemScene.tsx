/**
 * ProblemScene - Pain point presentation
 *
 * Highlights the customer's problem/frustration that the product solves.
 * Uses dramatic visuals and empathetic narration.
 */

import React from 'react';
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Audio,
  spring,
  Easing,
} from 'remotion';
import type { ProblemSceneProps } from '../types/AutopilotSceneProps';

export const ProblemScene: React.FC<ProblemSceneProps> = ({
  problemText,
  productImage,
  audioUrl,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background animation - slow zoom
  const bgScale = interpolate(frame, [0, durationInFrames], [1, 1.1], {
    easing: Easing.out(Easing.ease),
  });

  // Text entrance animation
  const textProgress = spring({
    frame: frame - 15,
    fps,
    config: {
      damping: 18,
      stiffness: 80,
      mass: 0.8,
    },
  });

  const textOpacity = interpolate(textProgress, [0, 1], [0, 1]);
  const textY = interpolate(textProgress, [0, 1], [40, 0]);

  // Question mark animation
  const questionProgress = spring({
    frame: frame - 45,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });

  const questionScale = interpolate(questionProgress, [0, 1], [0.5, 1]);
  const questionOpacity = interpolate(questionProgress, [0, 1], [0, 1]);

  // Pulsing effect for emphasis
  const pulseFrame = Math.max(0, frame - 60);
  const pulseScale = 1 + Math.sin((pulseFrame / fps) * 2) * 0.02;

  // Exit fade
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp' }
  );

  return (
    <AbsoluteFill className="bg-black" style={{ opacity: exitOpacity }}>
      {/* Audio if provided */}
      {audioUrl && <Audio src={audioUrl} />}

      {/* Background - dark gradient or blurred product image */}
      {productImage ? (
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          <Img
            src={productImage}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${bgScale})`,
              filter: 'blur(20px) brightness(0.3) saturate(0.5)',
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 50%, #1a1a2e 100%)',
          }}
        />
      )}

      {/* Dark overlay with red tint for problem emphasis */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(to bottom, rgba(139,0,0,0.2) 0%, rgba(0,0,0,0.6) 50%, rgba(139,0,0,0.2) 100%)',
        }}
      />

      {/* Question mark decoration */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          opacity: questionOpacity * 0.15,
        }}
      >
        <span
          style={{
            fontSize: 400,
            fontWeight: 900,
            color: 'white',
            transform: `scale(${questionScale * pulseScale})`,
          }}
        >
          ?
        </span>
      </AbsoluteFill>

      {/* Main content */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 60px',
        }}
      >
        {/* Problem label */}
        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY - 20}px)`,
            marginBottom: 24,
          }}
        >
          <span
            style={{
              color: '#ff6b6b',
              fontSize: 24,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 4,
            }}
          >
            The Problem
          </span>
        </div>

        {/* Problem text */}
        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px) scale(${pulseScale})`,
            textAlign: 'center',
          }}
        >
          <p
            style={{
              color: 'white',
              fontSize: 48,
              fontWeight: 600,
              lineHeight: 1.4,
              margin: 0,
              textShadow: '0 4px 30px rgba(0,0,0,0.8)',
            }}
          >
            {problemText}
          </p>
        </div>
      </AbsoluteFill>

      {/* Bottom accent line */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 100,
        }}
      >
        <div
          style={{
            width: interpolate(textProgress, [0, 1], [0, 200]),
            height: 4,
            backgroundColor: '#ff6b6b',
            borderRadius: 2,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default ProblemScene;
