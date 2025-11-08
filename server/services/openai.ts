/**
 * OpenAI API Service
 *
 * Wrapper for OpenAI API - handles AI caption generation for Instagram posts
 * Documentation: https://platform.openai.com/docs/api-reference
 */

// Support both OPENAI_API_KEY and OPEN_AI_API_KEY (legacy)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const OPENAI_BASE_URL = 'https://api.openai.com/v1';

// Validation: Ensure API key is configured
if (!OPENAI_API_KEY) {
  console.warn('[OpenAI Service] Warning: OPENAI_API_KEY is not configured in environment');
}

/**
 * Parameters for caption generation
 */
export interface GenerateCaptionParams {
  projectName: string;          // Video/project title from Klap
  videoUrl?: string;            // Optional: for future vision analysis
  customPrompt?: string;        // Optional: override user's system prompt for this generation
  userSystemPrompt?: string;    // User's default caption writing style/instructions
}

/**
 * Parameters for image analysis (Phase 5: UGC Chain)
 */
export interface AnalyzeImageParams {
  imageUrl: string;             // URL of the image to analyze
  prompt: string;               // What to analyze (e.g., "Describe this product photo in detail")
  model?: string;               // Optional: override default model (default: gpt-4o)
  maxTokens?: number;           // Optional: max response length
}

/**
 * Caption generation response
 */
export interface CaptionGenerationResult {
  caption: string;
  metadata: {
    model: string;
    tokensUsed?: number;
    generatedAt: string;
    promptUsed: string;
  };
}

/**
 * Default system prompt for caption generation
 * Used when user hasn't configured a custom prompt
 */
const DEFAULT_SYSTEM_PROMPT = `You are an expert Instagram caption writer. Create engaging, authentic captions that:
- Are concise but compelling (2-3 sentences)
- Include 2-3 relevant emojis naturally placed
- End with a call-to-action or question to drive engagement
- Match the tone and content of the video
- Avoid hashtags (user will add separately)
- Sound natural and conversational, not robotic`;

/**
 * OpenAI Service
 *
 * Handles all interactions with the OpenAI API
 */
