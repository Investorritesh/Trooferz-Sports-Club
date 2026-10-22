# Trooferz Sports Club: Master Viva Voce Defense & Examiner Q&A Guide

**Project Title:** Web Application for Sports Facility, Court Booking, and Membership Management  
**Target Venue:** Trooferz Sports Club (Baner, Pune, Maharashtra)  
**Academic Degree:** Final-Year Capstone Project / B.E. / B.Tech / M.C.A.  
**Tech Stack:** React 18, Vite, Python 3.11+, Django 5, Django REST Framework, MySQL 8 / PyMySQL, SimpleJWT, scikit-learn, Open-Meteo REST API  

---

## 1. Executive Summary & Problem Statement

Commercial recreational sports turf and multi-court facilities in urban hubs like Baner, Pune face distinct operational bottlenecks:
1. **Double-Booking Contention:** High peak-hour concurrency (Friday/Saturday evenings 6 PM – 10 PM) causes race conditions in naive CRUD databases.
2. **Team Payment Friction:** A single player shouldn't have to bear the full ₹1,200/hr cost of a box cricket turf or football arena upfront.
3. **Waitlist Lost Revenue:** Cancellations result in unutilized court time without automated queue re-allocation.
4. **Monsoon / Weather Cancellations:** Sudden Pune showers cause member disputes on unplayable outdoor courts.
5. **Dynamic Pricing Absence:** Static pricing fails to capitalize on peak demand or stimulate off-peak utilization (11 AM – 3 PM).

### Why Migrate from MERN to Python + Django 5 + MySQL 8?
| Dimension | Legacy MERN (MongoDB) | Target Stack (Django 5 + MySQL 8) |
| :--- | :--- | :--- |
| **Data Integrity** | Eventual consistency, document embeds, no foreign keys | Strict ACID relational constraints, 3NF 17-table schema, `ON DELETE` cascades |
| **Concurrency Lock** | Optimistic / Application-level locks (prone to races) | Pessimistic Row Locking (`SELECT ... FOR UPDATE`), 0 double-bookings |
| **Financial Ledgers** | Unstructured JSON arrays | Double-entry wallet ledger with non-nullable transaction references |
| **Machine Learning** | Requires external microservices | Native Python ecosystem (`scikit-learn`, `numpy`, `pandas`) directly in-process |
| **Security & Auth** | Custom Express middleware | Industrial-grade `django-rest-framework-simplejwt` + PBKDF2 with SHA-256 |

---

## 2. Master Viva Voce Questions & Model Answers

### Category A: Database Architecture & MySQL 8 Normalization

#### Q1: "Why did you choose a 3NF Relational Schema in MySQL instead of keeping MongoDB?"
> **Answer:** "Sports facility reservation systems are inherently relational and transaction-heavy. Bookings depend on Courts, Courts depend on Facilities and Sports, and Payments depend on Bookings. In MongoDB, data is either denormalized (causing data anomalies when court prices update) or referenced via manual ObjectIds without database-level referential integrity.
> In MySQL 8, our 17 normalized tables enforce 3NF:
> 1. `unique_court_slot` composite key on `(court_id, date, start_time)` guarantees that two bookings cannot coexist for the same slot at the hardware storage layer.
> 2. Foreign keys with strict cascades prevent orphaned records.
> 3. InnoDB's row-level locking ensures that concurrent transactions do not lock the entire table."

#### Q2: "Can you explain the 3 Normal Forms applied in your schema?"
> **Answer:**
> - **1NF (First Normal Form):** Every column contains atomic values. We do not store comma-separated player names or split amounts; instead, each player is an individual row in `booking_players`.
> - **2NF (Second Normal Form):** All non-key attributes are fully functionally dependent on the primary key. For example, sport rules belong in `sports`, court attributes in `courts`, and slot schedules in `slots`.
> - **3NF (Third Normal Form):** No transitive dependencies exist. A booking references a `Court` directly; facility details are queried through the `court.facility` foreign key rather than duplicated inside the `bookings` table.

---

### Category B: Concurrency Control & Double-Booking Prevention

