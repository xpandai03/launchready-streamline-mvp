/**
 * Shopify Scraper Service (Jan 2026)
 *
 * Reliably extracts products from any Shopify store.
 * Primary: Direct /products.json endpoint (no auth required)
 * Fallback: ScrapingBee for blocked/rate-limited stores
 */

// ==================== TYPES ====================

export interface ScrapedProduct {
  externalId: string;        // Shopify product ID
  title: string;
  description: string;       // HTML stripped
  images: string[];          // Up to 4 image URLs
  price: string;             // Formatted price
  variants?: string[];       // Color/size options
  tags?: string[];           // For categorization
}

export interface ScrapeResult {
  success: boolean;
  storeName?: string;
  logoUrl?: string;
  products?: ScrapedProduct[];
  productCount?: number;
  error?: string;
  usedFallback?: boolean;
}

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  handle: string;
  images: Array<{ src: string }>;
  variants: Array<{
    price: string;
    title: string;
    option1?: string;
    option2?: string;
    option3?: string;
  }>;
  tags: string;
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

// ==================== CONFIG ====================

const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY;
const MAX_PRODUCTS = 250;  // Shopify API limit per request
const MAX_IMAGES_PER_PRODUCT = 4;
const REQUEST_TIMEOUT = 30000; // 30 seconds
const RATE_LIMIT_DELAY = 500; // 0.5 seconds between requests

// ==================== HELPERS ====================

/**
 * Normalize Shopify domain from various URL formats
 */
export function normalizeShopifyDomain(input: string): string {
  let domain = input.trim().toLowerCase();

  // Remove protocol
  domain = domain.replace(/^https?:\/\//, '');

  // Remove trailing slashes and paths
  domain = domain.split('/')[0];

  // Remove www prefix
  domain = domain.replace(/^www\./, '');

  return domain;
}

/**
 * Validate if a domain looks like a Shopify store
 */
export function isValidShopifyUrl(domain: string): boolean {
  // Basic domain validation
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain) || domain.includes('.myshopify.com');
}

/**
 * Strip HTML tags and decode entities from description
 */
function stripHtml(html: string | null): string {
  if (!html) return '';

  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // Truncate to reasonable length
  if (text.length > 1000) {
    text = text.substring(0, 1000) + '...';
  }

  return text;
}

/**
 * Format price from Shopify format
 */
function formatPrice(price: string): string {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return price;
  return `$${numPrice.toFixed(2)}`;
}

/**
 * Extract unique variant options from Shopify product
 */
function extractVariants(product: ShopifyProduct): string[] {
  const variants: Set<string> = new Set();

  for (const variant of product.variants) {
    if (variant.option1 && variant.option1 !== 'Default Title') {
      variants.add(variant.option1);
    }
    if (variant.option2) {
      variants.add(variant.option2);
    }
    if (variant.option3) {
      variants.add(variant.option3);
    }
  }

  return Array.from(variants).slice(0, 10); // Limit to 10 variants
}

/**
 * Parse tags from Shopify format (comma-separated string)
 */
function parseTags(tagsString: string): string[] {
  if (!tagsString) return [];
  return tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0);
}

/**
 * Transform Shopify product to our format
 */
