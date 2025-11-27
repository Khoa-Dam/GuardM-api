# Sử dụng Node.js 20 bản nhẹ (Alpine)
FROM node:20-alpine

# Cài đặt pnpm toàn cục
RUN npm install -g pnpm

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy file package để cài thư viện trước (Tối ưu cache)
COPY package.json pnpm-lock.yaml ./

# Cài đặt dependencies (frozen-lockfile để đảm bảo đúng version)
RUN pnpm install --frozen-lockfile

# Copy toàn bộ code nguồn vào image
COPY . .

# Build code sang JavaScript (dist)
RUN pnpm run build

# Mở port 3000
EXPOSE 3000

# Lệnh chạy server khi container khởi động
CMD ["pnpm", "run", "start:prod"]