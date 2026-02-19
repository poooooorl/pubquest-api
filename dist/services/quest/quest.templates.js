"use strict";
/**
 * Quest Templates/Definitions
 *
 * This is where quests are DEFINED as data, not code.
 * The Quest Engine reads these templates and tracks progress dynamically.
 *
 * In a production app, this would be:
 * - A CMS/admin panel
 * - JSON files loaded at runtime
 * - Database records
 * - ScriptableObjects (Unity)
 *
 * Benefits of data-driven design:
 * - Designers can create quests without coding
 * - Easy to localize (text in separate files)
 * - Can be edited at runtime
 * - Version control friendly
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUEST_TEMPLATES = void 0;
exports.getQuestTemplate = getQuestTemplate;
exports.getQuestsByCategory = getQuestsByCategory;
exports.getQuestsForLevel = getQuestsForLevel;
// ============================================================================
// Quest Template Catalog
// ============================================================================
exports.QUEST_TEMPLATES = {
    // ==========================================================================
    // Tutorial Quests
    // ==========================================================================
    FIRST_STEPS: {
        id: 1,
        title: "First Steps",
        description: "Welcome to PubQuest! Visit your first pub to begin your journey.",
        prerequisites: undefined, // No requirements
        objectives: [
            {
                id: 1,
                quest_id: 1,
                order_index: 1,
                description: "Visit any pub",
                type: "LOCATION",
                target_value: "CAT:PUB",
                target_count: 1,
                reward_xp: 50,
            },
        ],
        reward_xp: 100,
        reward_gold: 10,
        category: "TUTORIAL",
        is_repeatable: false,
        giver_npc_id: 1, // Tutorial NPC
    },
    // ==========================================================================
    // Main Story Quests
    // ==========================================================================
    THE_LEGENDARY_PINT: {
        id: 2,
        title: "The Legendary Pint",
        description: "Kat the Serveress has heard tales of a legendary drink. Help her track it down.",
        prerequisites: {
            minLevel: 2,
            completedQuests: [1], // Must complete First Steps
        },
        objectives: [
            {
                id: 2,
                quest_id: 2,
                order_index: 1,
                description: "Speak to Kat at The Brass Monkey",
                type: "LOCATION",
                target_value: "1", // Specific venue ID
                target_count: 1,
                reward_xp: 25,
            },
            {
                id: 3,
                quest_id: 2,
                order_index: 2,
                description: "Visit 3 different pubs to search for clues",
                type: "LOCATION",
                target_value: "CAT:PUB",
                target_count: 3,
                reward_xp: 75,
            },
            {
                id: 4,
                quest_id: 2,
                order_index: 3,
                description: "Spend 500 gold on drinks",
                type: "SPEND",
                target_value: "500",
                target_count: 1,
                reward_xp: 50,
            },
        ],
        reward_xp: 500,
        reward_gold: 100,
        category: "MAIN_STORY",
        is_repeatable: false,
        giver_npc_id: 2, // Kat the Serveress
        turn_in_npc_id: 2,
    },
    // ==========================================================================
    // Daily Quests
    // ==========================================================================
    DAILY_PUB_CRAWLER: {
        id: 3,
        title: "Daily Pub Crawler",
        description: "Show your dedication by visiting 3 pubs today!",
        prerequisites: {
            minLevel: 1,
        },
        objectives: [
            {
                id: 5,
                quest_id: 3,
                order_index: 1,
                description: "Visit 3 pubs",
                type: "LOCATION",
                target_value: "CAT:PUB",
                target_count: 3,
                reward_xp: 100,
            },
        ],
        reward_xp: 200,
        reward_gold: 50,
        category: "DAILY",
        is_repeatable: true,
        cooldown_hours: 24,
    },
    DAILY_BIG_SPENDER: {
        id: 4,
        title: "Daily Big Spender",
        description: "Support local businesses by spending 1000 gold!",
        prerequisites: {
            minLevel: 3,
        },
        objectives: [
            {
                id: 6,
                quest_id: 4,
                order_index: 1,
                description: "Spend 1000 gold at venues",
                type: "SPEND",
                target_value: "1000",
                target_count: 1,
                reward_xp: 150,
            },
        ],
        reward_xp: 300,
        reward_gold: 100,
        category: "DAILY",
        is_repeatable: true,
        cooldown_hours: 24,
    },
    // ==========================================================================
    // Side Quests
    // ==========================================================================
    TASTE_TESTER: {
        id: 5,
        title: "The Taste Tester",
        description: "Sample drinks from 5 different venues to become a true connoisseur.",
        prerequisites: {
            minLevel: 2,
        },
        objectives: [
            {
                id: 7,
                quest_id: 5,
                order_index: 1,
                description: "Visit 5 different venues",
                type: "LOCATION",
                target_value: "CAT:PUB", // Could also be "CAT:BAR" or "CAT:CLUB"
                target_count: 5,
                reward_xp: 200,
            },
        ],
        reward_xp: 400,
        reward_gold: 75,
        category: "SIDE_QUEST",
        is_repeatable: false,
    },
    // ==========================================================================
    // Weekly Challenge
    // ==========================================================================
    WEEKLY_SOCIAL_BUTTERFLY: {
        id: 6,
        title: "Weekly Social Butterfly",
        description: "The ultimate challenge: visit 10 venues this week!",
        prerequisites: {
            minLevel: 5,
        },
        objectives: [
            {
                id: 8,
                quest_id: 6,
                order_index: 1,
                description: "Visit 10 different venues",
                type: "LOCATION",
                target_value: "CAT:PUB",
                target_count: 10,
                reward_xp: 500,
            },
            {
                id: 9,
                quest_id: 6,
                order_index: 2,
                description: "Spend 2000 gold total",
                type: "SPEND",
                target_value: "2000",
                target_count: 1,
                reward_xp: 300,
            },
        ],
        reward_xp: 1500,
        reward_gold: 500,
        category: "WEEKLY",
        is_repeatable: true,
        cooldown_hours: 168, // 7 days
    },
};
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Get quest template by ID
 */
function getQuestTemplate(questId) {
    return Object.values(exports.QUEST_TEMPLATES).find((q) => q.id === questId);
}
/**
 * Get all quests in a category
 */
function getQuestsByCategory(category) {
    return Object.values(exports.QUEST_TEMPLATES).filter((q) => q.category === category);
}
/**
 * Get quests for a specific level range
 */
function getQuestsForLevel(level) {
    return Object.values(exports.QUEST_TEMPLATES).filter((q) => {
        if (!q.prerequisites?.minLevel)
            return true;
        return level >= q.prerequisites.minLevel;
    });
}
// ============================================================================
// Localization Example (Future Enhancement)
// ============================================================================
/**
 * In a real app, you'd separate text into localization files:
 *
 * en-US.json:
 * {
 *   "QUEST_FIRST_STEPS_TITLE": "First Steps",
 *   "QUEST_FIRST_STEPS_DESC": "Welcome to PubQuest!...",
 *   "OBJECTIVE_VISIT_PUB": "Visit any pub"
 * }
 *
 * es-ES.json:
 * {
 *   "QUEST_FIRST_STEPS_TITLE": "Primeros Pasos",
 *   "QUEST_FIRST_STEPS_DESC": "¡Bienvenido a PubQuest!...",
 *   "OBJECTIVE_VISIT_PUB": "Visita cualquier pub"
 * }
 *
 * Then reference by key instead of hardcoded strings.
 */
