export const OCR_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const OCR_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const OCR_LANGUAGE = "eng";

export const OCR_ALLOWED_ACCEPT_ATTR = OCR_ALLOWED_MIME_TYPES.join(",");
