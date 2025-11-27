#!/usr/bin/env tsx
/**
 * Video Rating Migration Script
 *
 * Applies the migration to create the `video_rating` table.
 *
 * Usage: npm run migrate:video-rating
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
        '../supabase/migrations/20251127000100_create_video_rating.sql'
    );

    console.log('🔄 Starting Video Rating migration...\n');

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
        await pool.query(migrationSQL);
        console.log('✅ Migration completed successfully!\n');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

applyMigration();