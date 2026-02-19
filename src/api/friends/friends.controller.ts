import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import pool from "../../db/pool";
import {
  getCached,
  setCached,
  deleteCached,
  CacheKeys,
} from "../../services/cache.service";

// Send friend request
export const sendFriendRequest = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { addresseeId } = req.body;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!addresseeId) {
    res.status(400).json({ error: "addresseeId is required" });
    return;
  }

  if (userId === addresseeId) {
    res.status(400).json({ error: "Cannot send friend request to yourself" });
    return;
  }

  try {
    // Check if addressee exists
    const addresseeCheck = await pool.query(
      `SELECT id FROM users WHERE id = $1`,
      [addresseeId],
    );

    if (addresseeCheck.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check if friendship already exists (in either direction)
    const existingFriendship = await pool.query(
      `SELECT * FROM friendships 
       WHERE (requester_id = $1 AND addressee_id = $2) 
          OR (requester_id = $2 AND addressee_id = $1)`,
      [userId, addresseeId],
    );

    if (existingFriendship.rows.length > 0) {
      const friendship = existingFriendship.rows[0];
      if (friendship.status === "ACCEPTED") {
        res.status(400).json({ error: "Already friends" });
        return;
      }
      if (friendship.status === "PENDING") {
        res.status(400).json({ error: "Friend request already pending" });
        return;
      }
    }

    // Create friend request
    const result = await pool.query(
      `INSERT INTO friendships (requester_id, addressee_id, status)
       VALUES ($1, $2, 'PENDING')
       RETURNING *`,
      [userId, addresseeId],
    );

    // Invalidate cache for both users (in case they were displaying pending requests)
    await Promise.all([
      deleteCached(CacheKeys.USER_FRIENDS(userId)),
      deleteCached(CacheKeys.USER_FRIENDS(addresseeId)),
    ]);

    res.json({ friendship: result.rows[0] });
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ error: "Failed to send friend request" });
  }
};

