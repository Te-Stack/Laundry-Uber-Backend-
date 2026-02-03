# LaundryBer API Documentation

> **Base URL**: `http://localhost:3000/api`  
> **WebSocket URL**: `ws://localhost:3000`

## Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Laundry Requests](#laundry-requests)
4. [Payments](#payments)
5. [Services](#services)
6. [Notifications](#notifications)
7. [Messages](#messages)
8. [Real-time Events (Socket.IO)](#real-time-events-socketio)

---

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Register User

```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "fullName": "John Doe",
  "phoneNumber": "+2348012345678",
  "userType": "customer"  // or "provider"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "phoneNumber": "+2348012345678",
    "userType": "customer",
    "isOnline": false,
    "rating": 0,
    "totalRatings": 0
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Login User

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Get Current User

```http
GET /api/auth/me
```

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "John Doe",
  "phoneNumber": "+2348012345678",
  "userType": "customer",
  "isOnline": true,
  "latitude": 6.5244,
  "longitude": 3.3792,
  "rating": 4.5,
  "totalRatings": 10
}
```

---

## Users

### Update Profile

```http
PATCH /api/users/profile
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "fullName": "Updated Name",
  "phoneNumber": "+2349012345678"
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": { ... }
}
```

### Update Location

```http
PATCH /api/users/location
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "latitude": 6.5244,
  "longitude": 3.3792
}
```

**Response (200):**
```json
{
  "message": "Location updated successfully"
}
```

### Get Nearby Providers

```http
GET /api/users/nearby-providers?latitude=6.5244&longitude=3.3792&radius=5
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `latitude` (required): User's latitude
- `longitude` (required): User's longitude
- `radius` (optional): Search radius in km (default: 5)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "fullName": "Provider Name",
    "rating": 4.8,
    "totalRatings": 25,
    "isOnline": true,
    "distance": 2.5
  }
]
```

### Get Provider Profile

```http
GET /api/users/provider/:id
```

**Headers:** `Authorization: Bearer <token>` (Customer only)

**Response (200):**
```json
{
  "id": "uuid",
  "fullName": "Provider Name",
  "phoneNumber": "+2348012345678",
  "userType": "provider",
  "isOnline": true,
  "rating": 4.8,
  "totalRatings": 25,
  "schedule": {
    "monday": { "start": "09:00", "end": "18:00" },
    "tuesday": { "start": "09:00", "end": "18:00" }
  }
}
```

### Toggle Provider Availability

```http
PATCH /api/users/availability
```

**Headers:** `Authorization: Bearer <token>` (Provider only)

**Request Body:**
```json
{
  "isOnline": true
}
```

**Response (200):**
```json
{
  "message": "You are now online",
  "isOnline": true
}
```

### Set Provider Schedule

```http
POST /api/users/schedule
```

**Headers:** `Authorization: Bearer <token>` (Provider only)

**Request Body:**
```json
{
  "schedule": {
    "monday": { "start": "09:00", "end": "18:00" },
    "tuesday": { "start": "09:00", "end": "18:00" },
    "wednesday": { "start": "09:00", "end": "18:00" },
    "thursday": { "start": "09:00", "end": "18:00" },
    "friday": { "start": "09:00", "end": "17:00" },
    "saturday": { "start": "10:00", "end": "14:00" },
    "sunday": null
  }
}
```

**Response (200):**
```json
{
  "message": "Schedule updated successfully",
  "schedule": { ... }
}
```

### Get Provider Schedule

```http
GET /api/users/provider/:id/schedule
```

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "isOnline": true,
  "schedule": { ... }
}
```

---

## Laundry Requests

### Create Request

```http
POST /api/requests
```

**Headers:** `Authorization: Bearer <token>` (Customer only)

**Request Body:**
```json
{
  "pickupAddress": "123 Lagos Street, Victoria Island",
  "deliveryAddress": "456 Ikeja Road, Lagos",
  "pickupTime": "2026-02-01T10:00:00.000Z",
  "items": [
    { "type": "shirt", "quantity": 5, "price": 500 },
    { "type": "trousers", "quantity": 3, "price": 450 }
  ],
  "totalAmount": 3850,
  "notes": "Please handle with care"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "customerId": "uuid",
  "providerId": null,
  "status": "pending",
  "paymentStatus": "pending",
  "pickupAddress": "123 Lagos Street, Victoria Island",
  "deliveryAddress": "456 Ikeja Road, Lagos",
  "pickupTime": "2026-02-01T10:00:00.000Z",
  "items": [...],
  "totalAmount": 3850,
  "notes": "Please handle with care",
  "createdAt": "2026-01-31T18:00:00.000Z"
}
```

### Get Customer Requests

```http
GET /api/requests/customer
```

**Headers:** `Authorization: Bearer <token>` (Customer)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "status": "pending",
    "paymentStatus": "pending",
    "totalAmount": 3850,
    "pickupAddress": "...",
    "deliveryAddress": "...",
    "createdAt": "2026-01-31T18:00:00.000Z",
    "provider": {
      "id": "uuid",
      "fullName": "Provider Name",
      "rating": 4.8
    }
  }
]
```

### Get Provider Requests

```http
GET /api/requests/provider
```

**Headers:** `Authorization: Bearer <token>` (Provider)

**Response (200):** Similar to customer requests

### Get Pending Requests (for Providers to Accept)

```http
GET /api/requests/pending
```

**Headers:** `Authorization: Bearer <token>` (Provider)

### Accept Request

```http
PATCH /api/requests/:id/accept
```

**Headers:** `Authorization: Bearer <token>` (Provider only)

**Response (200):**
```json
{
  "id": "uuid",
  "status": "accepted",
  "providerId": "provider-uuid"
}
```

### Decline Request

```http
PATCH /api/requests/:id/decline
```

**Headers:** `Authorization: Bearer <token>` (Provider only)

**Response (200):**
```json
{
  "id": "uuid",
  "status": "declined"
}
```

### Update Request Status

```http
PATCH /api/requests/:id/status
```

**Headers:** `Authorization: Bearer <token>` (Provider only)

**Request Body:**
```json
{
  "status": "picked_up"  // accepted | picked_up | washing | ready | out_for_delivery | delivered
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "status": "picked_up"
}
```

**Status Flow:**
```
pending → accepted → picked_up → washing → ready → out_for_delivery → delivered
       ↘ declined
```

### Rate Request

```http
PATCH /api/requests/:id/rate
```

**Headers:** `Authorization: Bearer <token>` (Customer only, after delivery)

**Request Body:**
```json
{
  "rating": 5,
  "review": "Excellent service! Very professional."
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "rating": 5,
  "review": "Excellent service! Very professional."
}
```

---

## Payments

### Initialize Payment

```http
POST /api/payments/initialize
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "requestId": "uuid",
  "amount": 3850,
  "email": "customer@example.com",
  "callbackUrl": "https://yourapp.com/payment/callback"
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "authorizationUrl": "https://checkout.paystack.com/abc123",
    "accessCode": "abc123",
    "reference": "LB_1706728800000_a1b2c3d4"
  }
}
```

**Frontend Usage:**
1. Call this endpoint to get `authorizationUrl`
2. Redirect user to `authorizationUrl` (or open in WebView)
3. User completes payment on Paystack
4. User is redirected back to `callbackUrl`
5. Call verify endpoint with `reference`

### Verify Payment

```http
GET /api/payments/verify/:reference
```

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "paymentStatus": "success",
    "reference": "LB_1706728800000_a1b2c3d4",
    "amount": 3850,
    "channel": "card",
    "paidAt": "2026-01-31T18:30:00.000Z"
  }
}
```

### Get Payment History

```http
GET /api/payments/history
```

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "reference": "LB_1706728800000_a1b2c3d4",
    "amount": 3850,
    "status": "success",
    "channel": "card",
    "paidAt": "2026-01-31T18:30:00.000Z",
    "request": {
      "id": "uuid",
      "pickupAddress": "..."
    }
  }
]
```

### Get Single Payment

```http
GET /api/payments/:id
```

**Headers:** `Authorization: Bearer <token>`

---

## Services

### Get All Services

```http
GET /api/services
```

**Query Parameters:**
- `category` (optional): Filter by category (washing, dry_cleaning, ironing, folding, special)
- `providerId` (optional): Filter by provider

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Wash & Fold",
    "description": "Standard washing and folding service",
    "basePrice": 500,
    "unit": "per_kg",
    "estimatedDuration": 24,
    "category": "washing",
    "isActive": true,
    "provider": {
      "id": "uuid",
      "fullName": "Provider Name",
      "rating": 4.8
    }
  }
]
```

### Get Single Service

```http
GET /api/services/:id
```

### Create Service (Provider Only)

```http
POST /api/services
```

**Headers:** `Authorization: Bearer <token>` (Provider only)

**Request Body:**
```json
{
  "name": "Wash & Fold",
  "description": "Standard washing and folding service",
  "basePrice": 500,
  "unit": "per_kg",
  "estimatedDuration": 24,
  "category": "washing"
}
```

**Categories:** `washing`, `dry_cleaning`, `ironing`, `folding`, `special`  
**Units:** `per_piece`, `per_kg`, `per_load`

### Update Service (Provider Only)

```http
PATCH /api/services/:id
```

**Headers:** `Authorization: Bearer <token>` (Provider only)

### Delete Service (Provider Only)

```http
DELETE /api/services/:id
```

**Headers:** `Authorization: Bearer <token>` (Provider only)

### Get My Services (Provider Only)

```http
GET /api/services/provider/my-services
```

**Headers:** `Authorization: Bearer <token>` (Provider only)

---

## Notifications

### Get All Notifications

```http
GET /api/notifications
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `unreadOnly` (optional): "true" to get only unread notifications
- `type` (optional): Filter by type (order, payment, message, system, promo)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "title": "Order Accepted",
    "message": "Your laundry order has been accepted by Provider Name",
    "type": "order",
    "isRead": false,
    "metadata": { "requestId": "uuid" },
    "createdAt": "2026-01-31T18:00:00.000Z"
  }
]
```

### Get Unread Count

```http
GET /api/notifications/unread/count
```

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "count": 5
}
```

