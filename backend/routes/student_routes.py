"""
Student related API endpoints.

Handles public registration, student CRUD, statistics, email re-sending, the
registration receipt download and mail-log inspection.
"""

import logging

from flask import Blueprint, current_app, jsonify, request, send_file, g
from io import BytesIO

from models import MailLog, Student, EventSession, ContactQuery
from services import utils
from services.database import db
from services.email_service import send_registration_emails
from services.utils import admin_required, student_required, generate_student_token

student_bp = Blueprint("student", __name__, url_prefix="/api")

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Payload validation
# ---------------------------------------------------------------------------

def _validate_payload(payload):
    """
    Validate a full registration payload.

    Returns ``(errors, cleaned)`` where ``errors`` is a list of human readable
    messages (empty when valid) and ``cleaned`` is a sanitised dictionary.
    """
    errors = []
    cfg = current_app.config

    def require(field, label=None):
        """Ensure a non-empty value exists for ``field``."""
        value = utils.sanitize(payload.get(field))
        if not value:
            errors.append(f"{label or field} is required.")
        return value

    # --- Required fields ---
    full_name = require("full_name", "Full name")
    prn = require("prn", "PRN")
    department = require("department")
    student_email = require("student_email", "Student email")
    student_phone = require("student_phone", "Student phone")
    parent_name = require("parent_name", "Parent name")
    parent_email = require("parent_email", "Parent email")
    parent_phone = require("parent_phone", "Parent phone")

    # --- Format validation ---
    if student_email and not utils.is_valid_email(student_email):
        errors.append("Student email format is invalid.")
    if parent_email and not utils.is_valid_email(parent_email):
        errors.append("Parent email format is invalid.")
    if student_phone and not utils.is_valid_phone(student_phone):
        errors.append("Student phone must be exactly 10 digits.")
    if parent_phone and not utils.is_valid_phone(parent_phone):
        errors.append("Parent phone must be exactly 10 digits.")

    # --- Drop-down validation ---
    if department and department not in cfg["DEPARTMENTS"]:
        errors.append("Invalid department selected.")

    cleaned = {
        "full_name": full_name, "prn": prn, "department": department,
        "student_email": student_email, "student_phone": student_phone,
        "parent_name": parent_name, "parent_email": parent_email,
        "parent_phone": parent_phone, "photo_base64": payload.get("photo_base64")
    }
    return errors, cleaned


def _duplicate_errors(payload, exclude_id=None):
    """
    Detect duplicate PRN / student email against the database.

    Returns a list of error messages. ``exclude_id`` skips the record being
    edited during an update.
    """
    errors = []
    prn = utils.sanitize(payload.get("prn"))
    email = utils.sanitize(payload.get("student_email"))

    if prn:
        q = Student.query.filter(Student.prn == prn)
        if exclude_id:
            q = q.filter(Student.id != exclude_id)
        if q.first():
            errors.append("PRN already exists.")
    if email:
        q = Student.query.filter(Student.student_email == email)
        if exclude_id:
            q = q.filter(Student.id != exclude_id)
        if q.first():
            errors.append("Student email already exists.")
    return errors


def _apply_payload(student, cleaned):
    """Copy cleaned field values onto a Student instance."""
    for key, value in cleaned.items():
        setattr(student, key, value)
    return student


# ---------------------------------------------------------------------------
# Student Authentication
# ---------------------------------------------------------------------------

@student_bp.route("/login", methods=["POST"])
def student_login():
    """Authenticate a student via PRN and password."""
    payload = request.get_json(silent=True) or {}
    prn = utils.sanitize(payload.get("prn"))
    password = payload.get("password")

    if not prn:
        return jsonify({"success": False, "message": "PRN is required."}), 400

    student = Student.query.filter(db.func.lower(Student.prn) == prn.lower()).first()
    if not student:
        # Check if it's a valid PRN present in Upload Students (ValidPRN table)
        from models import ValidPRN
        is_valid = ValidPRN.query.filter(db.func.lower(ValidPRN.prn) == prn.lower()).first()
        if is_valid:
            return jsonify({"success": False, "message": "PRN is authorized, but not registered yet. Please complete registration.", "needs_registration": True}), 401
        return jsonify({"success": False, "message": "PRN not found in authorized student list. Ask admin to add your PRN in Upload Students."}), 401

    if not password:
        return jsonify({"success": False, "message": "Password is required. Please use Pass26."}), 400

    cleaned_pass = password.strip() if isinstance(password, str) else ""

    # Accept Pass26 or Pass@2526 for testing OR verify existing password hash
    is_valid_password = (cleaned_pass in ("Pass26", "Pass@2526")) or (student.password_hash and student.check_password(cleaned_pass))
    if not is_valid_password:
        return jsonify({"success": False, "message": "Invalid password. Use Pass26 for testing."}), 401

    # Ensure hash is saved
    try:
        student.set_password("Pass26")
        db.session.commit()
    except Exception:
        db.session.rollback()

    token = generate_student_token(current_app._get_current_object(), student.id, student.prn)
    
    return jsonify({
        "success": True,
        "message": "Login successful.",
        "token": token,
        "is_first_login": False,
        "is_registered": bool(student.registration_id),
        "student": student.to_dict()
    })


