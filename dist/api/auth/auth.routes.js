"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../../api/auth/auth.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware"); // <--- Import Middleware
const router = (0, express_1.Router)();
router.post("/register", auth_controller_1.register);
router.post("/login", auth_controller_1.login);
router.get("/me", auth_middleware_1.authenticateToken, auth_controller_1.getMe);
exports.default = router;
