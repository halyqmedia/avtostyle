// AI agent documents (KP/catalog) can be a PDF or a Word file — this maps between the two so
// upload validation, storage key extension, and the mimetype sent to WhatsApp all agree.
const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function extensionForMimeType(mimeType: string): string | null {
  const entry = Object.entries(MIME_BY_EXT).find(([, m]) => m === mimeType);
  return entry?.[0] ?? null;
}

export function mimeTypeForExtension(ext: string): string {
  return MIME_BY_EXT[ext.toLowerCase()] ?? "application/octet-stream";
}
