# Tecbunny Android App Blueprint

## 1. Product Overview
- **Goal**: Deliver the Tecbunny commerce, services, and management capabilities in a native Android experience focused on customer engagement, secure transactions, and operational oversight.
- **Target Platforms**: Android 10 (API 29) and above.
- **Primary Users**:
  - Customers browsing and purchasing products/services.
  - Service providers managing offerings, orders, and schedules.
  - Admins monitoring performance metrics, commissions, and support workflows.

## 2. Mobile Architecture
- **App Architecture Pattern**: MVVM with Clean Architecture boundaries.
- **Navigation**: Jetpack Navigation Component with nested graphs for customer, provider, and admin sections.
- **Dependency Injection**: Hilt.
- **Networking**: Retrofit + OkHttp with Kotlin Serialization adapters.
- **Asynchronous Work**: Kotlin Coroutines + Flow.
- **Local Persistence**: Room database with offline-first caching for core catalogs.
- **State Management**: Jetpack Compose state holders, ViewModels, Repository layer.
- **Analytics & Logging**: Firebase Analytics, Crashlytics, custom event logging bridged to existing logging schema.

## 3. Module Structure
- **app**: Host module with navigation graphs and DI setup.
- **core**: Shared utilities, networking, configuration, analytics, logging.
- **feature-catalog**: Product, service, and offer browsing flows.
- **feature-checkout**: Cart, payment, and order submission flows.
- **feature-auth**: Authentication, OTP, and profile management.
- **feature-accounts**: Customer account settings, addresses, payment methods.
- **feature-orders**: Order history, tracking, cancellations.
- **feature-admin**: Dashboards for commissions, performance metrics, inventory oversight.
- **feature-support**: Contact, ticketing, FAQs.
- **feature-notifications**: Push notification handling and in-app messaging.

## 4. Key Screens & Navigation
- **Onboarding**: Splash, language/theme selection, login/signup, OTP verification.
- **Home**: Personalized hero banner, featured offers, quick access tiles.
  Auto-closing home slider keeps focus on primary content.
- **Catalog**: Product list, product detail, service detail, category filters.
- **Cart**: Item list, promo code entry, order summary.
- **Checkout**: Address selection, payment selection, review & confirm.
- **Orders**: Current orders, order detail, status timeline, invoice download.
  Responsive invoice view ensures clean layout without overlap on mobile.
- **Profile**: Personal info, payment methods, addresses, security settings, GSTIN submission with pending/approved status indicators.
- **Admin**: KPIs, commission summary, approvals (including customer GSTIN updates), service management, performance alerts.
- **Support**: Contact options, FAQs, ticket submission.
- **Notifications**: Center showing marketing, transactional, and system alerts.

## 5. Data Model Blueprint
Room database tables mirror backend structures for offline caching.

### 5.1 Core Tables
- **app_settings**
  - `id` (PK, Int)
  - `key` (Text, unique)
  - `value` (Text)
  - `updated_at` (ISO8601 Text)

- **users**
  - `id` (PK, Text)
  - `type` (Enum: customer, provider, admin)
  - `email` (Text)
  - `phone` (Text)
  - `first_name` (Text)
  - `last_name` (Text)
  - `avatar_url` (Text, nullable)
  - `gstin` (Text, nullable)
  - `gstin_status` (Enum: unsubmitted, pending_admin_review, approved, rejected)
  - `status` (Enum: active, suspended, deleted)
  - `created_at` (ISO8601 Text)

- **user_sessions**
  - `id` (PK, Text)
  - `user_id` (FK -> users.id)
  - `refresh_token` (Text)
  - `device_fingerprint` (Text)
  - `expires_at` (ISO8601 Text)

### 5.2 Catalog Tables
- **categories**
  - `id` (PK, Text)
  - `parent_id` (FK -> categories.id, nullable)
  - `slug` (Text)
  - `name` (Text)
  - `description` (Text)
  - `icon_url` (Text, nullable)
  - `is_active` (Boolean)

- **products**
  - `id` (PK, Text)
  - `category_id` (FK -> categories.id)
  - `sku` (Text)
  - `name` (Text)
  - `description` (Text)
  - `price` (Decimal)
  - `currency` (Text, 3-char)
  - `stock_status` (Enum: in_stock, out_of_stock, preorder)
  - `thumbnail_url` (Text)
  - `created_at` (ISO8601 Text)

- **product_media**
  - `id` (PK, Text)
  - `product_id` (FK -> products.id)
  - `type` (Enum: image, video)
  - `url` (Text)
  - `sort_order` (Int)

