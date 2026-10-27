import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { members, lifelines, archetypes } from "@/db/schema";
import { eq } from "drizzle-orm";
import path from "path";
import { saveUploadedBrowserFile } from "@/lib/storage";

type UploadType = "photo" | "lifeline" | "archetype";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const uploadType = parseUploadType(formData.get("type"));

    if (!uploadType) {
      return NextResponse.json({ error: "Invalid upload type" }, { status: 400 });
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const folder = folderForUploadType(uploadType);
    const ext = path.extname(file.name) || extensionForType(file.type);
    const filename = `${userId}-${Date.now()}${ext}`;
    const saved = await saveUploadedBrowserFile(file, folder, filename);

    const member = await findCurrentMember(userId);
    if (uploadType === "photo") {
      if (member) {
        await db
          .update(members)
          .set({
            clerkUserId: userId,
            profilePhotoUrl: saved.url,
            updatedAt: new Date(),
          })
          .where(eq(members.id, member.id));
      }
    } else if (uploadType === "lifeline") {
      if (member) {
        const existing = await db
          .select()
          .from(lifelines)
          .where(eq(lifelines.memberId, member.id))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(lifelines)
            .set({
              fileName: file.name,
              fileUrl: saved.url,
              fileType: file.type || null,
              fileSize: file.size,
              updatedAt: new Date(),
            })
            .where(eq(lifelines.memberId, member.id));
        } else {
          await db.insert(lifelines).values({
            memberId: member.id,
            fileName: file.name,
            fileUrl: saved.url,
            fileType: file.type || null,
            fileSize: file.size,
          });
        }
      }
    } else if (uploadType === "archetype") {
      if (member) {
        const existing = await db
          .select()
          .from(archetypes)
          .where(eq(archetypes.memberId, member.id))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(archetypes)
            .set({
              fileName: file.name,
              fileUrl: saved.url,
              fileType: file.type || null,
              fileSize: file.size,
              updatedAt: new Date(),
            })
            .where(eq(archetypes.memberId, member.id));
        } else {
          await db.insert(archetypes).values({
            memberId: member.id,
            fileName: file.name,
            fileUrl: saved.url,
            fileType: file.type || null,
            fileSize: file.size,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      fileUrl: saved.url,
      fileName: file.name,
    });
  } catch (error) {
    console.error("Profile upload error:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseUploadType(value: FormDataEntryValue | null): UploadType | null {
  if (value === "photo" || value === "lifeline" || value === "archetype") {
    return value;
  }
  return null;
}

function folderForUploadType(uploadType: UploadType): "photos" | "lifelines" | "archetypes" {
  switch (uploadType) {
    case "photo":
      return "photos";
    case "lifeline":
      return "lifelines";
    case "archetype":
      return "archetypes";
    default: {
      const exhaustiveCheck: never = uploadType;
      throw new Error(`Invalid upload type: ${String(exhaustiveCheck)}`);
    }
  }
}

function extensionForType(contentType: string): string {
  if (contentType === "image/jpeg") {
    return ".jpg";
  }
  if (contentType === "image/png") {
    return ".png";
  }
  if (contentType === "image/webp") {
    return ".webp";
  }
  if (contentType === "application/pdf") {
    return ".pdf";
  }
  return "";
}

async function findCurrentMember(userId: string) {
  const user = await currentUser();
  const userEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();

  let member = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.clerkUserId, userId))
    .limit(1);

  if (member.length === 0 && userEmail) {
    member = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.email, userEmail))
      .limit(1);
  }

  return member[0] ?? null;
}
