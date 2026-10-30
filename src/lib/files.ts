import { supabase } from "@/integrations/supabase/client";

export const MAX_EXAM_BYTES = 20 * 1024 * 1024;

/** Returns an error code for an invalid exam file, or null when acceptable. */
export function validateExamFile(file: { type: string; size: number; name: string } | null | undefined): string | null {
  if (!file) return "FILE_REQUIRED";
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "FILE_TYPE";
  if (file.size > MAX_EXAM_BYTES) return "FILE_SIZE";
  return null;
}

/** Opens a short-lived signed link; storage policies decide whether the caller may read it. */
export async function openExamFile(path: string) {
  const w = window.open("", "_blank");
  const { data, error } = await supabase.storage.from("exams").createSignedUrl(path, 300);
  if (error || !data) {
    w?.close();
    throw error ?? new Error("FILE_UNAVAILABLE");
  }
  if (w) w.location.href = data.signedUrl;
  else window.location.href = data.signedUrl;
}
