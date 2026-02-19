"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedCheckIns = seedCheckIns;
/**
 * Seed check-ins for some users
 * This simulates users being actively checked in at various venues
 * Also updates their location to match the venue location
 */
async function seedCheckIns(client, users, venues) {
    // Check in some users to random venues
    const checkIns = [
        { username: "alice", venueIndex: 0 }, // The Rusty Spoon
        { username: "bob", venueIndex: 2 }, // Third venue
        { username: "charlie", venueIndex: 5 }, // Sixth venue
        { username: "grace", venueIndex: 1 }, // Second venue
        { username: "jack", venueIndex: 8 }, // Ninth venue
    ];
    for (const checkIn of checkIns) {
        const user = users.find((u) => u.username === checkIn.username);
        const venue = venues[checkIn.venueIndex];
        if (user && venue) {
            // Update both venue_id and location to match the venue
            await client.query(`UPDATE users 
         SET venue_id = $1, 
             current_location = (SELECT location FROM venues WHERE id = $1)
         WHERE id = $2`, [venue.id, user.id]);
        }
    }
    console.log(`✅ Checked in ${checkIns.length} users to venues`);
}
