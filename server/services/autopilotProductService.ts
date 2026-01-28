/**
 * Autopilot Product Service (Jan 2026)
 *
 * Manages product rotation for autopilot video generation.
 * Implements round-robin selection without repeats until pool exhausted.
 */

import { eq, sql, and, isNull, asc } from 'drizzle-orm';
import { db } from '../db';
import { autopilotProducts, autopilotStores, type AutopilotProduct } from '@shared/schema';

// ==================== TYPES ====================

export interface ProductForVideo {
  id: string;
  storeId: string;
  externalId: string;
  title: string;
  description: string | null;
  images: string[];
  price: string | null;
  tags: string[] | null;
  useCount: number;
}

export interface PoolStats {
  totalProducts: number;
  activeProducts: number;
  usedProducts: number;
  unusedProducts: number;
  totalUseCount: number;
  poolCycles: number;
}

// ==================== SERVICE ====================

/**
 * Get the next product for video generation using round-robin rotation.
 * Prioritizes never-used products, then least-used, then oldest-used.
 */
export async function getNextProduct(storeId: string): Promise<ProductForVideo | null> {
  console.log(`[Autopilot Products] Getting next product for store: ${storeId}`);

  try {
    // Get product with oldest last_used_at (or never used) that is still active
    const [product] = await db
      .select()
      .from(autopilotProducts)
      .where(
        and(
          eq(autopilotProducts.storeId, storeId),
          eq(autopilotProducts.isActive, true)
        )
      )
      .orderBy(
        // Never used first (nulls first)
        sql`${autopilotProducts.lastUsedAt} ASC NULLS FIRST`,
        // Then least used
        asc(autopilotProducts.useCount),
        // Then oldest added
        asc(autopilotProducts.createdAt)
      )
      .limit(1);

    if (!product) {
      console.log(`[Autopilot Products] No active products found for store: ${storeId}`);
      return null;
    }

    console.log(`[Autopilot Products] Selected product: ${product.title} (use count: ${product.useCount})`);

    return {
      id: product.id,
      storeId: product.storeId,
      externalId: product.externalId,
      title: product.title,
      description: product.description,
      images: product.images as string[],
      price: product.price,
      tags: product.tags as string[] | null,
      useCount: product.useCount || 0,
    };
  } catch (error: any) {
    console.error(`[Autopilot Products] Error getting next product:`, error);
    throw error;
  }
}

/**
 * Mark a product as used after video generation.
 * Updates last_used_at and increments use_count.
 */
