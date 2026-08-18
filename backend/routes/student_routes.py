"""
Student related API endpoints.

Handles public registration, student CRUD, statistics, email re-sending, the
registration receipt download and mail-log inspection.
"""

import logging

from flask import Blueprint, current_app, jsonify, request, send_file
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
    """Authenticate a student via PRN only."""
    payload = request.get_json(silent=True) or {}
    prn = utils.sanitize(payload.get("prn"))

    if not prn:
        return jsonify({"success": False, "message": "PRN is required."}), 400

    student = Student.query.filter_by(prn=prn).first()
    if not student:
        # Check if it's a valid PRN that hasn't registered yet
        from models import ValidPRN
        is_valid = ValidPRN.query.filter_by(prn=prn).first()
        if is_valid:
            return jsonify({"success": False, "message": "PRN found, but not registered.", "needs_registration": True}), 401
        return jsonify({"success": False, "message": "Invalid PRN. Ask admin to add your PRN."}), 401

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
    """Deprecated: No passwords anymore."""
    return jsonify({"success": False, "message": "Passwords are no longer used."}), 400


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
def register_student():
    """
    Public registration endpoint.
    Requires PRN to be present in ValidPRN table.
    """
    from models import ValidPRN
    payload = request.get_json(silent=True) or {}
    errors, cleaned = _validate_payload(payload)

    prn = cleaned.get("prn")
    if prn:
        # Check if PRN is in ValidPRN table
        is_valid = ValidPRN.query.filter_by(prn=prn).first()
        if not is_valid:
            errors.append(f"PRN {prn} is not authorized for registration. Please contact admin.")
            
        # Check if student is already registered
        student = Student.query.filter_by(prn=prn).first()
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
