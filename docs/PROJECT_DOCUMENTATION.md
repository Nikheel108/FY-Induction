# FY Induction — Project Documentation

## 1. Purpose

FY Induction is a web application for running a first-year induction programme.
It gives students a self-service portal for registration, login, schedules,
attendance, receipts and queries, while administrators operate the programme
from a protected dashboard. The same code can be adapted for other college
events.

## 2. What is deployed, and what is only supported

The repository contains a **Vercel configuration for the frontend** and the
email templates point to `https://fy-induction.vercel.app`. This is evidence
that the public React site is intended to be (and has been) hosted on Vercel.
The repository does **not** contain `render.yaml`, a Render service ID, a
database URL, or cloud environment values. Therefore this document must not
claim that the API is currently hosted on Render or that a particular database
provider is currently in use.

The intended production topology is:

```text
Browser
  │ HTTPS
  ▼
Vercel (React/Vite static frontend)
  │ HTTPS requests to VITE_API_URL
  ▼
Render Web Service (Flask API served by Gunicorn)
  │ TLS PostgreSQL connection (DATABASE_URL)
  ▼
Managed PostgreSQL (Neon, Supabase, Render Postgres, or another provider)

Optional outbound integrations from the API
  ├─ Gmail SMTP or Google Apps Script: welcome mail and broadcasts
  └─ Gemini API: optional highlight-description generation
```

This separation is important: Vercel serves the browser bundle; it does not
run this long-lived Flask application. Render (or an equivalent Python host)
runs the API, and the database must be a managed PostgreSQL service reachable
from that API.

## 3. Tech stack

| Layer | Technology | Use in this project |
| --- | --- | --- |
| Frontend | React 18, React DOM, React Router | Single-page application, page routing and protected admin views. |
| Frontend build | Vite 5 | Development server and production static build. |
| UI | Tailwind CSS, PostCSS, Framer Motion, React Icons | Responsive styling, animation and icons. |
| Browser forms/data | React Hook Form, Axios, SheetJS (`xlsx`) | Forms, HTTP client and Excel-related client functionality. |
| Backend | Python 3, Flask 3, Flask-CORS | JSON REST API and CORS handling. |
| Data access | Flask-SQLAlchemy / SQLAlchemy, `psycopg2-binary` | ORM and PostgreSQL driver. |
| Authentication | Werkzeug password hashing, ItsDangerous signed tokens | Password storage and stateless admin/student login tokens. |
| Reports/files | ReportLab, OpenPyXL | PDF receipts/reports and Excel import/export. |
| Email | SMTP / Gmail and optional Google Apps Script URLs | Registration messages and admin broadcasts. |
| Optional AI | Gemini REST API through `requests` | Creates a highlight description when `GEMINI_API_KEY` is configured. |
| Database | PostgreSQL | Primary relational data store selected by `DATABASE_URL` or PostgreSQL settings. |

## 4. Roles and user journeys

### Student

1. An administrator first uploads the permitted PRNs (and optionally expected
   name/department) from the dashboard.
2. The student enters a PRN. The API checks that it is eligible and not already
   registered.
3. The student completes registration with personal, parent and optional photo
   data. The server assigns a registration ID and a preassigned password.
4. The student receives credentials and can sign in using PRN and password.
   The first-login flow requires a password change.
5. A logged-in student can view their profile and programme schedule. A
   registration receipt can be downloaded as a PDF.
6. At an active event session, a student can mark attendance. The attendance
   endpoint uses the PRN and server-side checks for the active session and
   duplicate marking.
7. Students can submit a contact query and view public event highlights.

### Administrator

1. The administrator signs in using credentials stored in environment
   variables and receives a signed token with a configurable expiry.
2. The dashboard shows registration statistics and department breakdown.
3. Admins can upload eligible PRNs, manage them, inspect/edit/delete students,
   reset a student password, download an individual receipt, and inspect mail
   logs.
4. Admins create, edit, delete or bulk-import event sessions from Excel. Each
   session carries timing, attendance-window and schedule metadata.
5. Admins review attendance, manually mark/delete records, view session
   statistics, and export attendance as CSV or Excel.
6. Admins broadcast email to students, parents or both.
7. Admins manage highlights (including images), optionally generate a draft
   description with Gemini, and export a highlights report as PDF.
8. Admins review, resolve and delete contact queries.

## 5. Frontend pages

