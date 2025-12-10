/**
 * Social Posting Validation Schemas
 *
 * Zod schemas for validating social media posting requests
 */

import { z } from "zod";

/**
 * Schema for posting a clip to social media
 *
 * Validates:
 * - projectId: Must be a non-empty string (for Klap videos)
 * - videoUrl: Direct video URL (for UGC videos from AI Studio)
 * - mediaAssetId: Media asset ID (for UGC videos) - Phase 4.7
 * - platform: Currently only 'instagram' supported
 * - caption: Optional, max 2200 characters (Instagram limit)
 * - scheduledFor: Optional ISO 8601 UTC timestamp for scheduled posts (Phase 3)
 */
export const postToSocialSchema = z.object({
  projectId: z
    .string()
    .min(1, "Project ID cannot be empty")
    .optional(),

  videoUrl: z
    .string()
    .url("Video URL must be a valid HTTPS URL")
    .optional(),

  mediaAssetId: z
    .string()
    .min(1, "Media asset ID cannot be empty")
    .optional(),

  platform: z
    .enum(["instagram", "facebook", "linkedin", "tiktok", "youtube", "googlebusiness"], {
      errorMap: () => ({
        message: "Unsupported platform. Supported: instagram, facebook, linkedin, tiktok, youtube, googlebusiness",
      }),
    }),

  caption: z
    .string()
    .max(2200, "Instagram caption limit is 2200 characters")
    .optional()
    .default(""),

  // Phase 3: Scheduled posting support
  scheduledFor: z
    .string()
    .datetime({ message: "scheduledFor must be a valid ISO 8601 UTC timestamp" })
    .optional(),
}).refine((data) => data.projectId || data.videoUrl, {
  message: "Either projectId (for Klap videos) or videoUrl (for UGC videos) must be provided",
  path: ["projectId"],
});

/**
 * TypeScript type inferred from the schema
 */
export type PostToSocialInput = z.infer<typeof postToSocialSchema>;

/**
 * Validate posting input and return typed data or error
 *
 * @param input - Raw input data to validate
 * @returns Validation result with success/error
 */
export function validatePostInput(input: unknown) {
  return postToSocialSchema.safeParse(input);
}

/**
 * Platform-specific validation rules
 */
export const PLATFORM_LIMITS = {
  instagram: {
    maxCaptionLength: 2200,
    supportedContentTypes: ['reel', 'post', 'story'],
    videoMaxSize: 100 * 1024 * 1024, // 100MB
    requiredFields: ['videoUrl', 'caption'],
  },
  facebook: {
    maxCaptionLength: 63206,
    supportedContentTypes: ['post', 'reel', 'story'],
    videoMaxSize: 4 * 1024 * 1024 * 1024, // 4GB
    requiredFields: ['videoUrl', 'caption'],
  },
  linkedin: {
    maxCaptionLength: 3000,
    supportedContentTypes: ['post', 'video'],
    videoMaxSize: 200 * 1024 * 1024, // 200MB
    requiredFields: ['videoUrl', 'caption'],
  },
  tiktok: {
    maxCaptionLength: 2200,
    supportedContentTypes: ['video'],
    videoMaxSize: 287 * 1024 * 1024, // 287MB
    requiredFields: ['videoUrl', 'caption'],
  },
  youtube: {
    maxCaptionLength: 5000,
    supportedContentTypes: ['short', 'video'],
    videoMaxSize: 256 * 1024 * 1024 * 1024, // 256GB
    requiredFields: ['videoUrl', 'caption'],
  },
  googlebusiness: {
    maxCaptionLength: 1500,
    supportedContentTypes: ['post'],
    videoMaxSize: 75 * 1024 * 1024, // 75MB
    requiredFields: ['caption'],
  },
} as const;

/**
 * Validate that a video URL is accessible
 *
 * @param url - Video URL to validate
 * @returns True if URL appears valid
 */
export function isValidVideoUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:' && url.length > 0;
  } catch {
    return false;
  }
}
