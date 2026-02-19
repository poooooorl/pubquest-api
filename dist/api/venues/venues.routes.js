"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const venues_controller_1 = require("../../api/venues/venues.controller");
const router = (0, express_1.Router)();
// GET /api/venues/nearby (Get venues near a location)
router.get("/nearby", venues_controller_1.getNearbyVenues);
// GET /api/venues/:id (Get single venue by ID)
router.get("/:id", venues_controller_1.getVenueById);
// GET /api/venues (Get all venues with pagination)
router.get("/", venues_controller_1.getVenues);
exports.default = router;
