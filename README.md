# 🌟 Star Mobiles Backend API

Express.js backend API server for Star Mobiles shop.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## 📡 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | Health check | ❌ |
| GET | `/api/products` | Get all products | ❌ |
| GET | `/api/products/:id` | Get product by ID | ❌ |
| GET | `/api/cart` | Get user's cart | ✅ |
| POST | `/api/cart` | Add to cart | ✅ |
| PUT | `/api/cart/:id` | Update cart item | ✅ |
| DELETE | `/api/cart/:id` | Remove from cart | ✅ |
| GET | `/api/bookings` | Get user's bookings | ✅ |
| POST | `/api/bookings` | Create booking | ✅ |
| PUT | `/api/bookings/:id` | Update booking (Admin) | ✅ |
| DELETE | `/api/bookings/:id` | Delete booking | ✅ |

## ⚙️ Environment Variables

Create a `.env` file:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Server
PORT=5000
NODE_ENV=production

# CORS
ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:8080
```

## 🚢 Deployment (Railway/Render)

1. Create new project on Railway or Render
2. Connect your GitHub repo
3. Add environment variables
4. Deploy!

### Railway
```bash
railway login
railway init
railway up
```

### Render
- Build Command: `npm install`
- Start Command: `npm start`

## 📁 Project Structure

```
star-mobiles-backend/
├── config/
│   └── supabase.js     # Supabase client
├── middleware/
│   └── auth.js         # JWT authentication
├── routes/
│   ├── auth.js         # Auth routes
│   ├── bookings.js     # Booking routes
│   ├── cart.js         # Cart routes
│   └── products.js     # Product routes
├── database/
│   ├── schema.sql      # Database schema
│   └── sample_products.sql
├── server.js           # Express server
├── package.json
└── .env
```

## 👤 Author

**Hariharan**
