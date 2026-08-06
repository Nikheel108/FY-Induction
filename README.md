# Student Induction Management System

A full-stack web application that automates the **First Year Induction Program
registration** for a college. Students fill a validated registration form, their
details are stored in **MySQL**, and personalised **welcome emails (with PDF
attachments)** are sent automatically to both the student and the parent.
An **admin dashboard** provides statistics, search/filter, edit/delete,
email re-sending and CSV/Excel export.

```
Frontend : React (Vite) + Tailwind CSS        http://localhost:5173
Backend  : Flask REST API (SQLAlchemy)        http://localhost:5000
Database : MySQL (local)                       localhost:3306 / induction_db
Email    : Gmail SMTP (App Password)
```

---

## 1. Project structure

```
student_induction/
├── backend/
│   ├── app.py                 # Flask app factory + entry point
│   ├── config.py              # Env-driven configuration
│   ├── models.py              # SQLAlchemy models (students, mail_logs)
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Your local secrets (git-ignored)
│   ├── .env.example           # Template for the .env file
│   ├── create_sample_docs.py  # Generates placeholder PDF attachments
│   ├── routes/
│   │   ├── student_routes.py  # /api/register, CRUD, statistics, receipt, mail logs
│   │   └── admin_routes.py    # admin login / token validation
│   ├── services/
│   │   ├── database.py        # SQLAlchemy instance
│   │   ├── email_service.py   # Flask-Mail sending + PDF attachments + logging
│   │   └── utils.py           # validation, admin tokens, receipt PDF builder
│   └── uploads/               # schedule.pdf, campus_map.pdf, student_handbook.pdf, academic_calendar.pdf
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js         # dev server + /api proxy to :5000
│   ├── tailwind.config.js
│   ├── .env.example
│   └── src/
│       ├── main.jsx           # entry point (router + providers)
│       ├── App.jsx            # routes
│       ├── constants.js       # dropdown option lists
│       ├── context/           # AuthContext, ToastContext
│       ├── components/        # Navbar, StudentForm, Sidebar, Modal, charts, ...
│       ├── pages/             # Home, Register, Success, AdminLogin, AdminDashboard,
│       │                      # StudentDetails, NotFound
│       ├── services/          # axios instance + API functions
│       └── utils/             # CSV / Excel exporters
├── sql/
│   ├── schema.sql             # CREATE DATABASE/TABLE statements
│   └── sample_data.sql        # demo records
└── README.md
```

---

## 2. Prerequisites

| Tool       | Version (recommended) | Notes                        |
|------------|-----------------------|------------------------------|
| Python     | 3.10+                 | Backend                      |
| Node.js    | 18+                   | Frontend                     |
| MySQL      | 5.7 / 8.x             | MySQL Workbench or XAMPP     |
| Gmail      | —                     | With 2-Step Verification + App Password |

---

## 3. Backend setup

### 3.1 Create the database

Open MySQL and run:

```sql
CREATE DATABASE IF NOT EXISTS induction_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

> The tables are created automatically by the Flask app on first start
> (`db.create_all()`). You can also run `sql/schema.sql` manually if you prefer.

### 3.2 Configure environment variables

```bash
cd backend
cp .env.example .env     # then edit .env
```

| Variable          | Description                                        |
|-------------------|----------------------------------------------------|
| `SECRET_KEY`      | Random string used to sign admin tokens            |
| `DB_HOST/PORT/NAME` | MySQL connection (defaults: localhost/3306/induction_db) |
| `DB_USER`         | Usually `root`                                     |
| `DB_PASSWORD`     | Your local MySQL password (empty if none)          |
| `EMAIL_ADDRESS`   | Your Gmail address                                 |
| `EMAIL_PASSWORD`  | Gmail **App Password** (16 chars, no spaces)       |
| `FRONTEND_URL`    | `http://localhost:5173` for local dev              |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Admin dashboard login         |

