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
            
            # Auto-populate preassigned_passwords table from pass/passwords.txt if empty
            from models import PreassignedPassword
            import os
            try:
                count = PreassignedPassword.query.count()
                if count == 0:
                    passwords_txt_path = os.path.join(app.root_path, "..", "pass", "passwords.txt")
                    if os.path.exists(passwords_txt_path):
                        with open(passwords_txt_path, "r", encoding="utf-8") as f:
                            lines = f.read().splitlines()
                        
                        existing_pwds = {p.password for p in PreassignedPassword.query.all()}
                        to_add = []
                        for line in lines:
                            pwd = line.strip()
                            if pwd and pwd not in existing_pwds:
                                to_add.append(PreassignedPassword(password=pwd))
                                existing_pwds.add(pwd)
                                
                        if to_add:
                            db.session.bulk_save_objects(to_add)
                            db.session.commit()
                        logger.info("Preassigned passwords table seeded successfully.")
                    else:
                        logger.warning("passwords.txt not found at path: %s", passwords_txt_path)
            except Exception as e:
                db.session.rollback()
                logger.error("Failed to seed preassigned passwords: %s", e)
            
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
                
            # Auto-migrate event_sessions table
            try:
                db.session.execute(text("ALTER TABLE event_sessions ADD COLUMN resource_speaker VARCHAR(150);"))
                db.session.commit()
            except Exception:
                db.session.rollback()
                
            try:
                db.session.execute(text("ALTER TABLE event_sessions ADD COLUMN location VARCHAR(150);"))
                db.session.commit()
            except Exception:
                db.session.rollback()

            event_session_new_cols = [
                ("day", "VARCHAR(50)"),
                ("date_str", "VARCHAR(50)"),
                ("time_str", "VARCHAR(100)"),
                ("theme", "VARCHAR(255)"),
                ("key_topics", "TEXT"),
                ("content_to_be_covered", "TEXT"),
                ("student_activity", "TEXT"),
                ("ai_tools", "TEXT"),
                ("interaction_tools", "TEXT"),
            ]
            for col_name, col_type in event_session_new_cols:
                try:
                    db.session.execute(text(f"ALTER TABLE event_sessions ADD COLUMN {col_name} {col_type};"))
                    db.session.commit()
                except Exception:
                    db.session.rollback()
                
            # Auto-migrate highlights table
            try:
                db.session.execute(text("ALTER TABLE highlights ADD COLUMN resource_speaker VARCHAR(150);"))
                db.session.commit()
            except Exception:
                db.session.rollback()

            # Auto-migrate students table
            try:
                db.session.execute(text("ALTER TABLE students ADD COLUMN password_hash VARCHAR(255);"))
                db.session.commit()
            except Exception:
                db.session.rollback()

            try:
                db.session.execute(text("ALTER TABLE students ADD COLUMN is_first_login BOOLEAN NOT NULL DEFAULT TRUE;"))
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
    app.run(host="0.0.0.0", port=port, debug=True, use_reloader=True)
