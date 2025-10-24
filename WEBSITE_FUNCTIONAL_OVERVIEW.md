# Tecbunny Web Application Functional Overview

## 1. High-Level Summary
- **Tech Stack**: Next.js 13 App Router, TypeScript, Tailwind CSS, Supabase backend, Vercel deployment.
- **Primary Domains**: Commerce storefront, service marketplace, account management, admin operations.
- **Access Control**: Role-based redirects and dashboards for customer, sales, accounts, admin, and superadmin personas.
- **Key Interactions**: Browsing products/services, managing cart and checkout, tracking orders, handling invoices, commission reporting, customer support.

## 2. Core Modules
### 2.1 Landing & Catalog
- **Home (`src/app/page.tsx`, `src/components/home-page.tsx`)**: Dynamic hero, featured/trending sections, responsive layout.
- **Products (`src/app/products`)**: Filters, product detail pages, recommendations, inventory data tied to Supabase `products`.
- **Services (`src/app/services`)**: Service-specific listings with pricing, scheduling integration.
- **Offers (`src/app/offers`)**: Highlights active promotions via CMS content or Supabase `offers` table.
- **Static Info (`src/app/about`, `src/app/contact`, `src/app/info/**`)**: Company narratives, contact forms, policy pages.

### 2.2 Commerce Operations
- **Cart (`src/components/cart/CartSheet.tsx`)**: Drawer-style cart with coupons, auto-discounts, guest session safeguards.
- **Checkout (`src/app/checkout`)**: Multi-step flow for address, payment, order confirmation.
- **Orders (`src/app/orders`)**: Order list and detail views, invoice access, status tracking.
- **Payments (`src/lib/paytm-service.ts`, `src/lib/payment-methods`)**: Integrations supporting UPI, cards, wallets, COD.

### 2.3 Authentication & Profile
- **Auth (`src/app/auth/**`, `src/components/auth/**`)**: OTP login, session management, secure redirects.
- **Profile (`src/app/profile`)**: Personal info, addresses, payment methods, GSTIN submission (admin approval required).
- **Wishlist & Saved Items (`src/context/WishlistProvider.tsx`)**: Manage wishlisted products, integrate with headers/icons.

### 2.4 Admin & Back Office
- **Admin Dashboard (`src/app/management/admin`)**: KPIs, commission oversight, provider management.
- **Sales Dashboard (`src/app/management/sales`)**: Order lifecycle actions, invoice printing, fraud checks.
- **Accounts Dashboard (`src/app/management/accounts`)**: Financial reconciliation, invoicing tools, payout reviews.
- **Role Mapping (`src/lib/roles.ts`, `src/lib/permissions.ts`)**: Guards for feature access and UI variations.
- **Commission Engine (`src/lib/commission-service.ts`, `enhanced-commission-service.ts`)**: Rule-driven commission calculations, statement generation.

### 2.5 Support & Communication
- **Support Center (`src/app/support`, `src/components/support/**`)**: Ticket management, conversation threads, attachments.
- **Notifications (`src/lib/notifications`, `src/components/notices`)**: In-app alerts, email triggers, queue processing.
- **Email Service (`src/lib/email-service.ts`, `smtp-service.ts`)**: SMTP + transactional mailers for orders, OTP, support.

## 3. Shared Infrastructure
- **Context Providers (`src/context`)**: Auth, cart, order, wishlist, app-level settings for SSR + CSR cohesion.
- **Hooks (`src/hooks`)**: Debounce, mobile detection, OTP resend, permissions, toast notifications.
- **UI System (`src/components/ui`)**: Reusable Tailwind + Radix primitives (buttons, dialogs, sheets, tables, carousel, slider).
- **Lib Utilities (`src/lib`)**: API middleware, error handling, logging, caching (Redis), S3 storage, sanitization.
- **CMS-like Content (`supabase/migrations`, `public/company-info.json`)**: Structured content for hero, policies, company metadata.

## 4. Data Flow & Integrations
- **Supabase**: Primary data source—products, services, orders, users, settings, coupons, discounts, support tickets.
- **API Routes (`src/app/api/**`)**: Server actions for auth, checkout, payments, service booking, admin tasks.
- **Rate Limiting (`src/lib/rate-limit.ts`)**: Protects sensitive endpoints from abuse.
- **Session Managers (`src/lib/session-manager.ts`)**: Handles SSR-friendly tokens, refresh flow, role-based redirects.
- **Third-Party Services**: Paytm, SMTP, S3, analytics hooks.

## 5. Responsive & UX Considerations
- Tailwind-based design tokens in `globals.css` for light/dark themes, gradients, shadows.
- Mobile-friendly adjustments across hero banners, navigation sheets, invoices, product cards.
- Global header with adaptive menu, cart sheet, login/signup modals.
- Loading skeletons for home, product lists, and critical flows.

## 6. Security & Compliance
- **Auth**: Session rotation, OAuth/OTP combo, refresh token safeguards.
- **PII Handling**: Sanitization (`src/lib/sanitize-html.ts`), masked logging (`src/lib/logger.ts`).
- **GSTIN Control**: Customer GST updates captured via dedicated table, admin approval only.
- **Rate Limit & Anti-Abuse**: Request validation, device fingerprinting for OTP/checkout.
- **Regulatory Alignment**: GDPR, PCI DSS, RBI compliance baked into payment/address flows.

## 7. Deployment & Operations
- **Configuration**: `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `.env` handling via environment validator.
- **Scripts**: `scripts/` for seeding, backups, migrations, content loaders.
- **CI/CD**: Vercel or pipeline-based builds with type checking (`tsconfig.json`), linting, tests (where applicable).
- **Observability**: Custom logger, performance metrics library, optional integrations with analytics providers.

## 8. Key User Journeys
1. **Browse → Add to Cart → Checkout**: Navigate via header, apply coupon, confirm order, receive invoice.
2. **Service Booking**: Choose service, select slot, confirm booking, manage via account.
3. **Admin Oversight**: Login with elevated role, view dashboards, approve GSTIN, review commissions.
4. **Support Ticket**: Submit issue, attach documents, receive notifications, resolve via support workflow.

## 9. Next Steps / Enhancements
- Expand automated testing coverage (unit/integration) for commerce and admin flows.
- Finalize Supabase migrations for new GSTIN workflows and ensure data parity with Room schema (for future Android app).
- Introduce design token library for consistent theming across web and mobile.
- Monitor Core Web Vitals and optimize image delivery (Next Image, responsive sources).