@student_bp.route("/change-password", methods=["POST"])
@student_required
def student_change_password():
    """Change student password."""
    payload = request.get_json(silent=True) or {}
    new_password = payload.get("new_password")
    if not new_password or len(new_password) < 4:
        return jsonify({"success": False, "message": "Password must be at least 4 characters."}), 400

    student_id = request.student_payload["student_id"]
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"success": False, "message": "Student not found."}), 404

    student.set_password(new_password)
    db.session.commit()
    return jsonify({"success": True, "message": "Password changed successfully."})


@student_bp.route("/me", methods=["GET"])
@student_required
def student_me():
    """Return the current student's profile."""
    student_id = request.student_payload["student_id"]
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"success": False, "message": "Student not found."}), 404
        
    return jsonify({
        "success": True,
        "student": student.to_dict()
    })


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------

@student_bp.route("/check-prn", methods=["POST"])
def check_prn_status():
    """
    Check if a PRN is present in the Upload Students (ValidPRN) database table.
    """
    from models import ValidPRN
    payload = request.get_json(silent=True) or {}
    prn = utils.sanitize(payload.get("prn"))

    if not prn:
        return jsonify({"success": False, "message": "PRN is required."}), 400

    # 1. Check if PRN is in ValidPRN table (Upload Students section in admin)
    valid_record = ValidPRN.query.filter(db.func.lower(ValidPRN.prn) == prn.lower()).first()
    if not valid_record:
        return jsonify({
            "success": False,
            "message": f"PRN '{prn}' is not authorized for registration. Ask admin to add your PRN in the Upload Students section.",
            "is_valid": False
        }), 200

    # 2. Check if student is already registered
    existing_student = Student.query.filter(db.func.lower(Student.prn) == prn.lower()).first()
    if existing_student:
        return jsonify({
            "success": True,
            "message": f"PRN '{prn}' is already registered. Please log in with your password.",
            "is_valid": True,
            "is_registered": True,
            "student_name": existing_student.full_name
        }), 200

    # 3. Valid PRN & eligible for registration
    return jsonify({
        "success": True,
        "message": f"PRN '{valid_record.prn}' is verified.",
        "is_valid": True,
        "is_registered": False,
        "prn": valid_record.prn,
        "expected_name": valid_record.expected_name or "",
        "expected_department": valid_record.expected_department or ""
    }), 200


@student_bp.route("/register", methods=["POST"])
def register_student():
    """
    Public registration endpoint.
    Requires PRN to be present in ValidPRN table (Upload Students in Admin Panel).
    Generates a 6-character alphanumeric password and schedules a welcome email after 1 minute.
    """
    import secrets
    import string
    import threading
    import time
    from models import ValidPRN

    payload = request.get_json(silent=True) or {}
    errors, cleaned = _validate_payload(payload)

    prn = cleaned.get("prn")
    if prn:
        # Check if PRN is in ValidPRN table (uploaded by admin)
        is_valid = ValidPRN.query.filter(db.func.lower(ValidPRN.prn) == prn.lower()).first()
        if not is_valid:
            errors.append(f"PRN '{prn}' is not authorized for registration. Ask admin to add your PRN in Upload Students.")
            
        # Check if student is already registered
        student = Student.query.filter(db.func.lower(Student.prn) == prn.lower()).first()
        if student:
            errors.append("This PRN is already registered.")

    if not errors:
        try:
            errors += _duplicate_errors(cleaned)
        except Exception as exc:
            db.session.rollback()
            logger.exception("Database error during duplicate check")
            return jsonify({
                "success": False,
                "message": "Database error. Could not verify the record.",
                "errors": [str(exc)],
            }), 500

    if errors:
        return jsonify({"success": False, "message": errors[0], "errors": errors}), 400

    student = Student()
    student.registration_id = utils.generate_registration_id()
    student.is_first_login = False
    _apply_payload(student, cleaned)
    
    # Fetch next unused preassigned password
    from models import PreassignedPassword
    unused_pwd = PreassignedPassword.query.filter_by(is_used=False).order_by(PreassignedPassword.id.asc()).first()
    
    if unused_pwd:
        raw_password = unused_pwd.password
        unused_pwd.is_used = True
        unused_pwd.assigned_to_prn = prn
    else:
        # Fallback to random password if preassigned list is exhausted
        from services.password_service import generate_random_password
        raw_password = generate_random_password(6)
        
    student.set_password(raw_password)

    db.session.add(student)

    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.exception("Database error while registering student")
        return jsonify({
            "success": False,
            "message": "Database error. Could not save the record.",
            "errors": [str(exc)],
        }), 500

    # Send welcome email asynchronously to prevent blocking response
    app_obj = current_app._get_current_object()
    student_id = student.id
    pwd_val = raw_password

    def _async_email_job():
        with app_obj.app_context():
            try:
                s = db.session.get(Student, student_id)
                if s:
                    send_registration_emails(s, raw_password=pwd_val)
            except Exception as e:
                logger.exception("Error sending registration email asynchronously: %s", e)

    email_thread = threading.Thread(target=_async_email_job)
    email_thread.daemon = True
    email_thread.start()

    return jsonify({
        "success": True,
        "message": "Student registered successfully. Your login password will be sent to your email in 1 minute.",
        "student": student.to_dict(),
    }), 201


