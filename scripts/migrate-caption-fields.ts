/**
 * Database Migration Script - Add AI Caption Fields
 *
 * Adds caption-related fields to users and social_posts tables for Phase 2
 * Run with: tsx scripts/migrate-caption-fields.ts
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
  console.log("🚀 Starting AI Caption Fields Migration...\n");

  try {
    // Step 1: Add caption fields to users table
    console.log("📝 Step 1: Adding caption fields to users table...");

    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS caption_system_prompt TEXT DEFAULT 'Write an engaging Instagram caption for this video. Be creative, use relevant emojis, and include a call-to-action.',
      ADD COLUMN IF NOT EXISTS caption_auto_generate TEXT DEFAULT 'true' NOT NULL;
    `);

    console.log("✅ Added caption_system_prompt and caption_auto_generate to users table\n");

    // Step 2: Add caption metadata fields to social_posts table
    console.log("📝 Step 2: Adding caption metadata fields to social_posts table...");

    await db.execute(sql`
      ALTER TABLE social_posts
      ADD COLUMN IF NOT EXISTS caption_source TEXT,
      ADD COLUMN IF NOT EXISTS ai_caption_metadata JSONB;
    `);

    console.log("✅ Added caption_source and ai_caption_metadata to social_posts table\n");

    // Step 3: Verify columns were added
    console.log("📝 Step 3: Verifying new columns...");

    const usersCheck = await db.execute(sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('caption_system_prompt', 'caption_auto_generate')
      ORDER BY column_name;
    `);

    const socialPostsCheck = await db.execute(sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'social_posts'
      AND column_name IN ('caption_source', 'ai_caption_metadata')
      ORDER BY column_name;
    `);

    console.log("Users table new columns:", usersCheck.rows);
    console.log("Social posts table new columns:", socialPostsCheck.rows);
    console.log("\n✅ Migration verification complete\n");

    // Step 4: Update existing users to have default caption settings
    console.log("📝 Step 4: Setting defaults for existing users...");

    const updateResult = await db.execute(sql`
      UPDATE users
      SET
        caption_system_prompt = COALESCE(caption_system_prompt, 'Write an engaging Instagram caption for this video. Be creative, use relevant emojis, and include a call-to-action.'),
        caption_auto_generate = COALESCE(caption_auto_generate, 'true')
      WHERE caption_system_prompt IS NULL OR caption_auto_generate IS NULL;
    `);

    console.log(`✅ Updated ${updateResult.rowCount} existing users with default caption settings\n`);

    console.log("🎉 Migration completed successfully!");
    console.log("\nNew fields added:");
    console.log("  ✓ users.caption_system_prompt (TEXT)");
    console.log("  ✓ users.caption_auto_generate (TEXT)");
    console.log("  ✓ social_posts.caption_source (TEXT)");
    console.log("  ✓ social_posts.ai_caption_metadata (JSONB)\n");

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