#### Q3: "How does your code prevent two users from simultaneously booking the same court slot?"
> **Answer:** "We use pessimistic database row-locking via Django's `select_for_update()` inside an isolated atomic transaction (`transaction.atomic()`):
> ```python
> with transaction.atomic():
>     slot = Slot.objects.select_for_update().get(id=slot_id)
>     if slot.status != 'AVAILABLE':
>         return Response({'message': 'Slot reserved'}, status=409)
>     slot.status = 'BOOKED'
>     slot.save()
> ```
> In MySQL InnoDB, `select_for_update()` emits an exclusive write lock (`X-Lock`) on the slot record. If User A and User B click 'Book' at the exact same millisecond:
> 1. User A acquires the row lock first.
> 2. User B's thread blocks, waiting for User A's transaction to commit.
> 3. When User B's transaction unblocks, it reads `slot.status == 'BOOKED'` and is immediately rejected with `HTTP 409 Conflict`.
> This is verified by our automated multi-threaded test `test_concurrent_double_booking_prevention`."

#### Q4: "Why pessimistic locking (`select_for_update`) instead of optimistic locking (version numbers)?"
> **Answer:** "Optimistic locking is ideal for low-contention environments where conflicts are rare. However, for sports turfs in Pune, prime slots (e.g. Saturday 8 PM Box Cricket) experience intense contention. With optimistic locking, multiple users would fill out payment forms, and all but one would suffer late write-conflict rollbacks after paying. Pessimistic locking locks the slot at reservation time, giving immediate, definitive reservation guarantees."

---

### Category C: Security, Authentication & Role-Based Access Control

#### Q5: "How are passwords stored and authenticated?"
> **Answer:** "We use Django's PBKDF2 (Password-Based Key Derivation Function 2) algorithm with a SHA-256 hash and a 1,000,000-iteration work factor with a per-user random cryptographic salt. Passwords are never stored or logged in plain text."

#### Q6: "How does your JWT implementation work across Member, Staff, and Admin roles?"
> **Answer:** "We use `djangorestframework-simplejwt`. Upon authentication (`POST /api/auth/login`), the server issues an HMAC-SHA256 signed access token (valid for 60 minutes) and a refresh token (valid for 7 days).
> We embed custom claims (`role`, `email`, `full_name`) directly into the token payload:
> ```python
> refresh['role'] = user.role
> ```
> Custom permission classes (`IsMember`, `IsStaff`, `IsAdmin`) inspect `request.user.role` on every request. Staff endpoints like QR pass verification or admin reports immediately return `HTTP 403 Forbidden` if invoked by standard members."

#### Q7: "How do you prevent duplicate QR check-in fraud (e.g., sharing a screenshot with a friend)?"
> **Answer:** "The QR pass encodes a cryptographically unique token (`QR-PASS-{code}-{uuid}`). When staff scans it (`POST /api/bookings/verify-qr/`), the backend executes an atomic transition:
> ```python
> with transaction.atomic():
>     booking.status = 'CHECKED_IN'
>     booking.qr_checked_in_at = timezone.now()
>     booking.checked_in_by = request.user
>     booking.save()
> ```
> If a second attempt is made with the same QR pass, the server detects `booking.status == 'CHECKED_IN'` and rejects it with `HTTP 400 Bad Request`, detailing: *'Duplicate scan! Pass already used at 18:04 by staff@trooferz.com'*. A screenshot cannot be used twice."

---

### Category D: Engineering Differentiators

#### Q8: "How does the Multi-Party Split Payments system work?"
> **Answer:** "When a captain books with `is_split_payment=True`:
> 1. The booking enters `PENDING` status with a 2-hour escrow deadline (`split_expiry = now() + 2 hours`).
> 2. The total court price is validated so that $\sum \text{share\_amount}_i == \text{booking.total\_amount}$.
> 3. Individual `BookingPlayer` records are created for each teammate.
> 4. Teammates log in and click 'Pay Share' from their wallet (`POST /api/bookings/split-pay/`).
> 5. When all player shares reach `PAID`, the booking status automatically transitions to `CONFIRMED` and the digital QR pass is generated.
> 6. If the 2-hour deadline lapses before all shares are paid, our background queue daemon (`process_booking_queues`) auto-refunds all paid players 100% to their wallets and re-opens the court slot."

#### Q9: "Explain your Algorithmic Priority Waitlist. Why is it better than a basic FIFO queue?"
> **Answer:** "A simple FIFO queue treats a customer who registered 5 minutes ago identically to a loyal customer paying a ₹5,000/yr Platinum membership. Trooferz implements a tier-weighted scoring model:
> $$\text{Score} = \text{Platinum (30 pts)} > \text{Gold (20 pts)} > \text{Silver (10 pts)} > \text{Standard (0 pts)}$$
> Queue ordering in SQL uses:
> ```sql
> ORDER BY priority_score DESC, created_at ASC
> ```
> This prioritizes high-value members while using FIFO as a fair tie-breaker. When an existing booking is cancelled, the top-priority waiting user is promoted to `OFFERED` status with an exclusive 15-minute claim window before rotating to the next person."

