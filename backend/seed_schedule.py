import os
from datetime import datetime, timedelta
from app import create_app
from services.database import db
from models import EventSession

# Create Flask app to get context
app = create_app()

schedule_data = [
    # 7 Sept
    ("Introduction to Programme", "2026-09-07T10:00:00", 15),
    ("AI Fundamentals, Types of AI & Ecosystem Overview", "2026-09-07T10:15:00", 60),
    ("INDIAN AI policy Landscape", "2026-09-07T11:30:00", 60),
    ("UHV", "2026-09-07T13:30:00", 60),
    ("Overview of AI Applications", "2026-09-07T14:45:00", 60),
    ("Open Forum", "2026-09-07T15:45:00", 15),

    # 8 Sept
    ("Generative AI and Prompt Engineering", "2026-09-08T10:00:00", 60),
    ("UHV", "2026-09-08T11:15:00", 60),
    ("UHV", "2026-09-08T13:30:00", 60),
    ("Prompt Engineering Techniques", "2026-09-08T14:45:00", 60),
    ("Open Forum", "2026-09-08T15:45:00", 15),

    # 9 Sept
    ("AI for Research and Academic Productivity", "2026-09-09T10:00:00", 60),
    ("UHV", "2026-09-09T11:15:00", 60),
    ("AI search tools V/s Conventional Search", "2026-09-09T13:30:00", 60),
    ("UHV", "2026-09-09T14:45:00", 60),
    ("Open Forum", "2026-09-09T15:45:00", 15),

    # 10 Sept
    ("AI for Data Analytics and Communication", "2026-09-10T10:00:00", 60),
    ("UHV", "2026-09-10T11:15:00", 60),
    ("AI Based Capstone Project", "2026-09-10T13:30:00", 60),
    ("UHV", "2026-09-10T14:45:00", 60),
    ("Open Forum", "2026-09-10T15:45:00", 15),

    # 15 Sept
    ("UHV", "2026-09-15T10:00:00", 60),
    ("FY Course Orientation", "2026-09-15T11:15:00", 60),
    ("UHV", "2026-09-15T13:30:00", 60),
    ("Generative AI Models", "2026-09-15T14:45:00", 60),
    ("Open Forum", "2026-09-15T15:45:00", 15),

    # 16 Sept
    ("Prompt Engineering Hands ON", "2026-09-16T10:00:00", 60),
    ("UHV", "2026-09-16T11:15:00", 60),
    ("UHV", "2026-09-16T13:30:00", 60),
    ("Activity", "2026-09-16T14:45:00", 60),
    ("Open Forum", "2026-09-16T15:45:00", 15),

    # 17 Sept
    ("UHV", "2026-09-17T10:00:00", 60),
    ("AI search tools Hands ON", "2026-09-17T11:15:00", 60),
    ("UHV", "2026-09-17T13:30:00", 60),
    ("AI Assisted Research and Reading", "2026-09-17T14:45:00", 60),
    ("Open Forum", "2026-09-17T15:45:00", 15),

    # 18 Sept
    ("UHV", "2026-09-18T10:00:00", 60),
    ("AI applications Across Engg. domains", "2026-09-18T11:15:00", 60),
    ("Capstone Project Presentation", "2026-09-18T13:30:00", 60),
    ("Activity", "2026-09-18T14:45:00", 60),
    ("Open Forum", "2026-09-18T15:45:00", 15),
]

def seed_schedule():
    with app.app_context():
        # Clear existing sessions to prevent duplicates if run multiple times
        EventSession.query.delete()
        
        print(f"Seeding {len(schedule_data)} sessions...")
        
        for title, start_str, duration in schedule_data:
            # The strings are in IST. Subtract 5 hours 30 mins to get UTC.
            ist_time = datetime.fromisoformat(start_str)
            utc_time = ist_time - timedelta(hours=5, minutes=30)
            
            es = EventSession(title=title, start_time=utc_time, duration_minutes=duration, resource_speaker="-", location="-")
            db.session.add(es)
            print(f"  + Added: {title} on {ist_time} (IST)")
                
        db.session.commit()
        print("Schedule seeded successfully.")

if __name__ == "__main__":
    seed_schedule()
