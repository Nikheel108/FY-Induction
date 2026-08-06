-- ============================================================================
-- Sample test data for the Student Induction Management System.
-- Run after schema.sql to load a handful of demo records.
-- ============================================================================

USE induction_db;

INSERT INTO students (
    registration_id, full_name, prn, roll_number, department, division, gender,
    dob, student_email, student_phone, whatsapp, address, city, state, pincode,
    blood_group, hostel_status, emergency_contact,
    father_name, father_email, father_phone,
    mother_name, mother_email, mother_phone,
    guardian_name, guardian_email, guardian_phone,
    created_at, updated_at
) VALUES
('REG-2026-0001', 'Aarav Sharma', 'PRN260101', '01', 'Computer Engineering', 'A', 'Male',
 '2008-03-14', 'aarav.sharma@gmail.com', '9820012345', '9820012345',
 'Flat 12, MG Road', 'Pune', 'Maharashtra', '411001', 'O+', 'Day Scholar', '9850012345',
 'Rajesh Sharma', 'rajesh.sharma@gmail.com', '9850012345',
 'Sunita Sharma', 'sunita.sharma@gmail.com', '9860012345',
 NULL, NULL, NULL, NOW(), NOW()),

('REG-2026-0002', 'Priya Patil', 'PRN260102', '02', 'Information Technology', 'B', 'Female',
 '2008-07-22', 'priya.patil@gmail.com', '9831122334', NULL,
 'Shivaji Nagar', 'Pune', 'Maharashtra', '411005', 'A+', 'Hostel', '9876543210',
 'Sanjay Patil', 'sanjay.patil@gmail.com', '9876543210',
 'Meena Patil', 'meena.patil@gmail.com', '9811223344',
 'Vijay Patil', 'vijay.patil@gmail.com', '9900112233', NOW(), NOW()),

('REG-2026-0003', 'Rohan Deshmukh', 'PRN260103', '03', 'Mechanical Engineering', 'A', 'Male',
 '2008-11-02', 'rohan.deshmukh@gmail.com', '9765123456', '9765123456',
 'Karve Road', 'Pune', 'Maharashtra', '411004', 'B+', 'Day Scholar', '9755123456',
 'Anil Deshmukh', 'anil.deshmukh@gmail.com', '9755123456',
 'Kavita Deshmukh', 'kavita.deshmukh@gmail.com', '9745123456',
 NULL, NULL, NULL, NOW(), NOW()),

('REG-2026-0004', 'Sneha Kulkarni', 'PRN260104', '04', 'Electronics & Telecommunication', 'C', 'Female',
 '2009-01-19', 'sneha.kulkarni@gmail.com', '9881345678', NULL,
 'Hadapsar', 'Pune', 'Maharashtra', '411028', 'AB+', 'Hostel', '9891345678',
 'Dinesh Kulkarni', 'dinesh.kulkarni@gmail.com', '9891345678',
 'Pallavi Kulkarni', 'pallavi.kulkarni@gmail.com', '9871345678',
 NULL, NULL, NULL, NOW(), NOW()),

('REG-2026-0005', 'Kunal Verma', 'PRN260105', '05', 'Civil Engineering', 'B', 'Male',
 '2008-05-30', 'kunal.verma@gmail.com', '9890001122', '9890001122',
 'Baner Road', 'Pune', 'Maharashtra', '411045', 'O-', 'Day Scholar', '9880001122',
 'Mukesh Verma', 'mukesh.verma@gmail.com', '9880001122',
 'Neha Verma', 'neha.verma@gmail.com', '9870001122',
 'Suresh Verma', 'suresh.verma@gmail.com', '9860001122', NOW(), NOW());

INSERT INTO mail_logs (student_id, mail_type, status, sent_time, error_message)
VALUES
(1, 'welcome', 'sent', NOW(), NULL),
(1, 'parent',  'sent', NOW(), NULL),
(2, 'welcome', 'sent', NOW(), NULL),
(2, 'parent',  'sent', NOW(), NULL),
(3, 'welcome', 'sent', NOW(), NULL),
(3, 'parent',  'sent', NOW(), NULL),
(4, 'welcome', 'sent', NOW(), NULL),
(4, 'parent',  'sent', NOW(), NULL),
(5, 'welcome', 'sent', NOW(), NULL),
(5, 'parent',  'sent', NOW(), NULL);
