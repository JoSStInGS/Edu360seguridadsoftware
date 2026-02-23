import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { ensureAdminApp } from "@/app/lib/firebaseAdmin";

const MEP_DOMAINS_BY_ROLE: Record<string, string> = {
    parent: "@est.mep.go.cr",
    admin: "@mep.go.cr",
    professor: "@mep.go.cr",
};

function isMepEmailForRole(email: string, roles: string[]): boolean {
    for (const role of roles) {
        const domain = MEP_DOMAINS_BY_ROLE[role];
        if (domain && email.toLowerCase().endsWith(domain)) return true;
    }
    return false;
}

export async function POST(req: NextRequest) {
    try {
        // Authenticate request
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const idToken = authHeader.slice(7);

        const adminApp = ensureAdminApp();
        const adminAuth = getAuth(adminApp);
        const decoded = await adminAuth.verifyIdToken(idToken);
        const uid = decoded.uid;

        const body = await req.json() as { mepEmail: string };
        const mepEmail = body.mepEmail?.trim().toLowerCase();

        if (!mepEmail) {
            return NextResponse.json({ error: "mepEmail is required" }, { status: 400 });
        }

        // Validate email format
        if (!mepEmail.includes("@")) {
            return NextResponse.json({ error: "Formato de correo inválido" }, { status: 400 });
        }

        // Get user profile to check roles
        const db = getAdminFirestore();
        const userRef = db.collection("users").doc(uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = userSnap.data()!;
        const roles: string[] = Array.isArray(userData.roles)
            ? userData.roles
            : userData.role
                ? [userData.role as string]
                : [];

        // Validate that the MEP email matches the expected domain for the user's roles
        if (!isMepEmailForRole(mepEmail, roles)) {
            const expectedDomains = [...new Set(roles.map((r) => MEP_DOMAINS_BY_ROLE[r]).filter(Boolean))];
            return NextResponse.json(
                {
                    error: `El correo debe pertenecer al dominio ${expectedDomains.join(" o ")}`,
                },
                { status: 400 }
            );
        }

        // Save MEP email
        await userRef.update({ mepEmail });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Error saving MEP email:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
