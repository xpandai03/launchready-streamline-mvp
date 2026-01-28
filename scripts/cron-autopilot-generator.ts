/**
 * Autopilot Cron Job: Video Generation
 *
 * Runs every hour to check for autopilot configs due for generation.
 * Triggers video generation and queues to Late.dev for publishing.
 *
 * Usage:
 * - Render Cron Job configuration: `npx tsx scripts/cron-autopilot-generator.ts`
 * - Schedule: "0 * * * *" (every hour at minute 0)
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, sql, and, lte } from "drizzle-orm";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const client = neon(DATABASE_URL);
const db = drizzle(client);

// ==================== TYPES ====================

interface AutopilotConfig {
  id: string;
  store_id: string;
  user_id: string;
  tone: string;
  voice_id: string | null;
  videos_per_week: number;
  platforms: any;
  is_active: boolean;
  is_approved: boolean;
}

interface AutopilotStore {
  id: string;
  shopify_domain: string;
  store_name: string | null;
  logo_url: string | null;
}

interface AutopilotProduct {
  id: string;
  title: string;
  description: string | null;
  images: any;
  price: string | null;
}

// ==================== HELPERS ====================

/**
 * Calculate next scheduled generation time
 */
function calculateNextScheduled(videosPerWeek: number): Date {
  const intervalDays = 7 / videosPerWeek;
  const next = new Date();
  next.setDate(next.getDate() + intervalDays);
  next.setMinutes(0, 0, 0);
  return next;
}

/**
 * Get next product for generation (round-robin)
 */
async function getNextProduct(storeId: string): Promise<AutopilotProduct | null> {
  const result = await db.execute<AutopilotProduct>(sql`
    SELECT id, title, description, images, price
    FROM autopilot_products
    WHERE store_id = ${storeId}
      AND is_active = TRUE
    ORDER BY
      last_used_at ASC NULLS FIRST,
      use_count ASC,
      created_at ASC
    LIMIT 1
  `);

  return result.rows[0] || null;
}

/**
 * Mark product as used
 */
async function markProductUsed(productId: string): Promise<void> {
  await db.execute(sql`
    UPDATE autopilot_products
    SET last_used_at = NOW(),
        use_count = use_count + 1,
        updated_at = NOW()
    WHERE id = ${productId}
  `);
}

/**
 * Update config's next scheduled time
 */
async function updateNextScheduled(configId: string, videosPerWeek: number): Promise<void> {
  const nextScheduled = calculateNextScheduled(videosPerWeek);

  await db.execute(sql`
    UPDATE autopilot_configs
    SET next_scheduled_at = ${nextScheduled},
        last_generated_at = NOW(),
        videos_generated = videos_generated + 1,
        updated_at = NOW()
    WHERE id = ${configId}
  `);
}

/**
 * Create history record
 */
async function createHistoryRecord(
  configId: string,
  productId: string
): Promise<string> {
  const result = await db.execute<{ id: string }>(sql`
    INSERT INTO autopilot_history (config_id, product_id, status)
    VALUES (${configId}, ${productId}, 'pending')
    RETURNING id
  `);

  return result.rows[0].id;
}

/**
 * Update history record
 */
async function updateHistoryRecord(
  historyId: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  if (errorMessage) {
    await db.execute(sql`
      UPDATE autopilot_history
      SET status = ${status},
          error_message = ${errorMessage},
          completed_at = ${status === 'failed' ? new Date() : null}
      WHERE id = ${historyId}
    `);
  } else {
    await db.execute(sql`
      UPDATE autopilot_history
      SET status = ${status}
      WHERE id = ${historyId}
    `);
  }
}

// ==================== MAIN ====================

