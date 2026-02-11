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
        const decodedToken = await auth.verifyIdToken(idToken);
        const callerUid = decodedToken.uid;

        const db = getAdminFirestore();

        // 2. Parse body
        const { centerId, periodId, parentUid, parentEmail, studentCedulas } = await request.json();

        if (!centerId || !periodId || !parentUid || !parentEmail || !studentCedulas?.length) {
            return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
        }

        // 3. Verify caller is the parent themselves or an admin
        const callerDoc = await db.collection("users").doc(callerUid).get();
        const callerData = callerDoc.data();

        const isAdmin = callerData?.role === "admin" && callerData?.centerId === centerId;
        const isSelf = callerUid === parentUid;

        if (!isAdmin && !isSelf) {
            return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
        }

        // 4. Get existing links to avoid duplicates
        const parentStudentsRef = db
            .collection("centers")
            .doc(centerId)
            .collection("periods")
            .doc(periodId)
            .collection("parent_students");

        const existingSnap = await parentStudentsRef
            .where("parentUid", "==", parentUid)
            .get();

        const existingCedulas = new Set(
            existingSnap.docs.map((d) => d.data().studentCedula)
        );

        // 5. Create links for each new student
        const studentsRef = db
            .collection("centers")
            .doc(centerId)
            .collection("periods")
            .doc(periodId)
            .collection("students");

        const created: { studentCedula: string; studentName: string }[] = [];

        for (const cedula of studentCedulas) {
            if (existingCedulas.has(cedula)) continue;

            const studentDoc = await studentsRef.doc(cedula).get();
            if (!studentDoc.exists) continue;

            const studentData = studentDoc.data();
            const studentName = studentData?.fullName ||
                [studentData?.name, studentData?.lastName1, studentData?.lastName2]
                    .filter(Boolean)
                    .join(" ") || "Sin nombre";

            await parentStudentsRef.add({
                parentUid,
                parentEmail,
                studentCedula: cedula,
                studentName,
                grupoId: studentData?.grupoId || null,
                grupoNombre: studentData?.grupoNombre || null,
                linkedAt: new Date(),
                linkedVia: "registration_code",
            });

            created.push({ studentCedula: cedula, studentName });
        }

        return NextResponse.json({
            success: true,
            message: `${created.length} vínculo(s) creado(s)`,
            created,
        });
    } catch (error) {
        console.error("Error creating parent links:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
