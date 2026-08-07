<div align="center">
  <img src="https://mitaoe.ac.in/assets/images/logo.png" alt="MITAOE Logo" width="300" />
  <h1>Student Induction Management System</h1>
  <p>A full-stack, mobile-responsive web application designed to automate the <strong>First Year Induction Program registration</strong> at MIT Academy of Engineering.</p>
</div>

---

## 🌟 Overview

This platform streamlines the onboarding process for new students. Students complete a validated registration form (including a live photo capture), their details are securely stored in a **PostgreSQL** database, and personalised **welcome emails (with PDF attachments & student photo embedded)** are sent automatically to both the student and their parent using **Google Apps Script**.

An **Admin Dashboard** empowers the college staff with powerful tools to manage the induction process effectively.

## ✨ Key Features

- 📸 **Live Photo Capture:** Students can take a photo via their webcam or upload a file during registration.
- 📱 **Fully Mobile Responsive:** Flawless experience across all devices, from desktop to mobile.
- 📧 **Automated Emails:** Instant welcome emails to students and parents with attached schedules and maps.
- 📢 **Admin Broadcast System:** Admins can instantly broadcast event details (Venue, Time, Program) to *all* enrolled students with a single click.
- ✅ **Attendance Tracking:** Public and Admin-facing attendance systems to track student presence during the induction program.
- 📊 **Admin Dashboard:** View statistics, search/filter students, edit/delete records, resend emails, and export data to **CSV/Excel**.
- 📄 **Auto-Generated Receipts:** Dynamic PDF receipts generated on-the-fly containing the student's photo and registration details.

---

## 🛠️ Technology Stack

```text
Frontend : React (Vite) + Tailwind CSS        
Backend  : Flask REST API (SQLAlchemy)       
Database : PostgreSQL (Supabase)                       
Email    : Google Apps Script (GAS) Web App
Deployment: Vercel (Frontend) & Render (Backend)
```

---

## 📂 Project Structure

```text
student_induction_program/
├── backend/
│   ├── app.py                 # Flask app factory + entry point
│   ├── models.py              # SQLAlchemy models (Student, MailLog, Attendance)
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Local secrets (git-ignored)
│   ├── routes/
│   │   ├── student_routes.py  # Student CRUD, stats, receipt, attendance
│   │   └── admin_routes.py    # Admin login, token validation, broadcasts
│   ├── services/
│   │   ├── database.py        # SQLAlchemy instance
│   │   ├── email_service.py   # GAS Email sending + PDF attachments
│   │   └── utils.py           # Validation, admin tokens, dynamic receipt PDF builder
│   └── uploads/               # schedule.pdf, campus_map.pdf, etc.
├── frontend/
│   ├── package.json
│   ├── vite.config.js         # dev server + /api proxy
│   └── src/
│       ├── App.jsx            # Routing
│       ├── components/        # Navbar, Sidebar, Modals, Forms
│       ├── pages/             # Home, Register, AdminDashboard, AdminBroadcast, Attendance...
│       └── services/          # API integrations
├── google_apps_script.js      # GAS script for sending emails via user's Gmail
└── README.md
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 18+**
- **PostgreSQL** (Local or Supabase)
- **Google Account** (for Google Apps Script deployment)

### 2. Backend Setup

1. **Database:** Create a PostgreSQL database.
2. **Environment Variables:**
   ```bash
   cd backend
   cp .env.example .env
   ```
   *Edit `.env` to match your local setup:*
   ```ini
   DATABASE_URL=postgresql://user:password@localhost:5432/induction_db
   GAS_WEB_APP_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin@123
   ```
3. **Install & Run:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python app.py
   ```
   *API will run at `http://localhost:10000`*

### 3. Google Apps Script Setup
Since Google deprecated SMTP App Passwords for new accounts, this project uses a custom GAS Web App to bypass email restrictions and payload size limits.
1. Go to [script.google.com](https://script.google.com/).
2. Create a new project and paste the contents of `google_apps_script.js`.
3. Click **Deploy > New Deployment**.
4. Set type to **Web App**, execute as **Me**, and access to **Anyone**.
5. Copy the Web App URL and paste it into your backend `.env` file as `GAS_WEB_APP_URL`.

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
*App will run at `http://localhost:5173`. In development, Vite proxies `/api` requests to the Flask backend.*

---

## 🌐 API Reference

| Method | Endpoint                     | Auth   | Description                                  |
|--------|------------------------------|--------|----------------------------------------------|
| POST   | `/api/register`              | —      | Register student + send welcome emails       |
| GET    | `/api/statistics`            | —      | Total / department-wise stats                |
| POST   | `/api/attendance`            | —      | Mark student attendance                      |
| GET    | `/api/admin/attendance`      | Admin  | View attendance records                      |
| POST   | `/api/admin/broadcast`       | Admin  | Send venue/schedule emails to all students   |
| GET    | `/api/students`              | Admin  | List with search, filters, pagination        |
| GET    | `/api/student/<id>`          | Admin  | Get single student                           |
| GET    | `/api/student/<id>/receipt`  | —      | Download registration PDF receipt            |
| POST   | `/api/admin/login`           | —      | Admin login → signed token                   |

---

## ☁️ Deployment

- **Frontend (Vercel):** Connect your GitHub repository to Vercel. Set `VITE_API_URL` to your production backend URL.
- **Backend (Render):** Connect your repository to Render. Use `gunicorn app:app` as the start command. Ensure you add `DATABASE_URL` and `GAS_WEB_APP_URL` in the Render environment variables.
- **Database (Supabase):** Managed PostgreSQL database. Copy the connection string to Render.

---

> Built with passion for the incoming batch of FY students at MIT Academy of Engineering! 🎓
