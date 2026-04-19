-- Enterprise Multi-Tenant Migration Script
-- Run this in your Neon SQL Console to update your database schema

-- 1. Create new enterprise-level tables
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    subscription_tier VARCHAR(50) DEFAULT 'standard',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_properties (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, property_id)
);

-- 2. Add organization_id and tracking columns to existing tables
ALTER TABLE properties ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_property_id INTEGER REFERENCES properties(id);
ALTER TABLE zones ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS property_id INTEGER REFERENCES properties(id);
ALTER TABLE location_tracking ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);
ALTER TABLE location_tracking ADD COLUMN IF NOT EXISTS property_id INTEGER REFERENCES properties(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS property_id INTEGER REFERENCES properties(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS property_id INTEGER REFERENCES properties(id);
ALTER TABLE public_crisis_reports ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);

-- 3. Update the role permissions list
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('guest', 'staff', 'security', 'admin', 'responder', 'super_admin', 'org_admin'));

-- 4. Add performance indexes for organization-level queries
CREATE INDEX IF NOT EXISTS idx_properties_org ON properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_incidents_org ON incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_org ON check_ins(organization_id);
CREATE INDEX IF NOT EXISTS idx_location_tracking_org ON location_tracking(organization_id);
CREATE INDEX IF NOT EXISTS idx_zones_org ON zones(organization_id);
CREATE INDEX IF NOT EXISTS idx_public_reports_org ON public_crisis_reports(organization_id);

-- 5. Create organization onboarding requests table
CREATE TABLE IF NOT EXISTS organization_requests (
    id SERIAL PRIMARY KEY,
    org_name VARCHAR(255) NOT NULL,
    org_type VARCHAR(50),
    address TEXT,
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    expected_capacity INTEGER,
    additional_info TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_requests_status ON organization_requests(status);
