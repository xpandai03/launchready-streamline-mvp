/**
 * Autopilot Audio Preparer Service (Jan 2026)
 *
 * Batch TTS generation for 60-75 second autopilot videos.
 * Manages audio generation and calculates scene durations from audio length.
 */

import { ttsService, type TTSResult } from './tts';

// ==================== TYPES ====================

export interface AutopilotAudioInput {
  problemNarration?: string;
  revealNarration?: string;
  featuresNarration?: string;
  socialProofNarration?: string;
  offerNarration?: string;
  ctaNarration?: string;
}

export interface AudioAsset {
  url: string;
  durationSeconds: number;
}

export interface AutopilotAudioAssets {
  problem?: AudioAsset;
  reveal?: AudioAsset;
  features?: AudioAsset;
  socialProof?: AudioAsset;
  offer?: AudioAsset;
  cta?: AudioAsset;
}

export interface AutopilotAudioResult {
  success: boolean;
  audioAssets: AutopilotAudioAssets;
  totalAudioDuration: number;
  errors: string[];
}

export interface AutopilotSceneDurationsFromAudio {
  hook: number;        // Fixed duration in frames (no audio)
  problem: number;     // Based on audio length
  reveal: number;      // Based on audio length
  features: number;    // Based on audio length
  socialProof: number; // Based on audio length
  avatar: number;      // Fixed (from avatar clip) or 0
  offer: number;       // Based on audio length
  cta: number;         // Based on audio length
}

// ==================== CONFIG ====================

const FPS = 30;

// Scene duration constraints (in seconds) for 60-75s videos
const SCENE_CONSTRAINTS = {
  hook: { min: 3, max: 5, default: 4 },
  problem: { min: 8, max: 10, default: 9 },
  reveal: { min: 8, max: 12, default: 10 },
  features: { min: 12, max: 15, default: 14 },
  socialProof: { min: 8, max: 10, default: 9 },
  avatar: { min: 0, max: 10, default: 0 },
  offer: { min: 5, max: 8, default: 6 },
  cta: { min: 5, max: 8, default: 6 },
};

// Padding added to audio duration for scene length (in seconds)
const AUDIO_PADDING = 1.5;

// ==================== SERVICE ====================

/**
 * Generate TTS audio for all autopilot scenes
 */
