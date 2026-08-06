"""
Configuration module for the Student Induction Management System.

All sensitive / environment specific values are read from the ``.env`` file
(or the process environment) so that the exact same code can be deployed to
Render, Railway or any other host by only changing environment variables.
"""

import os

from dotenv import load_dotenv

# Load environment variables from the .env file located in the backend folder.
# ``override=False`` means an already-set OS environment variable always wins,
# which is what we want when deploying to cloud platforms.
load_dotenv()


class Config:
    """Central Flask configuration loaded from environment variables."""

    # --- Core -----------------------------------------------------------------
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")

    # CORS: the origin(s) allowed to talk to this API. FRONTEND_URL is read from
    # .env and used for local development (http://localhost:5173).
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    ALLOWED_ORIGINS = [origin.strip() for origin in
                       os.getenv("ALLOWED_ORIGINS", FRONTEND_URL).split(",")
                       if origin.strip()]

    # --- Database (MySQL) ------------------------------------------------------
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_NAME = os.getenv("DB_NAME", "induction_db")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")

    # SQLAlchemy connection string. ``charset`` and ``unix_socket`` alternatives
    # are intentionally omitted because we always talk TCP on Windows/XAMPP.
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        "?charset=utf8mb4"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 280}

    # --- Email (Gmail SMTP) -----------------------------------------------------
    EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS", "")
    EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").lower() == "true"

    MAIL_SERVER = SMTP_HOST
    MAIL_PORT = SMTP_PORT
    MAIL_USE_TLS = MAIL_USE_TLS
    MAIL_USE_SSL = False
    MAIL_USERNAME = EMAIL_ADDRESS
    MAIL_PASSWORD = EMAIL_PASSWORD
    MAIL_DEFAULT_SENDER = EMAIL_ADDRESS

    # --- Admin ----------------------------------------------------------------
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin@123")
    # How long an admin token stays valid (hours).
    ADMIN_TOKEN_TTL_HOURS = int(os.getenv("ADMIN_TOKEN_TTL_HOURS", "12"))

    # --- Options used for validation ---------------------------------------------
    # Only one department is offered for this induction program.
    DEPARTMENTS = ["Computer Science and Engineering (AI & ML)"]

    # --- Uploads (PDF attachments) ----------------------------------------------
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")

    # Documents attached to the welcome email. Files that do not exist are
    # skipped silently so a missing file never crashes a registration.
    EMAIL_ATTACHMENTS = [
        ("schedule.pdf", "Day-wise Schedule.pdf"),
        ("campus_map.pdf", "Campus Map.pdf"),
        ("student_handbook.pdf", "Student Handbook.pdf"),
        ("academic_calendar.pdf", "Academic Calendar.pdf"),
    ]