function transformProduct(shopifyProduct: ShopifyProduct): ScrapedProduct {
  // Get best price (lowest variant price)
  const prices = shopifyProduct.variants
    .map(v => parseFloat(v.price))
    .filter(p => !isNaN(p));
  const bestPrice = prices.length > 0 ? Math.min(...prices) : 0;

  // Get image URLs (up to MAX_IMAGES_PER_PRODUCT)
  const images = shopifyProduct.images
    .slice(0, MAX_IMAGES_PER_PRODUCT)
    .map(img => img.src);

  return {
    externalId: shopifyProduct.id.toString(),
    title: shopifyProduct.title,
    description: stripHtml(shopifyProduct.body_html),
    images,
    price: formatPrice(bestPrice.toString()),
    variants: extractVariants(shopifyProduct),
    tags: parseTags(shopifyProduct.tags),
  };
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== PRIMARY SCRAPER ====================

/**
 * Scrape products using direct Shopify /products.json endpoint
 */
async function scrapeDirectly(domain: string): Promise<ScrapeResult> {
  const url = `https://${domain}/products.json?limit=${MAX_PRODUCTS}`;

  console.log(`[Shopify Scraper] Attempting direct scrape: ${url}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Store not found or /products.json not accessible');
      }
      if (response.status === 429) {
        throw new Error('Rate limited - try again later');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Response is not JSON - may not be a Shopify store');
    }

    const data: ShopifyProductsResponse = await response.json();

    if (!data.products || !Array.isArray(data.products)) {
      throw new Error('Invalid response structure - products array not found');
    }

    if (data.products.length === 0) {
      return {
        success: false,
        error: 'No products found on store',
      };
    }

    // Transform products
    const products = data.products
      .filter(p => p.images && p.images.length > 0) // Only products with images
      .map(transformProduct);

    if (products.length === 0) {
      return {
        success: false,
        error: 'No products with images found',
      };
    }

    console.log(`[Shopify Scraper] Direct scrape successful: ${products.length} products`);

    return {
      success: true,
      products,
      productCount: products.length,
      usedFallback: false,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - store may be slow or unavailable');
    }
    throw error;
  }
}

// ==================== FALLBACK SCRAPER ====================

/**
 * Scrape products using ScrapingBee as fallback
 */
async function scrapeWithScrapingBee(domain: string): Promise<ScrapeResult> {
  if (!SCRAPINGBEE_API_KEY) {
    throw new Error('ScrapingBee API key not configured');
  }

  const targetUrl = `https://${domain}/products.json?limit=${MAX_PRODUCTS}`;
  const scrapingBeeUrl = new URL('https://app.scrapingbee.com/api/v1/');

  scrapingBeeUrl.searchParams.set('api_key', SCRAPINGBEE_API_KEY);
  scrapingBeeUrl.searchParams.set('url', targetUrl);
  scrapingBeeUrl.searchParams.set('render_js', 'false');
  scrapingBeeUrl.searchParams.set('premium_proxy', 'true');

  console.log(`[Shopify Scraper] Using ScrapingBee fallback for: ${domain}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT * 2); // Double timeout for proxy

    const response = await fetch(scrapingBeeUrl.toString(), {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`ScrapingBee error: HTTP ${response.status}`);
    }

    const data: ShopifyProductsResponse = await response.json();

    if (!data.products || !Array.isArray(data.products)) {
      throw new Error('Invalid response from ScrapingBee');
    }

    if (data.products.length === 0) {
      return {
        success: false,
        error: 'No products found on store',
      };
    }

    // Transform products
    const products = data.products
      .filter(p => p.images && p.images.length > 0)
      .map(transformProduct);

    if (products.length === 0) {
      return {
        success: false,
        error: 'No products with images found',
      };
    }

    console.log(`[Shopify Scraper] ScrapingBee scrape successful: ${products.length} products`);

    return {
      success: true,
      products,
      productCount: products.length,
      usedFallback: true,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('ScrapingBee request timeout');
    }
    throw error;
  }
}

// ==================== STORE METADATA ====================

/**
 * Fetch store metadata (name, logo) from shop.json endpoint
 */
async function fetchStoreMetadata(domain: string): Promise<{ storeName?: string; logoUrl?: string }> {
  try {
    // Try to get shop info
    const response = await fetch(`https://${domain}/shop.json`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        storeName: data.shop?.name || data.name,
        logoUrl: data.shop?.logo || data.logo,
      };
    }
  } catch (error) {
    // Ignore metadata fetch errors
    console.log(`[Shopify Scraper] Could not fetch store metadata for ${domain}`);
  }

  // Fallback: derive store name from domain
  const storeName = domain
    .replace('.myshopify.com', '')
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return { storeName };
}

// ==================== MAIN SERVICE ====================

/**
 * Scrape products from a Shopify store
 * Uses direct endpoint first, falls back to ScrapingBee if needed
 */
export async function scrapeShopifyStore(shopifyUrl: string): Promise<ScrapeResult> {
  // Normalize and validate domain
  const domain = normalizeShopifyDomain(shopifyUrl);

  if (!isValidShopifyUrl(domain)) {
    return {
      success: false,
      error: 'Not a valid Shopify store URL',
    };
  }

  console.log(`[Shopify Scraper] Starting scrape for: ${domain}`);

  try {
    // Try direct scrape first
    let result = await scrapeDirectly(domain);

    // If direct scrape failed and we have ScrapingBee configured, try fallback
    if (!result.success && SCRAPINGBEE_API_KEY) {
      console.log(`[Shopify Scraper] Direct scrape failed, trying ScrapingBee fallback`);
      await sleep(RATE_LIMIT_DELAY);

      try {
        result = await scrapeWithScrapingBee(domain);
      } catch (fallbackError: any) {
        // Return original error if fallback also fails
        console.error(`[Shopify Scraper] ScrapingBee fallback also failed:`, fallbackError.message);
      }
    }

    if (!result.success) {
      return result;
    }

    // Fetch store metadata
    const metadata = await fetchStoreMetadata(domain);

    return {
      ...result,
      storeName: metadata.storeName,
      logoUrl: metadata.logoUrl,
    };
  } catch (error: any) {
    console.error(`[Shopify Scraper] Scrape failed for ${domain}:`, error.message);

    // Categorize error for user-friendly message
    let errorMessage = error.message || 'Failed to scrape store';

    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      errorMessage = 'Store not accessible or too slow to respond';
    } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      errorMessage = 'Store not found or not accessible';
    } else if (errorMessage.includes('not JSON') || errorMessage.includes('not a Shopify')) {
      errorMessage = 'This does not appear to be a Shopify store';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Validate a Shopify store URL without full scraping
 * Quick check to see if /products.json is accessible
 */
export async function validateShopifyStore(shopifyUrl: string): Promise<{
  valid: boolean;
  domain?: string;
  error?: string;
}> {
  const domain = normalizeShopifyDomain(shopifyUrl);

  if (!isValidShopifyUrl(domain)) {
    return { valid: false, error: 'Not a valid URL format' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout for validation

    const response = await fetch(`https://${domain}/products.json?limit=1`, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      return { valid: true, domain };
    }

    return { valid: false, domain, error: `HTTP ${response.status}` };
  } catch (error: any) {
    return { valid: false, domain, error: error.message };
  }
}

// ==================== EXPORTS ====================

export const shopifyScraperService = {
  scrapeShopifyStore,
  validateShopifyStore,
  normalizeShopifyDomain,
  isValidShopifyUrl,
};

export default shopifyScraperService;
