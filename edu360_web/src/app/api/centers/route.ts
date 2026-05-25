import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from("centers")
            .select("id,name")
            .eq("status", "active")
            .order("name");

        if (error) {
            return NextResponse.json(
                { error: "Error fetching centers" },
                { status: 500 }
            );
        }

        return NextResponse.json({ centers: data ?? [] });
    } catch {
        return NextResponse.json(
            { error: "Error fetching centers" },
            { status: 500 }
        );
    }
}
