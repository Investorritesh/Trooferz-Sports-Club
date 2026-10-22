# Trooferz Sports Club & Turf Management System

> **An enterprise-grade sports facility, court reservation, membership management, and predictive demand analytics web platform.**  
> Optimized for **Academic Final-Year College Project Submissions** (B.E. / B.Tech / BCA / MCA / CS / IT) and **Commercial Turnkey White-Labeling** for turf and sports club operators.

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org/)
[![Django](https://img.shields.io/badge/Django-5.2%20LTS-darkgreen.svg)](https://djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.18-red.svg)](https://django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-purple.svg)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/Database-MySQL%208%20%7C%20InnoDB-orange.svg)](#database-architecture)
[![Machine Learning](https://img.shields.io/badge/ML-scikit--learn%20Ridge-yellow.svg)](#predictive-analytics)
[![Tests](https://img.shields.io/badge/Tests-30%2F30%20Passing%20(100%25)-brightgreen.svg)](#testing--verification)

---

## 📑 Academic Documentation & Viva Defense Package

This repository contains comprehensive documentation tailored for academic project evaluation and examiner defense:

1. **🎓 [Academic Final-Year Project Report](COLLEGE_PROJECT_REPORT.md)**  
   *Contains Project Abstract, Problem Statement, Comparative MERN vs Django/MySQL Analysis, 3NF 17-Table Schema, Concurrency Architecture, Differentiator Specifications, and Test Evidence.*
2. **🛡️ [Master Viva Voce Defense & Examiner Q&A Guide](docs/viva-defense-guide.md)**  
   *Contains 25 high-probability examiner questions & model answers covering ACID locks, SimpleJWT, MySQL vs MongoDB comparison, Ridge regression, and anti-replay QR security.*
3. **🗺️ [Relational ER Diagram & Normalization Guide](docs/er-diagram.md)**  
   *Complete Mermaid Entity-Relationship diagram and 3NF normalization proofs.*
4. **⚡ [Concurrency & Lifecycle State Machine Guide](docs/concurrency-and-lifecycle.md)**  
   *Deep dive into `select_for_update()` row locking, race-condition prevention, and tiered refund policies.*
5. **💳 [Payments, Wallet Ledger & Memberships Guide](docs/payments-and-memberships.md)**  
   *Razorpay HMAC-SHA256 signature verification, double-entry wallet ledger, and tiered memberships.*
6. **👥 [Differentiators: Split Payments, Waitlist & QR Check-In Guide](docs/differentiators-and-checkin.md)**  
   *Multi-party team split payments, tier-weighted priority waitlist queue, and touchless staff scanner.*
7. **☀️ [Weather Advisory & ML Demand Analytics Guide](docs/weather-and-analytics.md)**  
   *Live Pune weather telemetry, automated rain-check guarantee, and scikit-learn Ridge demand forecasting.*
8. **💻 [Frontend Integration & Modernization Guide](docs/frontend-integration.md)**  
   *Vite + React 18 integration, SimpleJWT Axios interceptors, and differentiator UI components.*

---

## ⚡ 1-Click Instant Run (Windows)

Launch both the Django backend and Vite frontend with a single click:

- **Option A (Double-Click):** Double-click **`start.bat`** in the project root.
- **Option B (PowerShell):** Run `.\start-app.ps1` in your terminal.

```text
Backend API:   http://127.0.0.1:8000/api/
Frontend UI:   http://localhost:5173
Django Admin:  http://127.0.0.1:8000/admin/
API Health:    http://127.0.0.1:8000/api/health
```

> **Dual-Database Resiliency:** Connects to MySQL 8 via `.env`. If MySQL is unavailable, the application **automatically falls back to an embedded SQLite database (`trooferz_fallback.sqlite3`)** pre-seeded with complete demo records. 100% offline operational!

---

## 🔑 Demo Login Accounts

| Role | Email Address | Password | Permissions & Access |
| :--- | :--- | :--- | :--- |
| **Club Admin** | `admin@trooferz.com` | `Admin@123` | Full control: BI dashboards, ML forecasts, demand heatmaps, court/slot manager, user controls |
| **Front-Desk Staff** | `staff@trooferz.com` | `Staff@123` | Front-desk operations: Touchless QR Scanner, booking check-ins, court status updates |
| **Standard Member** | `member@trooferz.com` | `Member@123` | Member portal: Court booking, split payments, digital QR pass, wallet top-up, waitlists |
| **Teammate 1** | `player1@trooferz.demo` | `TestPassword@123` | Split payment teammate account with wallet funds |
| **Teammate 2** | `player2@trooferz.demo` | `TestPassword@123` | Split payment teammate account with wallet funds |

---

## 🛠 Technology Stack

- **Backend:** Python 3.11+, Django 5.2 LTS, Django REST Framework 3.18
- **Authentication:** `djangorestframework-simplejwt` (HMAC-SHA256, custom role claims)
- **Database:** MySQL 8.0+ (InnoDB, strict Foreign Keys, 3NF Relational Schema) + SQLite Fallback
- **Predictive Analytics & ML:** `scikit-learn` 1.9 (Ridge Regression), `NumPy` 2.5, `Pandas` 3.0
- **Weather Telemetry:** Open-Meteo REST API + Pune Seasonal Climatological Generator
- **Payments:** Razorpay API (HMAC-SHA256 verification) + In-App Digital Wallet Ledger
- **Frontend:** React 18.3, Vite 5.4, React Router v6, Axios, Recharts, Lucide Icons, Vanilla CSS

---

## 🧪 Testing & Verification

Run the complete 30-test automated verification suite:

```powershell
# From the backend/ directory
.\venv\Scripts\python manage.py test
```

### Test Suite Output:
```text
Creating test database for alias 'default'...
..............................
----------------------------------------------------------------------
Ran 30 tests in 58.205s

OK
Destroying test database for alias 'default'...
Found 30 test(s).
System check identified no issues (0 silenced).
```

- **`analytics` (10 tests):** Weather parsing, Pune climatology fallback, indoor vs outdoor playing conditions, Ridge regression, 7-day forecast, 7x17 heatmap, role permissions, and price preview enrichment.
- **`bookings` (8 tests):** `select_for_update()` double-booking prevention, tiered cancellation refunds (>24h 100%, 24h-6h 50%, <6h 0%), conflict-free rescheduling, FSM state machine transitions, split payments, QR passes, priority waitlist queue, and background queue processor.
- **`memberships` (4 tests):** Tier discounts, credit deductions, subscription freeze/unfreeze expiry extension, and automated membership expiration audits.
- **`payments` (8 tests):** Razorpay order generation, HMAC-SHA256 signature verification, double-entry wallet top-up, atomic debits, and transaction failure safety.

---

## 📁 Repository Structure

```text
miniproject/
├── start.bat                  # 1-Click Windows CMD launcher
├── start-app.ps1              # 1-Click PowerShell launcher
├── COLLEGE_PROJECT_REPORT.md  # Comprehensive academic project report
├── docs/                      # Technical guides & viva defense documentation
│   ├── viva-defense-guide.md  # 25 Examiner Viva Voce questions & answers
│   ├── er-diagram.md          # 3NF Schema & Mermaid ER diagram
│   ├── concurrency-and-lifecycle.md # select_for_update & FSM transitions
│   ├── payments-and-memberships.md  # Razorpay & wallet ledger
│   ├── differentiators-and-checkin.md # Split payments, waitlist & QR pass
│   ├── weather-and-analytics.md      # Weather telemetry & ML forecasting
│   └── frontend-integration.md       # React 18 integration & UI components
├── database/                  # SQL schema and seed scripts
│   ├── create_mysql_db.sql    # Database creation script
│   ├── schema.sql             # Relational 3NF DDL schema
│   └── seed.sql               # Initial sports and court records
├── backend/                   # Django 5 REST Framework project
│   ├── manage.py              # Django management script
│   ├── config/                # Settings, URLs, and ASGI/WSGI
│   ├── users/                 # Custom User model, SimpleJWT & RBAC
│   ├── facilities/            # Sports, Facilities & Courts
│   ├── bookings/              # Concurrency locks, FSM, Split Payments & QR
│   ├── memberships/           # Tiered plans, freeze/unfreeze & credits
│   ├── payments/              # Razorpay & double-entry wallet ledger
│   └── analytics/             # Weather advisory & scikit-learn forecasting
└── frontend/                  # React 18 + Vite frontend
    ├── src/                   # Components, Pages, Context, Services
    └── package.json           # Dependencies & build scripts
```
