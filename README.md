<div align="center">
  <img src="frontend/logo.png" alt="MITAOE Logo" width="280" />
  <h1>🎓 FY Induction Management System</h1>
  <p>
    A modern, full-stack solution for managing the <strong>First Year Induction Program</strong> with a smooth, interactive experience for students and administrators.
  </p>
  <p>
    <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
    <img alt="Flask" src="https://img.shields.io/badge/Flask-3.1-000000?logo=flask&logoColor=white" />
    <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white" />
    <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-14-4169E1?logo=postgresql&logoColor=white" />
  </p>
</div>

---

## ✨ Overview

This platform simplifies the full induction journey from registration to communication and attendance tracking. Students can register quickly, upload or capture their photo, receive personalized emails, and access their induction details effortlessly. Meanwhile, admins can manage registrations, broadcast updates, monitor attendance, and export reports with a polished dashboard experience.

> The experience is designed to feel fast, responsive, and engaging with animated UI transitions, modal-based workflows, live feedback, and elegant dashboard interactions.

---

## 🚀 Dynamic Features

- 📸 <strong>Live photo capture</strong> and upload support during registration
- 📱 <strong>Responsive design</strong> for desktop, tablet, and mobile users
- ✉️ <strong>Automated welcome emails</strong> with PDF attachments and student details
- 📢 <strong>Admin broadcast system</strong> for instant event updates to all students
- ✅ <strong>Attendance tracking</strong> for both public and admin views
- 📊 <strong>Interactive admin dashboard</strong> with stats, filters, search, and export tools
- 🧾 <strong>Auto-generated receipts</strong> with registration details and photo embed
- ⚡ <strong>Smooth transitions</strong> and modern UI feedback including loading states, toasts, dialogs, and hover effects

---

## 🛠️ Tech Stack

- <strong>Frontend:</strong> React + Vite + Tailwind CSS
- <strong>Backend:</strong> Flask + SQLAlchemy + REST APIs
- <strong>Database:</strong> PostgreSQL
- <strong>Emails:</strong> Google Apps Script Web App integration
- <strong>Deployment:</strong> Vercel for frontend and Render for backend

---

## 📁 Project Structure

```text
FY-Induction/
├── backend/
│   ├── app.py
│   ├── models.py
│   ├── requirements.txt
│   ├── routes/
│   │   ├── admin_routes.py
│   │   ├── attendance_routes.py
│   │   └── student_routes.py
│   ├── services/
│   │   ├── database.py
│   │   ├── email_service.py
│   │   └── utils.py
│   └── uploads/
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── services/
├── sql/
│   ├── schema.sql
│   └── sample_data.sql
└── README.md
```

---

## ▶️ Getting Started

### 1. Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL
- A Google account for Apps Script deployment

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Set your environment variables such as:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/induction_db
GAS_WEB_APP_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin@123
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at:

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

---

## 🌐 API Highlights

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/register | Register a student and trigger welcome email flow |
| GET | /api/statistics | Fetch induction dashboard statistics |
| POST | /api/attendance | Mark attendance |
| GET | /api/admin/attendance | View attendance records |
| POST | /api/admin/broadcast | Send event updates to all registered students |
| GET | /api/students | List students with filters and search |
| GET | /api/student/<id> | Get a single student record |
| GET | /api/student/<id>/receipt | Download the student receipt PDF |
| POST | /api/admin/login | Authenticate admin access |

---

## 🎨 UI Experience

The frontend is crafted to feel polished and modern with:

- Smooth transitions between pages and panels
- Animated cards and action states
- Toast notifications for success and error feedback
- Modal-based forms and confirmation dialogs
- Responsive layouts that adapt naturally to different screen sizes

---

## ☁️ Deployment

- Frontend: deploy on Vercel
- Backend: deploy on Render or any Python hosting service
- Database: use PostgreSQL on Supabase or another managed service

---

## 🤝 Contributing

Contributions are welcome. If you want to improve the UI, add new admin features, or strengthen the backend workflow, feel free to open a pull request.

---

> Built with care for the incoming batch of FY students at MIT Academy of Engineering. 🎓
