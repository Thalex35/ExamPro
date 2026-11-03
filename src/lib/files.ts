import { supabase } from "@/integrations/supabase/client";

export const MAX_EXAM_BYTES = 20 * 1024 * 1024;
export const MAX_COURSE_FILE_BYTES = 20 * 1024 * 1024;

/** Returns an error code for an invalid exam file, or null when acceptable. */
export function validateExamFile(
  file: { type: string; size: number; name: string } | null | undefined,
): string | null {
  if (!file) return "FILE_REQUIRED";
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "FILE_TYPE";
  if (file.size > MAX_EXAM_BYTES) return "FILE_SIZE";
  return null;
}

export function validateCourseFile(
  file: { type: string; size: number; name: string } | null | undefined,
): string | null {
  if (!file) return "FILE_REQUIRED";
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "FILE_TYPE";
  if (file.size > MAX_COURSE_FILE_BYTES) return "FILE_SIZE";
  return null;
}

export function isSecureExternalUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** Opens a short-lived signed link; storage policies decide whether the caller may read it. */
export async function openExamFile(path: string, demoContent?: string | null) {
  if (path === "demo:") {
    const escapeHtml = (value: string) =>
      value.replace(/[&<>"']/g, (character) => {
        const entities: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        };
        return entities[character]!;
      });
    const content = escapeHtml(demoContent ?? "Document de démonstration.");
    const page = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Épreuve de démonstration — EXAMPRO</title><style>body{font:16px/1.7 system-ui,sans-serif;max-width:760px;margin:3rem auto;padding:0 1.25rem;color:#334155}h1{font-size:1.6rem;color:#0b1f3a}.notice{padding:1rem;border-radius:.75rem;background:#e0f7fa;color:#075985;font-weight:600}pre{white-space:pre-wrap;font:inherit}</style><h1>Épreuve de démonstration — EXAMPRO</h1><p class="notice">Document fictif de démonstration — ce contenu n’est pas une épreuve officielle.</p><pre>${content}</pre></html>`;
    const url = URL.createObjectURL(new Blob([page], { type: "text/html;charset=utf-8" }));
    const windowRef = window.open(url, "_blank");
    if (!windowRef) {
      URL.revokeObjectURL(url);
      throw new Error("POPUP_BLOCKED");
    }
    windowRef.opener = null;
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  const w = window.open("", "_blank");
  const { data, error } = await supabase.storage.from("exams").createSignedUrl(path, 300);
  if (error || !data) {
    w?.close();
    throw error ?? new Error("FILE_UNAVAILABLE");
  }
  if (w) w.location.href = data.signedUrl;
  else window.location.href = data.signedUrl;
}

export async function openCourseFile(path: string) {
  const { data, error } = await supabase.storage
    .from("course-files")
    .createSignedUrl(path, 300, { download: true });
  if (error || !data) throw error ?? new Error("FILE_UNAVAILABLE");
  window.location.assign(data.signedUrl);
}
