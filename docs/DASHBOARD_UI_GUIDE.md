# Dashboard UI Guide - Crime Alert System

## 📋 Tổng quan

Tài liệu này mô tả chi tiết các thành phần cần thiết cho Dashboard UI, các field trong Wanted Criminals, và hệ thống thông báo.

---

## 🎯 1. DASHBOARD UI COMPONENTS

### 1.1. Home Page Dashboard

#### API Endpoint: `GET /api/home`

**Response Structure:**
```json
{
  "recentWantedCriminals": [
    {
      "id": "uuid",
      "name": "Họ tên đối tượng",
      "birthYear": 1990,
      "address": "Nơi ĐKTT",
      "parents": "Họ tên bố/mẹ",
      "crime": "Tội danh",
      "decisionNumber": "Số QĐ",
      "issuingUnit": "Đơn vị ra QĐTN",
      "createdAt": "2025-11-26T..."
    }
  ],
  "statistics": {
    "totalWanted": 150
  }
}
```

**UI Components cần hiển thị:**
- **Recent Wanted Criminals Card**: Hiển thị 5 đối tượng truy nã mới nhất
- **Statistics Card**: Tổng số đối tượng truy nã

---

### 1.2. Crime Reports Statistics Dashboard

#### API Endpoint: `GET /api/crime-reports/statistics`

**Response Structure:**
```json
{
  "total": 1250,
  "activeAlerts": 850,
  "highSeverity": 120,
  "byType": [
    { "type": "cuop_giat", "count": 350 },
    { "type": "trom_cap", "count": 280 },
    { "type": "giet_nguoi", "count": 45 }
  ],
  "byDistrict": [
    { "district": "Quận 1", "count": 150 },
    { "district": "Quận 3", "count": 120 }
  ]
}
```

**UI Components cần hiển thị:**
- **Total Reports Card**: Tổng số báo cáo
- **Active Alerts Card**: Số báo cáo đang hoạt động (status = 0)
- **High Severity Card**: Số báo cáo mức độ cao (severity >= 4)
- **Crime Type Chart**: Biểu đồ phân bố theo loại tội phạm
  - Types: `truy_na`, `nghi_pham`, `dang_ngo`, `de_doa`, `giet_nguoi`, `bat_coc`, `cuop_giat`, `trom_cap`
- **Top Districts Chart**: Top 10 quận/huyện có nhiều báo cáo nhất

---

### 1.3. Heatmap Data

#### API Endpoint: `GET /api/crime-reports/heatmap`

**Response Structure:**
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

**UI Components cần hiển thị:**
- **Interactive Map**: Hiển thị heatmap với các điểm nóng
- **Color Coding**: 
  - `high` severity: Đỏ
  - `medium` severity: Vàng
  - `low` severity: Xanh lá
- **Tooltip**: Hiển thị thông tin khi hover (district, count, crimeType)

---

### 1.4. Nearby Alerts

#### API Endpoint: `GET /api/crime-reports/nearby?lat={lat}&lng={lng}&radius={radius}`

**Query Parameters:**
- `lat` (required): Latitude
- `lng` (required): Longitude
- `radius` (optional): Bán kính tính bằng km (default: 5)

**UI Components cần hiển thị:**
- **Map View**: Hiển thị báo cáo trong bán kính
- **List View**: Danh sách báo cáo gần đây
- **Distance Indicator**: Khoảng cách từ vị trí hiện tại

---

## 👤 2. WANTED CRIMINALS - Fields & Structure

### 2.1. Entity Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | ✅ | ID duy nhất |
| `name` | String | ✅ | Họ tên đối tượng |
| `birthYear` | Number | ✅ | Năm sinh |
| `address` | String | ❌ | Nơi ĐKTT (Đăng ký thường trú) |
| `parents` | String | ❌ | Họ tên bố/mẹ |
| `crime` | String | ✅ | Tội danh |
| `decisionNumber` | String | ❌ | Số ngày QĐ (Quyết định) |
| `issuingUnit` | String | ❌ | Đơn vị ra QĐTN (Quyết định truy nã) |
| `createdAt` | DateTime | ✅ | Thời gian tạo |

### 2.2. API Endpoints

#### Get All Wanted Criminals
- **Endpoint**: `GET /api/wanted-criminals`
- **Auth**: Không cần
- **Response**: Array of WantedCriminal objects

#### Get Wanted Criminal by ID
- **Endpoint**: `GET /api/wanted-criminals/:id`
- **Auth**: Không cần

#### Create Wanted Criminal (Admin Only)
- **Endpoint**: `POST /api/wanted-criminals`
- **Auth**: Required (Admin role)
- **Body**: CreateWantedCriminalDto

#### Update Wanted Criminal (Admin Only)
- **Endpoint**: `PUT /api/wanted-criminals/:id`
- **Auth**: Required (Admin role)

#### Delete Wanted Criminal (Admin Only)
- **Endpoint**: `DELETE /api/wanted-criminals/:id`
- **Auth**: Required (Admin role)

### 2.3. UI Components cho Wanted Criminals

