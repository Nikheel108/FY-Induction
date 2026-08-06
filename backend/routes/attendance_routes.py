"""
Attendance endpoints: public submission + admin management + CSV/Excel export.
"""

import csv
import io
import json
import logging
import uuid
from datetime import date, datetime
from urllib.request import urlopen

from flask import Blueprint, jsonify, request, g, send_file
from openpyxl import Workbook
from sqlalchemy import or_, and_

from models import Student, Session, Attendance
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
    return query


# ----- Public endpoint for attendance submission -----
@attendance_bp.route("/attendance", methods=["POST"])
def submit_attendance():
    """
    Submit attendance for today.
    Body: {"prn": "123", "date": "2026-08-07"} (date optional, defaults today)
    """
    data = request.get_json(silent=True) or {}
    prn = data.get("prn", "").strip()
    date_str = data.get("date", "").strip()

    if not prn:
        return jsonify({"success": False, "message": "PRN is required."}), 400

    # Validate date
    if date_str:
        try:
            submitted_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"success": False, "message": "Invalid date format. Use YYYY-MM-DD."}), 400
    else:
        submitted_date = date.today()

    # Only today's date is allowed
    if submitted_date != date.today():
        return jsonify({
            "success": False,
            "message": "Attendance can only be submitted for today."
        }), 400

    # Check if PRN exists in students table
    student = Student.query.filter_by(prn=prn).first()
    if not student:
        return jsonify({"success": False, "message": "Student with this PRN not found."}), 404

    # Check if this session already marked attendance today
    existing = Attendance.query.filter_by(
        session_id=g.session_obj.id,
        date=submitted_date
    ).first()
    if existing:
        return jsonify({
            "success": False,
            "message": "This device has already marked attendance today."
        }), 400

    # Create attendance record
    att = Attendance(
        prn=prn,
        session_id=g.session_obj.id,
        date=submitted_date,
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
            "date": att.date.isoformat(),
            "student_name": student.full_name,
            "department": student.department
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
            "session": {
                "ip": att.session.ip_address,
                "location": att.session.location,
                "user_agent": att.session.user_agent
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
    writer.writerow(['Student Name', 'PRN', 'Department', 'Date', 'Status', 'IP', 'Location', 'User Agent'])
    for att in records:
        student = Student.query.filter_by(prn=att.prn).first()
        writer.writerow([
            student.full_name if student else att.prn,
            att.prn,
            student.department if student else '-',
            att.date.isoformat(),
            att.status,
            att.session.ip_address,
            att.session.location or '',
            att.session.user_agent or ''
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
    headers = ['Student Name', 'PRN', 'Department', 'Date', 'Status', 'IP', 'Location', 'User Agent']
    ws.append(headers)

    for att in records:
        student = Student.query.filter_by(prn=att.prn).first()
        ws.append([
            student.full_name if student else att.prn,
            att.prn,
            student.department if student else '-',
            att.date.isoformat(),
            att.status,
            att.session.ip_address,
            att.session.location or '',
            att.session.user_agent or ''
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