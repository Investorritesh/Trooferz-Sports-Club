-- SQL Script to create MySQL 8 database and dedicated user for Trooferz Sports Club
-- Run this in MySQL Workbench, phpMyAdmin, or the MySQL command line client.

CREATE DATABASE IF NOT EXISTS trooferz_db 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

-- Create dedicated application user
CREATE USER IF NOT EXISTS 'trooferz_user'@'localhost' IDENTIFIED BY 'TrooferzPass@2026';
CREATE USER IF NOT EXISTS 'trooferz_user'@'127.0.0.1' IDENTIFIED BY 'TrooferzPass@2026';

-- Grant privileges to the trooferz_db database
GRANT ALL PRIVILEGES ON trooferz_db.* TO 'trooferz_user'@'localhost';
GRANT ALL PRIVILEGES ON trooferz_db.* TO 'trooferz_user'@'127.0.0.1';

FLUSH PRIVILEGES;

-- Verification query
SELECT user, host FROM mysql.user WHERE user = 'trooferz_user';
SHOW DATABASES LIKE 'trooferz_db';