**Generate a Gmail App Password:**
1. Enable [2-Step Verification](https://myaccount.google.com/security) on your
   Google account.
2. Visit https://myaccount.google.com/apppasswords
3. Create an app password and paste it into `EMAIL_PASSWORD`. It looks like
   `abcd efgh ijkl mnop`.

### 3.3 Install dependencies and run

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

pip install -r requirements.txt
python app.py
```

The API now runs at **http://localhost:5000**. Health check:
`GET http://localhost:5000/api/health`

> **Missing PDF attachments?** Run `python create_sample_docs.py` to generate
> placeholder PDFs inside `backend/uploads/`. Replace them with the real
> schedule, campus map, handbook and academic calendar PDFs at any time — the
> app attaches whatever exists and skips missing files without crashing.

---

## 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The app runs at **http://localhost:5173**. In development, Vite proxies `/api`
requests to the Flask backend on port 5000, so no CORS configuration is needed
locally.

---

## 5. Using the application

1. Open **http://localhost:5173**.
2. Click **Register Now**, fill the form and submit.
3. On success you see your **Registration ID** and can download the
   **PDF receipt**. Welcome emails (with attachments) go to the student and the
   parent automatically.
4. Sign in at **Admin Dashboard** (default `admin` / `admin@123` — change it in
   `backend/.env`).
5. In the dashboard you can: view statistics, search/filter students, view
   details, edit, delete, **resend emails**, download **CSV / Excel** exports
   and check the **mail logs** per student.

---

## 6. API reference

| Method | Endpoint                     | Auth   | Description                                  |
|--------|------------------------------|--------|----------------------------------------------|
| POST   | `/api/register`              | —      | Register a student + send welcome emails     |
| POST   | `/api/send-email`            | —      | Re-send emails for a student                 |
| GET    | `/api/statistics`            | —      | Total / department-wise / hostel stats       |
| GET    | `/api/students`              | Admin  | List with search, filters, pagination        |
| GET    | `/api/student/<id>`          | Admin  | Single student                               |
| PUT    | `/api/student/<id>`          | Admin  | Update student                               |
| DELETE | `/api/student/<id>`          | Admin  | Delete student (+ mail logs)                 |
| GET    | `/api/student/<id>/receipt`  | —      | Download registration receipt PDF            |
| GET    | `/api/student/<id>/mail-logs`| Admin  | Email history for a student                  |
| POST   | `/api/admin/login`           | —      | Admin login → signed token                   |
| GET    | `/api/admin/me`              | Admin  | Validate a stored token                      |
| GET    | `/api/health`                | —      | Liveness check                               |

All responses use the shape:

```json
{ "success": true, "message": "Student registered successfully." }
```

Errors return `{ "success": false, "message": "PRN already exists." }` with the
appropriate HTTP status code.

---

## 7. Error handling summary

| Scenario                | Behaviour                                                        |
|-------------------------|------------------------------------------------------------------|
| Duplicate PRN / email   | 400 error with a clear message                                   |
| Invalid email / phone   | 400 error with field-specific message                            |
| Missing/empty required  | 400 error; never saved                                           |
| DB connection failure   | 500 JSON error; record rolled back; app keeps running            |
| SMTP failure            | Registration still succeeds; failure logged in `mail_logs`; admin can resend |
| Missing attachments     | Skipped gracefully, logged to console                            |
| Network failure         | Frontend shows a friendly toast                                  |

---

## 8. Deployment readiness

Nothing is hardcoded. Every environment-specific value lives in environment
variables, so moving to the cloud only requires new env values:

| Piece     | Target   | Change                                                                 |
|-----------|----------|------------------------------------------------------------------------|
| Frontend  | Vercel   | Set `VITE_API_URL=https://<backend>.onrender.com/api` at build time; `npm run build` |
| Backend   | Render   | `pip install -r requirements.txt`; start command `gunicorn app:app`; set env vars |
| Database  | Railway  | Point `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD` at the managed MySQL |
| Email     | Gmail    | Keep the same `EMAIL_ADDRESS` / `EMAIL_PASSWORD`                       |

---

## 9. Common issues

- **`ModuleNotFoundError: cryptography`** — the `cryptography` package is
  required by PyMySQL for MySQL 8 auth; it is already in `requirements.txt`.
- **CORS errors in dev** — don't worry, the Vite proxy forwards `/api` to the
  backend, so requests are same-origin.
- **Emails not sending** — double-check the App Password, confirm
  `EMAIL_ADDRESS` matches the Gmail account that generated the password, and
  enable "Less secure app access" alternatives (App Passwords are recommended).
- **Port 5000 busy** — set `PORT=5001` in the backend `.env` and update the
  proxy target in `frontend/vite.config.js`.
