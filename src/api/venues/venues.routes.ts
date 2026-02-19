import { Router } from "express";
import {
  getVenues,
  getVenueById,
  getNearbyVenues,
} from "@/api/venues/venues.controller";

const router = Router();

// GET /api/venues/nearby (Get venues near a location)
router.get("/nearby", getNearbyVenues);

// GET /api/venues/:id (Get single venue by ID)
router.get("/:id", getVenueById);

// GET /api/venues (Get all venues with pagination)
router.get("/", getVenues);

export default router;
