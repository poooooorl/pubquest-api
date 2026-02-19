"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pool_1 = __importDefault(require("../db/pool"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
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
        const sqlPath = path_1.default.join(__dirname, "./schema.sql");
        const sql = fs_1.default.readFileSync(sqlPath, "utf8");
        // Execute it
        await pool_1.default.query(sql);
        console.log("✅ Migration Complete: Tables created successfully.");
        process.exit(0);
    }
    catch (err) {
        console.error("❌ Migration Failed:", err);
        process.exit(1);
    }
};
runMigration();
