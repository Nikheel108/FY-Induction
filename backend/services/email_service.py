import base64
import logging
import os
from datetime import datetime

import requests
from flask import current_app

from models import MailLog, Student
from services.database import db
from services.utils import build_receipt_pdf

logger = logging.getLogger(__name__)


def _resolve_attachment(filename):
    """Return absolute path of `filename` inside uploads, or None if missing."""
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    path = os.path.join(upload_folder, filename)
    return path if os.path.isfile(path) else None


def _get_base64_attachments(student):
    """Read PDFs, build receipt, and base64-encode them for the JSON payload."""
    attachments = []
    
    # 1. Static uploads (Schedule, Campus Map, etc.)
    for filename, display_name in current_app.config["EMAIL_ATTACHMENTS"]:
        path = _resolve_attachment(filename)
        if path:
            with open(path, "rb") as fh:
                b64_data = base64.b64encode(fh.read()).decode("utf-8")
                attachments.append({
                    "name": display_name,
                    "mimeType": "application/pdf",
                    "data": b64_data
                })
        else:
            logger.warning("Attachment not found on disk: %s", filename)
            
    # 2. Dynamic receipt
    receipt_bytes = build_receipt_pdf(student)
    receipt_b64 = base64.b64encode(receipt_bytes).decode("utf-8")
    attachments.append({
        "name": f"Registration_Receipt_{student.registration_id}.pdf",
        "mimeType": "application/pdf",
        "data": receipt_b64
    })
    
    return attachments


def _record_log(student_id, mail_type, status, error_message=None):
    """Persist one mail-log row."""
    log = MailLog(
        student_id=student_id,
        mail_type=mail_type,
        status=status,
        sent_time=datetime.utcnow(),
        error_message=error_message,
    )
    db.session.add(log)
    db.session.commit()


def _build_student_html(student):
    photo_html = f'<img src="{student.photo_base64}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; float: right; border: 1px solid #e2e8f0; margin-left: 16px; margin-bottom: 16px;" alt="Student Photo"/>' if getattr(student, 'photo_base64', None) else ''
    
    return f"""
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#1e293b;max-width:640px">
      <div style="background:#1d4ed8;color:#fff;padding:18px 24px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Welcome to MIT Academy of Engineering</h2>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;padding:24px; overflow:hidden;">
        {photo_html}
        <p>Dear <strong>{student.full_name}</strong>,</p>
        <p>Congratulations on your admission. Your registration for the
           <strong>First Year Induction Program</strong> has been completed
           successfully.</p>
        <table style="border-collapse:collapse;margin:16px 0; clear: both;">
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


def _build_parent_html(student):
    return f"""
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


def _send_via_gas(recipient, subject, html_body, attachments=None):
    """Sends POST request to the Google Apps Script Web App."""
    gas_url = current_app.config.get("GAS_WEB_APP_URL")
    if not gas_url:
        raise ValueError("GAS_WEB_APP_URL is not configured in environment.")
        
    payload = {
        "recipient": recipient,
        "subject": subject,
        "htmlBody": html_body,
        "attachments": attachments or []
    }
    
    # GAS Web Apps always reply with a 302 redirect to a content server,
    # so we must follow redirects to get the final JSON response.
    response = requests.post(gas_url, json=payload, allow_redirects=True, timeout=45)
    response.raise_for_status()
    
    try:
        data = response.json()
        if data.get("status") == "error":
            raise ValueError(f"Google Apps Script Error: {data.get('message')}")
    except ValueError as e:
        if "Google Apps Script Error" in str(e):
            raise
        else:
            logger.warning("GAS responded with non-JSON or weird JSON, but status was 200: %s", response.text)


