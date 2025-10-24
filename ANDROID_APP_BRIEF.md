# TecBunny Store - Android App Development Guide

This document replaces the earlier brief and provides the complete specification required to implement the TecBunny Android application (APK). Hand it to an Android development team or AI agent to reproduce the TecBunny web experience with native patterns while integrating tightly with the existing Supabase + Next.js backend.

---

## 1. Product Goals & Scope
- Deliver a production-ready Android application that mirrors the TecBunny.com web storefront while embracing native UX expectations.
- Support guest browsing and authenticated customer journeys (account creation, profile, cart, checkout, order tracking, wishlist).
- Reuse the current Supabase project, public CDN assets, and Next.js serverless APIs; no new backend deployment.
- MVP excludes admin-only dashboards but must keep architecture extensible for a future staff-facing release.
- Meet privacy, security, and localisation requirements for an Indian retail audience (primary language English; future multilingual support).

---

## 2. Platform Targets & Distribution
- **Android Version:** Minimum SDK 24 (Android 7.0, required by Supabase auth libraries); target SDK 34.
- **Device Support:** Phones first (360dp+ width). Tablet layouts handled through adaptive layouts in phase two.
- **Distribution:** Google Play Store (internal testing -> closed testing -> production). Provide APK and AAB builds.
- **Store Assets Needed:** App name "TecBunny Store", package `com.tecbunny.store`, icon 1024x1024, feature graphics, screenshots, promo video (optional).

---

## 3. Recommended Tech Stack
- **Language:** Kotlin.
- **UI:** Jetpack Compose 1.7+, Material 3 components with custom theming.
- **Navigation:** Jetpack Navigation Compose.
- **Networking:** Ktor Client or Retrofit + OkHttp (REST API), Supabase Kotlin SDK for auth/database/storage.
- **Local Storage:** Jetpack DataStore (Preferences + Proto) for settings, Room for cart persistence and cached content.
- **Dependency Injection:** Hilt.
- **Asynchronous:** Kotlin Coroutines + Flow.
- **Image Loading:** Coil 3.
- **HTML Rendering:** Accompanist WebView or Compose RichText for policy/product descriptions.
- **Push Notifications:** Firebase Cloud Messaging (FCM).
- **Analytics (optional):** Firebase Analytics + Crashlytics.

---

## 4. Architecture Overview
- **Pattern:** Clean architecture with MVVM presentation layer.
- **Layers:**
  - *Presentation* (Compose screens, ViewModels, UI state models).
  - *Domain* (use-cases orchestrating repository calls, validation, analytics events).
  - *Data* (repositories wrapping Supabase SDK + Retrofit endpoints + Room cache).
  - *Core* utilities (logging, dispatchers, error mapping, formatting).
- **Navigation Graph:** Root graph hosts authentication graph, main graph (tabs), modal destinations for checkout, invoice preview, contact form.
- **State Management:** UI state flows exposed from ViewModels; offline-first caches via Room with remote sync.
- **Feature Modularisation (recommended):** `feature-auth`, `feature-home`, `feature-products`, `feature-cart`, `feature-orders`, `feature-profile`, `core-ui`, `core-network`, `core-database`.

---

## 5. Functional Modules
### 5.1 Authentication
- OTP-based email + phone login using Supabase Auth (`supabase.auth.signInWithOtp`).
- Token storage in EncryptedSharedPreferences backed DataStore.
- On first login, invoke `POST /api/auth/first-login-whatsapp` with Supabase session JWT.
- Support logout, session refresh, and auto-login on cold start if token valid.

### 5.2 Onboarding & App Shell
- Splash screen that checks connectivity, Supabase session, required remote config (feature toggles from `settings` table).
- If user authenticated -> open Main flow; else show welcome/login.

### 5.3 Home Dashboard
- Fetch page content via `GET /api/page-content?key=hero-carousels` and `GET /api/page-content?key=home_sections`.
- Sections: Hero carousel, spotlight products, featured services, highlight offers, testimonials.
- CTA quick actions (Shop Products, Services, Contact, Policies).
- Provide pull-to-refresh to re-sync remote content.

