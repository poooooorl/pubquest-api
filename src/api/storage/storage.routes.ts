import { Router, Request, Response } from "express";
import multer from "multer";
import {
  uploadImage,
  deleteImage,
  listImages,
  getBuckets,
} from "./storage.controller";
import { deleteFile, BUCKETS, getPublicUrl } from "@/services/storage.service";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Get available buckets
router.get("/buckets", getBuckets);

// Upload image to specific bucket
router.post("/upload/:bucket", upload.single("file"), uploadImage);

// List files in bucket
router.get("/list/:bucket", listImages);

// Delete file from bucket - fileName extracted from URL path
router.delete("/:bucket/:fileName", async (req: Request, res: Response) => {
  try {
    const bucket = req.params.bucket as string;

    // Extract the full path after /:bucket/ to support filenames with slashes
    const pathMatch = req.path.match(`/${bucket}/(.+)`);
    const rawFileName = req.params.fileName;
    const fileName = pathMatch ? pathMatch[1] : (Array.isArray(rawFileName) ? rawFileName[0] : rawFileName);

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
});

export default router;