### Mark as Read

```http
PATCH /api/notifications/:id/read
```

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "uuid",
  "isRead": true
}
```

### Mark All as Read

```http
PATCH /api/notifications/read-all
```

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "All notifications marked as read"
}
```

### Delete Notification

```http
DELETE /api/notifications/:id
```

**Headers:** `Authorization: Bearer <token>`

### Clear Read Notifications

```http
DELETE /api/notifications/clear/read
```

**Headers:** `Authorization: Bearer <token>`

---

## Messages

### Get Conversations

```http
GET /api/messages/conversations
```

**Headers:** `Authorization: Bearer <token>`

### Get Messages with User

```http
GET /api/messages/:userId
```

**Headers:** `Authorization: Bearer <token>`

### Send Message

```http
POST /api/messages
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "receiverId": "uuid",
  "content": "Hello, when will my laundry be ready?"
}
```

---

## Real-time Events (Socket.IO)

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Events to Listen For

| Event | Payload | Description |
|-------|---------|-------------|
| `requestAccepted` | `{ request }` | When provider accepts your request |
| `requestStatusUpdate` | `{ request }` | When request status changes |
| `newMessage` | `{ message }` | When you receive a new message |
| `providerLocationUpdate` | `{ latitude, longitude }` | Provider's real-time location |
| `newNotification` | `{ notification }` | New notification received |

