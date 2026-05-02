# ThermaX Backend API

Secure JWT-based authentication system for the ThermaX urban heat mapping platform.

## 🌡️ Overview

The ThermaX backend provides a comprehensive RESTful API for user authentication, heat report management, and spatial data processing. It features role-based access control, real-time data validation, and secure token management.

## 🚀 Features

- 🔐 **JWT Authentication** with secure token generation and validation
- 👥 **User Management** with role-based access control (RBAC)
- 🛡️ **Security Middleware** including rate limiting, CORS, and input validation
- 📊 **Heat Report Management** with spatial data processing
- 🗄️ **MongoDB Integration** with Mongoose ODM and mock data fallback
- 📝 **Comprehensive Error Handling** with secure error responses
- 🔒 **Password Security** with bcrypt hashing (salt factor 12)
- 🚦 **API Rate Limiting** to prevent abuse and brute force attacks

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **Express.js** | 4.18 | Web framework |
| **MongoDB** | 8.0+ | Database |
| **Mongoose** | 8.0 | ODM for MongoDB |
| **JWT** | 9.0 | Token authentication |
| **bcryptjs** | 2.4 | Password hashing |
| **Joi** | 17.11 | Input validation |
| **Helmet** | 7.1 | Security headers |
| **CORS** | 2.8 | Cross-origin resource sharing |
| **express-rate-limit** | 7.1 | Rate limiting |
| **Multer** | 2.1 | File upload handling |
| **dotenv** | 16.3 | Environment variables |

## Quick Start

### Prerequisites

- Node.js 16+
- MongoDB 4.4+
- Git

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd ThermaX/Backend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

4. Configure `.env` file
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
MONGODB_URI=mongodb://localhost:27017/thermax
FRONTEND_URL=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

5. Start the server
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication

#### POST `/api/auth/signup`
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64a1b2c3d4e5f6789012345",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### POST `/api/auth/login`
Authenticate user and return JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64a1b2c3d4e5f6789012345",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "lastLogin": "2024-01-15T14:30:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET `/api/auth/verify`
Verify JWT token validity.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Token is valid",
  "user": {
    "id": "64a1b2c3d4e5f6789012345",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER"
  }
}
```

### User Management

#### GET `/api/users/profile`
Get current user profile (Authentication required).

**Headers:**
```
Authorization: Bearer <token>
```

#### PUT `/api/users/profile`
Update current user profile (Authentication required).

**Request Body:**
```json
{
  "name": "John Updated"
}
```

#### GET `/api/users`
Get all users (Admin only).

#### PUT `/api/users/:userId/role`
Update user role (Admin only).

#### PUT `/api/users/:userId/status`
Activate/deactivate user (Admin only).

### Reports

#### GET `/api/reports`
Get all heat reports (Public - authentication optional).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "64a1b2c3d4e5f6789012345",
      "userId": "64a1b2c3d4e5f6789012346",
      "location": {
        "lat": 24.8607,
        "lng": 67.0011
      },
      "severity": 4,
      "description": "High heat intensity observed",
      "category": "urban_heat",
      "temperature": 38.5,
      "timestamp": "2024-01-15T14:30:00.000Z",
      "area": "Downtown District",
      "status": "pending",
      "createdAt": "2024-01-15T14:30:00.000Z"
    }
  ]
}
```

#### POST `/api/reports`
Submit new heat report (Authentication required).

**Request Body:**
```json
{
  "location": {
    "lat": 24.8607,
    "lng": 67.0011
  },
  "severity": 4,
  "description": "High heat intensity observed",
  "category": "urban_heat",
  "temperature": 38.5,
  "area": "Downtown District"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Report submitted successfully",
  "data": {
    "id": "64a1b2c3d4e5f6789012345",
    "userId": "64a1b2c3d4e5f6789012346",
    "status": "pending",
    "createdAt": "2024-01-15T14:30:00.000Z"
  }
}
```

#### GET `/api/reports/my-reports`
Get current user's reports (Authentication required).

#### GET `/api/reports/admin/all`
Get all reports with full info (Admin only).

#### PUT `/api/reports/:id/status`
Update report status (Admin only).

**Request Body:**
```json
{
  "status": "approved"
}
```

### Heatmap & Spatial Data

#### GET `/api/heatmap`
Get heatmap data for map visualization.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "lat": 24.8607,
      "lng": 67.0011,
      "intensity": 0.8
    }
  ]
}
```

#### GET `/api/hotspots`
Get detected heat hotspots.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "hotspot_001",
      "center": [24.8607, 67.0011],
      "radius": 500,
      "avgSeverity": 4.2,
      "pointCount": 15,
      "avgTemperature": 38.5,
      "area": "Downtown District"
    }
  ]
}
```

