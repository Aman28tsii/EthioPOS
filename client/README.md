# 🏪 EthioPOS - Point of Sale System
> A complete, production-ready Point of Sale system built for Ethiopian businesses.
> Built with React.js frontend and Node.js/Express backend with SQLite database.

!Version
!React
!Node
!License

---

## 📋 Table of Contents

- Overview
- Features
- Tech Stack
- Project Structure
- Installation
- Environment Setup
- Default Credentials
- API Reference
- Component Guide
- Role System
- Database Schema
- Deployment
- Troubleshooting

---

## 🎯 Overview

EthioPOS is a full-stack Point of Sale system designed specifically
for Ethiopian retail businesses. It provides a complete solution for:

- Processing sales transactions
- Managing product inventory
- Tracking staff performance
- Analyzing business data
- Collecting customer feedback

The system supports three user roles (Owner, Admin, Staff) with
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