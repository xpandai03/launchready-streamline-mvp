/**
 * OfferScene - Price and discount highlight
 *
 * Showcases the product price, any discounts,
 * and creates urgency for purchase.
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
import type { OfferSceneProps } from '../types/AutopilotSceneProps';

export const OfferScene: React.FC<OfferSceneProps> = ({
  productImage,
  price,
  originalPrice,
  discountText,
  offerText,
  audioUrl,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Product image animation
  const imageProgress = spring({
    frame,
    fps,
    config: {
      damping: 18,
      stiffness: 80,
    },
  });

  const imageScale = interpolate(imageProgress, [0, 1], [1.1, 1]);
  const imageOpacity = interpolate(imageProgress, [0, 1], [0, 1]);

  // Discount badge animation (if present)
  const badgeProgress = spring({
    frame: frame - 10,
    fps,
    config: {
      damping: 12,
      stiffness: 150,
    },
  });

  const badgeScale = interpolate(badgeProgress, [0, 1], [0, 1]);
  const badgeRotation = interpolate(badgeProgress, [0, 0.5, 1], [0, -10, -5]);

  // Price animation
  const priceProgress = spring({
    frame: frame - 25,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });

  const priceScale = interpolate(priceProgress, [0, 1], [0.8, 1]);
  const priceOpacity = interpolate(priceProgress, [0, 1], [0, 1]);

  // Original price strikethrough animation
  const strikeProgress = interpolate(
    frame,
    [45, 65],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Offer text animation (delayed)
  const offerProgress = spring({
    frame: frame - 50,
    fps,
    config: {
      damping: 20,
      stiffness: 90,
    },
  });

  const offerOpacity = interpolate(offerProgress, [0, 1], [0, 1]);
  const offerY = interpolate(offerProgress, [0, 1], [20, 0]);

  // Price pulse effect
  const pulseFrame = Math.max(0, frame - 60);
  const pricePulse = 1 + Math.sin((pulseFrame / fps) * 4) * 0.03;

  // Exit fade
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp' }
  );

  const hasDiscount = !!originalPrice || !!discountText;

  return (
    <AbsoluteFill className="bg-black" style={{ opacity: exitOpacity }}>
      {/* Audio if provided */}
      {audioUrl && <Audio src={audioUrl} />}

      {/* Animated gradient background */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(
            ${160 + frame * 0.3}deg,
            #1a1a2e 0%,
            #2d1f3d 30%,
            #1a1a2e 60%,
            #0f2847 100%
          )`,
        }}
      />

      {/* Product image */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-start',
          alignItems: 'center',
          paddingTop: 150,
        }}
      >
        <div
          style={{
            opacity: imageOpacity,
            transform: `scale(${imageScale})`,
            position: 'relative',
          }}
        >
          {/* Glow effect */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 380,
              height: 380,
              transform: 'translate(-50%, -50%)',
              background: hasDiscount
                ? 'radial-gradient(circle, rgba(255,107,107,0.2) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(100,181,246,0.2) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(30px)',
            }}
          />

          {/* Product image */}
          <div
            style={{
              width: 300,
              height: 300,
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              border: '3px solid rgba(255,255,255,0.15)',
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

          {/* Discount badge */}
          {discountText && (
            <div
              style={{
                position: 'absolute',
                top: -15,
                right: -15,
                backgroundColor: '#ff6b6b',
                color: 'white',
                fontSize: 24,
                fontWeight: 800,
                padding: '12px 20px',
                borderRadius: 12,
                transform: `scale(${badgeScale}) rotate(${badgeRotation}deg)`,
                boxShadow: '0 8px 25px rgba(255,107,107,0.4)',
              }}
            >
              {discountText}
            </div>
          )}
        </div>
      </AbsoluteFill>

      {/* Price section */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: 250,
        }}
      >
        <div
          style={{
            opacity: priceOpacity,
            transform: `scale(${priceScale * pricePulse})`,
            textAlign: 'center',
          }}
        >
          {/* Original price (if discounted) */}
          {originalPrice && (
            <div style={{ marginBottom: 8, position: 'relative', display: 'inline-block' }}>
              <span
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 36,
                  fontWeight: 500,
                }}
              >
                {originalPrice}
              </span>
              {/* Strikethrough line */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  height: 3,
                  backgroundColor: '#ff6b6b',
                  width: `${strikeProgress * 100}%`,
                  transform: 'translateY(-50%) rotate(-5deg)',
                }}
              />
            </div>
          )}

          {/* Current price */}
          <div>
            <span
              style={{
                color: 'white',
                fontSize: 80,
                fontWeight: 900,
                textShadow: hasDiscount
                  ? '0 0 40px rgba(255,107,107,0.4)'
                  : '0 0 40px rgba(100,181,246,0.3)',
                letterSpacing: -2,
              }}
            >
              {price}
            </span>
          </div>
        </div>
      </AbsoluteFill>

      {/* Offer text */}
      {offerText && (
        <AbsoluteFill
          style={{
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: 280,
          }}
        >
          <div
            style={{
              opacity: offerOpacity,
              transform: `translateY(${offerY}px)`,
              padding: '0 48px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: 32,
                fontWeight: 500,
                margin: 0,
              }}
            >
              {offerText}
            </p>
          </div>
        </AbsoluteFill>
      )}

      {/* "Special Offer" label */}
      {hasDiscount && (
        <AbsoluteFill
          style={{
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingTop: 80,
          }}
        >
          <div style={{ opacity: imageOpacity }}>
            <span
              style={{
                color: '#ff6b6b',
                fontSize: 22,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 4,
              }}
            >
              Limited Time Offer
            </span>
          </div>
        </AbsoluteFill>
      )}

      {/* Bottom decorative elements */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 150,
        }}
      >
        {/* Urgency indicator */}
        <div
          style={{
            opacity: offerOpacity * 0.7,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 20,
              color: hasDiscount ? '#ff6b6b' : '#64b5f6',
            }}
          >
            🔥
          </span>
          <span
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: 18,
              fontWeight: 500,
            }}
          >
            Selling Fast
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default OfferScene;
