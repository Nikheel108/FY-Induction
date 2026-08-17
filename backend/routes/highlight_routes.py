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

@highlights_bp.route("/admin/highlights/export/pdf", methods=["GET"])
@admin_required
def export_highlights_pdf():
    """Generate a PDF report of all highlights grouped by Resource Speaker."""
    highlights = Highlight.query.order_by(Highlight.resource_speaker.asc(), Highlight.created_at.desc()).all()
    
    # Group by speaker
    grouped = {}
    for h in highlights:
        speaker = h.resource_speaker or "Unknown"
        if speaker not in grouped:
            grouped[speaker] = []
        grouped[speaker].append(h)
        
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = styles['Heading1']
    title_style.alignment = 1 # Center
    
    speaker_style = styles['Heading2']
    speaker_style.textColor = colors.HexColor("#0f172a")
    speaker_style.spaceBefore = 20
    speaker_style.spaceAfter = 10
    
    event_title_style = styles['Heading3']
    event_title_style.textColor = colors.HexColor("#334155")
    
    desc_style = styles['Normal']
    desc_style.spaceAfter = 10
    
    elements = []
    
    # Title
    elements.append(Paragraph("Student Induction Program - Activities Report", title_style))
    elements.append(Spacer(1, 0.25 * inch))
    
    if not grouped:
        elements.append(Paragraph("No activities recorded yet.", desc_style))
    
    for speaker, items in grouped.items():
        elements.append(Paragraph(f"Resource Speaker: {speaker}", speaker_style))
        
        for item in items:
            elements.append(Paragraph(item.title, event_title_style))
            elements.append(Paragraph(item.description, desc_style))
            
            # Handle image
            if item.image_base64:
                try:
                    # image_base64 usually looks like "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
                    img_data = item.image_base64
                    if "," in img_data:
                        img_data = img_data.split(",")[1]
                    
                    img_bytes = base64.b64decode(img_data)
                    img_buffer = BytesIO(img_bytes)
                    
                    img = RLImage(img_buffer)
                    # Resize image while maintaining aspect ratio, max width 6 inches
                    max_width = 6 * inch
                    max_height = 4 * inch
                    
                    aspect = img.imageWidth / float(img.imageHeight)
                    
                    if img.imageWidth > max_width:
                        img.drawWidth = max_width
                        img.drawHeight = max_width / aspect
                    else:
                        img.drawWidth = img.imageWidth
                        img.drawHeight = img.imageHeight
                        
                    if img.drawHeight > max_height:
                        img.drawHeight = max_height
                        img.drawWidth = max_height * aspect
                        
                    elements.append(img)
                    elements.append(Spacer(1, 0.2 * inch))
                except Exception as e:
                    logger.error(f"Failed to process image for highlight {item.id}: {e}")
                    elements.append(Paragraph("[Image unavailable]", desc_style))
                    
            elements.append(Spacer(1, 0.3 * inch))
            
    doc.build(elements)
    
    buffer.seek(0)
    return send_file(
        buffer,
        as_attachment=True,
        download_name="Activities_Report.pdf",
        mimetype="application/pdf"
    )