export async function prepareAutopilotAudio(
  input: AutopilotAudioInput,
  voiceId?: string
): Promise<AutopilotAudioResult> {
  const audioAssets: AutopilotAudioAssets = {};
  const errors: string[] = [];
  let totalAudioDuration = 0;
  const ttsOptions = voiceId ? { voiceId } : undefined;

  console.log('[Autopilot Audio] Preparing audio for scenes...');

  // Generate problem audio
  if (input.problemNarration) {
    console.log('[Autopilot Audio] Generating problem narration...');
    const result = await ttsService.generateAudio(input.problemNarration, ttsOptions);
    if (result.success && result.audioUrl) {
      audioAssets.problem = {
        url: result.audioUrl,
        durationSeconds: result.duration || estimateDuration(input.problemNarration),
      };
      totalAudioDuration += audioAssets.problem.durationSeconds;
    } else {
      errors.push(`Problem TTS failed: ${result.error}`);
      totalAudioDuration += estimateDuration(input.problemNarration);
    }
  }

  // Generate reveal audio
  if (input.revealNarration) {
    console.log('[Autopilot Audio] Generating reveal narration...');
    const result = await ttsService.generateAudio(input.revealNarration, ttsOptions);
    if (result.success && result.audioUrl) {
      audioAssets.reveal = {
        url: result.audioUrl,
        durationSeconds: result.duration || estimateDuration(input.revealNarration),
      };
      totalAudioDuration += audioAssets.reveal.durationSeconds;
    } else {
      errors.push(`Reveal TTS failed: ${result.error}`);
      totalAudioDuration += estimateDuration(input.revealNarration);
    }
  }

  // Generate features audio
  if (input.featuresNarration) {
    console.log('[Autopilot Audio] Generating features narration...');
    const result = await ttsService.generateAudio(input.featuresNarration, ttsOptions);
    if (result.success && result.audioUrl) {
      audioAssets.features = {
        url: result.audioUrl,
        durationSeconds: result.duration || estimateDuration(input.featuresNarration),
      };
      totalAudioDuration += audioAssets.features.durationSeconds;
    } else {
      errors.push(`Features TTS failed: ${result.error}`);
      totalAudioDuration += estimateDuration(input.featuresNarration);
    }
  }

  // Generate social proof audio
  if (input.socialProofNarration) {
    console.log('[Autopilot Audio] Generating social proof narration...');
    const result = await ttsService.generateAudio(input.socialProofNarration, ttsOptions);
    if (result.success && result.audioUrl) {
      audioAssets.socialProof = {
        url: result.audioUrl,
        durationSeconds: result.duration || estimateDuration(input.socialProofNarration),
      };
      totalAudioDuration += audioAssets.socialProof.durationSeconds;
    } else {
      errors.push(`Social proof TTS failed: ${result.error}`);
      totalAudioDuration += estimateDuration(input.socialProofNarration);
    }
  }

  // Generate offer audio
  if (input.offerNarration) {
    console.log('[Autopilot Audio] Generating offer narration...');
    const result = await ttsService.generateAudio(input.offerNarration, ttsOptions);
    if (result.success && result.audioUrl) {
      audioAssets.offer = {
        url: result.audioUrl,
        durationSeconds: result.duration || estimateDuration(input.offerNarration),
      };
      totalAudioDuration += audioAssets.offer.durationSeconds;
    } else {
      errors.push(`Offer TTS failed: ${result.error}`);
      totalAudioDuration += estimateDuration(input.offerNarration);
    }
  }

  // Generate CTA audio (optional)
  if (input.ctaNarration) {
    console.log('[Autopilot Audio] Generating CTA narration...');
    const result = await ttsService.generateAudio(input.ctaNarration, ttsOptions);
    if (result.success && result.audioUrl) {
      audioAssets.cta = {
        url: result.audioUrl,
        durationSeconds: result.duration || estimateDuration(input.ctaNarration),
      };
      totalAudioDuration += audioAssets.cta.durationSeconds;
    } else {
      errors.push(`CTA TTS failed: ${result.error}`);
    }
  }

  console.log(`[Autopilot Audio] Audio preparation complete. Total duration: ${totalAudioDuration}s`);

  return {
    success: errors.length === 0,
    audioAssets,
    totalAudioDuration,
    errors,
  };
}

/**
 * Calculate scene durations based on audio lengths
 * TTS duration drives scene timing
 */
export function calculateAutopilotSceneDurations(
  audioAssets: AutopilotAudioAssets,
  avatarDurationSeconds: number = 0
): AutopilotSceneDurationsFromAudio {
  // Hook is always fixed (no audio)
  const hookSeconds = SCENE_CONSTRAINTS.hook.default;

  // Problem duration based on audio
  let problemSeconds = audioAssets.problem
    ? audioAssets.problem.durationSeconds + AUDIO_PADDING
    : SCENE_CONSTRAINTS.problem.default;
  problemSeconds = clamp(problemSeconds, SCENE_CONSTRAINTS.problem.min, SCENE_CONSTRAINTS.problem.max);

  // Reveal duration based on audio
  let revealSeconds = audioAssets.reveal
    ? audioAssets.reveal.durationSeconds + AUDIO_PADDING
    : SCENE_CONSTRAINTS.reveal.default;
  revealSeconds = clamp(revealSeconds, SCENE_CONSTRAINTS.reveal.min, SCENE_CONSTRAINTS.reveal.max);

  // Features duration based on audio
  let featuresSeconds = audioAssets.features
    ? audioAssets.features.durationSeconds + AUDIO_PADDING
    : SCENE_CONSTRAINTS.features.default;
  featuresSeconds = clamp(featuresSeconds, SCENE_CONSTRAINTS.features.min, SCENE_CONSTRAINTS.features.max);

  // Social proof duration based on audio
  let socialProofSeconds = audioAssets.socialProof
    ? audioAssets.socialProof.durationSeconds + AUDIO_PADDING
    : SCENE_CONSTRAINTS.socialProof.default;
  socialProofSeconds = clamp(socialProofSeconds, SCENE_CONSTRAINTS.socialProof.min, SCENE_CONSTRAINTS.socialProof.max);

  // Avatar duration (0 if skipped)
  let avatarSeconds = avatarDurationSeconds;
  if (avatarSeconds > 0) {
    avatarSeconds = clamp(avatarSeconds, SCENE_CONSTRAINTS.avatar.min, SCENE_CONSTRAINTS.avatar.max);
  }

  // Offer duration based on audio
  let offerSeconds = audioAssets.offer
    ? audioAssets.offer.durationSeconds + AUDIO_PADDING
    : SCENE_CONSTRAINTS.offer.default;
  offerSeconds = clamp(offerSeconds, SCENE_CONSTRAINTS.offer.min, SCENE_CONSTRAINTS.offer.max);

  // CTA duration based on audio or fixed minimum
  let ctaSeconds = audioAssets.cta
    ? audioAssets.cta.durationSeconds + AUDIO_PADDING
    : SCENE_CONSTRAINTS.cta.default;
  ctaSeconds = clamp(ctaSeconds, SCENE_CONSTRAINTS.cta.min, SCENE_CONSTRAINTS.cta.max);

  // Convert to frames
  return {
    hook: Math.round(hookSeconds * FPS),
    problem: Math.round(problemSeconds * FPS),
    reveal: Math.round(revealSeconds * FPS),
    features: Math.round(featuresSeconds * FPS),
    socialProof: Math.round(socialProofSeconds * FPS),
    avatar: Math.round(avatarSeconds * FPS),
    offer: Math.round(offerSeconds * FPS),
    cta: Math.round(ctaSeconds * FPS),
  };
}

