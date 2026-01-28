/**
 * Autopilot Video Scene Props (Jan 2026)
 *
 * Type definitions for the extended 60-75 second autopilot video system.
 * Videos have 8 scenes for comprehensive product demos.
 */

// ==================== SCENE DURATION CONFIG ====================

export interface AutopilotSceneDurations {
  hook: number;        // 3-5s (90-150 frames @ 30fps)
  problem: number;     // 8-10s (240-300 frames)
  reveal: number;      // 8-12s (240-360 frames)
  features: number;    // 12-15s (360-450 frames)
  socialProof: number; // 8-10s (240-300 frames)
  avatar: number;      // 0-10s (0-300 frames) - 0 if skipped
  offer: number;       // 5-8s (150-240 frames)
  cta: number;         // 5-8s (150-240 frames)
}

// Scene duration constraints (in seconds)
export const AUTOPILOT_SCENE_CONSTRAINTS = {
  hook: { min: 3, max: 5, default: 4 },
  problem: { min: 8, max: 10, default: 9 },
  reveal: { min: 8, max: 12, default: 10 },
  features: { min: 12, max: 15, default: 14 },
  socialProof: { min: 8, max: 10, default: 9 },
  avatar: { min: 0, max: 10, default: 0 },  // Skip for MVP
  offer: { min: 5, max: 8, default: 6 },
  cta: { min: 5, max: 8, default: 6 },
};
// Total: 57-78s (target 60-75s)

// ==================== INDIVIDUAL SCENE PROPS ====================

export interface ProblemSceneProps {
  problemText: string;         // Pain point narrative
  productImage?: string;       // Optional background image
  audioUrl?: string;           // TTS voiceover URL
  durationInFrames: number;
}

export interface RevealSceneProps {
  productName: string;
  productImages: string[];     // Product images for reveal
  revealText?: string;         // "Introducing..." text
  audioUrl?: string;           // TTS voiceover URL
  durationInFrames: number;
}

export interface SocialProofSceneProps {
  testimonialText: string;     // Customer testimonial or stat
  customerName?: string;       // Optional customer name
  rating?: number;             // Optional 1-5 star rating
  statNumber?: string;         // Optional stat (e.g., "10,000+ sold")
  productImage?: string;       // Background product image
  audioUrl?: string;           // TTS voiceover URL
  durationInFrames: number;
}

export interface OfferSceneProps {
  productImage: string;
  price: string;               // Formatted price
  originalPrice?: string;      // For showing discount
  discountText?: string;       // e.g., "20% OFF"
  offerText?: string;          // Additional offer text
  audioUrl?: string;           // TTS voiceover URL
  durationInFrames: number;
}

// Re-export existing scene props from UGCSceneProps
export type { HookSceneProps, FeaturesSceneProps, CTASceneProps, FeatureItem } from './UGCSceneProps';

// ==================== MASTER COMPOSITION PROPS ====================

export interface AutopilotCompositionProps {
  // Product Info
  productName: string;
  productImages: string[];     // 2-4 URLs (minimum 2 required)
  logoUrl?: string;
  price: string;
  originalPrice?: string;

  // Scene Content
  hookText: string;            // "Stop scrolling if..."
  problemText: string;         // Pain point narration
  revealText?: string;         // "Introducing..." text
  features: Array<{ text: string; icon?: string }>;
  socialProofText: string;     // Testimonial or stat
  socialProofName?: string;    // Customer name
  socialProofRating?: number;  // 1-5 stars
  discountText?: string;       // "20% OFF"
  offerText?: string;          // Additional offer text
  ctaText: string;             // "Shop Now"

  // Audio
  audioUrls?: {
    problem?: string;
    reveal?: string;
    features?: string;
    socialProof?: string;
    offer?: string;
    cta?: string;
  };

  // Avatar (optional)
  avatarVideoUrl?: string;

  // Timing (in frames @ 30fps)
  sceneDurations: AutopilotSceneDurations;
}

// ==================== GENERATION REQUEST ====================

export interface GenerateAutopilotVideoRequest {
  productName: string;
  productFeatures: string;     // Paragraph or comma-separated
  productImages: string[];     // 2-4 URLs
  price: string;
  originalPrice?: string;
  hookText?: string;           // Optional, AI-generated if missing
  problemText?: string;        // Optional, AI-generated if missing
  socialProofText?: string;    // Optional, AI-generated if missing
  ctaText?: string;            // Optional, default "Shop Now"
  includeAvatar?: boolean;     // Default false
  tone?: 'casual' | 'professional' | 'energetic' | 'luxury';
}

// ==================== SCRIPT GENERATION ====================

export interface AutopilotSceneScripts {
  hook: string;                // Attention-grabbing hook text
  problemNarration: string;    // Pain point narration
  revealNarration: string;     // Product introduction
  featuresNarration: string;   // Benefits narration
  featuresList: string[];      // Individual feature items (3-4)
  socialProofText: string;     // Testimonial/stat
  socialProofName?: string;    // Customer name
  offerNarration?: string;     // Price/discount narration
  ctaNarration?: string;       // CTA voiceover
  avatarScript?: string;       // Script for avatar (if using)
}

// ==================== AUDIO ASSETS ====================

export interface AutopilotAudioAssets {
  problem?: {
    url: string;
    durationSeconds: number;
  };
  reveal?: {
    url: string;
    durationSeconds: number;
  };
  features?: {
    url: string;
    durationSeconds: number;
  };
  socialProof?: {
    url: string;
    durationSeconds: number;
  };
  offer?: {
    url: string;
    durationSeconds: number;
  };
  cta?: {
    url: string;
    durationSeconds: number;
  };
}

// ==================== DEFAULTS ====================

export const DEFAULT_AUTOPILOT_SCENE_DURATIONS: AutopilotSceneDurations = {
  hook: 120,        // 4s
  problem: 270,     // 9s
  reveal: 300,      // 10s
  features: 420,    // 14s
  socialProof: 270, // 9s
  avatar: 0,        // Skipped by default
  offer: 180,       // 6s
  cta: 180,         // 6s
};
// Total: 1740 frames = 58s (without avatar)

export const AUTOPILOT_VIDEO_CONFIG = {
  fps: 30,
  width: 1080,
  height: 1920,               // Portrait 9:16
  minDurationSeconds: 60,
  maxDurationSeconds: 75,
  minProductImages: 2,
  maxProductImages: 4,
  featureCount: 4,            // 4 features for longer format
};
