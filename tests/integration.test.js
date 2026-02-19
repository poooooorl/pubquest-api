// test-integration.js
// Run with: node test-integration.js

const BASE_URL = "http://localhost:3000/api";

// Utilities
const log = (msg) => console.log(`\x1b[36m[TEST]\x1b[0m ${msg}`);
const success = (msg) => console.log(`\x1b[32m[PASS]\x1b[0m ${msg}`);
const fail = (msg) => {
  console.error(`\x1b[31m[FAIL]\x1b[0m ${msg}`);
  process.exit(1);
};

async function runTest() {
  log("Starting Full Quest Flow Test...");

  // ---------------------------------------------------------
  // 1. REGISTER NEW USER
  // ---------------------------------------------------------
  const randomId = Math.floor(Math.random() * 10000);
  const username = `Hero_${randomId}`;
  const email = `hero${randomId}@test.com`;

  log(`Registering user: ${username}...`);

  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password: "password123" }),
  });

  const regData = await regRes.json();
  if (!regRes.ok) fail(`Registration failed: ${JSON.stringify(regData)}`);

  const { token, user } = regData;
  const userId = user.id;
  success(`User Registered (ID: ${userId})`);

  // ---------------------------------------------------------
  // 2. CHECK QUEST STATUS (Should have "The First Pint")
  // ---------------------------------------------------------
  // We assume the seed/registration logic assigned the quest.
  // Let's verify by trying to do the first step.

  // ---------------------------------------------------------
  // 3. OBJECTIVE 1: LOCATION CHECK-IN
  // ---------------------------------------------------------
  log("Attempting Check-in at The Rusty Spoon (ID: 1)...");

  const checkInRes = await fetch(`${BASE_URL}/quests/checkin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      venueId: 1,
      lat: 51.5165,
      lng: -0.134, // Coordinates of the pub
    }),
  });

  const checkInData = await checkInRes.json();

  if (checkInData.processed && checkInData.completedObjectives.length > 0) {
    success("Objective 1 Complete: Location Verified");
  } else {
    fail(`Check-in failed to update quest: ${JSON.stringify(checkInData)}`);
  }

  // ---------------------------------------------------------
  // 4. OBJECTIVE 2: SPEND MONEY (WEBHOOK)
  // ---------------------------------------------------------
  log("Simulating Transaction Webhook ($6.00)...");

  const webhookRes = await fetch(`${BASE_URL}/webhooks/transaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: userId,
      merchantName: "The Rusty Spoon",
      amountCents: 600,
    }),
  });

  const webhookData = await webhookRes.json();

  if (
    webhookData.status === "processed" &&
    webhookData.objectives_completed > 0
  ) {
    success("Objective 2 Complete: Spend Verified");
  } else {
    fail(`Webhook failed: ${JSON.stringify(webhookData)}`);
  }

  // ---------------------------------------------------------
  // 5. VERIFY REWARDS (XP/GOLD)
  // ---------------------------------------------------------
  log("Verifying final user balance...");

  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const meData = await meRes.json();

  // Expected: 50 XP (Obj 1) + 500 XP (Quest) = 550 XP
  // Expected: 0 Gold (Obj 1) + 50 Gold (Quest) = 50 Gold
  if (meData.user.xp >= 500 && meData.user.gold >= 50) {
    success(
      `Rewards Received! XP: ${meData.user.xp}, Gold: ${meData.user.gold}`,
    );
  } else {
    fail(`Rewards missing. User Data: ${JSON.stringify(meData.user)}`);
  }

  console.log("\n-----------------------------------");
  console.log("🎉 ALL SYSTEMS GO. BACKEND IS READY.");
  console.log("-----------------------------------");
}

runTest().catch((err) => fail(err));
