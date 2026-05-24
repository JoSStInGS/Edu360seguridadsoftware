import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const INACTIVITY_COOKIE = "edu360_last_activity";
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;

function isProtectedPath(pathname: string) {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/welcome");
}

function isAuthPath(pathname: string) {
  return pathname === "/auth";
}

function readLastActivity(request: NextRequest) {
  const rawValue = request.cookies.get(INACTIVITY_COOKIE)?.value;
  if (!rawValue) return null;

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const now = Date.now();
  const lastActivity = readLastActivity(request);
  const isInactive =
    Boolean(user) &&
    Boolean(lastActivity) &&
    now - Number(lastActivity) > INACTIVITY_TIMEOUT_MS;

  if (isInactive) {
    await supabase.auth.signOut();
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set("reason", "inactive");
    response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(INACTIVITY_COOKIE);
    return response;
  }

  if (!user && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/welcome";
    return NextResponse.redirect(redirectUrl);
  }

  if (user) {
    response.cookies.set(INACTIVITY_COOKIE, String(now), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  return response;
}
