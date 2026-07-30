import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), ".data", "design-uploads");
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"]);
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(0, 120);
}

function generateUniqueFilename(original: string): string {
  const ext = path.extname(original).toLowerCase();
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `design_${timestamp}_${random}${ext}`;
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only PNG, JPG, and JPEG images are allowed." },
      { status: 415 }
    );
  }

  // Validate extension
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { error: "Only .png, .jpg, and .jpeg files are allowed." },
      { status: 415 }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File size must not exceed 20 MB." },
      { status: 413 }
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify magic bytes to confirm actual image type (security: prevent MIME spoofing)
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;

    if (!isPng && !isJpeg) {
      return NextResponse.json(
        { error: "File content does not match a valid image format." },
        { status: 415 }
      );
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const sanitizedOriginal = sanitizeFilename(file.name);
    const uniqueFilename = generateUniqueFilename(sanitizedOriginal);
    const filePath = path.join(UPLOAD_DIR, uniqueFilename);

    await writeFile(filePath, buffer);

    // Return a relative URL path the client can use (served via /api/design/file/[filename])
    return NextResponse.json({
      url: `/api/design/file/${encodeURIComponent(uniqueFilename)}`,
      filename: uniqueFilename,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("Design upload error:", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
