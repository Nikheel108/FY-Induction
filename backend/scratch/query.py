import os
import sys

# add backend dir to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + "/.."))

import psycopg2

conn = psycopg2.connect("postgresql://postgres.dwhaqdmzsrpgklwomaee:Supabase%402005%24@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres")
cur = conn.cursor()
cur.execute("SELECT student_id, mail_type, status, error_message FROM mail_logs ORDER BY id DESC LIMIT 5;")
for row in cur.fetchall():
    print(row)
