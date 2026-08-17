from app import create_app
from models import Student, db
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

app = create_app()

with app.app_context():
    # 1. Alter the table to add new columns if they don't exist
    try:
        db.session.execute(text('ALTER TABLE students ADD COLUMN password_hash VARCHAR(255)'))
        db.session.execute(text('ALTER TABLE students ADD COLUMN is_first_login BOOLEAN NOT NULL DEFAULT TRUE'))
        db.session.commit()
        print("Added password_hash and is_first_login to students table.")
    except Exception as e:
        db.session.rollback()
        print("Columns might already exist or error occurred:", e)

    # 2. Alter existing constraints (make them nullable)
    columns_to_make_nullable = [
        'full_name', 'department', 'student_email', 'student_phone',
        'parent_name', 'parent_email', 'parent_phone', 'registration_id'
    ]
    for col in columns_to_make_nullable:
        try:
            db.session.execute(text(f'ALTER TABLE students ALTER COLUMN {col} DROP NOT NULL'))
            db.session.commit()
            print(f"Made {col} nullable.")
        except Exception as e:
            db.session.rollback()
            print(f"Failed to make {col} nullable:", e)

    # 3. Create 5 sample students
    print("Creating 5 sample students...")
    for i in range(1, 6):
        prn = f"PRN00{i}"
        student = Student.query.filter_by(prn=prn).first()
        if not student:
            student = Student(prn=prn, is_first_login=True)
            student.set_password("password123")
            db.session.add(student)
            print(f"Created student {prn}")
        else:
            student.set_password("password123")
            student.is_first_login = True
            print(f"Updated existing student {prn}")
            
    db.session.commit()
    print("Done.")
