from app import create_app
from services.database import db
from models import EventSession, Attendance, Highlight

app = create_app()

def clear_events():
    with app.app_context():
        print("Clearing event sessions data...")
        try:
            # First clear attendances and highlights linked to event sessions to avoid FK constraint errors
            print("Clearing Attendances...")
            Attendance.query.delete()
            print("Clearing Highlights...")
            Highlight.query.delete()
            print("Clearing EventSessions...")
            EventSession.query.delete()
            
            db.session.commit()
            print("All event data cleared successfully!")
        except Exception as e:
            db.session.rollback()
            print("Failed to clear event data:", e)

if __name__ == "__main__":
    clear_events()
