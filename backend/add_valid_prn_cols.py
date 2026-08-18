from app import app
from services.database import db
import logging
from sqlalchemy import text

logging.basicConfig(level=logging.INFO)

with app.app_context():
    try:
        db.session.execute(text("ALTER TABLE valid_prns ADD COLUMN expected_name VARCHAR(100);"))
        db.session.execute(text("ALTER TABLE valid_prns ADD COLUMN expected_department VARCHAR(100);"))
        db.session.commit()
        logging.info("Successfully added expected_name and expected_department to valid_prns table.")
    except Exception as e:
        logging.error(f"Error updating valid_prns: {e}")
        db.session.rollback()
