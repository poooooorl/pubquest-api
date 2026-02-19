interface Quest {
  title: string;
  description: string;
  reward_xp: number;
  reward_gold: number;
  category: string;
  is_repeatable: boolean;
  cooldown_hours?: number;
  giver_npc_id?: number;
  turn_in_npc_id?: number;
}

export const defaultQuests: Quest[] = [
  {
    title: "Friday Night Pint",
    description: "Visit your local and grab a drink.",
    reward_xp: 500,
    reward_gold: 50,
    category: "SIDE_QUEST",
    is_repeatable: true,
    cooldown_hours: 24,
  },
  {
    title: "Clear the Cellar Rats",
    description:
      "Old Tom's cellar is infested with rats. Help him deal with the problem before they get upstairs.",
    reward_xp: 100,
    reward_gold: 25,
    category: "SIDE_QUEST",
    is_repeatable: false,
  },
  {
    title: "Restock the Cellar",
    description:
      "The bartender needs some help restocking the cellar. Go to talk to him and see what's running low.",
    reward_xp: 150,
    reward_gold: 40,
    category: "SIDE_QUEST",
    is_repeatable: true,
    cooldown_hours: 24,
  },
  {
    title: "Pub Crawler Challenge",
    description: "Visit 5 different pubs in one night. Can you handle it?",
    reward_xp: 300,
    reward_gold: 75,
    category: "DAILY",
    is_repeatable: true,
    cooldown_hours: 24,
  },
  {
    title: "The Mysterious Package",
    description:
      "The hooded figure needs you to deliver a mysterious package. No questions asked.",
    reward_xp: 250,
    reward_gold: 100,
    category: "MAIN_STORY",
    is_repeatable: false,
  },
];

export const generateQuestsSeedQuery = () => {
  const questValues = defaultQuests
    .map(
      (q) =>
        `('${q.title.replace(/'/g, "''")}', '${q.description.replace(/'/g, "''")}', ${q.reward_xp}, ${q.reward_gold}, '${q.category}', ${q.is_repeatable}, ${q.cooldown_hours || "NULL"}, ${q.giver_npc_id || "NULL"}, ${q.turn_in_npc_id || "NULL"}, '{}'::jsonb)`,
    )
    .join(", ");

  return `INSERT INTO quests (title, description, reward_xp, reward_gold, category, is_repeatable, cooldown_hours, giver_npc_id, turn_in_npc_id, prerequisites)
        VALUES ${questValues}
        RETURNING *`;
};

export async function seedQuests(client: any) {
  const questRes = await client.query(generateQuestsSeedQuery());
  console.log(`✅ Created Quests: ${questRes.rows.length}`);
  return questRes.rows;
}
