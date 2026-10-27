export const FIVE_PERCENT_UPLOAD_PREFIX = "/uploads/five-percent/upload-";
const FIVE_PERCENT_UPLOAD_MARKER = "five-percent/upload-";

function urlLooksLikeUpload(url: string): boolean {
  return url.includes(FIVE_PERCENT_UPLOAD_PREFIX) || url.includes(FIVE_PERCENT_UPLOAD_MARKER);
}

export function getReflectionFileUrls(pdfUrl: string | null | undefined): string[] {
  if (!pdfUrl) {
    return [];
  }

  const trimmed = pdfUrl.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string")) {
        return parsed.filter((value) => value.length > 0);
      }
    } catch {
      return [];
    }
  }

  return [trimmed];
}

export function isUploadedReflection(pdfUrl: string | null | undefined): boolean {
  if (!pdfUrl) {
    return false;
  }

  return urlLooksLikeUpload(pdfUrl) || getReflectionFileUrls(pdfUrl).some(urlLooksLikeUpload);
}

export function isImageFileUrl(url: string): boolean {
  const pathOnly = url.split("?")[0]?.toLowerCase() ?? "";
  return /\.(jpe?g|png|gif|webp|heic|heif)$/.test(pathOnly);
}

export function serializeUploadedFileUrls(urls: string[]): string {
  return JSON.stringify(urls);
}
