"""
Utility helpers shared across the application.

Contains input validation helpers, admin authentication (signed tokens), unique
registration-ID generation and the registration receipt PDF builder.
"""

import re
from datetime import datetime
from functools import wraps

from flask import current_app, jsonify, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from models import Student
import secrets
import string

# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

# Loose but practical RFC-ish email pattern used for form validation.
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
# Exactly 10 digits, optionally prefixed by +91 / 0 (stored digits only).
PHONE_RE = re.compile(r"^(?:\+91[\s-]?|0)?[6-9]\d{9}$")


def is_valid_email(value):
    """Return True when ``value`` looks like a valid email address."""
    return bool(value) and bool(EMAIL_RE.match(str(value).strip()))


def is_valid_phone(value):
    """Return True when ``value`` is a 10-digit Indian mobile number."""
    return bool(value) and bool(PHONE_RE.match(str(value).strip()))


def sanitize(value):
    """Trim surrounding whitespace or return None for empty strings."""
    if value is None:
        return None
    value = str(value).strip()
    return value or None


# ---------------------------------------------------------------------------
# Registration ID generation
# ---------------------------------------------------------------------------

def generate_registration_id():
    """
    Generate a human-friendly unique registration ID.

    Format: `REG-YYYY-NNNN` where NNNN is the number of registrations so far
    plus one. A 6-character random suffix (uppercase letters and digits) guards
    against race conditions. If a collision occurs (extremely rare), retry up to
    5 times with a new random suffix.
    """
    year = datetime.utcnow().year
    count = Student.query.count()
    base = f"REG-{year}-{count + 1:04d}"
    alphabet = string.ascii_uppercase + string.digits
    for _ in range(5):
        suffix = ''.join(secrets.choice(alphabet) for _ in range(6))
        reg_id = f"{base}-{suffix}"
        if not Student.query.filter_by(registration_id=reg_id).first():
            return reg_id
    # Fallback: use a UUID suffix if we somehow collide 5 times (should not happen)
    return f"{base}-{secrets.token_hex(3).upper()}"

# ---------------------------------------------------------------------------
# Admin authentication (stateless signed tokens via itsdangerous)
# ---------------------------------------------------------------------------

def _serializer(app):
    """Build a signed serializer bound to the app secret key."""
    return URLSafeTimedSerializer(app.config["SECRET_KEY"], salt="admin-auth")


def generate_admin_token(app, username):
    """Create a signed token for the given admin username."""
    return _serializer(app).dumps({"username": username})


def validate_admin_token(app, token):
    """Return the payload if the token is valid, otherwise raise."""
    return _serializer(app).loads(
        token, max_age=app.config["ADMIN_TOKEN_TTL_HOURS"] * 3600
    )


def admin_required(fn):
    """
    Decorator protecting admin-only endpoints.

    Expects ``Authorization: Bearer <token>``. Returns proper JSON errors for
    missing, expired or tampered tokens.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        token = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else ""
        if not token:
            return jsonify({"success": False, "message": "Authentication required."}), 401
        try:
            validate_admin_token(current_app._get_current_object(), token)
        except SignatureExpired:
            return jsonify({"success": False, "message": "Session expired. Please log in again."}), 401
        except BadSignature:
            return jsonify({"success": False, "message": "Invalid or tampered token."}), 401
        return fn(*args, **kwargs)

    return wrapper


# ---------------------------------------------------------------------------
# Student authentication (stateless signed tokens via itsdangerous)
# ---------------------------------------------------------------------------

def _student_serializer(app):
    """Build a signed serializer for students."""
    return URLSafeTimedSerializer(app.config["SECRET_KEY"], salt="student-auth")


def generate_student_token(app, student_id, prn):
    """Create a signed token for a student."""
    return _student_serializer(app).dumps({"student_id": student_id, "prn": prn})


def validate_student_token(app, token):
    """Return the payload if the token is valid, otherwise raise."""
    # Tokens expire in 24 hours
    return _student_serializer(app).loads(token, max_age=24 * 3600)


def student_required(fn):
    """
    Decorator protecting student-only endpoints.
    Expects ``Authorization: Bearer <token>``.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        token = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else ""
        if not token:
            return jsonify({"success": False, "message": "Authentication required."}), 401
        try:
            payload = validate_student_token(current_app._get_current_object(), token)
            # Attach the student payload to the request object for easy access
            request.student_payload = payload
        except SignatureExpired:
            return jsonify({"success": False, "message": "Session expired. Please log in again."}), 401
        except BadSignature:
            return jsonify({"success": False, "message": "Invalid or tampered token."}), 401
        return fn(*args, **kwargs)

    return wrapper


# ---------------------------------------------------------------------------
# Registration receipt PDF
# ---------------------------------------------------------------------------

