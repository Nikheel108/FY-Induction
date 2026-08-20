from flask import Blueprint, jsonify, request, send_file
from models import Highlight
from services.database import db
from services.utils import admin_required
import logging
import base64
from io import BytesIO

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage
from reportlab.lib.units import inch
from reportlab.lib import colors

highlights_bp = Blueprint("highlights", __name__, url_prefix="/api")
logger = logging.getLogger(__name__)

@highlights_bp.route("/highlights", methods=["GET"])
def get_highlights():
    """Fetch all highlights in reverse chronological order with optional session filter."""
    session_id = request.args.get("event_session_id")
    query = Highlight.query
    if session_id:
        try:
            query = query.filter_by(event_session_id=int(session_id))
        except ValueError:
            pass

    highlights = query.order_by(Highlight.created_at.desc()).all()
    return jsonify({
        "success": True,
        "highlights": [h.to_dict() for h in highlights]
    })

@highlights_bp.route("/admin/highlights", methods=["POST"])
@admin_required
def create_highlight():
    """Admin endpoint to create a new highlight."""
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    image_base64 = data.get("image_base64", "").strip()
    resource_speaker = data.get("resource_speaker", "-").strip() or "-"
    event_session_id = data.get("event_session_id")

    if not title or not description or not image_base64:
        return jsonify({"success": False, "message": "Title, description, and image are required."}), 400

    highlight = Highlight(
        title=title,
        description=description,
        image_base64=image_base64,
        resource_speaker=resource_speaker,
        event_session_id=event_session_id if event_session_id else None
    )
    db.session.add(highlight)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Highlight added successfully.",
        "highlight": highlight.to_dict()
    }), 201

@highlights_bp.route("/admin/highlights/<int:highlight_id>", methods=["PUT"])
@admin_required
def update_highlight(highlight_id):
    """Admin endpoint to update an existing highlight."""
    highlight = db.session.get(Highlight, highlight_id)
    if not highlight:
        return jsonify({"success": False, "message": "Highlight not found."}), 404

    data = request.get_json() or {}
    if "title" in data and data["title"].strip():
        highlight.title = data["title"].strip()
    if "description" in data and data["description"].strip():
        highlight.description = data["description"].strip()
    if "image_base64" in data and data["image_base64"].strip():
        highlight.image_base64 = data["image_base64"].strip()
    if "resource_speaker" in data:
        highlight.resource_speaker = data["resource_speaker"].strip() or "-"
    if "event_session_id" in data:
        highlight.event_session_id = data["event_session_id"] if data["event_session_id"] else None

    db.session.commit()
    return jsonify({
        "success": True,
        "message": "Highlight updated successfully.",
        "highlight": highlight.to_dict()
    })

@highlights_bp.route("/admin/highlights/<int:highlight_id>", methods=["DELETE"])
@admin_required
def delete_highlight(highlight_id):
    """Admin endpoint to delete a highlight."""
    highlight = db.session.get(Highlight, highlight_id)
    if not highlight:
        return jsonify({"success": False, "message": "Highlight not found."}), 404

    db.session.delete(highlight)
    db.session.commit()

    return jsonify({"success": True, "message": "Highlight deleted successfully."})

from reportlab.lib.utils import ImageReader
from reportlab.platypus import Table, TableStyle
from datetime import datetime

def _on_page(canvas, doc):
    canvas.saveState()
    
    # Use A4 size which is standard
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    width, height = A4
    margin = 15 * mm
    
    # Draw proper box border for each page
    canvas.setStrokeColor(colors.HexColor("#334155"))
    canvas.setLineWidth(1)
    canvas.rect(margin, margin, width - 2*margin, height - 2*margin)
    
    # --- Header ---
    import os, requests
    
    # Try fetching the logo from local frontend if exists, otherwise URL
    logo_path = None
    local_logo = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "logo.png")
    if os.path.exists(local_logo):
        logo_path = local_logo
    else:
        try:
            r = requests.get("https://fy-induction.vercel.app/logo.png")
            if r.status_code == 200:
                from io import BytesIO
                logo_path = BytesIO(r.content)
        except:
            pass
    
    if logo_path:
        try:
            img = ImageReader(logo_path)
            # Draw on left side
            canvas.drawImage(img, margin + 5*mm, height - margin - 22*mm, width=20*mm, height=20*mm, preserveAspectRatio=True)
        except Exception as e:
            logger.error(f"Error drawing logo: {e}")
            
    # College Name & Address under it (Left Side, next to logo)
    canvas.setFont("Helvetica-Bold", 14)
    canvas.drawString(margin + 30*mm, height - margin - 10*mm, "MIT Academy of Engineering")
    canvas.setFont("Helvetica", 10)
    canvas.drawString(margin + 30*mm, height - margin - 15*mm, "Alandi, Pune, Maharashtra 412105")
    
    # Date & Time top right
    now_str = datetime.now().strftime("%d %b %Y, %H:%M")
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(width - margin - 5*mm, height - margin - 10*mm, f"Generated: {now_str}")
    
    # Line under header info
    canvas.line(margin, height - margin - 25*mm, width - margin, height - margin - 25*mm)
    
    # Heading in center
    canvas.setFont("Helvetica-Bold", 16)
    canvas.setFillColor(colors.HexColor("#1e3a8a"))
    canvas.drawCentredString(width / 2.0, height - margin - 35*mm, "Student Induction program (CSE AI&ML) 2026-27")
    
    # --- Footer ---
    canvas.line(margin, margin + 15*mm, width - margin, margin + 15*mm)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.setFillColor(colors.HexColor("#0f172a"))
    canvas.drawCentredString(width / 2.0, margin + 7*mm, "MIT Academy of Engineering")
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(width - margin - 5*mm, margin + 7*mm, f"Page {doc.page}")
    
    canvas.restoreState()


