import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseKey, getSupabaseUrl } from "./env";
import {
  evaluateAccountAccess,
  resolveDashboardPath,
} from "@/lib/auth/account-status";
import type { DoctorStatus, Profile, UserRole } from "@/types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseKey(), {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Role-based routing logic
  const path = request.nextUrl.pathname;

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/doctors", "/about", "/contact"];
  const authRoutes = ["/login", "/register", "/forgot-password", "/pending-review"];

  async function loadProfile(userId: string) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!profileRow) return evaluateAccountAccess(null);

    const profile = profileRow as Profile;
    let doctorStatus: DoctorStatus | null = null;

    if (profile.role === "doctor") {
      const { data: doctorProfile } = await supabase
        .from("doctor_profiles")
        .select("status")
        .eq("user_id", userId)
        .maybeSingle();
      doctorStatus = (doctorProfile as { status?: DoctorStatus } | null)?.status ?? null;
    }

    return evaluateAccountAccess(profile, doctorStatus);
  }

  // Pending users may only visit pending-review (plus public pages)
  if (user && path.startsWith("/pending-review") === false) {
    const access = await loadProfile(user.id);
    if (
      access.profile &&
      !access.canAccessDashboard &&
      (access.pendingReview || access.rejected) &&
      (path.startsWith("/patient") ||
        path.startsWith("/doctor") ||
        path.startsWith("/admin") ||
        path === "/dashboard")
    ) {
      return NextResponse.redirect(new URL("/pending-review", request.url));
    }
  }

  // If user is logged in and trying to access auth routes, redirect when approved
  if (user && authRoutes.some((route) => path.startsWith(route))) {
    if (path.startsWith("/pending-review")) {
      return supabaseResponse;
    }

    const access = await loadProfile(user.id);
    if (access.profile && access.canAccessDashboard) {
      const redirectParam = request.nextUrl.searchParams.get("redirect");
      const fallback = resolveDashboardPath(access.profile.role as UserRole);
      const target =
        redirectParam &&
        redirectParam.startsWith("/") &&
        !redirectParam.startsWith("//") &&
        !redirectParam.includes("://")
          ? redirectParam
          : fallback;
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  // Protected routes require authentication — preserve return URL for post-login.
  if (
    !user &&
    !publicRoutes.some((route) => path === route || path.startsWith(route)) &&
    !authRoutes.some((route) => path.startsWith(route))
  ) {
    const returnPath = `${path}${request.nextUrl.search}`;
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", returnPath);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control
  if (user) {
    const access = await loadProfile(user.id);
    const profile = access.profile;

    if (profile) {
      const role = profile.role as UserRole;
      const dashboardPath = resolveDashboardPath(role);

      if (path === "/dashboard" || path === "/dashboard/") {
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }

      if (path.startsWith("/patient") && role !== "patient") {
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }

      if (path.startsWith("/doctor") && role !== "doctor") {
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }

      if (
        path.startsWith("/admin") &&
        role !== "admin" &&
        role !== "super_admin"
      ) {
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }
    }
  }

  return supabaseResponse;
}
