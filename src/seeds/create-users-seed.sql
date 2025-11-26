-- ============================================
-- CREATE USERS - Admin và Regular Users
-- ============================================
-- 
-- Script này tạo Admin user và Regular user
-- Password đã được hash bằng bcrypt (salt rounds = 10)
--
-- ============================================

-- ============================================
-- CREATE ADMIN USER
-- ============================================
-- Email: admin@crime-alert.com
-- Password: password123
INSERT INTO users (id, name, email, password, role)
SELECT 
    gen_random_uuid(),
    'Admin User',
    'admin@crime-alert.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- password123
    'Admin'::role
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@crime-alert.com'
);

-- ============================================
-- CREATE USER: nguoivn
-- ============================================
-- Email: nguoivn@gmail.com
-- Password: nguoivn
-- Role: User
INSERT INTO users (id, name, email, password, role)
SELECT 
    gen_random_uuid(),
    'Người Việt Nam',
    'nguoivn@gmail.com',
    '$2b$10$ymFBNnd.MeuPSugBvtoPJOSsebzRbIUcpyLrY30E5JtLXvGfsB//K', -- nguoivn
    'User'::role
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'nguoivn@gmail.com'
);

-- ============================================
-- CREATE USER: nguoivn AS ADMIN (Optional)
-- ============================================
-- Uncomment nếu muốn nguoivn là Admin thay vì User
/*
UPDATE users 
SET role = 'Admin'::role
WHERE email = 'nguoivn@gmail.com';
*/

-- ============================================
-- VERIFY CREATED USERS
-- ============================================
SELECT id, name, email, role, created_at 
FROM users 
WHERE email IN ('admin@crime-alert.com', 'nguoivn@gmail.com')
ORDER BY role, email;
