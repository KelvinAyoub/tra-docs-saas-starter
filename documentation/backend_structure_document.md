# Backend Structure Document for tra-docs-saas-starter

This document describes the backend setup for the TRA Compliance SaaS starter (`tra-docs-saas-starter`). It covers the architecture, database, APIs, hosting, infrastructure, security, monitoring, and maintenance in everyday language.

## 1. Backend Architecture

### Overall Design
- The backend is built on **Next.js 15** using the **App Router**, which lets us define server code and API endpoints alongside pages in a single project.  
- **Serverless functions** (on Vercel) power all API routes—no separate Node.js server to manage.  
- We follow a **modular folder structure**:
  - `src/app/api/` holds API endpoints.  
  - `src/lib/` contains reusable services (database client, business logic, AI integration).  
  - `src/middleware.ts` applies global auth rules.

### Design Patterns and Frameworks
- **Provider Pattern**: We wrap the app in Clerk’s provider to supply user context everywhere.  
- **Service Layer**: Business logic (e.g. TRA tax calculations) lives in dedicated `lib/` modules.  
- **API Layer**: Each route focuses on a single resource or action (RESTful style).  

### Scalability, Maintainability, Performance
- **Serverless Scale**: Functions automatically scale on demand without manual provisioning.  
- **Multi-Tenant Data Isolation**: Supabase Row-Level Security (RLS) ensures each business’s data stays separate, letting us onboard many tenants safely.  
- **Edge Caching and CDNs**: Static assets and some API responses can be cached at the edge (Vercel CDN), speeding up repeated requests.  
- **TypeScript**: Offers type safety, reducing bugs and helping developers understand interfaces quickly.

## 2. Database Management

### Technology and Type
- We use **Supabase**, which provides a managed **PostgreSQL** database (SQL).  
- Supabase also handles authentication tokens, real-time subscriptions, and storage—but our focus is on the relational data.

### Data Structure and Access
- All tables include a `business_id` column to enforce tenant isolation.  
- **Row-Level Security (RLS)** policies in Postgres automatically filter each query so users only see their own business data.  
- We connect via the `supabase` client in `src/lib/supabase.ts`, passing the user’s JWT from Clerk to Supabase so RLS rules apply.

### Data Management Practices
- **Environment Variables** store all secrets (database URL, service keys) outside code.  
- **Migrations**: We use Supabase’s SQL migration system to version-control schema changes.  
- **Backups & Point-In-Time Recovery**: Supabase manages daily backups and can restore to any point in time.

## 3. Database Schema

Below is a human-readable SQL schema for our core tables. You can run these in Supabase’s SQL editor or your migration tool.

```sql
-- Businesses
CREATE TABLE businesses (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Business Members (which users belong to which businesses)
CREATE TABLE business_members (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID,
  role TEXT CHECK (role IN ('owner','accountant','viewer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Transactions (expenses, income)
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('expense','income')),
  amount NUMERIC(12,2) NOT NULL,
  category TEXT,
  description TEXT,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Employees (for payroll, PAYE, SDL)
CREATE TABLE employees (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  salary NUMERIC(12,2) NOT NULL,
  start_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Reports (stored PDF or JSON metadata)
CREATE TABLE reports (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('paye','vat','sdl','custom')),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  file_url TEXT
);
```

## 4. API Design and Endpoints

We follow a RESTful approach using Next.js API routes. Key endpoints include:

- **Authentication** (handled by Clerk)  
  - `/api/auth/*` (login, logout, session management)

- **Business Management**  
  - `GET /api/businesses` – List businesses the user belongs to.  
  - `POST /api/businesses` – Create a new business.

- **Transactions**  
  - `GET /api/transactions?businessId=...` – Fetch all transactions for a business.  
  - `POST /api/transactions` – Add a new expense or income.

- **Employees**  
  - `GET /api/employees?businessId=...` – List employees.  
  - `POST /api/employees` – Add an employee.

