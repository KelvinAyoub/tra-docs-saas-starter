# Frontend Guideline Document for tra-docs-saas-starter

This document outlines the frontend architecture, design principles, styling, component structure, state management, routing, performance optimizations, testing strategies, and overall summary for the **TRA Compliance SaaS Starter** (`tra-docs-saas-starter`). It’s written in clear, everyday language so that anyone—technical or not—can understand how the frontend is set up and why.

## 1. Frontend Architecture

### 1.1 Overall Structure
- **Framework:** Next.js 15 with the App Router (file-based routing inside `src/app/`).
- **Language:** TypeScript for type safety and clearer code.
- **UI Components:** `shadcn/ui` (prebuilt, accessible React components).
- **Styling:** Tailwind CSS v4 (utility-first CSS).
- **Auth & Sessions:** Clerk handles sign-up, sign-in, user profiles, and session management.
- **Data & Multi-Tenancy:** Supabase (PostgreSQL) with Row-Level Security (RLS) enforces per-business data isolation.
- **AI Features:** Vercel AI SDK powers a chat interface for natural-language transaction entry.
- **Dev Environment:** A `.devcontainer` ensures every developer has a consistent, ready-to-go workspace.

### 1.2 How It Supports Scalability, Maintainability, Performance
- **Scalability:** Next.js server components and Supabase RLS offload data filtering to the backend. As usage grows, the same patterns extend to more businesses.
- **Maintainability:** TypeScript + well-scoped components (`src/components/`) plus clear folder conventions (`app/`, `lib/`) make it easy to find and update code.
- **Performance:** Server-side rendering for dashboards, lazy imports for heavy components, and Vercel’s edge network ensure quick load times.

## 2. Design Principles

### 2.1 Key Principles
- **Usability:** Clear, consistent layouts and labels guide users through tasks like adding expenses or generating tax forms.
- **Accessibility (A11y):** Built-in in `shadcn/ui`, with proper keyboard navigation, ARIA labels, and color contrast checks.
- **Responsiveness:** Mobile-first design with Tailwind’s responsive utilities; layouts adapt from phones to desktops.
- **Trust & Clarity:** Financial data demands a professional look—buttons, forms, and tables follow familiar patterns to avoid confusion.

### 2.2 Applying Principles in the UI
- Form fields are labeled clearly (e.g., “Amount (TZS)”), with real-time validation feedback.
- Color usage highlights actionable items (primary buttons in blue) and warnings/errors in red.
- Components resize or stack vertically on narrow screens for easy tapping.

## 3. Styling and Theming

### 3.1 Styling Approach
- **Methodology:** Utility-first CSS via Tailwind CSS v4. Minimal custom CSS—most styling comes from Tailwind classes.
- **Component Styles:** Shared patterns and variants are defined in a central Tailwind config and in `shadcn/ui`’s theme layer.

### 3.2 Theming
- **Light & Dark Mode:** Uses CSS variables and Tailwind’s dark variant. Users can toggle modes; the choice persists via local storage.
- **Global Styles:** Defined in `app/layout.tsx` and imported in `globals.css`, setting base font sizes, background colors, and default link styles.

### 3.3 Visual Style
- **Style Genre:** Modern flat design with subtle glassmorphism touches on modals or overlays (semi-transparent backgrounds, soft shadows).
- **Color Palette:**
  - Primary: #1E40AF (Rich Blue)
  - Secondary: #059669 (Emerald Green)
  - Accent/Warn: #DC2626 (Tomato Red)
  - Neutral Light: #F3F4F6 (Gray-100)
  - Neutral Dark: #111827 (Gray-900)
  - Accent Highlight: #FBBF24 (Amber)
- **Typography:**
  - Primary Font: Inter (clean, highly readable on screens)
  - Fallback: system-ui, sans-serif

## 4. Component Structure

