/**
 * AutopilotComposition - Master composition for autopilot videos
 *
 * Assembles 8 scenes into a 60-75 second product demo video:
 * 1. Hook (3-5s) - Attention grabber
 * 2. Problem (8-10s) - Pain point presentation
 * 3. Reveal (8-12s) - Product introduction
 * 4. Features (12-15s) - Benefits list
 * 5. Social Proof (8-10s) - Testimonial/stats
 * 6. Avatar (0-10s) - Optional KIE avatar clip
 * 7. Offer (5-8s) - Price/discount highlight
 * 8. CTA (5-8s) - Call-to-action
 */

import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import type {
  AutopilotCompositionProps,
  AutopilotSceneDurations,
} from '../types/AutopilotSceneProps';
import {
  DEFAULT_AUTOPILOT_SCENE_DURATIONS,
} from '../types/AutopilotSceneProps';
import type { FeatureItem } from '../types/UGCSceneProps';
import { HookScene } from '../scenes/HookScene';
import { ProblemScene } from '../scenes/ProblemScene';
import { RevealScene } from '../scenes/RevealScene';
import { FeaturesScene } from '../scenes/FeaturesScene';
import { SocialProofScene } from '../scenes/SocialProofScene';
import { AvatarScene } from '../scenes/AvatarScene';
import { OfferScene } from '../scenes/OfferScene';
import { CTAScene } from '../scenes/CTAScene';

/**
 * Main Autopilot Composition
 * Uses Record<string, unknown> for Remotion compatibility, with internal type casting
 */
