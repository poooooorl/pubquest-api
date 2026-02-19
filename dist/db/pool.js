"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDbConnection = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = new pg_1.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || "5432"),
});
pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
    process.exit(-1);
});
// Helper to test connection
const testDbConnection = async () => {
    try {
        const client = await pool.connect();
        // Check PostGIS version to ensure extensions are loaded
        const res = await client.query("SELECT PostGIS_Full_Version()");
        console.log("✅ Connected to PostGIS:", res.rows[0].postgis_full_version);
        client.release();
    }
    catch (err) {
        console.error("❌ Database connection failed:", err);
    }
};
exports.testDbConnection = testDbConnection;
exports.default = pool;