/**
 * Get total video duration in seconds
 */
export function getAutopilotTotalDurationSeconds(durations: AutopilotSceneDurationsFromAudio): number {
  const totalFrames =
    durations.hook +
    durations.problem +
    durations.reveal +
    durations.features +
    durations.socialProof +
    durations.avatar +
    durations.offer +
    durations.cta;
  return totalFrames / FPS;
}

/**
 * Validate total duration is within autopilot constraints (60-75s)
 */
export function validateAutopilotTotalDuration(durations: AutopilotSceneDurationsFromAudio): {
  valid: boolean;
  totalSeconds: number;
  message?: string;
} {
  const totalSeconds = getAutopilotTotalDurationSeconds(durations);

  if (totalSeconds < 57) {
    return {
      valid: false,
      totalSeconds,
      message: `Video too short: ${totalSeconds.toFixed(1)}s (target 60-75s)`,
    };
  }

  if (totalSeconds > 78) {
    return {
      valid: false,
      totalSeconds,
      message: `Video too long: ${totalSeconds.toFixed(1)}s (target 60-75s)`,
    };
  }

  return { valid: true, totalSeconds };
}

/**
 * Adjust durations to hit target length
 * Extends features scene if too short, compresses if too long
 */
export function adjustDurationsToTarget(
  durations: AutopilotSceneDurationsFromAudio,
  targetSeconds: number = 65
): AutopilotSceneDurationsFromAudio {
  const currentSeconds = getAutopilotTotalDurationSeconds(durations);
  const difference = targetSeconds - currentSeconds;

  if (Math.abs(difference) < 2) {
    // Close enough, no adjustment needed
    return durations;
  }

  // Adjust features scene (most flexible)
  const adjustmentFrames = Math.round(difference * FPS);
  let newFeaturesFrames = durations.features + adjustmentFrames;

  // Clamp to constraints
  const minFeaturesFrames = SCENE_CONSTRAINTS.features.min * FPS;
  const maxFeaturesFrames = SCENE_CONSTRAINTS.features.max * FPS;
  newFeaturesFrames = clamp(newFeaturesFrames, minFeaturesFrames, maxFeaturesFrames);

  return {
    ...durations,
    features: newFeaturesFrames,
  };
}

// ==================== HELPERS ====================

/**
 * Estimate audio duration based on text length
 * ~150 words per minute = 2.5 words per second
 */
function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const wordsPerSecond = 2.5;
  return Math.ceil(words / wordsPerSecond);
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ==================== EXPORTS ====================

export const autopilotAudioPreparer = {
  prepareAutopilotAudio,
  calculateAutopilotSceneDurations,
  getAutopilotTotalDurationSeconds,
  validateAutopilotTotalDuration,
  adjustDurationsToTarget,
  estimateDuration,
};

export default autopilotAudioPreparer;
