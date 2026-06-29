// Helpers for logging and reporting Supabase failures with full context.
import { setFailure } from "./failure-store";

export type SupabaseLikeError = {
  message?: string | null;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
} | null;

export function describeSupabaseError(error: SupabaseLikeError): string {
  if (!error) return "Unknown error";
  const parts = [
    error.message?.trim() || "(no message)",
    error.code ? `code=${error.code}` : null,
    error.details ? `details=${error.details}` : null,
    error.hint ? `hint=${error.hint}` : null,
  ].filter(Boolean);
  return parts.join(" | ");
}

export function logSupabaseError(context: string, error: SupabaseLikeError) {
  // Preserve raw object in console for stack/inspection.
  console.error(`[supabase] ${context}`, error);
}

export function reportSupabaseFailure(input: {
  context: string;
  error: SupabaseLikeError;
  retry?: () => void | Promise<void>;
}) {
  logSupabaseError(input.context, input.error);
  setFailure({
    context: input.context,
    message: describeSupabaseError(input.error),
    retry: input.retry,
  });
}
