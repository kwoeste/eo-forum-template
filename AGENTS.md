# Prompt for your coding agent

Copy everything below the line into Cursor (Agent mode), Claude Code, Codex, or another coding agent, with this repository open.

---

You are helping me, a non-technical EO forum member, set up my own private copy of this EO forum website. Read `README.md`, `.env.example`, `src/site.config.ts`, `src/db/schema.ts` and `src/middleware.ts` first so you understand the app.

Ground rules:
- Do everything you can yourself. Only stop and ask me for things you truly can't do: creating accounts, paying, clicking email confirmations, copying keys from dashboards, adding DNS records at my domain registrar, or making decisions (forum name, who the members are).
- Ask for one thing at a time, tell me exactly where to click, and wait for my answer.
- **Never commit secrets.** Keys, the database connection string, `SEED_SECRET` and `.env.local` must never be written into tracked files, commit messages, or logs. Put local values only in `.env.local` (git-ignored) and production values in Vercel environment variables (use the Vercel CLI `vercel env add` if I've logged in, or tell me what to paste). Before every commit, run `git status` and `git diff --cached` and make sure no secret is staged.
- Keep the GitHub repository **private**.
- Explain what you are doing in plain language, briefly.

Steps:
1. Check that Node.js 20+ and git are installed; if not, tell me how to install them. Run `npm install` and `npm run build` with placeholder env to confirm the code builds.
2. **Forum name and config.** Ask me for: forum name, EO chapter, domain (or "none yet"), admin email, moderator/treasurer emails and names, retreat coordinator name, and the list of member emails. Put the non-secret ones in `.env.local` and remember them for Vercel. The member emails become the **allowlist** `ALLOWED_MEMBER_EMAILS` (comma-separated): only these people (plus the admin) can get in.
3. Help me make sure my code is in my own **private** GitHub repository (create one with `gh repo create --private` if the GitHub CLI is available and logged in, otherwise walk me through it).
4. Walk me through creating a **Neon** project and getting the connection string → `DATABASE_URL` in `.env.local`. Then run `npm run db:push` to create the tables. Ask me whether to edit and run `npx tsx scripts/seed.ts` to add members, parking lot categories and fines.
5. Walk me through **Clerk**: create an application, enable email sign-in, restrict sign-ups, copy the publishable and secret keys into `.env.local`. Run `npm run dev` and have me sign in at http://localhost:3000 with the admin email to confirm it works.
6. **Google Places key: OPTIONAL. Skip it unless I say I want address suggestions.** It's the most technical step (Google Cloud project, billing card, enabling an API). Without it the site works normally and people just type addresses by hand. Ask me once: "Do you want address suggestions while typing event locations? It needs a Google Cloud account with billing. Most forums can skip it." Only if I say yes, walk me through creating a Places API (New) key restricted to the Places API → `GOOGLE_PLACES_API_KEY`. Also optional: a Resend key for bug-report emails.
7. Personalize: update the constitution summary page, fine schedule, library links, meeting dates and icons with the details I give you. Do not invent rules; ask me or leave "TBD".
8. **Deploy to Vercel**: have me create an account and connect the GitHub repo (or use `vercel link` / `vercel deploy` if I install and log into the Vercel CLI). Add every environment variable from `.env.example` that we have values for (leave the Google ones out if we skipped step 6). Create a **Blob** store and connect it to the project. Redeploy.
9. **Domain**: walk me through adding the domain in Vercel and the DNS records at my registrar. If we use a Clerk Production instance, walk me through Clerk's domain DNS records and swap in the production keys (`pk_live_`/`sk_live_`) in Vercel.
10. Run the admin seed once if needed: `curl -X POST https://DOMAIN/api/seed -H "Authorization: Bearer $SEED_SECRET"`.
11. Test the live site with me: sign in, complete the profile, create an event with an address (typed by hand is fine if we skipped Google), download its calendar invite, upload a file, fill in a 5% reflection.
12. Walk me through inviting members in Clerk (Users → Invitations) and remind me that each email must also be in `ALLOWED_MEMBER_EMAILS` (redeploy after changes).
13. Finish with a short summary: the live URL, where each account lives, which keys are stored where (names only, never values), and how to add a member later.