// Accept friend request
export const acceptFriendRequest = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { friendshipId } = req.params;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // Check that the friendship exists and user is the addressee
    const friendshipCheck = await pool.query(
      `SELECT * FROM friendships WHERE id = $1 AND addressee_id = $2 AND status = 'PENDING'`,
      [friendshipId, userId],
    );

    if (friendshipCheck.rows.length === 0) {
      res.status(404).json({ error: "Friend request not found" });
      return;
    }

    // Update status to accepted
    const result = await pool.query(
      `UPDATE friendships 
       SET status = 'ACCEPTED', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [friendshipId],
    );

    // Invalidate cache for both users
    const acceptedFriendship = result.rows[0];
    await Promise.all([
      deleteCached(CacheKeys.USER_FRIENDS(acceptedFriendship.requester_id)),
      deleteCached(CacheKeys.USER_FRIENDS(acceptedFriendship.addressee_id)),
    ]);

    res.json({ friendship: result.rows[0] });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).json({ error: "Failed to accept friend request" });
  }
};

// Reject friend request
export const rejectFriendRequest = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { friendshipId } = req.params;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // Check that the friendship exists and user is the addressee
    const friendship = await pool.query(
      `SELECT * FROM friendships WHERE id = $1 AND addressee_id = $2 AND status = 'PENDING'`,
      [friendshipId, userId],
    );

    if (friendship.rows.length === 0) {
      res.status(404).json({ error: "Friend request not found" });
      return;
    }

    // Delete the friendship (or update to REJECTED if you want to keep history)
    await pool.query(`DELETE FROM friendships WHERE id = $1`, [friendshipId]);

    res.json({ message: "Friend request rejected" });
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    res.status(500).json({ error: "Failed to reject friend request" });
  }
};

// Get all friends (accepted friendships) with optional search filter and pagination
export const getFriends = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || "";

    // Check cache for default friends list (no search, first page)
    if (!search && page === 1) {
      const cached = await getCached<any>(CacheKeys.USER_FRIENDS(userId));
      if (cached) {
        res.json(cached);
        return;
      }
    }

    const client = await pool.connect();

    try {
      // Build WHERE clause for data query
      let dataWhereClauses = [
        `(f.requester_id = $3 OR f.addressee_id = $3)`,
        `f.status = 'ACCEPTED'`,
      ];
      let dataQueryParams: any[] = [limit, offset, userId];
      let dataParamIndex = 4;

      // Build WHERE clause for count query
      let countWhereClauses = [
        `(f.requester_id = $1 OR f.addressee_id = $1)`,
        `f.status = 'ACCEPTED'`,
      ];
      let countQueryParams: any[] = [userId];
      let countParamIndex = 2;

      // Add search filter if provided
      if (search) {
        dataWhereClauses.push(
          `(CASE WHEN f.requester_id = $3 THEN u2.username ELSE u1.username END ILIKE $${dataParamIndex} OR 
           CASE WHEN f.requester_id = $3 THEN u2.email ELSE u1.email END ILIKE $${dataParamIndex})`,
        );
        dataQueryParams.push(`%${search}%`);
        dataParamIndex++;

        countWhereClauses.push(
          `(CASE WHEN f.requester_id = $1 THEN u2.username ELSE u1.username END ILIKE $${countParamIndex} OR 
           CASE WHEN f.requester_id = $1 THEN u2.email ELSE u1.email END ILIKE $${countParamIndex})`,
        );
        countQueryParams.push(`%${search}%`);
        countParamIndex++;
      }

      const dataWhereClause = `WHERE ${dataWhereClauses.join(" AND ")}`;
      const countWhereClause = `WHERE ${countWhereClauses.join(" AND ")}`;

      // 1. Data Query (The Page)
      const dataQuery = `
        SELECT 
          f.id as friendship_id,
          f.created_at as friends_since,
          CASE 
            WHEN f.requester_id = $3 THEN u2.id
            ELSE u1.id
          END as friend_id,
          CASE 
            WHEN f.requester_id = $3 THEN u2.username
            ELSE u1.username
          END as friend_username,
          CASE 
            WHEN f.requester_id = $3 THEN u2.email
            ELSE u1.email
          END as friend_email,
          CASE 
            WHEN f.requester_id = $3 THEN u2.xp
            ELSE u1.xp
          END as friend_xp,
          CASE 
            WHEN f.requester_id = $3 THEN u2.level
            ELSE u1.level
          END as friend_level,
          CASE 
            WHEN f.requester_id = $3 THEN u2.venue_id
            ELSE u1.venue_id
          END as friend_venue_id,
          CASE 
            WHEN f.requester_id = $3 THEN v2.name
            ELSE v1.name
          END as friend_venue_name,
          CASE 
            WHEN f.requester_id = $3 THEN u2.last_active
            ELSE u1.last_active
          END as friend_last_active,
          CASE 
            WHEN f.requester_id = $3 THEN ST_Y(u2.current_location::geometry)
            ELSE ST_Y(u1.current_location::geometry)
          END as friend_lat,
          CASE 
            WHEN f.requester_id = $3 THEN ST_X(u2.current_location::geometry)
            ELSE ST_X(u1.current_location::geometry)
          END as friend_lng,
          CASE 
            WHEN f.requester_id = $3 THEN pm2.party_id
            ELSE pm1.party_id
          END as friend_party_id,
          CASE 
            WHEN f.requester_id = $3 THEN p2.name
            ELSE p1.name
          END as friend_party_name
        FROM friendships f
        JOIN users u1 ON f.requester_id = u1.id
        JOIN users u2 ON f.addressee_id = u2.id
        LEFT JOIN venues v1 ON u1.venue_id = v1.id
        LEFT JOIN venues v2 ON u2.venue_id = v2.id
        LEFT JOIN party_members pm1 ON u1.id = pm1.user_id
        LEFT JOIN party_members pm2 ON u2.id = pm2.user_id
        LEFT JOIN parties p1 ON pm1.party_id = p1.id
        LEFT JOIN parties p2 ON pm2.party_id = p2.id
        ${dataWhereClause}
        ORDER BY friend_username ASC
        LIMIT $1 OFFSET $2
      `;

      // 2. Count Query (The Total)
      const countQuery = `
        SELECT COUNT(*) 
        FROM friendships f
        JOIN users u1 ON f.requester_id = u1.id
        JOIN users u2 ON f.addressee_id = u2.id
        ${countWhereClause}
      `;

      // Run both in parallel for speed
      const [dataRes, countRes] = await Promise.all([
        client.query(dataQuery, dataQueryParams),
        client.query(countQuery, countQueryParams),
      ]);

      const total = parseInt(countRes.rows[0].count);

      const response = {
        data: dataRes.rows,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };

      // Cache friends list (5 minutes TTL)
      if (!search && page === 1) {
        await setCached(CacheKeys.USER_FRIENDS(userId), response, 300);
      }

      // 3. Return Full Meta Data
      res.json(response);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error getting friends:", error);
    res.status(500).json({ error: "Failed to get friends" });
  }
};

// Get pending friend requests (received)
export const getPendingRequests = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // Get pending requests where user is the addressee
    const result = await pool.query(
      `SELECT 
        f.id as friendship_id,
        f.created_at,
        u.id as requester_id,
        u.username as requester_username,
        u.xp as requester_xp
       FROM friendships f
       JOIN users u ON f.requester_id = u.id
       WHERE f.addressee_id = $1 AND f.status = 'PENDING'
       ORDER BY f.created_at DESC`,
      [userId],
    );

    res.json({ requests: result.rows });
  } catch (error) {
    console.error("Error getting pending requests:", error);
    res.status(500).json({ error: "Failed to get pending requests" });
  }
};

// Remove friend (delete friendship)
export const removeFriend = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { friendshipId } = req.params;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // Check that the friendship exists and user is part of it
    const friendship = await pool.query(
      `SELECT * FROM friendships 
       WHERE id = $1 AND (requester_id = $2 OR addressee_id = $2) AND status = 'ACCEPTED'`,
      [friendshipId, userId],
    );

    if (friendship.rows.length === 0) {
      res.status(404).json({ error: "Friendship not found" });
      return;
    }

    const friendshipRow = friendship.rows[0];
    const otherUserId =
      friendshipRow.requester_id === userId
        ? friendshipRow.addressee_id
        : friendshipRow.requester_id;

    // Delete the friendship
    await pool.query(`DELETE FROM friendships WHERE id = $1`, [friendshipId]);

    // Invalidate cache for both users
    await Promise.all([
      deleteCached(CacheKeys.USER_FRIENDS(userId)),
      deleteCached(CacheKeys.USER_FRIENDS(otherUserId)),
    ]);

    res.json({ message: "Friend removed" });
  } catch (error) {
    console.error("Error removing friend:", error);
    res.status(500).json({ error: "Failed to remove friend" });
  }
};
