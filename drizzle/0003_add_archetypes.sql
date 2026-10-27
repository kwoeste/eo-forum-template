CREATE TABLE IF NOT EXISTS "archetypes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "member_id" uuid NOT NULL REFERENCES "members"("id"),
  "file_name" text,
  "file_url" text,
  "file_type" text,
  "file_size" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
