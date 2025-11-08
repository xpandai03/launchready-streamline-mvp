/**
 * UGC Chain Orchestration Service (Phase 5)
 *
 * Manages the NanoBanana + Veo3 chained workflow (Mode A):
 * 1. Generate NanoBanana image
 * 2. Poll until image is ready
 * 3. Analyze image with OpenAI Vision
 * 4. Generate Veo3 video prompt based on analysis
 * 5. Generate Veo3 video with analyzed image as reference
 * 6. Poll until video is ready
 *
 * Handles chain_metadata updates at each step for progress tracking
 */

import { kieService } from './kie';
import { openaiService } from './openai';
import { storage } from '../storage';
import { generatePrompt, injectImageAnalysis, type PromptVariables } from '../prompts/ugc-presets';
import { GenerationMode } from '../prompts/ugc-presets';

/**
 * Chain workflow state stored in chain_metadata
 */
export interface ChainMetadata {
  step: 'generating_image' | 'analyzing_image' | 'generating_video' | 'completed' | 'error';
  nanoImageUrl?: string;
  nanoTaskId?: string;
  imageAnalysis?: string;
  videoPrompt?: string;
  videoTaskId?: string;
  timestamps: {
    imageStarted?: string;
    imageCompleted?: string;
    analysisCompleted?: string;
    videoStarted?: string;
    videoCompleted?: string;
  };
  error?: string;
}

/**
 * Parameters for starting a chain workflow
 */
export interface StartChainParams {
  assetId: string;
  promptVariables: PromptVariables;
  productImageUrl?: string;
}

/**
 * UGC Chain Orchestration Service
 */
