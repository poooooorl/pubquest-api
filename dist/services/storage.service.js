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
exports.generateFileName = exports.listFiles = exports.deleteFile = exports.getPublicUrl = exports.uploadFile = exports.initializeBuckets = exports.BUCKETS = void 0;
const Minio = __importStar(require("minio"));
// MinIO client configuration
const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || "localhost",
    port: parseInt(process.env.MINIO_PORT || "9000"),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ROOT_USER || "minioadmin",
    secretKey: process.env.MINIO_ROOT_PASSWORD || "minioadmin",
});
exports.BUCKETS = {
    AVATARS: "avatars",
    QUESTS: "quests",
    NPCS: "npcs",
    VENUES: "venues",
    ITEMS: "items",
};
/**
 * Initialize all required buckets
 */
const initializeBuckets = async () => {
    try {
        const buckets = Object.values(exports.BUCKETS);
        for (const bucketName of buckets) {
            const exists = await minioClient.bucketExists(bucketName);
            if (!exists) {
                await minioClient.makeBucket(bucketName, "us-east-1");
                console.log(`✅ Created bucket: ${bucketName}`);
                // Set public read policy for all buckets (CDN-like behavior)
                const policy = {
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Effect: "Allow",
                            Principal: { AWS: ["*"] },
                            Action: ["s3:GetObject"],
                            Resource: [`arn:aws:s3:::${bucketName}/*`],
                        },
                    ],
                };
                await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
                console.log(`✅ Set public read policy for: ${bucketName}`);
            }
            else {
                console.log(`✓ Bucket already exists: ${bucketName}`);
            }
        }
    }
    catch (error) {
        console.error("Error initializing buckets:", error);
        throw error;
    }
};
exports.initializeBuckets = initializeBuckets;
/**
 * Upload a file to MinIO
 */
const uploadFile = async (bucketName, objectName, buffer, metadata) => {
    try {
        await minioClient.putObject(bucketName, objectName, buffer, buffer.length, {
            ...metadata,
            "Content-Type": metadata?.["Content-Type"] || "application/octet-stream",
        });
        // Return the public URL
        return (0, exports.getPublicUrl)(bucketName, objectName);
    }
    catch (error) {
        console.error("Error uploading file:", error);
        throw error;
    }
};
exports.uploadFile = uploadFile;
/**
 * Get public URL for an object
 */
const getPublicUrl = (bucketName, objectName) => {
    const endpoint = process.env.MINIO_ENDPOINT || "localhost";
    const port = process.env.MINIO_PORT || "9000";
    const protocol = process.env.MINIO_USE_SSL === "true" ? "https" : "http";
    return `${protocol}://${endpoint}:${port}/${bucketName}/${objectName}`;
};
exports.getPublicUrl = getPublicUrl;
/**
 * Delete a file from MinIO
 */
const deleteFile = async (bucketName, objectName) => {
    try {
        await minioClient.removeObject(bucketName, objectName);
    }
    catch (error) {
        console.error("Error deleting file:", error);
        throw error;
    }
};
exports.deleteFile = deleteFile;
/**
 * List all files in a bucket
 */
const listFiles = async (bucketName, prefix) => {
    return new Promise((resolve, reject) => {
        const files = [];
        const stream = minioClient.listObjectsV2(bucketName, prefix, true);
        stream.on("data", (obj) => {
            if (obj.name) {
                files.push(obj.name);
            }
        });
        stream.on("error", (err) => {
            reject(err);
        });
        stream.on("end", () => {
            resolve(files);
        });
    });
};
exports.listFiles = listFiles;
/**
 * Generate a unique filename
 */
const generateFileName = (originalName, prefix) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split(".").pop();
    const baseName = originalName.split(".").slice(0, -1).join(".");
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_");
    if (prefix) {
        return `${prefix}/${timestamp}-${random}-${sanitizedName}.${extension}`;
    }
    return `${timestamp}-${random}-${sanitizedName}.${extension}`;
};
exports.generateFileName = generateFileName;
exports.default = minioClient;
