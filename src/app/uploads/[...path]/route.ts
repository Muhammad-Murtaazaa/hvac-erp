import fs from "fs";
import path from "path";
import { Readable } from "stream";

export const dynamic = "force-dynamic";

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".zip": "application/zip",
  ".mp4": "video/mp4",
};

function getFileResponse(targetPath: string, isHead = false): Response {
  try {
    const stat = fs.statSync(targetPath);
    if (!stat.isFile()) {
      return new Response("Not found", { status: 404 });
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";
    const filename = path.basename(targetPath);

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", stat.size.toString());
    headers.set(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(filename)}"`
    );
    headers.set(
      "Cache-Control",
      "public, max-age=86400, stale-while-revalidate=604800"
    );
    headers.set("Accept-Ranges", "bytes");

    if (isHead) {
      return new Response(null, { status: 200, headers });
    }

    const nodeStream = fs.createReadStream(targetPath);
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;
    return new Response(webStream, { status: 200, headers });
  } catch (err) {
    return new Response("Internal error", { status: 500 });
  }
}

function resolveUploadedFile(pathSegments: string[]): string | null {
  // Decode URL components safely
  const decodedSegments = pathSegments.map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });

  const relativePath = path.join(...decodedSegments);

  // Check possible storage locations
  const candidateBaseDirs = [
    ...(process.env.UPLOADS_DIR ? [path.resolve(process.env.UPLOADS_DIR)] : []),
    path.resolve(process.cwd(), "public", "uploads"),
    path.resolve(process.cwd(), "uploads"),
  ];

  for (const baseDir of candidateBaseDirs) {
    const resolvedPath = path.resolve(baseDir, relativePath);
    // Security check: ensure path does not escape base directory (directory traversal protection)
    if (resolvedPath.startsWith(baseDir) && fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }
  }

  // Also check raw non-decoded path just in case
  const rawRelativePath = path.join(...pathSegments);
  for (const baseDir of candidateBaseDirs) {
    const resolvedPath = path.resolve(baseDir, rawRelativePath);
    if (resolvedPath.startsWith(baseDir) && fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }
  }

  return null;
}

export async function GET(
  req: Request,
  { params }: { params: { path?: string[] } }
) {
  const segments = params.path;
  if (!segments || segments.length === 0) {
    return new Response("File not specified", { status: 400 });
  }

  const resolved = resolveUploadedFile(segments);
  if (!resolved) {
    return new Response("Attachment not found", { status: 404 });
  }

  return getFileResponse(resolved, false);
}

export async function HEAD(
  req: Request,
  { params }: { params: { path?: string[] } }
) {
  const segments = params.path;
  if (!segments || segments.length === 0) {
    return new Response("File not specified", { status: 400 });
  }

  const resolved = resolveUploadedFile(segments);
  if (!resolved) {
    return new Response("Attachment not found", { status: 404 });
  }

  return getFileResponse(resolved, true);
}
