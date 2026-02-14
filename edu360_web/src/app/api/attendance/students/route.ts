import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { ensureAdminApp } from "@/app/lib/firebaseAdmin";

export const runtime = "nodejs";

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
        const grupoId = searchParams.get("grupoId");

        if (!periodId || !grupoId) {
            return NextResponse.json({ error: "period y grupoId son requeridos" }, { status: 400 });
        }

        // Fetch students that belong to the given group
        const studentsSnap = await db
            .collection("centers").doc(centerId)
            .collection("periods").doc(periodId)
            .collection("students")
            .where("grupoId", "==", grupoId)
            .get();

        const students = studentsSnap.docs.map((doc) => {
            const data = doc.data();
            const fullName = data.fullName ||
                [data.name, data.lastName1, data.lastName2].filter(Boolean).join(" ") ||
                "Sin nombre";
            return {
                id: doc.id,
                cedula: doc.id,
                fullName,
                grupoId: data.grupoId || null,
                grupoNombre: data.grupoNombre || null,
            };
        });

        students.sort((a, b) => a.fullName.localeCompare(b.fullName));

        return NextResponse.json({ students });
    } catch (error) {
        console.error("Error fetching students:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
