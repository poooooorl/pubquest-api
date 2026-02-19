import pool from "@/db/pool";

/**
 * Migration: Add level column to users table
 * This migration adds the level column to track user progression
 */
const addLevelColumn = async () => {
  try {
    console.log("⏳ Adding level column to users table...");

    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS level INT DEFAULT 1;
    `);

    console.log("✅ Level column added successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration Failed:", err);
    process.exit(1);
  }
};

addLevelColumn();
