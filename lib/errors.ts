/**
 * Extract a safe, human-readable message from Auth / PostgREST / unknown errors.
 * Never returns "{}" or "[object Object]" (common when JSON.stringify-ing Error).
 */
export function getErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  let raw = "";

  if (typeof err === "string") {
    raw = err;
  } else if (err instanceof Error) {
    raw = err.message;
  } else if (err && typeof err === "object") {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === "string") raw = obj.message;
    else if (typeof obj.msg === "string") raw = obj.msg;
    else if (typeof obj.error === "string") raw = obj.error;
    else if (obj.error && typeof obj.error === "object") {
      const nested = obj.error as Record<string, unknown>;
      if (typeof nested.message === "string") raw = nested.message;
    }
  }

  const text = raw.trim();
  if (!text || text === "{}" || text === "[object Object]") {
    return fallback;
  }
  return text;
}

/** Registration / signup-specific friendly messages. */
export function formatRegisterError(err: unknown): string {
  const text = getErrorMessage(err, "");
  const lower = text.toLowerCase();

  if (
    lower.includes("pmdc_number") ||
    lower.includes("doctor_profiles_pmdc_number") ||
    (lower.includes("duplicate") && lower.includes("pmdc"))
  ) {
    return "This PMDC number is already registered. Use your unique PMDC number, or log in if you already applied.";
  }

  if (lower.includes("database error saving new user")) {
    return "We could not create your account. If you reused a PMDC number or email, try different details — or log in if you already registered.";
  }

  if (lower.includes("already registered") || lower.includes("user already exists")) {
    return "An account with this email already exists. Please log in instead.";
  }

  return text || "Registration failed. Please check your details and try again.";
}
