"""
Admin authentication endpoints.

A stateless signed token (itsdangerous) is issued on login and must be sent by
the frontend as ``Authorization: Bearer <token>`` on every admin API call.
Credentials are read from environment variables only.
"""

import logging

from flask import Blueprint, current_app, jsonify, request
import threading

from services.utils import admin_required, generate_admin_token, validate_admin_token
from services.email_service import send_broadcast_emails
from services.database import db
from models import ValidPRN, Student, ContactQuery

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

logger = logging.getLogger(__name__)


@admin_bp.route("/login", methods=["POST"])
def login():
    """Authenticate an admin and return a signed token."""
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""

    expected_user = current_app.config["ADMIN_USERNAME"]
    expected_pass = current_app.config["ADMIN_PASSWORD"]

    if username != expected_user or password != expected_pass:
        logger.warning("Failed admin login attempt for username %r", username)
        return jsonify({"success": False, "message": "Invalid username or password."}), 401

    token = generate_admin_token(current_app._get_current_object(), username)
    return jsonify({
        "success": True,
        "message": "Login successful.",
        "token": token,
        "username": username,
        "expires_in_hours": current_app.config["ADMIN_TOKEN_TTL_HOURS"],
    })


@admin_bp.route("/me", methods=["GET"])
@admin_required
def me():
    """
    Validate the current token.

    Used by the frontend on page load to verify a stored token is still valid.
    """
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else ""
    data = validate_admin_token(current_app._get_current_object(), token)
    return jsonify({"success": True, "username": data.get("username")})


@admin_bp.route("/logout", methods=["POST"])
def logout():
    """
    Logout endpoint.

    Tokens are stateless so there is nothing to revoke server-side;
    the client simply discards the token. This endpoint exists for a clean client flow.
    """
    return jsonify({"success": True, "message": "Logged out successfully."})


@admin_bp.route("/broadcast", methods=["POST"])
@admin_required
def broadcast_email():
    """
    Initiate a broadcast email to all enrolled students.
    Runs in a background thread to prevent HTTP timeouts.
    """
    payload = request.get_json(silent=True) or {}
    app = current_app._get_current_object()
    
    # Spawn background thread
    thread = threading.Thread(
        target=send_broadcast_emails,
        args=(app, payload)
    )
    thread.daemon = True
    thread.start()
    
    return jsonify({
        "success": True,
        "message": "Broadcast started successfully. Emails are being sent in the background."
    })


@admin_bp.route("/upload-prns", methods=["POST"])
@admin_required
def upload_prns():
    """
    Upload a list of valid PRNs.
    Expects JSON: { "prns": ["PRN1", "PRN2", ...] }
    """
    from models import ValidPRN
    from services.database import db
    
    payload = request.get_json(silent=True) or {}
    prns = payload.get("prns", [])
    
    if not isinstance(prns, list):
        return jsonify({"success": False, "message": "Invalid payload format. Expected a list of PRNs."}), 400
        
    added = 0
    for prn in prns:
        prn = str(prn).strip()
        if not prn:
            continue
        # Check if exists
        exists = ValidPRN.query.filter_by(prn=prn).first()
        if not exists:
            vprn = ValidPRN(prn=prn)
            db.session.add(vprn)
            added += 1
            
    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.exception("Database error while uploading PRNs")
        return jsonify({"success": False, "message": "Database error.", "errors": [str(exc)]}), 500
        
    return jsonify({
        "success": True, 
        "message": f"Successfully added {added} new PRNs.",
        "added": added
    })

@admin_bp.route("/student/<int:student_id>/reset-password", methods=["POST"])
@admin_required
def reset_student_password(student_id):
    student = Student.query.get(student_id)
    if not student:
        return jsonify({"success": False, "message": "Student not found."}), 404

    data = request.get_json() or {}
    new_password = data.get("new_password")
    
    if not new_password:
        return jsonify({"success": False, "message": "New password is required."}), 400

    student.set_password(new_password)
    student.is_first_login = True
    db.session.commit()
    
    return jsonify({"success": True, "message": "Password reset successfully."})

@admin_bp.route("/valid-prns", methods=["GET"])
@admin_required
def list_valid_prns():
    """List all valid PRNs and their registration status."""
    valid_prns = ValidPRN.query.order_by(ValidPRN.created_at.desc()).all()
    # To check registration status, we can query students with these PRNs
    registered_students = {s.prn: s for s in Student.query.all()}
    
    results = []
    for vp in valid_prns:
        data = vp.to_dict()
        student = registered_students.get(vp.prn)
        if student:
            data["registered"] = True
            data["student_name"] = student.full_name
            data["student_id"] = student.id
        else:
            data["registered"] = False
            data["student_name"] = None
        results.append(data)
        
    return jsonify({"success": True, "valid_prns": results})

@admin_bp.route("/valid-prns/<int:id>", methods=["PUT"])
@admin_required
def edit_valid_prn(id):
    vp = ValidPRN.query.get(id)
    if not vp:
        return jsonify({"success": False, "message": "PRN not found"}), 404
    data = request.get_json()
    new_prn = data.get("prn", "").strip()
    if not new_prn:
        return jsonify({"success": False, "message": "PRN is required"}), 400
        
    # check unique
    if new_prn != vp.prn:
        exists = ValidPRN.query.filter_by(prn=new_prn).first()
        if exists:
            return jsonify({"success": False, "message": "PRN already exists in the valid list"}), 400
            
    vp.prn = new_prn
    if "expected_name" in data:
        vp.expected_name = data["expected_name"] or None
    if "expected_department" in data:
        vp.expected_department = data["expected_department"] or None
        
    db.session.commit()
    return jsonify({"success": True, "message": "Updated PRN", "valid_prn": vp.to_dict()})

