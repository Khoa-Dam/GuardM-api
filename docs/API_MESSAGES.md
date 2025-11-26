# API Messages & Responses Guide

Tài liệu này tổng hợp tất cả các thông báo và response messages mà hệ thống trả về.

---

## ✅ 1. SUCCESS MESSAGES

### 1.1. Crime Reports

#### Delete Report
- **Endpoint**: `DELETE /api/crime-reports/:id`
- **Response**:
```json
{
  "message": "Crime report deleted"
}
```

### 1.2. Wanted Criminals

#### Delete Wanted Criminal
- **Endpoint**: `DELETE /api/wanted-criminals/:id`
- **Response**:
```json
{
  "message": "Wanted criminal successfully deleted"
}
```

### 1.3. Users

#### Delete User
- **Endpoint**: `DELETE /api/users/:id`
- **Response**:
```json
{
  "message": "User successfully deleted"
}
```

### 1.4. Scraper

#### Scrape Wanted Criminals
- **Endpoint**: `POST /api/scraper/wanted-criminals?pages=5`
- **Response**:
```json
{
  "success": true,
  "count": 150,
  "criminals": [...],
  "message": "Đã scrape 150 đối tượng từ trang Bộ Công An"
}
```

### 1.5. Nearby Alerts

#### Get Nearby Alerts (Safe Area)
- **Endpoint**: `GET /api/crime-reports/nearby?lat=...&lng=...&radius=...`
- **Response** (khi không có báo cáo nào):
```json
{
  "message": "Khu vực này an toàn"
}
```

---

## ❌ 2. ERROR MESSAGES

### 2.1. Authentication Errors

#### Email Already in Use
- **Endpoint**: `POST /api/auth/signup`
- **Error**: `BadRequestException`
- **Message**: `"Email already in use"`

#### Wrong Credentials
- **Endpoint**: `POST /api/auth/login`, `PUT /api/auth/change-password`
- **Error**: `UnauthorizedException`
- **Message**: `"Wrong credentials"`

#### User Not Found
- **Endpoint**: `PUT /api/auth/change-password`
- **Error**: `NotFoundException`
- **Message**: `"User not found..."`

#### Invalid Refresh Token
- **Endpoint**: `POST /api/auth/refresh`
- **Error**: `UnauthorizedException`
- **Message**: `"Invalid refresh token"`

### 2.2. Crime Reports Errors

#### User Identification Failed
- **Endpoints**: Tất cả protected endpoints
- **Error**: `BadRequestException`
- **Message**: `"User identification failed"`

#### Crime Report Not Found
- **Endpoints**: `GET /api/crime-reports/:id`, `PUT /api/crime-reports/:id`, `DELETE /api/crime-reports/:id`
- **Error**: `NotFoundException`
- **Message**: `"Crime report not found"`

#### Cannot Confirm Own Report
- **Endpoint**: `POST /api/crime-reports/:id/confirm`
- **Error**: `BadRequestException`
- **Message**: `"Không thể xác nhận báo cáo của chính mình"`

#### Cannot Dispute Own Report
- **Endpoint**: `POST /api/crime-reports/:id/dispute`
- **Error**: `BadRequestException`
- **Message**: `"Không thể tranh cãi báo cáo của chính mình"`

#### Already Voted Maximum Times
- **Endpoints**: `POST /api/crime-reports/:id/confirm`, `POST /api/crime-reports/:id/dispute`
- **Error**: `BadRequestException`
- **Message**: `"Bạn đã vote tối đa 2 lần cho báo cáo này"`

#### Already Confirmed
- **Endpoint**: `POST /api/crime-reports/:id/confirm`
- **Error**: `BadRequestException`
- **Message**: `"Bạn đã xác nhận báo cáo này rồi"`

#### Already Disputed
- **Endpoint**: `POST /api/crime-reports/:id/dispute`
- **Error**: `BadRequestException`
- **Message**: `"Bạn đã báo sai báo cáo này rồi"`

#### Cannot Edit Other's Report
- **Endpoint**: `PUT /api/crime-reports/:id`
- **Error**: `BadRequestException`
- **Message**: `"Không thể chỉnh sửa báo cáo của người khác"`

#### Cannot Delete Other's Report
- **Endpoint**: `DELETE /api/crime-reports/:id`
- **Error**: `BadRequestException`
- **Message**: `"Không thể xóa báo cáo của người khác"`

