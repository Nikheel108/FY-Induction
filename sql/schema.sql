-- ============================================================================
-- Student Induction Management System - MySQL schema
-- Run this file in MySQL (Workbench / XAMPP phpMyAdmin / CLI) to create the
-- database and tables. The Flask app also auto-creates tables on startup, so
-- this file is optional but handy for manual setups and reference.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS induction_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE induction_db;

-- ---------------------------------------------------------------------------
-- Table: students
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    registration_id VARCHAR(50)  NOT NULL UNIQUE,
    full_name       VARCHAR(150) NOT NULL,
    prn             VARCHAR(30)  NOT NULL UNIQUE,
    department      VARCHAR(150) NOT NULL,
    student_email   VARCHAR(150) NOT NULL UNIQUE,
    student_phone   VARCHAR(20)  NOT NULL,
    parent_name     VARCHAR(150) NOT NULL,
    parent_email    VARCHAR(150) NOT NULL,
    parent_phone    VARCHAR(20)  NOT NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_students_department (department)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Table: mail_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mail_logs (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    student_id    INT          NOT NULL,
    mail_type     VARCHAR(30)  NOT NULL,            -- welcome | parent
    status        VARCHAR(20)  NOT NULL,            -- sent | failed
    sent_time     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT         NULL,
    CONSTRAINT fk_mail_logs_student
        FOREIGN KEY (student_id) REFERENCES students (id)
        ON DELETE CASCADE
) ENGINE=InnoDB;
