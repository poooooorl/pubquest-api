import { Request, Response } from "express";
import pool from "@/db/pool";
import { getCached, setCached, CacheKeys } from "@/services/cache.service";

export const getVenueById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = req.params.id;
    const venueId = parseInt(Array.isArray(id) ? id[0] : id);

    if (isNaN(venueId)) {
      res.status(400).json({ error: "Invalid venue ID" });
      return;
    }

    const client = await pool.connect();

    try {
      const query = `
        SELECT 
          v.id, 
          v.name, 
          v.category,
          v.is_partner,
          ST_Y(v.location::geometry) as lat,
          ST_X(v.location::geometry) as lng,
          COUNT(u.id)::int as live_count
        FROM venues v
        LEFT JOIN users u ON u.venue_id = v.id
        WHERE v.id = $1
        GROUP BY v.id
      `;

      const result = await client.query(query, [venueId]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Venue not found" });
        return;
      }

      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Get Venue By ID Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getNearbyVenues = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50); // Max 50
    const radius = parseInt(req.query.radius as string) || 5000; // Default 5km

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ error: "lat and lng are required" });
      return;
    }

    // Check cache
    const cacheKey = CacheKeys.NEARBY_VENUES(lat, lng, radius);
    const cached = await getCached<any>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const client = await pool.connect();

    try {
      const query = `
        SELECT 
          v.id, 
          v.name, 
          v.category,
          v.is_partner,
          ST_Y(v.location::geometry) as lat,
          ST_X(v.location::geometry) as lng,
          COUNT(u.id)::int as live_count,
          ST_Distance(v.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)) as distance_meters
        FROM venues v
        LEFT JOIN users u ON u.venue_id = v.id
        WHERE ST_DWithin(v.location, ST_SetSRID(ST_MakePoint($1, $2), 4326), $3)
        GROUP BY v.id, v.location
        ORDER BY distance_meters ASC
        LIMIT $4
      `;

      const result = await client.query(query, [lng, lat, radius, limit]);

      const response = { data: result.rows };

      // Cache for 5 minutes
      await setCached(cacheKey, response, 300);

      res.json(response);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Get Nearby Venues Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getVenues = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || "";

    const client = await pool.connect();

    try {
      // Build WHERE clause for search
      let whereClause = "";
      let queryParams: any[] = [limit, offset];
      let countParams: any[] = [];

      if (search) {
        whereClause = "WHERE (v.name ILIKE $3 OR v.category ILIKE $3)";
        queryParams.push(`%${search}%`);
        countParams.push(`%${search}%`);
      }

      // Data query
      const dataQuery = `
        SELECT 
          v.id, 
          v.name, 
          v.category,
          ST_Y(v.location::geometry) as lat,
          ST_X(v.location::geometry) as lng,
          COUNT(u.id)::int as live_count
        FROM venues v
        LEFT JOIN users u ON u.venue_id = v.id
        ${whereClause}
        GROUP BY v.id
        ORDER BY v.id ASC
        LIMIT $1 OFFSET $2
      `;

      // Count query
      const countQuery = `SELECT COUNT(*) FROM venues v ${search ? "WHERE (v.name ILIKE $1 OR v.category ILIKE $1)" : ""}`;

      // Run both in parallel
      const [dataRes, countRes] = await Promise.all([
        client.query(dataQuery, queryParams),
        client.query(countQuery, countParams),
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

      res.json(response);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Get Venues Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
