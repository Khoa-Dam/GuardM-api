# Admin API Guide

Tài liệu này liệt kê tất cả các API endpoint yêu cầu quyền Admin.

**Lưu ý**: Tất cả các API Admin đều yêu cầu:
- Header: `Authorization: Bearer <admin_access_token>`
- Role: `Admin`
- Response 403 nếu không có quyền Admin

---

## 👤 1. USERS MANAGEMENT (Admin Only)

Tất cả các endpoint trong `/api/users` đều yêu cầu quyền Admin.

### 1.1. Get All Users
- **Endpoint**: `GET /api/users`
- **Method**: GET
- **Auth**: Admin only
- **Response**: Array of User objects

### 1.2. Get User by ID
- **Endpoint**: `GET /api/users/:id`
- **Method**: GET
- **Auth**: Admin only
- **Params**: `id` (UUID)
- **Response**: User object
- **Error**: 404 if not found

### 1.3. Create User
- **Endpoint**: `POST /api/users`
- **Method**: POST
- **Auth**: Admin only
- **Body**: CreateUserDto
- **Response**: Created User object
- **Error**: 400 if email already in use

### 1.4. Update User
- **Endpoint**: `PUT /api/users/:id`
- **Method**: PUT
- **Auth**: Admin only
- **Params**: `id` (UUID)
- **Body**: UpdateUserDto
- **Response**: Updated User object
- **Error**: 400 if email already in use, 404 if not found

### 1.5. Delete User
- **Endpoint**: `DELETE /api/users/:id`
- **Method**: DELETE
- **Auth**: Admin only
- **Params**: `id` (UUID)
- **Response**: `{ message: "User successfully deleted" }`
- **Error**: 404 if not found

---

## 🚨 2. WANTED CRIMINALS MANAGEMENT (Admin Only)

### 2.1. Create Wanted Criminal
- **Endpoint**: `POST /api/wanted-criminals`
- **Method**: POST
- **Auth**: Admin only
- **Body**: CreateWantedCriminalDto
- **Response**: Created WantedCriminal object
- **Example Body**:
```json
{
  "name": "Nguyễn Văn A",
  "birthYear": 1990,
  "address": "Hà Nội",
  "parents": "Nguyễn Văn B",
  "crime": "Trộm cắp tài sản",
  "decisionNumber": "123/2025/QĐ-BCA",
  "issuingUnit": "Bộ Công An"
}
```

### 2.2. Update Wanted Criminal
- **Endpoint**: `PUT /api/wanted-criminals/:id`
- **Method**: PUT
- **Auth**: Admin only
- **Params**: `id` (UUID)
- **Body**: UpdateWantedCriminalDto (all fields optional)
- **Response**: Updated WantedCriminal object
- **Error**: 404 if not found

### 2.3. Delete Wanted Criminal
- **Endpoint**: `DELETE /api/wanted-criminals/:id`
- **Method**: DELETE
- **Auth**: Admin only
- **Params**: `id` (UUID)
- **Response**: `{ message: "Wanted criminal successfully deleted" }`
- **Error**: 404 if not found

### 2.4. Public Endpoints (No Auth Required)
- `GET /api/wanted-criminals` - Get all wanted criminals
- `GET /api/wanted-criminals/:id` - Get wanted criminal by ID

---

## 📢 3. CRIME REPORTS MANAGEMENT

### 3.1. Admin Verify Crime Report
- **Endpoint**: `PUT /api/crime-reports/:id/verify`
- **Method**: PUT
- **Auth**: Admin only
- **Params**: `id` (UUID) - Crime report ID
- **Response**: Verified CrimeReportResponse object
- **Description**: Admin manually verify a crime report (sets verificationLevel to CONFIRMED, trustScore to 100)
- **Error**: 404 if not found

---

## 🤖 4. SCRAPER MANAGEMENT (Admin Only)

### 4.1. Scrape Wanted Criminals
- **Endpoint**: `POST /api/scraper/wanted-criminals`
- **Method**: POST
- **Auth**: Admin only
- **Query Params**: 
  - `pages` (optional): Number of pages to scrape (default: 5)
- **Response**:
```json
{
  "success": true,
  "count": 150,
  "criminals": [...],
  "message": "Đã scrape 150 đối tượng từ trang Bộ Công An"
}
```
- **Description**: Trigger scraping wanted criminals from Bộ Công An website

### 4.2. Scrape Weather News
- **Endpoint**: `POST /api/scraper/weather-news`
- **Method**: POST
- **Auth**: Admin only
- **Response**:
```json
{
  "success": true,
  "count": 8,
  "imported": 2,
  "updated": 6,
  "deleted": 1,
  "errors": 0,
  "news": [...],
  "message": "Đã scrape 8 tin thời tiết từ trang NCHMF (2 mới, 6 cập nhật, 1 tin cũ đã xóa)"
}
```
- **Description**: Trigger scraping weather news from NCHMF website (both tabs: disaster warnings and weather forecasts)

### 4.3. Get Scraper Status (Public)
- **Endpoint**: `GET /api/scraper/status`
- **Method**: GET
- **Auth**: No auth required
- **Response**: Status of all scrapers (wanted criminals and weather news)

### 4.4. Get Weather Scraper Status (Public)
- **Endpoint**: `GET /api/scraper/weather-status`
- **Method**: GET
- **Auth**: No auth required
- **Response**: Status of weather news scraper only

---

## 📋 5. SUMMARY TABLE

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/users` | GET | Admin | Get all users |
| `/api/users/:id` | GET | Admin | Get user by ID |
| `/api/users` | POST | Admin | Create new user |
| `/api/users/:id` | PUT | Admin | Update user |
| `/api/users/:id` | DELETE | Admin | Delete user |
| `/api/wanted-criminals` | POST | Admin | Create wanted criminal |
| `/api/wanted-criminals/:id` | PUT | Admin | Update wanted criminal |
| `/api/wanted-criminals/:id` | DELETE | Admin | Delete wanted criminal |
| `/api/crime-reports/:id/verify` | PUT | Admin | Verify crime report |
| `/api/scraper/wanted-criminals` | POST | Admin | Scrape wanted criminals |
| `/api/scraper/weather-news` | POST | Admin | Scrape weather news |

---

## 🔐 6. AUTHENTICATION

### 6.1. Login as Admin
Để sử dụng các API Admin, bạn cần đăng nhập với tài khoản có role `Admin`:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin_password"
}
```

**Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "uuid",
  "userId": "uuid",
  "role": "Admin"
}
```

### 6.2. Using Admin Token
Sau khi login, sử dụng `accessToken` trong header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ⚠️ 7. ERROR RESPONSES

### 7.1. Unauthorized (401)
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```
- Token không hợp lệ hoặc đã hết hạn
- Chưa đăng nhập

### 7.2. Forbidden (403)
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions"
}
```
- User không có quyền Admin
- Token hợp lệ nhưng role không đúng

### 7.3. Not Found (404)
```json
{
  "statusCode": 404,
  "message": "Resource not found"
}
```
- Resource không tồn tại (user, wanted criminal, crime report, etc.)

---

## 📝 8. NOTES

1. **All Admin endpoints require authentication**: Phải có valid JWT token
2. **Role checking**: Token phải có role = "Admin"
3. **Token expiration**: Access token có thời hạn, cần refresh nếu hết hạn
4. **Error handling**: Luôn check status code và error message trong response

---

**Last Updated**: 2025-11-26