### 5.4 Products & Catalog
- Product listing with category chips, price filters, search (Supabase `products` table using `ilike`).
- Caching: store last fetched product list in Room.
- Product detail shows images (carousel), price with GST breakdown, stock status, description HTML, specs, related products.
- Action buttons: Add to cart, Wishlist toggle, Share (deep link).

### 5.5 Services
- Static/semi-static content from `page_content` (key `services` or fallback `servicesData.ts`). Render cards with description, CTA to contact.

### 5.6 Offers
- Pull from `offers` table (where `is_active` true and `expire_at` >= now).
- Show banner image, summary, expiry countdown, CTA linking to relevant category/product.

### 5.7 Cart & Checkout
- Maintain cart locally with Room entity `CartItem` (`productId`, `quantity`, `priceSnapshot`, `gstRate`, `name`, `thumbnail`).
- Cart screen displays breakdown (subtotal, gst, discount, total) using pricing helper consistent with web (see `src/lib/pricing-service.ts`).
- Checkout steps:
  1. Contact & delivery info (prefill from profile, allow editing).
  2. Order summary review.
  3. Payment method selection (UPI, COD, Bank Transfer, etc from `settings` or `/api/payment-methods`).
- Delivery vs Pickup toggle, default pickup location: `TecBunny Store Parcem, Chawdewada, Parcem, Pernem, Goa`.
- Place order by calling server-side endpoint (see section 7); handle success -> show confirmation screen & clear cart.
- Post order, fetch invoice HTML & render in WebView or convert to PDF for sharing.

### 5.8 Orders & Tracking
- Orders list (Supabase `orders` filtered by `customer_id`). Show status badges.
- Detail view includes timeline events (derive from status + updated_at), order items, totals, payment info, invoice download.

### 5.9 Wishlist
- Mirror web strategy: either `wishlist` table (`user_id`, `product_id`) or field on `profiles`. Inspect Supabase schema (`WishlistProvider.tsx`). Implement repository enabling add/remove/list. Cache locally.

### 5.10 Profile & Settings
- Profile screen: view/edit name, phone, email (read-only), GSTIN, addresses (structured fields), communication preferences (WhatsApp/email).
- Avatar upload via Supabase Storage bucket `avatars` (if enabled). Use multipart upload, store public URL.
- Settings toggles: language (future), notifications, theme (light/dark/auto).

### 5.11 Policies & Support
- Render sanitized HTML from `page_content` keys: `privacy_policy`, `terms_conditions`, `shipping_policy`, `refund_policy`, `cancellation_policy`.
- Contact support form -> POST `/api/contact-messages`. Handle 429 throttle gracefully, show offline fallback phone/email.
- Display store contact info from `public/company-info.json` and `settings` table (social links, WhatsApp link).

### 5.12 Notifications (Phase 2)
- FCM token registration; optional Supabase function to store device tokens.
- Support order status push messages (triggered from backend or manual admin action).

---

## 6. Data Sources & Schemas
### 6.1 Supabase Tables (selected fields)
- **profiles** (`id`, `email`, `full_name`, `phone`, `gstin`, `address_line1`, `address_line2`, `city`, `state`, `postal_code`, `country`, `whatsapp_opt_in`, `created_at`, `updated_at`). RLS enforces `auth.uid() = id`.
- **products** (`id`, `title`, `name`, `slug`, `price`, `discount_price`, `gst_amount`, `category`, `status`, `inventory_qty`, `display_order`, `image`, `images`, `short_description`, `description_html`, `specs_json`, `created_at`, `updated_at`). Public read access via anon key for `status='active'`.
- **offers** (`id`, `title`, `tagline`, `description`, `image_url`, `cta_text`, `cta_link`, `is_active`, `start_at`, `expire_at`, `priority`).
- **orders** (`id`, `customer_id`, `customer_name`, `customer_email`, `customer_phone`, `type`, `delivery_address`, `pickup_location`, `status`, `payment_status`, `payment_method`, `subtotal`, `gst_amount`, `discount_amount`, `shipping_amount`, `total`, `items`, `notes`, `created_at`). RLS requires order owner or admin role.
- **order_items** (`id`, `order_id`, `product_id`, `name`, `quantity`, `unit_price`, `gst_rate`).
- **settings** (`key`, `value`, `description`). Keys of interest: `contact_phone`, `contact_email`, `whatsapp_link`, `upi_id`, `bank_details`, `payment_methods`.
- **page_content** (`key`, `content`, `updated_at`). Content is JSON string; must parse into structured model.
- **contact_messages** (`id`, `name`, `email`, `phone`, `subject`, `message`, `status`, `admin_notes`, `created_at`). Public insert allowed with rate limit.
- **otp_verifications** (multi-channel OTP logs; no direct app access beyond auth flows).

