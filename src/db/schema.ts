import { pgTable, text, timestamp, boolean, integer, uuid, date, jsonb, unique } from 'drizzle-orm/pg-core';

export const memberAllowlist = pgTable('member_allowlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  inviteSent: boolean('invite_sent').notNull().default(false),
  inviteSentAt: timestamp('invite_sent_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').unique(),
  email: text('email').unique(),
  name: text('name'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  role: text('role').notNull().default('Member'),
  isAdmin: boolean('is_admin').notNull().default(false),
  birthday: date('birthday'),
  spouse: text('spouse'),
  profilePhotoUrl: text('profile_photo_url'),
  about: text('about'),
  businessName: text('business_name'),
  businessWebsite: text('business_website'),
  socialLinks: jsonb('social_links'),
  profileCompleted: boolean('profile_completed').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const personalFiles = pgTable('personal_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type'),
  fileSize: integer('file_size'),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const meetings = pgTable('meetings', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  date: date('date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  location: text('location'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const meetingAgendas = pgTable('meeting_agendas', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id').references(() => meetings.id).notNull(),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type'),
  fileSize: integer('file_size'),
  uploadedBy: uuid('uploaded_by').references(() => members.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const parkingLotCategories = pgTable('parking_lot_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const parkingLot = pgTable('parking_lot', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').references(() => members.id),
  categoryId: uuid('category_id').references(() => parkingLotCategories.id),
  date: date('date'),
  noteText: text('note_text').notNull(),
  isHighlighted: boolean('is_highlighted').notNull().default(false),
  status: text('status').notNull().default('active'),
  convertedToDeepDive: boolean('converted_to_deep_dive').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  goalText: text('goal_text').notNull(),
  horizon: integer('horizon').notNull(),
  setDate: date('set_date').notNull(),
  targetDate: date('target_date').notNull(),
  result: text('result').notNull().default('open'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const fivePercentReflections = pgTable('five_percent_reflections', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  meetingId: uuid('meeting_id').references(() => meetings.id),
  workFeelings: text('work_feelings'),
  workCauses: text('work_causes'),
  workSignificance: text('work_significance'),
  familyFeelings: text('family_feelings'),
  familyCauses: text('family_causes'),
  familySignificance: text('family_significance'),
  personalFeelings: text('personal_feelings'),
  personalCauses: text('personal_causes'),
  personalSignificance: text('personal_significance'),
  future30to60: text('future_30_to_60'),
  whyTopics: text('why_topics'),
  whatHowTopics: text('what_how_topics'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  pdfUrl: text('pdf_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const deepDivePacks = pgTable('deep_dive_packs', {
  id: uuid('id').primaryKey().defaultRandom(),
  presenterId: uuid('presenter_id').references(() => members.id).notNull(),
  coachId: uuid('coach_id').references(() => members.id).notNull(),
  scribeId: uuid('scribe_id').references(() => members.id),
  meetingId: uuid('meeting_id').references(() => meetings.id),
  coachingDate: date('coaching_date'),
  coachingTime: text('coaching_time'),
  coachingLocation: text('coaching_location'),
  coachingStatus: text('coaching_status').notNull().default('scheduled'),
  presenterForm: jsonb('presenter_form'),
  coachIntroduction: jsonb('coach_introduction'),
  scribeNotes: jsonb('scribe_notes'),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const retreats = pgTable('retreats', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  nightCount: integer('night_count'),
  location: text('location'),
  venue: text('venue'),
  lodgingDetails: text('lodging_details'),
  lodgingLink: text('lodging_link'),
  estimatedCost: integer('estimated_cost'),
  perPersonCost: integer('per_person_cost'),
  depositAmount: integer('deposit_amount'),
  planningNotes: text('planning_notes'),
  dailySchedule: text('daily_schedule'),
  travelLogistics: text('travel_logistics'),
  mealsInfo: text('meals_info'),
  roomsInfo: text('rooms_info'),
  packingList: text('packing_list'),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const retreatAgendas = pgTable('retreat_agendas', {
  id: uuid('id').primaryKey().defaultRandom(),
  retreatId: uuid('retreat_id').references(() => retreats.id).notNull(),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type'),
  fileSize: integer('file_size'),
  uploadedBy: uuid('uploaded_by').references(() => members.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const retreatAttendees = pgTable('retreat_attendees', {
  id: uuid('id').primaryKey().defaultRandom(),
  retreatId: uuid('retreat_id').references(() => retreats.id).notNull(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  status: text('status').notNull().default('pending'),
  hasPaid: boolean('has_paid').notNull().default(false),
  paidAmount: integer('paid_amount'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const chapterEvents = pgTable('chapter_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  startTime: text('start_time'),
  endTime: text('end_time'),
  location: text('location'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const ledger = pgTable('ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  description: text('description').notNull(),
  amount: integer('amount').notNull(),
  type: text('type').notNull(),
  date: date('date').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const libraryLinks = pgTable('library_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  driveUrl: text('drive_url'),
  fileUrl: text('file_url'),
  description: text('description'),
  category: text('category'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const lifelines = pgTable('lifelines', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  fileName: text('file_name'),
  fileUrl: text('file_url'),
  fileType: text('file_type'),
  fileSize: integer('file_size'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const archetypes = pgTable('archetypes', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  fileName: text('file_name'),
  fileUrl: text('file_url'),
  fileType: text('file_type'),
  fileSize: integer('file_size'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const treasurerReports = pgTable('treasurer_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  reportDate: date('report_date').notNull(),
  balance: integer('balance'),
  notes: text('notes'),
  fileName: text('file_name'),
  fileUrl: text('file_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const memberDues = pgTable('member_dues', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  fiscalYear: text('fiscal_year').notNull(),
  amountDue: integer('amount_due').notNull().default(500),
  amountPaid: integer('amount_paid').notNull().default(0),
  paidDate: date('paid_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const fineSchedule = pgTable('fine_schedule', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  amount: integer('amount').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const calendarEvents = pgTable('calendar_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  eventDate: date('event_date').notNull(),
  endDate: date('end_date'),
  startTime: text('start_time'),
  endTime: text('end_time'),
  location: text('location'),
  eventType: text('event_type').notNull().default('general'),
  createdBy: uuid('created_by').references(() => members.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const meetingPrepItems = pgTable('meeting_prep_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  href: text('href'),
  note: text('note'),
  sortOrder: integer('sort_order').notNull().default(0),
  dueDate: date('due_date').notNull(),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const meetingPrepCompletions = pgTable('meeting_prep_completions', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id').references(() => meetingPrepItems.id).notNull(),
  memberId: uuid('member_id').references(() => members.id).notNull(),
  completedAt: timestamp('completed_at').notNull().defaultNow(),
});

export const bugReports = pgTable('bug_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').references(() => members.id),
  reporterName: text('reporter_name').notNull(),
  reporterEmail: text('reporter_email').notNull(),
  pagePath: text('page_path').notNull(),
  pageUrl: text('page_url'),
  userAgent: text('user_agent'),
  description: text('description').notNull(),
  screenshotUrl: text('screenshot_url'),
  screenshotFileName: text('screenshot_file_name'),
  emailSentAt: timestamp('email_sent_at'),
  cursorDispatchedAt: timestamp('cursor_dispatched_at'),
  cursorDestination: text('cursor_destination'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  fixedAt: timestamp('fixed_at'),
});

export const constitutionSignatures = pgTable(
  'constitution_signatures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id').references(() => members.id).notNull(),
    constitutionVersion: text('constitution_version').notNull(),
    signedName: text('signed_name').notNull(),
    signedAt: timestamp('signed_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    unique('constitution_signatures_member_version_unique').on(
      table.memberId,
      table.constitutionVersion
    ),
  ]
);

export const eventAttendees = pgTable(
  'event_attendees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').references(() => calendarEvents.id, { onDelete: 'cascade' }).notNull(),
    memberId: uuid('member_id').references(() => members.id),
    email: text('email').notNull(),
    rsvpStatus: text('rsvp_status').notNull().default('pending'),
    googleCalendarEventId: text('google_calendar_event_id'),
    inviteSentAt: timestamp('invite_sent_at'),
    respondedAt: timestamp('responded_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    unique('event_attendees_event_email_unique').on(
      table.eventId,
      table.email
    ),
  ]
);