@highlights_bp.route("/admin/highlights/generate-description", methods=["POST", "OPTIONS"])
def generate_highlight_description():
    """Generate a ~60 word event description using Gemini API with intelligent fallback."""
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    import os, requests
    from datetime import datetime
    data = request.get_json() or {}
    title = data.get("title", "").strip() or "Induction Event"
    speaker = data.get("resource_speaker", "").strip() or "Resource Speaker"
    date_str = data.get("date", "").strip() or datetime.now().strftime("%d %b %Y")
    time_str = data.get("time", "").strip() or "10:00 AM"
    notes = data.get("notes", "").strip() or "Key session topics, interactive QA, and student learning outcomes."

    gemini_key = os.getenv("GEMINI_API_KEY")
    generated_text = None

    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            prompt = (
                f"Write a concise, professional event highlight description (~60 words) for an academic induction program.\n"
                f"Event Title/Topic: {title}\n"
                f"Faculty/Speaker: {speaker}\n"
                f"Date & Time: {date_str} at {time_str}\n"
                f"Highlights/Notes: {notes}\n"
                f"Format as a single cohesive, polished paragraph of about 60 words containing session highlights, date, faculty name, and time."
            )
            payload = {"contents": [{"parts": [{"text": prompt}]}]}
            resp = requests.post(url, json=payload, timeout=8)
            if resp.status_code == 200:
                res_data = resp.json()
                generated_text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}")

    if not generated_text:
        # Fallback structured ~60-word professional description synthesis
        generated_text = (
            f"The session '{title}' was successfully conducted on {date_str} at {time_str} by distinguished faculty member {speaker}. "
            f"The session focused on {notes if notes else 'empowering students with essential academic skills, industry insights, and career orientation'}. "
            f"Students actively participated in the interactive discussion, gaining key insights and practical guidance for their academic induction journey."
        )

    return jsonify({
        "success": True,
        "description": generated_text
    })


@highlights_bp.route("/admin/highlights/export/pdf", methods=["GET"])
@admin_required
def export_highlights_pdf():
    """Generate a PDF report of all highlights centered with images top and details below."""
    speaker_filter = request.args.get("speaker")
    
    query = Highlight.query
    if speaker_filter:
        query = query.filter(Highlight.resource_speaker == speaker_filter)
        
    highlights = query.order_by(Highlight.resource_speaker.asc(), Highlight.created_at.desc()).all()
    
    # Group by speaker
    grouped = {}
    for h in highlights:
        speaker = h.resource_speaker or "Unknown"
        if speaker not in grouped:
            grouped[speaker] = []
        grouped[speaker].append(h)
        
    buffer = BytesIO()
    
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    
    margin = 15 * mm
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=margin + 5*mm, 
        leftMargin=margin + 5*mm, 
        topMargin=margin + 45*mm,  # Leave space for header
        bottomMargin=margin + 20*mm # Leave space for footer
    )
    
    styles = getSampleStyleSheet()
    
    speaker_style = styles['Heading2']
    speaker_style.textColor = colors.HexColor("#1e293b")
    speaker_style.spaceBefore = 10
    speaker_style.spaceAfter = 15
    
    desc_style = styles['Normal']
    desc_style.leading = 14
    
    elements = []
    
    if not grouped:
        elements.append(Paragraph("No activities recorded yet.", desc_style))
    
    for speaker, items in grouped.items():
        elements.append(Paragraph(f"<b>Resource Speaker:</b> {speaker}", speaker_style))
        
        for item in items:
            img = None
            # Handle image
            if item.image_base64:
                try:
                    img_data = item.image_base64
                    if "," in img_data:
                        img_data = img_data.split(",")[1]
                    
                    img_bytes = base64.b64decode(img_data)
                    img_buffer = BytesIO(img_bytes)
                    
                    img = RLImage(img_buffer)
                    img.hAlign = 'CENTER'
                    img_width = 3.8 * inch
                    img.drawHeight = img_width * (img.imageHeight / img.imageWidth)
                    img.drawWidth = img_width
                except Exception as e:
                    logger.error(f"Failed to process image for highlight {item.id}: {e}")

            if img:
                elements.append(img)
                elements.append(Spacer(1, 8))
            
            # Form details section underneath centered image
            created_date_str = item.created_at.strftime("%d %b %Y, %H:%M") if item.created_at else "-"
            details_text = f"""
            <b>Event Name:</b> {item.title}<br/>
            <b>Faculty / Speaker:</b> {item.resource_speaker or '-'}<br/>
            <b>Date & Time:</b> {created_date_str}<br/><br/>
            <b>Session Highlights:</b> {item.description}
            """
            details = Paragraph(details_text, desc_style)
            
            # Card table for details
            card_table = Table([[details]], colWidths=[6.8 * inch])
            card_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
                ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                ('PADDING', (0,0), (-1,-1), 10),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ]))
            
            elements.append(card_table)
            elements.append(Spacer(1, 20))
            
    doc.build(elements, onFirstPage=_on_page, onLaterPages=_on_page)
    
    buffer.seek(0)
    return send_file(
        buffer,
        as_attachment=True,
        download_name="Activities_Report.pdf",
        mimetype="application/pdf"
    )
