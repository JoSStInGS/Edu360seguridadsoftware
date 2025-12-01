import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { ensureAdminApp } from "@/app/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        // 1. Get the authorization header
        const authHeader = request.headers.get("Authorization");

        // 2. Parse form data
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const mappingsStr = formData.get("mappings") as string;
        const periodoLectivo = formData.get("periodoLectivo") as string;

        if (!file || !mappingsStr || !periodoLectivo) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const mappings = JSON.parse(mappingsStr) as { field: string; column: string; required: boolean }[];

        // 3. Parse CSV content
        const fileContent = await file.text();
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);

        if (lines.length < 2) {
            return NextResponse.json({ error: "File is empty or missing header" }, { status: 400 });
        }

        // Detect delimiter
        const firstLine = lines[0];
        const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";

        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        const dataRows = lines.slice(1);

        // 4. Get Center ID from Token
        const db = getAdminFirestore();
        let centerId = "";

        if (authHeader?.startsWith("Bearer ")) {
            const idToken = authHeader.split("Bearer ")[1];
            const app = ensureAdminApp();
            const auth = getAuth(app);
            const decodedToken = await auth.verifyIdToken(idToken);
            const uid = decodedToken.uid;
            const userDoc = await db.collection("users").doc(uid).get();
            centerId = userDoc.data()?.centerId;
        }

        if (!centerId) {
            return NextResponse.json({ error: "Could not identify education center" }, { status: 400 });
        }

        // 5. Process rows
        const teachersToSave = [];

        for (const rowLine of dataRows) {
            const row = rowLine.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));

            if (row.length !== headers.length) {
                continue;
            }

            const teacherData: Record<string, string | number | Date> = {
                createdAt: new Date(),
                periodoLectivo: periodoLectivo,
                status: "Activo",
            };

            // Map fields
            for (const mapping of mappings) {
                if (!mapping.column) continue;
                const columnIndex = headers.indexOf(mapping.column);
                if (columnIndex !== -1) {
                    const value = row[columnIndex];

                    if (mapping.field === "Nombre") teacherData.firstName = value;
                    if (mapping.field === "Apellido1") teacherData.lastName1 = value;
                    if (mapping.field === "Apellido2") teacherData.lastName2 = value;
                    if (mapping.field === "Correo Institucional") teacherData.email = value;
                    if (mapping.field === "Tipo de profesor") teacherData.type = value;
                    if (mapping.field === "Materia que imparte") teacherData.area = value;
                }
            }

            teacherData.fullName = `${teacherData.firstName || ''} ${teacherData.lastName1 || ''} ${teacherData.lastName2 || ''}`.trim();

            if (teacherData.firstName && teacherData.lastName1) {
                teachersToSave.push(teacherData);
            }
        }

        // 6. Save to Firestore
        const batch = db.batch();
        const teachersRef = db.collection("centers").doc(centerId).collection("periods").doc(periodoLectivo).collection("teachers");

        for (const teacher of teachersToSave) {
            const newDocRef = teachersRef.doc();
            batch.set(newDocRef, teacher);
        }

        await batch.commit();

        return NextResponse.json({
            success: true,
            count: teachersToSave.length,
            message: `Imported ${teachersToSave.length} teachers successfully`
        });

    } catch (error) {
        console.error("Error importing teachers:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
