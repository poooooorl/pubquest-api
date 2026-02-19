import { PoolClient } from "pg";

export async function seedNPCs(client: PoolClient, venues: any[]) {
  console.log("🧙 Seeding NPCs...");

  const npcs = [
    {
      name: "Kat the Serveress",
      venue_id: 44, // Bubala King's Cross
      avatar_url: undefined,
      description:
        "A friendly serveress at Bubala King's Cross who knows all the regulars and their favorite drinks. She's always ready with a smile and a quick chat.",
      greeting_text:
        "Welcome to Bubala King's Cross! Can I get you something to drink or perhaps a quest to embark on?",
      dialogue_tree: {
        greeting: {
          text: "Welcome to Bubala King's Cross! Looking for a drink or maybe some adventure?",
          return_text: "No worries, anything else I can help with?",
          conditional_texts: [
            {
              text: "Hey cellar dweller! How is it down there?",
              conditions: {
                questState: { questId: 3, state: "ACTIVE" },
              },
            },
          ],
          options: [
            { text: "Just here for a drink.", next: "drink" },
            { text: "Do you have any work available?", next: "work" },
            { text: "Tell me about this place.", next: "about_venue" },
            {
              text: "I haven't finished the restock yet.",
              next: "restock_quest_not_yet",
              conditions: { questState: { questId: 3, state: "ACTIVE" } },
            },
            {
              text: "About that...",
              next: "restock_quest_help",
              conditions: { questState: { questId: 3, state: "ACTIVE" } },
            },
          ],
        },
        drink: {
          text: "Our specialty is the Spicy Marg! Would you like to try one?",
          options: [
            { text: "Sure, I'll have one.", next: "serve_drink" },
            { text: "Maybe later.", next: "end" },
          ],
        },
        serve_drink: {
          text: "Here you go! Enjoy your drink. Let me know if you need anything else.",
          options: [
            { text: "Do you have any work available?", next: "work" },
            { text: "Thanks, I'll be fine for now.", next: "end" },
          ],
        },
        work: {
          text: "Actually, I do have a little task if you're up for it. The bartender needs some help restocking the cellar. Interested?",
          options: [
            {
              text: "I'll help with the restocking.",
              next: "show_restock_quest",
            },
            { text: "Maybe another time.", next: "greeting" },
          ],
        },
        show_restock_quest: {
          text: "Great! Here's what you need to do:",
          quest_title: "Restock the Cellar",
          options: [
            { text: "What else can I do?", next: "quest_list" },
            { text: "Maybe another time.", next: "greeting" },
          ],
        },
        restock_quest_not_yet: {
          text: "No worries! Take your time. The cellar won't restock itself.",
          options: [
            { text: "Any other work?", next: "quest_list" },
            { text: "I'll get back to it.", next: "end" },
          ],
        },
        restock_quest_done: {
          text: "Fantastic! The bartender will be thrilled. Here's a few coins out of the tip jar, don't tell the others!",
          options: [
            { text: "What else can I do?", next: "quest_list" },
            { text: "Maybe another time.", next: "greeting" },
          ],
        },
        restock_quest_help: {
          text: "Having trouble? I didn't think restocking could be so tricky...",
          options: [
            {
              text: "Where is the cellar?",
              next: "restock_quest_help_cellar",
            },
            {
              text: "What do I need to restock?",
              next: "restock_quest_help_items",
            },
            { text: "I'll manage, nevermind.", next: "how_else_help" },
          ],
        },
        restock_quest_help_cellar: {
          text: "The cellar is just behind the bar, down the stairs to your left. Watch your step, it's a bit dark down there.",
          options: [
            {
              text: "Thanks for the tip!",
              next: "restock_quest_help_more",
            },
          ],
        },
        restock_quest_help_items: {
          text: "You'll need to restock ales, wines, and spirits. Check the inventory list on the bar counter for specifics.",
          options: [
            {
              text: "Got it, I'll check the list.",
              next: "restock_quest_help_more",
            },
          ],
        },
        restock_quest_help_more: {
          text: "Need any more help with the restocking?",
          options: [
            {
              text: "Where is the cellar?",
              next: "restock_quest_help_cellar",
            },
            {
              text: "What do I need to restock?",
              next: "restock_quest_help_items",
            },
            { text: "I'll manage, nevermind.", next: "how_else_help" },
          ],
        },
        how_else_help: {
          text: "Is there anything else I can help you with?",
          options: [
            { text: "Any other work?", next: "quest_list" },
            { text: "Not right now.", next: "end" },
          ],
        },
        about_venue: {
          text: "Bubala King's Cross is known for its lively atmosphere and great drinks. Although we're new here, we're quickly becoming a favorite spot for adventurers and locals alike.",
          options: [
            { text: "Any work going?", next: "quest_list" },
            { text: "Goodbye.", next: "end" },
          ],
        },
        quest_list: {
          text: "Here are the tasks I have available. We can use all the help we can get!",
          show_quests: true,
          options: [{ text: "Actually, I need to go.", next: "end" }],
        },
        end: {
          text: "Enjoy your time at Bubala King's Cross!",
          end: true,
        },
      },
    },
    {
      name: "Old Tom the Barkeep",
      avatar_url: undefined,
      description:
        "A weathered old bartender who has seen countless adventurers pass through. He always has a quest or two for those willing to help.",
      venue_id: 1, // The Rusty Spoon
      greeting_text:
        "Ah, a fresh face! Care to help an old man with some tasks?",
      dialogue_tree: {
        greeting: {
          text: "Ah, a fresh face! Welcome to The Rusty Spoon. What brings you to my humble establishment?",
          check_quest: "Clear the Cellar Rats",
          if_active: "check_rat_progress",
          options: [
            { text: "Just looking around.", next: "casual" },
            { text: "I heard you might have work?", next: "work" },
            { text: "Tell me about this place.", next: "about_venue" },
          ],
        },
        check_rat_progress: {
          text: "Ah, you're back! Have you dealt with those rats in the cellar yet?",
          options: [
            {
              text: "Not yet, still working on it.",
              next: "rat_quest_not_yet",
            },
            { text: "About that...", next: "rat_quest_help" },
          ],
        },
        rat_quest_help: {
          text: "Oh, having trouble...?",
          options: [
            {
              text: "How do I get to the cellar?",
              next: "rat_quest_help_cellar",
            },
            {
              text: "What's the best way to catch a rat?",
              next: "rat_quest_help_catch",
            },
            { text: "That's all, thanks.", next: "how_else_help" },
          ],
        },
        rat_quest_help_cellar: {
          text: "The cellar door is just behind the bar, to the left of the fireplace. Watch your step; it's a bit dark down there.",
          options: [
            {
              text: "Maybe I should bring a lantern.",
              next: "rat_quest_help_more",
            },
          ],
        },
        rat_quest_help_catch: {
          text: "Rats are clever little creatures. Try using some cheese as bait, and move slowly to avoid startling them. A good net or trap can make the job easier.",
          options: [
            { text: "Got it, a cheese net!", next: "rat_quest_help_more" },
          ],
        },
        rat_quest_help_more: {
          text: "Great idea! Need any more help?",
          options: [
            {
              text: "How do I get to the cellar?",
              next: "rat_quest_help_cellar",
            },
            {
              text: "What's the best way to catch a rat?",
              next: "rat_quest_help_catch",
            },
            { text: "That's all, thanks.", next: "how_else_help" },
          ],
        },
        how_else_help: {
          text: "Is there anything else I can do for you?",
          options: [
            { text: "Any other work?", next: "quest_list" },
            { text: "Not right now.", next: "end" },
          ],
        },
        rat_quest_not_yet: {
          text: "No worries! Take your time. Those rats aren't going anywhere... unfortunately.",
          options: [
            { text: "Any other work?", next: "quest_list" },
            { text: "I'll get back to it.", next: "end" },
          ],
        },
        casual: {
          text: "Well, you're welcome to stay and enjoy a drink. Let me know if you change your mind about that work!",
          options: [
            { text: "Actually, tell me about the work.", next: "work" },
            { text: "Goodbye.", next: "end" },
          ],
        },
        work: {
          text: "Ah, excellent! I do have a problem that needs solving. The rats in my cellar have been getting bolder, and I need someone brave enough to deal with them. Interested?",
          options: [
            { text: "I'll help with the rats!", next: "show_rat_quest" },
            { text: "What else do you have?", next: "quest_list" },
            { text: "Not right now.", next: "end" },
          ],
        },
        show_rat_quest: {
          text: "Excellent! Here's what I need:",
          quest_title: "Clear the Cellar Rats",
          options: [
            { text: "Show me other quests too.", next: "quest_list" },
            { text: "Maybe another time.", next: "end" },
          ],
        },
        about_venue: {
          text: "The Rusty Spoon has been here for generations! We serve the finest ale in London... well, the cheapest at least. Many adventurers start their journey here.",
          options: [
            { text: "Any work available?", next: "work" },
            { text: "Goodbye.", next: "end" },
          ],
        },
        quest_list: {
          text: "Excellent! Here's what I need help with. Pick what suits you best:",
          show_quests: true,
          if_no_work: {
            "Clear the Cellar Rats": "no_work_rats_active",
          },
          options: [{ text: "Actually, I need to go.", next: "end" }],
        },
        no_work_rats_active: {
          text: "I don't have any more work for you at the moment. Why don't you deal with those rats in the cellar first? They're still causing trouble down there!",
          options: [{ text: "I'll get back to it.", next: "end" }],
        },
        end: {
          text: "Safe travels, adventurer!",
          end: true,
        },
      },
    },
    {
      name: "Mysterious Hooded Figure",
      avatar_url: undefined,
      description:
        "A cloaked stranger who appears at various locations. Their true identity is unknown, but their quests are always intriguing.",
      venue_id: null, // Roaming NPC
      lat: 51.505,
      lng: -0.09,
      greeting_text: "I have information... for a price.",
      dialogue_tree: {
        greeting: {
          text: "...You look capable. I have information that might interest someone of your... talents.",
          options: [
            { text: "What kind of information?", next: "information" },
            { text: "I don't trust you.", next: "mistrust" },
            { text: "Leave me alone.", next: "end" },
          ],
        },
        information: {
          text: "The kind that leads to treasure... or trouble. Sometimes both. Are you interested?",
          options: [
            { text: "Show me what you have.", next: "quest_list" },
            { text: "No thanks.", next: "end" },
          ],
        },
        mistrust: {
          text: "*chuckles darkly* Smart. But sometimes you have to take risks for great rewards.",
          options: [
            { text: "Fine, show me.", next: "quest_list" },
            { text: "I'll pass.", next: "end" },
          ],
        },
        quest_list: {
          text: "These tasks require discretion... Choose wisely.",
          show_quests: true,
          options: [{ text: "I've changed my mind.", next: "end" }],
        },
        end: {
          text: "*The figure melts back into the shadows*",
          end: true,
        },
      },
    },
    {
      name: "Lady Penelope",
      avatar_url: undefined,
      description:
        "A noble lady who frequents the finest establishments. She seeks adventurers for more sophisticated quests.",
      venue_id: 2, // The Golden Lion
      greeting_text:
        "Oh my, you look like someone who can handle delicate matters!",
      dialogue_tree: {
        greeting: {
          text: "Oh my! Finally, someone who looks capable. I've been waiting for an adventurer like you!",
          options: [
            { text: "What do you need?", next: "need" },
            { text: "Flattery won't get you far.", next: "direct" },
            { text: "Not interested.", next: "end" },
          ],
        },
        need: {
          text: "I have certain... delicate matters that require a skilled and discreet individual. The pay is quite generous, I assure you.",
          options: [
            { text: "Tell me more.", next: "quest_list" },
            { text: "Maybe another time.", next: "end" },
          ],
        },
        direct: {
          text: "*laughs* I appreciate honesty! Very well, let's get to business then.",
          options: [
            { text: "What's the job?", next: "quest_list" },
            { text: "Goodbye.", next: "end" },
          ],
        },
        quest_list: {
          text: "Here are the tasks I need completed. Each one is worth your while:",
          show_quests: true,
          options: [{ text: "I'll think about it.", next: "end" }],
        },
        end: {
          text: "Do come back if you change your mind, dear!",
          end: true,
        },
      },
    },
  ];

  const insertedNPCs: any[] = [];

  for (const npc of npcs) {
    let query, values;

    if (npc.venue_id) {
      query = `
        INSERT INTO npcs (name, description, venue_id, avatar_url, greeting_text, dialogue_tree, is_quest_giver)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      values = [
        npc.name,
        npc.description,
        npc.venue_id,
        npc.avatar_url || null,
        npc.greeting_text,
        JSON.stringify(npc.dialogue_tree),
        true, // All seeded NPCs are quest givers
      ];
    } else {
      query = `
        INSERT INTO npcs (name, description, location, avatar_url, greeting_text, dialogue_tree, is_quest_giver)
        VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5, $6, $7, $8)
        RETURNING *
      `;
      values = [
        npc.name,
        npc.description,
        (npc as any).lng,
        (npc as any).lat,
        npc.avatar_url || null,
        npc.greeting_text,
        JSON.stringify((npc as any).dialogue_tree),
        true, // All seeded NPCs are quest givers
      ];
    }

    const result = await client.query(query, values);
    insertedNPCs.push(result.rows[0]);
    console.log(`   ✅ Created NPC: ${npc.name}`);
  }

  return insertedNPCs;
}

export async function linkNPCsToQuests(
  client: PoolClient,
  npcs: any[],
  quests: any[],
) {
  console.log("🔗 Linking NPCs to Quests...");

  const links = [
    {
      npc_name: "Old Tom the Barkeep",
      quest_title: "Clear the Cellar Rats",
      is_repeatable: false,
      level_requirement: 1,
    },
    {
      npc_name: "Old Tom the Barkeep",
      quest_title: "Pub Crawler Challenge",
      is_repeatable: true,
      level_requirement: 3,
    },
    {
      npc_name: "Kat the Serveress",
      quest_title: "Restock the Cellar",
      is_repeatable: false,
      level_requirement: 1,
    },
    {
      npc_name: "Mysterious Hooded Figure",
      quest_title: "The Mysterious Package",
      is_repeatable: false,
      level_requirement: 1,
    },
    {
      npc_name: "Lady Penelope",
      quest_title: "Friday Night Pint",
      is_repeatable: false,
      level_requirement: 1,
    },
  ];

  for (const link of links) {
    const npc = npcs.find((n) => n.name === link.npc_name);
    const quest = quests.find((q) => q.title === link.quest_title);

    if (npc && quest) {
      // Insert into npc_quests junction table
      await client.query(
        `INSERT INTO npc_quests (npc_id, quest_id, is_repeatable, level_requirement)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (npc_id, quest_id) DO NOTHING`,
        [npc.id, quest.id, link.is_repeatable, link.level_requirement],
      );

      // Also update the quest's giver_npc_id field if not already set
      await client.query(
        `UPDATE quests 
         SET giver_npc_id = $1, turn_in_npc_id = $1
         WHERE id = $2 AND giver_npc_id IS NULL`,
        [npc.id, quest.id],
      );

      console.log(`   ✅ Linked ${npc.name} -> ${quest.title}`);
    } else {
      console.log(
        `   ⚠️  Could not link: ${link.npc_name} -> ${link.quest_title}`,
      );
      if (!npc) console.log(`      NPC not found: ${link.npc_name}`);
      if (!quest) console.log(`      Quest not found: ${link.quest_title}`);
    }
  }
}
