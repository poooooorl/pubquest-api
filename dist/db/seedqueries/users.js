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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUsersSeedQuery = exports.defaultPassword = exports.adminUser = exports.defaultUsers = void 0;
exports.seedUsers = seedUsers;
const bcrypt = __importStar(require("bcrypt"));
const level_service_1 = require("../../services/level.service");
exports.defaultUsers = [
    {
        username: "dave",
        email: "dave@pubquest.com",
        xp: 100,
        gold: 50,
        lat: 51.5074,
        lng: -0.1278,
    },
    {
        username: "alice",
        email: "alice@test.com",
        xp: 250,
        gold: 100,
        lat: 51.5085,
        lng: -0.1257,
    },
    {
        username: "bob",
        email: "bob@test.com",
        xp: 150,
        gold: 75,
        lat: 51.5095,
        lng: -0.134,
    },
    {
        username: "charlie",
        email: "charlie@test.com",
        xp: 300,
        gold: 120,
        lat: 51.5065,
        lng: -0.129,
    },
    {
        username: "diana",
        email: "diana@test.com",
        xp: 200,
        gold: 90,
        lat: 51.51,
        lng: -0.131,
    },
    {
        username: "emma",
        email: "emma@test.com",
        xp: 180,
        gold: 85,
        lat: 51.506,
        lng: -0.1265,
    },
    {
        username: "frank",
        email: "frank@test.com",
        xp: 220,
        gold: 95,
        lat: 51.5088,
        lng: -0.1295,
    },
    {
        username: "grace",
        email: "grace@test.com",
        xp: 280,
        gold: 110,
        lat: 51.507,
        lng: -0.132,
    },
    {
        username: "henry",
        email: "henry@test.com",
        xp: 160,
        gold: 80,
        lat: 51.5092,
        lng: -0.127,
    },
    {
        username: "ivy",
        email: "ivy@test.com",
        xp: 240,
        gold: 105,
        lat: 51.5078,
        lng: -0.1305,
    },
    {
        username: "jack",
        email: "jack@test.com",
        xp: 190,
        gold: 88,
        lat: 51.5105,
        lng: -0.1285,
    },
    {
        username: "kate",
        email: "kate@test.com",
        xp: 270,
        gold: 115,
        lat: 51.5055,
        lng: -0.133,
    },
    {
        username: "leo",
        email: "leo@test.com",
        xp: 210,
        gold: 92,
        lat: 51.5082,
        lng: -0.126,
    },
    {
        username: "mia",
        email: "mia@test.com",
        xp: 260,
        gold: 108,
        lat: 51.5068,
        lng: -0.1315,
    },
    {
        username: "noah",
        email: "noah@test.com",
        xp: 170,
        gold: 82,
        lat: 51.5098,
        lng: -0.1275,
    },
    {
        username: "olivia",
        email: "olivia@test.com",
        xp: 290,
        gold: 118,
        lat: 51.5072,
        lng: -0.1325,
    },
    {
        username: "peter",
        email: "peter@test.com",
        xp: 140,
        gold: 72,
        lat: 51.509,
        lng: -0.13,
    },
    {
        username: "quinn",
        email: "quinn@test.com",
        xp: 230,
        gold: 98,
        lat: 51.5062,
        lng: -0.128,
    },
    {
        username: "ruby",
        email: "ruby@test.com",
        xp: 310,
        gold: 125,
        lat: 51.5108,
        lng: -0.1335,
    },
    {
        username: "sam",
        email: "sam@test.com",
        xp: 195,
        gold: 89,
        lat: 51.5076,
        lng: -0.1288,
    },
];
exports.adminUser = {
    username: "paul",
    email: "paul@pq.com",
    xp: 1000,
    gold: 5000,
    lat: 51.5074,
    lng: -0.1278,
    password: "test",
};
exports.defaultPassword = "password123";
// Generate users seed query with password hashing
const generateUsersSeedQuery = async () => {
    const defaultHash = await bcrypt.hash(exports.defaultPassword, 10);
    const adminHash = await bcrypt.hash(exports.adminUser.password, 10);
    const userValues = exports.defaultUsers
        .map((u) => `('${u.username}', '${u.email}', '${defaultHash}', ${u.xp}, ${u.gold}, ${(0, level_service_1.calculateLevel)(u.xp)}, ST_SetSRID(ST_MakePoint(${u.lng}, ${u.lat}), 4326))`)
        .join(", ");
    return {
        users: `
      INSERT INTO users (username, email, password_hash, xp, gold, level, current_location)
      VALUES ${userValues}
      RETURNING id, username, email
    `,
        admin: `
      INSERT INTO users (username, email, password_hash, xp, gold, level, current_location)
      VALUES ('${exports.adminUser.username}', '${exports.adminUser.email}', '${adminHash}', ${exports.adminUser.xp}, ${exports.adminUser.gold}, ${(0, level_service_1.calculateLevel)(exports.adminUser.xp)}, ST_SetSRID(ST_MakePoint(${exports.adminUser.lng}, ${exports.adminUser.lat}), 4326))
      RETURNING id, username, email
    `,
    };
};
exports.generateUsersSeedQuery = generateUsersSeedQuery;
async function seedUsers(client) {
    const usersSeedQuery = await (0, exports.generateUsersSeedQuery)();
    // Create default users
    const userRes = await client.query(usersSeedQuery.users);
    // Create admin user
    const adminRes = await client.query(usersSeedQuery.admin);
    console.log(`✅ Created Users: ${userRes.rows.length} regular users`, `✅ Created Admin: ${adminRes.rows[0].username} (password: ${exports.adminUser.password})`);
    return {
        users: userRes.rows,
        admin: adminRes.rows[0],
    };
}
