import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bugReports } from "@/db/schema";
import { clerkUserIsSiteAdmin } from "@/lib/admin";
import { ensureBugReportsSchema } from "@/lib/ensure-bug-reports-schema";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (!clerkUserIsSiteAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const body = await request.json();
    if (typeof body?.fixed !== "boolean") {
      return NextResponse.json(
        { error: "fixed must be true or false" },
        { status: 400 }
      );
    }

    await ensureBugReportsSchema();

    const updated = await db
      .update(bugReports)
      .set({ fixedAt: body.fixed ? new Date() : null })
      .where(eq(bugReports.id, id))
      .returning({
        id: bugReports.id,
        fixedAt: bugReports.fixedAt,
      });

    if (updated.length === 0) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      item: {
        id: updated[0].id,
        fixedAt: updated[0].fixedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to update bug report:", error);
    return NextResponse.json(
      { error: "Failed to update bug report" },
      { status: 500 }
    );
  }
}
