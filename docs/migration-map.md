# Migration Map: MERN / Express + MySQL to Django REST Framework + MySQL 8

**Project:** Trooferz Sports Club & Turf Management System (Baner, Pune)  
**Document Purpose:** Complete technical migration reference for Academic Final-Year Defense & Technical Evaluation.  
**Author:** Senior Full-Stack Engineer & Database Architect  
**Status:** Phase 0 Analysis Complete (Awaiting User Sign-off)

---

## 1. Executive Summary & Codebase Audit Findings

A complete scan of the current workspace revealed the following architectural reality:
- **Frontend:** A functional, modern React 18 + Vite Single Page Application (SPA) using React Router v6, Axios, Recharts, and Lucide React icons.
- **Legacy Backend:** Currently located in `backend/` (to be preserved and moved to `/legacy-mern-backend` in Phase 1). Contrary to initial assumptions of MongoDB, the existing Node/Express backend already executes raw SQL queries against a 12-table MySQL database with an automatic in-memory/embedded SQLite (`node:sqlite`) fallback.
- **Authentication:** Custom HMAC-SHA256 JWT issued via `jsonwebtoken` and stored in `localStorage` (`trooferz_token`). Only 2 roles currently exist: `USER` and `ADMIN`.
- **Target Architecture:** Python 3.11+, Django 5 + Django REST Framework (DRF), MySQL 8 InnoDB, `djangorestframework-simplejwt` with 3 roles (`MEMBER`, `STAFF`, `ADMIN`), Celery + Redis background processing, Razorpay payment gateway, Pandas + Scikit-Learn data analytics, and QR-code check-in.

---

## 2. Legacy Database Entities to Target MySQL 8 (3NF) Mapping

