"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const storage_controller_1 = require("./storage.controller");
const storage_service_1 = require("../../services/storage.service");
const router = (0, express_1.Router)();
// Configure multer for memory storage
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});
// Get available buckets
router.get("/buckets", storage_controller_1.getBuckets);
// Upload image to specific bucket
router.post("/upload/:bucket", upload.single("file"), storage_controller_1.uploadImage);
// List files in bucket
router.get("/list/:bucket", storage_controller_1.listImages);
// Delete file from bucket - fileName extracted from URL path
router.delete("/:bucket/:fileName", async (req, res) => {
    try {
        const bucket = req.params.bucket;
        // Extract the full path after /:bucket/ to support filenames with slashes
        const pathMatch = req.path.match(`/${bucket}/(.+)`);
        const rawFileName = req.params.fileName;
        const fileName = pathMatch ? pathMatch[1] : (Array.isArray(rawFileName) ? rawFileName[0] : rawFileName);
        // Validate bucket
        const validBuckets = Object.values(storage_service_1.BUCKETS);
        if (!validBuckets.includes(bucket)) {
            return res.status(400).json({
                error: "Invalid bucket",
                valid_buckets: validBuckets,
            });
        }
        await (0, storage_service_1.deleteFile)(bucket, fileName);
        res.json({
            message: "File deleted successfully",
            bucket,
            fileName,
        });
    }
    catch (error) {
        console.error("Error deleting file:", error);
        res.status(500).json({ error: "Failed to delete file" });
    }
});
exports.default = router;
