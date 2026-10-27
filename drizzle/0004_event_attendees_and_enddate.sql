-- Add endDate column to calendar_events for multi-day events
ALTER TABLE "calendar_events" ADD COLUMN IF NOT EXISTS "end_date" date;

-- Create event_attendees table for RSVP tracking
CREATE TABLE IF NOT EXISTS "event_attendees" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL REFERENCES "calendar_events"("id") ON DELETE CASCADE,
  "member_id" uuid REFERENCES "members"("id"),
  "email" text NOT NULL,
  "rsvp_status" text DEFAULT 'pending' NOT NULL,
  "google_calendar_event_id" text,
  "invite_sent_at" timestamp,
  "responded_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add unique constraint for event + email (email is required, member_id is optional)
ALTER TABLE "event_attendees" 
ADD CONSTRAINT "event_attendees_event_email_unique" 
UNIQUE ("event_id", "email");

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "event_attendees_event_id_idx" ON "event_attendees" ("event_id");
CREATE INDEX IF NOT EXISTS "event_attendees_email_idx" ON "event_attendees" ("email");
