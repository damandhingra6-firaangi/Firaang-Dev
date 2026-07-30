import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), ".data", "design-uploads");
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const decoded = decodeURIComponent(filename);

  // Sanitize: only allow safe filenames, no path traversal
  if (!/^[a-zA-Z0-9._-]+$/.test(decoded) || decoded.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const ext = path.extname(decoded).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 403 });
  }

  const filePath = path.join(UPLOAD_DIR, decoded);

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const mimeMap: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
    };

    const contentType = mimeMap[ext] ?? "application/octet-stream";
    const { Readable } = await import("node:stream");
    const nodeStream = createReadStream(filePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new Response(webStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileStat.size),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
