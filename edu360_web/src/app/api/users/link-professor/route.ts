import { NextResponse } from "next/server";
import { getAdminFirestore, ensureAdminApp } from "@/app/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        // 1. Verify Bearer token
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }
        const idToken = authHeader.split("Bearer ")[1];

        const app = ensureAdminApp();
        const auth = getAuth(app);

        // Verify token to ensure user is logged in
        await auth.verifyIdToken(idToken);

        // 2. Parse body
        const { centerId, periodId, profesorId, email } = await request.json();

        if (!centerId || !periodId || !profesorId || !email) {
            return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
        }

        const db = getAdminFirestore();

        // 3. Update professor document
        const professorRef = db
            .collection("centers")
            .doc(centerId)
            .collection("periods")
            .doc(periodId)
            .collection("profesores")
            .doc(profesorId);

        // Check if professor exists
        const professorDoc = await professorRef.get();
        if (!professorDoc.exists) {
            return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 });
        }

        // Update email
        await professorRef.update({ email });

        return NextResponse.json({ success: true, message: "Profesor vinculado correctamente" });

    } catch (error) {
        console.error("Error linking professor:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