| Legacy Entity / Table | Current Columns & Limitations | Target Django Model / MySQL Table | Target Columns & Data Types | Keys, Constraints & Normalization |
| :--- | :--- | :--- | :--- | :--- |
| **`roles`** | `id`, `name` ('USER', 'ADMIN') | Handled via Django Role Enum | `users_user.role` VARCHAR(20) | Replaced by Django's native Choice field: `MEMBER`, `STAFF`, `ADMIN`. |
| **`users`** | `id`, `full_name`, `email`, `mobile`, `password_hash`, `role`, `is_active`, timestamps | `users.User` (`users_user`) | `id` BIGINT PK<br>`username` VARCHAR(150) UNIQUE<br>`email` VARCHAR(190) UNIQUE<br>`full_name` VARCHAR(120)<br>`phone` VARCHAR(20)<br>`role` VARCHAR(20)<br>`wallet_balance` DECIMAL(10,2)<br>`is_active` BOOL<br>`date_joined` DATETIME | PK: `id`<br>UQ: `email`, `username`<br>Role-based access (Member, Staff, Admin) with wallet balance. |
| **`sports`** | `id`, `name`, `description`, `image_url`, `price`, `duration_minutes`, `is_active` | `facilities.Sport` (`sports`) | `id` INT PK<br>`name` VARCHAR(100) UNIQUE<br>`slug` VARCHAR(100) UNIQUE<br>`description` TEXT<br>`icon` VARCHAR(100)<br>`image_url` VARCHAR(500)<br>`is_active` BOOL | PK: `id`<br>UQ: `name`, `slug`<br>Price moved to Courts for proper 3NF normalization. |
| **`facilities`** | `id`, `name`, `sport_id`, `capacity`, `price`, `is_active`, `description`, `image_url` | `facilities.Facility` (`facilities`) | `id` INT PK<br>`name` VARCHAR(120)<br>`description` TEXT<br>`address` VARCHAR(255)<br>`city` VARCHAR(100)<br>`area` VARCHAR(100)<br>`opening_time` TIME<br>`closing_time` TIME<br>`image_url` VARCHAR(500)<br>`is_active` BOOL | PK: `id`<br>Represents the physical venue / sports complex in Baner, Pune. |
| *(None - New)* | Facilities and sports were previously tangled with courts | `facilities.Court` (`courts`) | `id` INT PK<br>`facility_id` INT FK<br>`sport_id` INT FK<br>`name` VARCHAR(100)<br>`court_type` VARCHAR(20)<br>`surface_type` VARCHAR(50)<br>`capacity` INT<br>`hourly_base_price` DECIMAL(10,2)<br>`is_active` BOOL | PK: `id`<br>FK: `facility_id` -> `facilities.id`<br>FK: `sport_id` -> `sports.id`<br>Enum: `court_type` ('INDOOR', 'OUTDOOR'). |
| **`time_slots`** & **`blocked_slots`** | `time_slots` (id, facility_id, start_time, end_time, is_available)<br>`blocked_slots` (id, blocked_date, time_slot_id, reason) | `bookings.Slot` (`slots`) | `id` BIGINT PK<br>`court_id` INT FK<br>`date` DATE<br>`start_time` TIME<br>`end_time` TIME<br>`status` VARCHAR(20) | PK: `id`<br>FK: `court_id` -> `courts.id`<br>UQ: (`court_id`, `date`, `start_time`)<br>Status: `AVAILABLE`, `BOOKED`, `BLOCKED`, `MAINTENANCE`. |
| **`bookings`** | `id`, `booking_code`, `user_id`, `sport_id`, `facility_id`, `time_slot_id`, `booking_date`, `status`, `amount`, `active_slot_key` | `bookings.Booking` (`bookings`) | `id` BIGINT PK<br>`booking_code` VARCHAR(50) UNIQUE<br>`user_id` BIGINT FK<br>`court_id` INT FK<br>`slot_id` BIGINT FK<br>`booking_date` DATE<br>`start_time` TIME<br>`end_time` TIME<br>`base_price` DECIMAL(10,2)<br>`dynamic_multiplier` DECIMAL(4,2)<br>`discount_amount` DECIMAL(10,2)<br>`credits_used` INT<br>`total_amount` DECIMAL(10,2)<br>`status` VARCHAR(20)<br>`is_split_payment` BOOL<br>`qr_code_token` VARCHAR(255) UNIQUE<br>`weather_warning` VARCHAR(255) | PK: `id`<br>FK: `user_id` -> `users.id`<br>FK: `court_id` -> `courts.id`<br>FK: `slot_id` -> `slots.id`<br>UQ: `booking_code`<br>UQ: (`court_id`, `booking_date`, `start_time`)<br>Status: `PENDING`, `CONFIRMED`, `CHECKED_IN`, `COMPLETED`, `CANCELLED`, `REFUNDED`. |
| *(None - New)* | No split payment / team booking tracking existed | `bookings.BookingPlayer` (`booking_players`) | `id` BIGINT PK<br>`booking_id` BIGINT FK<br>`user_id` BIGINT FK NULL<br>`name` VARCHAR(120)<br>`email` VARCHAR(190)<br>`phone` VARCHAR(30)<br>`share_amount` DECIMAL(10,2)<br>`payment_status` VARCHAR(20)<br>`paid_at` DATETIME | PK: `id`<br>FK: `booking_id` -> `bookings.id` (CASCADE)<br>FK: `user_id` -> `users.id`<br>Status: `PENDING`, `PAID`, `REFUNDED`. |
| *(None - New)* | No real payments table (amounts stored directly on booking) | `payments.Payment` (`payments`) | `id` BIGINT PK<br>`payment_reference` VARCHAR(100) UNIQUE<br>`booking_id` BIGINT FK NULL<br>`membership_id` BIGINT FK NULL<br>`user_id` BIGINT FK<br>`amount` DECIMAL(10,2)<br>`payment_method` VARCHAR(30)<br>`gateway_order_id` VARCHAR(100)<br>`gateway_payment_id` VARCHAR(100)<br>`gateway_signature` VARCHAR(255)<br>`status` VARCHAR(20) | PK: `id`<br>FK: `booking_id`, `membership_id`, `user_id`<br>Supports Razorpay webhook verification and audit compliance. |
| *(None - New)* | No customer wallet ledger | `payments.WalletTransaction` (`wallet_transactions`) | `id` BIGINT PK<br>`user_id` BIGINT FK<br>`transaction_type` VARCHAR(20)<br>`category` VARCHAR(30)<br>`amount` DECIMAL(10,2)<br>`balance_after` DECIMAL(10,2)<br>`reference_id` VARCHAR(100)<br>`description` VARCHAR(255) | PK: `id`<br>FK: `user_id` -> `users.id`<br>Type: `CREDIT`, `DEBIT`.<br>Category: `TOP_UP`, `BOOKING`, `REFUND`, `WEATHER_REFUND`. |
| **`membership_plans`** | `id`, `name`, `price`, `duration_days`, `benefits`, `is_active` | `memberships.MembershipPlan` (`membership_plans`) | `id` INT PK<br>`tier` VARCHAR(30) UNIQUE<br>`name` VARCHAR(100)<br>`price` DECIMAL(10,2)<br>`duration_days` INT<br>`discount_percent` DECIMAL(5,2)<br>`free_booking_credits` INT<br>`priority_booking_days` INT<br>`benefits_summary` TEXT<br>`is_active` BOOL | PK: `id`<br>UQ: `tier`<br>Tiers: `SILVER`, `GOLD`, `PLATINUM`. Direct quantitative benefits replace vague text blobs. |
| **`memberships`** | `id`, `user_id`, `plan_id`, `start_date`, `end_date`, `status` | `memberships.Membership` (`memberships`) | `id` BIGINT PK<br>`user_id` BIGINT FK<br>`plan_id` INT FK<br>`start_date` DATE<br>`end_date` DATE<br>`credits_left` INT<br>`status` VARCHAR(20)<br>`is_frozen` BOOL<br>`frozen_at` DATETIME | PK: `id`<br>FK: `user_id` -> `users.id`<br>FK: `plan_id` -> `membership_plans.id`<br>Supports freeze/pause, credit balance, auto-expiry. |
| *(None - New)* | No dynamic pricing existed | `facilities.PricingRule` (`pricing_rules`) | `id` INT PK<br>`name` VARCHAR(100)<br>`court_id` INT FK NULL<br>`day_type` VARCHAR(20)<br>`start_time` TIME NULL<br>`end_time` TIME NULL<br>`price_multiplier` DECIMAL(4,2)<br>`occupancy_threshold_pct` INT NULL<br>`is_active` BOOL | PK: `id`<br>FK: `court_id` -> `courts.id`<br>Allows weekend surge, peak evening rates, and dynamic demand pricing. |
| *(None - New)* | No waitlist feature existed | `bookings.Waitlist` (`waitlist`) | `id` BIGINT PK<br>`user_id` BIGINT FK<br>`court_id` INT FK<br>`date` DATE<br>`start_time` TIME<br>`status` VARCHAR(20)<br>`offered_at` DATETIME<br>`offer_expires_at` DATETIME<br>`priority_score` INT | PK: `id`<br>FK: `user_id`, `court_id`<br>Status: `WAITING`, `OFFERED`, `ACCEPTED`, `EXPIRED`, `CANCELLED`. |
| *(None - New)* | No equipment inventory or rental tracking | `facilities.Equipment` & `facilities.EquipmentRental` | `equipment`: id, facility_id, sport_id, name, total_qty, available_qty, hourly_price.<br>`equipment_rentals`: id, booking_id, user_id, equipment_id, qty, fee, status. | Normalized equipment catalog and desk rental management for Staff. |
| *(None - New)* | No verified court reviews | `facilities.Review` (`reviews`) | `id` BIGINT PK<br>`user_id` BIGINT FK<br>`court_id` INT FK<br>`booking_id` BIGINT FK UQ<br>`rating` TINYINT<br>`comment` TEXT | PK: `id`<br>UQ: `booking_id` (Ensures only verified players can leave 1 review per booking). |
| **`notifications`** | `id`, `user_id`, `title`, `message`, `type`, `is_read` | `users.Notification` (`notifications`) | `id` BIGINT PK<br>`user_id` BIGINT FK<br>`title` VARCHAR(150)<br>`message` TEXT<br>`notification_type` VARCHAR(30)<br>`is_read` BOOL | PK: `id`<br>FK: `user_id` -> `users.id`<br>Types: `BOOKING`, `MEMBERSHIP`, `WAITLIST`, `WEATHER`, `WALLET`. |
| **`offers`** & **`announcements`** | `offers` (id, title, description, discount_percent, valid_until, is_active)<br>`announcements` (id, title, message, is_active) | `facilities.Offer` & `facilities.Announcement` | Retained with identical fields and clean Django ORM ModelAdmin interface. | Marketing content displayed on homepage and member portals. |
| **`admin_logs`** | `id`, `admin_user_id`, `action`, `entity_type`, `entity_id`, `details` | Replaced by Django's native `django_admin_log` + custom audit signal | Built-in Django auditing + audit trail on financial mutations. | Standard Django administration logging. |

