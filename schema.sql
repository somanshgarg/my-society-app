-- ===================================================
-- SMART COMPLAINT BOX - SUPABASE / POSTGRES SCHEMA
-- Copy and paste this directly into Supabase -> SQL Editor -> Run
-- ===================================================

-- 1. Create Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    flat_number TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Plumbing', 'Electrical', 'Lift', 'Security', 'Noise', 'Parking', 'Sanitation', 'Other')),
    urgency TEXT NOT NULL CHECK (urgency IN ('High', 'Medium', 'Low')),
    ai_drafted_response TEXT NOT NULL,
    admin_edited_response TEXT DEFAULT NULL,
    assigned_to TEXT DEFAULT NULL,
    admin_notes TEXT DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_complaints_flat ON complaints(flat_number);
CREATE INDEX IF NOT EXISTS idx_complaints_urgency ON complaints(urgency);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);

-- 4. Default Admin User (username: admin / password: admin123)
INSERT INTO admins (username, password_hash) 
VALUES ('admin', 'admin123') 
ON CONFLICT (username) DO NOTHING;

-- 5. Initial Sample Complaints
INSERT INTO complaints (flat_number, description, category, urgency, ai_drafted_response, assigned_to, admin_notes, status, created_at)
VALUES 
('A-101', 'Kitchen tap leaking heavily for past 3 days', 'Plumbing', 'Medium', 'Thank you for reporting. Our maintenance team has logged the kitchen tap leak for A-101 and Ramesh the plumber has been alerted.', 'Ramesh (Plumber)', 'Called Ramesh at 10:15 AM. Promised visit by 3 PM today.', 'In Progress', NOW() - INTERVAL '2 hours'),
('B-304', 'Gas odor detected near 3rd floor elevator shaft!', 'Security', 'High', 'URGENT ACKNOWLEDGMENT: Your report of a gas smell near B-304 elevator has been flagged with HIGH priority. Facility emergency team and security have been dispatched immediately.', 'Security Main Desk', 'Main gas line valve checked; technician on site.', 'Open', NOW() - INTERVAL '30 minutes'),
('C-502', 'Loud music playing from neighbour after 11 PM', 'Noise', 'Low', 'Thank you. We have recorded your noise concern for C-502. The facility manager will remind residents regarding silent hours.', NULL, 'Notified block representative.', 'Resolved', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;
