import {
  ObjectiveDefinition,
  QuestEvent,
  ObjectiveHandler,
  LocationEventData,
  SpendEventData,
} from "@/services/quest/quest.types";

/**
 * Registry of objective handlers by type
 */
export const ObjectiveHandlers: Record<string, ObjectiveHandler> = {
  LOCATION: handleLocationObjective,
  SPEND: handleSpendObjective,
};

// ============================================================================
// LOCATION OBJECTIVE HANDLER
// ============================================================================

/**
 * Location objective handler with incremental tracking
 *
 * Supports:
 * - Category-based: "CAT:PUB" = Any pub
 * - Specific venue: "123" = Venue with ID 123
 * - Incremental: "Visit 5 pubs" = target_count: 5
 *
 * @example
 * // Category match (incremental)
 * objective: { target_value: "CAT:PUB", target_count: 3, current_progress: 1 }
 * event.data: { venueId: 5, venueCategory: "PUB" }
 * result: { satisfied: false, newProgress: 2 } // 2/3 complete
 *
 * @example
 * // Specific venue match (single)
 * objective: { target_value: "123", target_count: 1, current_progress: 0 }
 * event.data: { venueId: 123 }
 * result: { satisfied: true, newProgress: 1 } // Complete!
 */
export function handleLocationObjective(
  objective: ObjectiveDefinition,
  event: QuestEvent,
  currentProgress: number,
): { satisfied: boolean; newProgress: number } {
  if (event.type !== "LOCATION") {
    return { satisfied: false, newProgress: currentProgress };
  }

  const data = event.data as LocationEventData;
  const targetValue = objective.target_value;
  const userVenueId = String(data.venueId);
  const userVenueCategory = data.venueCategory || "";

  let matches = false;

  // Check if this is a category-based objective
  if (targetValue.startsWith("CAT:")) {
    const requiredCategory = targetValue.split(":")[1];
    matches = userVenueCategory === requiredCategory;
  } else {
    // Specific venue ID objective
    matches = userVenueId === targetValue;
  }

  if (!matches) {
    return { satisfied: false, newProgress: currentProgress };
  }

  // Match found! Increment progress
  const newProgress = currentProgress + 1;
  const satisfied = newProgress >= objective.target_count;

  return { satisfied, newProgress };
}

// ============================================================================
// SPEND OBJECTIVE HANDLER
// ============================================================================

/**
 * Spend objective handler with incremental tracking
 *
 * Supports:
 * - Item-specific: "ITEM:Guinness" = Must spend on Guinness
 * - Minimum amount: "500" = Must spend at least 500 cents
 * - Incremental: Accumulates spending over time
 *
 * @example
 * // Item-specific spend (single purchase)
 * objective: { target_value: "ITEM:Guinness", target_count: 1, current_progress: 0 }
 * event.data: { description: "2x Guinness", amountCents: 1200 }
 * result: { satisfied: true, newProgress: 1 }
 *
 * @example
 * // Incremental amount spend
 * objective: { target_value: "1000", target_count: 1000, current_progress: 300 }
 * event.data: { amountCents: 400 }
 * result: { satisfied: false, newProgress: 700 } // 700/1000 cents
 */
export function handleSpendObjective(
  objective: ObjectiveDefinition,
  event: QuestEvent,
  currentProgress: number,
): { satisfied: boolean; newProgress: number } {
  if (event.type !== "SPEND") {
    return { satisfied: false, newProgress: currentProgress };
  }

  const data = event.data as SpendEventData;
  const targetValue = objective.target_value;

  // Check if this is an item-specific objective
  if (targetValue.startsWith("ITEM:")) {
    const requiredItem = targetValue.split(":")[1];
    const description = data.description || "";

    if (!description.toLowerCase().includes(requiredItem.toLowerCase())) {
      return { satisfied: false, newProgress: currentProgress };
    }

    // Item found in purchase! Increment count
    const newProgress = currentProgress + 1;
    const satisfied = newProgress >= objective.target_count;

    return { satisfied, newProgress };
  }

  // Otherwise, it's a minimum amount objective (accumulative)
  const minimumAmount = parseInt(targetValue);
  const spentAmount = data.amountCents || 0;

  // Accumulate spending
  const newProgress = currentProgress + spentAmount;
  const satisfied = newProgress >= minimumAmount;

  return { satisfied, newProgress };
}
