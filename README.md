# EO Forum Website Template

> **Provided as-is. No support, no hosting, no warranty.** This is a template you copy and run yourself. The original author does not host it, maintain it, or help set up copies. Not affiliated with or endorsed by Entrepreneurs' Organization (EO).

## What this app does

A private, members-only website for one EO forum. Members sign in with their email and get:

- **Home dashboard** – next meeting, map of upcoming event locations, your open goals, things to do before the meeting.
- **Calendar & Events** – forum meetings, chapter events, socials, retreats; RSVPs; calendar invites (.ics) members can add to Google/Outlook/Apple calendars.
- **5% Reflection** – fill in the monthly check-in online (or upload a photo/PDF of your paper copy) and download it as a PDF.
- **Deep Dive** – plan a presentation, coaching status, worksheets, add to calendar.
- **Goals** – 1, 6 and 12-month goals per member, mark hit/missed.
- **Parking Lot, Round Table, Lifeline, Bios, Birthdays, Members** – shared lists and member profiles.
- **Constitution** – summary page plus online signatures; **Treasurer** – dues and fines ledger; **Retreat** – planning and agendas; **Library** – agendas and documents.
- **Report a problem** – optional email to the site admin.

The forum's name, chapter, officer emails and the list of allowed members are all settings (see step 6); you don't need to edit code to rebrand. Some page *text* (the constitution summary, fine amounts, meeting rules) is a generic example: you'll want to edit it to match your own constitution (step 11).

## What you'll need (rough costs, estimates as of 2026, check each site)

| Service | What it's for | Rough cost |
|---|---|---|
| Domain (e.g. Namecheap, Cloudflare, GoDaddy, or buy it inside Vercel) | your web address | ~$10–20 per year |
| GitHub | stores your copy of the code | free |
| Vercel | runs the website, stores uploaded files (Blob) | free "Hobby" plan is usually enough for one forum. Vercel's terms may require the paid Pro plan (~$20/month) for some uses. Check. |
| Neon | the database | free tier is usually enough |
| Clerk | member sign-in | free tier covers far more users than one forum |
| Google Cloud (**optional**) | address suggestions when typing event locations. Optional, and the most technical step; skip it and addresses are typed by hand | needs a billing card on file. A forum's usage is usually inside Google's free monthly credit (estimate) |
| Resend (optional) | "report a problem" emails | free tier |

Plan on about **1–3 hours** for setup if you've never done this before. An AI coding agent can do most of it for you: see **AGENTS.md**.

## Setup, step by step

**1. Buy a domain.** Pick something like `ourforumname.com`. You can also skip this at first and use the free `something.vercel.app` address Vercel gives you.

**2. Create a GitHub account** at https://github.com, then make your own copy of this code: on this repository's page click **Use this template → Create a new repository** (or **Fork**). **Make it Private.** If you were sent a zip file, create a new private repository and upload the files.

**3. Create a Neon account (the database)** at https://neon.tech. Create a project (any name, pick the region closest to you). On the project dashboard click **Connect** and copy the **connection string**. It starts with `postgresql://`. That value is your `DATABASE_URL`. Treat it like a password.

**4. Create a Clerk account (sign-in)** at https://clerk.com. Create an application, and turn on **Email** sign-in (Google sign-in is optional). Under **API Keys** copy the **Publishable key** (`pk_...`) and **Secret key** (`sk_...`).
   - For your real site, create a **Production instance** in Clerk and follow its steps to add your domain (it will ask you to add a few DNS records). The "Development" keys (`pk_test_`) work for trying things out.
   - Recommended: in Clerk → **Restrictions**, turn on **Allowlist** or set sign-ups to **Restricted** so only invited people can join.

**5. (Optional) Get a Google Maps key for address suggestions.** *Optional, and the most technical step; skip it and addresses are typed by hand.* If you want it: Go to https://console.cloud.google.com, create a project, add billing, then **APIs & Services → Library → enable "Places API (New)"**. Then **Credentials → Create credentials → API key**. Restrict the key to the Places API. This is `GOOGLE_PLACES_API_KEY`. Without it the site works normally; members just type addresses.