**Wanted Criminals List Page:**
- **Table/Grid View**: Hiển thị danh sách đối tượng truy nã
- **Search Bar**: Tìm kiếm theo tên, tội danh
- **Filter**: Lọc theo năm sinh, đơn vị ra QĐ
- **Pagination**: Phân trang danh sách
- **Detail Modal**: Xem chi tiết từng đối tượng

**Wanted Criminal Card Component:**
```
┌─────────────────────────────────┐
│ [Ảnh đối tượng]                 │
│                                 │
│ Họ tên: Nguyễn Văn A            │
│ Năm sinh: 1990                  │
│ Nơi ĐKTT: Hà Nội                │
│ Tội danh: Trộm cắp tài sản     │
│ Số QĐ: 123/2025/QĐ-BCA          │
│ Đơn vị: Bộ Công An             │
└─────────────────────────────────┘
```

---

## 🔔 3. NOTIFICATIONS & ALERTS SYSTEM

### 3.1. Crime Report Notifications

#### New Report Created
- **Trigger**: Khi user tạo báo cáo mới
- **Data**: CrimeReportResponse object
- **Display**: 
  - Toast notification
  - Badge trên icon notifications
  - List trong notification panel

#### Report Verified/Confirmed
- **Trigger**: Khi admin verify hoặc trust score đạt ngưỡng
- **Data**: 
  ```json
  {
    "reportId": "uuid",
    "title": "Cướp giật tại chợ Bến Thành",
    "verificationLevel": "verified",
    "trustScore": 85
  }
  ```

#### Report Confirmed by Community
- **Trigger**: Khi có user khác confirm báo cáo của bạn
- **Data**:
  ```json
  {
    "reportId": "uuid",
    "title": "Cướp giật tại chợ Bến Thành",
    "confirmationCount": 5,
    "trustScore": 77
  }
  ```

#### Report Disputed
- **Trigger**: Khi có user dispute báo cáo của bạn
- **Data**:
  ```json
  {
    "reportId": "uuid",
    "title": "Cướp giật tại chợ Bến Thành",
    "disputeCount": 2,
    "trustScore": 65
  }
  ```

### 3.2. Wanted Criminals Notifications

#### New Wanted Criminal Added
- **Trigger**: Khi scraper tìm thấy đối tượng mới hoặc admin thêm thủ công
- **Data**: WantedCriminal object
- **Display**: 
  - Push notification (nếu có)
  - Badge trên wanted criminals icon

### 3.3. Notification UI Components

**Notification Bell Icon:**
- Badge hiển thị số thông báo chưa đọc
- Dropdown panel khi click

**Notification Panel:**
```
┌─────────────────────────────────┐
│ 🔔 Thông báo (3)                │
├─────────────────────────────────┤
│ ⚠️ Báo cáo của bạn đã được      │
│    xác nhận bởi 5 người         │
│    2 giờ trước                  │
├─────────────────────────────────┤
│ ✅ Đối tượng truy nã mới:       │
│    Nguyễn Văn A                 │
│    5 giờ trước                  │
├─────────────────────────────────┤
│ ❌ Báo cáo của bạn bị tranh cãi │
│    1 ngày trước                 │
└─────────────────────────────────┘
```

**Notification Types:**
- ✅ Success (Green): Confirmations, verifications
- ⚠️ Warning (Yellow): Disputes, low trust score
- ❌ Error (Red): Report deleted, rejected
- ℹ️ Info (Blue): New wanted criminals, system updates

---

## 📊 4. DASHBOARD LAYOUT SUGGESTION

### 4.1. Main Dashboard Page

