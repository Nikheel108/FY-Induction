<div align="center">
  <img src="frontend/public/logo.png" alt="Institution Logo" width="280" style="margin-bottom: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
  
  <h1>🎓 Automated Event & Induction Management System</h1>
  
  <p>
    A robust, scalable, and beautifully crafted full-stack solution for managing large-scale student induction programs, college events, and seminars. Built for speed, reliability, and an exceptional user experience.
  </p>

  <p>
    <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=for-the-badge" />
    <img alt="Flask" src="https://img.shields.io/badge/Flask-3.1-000000?logo=flask&logoColor=white&style=for-the-badge" />
    <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white&style=for-the-badge" />
    <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-14-4169E1?logo=postgresql&logoColor=white&style=for-the-badge" />
  </p>
</div>

---

## ✨ Overview

This platform was designed to completely digitize and streamline the event induction journey. From seamless student registration to automated receipt generation, location-aware attendance tracking, and dynamic email broadcasting.

Whether you're organizing a **First Year Induction**, an **Annual Cultural Fest**, or a **Department Seminar**, this repository provides a plug-and-play foundation that any institution or department can easily adapt.

---

## 🚀 Key Features

### For Students:
- 📝 **Frictionless Registration:** Fast, mobile-optimized registration form with live photo capture/upload capabilities.
- 🧾 **Instant Receipts:** Auto-generated PDF receipts with QR codes, unique Registration IDs, and embedded profile photos.
- 📍 **Smart Attendance:** One-click attendance marking tied to specific "Event Sessions" using precise geolocation mapping.
- 📱 **Mobile-First Design:** A beautiful, responsive interface that works flawlessly on any device.

### For Administrators:
- 📊 **Live Analytics Dashboard:** Real-time statistics, department-wise charts, and registration counts.
- 📅 **Session Management:** Create, monitor, and delete specific event sessions (e.g., "Day 1 Morning", "Day 2 Workshop").
- 📢 **Mass Broadcasting:** Send beautifully themed, HTML-rich emails to Students, Parents, or Both. Features built-in failover support to bypass daily email limits.
- 📥 **Data Export:** Export detailed student lists and attendance records directly to CSV or Excel.
- 🖼️ **Highlights & Gallery:** A dynamic CMS to upload event photos and highlight descriptions to the public homepage.

---

## 🔄 The Workflow

1. **Setup Session:** Admin creates an "Event Session" (e.g., Day 1 Induction) and defines the duration.
2. **Registration:** Students register online. Their data is instantly saved, and they download their unique PDF receipt.
3. **Attendance:** During the event, students visit the portal, select the active session, and mark their presence. The system verifies their GPS coordinates.
4. **Communication:** Admin uses the Broadcast tool to send customized schedule updates and venue changes directly to students' and parents' inboxes.

---

## 🛠️ How to Setup for Your Own Department/Institution

This repository is designed to be easily forkable and customizable for **any** college or department. Follow these exact steps to make it yours:

### 1. Branding Customization
- **Logo:** Replace `frontend/public/logo.png` with your institution's logo.
- **Institution Name:** Update the institution name in `frontend/src/components/Footer.jsx` and `frontend/src/components/Navbar.jsx`.
- **Theme Colors:** The app uses Tailwind CSS. You can modify the primary brand colors in `frontend/tailwind.config.js`.

### 2. Department List Customization
To change the list of selectable departments/branches during registration:
- **Backend:** Open `backend/app.py` and modify the `DEPARTMENTS` list inside the configuration block.
- **Frontend:** Open `frontend/src/pages/Registration.jsx` and update the `<select>` options for the department field.

### 3. Google Apps Script (Free Mass Emailing)
This app uses a clever workaround to send thousands of emails for free using Google Apps Script (GAS) linked to Gmail accounts.
1. Copy the exact code from `google_apps_script.js` located in the root of this repo.
2. Go to [script.google.com](https://script.google.com/) and paste the code.
3. Deploy as a "Web App" (Execute as: You, Access: Anyone).
4. Copy the Web App URL and add it to your environment variables (see below).
> **Pro Tip:** To bypass Gmail's 100-email daily limit, create multiple scripts on different Google accounts and chain their URLs together in your `.env` file, separated by commas! The backend will automatically failover.

---

## 💻 Technical Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL Database (Local or cloud like Supabase/Neon)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/induction_db
# Use comma-separated URLs for failover support
GAS_WEB_APP_URL=https://script.google.com/macros/s/SCRIPT_1/exec,https://script.google.com/macros/s/SCRIPT_2/exec
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
```

Initialize the database and run:
```bash
flask db upgrade  # If using Flask-Migrate, or rely on db.create_all() in app.py
python app.py
```

### Frontend Setup
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory (if testing locally):
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Run the development server:
```bash
npm run dev
```

---

## 🤝 Contributors

1. NIKHEEL C KHADAKABHAVI (  [Nikheel108](https://github.com/Nikheel108/) )
2. SAMEER SIRSATH (  [SameerSirsath](https://github.com/SameerSirsath/) )

---

<div align="center">
  <p>Built with ❤️ for educational institutions worldwide.</p>
</div>