export const ugcChainService = {
  /**
   * Step 1: Start NanoBanana image generation
   */
  async startImageGeneration(params: StartChainParams): Promise<void> {
    const { assetId, promptVariables } = params;

    console.log(`[UGC Chain] Step 1: Starting NanoBanana image generation for asset ${assetId}`);

    try {
      // Generate image prompt using preset template
      const imagePrompt = generatePrompt(GenerationMode.MODE_A, promptVariables);

      console.log(`[UGC Chain] Image prompt generated (${imagePrompt.length} chars)`);

      // Submit to KIE NanoBanana (Flux Kontext)
      const result = await kieService.generateImage({
        prompt: imagePrompt,
        provider: 'flux-kontext',
        aspectRatio: '16:9',
        model: 'flux-kontext-pro',
        referenceImageUrl: params.productImageUrl,
      });

      // Update asset with task ID and chain metadata
      const chainMetadata: ChainMetadata = {
        step: 'generating_image',
        nanoTaskId: result.taskId,
        timestamps: {
          imageStarted: new Date().toISOString(),
        },
      };

      await storage.updateMediaAsset(assetId, {
        taskId: result.taskId,
        chainMetadata,
        metadata: {
          imagePrompt,
          promptVariables,
        },
      });

      console.log(`[UGC Chain] ✅ Step 1 complete: NanoBanana task ${result.taskId} started`);
      console.log(`[UGC Chain] Asset ${assetId} now in state: step=generating_image, taskId=${result.taskId}`);
    } catch (error: any) {
      console.error(`[UGC Chain] ❌ Step 1 failed:`, error);
      await this.handleChainError(assetId, 'generating_image', error.message);
      throw error;
    }
  },

  /**
   * Step 2: Check if image is ready, if so move to Step 3
   */
  async checkImageStatus(assetId: string): Promise<boolean> {
    const asset = await storage.getMediaAsset(assetId);
    if (!asset || !asset.taskId) {
      throw new Error(`Asset ${assetId} not found or missing taskId`);
    }

    const chainMetadata = asset.chainMetadata as ChainMetadata;
    if (!chainMetadata || chainMetadata.step !== 'generating_image') {
      return false; // Not in image generation step
    }

    console.log(`[UGC Chain] Step 2: Checking NanoBanana image status for taskId=${asset.taskId}`);

    try {
      const status = await kieService.checkStatus(asset.taskId, 'kie-flux-kontext');
      console.log(`[UGC Chain] Step 2: KIE status response: status=${status.status}, resultUrls count=${status.resultUrls?.length || 0}`);

      if (status.status === 'failed') {
        console.error(`[UGC Chain] ❌ Step 2: Image generation failed: ${status.errorMessage}`);
        await this.handleChainError(assetId, 'generating_image', status.errorMessage || 'Image generation failed');
        return false;
      }

      if (status.status === 'ready' && status.resultUrls && status.resultUrls.length > 0) {
        const imageUrl = status.resultUrls[0];
        console.log(`[UGC Chain] ✅ Step 2 complete: NanoBanana image ready`);
        console.log(`[UGC Chain] Image URL: ${imageUrl.substring(0, 80)}...`);

        // Move to Step 3: Analyze image
        await this.analyzeImage(assetId, imageUrl);
        return true;
      }

      // Still processing
      console.log(`[UGC Chain] Step 2: Image still processing, will retry...`);
      return false;
    } catch (error: any) {
      console.error(`[UGC Chain] ❌ Step 2 error:`, error);
      await this.handleChainError(assetId, 'generating_image', error.message);
      return false;
    }
  },

  /**
   * Step 3: Analyze image with OpenAI Vision and generate video prompt
   */
  async analyzeImage(assetId: string, imageUrl: string): Promise<void> {
    console.log(`[UGC Chain] Step 3: Starting image analysis with OpenAI Vision`);
    console.log(`[UGC Chain] Asset ID: ${assetId}, Image URL: ${imageUrl.substring(0, 80)}...`);

    try {
      const asset = await storage.getMediaAsset(assetId);
      if (!asset) {
        throw new Error(`Asset ${assetId} not found`);
      }

      const chainMetadata = asset.chainMetadata as ChainMetadata;
      const promptVariables = asset.metadata?.promptVariables as PromptVariables;

      if (!promptVariables) {
        throw new Error('Missing promptVariables in asset metadata');
      }

      // Update chain metadata: analyzing image
      chainMetadata.step = 'analyzing_image';
      chainMetadata.nanoImageUrl = imageUrl;
      chainMetadata.timestamps.imageCompleted = new Date().toISOString();

      await storage.updateMediaAsset(assetId, {
        chainMetadata,
      });
      console.log(`[UGC Chain] Step 3: Updated asset state to analyzing_image`);

      // Analyze image with Vision API
      const analysisPrompt = `Analyze this UGC-style product photo in detail. Describe:
- Who is in the photo (age, gender, appearance, clothing)
- What they're holding (the product) and how
- The setting/environment (location, lighting, background)
- The overall mood and authenticity of the shot
- Any visible product branding or labels

Be specific and detailed - this description will be used to create a video based on this image.`;

      console.log(`[UGC Chain] Step 3: Calling OpenAI Vision API...`);
      const imageAnalysis = await openaiService.analyzeImage({
        imageUrl,
        prompt: analysisPrompt,
        maxTokens: 500,
      });

      console.log(`[UGC Chain] ✅ Step 3: Image analysis complete (${imageAnalysis.length} chars)`);
      console.log(`[UGC Chain] Analysis preview: ${imageAnalysis.substring(0, 100)}...`);

      // Generate Veo3 video prompt using chained template
      const videoPrompt = generatePrompt(
        GenerationMode.MODE_A,
        promptVariables,
        imageAnalysis // Pass image analysis for chained prompt
      );

      console.log(`[UGC Chain] Video prompt generated (${videoPrompt.length} chars)`);

      // Update chain metadata
      chainMetadata.imageAnalysis = imageAnalysis;
      chainMetadata.videoPrompt = videoPrompt;
      chainMetadata.timestamps.analysisCompleted = new Date().toISOString();

      await storage.updateMediaAsset(assetId, {
        chainMetadata,
        metadata: {
          ...asset.metadata,
          imageAnalysis,
          videoPrompt,
        },
      });

      console.log(`[UGC Chain] ✅ Step 3 complete: Image analyzed, proceeding to Step 4 (video generation)`);

      // Move to Step 4: Generate video
      await this.startVideoGeneration(assetId, videoPrompt, imageUrl);
    } catch (error: any) {
      console.error(`[UGC Chain] ❌ Step 3 failed:`, error);
      await this.handleChainError(assetId, 'analyzing_image', error.message);
      throw error;
    }
  },

  /**
   * Step 4: Start Veo3 video generation with analyzed image as reference
   */
  async startVideoGeneration(assetId: string, videoPrompt: string, imageUrl: string): Promise<void> {
    console.log(`[UGC Chain] Step 4: Starting Veo3 video generation`);
    console.log(`[UGC Chain] Asset ID: ${assetId}`);
    console.log(`[UGC Chain] Video prompt length: ${videoPrompt.length} chars`);
    console.log(`[UGC Chain] Reference image: ${imageUrl.substring(0, 80)}...`);

    try {
      // Submit to KIE Veo3 with image as reference
      console.log(`[UGC Chain] Step 4: Submitting to KIE Veo3 API...`);
      const result = await kieService.generateVideo({
        prompt: videoPrompt,
        model: 'veo3',
        aspectRatio: '16:9',
        imageUrls: [imageUrl], // Use NanoBanana image as reference
      });

      const asset = await storage.getMediaAsset(assetId);
      if (!asset) {
        throw new Error(`Asset ${assetId} not found`);
      }

      const chainMetadata = asset.chainMetadata as ChainMetadata;

      // Update chain metadata: generating video
      chainMetadata.step = 'generating_video';
      chainMetadata.videoTaskId = result.taskId;
      chainMetadata.timestamps.videoStarted = new Date().toISOString();

      await storage.updateMediaAsset(assetId, {
        taskId: result.taskId, // Update to video task ID
        provider: 'kie-veo3',   // Change provider to Veo3
        type: 'video',          // Change type to video
        chainMetadata,
      });

      console.log(`[UGC Chain] ✅ Step 4 complete: Veo3 task ${result.taskId} started`);
      console.log(`[UGC Chain] Asset ${assetId} now in state: step=generating_video, videoTaskId=${result.taskId}`);
    } catch (error: any) {
      console.error(`[UGC Chain] ❌ Step 4 failed:`, error);
      await this.handleChainError(assetId, 'generating_video', error.message);
      throw error;
    }
  },

  /**
   * Step 5: Check if video is ready
   */
  async checkVideoStatus(assetId: string): Promise<boolean> {
    const asset = await storage.getMediaAsset(assetId);
    if (!asset || !asset.taskId) {
      throw new Error(`Asset ${assetId} not found or missing taskId`);
    }

    const chainMetadata = asset.chainMetadata as ChainMetadata;
    if (!chainMetadata || chainMetadata.step !== 'generating_video') {
      return false; // Not in video generation step
    }

    console.log(`[UGC Chain] Step 5: Checking Veo3 video status for taskId=${asset.taskId}`);

    try {
      const status = await kieService.checkStatus(asset.taskId, 'kie-veo3');
      console.log(`[UGC Chain] Step 5: KIE status response: status=${status.status}, resultUrls count=${status.resultUrls?.length || 0}`);

      if (status.status === 'failed') {
        console.error(`[UGC Chain] ❌ Step 5: Video generation failed: ${status.errorMessage}`);
        await this.handleChainError(assetId, 'generating_video', status.errorMessage || 'Video generation failed');
        return false;
      }

      if (status.status === 'ready' && status.resultUrls && status.resultUrls.length > 0) {
        const videoUrl = status.resultUrls[0];
        console.log(`[UGC Chain] ✅ Step 5 complete: Veo3 video ready!`);
        console.log(`[UGC Chain] Video URL: ${videoUrl.substring(0, 80)}...`);

        // Mark chain as completed
        chainMetadata.step = 'completed';
        chainMetadata.timestamps.videoCompleted = new Date().toISOString();

        await storage.updateMediaAsset(assetId, {
          status: 'ready',
          resultUrl: videoUrl,
          resultUrls: status.resultUrls,
          completedAt: new Date().toISOString(),
          chainMetadata,
          apiResponse: { veo3: status },
        });

        console.log(`[UGC Chain] 🎉 CHAIN WORKFLOW COMPLETE for asset ${assetId}!`);
        console.log(`[UGC Chain] Total chain time: ${this.getChainDuration(chainMetadata)}`);
        return true;
      }

      // Still processing
      console.log(`[UGC Chain] Step 5: Video still processing, will retry...`);
      return false;
    } catch (error: any) {
      console.error(`[UGC Chain] ❌ Step 5 error:`, error);
      await this.handleChainError(assetId, 'generating_video', error.message);
      return false;
    }
  },

  /**
   * Handle chain errors by updating asset status and chain metadata
   */
  async handleChainError(assetId: string, step: ChainMetadata['step'], errorMessage: string): Promise<void> {
    console.error(`[UGC Chain] Error in ${step} for asset ${assetId}:`, errorMessage);

    try {
      const asset = await storage.getMediaAsset(assetId);
      if (!asset) return;

      const chainMetadata = (asset.chainMetadata as ChainMetadata) || {
        step: 'error',
        timestamps: {},
      };

      chainMetadata.step = 'error';
      chainMetadata.error = errorMessage;

      await storage.updateMediaAsset(assetId, {
        status: 'error',
        errorMessage: `Chain failed at ${step}: ${errorMessage}`,
        chainMetadata,
      });
    } catch (updateError) {
      console.error(`[UGC Chain] Failed to update error state:`, updateError);
    }
  },

  /**
   * Helper: Calculate chain duration from timestamps
   */
  getChainDuration(chainMetadata: ChainMetadata): string {
    const start = chainMetadata.timestamps?.imageStarted;
    const end = chainMetadata.timestamps?.videoCompleted;

    if (!start || !end) return 'Unknown';

    const durationMs = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);

    return `${minutes}m ${seconds}s`;
  },
};