Create Kotlin data classes mirroring these schemas; ensure JSON parsing matches Supabase column names.

### 6.2 Local Entities
- `CartItemEntity`, `WishlistEntity`, `CachedProductEntity`, `CachedPageContentEntity`, `UserSessionEntity`.
- Provide migrations for schema changes; use version control in Room.

---

## 7. API & Supabase Integration
### 7.1 Environment Configuration
Store runtime keys via BuildConfig and remote config:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `API_BASE_URL` (`https://tecbunny.com`)
- `FCM_SENDER_ID`, `PRIVACY_POLICY_URL`, `TERMS_URL`, etc.
Load from encrypted asset or remote config service (to avoid plain-text bundling when feasible).

### 7.2 REST Endpoint Reference
| Endpoint | Method | Purpose | Auth |
| --- | --- | --- | --- |
| `/api/page-content?key=hero-carousels` | GET | Fetch hero carousels for pages | Public |
| `/api/page-content?key={slug}` | GET | Fetch generic CMS content (policies, sections) | Public |
| `/api/contact-messages` | POST | Submit contact enquiry; body `{ name, email, phone, subject, message }` | Public with rate-limit |
| `/api/auth/first-login-whatsapp` | POST | Send WhatsApp welcome after first login; body `{ phone }` | Supabase JWT |
| `/api/orders` (if available) | POST | Create order using server logic (preferred). Body mirrors Supabase insert schema | Supabase JWT |
| `/api/orders/{id}/invoice` | GET | Fetch invoice HTML. Append `?print=1` to hide chrome | Supabase JWT |
| `/api/admin/...` | *Do not* call from app unless admin scope added later | Admin |

> If `/api/orders` is not exposed, the Android app must insert directly into `orders` and `order_items` tables via Supabase client with RPC or function that enforces validation (recommended: create stored procedure `create_order_mobile`). Coordinate with backend team before shipping.

### 7.3 Supabase Auth Notes
- Use `supabase.auth.signInWithOtp(email)` and/or phone variant. The backend currently sends OTP via email/SMS/WhatsApp.
- Support `supabase.auth.verifyOtp()` with `type = OtpType.Email` or `Sms`.
- Listen to auth state changes to refresh session tokens automatically.

### 7.4 Error Handling & Retries
- Map HTTP errors to domain errors: validation, auth, rate limit (429), server (500).
- Implement exponential backoff for network retries (two attempts) except for validation errors.
- Display user-friendly messages referencing TecBunny support if persistent failures.

---

## 8. Navigation & UX Flow
1. Splash -> Session Check.
2. If unauthenticated: Onboarding screens (optional) -> Login/Signup OTP flow -> Profile completion (collect name, phone if missing).
3. Authenticated main shell: bottom navigation with tabs `Home`, `Products`, `Offers`, `Services`, `Profile` (cart accessible via FAB or top app bar).
4. Product drill-down flows push onto nested navigation stack.
5. Checkout presented as modal screen sequence to preserve context.
6. After order placed, show success animation + share invoice CTA.
7. Policies accessible via Settings or Profile menu.

