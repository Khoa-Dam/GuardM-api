-- ============================================
-- CREATE USERS SCRIPT
-- ============================================
-- 
-- IMPORTANT: Before running this script, you need to generate password hashes.
-- Run: npx ts-node src/seeds/generate-password-hash.ts <password>
-- 
-- Default password for all accounts: "password123"
-- 
-- ============================================

-- Generate password hash first:
-- Password "password123" hash (generated with bcrypt, salt rounds = 10):
-- Run: npx ts-node src/seeds/generate-password-hash.ts password123
-- Then replace the hash value below

-- ============================================
-- CREATE ADMIN USER
-- ============================================
-- Email: admin@crime-alert.com
-- Password: password123
-- Role: Admin
-- 
-- Generate hash first: npx ts-node src/seeds/generate-password-hash.ts password123
INSERT INTO users (id, name, email, password, role)
SELECT 
    gen_random_uuid(),
    'Admin User',
    'admin@crime-alert.com',
    '$2b$10$YOUR_HASH_HERE', -- Replace with actual hash from generate-password-hash.ts
    'Admin'::role
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@crime-alert.com'
);

-- ============================================
-- CREATE REGULAR USER (Example)
-- ============================================
-- Email: user@crime-alert.com  
-- Password: password123
-- Role: User
INSERT INTO users (id, name, email, password, role)
SELECT 
    gen_random_uuid(),
    'Test User',
    'user@crime-alert.com',
    '$2b$10$YOUR_HASH_HERE', -- Replace with actual hash from generate-password-hash.ts
    'User'::role
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'user@crime-alert.com'
);

-- ============================================
-- VERIFY CREATED USERS
-- ============================================
SELECT id, name, email, role, created_at FROM users WHERE email IN ('admin@crime-alert.com', 'user@crime-alert.com');

