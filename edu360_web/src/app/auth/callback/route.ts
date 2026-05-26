import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

function getSafeRedirectPath(next: string | null) {
  if (!next?.startsWith("/") || next.startsWith("//")) {
    return "/auth/email-confirmed";
  }

  return next;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeRedirectPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return NextResponse.redirect(new URL("/auth?confirm=failed", requestUrl.origin));
    }

    const user = data.user;

    if (user?.email) {
      const admin = createAdminClient();
      const { error } = await admin.rpc("complete_registration_intent_for_user", {
        p_user_id: user.id,
        p_email: user.email.trim().toLowerCase(),
        p_display_name:
          user.user_metadata?.display_name ??
          user.user_metadata?.full_name ??
          user.email.split("@")[0],
        p_mep_email: user.user_metadata?.mep_email ?? null,
        p_provider: user.app_metadata?.provider ?? "email",
      });

      if (error && !error.message.toLowerCase().includes("registration intent not found")) {
        console.error("Error completing registration intent:", error);
      }
    }

    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
