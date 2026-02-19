"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const app_1 = __importDefault(require("./app"));
const pool_1 = __importStar(require("./db/pool")); // <--- Updated Import
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
const startServer = async () => {
    // 1. Check DB Connection
    await (0, pool_1.testDbConnection)();
    // 2. Create Raw HTTP Server
    const httpServer = http_1.default.createServer(app_1.default);
    // 3. Attach Socket.io
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });
    // 4. Socket Event Logic
    io.on("connection", (socket) => {
        console.log(`⚡ User Connected: ${socket.id}`);
        // Join Party
        socket.on("join_party", async (userId) => {
            try {
                // Select joined_at too
                const res = await pool_1.default.query(`
                SELECT party_id, joined_at 
                FROM party_members 
                WHERE user_id = $1
            `, [userId]);
                if (res.rows.length > 0) {
                    const { party_id, joined_at } = res.rows[0];
                    const partyId = `party_${party_id}`;
                    socket.join(partyId);
                    console.log(`🛡️  User ${userId} connected to ${partyId}`);
                    const now = new Date();
                    const joinedTime = new Date(joined_at);
                    const secondsSinceJoin = (now.getTime() - joinedTime.getTime()) / 1000;
                    if (secondsSinceJoin < 60) {
                        // Scenario A: Just joined via the API
                        socket
                            .to(partyId)
                            .emit("party_notification", `User ${userId} has joined the party! 🍻`);
                    }
                    else {
                        // Scenario B: Re-opening the app
                        socket
                            .to(partyId)
                            .emit("party_notification", `User ${userId} is back online.`);
                    }
                }
            }
            catch (err) {
                console.error("Socket DB Error:", err);
            }
        });
        socket.on("leave_party", (partyId) => {
            const roomName = `party_${partyId}`;
            console.log(`👋 User ${socket.id} left ${roomName}`);
            // 1. Notify the others BEFORE leaving
            socket
                .to(roomName)
                .emit("party_notification", `A hero has left the party.`);
            // 2. Actually leave the socket room (stops receiving updates)
            socket.leave(roomName);
        });
        // Live Location Update
        socket.on("update_location", (data) => {
            const { partyId, lat, lng, username } = data;
            // Broadcast to room
            socket
                .to(partyId)
                .emit("member_moved", { id: socket.id, username, lat, lng });
        });
        socket.on("disconnect", () => {
            console.log("User Disconnected", socket.id);
        });
    });
    // 5. Start Listening
    httpServer.listen(PORT, () => {
        console.log(`🚀 PubQuest Server + WebSockets running on http://localhost:${PORT}`);
    });
};
startServer();
