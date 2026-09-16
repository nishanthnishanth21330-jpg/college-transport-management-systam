-- College Transport Management System
-- MySQL Schema

CREATE DATABASE IF NOT EXISTS college_transport_db;
USE college_transport_db;

-- ==========================
-- Table: users
-- ==========================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================
-- Table: buses
-- ==========================
CREATE TABLE IF NOT EXISTS buses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bus_name VARCHAR(100) NOT NULL,
    bus_number VARCHAR(50) NOT NULL UNIQUE,
    driver_name VARCHAR(100) NOT NULL,
    driver_phone VARCHAR(20) NOT NULL,
    start_location VARCHAR(150) NOT NULL,
    destination VARCHAR(150) NOT NULL,
    route_details TEXT,
    latitude DOUBLE DEFAULT NULL,
    longitude DOUBLE DEFAULT NULL,
    status ENUM('STOPPED', 'LIVE', 'COMPLETED') DEFAULT 'STOPPED',
    journey_started_at TIMESTAMP NULL DEFAULT NULL,
    journey_stopped_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
