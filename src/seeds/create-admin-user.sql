-- Script to create Admin and User accounts
-- Password for all accounts: "password123" (hashed with bcrypt, salt rounds = 10)
-- 
-- To generate a new password hash, you can:
-- 1. Use Node.js: const bcrypt = require('bcrypt'); bcrypt.hash('your_password', 10).then(console.log);
-- 2. Or use online tool (less secure): https://bcrypt-generator.com/
-- 3. Or run this in Node REPL: require('bcrypt').hash('password123', 10).then(console.log)

-- ============================================
-- CREATE ADMIN USER
-- ============================================
-- Email: admin@crime-alert.com
-- Password: password123 (hashed)
-- Role: Admin
INSERT INTO users (id, name, email, password, role)
VALUES (
    gen_random_uuid(), -- PostgreSQL UUID generation
    'Admin User',
    'admin@crime-alert.com',
    '$2b$10$rOzJqRJrXy8XqjF0ZfZ0F.9Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0', -- password123 hashed
    'Admin'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- CREATE REGULAR USER (Example)
-- ============================================
-- Email: user@crime-alert.com
-- Password: password123 (hashed)
-- Role: User
INSERT INTO users (id, name, email, password, role)
VALUES (
    gen_random_uuid(),
    'Test User',
    'user@crime-alert.com',
    '$2b$10$rOzJqRJrXy8XqjF0ZfZ0F.9Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0Z0', -- password123 hashed
    'User'
)
ON CONFLICT (email) DO NOTHING;

-- Note: The password hash above is a placeholder.
-- You need to generate the actual hash using bcrypt before running this script.
-- See instructions at the top of this file.