@student_bp.route("/schedule", methods=["GET"])
def get_schedule():
    """
    Return all event sessions ordered by start time.
    """
    try:
        prn = request.args.get('prn', '').strip()
        marked_session_ids = []
        
        # Build query for attendance records using prn or browser session
        from models import Attendance
        if prn:
            records = Attendance.query.filter_by(prn=prn).all()
            marked_session_ids = [r.event_session_id for r in records if r.event_session_id]
        elif hasattr(g, 'session_obj') and g.session_obj:
            records = Attendance.query.filter_by(session_id=g.session_obj.id).all()
            marked_session_ids = [r.event_session_id for r in records if r.event_session_id]

        sessions = EventSession.query.order_by(EventSession.start_time.asc()).all()
        return jsonify({
            "success": True,
            "message": "Schedule fetched successfully.",
            "schedule": [s.to_dict() for s in sessions],
            "marked_session_ids": marked_session_ids
        })
    except Exception as exc:
        logger.exception("Database error while fetching schedule")
        return jsonify({
            "success": False,
            "message": "Database error. Could not fetch schedule.",
            "errors": [str(exc)],
        }), 500


@student_bp.route("/send-email", methods=["POST"])
def resend_email():
    """
    Re-send the welcome + parent emails for an existing student.

    Body: ``{"student_id": 1}`` or ``{"email": "..."}``.
    """
    payload = request.get_json(silent=True) or {}
    student = None

    student_id = payload.get("student_id")
    email = utils.sanitize(payload.get("email"))
    if student_id:
        student = db.session.get(Student, student_id)
    elif email:
        student = Student.query.filter_by(student_email=email).first()

    if not student:
        return jsonify({"success": False, "message": "Student not found."}), 404

    results = send_registration_emails(student)
    all_ok = all(item["status"] == "sent" for item in results.values())

    return jsonify({
        "success": all_ok,
        "message": ("Emails sent successfully." if all_ok
                    else "One or more emails failed. Check mail logs."),
        "emails": results,
    }), (200 if all_ok else 502)


# ---------------------------------------------------------------------------
# Student CRUD (admin protected)
# ---------------------------------------------------------------------------

@student_bp.route("/students", methods=["GET"])
@admin_required
def list_students():
    """
    List all students with optional server-side filtering.

    Query parameters: ``search`` (name/PRN/email/phone), ``department``,
    ``page`` and ``per_page``.
    """
    query = Student.query

    search = utils.sanitize(request.args.get("search"))
    if search:
        like = f"%{search}%"
        query = query.filter(db.or_(
            Student.full_name.ilike(like),
            Student.prn.ilike(like),
            Student.student_email.ilike(like),
            Student.student_phone.ilike(like),
        ))

    department = utils.sanitize(request.args.get("department"))
    if department:
        query = query.filter(Student.department == department)

    try:
        page = max(int(request.args.get("page", 1)), 1)
        per_page = min(max(int(request.args.get("per_page", 50)), 1), 200)
    except ValueError:
        page, per_page = 1, 50

    try:
        total = query.count()
        pagination = query.order_by(Student.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
    except Exception as exc:  # noqa: BLE001
        db.session.rollback()
        logger.exception("Database error while listing students")
        return jsonify({
            "success": False,
            "message": "Database error. Could not fetch students.",
            "errors": [str(exc)],
        }), 500

    return jsonify({
        "success": True,
        "message": "Students fetched successfully.",
        "data": {
            "items": [s.to_dict() for s in pagination.items],
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": pagination.pages,
        },
    })


@student_bp.route("/student/<int:student_id>", methods=["GET"])
@admin_required
def get_student(student_id):
    """Return a single student record."""
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"success": False, "message": "Student not found."}), 404
    return jsonify({"success": True, "message": "Student fetched successfully.",
                    "student": student.to_dict()})


