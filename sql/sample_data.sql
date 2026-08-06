-- ============================================================================
-- Sample test data for the Student Induction Management System.
-- Run after schema.sql to load a handful of demo records.
-- ============================================================================

USE induction_db;

INSERT INTO students (
    registration_id, full_name, prn, department,
    student_email, student_phone,
    parent_name, parent_email, parent_phone,
    created_at, updated_at
) VALUES
('REG-2026-0001', 'Aarav Sharma', 'PRN260101', 'Computer Science and Engineering (AI & ML)',
 'aarav.sharma@gmail.com', '9820012345',
 'Rajesh Sharma', 'rajesh.sharma@gmail.com', '9850012345',
 NOW(), NOW()),

('REG-2026-0002', 'Priya Patil', 'PRN260102', 'Computer Science and Engineering (AI & ML)',
 'priya.patil@gmail.com', '9831122334',
 'Sanjay Patil', 'sanjay.patil@gmail.com', '9876543210',
 NOW(), NOW()),

('REG-2026-0003', 'Rohan Deshmukh', 'PRN260103', 'Computer Science and Engineering (AI & ML)',
 'rohan.deshmukh@gmail.com', '9765123456',
 'Anil Deshmukh', 'anil.deshmukh@gmail.com', '9755123456',
 NOW(), NOW());

INSERT INTO mail_logs (student_id, mail_type, status, sent_time, error_message)
VALUES
(1, 'welcome', 'sent', NOW(), NULL),
(1, 'parent',  'sent', NOW(), NULL),
(2, 'welcome', 'sent', NOW(), NULL),
(2, 'parent',  'sent', NOW(), NULL),
(3, 'welcome', 'sent', NOW(), NULL),
(3, 'parent',  'sent', NOW(), NULL);
