from app import app
from models import db, Highlight

def migrate():
    try:
        with app.app_context():
            print("Creating highlights table...")
            db.create_all()
            print("Migration successful.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    migrate()
