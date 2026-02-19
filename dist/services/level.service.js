"use strict";
/**
 * Level Service
 * Handles XP-to-level calculations and level updates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLevel = calculateLevel;
exports.xpForLevel = xpForLevel;
exports.xpToNextLevel = xpToNextLevel;
exports.levelProgress = levelProgress;
/**
 * Calculate level from XP using square root formula
 *
 * Level progression:
 * - Level 1: 0 XP
 * - Level 2: 100 XP
 * - Level 5: 2,500 XP
 * - Level 10: 10,000 XP
 * - Level 20: 40,000 XP
 * - Level 50: 250,000 XP
 *
 * Formula: level = floor(sqrt(xp / 100))
 */
function calculateLevel(xp) {
    if (xp < 0)
        return 1;
    return Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
}
/**
 * Calculate XP required for a specific level
 */
function xpForLevel(level) {
    if (level <= 1)
        return 0;
    return Math.pow(level - 1, 2) * 100;
}
/**
 * Calculate XP needed to reach next level
 */
function xpToNextLevel(currentXP) {
    const currentLevel = calculateLevel(currentXP);
    const nextLevelXP = xpForLevel(currentLevel + 1);
    return nextLevelXP - currentXP;
}
/**
 * Calculate progress percentage to next level
 */
function levelProgress(currentXP) {
    const currentLevel = calculateLevel(currentXP);
    const currentLevelXP = xpForLevel(currentLevel);
    const nextLevelXP = xpForLevel(currentLevel + 1);
    const xpInCurrentLevel = currentXP - currentLevelXP;
    const xpNeededForLevel = nextLevelXP - currentLevelXP;
    return Math.floor((xpInCurrentLevel / xpNeededForLevel) * 100);
}
