import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export { getFileViewUrl } from "./file-utils";

export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const bucketName = process.env.AWS_S3_BUCKET;
  const accessKey = process.env.AWS_ACCESS_KEY_ID;

  // Sanitize file name: remove path separators, spaces, and unsafe URL characters (#, ?, %, &, etc.)
  const baseName = path.basename(fileName);
  const ext = path.extname(baseName);
  const rawName = path.basename(baseName, ext);
  const sanitizedName = rawName.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_") || "file";
  const uniqueName = `${Date.now()}-${sanitizedName}${ext}`;

  if (bucketName && accessKey) {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueName,
        Body: fileBuffer,
        ContentType: mimeType,
      });
      await s3Client.send(command);
      return `https://${bucketName}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${uniqueName}`;
    } catch (error) {
      console.error("[Storage Service] S3 upload error, falling back to local storage:", error);
    }
  }

  // Fallback local directory storage
  try {
    const uploadDir = process.env.UPLOADS_DIR
      ? path.resolve(process.env.UPLOADS_DIR)
      : path.join(process.cwd(), "public", "uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, uniqueName);
    fs.writeFileSync(filePath, fileBuffer);
    return `/uploads/${uniqueName}`;
  } catch (err) {
    console.error("[Storage Service] Local storage write error:", err);
    throw new Error("Failed to write file to local disk");
  }
}

