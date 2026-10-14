# Academic Project Report: Trooferz Sports Club & Turf Management System

---

## Project Metadata
- **Project Title:** Trooferz Sports Club & Turf Management System (Full-Stack Web Platform)
- **Course / Domain:** Mini Project / Capstone Project (Computer Science & Engineering / Information Technology / Computer Applications)
- **Technology Stack:** React 18, Vite, Node.js, Express, MySQL 8 / SQLite (Dual-Engine Fallback), JWT, RESTful API
- **Architecture:** Client-Server / 3-Tier Web Architecture with Role-Based Access Control (RBAC)

---

## 1. Abstract
The **Trooferz Sports Club & Turf Management System** is a full-stack web application developed to modernize and automate turf reservations, multi-sport facility scheduling, and customer membership subscriptions. Traditional sports club management systems rely on manual ledger books or unstructured phone calls, resulting in frequent double-bookings, billing discrepancies, lack of real-time slot transparency, and inefficient resource allocation. 

This project solves these challenges by implementing an automated, high-concurrency booking platform. Key innovations include:
1. **Mathematical Double-Booking Elimination:** Utilizing SQL database-level generated virtual keys with unique constraints (`active_slot_key`) to guarantee zero duplicate bookings even under concurrent network requests.
2. **Dual-Database Resiliency Architecture:** An automated fallback engine capable of running on enterprise MySQL (XAMPP/Cloud) or immediately switching to an embedded zero-configuration SQLite engine (`node:sqlite`) with custom-mapped SQL functions (`CURDATE`, `DATE_FORMAT`, `YEARWEEK`, `CONCAT`).
3. **Role-Based Access Control (RBAC):** Strict security perimeter powered by JSON Web Tokens (JWT) and Bcrypt cryptographic hashing, distinguishing between standard sports enthusiasts and facility administrators.

---

## 2. Problem Statement & Objectives

### 2.1 Problem Statement
Urban sports facilities (cricket turfs, football grounds, pickleball courts, badminton courts) operate in high-demand peak time windows (mornings and late evenings). Operators face:
- Manual slot conflict errors when multiple customers attempt booking via WhatsApp/phone.
- Inability to track recurring memberships, leading to revenue leakage.
- Absence of real-time analytics to identify profitable time slots and sport trends.
- High barrier to software adoption due to complex cloud server setup requirements.

### 2.2 Project Objectives
- **Automated Scheduling:** Provide customers with an intuitive calendar and slot-selection interface displaying live availability.
- **Data Integrity:** Prevent slot conflicts at the database layer rather than relying solely on application-level checks.
- **Membership Management:** Enable tiered membership plans (Monthly, Quarterly, Annual) with benefits and expiration dates.
- **Administrative Intelligence:** Provide owners with revenue metrics, sport utilization charts, and maintenance slot-blocking controls.
- **Zero-Dependency Deployability:** Enable instant local execution without requiring pre-configured database daemons.

---

## 3. System Requirements Specification (SRS)

### 3.1 Software Requirements
| Component | Specification |
| :--- | :--- |
| **Operating System** | Windows 10/11, Linux (Ubuntu 20.04+), macOS |
| **Runtime Environment**| Node.js v18.0.0 or higher (v22 LTS recommended) |
| **Frontend Framework** | React 18.3, Vite 5, React Router v6 |
| **Styling & Icons** | Vanilla CSS (Glassmorphic modern UI), Lucide React / SVG |
| **Data Visualization** | Recharts (Revenue analytics & booking frequency) |
| **Backend Framework** | Express 4.21, Node HTTP |
| **Database Engines** | Primary: MySQL 8 (via XAMPP); Fallback: Node.js Embedded SQLite |
| **Security / Crypto** | JSON Web Token (`jsonwebtoken`), Bcryptjs (10 salt rounds) |
| **Validation** | Joi Schema Validator |

