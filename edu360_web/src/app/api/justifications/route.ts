import { NextResponse } from "next/server";
import { getAdminFirestore, ensureAdminApp } from "@/app/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import type { AbsenceJustification } from "@/types/justification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/justifications?period={periodId}
 * Profesor: lista las justificaciones donde él tiene revisión pendiente.
 * Usa array-contains en pendingProfessorIds → no requiere índice compuesto.
 */
export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }
        const idToken = authHeader.split("Bearer ")[1];

        const app = ensureAdminApp();
        const auth = getAuth(app);
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const db = getAdminFirestore();
        const userDoc = await db.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const userData = userDoc.data()!;
        const centerId = userData.centerId as string;
        if (!centerId) {
            return NextResponse.json({ error: "Usuario sin centro asociado" }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const periodId = searchParams.get("period");
        if (!periodId) {
            return NextResponse.json({ error: "period es requerido" }, { status: 400 });
        }

        // Resolve teacherDocId — same pattern as my-classes/route.ts
        let teacherDocId = userData.profesorId as string | undefined;
        const email = userData.email as string | undefined;

        if (!teacherDocId && email) {
            const profSnap = await db
                .collection("centers").doc(centerId)
                .collection("periods").doc(periodId)
                .collection("profesores")
                .where("email", "==", email)
                .limit(1)
                .get();

            if (!profSnap.empty) {
                teacherDocId = profSnap.docs[0].id;
            }
        }

        if (!teacherDocId) {
            return NextResponse.json({ justifications: [] });
        }

        // Query: justifications where this professor has a pending decision
        // array-contains doesn't require a composite index when used alone
        const snap = await db
            .collection("centers").doc(centerId)
            .collection("periods").doc(periodId)
            .collection("absence_justifications")
            .where("pendingProfessorIds", "array-contains", teacherDocId)
            .get();

        const justifications: AbsenceJustification[] = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as AbsenceJustification))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        return NextResponse.json({ justifications, profesorId: teacherDocId });
    } catch (error) {
        console.error("Error fetching justifications:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
