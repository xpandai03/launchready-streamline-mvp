/**
 * RevealScene - Product introduction with dramatic reveal
 *
 * Introduces the product as the solution to the problem.
 * Features dramatic entrance animation and product showcase.
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
} from 'remotion';
import type { RevealSceneProps } from '../types/AutopilotSceneProps';

export const RevealScene: React.FC<RevealSceneProps> = ({
  productName,
  productImages,
  revealText,
  audioUrl,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Flash effect at start
  const flashOpacity = interpolate(frame, [0, 15], [0.8, 0], {
    extrapolateRight: 'clamp',
  });

  // Product image reveal animation
  const revealProgress = spring({
    frame: frame - 10,
    fps,
    config: {
      damping: 15,
      stiffness: 80,
      mass: 1,
    },
  });

  const imageScale = interpolate(revealProgress, [0, 1], [0.8, 1]);
  const imageOpacity = interpolate(revealProgress, [0, 1], [0, 1]);
  const imageY = interpolate(revealProgress, [0, 1], [50, 0]);

  // "Introducing" text animation
  const introProgress = spring({
    frame: frame - 5,
    fps,
    config: {
      damping: 20,
      stiffness: 100,
    },
  });

  const introOpacity = interpolate(introProgress, [0, 1], [0, 1]);
  const introY = interpolate(introProgress, [0, 1], [-20, 0]);

  // Product name animation (delayed)
  const nameProgress = spring({
    frame: frame - 30,
    fps,
    config: {
      damping: 18,
      stiffness: 90,
    },
  });

  const nameOpacity = interpolate(nameProgress, [0, 1], [0, 1]);
  const nameScale = interpolate(nameProgress, [0, 1], [0.9, 1]);

  // Shine effect on product
  const shineProgress = interpolate(frame, [60, 120], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Glow pulse effect
  const pulseFrame = Math.max(0, frame - 45);
  const glowPulse = 1 + Math.sin((pulseFrame / fps) * 3) * 0.1;

  // Exit fade
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp' }
  );

  // Use first image as hero
  const heroImage = productImages[0];

  return (
    <AbsoluteFill className="bg-black" style={{ opacity: exitOpacity }}>
      {/* Audio if provided */}
      {audioUrl && <Audio src={audioUrl} />}

      {/* Animated gradient background */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(
            ${135 + frame * 0.5}deg,
            #0a0a1a 0%,
            #1a1a3e 30%,
            #0f2847 70%,
            #0a0a1a 100%
          )`,
        }}
      />

      {/* Flash effect */}
      <AbsoluteFill
        style={{
          backgroundColor: 'white',
          opacity: flashOpacity,
        }}
      />

      {/* "Introducing" text */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingTop: 200,
        }}
      >
        <div
          style={{
            opacity: introOpacity,
            transform: `translateY(${introY}px)`,
          }}
        >
          <span
            style={{
              color: '#64b5f6',
              fontSize: 28,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 8,
            }}
          >
            {revealText || 'Introducing'}
          </span>
        </div>
      </AbsoluteFill>

      {/* Product image with glow */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            opacity: imageOpacity,
            transform: `translateY(${imageY}px) scale(${imageScale})`,
            position: 'relative',
          }}
        >
          {/* Glow effect behind image */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 450,
              height: 450,
              transform: `translate(-50%, -50%) scale(${glowPulse})`,
              background: 'radial-gradient(circle, rgba(100,181,246,0.3) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(40px)',
            }}
          />

          {/* Product image */}
          <div
            style={{
              width: 380,
              height: 380,
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(100,181,246,0.2)',
              border: '4px solid rgba(255,255,255,0.15)',
              position: 'relative',
            }}
          >
            <Img
              src={heroImage}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />

            {/* Shine overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(
                  105deg,
                  transparent ${shineProgress * 100 - 30}%,
                  rgba(255,255,255,0.2) ${shineProgress * 100}%,
                  transparent ${shineProgress * 100 + 30}%
                )`,
              }}
            />
          </div>
        </div>
      </AbsoluteFill>

      {/* Product name */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 250,
        }}
      >
        <div
          style={{
            opacity: nameOpacity,
            transform: `scale(${nameScale})`,
            textAlign: 'center',
            padding: '0 48px',
          }}
        >
          <h1
            style={{
              color: 'white',
              fontSize: 56,
              fontWeight: 800,
              margin: 0,
              textShadow: '0 4px 30px rgba(0,0,0,0.8)',
              letterSpacing: 1,
            }}
          >
            {productName}
          </h1>
        </div>
      </AbsoluteFill>

      {/* Decorative sparkles */}
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        {[
          { top: 150, left: 80, delay: 20, size: 24 },
          { top: 300, right: 60, delay: 35, size: 20 },
          { bottom: 350, left: 100, delay: 50, size: 18 },
          { bottom: 400, right: 90, delay: 65, size: 22 },
        ].map((sparkle, index) => {
          const sparkleOpacity = interpolate(
            frame - sparkle.delay,
            [0, 20, 40],
            [0, 1, 0.6],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          const sparkleRotation = frame * (index % 2 === 0 ? 2 : -2);

          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                ...sparkle,
                fontSize: sparkle.size,
                opacity: sparkleOpacity,
                transform: `rotate(${sparkleRotation}deg)`,
                color: '#64b5f6',
              }}
            >
              ✦
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default RevealScene;