export const openaiService = {
  /**
   * Generate an Instagram caption using AI
   *
   * @param params - Video title and optional customization
   * @returns Generated caption with metadata
   * @throws Error if API call fails
   */
  async generateCaption(params: GenerateCaptionParams): Promise<CaptionGenerationResult> {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured. Please add it to your environment variables.');
    }

    const systemPrompt = params.customPrompt || params.userSystemPrompt || DEFAULT_SYSTEM_PROMPT;

    console.log('[OpenAI Service] Generating caption:', {
      projectName: params.projectName.substring(0, 50) + '...',
      hasCustomPrompt: !!params.customPrompt,
      hasUserPrompt: !!params.userSystemPrompt,
      model: OPENAI_MODEL,
    });

    const userMessage = `Write an Instagram caption for a video titled: "${params.projectName}"`;

    try {
      const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userMessage,
            },
          ],
          temperature: 0.8, // Higher temperature for more creative captions
          max_tokens: 300,  // Instagram captions can be up to 2200 chars, but 300 tokens is ~200 words
        }),
      });

      // Safe response parsing (following Instagram posting fix pattern)
      const responseText = await response.text();

      if (responseText.trim() === '') {
        console.error('[OpenAI Service] Empty response body received');
        throw new Error(`OpenAI API returned empty response (HTTP ${response.status})`);
      }

      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[OpenAI Service] JSON parse error:', parseError);
        console.error('[OpenAI Service] Raw response:', responseText.substring(0, 200));
        throw new Error(`OpenAI API returned invalid JSON (HTTP ${response.status}): ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        console.error('[OpenAI Service] API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: data,
        });

        const errorMessage = data.error?.message || data.error || 'Unknown error from OpenAI API';
        throw new Error(`OpenAI API Error (${response.status}): ${errorMessage}`);
      }

      // Extract caption from response
      const caption = data.choices?.[0]?.message?.content?.trim();

      if (!caption || caption.length === 0) {
        console.error('[OpenAI Service] No caption in response or empty caption:', data);
        throw new Error('OpenAI API returned no caption content or empty caption');
      }

      // Validate caption is reasonable length (at least 10 characters)
      if (caption.length < 10) {
        console.warn('[OpenAI Service] Caption too short, may be incomplete:', caption);
      }

      const result: CaptionGenerationResult = {
        caption,
        metadata: {
          model: data.model || OPENAI_MODEL,
          tokensUsed: data.usage?.total_tokens,
          generatedAt: new Date().toISOString(),
          promptUsed: systemPrompt.substring(0, 100) + '...', // Store snippet for debugging
        },
      };

      console.log('[OpenAI Service] Caption generated successfully:', {
        captionLength: caption.length,
        tokensUsed: result.metadata.tokensUsed,
        model: result.metadata.model,
        captionPreview: caption.substring(0, 60) + '...',
      });

      return result;
    } catch (error) {
      // Re-throw with more context if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to reach OpenAI API. Please check your internet connection.');
      }
      throw error;
    }
  },

  /**
   * Analyze an image using OpenAI Vision API (Phase 5: UGC Chain)
   *
   * Used in Mode A (NanoBanana + Veo3) to analyze the generated image
   * and create a detailed description for the video prompt
   *
   * @param params - Image URL and analysis prompt
   * @returns Detailed image analysis text
   * @throws Error if API call fails
   */
  async analyzeImage(params: AnalyzeImageParams): Promise<string> {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured. Please add it to your environment variables.');
    }

    const model = params.model || 'gpt-4o'; // gpt-4o has vision capabilities
    const maxTokens = params.maxTokens || 500;

    console.log('[OpenAI Vision] Analyzing image:', {
      imageUrl: params.imageUrl.substring(0, 60) + '...',
      prompt: params.prompt.substring(0, 100) + '...',
      model,
    });

    try {
      const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: params.prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: params.imageUrl,
                    detail: 'high', // Request detailed analysis
                  },
                },
              ],
            },
          ],
          max_tokens: maxTokens,
          temperature: 0.3, // Lower temperature for more factual descriptions
        }),
      });

      // Safe response parsing
      const responseText = await response.text();

      if (responseText.trim() === '') {
        console.error('[OpenAI Vision] Empty response body received');
        throw new Error(`OpenAI Vision API returned empty response (HTTP ${response.status})`);
      }

      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[OpenAI Vision] JSON parse error:', parseError);
        console.error('[OpenAI Vision] Raw response:', responseText.substring(0, 200));
        throw new Error(`OpenAI Vision API returned invalid JSON (HTTP ${response.status}): ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        console.error('[OpenAI Vision] API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: data,
        });

        const errorMessage = data.error?.message || data.error || 'Unknown error from OpenAI Vision API';
        throw new Error(`OpenAI Vision API Error (${response.status}): ${errorMessage}`);
      }

      // Extract analysis from response
      const analysis = data.choices?.[0]?.message?.content?.trim();

      if (!analysis || analysis.length === 0) {
        console.error('[OpenAI Vision] No analysis in response or empty analysis:', data);
        throw new Error('OpenAI Vision API returned no analysis content or empty analysis');
      }

      // Validate analysis is reasonable length (at least 20 characters)
      if (analysis.length < 20) {
        console.warn('[OpenAI Vision] Analysis too short, may be incomplete:', analysis);
      }

      console.log('[OpenAI Vision] Image analyzed successfully:', {
        analysisLength: analysis.length,
        tokensUsed: data.usage?.total_tokens,
        model: data.model || model,
        analysisPreview: analysis.substring(0, 100) + '...',
      });

      return analysis;
    } catch (error) {
      // Re-throw with more context if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to reach OpenAI Vision API. Please check your internet connection.');
      }
      throw error;
    }
  },

  /**
   * Test connection to OpenAI API
   *
   * Validates that the API key is correct and the service is reachable
   *
   * @returns True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    if (!OPENAI_API_KEY) {
      console.error('[OpenAI Service] Cannot test connection: OPENAI_API_KEY not configured');
      return false;
    }

    try {
      console.log('[OpenAI Service] Testing connection to OpenAI API...');

      // Simple test: list available models
      const response = await fetch(`${OPENAI_BASE_URL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
      });

      if (response.ok) {
        console.log('[OpenAI Service] ✓ Connection successful');
        return true;
      } else {
        const data = await response.json();
        console.error('[OpenAI Service] ✗ Connection failed:', response.status, data);
        return false;
      }
    } catch (error) {
      console.error('[OpenAI Service] ✗ Connection test error:', error);
      return false;
    }
  },
};
