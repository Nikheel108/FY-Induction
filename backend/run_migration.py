from app import app
from models import db
from sqlalchemy import text
import sys

def migrate():
    try:
        with app.app_context():
            print("Rolling back any stale transactions...")
            db.session.rollback()
            
            print("Executing ALTER TABLE to add event_session_id...")
            db.session.execute(text('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS event_session_id INTEGER;'))
            db.session.commit()
            print("Added event_session_id")
            
            print("Executing CREATE INDEX...")
            db.session.execute(text('CREATE INDEX IF NOT EXISTS ix_attendance_event_session_id ON attendance (event_session_id);'))
            db.session.commit()
            print("Created index")
            
            print("Executing DROP CONSTRAINT...")
            db.session.execute(text('ALTER TABLE attendance DROP CONSTRAINT IF EXISTS unique_session_date;'))
            db.session.commit()
            print("Dropped constraint")
            
            print("Migration successful.")
    except Exception as e:
        print(f"Error: {e}")
        db.session.rollback()
        sys.exit(1)

if __name__ == '__main__':
    migrate()
