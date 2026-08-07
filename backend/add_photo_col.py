import os
import sys

# Add the parent directory to sys.path so we can import app and services
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from sqlalchemy import text
from app import app
from services.database import db

load_dotenv()

def run():
    with app.app_context():
        try:
            print("Altering table...")
            db.session.execute(text("ALTER TABLE students ADD COLUMN photo_base64 TEXT;"))
            db.session.commit()
            print("Successfully added photo_base64 column.")
        except Exception as e:
            print("Error or already exists:", e)

if __name__ == "__main__":
    run()
