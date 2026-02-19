import pool from "@/db/pool";
import fs from "fs";
import path from "path";

/**
 * Database Migration Script
 *
 * This script executes schema.sql which:
 * - Drops all existing tables (if any)
 * - Recreates the complete database schema from scratch
 * - Designed for clean deployments to cloud services
 *
 * WARNING: This will destroy all existing data!
 * For production use, consider implementing versioned migrations.
 */
const runMigration = async () => {
  try {
    console.log("⏳ Starting Database Migration...");

    // Read the SQL file
    const sqlPath = path.join(__dirname, "./schema.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Execute it
    await pool.query(sql);

    console.log("✅ Migration Complete: Tables created successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration Failed:", err);
    process.exit(1);
  }
};

runMigration();