#### Missing Required Fields
- **Endpoint**: `POST /api/crime-reports`
- **Error**: `BadRequestException`
- **Messages**:
  - `"Either title or description must be provided"`
  - `"Either coordinates (lat/lng) or address must be provided"`

### 2.3. Wanted Criminals Errors

#### Wanted Criminal Not Found
- **Endpoints**: `GET /api/wanted-criminals/:id`, `PUT /api/wanted-criminals/:id`, `DELETE /api/wanted-criminals/:id`
- **Error**: `NotFoundException`
- **Message**: `"Wanted criminal not found"`

### 2.4. Users Errors

#### User Not Found
- **Endpoints**: `GET /api/users/:id`, `PUT /api/users/:id`, `DELETE /api/users/:id`
- **Error**: `NotFoundException`
- **Message**: `"User not found"`

#### Email Already in Use
- **Endpoints**: `POST /api/users`, `PUT /api/users/:id`
- **Error**: `BadRequestException`
- **Message**: `"Email already in use"`

### 2.5. Authorization Errors

#### Unauthorized
- **All protected endpoints**
- **Error**: `UnauthorizedException`
- **Message**: `"Unauthorized"` (default NestJS message)

#### Forbidden - Admin Access Required
- **Admin-only endpoints**
- **Error**: `ForbiddenException`
- **Message**: `"Forbidden - Admin access required"` (hoặc tương tự)

### 2.6. Validation Errors

#### Invalid Latitude
- **Endpoint**: `POST /api/crime-reports`
- **Error**: Validation error
- **Message**: `"Latitude must be a valid latitude value (-90 to 90)"`

#### Invalid Longitude
- **Endpoint**: `POST /api/crime-reports`
- **Error**: Validation error
- **Message**: `"Longitude must be a valid longitude value (-180 to 180)"`

#### Invalid Status
- **Endpoint**: `POST /api/crime-reports`
- **Error**: Validation error
- **Message**: `"Status must be between 0 and 2"`

#### Invalid Severity
- **Endpoint**: `POST /api/crime-reports`
- **Error**: Validation error
- **Message**: `"Severity must be between 1 and 5"`

#### Invalid Attachment Format
- **Endpoint**: `POST /api/crime-reports`
- **Error**: Validation error
- **Message**: `"Each attachment must be a valid URL string"`

#### Invalid Password Format
- **Endpoint**: `POST /api/auth/signup`, `POST /api/users`
- **Error**: Validation error
- **Message**: `"Password must contain at least one number"`

---

## 📊 3. DATA RESPONSES

### 3.1. Crime Report Response

#### Get Report by ID
- **Endpoint**: `GET /api/crime-reports/:id`
- **Response**: `CrimeReportResponse` object
```json
{
  "id": "uuid",
  "reporterId": "uuid",
  "title": "Cướp giật tại chợ Bến Thành",
  "description": "Bị cướp giật điện thoại...",
  "type": "cuop_giat",
  "lat": 10.7769,
  "lng": 106.7009,
  "address": "Chợ Bến Thành, Quận 1, TP.HCM",
  "areaCode": "700000",
  "province": "Hồ Chí Minh",
  "district": "Quận 1",
  "ward": "Phường Bến Nghé",
  "street": "Lê Lợi",
  "source": "user",
  "attachments": ["https://..."],
  "status": 0,
  "severity": 3,
  "severityLevel": "medium",
  "trustScore": 77,
  "verificationLevel": "verified",
  "confirmationCount": 19,
  "disputeCount": 7,
  "reportedAt": "2025-02-11T19:00:00Z",
  "createdAt": "2025-11-24T14:53:32Z",
  "updatedAt": "2025-11-24T14:53:32Z"
}
```

#### Vote Status Response
- **Endpoint**: `GET /api/crime-reports/:id/vote-status`
- **Response**:
```json
{
  "hasConfirmed": false,
  "hasDisputed": false,
  "voteCount": 0,
  "canVote": true,
  "isOwner": false
}
```

### 3.2. Statistics Response