| Area | Routes | Main capability |
| --- | --- | --- |
| Public | `/`, `/register`, `/success`, `/attendance`, `/contact` | Landing page, registration, confirmation, attendance and contact form. |
| Student | `/student-login`, `/student/dashboard`, `/student/register` | Student authentication, profile and schedule experience. |
| Admin | `/admin/login` | Administrator authentication. |
| Protected admin | `/admin/dashboard`, `/admin/upload-students`, `/admin/student/:id` | Analytics, PRN upload and student management. |
| Protected admin | `/admin/attendance`, `/admin/sessions` | Attendance operations and event-session scheduling. |
| Protected admin | `/admin/broadcast`, `/admin/highlights`, `/admin/contact-queries` | Communications, gallery/reports and support queries. |

The frontend reads `VITE_API_URL`, then `VITE_API_BASE_URL`, and otherwise
uses `/api`. Locally, Vite proxies `/api` to Flask on port 5000. In production,
set `VITE_API_URL` to the full Render API base, for example
`https://your-api.onrender.com/api`; a Vercel rewrite alone only returns the
SPA and does not proxy API traffic to Render.

## 6. Backend API groups

All application endpoints use the `/api` prefix.

| Group | Key endpoints | Access |
| --- | --- | --- |
| Health | `GET /health` | Public liveness check. |
| Student auth | `POST /login`, `POST /change-password`, `GET /me` | Login is public; password/profile require a student token. |
| Registration | `POST /check-prn`, `POST /register`, `GET /schedule` | Eligibility check, registration and schedule reading. |
| Student/admin data | `GET /students`, `GET/PUT/DELETE /student/:id`, `GET /statistics`, receipt and mail-log endpoints | Admin token for management endpoints. |
| Admin | `POST /admin/login`, `GET /admin/me`, `POST /admin/broadcast`, PRN upload/manage and contact-query operations | Admin token except login. |
| Event sessions | CRUD under `/admin/event-sessions`, plus Excel upload and clear | Admin token. |
| Attendance | Active-session lookup, student mark endpoint, admin review/manual mark/delete/statistics/CSV/Excel export | Public/student flow plus protected admin operations. |
| Highlights | Public `GET /highlights`; admin CRUD, PDF export and description generation | CRUD/export are protected; description generation should also be protected before production. |

## 7. Data model

The SQLAlchemy models are the authoritative application schema. The committed
`sql/schema.sql` file is a **legacy MySQL reference** and only declares an
older subset of tables; do not use it as the production PostgreSQL migration.

| Table/model | Important data | Why it exists |
| --- | --- | --- |
| `students` | PRN, registration ID, student/parent details, photo Base64, password hash, first-login flag | Primary registration and account record. |
| `preassigned_passwords` | Password, used flag, assigned PRN | Supplies registration passwords sequentially. |
| `valid_prns` | PRN, expected name, expected department | Restricts registration to approved students. |
| `event_sessions` | Session timing, attendance limit, location, speaker and schedule fields | Defines the programme timetable and attendance windows. |
| `attendance` | PRN, browser session, event session, date, status | Records presence for an event session. |
| `sessions` | Browser session ID, IP, location, user agent | Associates attendance with a browser visitor session. |
| `mail_logs` | Student, type, status, timestamp, error | Audits send attempts. |
| `highlights` | Title, description, image Base64, speaker, event session | Stores the public gallery and PDF-report content. |
| `contact_queries` | Sender details, question, status | Tracks support/contact requests. |

## 8. Authentication and security design

* Passwords are stored as hashes through Werkzeug; they are not meant to be
  stored in plaintext in `students`.
* Admin and student sessions are signed, stateless ItsDangerous tokens sent as
  `Authorization: Bearer ...`. Admin expiry is configurable and student expiry
  is 24 hours.
* The React client stores tokens in `localStorage` and Axios attaches the
  applicable token to requests.
* The app currently permits `Access-Control-Allow-Origin: *`. This is easy to
  operate during development but should be restricted to the production Vercel
  domain(s) before handling real student data.
* Set a long, unique `SECRET_KEY`, strong admin credentials and real mail
  credentials only as host environment variables. Never commit `.env` files,
  passwords, API keys or database URLs.
* The existing fallback values in configuration are not safe production
  defaults. Override every secret in the host dashboard.
* Base64 photos and highlight images live in the database. Enforce image type
  and size limits and consider object storage for larger deployments.

## 9. Recommended free-tier deployment

### Tier selection

Use the following three-service design for a small, low-traffic induction
event:

| Component | Recommended host/tier | What it runs | Persistent? |
| --- | --- | --- | --- |
| Frontend | Vercel Hobby/free static deployment | Vite build output | Source/build artefacts are managed by Vercel. |
| API | Render free web service, if available for the account/region | Gunicorn serving `app:app` from `backend/` | **No:** local disk and process memory must be treated as disposable. |
| Database | A managed PostgreSQL free plan (for example Neon or Supabase) | PostgreSQL data | Yes, subject to that provider's free-plan quota/pause policy. |

Free-plan quotas, inactivity rules, bandwidth, build minutes, database storage
and allowed compute change frequently. Confirm the selected providers' current
dashboards and official pricing pages immediately before launch. This project
does not pin a provider or include billing configuration.

### Why this works on free servers

* **Frontend requests:** Vercel's CDN serves JavaScript, CSS, images and the
  SPA entry page. This is efficient and does not keep a Python server alive.
* **API requests:** Browser calls go directly to the Render API URL configured
  at build time. Flask validates the request, uses SQLAlchemy to query
  PostgreSQL, then returns JSON or a generated file.
* **Database durability:** Registrations, schedules, attendance, mail logs and
  Base64 image content survive API restarts because they are stored in managed
  PostgreSQL rather than API memory.
* **Stateless API:** Authentication tokens are signed, not stored in server
  memory, so an API restart does not automatically log users out (provided the
  same `SECRET_KEY` remains configured).
* **Reports:** Receipt, Excel/CSV and highlight PDFs are generated in memory
  per request and streamed to the browser; they do not require permanent files
  on the API host.

### Free-tier behaviour users will notice

1. **Cold start:** A free API may sleep after inactivity. The first request
   after a sleep can be slow while the Python process starts and connects to
   PostgreSQL. Show a “Waking the server…”/retry message on the frontend and
   open the health endpoint shortly before a registration or attendance event.
2. **Limited capacity:** One small free web instance has limited CPU/RAM.
   Large concurrent registrations, bulk email, Excel import, photo uploads and
   PDF generation compete for the same process. Keep images small, import in
   batches and avoid starting a broadcast during peak attendance marking.
3. **Timeouts:** The client waits 30 seconds. Slow cold starts, a paused
   database, slow Gmail/GAS calls or a large report can exceed that limit.
   Return clear errors and retry idempotent operations carefully.
4. **No local persistence:** Do not rely on `backend/uploads`, temporary
   files, generated reports or logs surviving a Render restart/redeploy. This
   code already creates major reports in memory; any durable attachment/media
   should instead live in the database or object storage.
5. **Database quotas:** Base64 encoded photos/images inflate database use by
   roughly one-third over raw binary. Free PostgreSQL storage can fill quickly.
   Compress and resize uploads, remove unneeded gallery images and take exports
   before the event.
6. **Email quotas:** Gmail and Google Apps Script limits are separate from
   Vercel/Render quotas. Broadcasting can be rate-limited or rejected by the
   mail provider; mail logs identify attempted sends and failures.
7. **No high availability:** A free setup normally has no replicas, autoscaling
   or guaranteed uptime. It is suitable for demos/small events, not a
   high-stakes institutional production service without load testing, backups
   and a paid reliability plan.

## 10. Production environment variables

Configure these in the API host; do not put them in frontend variables or
commit them to Git.

| Variable | Required | Purpose |
| --- | --- | --- |
| `SECRET_KEY` | Yes | Signs admin and student tokens. |
| `DATABASE_URL` | Yes in cloud | PostgreSQL SQLAlchemy URL. `postgres://` is normalised to `postgresql://`. |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Yes | Initial administrator login credentials. |
| `ADMIN_TOKEN_TTL_HOURS` | Recommended | Admin session duration; defaults to 12 hours. |
| `FRONTEND_URL`, `ALLOWED_ORIGINS` | Recommended | Intended frontend origin configuration. Also tighten the CORS implementation. |
| `GAS_WEB_APP_URL` | Optional | Comma-separated Google Apps Script endpoints for email failover. |
| `EMAIL_ADDRESS`, `EMAIL_PASSWORD`, `SMTP_SERVER`, `SMTP_PORT` | Optional | SMTP email configuration. |
| `GEMINI_API_KEY` | Optional | Enables AI-highlight description generation. |
| `PORT` | Host supplied | Port used by the web process. |

Configure this in Vercel at build time:

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | `https://<your-render-service>.onrender.com/api` |

## 11. Deployment procedure

### A. Database

1. Create a PostgreSQL database with a provider that your institution has
   approved.
