# Commercial Selling & White-Labeling Guide: Sports Club & Turf Management Platform

---

## 1. Executive Summary & Value Proposition

This software is a **turnkey, production-ready Sports Club, Turf & Fitness Arena Management SaaS**. 

### Target Customers:
- **Turf Owners:** Box cricket grounds, artificial football turfs, futsal courts.
- **Racquet Clubs:** Badminton academies, tennis courts, and rapidly growing pickleball centers.
- **Multisport Complexes & Gyms:** Community centers offering memberships, facilities, and hourly rentals.

### Why Clients Buy This Software:
1. **Zero Double-Bookings:** Automated slot reservation engine eliminates manual booking chaos.
2. **Instant Revenue Optimization:** Owners can create custom pricing for peak hours (evenings/weekends) and offer membership subscriptions.
3. **Turnkey Setup:** Runs out of the box without requiring expensive cloud infrastructure.
4. **Mobile Responsive:** Works seamlessly on smartphones, tablets, laptops, and desktop computers.

---

## 2. Feature Matrix (Included Out-of-the-Box)

| Category | Features |
| :--- | :--- |
| **Customer Experience** | • Interactive calendar slot picker with real-time availability<br>• Multi-sport facility browsing with high-resolution imagery<br>• Digital booking pass with unique booking code<br>• Membership subscription catalog & benefit tracking<br>• Personalized user profile & booking history |
| **Admin Operations** | • Executive dashboard with revenue metrics and booking counts<br>• Interactive analytics charts (powered by Recharts)<br>• Maintenance slot locker (block courts for tournaments or rain)<br>• Sports & Facility catalog manager (add/edit courts, capacity, pricing)<br>• Membership plan creator (configure days, prices, and perks)<br>• Announcements & marketing banner broadcaster<br>• Full user account manager & security audit logs |
| **Architecture & Reliability** | • Dual-engine database: Embedded SQLite for zero-config demo + MySQL for high-scale enterprise<br>• JWT authentication with secure HTTP Bearer token verification<br>• Bcrypt password encryption (10 salt rounds)<br>• Full CORS protection and strict input sanitization |

---

## 3. How to White-Label & Rebrand in 5 Minutes

You can customize this product for any client in under 5 minutes without writing complex code:

### 3.1 Changing Club Name & Branding
1. Open `frontend/src/layouts/UserLayout.jsx` and `frontend/src/layouts/AdminLayout.jsx`.
2. Search and replace `Trooferz Sports Club` with your client's name (e.g., `Apex Sports Arena`).
3. Update browser title in `frontend/index.html`.

### 3.2 Updating Hero Images & Court Photos
Replace the default court photos in `frontend/public/`:
- `hero-bg.jpg` — Main homepage background banner.
- `football-court.jpg` — Football / Cricket turf image.
- `pickleball-court.jpg` — Racquet / Badminton / Pickleball court photo.

### 3.3 Customizing Pricing & Currency
- By default, currency displays as `₹` (INR). To change to `$`, `€`, or `£`, search for `₹` in `frontend/src/pages/` and replace with your target currency symbol.
- Pricing can be adjusted directly from the Admin Panel under **Management -> Sports / Facilities / Membership Plans**.

---

## 4. Monetization & Pricing Strategies

### Strategy A: Turnkey One-Time License (Freelance Model)
- **Target:** Single turf owners or local sports clubs.
- **Pricing:** ₹15,000 – ₹45,000 ($250 – $600) one-time fee.
- **Includes:** Installation on their domain, custom logo branding, and staff training.

### Strategy B: Monthly Subscription (SaaS Model)
- **Target:** Multiple turfs or multi-branch academies.
- **Pricing:** ₹2,500 – ₹5,000 ($35 – $75) / month per location.
- **Includes:** Cloud hosting, regular database backups, and technical support.

### Strategy C: Commission on Bookings
- **Target:** High-volume commercial turfs.
- **Pricing:** Free initial setup + 3% to 5% platform convenience fee per online booking.

---

## 5. Deployment Options for Clients

### Option 1: Free / Low-Cost Cloud Deployment (Vercel + Render)
- **Frontend:** Deploy `frontend/` folder directly to [Vercel](https://vercel.com) (pre-configured `vercel.json` included).
- **Backend:** Deploy `backend/` folder to [Render.com](https://render.com) using the included `render.yaml`.
- **Database:** Connect a free cloud MySQL database (such as Aiven, PlanetScale, or Supabase).

### Option 2: Traditional cPanel / VPS (Hostinger, DigitalOcean, AWS)
1. Install Node.js on the server: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -`.
2. Clone repository and run `npm run install:all`.
3. Build the frontend: `npm --prefix frontend run build`.
4. Use PM2 to run the backend continuously: `pm2 start backend/src/server.js --name sports-club-api`.
5. Point NGINX or Apache reverse proxy to port `5000` (API) and serve the `frontend/dist` directory.

---

## 6. Pre-Sales Demo Script

When pitching this software to a prospective client:
1. **Show the Problem:** "How many times have customers called you while you were driving or busy, and you accidentally booked the same court for two different groups?"
2. **Show the Solution:** Open the live demo on your smartphone or laptop (`http://localhost:5173`).
3. **Walk through the Booking Flow:**
   - Select Football or Pickleball.
   - Pick tomorrow's date.
   - Point out that taken slots are automatically disabled and blocked.
   - Click "Book Now" and show the instant confirmation pass.
4. **Demonstrate the Admin Power:**
   - Log into `admin@trooferz.demo`.
   - Show the live Revenue chart.
   - Block a slot in 2 clicks for an upcoming maintenance session or tournament.
5. **Close the Sale:** "We can have this fully branded with your logo and operating on your domain by tomorrow morning."