```
┌─────────────────────────────────────────────────────────┐
│ Header: Logo | Search | Notifications | Profile        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │ Total    │ │ Active  │ │ High     │ │ Wanted   │  │
│ │ Reports  │ │ Alerts  │ │ Severity │ │ Criminals│  │
│ │  1,250   │ │   850   │ │   120    │ │   150    │  │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                         │
│ ┌──────────────────────┐ ┌──────────────────────┐    │
│ │ Crime Type Chart     │ │ Top Districts Chart  │    │
│ │ (Pie/Bar Chart)      │ │ (Bar Chart)          │    │
│ └──────────────────────┘ └──────────────────────┘    │
│                                                         │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Interactive Map (Heatmap)                        │  │
│ │                                                   │  │
│ └──────────────────────────────────────────────────┘  │
│                                                         │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Recent Reports                                    │  │
│ │ - Report 1                                        │  │
│ │ - Report 2                                        │  │
│ └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 4.2. Crime Reports Page

- **Filters**: Type, District, Province, Date Range, Verification Level
- **Sort Options**: Date, Trust Score, Confirmation Count
- **View Modes**: List, Grid, Map
- **Actions**: View Detail, Confirm, Dispute, Share

### 4.3. Wanted Criminals Page

- **Filters**: Birth Year, Crime Type, Issuing Unit
- **Search**: By name, crime, address
- **View Modes**: List, Grid, Card
- **Actions**: View Detail, Report Sighting (future feature)

---

## 🔐 5. AUTHENTICATION & AUTHORIZATION

### 5.1. User Roles

- **User**: Có thể tạo, xem, confirm/dispute reports
- **Admin**: Tất cả quyền của User + quản lý users, verify reports, quản lý wanted criminals

### 5.2. Protected Endpoints

**User Endpoints:**
- `POST /api/crime-reports` - Tạo báo cáo
- `PUT /api/crime-reports/:id` - Sửa báo cáo của mình
- `DELETE /api/crime-reports/:id` - Xóa báo cáo của mình
- `GET /api/crime-reports/me` - Xem báo cáo của mình
- `POST /api/crime-reports/:id/confirm` - Confirm báo cáo
- `POST /api/crime-reports/:id/dispute` - Dispute báo cáo
- `GET /api/crime-reports/:id/vote-status` - Xem vote status

**Admin Only Endpoints:**
- `PUT /api/crime-reports/:id/verify` - Verify báo cáo
- `GET /api/users` - Xem tất cả users
- `POST /api/wanted-criminals` - Tạo wanted criminal
- `PUT /api/wanted-criminals/:id` - Sửa wanted criminal
- `DELETE /api/wanted-criminals/:id` - Xóa wanted criminal
- `POST /api/scraper/wanted-criminals` - Trigger scraper

---

## 📱 6. RESPONSIVE DESIGN CONSIDERATIONS

### 6.1. Mobile View
- Collapsible sidebar
- Bottom navigation bar
- Swipeable cards
- Simplified charts

### 6.2. Tablet View
- 2-column layout
- Medium-sized charts
- Sidebar navigation

### 6.3. Desktop View
- Full layout với sidebar
- Large charts và maps
- Multi-column grids

---

## 🎨 7. COLOR SCHEME SUGGESTIONS

### 7.1. Verification Levels
- **unverified** (0-40): Gray (#9E9E9E)
- **pending** (40-70): Yellow/Orange (#FF9800)
- **verified** (70-85): Blue (#2196F3)
- **confirmed** (85-100): Green (#4CAF50)

### 7.2. Severity Levels
- **low** (1-2): Green (#4CAF50)
- **medium** (3-4): Orange (#FF9800)
- **high** (5): Red (#F44336)

### 7.3. Status Colors
- **Active** (0): Blue
- **Investigating** (1): Yellow
- **Resolved** (2): Green

---

## 📝 8. ADDITIONAL FEATURES TO CONSIDER

### 8.1. Real-time Updates
- WebSocket connection cho real-time notifications
- Auto-refresh dashboard data

### 8.2. Export Features
- Export reports to PDF/Excel
- Export statistics charts

### 8.3. Advanced Filters
- Date range picker
- Multi-select filters
- Saved filter presets

### 8.4. User Preferences
- Theme (Light/Dark mode)
- Language (Vietnamese/English)
- Notification settings

---

## 🔗 9. API ENDPOINTS SUMMARY

### Public Endpoints
- `GET /api/crime-reports` - Tất cả báo cáo
- `GET /api/crime-reports/:id` - Chi tiết báo cáo
- `GET /api/crime-reports/statistics` - Thống kê
- `GET /api/crime-reports/heatmap` - Heatmap data
- `GET /api/crime-reports/nearby` - Báo cáo gần đây
- `GET /api/wanted-criminals` - Tất cả đối tượng truy nã
- `GET /api/wanted-criminals/:id` - Chi tiết đối tượng
- `GET /api/home` - Home page data
- `POST /api/auth/signup` - Đăng ký
- `POST /api/auth/login` - Đăng nhập

### Authenticated Endpoints
- `POST /api/crime-reports` - Tạo báo cáo
- `PUT /api/crime-reports/:id` - Sửa báo cáo
- `DELETE /api/crime-reports/:id` - Xóa báo cáo
- `GET /api/crime-reports/me` - Báo cáo của tôi
- `POST /api/crime-reports/:id/confirm` - Confirm
- `POST /api/crime-reports/:id/dispute` - Dispute
- `GET /api/crime-reports/:id/vote-status` - Vote status
- `PUT /api/auth/change-password` - Đổi mật khẩu

### Admin Only Endpoints
- `PUT /api/crime-reports/:id/verify` - Verify báo cáo
- `GET /api/users` - Quản lý users
- `POST /api/wanted-criminals` - Tạo wanted criminal
- `PUT /api/wanted-criminals/:id` - Sửa wanted criminal
- `DELETE /api/wanted-criminals/:id` - Xóa wanted criminal
- `POST /api/scraper/wanted-criminals` - Trigger scraper

---

## 📚 10. DOCUMENTATION LINKS

- Swagger API Docs: `http://localhost:3001/api/docs`
- Health Check: `http://localhost:3001/api/health`
- Scraper Status: `GET /api/scraper/status`

---

**Last Updated**: 2025-11-26

---

## 📚 11. RELATED DOCUMENTATION

- [Admin API Guide](./ADMIN_API_GUIDE.md) - Chi tiết tất cả API Admin
- [API Messages](./API_MESSAGES.md) - Tất cả messages và error responses


