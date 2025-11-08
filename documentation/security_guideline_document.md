# Security Guidelines for `tra-docs-saas-starter`

## Introduction
These guidelines apply to the `tra-docs-saas-starter`, a Next.js 15-based template designed for a multi-tenant TRA compliance SaaS. They embed security by design, ensure defense in depth, and align with industry best practices.

---

## 1. Authentication & Authorization

### 1.1 Clerk Integration Hardening
- **Strong Password Policy**: Enforce minimum length (≥ 12 characters), complexity (upper, lower, digit, symbol), and rotation reminders. Configure Clerk to reject weak passwords.
- **Multi-Factor Authentication (MFA)**: Require MFA (TOTP or SMS) for all business owners and accountants. Configure Clerk’s MFA APIs accordingly.
- **Session Management**:
  - Set short idle timeouts (e.g., 15 minutes) and absolute timeouts (e.g., 24 hours).
  - Use `Secure`, `HttpOnly`, and `SameSite=Lax` flags on session cookies.
  - Invalidate sessions on password change or suspicious activity.
- **Role-Based Access Control (RBAC)**:
  - Define roles (`admin`, `accountant`, `viewer`) in Clerk.
  - Check roles server-side in middleware (`src/middleware.ts`) and API routes before granting access.
  - Avoid client-side role checks for enforcement.

### 1.2 Route Protection
- Use Clerk middleware to guard(`/dashboard/*`, `/api/*`) routes.
- Respond with 401 for unauthorized, 403 for forbidden.
- Log all unauthorized access attempts for monitoring.

---

## 2. Input Handling & Data Validation

### 2.1 Client & Server Validation
- **Zod or Joi Schemas**: Define and enforce request schemas for all API endpoints (`/api/chat`, `/api/transactions`, file uploads).
- **Sanitize Inputs**:
  - Strip HTML/JS from free-text fields (e.g., `chat.tsx` messages) to prevent XSS.
  - Validate CSV/PDF uploads by extension, MIME type, and content signature.

### 2.2 Prevention of Injection
- **Parameterized Queries**: Use Supabase client with built-in parameterized queries; never interpolate raw values.
- **ORM/Query Builder**: Avoid raw SQL when possible; rely on Supabase JS or PostgREST.

### 2.3 Safe AI Chat Processing
- Treat AI model outputs as untrusted:
  - Validate extracted entities (amounts, dates, categories) against expected formats.
  - Implement allow-lists for transaction categories.
  - Reject or prompt on ambiguous instructions.

---

## 3. Data Protection & Privacy

### 3.1 Encryption
- **In Transit**: Enforce HTTPS for all endpoints (Vercel + custom domains). Redirect HTTP → HTTPS.
- **At Rest**: Enable Supabase’s AES-256 encryption on sensitive columns (e.g., PII, API keys).

### 3.2 Secrets Management
- **Environment Variables**: Do not commit `.env.local`. Use Vercel Environment Variables or Vault for:
  - Clerk API keys
  - Supabase URL & Service key
  - AI model API keys
- **Rotation**: Periodically rotate keys and update in secret store.

### 3.3 Data Minimization & Masking
- Return only necessary fields in API responses (avoid `SELECT *`).
- Mask sensitive PII (e.g., partial TIN, masked bank account numbers) in UIs.

---

## 4. API & Service Security

### 4.1 Rate Limiting & Throttling
- Implement per-user and per-IP rate limits on `/api/chat` and other write endpoints using middleware (e.g., Upstash Redis).

### 4.2 CORS Configuration
- Restrict CORS to trusted origins (your SaaS front-end).
- Explicitly deny wildcard (`*`).

### 4.3 Versioning & Method Enforcement
- Prefix API with `/v1/` to allow future changes.
- Use correct HTTP verbs: GET for reads, POST for creates, PUT/PATCH for updates, DELETE for removals.

---

## 5. Web Application Security Hygiene

### 5.1 Security Headers
- `Content-Security-Policy`: Restrict to your domain and approved CDNs. Disallow inline scripts/styles.
- `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`.
- `X-Content-Type-Options`: `nosniff`.
- `X-Frame-Options`: `DENY` or `SAMEORIGIN`.
- `Referrer-Policy`: `strict-origin-when-cross-origin`.

### 5.2 CSRF Protection
- Use anti-CSRF tokens for all state-changing POST/PUT/PATCH/DELETE forms and fetch calls.
- Leverage Next.js built-in CSRF libraries or implement synchronizer token pattern.

### 5.3 Cookie Security
- Mark all cookies as `Secure` and `HttpOnly`.
- Use `SameSite=Lax` for UI cookies, `Strict` for session cookies if applicable.

---

## 6. Infrastructure & Configuration Management

### 6.1 Deployment Hardening
- Disable Next.js preview modes and `reactStrictMode` when not needed.
- Serve from Vercel with automatic TLS and DDoS protection.

### 6.2 Least Privilege
- **Supabase Service Role**: Only use Service Role key for migrations and server-side scripts. Use anon/public key with RLS for all runtime queries.
- **Database Users**: Create separate roles for read-only and write-only operations if direct DB connections are used.

### 6.3 Software Updates
- Schedule regular dependency audits and upgrades via Dependabot or Renovate.
- Patch Node.js, Next.js, and major libraries quarterly at minimum.

---

## 7. Dependency Management

- **Lockfiles**: Commit `package-lock.json` to enforce known-good versions.
- **Vulnerability Scanning**: Integrate SCA tools (e.g., Snyk, GitHub Advanced Security) in CI to catch CVEs.
- **Minimal Footprint**: Remove unused packages and functions.

---

## 8. Logging, Monitoring & Incident Response

- **Centralized Logging**: Stream application logs to Sentry or Logflare. Scrub PII before logging.
- **Audit Trails**: Record critical actions (user login, transaction creation, permission changes) in an immutable audit table.
- **Alerting**: Set thresholds for error rates, 401 spikes, and unusual API usage. Integrate with PagerDuty or Slack.
- **Incident Plan**: Document steps for key compromise, data breach notification, and recovery procedures.

---

## Conclusion
By adhering to these security guidelines, the `tra-docs-saas-starter` will be transformed into a robust, production-ready TRA compliance platform that:

- Protects sensitive financial and personal data
- Enforces strict multi-tenant isolation
- Defends against common web and API attacks
- Offers a secure, compliant foundation for Tanzanian tax document management

Continuously review and update these practices as your application and threat landscape evolve. Regular security audits and pen-testing are strongly recommended.