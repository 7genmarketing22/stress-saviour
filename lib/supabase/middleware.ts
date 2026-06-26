import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseKey, getSupabaseUrl } from "./env";

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
  const authRoutes = ["/login", "/register", "/forgot-password"];

  // If user is logged in and trying to access auth routes, redirect to dashboard
  if (user && authRoutes.some((route) => path.startsWith(route))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile) {
      const dashboardMap = {
        patient: "/patient/dashboard",
        doctor: "/doctor/dashboard",
        admin: "/admin/dashboard",
        super_admin: "/admin/dashboard",
      };
      return NextResponse.redirect(
        new URL(dashboardMap[profile.role as keyof typeof dashboardMap], request.url)
      );
    }
  }

  // Protected routes require authentication
  if (
    !user &&
    !publicRoutes.some((route) => path === route || path.startsWith(route)) &&
    !authRoutes.some((route) => path.startsWith(route))
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role-based access control
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile) {
      const role = profile.role;
      const dashboardMap = {
        patient: "/patient/dashboard",
        doctor: "/doctor/dashboard",
        admin: "/admin/dashboard",
        super_admin: "/admin/dashboard",
      };

      // Redirect if visiting generic /dashboard
      if (path === "/dashboard" || path === "/dashboard/") {
        return NextResponse.redirect(
          new URL(dashboardMap[role as keyof typeof dashboardMap], request.url)
        );
      }

      // Restrict access to /patient/* routes
      if (path.startsWith("/patient") && role !== "patient") {
        return NextResponse.redirect(
          new URL(dashboardMap[role as keyof typeof dashboardMap], request.url)
        );
      }

      // Restrict access to /doctor/* routes
      if (path.startsWith("/doctor") && role !== "doctor") {
        return NextResponse.redirect(
          new URL(dashboardMap[role as keyof typeof dashboardMap], request.url)
        );
      }

      // Restrict access to /admin/* routes
      if (
        path.startsWith("/admin") &&
        role !== "admin" &&
        role !== "super_admin"
      ) {
        return NextResponse.redirect(
          new URL(dashboardMap[role as keyof typeof dashboardMap], request.url)
        );
      }
    }
  }

  return supabaseResponse;
}
