# SariScan

A mobile-first barcode price checker for sari-sari stores. Scan a product barcode and instantly see the **product name, net weight, and price** — no app store install required.

SariScan includes a private store scanner, a role-based admin dashboard, a JSON product importer, scan analytics, and a full audit trail. Each account has its own store workspace, so products, scans, audit logs, and PDF exports never mix with another store's data.

## Features

- **Self-registration** so every store creates its own account and private workspace before signing in.
- **Instant barcode lookup** using the device camera (`@zxing/browser`) with manual entry as a fallback.
- **Add products by camera scan or manual entry** — scan from the product form, or type the barcode when the camera cannot read it — with every saved product recorded automatically and a downloadable PDF inventory.
- **User profiles** with editable email, password, profile photo, complete address, contact number, and store name.
- **Installable PWA** with offline page, app icons, and service worker caching.
- **Product catalog** with barcode, name, brand, category, selling unit, weight, price, stock, and active status.
- **Admin dashboard** with stats, 7-day scan chart, top products, and recent activity.
- **Scan history** for every lookup, including barcodes that are not in the catalog.
- **Store isolation**: every product, scan, audit entry, dashboard figure, and PDF export is scoped to the signed-in account.
- **Audit log** for logins, product changes, user changes, imports, and settings updates.
- **Configurable store** currency, low-stock threshold, scan source label, and a global scan on/off switch.
- **Security**: hashed passwords, JWT in an httpOnly cookie or Bearer token, rate limiting, password-change token invalidation, and server-side role checks.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16.4 (App Router, Cache Components) |
| UI | React 19.3, Tailwind CSS 4, lucide-react |
| Database | PostgreSQL + Prisma 6 |
| Auth | `jose` JWT, `bcryptjs`, httpOnly cookies |
| Validation | Zod 4 |
| Barcode scanning | `@zxing/browser` |
| Language | TypeScript |

## Roles

| Role | Capabilities |
| --- | --- |
| `SUPER_ADMIN` | Manage user accounts and settings, plus all store features below. Product data stays limited to their own store. |
| `ADMIN` | Import products, view audit logs, and manage their own store's products, scans, stats, and settings (read-only). |
| `STAFF` | Add products by scan or manual entry, edit and delete products in their store, and view their store's scans, stats, and settings. |
| Public | Health check only. Scanning requires a signed-in store account. |

Every account is a separate store. The first account is created by the seed script as `SUPER_ADMIN`.

### Data isolation

- Each account owns a private store workspace keyed by its user ID.
- Barcodes are unique per store, so two stores can carry the same product barcode.
- Products, scans, dashboard stats, audit logs, and inventory PDFs are filtered to the signed-in store.
- Deleting an account removes its products, scans, and store audit entries.

## Local development

### Requirements

- Node.js 20 or newer
- Docker (recommended for PostgreSQL) or an existing PostgreSQL database

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

The included container listens on host port **5433** and stores data in the `sariscan_pgdata` volume.

### 3. Configure the environment

```bash
cp .env.example .env
```

For the included Docker database, set:

```env
DATABASE_URL="postgresql://sariscan:sariscan@localhost:5433/sariscan?schema=public"
```

Generate a strong auth secret:

```bash
openssl rand -base64 48
```

Put it in `AUTH_SECRET`.

### 4. Create the schema and seed

