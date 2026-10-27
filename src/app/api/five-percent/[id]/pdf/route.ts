import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { fivePercentReflections, members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { FivePercentPDF } from "@/lib/five-percent-pdf";
import { getReflectionFileUrls, isUploadedReflection } from "@/lib/five-percent";
import { saveUploadedFile } from "@/lib/storage";
import { format, toZonedTime } from "date-fns-tz";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isDraft = searchParams.get("draft") === "true";
    
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();

    let member = await db
      .select()
      .from(members)
      .where(eq(members.clerkUserId, userId))
      .limit(1);

    if (member.length === 0 && userEmail) {
      member = await db
        .select()
        .from(members)
        .where(eq(members.email, userEmail))
        .limit(1);
    }

    if (member.length === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const reflection = await db
      .select()
      .from(fivePercentReflections)
      .where(eq(fivePercentReflections.id, id))
      .limit(1);

    if (reflection.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (reflection[0].memberId !== member[0].id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (isUploadedReflection(reflection[0].pdfUrl)) {
      const files = getReflectionFileUrls(reflection[0].pdfUrl);
      if (files.length === 0) {
        return NextResponse.json({ error: "Uploaded file not found" }, { status: 404 });
      }
      return NextResponse.redirect(new URL(files[0], request.url));
    }

    const r = reflection[0];
    const memberName = member[0].name || `${member[0].firstName} ${member[0].lastName}`;
    
    const dateToUse = isDraft ? (r.updatedAt || r.createdAt) : (r.completedAt || r.updatedAt || r.createdAt);
    const zonedDate = toZonedTime(dateToUse, "America/New_York");
    const formattedDate = format(zonedDate, "MMM d, yyyy 'at' h:mm a zzz", {
      timeZone: "America/New_York",
    });

    const pdfBuffer = await renderToBuffer(
      FivePercentPDF({
        data: {
          memberName,
          completedAt: formattedDate,
          workFeelings: r.workFeelings || "",
          workCauses: r.workCauses || "",
          workSignificance: r.workSignificance || "",
          familyFeelings: r.familyFeelings || "",
          familyCauses: r.familyCauses || "",
          familySignificance: r.familySignificance || "",
          personalFeelings: r.personalFeelings || "",
          personalCauses: r.personalCauses || "",
          personalSignificance: r.personalSignificance || "",
          future30to60: r.future30to60 || "",
          whyTopics: r.whyTopics || "",
          whatHowTopics: r.whatHowTopics || "",
        },
        isDraft,
      })
    );

    const prefix = isDraft ? "5-percent-draft" : "5-percent-reflection";
    const filename = `${prefix}-${format(zonedDate, "yyyy-MM-dd-HHmm")}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();

    let member = await db
      .select()
      .from(members)
      .where(eq(members.clerkUserId, userId))
      .limit(1);

    if (member.length === 0 && userEmail) {
      member = await db
        .select()
        .from(members)
        .where(eq(members.email, userEmail))
        .limit(1);
    }

    if (member.length === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const reflection = await db
      .select()
      .from(fivePercentReflections)
      .where(eq(fivePercentReflections.id, id))
      .limit(1);

    if (reflection.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (reflection[0].memberId !== member[0].id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (isUploadedReflection(reflection[0].pdfUrl)) {
      return NextResponse.json(
        { error: "This reflection was uploaded as a photo" },
        { status: 400 }
      );
    }

    const r = reflection[0];
    const memberName = member[0].name || `${member[0].firstName} ${member[0].lastName}`;
    
    const now = new Date();
    const zonedDate = toZonedTime(now, "America/New_York");
    const formattedDate = format(zonedDate, "MMM d, yyyy 'at' h:mm a zzz", {
      timeZone: "America/New_York",
    });

    const pdfBuffer = await renderToBuffer(
      FivePercentPDF({
        data: {
          memberName,
          completedAt: formattedDate,
          workFeelings: r.workFeelings || "",
          workCauses: r.workCauses || "",
          workSignificance: r.workSignificance || "",
          familyFeelings: r.familyFeelings || "",
          familyCauses: r.familyCauses || "",
          familySignificance: r.familySignificance || "",
          personalFeelings: r.personalFeelings || "",
          personalCauses: r.personalCauses || "",
          personalSignificance: r.personalSignificance || "",
          future30to60: r.future30to60 || "",
          whyTopics: r.whyTopics || "",
          whatHowTopics: r.whatHowTopics || "",
        },
      })
    );

    const filename = `${member[0].id}-${id}-${Date.now()}.pdf`;
    const saved = await saveUploadedFile({
      folder: "five-percent",
      filename,
      data: Buffer.from(pdfBuffer),
      contentType: "application/pdf",
    });
    const pdfUrl = saved.url;

    await db
      .update(fivePercentReflections)
      .set({
        completedAt: now,
        pdfUrl,
        updatedAt: now,
      })
      .where(eq(fivePercentReflections.id, id));

    return NextResponse.json({
      message: "PDF generated and saved",
      pdfUrl,
      completedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
