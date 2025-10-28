#!/usr/bin/env tsx
/**
 * UUID Migration Script
 *
 * Applies the auth schema UUID migration to convert user_id columns
 * from INTEGER to UUID type for Supabase auth integration.
 *
 * WARNING: This migration will DROP the existing users table and recreate it.
 * All existing task data will be preserved but user associations will be reset.
 *
 * Usage: npm run migrate:uuid
 */

import { Pool } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

async function applyMigration() {
  const migrationPath = path.join(
    __dirname,
    '../supabase/migrations/20251028200000_neon_uuid_migration.sql'
  );

  console.log('🔄 Starting UUID migration...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Read migration file
    console.log('📖 Reading migration file...');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`✅ Migration file loaded: ${migrationPath}\n`);

    // Execute migration
    console.log('🚀 Executing migration SQL...');
    console.log('⚠️  WARNING: This will drop and recreate the users table!\n');

    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('📋 Summary of changes:');
    console.log('  • Users table recreated with UUID primary key');
    console.log('  • All tables updated with UUID user_id columns');
    console.log('  • Row Level Security (RLS) policies enabled');
    console.log('  • Automatic user profile creation trigger added');
    console.log('  • User usage tracking table created\n');

    console.log('🎉 Your database is now ready for multi-tenant UUID-based auth!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
applyMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
