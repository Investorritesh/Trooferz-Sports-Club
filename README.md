# Trooferz Sports Turf & Club — Full-Stack Demo

A functional local-development sports-club management platform for **Trooferz Sports Turf & Club, Baner, Pune, Maharashtra**.

This is a demonstration application. Seed records are fictional. Payment gateway, SMS/WhatsApp, biometric, GPS and IoT integrations are intentionally not implemented.

## Stack

- Frontend: React 18 + Vite + React Router + Recharts
- Backend: Node.js + Express
- Database: MySQL through XAMPP/phpMyAdmin
- Auth: JWT + bcryptjs
- API: REST

## Project layout

```text
trooferz-sports-club-demo/
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── scripts/
│       ├── utils/
│       └── server.js
├── frontend/
│   ├── .env.example
│   ├── package.json
│   └── src/
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   └── reset_demo.sql
├── setup-local.ps1
└── README.md
```

## 1. Prerequisites

Install Node.js 18+ (Node 22 is supported) and XAMPP with MySQL.

Verify Node/npm:

```powershell
node -v
npm -v
```

Start **MySQL** from the XAMPP Control Panel.

Apache is optional for this project because the API runs on Express and the UI runs on Vite.

## 2. Database setup

Open phpMyAdmin:

`http://localhost/phpmyadmin`

Import these files in order:

1. `database/schema.sql`
2. `database/seed.sql`

The schema creates `trooferz_sports_club` and the relational tables. Seed data is fictional demo data.

For a local reset, in the MySQL/phpMyAdmin SQL console you can run:

```sql
SOURCE schema.sql;
SOURCE seed.sql;
```

or execute the two files again after selecting the SQL console's working folder.

## 3. Backend setup

Open PowerShell:

```powershell
cd "C:\path\to\trooferz-sports-club-demo\backend"
Copy-Item .env.example .env
npm install
```

Open `backend/.env`:

```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=trooferz_sports_club
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=2h
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
```

Set `DB_PASSWORD` if your XAMPP MySQL root account has a password.

Start the API:

```powershell
npm run dev
```

or:

```powershell
npm start
```

Expected output:

```text
Trooferz API running at http://localhost:5000
Health check: http://localhost:5000/api/health
```

Check the API from another PowerShell:

```powershell
curl.exe http://127.0.0.1:5000/api/health
```

Expected:

```json
{"ok":true,"service":"trooferz-api","database":"connected","version":"1.1.0"}
```

### Verify demo authentication directly

With the database available and backend dependencies installed:

```powershell
npm run check:demo-auth
```

Expected checks:

```text
[USER] user@trooferz.demo
exists: true
role: USER
active: true
password matches: true

[ADMIN] admin@trooferz.demo
exists: true
role: ADMIN
active: true
password matches: true
```

This command is useful when the UI reports a generic login failure.

## 4. Frontend setup

Open a second PowerShell:

```powershell
cd "C:\path\to\trooferz-sports-club-demo\frontend"
Copy-Item .env.example .env
npm install
```

`frontend/.env` should contain:

```env
VITE_API_URL=http://localhost:5000/api
```

Start Vite:

```powershell
npm run dev
```

Open:

`http://localhost:5173`

## 5. Optional one-time setup script

From the project root in PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\setup-local.ps1
```

The script creates missing `.env` files and installs backend/frontend dependencies. Database import remains an explicit phpMyAdmin step.

## 6. Demo credentials

### User

```text
Email: user@trooferz.demo
Password: User@123
```

### Admin / Owner

```text
Email: admin@trooferz.demo
Password: ChangeMe@123
```

These credentials are documented for local demo use. The React application source does not embed the admin password or automatically fill it into login forms.

## 7. Authentication and role separation

There are exactly two logical roles:

- `USER`
- `ADMIN`

Customer routes are protected on the frontend and backend APIs require a valid JWT.

Admin routes such as `/admin/dashboard` are protected by frontend role checks and server-side `requireRole('ADMIN')` middleware. A user cannot gain admin API access by typing an admin URL.

Login endpoints:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/admin-login
GET  /api/auth/me
POST /api/auth/logout
```

## 8. API overview

```text
GET    /api/health
GET    /api/sports
POST   /api/sports                 ADMIN
PUT    /api/sports/:id             ADMIN
DELETE /api/sports/:id             ADMIN

GET    /api/facilities
GET    /api/facilities/available
POST   /api/facilities              ADMIN
PUT    /api/facilities/:id          ADMIN
DELETE /api/facilities/:id          ADMIN

GET    /api/slots                   AUTH
POST   /api/slots                   ADMIN
PUT    /api/slots/:id               ADMIN
DELETE /api/slots/:id               ADMIN
POST   /api/slots/block              ADMIN

GET    /api/bookings                AUTH
POST   /api/bookings                USER
PUT    /api/bookings/:id             ADMIN
DELETE /api/bookings/:id             ADMIN

GET    /api/users                    ADMIN
GET    /api/users/:id                ADMIN
PUT    /api/users/:id                ADMIN
PUT    /api/users/profile/me         USER

GET    /api/memberships/plans        PUBLIC
GET    /api/memberships/plans/admin  ADMIN
GET    /api/memberships/mine         USER
POST   /api/memberships/activate     USER
GET    /api/memberships              ADMIN
POST   /api/memberships/plans        ADMIN
PUT    /api/memberships/plans/:id    ADMIN

GET    /api/content/public           PUBLIC
GET    /api/content/notifications   USER
PUT    /api/content/notifications/:id/read USER
GET    /api/content/announcements   ADMIN
POST   /api/content/announcements   ADMIN
GET    /api/content/offers           ADMIN
POST   /api/content/offers           ADMIN

GET    /api/dashboard                ADMIN
GET    /api/dashboard/reports        ADMIN
```

