"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBuckets = exports.listImages = exports.deleteImage = exports.uploadImage = void 0;
const storage_service_1 = require("../../services/storage.service");
/**
 * Upload a file to a specific bucket
 */
const uploadImage = async (req, res) => {
    try {
        const bucket = req.params.bucket;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: "No file provided" });
        }
        // Validate bucket
        const validBuckets = Object.values(storage_service_1.BUCKETS);
        if (!validBuckets.includes(bucket)) {
            return res.status(400).json({
                error: "Invalid bucket",
                valid_buckets: validBuckets,
            });
        }
        // Validate file type (images only)
        const allowedMimeTypes = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/svg+xml",
        ];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return res.status(400).json({
                error: "Invalid file type. Only images are allowed.",
                allowed_types: allowedMimeTypes,
            });
        }
        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return res.status(400).json({
                error: "File too large. Maximum size is 5MB.",
            });
        }
        // Generate unique filename
        const fileName = (0, storage_service_1.generateFileName)(file.originalname);
        // Upload to MinIO
        const url = await (0, storage_service_1.uploadFile)(bucket, fileName, file.buffer, {
            "Content-Type": file.mimetype,
            "Original-Name": file.originalname,
        });
        res.json({
            message: "File uploaded successfully",
            url,
            bucket,
            fileName,
            size: file.size,
            mimeType: file.mimetype,
        });
    }
    catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).json({ error: "Failed to upload file" });
    }
};
exports.uploadImage = uploadImage;
/**
 * Delete a file from a specific bucket
 */
const deleteImage = async (req, res) => {
    try {
        const bucket = req.params.bucket;
        const fileName = req.params.fileName;
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
};
exports.deleteImage = deleteImage;
/**
 * List all files in a bucket
 */
const listImages = async (req, res) => {
    try {
        const bucket = req.params.bucket;
        const prefix = req.query.prefix;
        // Validate bucket
        const validBuckets = Object.values(storage_service_1.BUCKETS);
        if (!validBuckets.includes(bucket)) {
            return res.status(400).json({
                error: "Invalid bucket",
                valid_buckets: validBuckets,
            });
        }
        const files = await (0, storage_service_1.listFiles)(bucket, prefix);
        // Convert to full URLs
        const filesWithUrls = files.map((fileName) => ({
            fileName,
            url: (0, storage_service_1.getPublicUrl)(bucket, fileName),
        }));
        res.json({
            bucket,
            count: filesWithUrls.length,
            files: filesWithUrls,
        });
    }
    catch (error) {
        console.error("Error listing files:", error);
        res.status(500).json({ error: "Failed to list files" });
    }
};
exports.listImages = listImages;
/**
 * Get available buckets
 */
const getBuckets = async (req, res) => {
    try {
        res.json({
            buckets: Object.values(storage_service_1.BUCKETS),
        });
    }
    catch (error) {
        console.error("Error getting buckets:", error);
        res.status(500).json({ error: "Failed to get buckets" });
    }
};
exports.getBuckets = getBuckets;
