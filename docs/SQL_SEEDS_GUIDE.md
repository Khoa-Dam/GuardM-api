# SQL Seeds Guide - Tạo Users và Admin

Hướng dẫn tạo user và admin bằng SQL trong database.

## 📋 Mục lục

1. [Tạo Users từ SQL File](#tạo-users-từ-sql-file)
2. [Generate Password Hash](#generate-password-hash)
3. [Danh sách Users mặc định](#danh-sách-users-mặc-định)

---

## 🚀 Tạo Users từ SQL File

### Cách 1: Sử dụng file SQL có sẵn

Chạy file SQL đã được chuẩn bị sẵn:

```bash
# PostgreSQL
psql -U your_username -d your_database -f src/seeds/create-users-seed.sql

# Hoặc từ psql console
\i src/seeds/create-users-seed.sql
```

### Cách 2: Copy và paste vào database client

Mở file `src/seeds/create-users-seed.sql` và copy toàn bộ nội dung vào:
- pgAdmin (PostgreSQL)
- DBeaver
- TablePlus
- Hoặc bất kỳ SQL client nào

---

## 🔐 Generate Password Hash

Khi tạo user mới với password tùy chỉnh, bạn cần hash password trước:

### Sử dụng Script TypeScript

```bash
npx ts-node src/seeds/generate-password-hash.ts <password>
```

**Ví dụ:**
```bash
# Generate hash cho password "mypassword"
npx ts-node src/seeds/generate-password-hash.ts mypassword

# Output:
# Password: mypassword
# Hash: $2b$10$abc123...
```

Sau đó copy hash và sử dụng trong SQL INSERT statement.

### Sử dụng Node.js REPL

```javascript
const bcrypt = require('bcrypt');
bcrypt.hash('your_password', 10).then(console.log);
```

---

## 👥 Danh sách Users mặc định

File `create-users-seed.sql` sẽ tạo các users sau:

### 1. Admin User
- **Email:** `admin@crime-alert.com`
- **Password:** `password123`
- **Role:** `Admin`
- **Hash:** `$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`

### 2. Regular User (nguoivn)
- **Email:** `nguoivn@gmail.com`
- **Password:** `nguoivn`
- **Role:** `User`
- **Hash:** `$2b$10$ymFBNnd.MeuPSugBvtoPJOSsebzRbIUcpyLrY30E5JtLXvGfsB//K`

---

## 📝 Tạo User mới bằng SQL

### Template SQL INSERT

```sql
INSERT INTO users (id, name, email, password, role)
SELECT 
    gen_random_uuid(),
    'Tên User',
    'email@example.com',
    '$2b$10$YOUR_HASH_HERE', -- Generate hash trước
    'User'::role  -- hoặc 'Admin'::role
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'email@example.com'
);
```

### Ví dụ: Tạo Admin mới

```sql
-- Bước 1: Generate hash cho password
-- Chạy: npx ts-node src/seeds/generate-password-hash.ts myadminpassword

-- Bước 2: Insert vào database
INSERT INTO users (id, name, email, password, role)
SELECT 
    gen_random_uuid(),
    'New Admin',
    'newadmin@example.com',
    '$2b$10$abc123...', -- Hash từ bước 1
    'Admin'::role
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'newadmin@example.com'
);
```

---

## ✅ Verify Users đã tạo

Sau khi chạy SQL, kiểm tra users đã được tạo:

```sql
SELECT id, name, email, role, created_at 
FROM users 
WHERE email IN ('admin@crime-alert.com', 'nguoivn@gmail.com')
ORDER BY role, email;
```

---

## 🔄 Update User Role

Để chuyển user thành Admin hoặc ngược lại:

```sql
-- Chuyển nguoivn thành Admin
UPDATE users 
SET role = 'Admin'::role
WHERE email = 'nguoivn@gmail.com';

-- Chuyển Admin thành User
UPDATE users 
SET role = 'User'::role
WHERE email = 'admin@crime-alert.com';
```

---

## 📚 Files liên quan

- `src/seeds/create-users-seed.sql` - File SQL chính để tạo users
- `src/seeds/generate-password-hash.ts` - Script generate password hash
- `src/users/entities/user.entity.ts` - Entity definition

---

## ⚠️ Lưu ý

1. **Password Hash:** Luôn hash password trước khi insert vào database, không bao giờ lưu plain text password
2. **Email Unique:** Email phải là unique trong bảng users
3. **Role:** Chỉ có 2 giá trị: `Admin` hoặc `User`
4. **ID:** Sử dụng `gen_random_uuid()` để tự động generate UUID
5. **Duplicate Check:** Sử dụng `WHERE NOT EXISTS` để tránh tạo duplicate users

---

## 🆘 Troubleshooting

### Lỗi: "duplicate key value violates unique constraint"

User đã tồn tại với email đó. Sử dụng `WHERE NOT EXISTS` để bỏ qua.

### Lỗi: "invalid input value for enum role"

Role không hợp lệ. Chỉ chấp nhận `Admin` hoặc `User`.

### Lỗi: "password hash không đúng format"

Đảm bảo hash bắt đầu với `$2b$10$` và có độ dài 60 ký tự.

---

**Tạo bởi:** Crime Alert Backend Team  
**Cập nhật:** 2025-11-26

