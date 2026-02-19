"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDialogueNode = exports.updateDialogueNode = exports.createDialogueNode = exports.getDialogueNode = exports.getDialogueNodes = void 0;
const pool_1 = __importDefault(require("../../db/pool"));
/**
 * Get all dialogue nodes for an NPC
 */
const getDialogueNodes = async (req, res) => {
    try {
        const id = req.params.npcId;
        const npcId = parseInt(Array.isArray(id) ? id[0] : id);
        if (isNaN(npcId)) {
            res.status(400).json({ error: "Invalid NPC ID" });
            return;
        }
        const client = await pool_1.default.connect();
        try {
            // Get all dialogue nodes for this NPC, ordered by parent hierarchy
            const query = `
        WITH RECURSIVE dialogue_tree AS (
          -- Root nodes
          SELECT 
            id, npc_id, text, return_text, conditional_texts, speaker, parent_node_id, next_node_id, is_root,
            conditions, actions, button_text, created_at,
            0 as depth,
            ARRAY[id] as path
          FROM dialogue_nodes
          WHERE npc_id = $1 AND is_root = TRUE
          
          UNION ALL
          
          -- Child nodes (follow both parent_node_id for player choices AND next_node_id for NPC responses)
          SELECT 
            dn.id, dn.npc_id, dn.text, dn.return_text, dn.conditional_texts, dn.speaker, dn.parent_node_id, dn.next_node_id, dn.is_root,
            dn.conditions, dn.actions, dn.button_text, dn.created_at,
            dt.depth + 1,
            dt.path || dn.id
          FROM dialogue_nodes dn
          INNER JOIN dialogue_tree dt ON (
            dn.parent_node_id = dt.id OR dn.id = dt.next_node_id
          )
          WHERE dn.npc_id = $1
            AND NOT (dn.id = ANY(dt.path))  -- Prevent infinite loops on circular references
        )
        SELECT DISTINCT ON (id) * FROM dialogue_tree
        ORDER BY id, depth;
      `;
            const result = await client.query(query, [npcId]);
            res.json({
                data: result.rows,
                meta: {
                    total: result.rows.length,
                    npcId,
                },
            });
        }
        finally {
            client.release();
        }
    }
    catch (err) {
        console.error("Get Dialogue Nodes Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
exports.getDialogueNodes = getDialogueNodes;
/**
 * Get a single dialogue node
 */
const getDialogueNode = async (req, res) => {
    try {
        const id = req.params.nodeId;
        const nodeId = parseInt(Array.isArray(id) ? id[0] : id);
        if (isNaN(nodeId)) {
            res.status(400).json({ error: "Invalid node ID" });
            return;
        }
        const client = await pool_1.default.connect();
        try {
            const result = await client.query(`SELECT * FROM dialogue_nodes WHERE id = $1`, [nodeId]);
            if (result.rows.length === 0) {
                res.status(404).json({ error: "Dialogue node not found" });
                return;
            }
            res.json({ data: result.rows[0] });
        }
        finally {
            client.release();
        }
    }
    catch (err) {
        console.error("Get Dialogue Node Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
exports.getDialogueNode = getDialogueNode;
/**
 * Create a new dialogue node
 */
const createDialogueNode = async (req, res) => {
    try {
        const id = req.params.npcId;
        const npcId = parseInt(Array.isArray(id) ? id[0] : id);
        if (isNaN(npcId)) {
            res.status(400).json({ error: "Invalid NPC ID" });
            return;
        }
        const { text, return_text, conditional_texts, speaker = "NPC", parent_node_id, next_node_id, is_root = false, conditions, actions, button_text, } = req.body;
        // Validate required fields
        if (!text || !text.trim()) {
            res.status(400).json({ error: "Text is required" });
            return;
        }
        if (!["NPC", "PLAYER"].includes(speaker)) {
            res.status(400).json({ error: "Speaker must be NPC or PLAYER" });
            return;
        }
        const client = await pool_1.default.connect();
        try {
            // If parent_node_id is provided, verify it exists and belongs to same NPC
            if (parent_node_id) {
                const parentCheck = await client.query(`SELECT id FROM dialogue_nodes WHERE id = $1 AND npc_id = $2`, [parent_node_id, npcId]);
                if (parentCheck.rows.length === 0) {
                    res.status(400).json({
                        error: "Parent node not found or belongs to different NPC",
                    });
                    return;
                }
            }
            // Create dialogue node
            const query = `
        INSERT INTO dialogue_nodes (
          npc_id, text, return_text, conditional_texts, speaker, parent_node_id, next_node_id, is_root,
          conditions, actions, button_text
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
            const values = [
                npcId,
                text,
                return_text || null,
                conditional_texts ? JSON.stringify(conditional_texts) : null,
                speaker,
                parent_node_id || null,
                next_node_id || null,
                is_root,
                conditions ? JSON.stringify(conditions) : null,
                actions ? JSON.stringify(actions) : null,
                button_text,
            ];
            const result = await client.query(query, values);
            res.status(201).json({ data: result.rows[0] });
        }
        finally {
            client.release();
        }
    }
    catch (err) {
        console.error("Create Dialogue Node Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
exports.createDialogueNode = createDialogueNode;
/**
 * Update a dialogue node
 */
const updateDialogueNode = async (req, res) => {
    try {
        const id = req.params.nodeId;
        const nodeId = parseInt(Array.isArray(id) ? id[0] : id);
        if (isNaN(nodeId)) {
            res.status(400).json({ error: "Invalid node ID" });
            return;
        }
        const { text, return_text, conditional_texts, speaker, parent_node_id, next_node_id, is_root, conditions, actions, button_text, } = req.body;
        const client = await pool_1.default.connect();
        try {
            // Get existing node
            const existing = await client.query(`SELECT * FROM dialogue_nodes WHERE id = $1`, [nodeId]);
            if (existing.rows.length === 0) {
                res.status(404).json({ error: "Dialogue node not found" });
                return;
            }
            const existingNode = existing.rows[0];
            // If changing parent, verify new parent exists and no circular reference
            if (parent_node_id !== undefined &&
                parent_node_id !== existingNode.parent_node_id) {
                if (parent_node_id !== null) {
                    const parentCheck = await client.query(`SELECT id FROM dialogue_nodes WHERE id = $1 AND npc_id = $2`, [parent_node_id, existingNode.npc_id]);
                    if (parentCheck.rows.length === 0) {
                        res.status(400).json({
                            error: "Parent node not found or belongs to different NPC",
                        });
                        return;
                    }
                    // Check for circular reference
                    if (parent_node_id === nodeId) {
                        res
                            .status(400)
                            .json({ error: "Cannot set node as its own parent" });
                        return;
                    }
                }
            }
            // Build update query dynamically
            const updates = [];
            const values = [];
            let paramCount = 1;
            if (text !== undefined) {
                updates.push(`text = $${paramCount++}`);
                values.push(text);
            }
            if (return_text !== undefined) {
                updates.push(`return_text = $${paramCount++}`);
                values.push(return_text);
            }
            if (conditional_texts !== undefined) {
                updates.push(`conditional_texts = $${paramCount++}`);
                values.push(conditional_texts ? JSON.stringify(conditional_texts) : null);
            }
            if (speaker !== undefined) {
                if (!["NPC", "PLAYER"].includes(speaker)) {
                    res.status(400).json({ error: "Speaker must be NPC or PLAYER" });
                    return;
                }
                updates.push(`speaker = $${paramCount++}`);
                values.push(speaker);
            }
            if (parent_node_id !== undefined) {
                updates.push(`parent_node_id = $${paramCount++}`);
                values.push(parent_node_id);
            }
            if (next_node_id !== undefined) {
                updates.push(`next_node_id = $${paramCount++}`);
                values.push(next_node_id);
            }
            if (is_root !== undefined) {
                updates.push(`is_root = $${paramCount++}`);
                values.push(is_root);
            }
            if (conditions !== undefined) {
                updates.push(`conditions = $${paramCount++}`);
                values.push(conditions ? JSON.stringify(conditions) : null);
            }
            if (actions !== undefined) {
                updates.push(`actions = $${paramCount++}`);
                values.push(actions ? JSON.stringify(actions) : null);
            }
            if (button_text !== undefined) {
                updates.push(`button_text = $${paramCount++}`);
                values.push(button_text);
            }
            if (updates.length === 0) {
                res.status(400).json({ error: "No fields to update" });
                return;
            }
            values.push(nodeId);
            const query = `
        UPDATE dialogue_nodes
        SET ${updates.join(", ")}
        WHERE id = $${paramCount}
        RETURNING *
      `;
            const result = await client.query(query, values);
            res.json({ data: result.rows[0] });
        }
        finally {
            client.release();
        }
    }
    catch (err) {
        console.error("Update Dialogue Node Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
exports.updateDialogueNode = updateDialogueNode;
/**
 * Delete a dialogue node
 */
const deleteDialogueNode = async (req, res) => {
    try {
        const id = req.params.nodeId;
        const nodeId = parseInt(Array.isArray(id) ? id[0] : id);
        if (isNaN(nodeId)) {
            res.status(400).json({ error: "Invalid node ID" });
            return;
        }
        const client = await pool_1.default.connect();
        try {
            // Check if node has children
            const childrenCheck = await client.query(`SELECT COUNT(*) FROM dialogue_nodes WHERE parent_node_id = $1`, [nodeId]);
            const childCount = parseInt(childrenCheck.rows[0].count);
            if (childCount > 0) {
                res.status(400).json({
                    error: `Cannot delete node with ${childCount} child node(s). Delete children first.`,
                });
                return;
            }
            // Delete the node
            const result = await client.query(`DELETE FROM dialogue_nodes WHERE id = $1 RETURNING *`, [nodeId]);
            if (result.rows.length === 0) {
                res.status(404).json({ error: "Dialogue node not found" });
                return;
            }
            res.json({
                message: "Dialogue node deleted successfully",
                data: result.rows[0],
            });
        }
        finally {
            client.release();
        }
    }
    catch (err) {
        console.error("Delete Dialogue Node Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
exports.deleteDialogueNode = deleteDialogueNode;
