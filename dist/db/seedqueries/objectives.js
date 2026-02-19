"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateObjectivesSeedQuery = exports.defaultObjectives = void 0;
exports.seedObjectives = seedObjectives;
exports.assignQuestToUser = assignQuestToUser;
exports.defaultObjectives = [
    {
        type: "LOCATION",
        order_index: 1,
        description: "Check in at The Rusty Spoon",
        reward_xp: 50,
        reward_gold: 5,
        target_count: 1,
    },
    {
        type: "SPEND",
        target_value: "500",
        order_index: 2,
        description: "Spend at least 500 cents ($5.00)",
        reward_xp: 100,
        reward_gold: 10,
        target_count: 1,
    },
];
const generateObjectivesSeedQuery = (questId, venueId) => {
    const objectives = exports.defaultObjectives.map((obj) => {
        const targetValue = obj.type === "LOCATION" ? venueId : obj.target_value;
        return `(${questId}, '${obj.type}', '${targetValue}', ${obj.order_index}, '${obj.description}', ${obj.reward_xp}, ${obj.reward_gold}, ${obj.target_count})`;
    });
    return `INSERT INTO quest_objectives (quest_id, type, target_value, order_index, description, reward_xp, reward_gold, target_count)
     VALUES ${objectives.join(", ")}`;
};
exports.generateObjectivesSeedQuery = generateObjectivesSeedQuery;
async function seedObjectives(client, questId, venueId) {
    await client.query((0, exports.generateObjectivesSeedQuery)(questId, venueId));
    console.log(`✅ Created Objectives: ${exports.defaultObjectives.length}`);
}
async function assignQuestToUser(client, userId, questId) {
    await client.query(`INSERT INTO user_quests (user_id, quest_id, status, accepted_at)
     VALUES ($1, $2, 'ACTIVE', NOW())`, [userId, questId]);
    await client.query(`INSERT INTO user_objective_progress (user_id, objective_id, is_completed, current_progress)
     SELECT $1, id, FALSE, 0 FROM quest_objectives WHERE quest_id = $2`, [userId, questId]);
    console.log(`✅ Assigned Quest ${questId} to User ${userId}`);
}
