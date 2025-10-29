/**
 * Usage Limits Service
 *
 * Tracks and enforces free tier usage limits:
 * - 3 videos per month
 * - 3 social posts per month
 *
 * Phase 6: Usage Limits & Tracking
 */

import { db } from "../db";
import { userUsage, users } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";

// Free tier limits
export const FREE_VIDEO_LIMIT = 3;
export const FREE_POST_LIMIT = 3;

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

/**
 * Get current usage for a user in the current month
 */
export async function getCurrentUsage(userId: string) {
  const month = getCurrentMonth();

  const usage = await db.query.userUsage.findFirst({
    where: and(
      eq(userUsage.userId, userId),
      eq(userUsage.month, month)
    ),
  });

  return {
    month,
    videosCreated: usage?.videosCreated || 0,
    postsCreated: usage?.postsCreated || 0,
    videoLimit: FREE_VIDEO_LIMIT,
    postLimit: FREE_POST_LIMIT,
    videoRemaining: Math.max(0, FREE_VIDEO_LIMIT - (usage?.videosCreated || 0)),
    postRemaining: Math.max(0, FREE_POST_LIMIT - (usage?.postsCreated || 0)),
  };
}

/**
 * Check if user can create a video (hasn't hit limit)
 * Returns true if under limit, false if limit reached
 */
export async function checkVideoLimit(userId: string): Promise<boolean> {
  // Check if user is pro (bypass limits)
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user?.subscriptionStatus === 'pro') {
    console.log('[Usage Limits] Pro user - bypassing video limit');
    return true;
  }

  const month = getCurrentMonth();

  const usage = await db.query.userUsage.findFirst({
    where: and(
      eq(userUsage.userId, userId),
      eq(userUsage.month, month)
    ),
  });

  const videosCreated = usage?.videosCreated || 0;
  const canCreate = videosCreated < FREE_VIDEO_LIMIT;

  console.log('[Usage Limits] Video check:', {
    userId,
    month,
    videosCreated,
    limit: FREE_VIDEO_LIMIT,
    canCreate,
  });

  return canCreate;
}

/**
 * Check if user can create a social post (hasn't hit limit)
 * Returns true if under limit, false if limit reached
 */
export async function checkPostLimit(userId: string): Promise<boolean> {
  // Check if user is pro (bypass limits)
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user?.subscriptionStatus === 'pro') {
    console.log('[Usage Limits] Pro user - bypassing post limit');
    return true;
  }

  const month = getCurrentMonth();

  const usage = await db.query.userUsage.findFirst({
    where: and(
      eq(userUsage.userId, userId),
      eq(userUsage.month, month)
    ),
  });

  const postsCreated = usage?.postsCreated || 0;
  const canCreate = postsCreated < FREE_POST_LIMIT;

  console.log('[Usage Limits] Post check:', {
    userId,
    month,
    postsCreated,
    limit: FREE_POST_LIMIT,
    canCreate,
  });

  return canCreate;
}

/**
 * Increment video usage counter for current month
 * Creates record if doesn't exist, increments if it does
 */
export async function incrementVideoUsage(userId: string): Promise<void> {
  const month = getCurrentMonth();

  console.log('[Usage Limits] UPSERT user_usage (video):', { userId, month });

  try {
    const result = await db
      .insert(userUsage)
      .values({
        userId,
        month,
        videosCreated: 1,
        postsCreated: 0,
      })
      .onConflictDoUpdate({
        target: [userUsage.userId, userUsage.month],
        set: {
          // Fully qualify column name to avoid ambiguity with EXCLUDED pseudo-table
          videosCreated: sql`COALESCE("user_usage"."videos_created", 0) + 1`,
          updatedAt: new Date(),
        },
      });

    console.log('[Usage Limits] Increment OK (video):', { userId, month });
  } catch (error) {
    console.error('[Usage Limits] ERROR incrementing video usage:', error);
    console.error('[Usage Limits] Full error details:', JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Increment social post usage counter for current month
 * Creates record if doesn't exist, increments if it does
 */
export async function incrementPostUsage(userId: string): Promise<void> {
  const month = getCurrentMonth();

  console.log('[Usage Limits] UPSERT user_usage (post):', { userId, month });

  try {
    const result = await db
      .insert(userUsage)
      .values({
        userId,
        month,
        videosCreated: 0,
        postsCreated: 1,
      })
      .onConflictDoUpdate({
        target: [userUsage.userId, userUsage.month],
        set: {
          // Fully qualify column name to avoid ambiguity with EXCLUDED pseudo-table
          postsCreated: sql`COALESCE("user_usage"."posts_created", 0) + 1`,
          updatedAt: new Date(),
        },
      });

    console.log('[Usage Limits] Increment OK (post):', { userId, month });
  } catch (error) {
    console.error('[Usage Limits] ERROR incrementing post usage:', error);
    console.error('[Usage Limits] Full error details:', JSON.stringify(error, null, 2));
    throw error;
  }
}
