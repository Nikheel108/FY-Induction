"""
SQLAlchemy ORM models.

Two tables are defined:
  * ``students``  - stores the registration data (PRN, name, email, mobile,
                    parent details and department) plus a unique registration
                    ID and audit timestamps.
  * ``mail_logs`` - one row per attempted email (welcome / parent) so admins
                    can see exactly what was sent, when, and whether it failed.
"""

from datetime import datetime

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
