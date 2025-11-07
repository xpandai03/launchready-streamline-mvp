/**
 * Render Cron Job: Check Scheduled Posts
 *
 * Runs every 5 minutes to monitor scheduled posts and update their status.
 * This script queries Late.dev API to check if scheduled posts have been published.
 *
 * Phase 3: Scheduled Posting System
 *
 * Usage:
 * - Render Cron Job configuration: `npx tsx scripts/cron-check-scheduled-posts.ts`
 * - Schedule: "*/5 * * * *" (every 5 minutes)
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
const LATE_API_KEY = process.env.LATE_API_KEY;
const LATE_BASE_URL = 'https://getlate.dev/api/v1';

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

if (!LATE_API_KEY) {
  console.error("❌ LATE_API_KEY environment variable is not set");
  process.exit(1);
}

const client = neon(DATABASE_URL);
const db = drizzle(client);

interface ScheduledPost {
  id: number;
  late_post_id: string | null;
  scheduled_for: Date;
  status: string;
  project_id: string;
  user_id: string;
}

/**
 * Fetch post status from Late.dev API
 */
async function getLatePostStatus(latePostId: string): Promise<any> {
  try {
    const response = await fetch(`${LATE_BASE_URL}/posts/${latePostId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${LATE_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Late API] Error fetching post ${latePostId}:`, response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data.post;
  } catch (error) {
    console.error(`[Late API] Exception fetching post ${latePostId}:`, error);
    return null;
  }
}

/**
 * Update social post status in database
 */
async function updatePostStatus(
  postId: number,
  status: string,
  platformPostUrl: string | null,
  errorMessage: string | null,
  publishedAt: Date | null,
  lateResponse: any
): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE social_posts
      SET
        status = ${status},
        platform_post_url = ${platformPostUrl},
        error_message = ${errorMessage},
        published_at = ${publishedAt},
        late_response = ${lateResponse ? JSON.stringify(lateResponse) : null}
      WHERE id = ${postId}
    `);

    console.log(`✅ Updated post ${postId} to status: ${status}`);
  } catch (error) {
    console.error(`❌ Failed to update post ${postId}:`, error);
  }
}

/**
 * Main cron job logic
 */
async function checkScheduledPosts() {
  console.log('\n🕐 [Cron] Starting scheduled posts check...');
  console.log(`[Cron] Current time (UTC): ${new Date().toISOString()}`);

  try {
    // Query posts that are scheduled and have a Late post ID
    // We check posts that are in 'scheduled' or 'posting' status
    const scheduledPosts = await db.execute<ScheduledPost>(sql`
      SELECT id, late_post_id, scheduled_for, status, project_id, user_id
      FROM social_posts
      WHERE is_scheduled = 'true'
        AND status IN ('scheduled', 'posting')
        AND late_post_id IS NOT NULL
      ORDER BY scheduled_for ASC
      LIMIT 50
    `);

    if (!scheduledPosts.rows || scheduledPosts.rows.length === 0) {
      console.log('[Cron] ℹ️  No scheduled posts to check');
      return;
    }

    console.log(`[Cron] Found ${scheduledPosts.rows.length} scheduled posts to check`);

    let updatedCount = 0;
    let failedCount = 0;
    let unchangedCount = 0;

    // Check each post's status with Late.dev
    for (const post of scheduledPosts.rows) {
      console.log(`\n[Cron] Checking post ${post.id} (Late ID: ${post.late_post_id})...`);
      console.log(`  - Scheduled for: ${post.scheduled_for}`);
      console.log(`  - Current status: ${post.status}`);

      if (!post.late_post_id) {
        console.warn(`  ⚠️  Post ${post.id} has no Late post ID, skipping`);
        continue;
      }

      // Fetch current status from Late.dev API
      const latePost = await getLatePostStatus(post.late_post_id);

      if (!latePost) {
        console.warn(`  ⚠️  Could not fetch status for post ${post.id}, will retry next cycle`);
        unchangedCount++;
        continue;
      }

      // Extract Instagram platform data
      const instagramPlatform = latePost.platforms?.find((p: any) => p.platform === 'instagram');

      if (!instagramPlatform) {
        console.warn(`  ⚠️  No Instagram platform data found for post ${post.id}`);
        unchangedCount++;
        continue;
      }

      const platformStatus = instagramPlatform.status;
      const platformPostUrl = instagramPlatform.platformPostUrl || null;
      const platformError = instagramPlatform.error || null;

      console.log(`  - Late.dev status: ${platformStatus}`);
      console.log(`  - Platform URL: ${platformPostUrl || 'none'}`);

      // Determine new status based on Late.dev response
      let newStatus = post.status;
      let publishedAt: Date | null = null;
      let errorMessage: string | null = null;

      if (platformStatus === 'published') {
        newStatus = 'published';
        publishedAt = new Date();
        console.log('  ✅ Post is published!');
        updatedCount++;
      } else if (platformStatus === 'failed') {
        newStatus = 'failed';
        errorMessage = platformError || 'Instagram publishing failed';
        console.log(`  ❌ Post failed: ${errorMessage}`);
        failedCount++;
      } else if (platformStatus === 'posting' || platformStatus === 'scheduled') {
        // Still in progress, no update needed
        console.log(`  ⏳ Post still in progress (${platformStatus})`);
        unchangedCount++;
        continue;
      } else {
        console.warn(`  ⚠️  Unknown platform status: ${platformStatus}`);
        unchangedCount++;
        continue;
      }

      // Update database if status changed
      if (newStatus !== post.status) {
        await updatePostStatus(
          post.id,
          newStatus,
          platformPostUrl,
          errorMessage,
          publishedAt,
          latePost
        );
      }
    }

    console.log('\n📊 [Cron] Check complete:');
    console.log(`  - Published: ${updatedCount}`);
    console.log(`  - Failed: ${failedCount}`);
    console.log(`  - Unchanged: ${unchangedCount}`);
    console.log(`  - Total checked: ${scheduledPosts.rows.length}`);

  } catch (error) {
    console.error('❌ [Cron] Error checking scheduled posts:', error);
    throw error;
  }
}

// Run the cron job
checkScheduledPosts()
  .then(() => {
    console.log('\n✅ [Cron] Job completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ [Cron] Job failed:', error);
    process.exit(1);
  });
