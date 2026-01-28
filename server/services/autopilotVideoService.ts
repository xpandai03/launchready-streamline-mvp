/**
 * Autopilot Video Service (Jan 2026)
 *
 * Orchestrates the full autopilot video generation pipeline:
 * 1. Script generation (AI)
 * 2. TTS audio generation (ElevenLabs)
 * 3. Scene duration calculation
 * 4. Remotion composition assembly
 * 5. Render worker invocation
 * 6. Upload to CDN
 */

import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { storage } from '../storage';
import {
  autopilotScriptGenerator,
  type AutopilotProductBrief,
  type AutopilotSceneScripts,
} from './autopilotScriptGenerator';
import {
  autopilotAudioPreparer,
  type AutopilotAudioAssets,
  type AutopilotSceneDurationsFromAudio,
} from './autopilotAudioPreparer';

// ==================== TYPES ====================

export interface GenerateAutopilotVideoParams {
  userId: string;
  productName: string;
  productFeatures: string;
  productImages: string[];
  price: string;
  originalPrice?: string;
  hookText?: string;
  ctaText?: string;
  includeAvatar?: boolean;
  tone?: 'casual' | 'professional' | 'energetic' | 'luxury';
  voiceId?: string;
  logoUrl?: string;
}

export interface AutopilotVideoResult {
  success: boolean;
  assetId?: string;
  error?: string;
}

export interface RenderJobStatus {
  jobId: string;
  status: 'queued' | 'rendering' | 'complete' | 'failed';
  progress?: number;
  resultUrl?: string;
  error?: string;
}

// ==================== CONFIG ====================

const RENDER_WORKER_URL = process.env.RENDER_WORKER_URL || 'http://localhost:3001';
const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

// ==================== SERVICE ====================

/**
 * Generate an autopilot video from product information
 * Returns immediately with assetId for polling
 */
export async function generateAutopilotVideo(
  params: GenerateAutopilotVideoParams
): Promise<AutopilotVideoResult> {
  const {
    userId,
    productName,
    productFeatures,
    productImages,
    price,
    originalPrice,
    hookText,
    ctaText = 'Shop Now',
    includeAvatar = false,
    tone = 'casual',
    voiceId,
    logoUrl,
  } = params;

  // Validate inputs
  if (productImages.length < 2) {
    return {
      success: false,
      error: 'Minimum 2 product images required',
    };
  }

  if (productImages.length > 4) {
    return {
      success: false,
      error: 'Maximum 4 product images allowed',
    };
  }

  const assetId = uuidv4();

  try {
    // Create MediaAsset record immediately for tracking
    await storage.createMediaAsset({
      id: assetId,
      userId,
      provider: 'remotion-autopilot',
      type: 'video',
      prompt: `Autopilot Video: ${productName}`,
      status: 'processing',
      metadata: {
        productName,
        productFeatures,
        productImages,
        price,
        includeAvatar,
        tone,
        startedAt: new Date().toISOString(),
      },
    });

    console.log(`[Autopilot Video] Created asset ${assetId} for user ${userId}`);

    // Start async processing
    processAutopilotVideo(assetId, params).catch((error) => {
      console.error(`[Autopilot Video] Processing failed for ${assetId}:`, error);
      storage.updateMediaAsset(assetId, {
        status: 'error',
        errorMessage: error.message || 'Unknown processing error',
      });
    });

    return {
      success: true,
      assetId,
    };
  } catch (error: any) {
    console.error('[Autopilot Video] Failed to create asset:', error);
    return {
      success: false,
      error: error.message || 'Failed to initiate video generation',
    };
  }
}

/**
 * Process autopilot video generation (async)
 */
