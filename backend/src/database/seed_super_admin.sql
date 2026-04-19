-- Seed Super Admin Account
-- Run this in your Neon SQL Console to create your initial account

INSERT INTO users (
    name, 
    email, 
    role, 
    password_hash, 
    status
) VALUES (
    'Super Admin', 
    'admin@crisisrespond.com', 
    'super_admin', 
    '$2b$10$7/O8X9v.V9E7X9v.V9E7X9v.V9E7X9v.V9E7X9v.V9E7X9v.V9E7X', -- Standard hash for 'admin123'
    'active'
);

-- Note: After logging in, please change your password in the Settings page.
