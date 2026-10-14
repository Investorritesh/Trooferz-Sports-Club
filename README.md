# Trooferz Sports Turf & Club — Full-Stack Management Platform

> **A production-grade sports club, turf reservation, and membership management web application.**  
> Optimized for **Academic College Project Submissions** (B.Tech / BCA / MCA / CS) and **Commercial Turnkey Sale / White-Labeling** to turf and sports academy owners.

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-purple.svg)](https://vitejs.dev/)
[![Database](https://img.shields.io/badge/Database-MySQL%20%7C%20Embedded%20SQLite-orange.svg)](#database-architecture)
[![Status](https://img.shields.io/badge/Status-Ready%20for%20Submission%20%26%20Sale-success.svg)](#)

---

## 📑 Special Project Documentation

This repository includes two comprehensive guides tailored for academic defense and commercial distribution:

1. **🎓 [Academic College Project Report & Viva Voce Q&A](COLLEGE_PROJECT_REPORT.md)**  
   *Contains Project Synopsis, Problem Statement, 3-Tier Architecture Diagram, DFD Level 0 & Level 1, 3NF Database Schema, Double-Booking Concurrency Algorithm, and 20+ Viva Voce questions & model answers.*
2. **💼 [Commercial Selling & White-Labeling Guide](COMMERCIAL_SELLING_GUIDE.md)**  
   *Contains Business Pitch Script, Target Markets (Box Cricket, Football Turfs, Pickleball & Badminton Academies), 5-Minute Rebranding Instructions, Monetization Pricing Models, and Cloud Deployment instructions.*

---

## ⚡ 1-Click Instant Run (Windows)

You can launch both the frontend and backend with a single click:

- **Option A (Double-Click):** Double-click **`start.bat`** in the project root.
- **Option B (PowerShell):** Run `.\start-app.ps1` in your terminal.

```text
Backend API: http://localhost:5000
Frontend UI: http://localhost:5173
API Health:  http://localhost:5000/api/health
```

> **Note on Zero-Config Database:** If MySQL / XAMPP is not running, the application **automatically falls back to an embedded SQLite database (`trooferz.db`)** pre-seeded with complete demo records. No complex setup or manual database import required to start testing immediately!

---

## 🔑 Demo Login Accounts

| Role | Email Address | Password | Permissions & Access |
| :--- | :--- | :--- | :--- |
| **Admin / Owner** | `admin@trooferz.demo` | `ChangeMe@123` | Full control: Revenue analytics, maintenance slot blocker, sports/facilities management, membership plans, user manager, audit logs |
| **Standard Member** | `user@trooferz.demo` | `User@123` | Turf & court booking, instant digital pass, membership plan subscription, notifications, profile management |

---

## 🛠 Technology Stack

- **Frontend:** React 18, Vite, React Router v6, Recharts (Data Visualizations), Lucide React / SVG Icons
- **Backend:** Node.js, Express 4.21, RESTful API architecture
- **Database Architecture:**
  - *Primary (Production):* MySQL 8 (InnoDB, Foreign Key Constraints, Virtual Generated Keys)
  - *Fallback (Zero-Config):* Node.js Embedded SQLite (`node:sqlite`) with custom-mapped SQL dialect functions
- **Security:** JSON Web Token (JWT) + Bcryptjs cryptographic hashing (10 salt rounds), Role-Based Access Control (RBAC)
- **Validation:** Joi Schema Validator

---

## 📁 Repository Structure

```text
miniproject/
├── start.bat                  # 1-Click Windows CMD launcher
├── start-app.ps1              # 1-Click PowerShell launcher
├── COLLEGE_PROJECT_REPORT.md  # Comprehensive academic project report & Viva Q&A
├── COMMERCIAL_SELLING_GUIDE.md# Business pitch, pricing, and white-labeling guide
├── setup-local.ps1            # Automated dependency installer & .env generator
├── package.json               # Root scripts (install:all, dev, build, check:auth)
├── render.yaml                # Render cloud deployment blueprint
├── database/
│   ├── schema.sql             # 12-table relational schema (3NF, MySQL/Postgres compatible)
│   ├── seed.sql               # Production-like initial demo seed records
│   └── reset_demo.sql         # Fast database wipe and reset script
├── backend/
│   ├── .env.example           # Environment template for local server
│   ├── package.json           # Backend dependencies and scripts
│   └── src/
│       ├── config/            # DB pool & automatic SQLite/MySQL failover logic
│       ├── controllers/       # Auth, Booking, Slot, Facility, Membership, Dashboard
│       ├── middleware/        # JWT verifier & RBAC permission guards
│       ├── routes/            # REST API endpoints
│       ├── scripts/           # DB initialization and account check utilities
│       └── server.js          # Express app entrypoint & error handling
└── frontend/
    ├── .env.example           # Frontend environment template
    ├── package.json           # React dependencies
    ├── vite.config.js         # Vite bundler configuration
    ├── vercel.json            # Vercel deployment manifest
    ├── public/                # High-resolution sport & court photography
    └── src/
        ├── components/        # Reusable UI cards, tables, badges, protected routes
        ├── context/           # AuthContext (JWT state & persistent login session)
        ├── layouts/           # AdminLayout & UserLayout
        ├── pages/             # Home, Sports, Facilities, Bookings, Membership, Profile
        └── pages/admin/       # Dashboard, Slot Management, Users, Reports, Settings
```

---

## 🚀 Manual Step-by-Step Setup

If you prefer setting up manually without `start.bat`:

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v18+ (Node 20 or Node 22 recommended)
- Optional: XAMPP / MySQL (if using MySQL instead of the built-in SQLite)

### 2. Install All Dependencies
From the repository root:
```powershell
npm run install:all
```
*(Or run `powershell -ExecutionPolicy Bypass -File ./setup-local.ps1`)*

### 3. Configure Environment Variables
Copy the `.env.example` templates:
```powershell
# Backend
copy backend\.env.example backend\.env

# Frontend
copy frontend\.env.example frontend\.env
```

### 4. (Optional) Setup MySQL via phpMyAdmin
*Skip this step if using the automatic embedded SQLite database.*
1. Open phpMyAdmin (`http://localhost/phpmyadmin`).
2. Create database `trooferz_sports_club`.
3. Import `database/schema.sql` followed by `database/seed.sql`.

### 5. Launch Services
Run backend and frontend in separate terminals:

**Terminal 1 (Backend):**
```powershell
npm run dev:backend
```
*(API starts at `http://localhost:5000`)*

**Terminal 2 (Frontend):**
```powershell
npm run dev:frontend
```
*(UI starts at `http://localhost:5173`)*

---

## 🔒 Security & Concurrency Highlights

### 1. Zero Double-Booking Guarantee
Slot collisions are prevented at the database kernel level through an indexed virtual generated column:
```sql
active_slot_key VARCHAR(80) GENERATED ALWAYS AS (
  CASE WHEN status IN ('PENDING','CONFIRMED') 
  THEN CONCAT(facility_id,'/',time_slot_id,'/',booking_date) 
  ELSE NULL 
  END
) VIRTUAL,
UNIQUE KEY uq_active_booking_slot(active_slot_key)
```
Concurrent requests attempting to claim the same court and time slot trigger a database constraint violation, rejecting the second request with an immediate `HTTP 409 Conflict`.

### 2. Dual-Engine Failover Architecture
The application dynamically selects the active database connection:
- If MySQL is running on `127.0.0.1:3306`, it utilizes connection pooling via `mysql2/promise`.
- If MySQL is offline or connection times out, it transparently routes queries to Node's built-in `DatabaseSync` (`node:sqlite`) with SQL polyfills for `CURDATE()`, `DATE_FORMAT()`, `NOW()`, and `CONCAT()`.

---

## 🌐 REST API Endpoints Overview

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | System status, database health & engine info |
| `POST` | `/api/auth/register` | Public | Register new member account |
| `POST` | `/api/auth/login` | Public | Customer login (returns JWT token) |
| `POST` | `/api/auth/admin-login` | Public | Admin login (verifies `ADMIN` role) |
| `GET` | `/api/auth/me` | Authenticated | Fetch current profile from JWT session |
| `GET` | `/api/sports` | Public | List available sports |
| `GET` | `/api/facilities` | Public | List active courts and turf facilities |
| `GET` | `/api/slots/available` | Public | Query open slots by date & facility |
| `POST` | `/api/slots/block` | Admin | Block slots for maintenance/tournaments |
| `GET` | `/api/bookings` | Authenticated | View personal bookings |
| `POST` | `/api/bookings` | Authenticated | Create new booking (with collision check) |
| `GET` | `/api/memberships/plans` | Public | View active membership tiers |
| `POST` | `/api/memberships/activate` | Authenticated | Subscribe to membership tier |
| `GET` | `/api/dashboard` | Admin | Live revenue, bookings count, and charts |
| `GET` | `/api/users` | Admin | View registered users & manage roles |

---

## 🧪 Verification & Health Check

Verify your setup with these commands:

1. **Check Backend Health:**
   ```powershell
   curl http://localhost:5000/api/health
   ```
   *Expected: `{"ok":true,"service":"trooferz-api","database":"connected","version":"1.1.0"}`*

2. **Verify Demo Accounts:**
   ```powershell
   npm run check:auth
   ```
   *Checks both `user@trooferz.demo` and `admin@trooferz.demo` password hashes and database integrity.*

---

## 📜 Academic & Commercial Disclaimer
This project is prepared for educational evaluation, technical demonstration, and commercial white-labeling. Integrations for external paid gateways (SMS providers, physical turnstiles, biometric scanners) are architected via modular endpoints ready for API key plug-in.