### 4.1 Organization
- `src/app/`: Page routes and server-side layouts.
- `src/components/`: Reusable UI pieces (buttons, form inputs, chat widget).
- `src/lib/`: Utility code (Supabase client, user helpers, TRA logic, parsers, integrations).
- `src/middleware.ts`: Protects routes via Clerk’s middleware.

### 4.2 Reusability & Maintenance
- Each component lives in its own folder with its styles, tests, and story if applicable.
- Shared types and hooks (e.g., `useChat`, `useUser`) are in `src/lib/` to avoid duplication.
- A component library approach means design updates propagate everywhere.

## 5. State Management

### 5.1 Approach
- **Server Data:** Fetched via Next.js server components or `fetch`/`supabase` calls in `getServerSideProps`–style functions.
- **Client State:** Minimal global state—uses React Context for user/session info and small UI toggles (e.g., dark mode). 
- **Local State:** Component-level state for form inputs, loading flags, and chat messages.

### 5.2 Sharing State
- The `ClerkProvider` wraps the whole app. Auth state is available via hooks (`useUser`, `useSession`).
- Data that multiple components need (e.g., current business ID) is stored in a simple React Context.

## 6. Routing and Navigation

### 6.1 Routing
- **File-based Routes:** Under `src/app`, each folder or `page.tsx` becomes a route (e.g., `/dashboard/[businessId]/reports`).
- **Protected Routes:** Clerk’s `withAuth` or middleware in `middleware.ts` redirects unauthenticated users to `/sign-in`.

### 6.2 Navigation Structure
- A persistent sidebar shows links: Dashboard, Expenses, Payroll, Reports, Settings.
- Breadcrumbs on inner pages help users know where they are in the business’s section.
- The header includes a business selector (if the user manages multiple businesses) and user menu (profile, sign out).

## 7. Performance Optimization

### 7.1 Strategies
- **Server Components:** Heavy data fetching happens on the server to reduce client bundle size.
- **Code Splitting:** Dynamic imports for large components (e.g., PDF previewer).
- **Lazy Loading:** Chat widget and non-critical modals load on demand.
- **Asset Optimization:** Next.js’s built-in image component and SVG inlining minimize asset sizes.
- **Caching & ISR:** Use stale-while-revalidate for reports that don’t change every second.

### 7.2 Benefits
- Faster initial page loads.
- Lower bandwidth usage for clients.
- Smooth interactions, even on slower networks.

## 8. Testing and Quality Assurance

### 8.1 Testing Strategy
- **Unit Tests (Jest):** Test pure functions (`src/lib/tra/` tax logic, parsers) with 100% coverage on edge cases.
- **Component Tests (React Testing Library):** Verify UI behavior—forms validate correctly, chat messages appear, navigation works.
- **End-to-End Tests (Playwright or Cypress):** Automate key user flows: sign-in, create expense via chat, generate and download a PDF report.

### 8.2 Tools & Frameworks
- Jest + @testing-library/react for components.
- msw (Mock Service Worker) to simulate Supabase, Clerk, and AI API responses.
- Cypress or Playwright for full E2E scenarios in a real browser.
- Linters (ESLint), formatters (Prettier), and commit hooks (Husky) to enforce code quality.

## 9. Conclusion and Overall Frontend Summary

We’ve built a clear, modern, scalable frontend for a TRA compliance SaaS on top of Next.js 15, TypeScript, Tailwind CSS, `shadcn/ui`, Clerk, Supabase, and the Vercel AI SDK. Every piece—from authentication to the AI chat interface—is designed for security, rapid development, and a smooth user experience. By following these guidelines, new team members can quickly understand how components are organized, why certain choices were made, and how to extend or maintain the codebase reliably.

Unique strengths of this setup:
- **Secure multi-tenant architecture** via Clerk + Supabase RLS.
- **Natural language expense entry** powered by AI.
- **Modern, accessible design system** with `shadcn/ui` and Tailwind CSS.
- **Performance by default** through Next.js server components and optimized assets.

These guidelines ensure your frontend remains consistent, reliable, and fast—ready to deliver a world-class experience for TRA compliance.