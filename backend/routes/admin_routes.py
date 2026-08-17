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
