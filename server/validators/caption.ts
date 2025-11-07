import { z } from "zod";

/**
 * Validation schema for manual caption generation request
 */
export const generateCaptionSchema = z.object({
  projectId: z
    .string({ required_error: "Project ID is required" })
    .min(1, "Project ID cannot be empty"),

  customPrompt: z
    .string()
    .max(1000, "Custom prompt cannot exceed 1000 characters")
    .optional(),
});

/**
 * Validation schema for updating user caption settings
 */
export const updateCaptionSettingsSchema = z.object({
  systemPrompt: z
    .string()
    .min(10, "System prompt must be at least 10 characters")
    .max(1000, "System prompt cannot exceed 1000 characters")
    .optional(),

  autoGenerate: z
    .boolean()
    .optional(),
});

export type GenerateCaptionInput = z.infer<typeof generateCaptionSchema>;
export type UpdateCaptionSettingsInput = z.infer<typeof updateCaptionSettingsSchema>;
