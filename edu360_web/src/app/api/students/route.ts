import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        // 1. Get the authorization header
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const idToken = authHeader.split("Bearer ")[1];

        // 2. Verify the token
        // We need 'firebase-admin' auth to verify the token.
        // Assuming 'getAdminFirestore' is from a file that also exports 'getAdminAuth' or similar,
        // or we can import 'ensureAdminApp' and get auth from there.
        // Let's check firebaseAdmin.ts again to see what's available.
        // Based on previous view_file, it exports ensureAdminApp.

        const { getAuth } = await import("firebase-admin/auth");
        const { ensureAdminApp } = await import("@/app/lib/firebaseAdmin");

        const app = ensureAdminApp();
        const auth = getAuth(app);

        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const db = getAdminFirestore();

        // 3. Get user's center from their profile
        const userDoc = await db.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        const userData = userDoc.data();
        const centerId = userData?.centerId;

        if (!centerId) {
            return NextResponse.json({ error: "User is not associated with a center" }, { status: 400 });
        }

        // 4. Fetch students from the center's students subcollection
        // Path: /centers/{centerId}/periods/2025/students
        // Note: The user hardcoded 2025 in the prompt example, but we might want to make it dynamic later.
        // For now, I'll stick to "2025" as requested or maybe pass it as a query param.
        // The prompt said: /centers/{centro que pertenece el usuario}/periods/2025/students

        const studentsRef = db
            .collection("centers")
            .doc(centerId)
            .collection("periods")
            .doc("2025")
            .collection("students");

        const snapshot = await studentsRef.get();

        const students = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json({ students });

    } catch (error) {
        console.error("Error fetching students:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