async function processAutopilotVideo(
  assetId: string,
  params: GenerateAutopilotVideoParams
): Promise<void> {
  const {
    productName,
    productFeatures,
    productImages,
    price,
    originalPrice,
    hookText,
    ctaText = 'Shop Now',
    includeAvatar = false,
    tone = 'casual',
    voiceId,
    logoUrl,
  } = params;

  console.log(`[Autopilot Video] Starting processing for ${assetId}`);

  // Step 1: Generate scripts (AI or fallback)
  console.log(`[Autopilot Video] Step 1: Generating scripts...`);
  const brief: AutopilotProductBrief = {
    productName,
    productFeatures,
    price,
    originalPrice,
    brandTone: tone,
  };

  let scripts: AutopilotSceneScripts;
  const scriptResult = await autopilotScriptGenerator.generateAutopilotScripts(brief);
  if (scriptResult.success && scriptResult.scripts) {
    scripts = scriptResult.scripts;
  } else {
    console.log(`[Autopilot Video] AI script generation failed, using fallback`);
    scripts = autopilotScriptGenerator.getDefaultAutopilotScripts(
      productName,
      productFeatures,
      price,
      originalPrice
    );
  }

  // Override hook if provided
  const finalHookText = hookText || scripts.hook;

  await storage.updateMediaAsset(assetId, {
    metadata: {
      step: 'scripts_generated',
      scripts,
    },
  });

  // Step 2: Generate TTS audio
  console.log(`[Autopilot Video] Step 2: Generating TTS audio...`);
  const audioResult = await autopilotAudioPreparer.prepareAutopilotAudio(
    {
      problemNarration: scripts.problemNarration,
      revealNarration: scripts.revealNarration,
      featuresNarration: scripts.featuresNarration,
      socialProofNarration: scripts.socialProofText,
      offerNarration: scripts.offerNarration,
      ctaNarration: scripts.ctaNarration,
    },
    voiceId
  );

  if (audioResult.errors.length > 0) {
    console.log(`[Autopilot Video] TTS warnings: ${audioResult.errors.join(', ')}`);
  }

  // Step 3: Calculate scene durations from audio
  console.log(`[Autopilot Video] Step 3: Calculating scene durations...`);
  let sceneDurations = autopilotAudioPreparer.calculateAutopilotSceneDurations(
    audioResult.audioAssets,
    includeAvatar ? 8 : 0
  );

  // Adjust to target duration if needed
  sceneDurations = autopilotAudioPreparer.adjustDurationsToTarget(sceneDurations, 65);

  const totalDuration = autopilotAudioPreparer.getAutopilotTotalDurationSeconds(sceneDurations);
  console.log(`[Autopilot Video] Total duration: ${totalDuration}s`);

  await storage.updateMediaAsset(assetId, {
    metadata: {
      step: 'audio_prepared',
      sceneDurations,
      totalDuration,
      audioUrls: {
        problem: audioResult.audioAssets.problem?.url,
        reveal: audioResult.audioAssets.reveal?.url,
        features: audioResult.audioAssets.features?.url,
        socialProof: audioResult.audioAssets.socialProof?.url,
        offer: audioResult.audioAssets.offer?.url,
        cta: audioResult.audioAssets.cta?.url,
      },
    },
  });

  // Step 4: Prepare composition props
  console.log(`[Autopilot Video] Step 4: Preparing composition...`);
  const compositionProps = {
    productName,
    productImages,
    logoUrl,
    price,
    originalPrice,
    hookText: finalHookText,
    problemText: scripts.problemNarration,
    revealText: 'Introducing',
    features: scripts.featuresList.map(text => ({ text, icon: '✓' })),
    socialProofText: scripts.socialProofText,
    socialProofName: scripts.socialProofName,
    socialProofRating: 5,
    discountText: originalPrice ? calculateDiscount(price, originalPrice) : undefined,
    ctaText,
    audioUrls: {
      problem: audioResult.audioAssets.problem?.url,
      reveal: audioResult.audioAssets.reveal?.url,
      features: audioResult.audioAssets.features?.url,
      socialProof: audioResult.audioAssets.socialProof?.url,
      offer: audioResult.audioAssets.offer?.url,
      cta: audioResult.audioAssets.cta?.url,
    },
    sceneDurations,
  };

  // Step 5: Submit to render worker
  console.log(`[Autopilot Video] Step 5: Submitting to render worker...`);
  const totalFrames =
    sceneDurations.hook +
    sceneDurations.problem +
    sceneDurations.reveal +
    sceneDurations.features +
    sceneDurations.socialProof +
    sceneDurations.avatar +
    sceneDurations.offer +
    sceneDurations.cta;

  const renderResult = await submitRenderJob(assetId, compositionProps, {
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    durationInFrames: totalFrames,
  });

  if (!renderResult.success) {
    throw new Error(renderResult.error || 'Render job submission failed');
  }

  await storage.updateMediaAsset(assetId, {
    metadata: {
      step: 'rendering',
      renderJobId: renderResult.jobId,
    },
  });

  // Step 6: Poll for completion
  console.log(`[Autopilot Video] Step 6: Waiting for render completion...`);
  const finalResult = await waitForRenderCompletion(renderResult.jobId!);

  if (finalResult.status === 'complete' && finalResult.resultUrl) {
    console.log(`[Autopilot Video] Render complete: ${finalResult.resultUrl}`);
    await storage.updateMediaAsset(assetId, {
      status: 'ready',
      resultUrl: finalResult.resultUrl,
      completedAt: new Date(),
      metadata: {
        step: 'complete',
        totalDuration,
        sceneDurations,
        hasAvatar: includeAvatar,
      },
    });
  } else {
    throw new Error(finalResult.error || 'Render failed');
  }
}