**6. Create a Vercel account** at https://vercel.com (sign in with GitHub). Click **Add New → Project**, choose your repository, and before clicking Deploy open **Environment Variables** and add these (full list with explanations is in `.env.example`):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_FORUM_NAME` | your forum's name, e.g. `The Trailblazers` |
   | `NEXT_PUBLIC_CHAPTER_NAME` | e.g. `EO Denver` |
   | `NEXT_PUBLIC_SITE_DOMAIN` | your domain, e.g. `ourforum.com` |
   | `NEXT_PUBLIC_CONSTITUTION_TITLE` | e.g. `2026–27 Constitution` |
   | `NEXT_PUBLIC_CONSTITUTION_URL` | optional link to your constitution doc |
   | `NEXT_PUBLIC_ADMIN_EMAIL` | the email of the person running the site |
   | `NEXT_PUBLIC_MODERATOR_EMAIL`, `NEXT_PUBLIC_TREASURER_EMAIL` | officer emails (can upload agendas / edit treasurer pages) |
   | `NEXT_PUBLIC_TREASURER_NAME`, `NEXT_PUBLIC_RETREAT_COORDINATOR_NAME` | names shown on those pages |
   | `ALLOWED_MEMBER_EMAILS` | every member's email, separated by commas. Anyone else who signs in is turned away. |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | from step 4 |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_URL` = `/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL` = `/sign-up` | type exactly these |
   | `DATABASE_URL` | from step 3 |
   | `SEED_SECRET` | make up a long random password-like string |
   | `GOOGLE_PLACES_API_KEY` | **optional**, from step 5. Optional, and the most technical step; skip it and addresses are typed by hand |
   | `RESEND_API_KEY`, `BUG_REPORT_TO_EMAIL` | optional, from https://resend.com |

   Then click **Deploy**.

**7. Turn on file uploads.** In Vercel open your project → **Storage → Create → Blob** → connect it to the project. Then **Deployments → ⋯ → Redeploy** so the site picks it up. (Photos, agendas and 5% uploads are stored here.)

**8. Create the database tables.** This needs a computer with Node.js installed (https://nodejs.org, the "LTS" version), or ask a coding agent to do it. In a terminal, inside a downloaded copy of your repository:
   ```
   npm install
   DATABASE_URL="paste-your-neon-string" npm run db:push
   ```
   `db:push` reads `src/db/schema.ts` and creates every table. Then, optionally, add your members and starting categories/fines (edit `scripts/seed.ts` first):
   ```
   DATABASE_URL="paste-your-neon-string" npx tsx scripts/seed.ts
   ```
   Or create just the admin member from the live site:
   ```
   curl -X POST https://YOUR-DOMAIN/api/seed -H "Authorization: Bearer YOUR_SEED_SECRET"
   ```

**9. Connect your domain.** Vercel → project → **Settings → Domains → Add**, type your domain and follow the instructions (usually adding an `A` or `CNAME` record at the company you bought the domain from). It can take from minutes to a few hours. If you use a Clerk Production instance, also finish Clerk's domain/DNS steps.

**10. Invite members.** Make sure each member's email is in `ALLOWED_MEMBER_EMAILS` (redeploy after changing it). Then in the Clerk dashboard → **Users → Invitations → Invite**, enter their email. They'll get an email, create a password, and land on the site, where they're asked to complete their profile.

**11. Make it yours.** Things you'll likely want to edit (a coding agent can do this in minutes):
   - `src/app/(dashboard)/constitution/page.tsx`: the constitution summary (roles, dues, fines, rules, retreat budget). Shows "TBD" placeholders now.
   - `src/app/(dashboard)/treasurer/page.tsx` and `scripts/seed.ts`: the fine schedule amounts.
   - `src/app/(dashboard)/library/page.tsx` and `library/library-agendas.tsx`: document links and meeting dates.
   - `src/app/api/events/seed/route.ts`: optional starter events.
   - `src/app/icon.png`, `apple-icon.png`, `favicon.ico`: your logo.
   - Bump `NEXT_PUBLIC_CONSTITUTION_VERSION` when you adopt a new constitution so everyone re-signs.

## Keep it private and safe
- Keep your GitHub repository **private**. The site is set to tell search engines not to index it.
- **Never** put real keys or the database string into code or commit a `.env` file. They belong only in Vercel's Environment Variables (and a local `.env.local`, which is already ignored by git).
- What members share in forum is confidential. Only add people you trust as admins, and remember Vercel, Neon, Clerk and Google process this data.

## For developers
Next.js (App Router) + TypeScript + Tailwind, Clerk auth (`src/middleware.ts` enforces the email allowlist), Drizzle ORM on Neon Postgres (`src/db/schema.ts`, `drizzle/` has a few hand-written SQL migrations), Vercel Blob for uploads (`src/lib/storage.ts`), Google Places REST proxy at `/api/places/autocomplete`, ICS calendar files generated in code, `@react-pdf/renderer` for 5% PDFs, optional Resend email for bug reports. Site settings live in `src/site.config.ts`.

```
cp .env.example .env.local   # fill in
npm install
npm run db:push
npm run dev
```
