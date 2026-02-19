interface Objective {
  type: string;
  order_index: number;
  description: string;
  reward_xp: number;
  reward_gold: number;
  target_value?: string;
  target_count: number;
}

export const defaultObjectives: Objective[] = [
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

export const generateObjectivesSeedQuery = (
  questId: number,
  venueId: number,
) => {
  const objectives = defaultObjectives.map((obj) => {
    const targetValue = obj.type === "LOCATION" ? venueId : obj.target_value;
    return `(${questId}, '${obj.type}', '${targetValue}', ${obj.order_index}, '${obj.description}', ${obj.reward_xp}, ${obj.reward_gold}, ${obj.target_count})`;
  });

  return `INSERT INTO quest_objectives (quest_id, type, target_value, order_index, description, reward_xp, reward_gold, target_count)
     VALUES ${objectives.join(", ")}`;
};

export async function seedObjectives(
  client: any,
  questId: number,
  venueId: number,
) {
  await client.query(generateObjectivesSeedQuery(questId, venueId));
  console.log(`✅ Created Objectives: ${defaultObjectives.length}`);
}

export async function assignQuestToUser(
  client: any,
  userId: number,
  questId: number,
) {
  await client.query(
    `INSERT INTO user_quests (user_id, quest_id, status, accepted_at)
     VALUES ($1, $2, 'ACTIVE', NOW())`,
    [userId, questId],
  );

  await client.query(
    `INSERT INTO user_objective_progress (user_id, objective_id, is_completed, current_progress)
     SELECT $1, id, FALSE, 0 FROM quest_objectives WHERE quest_id = $2`,
    [userId, questId],
  );

  console.log(`✅ Assigned Quest ${questId} to User ${userId}`);
}
