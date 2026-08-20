"""
SQLAlchemy ORM models.

Two tables are defined:
  * ``students``  - stores the registration data (PRN, name, email, mobile,
                    parent details and department) plus a unique registration
                    ID and audit timestamps.
  * ``mail_logs`` - one row per attempted email (welcome / parent) so admins
                    can see exactly what was sent, when, and whether it failed.
  * ``sessions``  - stores each visitor's session with IP and location.
  * ``attendance`` - attendance records per student per day, linked to a session.
"""

from datetime import datetime, date
from werkzeug.security import generate_password_hash, check_password_hash

from services.database import db


class Student(db.Model):
    """Student registration record."""

    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    registration_id = db.Column(db.String(50), unique=True, nullable=True, index=True)

    # --- Student information ---
    full_name = db.Column(db.String(150), nullable=True)
    prn = db.Column(db.String(30), unique=True, nullable=False, index=True)
    department = db.Column(db.String(150), nullable=True, index=True)
    student_email = db.Column(db.String(150), unique=True, nullable=True, index=True)
    student_phone = db.Column(db.String(20), nullable=True)

    # --- Parent information ---
    parent_name = db.Column(db.String(150), nullable=True)
    parent_email = db.Column(db.String(150), nullable=True)
    parent_phone = db.Column(db.String(20), nullable=True)

    # --- Authentication ---
    password_hash = db.Column(db.String(255), nullable=True)
    is_first_login = db.Column(db.Boolean, nullable=False, default=True)

    # --- Media ---
    photo_base64 = db.Column(db.Text, nullable=True)

    # --- Audit ---
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow,
                           onupdate=datetime.utcnow)

    # Relationship: deleting a student also removes its mail logs.
    mail_logs = db.relationship(
        "MailLog", backref="student", lazy=True, cascade="all, delete-orphan"
    )

    def to_dict(self):
        """Serialize the model into a plain dictionary for JSON responses."""
        return {
            "id": self.id,
            "registration_id": self.registration_id,
            "full_name": self.full_name,
            "prn": self.prn,
            "department": self.department,
            "student_email": self.student_email,
            "student_phone": self.student_phone,
            "parent_name": self.parent_name,
            "parent_email": self.parent_email,
            "parent_phone": self.parent_phone,
            "photo_base64": self.photo_base64,
            "is_first_login": self.is_first_login,
            "is_registered": bool(self.registration_id),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)


class MailLog(db.Model):
    """Log entry describing a single email-sending attempt."""

    __tablename__ = "mail_logs"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"),
                           nullable=False)
    mail_type = db.Column(db.String(30), nullable=False)  # welcome | parent
    status = db.Column(db.String(20), nullable=False)     # sent | failed
    sent_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    error_message = db.Column(db.Text, nullable=True)

    def to_dict(self):
        """Serialize the log entry for JSON responses."""
        return {
            "id": self.id,
            "student_id": self.student_id,
            "mail_type": self.mail_type,
            "status": self.status,
            "sent_time": self.sent_time.isoformat() if self.sent_time else None,
            "error_message": self.error_message,
        }


# ----- NEW MODELS for Session & Attendance -----

class Session(db.Model):
    """Store each visitor session with IP and location."""
    __tablename__ = "sessions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    session_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    ip_address = db.Column(db.String(45), nullable=False)   # IPv6 max length
    location = db.Column(db.Text, nullable=True)            # e.g. "Mumbai, India"
    user_agent = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Relationship: one session can have many attendance records
    attendances = db.relationship("Attendance", backref="browser_session", lazy=True)


class EventSession(db.Model):
    """Admin-created time-bound sessions for attendance marking."""
    __tablename__ = "event_sessions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(150), nullable=False)
    resource_speaker = db.Column(db.String(150), nullable=True)
    location = db.Column(db.String(150), nullable=True)
    start_time = db.Column(db.DateTime, nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    attendances = db.relationship("Attendance", backref="event_session", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "resource_speaker": self.resource_speaker or "-",
            "location": self.location or "-",
            "start_time": self.start_time.isoformat() + "Z" if self.start_time else None,
            "duration_minutes": self.duration_minutes,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }


class Attendance(db.Model):
    """Attendance record per student per day, linked to an event session."""
    __tablename__ = "attendance"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    prn = db.Column(db.String(30), nullable=False, index=True)
    session_id = db.Column(db.Integer, db.ForeignKey("sessions.id"), nullable=False)
    event_session_id = db.Column(db.Integer, db.ForeignKey("event_sessions.id"), nullable=True, index=True)
    date = db.Column(db.Date, nullable=False, default=date.today)
    status = db.Column(db.String(20), nullable=False, default="present")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Ensure one device session cannot mark more than one attendance per day per event session
    # We remove the unique constraint on (session_id, date) to allow (session_id, event_session_id) but for backwards compat,
    # we'll just handle duplication checks in the application code.

class Highlight(db.Model):
    """Event highlights with photos and descriptions."""
    __tablename__ = "highlights"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    event_session_id = db.Column(db.Integer, db.ForeignKey("event_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    title = db.Column(db.String(150), nullable=False)
    resource_speaker = db.Column(db.String(150), nullable=True)
    description = db.Column(db.Text, nullable=False)
    image_base64 = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    event_session = db.relationship("EventSession", backref="highlights", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "event_session_id": self.event_session_id,
            "event_session_title": self.event_session.title if self.event_session else None,
            "title": self.title,
            "resource_speaker": self.resource_speaker or "-",
            "description": self.description,
            "image_base64": self.image_base64,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }


class ValidPRN(db.Model):
    """Admin-uploaded valid PRNs that are allowed to register."""
    __tablename__ = "valid_prns"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    prn = db.Column(db.String(30), unique=True, nullable=False, index=True)
    expected_name = db.Column(db.String(100), nullable=True)
    expected_department = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "prn": self.prn,
            "expected_name": self.expected_name,
            "expected_department": self.expected_department,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }


class ContactQuery(db.Model):
    """Student contact & query submissions."""
    __tablename__ = "contact_queries"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(150), nullable=False)
    prn = db.Column(db.String(30), nullable=False, index=True)
    email = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="pending")  # pending | resolved
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "prn": self.prn,
            "email": self.email,
            "description": self.description,
            "status": self.status,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }