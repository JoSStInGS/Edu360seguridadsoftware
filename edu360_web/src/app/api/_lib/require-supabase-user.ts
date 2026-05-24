import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function requireSupabaseUser(request?: Request) {
  const supabase = await createClient();
  const authHeader = request?.headers.get("Authorization");
  const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  const {
    data: { user },
    error,
  } = bearerToken
    ? await supabase.auth.getUser(bearerToken)
    : await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
      supabase,
    };
  }

  return { user, response: null, supabase };
}
