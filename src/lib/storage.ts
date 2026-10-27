import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const INLINE_MAX_BYTES = 1.5 * 1024 * 1024;

function blobPutOptions(): { token?: string } | null {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return { token: process.env.BLOB_READ_WRITE_TOKEN };
  }

  // Connected Blob stores on Vercel use OIDC + BLOB_STORE_ID (no static token).
  if (process.env.BLOB_STORE_ID) {
    return {};
  }

  return null;
}

export function toInlineDataUrl(data: Buffer, contentType?: string): string {
  const mime = contentType && contentType.length > 0 ? contentType : "application/octet-stream";
  return `data:${mime};base64,${data.toString("base64")}`;
}

export async function saveUploadedFile({
  folder,
  filename,
  data,
  contentType,
}: {
  folder: string;
  filename: string;
  data: Buffer;
  contentType?: string;
}): Promise<{ url: string }> {
  const pathname = `${folder}/${filename}`;

  const blobAuth = blobPutOptions();
  if (blobAuth) {
    const blob = await put(pathname, data, {
      access: "public",
      contentType,
      addRandomSuffix: false,
      ...blobAuth,
    });
    return { url: blob.url };
  }

  if (process.env.VERCEL) {
    if (data.length <= INLINE_MAX_BYTES) {
      return { url: toInlineDataUrl(data, contentType) };
    }

    throw new Error(
      "This file is too large to store without Vercel Blob. Connect a Blob store so BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN is set."
    );
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), data);
  return { url: `/uploads/${pathname}` };
}

export async function saveUploadedBrowserFile(
  file: File,
  folder: string,
  filename: string
): Promise<{ url: string }> {
  const bytes = await file.arrayBuffer();
  return saveUploadedFile({
    folder,
    filename,
    data: Buffer.from(bytes),
    contentType: file.type || undefined,
  });
}
