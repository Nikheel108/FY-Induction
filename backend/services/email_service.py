import base64
import logging
import os
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

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
    """Read static PDFs and base64-encode them for the JSON/SMTP payload."""
    attachments = []
    
    # Static uploads (Schedule, Campus Map, etc.)
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


def _build_student_html(student, raw_password=None):
    photo_html = f'<img src="{student.photo_base64}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; float: right; border: 1px solid #e2e8f0; margin-left: 16px; margin-bottom: 16px;" alt="Student Photo"/>' if getattr(student, 'photo_base64', None) else ''
    logo_url = "https://fy-induction.vercel.app/logo.png"
    
    cred_box = f"""
          <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a;">
            <h3 style="margin: 0 0 12px 0; color: #15803d; font-size: 16px;">🔑 Your Student Portal Login Credentials</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
              <tr>
                <td style="padding: 6px 0; color: #475569; width: 45%;"><strong>User ID (PRN):</strong></td>
                <td style="padding: 6px 0; font-weight: 700; color: #0f172a; font-family: monospace; font-size: 16px;">{student.prn}</td>
              </tr>
              {f'<tr style="border-top: 1px solid #dcfce7;"><td style="padding: 6px 0; color: #475569;"><strong>Password:</strong></td><td style="padding: 6px 0; font-weight: 700; color: #15803d; font-family: monospace; font-size: 16px;">{raw_password}</td></tr>' if raw_password else ''}
            </table>
            <p style="margin: 12px 0 0 0; font-size: 13px; color: #166534;">
              Log in to your <a href="https://fy-induction.vercel.app/student-login" style="color: #15803d; font-weight: bold; text-decoration: underline;">Student Portal</a> using these credentials.
            </p>
          </div>
    """

    return f"""
    <div style="font-family: 'Segoe UI', Inter, Arial, sans-serif; color: #334155; background-color: #f8fafc; padding: 30px 15px; margin: 0;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%); padding: 24px 32px; text-align: center;">
          <img src="{logo_url}" alt="MITAOE Logo" style="height: 60px; margin-bottom: 16px; filter: brightness(0) invert(1);" />
          <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Welcome to MIT Academy of Engineering</h2>
        </div>

        <!-- Body -->
        <div style="padding: 32px; line-height: 1.6;">
          {photo_html}
          <p style="font-size: 16px; margin-top: 0;">Dear <strong>{student.full_name}</strong>,</p>
          <p style="font-size: 16px; color: #475569;">Congratulations on your admission! Your registration for the <strong>First Year Induction Program</strong> has been successfully completed.</p>
          
          {cred_box}

          <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0; clear: both;">
            <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
              <tr><td style="padding: 8px 0; color: #64748b; width: 40%;"><strong>PRN Number</strong></td>
                  <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">{student.prn}</td></tr>
              <tr style="border-top: 1px solid #e2e8f0;"><td style="padding: 8px 0; color: #64748b;"><strong>Department</strong></td>
                  <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">{student.department}</td></tr>
              <tr style="border-top: 1px solid #e2e8f0;"><td style="padding: 8px 0; color: #64748b;"><strong>Reporting Date</strong></td>
                  <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">{student.created_at.strftime('%d %b %Y') if student.created_at else '-'}</td></tr>
              <tr style="border-top: 1px solid #e2e8f0;"><td style="padding: 8px 0; color: #64748b;"><strong>Reporting Time</strong></td>
                  <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">9:00 AM</td></tr>
              <tr style="border-top: 1px solid #e2e8f0;"><td style="padding: 8px 0; color: #64748b;"><strong>Venue</strong></td>
                  <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">Main Auditorium</td></tr>
            </table>
          </div>

          <p style="font-size: 16px; color: #475569;">Please find the following documents attached with this email:</p>
          <ul style="color: #475569; padding-left: 20px;">
            <li>Day-wise Schedule</li>
            <li>Campus Map</li>
            <li>Student Handbook</li>
            <li>Academic Calendar</li>
          </ul>

          <div style="margin-top: 24px; padding: 16px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
            <p style="margin: 0; color: #1e3a8a; font-size: 15px;">Your Registration ID is <strong>{student.registration_id}</strong>. Kindly bring a printed copy of your receipt on the reporting day.</p>
          </div>

          <p style="margin-top: 32px; font-size: 15px; color: #475569;">Warm Regards,<br/>
          <strong style="color: #0f172a;">First Year Induction Team</strong><br/>
          MIT Academy of Engineering</p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 13px; color: #94a3b8;">This is an automated message. Please do not reply to this email.</p>
        </div>

      </div>
    </div>
    """