---

## 3. Express Routes to Django REST API Endpoint Mapping

| Legacy Express Method & Route | Legacy Purpose | Target Django REST Endpoint | Django App & View / ViewSet | Permission & Role Required |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/auth/register` | Register new user | `POST /api/auth/register/` | `users.views.RegisterView` | `AllowAny` |
| `POST /api/auth/login` | User login (returns JWT) | `POST /api/auth/login/` | `users.views.MemberLoginView` | `AllowAny` |
| `POST /api/auth/admin-login` | Admin login | `POST /api/auth/admin-login/` | `users.views.AdminLoginView` | `AllowAny` |
| *(None - New)* | Token refresh | `POST /api/auth/token/refresh/` | `rest_framework_simplejwt.views.TokenRefreshView` | `AllowAny` |
| `GET /api/auth/me` | Fetch authenticated user | `GET /api/auth/me/` | `users.views.UserProfileView` | `IsAuthenticated` |
| `POST /api/auth/logout` | Client-side logout notice | `POST /api/auth/logout/` | `users.views.LogoutView` | `IsAuthenticated` |
| `GET /api/sports` | List active/all sports | `GET /api/sports/` | `facilities.views.SportViewSet.list` | `AllowAny` |
| `POST /api/sports` | Create sport | `POST /api/sports/` | `facilities.views.SportViewSet.create` | `IsAdmin` |
| `PUT /api/sports/:id` | Update sport | `PUT /api/sports/{id}/` | `facilities.views.SportViewSet.update` | `IsAdmin` |
| `DELETE /api/sports/:id` | Deactivate sport | `DELETE /api/sports/{id}/` | `facilities.views.SportViewSet.destroy` | `IsAdmin` |
| `GET /api/facilities` | List all facilities | `GET /api/facilities/` | `facilities.views.FacilityViewSet.list` | `AllowAny` |
| `GET /api/facilities/available` | Filter facilities by sport | `GET /api/facilities/?sport_id={id}` | `facilities.views.FacilityViewSet.list` | `AllowAny` |
| `POST /api/facilities` | Create facility | `POST /api/facilities/` | `facilities.views.FacilityViewSet.create` | `IsAdmin` |
| `PUT /api/facilities/:id` | Update facility | `PUT /api/facilities/{id}/` | `facilities.views.FacilityViewSet.update` | `IsAdmin` |
| `DELETE /api/facilities/:id` | Deactivate facility | `DELETE /api/facilities/{id}/` | `facilities.views.FacilityViewSet.destroy` | `IsAdmin` |
| *(None - New)* | Courts list & detail | `GET /api/courts/` | `facilities.views.CourtViewSet.list` | `AllowAny` |
| `GET /api/slots` | Live slot availability by court & date | `GET /api/slots/availability/` | `bookings.views.SlotAvailabilityView` | `AllowAny` or `IsAuthenticated` |
| `POST /api/slots` | Admin create time slot | `POST /api/slots/` | `bookings.views.SlotViewSet.create` | `IsAdmin` |
| `PUT /api/slots/:id` | Admin update slot | `PUT /api/slots/{id}/` | `bookings.views.SlotViewSet.update` | `IsAdmin` |
| `DELETE /api/slots/:id` | Disable slot | `DELETE /api/slots/{id}/` | `bookings.views.SlotViewSet.destroy` | `IsAdmin` |
| `POST /api/slots/block` | Block slot for maintenance | `POST /api/slots/block/` | `bookings.views.BlockSlotView` | `IsStaff` or `IsAdmin` |
| `GET /api/bookings` | List user bookings or all (admin) | `GET /api/bookings/` | `bookings.views.BookingViewSet.list` | `IsAuthenticated` (Self-filtered for Members) |
| `POST /api/bookings` | Create court booking | `POST /api/bookings/` | `bookings.views.BookingViewSet.create` | `IsMember` or `IsAuthenticated` |
| `PUT /api/bookings/:id` | Update booking status | `PATCH /api/bookings/{id}/status/` | `bookings.views.BookingStatusUpdateView` | `IsStaff` or `IsAdmin` |
| `DELETE /api/bookings/:id` | Cancel booking | `POST /api/bookings/{id}/cancel/` | `bookings.views.BookingCancelView` | `IsAuthenticated` (Owner or Admin) |
| *(None - New)* | Reschedule booking | `POST /api/bookings/{id}/reschedule/` | `bookings.views.BookingRescheduleView` | `IsAuthenticated` (Owner or Admin) |
| *(None - New)* | Razorpay order creation | `POST /api/payments/razorpay/create-order/` | `payments.views.RazorpayOrderCreateView` | `IsAuthenticated` |
| *(None - New)* | Razorpay signature verification | `POST /api/payments/razorpay/verify/` | `payments.views.RazorpayVerifyView` | `IsAuthenticated` |
| *(None - New)* | Wallet balance & history | `GET /api/payments/wallet/` | `payments.views.WalletDetailView` | `IsAuthenticated` |
| *(None - New)* | Wallet top-up via Razorpay | `POST /api/payments/wallet/top-up/` | `payments.views.WalletTopUpView` | `IsAuthenticated` |
| `GET /api/memberships/plans` | Active membership plans | `GET /api/memberships/plans/` | `memberships.views.PlanViewSet.list` | `AllowAny` |
| `GET /api/memberships/mine` | Customer's active memberships | `GET /api/memberships/mine/` | `memberships.views.MyMembershipsView` | `IsAuthenticated` |
| `POST /api/memberships/activate` | Purchase / activate membership | `POST /api/memberships/subscribe/` | `memberships.views.SubscribeMembershipView` | `IsAuthenticated` |
| *(None - New)* | Freeze / unfreeze membership | `POST /api/memberships/{id}/freeze/` | `memberships.views.FreezeMembershipView` | `IsAuthenticated` |
| *(None - New)* | Dynamic price quote calculator | `POST /api/bookings/calculate-price/` | `bookings.views.CalculatePriceView` | `AllowAny` |
| *(None - New)* | Join waitlist for full slot | `POST /api/bookings/waitlist/` | `bookings.views.WaitlistJoinView` | `IsAuthenticated` |
| *(None - New)* | QR code check-in scanner | `POST /api/bookings/qr/verify/` | `bookings.views.QRCheckInView` | `IsStaff` or `IsAdmin` |
| *(None - New)* | Split payment share link & pay | `POST /api/bookings/split/{token}/pay/` | `bookings.views.SplitPaymentPayView` | `AllowAny` / `IsAuthenticated` |
| *(None - New)* | Weather advisory for outdoor court | `GET /api/facilities/weather/?court_id={id}&date={date}` | `facilities.views.CourtWeatherView` | `AllowAny` |
| `GET /api/dashboard` | Admin KPI dashboard stats | `GET /api/analytics/dashboard/` | `analytics.views.AdminDashboardView` | `IsAdmin` |
| `GET /api/dashboard/reports` | Business analytics reports | `GET /api/analytics/reports/` | `analytics.views.ReportsView` | `IsAdmin` |
| *(None - New)* | Pandas peak-hour heatmap & utilization | `GET /api/analytics/heatmaps/` | `analytics.views.PeakHourHeatmapView` | `IsAdmin` |
| *(None - New)* | Scikit-learn occupancy forecast | `GET /api/analytics/predictions/occupancy/` | `analytics.views.DemandForecastView` | `IsAdmin` |
| *(None - New)* | Staff front-desk operations dashboard | `GET /api/staff/overview/` | `analytics.views.StaffOverviewView` | `IsStaff` or `IsAdmin` |
| `GET /api/content/public` | Offers & announcements | `GET /api/content/public/` | `facilities.views.PublicContentView` | `AllowAny` |
| `GET /api/content/notifications` | User notifications inbox | `GET /api/notifications/` | `users.views.NotificationViewSet.list` | `IsAuthenticated` |
| `PUT /api/content/notifications/:id/read` | Mark notification read | `PATCH /api/notifications/{id}/read/` | `users.views.NotificationViewSet.mark_read` | `IsAuthenticated` |
| `GET /api/users` | Admin user list | `GET /api/users/` | `users.views.UserAdminViewSet.list` | `IsAdmin` |
| `GET /api/users/:id` | Admin user detail & history | `GET /api/users/{id}/` | `users.views.UserAdminViewSet.retrieve` | `IsAdmin` |
| `PUT /api/users/profile/me` | Customer profile update | `PUT /api/users/profile/` | `users.views.UserProfileView` | `IsAuthenticated` |
| `PUT /api/users/:id` | Admin toggle/update user | `PATCH /api/users/{id}/` | `users.views.UserAdminViewSet.partial_update` | `IsAdmin` |

---

## 4. Frontend API Calls That Must Change

All calls currently flow through `frontend/src/services/api.js`. The migration preserves this centralized design with specific updates:

1. **Authentication Storage & Refresh Token Lifecycle:**
   - **Current:** Stores single `trooferz_token` in `localStorage`.
   - **Target:** Store both `trooferz_access_token` and `trooferz_refresh_token`. The Axios interceptor will catch 401 errors, execute a background call to `POST /api/auth/token/refresh/`, update the access token, and seamlessly replay the failed request before forcing a logout.
2. **Payload & Parameter Alignment:**
   - `facilities` and `courts` distinction: In `Bookings.jsx`, slot availability queries will use `court_id` instead of `facility_id` directly to support multi-court venues (e.g., Turf Pitch 1 vs Pitch 2).
   - Date formats: ISO 8601 strings (`YYYY-MM-DD`) with Indian Standard Time (`Asia/Kolkata`) handling to avoid timezone day-shift bugs.
   - Status transitions: Status updates now send standardized lowercase or uppercase Django choice keys (`CONFIRMED`, `CANCELLED`, `CHECKED_IN`, `REFUNDED`).
3. **Role Handshakes:**
   - Roles in the user payload: `user.role` will now recognize `'MEMBER'`, `'STAFF'`, and `'ADMIN'`.
   - Routing guards: `ProtectedRoute` in `frontend/src/components/ProtectedRoute.jsx` will be updated to support staff access to scanner and today's schedule views.
4. **New Feature Component Connections:**
   - Razorpay Checkout modal SDK injection on `Bookings.jsx`.
   - Wallet top-up and debit toggles on `Bookings.jsx` and `Membership.jsx`.
   - Dynamic Price breakdown preview pill (showing Base Price, Peak Surge Multiplier, and Membership Discount).
   - QR code pass preview modal on `Bookings.jsx`.
   - Open-Meteo weather advisory badge on outdoor court selection.

---

## 5. Feature Audit: Existing, Missing, and Discovered Vulnerabilities

### 5.1 Existing Features (Working in Current Project)
- Modern, responsive React 18 glassmorphic web UI for Trooferz Sports Club.
- Public presentation: Sport showcase, facility overview, club location in Baner, operating hours, FAQs.
- Booking workflow: Sport selection, facility picker, date picker, slot grid, and booking generation.
- Virtual slot collision key (`active_slot_key`) in database schema to reduce concurrent double-booking.
- Customer profile editing (`full_name`, `mobile`).
- Customer notifications inbox with unread counts.
- Admin portal: High-level KPI cards, slot management with maintenance day-blocker, promotional offers, club announcements, and Recharts graphical reports.

### 5.2 Missing Features (Required for Final-Year Project Distinction)
1. **Three-Tier Role Model:** No `STAFF` role exists; front-desk employees cannot be given check-in or equipment duties without exposing the full database and revenue analytics.
2. **Facility vs Court Granularity:** A facility (e.g. Trooferz Baner) has multiple physical playing surfaces (Turf A, Turf B, Badminton Court 1, Badminton Court 2). Current schema flattens this, making it impossible to schedule two matches for the same sport at the same time on different courts.
3. **Real Payment Processing:** Zero real payment capability. Amounts are simply written into the database without payment gateway verification, Razorpay orders, or audit logs.
4. **Customer Wallet & Refund Ledger:** No wallet mechanism for holding credits, receiving partial cancellation refunds, or weather-cancellation compensation.
5. **Dynamic Pricing Engine:** Pricing is fixed; no automated weekend surge, evening peak multipliers, or high-occupancy rules.
6. **Waitlist Subsystem:** When a peak-hour slot is cancelled, it sits idle rather than automatically notifying or promoting eager waitlisted members.
7. **QR Code Verification:** Bookings generate an arbitrary alphanumeric string (`TRF-...`) with no cryptographic signature or tamper verification for venue entry.
8. **Team Split Payments:** No mechanism for group players to divide court fees and contribute their individual share within an expiration window.
9. **Weather Advisory:** Outdoor turfs have no integration with live forecast data, leading to customer disputes during Pune monsoon downpours.
10. **Data Science & ML Analytics:** Current reports are simple SQL aggregations; missing Pandas data manipulation and Scikit-learn predictive forecasting.

### 5.3 Bugs, Vulnerabilities & Weak Points in Current Codebase
- **Single Token Without Revocation:** JWTs never expire server-side until their 7-day timestamp lapses. Stolen tokens cannot be invalidated without clearing the database.
- **Timezone Drift Bug in Date Parsing:** `new Date(value.booking_date).toISOString().slice(0, 10)` in `bookingController.js` shifts evening bookings back one calendar day if processed under UTC.
- **Race Condition Under Concurrent Transactions:** While the virtual key catches duplicates at commit time, the Express handler does not lock rows with `SELECT FOR UPDATE` or guarantee deterministic retry/refund handling, returning raw SQL error messages to users.
- **No Membership Benefit Enforcement:** The `membership_plans.benefits` column is free-form text. Members receive no automated discounts or free booking credit deduction when creating bookings.
- **Plain-text Status Overwrite:** Admin can overwrite booking status arbitrarily without following a deterministic state machine, allowing illegal transitions (e.g. from `CANCELLED` directly to `COMPLETED`).

---

## 6. Proposed Final 3NF MySQL Database Schema (17 Tables)

```
+---------------------------------------------------------------------------------------------------+
|                                     PROPOSED 3NF RELATIONAL SCHEMA                                |
+---------------------------------------------------------------------------------------------------+

   +---------------+        +---------------+        +---------------+
   |   facilities  |        |    sports     |        |   users_user  |
   +---------------+        +---------------+        +---------------+
   | id (PK)       |        | id (PK)       |        | id (PK)       |
   | name          |        | name (UQ)     |        | email (UQ)    |
   | address       |        | slug (UQ)     |        | phone         |
   | opening_time  |        | description   |        | role          |
   | closing_time  |        | image_url     |        | wallet_balance|
   | is_active     |        | is_active     |        | is_active     |
   +-------+-------+        +-------+-------+        +-------+-------+
           |                        |                        |
           +------------+  +--------+                        |
                        |  |                                 |
                     +--v--v---------+                       |
                     |    courts     |                       |
                     +---------------+                       |
                     | id (PK)       |                       |
                     | facility_id FK|                       |
                     | sport_id FK   |                       |
                     | name          |                       |
                     | court_type    |                       |
                     | base_price    |                       |
                     +-------+-------+                       |
                             |                               |
                   +---------+---------+                     |
                   |                   |                     |
            +------v------+     +------v------+              |
            |    slots    |     |pricing_rules|              |
            +-------------+     +-------------+              |
            | id (PK)     |     | id (PK)     |              |
            | court_id FK |     | court_id FK |              |
            | date        |     | multiplier  |              |
            | start_time  |     | day_type    |              |
            | status      |     +-------------+              |
            +------+------+                                  |
                   |                                         |
                   +-------------------+  +------------------+
                                       |  |
                                    +--v--v---------+        +--------------------+
                                    |   bookings    |<-------+   booking_players  |
                                    +---------------+        +--------------------+
                                    | id (PK)       |        | id (PK)            |
                                    | user_id FK    |        | booking_id FK      |
                                    | court_id FK   |        | user_id FK         |
                                    | slot_id FK    |        | share_amount       |
                                    | total_amount  |        | payment_status     |
                                    | status        |        +--------------------+
                                    | qr_code_token |
                                    +---+-------+---+
                                        |       |
            +---------------------------+       +---------------------------+
            |                                                               |
     +------v------+        +--------------------+        +-----------------v--+
     |  payments   |        |wallet_transactions |        |     waitlist       |
     +-------------+        +--------------------+        +--------------------+
     | id (PK)     |        | id (PK)            |        | id (PK)            |
     | user_id FK  |        | user_id FK         |        | user_id FK         |
     | booking_id  |        | amount             |        | court_id FK        |
     | amount      |        | balance_after      |        | date, start_time   |
     | gateway_id  |        | category           |        | status             |
     | status      |        +--------------------+        +--------------------+
     +------+------+
            |
            |               +--------------------+        +--------------------+
            +-------------->|  membership_plans  |------->|    memberships     |
                            +--------------------+        +--------------------+
                            | id (PK)            |        | id (PK)            |
                            | tier (SILVER/GOLD) |        | user_id FK         |
                            | discount_percent   |        | plan_id FK         |
                            | credits            |        | credits_left       |
                            | priority_days      |        | status, is_frozen  |
                            +--------------------+        +--------------------+