## 9. Booking behavior

Bookings are created through the backend and written to MySQL. The backend validates:

- future/today booking date
- active facility and sport
- facility/sport relationship
- active time slot for the selected facility
- date-specific maintenance blocks
- existing `PENDING`/`CONFIRMED` bookings

Booking creation is transactional and locks the relevant facility/slot rows before checking for conflicts, preventing concurrent requests from double-booking the same slot.

## 10. Troubleshooting

### `GET /` returns `API route not found`

The updated project has a root API response, so after updating to this package:

```powershell
curl.exe http://127.0.0.1:5000/
```

should return service information. The canonical health check is still:

```powershell
curl.exe http://127.0.0.1:5000/api/health
```

### Port 5000 already in use

```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

Then restart the backend.

### Login returns `Unexpected server error`

Run:

```powershell
npm run check:demo-auth
```

from the backend folder. Also look at the backend terminal: this version logs the authentication error code/message without exposing it to production clients.

### Admin login fails

Verify:

```powershell
C:\xampp\mysql\bin\mysql.exe -u root -e "USE trooferz_sports_club; SELECT id,full_name,email,role,is_active FROM users WHERE email='admin@trooferz.demo';"
```

Then run `npm run check:demo-auth`.

### Frontend cannot reach API

Confirm:

- backend is running on port 5000
- `frontend/.env` contains `VITE_API_URL=http://localhost:5000/api`
- after changing `.env`, restart Vite

## 11. Demo scope

Implemented locally:

- registration/login/logout
- USER and ADMIN authentication
- backend RBAC
- sports and facilities
- configurable recurring time slots
- date-specific blocked slots
- booking creation and conflict checking
- user booking history
- membership plans and demo activation
- notifications and announcements
- owner user management
- owner booking management
- owner sports/facility/slot/membership administration
- dashboard statistics and charts
- reports
- responsive customer and owner interfaces

Not implemented by design:

- real payment gateway
- real SMS/WhatsApp gateway
- biometric access
- GPS tracking
- IoT hardware integration

## 12. Production note

This repository is structured as a local-development demo, not as a production deployment package. Before production use, add stronger secret management, HTTPS, refresh-token strategy, rate limiting, audit hardening, CSRF considerations where applicable, image/file storage controls, database backups, monitoring and deployment-specific configuration.

## 13. Deployment preparation

Deployment manifests are included for the selected target:

- `render.yaml` creates the Node/Express backend service `trooferz-sports-club-backend`.
- `vercel.json` configures the Vite frontend build from the `frontend` directory.
- `backend/.env.production.example` documents backend production variables.
- `frontend/.env.production.example` documents the frontend API URL.

The project does not contain provider URLs, database endpoints, passwords, or deployment tokens. Those values must be created in the provider dashboards.

### Create the managed MySQL database first

Create a MySQL 8-compatible database with:

```text
Database name: trooferz_sports_club
Port: 3306
```

Record the provider-generated host, username, and password. Enable the provider's required SSL/TLS mode if it requires encrypted connections.

Import the database in this order:

1. `database/schema.sql`
2. `database/seed.sql`

After importing, verify that `users` contains the documented demo accounts and that the `bookings` table contains the `uq_active_booking_slot` unique index.

### Create the Render backend

1. In Render, choose **New → Blueprint** and select this repository, or create a Web Service manually.
2. If creating manually, use:
   - Runtime: Node
   - Root directory: `backend`
   - Build command: `npm ci`
   - Start command: `npm start`
   - Health check path: `/api/health`
3. Set these Render environment variables:

```text
NODE_ENV=production
PORT=10000
DB_HOST=<managed MySQL host>
DB_PORT=3306
DB_USER=<managed MySQL user>
DB_PASSWORD=<managed MySQL password>
DB_NAME=trooferz_sports_club
JWT_SECRET=<long random secret>
JWT_EXPIRES_IN=2h
CORS_ORIGIN=<Vercel frontend URL>
```

Render will then provide the backend HTTPS URL. Use that URL with `/api/health` to confirm the database connection.

### Create the Vercel frontend

1. In Vercel, import this repository and select the `frontend` directory as the project root.
2. Use the default Vite build settings, or the included `vercel.json`:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Set this Vercel environment variable for Production:

```text
VITE_API_URL=<Render backend URL>/api
```

4. Copy the resulting Vercel HTTPS URL into the Render `CORS_ORIGIN` variable and redeploy the backend.

### Production smoke tests

After both services are deployed:

```text
GET  <Render backend URL>/api/health
POST <Render backend URL>/api/auth/login
POST <Render backend URL>/api/auth/admin-login
GET  <Render backend URL>/api/dashboard
POST <Render backend URL>/api/bookings
```

Expected results:

- `/api/health`: HTTP 200 with `"database":"connected"`
- USER login: HTTP 200 with `"role":"USER"`
- ADMIN login: HTTP 200 with `"role":"ADMIN"`
- USER access to `/api/dashboard`: HTTP 403
- ADMIN access to `/api/dashboard`: HTTP 200
- Valid booking: HTTP 201
- Duplicate active booking: HTTP 409
