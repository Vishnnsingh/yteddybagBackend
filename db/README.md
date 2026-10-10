# Database Setup (Supabase / PostgreSQL)

Sari SQL files is `Backend/db/` folder me organize ki gayi hain. YTeddybags Ecommerce ke liye schema updated hai.

## Files Description

| File | Description |
|------|-------------|
| [schema.sql](file:///d:/Kavion/Tanfeez%20Projects/YTeddybags%20final/Backend/db/schema.sql) | **Master SQL File**: `ecommerce` + `users` + `admins` tables, extensions, indexes aur permissions ek saath run karne ke liye. |
| [01_users_setup.sql](file:///d:/Kavion/Tanfeez%20Projects/YTeddybags%20final/Backend/db/01_users_setup.sql) | Users table setup (customer auth, Google login, profile). |
| [02_admins_setup.sql](file:///d:/Kavion/Tanfeez%20Projects/YTeddybags%20final/Backend/db/02_admins_setup.sql) | Admins table setup (admin login, role, dashboard access). |
| [03_ecommerce_setup.sql](file:///d:/Kavion/Tanfeez%20Projects/YTeddybags%20final/Backend/db/03_ecommerce_setup.sql) | Ecommerce table setup (store configuration, branding, metadata). |
| [04_header_navigation_setup.sql](file:///d:/Kavion/Tanfeez%20Projects/YTeddybags%20final/Backend/db/04_header_navigation_setup.sql) | Header Navigation (`header_items`) aur Dropdown Sub-Items (`header_dropdown_items`) tables + B-Tree indexes. |

---

## How to Run in Supabase

1. Open your **Supabase Dashboard** ([supabase.com](https://supabase.com)).
2. Apne project me jaiye aur left sidebar se **SQL Editor** pe click karein.
3. **New query** open karein.
4. [schema.sql](file:///d:/Kavion/Tanfeez%20Projects/YTeddybags%20final/Backend/db/schema.sql) ka pura content copy karke paste karein.
5. **Run** button dabayein (`Ctrl + Enter`).
6. Successfully sabhi tables create aur migrate ho jayenge (`ecommerce`, `users` & `admins`).

---

## 🔐 Default Admin Credentials

* **Login URL**: `http://localhost:5173/dashboard/login`
* **Email**: `admin@gmail.com`
* **Password**: `12345678`
* **Role**: `admin`