@admin_bp.route("/valid-prns/<int:id>", methods=["DELETE"])
@admin_required
def delete_valid_prn(id):
    vp = ValidPRN.query.get(id)
    if not vp:
        return jsonify({"success": False, "message": "PRN not found"}), 404
    db.session.delete(vp)
    db.session.commit()
    return jsonify({"success": True, "message": "Deleted PRN"})

@admin_bp.route("/upload-file", methods=["POST"])
@admin_required
def upload_file():
    """Handle CSV/Excel file uploads for students."""
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "message": "No selected file"}), 400

    added = 0
    updated = 0
    
    try:
        if file.filename.endswith('.csv'):
            import csv
            import io
            stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
            csv_input = csv.DictReader(stream)
            # Find the PRN column
            fieldnames = [f.lower() for f in csv_input.fieldnames or []]
            prn_col = None
            name_col = None
            dept_col = None
            
            for i, f in enumerate(fieldnames):
                if 'prn' in f: prn_col = csv_input.fieldnames[i]
                elif 'name' in f: name_col = csv_input.fieldnames[i]
                elif 'dept' in f or 'department' in f: dept_col = csv_input.fieldnames[i]
                
            if not prn_col:
                return jsonify({"success": False, "message": "Could not find a 'PRN' column in the CSV."}), 400
                
            for row in csv_input:
                prn = row.get(prn_col, "").strip()
                if not prn: continue
                
                vp = ValidPRN.query.filter_by(prn=prn).first()
                is_new = False
                if not vp:
                    vp = ValidPRN(prn=prn)
                    db.session.add(vp)
                    is_new = True
                    added += 1
                else:
                    updated += 1
                    
                if name_col and row.get(name_col):
                    vp.expected_name = row[name_col].strip()
                if dept_col and row.get(dept_col):
                    vp.expected_department = row[dept_col].strip()
                    
            db.session.commit()

        elif file.filename.endswith(('.xls', '.xlsx')):
            import openpyxl
            wb = openpyxl.load_workbook(file)
            sheet = wb.active
            headers = [cell.value for cell in sheet[1]]
            prn_idx = -1
            name_idx = -1
            dept_idx = -1
            
            for i, h in enumerate(headers):
                if h and isinstance(h, str):
                    h_lower = h.lower()
                    if 'prn' in h_lower: prn_idx = i
                    elif 'name' in h_lower: name_idx = i
                    elif 'dept' in h_lower or 'department' in h_lower: dept_idx = i
            
            if prn_idx == -1:
                return jsonify({"success": False, "message": "Could not find a 'PRN' column in the Excel file."}), 400
                
            for row in sheet.iter_rows(min_row=2, values_only=True):
                if len(row) > prn_idx and row[prn_idx]:
                    prn = str(row[prn_idx]).strip()
                    if not prn: continue
                    
                    vp = ValidPRN.query.filter_by(prn=prn).first()
                    if not vp:
                        vp = ValidPRN(prn=prn)
                        db.session.add(vp)
                        added += 1
                    else:
                        updated += 1
                        
                    if name_idx != -1 and len(row) > name_idx and row[name_idx]:
                        vp.expected_name = str(row[name_idx]).strip()
                    if dept_idx != -1 and len(row) > dept_idx and row[dept_idx]:
                        vp.expected_department = str(row[dept_idx]).strip()
                        
            db.session.commit()
        else:
            return jsonify({"success": False, "message": "Unsupported file format. Please upload CSV or Excel."}), 400
            
    except Exception as e:
        logger.exception("Error parsing file")
        return jsonify({"success": False, "message": f"Error parsing file: {str(e)}"}), 500

    return jsonify({"success": True, "message": f"Successfully processed file. Added {added} new PRNs, updated {updated}."})


@admin_bp.route("/contact-queries", methods=["GET"])
@admin_required
def list_contact_queries():
    """List all contact queries with optional status filter."""
    status_filter = request.args.get("status")
    query = ContactQuery.query

    if status_filter and status_filter in ("pending", "resolved"):
        query = query.filter_by(status=status_filter)

    queries = query.order_by(ContactQuery.created_at.desc()).all()
    pending_count = ContactQuery.query.filter_by(status="pending").count()
    total_count = ContactQuery.query.count()

    return jsonify({
        "success": True,
        "queries": [q.to_dict() for q in queries],
        "stats": {
            "pending": pending_count,
            "total": total_count,
        }
    })


@admin_bp.route("/contact-queries/<int:query_id>", methods=["PATCH"])
@admin_required
def update_contact_query_status(query_id):
    """Update status of a contact query (e.g. pending -> resolved)."""
    q = db.session.get(ContactQuery, query_id)
    if not q:
        return jsonify({"success": False, "message": "Query not found."}), 404

    data = request.get_json() or {}
    new_status = data.get("status", "").strip().lower()
    if new_status not in ("pending", "resolved"):
        return jsonify({"success": False, "message": "Invalid status value."}), 400

    q.status = new_status
    db.session.commit()
    return jsonify({"success": True, "message": "Query status updated.", "query": q.to_dict()})


@admin_bp.route("/contact-queries/<int:query_id>", methods=["DELETE"])
@admin_required
def delete_contact_query(query_id):
    """Delete a contact query."""
    q = db.session.get(ContactQuery, query_id)
    if not q:
        return jsonify({"success": False, "message": "Query not found."}), 404

    db.session.delete(q)
    db.session.commit()
    return jsonify({"success": True, "message": "Query deleted successfully."})


@admin_bp.route("/highlights/generate-description", methods=["POST", "OPTIONS"])
def admin_generate_highlight_description():
    """Generate a ~60 word event description using Gemini API with intelligent fallback."""
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200
    from routes.highlight_routes import generate_highlight_description
    return generate_highlight_description()


