const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.82;
const SKIP_COMPRESS_TYPES = new Set(["application/pdf", "image/gif"]);

function replaceExtension(name: string, ext: string): string {
  return name.replace(/\.[^.]+$/, ext);
}

function looksLikeImage(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    file.type === "" ||
    /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name)
  );
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(file);
  }
}

export async function prepareUploadFile(file: File): Promise<File> {
  if (!looksLikeImage(file) || SKIP_COMPRESS_TYPES.has(file.type)) {
    return file;
  }

  try {
    const bitmap = await decodeImage(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
    });

    if (!blob) {
      return file;
    }

    return new File([blob], replaceExtension(file.name || "profile.jpg", ".jpg"), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export async function prepareUploadFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => prepareUploadFile(file)));
}