def build_receipt_pdf(student):
    """
    Build a printable A4 registration receipt for a student.

    Returns the PDF as ``bytes`` so it can be streamed to the browser or
    attached to an email without touching the filesystem.
    """
    from io import BytesIO
    import base64
    from reportlab.lib.utils import ImageReader

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 20 * mm
    accent = colors.HexColor("#1d4ed8")
    dark = colors.HexColor("#1e293b")

    # --- Header band -----------------------------------------------------------
    pdf.setFillColor(accent)
    pdf.rect(0, height - 38 * mm, width, 38 * mm, stroke=0, fill=1)
    pdf.setFillColor(colors.white)
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(margin, height - 18 * mm, "MIT Academy of Engineering")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(margin, height - 27 * mm,
                   "First Year Induction Program - Registration Receipt")

    # --- Receipt metadata -------------------------------------------------------
    y = height - 52 * mm
    pdf.setFillColor(dark)
    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawString(margin, y, "RECEIPT NO.")
    pdf.setFont("Helvetica", 9)
    pdf.drawString(60 * mm, y, student.registration_id or "-")
    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawString(120 * mm, y, "DATE")
    pdf.setFont("Helvetica", 9)
    pdf.drawString(150 * mm, y, (student.created_at.strftime("%d %b %Y, %H:%M")
                                 if student.created_at else "-"))
    y -= 10 * mm
    pdf.setStrokeColor(colors.HexColor("#cbd5e1"))
    pdf.line(margin, y, width - margin, y)
    y -= 10 * mm

    # --- Student section ---------------------------------------------------------
    pdf.setFillColor(accent)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(margin, y, "Student Information")
    y -= 7 * mm

    student_rows = [
        ("Full Name", student.full_name),
        ("PRN", student.prn),
        ("Department", student.department),
        ("Email", student.student_email),
        ("Mobile", student.student_phone),
    ]

    pdf.setFont("Helvetica", 9.5)
    for label, value in student_rows:
        pdf.setFillColor(colors.HexColor("#64748b"))
        pdf.drawString(margin, y, f"{label.upper()}")
        pdf.setFillColor(dark)
        pdf.drawString(60 * mm, y, str(value))
        y -= 6 * mm

    # Draw photo if available
    if getattr(student, 'photo_base64', None):
        try:
            # The base64 string from frontend includes the data URI prefix (e.g. data:image/jpeg;base64,...)
            photo_data = student.photo_base64.split(",")[1] if "," in student.photo_base64 else student.photo_base64
            img_bytes = base64.b64decode(photo_data)
            img = ImageReader(BytesIO(img_bytes))
            # Draw it at the top right of the student section
            photo_size = 30 * mm
            pdf.drawImage(img, width - margin - photo_size, height - 90 * mm, width=photo_size, height=photo_size, preserveAspectRatio=True)
        except Exception as e:
            # Silently ignore invalid base64 images
            print(f"Error drawing photo: {e}")

    y -= 6 * mm
    pdf.setFillColor(accent)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(margin, y, "Parent Information")
    y -= 7 * mm

    parent_rows = [
        ("Parent Name", student.parent_name),
        ("Parent Email", student.parent_email),
        ("Parent Mobile", student.parent_phone),
    ]
    pdf.setFont("Helvetica", 9.5)
    for label, value in parent_rows:
        pdf.setFillColor(colors.HexColor("#64748b"))
        pdf.drawString(margin, y, f"{label.upper()}")
        pdf.setFillColor(dark)
        pdf.drawString(60 * mm, y, str(value))
        y -= 6 * mm
        
    y -= 6 * mm
    pdf.setFillColor(colors.HexColor("#16a34a")) # Green color for credentials
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(margin, y, "Login Credentials (Student Portal)")
    y -= 7 * mm

    # We fetch the default password
    from services.password_service import TEST_DEFAULT_PASSWORD
    
    cred_rows = [
        ("User ID (PRN)", student.prn),
        ("Password", TEST_DEFAULT_PASSWORD),
    ]
    pdf.setFont("Helvetica", 9.5)
    for label, value in cred_rows:
        pdf.setFillColor(colors.HexColor("#64748b"))
        pdf.drawString(margin, y, f"{label.upper()}")
        pdf.setFillColor(colors.HexColor("#15803d")) # Darker green text
        pdf.setFont("Courier-Bold", 11)
        pdf.drawString(60 * mm, y, str(value))
        pdf.setFont("Helvetica", 9.5)
        y -= 6 * mm

    # --- Footer -----------------------------------------------------------------
    pdf.setStrokeColor(colors.HexColor("#cbd5e1"))
    pdf.setDash(2, 2)
    pdf.line(margin, 28 * mm, width - margin, 28 * mm)
    pdf.setDash()
    pdf.setFillColor(colors.HexColor("#64748b"))
    pdf.setFont("Helvetica", 8.5)
    pdf.drawCentredString(width / 2, 22 * mm,
                          "Reporting: Day 1 of the Induction Program | Venue: Main Auditorium")
    pdf.drawCentredString(width / 2, 17 * mm,
                          "This is a computer generated receipt. Keep it for the Induction Program.")

    pdf.showPage()
    pdf.save()
    return buffer.getvalue()