### 3.2 Hardware Requirements (Minimum)
- **Processor:** Dual-Core x86_64 or ARM processor (Intel Core i3 / AMD Ryzen 3 / Apple M1)
- **RAM:** Minimum 4 GB (8 GB recommended for development)
- **Disk Storage:** 500 MB free storage
- **Network:** Localhost (offline functional) or 1 Mbps internet connection for production

---

## 4. System Architecture & Data Flow

### 4.1 3-Tier Architecture
```text
+--------------------------------------------------------------+
|                       PRESENTATION TIER                      |
|  React 18 + Vite SPA (Client Browser)                        |
|  - Customer Portal: Sports, Facilities, Slot Picker, Auth    |
|  - Admin Dashboard: Revenue Reports, Slot Blocker, Users     |
+------------------------------+-------------------------------+
                               |  HTTPS / REST JSON
+------------------------------v-------------------------------+
|                       APPLICATION TIER                       |
|  Express.js RESTful API (Port 5000)                          |
|  - Routes: /api/auth, /api/bookings, /api/slots, etc.        |
|  - Middleware: JWT Verifier, Role Gatekeeper (USER / ADMIN)   |
|  - Business Logic: Conflict Detection, Price Calculation     |
+------------------------------+-------------------------------+
                               |  Connection Pool with Auto-Failover
+------------------------------v-------------------------------+
|                          DATA TIER                           |
|  Primary: MySQL 8 Database (InnoDB, Relations, FKs)          |
|  Fallback: Embedded SQLite Database (Instant Zero-Config)    |
+--------------------------------------------------------------+
```

### 4.2 Data Flow Diagram (DFD Level 0 - Context Level)
- **User / Customer:** Sends credentials, booking parameters (sport, date, slot), and membership requests -> Receives booking confirmations, ticket code, active status.
- **Administrator:** Inputs slot maintenance locks, pricing updates, announcements -> Receives booking logs, audit trails, and revenue breakdowns.

### 4.3 Data Flow Diagram (DFD Level 1 - Booking Subsystem)
1. User selects Sport -> Frontend requests `GET /api/facilities?sport_id=X`.
2. User selects Date -> Frontend queries `GET /api/slots/available?facility_id=Y&date=YYYY-MM-DD`.
3. Backend filters active slots against existing bookings and `blocked_slots`.
4. User clicks "Confirm Booking" -> Sends `POST /api/bookings`.
5. DB Engine validates `active_slot_key = CONCAT(facility_id,'/',time_slot_id,'/',booking_date)`.
6. If key exists: returns HTTP 409 Conflict. If unique: returns HTTP 201 Created with unique `booking_code`.

---

## 5. Database Schema & Relational Design

The database conforms to Third Normal Form (3NF) across 12 relational entities:

| Table Name | Primary Key | Description |
| :--- | :--- | :--- |
| `users` | `id` (INT) | User credentials, mobile, password hash, role (`USER`/`ADMIN`) |
| `roles` | `id` (INT) | Role definitions (`USER`, `ADMIN`) |
| `sports` | `id` (INT) | Sports catalog (Football, Cricket, Badminton, Tennis, Pickleball) |
| `facilities` | `id` (INT) | Specific courts/turfs tied to a sport (e.g., Court 1, Pitch A) |
| `time_slots` | `id` (INT) | Hourly operational time slots (e.g., 06:00 - 07:00, 22:00 - 23:00) |
| `blocked_slots`| `id` (INT) | Dates/slots locked by admin for tournaments or maintenance |
| `bookings` | `id` (INT) | Confirmed/Pending bookings with virtual constraint `active_slot_key` |
| `membership_plans` | `id` (INT) | Plan configurations (Name, Price, Duration Days, Benefits) |
| `memberships` | `id` (INT) | Active subscriptions linked to user and expiry dates |
| `notifications` | `id` (INT) | System and booking status alerts for users |
| `offers` | `id` (INT) | Promotional discounts and marketing campaign codes |
| `announcements` | `id` (INT) | Club-wide notices displayed on member dashboard |
| `admin_logs` | `id` (BIGINT) | Audit logging of administrative actions for security accountability |

