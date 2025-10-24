# Database Documentation - TECBUNNY.COM

## Overview
This document provides a comprehensive list of all database tables and their Row Level Security (RLS) policies in the Tecbunny e-commerce platform.

---

## Table of Contents
1. [Database Tables](#database-tables)
2. [RLS Policies](#rls-policies)
3. [Custom Types](#custom-types)
4. [Indexes](#indexes)
5. [Triggers](#triggers)
6. [Admin Management Features](#admin-management-features)

---

## Database Tables

### 1. User & Authentication Tables

#### `profiles`
Main user profile table that extends `auth.users`.
- **Primary Key**: `id` (UUID)
- **Purpose**: Store user information, roles, and customer details
- **Key Fields**: name, email, mobile, role, customer_category, customer_type, gstin

#### `activity_logs`
Tracks user activities and system events.
- **Primary Key**: `id` (SERIAL)
- **Purpose**: Audit trail for user actions
- **Key Fields**: user_id, action, timestamp, type

---

### 2. Product & Inventory Tables

#### `products`
Main product catalog table.
- **Primary Key**: `id` (UUID)
- **Purpose**: Store product information and pricing
- **Key Fields**: title, description, price, mrp, category, stock_quantity, stock_status

#### `inventory_items`
Track inventory levels and serial numbers.
- **Primary Key**: `id` (UUID)
- **Purpose**: Manage product stock and serial number tracking
- **Key Fields**: product_id, stock, serial_numbers

#### `product_pricing`
Manage customer-specific pricing rules with advanced features.
- **Primary Key**: `id` (UUID)
- **Purpose**: Dynamic pricing based on customer type, category, quantity, and time periods
- **Key Fields**: 
  - `product_id` (UUID) - Reference to the product
  - `customer_type` (customer_type enum) - Type of customer (retailer, wholesaler, distributor)
  - `customer_category` (TEXT) - Additional categorization (gold, silver, platinum)
  - `price` (DECIMAL) - The price for this specific rule
  - `min_quantity` (INTEGER) - Minimum quantity for this price (NULL = no minimum)
  - `max_quantity` (INTEGER) - Maximum quantity for this price (NULL = no maximum)
  - `valid_from` (TIMESTAMPTZ) - Start date for this pricing rule (NULL = always valid)
  - `valid_to` (TIMESTAMPTZ) - End date for this pricing rule (NULL = no expiry)
  - `is_active` (BOOLEAN) - Whether this pricing rule is currently active
- **Constraints**:
  - `price >= 0` (price must be non-negative)
  - `max_quantity >= min_quantity` (logical quantity range)
  - `valid_to >= valid_from` (logical date range)
- **Indexes**:
  - `idx_product_pricing_product_id` - Fast product lookups
  - `idx_product_pricing_customer_type` - Customer type queries
  - `idx_product_pricing_active` - Active pricing rules only
  - `idx_product_pricing_lookup` - Composite (product_id, customer_type, is_active)
  - `idx_product_pricing_valid_dates` - Date-based queries
- **Helper Functions**:
  - `get_customer_price(product_id, customer_type, customer_category, quantity)` - Returns the applicable price for a customer based on all rules
- **Use Cases**:
  - Bulk pricing (different prices for different quantity ranges)
  - Customer segment pricing (premium customers get special rates)
  - Time-based promotions (seasonal pricing)
  - Multi-tier pricing strategies

#### `product_analytics`
Product performance metrics.
- **Primary Key**: `id` (UUID)
- **Purpose**: Track product sales and performance
- **Key Fields**: product_id, total_orders, total_revenue, average_rating

---

### 3. Order & Transaction Tables

#### `orders`
Main orders table.
- **Primary Key**: `id` (UUID)
- **Purpose**: Store customer orders
- **Key Fields**: customer_id, status, total, type, payment_method, agent_id

#### `order_items`
Individual items in orders.
- **Primary Key**: `id` (UUID)
- **Purpose**: Line items for each order
- **Key Fields**: order_id, product_id, quantity, price, serial_numbers

#### `order_status_history`
Track order status changes.
- **Primary Key**: `id` (UUID)
- **Purpose**: Audit trail for order status updates
- **Key Fields**: order_id, previous_status, new_status, changed_by

#### `order_otp_verifications`
OTP verification for orders.
- **Primary Key**: `id` (UUID)
- **Purpose**: Verify customer phone numbers for orders
- **Key Fields**: order_id, customer_phone, otp_code, verified

---

### 4. Discount & Promotion Tables

#### `coupons`
Manual coupon codes.
- **Primary Key**: `id` (UUID)
- **Purpose**: Manage promotional coupon codes
- **Key Fields**: code, type, value, expiry_date, usage_limit

#### `discounts`
Auto-applied discounts.
- **Primary Key**: `id` (UUID)
- **Purpose**: System-wide automatic discounts
- **Key Fields**: name, type, value, status, applicable_category

#### `auto_offers`
Automated offer rules.
- **Primary Key**: `id` (UUID)
- **Purpose**: Conditional discount rules
- **Key Fields**: title, type, discount_percentage, conditions

#### `customer_discounts`
Category-based customer discounts.
- **Primary Key**: `id` (UUID)
- **Purpose**: Default discounts by customer category
- **Key Fields**: category, discount_percentage

#### `customer_offers`
Targeted customer offers.
- **Primary Key**: `id` (UUID)
- **Purpose**: Time-bound offers for customer categories
- **Key Fields**: title, discount_percentage, target_categories, valid_from, valid_to

---

### 5. Sales Agent Tables

#### `sales_agents`
Sales agent information.
- **Primary Key**: `id` (UUID)
- **Purpose**: Manage sales agent accounts
- **Key Fields**: user_id, referral_code, points_balance, status

#### `sales_agent_commissions`
Commission records.
- **Primary Key**: `id` (UUID)
- **Purpose**: Track commission earnings
- **Key Fields**: agent_id, order_id, order_total, points_awarded

#### `agent_commission_rules`
Commission calculation rules.
- **Primary Key**: `id` (UUID)
- **Purpose**: Define commission rates
- **Key Fields**: agent_id, product_category, commission_rate

#### `agent_redemption_requests`
Commission withdrawal requests.
- **Primary Key**: `id` (UUID)
- **Purpose**: Process agent payouts
- **Key Fields**: agent_id, points_to_redeem, status, bank_details

#### `agent_performance`
Agent performance metrics.
- **Primary Key**: `id` (UUID)
- **Purpose**: Track monthly agent performance
- **Key Fields**: agent_id, month_year, total_orders, total_sales_value

---

### 6. Service & Support Tables

#### `services`
Service catalog.
- **Primary Key**: `id` (UUID)
- **Purpose**: List available services
- **Key Fields**: title, description, features, price, category

#### `service_requests`
Customer service requests.
- **Primary Key**: `id` (UUID)
- **Purpose**: Track service inquiries
- **Key Fields**: service_id, customer_id, status, priority

#### `service_engineers`
Service engineer profiles.
- **Primary Key**: `id` (UUID)
- **Purpose**: Manage field service engineers
- **Key Fields**: user_id, specializations, skill_level, is_available

#### `service_tickets`
Service tickets.
- **Primary Key**: `id` (UUID)
- **Purpose**: Manage service appointments and work orders
- **Key Fields**: customer_id, assigned_engineer_id, status, priority

#### `service_parts`
Parts used in service.
- **Primary Key**: `id` (UUID)
- **Purpose**: Track parts used in service tickets
- **Key Fields**: ticket_id, product_id, quantity, unit_cost

---

### 7. Purchase & Procurement Tables

#### `purchases`
Purchase orders.
- **Primary Key**: `id` (UUID)
- **Purpose**: Record inventory purchases
- **Key Fields**: supplier_name, supplier_invoice, total

#### `purchase_items`
Items in purchase orders.
- **Primary Key**: `id` (UUID)
- **Purpose**: Line items for purchases
- **Key Fields**: purchase_id, product_id, quantity, purchase_price

---

### 8. Review & Feedback Tables

#### `reviews`
Product reviews.
- **Primary Key**: `id` (UUID)
- **Purpose**: Customer product reviews
- **Key Fields**: product_id, author, rating, comment

---

### 9. Analytics Tables

#### `customer_analytics`
Customer behavior analytics.
- **Primary Key**: `id` (UUID)
- **Purpose**: Track customer lifetime value and behavior
- **Key Fields**: customer_id, total_orders, total_spent, loyalty_score

---

### 10. System Configuration Tables

#### `settings`
General application settings.
- **Primary Key**: `id` (UUID)
- **Purpose**: Store configurable application settings
- **Key Fields**: key, value

#### `system_settings`
System-level configuration.
- **Primary Key**: `id` (UUID)
- **Purpose**: Core system configurations
- **Key Fields**: key, value

#### `security_settings`
Security-related settings.
- **Primary Key**: `id` (UUID)
- **Purpose**: Security configurations
- **Key Fields**: setting_key, setting_value

#### `security_audit_log`
Security event logging.
- **Primary Key**: `id` (UUID)
- **Purpose**: Track security-related events
- **Key Fields**: user_id, action, details, ip_address

---

### 11. Communication & Verification Tables

#### `otp_verifications`
OTP verification records.
- **Primary Key**: `id` (UUID)
- **Purpose**: Phone/email OTP verification
- **Key Fields**: phone, email, otp_code, verified, expires_at

#### `otp_codes`
Generic OTP codes.
- **Primary Key**: `id` (UUID)
- **Purpose**: General purpose OTP storage
- **Key Fields**: identifier, otp_code, verified

#### `user_communication_preferences`
User notification preferences.
- **Primary Key**: `id` (UUID)
- **Purpose**: Manage user communication channels
- **Key Fields**: user_id, email_enabled, sms_enabled, whatsapp_enabled

---

### 12. Integration Tables

#### `zoho_config`
Zoho integration configuration.
- **Primary Key**: `id` (UUID)
- **Purpose**: Store Zoho API credentials
- **Key Fields**: client_id, access_token, refresh_token

#### `webhook_events`
Webhook event queue.
- **Primary Key**: `id` (UUID)
- **Purpose**: Track webhook deliveries
- **Key Fields**: event_type, payload, status, retry_count

---

### 13. Financial Tables

#### `expenses`
Employee expense records.
- **Primary Key**: `id` (UUID)
- **Purpose**: Track and approve expenses
- **Key Fields**: category, amount, submitted_by, status

---

## RLS Policies

### Profiles Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Users can view own profile** | SELECT | Users can only view their own profile data |
| **Users can update own profile** | UPDATE | Users can only update their own profile |
| **Admins can view all profiles** | SELECT | Admins and superadmins can view all user profiles |
| **Admins can update all profiles** | UPDATE | Admins and superadmins can update any profile |

---

### Products Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Anyone can view active products** | SELECT | Active products are visible to all users |
| **Admins can manage products** | ALL | Admins, superadmins, and managers can manage products |

---

### Orders Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Customers can view own orders** | SELECT | Customers can only view their own orders |
| **Staff can view orders based on role** | SELECT | Staff members can view orders based on their role |
| **Staff can update orders** | UPDATE | Staff members can update order information |

---

### Order Items Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **View order items with order access** | SELECT | Users can view items if they have access to the parent order |

---

### Reviews Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Anyone can view reviews** | SELECT | All reviews are publicly visible |
| **Authenticated users can create reviews** | INSERT | Any logged-in user can create a review |

---

### Coupons Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Anyone can view active coupons** | SELECT | Active coupons are visible to all |
| **Admins can manage coupons** | ALL | Admins can create, update, and delete coupons |

---

### Discounts Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Admins only** | ALL | Only admins and superadmins can manage discounts |

---

### Services Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Admins only** | ALL | Only admins and superadmins can manage services |

---

### Auto Offers Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Admins only** | ALL | Only admins and superadmins can manage auto offers |

---

### Inventory Items Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Admins only** | ALL | Admins, superadmins, and managers can manage inventory |

---

### Purchases Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Admins only** | ALL | Admins, superadmins, and accounts can manage purchases |

---

### Purchase Items Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Admins only** | ALL | Admins, superadmins, and accounts can manage purchase items |

---

### Sales Agents Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Agents can view own data** | SELECT | Agents can view their own agent data |
| **Admins can manage agents** | ALL | Admins and managers can manage all agents |

---

### Sales Agent Commissions Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Agents can view own commissions** | SELECT | Agents can view their own commission records |
| **Admins can view all commissions** | SELECT | Admins and accounts can view all commissions |

---

### Agent Redemption Requests Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Agents can view own redemptions** | SELECT | Agents can view their own redemption requests |
| **Admins can manage redemptions** | ALL | Admins and accounts can manage all redemption requests |

---

### Service Engineers Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Engineers can view own data** | SELECT | Engineers can view their own profile |
| **Admins can manage engineers** | ALL | Admins can manage all engineer profiles |

---

### Service Tickets Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Customers can view own tickets** | SELECT | Customers can view their own service tickets |
| **Engineers can view assigned tickets** | SELECT | Engineers can view tickets assigned to them |
| **Admins can manage tickets** | ALL | Admins and managers can manage all tickets |

---

### Service Parts Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **View parts with ticket access** | SELECT | Users can view parts if they have access to the parent ticket |

---

### Expenses Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Users can view own expenses** | SELECT | Users can view their own submitted expenses |
| **Admins can manage expenses** | ALL | Admins and accounts can manage all expenses |

---

### Security Settings Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Admin only** | ALL | Only superadmins can manage security settings |

---

### Settings Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Admins can manage settings** | ALL | Admins and superadmins can manage settings |
| **Public can read public settings** | SELECT | Non-sensitive settings are publicly readable |

---

### System Settings Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Admin only** | ALL | Only admins and superadmins can manage system settings |

---

### Security Audit Log Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Admin only** | ALL | Only admins and superadmins can view audit logs |

---

### Zoho Config Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Admin only** | ALL | Only superadmins can manage Zoho configuration |

---

### OTP Verifications Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Users can view own OTP** | SELECT | Authenticated users can view OTP records |

---

### OTP Codes Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Users can view own OTP codes** | SELECT | Authenticated users can view OTP codes |

---

### User Communication Preferences Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Users can manage own preferences** | ALL | Users can manage their own communication preferences |

---

### Webhook Events Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Admin only** | ALL | Only superadmins can manage webhook events |

---

### Activity Logs Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Users can view own activity** | SELECT | Users can view their own activity logs |
| **Admins can view all activity** | SELECT | Admins can view all activity logs |

---

### Customer Analytics Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Admin only** | ALL | Admins and managers can view customer analytics |

---

### Product Analytics Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Admin only** | ALL | Admins and managers can view product analytics |

---

### Agent Performance Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Admin only** | ALL | Admins and managers can view agent performance |

---

### Order Status History Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **View status history with order access** | SELECT | Users can view status history if they have access to the order |

---

### Service Requests Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Customers can view own requests** | SELECT | Customers can view their own service requests |
| **Admins can manage requests** | ALL | Admins and managers can manage all service requests |

---

### Customer Discounts Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Admin only** | ALL | Only admins and superadmins can manage customer discounts |

---

### Customer Offers Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Admin only** | ALL | Only admins and superadmins can manage customer offers |

---

### Product Pricing Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Admin full access to product_pricing** | ALL | Admins and superadmins have complete access to create, read, update, and delete pricing rules |
| **Authenticated read active pricing** | SELECT | All authenticated users can read active pricing rules within their valid date ranges |
| **Sales agents read pricing** | SELECT | Sales agents and managers can read all active pricing rules to quote prices to customers |

**Details:**
- Admin Policy: Checks if user role is 'superadmin' or 'admin'
- Authenticated Policy: Returns only active rules where valid_from <= NOW() and valid_to >= NOW()
- Sales Policy: Allows sales and manager roles to view all active pricing for customer quotes

---

### Agent Commission Rules Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **Agents can view own rules** | SELECT | Agents can view their own commission rules |
| **Admins can manage rules** | ALL | Admins and managers can manage all commission rules |

---

### Order OTP Verifications Table Policies

| Policy Name | Operation | Description |
|------------|-----------|-------------|
| **View OTP with order access** | SELECT | Users can view OTP records if they have access to the order |

---

## Custom Types

### Enumerations

| Type Name | Values | Usage |
|-----------|--------|-------|
| **user_role** | customer, sales, manager, accounts, admin, service_engineer, superadmin | User role classification |
| **customer_category** | Normal, Standard, Premium | Customer tier for B2C |
| **customer_type** | B2C, B2B | Business vs Consumer |
| **b2b_category** | Bronze, Silver, Gold | B2B customer tier |
| **order_status** | Pending, Awaiting Payment, Payment Confirmed, Confirmed, Processing, Ready to Ship, Shipped, Ready for Pickup, Completed, Delivered, Cancelled, Rejected | Order lifecycle states |
| **order_type** | Pickup, Delivery, Walk-in | Order fulfillment method |
| **expense_status** | pending, approved, rejected | Expense approval workflow |
| **expense_category** | Travel, Food, Supplies, Utility, Other | Expense classification |
| **coupon_type** | percentage, fixed | Discount calculation method |
| **coupon_status** | active, inactive | Coupon availability |
| **service_status** | pending, in_progress, completed, cancelled | Service request status |
| **service_priority** | low, medium, high, urgent | Service urgency level |
| **service_category** | Support, Protection, Installation, Trade, Business | Service type classification |
| **offer_type** | category_discount, customer_tier, minimum_order, seasonal, product_specific | Offer condition type |
| **stock_status** | in_stock, low_stock, out_of_stock | Inventory availability |
| **sales_agent_status** | pending, approved, rejected | Agent approval status |
| **redemption_status** | pending, approved, rejected, processed | Redemption workflow status |
| **service_engineer_skill_level** | junior, senior, expert | Engineer experience level |
| **service_ticket_status** | pending, assigned, in_progress, completed, cancelled, on_hold | Service ticket lifecycle |
| **service_ticket_priority** | low, medium, high, urgent | Service ticket urgency |
| **otp_type** | agent_order, customer_verification | OTP purpose classification |

---

## Indexes

### Performance Optimization Indexes

| Index Name | Table | Column(s) | Purpose |
|------------|-------|-----------|---------|
| **idx_products_category** | products | category | Fast product category filtering |
| **idx_products_status** | products | status | Quick status-based queries |
| **idx_orders_customer_id** | orders | customer_id | Customer order lookup |
| **idx_orders_status** | orders | status | Order status filtering |
| **idx_orders_created_at** | orders | created_at | Time-based order queries |
| **idx_order_items_order_id** | order_items | order_id | Order items lookup |
| **idx_reviews_product_id** | reviews | product_id | Product reviews lookup |
| **idx_coupons_code** | coupons | code | Coupon code validation |
| **idx_inventory_items_product_id** | inventory_items | product_id | Inventory lookup by product |
| **idx_sales_agents_user_id** | sales_agents | user_id | Agent user mapping |
| **idx_service_tickets_status** | service_tickets | status | Ticket status filtering |
| **idx_service_tickets_assigned_engineer** | service_tickets | assigned_engineer_id | Engineer workload queries |

---

## Triggers

### Auto-Update Timestamps

All tables with `updated_at` columns have triggers to automatically update the timestamp:

| Trigger Name | Table | Function |
|-------------|-------|----------|
| **update_profiles_updated_at** | profiles | update_updated_at_column() |
| **update_products_updated_at** | products | update_updated_at_column() |
| **update_orders_updated_at** | orders | update_updated_at_column() |
| **update_coupons_updated_at** | coupons | update_updated_at_column() |
| **update_discounts_updated_at** | discounts | update_updated_at_column() |
| **update_services_updated_at** | services | update_updated_at_column() |
| **update_auto_offers_updated_at** | auto_offers | update_updated_at_column() |
| **update_inventory_items_updated_at** | inventory_items | update_updated_at_column() |
| **update_sales_agents_updated_at** | sales_agents | update_updated_at_column() |
| **update_product_pricing_updated_at** | product_pricing | update_updated_at_column() |
| **update_agent_commission_rules_updated_at** | agent_commission_rules | update_updated_at_column() |
| **update_service_engineers_updated_at** | service_engineers | update_updated_at_column() |
| **update_service_tickets_updated_at** | service_tickets | update_updated_at_column() |
| **update_service_requests_updated_at** | service_requests | update_updated_at_column() |
| **update_security_settings_updated_at** | security_settings | update_updated_at_column() |
| **update_settings_updated_at** | settings | update_updated_at_column() |
| **update_system_settings_updated_at** | system_settings | update_updated_at_column() |
| **update_zoho_config_updated_at** | zoho_config | update_updated_at_column() |
| **update_user_communication_preferences_updated_at** | user_communication_preferences | update_updated_at_column() |

---

## Summary

### Total Tables: 45

1. profiles
2. products
3. orders
4. order_items
5. reviews
6. coupons
7. discounts
8. services
9. auto_offers
10. inventory_items
11. purchases
12. purchase_items
13. sales_agents
14. sales_agent_commissions
15. agent_redemption_requests
16. product_pricing
17. agent_commission_rules
18. order_otp_verifications
19. service_engineers
20. service_tickets
21. service_parts
22. agent_performance
23. order_status_history
24. customer_analytics
25. product_analytics
26. service_requests
27. activity_logs
28. expenses
29. customer_discounts
30. customer_offers
31. settings
32. system_settings
33. security_settings
34. security_audit_log
35. zoho_config
36. otp_verifications
37. otp_codes
38. user_communication_preferences
39. webhook_events

### Total Custom Types: 18

### Total Indexes: 12

### Total RLS Policies: 60+

---

**Last Updated**: October 10, 2025  
**Database Version**: Initial Schema Migration  
**Migration File**: `20241009160600_initial_schema.sql`

---

## Admin Management Features

### Product Management

The admin panel provides comprehensive product management capabilities:

#### 1. **Product Catalog** (`/management/admin/products`)
- View all products with filtering and search
- Add new products with details
- Edit existing products
- Delete products
- Manage product variants
- Upload product images
- Set stock levels and status

#### 2. **Pricing Management** (`/management/admin/pricing`) ⭐ NEW
Dynamic pricing management for different customer types and quantities:

**Features:**
- **Customer Type Pricing**: Set different prices for B2C and B2B customers
- **Category-Based Pricing**: Customize prices for customer categories
  - B2C: Normal, Standard, Premium
  - B2B: Bronze, Silver, Gold
- **Volume-Based Pricing**: Define quantity ranges with specific prices
  - Minimum quantity thresholds
  - Maximum quantity limits
- **Time-Based Pricing**: Set validity periods for pricing rules
  - Start date (valid_from)
  - End date (valid_to)
- **Active/Inactive Rules**: Toggle pricing rules on/off
- **Product Search**: Quick search across all pricing rules
- **Filter by Type**: Filter rules by B2C or B2B customer types

**Use Cases:**
- Wholesale pricing for B2B customers
- Bulk discount pricing (e.g., 10+ units get special price)
- Seasonal pricing with time limits
- Premium customer exclusive pricing
- Promotional pricing campaigns

**API Endpoints:**
- `GET /api/admin/pricing` - List all pricing rules
- `POST /api/admin/pricing` - Create new pricing rule
- `PUT /api/admin/pricing/[id]` - Update pricing rule
- `DELETE /api/admin/pricing/[id]` - Delete pricing rule

**Database Table:** `product_pricing`

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique identifier |
| product_id | UUID | Reference to products table |
| customer_type | ENUM | B2C or B2B |
| customer_category | TEXT | Normal/Standard/Premium or Bronze/Silver/Gold |
| price | DECIMAL | Custom price for this rule |
| min_quantity | INTEGER | Minimum order quantity |
| max_quantity | INTEGER | Maximum order quantity |
| valid_from | TIMESTAMPTZ | Rule start date |
| valid_to | TIMESTAMPTZ | Rule end date |
| is_active | BOOLEAN | Rule status |

---

### Other Admin Features

#### 3. **User Management** (`/management/admin/users`)
- View all users and their profiles
- Manage user roles and permissions
- View customer analytics
- Approve/reject sales agents

#### 4. **Sales Agents** (`/management/admin/sales-agents`)
- Manage sales agent accounts
- View agent performance
- Process commission payments
- Handle redemption requests

#### 5. **Service Management** (`/management/admin/services`)
- Manage service catalog
- Assign service engineers
- Track service tickets
- Monitor service performance

#### 6. **Offers Management** (`/management/admin/offers`)
- Create auto-applied offers
- Manage customer offers
- Set offer conditions and rules
- Track offer usage

#### 7. **Coupons & Discounts**
- Create coupon codes
- Manage auto-applied discounts
- Set usage limits
- Track redemptions

#### 8. **Settings & Configuration**
- Homepage settings
- Payment API configuration
- Social media links
- Site-wide settings
- Security dashboard

---
