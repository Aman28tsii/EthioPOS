📖 EthioPOS - Complete Documentation
📄 README.md
Markdown

# 🏪 EthioPOS - Point of Sale System
> A complete, production-ready Point of Sale system built for Ethiopian businesses.
> Built with React.js frontend and Node.js/Express backend with SQLite database.

![Version](https://img.shields.io/badge/version-2.1.0-blue)
![React](https://img.shields.io/badge/React-18.x-61DAFB)
![Node](https://img.shields.io/badge/Node.js-18.x-339933)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Default Credentials](#default-credentials)
- [API Reference](#api-reference)
- [Component Guide](#component-guide)
- [Role System](#role-system)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

EthioPOS is a **full-stack Point of Sale system** designed specifically
for Ethiopian retail businesses. It provides a complete solution for:

- Processing sales transactions
- Managing product inventory
- Tracking staff performance
- Analyzing business data
- Collecting customer feedback

The system supports **three user roles** (Owner, Admin, Staff) with
different levels of access and permissions.

---

## ✨ Features

### 🔐 Authentication & Security
- JWT-based authentication (8-hour sessions)
- Role-based access control (Owner / Admin / Staff)
- Bcrypt password hashing (12 rounds)
- Rate limiting (prevents brute force attacks)
- Helmet security headers
- First user automatically becomes Owner

### 🛒 Point of Sale (POS)
- Real-time product search
- Shopping cart with quantity management
- Stock validation before checkout
- Offline support (localStorage cache)
- Mobile-responsive cart drawer
- Receipt number generation (ETH-000001 format)
- Auto-updates stock after sale

### 📦 Inventory Management
- Full CRUD for products
- Category organization
- Low stock alerts
- Barcode support
- Soft delete (data preservation)
- Stock adjustment tools

### 👥 Staff Management
- Add / Edit / Remove staff members
- Role assignment (Owner / Admin / Staff)
- Account status management
  (Active / Pending / Inactive / Suspended)
- Pending approval workflow
- Staff performance tracking

### 📊 Analytics & Reporting
- Daily revenue tracking
- Order count monitoring
- Average transaction value
- Top selling products
- Revenue trends (7/30/365 days)
- Hourly sales breakdown
- Category performance
- Staff performance metrics
- Live data (auto-refreshes every 30 seconds)

### 💬 Comments & Feedback
- Customer feedback collection
- Comment types (Feedback / Complaint / Suggestion / Praise)
- Star rating system (1-5)
- Status workflow (Pending → Reviewed → Resolved)
- Search and filter
- Admin moderation tools

---

## 🛠 Tech Stack

### Frontend
| Technology      | Version | Purpose                    |
|----------------|---------|----------------------------|
| React.js       | 18.x    | UI Framework               |
| React Router   | 6.x     | Client-side routing        |
| Tailwind CSS   | 3.x     | Styling                    |
| Lucide React   | Latest  | Icons                      |
| Axios          | Latest  | HTTP client                |

### Backend
| Technology      | Version | Purpose                    |
|----------------|---------|----------------------------|
| Node.js        | 18.x    | Runtime environment        |
| Express.js     | 4.x     | Web framework              |
| SQLite3        | 5.x     | Database                   |
| JWT            | 9.x     | Authentication tokens      |
| Bcryptjs       | 2.x     | Password hashing           |
| Helmet         | 7.x     | Security headers           |
| Morgan         | 1.x     | Request logging            |
| Express Rate Limit | 7.x | Brute force protection    |

---

## 📁 Project Structure
EthioPOS/
│
├── 📁 client/ # React Frontend
│ ├── 📁 public/
│ │ └── index.html # HTML entry point
│ │
│ ├── 📁 src/
│ │ ├── 📁 api/
│ │ │ └── axios.js # Axios instance & interceptors
│ │ │
│ │ ├── 📁 components/
│ │ │ └── Layout.js # Main layout with sidebar
│ │ │
│ │ ├── 📁 pages/
│ │ │ ├── Login.js # Authentication page
│ │ │ ├── Dashboard.js # Home dashboard
│ │ │ ├── POS.js # Point of sale terminal
│ │ │ ├── Inventory.js # Product management
│ │ │ ├── Staff.js # Staff management
│ │ │ ├── Analytics.js # Business analytics
│ │ │ └── Comments.js # Customer feedback
│ │ │
│ │ ├── App.js # Root component & routes
│ │ └── index.js # React entry point
│ │
│ ├── package.json
│ └── tailwind.config.js
│
├── 📁 server/ # Node.js Backend
│ ├── 📁 config/
│ │ ├── db.js # Database setup & initialization
│ │ └── validateEnv.js # Environment validation
│ │
│ ├── 📁 middleware/
│ │ └── auth.js # JWT & role middleware
│ │
│ ├── 📁 utils/
│ │ └── apiResponse.js # Standardized responses
│ │
│ ├── 📁 database/
│ │ └── ethiopos.db # SQLite database file
│ │
│ ├── server.js # Main server file
│ ├── package.json
│ └── .env # Environment variables
│
└── README.md

text


---

## 🚀 Installation

### Prerequisites
```bash
# Required software
Node.js >= 16.0.0
npm >= 8.0.0
Step 1: Clone or Download
Bash

# If using git
git clone https://github.com/yourusername/ethiopos.git
cd ethiopos

# Or just navigate to your project folder
cd C:\Users\YourName\Desktop\Inventory-app
Step 2: Setup Backend
Bash

# Navigate to server folder
cd server

# Install dependencies
npm install

# Install security packages (if not already installed)
npm install helmet morgan express-rate-limit

# Create .env file (see Environment Setup below)
Step 3: Setup Frontend
Bash

# Navigate to client folder
cd ../client

# Install dependencies
npm install
Step 4: Start Both Servers
Terminal 1 - Backend:

Bash

cd server
npm run dev
# Server starts on http://localhost:5000
Terminal 2 - Frontend:

Bash

cd client
npm start
# App opens on http://localhost:3000
⚙️ Environment Setup
Create a .env file in the /server folder:

env

# ─── Server ───────────────────────────────────────
PORT=5000
NODE_ENV=development

# ─── Security (CHANGE IN PRODUCTION!) ─────────────
JWT_SECRET=your_super_secure_secret_key_minimum_32_characters

# ─── Frontend URLs ─────────────────────────────────
FRONTEND_URL=http://localhost:3000
PRODUCTION_URL=https://your-deployed-app.com

# ─── Database ──────────────────────────────────────
DATABASE_PATH=./database/ethiopos.db

# ─── Optional ──────────────────────────────────────
JWT_EXPIRES_IN=8h
SIGNUP_INVITE_CODE=your_invite_code
LOGIN_RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
🔑 Default Credentials
text

📧 Email:    owner@ethiopos.com
🔑 Password: owner123
👤 Role:     Owner

⚠️ IMPORTANT: Change this password immediately after first login!
🌐 API Reference
Authentication
text

POST   /api/auth/login           Login user
POST   /api/auth/signup          Register new user
GET    /api/auth/me              Get current user
PUT    /api/auth/change-password Change password
POST   /api/auth/logout          Logout
Products
text

GET    /api/products             Get all products
GET    /api/products/:id         Get single product
POST   /api/products             Create product    [Admin+]
PUT    /api/products/:id         Update product    [Admin+]
PATCH  /api/products/:id/stock   Update stock      [Admin+]
DELETE /api/products/:id         Delete product    [Admin+]
Sales
text

POST   /api/sales                Create sale
GET    /api/sales/history        Get sales history
GET    /api/sales/:id            Get single sale
PUT    /api/sales/:id/status     Update sale status [Admin+]
Staff
text

GET    /api/staff                Get all staff
GET    /api/staff/:id            Get single staff member
POST   /api/staff                Create staff member [Admin+]
PUT    /api/staff/:id            Update staff member [Admin+]
DELETE /api/staff/:id            Delete staff member [Owner]
Analytics
text

GET    /api/analytics/daily-stats         Daily KPIs
GET    /api/analytics/top-products        Top products
GET    /api/analytics/revenue-trend       Revenue over time
GET    /api/analytics/hourly-sales        Hourly breakdown
GET    /api/analytics/low-stock           Low stock alerts
GET    /api/analytics/staff-performance   Staff metrics [Admin+]
GET    /api/analytics/category-breakdown  By category
Comments
text

GET    /api/comments             Get all comments
POST   /api/comments             Add comment
PUT    /api/comments/:id         Update status     [Admin+]
DELETE /api/comments/:id         Delete comment    [Admin+]
System
text

GET    /api/health               Health check
GET    /api/status               Simple status
GET    /api/logs                 Activity logs     [Admin+]
GET    /api/categories           Get categories
POST   /api/categories           Create category   [Admin+]
DELETE /api/categories/:id       Delete category   [Admin+]
👤 Role System
text

┌─────────────────────────────────────────────────────┐
│                    ROLE HIERARCHY                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│   👑 OWNER                                          │
│   ├── Everything below +                            │
│   ├── Delete staff members                          │
│   ├── Assign any role (including owner)             │
│   ├── Approve pending accounts                      │
│   └── Permanently delete records                    │
│                                                     │
│   🛡️ ADMIN                                          │
│   ├── Everything below +                            │
│   ├── Add/Edit staff (not owner accounts)           │
│   ├── Manage products (add/edit/delete)             │
│   ├── View staff performance                        │
│   ├── Update sale status (refunds)                  │
│   └── Moderate comments                             │
│                                                     │
│   👤 STAFF                                          │
│   ├── Use POS terminal                              │
│   ├── View products                                 │
│   ├── View sales history                            │
│   ├── View analytics (basic)                        │
│   └── Add comments/feedback                         │
│                                                     │
└─────────────────────────────────────────────────────┘
🗄️ Database Schema
SQL

-- Users (Staff accounts)
users (
  id, name, email, password,
  role [owner|admin|staff],
  status [active|inactive|suspended],
  created_at, updated_at
)

-- Products (Inventory)
products (
  id, name, price, stock, category,
  barcode, description, image_url,
  is_active, created_at, updated_at
)

-- Orders (Sales transactions)
orders (
  id, total_amount, items_count,
  staff_id, status, payment_method,
  customer_name, customer_phone,
  notes, created_at
)

-- Order Items (What was sold)
order_items (
  id, order_id, product_id,
  quantity, price_at_time, created_at
)

-- Comments (Customer feedback)
comments (
  id, customer_name, message,
  type [feedback|complaint|suggestion|praise],
  rating [1-5],
  status [pending|reviewed|resolved],
  created_by, created_at
)

-- Categories
categories (
  id, name, description, created_at
)

-- Activity Logs (Audit trail)
activity_logs (
  id, user_id, action,
  entity_type, entity_id,
  details, ip_address, created_at
)
🚢 Deployment
Backend (Railway / Render)
Bash

# Set environment variables on your host:
NODE_ENV=production
JWT_SECRET=your_production_secret_minimum_32_chars
FRONTEND_URL=https://your-frontend.vercel.app
PORT=5000
Frontend (Vercel / Netlify)
Bash

# Build command
npm run build

# Set environment variable
REACT_APP_API_URL=https://your-backend.railway.app
Update axios.js for production
JavaScript

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
});
🔧 Troubleshooting
Common Issues
❌ Cannot find module 'helmet'

Bash

cd server
npm install helmet morgan express-rate-limit
❌ CORS Error

Bash

# Add your frontend URL to server .env
FRONTEND_URL=http://localhost:3000
❌ JWT Token Expired

Bash

# User needs to login again
# Token expires after 8 hours by default
# Change JWT_EXPIRES_IN in .env
❌ Database Error

Bash

# Delete the database file and restart
# It will auto-recreate with default data
rm server/database/ethiopos.db
npm run dev
❌ Port Already in Use

Bash

# Change PORT in .env
PORT=5001
❌ Login Fails After Setup

Bash

# Use default credentials
Email: owner@ethiopos.com
Password: owner123
📊 Performance Notes
SQLite is perfect for single-store deployments (up to ~50k orders)
For multiple stores or high traffic, migrate to PostgreSQL
Auto-refreshes analytics every 30 seconds
Cart persists in localStorage (survives page refresh)
Products cached in localStorage for offline use
🔐 Security Checklist
 Change default owner password
 Set strong JWT_SECRET (32+ characters)
 Set NODE_ENV=production in deployment
 Configure PRODUCTION_URL in .env
 Set up HTTPS on your server
 Review rate limiting settings
 Enable database backups
📞 Support
For issues or questions:

Check the Troubleshooting section above
Review browser console for errors
Check server terminal for backend errors
Verify .env file is configured correctly
📄 License
MIT License - Free to use for personal and commercial projects.

Built with ❤️ for Ethiopian businesses
EthioPOS v2.1.0

text


---

---

# 🧠 Detailed Component Explanation

---

## 🗂️ How Everything Connects
┌─────────────────────────────────────────────────────────┐
│ BROWSER │
│ │
│ index.js → App.js → Layout.js → [Page Component] │
│ │
│ Every page talks to backend through: │
│ src/api/axios.js → http://localhost:5000/api │
│ │
└─────────────────────────────────────────────────────────┘
↕ HTTP Requests (JWT Token)
┌─────────────────────────────────────────────────────────┐
│ BACKEND SERVER │
│ │
│ server.js → middleware/auth.js → Routes → db.js │
│ │
└─────────────────────────────────────────────────────────┘
↕ SQL Queries
┌─────────────────────────────────────────────────────────┐
│ SQLite DATABASE │
│ database/ethiopos.db │
└─────────────────────────────────────────────────────────┘

text


---

## 📄 src/api/axios.js
PURPOSE: Central HTTP client for all API calls

HOW IT WORKS:
┌────────────────────────────────────────────┐
│ 1. Every API call goes through this file │
│ 2. Automatically adds JWT token to headers│
│ 3. Catches 401 errors → redirects login │
│ 4. Base URL: http://localhost:5000/api │
└────────────────────────────────────────────┘

USED BY: Every page component (POS, Staff, Analytics, etc.)

KEY FEATURES:

Request interceptor: adds "Authorization: Bearer {token}"
Response interceptor: handles expired tokens automatically
Single place to change API URL for deployment
text


---

## 📄 src/App.js
PURPOSE: Root component - manages routing and authentication state

HOW IT WORKS:
┌────────────────────────────────────────────────────┐
│ 1. Checks localStorage for token on startup │
│ 2. If token found → shows app with Layout │
│ 3. If no token → redirects to /login │
│ 4. Listens for 'loginStateChange' event │
│ (fired on login/logout) │
└────────────────────────────────────────────────────┘

ROUTES DEFINED:
/login → Login page (public)
/dashboard → Dashboard (all roles)
/pos → POS Terminal (all roles)
/inventory → Inventory (admin+)
/staff → Staff Management (owner only)
/analytics → Analytics (admin+)
/comments → Comments (all roles)

AUTHENTICATION FLOW:
App starts
↓
Check localStorage for 'token'
↓
Token exists? → Decode it → Set user state
↓
Render Layout + correct page
↓
No token? → Render Login page

text


---

## 📄 src/components/Layout.js
PURPOSE: The permanent shell around all pages
(sidebar + topbar + page content area)

VISUAL STRUCTURE:
┌──────────┬─────────────────────────────────┐
│ │ TOP BAR (header) │
│ SIDEBAR ├─────────────────────────────────┤
│ │ │
│ Logo │ PAGE CONTENT │
│ Nav │ (children / Outlet) │
│ Links │ │
│ │ │
│ User │ │
│ Info │ │
└──────────┴─────────────────────────────────┘

KEY FEATURES:

SIDEBAR

Shows different nav items based on user role
Owner sees: Dashboard, POS, Inventory,
Staff, Analytics, Comments
Staff sees: Dashboard, POS, Comments only
Collapses on mobile (hamburger menu)
Shows current user name and role at bottom
TOP BAR

Hamburger menu button (mobile)
Current page title
Notification bell (with red dot)
User avatar with name
Logout button
MOBILE RESPONSIVE

Sidebar slides in from left on mobile
Dark overlay closes sidebar when tapped
Auto-closes sidebar when navigating
HOW LOGOUT WORKS:
User clicks Logout
↓
API call to POST /api/auth/logout (for logging)
↓
Remove 'token' from localStorage
Remove 'user' from localStorage
↓
Fire 'loginStateChange' event
↓
App.js catches event → shows Login page

text


---

## 📄 src/pages/Login.js
PURPOSE: User authentication page

HOW IT WORKS:
┌────────────────────────────────────────────┐
│ 1. User enters email + password │
│ 2. POST /api/auth/login │
│ 3. Server returns JWT token + user data │
│ 4. Save token to localStorage │
│ 5. Save user to localStorage │
│ 6. Fire 'loginStateChange' event │
│ 7. App.js redirects to /dashboard │
└────────────────────────────────────────────┘

VALIDATION:

Email format check
Password minimum length
Error messages displayed
ERROR HANDLING:

"Invalid email or password" (wrong credentials)
"Account inactive" (suspended users)
"Too many attempts" (rate limited)
text


---

## 📄 src/pages/Dashboard.js
PURPOSE: Home screen with business overview

WHAT IT SHOWS:
┌─────────────────────────────────────────────┐
│ STAT CARDS (4 cards in a row) │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │ Rev │ │Order │ │Staff │ │ Avg │ │
│ │ Today│ │Count │ │Active│ │Spend │ │
│ └──────┘ └──────┘ └──────┘ └──────┘ │
├─────────────────────────────────────────────┤
│ RECENT SALES TABLE │
│ Shows last 10 transactions with: │
│ - Receipt number │
│ - Amount │
│ - Staff name │
│ - Time │
├─────────────────────────────────────────────┤
│ LOW STOCK ALERTS │
│ Products below 10 units │
└─────────────────────────────────────────────┘

API CALLS:
GET /api/analytics/daily-stats → stat cards
GET /api/sales/history?range=today → recent sales
GET /api/analytics/low-stock → alerts

AUTO REFRESH: Every 30 seconds

text


---

## 📄 src/pages/POS.js
PURPOSE: Main sales terminal for processing transactions

VISUAL LAYOUT:
┌────────────────────────┬──────────────────┐
│ PRODUCT GRID │ CART SIDEBAR │
│ │ │
│ [Search bar] │ Active Cart │
│ │ ───────────── │
│ ┌────┐ ┌────┐ ┌────┐ │ Item 1 qty x │
│ │Prod│ │Prod│ │Prod│ │ Item 2 qty x │
│ └────┘ └────┘ └────┘ │ Item 3 qty x │
│ ┌────┐ ┌────┐ ┌────┐ │ ───────────── │
│ │Prod│ │Prod│ │Prod│ │ Total: X ETB │
│ └────┘ └────┘ └────┘ │ │
│ │ [Pay Button] │
└────────────────────────┴──────────────────┘

COMPONENTS INSIDE POS.js:

POS (main) - manages state
ProductCard - single product tile
CartContent - cart panel (reused for mobile)
CartItem - single cart row
SALE PROCESS:
Staff clicks product
↓
Added to cart (localStorage too)
↓
Staff clicks "Complete Payment"
↓
POST /api/sales with items array
↓
Server validates stock
↓
Server creates order + updates stock (transaction)
↓
Receipt number generated (ETH-000001)
↓
Cart cleared, products refreshed

MOBILE BEHAVIOR:

Product grid fills full screen
Cart button (bottom right) with item count badge
Cart slides in as drawer from right
Closes after successful payment
OFFLINE SUPPORT:

Products cached in localStorage as 'ultra_inventory'
Cart saved in localStorage as 'ultra_cart'
Cart survives page refresh
Shows cached products if API fails
STOCK VALIDATION:

Can't add out-of-stock items
Can't exceed available stock
Server validates again before completing sale
text


---

## 📄 src/pages/Inventory.js
PURPOSE: Product catalog management

FEATURES:
┌────────────────────────────────────────────┐
│ HEADER: Title + Search + Add Product btn │
├────────────────────────────────────────────┤
│ FILTERS: Category tabs + Stock filter │
├────────────────────────────────────────────┤
│ STATS: Total / Active / Low Stock / Out │
├────────────────────────────────────────────┤
│ PRODUCT TABLE: │
│ Name | Category | Price | Stock | Actions │
│ ─────────────────────────────────────────│
│ Shoes | Clothing | 500 | 23 | ✏️ 🗑️ │
│ Rice | Food | 150 | 5⚠️ | ✏️ 🗑️ │
│ Milk | Beverages| 80 | 0❌ | ✏️ 🗑️ │
└────────────────────────────────────────────┘

ADD/EDIT PRODUCT MODAL:

Product name
Price (ETB)
Stock quantity
Category (dropdown)
Barcode (optional)
Description (optional)
ACCESS CONTROL:

Staff: can VIEW products only
Admin/Owner: can add/edit/delete
LOW STOCK INDICATOR:

Yellow badge: stock < 10
Red badge: stock = 0
API CALLS:
GET /api/products → load all
POST /api/products → add new
PUT /api/products/:id → update
DELETE /api/products/:id → soft delete

text


---

## 📄 src/pages/Staff.js
PURPOSE: Team management for admins and owners

WHAT IT SHOWS:
┌────────────────────────────────────────────┐
│ HEADER: Title + Search + Add Member btn │
├────────────────────────────────────────────┤
│ STATUS TABS: All | Pending | Active | │
│ Inactive │
├────────────────────────────────────────────┤
│ STATS CARDS: │
│ Total Staff | Admins | Active │
├────────────────────────────────────────────┤
│ STAFF CARDS GRID: │
│ ┌─────────────┐ ┌─────────────┐ │
│ │ 👤 John │ │ 👤 Sara │ │
│ │ admin │ │ staff │ │
│ │ active │ │ pending │ │
│ │ john@... │ │ sara@... │ │
│ │ [Approve] │ │ │ │
│ └─────────────┘ └─────────────┘ │
└────────────────────────────────────────────┘

COMPONENTS INSIDE Staff.js:

Staff (main) - state management
StaffCard - individual person card
StatCard - number summary card
TabBtn - filter tab button
Modal - add/edit popup
FormInput - styled input field
FormSelect - styled dropdown
ModalActions - cancel/submit buttons
PENDING APPROVAL WORKFLOW:
New staff signs up
↓
Account created with status: 'pending'
↓
Owner sees them in "Pending" tab
↓
Owner clicks "Approve"
↓
Status changes to 'active'
↓
Staff can now login

ACCESS RULES:

Admin: can add/edit staff (not owners)
Owner: full control including delete
Self: cannot delete or change own role
API CALLS:
GET /api/staff → load all
POST /api/staff → add member
PUT /api/staff/:id → update member
DELETE /api/staff/:id → remove member

text


---

## 📄 src/pages/Analytics.js
PURPOSE: Business intelligence dashboard

WHAT IT SHOWS:
┌────────────────────────────────────────────┐
│ HEADER: Title + Last Sync time + Refresh │
├────────────────────────────────────────────┤
│ STAT CARDS (4): │
│ ┌──────────┐ ┌──────────┐ │
│ │ Daily │ │ Total │ │
│ │ Revenue │ │ Orders │ │
│ │ +15.3%↑ │ │ +8.2%↑ │ │
│ └──────────┘ └──────────┘ │
│ ┌──────────┐ ┌──────────┐ │
│ │ Active │ │ Avg. │ │
│ │ Staff │ │ Spend │ │
│ └──────────┘ └──────────┘ │
├────────────────────────────────────────────┤
│ TOP PRODUCTS TABLE: │
│ Rank | Product | Units | Revenue │
│ ───────────────────────────────────── │
│ 🥇 1 | Bread | 45 | Br 6,750 │
│ 🥈 2 | Milk | 38 | Br 3,040 │
│ 🥉 3 | Rice | 22 | Br 4,400 │
└────────────────────────────────────────────┘

CHANGE INDICATORS:
+15.3%↑ = Better than yesterday (green)
-8.2%↓ = Worse than yesterday (red)

AUTO REFRESH:
useEffect sets interval every 30 seconds
→ re-fetches all analytics data

API CALLS:
GET /api/analytics/daily-stats → stat cards
GET /api/analytics/top-products → product table

text


---

## 📄 src/pages/Comments.js
PURPOSE: Customer feedback collection and management

WHAT IT SHOWS:
┌────────────────────────────────────────────┐
│ HEADER: Title + Add Comment button │
├────────────────────────────────────────────┤
│ STATS: Total | Pending | Resolved | Rating│
├────────────────────────────────────────────┤
│ FILTERS: Search | Type | Status │
├────────────────────────────────────────────┤
│ COMMENT CARDS GRID: │
│ ┌──────────────────┐ │
│ │ 👤 John Smith │ pending │
│ │ ⭐⭐⭐⭐⭐ │ │
│ │ feedback │ │
│ │ "Great service!" │ │
│ │ [Mark Reviewed] │ │
│ └──────────────────┘ │
└────────────────────────────────────────────┘

COMMENT TYPES (color coded):
💬 Feedback → Blue
⚠️ Complaint → Red
💡 Suggestion → Purple
⭐ Praise → Green

STATUS WORKFLOW:
pending → reviewed → resolved

Staff adds comment (pending)
↓
Admin reviews it (reviewed)
↓
Admin resolves it (resolved)

COMPONENTS INSIDE Comments.js:

Comments (main) - state management
CommentCard - individual feedback card
AddCommentModal - form to add new comment
API CALLS:
GET /api/comments → load all
POST /api/comments → add new
PUT /api/comments/:id → update status
DELETE /api/comments/:id → remove [Admin+]

text


---

## 📄 server.js
PURPOSE: Main backend API server

WHAT IT DOES:
┌────────────────────────────────────────────┐
│ 1. Loads environment variables (.env) │
│ 2. Sets up security (Helmet, CORS, Rate) │
│ 3. Defines all API routes │
│ 4. Handles errors globally │
│ 5. Starts listening on port 5000 │
└────────────────────────────────────────────┘

MIDDLEWARE CHAIN (every request goes through):
Request arrives
↓
Helmet (adds security headers)
↓
CORS (checks allowed origins)
↓
Rate Limiter (max 100 req/15 min)
↓
Body Parser (reads JSON body)
↓
Morgan (logs request)
↓
verifyToken (checks JWT) ← only protected routes
↓
requireAdmin/requireOwner ← only restricted routes
↓
Route Handler (your actual code)
↓
Response sent

SALE TRANSACTION (most important):
POST /api/sales
↓
Validate all items have stock
↓
BEGIN TRANSACTION
↓
INSERT into orders table
↓
For each item:
UPDATE products (reduce stock)
INSERT into order_items
↓
COMMIT (all succeed) OR ROLLBACK (any fail)
↓
Return receipt number

text


---

## 📄 config/db.js
PURPOSE: Database setup and initialization

WHAT IT CREATES ON FIRST RUN:
✅ users table
✅ products table
✅ orders table
✅ order_items table
✅ comments table
✅ categories table
✅ activity_logs table
✅ Performance indexes
✅ Default owner account (owner@ethiopos.com)
✅ Default categories (Food, Beverages, etc.)

PERFORMANCE SETTINGS:
PRAGMA foreign_keys = ON → enforces relationships
PRAGMA journal_mode = WAL → better concurrent reads

text


---

## 📄 middleware/auth.js
PURPOSE: Protect routes from unauthorized access

FUNCTIONS:
verifyToken → checks JWT is valid and not expired
requireAdmin → allows admin + owner only
requireOwner → allows owner only
requireStaff → allows all logged-in users
optionalAuth → attaches user if token exists

HOW JWT WORKS:
Login → Server creates token:
jwt.sign({ id, email, role }, SECRET, { expiresIn: '8h' })

Request → Client sends:
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...

Server verifies:
jwt.verify(token, SECRET) → { id, email, role }

Token expires after 8 hours
→ Client gets 401 → redirects to login

text


---

## 🔄 Complete Data Flow Example
EXAMPLE: Staff makes a sale

Staff opens POS page
→ GET /api/products
→ Products shown as cards

Staff clicks "Bread" product
→ addToCart() called
→ cart state updated
→ localStorage updated

Staff clicks "Complete Payment"
→ handlePayment() called
→ POST /api/sales {
total_amount: 150,
items: [{product_id: 1, qty: 2, price: 75}]
}

Server receives request
→ verifyToken middleware checks JWT
→ validateStock: SELECT stock FROM products WHERE id=1
→ stock=10, requested=2 ✅
→ BEGIN TRANSACTION
→ INSERT INTO orders (150, 2, staff_id)
→ UPDATE products SET stock=8 WHERE id=1
→ INSERT INTO order_items (order_id, 1, 2, 75)
→ COMMIT
→ return { receiptNumber: 'ETH-000023' }

Frontend receives response
→ Cart cleared
→ showNotification('Sale completed! ETH-000023')
→ fetchData() called (refreshes products)
→ Products now show stock=8 for Bread

text


---

## 📊 Quick Stats

| Metric | Count |
|--------|-------|
| Frontend Pages | 7 |
| Frontend Components | 20+ |
| Backend API Routes | 35+ |
| Database Tables | 7 |
| User Roles | 3 |
| Lines of Code | ~5,000+ |

---

*EthioPOS v2.1.0 - Complete Documentation*
*Built for Ethiopian retail businesses* 🇪🇹