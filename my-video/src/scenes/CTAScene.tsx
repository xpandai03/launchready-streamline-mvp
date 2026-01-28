/**
 * CTAScene - Call-to-action closing scene
 *
 * Displays product image, optional logo, and call-to-action text
 * with attention-grabbing animations.
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
import type { CTASceneProps } from '../types/UGCSceneProps';

export const CTAScene: React.FC<CTASceneProps> = ({
  productImage,
  ctaText,
  logoUrl,
  audioUrl,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Product image entrance with scale
  const imageProgress = spring({
    frame,
    fps,
    config: {
      damping: 15,
      stiffness: 80,
    },
  });

  const imageScale = interpolate(imageProgress, [0, 1], [1.1, 1]);
  const imageOpacity = interpolate(imageProgress, [0, 1], [0, 1]);

  // CTA text animation (delayed)
  const ctaProgress = spring({
    frame: frame - 15, // Delay by ~0.5s
    fps,
    config: {
      damping: 18,
      stiffness: 100,
    },
  });

  const ctaScale = interpolate(ctaProgress, [0, 1], [0.8, 1]);
  const ctaOpacity = interpolate(ctaProgress, [0, 1], [0, 1]);
  const ctaY = interpolate(ctaProgress, [0, 1], [30, 0]);

  // CTA button pulse effect
  const pulseFrame = Math.max(0, frame - 45); // Start after entrance
  const buttonPulse = 1 + Math.sin((pulseFrame / fps) * 4) * 0.03;

  // Logo animation (if present)
  const logoProgress = spring({
    frame: frame - 8,
    fps,
    config: {
      damping: 20,
      stiffness: 90,
    },
  });

  const logoOpacity = interpolate(logoProgress, [0, 1], [0, 1]);
  const logoY = interpolate(logoProgress, [0, 1], [-20, 0]);

  // Gradient background animation
  const gradientProgress = interpolate(frame, [0, durationInFrames], [0, 1]);

  return (
    <AbsoluteFill className="bg-black">
      {/* Audio if provided */}
      {audioUrl && <Audio src={audioUrl} />}

      {/* Animated gradient background */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(
            ${135 + gradientProgress * 45}deg,
            #1a1a2e 0%,
            #16213e 30%,
            #0f3460 70%,
            #1a1a2e 100%
          )`,
        }}
      />

      {/* Product image container */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingTop: 180,
        }}
      >
        <div
          style={{
            opacity: imageOpacity,
            transform: `scale(${imageScale})`,
            width: 400,
            height: 400,
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            border: '4px solid rgba(255,255,255,0.2)',
          }}
        >
          <Img
            src={productImage}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      </AbsoluteFill>

      {/* CTA Text & Button */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 250,
        }}
      >
        <div
          style={{
            opacity: ctaOpacity,
            transform: `translateY(${ctaY}px) scale(${ctaScale})`,
            textAlign: 'center',
            padding: '0 48px',
          }}
        >
          {/* CTA Button */}
          <div
            style={{
              backgroundColor: 'white',
              color: '#1a1a2e',
              fontSize: 40,
              fontWeight: 700,
              padding: '24px 64px',
              borderRadius: 50,
              transform: `scale(${buttonPulse})`,
              boxShadow: '0 10px 40px rgba(255,255,255,0.3)',
              display: 'inline-block',
            }}
          >
            {ctaText}
          </div>
        </div>
      </AbsoluteFill>

      {/* Logo (if provided) */}
      {logoUrl && (
        <AbsoluteFill
          style={{
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: 100,
          }}
        >
          <div
            style={{
              opacity: logoOpacity,
              transform: `translateY(${logoY}px)`,
            }}
          >
            <Img
              src={logoUrl}
              style={{
                height: 60,
                objectFit: 'contain',
                filter: 'brightness(0) invert(1)', // Make logo white
              }}
            />
          </div>
        </AbsoluteFill>
      )}

      {/* Decorative elements */}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
        }}
      >
        {/* Top sparkle */}
        <div
          style={{
            position: 'absolute',
            top: 100,
            right: 80,
            fontSize: 48,
            opacity: 0.6 + Math.sin((frame / fps) * 5) * 0.4,
            transform: `rotate(${frame * 2}deg)`,
          }}
        >
          ✦
        </div>

        {/* Bottom sparkle */}
        <div
          style={{
            position: 'absolute',
            bottom: 400,
            left: 60,
            fontSize: 36,
            opacity: 0.4 + Math.sin((frame / fps) * 4 + 1) * 0.4,
            transform: `rotate(${-frame * 1.5}deg)`,
          }}
        >
          ✦
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default CTAScene;
