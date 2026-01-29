/**
 * Generic Product Service (Jan 2026)
 *
 * Handles storage and retrieval of generic (non-Shopify) products
 * ingested via Apify Website Content Crawler.
 */

import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { autopilotProducts } from '@shared/schema';
import { NormalizedProduct } from './genericProductNormalizer';

// ==================== TYPES ====================

export interface StoredGenericProduct {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  images: string[];
  price: string | null;
  originalPrice: string | null;
  benefits: string[];
  brand: string | null;
  category: string | null;
  sourceUrl: string;
  dataQuality: string | null;
  qualityFlags: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface StoreProductResult {
  success: boolean;
  productId?: string;
  product?: StoredGenericProduct;
  error?: string;
}

// ==================== SERVICE ====================

/**
 * Store a normalized product in the database
 */
export async function storeGenericProduct(
  userId: string,
  normalizedProduct: NormalizedProduct
): Promise<StoreProductResult> {
  console.log(`[Generic Product Service] Storing product: "${normalizedProduct.title}" for user ${userId}`);

  try {
    // Check if product already exists for this URL and user
    const existing = await db
      .select()
      .from(autopilotProducts)
      .where(
        and(
          eq(autopilotProducts.userId, userId),
          eq(autopilotProducts.sourceUrl, normalizedProduct.sourceUrl),
          eq(autopilotProducts.sourceType, 'generic_page')
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing product
      console.log(`[Generic Product Service] Updating existing product: ${existing[0].id}`);

      await db
        .update(autopilotProducts)
        .set({
          title: normalizedProduct.title,
          description: normalizedProduct.description,
          images: normalizedProduct.images,
          price: normalizedProduct.price,
          originalPrice: normalizedProduct.originalPrice,
          benefits: normalizedProduct.benefits,
          brand: normalizedProduct.brand,
          category: normalizedProduct.category,
          dataQuality: normalizedProduct.dataQuality,
          qualityFlags: normalizedProduct.qualityFlags,
          extractionMetadata: normalizedProduct.extractionSource,
          updatedAt: new Date(),
        })
        .where(eq(autopilotProducts.id, existing[0].id));

      return {
        success: true,
        productId: existing[0].id,
        product: mapToStoredProduct(existing[0].id, userId, normalizedProduct),
      };
    }

    // Insert new product
    const [inserted] = await db
      .insert(autopilotProducts)
      .values({
        userId,
        storeId: null, // No store for generic products
        externalId: null, // No external ID for generic products
        title: normalizedProduct.title,
        description: normalizedProduct.description,
        images: normalizedProduct.images,
        price: normalizedProduct.price,
        originalPrice: normalizedProduct.originalPrice,
        benefits: normalizedProduct.benefits,
        brand: normalizedProduct.brand,
        category: normalizedProduct.category,
        sourceType: 'generic_page',
        sourceUrl: normalizedProduct.sourceUrl,
        dataQuality: normalizedProduct.dataQuality,
        qualityFlags: normalizedProduct.qualityFlags,
        extractionMetadata: normalizedProduct.extractionSource,
        isActive: true,
        useCount: 0,
      })
      .returning({ id: autopilotProducts.id });

    console.log(`[Generic Product Service] Product stored: ${inserted.id}`);

    return {
      success: true,
      productId: inserted.id,
      product: mapToStoredProduct(inserted.id, userId, normalizedProduct),
    };
  } catch (error: any) {
    console.error('[Generic Product Service] Error storing product:', error);
    return {
      success: false,
      error: error.message || 'Failed to store product',
    };
  }
}

/**
 * Get a generic product by ID
 */
export async function getGenericProduct(
  productId: string,
  userId: string
): Promise<StoredGenericProduct | null> {
  try {
    const [product] = await db
      .select()
      .from(autopilotProducts)
      .where(
        and(
          eq(autopilotProducts.id, productId),
          eq(autopilotProducts.userId, userId),
          eq(autopilotProducts.sourceType, 'generic_page')
        )
      )
      .limit(1);

    if (!product) return null;

    return {
      id: product.id,
      userId: product.userId!,
      title: product.title,
      description: product.description,
      images: (product.images as string[]) || [],
      price: product.price,
      originalPrice: product.originalPrice,
      benefits: (product.benefits as string[]) || [],
      brand: product.brand,
      category: product.category,
      sourceUrl: product.sourceUrl!,
      dataQuality: product.dataQuality,
      qualityFlags: (product.qualityFlags as string[]) || [],
      isActive: product.isActive,
      createdAt: product.createdAt,
    };
  } catch (error: any) {
    console.error('[Generic Product Service] Error fetching product:', error);
    return null;
  }
}

/**
 * Get all generic products for a user
 */
export async function getUserGenericProducts(
  userId: string
): Promise<StoredGenericProduct[]> {
  try {
    const products = await db
      .select()
      .from(autopilotProducts)
      .where(
        and(
          eq(autopilotProducts.userId, userId),
          eq(autopilotProducts.sourceType, 'generic_page')
        )
      )
      .orderBy(desc(autopilotProducts.createdAt));

    return products.map(product => ({
      id: product.id,
      userId: product.userId!,
      title: product.title,
      description: product.description,
      images: (product.images as string[]) || [],
      price: product.price,
      originalPrice: product.originalPrice,
      benefits: (product.benefits as string[]) || [],
      brand: product.brand,
      category: product.category,
      sourceUrl: product.sourceUrl!,
      dataQuality: product.dataQuality,
      qualityFlags: (product.qualityFlags as string[]) || [],
      isActive: product.isActive,
      createdAt: product.createdAt,
    }));
  } catch (error: any) {
    console.error('[Generic Product Service] Error fetching user products:', error);
    return [];
  }
}

/**
 * Delete a generic product
 */
export async function deleteGenericProduct(
  productId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await db
      .delete(autopilotProducts)
      .where(
        and(
          eq(autopilotProducts.id, productId),
          eq(autopilotProducts.userId, userId),
          eq(autopilotProducts.sourceType, 'generic_page')
        )
      );

    return true;
  } catch (error: any) {
    console.error('[Generic Product Service] Error deleting product:', error);
    return false;
  }
}

// ==================== HELPERS ====================

function mapToStoredProduct(
  id: string,
  userId: string,
  normalized: NormalizedProduct
): StoredGenericProduct {
  return {
    id,
    userId,
    title: normalized.title,
    description: normalized.description,
    images: normalized.images,
    price: normalized.price,
    originalPrice: normalized.originalPrice,
    benefits: normalized.benefits,
    brand: normalized.brand,
    category: normalized.category,
    sourceUrl: normalized.sourceUrl,
    dataQuality: normalized.dataQuality,
    qualityFlags: normalized.qualityFlags,
    isActive: true,
    createdAt: normalized.crawledAt,
  };
}

// ==================== EXPORTS ====================

export const genericProductService = {
  storeGenericProduct,
  getGenericProduct,
  getUserGenericProducts,
  deleteGenericProduct,
};

export default genericProductService;
