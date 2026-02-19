import * as Minio from "minio";

// MinIO client configuration
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ROOT_USER || "minioadmin",
  secretKey: process.env.MINIO_ROOT_PASSWORD || "minioadmin",
});

export const BUCKETS = {
  AVATARS: "avatars",
  QUESTS: "quests",
  NPCS: "npcs",
  VENUES: "venues",
  ITEMS: "items",
};

/**
 * Initialize all required buckets
 */
export const initializeBuckets = async (): Promise<void> => {
  try {
    const buckets = Object.values(BUCKETS);

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
      } else {
        console.log(`✓ Bucket already exists: ${bucketName}`);
      }
    }
  } catch (error) {
    console.error("Error initializing buckets:", error);
    throw error;
  }
};

/**
 * Upload a file to MinIO
 */
export const uploadFile = async (
  bucketName: string,
  objectName: string,
  buffer: Buffer,
  metadata?: Record<string, string>,
): Promise<string> => {
  try {
    await minioClient.putObject(bucketName, objectName, buffer, buffer.length, {
      ...metadata,
      "Content-Type": metadata?.["Content-Type"] || "application/octet-stream",
    });

    // Return the public URL
    return getPublicUrl(bucketName, objectName);
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

/**
 * Get public URL for an object
 */
export const getPublicUrl = (
  bucketName: string,
  objectName: string,
): string => {
  const endpoint = process.env.MINIO_ENDPOINT || "localhost";
  const port = process.env.MINIO_PORT || "9000";
  const protocol = process.env.MINIO_USE_SSL === "true" ? "https" : "http";

  return `${protocol}://${endpoint}:${port}/${bucketName}/${objectName}`;
};

/**
 * Delete a file from MinIO
 */
export const deleteFile = async (
  bucketName: string,
  objectName: string,
): Promise<void> => {
  try {
    await minioClient.removeObject(bucketName, objectName);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
};

/**
 * List all files in a bucket
 */
export const listFiles = async (
  bucketName: string,
  prefix?: string,
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const files: string[] = [];
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

/**
 * Generate a unique filename
 */
export const generateFileName = (
  originalName: string,
  prefix?: string,
): string => {
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

export default minioClient;
