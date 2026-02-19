import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "@/db/pool";
import { AuthRequest } from "@/middleware/auth.middleware";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_dev_key"; // In prod, put this in .env
// POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: "Missing fields" });
      return;
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    await client.query("BEGIN");

    // 1. Create User
    const userRes = await client.query(
      `
            INSERT INTO users (username, email, password_hash, current_location)
            VALUES ($1, $2, $3, ST_GeographyFromText('POINT(-0.1332 51.5160)'))
            RETURNING id, username, email, xp, level, gold
        `,
      [username, email, hash],
    );

    const user = userRes.rows[0];

    // 2. Find "The First Pint" Quest
    const questRes = await client.query(`
            SELECT id FROM quests WHERE title = 'The First Pint' LIMIT 1
        `);

    if (questRes.rows.length > 0) {
      const questId = questRes.rows[0].id;

      // 3. Assign the Quest
      await client.query(
        `
                INSERT INTO user_quests (user_id, quest_id, status)
                VALUES ($1, $2, 'IN_PROGRESS')
            `,
        [user.id, questId],
      );

      // 4. (NEW) Initialize Progress for ALL Objectives
      // This ensures the engine knows Step 2 exists!
      await client.query(
        `
                INSERT INTO user_objective_progress (user_id, objective_id, is_completed)
                SELECT $1, id, FALSE
                FROM quest_objectives 
                WHERE quest_id = $2
            `,
        [user.id, questId],
      );

      console.log(
        `⚔️  Starter Quest (and objectives) assigned to ${user.username}`,
      );
    }

    await client.query("COMMIT");

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        xp: user.xp,
        level: user.level,
        gold: user.gold,
      },
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      res.status(409).json({ error: "Username or Email already exists" });
    } else {
      console.error(err);
      res.status(500).json({ error: "Registration failed" });
    }
  } finally {
    client.release();
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // 1. Find User
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const user = result.rows[0];

    // 2. Check Password (if they have one)
    if (!user.password_hash) {
      res
        .status(401)
        .json({ error: "User has no password set (Legacy account)" });
      return;
    }

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // 3. Generate Token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        xp: user.xp,
        level: user.level,
        gold: user.gold,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
};

// GET /api/auth/me
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // --- FIX: Explicitly select XP, Gold, Venue ID, Party Info, and Level ---
    const result = await pool.query(
      `SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.xp,
        u.level,
        u.gold, 
        u.venue_id,
        pm.party_id,
        p.name as party_name
       FROM users u
       LEFT JOIN party_members pm ON u.id = pm.user_id
       LEFT JOIN parties p ON pm.party_id = p.id
       WHERE u.id = $1`,
      [userId],
    );

    const user = result.rows[0];

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Return in the format AuthContext expects: { user: ... }
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
};
