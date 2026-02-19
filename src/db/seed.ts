import pool from "@/db/pool";
import { getRedisClient } from "@/services/cache.service";
import { seedVenues } from "./seedqueries/venues";
import { seedQuests } from "./seedqueries/quests";
import { seedUsers, adminUser } from "./seedqueries/users";
import { seedObjectives, assignQuestToUser } from "./seedqueries/objectives";
import { seedParties, seedPartyInvites } from "./seedqueries/parties";
import { seedFriendships } from "./seedqueries/friendships";
import { seedCheckIns } from "./seedqueries/checkins";
import { seedNPCs, linkNPCsToQuests } from "./seedqueries/npcs";
import { seedDialogueNodes } from "./seedqueries/dialogue";

async function clearDatabase(client: any) {
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
    const redis = getRedisClient();
    await redis.connect();
    await redis.flushall();
    console.log("🗑️  Redis cache cleared");
  } catch (err) {
    console.log("⚠️  Redis cache clear skipped:", (err as Error).message);
  }
}

async function seed() {
  console.log("🌱 Starting Seed...");
  console.log("🔌 Connecting to database...");
  const client = await pool.connect();
  console.log("✅ Database connected");

  try {
    await client.query("BEGIN");
    console.log("📝 Transaction started");

    // 1. Clear existing data
    console.log("🧹 Clearing database...");
    await clearDatabase(client);
    await clearCache();

    // 2. Seed users
    const { users, admin } = await seedUsers(client);

    // 3. Seed venues
    const venues = await seedVenues(client);

    // 4. Seed quests
    const quests = await seedQuests(client);

    // 5. Seed objectives for the first quest
    const firstQuest = quests[0];
    const firstVenue = venues[0]; // The Rusty Spoon
    await seedObjectives(client, firstQuest.id, firstVenue.id);

    // 6. Assign quest to Dave
    const dave = users.find((u) => u.username === "dave");
    if (dave) {
      await assignQuestToUser(client, dave.id, firstQuest.id);
    }

    // 7. Seed parties
    const parties = await seedParties(client, [...users, admin]);

    // 8. Seed party invites
    await seedPartyInvites(client, [...users, admin], parties);

    // 9. Seed friendships
    await seedFriendships(client, [...users, admin]);

    // 10. Seed check-ins
    await seedCheckIns(client, users, venues);

    // 11. Seed NPCs
    const npcs = await seedNPCs(client, venues);

    // 12. Link NPCs to quests
    await linkNPCsToQuests(client, npcs, quests);

    // 13. Convert dialogue trees to dialogue nodes
    await seedDialogueNodes(client, npcs, quests);

    await client.query("COMMIT");
    console.log("🌱 Seed Complete!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed Failed:", err);
  } finally {
    client.release();
    process.exit();
  }
}

seed();