- **services**
  - `id` (PK, Text)
  - `category_id` (FK -> categories.id)
  - `name` (Text)
  - `description` (Text)
  - `base_price` (Decimal)
  - `currency` (Text)
  - `duration_minutes` (Int)
  - `is_active` (Boolean)

- **offers**
  - `id` (PK, Text)
  - `title` (Text)
  - `description` (Text)
  - `discount_type` (Enum: percent, flat)
  - `discount_value` (Decimal)
  - `start_date` (ISO8601 Text)
  - `end_date` (ISO8601 Text)
  - `target_type` (Enum: product, service, category, global)
  - `target_id` (Text, nullable)

### 5.3 Cart & Checkout Tables
- **cart_items**
  - `id` (PK, Text)
  - `user_id` (FK -> users.id)
  - `item_type` (Enum: product, service)
  - `item_id` (Text)
  - `quantity` (Int)
  - `price_snapshot` (Decimal)
  - `currency` (Text)
  - `added_at` (ISO8601 Text)

- **addresses**
  - `id` (PK, Text)
  - `user_id` (FK -> users.id)
  - `label` (Text)
  - `line1` (Text)
  - `line2` (Text, nullable)
  - `city` (Text)
  - `state` (Text)
  - `postal_code` (Text)
  - `country` (Text)
  - `is_default` (Boolean)

- **payment_methods**
  - `id` (PK, Text)
  - `user_id` (FK -> users.id)
  - `type` (Enum: card, upi, wallet, cod)
  - `masked_details` (Text)
  - `provider` (Text)
  - `is_default` (Boolean)
  - `verified` (Boolean)

- **orders**
  - `id` (PK, Text)
  - `user_id` (FK -> users.id)
  - `status` (Enum: pending, confirmed, shipped, delivered, cancelled, refunded)
  - `total_amount` (Decimal)
  - `currency` (Text)
  - `placed_at` (ISO8601 Text)
  - `updated_at` (ISO8601 Text)

- **order_items**
  - `id` (PK, Text)
  - `order_id` (FK -> orders.id)
  - `item_type` (Enum: product, service)
  - `item_id` (Text)
  - `name_snapshot` (Text)
  - `price_snapshot` (Decimal)
  - `quantity` (Int)

- **payments**
  - `id` (PK, Text)
  - `order_id` (FK -> orders.id)
  - `method` (Enum: card, upi, wallet, cod)
  - `provider` (Text)
  - `amount` (Decimal)
  - `currency` (Text)
  - `status` (Enum: pending, success, failed, refunded)
  - `transaction_ref` (Text)
  - `processed_at` (ISO8601 Text)

### 5.4 Service Management Tables
- **service_slots**
  - `id` (PK, Text)
  - `service_id` (FK -> services.id)
  - `provider_id` (FK -> users.id)
  - `start_time` (ISO8601 Text)
  - `end_time` (ISO8601 Text)
  - `availability_status` (Enum: available, booked, cancelled)

- **service_bookings**
  - `id` (PK, Text)
  - `slot_id` (FK -> service_slots.id)
  - `customer_id` (FK -> users.id)
  - `status` (Enum: pending, confirmed, completed, cancelled)
  - `notes` (Text, nullable)
  - `created_at` (ISO8601 Text)

### 5.5 Admin & Analytics Tables
- **commission_rules**
  - `id` (PK, Text)
  - `name` (Text)
  - `target_type` (Enum: category, product, service, provider)
  - `target_id` (Text, nullable)
  - `rate_type` (Enum: percent, flat)
  - `rate_value` (Decimal)
  - `effective_from` (ISO8601 Text)
  - `effective_to` (ISO8601 Text, nullable)

- **commission_statements**
  - `id` (PK, Text)
  - `provider_id` (FK -> users.id)
  - `period_start` (ISO8601 Text)
  - `period_end` (ISO8601 Text)
  - `total_sales` (Decimal)
  - `total_commission` (Decimal)
  - `status` (Enum: pending, paid)

- **performance_metrics**
  - `id` (PK, Text)
  - `metric_key` (Text)
  - `metric_value` (Decimal)
  - `captured_at` (ISO8601 Text)

### 5.6 Messaging & Support Tables
- **notifications**
  - `id` (PK, Text)
  - `user_id` (FK -> users.id)
  - `title` (Text)
  - `body` (Text)
  - `type` (Enum: marketing, transactional, system)
  - `status` (Enum: unread, read, archived)
  - `sent_at` (ISO8601 Text)

