# CareerBridge AI — User Journeys

Each persona's end-to-end flow through the platform as currently implemented. Entry points and return points are noted so you can trace what the system does at every click.

---

## 1. Student (fresher or early-career)

**Goal:** Convert an uploaded CV into a polished profile and apply only to jobs where they're actually a fit.

### Happy path

1. **Sign up**
   - Lands on `/` → clicks *I'm a student* → `/auth?mode=register&role=student`.
   - Enters email + password (min 8 chars) → `POST /auth/register`.
   - Immediately signed in; redirected to `/student`.

2. **Upload CV (default landing tab)**
   - `/student` opens on the **Resume** tab for new accounts.
   - Chooses a `.pdf` / `.doc` / `.docx` file → `POST /students/me/resume`.
   - Status badge advances `pending → processing → completed` via polling on `GET /students/me/resume/{id}/status`.
   - Backend extracts the text (pypdf for PDF, python-docx for DOCX) and calls the AI parser — LLM (`gpt-4.1-mini` JSON mode) if `OPENAI_API_KEY` is set, regex fallback otherwise.
   - Tab auto-switches to **Profile** and shows a toast *"Profile auto-filled from your resume"*.

3. **Review the auto-filled profile**
   - Profile tab now has: university, degree, graduation year, experience years, professional summary, skills chips, projects list, current location, LinkedIn / GitHub / portfolio URLs.
   - *Resume tab* also shows an inline **Extracted from your resume** preview panel with the same data — no hover needed.
   - Student edits anything the parser got wrong, adds missing skills/projects, toggles **Profile visible to companies** → *Save profile*.

4. **Read the career report**
   - Career report tab → `GET /students/me/report` → four cards:
     - Professional summary
     - Suggested career paths
     - Skill gaps
     - Resume suggestions
   - If they haven't uploaded yet → friendly empty state pointing to the Resume tab.

5. **Browse jobs**
   - Jobs tab → `GET /students/me/jobs` returns every active, non-disabled-company job with the student's match score, the job's `apply_threshold`, and a `missing_skills` array.
   - Organized into three sections:
     - **Ready to apply** — score ≥ threshold.
     - **Close matches — small skill gap** — score < threshold but ≥ 30%.
     - **Other roles** — score < 30%.
   - Each row shows match %, threshold %, and missing-skill badges.
   - Action cell per row:
     - Eligible → teal **Apply** button
     - Score too low → red **"Closed for you"** + *"Need 60% · you have 45% (15% short)"*
     - Profile visibility off → yellow **"Visibility off"** + *"Enable on the Profile tab"*
     - Already applied → green **Applied** badge

6. **Apply**
   - Clicks Apply → `POST /students/me/applications`.
   - Server re-computes the current match score, compares to `job.apply_threshold`, inserts an Application with `match_score_at_apply`.
   - If the student's score has dipped below the threshold since the last load, the server rejects with a 403 containing both numbers so the UI can explain.

7. **Track applications**
   - Applications tab → list of applied roles with company name, date, match score at apply, status.

8. **Respond to interview requests**
   - Interviews tab → `GET /students/me/interviews` lists incoming requests.
   - Pending rows show green **Accept** and red **Reject**.
   - Accept → `POST /students/me/interviews/{id}/accept` → status flips to *accepted*.

9. **Outcome**
   - After the interview date, company marks **Hired Yes/No**. Student sees the final badge in the Interviews tab (green "Hired" or red "Not hired").

### Detours

- **Session expires** — 24-hour access tokens + silent refresh-on-401 using the 30-day refresh token, so ordinary usage never forces a re-login. Refreshing the browser keeps them signed in.
- **Admin disabled the account** — any profile edit / resume upload / apply / interview response returns 403. Only the read endpoints still work.
- **LLM parsing fails / no API key** — the regex fallback fills the same fields (skills, university, degree, projects, location, URLs) from common Pakistani CV patterns, so the profile is still useful for matching.

---

## 2. Company (employer)

**Goal:** Post a role, see a ranked list of actual applicants, run interviews, and record hiring decisions.

### Happy path

1. **Sign up**
   - Lands on `/` → *I'm hiring* → `/auth?mode=register&role=company`.
   - Enters email + password + **Company name** → `POST /auth/register` creates both the User row and a Company row with `status=pending` in a single transaction.
   - Gets tokens, lands on `/company`.

2. **Wait for admin verification**
   - Any attempt to post a job before approval gets a 403 *"Company is not verified"*.
   - Once admin approves, `status` becomes `approved` and job creation unlocks.

3. **Post a job** (Jobs tab → *New job*)
   - Fills: title, experience level, location, education requirement, required skills (chip input), description, **Minimum match score to apply** slider (0–100, default 60), **No. of open positions** (optional).
   - On submit → `POST /companies/jobs` creates the Job + JobSkills and triggers `recompute_for_job` so every visible student gets a fresh match score.

4. **Manage the job list**
   - Four filter pills show live counts: **All / Active / Paused / Inactive**.
   - Each row shows title, location, threshold, applicant count, hires progress (`2 / 5` if a limit is set, *"2 hired"* otherwise), and a status badge (Active / Paused / Inactive / Filled).
   - Per-row actions depend on state:
     - Active → Edit · Pause · Close · Delete
     - Paused → Edit · Resume · Close · Delete
     - Inactive → Edit · Reopen · Delete
   - **Delete** opens a confirmation dialog listing exactly what gets removed (applications, interviews, matches, shortlists). Still prefer Close/Pause to preserve history.

