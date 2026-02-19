"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_dev_key";
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    // Format: "Bearer <token>"
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        res.status(401).json({ error: "Access Denied: No Token Provided" });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded; // Attach user info to request
        next(); // Move to the next function (the controller)
    }
    catch (err) {
        res.status(403).json({ error: "Invalid Token" });
    }
};
exports.authenticateToken = authenticateToken;