### Events to Emit

| Event | Payload | Description |
|-------|---------|-------------|
| `joinRoom` | `{ requestId }` | Join a request room for updates |
| `leaveRoom` | `{ requestId }` | Leave a request room |
| `updateLocation` | `{ latitude, longitude }` | Update your current location |
| `sendMessage` | `{ receiverId, content }` | Send a message |

### Example Usage

```javascript
// Connect
const socket = io('http://localhost:3000', {
  auth: { token: localStorage.getItem('token') }
});

// Join request room for updates
socket.emit('joinRoom', { requestId: 'request-uuid' });

// Listen for status updates
socket.on('requestStatusUpdate', (data) => {
  console.log('Request updated:', data.request.status);
});

// Listen for new messages
socket.on('newMessage', (data) => {
  console.log('New message:', data.message.content);
});

// Listen for notifications
socket.on('newNotification', (data) => {
  showNotification(data.notification.title, data.notification.message);
});

// Update location (for providers)
socket.emit('updateLocation', { latitude: 6.5244, longitude: 3.3792 });
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized (Invalid/Missing token) |
| 403 | Forbidden (Insufficient permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Frontend Integration Checklist

- [ ] Store JWT token in secure storage (localStorage/AsyncStorage)
- [ ] Include token in all authenticated requests
- [ ] Handle 401 errors (redirect to login)
- [ ] Implement Socket.IO for real-time updates
- [ ] Handle Paystack payment redirect flow
- [ ] Implement location services for nearby providers
- [ ] Set up push notification handling
- [ ] Implement proper error handling and user feedback

---

## Environment Variables (For Development)

```env
API_BASE_URL=http://localhost:3000/api
SOCKET_URL=ws://localhost:3000
PAYSTACK_PUBLIC_KEY=pk_test_xxxx
```

---

## Sample Frontend Axios Setup

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

**Questions?** Contact the backend team for support!
