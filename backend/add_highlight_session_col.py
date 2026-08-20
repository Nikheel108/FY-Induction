from app import create_app
from models import db
from sqlalchemy import text

app = create_app()

def add_event_session_id_to_highlights():
    with app.app_context():
        try:
            db.session.execute(text("ALTER TABLE highlights ADD COLUMN event_session_id INTEGER REFERENCES event_sessions(id);"))
            db.session.commit()
            print("Successfully added event_session_id column to highlights table.")
        except Exception as e:
            db.session.rollback()
            print(f"Skipped (likely column exists or error): {e}")

if __name__ == "__main__":
    add_event_session_id_to_highlights()