5. **Review applicants** (Applicants tab)
   - Picks a job from the dropdown → `GET /companies/jobs/{id}/applicants` returns rows for students who actually applied.
   - Filters: min score, skill contains, education contains, min experience.
   - Each row shows the current match score plus the score at time-of-apply.
   - Actions: **Shortlist** · **Reject** · **Interview** (opens a date-time dialog).

6. **Send interview request**
   - Interview dialog → date-time picker → `POST /companies/interviews` with `candidate_id + job_id + interview_date`.
   - Server requires the date to be in the future and the company to be approved.
   - Interview is created with `status=pending`. Student sees it immediately in their Interviews tab.

7. **Track interviews** (Interviews tab)
   - Columns: candidate ID, role, interview date, status, hire decision.
   - While interview is pending / accepted but the date hasn't arrived → *"Available on interview day"* message.
   - On or after the interview date, accepted interviews show two buttons: green **Hired** and red **Not hired**.

8. **Mark the hire**
   - Clicks **Hired** → `POST /companies/interviews/{id}/hire` with `hired=true`.
   - Server sets `hire_status=yes`, flips interview to `completed`.
   - If the job has a `hiring_limit` and `hires_count >= hiring_limit`, the job auto-closes (`status=inactive`, `is_active=false`) — back on the Jobs tab the row shows **Filled** instead of Active.

9. **Keep, tune, or retire the job**
   - Keep hiring? Do nothing.
   - Want a pause (temporary hold)? Use **Pause** — blocks new applications but keeps the record.
   - Done hiring? **Close** or just delete via the confirmation dialog.
   - Changed your mind mid-flight? Edit → adjust the threshold or limit and Save.

### Detours

- **Company disabled by admin** — every company endpoint returns 403; existing jobs stay in the DB but are auto-closed.
- **Candidate's profile becomes hidden after they apply** — they stay on the applicants list (the application already exists) but the Candidates tab (ranked matches) will hide them until visibility is back on.
- **Apply threshold raised after a student applied** — the existing Application is kept; future applicants hit the new bar.

---

## 3. Administrator

**Goal:** Keep the platform clean — approve real companies, disable problem accounts, and watch the overall volume.

### Happy path

1. **Sign up as admin**
   - `/auth?mode=register&role=admin` → `POST /auth/register` (no separate onboarding; this is an MVP seed flow).
   - Lands on `/admin`.

2. **Overview** (default tab)
   - Four KPI cards from `GET /admin/analytics`:
     - Students
     - Verified companies
     - Active jobs
     - Active interviews
   - Below: **Pending company approvals** table with per-row **Approve** / **Reject**. Approve → `POST /admin/companies/{id}/approve` flips status to `approved` and logs an `admin_company_review` audit event.

3. **Manage students** (Students tab)
   - `GET /admin/students?q=...` — searchable by email, university, or degree.
   - Columns: ID, email, university, degree, visibility, status.
   - One-click **Disable** / **Enable** → `PATCH /admin/students/{id}` toggles `is_disabled`. Disabling also clears the student's Match rows so they stop appearing in company ranked lists.

4. **Manage companies** (Companies tab)
   - `GET /admin/companies?q=...` — search by name or email.
   - Columns include verification status and disabled flag.
   - Per-row actions:
     - **Approve** / **Reject** (if not already that status).
     - **Enable** / **Disable** — disabling cascades: every job owned by the company is auto-set to `lifecycle_status=inactive, is_active=False`.

5. **Manage jobs** (Jobs tab)
   - `GET /admin/jobs?q=...` — search by title, company, or location.
   - **Close** / **Reopen** on any job across the platform. Useful for removing stale or abusive listings that a company forgot to close.

6. **Manage interviews** (Interviews tab)
   - `GET /admin/interviews` — all pending + accepted + completed interviews across the platform.
   - **Cancel** a pending/accepted interview → `PATCH /admin/interviews/{id}` with `status=cancelled`.

### Detours

- **Admin accidentally disabled a real student** — the same tab toggle re-enables them, but the Match rows need to be recomputed (happens automatically the next time any job on the platform is created or a student updates their profile).
- **Orphan companies stuck in pending** — visible on the Overview tab with Approve/Reject actions; no other way for them to progress.

---

## Cross-cutting behavior (all personas)

- **Session persistence**: JWT access tokens are good for 24 hours; a 30-day refresh token is stored alongside. Every API call will silently upgrade an expired access token before retrying, so users never see a spurious logout. A single in-flight refresh promise prevents request storms. Page refresh just rehydrates tokens from `localStorage`.
- **Role routing**: Every dashboard is wrapped in `RequireRole`. If the stored JWT's role doesn't match the URL's role, the user is pushed to the correct dashboard (or `/auth` if not signed in).
- **Visibility + disabled gates**: The matching service only scores students where `visibility_flag=true` and `is_disabled=false`, and only against jobs where `lifecycle_status=active` and the company isn't disabled. Changes to any of those flip the ranked lists without a manual recompute on the student side.