```bash
npm run db:migrate
npm run db:seed
```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The admin dashboard is at [http://localhost:3000/admin](http://localhost:3000/admin).

The bootstrap Super Admin account is created from `SUPER_ADMIN_*`. Change these credentials before deploying anywhere public. No extra accounts or sample products are created.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `AUTH_SECRET` | Yes | Secret used to sign JWTs. Use at least 32 random bytes. |
| `AUTH_COOKIE_NAME` | No | Cookie name. Default: `sariscan_token`. |
| `AUTH_TOKEN_TTL_DAYS` | No | Session lifetime in days. Default: `7`. |
| `ALLOWED_ORIGINS` | No | Comma-separated origins allowed by the CORS proxy. Empty allows any origin. |
| `SUPER_ADMIN_NAME` | Seed only | Name for the bootstrap Super Admin. |
| `SUPER_ADMIN_EMAIL` | Seed only | Email for the bootstrap Super Admin. |
| `SUPER_ADMIN_PASSWORD` | Seed only | Password for the bootstrap Super Admin (minimum 8 characters). |
| `SEED_RESET_PASSWORD` | Seed only | `true` resets the Super Admin password every time the seed runs. |

## API

All endpoints live under `/api/v1` and return one of these envelopes:

```json
{ "success": true, "data": {}, "meta": {} }
```

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Product not found" } }
```

Protected endpoints accept either the `sariscan_token` httpOnly cookie (used by the web app) or `Authorization: Bearer <token>` (useful for the Android app).

### Public

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Database health check. |

### Scanner (signed in)

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/scan` | Look up a barcode in your store. Body: `{ "barcode": "4800016644933", "source": "APP" }`. |
| `GET` | `/scan/:barcode?source=APP` | Same lookup as a GET. |

Scan responses contain only safe product fields and your store's settings. A lookup that does not match an active product in your store returns `404` but is still recorded in your scan history. If scanning is disabled, the endpoint returns `503 SCAN_DISABLED`.

### Auth

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Body: `{ "name", "storeName", "email", "password" }`. Creates a private store account and signs in. |
| `POST` | `/auth/login` | Body: `{ "email", "password" }`. Returns a token and sets the cookie. |
| `POST` | `/auth/logout` | Clears the cookie. |
| `GET` | `/auth/me` | Current user. |
| `POST` | `/auth/change-password` | Body: `{ "currentPassword", "newPassword" }`. Invalidates other sessions. |
| `PATCH` | `/auth/profile` | Update name, email, profile photo, address, contact number, and store name. |

### Products

| Method | Endpoint | Roles | Description |
| --- | --- | --- | --- |
| `GET` | `/products` | All staff | Search, filter, sort, and paginate products in your store. |
| `POST` | `/products` | All staff | Create a product in your store. |
| `GET` | `/products/:id` | All staff | Get one product from your store. |
| `PATCH` | `/products/:id` | All staff | Update a product in your store. |
| `DELETE` | `/products/:id` | All staff | Permanently delete a product from your store. |
| `POST` | `/products/import` | Super Admin, Admin | Upsert or insert products into your store from JSON. |

Common product list parameters: `search`, `isActive` (`all`, `true`, `false`), `category`, `sort` (`createdAt`, `name`, `price`, `stock`), `order` (`asc`, `desc`), `page`, `limit`.

Import body:

```json
{
  "mode": "upsert",
  "products": [
    {
      "barcode": "4800016644933",
      "name": "Lucky Me Pancit Canton Original",
      "price": 17,
      "weight": 60,
      "weightUnit": "GRAM",
      "sellingUnit": "PACK",
      "stock": 120
    }
  ]
}
```

### Admin

| Method | Endpoint | Roles | Description |
| --- | --- | --- | --- |
| `GET` | `/admin/stats` | All staff | Your store's dashboard counters, inventory value, 7-day chart, and top products. |
| `GET` | `/admin/scans` | All staff | Your store's scan history. Filters: `barcode`, `productId`, `userId`, `from`, `to`. |
| `GET` | `/admin/audit-logs` | Super Admin, Admin | Your store's audit trail. Filters: `action`, `entity`, `actorId`, `from`, `to`. |
| `GET` | `/admin/users` | Super Admin | List users. Filters: `search`, `role`, `isActive`. |
| `POST` | `/admin/users` | Super Admin | Create a user. |
| `GET` | `/admin/users/:id` | Super Admin | Get a user. |
| `PATCH` | `/admin/users/:id` | Super Admin | Update a user or reset their password. |
| `DELETE` | `/admin/users/:id` | Super Admin | Delete a user. |
| `GET` | `/admin/settings` | All staff | Store settings. |
| `PATCH` | `/admin/settings` | Super Admin | Update store settings. |

Super Admins cannot demote or delete their own account through the API.

## Deploying to Vercel

1. Push the repository to GitHub.
2. Create a PostgreSQL database (Neon, Supabase, Vercel Marketplace, or any managed Postgres).
3. Import the repository into Vercel.
4. Add the environment variables from the table above. At minimum: `DATABASE_URL` and `AUTH_SECRET`.
5. Use the default build command. `vercel-build` runs:
   ```bash
   prisma generate && prisma migrate deploy && next build
   ```
6. Deploy.
7. Seed the first Super Admin exactly once. From your machine, point `DATABASE_URL` at the production database and run:
   ```bash
   SUPER_ADMIN_NAME="Owner" \
   SUPER_ADMIN_EMAIL="owner@yourstore.com" \
   SUPER_ADMIN_PASSWORD="a-strong-password" \
   npm run db:seed
   ```
8. Open the deployment, sign in at `/login`, and change the bootstrap password in **Settings → Change your password**.

Notes:

- `SEED_RESET_PASSWORD` should normally stay `false`; enabling it on every deploy would reset the owner password.
- If your provider gives separate pooled and direct connection strings, use the direct connection for `prisma migrate deploy`. For a small store deployment a single direct connection string is usually enough.
- The in-memory rate limiter is per server instance. For multi-instance deployments, move rate limiting to a shared store such as Upstash Redis.

## Android compatibility

The web app is designed for Android Chrome:

- Camera scanning requires HTTPS (or `localhost`) and camera permission.
- Use **Add to Home screen** to install the PWA.
- The Android client must sign in and call the API with `Authorization: Bearer <token>`; scans are always scoped to that account's store.
- Set `ALLOWED_ORIGINS` to the Android app's origin if it runs in a WebView; leave it empty to allow any origin. The proxy handles CORS preflight for `/api/*`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Production build. |
| `npm run start` | Start the production server. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Run TypeScript without emitting. |
| `npm run db:migrate` | Create and apply a development migration. |
| `npm run db:deploy` | Apply committed migrations. |
| `npm run db:seed` | Create the bootstrap Super Admin and default settings. |
| `npm run db:studio` | Open Prisma Studio. |

## Project structure

```text
prisma/
  schema.prisma        Database models and enums
  seed.ts              Bootstrap Super Admin and default settings
  migrations/          Committed SQL migrations
public/
  manifest.webmanifest PWA manifest
  sw.js                Service worker
  icons/               App icons
src/
  app/
    page.tsx           Private scanner (sign-in required)
    register/          Create-account page
    login/             Sign-in page
    admin/             Dashboard, profile, products, PDF export, scans, users, audit, settings
    api/v1/            Route handlers
    offline/           Offline fallback page
  components/          UI, scanner, auth provider, admin shell, forms
  lib/                 Auth, Prisma, validation, PDF export, formatting, API client, hooks
  proxy.ts             CORS/preflight for /api/*
```

## Troubleshooting

**Camera does not start**

Use HTTPS or `localhost`, allow camera access in the browser, and close other apps that may be using the camera. Manual entry always works.

**`P1001` / cannot reach database**

Check that Docker is running and that port `5433` matches `DATABASE_URL`. Run `docker compose ps` and then `npm run db:deploy`.

**Prisma client is out of date**

Run `npm run db:generate` or simply `npm install` (the `postinstall` script regenerates it).

**Next.js route segment config errors**

This project uses Next.js 16 with Cache Components. Do not add `export const dynamic = "force-dynamic"` to route handlers; request-time APIs such as `request.headers` opt routes into dynamic rendering automatically. `unstable_rethrow` in the central error handler ensures framework prerender interrupts are not swallowed.

**Build fails during static generation**

Run `npm run typecheck` and `npm run lint` first. Client components must not read `new Date()` or other unstable values during render; compute them in event handlers or effects instead.
