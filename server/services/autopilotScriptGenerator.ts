/**
 * Autopilot Script Generator Service (Jan 2026)
 *
 * Generates extended scene scripts for 60-75 second autopilot videos.
 * Creates optimized voiceover text for all 8 scene types.
 */

// ==================== TYPES ====================

export interface AutopilotProductBrief {
  productName: string;
  productFeatures: string;   // Paragraph or comma-separated
  price: string;
  originalPrice?: string;
  targetAudience?: string;
  brandTone?: 'casual' | 'professional' | 'energetic' | 'luxury';
}

export interface AutopilotSceneScripts {
  hook: string;                 // Attention-grabbing hook text (visual only)
  problemNarration: string;     // Pain point narration (8-10s)
  revealNarration: string;      // Product introduction (8-12s)
  featuresNarration: string;    // Benefits narration (12-15s)
  featuresList: string[];       // Individual feature items (4)
  socialProofText: string;      // Testimonial or stat
  socialProofName?: string;     // Customer name (generated)
  offerNarration?: string;      // Price/discount highlight
  ctaNarration?: string;        // CTA voiceover
  avatarScript?: string;        // Script for avatar (if using)
}

export interface AutopilotScriptResult {
  success: boolean;
  scripts?: AutopilotSceneScripts;
  error?: string;
}

// ==================== CONFIG ====================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY;
const OPENAI_BASE_URL = 'https://api.openai.com/v1';

const SYSTEM_PROMPT = `You are a UGC (User Generated Content) video script writer specializing in product demo videos for social media.

Your task is to create engaging scripts for a 60-75 second product video with the following structure:
1. Hook (3-5s) - Visual text overlay to grab attention
2. Problem (8-10s) - Pain point narration that resonates with viewers
3. Reveal (8-12s) - Product introduction narration
4. Features (12-15s) - 4 key benefits with narration
5. Social Proof (8-10s) - Customer testimonial or impressive stat
6. Offer (5-8s) - Price/value highlight narration
7. CTA (5-8s) - Call-to-action narration

Guidelines:
- Hook: 3-8 words max, punchy and attention-grabbing
- Problem narration: 2-3 sentences describing the frustration/pain point the viewer faces
- Reveal narration: 2-3 sentences introducing the product as the solution
- Features: Extract exactly 4 key benefits, each 5-12 words. Narration ties them together.
- Social proof: Create a believable customer testimonial OR impressive stat
- Offer narration: Highlight the value/price in an exciting way
- CTA narration: Simple, direct call-to-action
- Avatar script: First-person testimonial, casual and authentic (optional)

Match the tone specified (casual, professional, energetic, or luxury).

Output must be valid JSON with this exact structure:
{
  "hook": "string (3-8 words)",
  "problemNarration": "string (2-3 sentences)",
  "revealNarration": "string (2-3 sentences)",
  "featuresNarration": "string (connecting narration)",
  "featuresList": ["feature1", "feature2", "feature3", "feature4"],
  "socialProofText": "string (testimonial or stat)",
  "socialProofName": "string (customer name like 'Sarah M.')",
  "offerNarration": "string (price highlight)",
  "ctaNarration": "string (call to action)",
  "avatarScript": "string (first-person testimonial)"
}`;

// ==================== SERVICE ====================

/**
 * Generate autopilot scene scripts from a product brief
 */