/**
 * Submit render job to render worker using props-based approach
 */
async function submitRenderJob(
  assetId: string,
  props: any,
  config: { fps: number; width: number; height: number; durationInFrames: number }
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const response = await axios.post(
      `${RENDER_WORKER_URL}/render`,
      {
        jobId: assetId,
        compositionId: 'AutopilotVideo',
        inputProps: props,
        outputConfig: config,
      },
      {
        timeout: 30000,
      }
    );

    if (response.data.success) {
      return {
        success: true,
        jobId: response.data.jobId,
      };
    } else {
      return {
        success: false,
        error: response.data.error || 'Render submission failed',
      };
    }
  } catch (error: any) {
    console.error('[Autopilot Video] Render worker error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to connect to render worker',
    };
  }
}

/**
 * Poll render worker for job completion
 */
async function waitForRenderCompletion(
  jobId: string,
  maxWaitMs: number = 600000 // 10 minutes for longer videos
): Promise<RenderJobStatus> {
  const startTime = Date.now();
  const pollIntervalMs = 5000;

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await axios.get(`${RENDER_WORKER_URL}/status/${jobId}`);
      const status: RenderJobStatus = response.data;

      if (status.status === 'complete' || status.status === 'failed') {
        return status;
      }

      console.log(`[Autopilot Video] Render progress: ${status.progress || 0}%`);
    } catch (error: any) {
      console.error('[Autopilot Video] Status check error:', error.message);
    }

    await sleep(pollIntervalMs);
  }

  return {
    jobId,
    status: 'failed',
    error: 'Render timeout exceeded',
  };
}

/**
 * Get status of an autopilot video generation
 */
export async function getAutopilotVideoStatus(assetId: string): Promise<{
  status: string;
  resultUrl?: string;
  error?: string;
  metadata?: any;
}> {
  const asset = await storage.getMediaAsset(assetId);
  if (!asset) {
    return { status: 'not_found' };
  }

  return {
    status: asset.status,
    resultUrl: asset.resultUrl || undefined,
    error: asset.errorMessage || undefined,
    metadata: asset.metadata,
  };
}

// ==================== HELPERS ====================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate discount percentage from prices
 */
function calculateDiscount(price: string, originalPrice: string): string | undefined {
  try {
    const current = parseFloat(price.replace(/[^0-9.]/g, ''));
    const original = parseFloat(originalPrice.replace(/[^0-9.]/g, ''));

    if (isNaN(current) || isNaN(original) || original <= current) {
      return undefined;
    }

    const discount = Math.round(((original - current) / original) * 100);
    return `${discount}% OFF`;
  } catch {
    return undefined;
  }
}

// ==================== EXPORTS ====================

export const autopilotVideoService = {
  generateAutopilotVideo,
  getAutopilotVideoStatus,
};

export default autopilotVideoService;