#### Q10: "How does the Real-Time Weather Advisory & Rain-Check Policy function?"
> **Answer:** "We query the Open-Meteo REST API for Baner, Pune (`18.5590° N, 73.7868° E`) with a 15-minute in-memory cache.
> Our rule engine differentiates outdoor courts (Box Cricket, Football, Tennis) from indoor arenas (Badminton):
> - If an outdoor court has $\ge 50\%$ precipitation probability, the booking is tagged with `rain_check_guaranteed: True`.
> - If rained out, the customer receives an instant 100% wallet refund or free reschedule, eliminating cashier disputes.
> - If the club is offline during the exam, an embedded Pune climatological simulator generates realistic seasonal weather curves automatically."

---

### Category E: Machine Learning & Predictive Analytics

#### Q11: "What ML model did you implement and why?"
> **Answer:** "We implemented an $L_2$-regularized Ridge regression model (`scikit-learn.linear_model.Ridge`) in `analytics/forecasting.py`. It predicts hourly court occupancy rates ($0\% - 100\%$) and 7-day booking and revenue projections.
> We chose Ridge regression over a deep neural network because:
> 1. Tabular facility booking datasets have small-to-medium sample spaces where deep networks overfit.
> 2. Ridge regression handles collinearity between weekend indicators and prime-hour indicators cleanly through shrinkage ($\alpha = 1.0$).
> 3. Inference takes less than 5 milliseconds directly inside the Django process with zero GPU overhead."

#### Q12: "What features are used in your regression model?"
> **Answer:** "The 8-dimensional feature vector comprises:
> 1. `day_of_week` ($0$ for Monday to $6$ for Sunday)
> 2. `hour` ($6$ to $22$)
> 3. `is_weekend` binary indicator (Friday, Saturday, Sunday)
> 4. `is_prime_hour` binary indicator (06:00–08:00 and 18:00–22:00)
> 5. `sport_id` category identifier
> 6. `rain_prob` normalized precipitation probability ($0.0 - 1.0$)
> 7. `is_outdoor` binary surface indicator
> 8. `rain_outdoor_interaction` ($rain\_prob \times is\_outdoor$) capture the dampening effect of monsoon rain on outdoor turfs."

#### Q13: "How does dynamic surge pricing work?"
> **Answer:** "The predicted occupancy rate maps to an automated multiplier bounded between $0.90\times$ and $1.30\times$:
> - $\text{Occupancy} \ge 85\% \rightarrow 1.30\times$ (Peak Surge)
> - $70\% \le \text{Occupancy} < 85\% \rightarrow 1.15\times$ (High Demand)
> - $40\% \le \text{Occupancy} < 70\% \rightarrow 1.00\times$ (Standard Base)
> - $\text{Occupancy} < 40\% \rightarrow 0.90\times$ (Off-Peak Early-Bird Discount)
> This maximizes venue yield while offering discounts during slow weekday afternoons."

---

### Category F: Verification, Testing & Error Handling

#### Q14: "How many automated tests did you write and what do they verify?"
> **Answer:** "We wrote **30 comprehensive automated tests** across 4 Django applications, running with 100% pass rate:
> - `analytics` (10 tests): Pune coordinates, indoor vs outdoor advisories, Ridge predictions, 7-day forecast, 7x17 heatmap, role permissions, and price preview enrichment.
> - `bookings` (8 tests): `select_for_update` double-booking race condition prevention, tiered refunds, rescheduling, state machine validation, split payments, QR passes, priority waitlist, and expired queue cleaner.
> - `payments` (8 tests): Razorpay HMAC-SHA256 signature verification, double-entry wallet ledger top-up, atomic debit, and payment failure safety.
> - `memberships` (4 tests): Tiered discounts, credit deductions, subscription freeze/unfreeze, and automated expiration cron."

---

## 3. Demo User Credentials Reference

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@trooferz.com` | `Admin@123` | Full access: BI dashboards, revenue insights, member controls |
| **Staff** | `staff@trooferz.com` | `Staff@123` | Front-desk operations: Touchless QR Scanner, booking updates |
| **Member** | `member@trooferz.com` | `Member@123` | Member portal: Court booking, split payments, wallet, QR pass |
| **Demo Player 1** | `player1@trooferz.demo` | `TestPassword@123` | Split payment teammate account |
| **Demo Player 2** | `player2@trooferz.demo` | `TestPassword@123` | Split payment teammate account |