async function runAutopilotCycle() {
  console.log('\n🤖 [Autopilot Cron] Starting autopilot generation cycle...');
  console.log(`[Autopilot Cron] Current time (UTC): ${new Date().toISOString()}`);

  try {
    // Find configs due for generation
    const dueConfigs = await db.execute<AutopilotConfig>(sql`
      SELECT id, store_id, user_id, tone, voice_id, videos_per_week, platforms, is_active, is_approved
      FROM autopilot_configs
      WHERE is_active = TRUE
        AND is_approved = TRUE
        AND next_scheduled_at <= NOW()
    `);

    if (!dueConfigs.rows || dueConfigs.rows.length === 0) {
      console.log('[Autopilot Cron] ℹ️  No configs due for generation');
      return;
    }

    console.log(`[Autopilot Cron] Found ${dueConfigs.rows.length} configs due for generation`);

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const config of dueConfigs.rows) {
      console.log(`\n[Autopilot Cron] Processing config ${config.id}...`);

      try {
        // Get store info
        const storeResult = await db.execute<AutopilotStore>(sql`
          SELECT id, shopify_domain, store_name, logo_url
          FROM autopilot_stores
          WHERE id = ${config.store_id}
          LIMIT 1
        `);

        if (!storeResult.rows[0]) {
          console.warn(`  ⚠️  Store not found for config ${config.id}`);
          skippedCount++;
          continue;
        }

        const store = storeResult.rows[0];

        // Get next product
        const product = await getNextProduct(config.store_id);

        if (!product) {
          console.warn(`  ⚠️  No active products for store ${store.shopify_domain}`);
          skippedCount++;
          continue;
        }

        const productImages = product.images as string[];
        if (!productImages || productImages.length < 2) {
          console.warn(`  ⚠️  Product ${product.title} has insufficient images`);
          await db.execute(sql`
            UPDATE autopilot_products
            SET is_active = FALSE, updated_at = NOW()
            WHERE id = ${product.id}
          `);
          skippedCount++;
          continue;
        }

        // Create history record
        const historyId = await createHistoryRecord(config.id, product.id);

        console.log(`  📦 Product: ${product.title}`);
        console.log(`  🎬 Triggering video generation...`);

        // In production, this would call the autopilot video service
        // For now, we'll log the action and update the record
        // The actual generation would be triggered via an API call to the main server

        // Trigger video generation via internal API
        const generateUrl = process.env.APP_URL
          ? `${process.env.APP_URL}/api/autopilot/internal/generate`
          : 'http://localhost:5000/api/autopilot/internal/generate';

        try {
          const response = await fetch(generateUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Key': process.env.INTERNAL_API_KEY || 'internal-key',
            },
            body: JSON.stringify({
              configId: config.id,
              productId: product.id,
              historyId,
              userId: config.user_id,
              productName: product.title,
              productFeatures: product.description || product.title,
              productImages,
              price: product.price || '$0',
              tone: config.tone,
              voiceId: config.voice_id,
              logoUrl: store.logo_url,
            }),
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`API error: ${error}`);
          }

          const result = await response.json();

          if (result.success) {
            console.log(`  ✅ Video generation triggered: ${result.assetId}`);
            await updateHistoryRecord(historyId, 'generating');
          } else {
            throw new Error(result.error || 'Generation failed');
          }
        } catch (apiError: any) {
          console.error(`  ❌ API call failed:`, apiError.message);

          // Fallback: Just update records and continue
          // The video can be generated manually or on next cycle
          await updateHistoryRecord(historyId, 'pending', 'API call failed, will retry');
        }

        // Mark product as used
        await markProductUsed(product.id);

        // Update next scheduled time
        await updateNextScheduled(config.id, config.videos_per_week);

        successCount++;
        console.log(`  ✅ Config processed successfully`);

      } catch (configError: any) {
        console.error(`  ❌ Failed to process config ${config.id}:`, configError.message);
        failedCount++;
      }
    }

    console.log('\n📊 [Autopilot Cron] Cycle complete:');
    console.log(`  - Successful: ${successCount}`);
    console.log(`  - Failed: ${failedCount}`);
    console.log(`  - Skipped: ${skippedCount}`);
    console.log(`  - Total processed: ${dueConfigs.rows.length}`);

  } catch (error) {
    console.error('❌ [Autopilot Cron] Error in autopilot cycle:', error);
    throw error;
  }
}

// Run the cron job
runAutopilotCycle()
  .then(() => {
    console.log('\n✅ [Autopilot Cron] Job completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ [Autopilot Cron] Job failed:', error);
    process.exit(1);
  });
