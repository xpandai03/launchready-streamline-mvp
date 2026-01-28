/**
 * Autopilot Scheduler Service (Jan 2026)
 *
 * Manages scheduling and execution of autopilot video generation.
 * Handles cadence calculation and Late.dev publishing integration.
 */

import { eq, sql, and, lte, isNotNull } from 'drizzle-orm';
import { db } from '../db';
import {
  autopilotConfigs,
  autopilotProducts,
  autopilotStores,
  autopilotHistory,
  type AutopilotConfig,
  type AutopilotProduct,
} from '@shared/schema';
import { autopilotProductService } from './autopilotProductService';
import { autopilotVideoService } from './autopilotVideoService';
import { lateService } from './late';

// ==================== TYPES ====================

export interface ScheduledGeneration {
  configId: string;
  storeId: string;
  userId: string;
  product: {
    id: string;
    title: string;
    description: string | null;
    images: string[];
    price: string | null;
  };
  config: {
    tone: string;
    voiceId?: string;
    platforms: string[];
    videosPerWeek: number;
  };
}

export interface GenerationResult {
  success: boolean;
  assetId?: string;
  historyId?: string;
  error?: string;
}

// ==================== CONFIG ====================

const DAYS_PER_WEEK = 7;

// ==================== SERVICE ====================

/**
 * Find all configs that are due for video generation
 */
export async function getDueConfigs(): Promise<AutopilotConfig[]> {
  const now = new Date();

  console.log(`[Autopilot Scheduler] Finding configs due for generation at ${now.toISOString()}`);

  try {
    const configs = await db
      .select()
      .from(autopilotConfigs)
      .where(
        and(
          eq(autopilotConfigs.isActive, true),
          eq(autopilotConfigs.isApproved, true),
          lte(autopilotConfigs.nextScheduledAt, now)
        )
      );

    console.log(`[Autopilot Scheduler] Found ${configs.length} configs due for generation`);
    return configs;
  } catch (error: any) {
    console.error('[Autopilot Scheduler] Error finding due configs:', error);
    throw error;
  }
}

/**
 * Calculate next scheduled generation time based on cadence
 */
export function calculateNextScheduled(videosPerWeek: number, fromDate?: Date): Date {
  const intervalDays = DAYS_PER_WEEK / videosPerWeek;
  const next = fromDate ? new Date(fromDate) : new Date();
  next.setDate(next.getDate() + intervalDays);

  // Round to nearest hour for cleaner scheduling
  next.setMinutes(0, 0, 0);

  return next;
}

/**
 * Update next scheduled time for a config
 */