---

## 6. Key Engineering Highlights & Algorithms

### 6.1 Database-Level Concurrency & Anti-Collision Algorithm
Traditional student projects query the database (`SELECT COUNT(*) WHERE slot_id = X AND date = Y`), and if zero, perform an `INSERT`. Under simultaneous clicks from two users, a **Race Condition** causes both bookings to succeed.

**Our Engineered Solution:**
In MySQL / SQLite, we construct a generated unique column:
```sql
active_slot_key VARCHAR(80) GENERATED ALWAYS AS (
  CASE WHEN status IN ('PENDING','CONFIRMED') 
  THEN CONCAT(facility_id,'/',time_slot_id,'/',booking_date) 
  ELSE NULL 
  END
) VIRTUAL,
UNIQUE KEY uq_active_booking_slot(active_slot_key)
```
- When a booking is cancelled or expired, `active_slot_key` turns `NULL`.
- In SQL standards, `NULL` values do not violate unique constraints, allowing re-booking of cancelled slots automatically.
- Any concurrent attempt to insert the same slot produces an atomic hardware-level uniqueness violation caught by Express error middleware.

### 6.2 Dual-Engine Fault-Tolerant Database Connector
The application connects to MySQL via `mysql2/promise`. If MySQL is offline, the backend intercepts network connection errors (`ECONNREFUSED`, `ER_ACCESS_DENIED_ERROR`) and automatically switches to `node:sqlite`. The custom SQL emulation bridge polyfills MySQL-specific dialect functions:
- `CURDATE()` -> `new Date().toISOString().slice(0, 10)`
- `DATE_FORMAT(val, fmt)` -> Custom parser supporting `%Y-%m-%d %H:%i:%s`
- `NOW()` -> Current timestamp string

---

## 7. Viva Voce & Technical Defense Q&A

**Q1: Why did you choose React + Vite instead of traditional multi-page HTML/PHP?**
*Answer:* Vite provides instant Hot Module Replacement (HMR) and optimized Rollup bundling. React's virtual DOM and component-driven architecture allow real-time slot state updates without jarring page reloads, essential for high-engagement booking interfaces.

**Q2: How do you handle password security?**
*Answer:* Passwords are never stored in plain text. We utilize `bcryptjs` with 10 salt rounds. Salt is generated randomly per password to prevent rainbow table attacks, and password verification uses timing-safe comparisons.

**Q3: What prevents double booking if two customers click "Book" at the exact same millisecond?**
*Answer:* We rely on database-level ACID transactions and a unique constraint on a virtual key (`uq_active_booking_slot`). Even if application threads run concurrently, the database serializes the write and rejects the second transaction with a unique constraint error.

**Q4: How does JWT authentication work in your application?**
*Answer:* Upon login, the backend issues an HMAC-SHA256 signed JSON Web Token containing the user's ID, email, and role. The client stores this in `localStorage` and attaches it in the HTTP `Authorization: Bearer <token>` header. Express middleware validates the signature before permitting access to protected routes.

**Q5: What is the benefit of the dual database fallback?**
*Answer:* It eliminates the single point of failure in development and evaluation environments. Evaluators or client prospects can test the full capabilities of the software without setting up a dedicated MySQL daemon.

---

## 8. Conclusion & Future Enhancements
The Trooferz Sports Club & Turf Management System successfully replaces error-prone manual scheduling with a modern, reactive, scalable web platform. 

### Future Scope
1. **Payment Gateway Integration:** Adding Razorpay / Stripe webhooks for instant UPI/Credit Card automated settlement.
2. **IoT Turf Floodlight Automation:** Triggering physical relay switches when an active slot starts.
3. **SMS & WhatsApp Alerts:** Sending automated booking reminders via Twilio or WhatsApp Business API.
