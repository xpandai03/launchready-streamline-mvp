/**
 * UGCComposition - Master composition for UGC videos
 *
 * Assembles 5 scenes into a 30-45 second UGC video:
 * 1. Hook (3-5s) - Attention grabber
 * 2. Showcase (8-12s) - Product images with Ken Burns
 * 3. Features (10-15s) - Benefits list
 * 4. Avatar (5-8s) - Optional KIE avatar clip
 * 5. CTA (3-5s) - Call-to-action
 */

import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import type { UGCCompositionProps, SceneDurations, FeatureItem } from '../types/UGCSceneProps';
import { DEFAULT_SCENE_DURATIONS } from '../types/UGCSceneProps';
import { HookScene } from '../scenes/HookScene';
import { ShowcaseScene } from '../scenes/ShowcaseScene';
import { FeaturesScene } from '../scenes/FeaturesScene';
import { AvatarScene } from '../scenes/AvatarScene';
import { CTAScene } from '../scenes/CTAScene';

/**
 * Main UGC Composition
 * Uses Record<string, unknown> for Remotion compatibility, with internal type casting
 */
export const UGCComposition: React.FC<Record<string, unknown>> = (inputProps) => {
  // Extract and type-cast props with defaults
  const productName = (inputProps.productName as string) || 'Product';
  const productImages = (inputProps.productImages as string[]) || [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
  ];
  const logoUrl = inputProps.logoUrl as string | undefined;
  const hookText = (inputProps.hookText as string) || 'Stop Scrolling!';
  const tagline = inputProps.tagline as string | undefined;
  const features = (inputProps.features as FeatureItem[]) || [
    { text: 'Premium Quality', icon: '✓' },
    { text: 'Fast Shipping', icon: '🚚' },
    { text: 'Money Back Guarantee', icon: '💰' },
  ];
  const ctaText = (inputProps.ctaText as string) || 'Shop Now';
  const audioUrls = inputProps.audioUrls as { showcase?: string; features?: string; cta?: string } | undefined;
  const avatarVideoUrl = inputProps.avatarVideoUrl as string | undefined;
  const sceneDurations = (inputProps.sceneDurations as SceneDurations) || DEFAULT_SCENE_DURATIONS;

  // Calculate cumulative start frames for each scene
  const hookStart = 0;
  const showcaseStart = hookStart + sceneDurations.hook;
  const featuresStart = showcaseStart + sceneDurations.showcase;
  const avatarStart = featuresStart + sceneDurations.features;
  const ctaStart = avatarStart + sceneDurations.avatar;

  // Use first product image for hook and CTA
  const heroImage = productImages[0];

  return (
    <AbsoluteFill className="bg-black">
      {/* Scene 1: Hook */}
      {sceneDurations.hook > 0 && (
        <Sequence from={hookStart} durationInFrames={sceneDurations.hook}>
          <HookScene
            productImage={heroImage}
            hookText={hookText}
            durationInFrames={sceneDurations.hook}
          />
        </Sequence>
      )}

      {/* Scene 2: Showcase */}
      {sceneDurations.showcase > 0 && (
        <Sequence from={showcaseStart} durationInFrames={sceneDurations.showcase}>
          <ShowcaseScene
            productImages={productImages}
            tagline={tagline || productName}
            audioUrl={audioUrls?.showcase}
            durationInFrames={sceneDurations.showcase}
          />
        </Sequence>
      )}

      {/* Scene 3: Features */}
      {sceneDurations.features > 0 && (
        <Sequence from={featuresStart} durationInFrames={sceneDurations.features}>
          <FeaturesScene
            features={features}
            productImage={heroImage}
            audioUrl={audioUrls?.features}
            durationInFrames={sceneDurations.features}
          />
        </Sequence>
      )}

      {/* Scene 4: Avatar (optional) */}
      {sceneDurations.avatar > 0 && avatarVideoUrl && (
        <Sequence from={avatarStart} durationInFrames={sceneDurations.avatar}>
          <AvatarScene
            avatarVideoUrl={avatarVideoUrl}
            durationInFrames={sceneDurations.avatar}
          />
        </Sequence>
      )}

      {/* Scene 5: CTA */}
      {sceneDurations.cta > 0 && (
        <Sequence from={ctaStart} durationInFrames={sceneDurations.cta}>
          <CTAScene
            productImage={heroImage}
            ctaText={ctaText}
            logoUrl={logoUrl}
            audioUrl={audioUrls?.cta}
            durationInFrames={sceneDurations.cta}
          />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

/**
 * Calculate total duration from scene durations
 */
export function calculateTotalDuration(sceneDurations: SceneDurations): number {
  return (
    sceneDurations.hook +
    sceneDurations.showcase +
    sceneDurations.features +
    sceneDurations.avatar +
    sceneDurations.cta
  );
}

/**
 * Generate default props for testing/preview
 */
export function getDefaultUGCProps(): UGCCompositionProps {
  return {
    productName: 'Premium Product',
    productImages: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800',
    ],
    hookText: 'Stop Scrolling!',
    tagline: 'The product you\'ve been waiting for',
    features: [
      { text: 'Premium Quality Materials', icon: '✓' },
      { text: 'Fast & Free Shipping', icon: '🚚' },
      { text: '30-Day Money Back Guarantee', icon: '💰' },
    ],
    ctaText: 'Shop Now',
    sceneDurations: {
      hook: 120,     // 4s
      showcase: 300, // 10s
      features: 360, // 12s
      avatar: 0,     // Skip avatar
      cta: 120,      // 4s
    },
  };
}

export default UGCComposition;