2. Copy its TLS connection string into Render as `DATABASE_URL`.
3. Do **not** run the legacy MySQL `sql/schema.sql` against PostgreSQL.
4. On first API startup, SQLAlchemy creates model tables. Back up the database
   before schema changes. Replace the current startup `ALTER TABLE` approach
   with versioned migrations before long-term production use.

### B. Render API

1. Create a Web Service from this repository.
2. Set the service root directory to `backend`.
3. Build command: `pip install -r requirements.txt`.
4. Start command: `gunicorn --bind 0.0.0.0:$PORT app:app`.
5. Add all API environment variables from the previous section.
6. Deploy and verify `GET https://<service>/api/health` returns success.
7. Set the final Vercel URL in the CORS configuration and remove the wildcard
   CORS policy in code before launch.

### C. Vercel frontend

1. Import the same repository into Vercel.
2. Set root directory to `frontend`.
3. Use build command `npm run build` and output directory `dist`.
4. Add `VITE_API_URL` pointing to the Render `/api` base URL, then redeploy so
   Vite bakes it into the bundle.
5. The existing rewrite makes direct navigation to SPA routes work; it does not
   forward `/api` to Flask.
6. Test registration, login, an admin-only page, receipt export and the health
   endpoint from the deployed browser URL.

## 12. Local development

```bash
# terminal 1
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Create backend/.env with safe local values, then:
python app.py

# terminal 2
cd frontend
npm install
printf 'VITE_API_BASE_URL=http://localhost:5000/api\n' > .env.local
npm run dev
```

The Vite development server runs on port 5173 and proxies `/api` to Flask on
port 5000. Use PostgreSQL locally or a development cloud database URL.

## 13. Operations checklist for an event day

### Before opening registration

- Verify a backup/export of the managed PostgreSQL database.
- Open `/api/health` and complete one test registration using a test PRN.
- Confirm the Vercel `VITE_API_URL` is the production Render endpoint.
- Upload valid PRNs and preassigned passwords; verify counts in the admin UI.
- Test SMTP/GAS with a controlled mailbox, not the full student list.
- Create/import sessions and verify their start time and attendance window.
- Test one receipt, one attendance mark and one attendance export.

### During the event

- Keep the Render dashboard/logs open and watch database usage/connections.
- Avoid bulk mail and large PDF/Excel jobs during the busiest attendance slot.
- Ask attendance staff to open the site shortly before the session, reducing
  the chance that the first student experiences a cold start.
- Use the admin attendance page to watch marks and correct only verified data.

### After the event

- Export attendance and student data to secure institutional storage.
- Export highlights if needed and archive mail logs/contact queries.
- Revoke/rotate credentials and API keys that were shared with event staff.
- Remove test data and evaluate database storage consumed by Base64 media.

## 14. Known limitations and recommended improvements

1. **Use real migrations.** Database changes are attempted at application
   startup and exceptions are suppressed for existing columns. Introduce
   Alembic/Flask-Migrate with reviewed PostgreSQL migrations.
2. **Fix CORS before production.** Configuration has an allowed-origin list,
   but the app currently overwrites it with wildcard CORS headers.
3. **Protect AI generation.** The highlight-description endpoint should use
   `admin_required`, otherwise a public caller could consume Gemini quota.
4. **Move media to object storage.** Save URLs in PostgreSQL rather than large
   Base64 strings for better free-tier database capacity and faster responses.
5. **Use a transactional password allocator.** Concurrent registrations need a
   locked/atomic selection of the next unused preassigned password.
6. **Improve attendance assurance.** Browser/IP/session data is not a complete
   proof of physical presence. If strict attendance is required, combine it
   with staff verification, rotating QR codes, venue geofencing and a privacy
   notice.
7. **Remove unsafe defaults.** Require secrets at startup rather than retaining
   development fallback credentials or mail settings.
8. **Add automated tests and CI.** The repository has no documented automated
   test suite. Add API tests, frontend component tests, linting and deployment
   smoke tests.

## 15. Repository map

```text
frontend/                 React/Vite single-page client
  src/pages/              Public, student and admin views
  src/services/           Axios API wrappers
  src/context/            Authentication and toast state
  vercel.json             SPA rewrite for Vercel
backend/                  Flask application
  app.py                  App factory, blueprints, health and startup schema work
  config.py               Environment-driven configuration
  models.py               SQLAlchemy models
  routes/                 Student, admin, attendance and highlights API routes
  services/               Database, tokens, passwords, receipts and email
sql/schema.sql            Legacy MySQL reference, not current PostgreSQL schema
```
