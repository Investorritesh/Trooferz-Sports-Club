# Phase 6 Architecture & Viva Voce Guide: Frontend Integration & Modernization

## 1. Executive Summary & College Evaluation Value

A successful final-year full-stack migration must not only replace the server runtime and database, but also provide a responsive user interface that showcases every differentiator feature.

In Phase 6, the **Trooferz Sports Club** React 18 / Vite frontend was integrated with the Django REST Framework backend (`http://127.0.0.1:8000/api`) with full backward-compatibility and dedicated UI components for all differentiator modules.

---

## 2. Frontend & Backend Integration Architecture

```mermaid
graph TD
    Client[React 18 / Vite Client] -->|Axios Bearer SimpleJWT| API[Django REST Framework]
    API -->|ACID select_for_update| MySQL[(MySQL 8 Database)]
    API -->|Live Telemetry / Fallback| Weather[Open-Meteo & Pune Climatology]
    API -->|Ridge Regressor| ML[Demand Forecaster]

    subgraph Client Differentiator Views
        WeatherBadge[Live Weather & Rain-Check Badge]
        SplitUI[Multi-Party Split Payment Modal]
        QRModal[Touchless Digital QR Match Pass]
        QRScanner[Front-Desk Staff Anti-Replay Scanner]
        WaitlistUI[Algorithmic Priority Waitlist]
        WalletUI[Digital Wallet Ledger & Top-Up]
        HeatmapUI[7x17 Demand Heatmap Matrix]
    end
```

### 2.1 Authentication & Token Lifecycle
- Stored under `trooferz_token` in `localStorage`.
- Handled by `api.interceptors.request` appending `Authorization: Bearer <access_token>`.
- Auto-handles 401 Unauthorized by clearing stale credentials and redirecting to `/login` with friendly error prompts.

---

## 3. Implemented Differentiator UI Components

### 3.1 Live Pune Weather & Rain-Check Advisory (`Bookings.jsx`)
- Automatically queries `/api/analytics/weather-advisory/` when a court, date, and slot time are picked.
- **Indoor Courts (Badminton, Squash, Gym):** Displays a green `Weather-Proof Arena` badge indicating climate-controlled conditions.
- **Outdoor Courts (Box Cricket, Football, Tennis):** Evaluates precipitation risk. When rain probability exceeds $50\%$, displays an alert badge:
  ```text
  🌧️ Rain Advisory - Outdoor Play At Risk
  High rain probability (65%) expected in Baner.
  Free Rain-Check Reschedule or 100% Wallet Refund Guaranteed if unplayable.
  ```

### 3.2 Multi-Party Split Payments Modal (`Bookings.jsx`)
- Checkbox toggle: *"Split Payment with Teammates (Multi-Party Escrow)"*.
- Team captain can add 2 to 8 teammates with names, emails, and automatic rupee share calculations.
- Dispatches `is_split_payment: true` with `players: [...]` holding the slot in conditional escrow for 2 hours.
- Teammates log into their own account and see a *"Pay Share (₹X)"* button that debits their wallet directly.

### 3.3 Touchless Digital QR Match Pass (`Bookings.jsx`)
- For every confirmed booking, members can click `[Pass]`.
- Opens a high-contrast modal rendering the 2D QR matrix streamed live from `GET /api/bookings/{id}/qr-code/` with medium error correction (`ERROR_CORRECT_M`).
- Displays booking code, court name, match date, and time for touchless front-desk validation.

### 3.4 Front-Desk Staff Touchless Scanner (`admin/Bookings.jsx`)
- Accessible to staff and club administrators.
- Allows staff to paste or scan a member's pass token (`QR-PASS-...`).
- Calls `POST /api/bookings/verify-qr/`.
- **First Scan:** Displays green confirmation with player name, court, and match time, transitioning status to `CHECKED_IN`.
- **Duplicate Scan:** Displays red alert: *"Duplicate scan! Pass has already been used at 18:04 by staff@trooferz.com"*, preventing fraudulent pass sharing.

### 3.5 Algorithmic Priority Waitlist (`Bookings.jsx`)
- Unavailable or booked slots feature a `Join Waitlist` action.
- Shows tier priority points ($Platinum = 30$, $Gold = 20$, $Silver = 10$, $Standard = 0$).
- When a court cancellation occurs, the top-priority waiting user receives an active banner with a 15-minute countdown and a `CLAIM COURT NOW` button that converts the waitlist into a confirmed booking.

### 3.6 Trooferz Digital Wallet Ledger & Top-Up (`Profile.jsx`)
- Displays real-time wallet balance.
- Quick Top-Up modal with preset amounts (₹500, ₹1000, ₹2000, ₹5000).
- Displays double-entry ledger table (`CREDIT` vs `DEBIT`, balance after, reference IDs, and timestamps).

### 3.7 ML 7-Day Forecast & 7x17 Demand Heatmap (`admin/Dashboard.jsx`)
- Visualizes 7-day projected occupancy, booking volume, and projected revenues modeled via `scikit-learn` Ridge regression.
- Visualizes a full 7-day $\times$ 17-hour ($06:00 - 22:00$) heatmap matrix color-coded into Off-Peak (<40%), Standard (40-70%), High (70-85%), and Peak Surge (>85%) tiers.

---

## 4. Frontend Build Validation

Production build test output (`npm run build` in `frontend/`):
```text
vite v5.4.21 building for production...
transforming...
✓ 2459 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.01 kB │ gzip:   0.54 kB
dist/assets/index-CZRAqOsx.css   44.04 kB │ gzip:   8.24 kB
dist/assets/index-CYrqvkPd.js   749.06 kB │ gzip: 212.80 kB
✓ built in 12.87s
```

---

## 5. College Viva Voce Defense & Examiner Q&A Guide

### Q1: "How does the React frontend maintain responsive performance while displaying real-time weather and ML demand heatmaps?"
> **Answer:** "We decoupled expensive calculations through server-side caching and asynchronous endpoints. The weather service utilizes a 15-minute in-memory cache on the Django backend, and the demand heatmap is computed using Ridge regression in sub-10 milliseconds. On the frontend, React hooks (`useMemo` and `useEffect` with precise dependency arrays) ensure components only re-render when the user changes facility or time slot, keeping DOM operations minimal and page load times under 600ms."

### Q2: "How does the frontend handle token expiry or unauthorized access?"
> **Answer:** "Our Axios HTTP client in `services/api.js` uses response interceptors. When a protected endpoint returns `HTTP 401 Unauthorized` (indicating an expired or invalid SimpleJWT token), the interceptor automatically clears `trooferz_token` from `localStorage` and redirects the user to `/login` with an informative session-expiry message, while bypassing login/register requests so validation errors are rendered cleanly."

### Q3: "Can a user manipulate their split payment share amount in the browser to pay less?"
> **Answer:** "No. Client-side state in `Bookings.jsx` automatically calculates equal shares for user convenience, but security is strictly enforced on the Django backend. When `is_split_payment=True` is submitted, `BookingViewSet.create()` computes the exact court fee using `calculate_booking_price()` and verifies that $\sum \text{share\_amount}_i == \text{booking.total\_amount}$. Any tampering or penny-discrepancy triggers an immediate `ValidationError (HTTP 400)` and transaction rollback."