def _build_parent_html(student):
    logo_url = "https://fy-induction.vercel.app/logo.png"
    
    return f"""
    <div style="font-family: 'Segoe UI', Inter, Arial, sans-serif; color: #334155; background-color: #f8fafc; padding: 30px 15px; margin: 0;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #334155 100%); padding: 24px 32px; text-align: center;">
          <img src="{logo_url}" alt="MITAOE Logo" style="height: 60px; margin-bottom: 16px; filter: brightness(0) invert(1);" />
          <h2 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Registration Confirmation</h2>
        </div>

        <!-- Body -->
        <div style="padding: 32px; line-height: 1.6;">
          <p style="font-size: 16px; margin-top: 0;">Dear <strong>{student.parent_name}</strong>,</p>
          <p style="font-size: 16px; color: #475569;">
            This email is to confirm that your ward <strong>{student.full_name}</strong> (PRN: {student.prn}) has successfully registered for the <strong>First Year Induction Program</strong> at MIT Academy of Engineering.
          </p>
          
          <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 15px; color: #0f172a;"><strong>Reporting Details:</strong></p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 15px;">
              <tr><td style="padding: 6px 0; color: #64748b; width: 40%;"><strong>Date</strong></td>
                  <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{student.created_at.strftime('%d %b %Y') if student.created_at else '-'}</td></tr>
              <tr style="border-top: 1px solid #e2e8f0;"><td style="padding: 6px 0; color: #64748b;"><strong>Time</strong></td>
                  <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">9:00 AM</td></tr>
              <tr style="border-top: 1px solid #e2e8f0;"><td style="padding: 6px 0; color: #64748b;"><strong>Venue</strong></td>
                  <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">Main Auditorium</td></tr>
            </table>
          </div>

          <p style="font-size: 16px; color: #475569;">We look forward to welcoming you and your ward to the campus.</p>
          
          <p style="margin-top: 32px; font-size: 15px; color: #475569;">Warm Regards,<br/>
          <strong style="color: #0f172a;">First Year Induction Team</strong><br/>
          MIT Academy of Engineering</p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 13px; color: #94a3b8;">This is an automated message. Please do not reply to this email.</p>
        </div>

      </div>
    </div>
    """


def _send_via_smtp(recipient, subject, html_body, attachments=None):
    """Sends email via standard SMTP (Gmail)."""
    email_address = os.getenv("EMAIL_ADDRESS") or current_app.config.get("EMAIL_ADDRESS", "testsameer662@gmail.com")
    email_password = os.getenv("EMAIL_PASSWORD") or current_app.config.get("EMAIL_PASSWORD", "vxxglodtoulsnlna")
    smtp_server = os.getenv("SMTP_SERVER") or current_app.config.get("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT") or current_app.config.get("SMTP_PORT", 587))

    if not email_address or not email_password:
        raise ValueError("SMTP credentials (EMAIL_ADDRESS and EMAIL_PASSWORD) not configured.")

    msg = MIMEMultipart("mixed")
    msg["From"] = f"MITAOE Induction <{email_address}>"
    msg["To"] = recipient
    msg["Subject"] = subject

    # Attach HTML body
    html_part = MIMEText(html_body, "html", "utf-8")
    msg.attach(html_part)

    # Attachments
    if attachments:
        for att in attachments:
            name = att.get("name", "attachment.pdf")
            b64_data = att.get("data", "")
            if b64_data:
                try:
                    raw_bytes = base64.b64decode(b64_data)
                    part = MIMEApplication(raw_bytes, Name=name)
                    part.add_header('Content-Disposition', 'attachment', filename=name)
                    msg.attach(part)
                except Exception as e:
                    logger.warning("Could not attach file %s: %s", name, e)

    # Connect to SMTP server & send
    with smtplib.SMTP(smtp_server, smtp_port, timeout=30) as server:
        server.starttls()
        server.login(email_address, email_password)
        server.sendmail(email_address, recipient, msg.as_string())
    
    logger.info("Email successfully sent via SMTP to %s", recipient)


_current_gas_index = 0

def _send_via_gas(recipient, subject, html_body, attachments=None):
    """Sends POST request to the Google Apps Script Web App with failover support."""
    global _current_gas_index
    
    gas_urls_env = current_app.config.get("GAS_WEB_APP_URL")
    if not gas_urls_env:
        raise ValueError("GAS_WEB_APP_URL is not configured in environment.")
        
    gas_urls = [u.strip() for u in gas_urls_env.split(",") if u.strip()]
    if not gas_urls:
        raise ValueError("No valid GAS_WEB_APP_URL found.")
        
    payload = {
        "recipient": recipient,
        "subject": subject,
        "htmlBody": html_body,
        "attachments": attachments or []
    }
    
    num_urls = len(gas_urls)
    last_error = None
    
    for i in range(num_urls):
        idx = (_current_gas_index + i) % num_urls
        url = gas_urls[idx]
        
        try:
            response = requests.post(url, json=payload, allow_redirects=True, timeout=45)
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
                    
            _current_gas_index = idx
            return
            
        except Exception as e:
            logger.warning("Failed sending via GAS URL %d: %s", idx, e)
            last_error = e
            
    raise ValueError(f"All {num_urls} GAS URLs failed. Last error: {last_error}")