UX guidelines:
- Compose theming to follow TecBunny colours (#1e3a8a primary, #0f172a text, gradients with #2563eb / #1e3a8a).
- Buttons rounded 12dp, card corners 16dp, drop shadows subtle.
- Use Material icons analogous to Lucide ones on web.
- Provide skeleton loaders and shimmer for network data.
- Support dark mode (derive palette from brand colours).

---

## 9. Offline, Caching & Sync Strategy
- Cache products, offers, page content locally with timestamp. Show cached data if offline, and surface banner "You are offline".
- Cart operations fully offline; queue order submission when connection restored (warn user).
- Retry contact form submissions once connectivity returns.
- Use WorkManager for deferred sync tasks (order submission, analytics events).

---

## 10. Security & Compliance
- Secure Supabase session tokens with EncryptedSharedPreferences/DataStore; clear on logout.
- Validate user input client-side before sending to API.
- Respect Supabase RLS policies -> never request service role key on device.
- HTTPS strictly required; enable certificate pinning optionally (store Digicert fingerprint for tecbunny.com).
- Adhere to Privacy Policy: explicit consent for push notifications and WhatsApp communication.
- Implement analytics opt-out toggle (stored in DataStore; skip logging when disabled).

---

## 11. Observability & Analytics
- Track events: `app_open`, `login_success`, `product_view`, `add_to_cart`, `checkout_start`, `order_success`, `contact_submit`, `wishlist_add`, `wishlist_remove`.
- Crash reporting via Crashlytics; log structured errors (module, endpoint, status code).
- Add remote feature toggles (e.g., `showOffers`, `enablePickup`) from `settings` table.

---

## 12. Testing & QA Strategy
### 12.1 Automated Tests
- Unit tests for ViewModels, use-cases, repositories (mock Supabase/Retrofit).
- Instrumentation tests for navigation flow, authentication UI, cart & checkout (Espresso or Compose testing APIs).
- Snapshot tests for Compose components (Paparazzi or Compose UI tests).

### 12.2 Manual QA Checklist
1. OTP login (success, invalid OTP, resend throttle).
2. Home screen data load (online/offline).
3. Product filter, search, detail view.
4. Cart operations (add/remove/update quantity).
5. Checkout with Delivery and Pickup, verifying Supabase `orders` entries.
6. Payment method instructions display correctly.
7. Order history accuracy; invoice renders and shares.
8. Wishlist persistence between sessions.
9. Policy pages render headings, tables, and lists.
10. Contact form success and rate-limit error messaging.
11. Offline behaviour messaging & cached data fallback.
12. Dark mode visuals & accessibility (TalkBack, large fonts).

### 12.3 Release Regression Tests
- Run through smoke test matrix on Android 13+, Android 11, Android 9 physical/emulated devices.
- Validate push notification receipt (if enabled) and deep-link routing.

---

## 13. Build, CI/CD & Deployment
- Use Gradle Version Catalog for dependency versions.
- Configure CI (GitHub Actions) pipeline:
  1. Check formatting (Ktlint/Spotless), lint, detekt.
  2. Run unit tests, instrumentation tests on emulator.
  3. Build release AAB signed with keystore (stored securely in GitHub secrets or manual step).
  4. Upload artifacts to Play Console internal track via Gradle Play Publisher.
- Maintain `buildSrc` or dedicated module for version constants and API endpoints to avoid duplication.
- Versioning scheme: `major.minor.patch` mirroring web release cycles.

---

## 14. Release Checklist
- [ ] Supabase anon key confirmed (no service role exposure).
- [ ] API endpoints verified against production environment.
- [ ] App icon, splash, and theme assets match brand.
- [ ] Play Console listing prepared (screenshots, privacy policy URL, content rating questionnaire).
- [ ] QA sign-off on manual checklist.
- [ ] Privacy policy & terms accessible from app settings.
- [ ] Crashlytics & analytics dashboards monitored during soft launch.

---

## 15. Future Enhancements & Considerations
1. **Admin Tools:** Add staff role-based screens for order management, contact message triage, banner editing.
2. **Payments Integration:** Integrate native payment gateways (Razorpay/Paytm) with payment confirmation callbacks updating Supabase.
3. **In-App Chat Support:** Embed WhatsApp deep links or custom chat widget via third-party SDK.
4. **Loyalty & Rewards:** Track purchase history, issue loyalty points, integrate referrals.
5. **Localization:** Support Konkani and Hindi text, ensure fonts and layout handle multilingual content.
6. **Analytics Deep Dive:** Cohort analysis, product engagement funnels, remote A/B testing toggles.

---

## 16. Reference Assets & Code Pointers
- Web repo components for parity:
  - `src/app/page.tsx` (home layout reference).
  - `src/components/products/ProductCard.tsx`, `ProductDetail.tsx` for layout ideas.
  - `src/components/checkout/CheckoutPage.tsx` for pricing logic and pickup configuration.
  - `src/context/*` providers for cart, wishlist, order flows.
  - `src/lib/pricing-service.ts`, `pricing.ts` for tax & discount calculations.
  - `public/company-info.json` for contact details and meta.
- Ensure Android UI reflects key copy writing from web (hero titles, policy text, CTA labels).

---

**Use this guide as the authoritative reference for the TecBunny Android build. Keep it updated alongside backend or web changes to guarantee feature parity across platforms.**# TecBunny Store – Android App Blueprint

This document summarizes the current TecBunny web experience so an AI assistant can produce a faithful Android application (APK) that mirrors core behaviour. It focuses on user flows, backend endpoints, data structures, content requirements, and key implementation notes.

---

## 1. Brand & Context
- **Company:** TecBunny Solutions (tech retail & services brand based in Parcem, Goa, India).
- **Tone:** Friendly, trustworthy neighbourhood tech store with emphasis on innovation and support.
- **Primary Web Stack:** Next.js 13 (App Router), React, Tailwind, Supabase (Postgres + Auth + Storage), shadcn/ui.
- **Environments:** Production web URL `https://tecbunny.com`. Android app should interact with same backend where possible (Supabase REST + custom API routes).

---

## 2. Core User Roles
1. **Guest / Customer** – browse catalog, offers, services; create account; place orders; access policies.
2. **Authenticated Customer** – manage profile, addresses, orders, wishlist, cart.
3. **Admin / Staff** – management dashboards for orders, policies, hero banners, pricing, etc. (Android scope optional—likely v2).
4. **Sales / Accounts** – specialized dashboards for order fulfillment & finance (Android scope optional).

For the Android MVP focus on role (1) & (2).

---

## 3. Primary Customer Flows
1. **Onboarding / Auth**
   - OTP-based login & signup (email + mobile) via Supabase auth.
   - Support for passwordless flows and Resend OTP.
2. **Home Experience**
   - Hero banner carousel (page-content JSON). Displays primary hero + secondary carousels per page (home/services/offers/products).
   - Highlight featured offers, services, top products, testimonials (from `page_content`, `offers`, `products`).
3. **Catalog Browsing**
   - Products listing (`/products`), filters (category, price), featured blocks.
   - Product detail page: gallery, price, GST info, specs, add-to-cart, stock.
   - Services listing (`/services`) with cards & call-to-action.
4. **Offers & Promotions**
   - Offers page showing active deals from Supabase `offers` table and hero carousel.
5. **Cart & Checkout**
   - Cart summary, quantity management, discount display.
   - Checkout collects customer info, address, payment method, notes. Supports Delivery or Pickup at "TecBunny Store Parcem" (Chawdewada, Parcem, Pernem, Goa).
   - Payment methods: UPI, COD, etc. (from `settings` / `payment_methods`).
6. **Order Confirmation & Tracking**
   - Confirmation page summarizing order, payment status, GST breakdown.
   - Order history & invoice download (PDF-like HTML from `/orders/{id}/invoice`).
7. **Profile & Wishlist**
   - Profile info editing, addresses, GSTIN submission, wishlist management.
8. **Policy & Support Pages**
   - Privacy, Terms, Shipping, Return, Refund & Cancellation policies (managed via page-content).
   - Contact form (public submission) with rate limiting.

---

## 4. Backend Essentials
### 4.1 Supabase Tables (key ones)
- `profiles`: user profile info (name, mobile, address, GSTIN, onboarding flags including WhatsApp first-login notification).
- `products`: product catalog (title, name, price, category, status, images, gst_amount, display_order, etc.).
- `orders`: customer orders (type Delivery/Pickup/Walk-in, status, totals, items JSON, customer contact fields, payment status, discount, shipping amounts).
- `order_items`: normalized order line items (for reporting).
- `offers`: promotional offers with banners, expiry, categories.
- `page_content`: CMS-style JSON storage for hero carousels and policies.
- `contact_messages`: contact us submission storage with admin notes & statuses.
- `product_pricing`: special pricing rules (B2B/B2C tiers).
- `settings`: key-value store for toggles, social links, payment URLs, etc.
- `otp_verifications`: multi-channel OTP data.

### 4.2 REST/API Endpoints (Next.js App)
All served from `/api/...` with Supabase auth checks.

- `GET /api/page-content?key={slug}` – returns JSON for hero carousels, policies, etc.
- `PUT /api/page-content` – admin update (requires Supabase service key).
- `POST /api/contact-messages` – public contact form submission (rate limited).
- `GET/POST /api/contact-messages` – admin list + update.
- `GET/POST/PUT/DELETE /api/admin/pricing` – manage product pricing rules.
- `GET /api/admin/products` – product lookup for pricing UI.
- `POST /api/email/order-approved` – admin email notifications.
- `POST /api/auth/first-login-whatsapp` – send WhatsApp onboarding template.
- Additional Next.js server actions for cart, checkout, OTP, etc. integrated via Supabase functions.

Android app should interact with Supabase directly when possible (using Supabase Android SDK) for auth, products, orders. For custom endpoints (like contact form), use HTTPS calls with existing API tokens (service role not exposed to client).

---

## 5. Data Schemas (Simplified)

### Product
```json
{
  "id": "uuid",
  "title": "TecBunny Smart Hub",
  "price": 12999.00,
  "category": "Smart Home",
  "status": "active",
  "gst_amount": 18.0,
  "display_order": 90,
  "image": "https://.../product-main.jpg",
  "images": ["https://.../gallery1.jpg"],
  "description": "HTML/Markdown",
  "specifications": {
    "brand": "TecBunny",
    "warranty": "12 months"
  }
}
```

### Order (Supabase `orders` table)
```json
{
  "id": "uuid",
  "customer_id": "uuid",
  "customer_name": "Rahul Jain",
  "customer_email": "rahul@example.com",
  "customer_phone": "+91 9xxxx",
  "delivery_address": "Flat 3, TecVille, Goa",
  "payment_method": "UPI",
  "payment_status": "Payment Confirmed",
  "status": "Processing",
  "type": "Delivery",
  "subtotal": 10000,
  "gst_amount": 1800,
  "discount_amount": 500,
  "shipping_amount": 0,
  "total": 11300,
  "items": [{
      "productId": "uuid",
      "name": "TecBunny Smart Hub",
      "quantity": 1,
      "price": 12999,
      "gstRate": 18
  }],
  "notes": "Deliver between 10am-12pm",
  "created_at": "2025-10-16T08:05:00Z"
}
```

### Hero Carousel Content (`page_content` key `hero-carousels`)
```json
{
  "pages": {
    "homepage": [
      {
        "id": "home-1",
        "title": "Festive Mega Sale",
        "subtitle": "Limited Time Offers",
        "description": "Grab up to 40% off across smartphones, laptops, and accessories.",
        "imageUrl": "https://cdn.tecbunny.com/hero-banners/home/festive.jpg",
        "ctaText": "Shop Deals",
        "ctaLink": "/products",
        "displayOrder": 0,
        "isActive": true
      }
    ],
    "services": [...],
    "offers": [...],
    "products": [...]
  },
  "updatedAt": "2025-10-15T00:00:00Z"
}
```

### Policy Content (`page_content` keys like `privacy_policy`)
```json
{
  "title": "Privacy Policy",
  "lastUpdated": "October 15, 2025",
  "descriptionHtml": "<h2>Overview</h2><p>...</p>"
}
```

---

## 6. Feature-by-Feature Guidance for Android

### 6.1 Authentication Module
- Use Supabase Auth (OTP/email) for sign-in. Provide UI to enter email/phone, request OTP, verify, and handle passwordless tokens.
- After login, store session tokens securely (EncryptedSharedPreferences / Jetpack DataStore).
- Implement first-login check to trigger `/api/auth/first-login-whatsapp` if needed.

### 6.2 Home Screen
- Fetch `hero-carousels` page content (GET `/api/page-content?key=hero-carousels`).
- Display `homepage` slides as auto-rotating carousel (interval ~6s, pause on touch).
- Include sections: featured products (query Supabase `products` by `status='active'` sorted by `display_order`), trending offers (from `offers` table), quick access cards for Services/Contact.

### 6.3 Catalog & Product Detail
- List products with thumbnail, price, GST, call-to-action.
- Filters: categories distinct from `products` table.
- Search bar (Supabase `products` using `ilike` on `title`/`name`).
- Detail view: images slider, description (HTML -> render using TextView with WebView or Compose RichText), add to cart, share.

### 6.4 Cart & Checkout Flow
- Maintain cart state locally (Room DB or DataStore) for offline tolerance.
- On checkout: combine local cart with user info, call existing Next.js order creation route (check REST endpoints available; or replicate logic – compute subtotal, gst, etc., create `orders` row via Supabase). Ensure order is inserted both in `orders` and `order_items` tables. Use Supabase Row Level Security rules compatible with service key – may need to call existing Next.js API to reuse business logic.
- Payment: display available methods from `settings` or dedicated `payment_methods` table.
- Provide Delivery vs Pickup toggle; default pickup location: **TecBunny Store Parcem, Chawdewada, Parcem, Pernem, Goa**.

### 6.5 Orders & Invoices
- Orders list: query `orders` filtered by `customer_id` (Supabase session). Display status, totals, quick actions.
- Order detail: show items, totals, shipping/pickup info, payment progress.
- Invoice: render HTML from `/orders/{id}/invoice?print=1` via WebView or generate PDF.

### 6.6 Wishlist & Profile
- Wishlist provider: `wishlist` table or JSON field. Mirror web app (check `src/context/WishlistProvider.tsx`).
- Profile editing: update `profiles` row (name, mobile, address, GSTIN). Provide upload for profile picture if required (Supabase storage `avatars`).

### 6.7 Policies & Support
- Display policy pages by fetching specific `page_content` keys and rendering sanitized HTML.
- Contact form: POST to `/api/contact-messages` with name/email/phone/subject/message. Handle rate-limit error (HTTP 429).
- Show contact info: `support@tecbunny.com`, phone `+91 94296 94995`, address `H NO 11 NHAYGINWADA, PARSE, Parcem, Pernem, North Goa – 403512, Goa`.

### 6.8 Offers & Services Modules
- Offers list from `offers` table (fields: title, description, image, expiry, CTA).
- Services list from `services` page content or dedicated `servicesData.ts` asset.

### 6.9 Notifications & Messaging
- Integrate push notifications (Firebase) for order updates (optional). Current web uses email + WhatsApp for onboarding.
- Toast/snackbar feedback for API successes/failures.

### 6.10 Admin Features (Optional for future)
- Login gating by role (Supabase JWT includes role claim). Provide admin menu to manage hero banners (upload to Supabase storage bucket `hero-banners`), contact messages, orders, pricing.

---

## 7. Visual Design References
- Colors: Predominantly TecBunny blue (#1e3a8a gradients), white backgrounds, slate gray text.
- Buttons: rounded with gradient (blue) or outline variants.
- Typography: headings bold, body text medium weight.
- Icons: Lucide icons (Material-style equivalent on Android).
- Carousels & cards use rounded corners and drop shadows.

Provide design tokens to Android (Compose theme or XML styles) to match this aesthetic.

---

## 8. Assets & Storage
- Public assets: `public/company-info.json` (company metadata), hero images in Supabase storage bucket `hero-banners`.
- For Android, fetch remote images via CDN URLs (no bundling). Implement caching (Coil/Glide).

---

## 9. Security & Privacy Considerations
- Respect Privacy Policy: ensure user consents for notifications, handles personal data securely.
- Auth tokens stored securely; use HTTPS for API calls.
- Implement rate limiting / retries similar to web for contact form and OTP.

---

## 10. Testing Checklist for Android App
1. OTP login success/fail flows.
2. View hero carousels for each page key.
3. Browse products & services, add to cart, checkout (Delivery & Pickup).
4. Payment method selection & order creation, check Supabase `orders` entry.
5. Order history & invoice render.
6. Contact form submission (success + 429 throttle).
7. Policy pages display correct HTML with headings, lists.
8. Offline tolerance & error states (network failure).
9. Admin features (if implemented) permission-gated.

---

## 11. Deployment Notes
- App should interface with existing production Supabase project (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- For service-level actions (updates), call Next.js API endpoints using existing authentication (Supabase session + server-side checks).
- Coordinate with TecBunny team for push notification keys, app signing, and Play Store listing assets.

---

**This blueprint provides the functional and technical context required for an AI assistant to plan, design, and implement an Android application that reflects the current TecBunny web experience.**
