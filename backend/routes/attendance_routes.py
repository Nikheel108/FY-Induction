"""
Attendance endpoints: public submission + admin management + CSV/Excel export.
"""

import csv
import io
import json
import logging
import uuid
from datetime import date, datetime, timedelta

from flask import Blueprint, jsonify, request, g, send_file
from openpyxl import Workbook
from sqlalchemy import or_, and_

from models import Student, Session, Attendance, EventSession
from services.database import db
from services.utils import admin_required

attendance_bp = Blueprint("attendance", __name__, url_prefix="/api")
logger = logging.getLogger(__name__)


def get_location_from_ip(ip):
    """Fetch city and country from ip-api.com (free, no API key)."""
    try:
        url = f"http://ip-api.com/json/{ip}?fields=city,country"
        with urlopen(url, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            if data.get("city") and data.get("country"):
                return f"{data['city']}, {data['country']}"
    except Exception as e:
        logger.warning("Geolocation failed for %s: %s", ip, e)
    return None


def get_or_create_session():
    """Retrieve session from cookie 'session_id' or create a new one."""
    session_id = request.cookies.get("session_id")
    session_obj = None

    if session_id:
        session_obj = Session.query.filter_by(session_id=session_id).first()

    if not session_obj:
        # Create new session
        new_id = str(uuid.uuid4())
        ip = request.headers.get("X-Forwarded-For", request.remote_addr)
        if ip and "," in ip:
            ip = ip.split(",")[0].strip()
        user_agent = request.headers.get("User-Agent", "")
        location = get_location_from_ip(ip) if ip else None

        session_obj = Session(
            session_id=new_id,
            ip_address=ip,
            location=location,
            user_agent=user_agent[:255]
        )
        db.session.add(session_obj)
        db.session.commit()
        g.new_session = True
    else:
        g.new_session = False

    g.session_obj = session_obj
    return session_obj


@attendance_bp.before_request
def attach_session():
    """Make session available in request context."""
    get_or_create_session()


@attendance_bp.after_request
def add_session_cookie(response):
    """If a new session was created, set the cookie."""
    if hasattr(g, 'new_session') and g.new_session:
        session_id = g.session_obj.session_id
        response.set_cookie('session_id', session_id, max_age=31536000,
                            httponly=True, samesite='Lax')
    return response


# ----- Event Sessions (Admin) -----

@attendance_bp.route("/admin/event-sessions", methods=["POST"])
@admin_required
def create_event_session():
    """Create a new time-bound attendance session."""
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    duration = data.get("duration_minutes")
    start_time_str = data.get("start_time")
    resource_speaker = data.get("resource_speaker", "-")
    location = data.get("location", "-")
    
    if not title or not duration or not start_time_str:
        return jsonify({"success": False, "message": "Missing required fields."}), 400
        
    try:
        duration = int(duration)
        start_time = datetime.fromisoformat(start_time_str.replace("Z", "+00:00"))
        # Store as naive UTC
        start_time = start_time.replace(tzinfo=None)
    except ValueError:
        return jsonify({"success": False, "message": "Invalid duration or start time format."}), 400

    es = EventSession(
        title=title, 
        start_time=start_time, 
        duration_minutes=duration,
        resource_speaker=resource_speaker,
        location=location
    )
    db.session.add(es)
    db.session.commit()
    return jsonify({"success": True, "message": "Session created.", "session": es.to_dict()}), 201


@attendance_bp.route("/admin/event-sessions", methods=["GET"])
@admin_required
def list_event_sessions():
    """List all event sessions."""
    sessions = EventSession.query.order_by(EventSession.start_time.desc()).all()
    return jsonify({"success": True, "sessions": [s.to_dict() for s in sessions]})


@attendance_bp.route("/admin/event-sessions/<int:session_id>", methods=["DELETE"])
@admin_required
def delete_event_session(session_id):
    """Delete an event session."""
    es = db.session.get(EventSession, session_id)
    if not es:
        return jsonify({"success": False, "message": "Event session not found."}), 404
        
    try:
        # Check if attendance records exist for this session
        count = Attendance.query.filter_by(event_session_id=session_id).count()
        if count > 0:
            return jsonify({"success": False, "message": f"Cannot delete session. {count} attendance records are linked to it."}), 400
            
        db.session.delete(es)
        db.session.commit()
        return jsonify({"success": True, "message": "Event session deleted successfully."})
    except Exception as e:
        db.session.rollback()
        logger.exception("Failed to delete event session")
        return jsonify({"success": False, "message": "Database error while deleting."}), 500


# ----- Public endpoint for active session -----

@attendance_bp.route("/attendance/active-session", methods=["GET"])
def get_active_session():
    """
    Returns the currently active event session.
    Active means current UTC time is between start_time and (start_time + duration + 5 mins).
    """
    now = datetime.utcnow()
    # Find the most recently started session that is still active
    # (In case of overlap, take the most recent one)
    sessions = EventSession.query.filter(EventSession.start_time <= now).order_by(EventSession.start_time.desc()).limit(5).all()
    
    for s in sessions:
        end_time = s.start_time + timedelta(minutes=s.duration_minutes + 5)
        if now <= end_time:
            return jsonify({"success": True, "active_session": s.to_dict()})
            
    return jsonify({"success": True, "active_session": None})


def get_current_active_session():
    """Helper to get active session on server-side"""
    now = datetime.utcnow()
    sessions = EventSession.query.filter(EventSession.start_time <= now).order_by(EventSession.start_time.desc()).limit(5).all()
    for s in sessions:
        end_time = s.start_time + timedelta(minutes=s.duration_minutes + 5)
        if now <= end_time:
            return s
    return None


def apply_filters(query):
    """Apply query filters from request args (reused by list and export)."""
    date_str = request.args.get("date")
    if date_str:
        try:
            filter_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            query = query.filter(Attendance.date == filter_date)
        except ValueError:
            pass

    prn = request.args.get("prn", "").strip()
    if prn:
        query = query.filter(Attendance.prn == prn)

    name = request.args.get("student_name", "").strip()
    if name:
        query = query.filter(Student.full_name.ilike(f"%{name}%"))
        
    event_session_id = request.args.get("event_session_id")
    if event_session_id:
        query = query.filter(Attendance.event_session_id == event_session_id)
        
    return query


# ----- Public endpoint for attendance submission -----
@attendance_bp.route("/attendance", methods=["POST"])
def submit_attendance():
    """
    Submit attendance for the currently active session.
    Requires PRN.
    """
    data = request.get_json() or {}
    prn = data.get("prn", "").strip()

    if not prn:
        return jsonify({"success": False, "message": "PRN is required."}), 400

    # Validate PRN exists
    student = Student.query.filter_by(prn=prn).first()
    if not student:
        return jsonify({"success": False, "message": "Invalid PRN. Student not found."}), 404

    # Ensure there is an active session
    active_session = get_current_active_session()
    if not active_session:
        return jsonify({"success": False, "message": "No active attendance session at the moment."}), 400

    # Ensure this student hasn't already marked attendance for this event session
    existing = Attendance.query.filter_by(
        prn=prn,
        event_session_id=active_session.id
    ).first()
    if existing:
        return jsonify({
            "success": False,
            "message": "You have already marked attendance for this session."
        }), 400

    # Ensure this browser session hasn't marked attendance for this event session yet
    existing_browser = Attendance.query.filter_by(
        session_id=g.session_obj.id,
        event_session_id=active_session.id
    ).first()
    if existing_browser:
        return jsonify({
            "success": False,
            "message": "This device has already been used to mark attendance for this session."
        }), 400

    # Create attendance record
    att = Attendance(
        prn=prn,
        session_id=g.session_obj.id,
        event_session_id=active_session.id,
        date=date.today(),
        status="present"
    )
    db.session.add(att)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Attendance recorded successfully.",
        "attendance": {
            "id": att.id,
            "prn": att.prn,
            "event_session_title": active_session.title,
            "date": att.date.isoformat(),
            "time": att.created_at.isoformat(),
        }
    }), 201