export async function markProductUsed(productId: string): Promise<void> {
  console.log(`[Autopilot Products] Marking product used: ${productId}`);

  try {
    await db
      .update(autopilotProducts)
      .set({
        lastUsedAt: new Date(),
        useCount: sql`${autopilotProducts.useCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(autopilotProducts.id, productId));

    console.log(`[Autopilot Products] Product marked as used: ${productId}`);
  } catch (error: any) {
    console.error(`[Autopilot Products] Error marking product used:`, error);
    throw error;
  }
}

/**
 * Get pool statistics for a store.
 */
export async function getPoolStats(storeId: string): Promise<PoolStats> {
  try {
    const products = await db
      .select({
        isActive: autopilotProducts.isActive,
        useCount: autopilotProducts.useCount,
        lastUsedAt: autopilotProducts.lastUsedAt,
      })
      .from(autopilotProducts)
      .where(eq(autopilotProducts.storeId, storeId));

    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.isActive).length;
    const usedProducts = products.filter(p => p.isActive && p.lastUsedAt !== null).length;
    const unusedProducts = activeProducts - usedProducts;
    const totalUseCount = products
      .filter(p => p.isActive)
      .reduce((sum, p) => sum + (p.useCount || 0), 0);

    // Calculate pool cycles (minimum use count among active products)
    const minUseCount = products
      .filter(p => p.isActive)
      .reduce((min, p) => Math.min(min, p.useCount || 0), Infinity);
    const poolCycles = minUseCount === Infinity ? 0 : minUseCount;

    return {
      totalProducts,
      activeProducts,
      usedProducts,
      unusedProducts,
      totalUseCount,
      poolCycles,
    };
  } catch (error: any) {
    console.error(`[Autopilot Products] Error getting pool stats:`, error);
    throw error;
  }
}

/**
 * Toggle product active status.
 * Inactive products are skipped in rotation.
 */
export async function toggleProductActive(productId: string, isActive: boolean): Promise<void> {
  console.log(`[Autopilot Products] Setting product ${productId} active: ${isActive}`);

  try {
    await db
      .update(autopilotProducts)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(autopilotProducts.id, productId));
  } catch (error: any) {
    console.error(`[Autopilot Products] Error toggling product active:`, error);
    throw error;
  }
}

/**
 * Update product details (title, description).
 */
export async function updateProduct(
  productId: string,
  updates: { title?: string; description?: string; isActive?: boolean }
): Promise<void> {
  console.log(`[Autopilot Products] Updating product ${productId}:`, updates);

  try {
    await db
      .update(autopilotProducts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(autopilotProducts.id, productId));
  } catch (error: any) {
    console.error(`[Autopilot Products] Error updating product:`, error);
    throw error;
  }
}

/**
 * Get all products for a store with pagination.
 */
export async function getProducts(
  storeId: string,
  options: { limit?: number; offset?: number; activeOnly?: boolean } = {}
): Promise<{ products: AutopilotProduct[]; total: number }> {
  const { limit = 50, offset = 0, activeOnly = false } = options;

  try {
    const conditions = [eq(autopilotProducts.storeId, storeId)];
    if (activeOnly) {
      conditions.push(eq(autopilotProducts.isActive, true));
    }

    const products = await db
      .select()
      .from(autopilotProducts)
      .where(and(...conditions))
      .orderBy(asc(autopilotProducts.title))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(autopilotProducts)
      .where(and(...conditions));

    return {
      products,
      total: countResult?.count || 0,
    };
  } catch (error: any) {
    console.error(`[Autopilot Products] Error getting products:`, error);
    throw error;
  }
}

/**
 * Get a specific product by ID.
 */
export async function getProductById(productId: string): Promise<AutopilotProduct | null> {
  try {
    const [product] = await db
      .select()
      .from(autopilotProducts)
      .where(eq(autopilotProducts.id, productId))
      .limit(1);

    return product || null;
  } catch (error: any) {
    console.error(`[Autopilot Products] Error getting product by ID:`, error);
    throw error;
  }
}

/**
 * Reset usage stats for all products in a store.
 * Useful for restarting the rotation.
 */
export async function resetProductUsage(storeId: string): Promise<void> {
  console.log(`[Autopilot Products] Resetting usage stats for store: ${storeId}`);

  try {
    await db
      .update(autopilotProducts)
      .set({
        lastUsedAt: null,
        useCount: 0,
        updatedAt: new Date(),
      })
      .where(eq(autopilotProducts.storeId, storeId));

    console.log(`[Autopilot Products] Usage stats reset for store: ${storeId}`);
  } catch (error: any) {
    console.error(`[Autopilot Products] Error resetting product usage:`, error);
    throw error;
  }
}

/**
 * Delete products that no longer exist in the store (by external ID).
 */
export async function removeStaleProducts(storeId: string, currentExternalIds: string[]): Promise<number> {
  console.log(`[Autopilot Products] Checking for stale products in store: ${storeId}`);

  try {
    // Get all products for this store
    const existingProducts = await db
      .select({ id: autopilotProducts.id, externalId: autopilotProducts.externalId })
      .from(autopilotProducts)
      .where(eq(autopilotProducts.storeId, storeId));

    // Find products that are no longer in the store
    const staleProductIds = existingProducts
      .filter(p => !currentExternalIds.includes(p.externalId))
      .map(p => p.id);

    if (staleProductIds.length === 0) {
      return 0;
    }

    // Mark stale products as inactive instead of deleting
    // This preserves history
    for (const productId of staleProductIds) {
      await db
        .update(autopilotProducts)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(autopilotProducts.id, productId));
    }

    console.log(`[Autopilot Products] Marked ${staleProductIds.length} stale products as inactive`);
    return staleProductIds.length;
  } catch (error: any) {
    console.error(`[Autopilot Products] Error removing stale products:`, error);
    throw error;
  }
}

// ==================== EXPORTS ====================

export const autopilotProductService = {
  getNextProduct,
  markProductUsed,
  getPoolStats,
  toggleProductActive,
  updateProduct,
  getProducts,
  getProductById,
  resetProductUsage,
  removeStaleProducts,
};

export default autopilotProductService;
