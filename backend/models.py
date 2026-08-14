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

from services.database import db


class Student(db.Model):
    """Student registration record."""

    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    registration_id = db.Column(db.String(50), unique=True, nullable=False, index=True)

    # --- Student information ---
    full_name = db.Column(db.String(150), nullable=False)
    prn = db.Column(db.String(30), unique=True, nullable=False, index=True)
    department = db.Column(db.String(150), nullable=False, index=True)
    student_email = db.Column(db.String(150), unique=True, nullable=False, index=True)
    student_phone = db.Column(db.String(20), nullable=False)

    # --- Parent information ---
    parent_name = db.Column(db.String(150), nullable=False)
    parent_email = db.Column(db.String(150), nullable=False)
    parent_phone = db.Column(db.String(20), nullable=False)

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
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


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
    start_time = db.Column(db.DateTime, nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    attendances = db.relationship("Attendance", backref="event_session", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "duration_minutes": self.duration_minutes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
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