# ----- Admin endpoints (protected) -----
@attendance_bp.route("/admin/attendance", methods=["GET"])
@admin_required
def list_attendance():
    """
    List attendance records with filters.
    Query params: date (YYYY-MM-DD), prn, student_name (search), page, per_page.
    """
    query = Attendance.query.join(Session).join(Student, Attendance.prn == Student.prn)
    query = apply_filters(query)

    # Pagination
    try:
        page = max(int(request.args.get("page", 1)), 1)
        per_page = min(max(int(request.args.get("per_page", 20)), 1), 100)
    except ValueError:
        page, per_page = 1, 20

    total = query.count()
    pagination = query.order_by(Attendance.date.desc(), Attendance.created_at.desc()) \
                     .paginate(page=page, per_page=per_page, error_out=False)

    # Build response with session details
    items = []
    for att in pagination.items:
        student = Student.query.filter_by(prn=att.prn).first()
        items.append({
            "id": att.id,
            "prn": att.prn,
            "student_name": student.full_name if student else att.prn,
            "department": student.department if student else "-",
            "date": att.date.isoformat(),
            "status": att.status,
            "event_session_title": att.event_session.title if att.event_session else "-",
            "session": {
                "ip": att.browser_session.ip_address if att.browser_session else "Unknown",
                "location": att.browser_session.location if att.browser_session else "Unknown",
                "user_agent": att.browser_session.user_agent if att.browser_session else "Unknown"
            }
        })

    return jsonify({
        "success": True,
        "message": "Attendance fetched successfully.",
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": pagination.pages
        }
    })


