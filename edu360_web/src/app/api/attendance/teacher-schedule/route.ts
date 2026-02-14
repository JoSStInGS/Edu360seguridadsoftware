import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { ensureAdminApp } from "@/app/lib/firebaseAdmin";

export const runtime = "nodejs";

const DAY_MAP: Record<number, string> = {
    0: "Domingo",
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sábado",
};

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
        const profesorId = userData.profesorId as string;

        if (!centerId) {
            return NextResponse.json({ error: "Usuario sin centro asociado" }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const periodId = searchParams.get("period");

        if (!periodId) {
            return NextResponse.json({ error: "period es requerido" }, { status: 400 });
        }

        // Find teacher by profesorId or by email
        let teacherDocId = profesorId;
        const email = userData.email as string;

        if (!teacherDocId && email) {
            // Try to find by email
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
            return NextResponse.json({ classes: [], profesorId: null });
        }

        // Get today's day name
        const today = new Date();
        const todayDay = DAY_MAP[today.getDay()];

        // Fetch all schedules
        const horariosSnap = await db
            .collection("centers").doc(centerId)
            .collection("periods").doc(periodId)
            .collection("horarios")
            .get();

        // Filter schedules for this teacher and today
        const todayClasses = horariosSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((h: Record<string, unknown>) =>
                h.profesorId === teacherDocId && h.dia === todayDay
            )
            .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
                (a.horaInicio as string).localeCompare(b.horaInicio as string)
            );

        return NextResponse.json({
            classes: todayClasses,
            profesorId: teacherDocId,
        });
    } catch (error) {
        console.error("Error fetching teacher schedule:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