export async function generateAutopilotScripts(
  brief: AutopilotProductBrief
): Promise<AutopilotScriptResult> {
  if (!OPENAI_API_KEY) {
    console.error('[Autopilot Script] OpenAI API key not configured');
    return {
      success: false,
      error: 'Script generation service not configured',
    };
  }

  const toneGuide = getToneGuide(brief.brandTone);
  const priceInfo = brief.originalPrice
    ? `Current price: ${brief.price} (was ${brief.originalPrice})`
    : `Price: ${brief.price}`;

  const userPrompt = `Create a 60-75 second product video script for:

Product Name: ${brief.productName}
Features/Description: ${brief.productFeatures}
${priceInfo}
${brief.targetAudience ? `Target Audience: ${brief.targetAudience}` : ''}
Brand Tone: ${toneGuide}

Generate compelling scripts for all 8 scenes. Make it feel authentic and engaging.`;

  try {
    console.log('[Autopilot Script] Generating scripts for:', brief.productName);

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    const responseText = await response.text();

    if (responseText.trim() === '') {
      throw new Error('Empty response from AI');
    }

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[Autopilot Script] JSON parse error:', parseError);
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
      const errorMessage = data.error?.message || data.error || 'Unknown error from OpenAI API';
      throw new Error(`OpenAI API Error (${response.status}): ${errorMessage}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty content in response');
    }

    const scripts = JSON.parse(content) as AutopilotSceneScripts;

    // Validate required fields
    if (!scripts.hook || !scripts.problemNarration || !scripts.featuresList) {
      throw new Error('Missing required script fields');
    }

    // Ensure featuresList has exactly 4 items
    if (scripts.featuresList.length < 4) {
      while (scripts.featuresList.length < 4) {
        scripts.featuresList.push('Premium quality guaranteed');
      }
    } else if (scripts.featuresList.length > 4) {
      scripts.featuresList = scripts.featuresList.slice(0, 4);
    }

    console.log('[Autopilot Script] Scripts generated successfully');

    return {
      success: true,
      scripts,
    };
  } catch (error: any) {
    console.error('[Autopilot Script] Generation failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate scripts',
    };
  }
}

/**
 * Generate default scripts without AI (fallback)
 */
export function getDefaultAutopilotScripts(
  productName: string,
  features: string,
  price: string,
  originalPrice?: string
): AutopilotSceneScripts {
  // Parse features from comma-separated or newline-separated string
  const featuresList = features
    .split(/[,\n]/)
    .map(f => f.trim())
    .filter(f => f.length > 0)
    .slice(0, 4);

  // Pad if needed
  while (featuresList.length < 4) {
    featuresList.push('Premium quality');
  }

  const hasDiscount = !!originalPrice;
  const discountText = hasDiscount
    ? `Originally ${originalPrice}, now just ${price}!`
    : `Available now for just ${price}.`;

  return {
    hook: `Stop scrolling for ${productName}!`,
    problemNarration: `Are you tired of products that don't live up to their promises? We've all been there. Spending money on things that just don't work.`,
    revealNarration: `Introducing ${productName}. This is the solution you've been searching for. Let us show you why thousands of customers love it.`,
    featuresNarration: `Here's what makes ${productName} so special. ${featuresList.join('. ')}. These aren't just features, they're game-changers.`,
    featuresList,
    socialProofText: `I can't believe I waited so long to try ${productName}. It's honestly exceeded all my expectations!`,
    socialProofName: 'Sarah M.',
    offerNarration: discountText + ` That's incredible value for what you're getting.`,
    ctaNarration: `Ready to transform your experience? Click the link below to get yours today.`,
    avatarScript: `Hey! I've been using ${productName} for a while now, and honestly? Best decision I've made. If you're on the fence, just go for it. You won't regret it.`,
  };
}

// ==================== HELPERS ====================

function getToneGuide(tone?: string): string {
  switch (tone) {
    case 'casual':
      return 'Friendly and relaxed, like talking to a friend. Use conversational language.';
    case 'professional':
      return 'Polished and informative, building trust with authority. Clear and concise.';
    case 'energetic':
      return 'Excited and enthusiastic, high energy! Use exclamations and dynamic language.';
    case 'luxury':
      return 'Sophisticated and premium, emphasizing exclusivity and quality.';
    default:
      return 'Natural and conversational, authentic UGC style.';
  }
}

// ==================== EXPORTS ====================

export const autopilotScriptGenerator = {
  generateAutopilotScripts,
  getDefaultAutopilotScripts,
};

export default autopilotScriptGenerator;
