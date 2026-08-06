"""
Email service.

Sends the personalised welcome email to the student and the confirmation email
to the parent immediately after registration, attaching the PDF documents
(sharing of files inside ``backend/uploads/``) and the generated receipt.

Every send attempt is recorded in the ``mail_logs`` table so failures can be
traced. SMTP credentials are read from the environment (never hardcoded).
"""

import logging
import os
from datetime import datetime

from flask import current_app
from flask_mail import Mail, Message

from models import MailLog, Student
from services.database import db
from services.utils import build_receipt_pdf

# Lazy-initialised extension instance (bound to the app in ``app.py``).
mail = Mail()

logger = logging.getLogger(__name__)


def _resolve_attachment(filename):
    """
    Return the absolute path of ``filename`` inside the uploads folder, or
    ``None`` when the file is missing.
    """
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    path = os.path.join(upload_folder, filename)
    return path if os.path.isfile(path) else None


def _attach_uploads(msg):
    """
    Attach every configured PDF that actually exists on disk.

    Missing files are logged but never raise an exception, so a registration
    never fails because an attachment is absent.
    """
    attached = []
    missing = []
    for filename, display_name in current_app.config["EMAIL_ATTACHMENTS"]:
        path = _resolve_attachment(filename)
        if path:
            with open(path, "rb") as fh:
                msg.attach(display_name, "application/pdf", fh.read())
            attached.append(display_name)
        else:
            missing.append(filename)
            logger.warning("Attachment not found on disk: %s", filename)
    return attached, missing


def _attach_receipt(msg, student):
    """Attach the generated registration receipt PDF."""
    msg.attach(
        f"Registration_Receipt_{student.registration_id}.pdf",
        "application/pdf",
        build_receipt_pdf(student),
    )


def _record_log(student_id, mail_type, status, error_message=None):
    """
    Persist one mail-log row. Called for both success and failure so the admin
    dashboard always reflects reality.
    """
    log = MailLog(
        student_id=student_id,
        mail_type=mail_type,
        status=status,
        sent_time=datetime.utcnow(),
        error_message=error_message,
    )
    db.session.add(log)
    db.session.commit()


def _build_student_message(student):
    """Create and fill the welcome email for the student."""
    msg = Message(
        subject="Welcome to MIT Academy of Engineering",
        recipients=[student.student_email],
        sender=current_app.config["MAIL_DEFAULT_SENDER"],
    )
    msg.html = f"""
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#1e293b;max-width:640px">
      <div style="background:#1d4ed8;color:#fff;padding:18px 24px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Welcome to MIT Academy of Engineering</h2>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;padding:24px">
        <p>Dear <strong>{student.full_name}</strong>,</p>
        <p>Congratulations on your admission. Your registration for the
           <strong>First Year Induction Program</strong> has been completed
           successfully.</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:6px 12px;background:#eff6ff"><strong>PRN</strong></td>
              <td style="padding:6px 12px">{student.prn}</td></tr>
          <tr><td style="padding:6px 12px;background:#eff6ff"><strong>Department</strong></td>
              <td style="padding:6px 12px">{student.department}</td></tr>
          <tr><td style="padding:6px 12px;background:#eff6ff"><strong>Reporting Date</strong></td>
              <td style="padding:6px 12px">{student.created_at.strftime('%d %b %Y') if student.created_at else '-'}</td></tr>
          <tr><td style="padding:6px 12px;background:#eff6ff"><strong>Reporting Time</strong></td>
              <td style="padding:6px 12px">9:00 AM</td></tr>
          <tr><td style="padding:6px 12px;background:#eff6ff"><strong>Venue</strong></td>
              <td style="padding:6px 12px">Main Auditorium</td></tr>
        </table>
        <p>Please find the following documents attached with this email:</p>
        <ul>
          <li>Day-wise Schedule</li>
          <li>Campus Map</li>
          <li>Student Handbook</li>
          <li>Academic Calendar</li>
        </ul>
        <p>Your Registration ID is <strong>{student.registration_id}</strong>.
           Kindly bring a printed copy of your receipt on the reporting day.</p>
        <p>Regards,<br/>First Year Induction Team<br/>MIT Academy of Engineering</p>
      </div>
    </div>
    """
    return msg


def _build_parent_message(student):
    """Create and fill the confirmation email for the parent/guardian."""
    msg = Message(
        subject="Registration Confirmation",
        recipients=[student.parent_email],
        sender=current_app.config["MAIL_DEFAULT_SENDER"],
    )
    msg.html = f"""
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#1e293b;max-width:640px">
      <div style="background:#0f172a;color:#fff;padding:18px 24px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Registration Confirmation</h2>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;padding:24px">
        <p>Dear {student.parent_name},</p>
        <p>Your ward <strong>{student.full_name}</strong>
           ({student.prn}) has successfully registered for the
           <strong>First Year Induction Program</strong> at MIT Academy of
           Engineering.</p>
        <p>Please ensure reporting on the scheduled date and time:
           <strong>{student.created_at.strftime('%d %b %Y') if student.created_at else '-'}</strong>
           at <strong>9:00 AM</strong>, Main Auditorium.</p>
        <p>Regards,<br/>MIT Academy of Engineering</p>
      </div>
    </div>
    """
    return msg


def send_registration_emails(student):
    """
    Send both the student welcome email and the parent confirmation email.

    Each email is sent and logged independently, so a failure for one recipient
    does not prevent the other from being attempted.
    """
    results = {}

    # --- Welcome email to the student -----------------------------------------
    try:
        student_msg = _build_student_message(student)
        _attach_uploads(student_msg)
        _attach_receipt(student_msg, student)
        mail.send(student_msg)
        _record_log(student.id, "welcome", "sent")
        results["student"] = {"status": "sent"}
    except Exception as exc:  # noqa: BLE001 - SMTP errors are all logged
        logger.exception("Failed to send welcome email for student %s", student.id)
        _record_log(student.id, "welcome", "failed", str(exc))
        results["student"] = {"status": "failed", "error": str(exc)}

    # --- Confirmation email to the parent --------------------------------------
    try:
        parent_msg = _build_parent_message(student)
        mail.send(parent_msg)
        _record_log(student.id, "parent", "sent")
        results["parent"] = {"status": "sent"}
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to send parent email for student %s", student.id)
        _record_log(student.id, "parent", "failed", str(exc))
        results["parent"] = {"status": "failed", "error": str(exc)}

    return results
