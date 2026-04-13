-- 1. Insert Sample Users 
-- Using MySQL SHA2() function to generate the sha256 password hash expected by our Python backend
INSERT INTO users (username, password, role) VALUES 
('admin', SHA2('admin_password', 256), 'admin'),
('user1', SHA2('user1_password', 256), 'user'),
('manager', SHA2('managerpass', 256), 'admin'),
('federico', SHA2('userpass', 256), 'user'),
('giulia', SHA2('userpass', 256), 'user')
ON DUPLICATE KEY UPDATE username=username;

-- 2. Insert Parking Areas
INSERT INTO parking_areas (id, name, max_capacity) VALUES
('P-CENTRO', 'Piazza Vittoria', 50),
('P-NORD', 'Stazione Ferroviaria', 120),
('P-SUD', 'Polo Fieristico', 250),
('P-EST', 'Ospedale Civile', 80)
ON DUPLICATE KEY UPDATE name=VALUES(name), max_capacity=VALUES(max_capacity);

-- 3. Insert Historical Bookings to populate the 30-Day Trends Chart
-- For 'federico'
INSERT INTO bookings (user_id, area_id, start_time, end_time) VALUES
((SELECT id FROM users WHERE username='federico'), 'P-CENTRO', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 DAY), INTERVAL 1 HOUR)),
((SELECT id FROM users WHERE username='federico'), 'P-CENTRO', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 5 DAY), INTERVAL 1 HOUR)),
((SELECT id FROM users WHERE username='federico'), 'P-NORD', DATE_SUB(NOW(), INTERVAL 14 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 14 DAY), INTERVAL 1 HOUR));

-- For 'giulia'
INSERT INTO bookings (user_id, area_id, start_time, end_time) VALUES
((SELECT id FROM users WHERE username='giulia'), 'P-SUD', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 1 HOUR)),
((SELECT id FROM users WHERE username='giulia'), 'P-CENTRO', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 3 DAY), INTERVAL 1 HOUR)),
((SELECT id FROM users WHERE username='giulia'), 'P-CENTRO', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 5 DAY), INTERVAL 1 HOUR)),
((SELECT id FROM users WHERE username='giulia'), 'P-EST', DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 20 DAY), INTERVAL 1 HOUR));

-- 4. Active bookings (currently taking up capacity)
INSERT INTO bookings (user_id, area_id, start_time, end_time) VALUES
((SELECT id FROM users WHERE username='federico'), 'P-CENTRO', NOW(), DATE_ADD(NOW(), INTERVAL 1 HOUR)),
((SELECT id FROM users WHERE username='giulia'), 'P-NORD', DATE_SUB(NOW(), INTERVAL 30 MINUTE), DATE_ADD(NOW(), INTERVAL 30 MINUTE));