#### Get Statistics
- **Endpoint**: `GET /api/crime-reports/statistics`
- **Response**:
```json
{
  "total": 1250,
  "activeAlerts": 850,
  "highSeverity": 120,
  "byType": [
    { "type": "cuop_giat", "count": 350 },
    { "type": "trom_cap", "count": 280 }
  ],
  "byDistrict": [
    { "district": "Quận 1", "count": 150 },
    { "district": "Quận 3", "count": 120 }
  ]
}
```

### 3.3. Heatmap Response

#### Get Heatmap Data
- **Endpoint**: `GET /api/crime-reports/heatmap`
- **Response**:
```json
[
  {
    "latitude": 10.7769,
    "longitude": 106.7009,
    "district": "Quận 1",
    "province": "Hồ Chí Minh",
    "crimeType": "cuop_giat",
    "count": 25,
    "severity": "high"
  }
]
```

### 3.4. Home Page Response

#### Get Home Page Data
- **Endpoint**: `GET /api/home`
- **Response**:
```json
{
  "recentWantedCriminals": [
    {
      "id": "uuid",
      "name": "Nguyễn Văn A",
      "birthYear": 1990,
      "address": "Hà Nội",
      "parents": "Nguyễn Văn B",
      "crime": "Trộm cắp tài sản",
      "decisionNumber": "123/2025/QĐ-BCA",
      "issuingUnit": "Bộ Công An",
      "createdAt": "2025-11-26T..."
    }
  ],
  "statistics": {
    "totalWanted": 150
  }
}
```

### 3.5. Login Response

#### Login Success
- **Endpoint**: `POST /api/auth/login`
- **Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "uuid",
  "userId": "uuid",
  "role": "user"
}
```

---

## 🔔 4. NOTIFICATION MESSAGES (Future Implementation)

Các thông báo này sẽ được gửi qua WebSocket khi implement real-time notifications:

### 4.1. Report Notifications

#### Report Confirmed
```json
{
  "type": "report_confirmed",
  "reportId": "uuid",
  "title": "Cướp giật tại chợ Bến Thành",
  "confirmationCount": 5,
  "trustScore": 77,
  "timestamp": "2025-11-26T10:00:00Z"
}
```

#### Report Disputed
```json
{
  "type": "report_disputed",
  "reportId": "uuid",
  "title": "Cướp giật tại chợ Bến Thành",
  "disputeCount": 2,
  "trustScore": 65,
  "timestamp": "2025-11-26T10:00:00Z"
}
```

#### Report Verified
```json
{
  "type": "report_verified",
  "reportId": "uuid",
  "title": "Cướp giật tại chợ Bến Thành",
  "verificationLevel": "verified",
  "trustScore": 85,
  "timestamp": "2025-11-26T10:00:00Z"
}
```

### 4.2. Wanted Criminal Notifications

#### New Wanted Criminal
```json
{
  "type": "new_wanted_criminal",
  "criminalId": "uuid",
  "name": "Nguyễn Văn A",
  "crime": "Trộm cắp tài sản",
  "timestamp": "2025-11-26T10:00:00Z"
}
```

---

## 📝 5. HTTP STATUS CODES

### Success Codes
- `200 OK`: Request thành công
- `201 Created`: Tạo mới thành công (POST)

### Client Error Codes
- `400 Bad Request`: Request không hợp lệ
- `401 Unauthorized`: Chưa đăng nhập hoặc token không hợp lệ
- `403 Forbidden`: Không có quyền truy cập (thiếu role)
- `404 Not Found`: Không tìm thấy resource

### Server Error Codes
- `500 Internal Server Error`: Lỗi server
- `503 Service Unavailable`: Service không khả dụng

---

## 🎯 6. UI DISPLAY RECOMMENDATIONS

### Success Messages
- ✅ **Green Toast**: "Crime report deleted", "Wanted criminal successfully deleted"
- ✅ **Green Badge**: Số lượng confirmations tăng
- ✅ **Info Toast**: "Đã scrape X đối tượng từ trang Bộ Công An"

### Error Messages
- ❌ **Red Toast**: Validation errors, "Wrong credentials"
- ⚠️ **Yellow Toast**: "Bạn đã vote tối đa 2 lần", "Không thể xác nhận báo cáo của chính mình"
- 🔒 **Red Alert**: "Unauthorized", "Forbidden - Admin access required"

### Info Messages
- ℹ️ **Blue Toast**: "Khu vực này an toàn"
- 📊 **Info Badge**: Statistics updates

---

**Last Updated**: 2025-11-26