### Health Check

#### GET `/api/health`
Check API health status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600
}
```

### Exports (Admin Only)

#### GET `/api/exports/reports`
Export reports data in CSV or JSON format (Admin only).

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `format` - Export format (`csv` or `json`, default: `json`)
- `status` - Filter by report status
- `startDate` - Start date filter (ISO format)
- `endDate` - End date filter (ISO format)

**Response (JSON):**
```json
{
  "success": true,
  "data": [
    {
      "id": "64a1b2c3d4e5f6789012345",
      "location": { "lat": 24.8607, "lng": 67.0011 },
      "severity": 4,
      "status": "approved",
      "createdAt": "2024-01-15T14:30:00.000Z"
    }
  ],
  "meta": {
    "total": 150,
    "exportedAt": "2024-01-15T14:30:00.000Z"
  }
}
```

## User Roles

- **USER**: Can submit reports, view dashboard
- **COMMUNITY_REPORTER**: Enhanced reporting capabilities
- **COMMUNITY_ANALYST**: Advanced analytics access
- **ADMIN**: Full system administration
- **OPERATIONS_ADMIN**: System operations and user management

## Security Features

- **Password Hashing**: bcrypt with salt factor 12
- **JWT Tokens**: Secure token generation with configurable expiration
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive validation using Joi
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet Security**: Security headers and protections
- **Error Handling**: Secure error responses without information leakage

## Error Responses

All errors follow this format:

```json
{
  "error": "Error type",
  "message": "Human readable error message",
  "messages": ["Array of validation messages (if applicable)"]
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (Validation errors)
- `401` - Unauthorized (Authentication required)
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found
- `409` - Conflict (Resource already exists)
- `429` - Too Many Requests (Rate limited)
- `500` - Internal Server Error

## 📝 Recent Changes

### May 2026
- **Package Updates**: Updated all dependencies to latest stable versions
  - Mongoose 8.0, Express 4.18, JWT 9.0, Joi 17.11
  - Added Multer 2.1 for file uploads
  - Added express-rate-limit 7.1 for enhanced security
- **Exports Route**: Added `/api/exports` endpoint for admin data export functionality
- **Project Structure**: Updated documentation to reflect controllers and routes organization

### April 2026
- **API Stability**: All endpoints tested and verified with frontend integration
- **Error Handling**: Enhanced error response consistency across all routes
- **Security**: Maintained CORS and rate limiting configurations for production readiness
- **Documentation**: Updated API endpoint documentation with accurate request/response examples

---

## Development

### Project Structure

```
Backend/
├── models/              # Mongoose models
│   ├── User.js         # User schema with bcrypt
│   └── Report.js       # Heat report schema with spatial data
├── controllers/         # Business logic
│   ├── reportController.js    # Report & image upload logic
│   └── dashboardController.js # Aggregated analytics logic
├── routes/              # API route handlers
│   ├── auth.js         # Authentication routes
│   ├── users.js        # User management routes
│   ├── reports.js      # Heat report routes
│   ├── heatmap.js      # Spatial heatmap data
│   ├── hotspots.js     # DBSCAN cluster data
│   ├── dashboard.js    # Analytics snapshots
│   └── exports.js      # Data export functionality
├── middleware/          # Custom middleware
│   ├── auth.js         # JWT authentication & RBAC guards
│   └── validation.js   # Joi input validation
├── utils/               # Utility functions
│   ├── jwt.js          # JWT token utilities
│   ├── upload.js       # Multer configuration
│   └── mockAuth.js     # Mock fallback logic
├── uploads/             # User-uploaded images (static)
├── server.js            # Main server file
├── package.json         # Dependencies and scripts
└── .env.example         # Environment variables template
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment mode | development |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | Token expiration | 7d |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/thermax |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:5173 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |

## Testing

### Manual Testing

Use Postman, curl, or any API client to test endpoints:

```bash
# Health check
curl http://localhost:5000/api/health

# Register user
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Demo Accounts

For testing purposes, you can create demo accounts:

- **Regular User**: `user@demo.com` / `demo123`
- **Admin User**: `admin@demo.com` / `admin123`

## Deployment

### Production Setup

1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Configure MongoDB with authentication
4. Set up proper CORS origins
5. Configure reverse proxy (nginx/Apache)
6. Set up SSL/TLS certificates
7. Configure monitoring and logging

### Docker Support

Create a `Dockerfile` for containerized deployment:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## License

MIT License - see LICENSE file for details.
