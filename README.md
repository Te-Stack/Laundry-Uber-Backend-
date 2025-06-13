# LaundryBer Backend

A backend service for a laundry service application that connects customers with laundry service providers.

## Features

- User authentication (customers and providers)
- Real-time availability tracking
- Location-based provider matching
- Laundry request management
- Real-time messaging
- Rating and review system

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd laundryber-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a PostgreSQL database named `laundryber`

4. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=laundryber
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

5. Start the server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user

### Users
- GET `/api/users/nearby-providers` - Get nearby laundry providers
- PATCH `/api/users/location` - Update user location
- PATCH `/api/users/profile` - Update user profile
- GET `/api/users/provider/:id` - Get provider profile

### Laundry Requests
- POST `/api/requests` - Create new request (customers)
- GET `/api/requests/provider` - Get provider's requests
- GET `/api/requests/customer` - Get customer's requests
- PATCH `/api/requests/:id/accept` - Accept request (providers)
- PATCH `/api/requests/:id/decline` - Decline request (providers)
- PATCH `/api/requests/:id/status` - Update request status
- PATCH `/api/requests/:id/rate` - Rate and review request

### Messages
- GET `/api/messages/conversation/:userId` - Get conversation history
- GET `/api/messages/request/:requestId` - Get request messages
- PATCH `/api/messages/read` - Mark messages as read
- GET `/api/messages/unread/count` - Get unread message count

## Real-time Features

The application uses Socket.IO for real-time features:

- User online/offline status
- Real-time messaging
- Request status updates

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation

## Error Handling

The API uses standard HTTP status codes and returns error messages in the following format:
```json
{
  "error": "Error message"
}
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 