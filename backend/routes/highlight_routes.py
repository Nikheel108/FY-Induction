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
    """Fetch all highlights in reverse chronological order."""
    highlights = Highlight.query.order_by(Highlight.created_at.desc()).all()
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

    if not title or not description or not image_base64:
        return jsonify({"success": False, "message": "Title, description, and image are required."}), 400

    highlight = Highlight(
        title=title,
        description=description,
        image_base64=image_base64,
        resource_speaker=resource_speaker
    )
    db.session.add(highlight)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Highlight added successfully.",
        "highlight": highlight.to_dict()
    }), 201

@highlights_bp.route("/admin/highlights/<int:highlight_id>", methods=["DELETE"])
@admin_required
def delete_highlight(highlight_id):
    """Admin endpoint to delete a highlight."""
    highlight = Highlight.query.get(highlight_id)
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


@highlights_bp.route("/admin/highlights/export/pdf", methods=["GET"])
@admin_required
def export_highlights_pdf():
    """Generate a PDF report of all highlights grouped by Resource Speaker."""
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
            img = Paragraph("[Image unavailable]", desc_style)
            # Handle image
            if item.image_base64:
                try:
                    img_data = item.image_base64
                    if "," in img_data:
                        img_data = img_data.split(",")[1]
                    
                    img_bytes = base64.b64decode(img_data)
                    img_buffer = BytesIO(img_bytes)
                    
                    img = RLImage(img_buffer)
                    # Fixed width of 2.5 inches for the photo
                    img_width = 2.5 * inch
                    img.drawHeight = img_width * (img.imageHeight / img.imageWidth)
                    img.drawWidth = img_width
                except Exception as e:
                    logger.error(f"Failed to process image for highlight {item.id}: {e}")
            
            # Form details section
            details_text = f"""
            <b>Event Name:</b> {item.title}<br/><br/>
            <b>Topic:</b> {item.title} <br/><br/>
            <b>Speaker:</b> {item.resource_speaker or '-'}<br/><br/>
            <b>Description:</b> {item.description}
            """
            details = Paragraph(details_text, desc_style)
            
            # Side-by-side Table
            t = Table([[img, details]], colWidths=[2.7 * inch, 4.3 * inch])
            t.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('BOTTOMPADDING', (0,0), (-1,-1), 15),
            ]))
            
            elements.append(t)
            elements.append(Spacer(1, 15))
            
    doc.build(elements, onFirstPage=_on_page, onLaterPages=_on_page)
    
    buffer.seek(0)
    return send_file(
        buffer,
        as_attachment=True,
        download_name="Activities_Report.pdf",
        mimetype="application/pdf"
    )
