# Crime Alert Backend

A NestJS backend for crime reporting and criminal tracking system. Users can view wanted criminals, report crimes with location data, and visualize crime statistics on a map.

## Features

- **Authentication**: JWT-based auth with role management (User/Admin)
- **Wanted Criminals**: View active wanted criminals with location data
- **Crime Reports**: Submit and track crime reports with GPS coordinates
- **Location-based**: All reports are tagged with district/city for mapping
- **Role-based Access**: Different permissions for users and admins

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL (via Docker)
- **ORM**: TypeORM
- **Authentication**: JWT
- **Language**: TypeScript

## Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- pnpm

## Setup

1. **Install dependencies**:
```bash
pnpm install
```

2. **Start PostgreSQL database**:
```bash
docker-compose up -d
```

3. **Set up environment variables** (create `.env` file):
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=crime_alert
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=1h
CLOUDINARY_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
NODE_ENV=development
```

4. **Run the application**:
```bash
pnpm run start:dev
```

The server will start on `http://localhost:3000`

## Scraper

The application includes a scraper to fetch wanted criminals data.

### Run Scraper Manually
```bash
# Scrape default 5 pages
pnpm run scraper

# Scrape specific number of pages
pnpm run scraper 10
```

## Database Schema

### Users
- Authentication and user management
- Role-based access (User/Admin)

### Wanted Criminals
- Publicly accessible criminal data
- Includes name, description, location, reward info

### Crime Reports
- User-submitted crime reports
- GPS coordinates, address, district, city
- Status tracking (active/investigating/resolved)

## API Endpoints

### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh access token
- `PUT /auth/change-password` - Change password (protected)

### Database

The database schema will be automatically created when you run the app in development mode (`synchronize: true`).

## Development

```bash
# Watch mode
pnpm run start:dev

# Production build
pnpm run build
pnpm run start:prod

> **Note**: Ensure `CORS` is properly configured in `main.ts` for your production domain (e.g., `https://www.guardm.space`).

# Run tests
pnpm run test
```

## Docker

Start database:
```bash
docker-compose up -d
```

Stop database:
```bash
docker-compose down
```

## License

MIT