@attendance_bp.route("/admin/attendance/<int:attendance_id>", methods=["DELETE"])
@admin_required
def delete_attendance(attendance_id):
    """Admin endpoint to demark (delete) an attendance record."""
    att = db.session.get(Attendance, attendance_id)
    if not att:
        return jsonify({"success": False, "message": "Attendance record not found."}), 404
        
    db.session.delete(att)
    db.session.commit()
    return jsonify({"success": True, "message": "Attendance record deleted successfully."})


@attendance_bp.route("/admin/attendance/mark", methods=["POST"])
@admin_required
def admin_mark_attendance():
    """Admin endpoint to manually mark attendance for a student."""
    data = request.get_json() or {}
    prn = data.get("prn", "").strip()
    event_session_id = data.get("event_session_id")

    if not prn or not event_session_id:
        return jsonify({"success": False, "message": "PRN and Event Session are required."}), 400

    student = Student.query.filter_by(prn=prn).first()
    if not student:
        return jsonify({"success": False, "message": f"Student with PRN {prn} not found."}), 404

    # Ensure this student hasn't already marked attendance for this event session
    existing = Attendance.query.filter_by(prn=prn, event_session_id=event_session_id).first()
    if existing:
        return jsonify({"success": False, "message": f"Student {prn} is already marked present for this session."}), 400

    # Create attendance record (using admin's session for audit)
    att = Attendance(
        prn=prn,
        session_id=g.session_obj.id,
        event_session_id=event_session_id,
        date=date.today(),
        status="present (manual by admin)"
    )
    db.session.add(att)
    db.session.commit()

    return jsonify({"success": True, "message": f"Successfully marked {prn} as present."}), 201


@attendance_bp.route("/admin/attendance/export/csv", methods=["GET"])
@admin_required
def export_attendance_csv():
    """
    Export attendance records as CSV (respects filters).
    """
    query = Attendance.query.join(Session).join(Student, Attendance.prn == Student.prn)
    query = apply_filters(query)

    records = query.order_by(Attendance.date.desc(), Attendance.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    # Header
    writer.writerow(['Student Name', 'PRN', 'Department', 'Event Session', 'Date', 'Status', 'IP', 'Location', 'User Agent'])
    for att in records:
        student = Student.query.filter_by(prn=att.prn).first()
        writer.writerow([
            student.full_name if student else att.prn,
            att.prn,
            student.department if student else '-',
            att.event_session.title if att.event_session else '-',
            att.date.isoformat(),
            att.status,
            att.browser_session.ip_address if att.browser_session else '',
            (att.browser_session.location if att.browser_session else '') or '',
            (att.browser_session.user_agent if att.browser_session else '') or ''
        ])

    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name='attendance_export.csv'
    )


@attendance_bp.route("/admin/attendance/export/excel", methods=["GET"])
@admin_required
def export_attendance_excel():
    """
    Export attendance records as Excel (.xlsx) (respects filters).
    """
    query = Attendance.query.join(Session).join(Student, Attendance.prn == Student.prn)
    query = apply_filters(query)

    records = query.order_by(Attendance.date.desc(), Attendance.created_at.desc()).all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Attendance"
    # Headers
    headers = ['Student Name', 'PRN', 'Department', 'Event Session', 'Date', 'Status', 'IP', 'Location', 'User Agent']
    ws.append(headers)

    for att in records:
        student = Student.query.filter_by(prn=att.prn).first()
        ws.append([
            student.full_name if student else att.prn,
            att.prn,
            student.department if student else '-',
            att.event_session.title if att.event_session else '-',
            att.date.isoformat(),
            att.status,
            att.browser_session.ip_address if att.browser_session else '',
            (att.browser_session.location if att.browser_session else '') or '',
            (att.browser_session.user_agent if att.browser_session else '') or ''
        ])

    # Save to BytesIO
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='attendance_export.xlsx'
    )