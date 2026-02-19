"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pool_1 = __importDefault(require("../db/pool"));
const cache_service_1 = require("../services/cache.service");
const venues_1 = require("./seedqueries/venues");
const quests_1 = require("./seedqueries/quests");
const users_1 = require("./seedqueries/users");
const objectives_1 = require("./seedqueries/objectives");
const parties_1 = require("./seedqueries/parties");
const friendships_1 = require("./seedqueries/friendships");
const checkins_1 = require("./seedqueries/checkins");
const npcs_1 = require("./seedqueries/npcs");
const dialogue_1 = require("./seedqueries/dialogue");
async function clearDatabase(client) {
    console.log("🧹 Clearing database tables...");
    // Terminate any blocking connections first
    await client.query(`
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE datname = 'pubquest' 
    AND pid != pg_backend_pid() 
    AND state = 'idle in transaction'
  `);
    await client.query(`
    TRUNCATE TABLE 
      dialogue_nodes,
      npc_quests,
      npcs,
      party_join_requests,
      party_invites,
      party_members,
      parties,
      friendships,
      user_objective_progress, 
      user_quests, 
      quest_objectives, 
      quests, 
      users, 
      venues 
    RESTART IDENTITY CASCADE
  `);
    console.log("🧹 Database cleared and IDs reset");
}
async function clearCache() {
    console.log("🔄 Attempting to clear Redis cache...");
    try {
        const redis = (0, cache_service_1.getRedisClient)();
        await redis.connect();
        await redis.flushall();
        console.log("🗑️  Redis cache cleared");
    }
    catch (err) {
        console.log("⚠️  Redis cache clear skipped:", err.message);
    }
}
async function seed() {
    console.log("🌱 Starting Seed...");
    console.log("🔌 Connecting to database...");
    const client = await pool_1.default.connect();
    console.log("✅ Database connected");
    try {
        await client.query("BEGIN");
        console.log("📝 Transaction started");
        // 1. Clear existing data
        console.log("🧹 Clearing database...");
        await clearDatabase(client);
        await clearCache();
        // 2. Seed users
        const { users, admin } = await (0, users_1.seedUsers)(client);
        // 3. Seed venues
        const venues = await (0, venues_1.seedVenues)(client);
        // 4. Seed quests
        const quests = await (0, quests_1.seedQuests)(client);
        // 5. Seed objectives for the first quest
        const firstQuest = quests[0];
        const firstVenue = venues[0]; // The Rusty Spoon
        await (0, objectives_1.seedObjectives)(client, firstQuest.id, firstVenue.id);
        // 6. Assign quest to Dave
        const dave = users.find((u) => u.username === "dave");
        if (dave) {
            await (0, objectives_1.assignQuestToUser)(client, dave.id, firstQuest.id);
        }
        // 7. Seed parties
        const parties = await (0, parties_1.seedParties)(client, [...users, admin]);
        // 8. Seed party invites
        await (0, parties_1.seedPartyInvites)(client, [...users, admin], parties);
        // 9. Seed friendships
        await (0, friendships_1.seedFriendships)(client, [...users, admin]);
        // 10. Seed check-ins
        await (0, checkins_1.seedCheckIns)(client, users, venues);
        // 11. Seed NPCs
        const npcs = await (0, npcs_1.seedNPCs)(client, venues);
        // 12. Link NPCs to quests
        await (0, npcs_1.linkNPCsToQuests)(client, npcs, quests);
        // 13. Convert dialogue trees to dialogue nodes
        await (0, dialogue_1.seedDialogueNodes)(client, npcs, quests);
        await client.query("COMMIT");
        console.log("🌱 Seed Complete!");
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Seed Failed:", err);
    }
    finally {
        client.release();
        process.exit();
    }
}
seed();