- **Reports**  
  - `GET /api/reports?businessId=...&type=...` – List generated reports.  
  - `POST /api/reports` – Trigger report generation (PDF creation service).

- **AI Chat**  
  - `POST /api/chat` – Process a user’s chat message. It:
    1. Sends the text to **Vercel AI SDK**.  
    2. Extracts intent and entities (e.g. add expense).  
    3. Inserts a `transactions` row via Supabase.  
    4. Streams a confirmation back to the client.

Each endpoint validates input using a library like **Zod** to ensure data integrity.

## 5. Hosting Solutions

### Backend Hosting
- **Vercel** hosts our Next.js app. Benefits include:
  - **Automatic Deployments** from GitHub branches.  
  - **Serverless Scaling**: Functions spin up on demand.  
  - **Global CDN**: Static assets and serverless responses are cached at the edge.

### Database Hosting
- **Supabase** provides a fully managed Postgres database.  
- It includes built-in RLS, backups, and a dashboard for monitoring.

### Cost-Effectiveness & Reliability
- Pay-as-you-go model means you only pay for usage.  
- Vercel and Supabase SLA-backed uptime guarantees business continuity.

## 6. Infrastructure Components

- **Load Balancer & Edge Network**: Vercel’s platform automatically balances requests across edge nodes and functions.  
- **CDN**: Vercel’s CDN caches static files (JS, CSS, images) globally for fast delivery.  
- **Caching**:
  - **Next.js ISR/Cache-Control** headers for API routes and pages.  
  - **Supabase Realtime** for pushing live updates to frontends when data changes.
- **Storage**: Supabase Storage can host user-uploaded files (e.g. PDF bank statements).

## 7. Security Measures

- **Authentication**: Clerk manages user sign-up, sign-in, and sessions.  
- **Authorization**: Supabase RLS policies enforce row-level access based on user and business IDs.  
- **Encryption**:
  - **In transit**: HTTPS/TLS everywhere.  
  - **At rest**: Supabase encrypts database disks.
- **Secret Management**: Environment variables in Vercel and Supabase store API keys, database URLs, Clerk secrets, and AI model credentials—never in source code.  
- **Input Validation**: All API inputs run through Zod schemas to block malicious payloads.
- **Error Logging & Rate Limiting**: Integrate tools like Sentry for error tracking and optionally implement rate limits on sensitive endpoints.

## 8. Monitoring and Maintenance

### Monitoring Tools
- **Vercel Analytics**: Tracks function performance, response times, and error rates.  
- **Supabase Dashboard**: Monitors database health, query performance, and RLS violations.  
- **Sentry (or similar)**: Captures runtime exceptions and stack traces.
- **Custom Logs**: Use a structured logging service (e.g. Logflare, DataDog) to record API usage and business-critical events.

### Maintenance Practices
- **Automated Tests**:
  - **Unit Tests** (Jest) for business logic modules in `src/lib/tra/`.  
  - **Integration Tests** (React Testing Library) for core user flows.
- **Schema Migrations**: Version-controlled SQL migrations run automatically during CI/CD.  
- **Dependency Updates**: Dependabot or Renaissance to keep libs up to date.  
- **Performance Audits**: Periodic reviews of slow database queries and function cold starts.

## 9. Conclusion and Overall Backend Summary

The backend of `tra-docs-saas-starter` is built for security, scale, and developer productivity. By combining Next.js serverless functions, Clerk authentication, Supabase’s managed Postgres with RLS, and Vercel AI SDK, it delivers:

- **Secure Multi-Tenant Data**: Each business’s financial records are isolated by design.  
- **Responsive AI Chat**: Users can log expenses and incomes via natural language.  
- **Robust Architecture**: Serverless scaling and global CDN ensure high performance.  
- **Maintainable Codebase**: TypeScript, modular services, and clear folder structure make it easy to extend for TRA compliance features.

This setup lets your team focus on specialized TRA tax logic, document generation, and ERP integrations, rather than boilerplate infrastructure. With best-in-class hosting, security, and monitoring in place, you can confidently build a production-ready TRA compliance SaaS.