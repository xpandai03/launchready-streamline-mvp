/**
 * FeaturesScene - Animated benefit list
 *
 * Displays 3 product features/benefits with staggered
 * animations and optional icons.
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
import type { FeaturesSceneProps, FeatureItem } from '../types/UGCSceneProps';

// Default icons if none provided
const DEFAULT_ICONS = ['✓', '★', '♦'];

interface FeatureItemDisplayProps {
  feature: FeatureItem;
  index: number;
  frame: number;
  fps: number;
  totalFeatures: number;
  durationInFrames: number;
}

const FeatureItemDisplay: React.FC<FeatureItemDisplayProps> = ({
  feature,
  index,
  frame,
  fps,
  totalFeatures,
  durationInFrames,
}) => {
  // Stagger each feature's entrance
  const staggerDelay = (durationInFrames / (totalFeatures + 2)) * index;
  const delayedFrame = frame - staggerDelay;

  // Spring animation for entrance
  const progress = spring({
    frame: delayedFrame,
    fps,
    config: {
      damping: 20,
      stiffness: 80,
      mass: 0.8,
    },
  });

  const translateX = interpolate(progress, [0, 1], [-50, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const scale = interpolate(progress, [0, 1], [0.9, 1]);

  // Icon pulse animation (after entrance)
  const pulseProgress = delayedFrame > fps ? (delayedFrame - fps) / fps : 0;
  const iconScale = 1 + Math.sin(pulseProgress * 3) * 0.05;

  const icon = feature.icon || DEFAULT_ICONS[index % DEFAULT_ICONS.length];

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${translateX}px) scale(${scale})`,
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        padding: '24px 32px',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        backdropFilter: 'blur(10px)',
        marginBottom: 20,
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.2)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transform: `scale(${iconScale})`,
          flexShrink: 0,
        }}
      >
        {feature.icon?.startsWith('http') ? (
          <Img
            src={feature.icon}
            style={{ width: 40, height: 40, objectFit: 'contain' }}
          />
        ) : (
          <span style={{ fontSize: 32 }}>{icon}</span>
        )}
      </div>

      {/* Feature text */}
      <p
        style={{
          color: 'white',
          fontSize: 36,
          fontWeight: 600,
          margin: 0,
          lineHeight: 1.3,
          textShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }}
      >
        {feature.text}
      </p>
    </div>
  );
};

export const FeaturesScene: React.FC<FeaturesSceneProps> = ({
  features,
  productImage,
  audioUrl,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background image subtle animation
  const bgScale = interpolate(frame, [0, durationInFrames], [1.05, 1], {
    easing: Easing.out(Easing.ease),
  });

  // Title animation
  const titleProgress = spring({
    frame,
    fps,
    config: {
      damping: 20,
      stiffness: 100,
    },
  });

  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [-20, 0]);

  // Exit fade
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp' }
  );

  // Ensure we have exactly 3 features (pad if needed)
  const displayFeatures: FeatureItem[] = [...features];
  while (displayFeatures.length < 3) {
    displayFeatures.push({ text: 'Premium Quality', icon: '✓' });
  }

  return (
    <AbsoluteFill className="bg-black" style={{ opacity: exitOpacity }}>
      {/* Audio if provided */}
      {audioUrl && <Audio src={audioUrl} />}

      {/* Background product image (blurred) */}
      {productImage && (
        <AbsoluteFill
          style={{
            overflow: 'hidden',
          }}
        >
          <Img
            src={productImage}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${bgScale})`,
              filter: 'blur(15px) brightness(0.4)',
            }}
          />
        </AbsoluteFill>
      )}

      {/* Gradient overlay */}
      <AbsoluteFill
        style={{
          background: productImage
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 100%)'
            : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        }}
      />

      {/* Content */}
      <AbsoluteFill
        style={{
          padding: '120px 48px',
          justifyContent: 'center',
        }}
      >
        {/* Title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            marginBottom: 48,
          }}
        >
          <h2
            style={{
              color: 'white',
              fontSize: 44,
              fontWeight: 700,
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: 4,
              margin: 0,
              textShadow: '0 2px 20px rgba(0,0,0,0.8)',
            }}
          >
            Why You'll Love It
          </h2>
        </div>

        {/* Features list */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {displayFeatures.slice(0, 3).map((feature, index) => (
            <FeatureItemDisplay
              key={index}
              feature={feature}
              index={index}
              frame={frame}
              fps={fps}
              totalFeatures={3}
              durationInFrames={durationInFrames}
            />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default FeaturesScene;
