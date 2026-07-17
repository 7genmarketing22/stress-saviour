/**
 * Only allow same-origin relative paths to avoid open-redirect attacks.
 */
export function isSafeRedirectPath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("://")) return false;
  return true;
}

export function resolvePostLoginPath(
  role: string,
  redirectTo: string | null | undefined,
  fallback: string
): string {
  if (isSafeRedirectPath(redirectTo)) {
    // Admins should not be sent to doctor/patient deep links after login.
    if (
      (role === "admin" || role === "super_admin") &&
      (redirectTo.startsWith("/doctor") ||
        redirectTo.startsWith("/patient") ||
        redirectTo.startsWith("/video"))
    ) {
      return fallback;
    }
    return redirectTo;
  }
  return fallback;
}
