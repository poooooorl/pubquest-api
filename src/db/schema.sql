-- ============================================================================
-- PubQuest Database Schema
-- Clean migration script for fresh deployments
-- ============================================================================

-- Drop all tables in reverse dependency order (CASCADE handles remaining dependencies)
DROP TABLE IF EXISTS npc_quests CASCADE;
DROP TABLE IF EXISTS npcs CASCADE;
DROP TABLE IF EXISTS party_join_requests CASCADE;
DROP TABLE IF EXISTS party_invites CASCADE;
DROP TABLE IF EXISTS party_members CASCADE;
DROP TABLE IF EXISTS parties CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS checkins CASCADE;
DROP TABLE IF EXISTS user_objective_progress CASCADE;
DROP TABLE IF EXISTS user_quests CASCADE;
DROP TABLE IF EXISTS quest_objectives CASCADE;
DROP TABLE IF EXISTS quests CASCADE;
DROP TABLE IF EXISTS ledger CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS venues CASCADE;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- Core Tables
-- ============================================================================

-- Venues: Physical locations (pubs, clubs, bars, parks)
CREATE TABLE venues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    
    -- Geospatial Data
    location GEOGRAPHY(Point, 4326) NOT NULL,
    address TEXT,
    
    -- Metadata
    category VARCHAR(50) DEFAULT 'PUB', -- 'PUB', 'CLUB', 'BAR', 'PARK'
    
    -- External integrations
    google_place_id VARCHAR(100) UNIQUE,
    merchant_id VARCHAR(100), -- For card linking
    is_partner BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_venues_location ON venues USING GIST(location);

-- Users: Player accounts
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Progression
    xp INT DEFAULT 0,
    gold INT DEFAULT 0,
    level INT DEFAULT 1,
    
    -- Location & Check-in
    current_location GEOGRAPHY(Point, 4326),
    venue_id INT REFERENCES venues(id) ON DELETE SET NULL,
    checked_in_at TIMESTAMP,
    last_active TIMESTAMP DEFAULT NOW(),
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_location ON users USING GIST(current_location);

-- ============================================================================
-- Quest System
-- ============================================================================

-- Quests: Mission containers
CREATE TABLE quests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Rewards
    reward_xp INT DEFAULT 100,
    reward_gold INT DEFAULT 10,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Quest Objectives: Individual steps within quests
CREATE TABLE quest_objectives (
    id SERIAL PRIMARY KEY,
    quest_id INT REFERENCES quests(id) ON DELETE CASCADE,
    
    order_index INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    
    type VARCHAR(50) NOT NULL, -- 'LOCATION', 'SPEND'
    target_value VARCHAR(100), -- Venue ID, category, or item
    
    reward_xp INT DEFAULT 0
);

-- User Quests: Active quest log
CREATE TABLE user_quests (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    quest_id INT REFERENCES quests(id) ON DELETE CASCADE,
    
    status VARCHAR(20) DEFAULT 'IN_PROGRESS', -- 'IN_PROGRESS', 'COMPLETED'
    completed_at TIMESTAMP,
    
    UNIQUE(user_id, quest_id)
);

-- User Objective Progress: Tracking individual steps
CREATE TABLE user_objective_progress (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    objective_id INT REFERENCES quest_objectives(id) ON DELETE CASCADE,
    
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    
    UNIQUE(user_id, objective_id)
);

-- ============================================================================
-- NPCs (Non-Player Characters)
-- ============================================================================

-- NPCs: Quest givers and interactive characters
CREATE TABLE npcs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Appearance
    avatar_url TEXT,
    
    -- Location (venue-based or roaming)
    venue_id INT REFERENCES venues(id) ON DELETE SET NULL,
    location GEOGRAPHY(Point, 4326),
    
    -- Quest giving
    is_quest_giver BOOLEAN DEFAULT TRUE,
    
    -- Interaction
    greeting_text TEXT DEFAULT 'Greetings, traveler!',
    dialogue_tree JSONB, -- Conversation flow structure
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_npcs_location ON npcs USING GIST(location);
CREATE INDEX idx_npcs_venue ON npcs(venue_id);

-- NPC Quests: Maps NPCs to quests they offer
CREATE TABLE npc_quests (
    id SERIAL PRIMARY KEY,
    npc_id INT REFERENCES npcs(id) ON DELETE CASCADE,
    quest_id INT REFERENCES quests(id) ON DELETE CASCADE,
    
    is_repeatable BOOLEAN DEFAULT FALSE,
    level_requirement INT DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(npc_id, quest_id)
);

-- ============================================================================
-- Social Features
-- ============================================================================

-- Parties: Social groups
CREATE TABLE parties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    leader_id INT REFERENCES users(id) ON DELETE CASCADE,
    invite_code VARCHAR(10) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Party Members: Group membership
CREATE TABLE party_members (
    id SERIAL PRIMARY KEY,
    party_id INT REFERENCES parties(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id) -- User can only be in one party
);

-- Party Invites: Leader invitations
CREATE TABLE party_invites (
    id SERIAL PRIMARY KEY,
    party_id INT REFERENCES parties(id) ON DELETE CASCADE,
    inviter_id INT REFERENCES users(id) ON DELETE CASCADE,
    invitee_id INT REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'REJECTED'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(party_id, invitee_id)
);

-- Party Join Requests: User-initiated requests
CREATE TABLE party_join_requests (
    id SERIAL PRIMARY KEY,
    party_id INT REFERENCES parties(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'REJECTED'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(party_id, user_id)
);

-- Friendships: Player connections
CREATE TABLE friendships (
    id SERIAL PRIMARY KEY,
    requester_id INT REFERENCES users(id) ON DELETE CASCADE,
    addressee_id INT REFERENCES users(id) ON DELETE CASCADE,
    
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'REJECTED'
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(requester_id, addressee_id),
    CHECK (requester_id != addressee_id)
);

CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- ============================================================================
-- Activity & Economy
-- ============================================================================

-- Check-ins: Location visit history
CREATE TABLE checkins (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    venue_id INT REFERENCES venues(id) ON DELETE SET NULL,
    
    coords GEOGRAPHY(Point, 4326), -- Actual coordinates
    
    check_in_time TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_checkins_user ON checkins(user_id);
CREATE INDEX idx_checkins_venue ON checkins(venue_id);

-- Ledger: Transaction history
CREATE TABLE ledger (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    
    amount INT NOT NULL, -- Positive = gain, negative = spend
    currency VARCHAR(10) DEFAULT 'GOLD', -- 'GOLD' or 'XP'
    reason VARCHAR(50), -- 'QUEST_REWARD', 'STORE_PURCHASE', etc.
    
    created_at TIMESTAMP DEFAULT NOW()
);