def send_registration_emails(student):
    """Send student and parent emails via GAS and log results."""
    results = {}
    attachments = _get_base64_attachments(student)

    # --- Welcome email to the student -----------------------------------------
    try:
        _send_via_gas(
            recipient=student.student_email,
            subject="Welcome to MIT Academy of Engineering",
            html_body=_build_student_html(student),
            attachments=attachments
        )
        _record_log(student.id, "welcome", "sent")
        results["student"] = {"status": "sent"}
    except Exception as exc:
        logger.exception("Failed to send welcome email for student %s via GAS", student.id)
        try:
            _record_log(student.id, "welcome", "failed", str(exc))
        except Exception:
            logger.exception("Failed to record welcome email log for student %s", student.id)
        results["student"] = {"status": "failed", "error": str(exc)}

    # --- Confirmation email to the parent --------------------------------------
    try:
        _send_via_gas(
            recipient=student.parent_email,
            subject="Registration Confirmation",
            html_body=_build_parent_html(student)
        )
        _record_log(student.id, "parent", "sent")
        results["parent"] = {"status": "sent"}
    except Exception as exc:
        logger.exception("Failed to send parent email for student %s via GAS", student.id)
        try:
            _record_log(student.id, "parent", "failed", str(exc))
        except Exception:
            logger.exception("Failed to record parent email log for student %s", student.id)
        results["parent"] = {"status": "failed", "error": str(exc)}

    return results


def _build_broadcast_html(payload):
    """Build a generic HTML email template for broadcasting."""
    # Build schedule attachment string
    return f"""
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#1e293b;max-width:640px;line-height:1.6;">
      <div style="background:#0f172a;color:#fff;padding:18px 24px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">{payload.get('subject', 'Important Update')}</h2>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;padding:24px">
        <p>Dear Student,</p>
        <p>This is an important update regarding the <strong>{payload.get('program_name', 'First Year Induction Program')}</strong> at MIT Academy of Engineering.</p>
        
        <table style="border-collapse:collapse;margin:16px 0;width:100%;">
          <tr><td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;"><strong>Date</strong></td>
              <td style="padding:10px 12px;border:1px solid #e2e8f0;">{payload.get('date', '-')}</td></tr>
          <tr><td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;"><strong>Time</strong></td>
              <td style="padding:10px 12px;border:1px solid #e2e8f0;">{payload.get('time', '-')}</td></tr>
          <tr><td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;"><strong>Venue</strong></td>
              <td style="padding:10px 12px;border:1px solid #e2e8f0;">{payload.get('venue', '-')}</td></tr>
        </table>
        
        <div style="margin-top:20px;padding:16px;background:#eff6ff;border-left:4px solid #3b82f6;border-radius:4px;">
            {payload.get('additional_message', '').replace(chr(10), '<br>')}
        </div>
        
        <p style="margin-top:24px;">Please find the updated schedule and documents attached with this email.</p>
        
        <p style="margin-top:24px;">Regards,<br/><strong>First Year Induction Team</strong><br/>MIT Academy of Engineering</p>
      </div>
    </div>
    """


def send_broadcast_emails(app, payload):
    """
    Send broadcast emails in a background thread.
    Needs the Flask app context passed in to query DB and access configs.
    """
    with app.app_context():
        # Get all static attachments (Schedule, etc.)
        attachments = []
        for filename, display_name in app.config["EMAIL_ATTACHMENTS"]:
            path = _resolve_attachment(filename)
            if path:
                with open(path, "rb") as fh:
                    b64_data = base64.b64encode(fh.read()).decode("utf-8")
                    attachments.append({
                        "name": display_name,
                        "mimeType": "application/pdf",
                        "data": b64_data
                    })
        
        html_body = _build_broadcast_html(payload)
        subject = payload.get("subject", "Important Update from MITAOE")
        
        # Get all students
        students = Student.query.all()
        logger.info(f"Starting broadcast to {len(students)} students.")
        
        success_count = 0
        fail_count = 0
        
        for student in students:
            try:
                _send_via_gas(
                    recipient=student.student_email,
                    subject=subject,
                    html_body=html_body,
                    attachments=attachments
                )
                # Log success
                _record_log(student.id, "broadcast", "sent")
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to send broadcast to {student.student_email}: {e}")
                _record_log(student.id, "broadcast", "failed", str(e))
                fail_count += 1
                
        logger.info(f"Broadcast complete. Success: {success_count}, Failed: {fail_count}")
