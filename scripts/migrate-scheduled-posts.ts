/**
 * Database Migration Script - Add Scheduled Posting Fields
 *
 * Adds scheduling-related fields to social_posts table for Phase 3
 * Run with: tsx scripts/migrate-scheduled-posts.ts
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const client = neon(DATABASE_URL);
const db = drizzle(client);

async function runMigration() {
  console.log("🚀 Starting Scheduled Posting Migration...\n");

  try {
    // Step 1: Add scheduled posting fields to social_posts table
    console.log("📝 Step 1: Adding scheduled posting fields to social_posts table...");

    await db.execute(sql`
      ALTER TABLE social_posts
      ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP,
      ADD COLUMN IF NOT EXISTS is_scheduled TEXT DEFAULT 'false' NOT NULL;
    `);

    console.log("✅ Added scheduled_for and is_scheduled columns\n");

    // Step 2: Create index for scheduler queries
    console.log("📝 Step 2: Creating index for scheduler queries...");

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_scheduled_posts_for_scheduler
      ON social_posts(is_scheduled, scheduled_for, status)
      WHERE is_scheduled = 'true' AND status IN ('scheduled', 'posting');
    `);

    console.log("✅ Created scheduler index for optimized queries\n");

    // Step 3: Verify columns were added
    console.log("📝 Step 3: Verifying new columns...");

    const columnsCheck = await db.execute(sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'social_posts'
      AND column_name IN ('scheduled_for', 'is_scheduled')
      ORDER BY column_name;
    `);

    console.log("Social posts table new columns:", columnsCheck.rows);

    // Step 4: Check indexes
    console.log("\n📝 Step 4: Verifying indexes...");

    const indexCheck = await db.execute(sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'social_posts'
      AND indexname = 'idx_scheduled_posts_for_scheduler';
    `);

    console.log("Scheduler index:", indexCheck.rows);
    console.log("\n✅ Migration verification complete\n");

    console.log("🎉 Migration completed successfully!");
    console.log("\nNew fields added:");
    console.log("  ✓ social_posts.scheduled_for (TIMESTAMP)");
    console.log("  ✓ social_posts.is_scheduled (TEXT, default 'false')");
    console.log("\nIndexes created:");
    console.log("  ✓ idx_scheduled_posts_for_scheduler (for cron job queries)");
    console.log("\nStatus field expanded to support:");
    console.log("  - 'draft'     (created but not sent)");
    console.log("  - 'scheduled' (waiting for publish time)");
    console.log("  - 'posting'   (actively being published)");
    console.log("  - 'published' (successfully posted)");
    console.log("  - 'failed'    (publish attempt failed)\n");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log("✅ Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration script failed:", error);
    process.exit(1);
  });
