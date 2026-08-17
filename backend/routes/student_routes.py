"""
Student related API endpoints.

Handles public registration, student CRUD, statistics, email re-sending, the
registration receipt download and mail-log inspection.
"""

import logging

from flask import Blueprint, current_app, jsonify, request, send_file
from io import BytesIO

from models import MailLog, Student, EventSession
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

    if not prn or not password:
        return jsonify({"success": False, "message": "PRN and password are required."}), 400

    student = Student.query.filter_by(prn=prn).first()
    if not student or not student.check_password(password):
        # We don't distinguish between bad PRN or bad password
        return jsonify({"success": False, "message": "Invalid PRN or password."}), 401

    token = generate_student_token(current_app._get_current_object(), student.id, student.prn)
    
    return jsonify({
        "success": True,
        "message": "Login successful.",
        "token": token,
        "is_first_login": student.is_first_login,
        "is_registered": bool(student.registration_id),
        "student": student.to_dict()
    })


@student_bp.route("/change-password", methods=["POST"])
@student_required
def student_change_password():
    """Allow student to change their password on first login."""
    payload = request.get_json(silent=True) or {}
    new_password = payload.get("new_password")
    
    if not new_password or len(new_password) < 6:
        return jsonify({"success": False, "message": "Password must be at least 6 characters long."}), 400

    student_id = request.student_payload["student_id"]
    student = db.session.get(Student, student_id)
    
    if not student:
        return jsonify({"success": False, "message": "Student not found."}), 404
        
    if not student.is_first_login:
        return jsonify({"success": False, "message": "Password can only be changed by admin after first login."}), 403
        
    student.set_password(new_password)
    student.is_first_login = False
    
    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.exception("Database error while changing password")
        return jsonify({"success": False, "message": "Database error.", "errors": [str(exc)]}), 500
        
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

@student_bp.route("/register", methods=["POST"])
@student_required
def register_student():
    """
    Complete the registration for the currently logged-in student.

    Request body must be the full registration form. On success the record is
    committed first and the welcome/parent emails are then attempted. Email
    failures never roll back the registration; they are reported inside the
    response and recorded in ``mail_logs``.
    """
    payload = request.get_json(silent=True) or {}
    errors, cleaned = _validate_payload(payload)

    # Make sure they are not altering their PRN
    student_id = request.student_payload["student_id"]
    student = db.session.get(Student, student_id)
    
    if not student:
        return jsonify({"success": False, "message": "Student not found."}), 404
        
    if student.registration_id:
        return jsonify({"success": False, "message": "Student is already registered."}), 400

    # Ensure PRN matches what they are authenticated as
    if cleaned["prn"] != student.prn:
        cleaned["prn"] = student.prn  # Force PRN to match

    if not errors:
        try:
            errors += _duplicate_errors(cleaned, exclude_id=student.id)
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

    student.registration_id = utils.generate_registration_id()
    _apply_payload(student, cleaned)

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

    return jsonify({
        "success": True,
        "message": "Student registered successfully.",
        "student": student.to_dict(),
    }), 201


@student_bp.route("/schedule", methods=["GET"])
def get_schedule():
    """
    Return all event sessions ordered by start time.
    """
    try:
        sessions = EventSession.query.order_by(EventSession.start_time.asc()).all()
        return jsonify({
            "success": True,
            "message": "Schedule fetched successfully.",
            "schedule": [s.to_dict() for s in sessions],
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
