/**
 * Backfill Media Asset URLs
 *
 * Extracts result URLs from metadata/apiResponse for old generations
 * that have status='ready' but result_url=null
 */

import { db } from '../server/db';
import { mediaAssets } from '../shared/schema';
import { eq, and, isNull } from 'drizzle-orm';

async function backfillMediaUrls() {
  console.log('[Backfill] Starting media URL backfill...');

  try {
    // Find all 'ready' assets with null result_url
    const assetsToFix = await db
      .select()
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.status, 'ready'),
          isNull(mediaAssets.resultUrl)
        )
      );

    console.log(`[Backfill] Found ${assetsToFix.length} assets with missing URLs`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const asset of assetsToFix) {
      try {
        // Extract URL from all possible paths in metadata/apiResponse
        const metadata = asset.metadata as any;
        const apiResponse = asset.apiResponse as any;

        const extractedUrl =
          // From metadata
          metadata?.response?.resultUrls?.[0] ||
          metadata?.resultUrls?.[0] ||
          metadata?.outputs?.[0]?.url ||
          metadata?.resources?.[0]?.url ||
          metadata?.resultUrl ||
          // From apiResponse
          apiResponse?.response?.resultUrls?.[0] ||
          apiResponse?.resultUrls?.[0] ||
          apiResponse?.outputs?.[0]?.url ||
          apiResponse?.resultUrl ||
          null;

        if (extractedUrl) {
          // Update the asset with extracted URL
          await db
            .update(mediaAssets)
            .set({ resultUrl: extractedUrl })
            .where(eq(mediaAssets.id, asset.id));

          console.log(`[Backfill] ✅ Fixed asset ${asset.id}: ${extractedUrl}`);
          fixedCount++;
        } else {
          console.log(`[Backfill] ⚠️ Skipped asset ${asset.id}: No URL found in metadata`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`[Backfill] ❌ Error processing asset ${asset.id}:`, error);
        skippedCount++;
      }
    }

    console.log('[Backfill] Complete!');
    console.log(`  ✅ Fixed: ${fixedCount}`);
    console.log(`  ⚠️ Skipped: ${skippedCount}`);
    console.log(`  📊 Total: ${assetsToFix.length}`);

  } catch (error) {
    console.error('[Backfill] Fatal error:', error);
    throw error;
  }
}

// Run the backfill
backfillMediaUrls()
  .then(() => {
    console.log('[Backfill] Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Backfill] Script failed:', error);
    process.exit(1);
  });
