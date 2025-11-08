# Project Requirements Document (PRD)

## 1. Project Overview

tra-docs-saas-starter is a Next.js 15-based Software-as-a-Service (SaaS) platform designed to streamline the preparation and management of Tanzania Revenue Authority (TRA) compliance documents. Its main goal is to give accountants and small-business owners a secure, multi-tenant environment where they can track income, expenses, payroll, and generate tax reports—all from a single, easy-to-use web interface. By handling complex setup like user authentication, row-level security, and AI-driven transaction entry, this starter accelerates development so teams can focus on the unique TRA calculations and document generation logic.

The platform is being built to solve the manual, error-prone process of filling out TRA forms by hand or juggling multiple spreadsheets. Key success criteria include: 1) secure user sign-up and business-scoped data isolation, 2) fast, accurate AI-assisted entry of financial transactions, and 3) a responsive, accessible dashboard that offers clear visibility into a business’s tax liabilities. Future phases will extend these foundations with PDF export, ERP integrations, and subscription plans, but the immediate objective is a Minimum Viable Product (MVP) that supports authenticated multi-business management and core expense/income tracking via AI chat.

## 2. In-Scope vs. Out-of-Scope

**In-Scope (Version 1.0):**
- User authentication and session management with Clerk  
- Multi-tenant data isolation using Supabase Row-Level Security (RLS)  
- Basic business onboarding: create business profiles and invite team members  
- AI-powered chat interface for adding and categorizing income/expenses (Vercel AI SDK)  
- Transaction listing and basic filtering (date range, category)  
- Simple tax calculation stubs for PAYE, SDL, VAT (displayed as placeholders)  
- Responsive dashboard showing recent transactions and tax summaries  
- CSV bank statement upload (parsing only CSV format)  
- Environment setup via a pre-configured devcontainer  

**Out-of-Scope (Future Phases):**
- Full PDF document generation (e.g., official TRA forms)  
- OCR-powered PDF bank statement ingestion  
- Deep TRA logic (full edge-case statutory calculations)  
- ERP system connectors (Xero, QuickBooks)  
- Payment/subscription management (Stripe integration)  
- Advanced reporting (charts, export to Excel)  

## 3. User Flow

A new user lands on the public homepage and clicks “Sign Up.” They enter their email and password via Clerk, then confirm their account. After signing in, they see a prompt to create their first business. They enter the business name and basic details, then land on the main dashboard for that business, which shows a sidebar (Dashboard, Transactions, Chat, Reports, Settings) and a summary panel with recent expenses, total liabilities, and a chat widget at the bottom.

From the dashboard, the user clicks the chat widget and types something like “Add a TZS 75,000 office rent expense for last month.” The AI chat parses the intent, inserts a transaction into Supabase, and streams back “Got it—TZS 75,000 for office rent on 2024-05-01.” Meanwhile, the Transactions page lists all entries with date, amount, and category. The user can also upload a CSV bank statement on the Transactions page to bulk-add records. Finally, the user navigates to Reports to see placeholder tax calculations and downloads a CSV summary.

## 4. Core Features

- **Authentication & Authorization**: Sign-up, sign-in, password resets, and role-based access via Clerk.  
- **Multi-Tenancy**: Each record (transactions, users) is scoped by `business_id` with Supabase RLS policies.  
- **AI Chat Interface**: Real-time natural language entry for financial transactions using Vercel AI SDK.  
- **Transaction Management**: CRUD operations for income/expenses, CSV upload for bank statements.  
- **Dashboard**: Overview of recent transactions, total liabilities, and quick-links to main modules.  
- **Basic Tax Calculation Stubs**: Placeholder logic for PAYE, SDL, VAT shown in Reports.  
- **Responsive UI**: Built with Next.js 15 App Router, Tailwind CSS v4, and shadcn/ui components.  
- **Developer Environment**: `.devcontainer` for consistent setup; TypeScript throughout the codebase.  

## 5. Tech Stack & Tools

- **Frontend Framework**: Next.js 15 (App Router) with React  
- **Language**: TypeScript  
- **Styling**: Tailwind CSS v4, shadcn/ui component library  
- **Authentication**: Clerk  
- **Database**: Supabase (PostgreSQL) with Row-Level Security  
- **AI/Chat**: Vercel AI SDK (built on OpenAI or Anthropic models)  
- **Validation**: Zod for input schema validation  
- **Testing**: Jest (unit), React Testing Library (integration)  
- **Error Tracking**: Sentry (planned)  
- **Development Environment**: VS Code with Dev Containers  

## 6. Non-Functional Requirements

- **Performance**: Page load under 2 seconds on a broadband connection; chat response latency under 1 second (streaming).  
- **Security**: OWASP Top 10 compliance, HTTPS everywhere, encrypted environment variables, strict RLS policies.  
- **Compliance**: GDPR-aligned data handling; audit trails on all financial actions.  
- **Usability & Accessibility**: WCAG 2.1 AA standard for UI components; responsive design for desktop and tablet.  
- **Scalability**: Support up to 1,000 concurrent users in Phase 1; database indexing on `business_id` and `user_id`.  

## 7. Constraints & Assumptions

- **Constraints:**  
  - Dependent on Vercel AI SDK and OpenAI/Anthropic API availability and rate limits.  
  - Supabase free tier may limit row counts and concurrent connections.  
  - Clerk pricing impacts user volume beyond free tier thresholds.  

- **Assumptions:**  
  - End users have modern browsers (Chrome, Firefox, Safari) and internet access.  
  - Core TRA calculation rules will be provided by a domain expert before full implementation.  
  - No offline mode required in Phase 1.  

## 8. Known Issues & Potential Pitfalls

- **API Rate Limits**: OpenAI or other LLM services often throttle; implement exponential backoff and caching of common prompts.  
- **Latency Spikes**: AI streaming may lag under heavy load; show skeleton UI and loading indicators.  
- **Row-Level Security Complexity**: Misconfigured RLS can expose data; write end-to-end tests for data isolation.  
- **CSV Parsing Errors**: Bank statement formats vary; start with a strict schema and provide clear user instructions.  
- **Scaling Supabase**: Monitor connection pooling; add pgBouncer if needed.  

**Mitigation Guidelines:**  
- Centralize API calls in a service layer with retry logic.  
- Enforce strict Zod schemas at every API boundary.  
- Automate RLS policy tests in CI.  
- Include clear UX messages for CSV format requirements and AI unrecognized intents.

---
This PRD provides a clear, unambiguous guide for the AI and development team to build the first version of the TRA compliance SaaS. All future technical documents—Tech Stack details, Frontend Guidelines, Backend Structure, etc.—should reference these requirements directly.