def _send_email_dispatch(recipient, subject, html_body, attachments=None, raw_password=None):
    """
    Primary email dispatcher:
    1. Tries SMTP first if EMAIL_ADDRESS and EMAIL_PASSWORD exist.
    2. Falls back to Google Apps Script (GAS) if SMTP fails or is omitted.
    """
    email_address = os.getenv("EMAIL_ADDRESS") or current_app.config.get("EMAIL_ADDRESS")
    email_password = os.getenv("EMAIL_PASSWORD") or current_app.config.get("EMAIL_PASSWORD")

    if email_address and email_password:
        try:
            _send_via_smtp(recipient, subject, html_body, attachments)
            return
        except Exception as smtp_err:
            logger.warning("SMTP dispatch to %s failed: %s. Falling back to GAS...", recipient, smtp_err)

    # Fallback to Google Apps Script
    _send_via_gas(recipient, subject, html_body, attachments)


def send_registration_emails(student, raw_password=None):
    """Send student and parent emails via SMTP / GAS and log results."""
    results = {}
    attachments = _get_base64_attachments(student)

    # --- Welcome email to the student -----------------------------------------
    try:
        _send_email_dispatch(
            recipient=student.student_email,
            subject="Welcome to MIT Academy of Engineering",
            html_body=_build_student_html(student, raw_password),
            attachments=attachments
        )
        _record_log(student.id, "welcome", "sent")
        results["student"] = {"status": "sent"}
    except Exception as exc:
        logger.exception("Failed to send welcome email for student %s", student.id)
        try:
            _record_log(student.id, "welcome", "failed", str(exc))
        except Exception:
            logger.exception("Failed to record welcome email log for student %s", student.id)
        results["student"] = {"status": "failed", "error": str(exc)}

    return results


def _build_broadcast_html(payload, greeting):
    """Build a generic HTML email template for broadcasting."""
    logo_url = "https://fy-induction.vercel.app/logo.png"
    
    return f"""
    <div style="font-family: 'Segoe UI', Inter, Arial, sans-serif; color: #334155; background-color: #f8fafc; padding: 30px 15px; margin: 0;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #020617 0%, #1e293b 100%); padding: 24px 32px; text-align: center;">
          <img src="{logo_url}" alt="MITAOE Logo" style="height: 60px; margin-bottom: 16px; filter: brightness(0) invert(1);" />
          <h2 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">{payload.get('subject', 'Important Update')}</h2>
        </div>

        <!-- Body -->
        <div style="padding: 32px; line-height: 1.6;">
          <p style="font-size: 16px; margin-top: 0;"><strong>{greeting}</strong>,</p>
          <p style="font-size: 16px; color: #475569;">
            This is an important update regarding the <strong>{payload.get('program_name', 'First Year Induction Program')}</strong> at MIT Academy of Engineering.
          </p>
          
          <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
              <tr><td style="padding: 8px 0; color: #64748b; width: 40%;"><strong>Date</strong></td>
                  <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">{payload.get('date', '-')}</td></tr>
              <tr style="border-top: 1px solid #e2e8f0;"><td style="padding: 8px 0; color: #64748b;"><strong>Time</strong></td>
                  <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">{payload.get('time', '-')}</td></tr>
              <tr style="border-top: 1px solid #e2e8f0;"><td style="padding: 8px 0; color: #64748b;"><strong>Venue</strong></td>
                  <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">{payload.get('venue', '-')}</td></tr>
            </table>
          </div>

          <div style="margin-top: 24px; padding: 20px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
            <p style="margin: 0; font-size: 15px; color: #1e3a8a; line-height: 1.7;">
              {payload.get('additional_message', '').replace(chr(10), '<br>')}
            </p>
          </div>
          
          <p style="margin-top: 24px; font-size: 15px; color: #475569;">Please find the updated schedule and documents attached with this email.</p>
          
          <p style="margin-top: 32px; font-size: 15px; color: #475569;">Warm Regards,<br/>
          <strong style="color: #0f172a;">First Year Induction Team</strong><br/>
          MIT Academy of Engineering</p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 13px; color: #94a3b8;">This is an automated message from MIT Academy of Engineering. Please do not reply.</p>
        </div>

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
        
        subject = payload.get("subject", "Important Update from MITAOE")
        recipient_type = payload.get("recipient_type", "students")
        
        # Get all students
        students = Student.query.all()
        logger.info(f"Starting broadcast to {len(students)} students (type: {recipient_type}).")
        
        success_count = 0
        fail_count = 0
        
        for student in students:
            targets = []
            if recipient_type in ("students", "both") and student.student_email:
                targets.append((student.student_email, f"Dear {student.full_name}"))
            if recipient_type in ("parents", "both") and student.parent_email:
                targets.append((student.parent_email, f"Dear {student.parent_name}"))
                
            for email, greeting in targets:
                try:
                    html_body = _build_broadcast_html(payload, greeting)
                    _send_email_dispatch(
                        recipient=email,
                        subject=subject,
                        html_body=html_body,
                        attachments=attachments
                    )
                    # Log success
                    _record_log(student.id, "broadcast", "sent")
                    success_count += 1
                except Exception as e:
                    logger.error(f"Failed to send broadcast to {email}: {e}")
                    _record_log(student.id, "broadcast", "failed", str(e))
                    fail_count += 1
                
        logger.info(f"Broadcast complete. Success: {success_count}, Failed: {fail_count}")