export async function updateNextScheduled(configId: string, videosPerWeek: number): Promise<void> {
  const nextScheduled = calculateNextScheduled(videosPerWeek);

  console.log(`[Autopilot Scheduler] Updating next scheduled for config ${configId}: ${nextScheduled.toISOString()}`);

  try {
    await db
      .update(autopilotConfigs)
      .set({
        nextScheduledAt: nextScheduled,
        lastGeneratedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(autopilotConfigs.id, configId));
  } catch (error: any) {
    console.error('[Autopilot Scheduler] Error updating next scheduled:', error);
    throw error;
  }
}

/**
 * Increment generation stats for a config
 */
export async function incrementStats(
  configId: string,
  storeId: string
): Promise<void> {
  try {
    // Increment videos generated
    await db
      .update(autopilotConfigs)
      .set({
        videosGenerated: sql`${autopilotConfigs.videosGenerated} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(autopilotConfigs.id, configId));

    // Check if we've cycled through all products
    const stats = await autopilotProductService.getPoolStats(storeId);
    if (stats.unusedProducts === 0 && stats.activeProducts > 0) {
      // All products have been used, increment pool cycles
      await db
        .update(autopilotConfigs)
        .set({
          poolCycles: sql`${autopilotConfigs.poolCycles} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(autopilotConfigs.id, configId));
    }
  } catch (error: any) {
    console.error('[Autopilot Scheduler] Error incrementing stats:', error);
    throw error;
  }
}

/**
 * Create history record for a generation
 */
export async function createHistoryRecord(
  configId: string,
  productId: string,
  mediaAssetId?: string
): Promise<string> {
  try {
    const [record] = await db
      .insert(autopilotHistory)
      .values({
        configId,
        productId,
        mediaAssetId,
        status: 'generating',
      })
      .returning({ id: autopilotHistory.id });

    return record.id;
  } catch (error: any) {
    console.error('[Autopilot Scheduler] Error creating history record:', error);
    throw error;
  }
}

/**
 * Update history record status
 */
export async function updateHistoryRecord(
  historyId: string,
  updates: {
    status?: string;
    mediaAssetId?: string;
    errorMessage?: string;
    publishedPlatforms?: Record<string, any>;
    completedAt?: Date;
  }
): Promise<void> {
  try {
    await db
      .update(autopilotHistory)
      .set(updates)
      .where(eq(autopilotHistory.id, historyId));
  } catch (error: any) {
    console.error('[Autopilot Scheduler] Error updating history record:', error);
    throw error;
  }
}

/**
 * Execute a single autopilot generation cycle
 */
export async function executeGeneration(config: AutopilotConfig): Promise<GenerationResult> {
  console.log(`[Autopilot Scheduler] Executing generation for config: ${config.id}`);

  try {
    // Get store info
    const [store] = await db
      .select()
      .from(autopilotStores)
      .where(eq(autopilotStores.id, config.storeId))
      .limit(1);

    if (!store) {
      return { success: false, error: 'Store not found' };
    }

    // Get next product
    const product = await autopilotProductService.getNextProduct(config.storeId);
    if (!product) {
      return { success: false, error: 'No active products available' };
    }

    // Validate product has enough images
    if (!product.images || product.images.length < 2) {
      console.log(`[Autopilot Scheduler] Product ${product.id} has insufficient images, skipping`);
      await autopilotProductService.toggleProductActive(product.id, false);
      return { success: false, error: 'Product has insufficient images' };
    }

    // Create history record
    const historyId = await createHistoryRecord(config.id, product.id);

    // Generate video
    console.log(`[Autopilot Scheduler] Generating video for product: ${product.title}`);
    const videoResult = await autopilotVideoService.generateAutopilotVideo({
      userId: config.userId,
      productName: product.title,
      productFeatures: product.description || product.title,
      productImages: product.images,
      price: product.price || '$0',
      tone: config.tone as any,
      voiceId: config.voiceId || undefined,
      logoUrl: store.logoUrl || undefined,
    });

    if (!videoResult.success || !videoResult.assetId) {
      await updateHistoryRecord(historyId, {
        status: 'failed',
        errorMessage: videoResult.error || 'Video generation failed',
      });
      return { success: false, error: videoResult.error };
    }

    // Update history with asset ID
    await updateHistoryRecord(historyId, {
      mediaAssetId: videoResult.assetId,
      status: 'ready',
    });

    // Mark product as used
    await autopilotProductService.markProductUsed(product.id);

    // Update stats
    await incrementStats(config.id, config.storeId);

    // Update next scheduled time
    await updateNextScheduled(config.id, config.videosPerWeek);

    return {
      success: true,
      assetId: videoResult.assetId,
      historyId,
    };
  } catch (error: any) {
    console.error(`[Autopilot Scheduler] Generation failed for config ${config.id}:`, error);
    return {
      success: false,
      error: error.message || 'Generation failed',
    };
  }
}

/**
 * Queue video to Late.dev for publishing
 * Called after video is ready
 */
export async function queueToLate(
  assetId: string,
  videoUrl: string,
  config: AutopilotConfig,
  productTitle: string
): Promise<{ success: boolean; results: Record<string, any> }> {
  const platforms = (config.platforms as string[]) || [];
  const results: Record<string, any> = {};

  console.log(`[Autopilot Scheduler] Queuing to Late.dev for platforms: ${platforms.join(', ')}`);

  // Get user's Late profile and accounts
  // This would need to be fetched from the user's stored accounts

  for (const platform of platforms) {
    try {
      // Generate caption
      const caption = `Check out ${productTitle}! Link in bio.\n\n#product #shopping #musthave`;

      // Note: In production, you'd get the user's account ID for each platform
      // For now, we'll just log it
      console.log(`[Autopilot Scheduler] Would queue to ${platform}: ${videoUrl}`);

      results[platform] = { status: 'queued', videoUrl };
    } catch (error: any) {
      console.error(`[Autopilot Scheduler] Failed to queue to ${platform}:`, error);
      results[platform] = { status: 'failed', error: error.message };
    }
  }

  return {
    success: Object.values(results).some((r: any) => r.status === 'queued'),
    results,
  };
}

/**
 * Pause autopilot for a config
 */
export async function pauseAutopilot(configId: string): Promise<void> {
  console.log(`[Autopilot Scheduler] Pausing autopilot for config: ${configId}`);

  try {
    await db
      .update(autopilotConfigs)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(autopilotConfigs.id, configId));
  } catch (error: any) {
    console.error('[Autopilot Scheduler] Error pausing autopilot:', error);
    throw error;
  }
}

/**
 * Resume autopilot for a config
 */
export async function resumeAutopilot(configId: string): Promise<void> {
  console.log(`[Autopilot Scheduler] Resuming autopilot for config: ${configId}`);

  try {
    // Get config to calculate next scheduled
    const [config] = await db
      .select()
      .from(autopilotConfigs)
      .where(eq(autopilotConfigs.id, configId))
      .limit(1);

    if (!config) {
      throw new Error('Config not found');
    }

    // Calculate next scheduled from now
    const nextScheduled = calculateNextScheduled(config.videosPerWeek);

    await db
      .update(autopilotConfigs)
      .set({
        isActive: true,
        nextScheduledAt: nextScheduled,
        updatedAt: new Date(),
      })
      .where(eq(autopilotConfigs.id, configId));
  } catch (error: any) {
    console.error('[Autopilot Scheduler] Error resuming autopilot:', error);
    throw error;
  }
}

/**
 * Activate autopilot after first video approval
 */
export async function activateAutopilot(
  configId: string,
  firstVideoAssetId: string
): Promise<void> {
  console.log(`[Autopilot Scheduler] Activating autopilot for config: ${configId}`);

  try {
    const [config] = await db
      .select()
      .from(autopilotConfigs)
      .where(eq(autopilotConfigs.id, configId))
      .limit(1);

    if (!config) {
      throw new Error('Config not found');
    }

    const nextScheduled = calculateNextScheduled(config.videosPerWeek);

    await db
      .update(autopilotConfigs)
      .set({
        isApproved: true,
        isActive: true,
        firstVideoAssetId,
        nextScheduledAt: nextScheduled,
        videosGenerated: 1, // Count the first preview video
        updatedAt: new Date(),
      })
      .where(eq(autopilotConfigs.id, configId));
  } catch (error: any) {
    console.error('[Autopilot Scheduler] Error activating autopilot:', error);
    throw error;
  }
}

// ==================== EXPORTS ====================

export const autopilotSchedulerService = {
  getDueConfigs,
  calculateNextScheduled,
  updateNextScheduled,
  incrementStats,
  createHistoryRecord,
  updateHistoryRecord,
  executeGeneration,
  queueToLate,
  pauseAutopilot,
  resumeAutopilot,
  activateAutopilot,
};

export default autopilotSchedulerService;
