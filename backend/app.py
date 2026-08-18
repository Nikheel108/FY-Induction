"""
Application entry point for the Student Induction Management System backend.

Run locally with::

    python app.py

The Flask app is assembled via an application-factory pattern so the same code
can later be served by Gunicorn on Render with only environment changes.
"""

import logging
import os

from flask import Flask
from flask_cors import CORS

from config import Config
from routes.admin_routes import admin_bp
from routes.student_routes import student_bp
from services import utils
from services.database import db
from routes.attendance_routes import attendance_bp
from routes.highlight_routes import highlights_bp

# Configure a consistent log format for terminal output.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


def create_app(config_class=Config):
    """Application factory: build and configure the Flask app."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # --- Extensions ------------------------------------------------------------
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # CORS: allow any origin to talk to this API since we use Bearer tokens.
    # Using a manual after_request hook to guarantee headers are always attached.
    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, PUT, PATCH, DELETE"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Expose-Headers"] = "Content-Disposition"
        return response

    # --- Blueprints --------------------------------------------------------------
    app.register_blueprint(student_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(highlights_bp)

    # --- Health check -------------------------------------------------------------
    @app.get("/api/health")
    def health():
        """Simple liveness check used by deployment platforms."""
        return {"success": True, "message": "Backend is running."}

    # --- Database bootstrap --------------------------------------------------------
    with app.app_context():
        try:
            db.create_all()
            
            # Auto-migrate valid_prns table to add new columns (ignore if they already exist)
            from sqlalchemy import text
            try:
                db.session.execute(text("ALTER TABLE valid_prns ADD COLUMN expected_name VARCHAR(100);"))
                db.session.commit()
            except Exception:
                db.session.rollback()
                
            try:
                db.session.execute(text("ALTER TABLE valid_prns ADD COLUMN expected_department VARCHAR(100);"))
                db.session.commit()
            except Exception:
                db.session.rollback()

            logger.info("Database tables ensured (db=%s).", app.config["DB_NAME"])
        except Exception as exc:  # noqa: BLE001 - startup must not crash the API
            logger.error("Could not create the tables: %s", exc)

    # --- Global error handlers ------------------------------------------------------
    @app.errorhandler(404)
    def not_found(_error):
        """JSON 404 for unknown API routes."""
        return {"success": False, "message": "Endpoint not found."}, 404

    @app.errorhandler(405)
    def method_not_allowed(_error):
        """JSON 405 for wrong HTTP methods."""
        return {"success": False, "message": "Method not allowed."}, 405

    @app.errorhandler(Exception)
    def internal_error(error):
        """Catch-all: return a JSON error instead of an HTML traceback."""
        logger.exception("Unhandled exception: %s", error)
        return {"success": False, "message": "Internal server error."}, 500

    return app


# Create the application instance at import time (used by ``flask run``).
app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    # ``use_reloader=False`` avoids double table-creation / duplicate workers.
    app.run(host="0.0.0.0", port=port, debug=True, use_reloader=False)
