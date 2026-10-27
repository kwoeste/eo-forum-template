CREATE TABLE IF NOT EXISTS "constitution_signatures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "member_id" uuid NOT NULL REFERENCES "members"("id"),
  "constitution_version" text NOT NULL,
  "signed_name" text NOT NULL,
  "signed_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "constitution_signatures_member_version_unique" UNIQUE("member_id", "constitution_version")
);
