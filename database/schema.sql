-- Crisis Response Database Schema
-- PostgreSQL with PostGIS extension

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    floor_plan_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (guests, staff, security, admins)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    role VARCHAR(50) CHECK (role IN ('guest', 'staff', 'security', 'admin', 'responder')),
    password_hash VARCHAR(255),
    beacon_id VARCHAR(100),
    room_number VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'evacuated')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Zones table (rooms, corridors, exits, etc.)
CREATE TABLE IF NOT EXISTS zones (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id),
    name VARCHAR(255) NOT NULL,
    zone_type VARCHAR(50) CHECK (zone_type IN ('room', 'corridor', 'exit', 'stairwell', 'common_area')),
    floor_number INTEGER DEFAULT 1,
    coordinates GEOMETRY(POLYGON, 4326),
    beacon_ids TEXT[],
    capacity INTEGER DEFAULT 0,
    current_occupancy INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id),
    reported_by INTEGER REFERENCES users(id),
    incident_type VARCHAR(50) CHECK (incident_type IN ('fire', 'medical', 'security', 'natural_disaster', 'evacuation', 'other')),
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'contained', 'resolved', 'false_alarm')),
    location GEOMETRY(POINT, 4326),
    zone_id INTEGER REFERENCES zones(id),
    description TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Check-ins table (I'm Safe / Distressed status)
CREATE TABLE IF NOT EXISTS check_ins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    incident_id INTEGER REFERENCES incidents(id),
    status VARCHAR(50) CHECK (status IN ('safe', 'distressed', 'missing', 'needs_help')),
    message TEXT,
    location GEOMETRY(POINT, 4326),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Location tracking table
CREATE TABLE IF NOT EXISTS location_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    zone_id INTEGER REFERENCES zones(id),
    beacon_id VARCHAR(100),
    location GEOMETRY(POINT, 4326),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    accuracy DECIMAL(10,2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER REFERENCES incidents(id),
    recipient_type VARCHAR(50) CHECK (recipient_type IN ('individual', 'zone', 'property', 'role')),
    recipient_id VARCHAR(255),
    channel VARCHAR(50) CHECK (channel IN ('push', 'sms', 'email', 'websocket')),
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER REFERENCES incidents(id),
    assigned_to INTEGER REFERENCES users(id),
    assigned_by INTEGER REFERENCES users(id),
    task_type VARCHAR(50),
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    description TEXT,
    due_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_property ON incidents(property_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_incident ON check_ins(incident_id);
CREATE INDEX IF NOT EXISTS idx_location_tracking_user ON location_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_location_tracking_time ON location_tracking(recorded_at);
CREATE INDEX IF NOT EXISTS idx_zones_property ON zones(property_id);

-- Insert sample property
INSERT INTO properties (name, address) VALUES
('Grand Hotel', '123 Main Street, New York, NY 10001')
ON CONFLICT DO NOTHING;

-- Insert sample zones
INSERT INTO zones (property_id, name, zone_type, floor_number, capacity) VALUES
(1, 'Lobby', 'common_area', 1, 200),
(1, 'Restaurant', 'common_area', 1, 150),
(1, 'Floor 1 - East Wing', 'room', 1, 50),
(1, 'Floor 1 - West Wing', 'room', 1, 50),
(1, 'Gym', 'common_area', 2, 30),
(1, 'Emergency Exit A', 'exit', 1, 0),
(1, 'Stairwell North', 'stairwell', 1, 0)
ON CONFLICT DO NOTHING;
