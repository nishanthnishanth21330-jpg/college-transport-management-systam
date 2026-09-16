# College Transport Management System

A full-stack **College Transport Management System** built for a BCA final-year project.

- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Leaflet.js (OpenStreetMap)
- **Backend:** Node.js + Express.js (REST API)
- **Database:** MySQL

No PHP, no XAMPP, no frontend frameworks — just Node.js and MySQL, runnable entirely from VS Code.

---

## 1. Features

- Login with Name + Phone Number (simple session-based auth)
- Dashboard with live stats: Total Buses, Active Buses, Live Buses, Completed Journeys
- Add Bus with full details (driver, route, starting location, destination)
- Live Bus page: view every bus, change its name inline, start/stop journeys
- Real-time-ish location tracking using the browser Geolocation API (`watchPosition`)
- Live map view per bus using Leaflet.js + OpenStreetMap (no API key needed)
- Fully responsive: desktop, tablet, and mobile (collapsible sidebar menu)
- Data persists in MySQL — refreshing the browser does not lose any buses

---

## 2. Project Structure

```
college-transport-management/
│
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── config/
│   │   └── db.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── buses.js
│   │   └── dashboard.js
│   └── middleware/
│       └── auth.js
│
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── add-bus.html
│   ├── live-bus.html
│   ├── style.css
│   └── script.js
│
└── database/
    └── schema.sql
```

---

## 3. Prerequisites

1. **Install Node.js** (v18 or later recommended) — https://nodejs.org
2. **Install MySQL** (v8 recommended) and make sure the MySQL server is running.
3. **VS Code** (or any editor) to open the project folder.

Check installations:

```bash
node -v
npm -v
mysql --version
```

---

## 4. Setup Steps

### Step 1 — Create the MySQL database

Open a terminal (or MySQL Workbench / CLI) and run:

```bash
mysql -u root -p < database/schema.sql
```

This creates the `college_transport_db` database along with the `users` and `buses` tables.
(You can also open `database/schema.sql` and run it manually inside your MySQL client.)

### Step 2 — Configure environment variables

Go into the `backend` folder, copy `.env.example` to `.env`, and fill in your own MySQL credentials:

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=college_transport_db
DB_PORT=3306
```

### Step 3 — Install backend dependencies

```bash
npm install
```

### Step 4 — Run the server

```bash
node server.js
```

If everything is configured correctly, you should see:

```
✅ Connected to MySQL database: college_transport_db
🚌 College Transport server running at http://localhost:5000
```

### Step 5 — Open the app

The Express server also serves the frontend automatically. Just open your browser and go to:

```
http://localhost:5000
```

You do **not** need a separate frontend server — everything runs from one Node.js process on one port.

(If you prefer to open the HTML files directly instead, you can — but then the frontend must call the backend on `http://localhost:5000/api/...` instead of the relative `/api` paths already used in `script.js`. Running via `http://localhost:5000` is the simplest option and requires no changes.)

---

## 5. How to Use

1. Go to **Login**, enter your name and phone number, and click **LOGIN**.
2. Go to **Add Bus**, click **+ ADD BUS**, fill the form, and click **SUBMIT BUS**.
3. Go to **Live Bus** to see the bus card. Click **START JOURNEY** — your browser will ask for location permission. Allow it to begin tracking.
4. Click **BUS LIVE LOCATION** to see the bus on the map, updating as the device moves.
5. Click **STOP JOURNEY** when the trip ends — tracking stops immediately.
6. Click **CHANGE NAME** on any bus card to rename it inline.
7. Click **Logout** in the sidebar to end your session.

---

## 6. API Reference

**Auth**
- `POST /api/auth/login` — `{ name, phone }` → `{ token, user }`
- `GET /api/auth/me` — returns the logged-in user (requires `Authorization: Bearer <token>`)
- `POST /api/auth/logout`

**Buses**
- `GET /api/buses` — list all buses
- `GET /api/buses/:id` — get one bus
- `POST /api/buses` — create a bus
- `PUT /api/buses/:id/name` — rename a bus
- `POST /api/buses/:id/start` — start a journey (sets status to LIVE)
- `POST /api/buses/:id/stop` — stop a journey (sets status to COMPLETED)
- `PUT /api/buses/:id/location` — update live latitude/longitude (LIVE buses only)
- `DELETE /api/buses/:id` — delete a bus

**Dashboard**
- `GET /api/dashboard/stats` — total/active/live/completed counts

All bus and dashboard routes require a valid `Authorization: Bearer <token>` header (obtained from login).

---

## 7. Notes on Authentication

This project uses a simple, in-memory session-token system (no external auth libraries) to keep things beginner-friendly for a college project — exactly as required. Logging in creates or reuses a user record in MySQL (matched by phone number) and issues a session token stored in the browser's `localStorage`. Restarting the Node server clears active sessions (users simply log in again); bus data itself always stays safely in MySQL.

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| `❌ MySQL connection failed` | Check `.env` values and that MySQL is running |
| `ER_DUP_ENTRY` when adding a bus | The Bus Number already exists — use a unique one |
| Location permission denied | Browser blocked geolocation — check site settings and allow location access |
| Blank Live Bus page | Make sure you're logged in first (Login page) |
| Port already in use | Change `PORT` in `.env` and restart the server |

---

Built for academic purposes as a BCA final-year project.