```

### Table Definitions & Relational Integrity

1. **`users_user`**: Custom user model with `role` (`MEMBER`, `STAFF`, `ADMIN`), phone number, and decimal `wallet_balance`.
2. **`facilities`**: Venue complex metadata (address in Baner, operating hours, venue rules).
3. **`sports`**: Catalog of sports (Cricket, Football, Badminton, Tennis, Pickleball).
4. **`courts`**: Distinct physical playing surfaces under each facility, categorized as `INDOOR` or `OUTDOOR` with hourly base prices and capacity.
5. **`slots`**: Operational time blocks per court with `status` (`AVAILABLE`, `BOOKED`, `BLOCKED`, `MAINTENANCE`) and a strict unique composite constraint on `(court_id, date, start_time)`.
6. **`pricing_rules`**: Dynamic pricing factors (weekend multiplier, evening peak hours, occupancy threshold).
7. **`membership_plans`**: Quantitative tiers (`SILVER`, `GOLD`, `PLATINUM`) defining discount percentages, complimentary credits, and priority booking windows.
8. **`memberships`**: Active customer subscriptions with credit balances, expiration dates, and freeze/pause capabilities.
9. **`bookings`**: Master reservation records with exact financial breakdown, status state machine (`PENDING`, `CONFIRMED`, `CHECKED_IN`, `COMPLETED`, `CANCELLED`, `REFUNDED`), and signed QR verification token.
10. **`booking_players`**: Participants in split payment / team bookings with individual share amounts and payment statuses.
11. **`payments`**: Audit ledger for all incoming and outgoing financial transactions (Razorpay order ID, payment ID, signature, payment method, status).
12. **`wallet_transactions`**: Complete double-entry style audit log for customer wallet top-ups, booking debits, cancellation refunds, and weather refunds.
13. **`waitlist`**: FIFO / priority queue for booked slots with automatic Celery promotion triggers upon cancellation.
14. **`equipment`**: Rental inventory per facility/sport (rackets, bats, balls, safety gear).
15. **`equipment_rentals`**: Desk checkout logs tied to bookings or walk-in members.
16. **`reviews`**: Verified customer ratings (1 to 5 stars) and comments, constrained to 1 review per confirmed booking.
17. **`notifications`**: Member notifications with targeted alerts for booking confirmations, waitlist promotions, and weather advisories.
18. **`offers`** & **`announcements`**: Administrative marketing campaigns and club notices.

---

## 7. Next Steps: Phase 1 Readiness

Upon your review and explicit approval of this Phase 0 report and 3NF schema, we will proceed directly to **Phase 1: Backend Foundation**:
1. Move the existing Express backend safely into `/legacy-mern-backend`.
2. Initialize the Django 5 + DRF project in `/backend` with modular apps (`users`, `facilities`, `bookings`, `memberships`, `payments`, `analytics`).
3. Provide the exact MySQL 8 database creation and user grant SQL queries.
4. Define the models, foreign keys, indexes, and generate clean migrations.
5. Implement JWT auth with SimpleJWT and role-based permissions (`IsMember`, `IsStaff`, `IsAdmin`).
6. Configure CORS for seamless communication with the React frontend.
7. Generate the full interactive Mermaid ER diagram in `/docs/er-diagram.md`.
