import logging
from app import create_app
from services.database import db
from sqlalchemy import text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = create_app()

with app.app_context():
    try:
        db.session.execute(text("ALTER TABLE event_sessions ADD COLUMN IF NOT EXISTS attendance_limit_minutes INTEGER DEFAULT 15;"))
        db.session.commit()
        logger.info("Successfully ensured attendance_limit_minutes column exists on event_sessions table.")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Migration error: {e}")
