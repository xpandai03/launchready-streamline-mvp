/**
 * SocialProofScene - Testimonial and social proof
 *
 * Displays customer testimonials, ratings, or stats
 * to build trust and credibility.
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
import type { SocialProofSceneProps } from '../types/AutopilotSceneProps';

// Star rating component
const StarRating: React.FC<{ rating: number; frame: number; fps: number }> = ({
  rating,
  frame,
  fps,
}) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const starDelay = i * 8;
    const starProgress = spring({
      frame: frame - 30 - starDelay,
      fps,
      config: {
        damping: 15,
        stiffness: 150,
      },
    });

    const isFilled = i <= rating;
    const starScale = interpolate(starProgress, [0, 1], [0, 1]);
    const starOpacity = interpolate(starProgress, [0, 1], [0, 1]);

    stars.push(
      <span
        key={i}
        style={{
          fontSize: 36,
          color: isFilled ? '#ffd700' : 'rgba(255,255,255,0.3)',
          transform: `scale(${starScale})`,
          opacity: starOpacity,
          display: 'inline-block',
          marginRight: 4,
          textShadow: isFilled ? '0 0 20px rgba(255,215,0,0.5)' : 'none',
        }}
      >
        ★
      </span>
    );
  }
  return <div style={{ display: 'flex', justifyContent: 'center' }}>{stars}</div>;
};

export const SocialProofScene: React.FC<SocialProofSceneProps> = ({
  testimonialText,
  customerName,
  rating,
  statNumber,
  productImage,
  audioUrl,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background animation
  const bgScale = interpolate(frame, [0, durationInFrames], [1, 1.08], {
    easing: Easing.out(Easing.ease),
  });

  // Quote marks animation
  const quoteProgress = spring({
    frame: frame - 5,
    fps,
    config: {
      damping: 20,
      stiffness: 100,
    },
  });

  const quoteOpacity = interpolate(quoteProgress, [0, 1], [0, 0.15]);
  const quoteScale = interpolate(quoteProgress, [0, 1], [0.8, 1]);

  // Testimonial text animation
  const textProgress = spring({
    frame: frame - 20,
    fps,
    config: {
      damping: 18,
      stiffness: 80,
      mass: 0.8,
    },
  });

  const textOpacity = interpolate(textProgress, [0, 1], [0, 1]);
  const textY = interpolate(textProgress, [0, 1], [30, 0]);

  // Customer name animation (delayed)
  const nameProgress = spring({
    frame: frame - 60,
    fps,
    config: {
      damping: 20,
      stiffness: 90,
    },
  });

  const nameOpacity = interpolate(nameProgress, [0, 1], [0, 1]);
  const nameY = interpolate(nameProgress, [0, 1], [15, 0]);

  // Stat number animation (if provided)
  const statProgress = spring({
    frame: frame - 15,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });

  const statScale = interpolate(statProgress, [0, 1], [0.5, 1]);
  const statOpacity = interpolate(statProgress, [0, 1], [0, 1]);

  // Exit fade
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp' }
  );

  const hasTestimonial = !!customerName || !!rating;

  return (
    <AbsoluteFill className="bg-black" style={{ opacity: exitOpacity }}>
      {/* Audio if provided */}
      {audioUrl && <Audio src={audioUrl} />}

      {/* Background */}
      {productImage ? (
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          <Img
            src={productImage}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${bgScale})`,
              filter: 'blur(25px) brightness(0.25)',
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          }}
        />
      )}

      {/* Gradient overlay */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.3) 100%)',
        }}
      />

      {/* Quote marks background */}
      {hasTestimonial && (
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 400,
              fontWeight: 900,
              color: 'white',
              opacity: quoteOpacity,
              transform: `scale(${quoteScale})`,
              fontFamily: 'Georgia, serif',
            }}
          >
            "
          </span>
        </AbsoluteFill>
      )}

      {/* Stat number (if provided instead of testimonial) */}
      {statNumber && !hasTestimonial && (
        <AbsoluteFill
          style={{
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingTop: 250,
          }}
        >
          <div
            style={{
              opacity: statOpacity,
              transform: `scale(${statScale})`,
              textAlign: 'center',
            }}
          >
            <span
              style={{
                fontSize: 120,
                fontWeight: 900,
                color: '#64b5f6',
                textShadow: '0 0 60px rgba(100,181,246,0.5)',
              }}
            >
              {statNumber}
            </span>
          </div>
        </AbsoluteFill>
      )}

      {/* Main content */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 60px',
        }}
      >
        {/* Testimonial text */}
        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
            textAlign: 'center',
            maxWidth: 900,
          }}
        >
          <p
            style={{
              color: 'white',
              fontSize: hasTestimonial ? 40 : 48,
              fontWeight: 500,
              lineHeight: 1.5,
              margin: 0,
              fontStyle: hasTestimonial ? 'italic' : 'normal',
              textShadow: '0 2px 20px rgba(0,0,0,0.8)',
            }}
          >
            {hasTestimonial && '"'}
            {testimonialText}
            {hasTestimonial && '"'}
          </p>
        </div>

        {/* Rating stars */}
        {rating && (
          <div style={{ marginTop: 30 }}>
            <StarRating rating={rating} frame={frame} fps={fps} />
          </div>
        )}

        {/* Customer name */}
        {customerName && (
          <div
            style={{
              opacity: nameOpacity,
              transform: `translateY(${nameY}px)`,
              marginTop: 24,
            }}
          >
            <span
              style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: 28,
                fontWeight: 500,
              }}
            >
              — {customerName}
            </span>
          </div>
        )}
      </AbsoluteFill>

      {/* "Social Proof" label at top */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingTop: 120,
        }}
      >
        <div
          style={{
            opacity: textOpacity * 0.8,
          }}
        >
          <span
            style={{
              color: '#64b5f6',
              fontSize: 20,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 4,
            }}
          >
            {hasTestimonial ? 'What Customers Say' : 'Trusted by Thousands'}
          </span>
        </div>
      </AbsoluteFill>

      {/* Decorative elements */}
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        {/* Top left decoration */}
        <div
          style={{
            position: 'absolute',
            top: 180,
            left: 40,
            width: 60,
            height: 3,
            backgroundColor: '#64b5f6',
            opacity: textOpacity * 0.6,
            borderRadius: 2,
          }}
        />
        {/* Bottom right decoration */}
        <div
          style={{
            position: 'absolute',
            bottom: 180,
            right: 40,
            width: 60,
            height: 3,
            backgroundColor: '#64b5f6',
            opacity: textOpacity * 0.6,
            borderRadius: 2,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default SocialProofScene;