export const AutopilotComposition: React.FC<Record<string, unknown>> = (inputProps) => {
  // Extract and type-cast props with defaults
  const productName = (inputProps.productName as string) || 'Product';
  const productImages = (inputProps.productImages as string[]) || [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
  ];
  const logoUrl = inputProps.logoUrl as string | undefined;
  const price = (inputProps.price as string) || '$49.99';
  const originalPrice = inputProps.originalPrice as string | undefined;

  // Scene content
  const hookText = (inputProps.hookText as string) || 'Stop Scrolling!';
  const problemText = (inputProps.problemText as string) || "Tired of products that don't deliver?";
  const revealText = inputProps.revealText as string | undefined;
  const features = (inputProps.features as FeatureItem[]) || [
    { text: 'Premium Quality Materials', icon: '✓' },
    { text: 'Fast & Free Shipping', icon: '🚚' },
    { text: '30-Day Money Back Guarantee', icon: '💰' },
    { text: '24/7 Customer Support', icon: '💬' },
  ];
  const socialProofText = (inputProps.socialProofText as string) || 'This product changed my life!';
  const socialProofName = inputProps.socialProofName as string | undefined;
  const socialProofRating = inputProps.socialProofRating as number | undefined;
  const discountText = inputProps.discountText as string | undefined;
  const offerText = inputProps.offerText as string | undefined;
  const ctaText = (inputProps.ctaText as string) || 'Shop Now';

  // Audio
  const audioUrls = inputProps.audioUrls as {
    problem?: string;
    reveal?: string;
    features?: string;
    socialProof?: string;
    offer?: string;
    cta?: string;
  } | undefined;

  // Avatar
  const avatarVideoUrl = inputProps.avatarVideoUrl as string | undefined;

  // Scene durations
  const sceneDurations = (inputProps.sceneDurations as AutopilotSceneDurations) || DEFAULT_AUTOPILOT_SCENE_DURATIONS;

  // Calculate cumulative start frames for each scene
  const hookStart = 0;
  const problemStart = hookStart + sceneDurations.hook;
  const revealStart = problemStart + sceneDurations.problem;
  const featuresStart = revealStart + sceneDurations.reveal;
  const socialProofStart = featuresStart + sceneDurations.features;
  const avatarStart = socialProofStart + sceneDurations.socialProof;
  const offerStart = avatarStart + sceneDurations.avatar;
  const ctaStart = offerStart + sceneDurations.offer;

  // Use first product image for various scenes
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

      {/* Scene 2: Problem */}
      {sceneDurations.problem > 0 && (
        <Sequence from={problemStart} durationInFrames={sceneDurations.problem}>
          <ProblemScene
            problemText={problemText}
            productImage={heroImage}
            audioUrl={audioUrls?.problem}
            durationInFrames={sceneDurations.problem}
          />
        </Sequence>
      )}

      {/* Scene 3: Reveal */}
      {sceneDurations.reveal > 0 && (
        <Sequence from={revealStart} durationInFrames={sceneDurations.reveal}>
          <RevealScene
            productName={productName}
            productImages={productImages}
            revealText={revealText}
            audioUrl={audioUrls?.reveal}
            durationInFrames={sceneDurations.reveal}
          />
        </Sequence>
      )}

      {/* Scene 4: Features */}
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

      {/* Scene 5: Social Proof */}
      {sceneDurations.socialProof > 0 && (
        <Sequence from={socialProofStart} durationInFrames={sceneDurations.socialProof}>
          <SocialProofScene
            testimonialText={socialProofText}
            customerName={socialProofName}
            rating={socialProofRating}
            productImage={heroImage}
            audioUrl={audioUrls?.socialProof}
            durationInFrames={sceneDurations.socialProof}
          />
        </Sequence>
      )}

      {/* Scene 6: Avatar (optional) */}
      {sceneDurations.avatar > 0 && avatarVideoUrl && (
        <Sequence from={avatarStart} durationInFrames={sceneDurations.avatar}>
          <AvatarScene
            avatarVideoUrl={avatarVideoUrl}
            durationInFrames={sceneDurations.avatar}
          />
        </Sequence>
      )}

      {/* Scene 7: Offer */}
      {sceneDurations.offer > 0 && (
        <Sequence from={offerStart} durationInFrames={sceneDurations.offer}>
          <OfferScene
            productImage={heroImage}
            price={price}
            originalPrice={originalPrice}
            discountText={discountText}
            offerText={offerText}
            audioUrl={audioUrls?.offer}
            durationInFrames={sceneDurations.offer}
          />
        </Sequence>
      )}

      {/* Scene 8: CTA */}
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
export function calculateAutopilotTotalDuration(sceneDurations: AutopilotSceneDurations): number {
  return (
    sceneDurations.hook +
    sceneDurations.problem +
    sceneDurations.reveal +
    sceneDurations.features +
    sceneDurations.socialProof +
    sceneDurations.avatar +
    sceneDurations.offer +
    sceneDurations.cta
  );
}

/**
 * Generate default props for testing/preview
 */
export function getDefaultAutopilotProps(): AutopilotCompositionProps {
  return {
    productName: 'Premium Wireless Headphones',
    productImages: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800',
    ],
    price: '$79.99',
    originalPrice: '$129.99',
    hookText: 'Still using tangled wires?',
    problemText: "Tired of headphones that hurt your ears and die after an hour?",
    features: [
      { text: 'Crystal Clear Sound Quality', icon: '🎵' },
      { text: '40-Hour Battery Life', icon: '🔋' },
      { text: 'Ultra-Comfortable Memory Foam', icon: '☁️' },
      { text: 'Active Noise Cancellation', icon: '🔇' },
    ],
    socialProofText: 'Best headphones I\'ve ever owned. Worth every penny!',
    socialProofName: 'Sarah M.',
    socialProofRating: 5,
    discountText: '38% OFF',
    offerText: 'Free shipping on orders over $50',
    ctaText: 'Shop Now',
    sceneDurations: {
      hook: 120,        // 4s
      problem: 270,     // 9s
      reveal: 300,      // 10s
      features: 420,    // 14s
      socialProof: 270, // 9s
      avatar: 0,        // Skip avatar
      offer: 180,       // 6s
      cta: 180,         // 6s
    },
  };
}

export default AutopilotComposition;
