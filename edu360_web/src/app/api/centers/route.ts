import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET() {
    try {
        const db = getAdminFirestore();
        const centersRef = db.collection("centers");
        const snapshot = await centersRef.get();

        const centers = snapshot.docs.map((doc) => doc.data().name);

        return NextResponse.json({ centers });
    } catch (error) {
        return NextResponse.json(
            { error: "Error fetching centers" },
            { status: 500 }
        );
    }
}
