from flask import Blueprint, jsonify, request
from models import Highlight
from services.database import db
from services.utils import admin_required
import logging

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

    if not title or not description or not image_base64:
        return jsonify({"success": False, "message": "Title, description, and image are required."}), 400

    highlight = Highlight(
        title=title,
        description=description,
        image_base64=image_base64
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
