import { Request, Response } from "express";
import {
  uploadFile,
  deleteFile,
  listFiles,
  generateFileName,
  getPublicUrl,
  BUCKETS,
} from "@/services/storage.service";

/**
 * Upload a file to a specific bucket
 */
export const uploadImage = async (req: Request, res: Response) => {
  try {
    const bucket = req.params.bucket as string;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Validate bucket
    const validBuckets = Object.values(BUCKETS);
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
    const fileName = generateFileName(file.originalname);

    // Upload to MinIO
    const url = await uploadFile(bucket, fileName, file.buffer, {
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
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
};

/**
 * Delete a file from a specific bucket
 */
export const deleteImage = async (req: Request, res: Response) => {
  try {
    const bucket = req.params.bucket as string;
    const fileName = req.params.fileName as string;

    // Validate bucket
    const validBuckets = Object.values(BUCKETS);
    if (!validBuckets.includes(bucket)) {
      return res.status(400).json({
        error: "Invalid bucket",
        valid_buckets: validBuckets,
      });
    }

    await deleteFile(bucket, fileName);

    res.json({
      message: "File deleted successfully",
      bucket,
      fileName,
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
};

/**
 * List all files in a bucket
 */
export const listImages = async (req: Request, res: Response) => {
  try {
    const bucket = req.params.bucket as string;
    const prefix = req.query.prefix as string | undefined;

    // Validate bucket
    const validBuckets = Object.values(BUCKETS);
    if (!validBuckets.includes(bucket)) {
      return res.status(400).json({
        error: "Invalid bucket",
        valid_buckets: validBuckets,
      });
    }

    const files = await listFiles(bucket, prefix);

    // Convert to full URLs
    const filesWithUrls = files.map((fileName) => ({
      fileName,
      url: getPublicUrl(bucket, fileName),
    }));

    res.json({
      bucket,
      count: filesWithUrls.length,
      files: filesWithUrls,
    });
  } catch (error) {
    console.error("Error listing files:", error);
    res.status(500).json({ error: "Failed to list files" });
  }
};

/**
 * Get available buckets
 */
export const getBuckets = async (req: Request, res: Response) => {
  try {
    res.json({
      buckets: Object.values(BUCKETS),
    });
  } catch (error) {
    console.error("Error getting buckets:", error);
    res.status(500).json({ error: "Failed to get buckets" });
  }
};