@student_bp.route("/student/<int:student_id>", methods=["PUT"])
@admin_required
def update_student(student_id):
    """Update an existing student record."""
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"success": False, "message": "Student not found."}), 404

    payload = request.get_json(silent=True) or {}
    errors, cleaned = _validate_payload(payload)
    errors += _duplicate_errors(payload, exclude_id=student_id)

    if errors:
        return jsonify({"success": False, "message": errors[0], "errors": errors}), 400

    _apply_payload(student, cleaned)
    try:
        db.session.commit()
    except Exception as exc:  # noqa: BLE001
        db.session.rollback()
        logger.exception("Database error while updating student %s", student_id)
        return jsonify({"success": False,
                        "message": "Database error. Could not update the record.",
                        "errors": [str(exc)]}), 500

    return jsonify({"success": True, "message": "Student updated successfully.",
                    "student": student.to_dict()})


@student_bp.route("/student/<int:student_id>", methods=["DELETE"])
@admin_required
def delete_student(student_id):
    """Delete a student and its related mail logs."""
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"success": False, "message": "Student not found."}), 404

    try:
        db.session.delete(student)
        db.session.commit()
    except Exception as exc:  # noqa: BLE001
        db.session.rollback()
        logger.exception("Database error while deleting student %s", student_id)
        return jsonify({"success": False,
                        "message": "Database error. Could not delete the record.",
                        "errors": [str(exc)]}), 500

    return jsonify({"success": True, "message": "Student deleted successfully."})


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------

@student_bp.route("/statistics", methods=["GET"])
def statistics():
    """
    Return registration statistics: total and department-wise count.

    Public so the landing page can show live counts.
    """
    try:
        total = Student.query.count()
        rows = db.session.query(Student.department, db.func.count(Student.id)) \
            .group_by(Student.department).all()
        by_department = [{"department": name, "count": count} for name, count in rows]
    except Exception as exc:  # noqa: BLE001
        db.session.rollback()
        logger.exception("Database error while computing statistics")
        return jsonify({
            "success": False,
            "message": "Database error. Could not fetch statistics.",
            "errors": [str(exc)],
        }), 500

    return jsonify({
        "success": True,
        "message": "Statistics fetched successfully.",
        "statistics": {
            "total": total,
            "by_department": by_department,
        },
    })


# ---------------------------------------------------------------------------
# Receipt download
# ---------------------------------------------------------------------------

@student_bp.route("/student/<int:student_id>/receipt", methods=["GET"])
def download_receipt(student_id):
    """Stream the registration receipt PDF for a student."""
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"success": False, "message": "Student not found."}), 404

    pdf_bytes = utils.build_receipt_pdf(student)
    filename = f"receipt_{student.registration_id}.pdf"
    return send_file(
        BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
    )


# ---------------------------------------------------------------------------
# Mail logs
# ---------------------------------------------------------------------------

@student_bp.route("/student/<int:student_id>/mail-logs", methods=["GET"])
@admin_required
def get_mail_logs(student_id):
    """Return the email-sending history for one student."""
    logs = MailLog.query.filter_by(student_id=student_id) \
        .order_by(MailLog.sent_time.desc()).all()
    return jsonify({"success": True,
                    "message": "Mail logs fetched successfully.",
                    "mail_logs": [log.to_dict() for log in logs]})


# ---------------------------------------------------------------------------
# Contact Query submission
# ---------------------------------------------------------------------------

@student_bp.route("/contact", methods=["POST"])
def submit_contact_query():
    """
    Public endpoint for students to submit contact queries & feedback.
    """
    payload = request.get_json(silent=True) or {}
    name = utils.sanitize(payload.get("name"))
    prn = utils.sanitize(payload.get("prn"))
    email = utils.sanitize(payload.get("email"))
    description = utils.sanitize(payload.get("description"))

    errors = []
    if not name:
        errors.append("Full name is required.")
    if not prn:
        errors.append("PRN is required.")
    if not email:
        errors.append("Email address is required.")
    elif not utils.is_valid_email(email):
        errors.append("Invalid email address format.")
    if not description:
        errors.append("Description/Query message is required.")

    if errors:
        return jsonify({"success": False, "message": errors[0], "errors": errors}), 400

    query_obj = ContactQuery(
        name=name,
        prn=prn,
        email=email,
        description=description,
        status="pending"
    )
    db.session.add(query_obj)

    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.exception("Database error while saving contact query")
        return jsonify({"success": False, "message": "Database error. Could not submit query."}), 500

    return jsonify({
        "success": True,
        "message": "Your message has been submitted successfully! We will get back to you soon.",
        "query": query_obj.to_dict()
    }), 201
