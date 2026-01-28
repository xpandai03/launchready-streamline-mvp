/**
 * UGC Video Scene Props (Jan 2026)
 *
 * Type definitions for the hybrid UGC video generation system.
 * Videos are 30-45 seconds with 5 scene structure.
 */

// ==================== SCENE DURATION CONFIG ====================

export interface SceneDurations {
  hook: number;      // 3-5s (90-150 frames @ 30fps)
  showcase: number;  // 8-12s (240-360 frames)
  features: number;  // 10-15s (300-450 frames)
  avatar: number;    // 5-8s (150-240 frames) - 0 if skipped
  cta: number;       // 3-5s (90-150 frames)
}

// ==================== INDIVIDUAL SCENE PROPS ====================

export interface HookSceneProps {
  productImage: string;      // Hero product image URL
  hookText: string;          // Attention-grabbing text (e.g., "Stop scrolling if...")
  durationInFrames: number;
}

export interface ShowcaseSceneProps {
  productImages: string[];   // 2-4 product image URLs
  tagline?: string;          // Optional product tagline
  audioUrl?: string;         // TTS voiceover URL
  durationInFrames: number;
}

export interface FeatureItem {
  text: string;              // Benefit text
  icon?: string;             // Optional icon (emoji or URL)
}

export interface FeaturesSceneProps {
  features: FeatureItem[];   // 3 features/benefits
  productImage?: string;     // Background product image
  audioUrl?: string;         // TTS voiceover URL
  durationInFrames: number;
}

export interface AvatarSceneProps {
  avatarVideoUrl?: string;   // KIE-generated avatar clip URL (optional)
  durationInFrames: number;  // 0 if avatar skipped
}

export interface CTASceneProps {
  productImage: string;      // Product image
  ctaText: string;           // Call-to-action text (e.g., "Shop now at...")
  logoUrl?: string;          // Optional brand logo
  audioUrl?: string;         // TTS voiceover URL (optional)
  durationInFrames: number;
}

// ==================== MASTER COMPOSITION PROPS ====================

export interface UGCCompositionProps {
  // Product Info
  productName: string;
  productImages: string[];   // 2-4 URLs (minimum 2 required)
  logoUrl?: string;

  // Scene Content
  hookText: string;          // "Stop scrolling if..."
  tagline?: string;          // Product tagline for showcase
  features: FeatureItem[];   // 3 benefit items
  ctaText: string;           // "Shop now at..."

  // Audio
  audioUrls?: {
    showcase?: string;
    features?: string;
    cta?: string;
  };

  // Avatar (optional)
  avatarVideoUrl?: string;

  // Timing (in frames @ 30fps)
  sceneDurations: SceneDurations;
}

// ==================== GENERATION REQUEST ====================

export interface GenerateUGCVideoRequest {
  productName: string;
  productFeatures: string;      // Paragraph or comma-separated
  productImages: string[];      // 2-4 URLs (minimum 2 required)
  hookText?: string;            // Optional, AI-generated if missing
  ctaText?: string;             // Optional, default "Shop Now"
  includeAvatar?: boolean;      // Default false
  avatarPrompt?: string;        // For KIE generation (AI-generated script)
}

// ==================== GENERATION RESPONSE ====================

export interface UGCVideoAsset {
  assetId: string;
  status: 'processing' | 'ready' | 'error';
  resultUrl?: string;
  errorMessage?: string;
  metadata?: {
    productName: string;
    totalDuration: number;      // In seconds
    sceneDurations: SceneDurations;
    hasAvatar: boolean;
  };
}

// ==================== SCRIPT GENERATION ====================

export interface UGCSceneScript {
  hook: string;                 // Attention-grabbing hook text
  showcaseNarration: string;    // 2-3 sentences for showcase voiceover
  featuresNarration: string;    // Benefits narration
  ctaNarration?: string;        // Optional CTA voiceover
  avatarScript?: string;        // Script for avatar to speak
}

// ==================== AUDIO PREPARATION ====================

export interface UGCAudioAssets {
  showcase?: {
    url: string;
    durationSeconds: number;
  };
  features?: {
    url: string;
    durationSeconds: number;
  };
  cta?: {
    url: string;
    durationSeconds: number;
  };
}

// ==================== DEFAULTS ====================

export const DEFAULT_SCENE_DURATIONS: SceneDurations = {
  hook: 120,     // 4s
  showcase: 300, // 10s
  features: 360, // 12s
  avatar: 0,     // Skipped by default
  cta: 120,      // 4s
};

export const UGC_VIDEO_CONFIG = {
  fps: 30,
  width: 1080,
  height: 1920,           // Portrait 9:16
  minDurationSeconds: 30,
  maxDurationSeconds: 45,
  minProductImages: 2,
  maxProductImages: 4,
  featureCount: 3,
};