- **support_tickets**
  - `id` (PK, Text)
  - `user_id` (FK -> users.id)
  - `subject` (Text)
  - `description` (Text)
  - `status` (Enum: open, in_progress, resolved, closed)
  - `priority` (Enum: low, medium, high)
  - `created_at` (ISO8601 Text)
  - `updated_at` (ISO8601 Text)

- **support_messages**
  - `id` (PK, Text)
  - `ticket_id` (FK -> support_tickets.id)
  - `sender_id` (FK -> users.id)
  - `message` (Text)
  - `attachment_url` (Text, nullable)
  - `sent_at` (ISO8601 Text)

### 5.7 Compliance Tables
- **gstin_update_requests**
  - `id` (PK, Text)
  - `user_id` (FK -> users.id)
  - `gstin_value` (Text)
  - `supporting_document_url` (Text, nullable)
  - `submitted_at` (ISO8601 Text)
  - `status` (Enum: pending_admin_review, approved, rejected)
  - `reviewed_by` (FK -> users.id, nullable)
  - `reviewed_at` (ISO8601 Text, nullable)
  - `rejection_reason` (Text, nullable)

## 6. Remote API Contracts
- **Auth Endpoints**
  - `POST /api/auth/login` → login with email/phone + OTP/token.
  - `POST /api/auth/otp` → request/resend OTP.
  - `POST /api/auth/refresh` → refresh tokens.
- **Catalog Endpoints**
  - `GET /api/catalog/categories`
  - `GET /api/catalog/products` (filters, pagination)
  - `GET /api/catalog/products/{id}`
  - `GET /api/catalog/services` / `{id}`
  - `GET /api/catalog/offers`
- **Cart & Checkout Endpoints**
  - `POST /api/cart/items`
  - `PATCH /api/cart/items/{id}`
  - `DELETE /api/cart/items/{id}`
  - `GET /api/cart/summary`
  - `POST /api/orders`
  - `GET /api/orders/{id}`
- **Payments**
  - `POST /api/payments/initiate`
  - `POST /api/payments/verify`
  - `POST /api/payments/refund`
- **Profile & Compliance**
  - `GET /api/profile/gstin` → fetch approved GSTIN and latest request status.
  - `POST /api/profile/gstin` → submit GSTIN update request; always flagged for admin approval.
- **Service Management**
  - `GET /api/services/slots`
  - `POST /api/services/slots/{id}/book`
  - `POST /api/services/slots/{id}/cancel`
- **Admin**
  - `GET /api/admin/commissions`
  - `GET /api/admin/performance`
  - `GET /api/admin/providers`
  - `GET /api/admin/gstin/requests` → list pending customer GSTIN updates.
  - `POST /api/admin/gstin/requests/{id}/approve`
  - `POST /api/admin/gstin/requests/{id}/reject`
- **Support**
  - `POST /api/support/tickets`
  - `GET /api/support/tickets/{id}`
  - `POST /api/support/tickets/{id}/messages`

## 7. Security & Compliance
- **Authentication**: OAuth2 + PKCE for mobile, fallback OTP flows, device binding with refresh token rotation.
- **Data Protection**: Encrypted SharedPreferences for sensitive tokens, Room encryption for payment methods, TLS pinning for API calls.
- **Compliance**: Align with GDPR data handling, PCI DSS for payment flows, RBI norms for UPI.
- **Verification Controls**: Route all customer GSTIN updates through admin approval workflows before persisting to the `users` table.
- **Logging**: Mask PII in client logs, sync critical events to central logging via existing API hooks.

## 8. Testing Strategy
- **Unit Tests**: ViewModels, use-cases, repositories with coroutine test dispatchers.
- **Instrumentation Tests**: Compose UI tests covering critical flows (login, browse, checkout).
- **Integration Tests**: MockWebServer for Retrofit, validating API contract compliance.
- **Beta Rollout**: Firebase App Distribution, phased rollout via Play Console staged releases.

## 9. Deployment & Release
- **Build Variants**: `debug`, `staging`, `production` with env-specific configs.
- **CI/CD**: GitHub Actions or Azure DevOps pipelines for linting, testing, signing, and Play Store upload.
- **Feature Flags**: Remote config toggles for offers, experimental features, and admin dashboards.

## 10. Next Steps Checklist
- Finalize API contracts alignments with backend team.
- Validate Room schema against master SQL scripts.
- Define Compose UI kit based on existing design system.
- Prepare staging environment credentials and config tokens.
- Kick off proof-of-concept sprint for authentication and catalog modules.
- Design customer GSTIN submission flow with admin-side approval tooling.
