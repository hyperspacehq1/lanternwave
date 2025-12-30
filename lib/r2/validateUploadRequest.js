import { guessContentType } from "@/lib/r2/contentType";

export async function validateUploadRequest(req) {
  const contentType = req.headers.get("content-type") || "";

  if (!contentType.includes("multipart/form-data")) {
    return {
      ok: false,
      status: 415,
      error: "Expected multipart/form-data",
    };
  }

  const form = await req.formData();
  const filename = form.get("filename");
  const size = Number(form.get("size"));

  if (!filename || !size) {
    return {
      ok: false,
      status: 400,
      error: "Missing filename or size",
    };
  }

  const safeName = filename.replace(/[^\w.\-]/g, "_");
  const mimeType = guessContentType(safeName);

  const ALLOWED = [
    "audio/mpeg",
    "audio/wav",
    "video/mp4",
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!ALLOWED.includes(mimeType)) {
    return {
      ok: false,
      status: 415,
      error: "Unsupported file type",
    };
  }

  return {
    ok: true,
    filename: safeName,
    size,
    mimeType,
  };
}
